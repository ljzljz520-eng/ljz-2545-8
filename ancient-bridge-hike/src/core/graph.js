// 图状态引擎：桥梁本体 / 入口 / 通行段是不同对象。
// - 维护区间挂在 edge 上，按评估日期判定；
// - 入口封闭只锁入口门户节点，不波及桥的另一端；
// - 不产生 bridge.open 布尔值，只给出"端"级与"穿越"级结论。

import { NODES, EDGES, ENTRANCES, MAINTENANCE } from './catalog.js';

const inWindow = (date, s, e) => date >= s && date <= e;

export function buildContext(date, overrides = {}) {
  // overrides: { entranceClosed: {entId: {closed, reason}}, edgeBlocked: {edgeId:{blocked,reason}} }
  const entranceClosed = { ...(overrides.entranceClosed || {}) };
  const edgeBlocked = { ...(overrides.edgeBlocked || {}) };

  const edgeState = new Map();
  for (const e of EDGES) {
    let state = { blocked: false, reason: null, maintenance: null, source: null };
    const m = MAINTENANCE.find((x) => x.id === e.maintenanceId);
    if (m && inWindow(date, m.start, m.end)) {
      state = {
        blocked: true,
        reason: m.reason,
        maintenance: { id: m.id, start: m.start, end: m.end, delayed: !!m.delayed,
          original: m.delayed ? { start: m.originalStart, end: m.originalEnd } : null },
        source: 'maintenance',
      };
    }
    const ob = edgeBlocked[e.id];
    if (ob && ob.blocked) state = { blocked: true, reason: ob.reason || '临时封闭', maintenance: null, source: 'override' };
    edgeState.set(e.id, state);
  }

  const nodeState = new Map();
  for (const en of ENTRANCES) {
    const oc = entranceClosed[en.id];
    if (oc && oc.closed) {
      nodeState.set(en.nodeId, { locked: true, reason: oc.reason || `${en.name}临时关闭`, entranceId: en.id });
    }
  }

  return { date, entranceClosed, edgeState, nodeState };
}

export function entranceState(ctx, ent) {
  const oc = ctx.entranceClosed[ent.id];
  if (oc && oc.closed) return { status: 'closed', reason: oc.reason || '临时关闭', source: 'override' };
  return { status: 'open', reason: null, source: null };
}

function adjacency(ctx) {
  const adj = new Map();
  for (const n of NODES) adj.set(n.id, []);
  for (const e of EDGES) {
    const st = ctx.edgeState.get(e.id);
    if (st.blocked) continue;
    const ns = ctx.nodeState.get(e.from);
    const nt = ctx.nodeState.get(e.to);
    if (ns && ns.locked) continue;
    if (nt && nt.locked) continue;
    adj.get(e.from).push({ edge: e, to: e.to });
    adj.get(e.to).push({ edge: e, to: e.from });
  }
  return adj;
}

const blockedEdgeInfo = (ctx, edgeId) => {
  const e = EDGES.find((x) => x.id === edgeId);
  const st = ctx.edgeState.get(edgeId);
  return { kind: 'edge', edgeId, name: `${e.from}↔${e.to}`, surface: e.surface, ...st };
};
const lockedNodeInfo = (ctx, nodeId) => ({ kind: 'node', nodeId, ...(ctx.nodeState.get(nodeId) || {}) });

export function dijkstra(ctx, start, goal, opts = {}) {
  const adj = adjacency(ctx);
  if (!adj.has(start) || !adj.has(goal)) return null;
  if (ctx.nodeState.get(start)?.locked || ctx.nodeState.get(goal)?.locked) return null;
  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const seen = new Set([start]);
  // 简单 O(V^2) 优先队列（节点规模小）
  while (seen.size) {
    let cur = null;
    for (const n of seen) if (cur === null || dist.get(n) < dist.get(cur)) cur = n;
    if (cur === goal) break;
    seen.delete(cur);
    for (const { edge, to } of adj.get(cur)) {
      if (opts.forbidEdge && opts.forbidEdge(edge)) continue;
      const d = dist.get(cur) + edge.minutes;
      if (!dist.has(to) || d < dist.get(to)) {
        dist.set(to, d);
        prev.set(to, { from: cur, edge });
        seen.add(to);
      }
    }
  }
  if (!prev.has(goal) && start !== goal) return null;
  const edges = [];
  let at = goal;
  while (at !== start) {
    const p = prev.get(at);
    if (!p) return null;
    edges.unshift(p.edge);
    at = p.from;
  }
  return { minutes: dist.get(goal), edgeIds: edges.map((e) => e.id), edges, nodes: pathNodes(start, edges) };
}

function pathNodes(start, edges) {
  const nodes = [start];
  let cur = start;
  for (const e of edges) {
    cur = e.from === cur ? e.to : e.from;
    nodes.push(cur);
  }
  return nodes;
}

// 不可达解释：逐个放开当前封闭对象，找出"放开后即可达"的关键阻断点
export function explainUnreachable(ctx, start, goal, opts = {}) {
  const base = dijkstra(ctx, start, goal, opts);
  if (base) return { connected: true, blockers: [] };
  const closedEdgeIds = [...ctx.edgeState].filter(([, s]) => s.blocked).map(([id]) => id);
  const lockedNodeIds = [...ctx.nodeState].filter(([, s]) => s.locked).map(([id]) => id);

  const relaxed = (edgeAllow, nodeAllow) => {
    const sub = {
      ...ctx,
      edgeState: new Map([...ctx.edgeState].map(([id, s]) =>
        edgeAllow.has(id) ? [id, { ...s, blocked: false }] : [id, s])),
      nodeState: new Map([...ctx.nodeState].map(([id, s]) =>
        nodeAllow.has(id) ? [id, { ...s, locked: false }] : [id, s])),
    };
    return !!dijkstra(sub, start, goal, opts);
  };

  const blockers = [];
  for (const id of closedEdgeIds) {
    if (relaxed(new Set([id]), new Set())) blockers.push(blockedEdgeInfo(ctx, id));
  }
  for (const id of lockedNodeIds) {
    if (relaxed(new Set(), new Set([id])) && !lockedNodeIds.some((x) => x === start)) {
      blockers.push(lockedNodeInfo(ctx, id));
    }
  }
  const anyPath = relaxed(new Set(closedEdgeIds), new Set(lockedNodeIds));
  return { connected: false, blockers, noNetworkEvenIfReopened: !anyPath };
}

// 沿路径收集实际阻断（用于主题路线逐段诊断）
export function blockersOnPath(ctx, edgeIds, nodeIds) {
  const out = [];
  for (const id of edgeIds) {
    const st = ctx.edgeState.get(id);
    if (st?.blocked) out.push(blockedEdgeInfo(ctx, id));
  }
  for (const id of nodeIds || []) {
    const st = ctx.nodeState.get(id);
    if (st?.locked) out.push(lockedNodeInfo(ctx, id));
  }
  return out;
}
