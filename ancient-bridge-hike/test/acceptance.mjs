// 验收测试（node test/acceptance.mjs，会自行拉起服务）
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srv = spawn(process.execPath, [join(root, 'server', 'server.mjs')], { env: { ...process.env, PORT: '4199' } });
const BASE = 'http://localhost:4199';
let passed = 0;
const fails = [];

const wait = async () => {
  for (let i = 0; i < 50; i += 1) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server not up');
};

const ok = (name, cond, extra = '') => {
  if (cond) { passed += 1; console.log(`  ✅ ${name}`); }
  else { fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const api = async (path, opts = {}) => {
  const r = await fetch(`${BASE}${path}`, { method: opts.body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, json: await r.json() };
};

await wait();
try {
  // ---- 场景一：验收入口关闭（无维护日，仅关一个入口）----
  console.log('\n[1] 入口关闭：一端关闭不抹掉另一端与观景的独立结论');
  {
    const { json: s } = await api('/api/stories?bridgeId=anj&date=2026-09-15', {
      body: { overrides: { entranceClosed: { ent_anj_n: { closed: true, reason: '验收演练：北入口临时关闭' } } } },
    });
    ok('桥梁对象没有顶层 open 布尔值', !('open' in s) && s.ends.length === 2);
    const north = s.ends.find((e) => e.key === 'north');
    const south = s.ends.find((e) => e.key === 'south');
    ok('北端入口 closed 且带原因', north.entrance.status === 'closed' && /临时关闭/.test(north.entrance.reason));
    ok('北端桥头不可达', north.deck.reachable === false);
    ok('南端入口仍 open', south.entrance.status === 'open' && south.deck.reachable === true);
    ok('穿越被判定不可行', s.crossing.possible === false);
    const vn = s.views.find((v) => v.end === 'north');
    const vs = s.views.find((v) => v.end === 'south');
    ok('北观景台不可达且阻断解释指向被关入口', vn.reachable === false && vn.blockers.some((b) => b.kind === 'node' && b.nodeId === 'n_anj_gate_n'));
    ok('南观景台依然可达（另一端不受影响）', vs.reachable === true);
  }

  // ---- 场景二：路线跨区 ----
  console.log('\n[2] 路线跨区：一日方案与双桥主题跨越两个片区');
  {
    const { json: day } = await api('/api/plans/search?planId=day&date=2026-09-15');
    ok('一日方案可行且时间在预算内', day.feasible === true && day.budgetFit === true);
    ok('跨片区标记为 true', day.crossedRegions.includes('qianxi') && day.crossedRegions.includes('songpo'));
    const { json: theme } = await api('/api/themes/evaluate?routeId=tr_two_bridges_day&date=2026-09-15');
    ok('双桥主题 crossRegion=true', theme.crossRegion === true && theme.feasible === true);
    ok('比较接口同时返回主题与搜索', !!(await api('/api/compare?routeId=tr_two_bridges_day&planId=day&date=2026-09-15')).json.comparison);
  }

  // ---- 场景三：旧包回灌 ----
  console.log('\n[3] 离线包：旧版本回灌拒绝、增量基线校验');
  {
    const rollback = await api('/api/packages/evaluate', { body: { toVersion: '3.0.0', mode: 'full', currentVersion: '4.0.0' } });
    ok('4.0.0 已装时导入 3.0.0 返回 409 stale_rollback', rollback.status === 409 && rollback.json.code === 'stale_rollback');
    const delta = await api('/api/packages/evaluate', { body: { toVersion: '4.0.0', mode: 'delta', currentVersion: '2.0.0' } });
    ok('增量基线不匹配被拒', delta.status === 409 && delta.json.code === 'delta_base_mismatch');
    const deltaOk = await api('/api/packages/evaluate', { body: { toVersion: '4.0.0', mode: 'delta', currentVersion: '3.0.0' } });
    ok('4.0.0 增量只需 stories/media 两块', deltaOk.json.decision.chunks.length === 2);
  }

  // ---- 场景四：缺块不得当完整可用 ----
  console.log('\n[4] 离线包：缺块/坏块不得当完整可用');
  {
    const full = await api('/api/packages/evaluate', { body: { toVersion: '3.0.0', mode: 'full' } });
    ok('全块到齐且哈希匹配才 usable', full.json.assess.usable === true);
    const partial = await api('/api/packages/evaluate', {
      body: { toVersion: '3.0.0', mode: 'full', fetchedChunkIds: ['core', 'stories', 'map'] },
    });
    ok('缺 media 块时 usable=false 且点名缺块', partial.json.assess.usable === false && partial.json.assess.missing.includes('media'));
  }

  // ---- 场景五：拍摄方向错误 ----
  console.log('\n[5] 拍摄方向错误：背对桥梁的素材被识别');
  {
    const good = await api('/api/media/check?mediaId=m2');
    const bad = await api('/api/media/check?mediaId=m3_bad');
    ok('正确素材方向通过（偏差≤35°）', good.json.ok === true);
    ok('错误素材判 wrong_direction 且识别为几乎背对', bad.json.ok === false && bad.json.code === 'wrong_direction' && bad.json.opposite === true);
  }

  // ---- 场景六：维护延期 ----
  console.log('\n[6] 维护延期：9/30 仍在延期窗口，切穿越但不抹另一端观景');
  {
    const { json: s } = await api('/api/stories?bridgeId=anj&date=2026-09-30');
    const north = s.ends.find((e) => e.key === 'north');
    ok('北端入口本身仍开放（门没关，是引道在修）', north.entrance.status === 'open');
    ok('北端桥头因引道维护不可达', north.deck.reachable === false);
    const mnt = north.deck.blockers?.find((b) => b.maintenance?.delayed);
    ok('阻断带延期标记且原窗口已过期', !!mnt && mnt.maintenance.original.end === '2026-09-27' && mnt.maintenance.end === '2026-10-08');
    const south = s.ends.find((e) => e.key === 'south');
    ok('南端观景与桥头不受影响', south.deck.reachable === true && s.views.find((v) => v.end === 'south').reachable === true);
    ok('桥面穿越不可行；绕行山路不算过桥', s.crossing.possible === false && s.crossing.usesBridgeDeck === false);
  }

  // ---- 场景七：锁定停留点不可达的解释 + 局部更新 ----
  console.log('\n[7] 锁定点不可达解释、解锁后局部更新');
  {
    const ov = { overrides: { entranceClosed: { ent_anj_n: { closed: true, reason: '北入口关闭' } } } };
    const locked = await api('/api/plans/search?planId=half&date=2026-09-15',
      { body: { ...ov, lockedNodeIds: ['n_anj_vp_n', 'n_anj_vp_s'] } });
    const badLeg = locked.json.legs.find((l) => l.target === 'n_anj_vp_n');
    ok('锁定点不可达 => 整体 infeasible', locked.json.feasible === false);
    ok('给出锁定不可达解释且不静默改点', badLeg.decision === 'locked_unreachable' && /锁定停留点/.test(badLeg.explanation));

    const unlocked = await api('/api/plans/search?planId=half&date=2026-09-15', { body: ov });
    const skipLeg = unlocked.json.legs.find((l) => l.target === 'n_anj_vp_n');
    ok('未锁定时跳过该点并局部更新，方案仍可行', skipLeg.decision === 'skipped_local_update' && unlocked.json.feasible === true);

    const pu = await api('/api/themes/partial', {
      body: { date: '2026-09-15', ...ov, routeId: 'tr_anj_half', replacements: { n_anj_vp_n: 'n_anj_vp_s' } },
    });
    ok('主题路线局部更新后恢复可行', pu.json.feasible === true && pu.json.updatedStops.some((x) => x.replaced));
  }

  // ---- 场景八：宽度/坡度未知 -> 无法确认，不自动贴儿童/无障碍标签 ----
  console.log('\n[8] 未知宽度坡度不臆断；不自动认证适合儿童/无障碍');
  {
    const fam = await api('/api/plans/search?planId=family&date=2026-09-15', {
      body: { overrides: { edgeBlocked: {
        e_anj_s_gate_j2: { blocked: true, reason: '南口支路封闭演练' },
        e_anj_j1_j2: { blocked: true, reason: '盘山路封闭演练' },
      } } },
    });
    const leg = fam.json.legs[0];
    ok('被迫绕行未测段时童车结论为 unconfirmed', leg.strollerCert === 'unconfirmed' && leg.unknown.length > 0);
    ok('警告中出现"无法确认"', fam.json.warnings.some((w) => w.includes('无法确认')));
    const jsonText = JSON.stringify(fam.json);
    ok('响应中不出现 accessible/childFriendly:true 这类自动认证', !/"accessible":true/.test(jsonText) && !/"childFriendly":true/.test(jsonText));
    ok('明确的不做无障碍承诺声明', /不做无障碍/.test(fam.json.accessibilityStatement));
  }
} finally {
  srv.kill();
}

console.log(`\n结果：${passed} 通过，${fails.length} 失败`);
if (fails.length) { console.error('失败项：', fails); process.exit(1); }
