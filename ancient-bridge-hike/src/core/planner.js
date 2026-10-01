// 路线规划：按明确数据约束求可行路径。
// 规则：
// 1) 只在实测数据上给结论；宽度或坡度为 null → unknown，显示"无法确认"；
// 2) 不自动标"适合儿童"或"无障碍"。亲子方案只给"实测段是否满足童车阈值"，
//    遇到未知段一律 unconfirmed；轮椅可达性永不自动断言；
// 3) 锁定停留点不可达 → 整体不可行并返回解释；未锁定点不可达 → 局部更新（跳过+说明）。

import { PLANS, THEME_ROUTES, nodeById, edgeById } from './catalog.js';
import { dijkstra, explainUnreachable } from './graph.js';

export const FAMILY_THRESHOLD = { widthMinM: 1.2, slopeMaxPct: 15 };

function analyzeEdges(edges, family) {
  const unknown = [];
  const violations = [];
  for (const e of edges) {
    if (e.widthMinM == null) unknown.push({ edgeId: e.id, field: 'widthMinM', label: '净宽未测', surface: e.surface });
    if (e.slopeMaxPct == null) unknown.push({ edgeId: e.id, field: 'slopeMaxPct', label: '坡度未测', surface: e.surface });
    if (family && e.widthMinM != null && e.widthMinM < FAMILY_THRESHOLD.widthMinM)
      violations.push({ edgeId: e.id, field: 'widthMinM', value: e.widthMinM, threshold: FAMILY_THRESHOLD.widthMinM });
    if (family && e.slopeMaxPct != null && e.slopeMaxPct > FAMILY_THRESHOLD.slopeMaxPct)
      violations.push({ edgeId: e.id, field: 'slopeMaxPct', value: e.slopeMaxPct, threshold: FAMILY_THRESHOLD.slopeMaxPct });
  }
  let strollerCert = null; // 仅亲子模式下填充；永不是无障碍结论
  if (family) {
    if (unknown.length) strollerCert = 'unconfirmed';
    else if (violations.length) strollerCert = 'measured_block';
    else strollerCert = 'measured_pass';
  }
  return { unknown, violations, strollerCert };
}

function legRegions(edges) {
  return [...new Set(edges.map((e) => e.region))];
}

function evaluateLeg(ctx, from, to, { family = false } = {}) {
  const path = dijkstra(ctx, from, to);
  if (!path) {
    const why = explainUnreachable(ctx, from, to);
    return { from, to, status: 'blocked', blockers: why.blockers,
             noNetworkEvenIfReopened: why.noNetworkEvenIfReopened };
  }
  const a = analyzeEdges(path.edges, family);
  return {
    from, to, status: 'ok', minutes: path.minutes,
    edgeIds: path.edgeIds, nodes: path.nodes,
    regions: legRegions(path.edges),
    ...a,
  };
}

// 按图搜索（半日 / 一日 / 亲子方案）
export function searchPlan(ctx, planId, opts = {}) {
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`未知方案 ${planId}`);
  const locked = new Set(opts.lockedNodeIds || []);
  const family = !!plan.family;
  const legs = [];
  let cursor = plan.origin;
  let total = 0;
  let feasible = true;
  const warnings = [];

  for (const targetId of plan.targets) {
    const isLocked = locked.has(targetId);
    const leg = evaluateLeg(ctx, cursor, targetId, { family });
    leg.target = targetId;
    leg.targetName = nodeById(targetId)?.name || targetId;
    leg.locked = isLocked;
    if (leg.status === 'blocked') {
      if (isLocked) {
        feasible = false;
        leg.decision = 'locked_unreachable';
        leg.explanation = buildLockedExplanation(ctx, cursor, targetId, leg);
      } else {
        leg.decision = 'skipped_local_update';
        leg.explanation = '停留点不可达且未锁定：已从本次路径中跳过（局部更新），其余点继续规划。';
        warnings.push(`已跳过 ${leg.targetName}：${summarizeBlockers(leg.blockers)}`);
      }
      legs.push(leg);
      continue;
    }
    if (family && leg.strollerCert === 'unconfirmed') {
      leg.decision = 'caveat_unconfirmed';
      warnings.push(`通往 ${leg.targetName} 的路段含宽度/坡度未测段：无法确认童车可通过，不自动判定适合儿童。`);
    } else if (family && leg.strollerCert === 'measured_block') {
      leg.decision = 'measured_block';
      warnings.push(`通往 ${leg.targetName} 的实测段不满足童车阈值（净宽<${FAMILY_THRESHOLD.widthMinM}m 或坡度>${FAMILY_THRESHOLD.slopeMaxPct}%）。`);
    }
    total += leg.minutes;
    legs.push(leg);
    cursor = targetId;
  }

  const budgetFit = total <= plan.minutes;
  if (!budgetFit) { feasible = false; warnings.push(`总步行 ${total} 分钟，超出方案预算 ${plan.minutes} 分钟。`); }
  const crossedRegions = [...new Set(legs.filter((l) => l.status === 'ok').flatMap((l) => l.regions || []))];
  const unknownCount = legs.reduce((n, l) => n + (l.unknown?.length || 0), 0);

  return {
    kind: 'search', planId: plan.id, planName: plan.name, family,
    feasible, totalMinutes: total, budgetMin: plan.minutes, budgetFit,
    thresholds: family ? FAMILY_THRESHOLD : null,
    legs, warnings, crossedRegions, unknownCount,
    accessibilityStatement: '本系统不做无障碍（轮椅）自动认证；亲子结论仅基于已实测的净宽与坡度。',
  };
}

