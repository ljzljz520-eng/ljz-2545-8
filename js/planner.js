import { mountChrome, el, clear, mapSVG, badge, $, $$, setSelectValue, getSelectValue } from './ui.js';
import { nodes, edges, themedRoutes, profiles, maintenance, TODAY, DISTRICTS } from './data.js';
import { buildState, evaluateThemed, planWithLocks, findPath, diagnose, nodeById } from './graph.js';

mountChrome('planner.html');

const scenario = {
  date: TODAY, closeEntrance: '', blockEdge: '', ignoreMaint: '',
};

// ---------- 填充选择器（select 只查询一次并缓存） ----------
function fillSelect(selector, items, selectedValue) {
  const sel = $(selector);
  for (const it of items) sel.append(el('option', { value: it.value }, it.label));
  if (selectedValue) {
    const hit = [...sel.options].find((o) => o.value === selectedValue);
    if (hit) hit.selected = true;
  }
}
fillSelect('#close-entrance', nodes.filter((n) => n.kind === 'entrance')
  .map((n) => ({ value: n.id, label: n.name })));
fillSelect('#block-edge', edges
  .map((e) => ({ value: e.id, label: `${e.id} · ${nodeById[e.a].name}↔${nodeById[e.b].name}` })));
fillSelect('#ignore-maint', maintenance.filter((m) => m.status !== 'done')
  .map((m) => ({ value: m.id, label: `${m.id} · ${m.title}` })));
fillSelect('#themed-profile', Object.entries(profiles).map(([key, p]) => ({ value: key, label: p.name })), 'half');
fillSelect('#search-profile', Object.entries(profiles).map(([key, p]) => ({ value: key, label: p.name })), 'half');
const nodeItems = nodes.map((n) => ({ value: n.id, label: n.name }));
fillSelect('#start-node', nodeItems, 'np');
fillSelect('#finish-node', nodeItems, 'dp');
fillSelect('#lock-nodes', nodeItems);

function overrides() {
  return {
    entrancesClosed: scenario.closeEntrance ? [scenario.closeEntrance] : [],
    edgesBlocked: scenario.blockEdge ? [scenario.blockEdge] : [],
    ignoreMaint: scenario.ignoreMaint ? [scenario.ignoreMaint] : [],
  };
}

// ---------- 标签页 ----------
let tab = 'themed';
function setTab(t) {
  tab = t;
  $('#tab-themed').classList.toggle('active', t === 'themed');
  $('#tab-search').classList.toggle('active', t === 'search');
  $('#pane-themed').hidden = t !== 'themed';
  $('#pane-search').hidden = t !== 'search';
  render();
}
$('#tab-themed').onclick = () => setTab('themed');
$('#tab-search').onclick = () => setTab('search');

// ---------- 场景 ----------
$('#date').onchange = (e) => { scenario.date = e.target.value; render(); };
$('#close-entrance').onchange = (e) => { scenario.closeEntrance = getSelectValue(e.target); render(); };
$('#block-edge').onchange = (e) => { scenario.blockEdge = getSelectValue(e.target); render(); };
$('#ignore-maint').onchange = (e) => { scenario.ignoreMaint = getSelectValue(e.target); render(); };
$('#reset-scenario').onclick = () => {
  Object.assign(scenario, { date: TODAY, closeEntrance: '', blockEdge: '', ignoreMaint: '' });
  $('#date').value = TODAY; setSelectValue($('#close-entrance'), ''); setSelectValue($('#block-edge'), ''); setSelectValue($('#ignore-maint'), '');
  render();
};
$('#scenario-delay').onclick = () => {
  // m2 延期：日期已在延期窗口；切到 m2 阻断所在片区并说明
  scenario.ignoreMaint = ''; setSelectValue($('#ignore-maint'), '');
  scenario.date = '2026-10-05'; $('#date').value = scenario.date;
  setSelectValue($('#search-profile'), 'family');
  setSelectValue($('#start-node'), 'xiyuan-stop'); setSelectValue($('#finish-node'), 'dp');
  setTab('search'); runSearch();
  desc('已切换 2026-10-05：m2 挡墙排险处于延期窗口（顺延至 10-12），g-vill 继续阻断；亲子方案经过时还会叠加宽度/坡度未知的“无法确认”。');
};
$('#scenario-north').onclick = () => {
  scenario.closeEntrance = 'b1-n-gate'; setSelectValue($('#close-entrance'), 'b1-n-gate');
  render();
  desc('已额外关闭北岸入口：叠加南岸维护后，卧虹桥两端入口均不可进入（注意仍不设“整桥关闭”布尔，仅两端入口状态同时为关）。');
};

function desc(t) { $('#scenario-desc').textContent = t || ''; }

