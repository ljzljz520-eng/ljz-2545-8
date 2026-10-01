// ============================================================
// 图引擎：状态推导 + 按数据约束的路径规划
// 关键不变量：
//  - 桥梁本体没有 open 布尔；逐入口、逐通行段推导
//  - 维护可只关闭一端/只切断穿越，另一端观景保持可达
//  - widthM/slopePct=null => 亲子/无障碍方案“无法确认”，不猜测、不默认适合
// ============================================================
import { nodes, edges, maintenance, profiles as PROFILES } from './data.js';

export function inInterval(dateStr, start, end) {
  const d = dateStr, s = start, e = end;
  return (!s || d >= s) && (!e || d <= e);
}

// 维护 -> 受影响对象的当日效果（延期：active 继续命中）
export function maintEffectsAt(dateStr) {
  const out = [];
  for (const m of maintenance) {
    if (m.status === 'done') continue;
    const end = m.status === 'delayed' ? (m.rescheduledTo || m.endPlanned) : (m.endActual || m.endPlanned);
    if (inInterval(dateStr, m.start, end)) {
      for (const a of m.affects) out.push({ ...a, maintId: m.id, maintTitle: m.title, detail: a.detail || m.title });
    }
  }
  return out;
}

// 汇总某日期 + 临时覆盖下的对象状态
// overrides: { entrancesClosed:Set|string[], entrancesOpen:Set|string[],
//              edgesBlocked:Set|string[], edgesOpen:Set|string[], ignoreMaint:Set|string[] }
export function buildState(dateStr, overrides = {}) {
  const eff = maintEffectsAt(dateStr).filter((e) => !overrides.ignoreMaint?.includes(e.maintId));
  const entranceStatus = {};
  const edgeStatus = {};

  for (const n of nodes) {
    if (n.kind === 'entrance') {
      entranceStatus[n.id] = { usable: true, reasons: [] };
    }
  }
  for (const e of edges) edgeStatus[e.id] = { usable: true, hard: false, reasons: [], warns: [] };

  const apply = (kind, id, effect, rec) => {
    const table = kind === 'entrance' ? entranceStatus : edgeStatus;
    if (!table[id]) return;
    if (effect === 'closed' || effect === 'blocked') {
      table[id].usable = false;
      table[id].hard = true;
      table[id].reasons.push(rec);
    }
  };
  for (const e of eff) apply(e.kind, e.id, e.effect, { type: 'maint', text: `${e.maintTitle}：${e.detail}`, maintId: e.maintId });

  for (const id of overrides.entrancesClosed || [])
    if (entranceStatus[id]) { entranceStatus[id].usable = false; entranceStatus[id].hard = true;
      entranceStatus[id].reasons.push({ type: 'manual', text: '临时关闭（手动覆盖）' }); }
  for (const id of overrides.entrancesOpen || [])
    if (entranceStatus[id]) { entranceStatus[id] = { usable: true, hard: false, reasons: [], warns: [] }; }
  for (const id of overrides.edgesBlocked || [])
    if (edgeStatus[id]) { edgeStatus[id].usable = false; edgeStatus[id].hard = true;
      edgeStatus[id].reasons.push({ type: 'manual', text: '临时封断（手动覆盖）' }); }
  for (const id of overrides.edgesOpen || [])
    if (edgeStatus[id]) { edgeStatus[id] = { usable: true, hard: false, reasons: [], warns: [] }; }

  return { date: dateStr, entranceStatus, edgeStatus, effects: eff };
}

export function entranceState(state, id) { return state.entranceStatus[id] || { usable: true, reasons: [] }; }
export function edgeState(state, id) { return state.edgeStatus[id] || { usable: true, hard: false, reasons: [], warns: [] }; }

const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
const edgeById = Object.fromEntries(edges.map((e) => [e.id, e]));
export { nodeById, edgeById };