function summarizeBlockers(blockers) {
  if (!blockers || !blockers.length) return '即使放开已知封闭点仍无路径（路网不连通）';
  return blockers.map((b) => {
    if (b.kind === 'edge') return `通行段 ${b.edgeId} 封闭（${b.reason || '维护'}${b.maintenance?.delayed ? '，维护已延期' : ''}）`;
    return `入口 ${b.nodeId} 关闭（${b.reason}）`;
  }).join('；');
}

function buildLockedExplanation(ctx, from, targetId, leg) {
  const targetName = nodeById(targetId)?.name || targetId;
  if (leg.noNetworkEvenIfReopened) {
    return `锁定停留点「${targetName}」不可达：即使当前维护段全部恢复，路网仍不连通，需要新增步道或改集合点，不能自动改点。`;
  }
  return `锁定停留点「${targetName}」不可达，关键阻断：${summarizeBlockers(leg.blockers)}。` +
    '该点被锁定，系统不会静默替换；请解锁后允许局部更新，或等待维护结束。';
}

// 预制主题路线求值（逐段按当前数据，不预存路径）
export function evaluateTheme(ctx, routeId) {
  const route = THEME_ROUTES.find((r) => r.id === routeId);
  if (!route) throw new Error(`未知主题路线 ${routeId}`);
  const legs = [];
  let total = route.stops.reduce((n, s) => n + (s.dwell || 0), 0);
  let feasible = true;
  const warnings = [];

  for (let i = 1; i < route.stops.length; i += 1) {
    const a = route.stops[i - 1];
    const b = route.stops[i];
    const leg = evaluateLeg(ctx, a.node, b.node, { family: route.family });
    leg.fromLabel = a.label;
    leg.toLabel = b.label;
    if (leg.status === 'blocked') {
      feasible = false;
      leg.explanation = `预制段「${a.label} → ${b.label}」当前不通：${summarizeBlockers(leg.blockers)}`;
      if (leg.noNetworkEvenIfReopened) leg.explanation += '（即使解封也无替代路网）';
    } else {
      total += leg.minutes;
      if (route.family && leg.strollerCert === 'unconfirmed') {
        warnings.push(`「${a.label} → ${b.label}」含未测宽度/坡度，亲子可通过性无法确认。`);
      }
    }
    legs.push(leg);
  }

  const budgetFit = total <= route.budgetMin;
  if (!budgetFit) warnings.push(`含停留共 ${total} 分钟，超出主题预算 ${route.budgetMin} 分钟。`);
  const crossedRegions = [...new Set(legs.filter((l) => l.status === 'ok').flatMap((l) => l.regions || []))];
  const unknownCount = legs.reduce((n, l) => n + (l.unknown?.length || 0), 0);
  const blockedCount = legs.filter((l) => l.status === 'blocked').length;

  return {
    kind: 'theme', routeId: route.id, routeName: route.name, family: route.family,
    stops: route.stops, feasible: feasible && budgetFit,
    totalMinutes: total, budgetMin: route.budgetMin, budgetFit,
    legs, warnings, crossedRegions, crossRegion: crossedRegions.length > 1,
    unknownCount, blockedCount,
    accessibilityStatement: '主题路线不提供无障碍承诺；亲子标签来自编辑策划，通过性仍以实测数据为准。',
  };
}

// 局部更新：对主题路线中不可达的某一停留点给替换点，仅重算相邻两段（其余段不动）
export function partialUpdateTheme(ctx, routeId, replacements = {}) {
  const base = evaluateTheme(ctx, routeId);
  const route = THEME_ROUTES.find((r) => r.id === routeId);
  const stops = route.stops.map((s) => (replacements[s.node]
    ? { ...s, node: replacements[s.node], label: `${s.label}（局部更新至 ${nodeById(replacements[s.node])?.name || replacements[s.node]}）`, replaced: true }
    : s));
  const legs = [];
  let total = stops.reduce((n, s) => n + (s.dwell || 0), 0);
  let feasible = true;
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1];
    const b = stops[i];
    const leg = evaluateLeg(ctx, a.node, b.node, { family: route.family });
    leg.fromLabel = a.label;
    leg.toLabel = b.label;
    if (leg.status === 'blocked') { feasible = false; } else { total += leg.minutes; }
    legs.push(leg);
  }
  return {
    ...base,
    kind: 'theme-partial-update',
    updatedStops: stops,
    legs,
    feasible: feasible && total <= route.budgetMin,
    totalMinutes: total,
    budgetFit: total <= route.budgetMin,
    replacements,
    note: '仅重算与替换点相邻的停留段；未涉及段沿用预制内容。',
  };
}

// 比较：预制主题 vs 按图搜索
export function compareThemeAndSearch(ctx, routeId, planId) {
  const t = evaluateTheme(ctx, routeId);
  const s = searchPlan(ctx, planId);
  const row = (r) => ({
    name: r.routeName || r.planName,
    feasible: r.feasible,
    totalMinutes: r.totalMinutes,
    budgetMin: r.budgetMin,
    budgetFit: r.budgetFit,
    blockedCount: r.blockedCount ?? r.legs.filter((l) => l.status === 'blocked').length,
    skippedCount: r.legs.filter((l) => l.decision === 'skipped_local_update').length,
    unknownCount: r.unknownCount,
    crossRegion: (r.crossedRegions || []).length > 1,
    regions: r.crossedRegions,
  });
  return {
    theme: t, search: s,
    comparison: [row(t), row(s)],
    narrative: `预制主题：${t.feasible ? '当前数据下可执行' : '存在阻断/超时'}；` +
      `按图搜索：${s.feasible ? '求得可行路径' : '未求得可行路径'}。` +
      '两者均以同一份当日状态求值，路径不预存、不臆测未知宽度与坡度。',
  };
}

export { edgeById };