// ---------- 渲染 ----------
function state() { return buildState(scenario.date, overrides()); }

function render() {
  const st = state();
  $('#map').innerHTML = '';
  $('#map').append(mapSVG({ state: st }));
  if (tab === 'themed') renderThemed(st); else renderSearchIdle(st);
  // 描述当前生效维护
  const lines = st.effects.map((x) => `${x.maintId} 作用于 ${x.kind === 'entrance' ? '入口' : '通行段'} ${x.id}`);
  if (!$('#scenario-desc').textContent)
    desc(lines.length ? `当日命中维护：${lines.join('；')}。` : '当日无命中维护。');
}

function profileNote(key) {
  const p = profiles[key];
  return el('div', { class: 'notice info', style: 'margin:8px 0' },
    el('b', {}, `${p.name}硬约束`),
    `宽度 ≥ ${p.minWidthM}m · 坡度 ≤ ${p.maxSlopePct}%` +
    (p.maxMin ? ` · 总时长 ≤ ${p.maxMin} 分钟` : '') + '。' + p.note);
}

// ---------- 预制主题 ----------
function renderThemed(st) {
  const key = getSelectValue($('#themed-profile'));
  const list = $('#themed-list'); clear(list);
  list.append(profileNote(key));
  for (const route of themedRoutes) {
    const r = evaluateThemed(st, route, key);
    const cross = String(route.district).includes('→');
    list.append(el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('b', {}, route.name), el('span', 'spacer'),
        el('span', { class: 'tag mist' }, profiles[route.profile].name + '原生'),
        cross ? el('span', { class: 'tag moss' }, '跨片区') : null,
        badge(r.feasible && r.timeOk, r.feasible ? (r.timeOk ? '全程可行' : '可行但超时') : '当日不可行')),
      el('p', { class: 'muted' }, route.desc),
      el('div', { class: 'muted' },
        `逐段结果：${r.legResults.filter(l=>l.ok).length}/${r.legResults.length} 段可达 · ` +
        `步行约 ${r.totalLen}m / ${r.walkMin} 分钟 · 停留 ${r.dwellMin} 分钟 · 合计 ${r.totalMin} 分钟` +
        (route.timeBudgetMin ? `（预算 ${route.timeBudgetMin}）` : '')),
      r.warns.length ? el('div', { class: 'notice warn' }, '⚠ 数据不完整：' + r.warns.join('；')) : null,
      el('details', {},
        el('summary', { style: 'cursor:pointer;font-size:13px;color:#446673' }, '查看逐段核验与阻断解释'),
        legList(r.legResults, st, key)),
      el('div', { class: 'row', style: 'margin-top:8px' },
        el('button', { class: 'ghost', onclick: () => { $('#map').innerHTML=''; $('#map').append(mapSVG({ state: st, highlightNodeSeq: r.feasible ? flattenLegs(r.legResults) : null })); } },
          '在图上高亮该路线')),
    ));
  }
}
$('#themed-profile').onchange = () => render();

function flattenLegs(legs) {
  const seq = [];
  for (const leg of legs) if (leg.ok) {
    if (!seq.length) seq.push(...leg.path.nodeSeq);
    else seq.push(...leg.path.nodeSeq.slice(1));
  }
  return seq;
}

function legList(legs, st, key) {
  const box = el('div', {});
  for (const leg of legs) {
    if (leg.ok) {
      box.append(el('div', { class: 'leg' },
        el('div', {}, badge(true, `第 ${leg.index + 1} 段可行 · ${leg.lenM}m`)),
        el('div', { class: 'pathname', html: pathHTML(leg.path.nodeSeq) }),
        leg.path.warns.length ? el('div', { class: 'notice warn', style: 'margin:6px 0' }, leg.path.warns.join('；')) : null));
    } else {
      box.append(el('div', { class: 'leg bad' },
        el('div', {}, badge(false, `第 ${leg.index + 1} 段不可行：${nodeById[leg.from].name} → ${nodeById[leg.to].name}`)),
        blockerList(leg.blockers),
        el('div', { class: 'muted', style: 'margin-top:6px' },
          '预制路线处理原则：不静默改道。该段失效则整条主题线当日不可用；如需替代请改用“按图搜索”并锁定仍可达的停留点。')));
    }
  }
  return box;
}

// ---------- 按图搜索 ----------
function renderSearchIdle() { $('#result').innerHTML = '<div class="notice info">设定起终点与锁定停留点后点击「求可行路径」。</div>'; }

$('#run-search').onclick = runSearch;
$('#search-profile').onchange = () => {};

