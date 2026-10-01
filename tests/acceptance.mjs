// 验收脚本：覆盖需求中全部关键验收点
import assert from 'node:assert/strict';
import { buildState, evaluateThemed, planWithLocks, findPath, bridgeEndStatus, evaluatePhoto, diagnose, edgeUsability } from '../js/graph.js';
import { bridges, edges, nodes, themedRoutes, profiles, photoChecks, TODAY, CATALOG } from '../js/data.js';

let pass = 0;
const ok = (name, cond, extra = '') => { assert.ok(cond, `FAIL: ${name} ${extra}`); console.log(`  ✔ ${name}`); pass++; };

const b1 = bridges.find((b) => b.id === 'b1');

console.log('【验收1】入口关闭：一端维护切断穿越，另一端观景不受影响（无整桥布尔）');
{
  const st = buildState(TODAY); // m1 生效
  const s = bridgeEndStatus(st, b1);
  const north = s.ends.find((e) => e.node.id === 'b1-n-gate');
  const south = s.ends.find((e) => e.node.id === 'b1-s-gate');
  ok('北岸入口开放', north.state.usable === true);
  ok('南岸入口关闭（m1）', south.state.usable === false);
  ok('结论=仅一端可进入/穿越切断', s.crossingNote.includes('仅一端'));
  // 北岸观景位仍可达；南端观景位不可达
  ok('北岸 np->n-view 可达（半日）', !!findPath(st, 'half', 'np', 'n-view'));
  ok('北岸 np->s-view 不可达', !findPath(st, 'half', 'np', 's-view'));
  ok('数据模型不存在 bridge.open 字段', b1.open === undefined);
}

console.log('【验收2】路线跨区：跨片区可行路径 + 维护时改道');
{
  const st = buildState(TODAY);
  // 直接按图：np -> dp 跨西谷溪/东溪，半日可行（走北岸 n-ramp 或林间 np-dp）
  const p = findPath(st, 'full', 'np', 'dp');
  ok('跨区 np->dp 存在路径', !!p);
  const crossEdge = p.edgeSeq.find((e) => e.crossDistricts);
  ok('路径包含跨片区连接段', !!crossEdge);
  // 预制 t2 跨区线经北岸缓坡在 m1 期间仍可行（局部更新/替代）
  const t2 = evaluateThemed(st, themedRoutes.find((t) => t.id === 't2'), 'full');
  ok('双溪一日跨区线 t2 当日可行（走北岸不受南端施工影响）', t2.feasible === true);
  // 若把北岸入口也关掉，跨区从 np 一侧的卧虹节点被切断，但 np-dp 林间径仍在 => 局部更新成立
  const st2 = buildState(TODAY, { entrancesClosed: ['b1-n-gate'] });
  const p2 = findPath(st2, 'full', 'np', 'dp');
  ok('两端入口都关后仍有 np-dp 林间径局部替代（桥梁穿越断，跨区不断）', !!p2);
  const t2b = evaluateThemed(st2, themedRoutes.find((t) => t.id === 't2'), 'full');
  ok('t2 因含卧虹节点而失效，规划器不静默改道', t2b.feasible === false);
}