// 一条边当日能否被特定 profile 使用；返回 {ok, hardReasons, unknowns, profileWarns}
export function edgeUsability(state, edge, profileKey) {
  const p = PROFILES[profileKey];
  const st = edgeState(state, edge.id);
  const hardReasons = [...st.reasons];
  const unknowns = [];
  const profileWarns = [];

  // 入口门控：边两端任一为入口且该入口关闭 => 硬阻断（“一端维护可能切断穿越”）
  for (const end of [edge.a, edge.b]) {
    const n = nodeById[end];
    if (n?.kind === 'entrance') {
      const es = entranceState(state, end);
      if (!es.usable) hardReasons.push(...es.reasons.map((r) => ({ ...r, text: `入口「${n.name}」关闭 — ${r.text}` })));
    }
  }

  if (edge.widthM == null) {
    if (p.requireKnown) hardReasons.push({ type: 'unknown', text: `「${edge.id}」宽度未测绘 — 无法确认${p.name.includes('无障碍') ? '无障碍' : '适合儿童'}` });
    else unknowns.push('width');
  } else if (edge.widthM < p.minWidthM) {
    hardReasons.push({ type: 'width', text: `宽度 ${edge.widthM}m < 方案下限 ${p.minWidthM}m` });
  }
  if (edge.slopePct == null) {
    if (p.requireKnown) hardReasons.push({ type: 'unknown', text: `「${edge.id}」坡度未测绘 — 无法确认${p.name.includes('无障碍') ? '无障碍' : '适合儿童'}` });
    else unknowns.push('slope');
  } else if (edge.slopePct > p.maxSlopePct) {
    hardReasons.push({ type: 'slope', text: `坡度 ${edge.slopePct}% > 方案上限 ${p.maxSlopePct}%` });
  }

  if (unknowns.length) {
    const labels = unknowns.map((u) => (u === 'width' ? '宽度未知' : '坡度未知'));
    profileWarns.push(`${labels.join('、')}（可徒步通过，但无法确认分级，不自动贴标签）`);
  }
  return { ok: hardReasons.length === 0, hardReasons, unknowns, profileWarns };
}

// 建可通行邻接表（按 profile）
function adjacency(state, profileKey) {
  const adj = Object.fromEntries(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    const u = edgeUsability(state, e, profileKey);
    if (!u.ok) continue;
    adj[e.a].push({ to: e.b, edge: e, warns: u.profileWarns });
    adj[e.b].push({ to: e.a, edge: e, warns: u.profileWarns });
  }
  return adj;
}

// 带边路径的最短路（BFS，单位=边数；同跳数取累计长度短），返回节点+边序列
export function findPath(state, profileKey, from, to) {
  const adj = adjacency(state, profileKey);
  if (!adj[from] || !adj[to]) return null;
  const q = [from];
  const prev = { [from]: null };
  while (q.length) {
    const cur = q.shift();
    if (cur === to) break;
    for (const { to: nxt, edge, warns } of adj[cur]) {
      if (!(nxt in prev)) { prev[nxt] = { from: cur, edge, warns }; q.push(nxt); }
    }
  }
  if (!(to in prev)) return null;
  const nodeSeq = [];
  const edgeSeq = [];
  const warns = new Set();
  let cur = to;
  while (cur !== from) {
    nodeSeq.unshift(cur);
    const step = prev[cur];
    edgeSeq.unshift(step.edge);
    step.warns.forEach((w) => warns.add(w));
    cur = step.from;
  }
  nodeSeq.unshift(from);
  return { nodeSeq, edgeSeq, warns: [...warns] };
}

