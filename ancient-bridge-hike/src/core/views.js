// 桥梁故事装配：输出结构、端级入口、观景可达与保护提示。
// 刻意不输出 bridge.open —— 同一时刻可能"不能穿越，但能在一端观景"。

import { BRIDGES, ENTRANCES, bridgeById, entrancesOfBridge, nodeById, regionName } from './catalog.js';
import { dijkstra, explainUnreachable, entranceState } from './graph.js';

// 桥梁端点几何（哪些节点属于哪一端、穿越段是哪条 edge、观景点挂在哪端）
export const BRIDGE_GEOM = {
  anj: {
    ends: [
      { key: 'north', label: '北端', entranceId: 'ent_anj_n', portal: 'n_anj_gate_n', deck: 'n_anj_deck_n' },
      { key: 'south', label: '南端', entranceId: 'ent_anj_s', portal: 'n_anj_gate_s', deck: 'n_anj_deck_s' },
    ],
    crossingEdge: 'e_anj_cross',
    views: [
      { node: 'n_anj_vp_n', end: 'north', label: '北滩观景石' },
      { node: 'n_anj_vp_s', end: 'south', label: '南樟观景台' },
    ],
  },
  qfl: {
    ends: [
      { key: 'west', label: '西端', entranceId: 'ent_qfl_w', portal: 'n_qfl_gate_w', deck: 'n_qfl_deck_w' },
      { key: 'east', label: '东端', entranceId: 'ent_qfl_e', portal: 'n_qfl_gate_e', deck: 'n_qfl_deck_e' },
    ],
    crossingEdge: 'e_qfl_cross',
    views: [
      { node: 'n_qfl_vp', end: 'west', label: '潭边观景石' },
    ],
  },
};

const endStatus = (ctx, geom, end, crossingEdgeId) => {
  const ent = ENTRANCES.find((x) => x.id === end.entranceId);
  const gate = entranceState(ctx, ent);
  const forbidOwnCrossing = (e) => e.id === crossingEdgeId;
  let deckPath = dijkstra(ctx, end.portal, end.deck, { forbidEdge: forbidOwnCrossing });
  let deckInfo;
  if (gate.status === 'closed') {
    deckInfo = { reachable: false, reason: gate.reason, via: '入口已关闭' };
  } else if (deckPath) {
    deckInfo = { reachable: true, minutes: deckPath.minutes, edgeIds: deckPath.edgeIds };
  } else {
    const why = explainUnreachable(ctx, end.portal, end.deck, { forbidEdge: forbidOwnCrossing });
    deckInfo = { reachable: false, reason: '入口开放但引道暂不可达', blockers: why.blockers };
  }
  return { key: end.key, label: end.label, entrance: { id: ent.id, name: ent.name, ...gate, accessNote: ent.accessNote }, deck: deckInfo };
};

export function bridgeStory(ctx, bridgeId, originId) {
  const b = bridgeById(bridgeId);
  if (!b) return null;
  const geom = BRIDGE_GEOM[bridgeId];
  const defaultOrigin = bridgeId === 'anj' ? 'n_anj_visitor' : 'n_songpo_gate';
  const origin = originId || defaultOrigin;

  const ends = geom.ends.map((e) => endStatus(ctx, geom, e, geom.crossingEdge));

  // 穿越：两端门户之间必须走到桥面穿越段，绕行山路不算"过桥"
  const [a, z] = [geom.ends[0], geom.ends[geom.ends.length - 1]];
  const crossPath = dijkstra(ctx, a.portal, z.portal);
  const crossing = (() => {
    if (!crossPath) {
      const why = explainUnreachable(ctx, a.portal, z.portal);
      return { possible: false, usesBridgeDeck: false, reason: '两端之间当前无通路', blockers: why.blockers,
               noNetworkEvenIfReopened: why.noNetworkEvenIfReopened };
    }
    const usesDeck = crossPath.edgeIds.includes(geom.crossingEdge);
    return {
      possible: usesDeck,
      usesBridgeDeck: usesDeck,
      minutes: crossPath.minutes,
      edgeIds: crossPath.edgeIds,
      reason: usesDeck ? null : '两岸可绕行，但该路径不走古桥桥面，不计为穿越古桥',
    };
  })();

  // 观景点：逐个独立求值（一端维护不应抹掉另一端观景结论）
  const views = geom.views.map((v) => {
    const node = nodeById(v.node);
    const path = dijkstra(ctx, origin, v.node);
    if (path) {
      return { node: v.node, end: v.end, label: v.label, reachable: true, minutes: path.minutes,
               edgeIds: path.edgeIds, bearingToBridgeDeg: node.bearingToBridgeDeg ?? null };
    }
    const why = explainUnreachable(ctx, origin, v.node);
    return { node: v.node, end: v.end, label: v.label, reachable: false,
             blockers: why.blockers, noNetworkEvenIfReopened: why.noNetworkEvenIfReopened,
             bearingToBridgeDeg: node.bearingToBridgeDeg ?? null };
  });

  return {
    id: b.id,
    name: b.name,
    nameEn: b.nameEn,
    dynasty: b.dynasty,
    region: { id: b.region, name: regionName(b.region) },
    story: b.story,
    structure: b.structure,
    // 注意：没有顶层 open/closed 字段——状态在 ends / crossing / views 上分别给出
    ends,
    crossing,
    views,
    protection: b.protection,
    evaluatedAt: ctx.date,
    origin: nodeById(origin)?.name || origin,
  };
}

export function allStories(ctx, originId) {
  return BRIDGES.map((b) => bridgeStory(ctx, b.id, originId));
}