console.log('【验收3】未知宽度/坡度：显示无法确认，不自动标亲子/无障碍');
{
  const st = buildState('2026-10-05'); // m2 延期窗口，g-vill 阻断
  // np-dp 宽度未知、坡度 7：半日/一日可过且带 warn；亲子直接硬阻断“无法确认适合儿童”
  const halfU = edgeUsability(st, edges.find((e) => e.id === 'np-dp'), 'half');
  ok('半日：未知宽度可步行通过但标注 unknowns', halfU.ok && halfU.unknowns.includes('width'));
  const famU = edgeUsability(st, edges.find((e) => e.id === 'np-dp'), 'family');
  ok('亲子：宽度未知 => 硬阻断并写明无法确认', !famU.ok && famU.hardReasons.some((r) => r.text.includes('无法确认') && r.text.includes('宽度')));
  const accU = edgeUsability(st, edges.find((e) => e.id === 'np-dp'), 'accessible');
  ok('无障碍：未知 => 无法确认无障碍', !accU.ok && accU.hardReasons.some((r) => r.text.includes('无法确认')));
  // 宽度坡度都未知的 g-vill
  const gv = edgeUsability(st, edges.find((e) => e.id === 'g-vill'), 'family');
  ok('g-vill 同时报宽度与坡度未知', gv.hardReasons.filter((r) => r.type === 'unknown').length >= 2);
  // 已知合格数据的 t3 亲子线可行（绝不因“保守”而误杀，也不凭空加标签）
  const t3 = evaluateThemed(st, themedRoutes.find((t) => t.id === 't3'), 'family');
  ok('廊桥亲子线 t3 以实测数据通过', t3.feasible && t3.timeOk);
  // 窄径超约束
  const narrow = edgeUsability(st, edges.find((e) => e.id === 'd-tea-xiyuan'), 'family');
  ok('1.6m/11% 窄径对亲子为宽度+坡度双超界', !narrow.ok && narrow.hardReasons.some(r=>r.type==='width') && narrow.hardReasons.some(r=>r.type==='slope'));
}

console.log('【验收4】锁定停留点不可达：解释关键阻断 + 局部更新');
{
  const st = buildState(TODAY);
  const r = planWithLocks(st, 'half', 'np', 'sp', ['s-view']);
  ok('计划判不可行', r.feasible === false);
  ok('报告锁定点 s-view 不可达', r.failedLocks.some((f) => f.stopId === 's-view'));
  const reasons = r.failedLocks.flatMap((f) => f.blockers.flatMap((b) => b.reasons));
  ok('解释中指出南岸入口被 m1 关闭', reasons.some((t) => t.text.includes('南岸入口') && t.maintId === 'm1'));
  ok('局部更新给出截断信息', r.truncated && Array.isArray(r.truncated.droppedStops));
  // 解除 m1 后锁定点可达 => 局部更新可恢复
  const st2 = buildState(TODAY, { ignoreMaint: ['m1'] });
  const r2 = planWithLocks(st2, 'half', 'np', 'sp', ['s-view']);
  ok('维护结束后同一路线恢复可行', r2.feasible === true);
}

console.log('【验收5】维护延期：计划日后仍命中');
{
  const st = buildState('2026-10-05'); // 原计划 10-02 完工，已延期至 10-12
  const g = st.edgeStatus['g-vill'];
  ok('10-05 g-vill 仍阻断（延期窗口）', g.usable === false);
  ok('阻断原因来自 m2', st.effects.some((e) => e.maintId === 'm2'));
  const after = buildState('2026-10-13');
  ok('10-13 延期窗口结束后 m2 不再命中', !after.effects.some((e) => e.maintId === 'm2'));
  // m1 在窗口外不影响
  const before = buildState('2026-09-20');
  ok('09-20 m1 尚未开始，南岸入口开放', before.entranceStatus['b1-s-gate'].usable);
}

console.log('【验收6】拍摄方向错误');
{
  const good = photoChecks.find((c) => c.id === 'p1');
  const badp = photoChecks.find((c) => c.id === 'p2');
  ok('合格样例 p1 通过(±35°)', evaluatePhoto(good, b1).pass === true);
  ok('错误样例 p2 判“拍摄方向错误”', evaluatePhoto(badp, b1).pass === false);
  ok('p2 偏差超过 35°', evaluatePhoto(badp, b1).delta > 35);
}

console.log('【验收7】离线包：缺块不可当完整 + 旧包回灌拒绝（包管理器另测）');
{
  ok('目录声明最低可激活=当前 v3', CATALOG.minActivatable === CATALOG.latest);
  ok('v1 标记为归档', CATALOG.packages.find((p) => p.version.endsWith('-v1')).archived === true);
}

console.log(`\n全部 ${pass} 项断言通过 ✅`);