// 所有阻断某 from->to 通行的关键阻断边/入口（含原因），供“不可达解释”
export function diagnose(state, profileKey, from, to) {
  // 只报告“从 from 出发的可达前沿”上被阻断的边：这些才是切断该行程的关键阻断
  const usableAdj = adjacency(state, profileKey);
  const reach = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const { to: nxt } of usableAdj[cur]) if (!reach.has(nxt)) { reach.add(nxt); q.push(nxt); }
  }
  const reachable = reach.has(to);
  const blockers = [];
  for (const e of edges) {
    if (reach.has(e.a) || reach.has(e.b)) {
      const u = edgeUsability(state, e, profileKey);
      if (!u.ok) {
        blockers.push({
          kind: 'edge', id: e.id,
          label: `${nodeById[e.a].name} ↔ ${nodeById[e.b].name}（${e.surface}）`,
          reasons: u.hardReasons,
          onFrontier: reach.has(e.a) !== reach.has(e.b),
        });
      }
    }
  }
  return { reachable, blockers };
}

// 逐段核对预制主题路线（允许折返/重复节点）
export function evaluateThemed(state, route, profileKey = route.profile) {
  const legResults = [];
  let feasible = true;
  let totalLen = 0;
  let allWarns = new Set();
  for (let i = 0; i < route.sequence.length - 1; i++) {
    const a = route.sequence[i], b = route.sequence[i + 1];
    const path = findPath(state, profileKey, a, b);
    if (!path) {
      feasible = false;
      const d = diagnose(state, profileKey, a, b);
      legResults.push({ index: i, from: a, to: b, ok: false, path: null, blockers: d.blockers, lenM: 0 });
      continue;
    }
    path.warns.forEach((w) => allWarns.add(w));
    const len = path.edgeSeq.reduce((s, e) => s + e.lenM, 0);
    totalLen += len;
    legResults.push({ index: i, from: a, to: b, ok: true, path, lenM: len });
  }
  const speed = profileKey === 'family' ? 42 : profileKey === 'accessible' ? 55 : 50; // 米/分钟（含拍照放缓）
  const dwellMin = Object.values(route.dwell || {}).reduce((s, v) => s + v, 0);
  const walkMin = Math.round(totalLen / speed);
  const totalMin = walkMin + dwellMin;
  const timeOk = !route.timeBudgetMin || totalMin <= route.timeBudgetMin;
  return {
    route, profileKey, feasible, timeOk, totalLen, walkMin, dwellMin, totalMin,
    timeBudgetMin: route.timeBudgetMin, warns: [...allWarns], legResults,
  };
}

// 按图搜索：起终点 + 必到停留点（锁定）。锁定点不可达时给出解释与局部更新建议。
export function planWithLocks(state, profileKey, start, finish, lockedStops = []) {
  const legs = [];
  const chain = [start, ...lockedStops, finish];
  let feasible = true;
  const failedLocks = [];
  let totalLen = 0;
  const warns = new Set();

  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i], b = chain[i + 1];
    const path = findPath(state, profileKey, a, b);
    if (!path) {
      feasible = false;
      const d = diagnose(state, profileKey, a, b);
      const isLock = lockedStops.includes(b);
      const leg = { index: i, from: a, to: b, isLock, ok: false, path: null, blockers: d.blockers, lenM: 0,
        localFix: suggestLocalFix(state, profileKey, a, b) };
      legs.push(leg);
      if (isLock) failedLocks.push({ stopId: b, blockers: d.blockers, localFix: leg.localFix });
      continue;
    }
    path.warns.forEach((w) => warns.add(w));
    const len = path.edgeSeq.reduce((s, e) => s + e.lenM, 0);
    totalLen += len;
    legs.push({ index: i, from: a, to: b, isLock: false, ok: true, path, lenM: len });
  }

  // 局部更新：可行的段照常给出，只把坏段标红；并计算“去掉坏锁后”的截断计划
  const reachableLocks = lockedStops.filter((s) => legs.some((leg) => leg.ok && leg.to === s));
  const truncated = feasible ? null : planTruncated(state, profileKey, start, finish, lockedStops);

  const speed = profileKey === 'family' ? 42 : profileKey === 'accessible' ? 55 : 50;
  const walkMin = Math.round(totalLen / speed);
  return {
    profileKey, start, finish, lockedStops, feasible, failedLocks, legs,
    reachableLocks, truncated, totalLen, walkMin, warns: [...warns],
  };
}

