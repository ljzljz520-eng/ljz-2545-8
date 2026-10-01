// 拍摄方向校验：素材镜头方位角应朝向桥梁所在方位。
// node.bearingToBridgeDeg 是观景点上"桥相对镜头"的罗盘方位；
// 素材 bearingDeg 偏差超过容差即判为拍摄方向错误（例如镜头朝反方向）。

import { nodeById } from './catalog.js';

const TOLERANCE_DEG = 35;

export function angularDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function checkBearing(media, toleranceDeg = TOLERANCE_DEG) {
  const node = nodeById(media.nodeId);
  if (!node || node.bearingToBridgeDeg == null) {
    return { ok: false, code: 'no_reference', message: `节点 ${media.nodeId} 没有桥梁方位基准，无法核对拍摄方向` };
  }
  const diff = angularDiff(media.bearingDeg, node.bearingToBridgeDeg);
  const ok = diff <= toleranceDeg;
  return {
    ok,
    code: ok ? 'direction_ok' : 'wrong_direction',
    mediaId: media.id,
    nodeId: media.nodeId,
    expectedBearingDeg: node.bearingToBridgeDeg,
    actualBearingDeg: media.bearingDeg,
    diffDeg: Math.round(diff),
    toleranceDeg,
    opposite: diff >= 150,
    message: ok
      ? `方向正确：偏差 ${Math.round(diff)}°（容差 ${toleranceDeg}°）。`
      : `拍摄方向错误：镜头 ${media.bearingDeg}°，桥在 ${node.bearingToBridgeDeg}°，偏差 ${Math.round(diff)}°` +
        (diff >= 150 ? '，几乎背对桥梁（镜头朝向反方向）。' : '，超出容差。'),
  };
}