$('#demo-lock').onclick = () => {
  setTab('search');
  setSelectValue($('#search-profile'), 'half');
  setSelectValue($('#start-node'), 'np'); setSelectValue($('#finish-node'), 'sp');
  [...$('#lock-nodes').options].forEach((o) => (o.selected = o.value === 's-view'));
  runSearch();
  desc('演示：m1 关闭南岸入口，锁定的「南端观景位」不可达——规划器必须给出解释，而不是悄悄绕开或谎报可达。');
};

function runSearch() {
  const st = state();
  const key = getSelectValue($('#search-profile'));
  const start = getSelectValue($('#start-node')), finish = getSelectValue($('#finish-node'));
  const locks = [...$('#lock-nodes').options].filter((o) => o.selected).map((o) => o.value);
  const r = planWithLocks(st, key, start, finish, locks);

  $('#map').innerHTML = '';
  const okSeq = r.feasible ? flattenLegs(r.legs.map((l) => l.ok ? { path: l.path } : null).filter(Boolean)) : null;
  $('#map').append(mapSVG({ state: st, highlightNodeSeq: okSeq, blockedIds: collectBlocked(r) }));

  const box = $('#result'); clear(box);
  box.append(profileNote(key));
  box.append(el('div', { class: 'card' },
    el('div', { class: 'row' },
      el('b', {}, '搜索结果'), el('span', 'spacer'),
      badge(r.feasible, r.feasible ? '存在满足约束的可行路径' : '当前约束下不可行')),
    el('div', { class: 'muted' },
      `${nodeById[start].name} → ${locks.map((l) => nodeById[l].name).join(' → ')}${locks.length ? ' → ' : ''}${nodeById[finish].name}`),
    el('div', { class: 'muted' }, `累计可行段约 ${r.totalLen}m，步行约 ${r.walkMin} 分钟（不含停留）。`),
    r.warns.length ? el('div', { class: 'notice warn' }, '⚠ 无法确认分级：' + r.warns.join('；') + '——不自动标“适合儿童/无障碍”。') : null));

  // 逐段
  for (const leg of r.legs) {
    if (leg.ok) {
      box.append(el('div', { class: 'leg' },
        el('div', {}, badge(true, `${nodeById[leg.from].name} → ${nodeById[leg.to].name} · ${leg.lenM}m`)),
        el('div', { class: 'pathline', html: pathHTML(leg.path.nodeSeq) }),
        leg.path.warns.length ? el('div', { class: 'notice warn', style: 'margin:6px 0' }, leg.path.warns.join('；')) : null));
    } else {
      box.append(el('div', { class: 'leg bad' },
        el('div', {}, badge(false, leg.isLock ? `锁定停留点「${nodeById[leg.to].name}」不可达` : `${nodeById[leg.from].name} → ${nodeById[leg.to].name} 不可达`)),
        blockerList(leg.blockers),
        el('div', { class: 'notice guard', style: 'margin-top:8px' },
          el('b', {}, '为什么不可达（解释）'), leg.localFix.summary),
        el('ul', { class: 'muted' }, ...leg.localFix.actions.map((a) => el('li', {}, a)))));
    }
  }

  // 局部更新 / 截断计划
  if (!r.feasible && r.truncated) {
    const t = r.truncated;
    box.append(el('div', { class: 'card', style: 'border-color:#b98a3f' },
      el('h3', { style: 'margin-top:0' }, '局部更新建议（不重排整条路线）'),
      el('div', {}, '保留可达锚点：', el('b', {}, nodeById[t.anchor].name)),
      el('div', {}, '仍可执行的锁定点：', t.keepStops.length ? t.keepStops.map((s) => nodeById[s].name).join('、') : '无（首个锁定点即不可达）'),
      el('div', {}, '待维护结束/补测绘后局部补回：', t.droppedStops.length ? t.droppedStops.map((s) => nodeById[s].name).join('、') : '无'),
      el('div', { class: 'muted' }, t.finishReachableFromAnchor ? '从锚点到终点仍可达，可先走“截断版”。' : '从锚点到终点同样被切断，只能执行到锚点为止；不编造绕行。')));
  }
}

function collectBlocked(r) {
  const ids = new Set();
  for (const leg of r.legs) if (!leg.ok) for (const b of leg.blockers || []) if (b.onFrontier) ids.add(b.id);
  return [...ids];
}
function blockerList(blockers) {
  if (!blockers.length) return el('div', { class: 'muted' }, '（未定位到前沿阻断边：可能是起终点本身封闭）');
  return el('ul', { class: 'reason-list' },
    ...blockers.filter((b) => b.onFrontier).map((b) =>
      el('li', {}, el('b', {}, b.label + '：'),
        el('ul', {}, ...b.reasons.map((rr) => el('li', {}, rr.text))))));
}
function pathHTML(seq) {
  return seq.map((id, i) => (i ? ' → ' : '') + `<b>${nodeById[id].name}</b>`).join('');
}

render();