function planTruncated(state, profileKey, start, finish, lockedStops) {
  // 保留可达的锁定点前缀，给出最近可达锚点；其余锁定点列为“待恢复后局部更新”
  const keep = [];
  let cur = start;
  for (const s of lockedStops) {
    if (findPath(state, profileKey, cur, s)) { keep.push(s); cur = s; } else break;
  }
  const finishOk = findPath(state, profileKey, cur, finish);
  return {
    keepStops: keep,
    droppedStops: lockedStops.filter((s) => !keep.includes(s)),
    finishReachableFromAnchor: !!finishOk,
    anchor: cur,
  };
}

// 局部更新建议：找到阻断边相邻的最近开放入口/节点，建议替代锚点
function suggestLocalFix(state, profileKey, from, to) {
  const d = diagnose(state, profileKey, from, to);
  const top = d.blockers.flatMap((b) => b.reasons.map((r) => r.text));
  const unique = [...new Set(top)].slice(0, 3);
  return {
    summary: unique.length ? `关键阻断：${unique.join('；')}` : '当前约束下无可行路径',
    actions: [
      '仅对坏段做局部更新：保留已完成的前段，不重排整条路线',
      '若为维护阻断，等待区间结束或在覆盖面板临时解除该维护后再试',
      '若因宽度/坡度未知，提示“无法确认”，需补测绘数据，不自动降级为亲子/无障碍',
    ],
  };
}

export function bridgeEndStatus(state, bridge) {
  // 不返回整桥 open；分别给两端入口、穿越可达性、各桥窗观景可达性
  const entrances = nodes.filter((n) => n.kind === 'entrance' && n.bridgeId === bridge.id);
  const ends = entrances.map((en) => ({ node: en, state: entranceState(state, en.id) }));
  // 穿越：桥面段在端部门控下是否可用（半日口径；deck 段自身或任一端入口关闭都算切断）
  const deckEdges = edges.filter((e) => e.kind === 'deck' && e.bridgeId === bridge.id);
  const crossingBlockedBy = deckEdges.flatMap((e) =>
    edgeUsability(state, e, 'half').hardReasons.map((r) => ({ edge: e, reason: r })));
  const openEndCount = ends.filter((x) => x.state.usable).length;
  return {
    ends,
    crossingNote:
      openEndCount === 0
        ? '两端入口均关闭：不可进入（桥梁本体仍在，状态不做整桥布尔化）'
        : crossingBlockedBy.length
          ? openEndCount === 1
            ? '仅一端可进入：可在开放端观景，穿越被切断（有桥面段因关闭端门控不可用）'
            : '桥面段被维护切断，两端虽可进入但不能穿桥'
          : '两端入口均可进入，可穿越',
    crossingBlockedBy,
  };
}

export function photoBearingTo(stateOrNull, atNodeId, targetBridge) {
  // 机位到桥体中心（取该桥 deck 边中点的均值）的真实方位角（度，北=0 顺时针）
  const at = nodeById[atNodeId];
  const deck = edges.filter((e) => e.kind === 'deck' && e.bridgeId === targetBridge.id);
  const cx = deck.reduce((s, e) => s + (nodeById[e.a].x + nodeById[e.b].x) / 2, 0) / deck.length;
  const cy = deck.reduce((s, e) => s + (nodeById[e.a].y + nodeById[e.b].y) / 2, 0) / deck.length;
  const dx = cx - at.x, dy = cy - at.y;
  return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
}

export function bearingDelta(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function evaluatePhoto(check, bridge, tolDeg = 35) {
  const actual = photoBearingTo(null, check.at, bridge);
  const delta = bearingDelta(check.declaredBearingDeg, actual);
  return { actual, delta, pass: delta <= tolDeg, tolDeg };
}
