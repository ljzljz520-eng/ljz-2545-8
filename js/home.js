import { mountChrome, heroArt, el, badge, mapSVG, $ } from './ui.js';
import { bridges, maintenance, TODAY, nodes, edges, BRIDGE_LOAD_NOTE } from './data.js';
import { buildState, bridgeEndStatus } from './graph.js';

mountChrome('index.html');
$('#hero-art').append(heroArt());
$('#today').textContent = TODAY;

const state = buildState(TODAY);

// 桥梁卡片
const bc = $('#bridge-cards');
for (const b of bridges) {
  const st = bridgeEndStatus(state, b);
  const openEnds = st.ends.filter((x) => x.state.usable).length;
  bc.append(el('a', { class: 'card cardlink', href: `bridge.html?id=${b.id}` },
    el('h3', {}, b.name, ' ', el('span', { class: 'tag moss' }, b.type)),
    el('p', { class: 'muted' }, b.dynasty),
    el('p', {}, `桥长约 ${b.deckLenM}m · 桥面宽 ${b.deckWidthM}m · ${b.spanM}m 跨（虚构数据）`),
    el('p', {}, badge(openEnds === st.ends.length,
      openEnds === st.ends.length ? `两端入口均可进入` : openEnds === 1 ? `仅 ${openEnds} 端入口可进入（另一端维护）` : '两端入口均关闭')),
    el('p', { class: 'muted', html: st.crossingNote }),
  ));
}

// 今日维护与状态
const ts = $('#today-status');
const active = maintenance.filter((m) => m.status !== 'done' &&
  TODAY >= m.start && TODAY <= (m.status === 'delayed' ? m.rescheduledTo : (m.endActual || m.endPlanned)));
if (!active.length) {
  ts.append(el('div', { class: 'notice ok' }, '基准日无进行中维护。'));
}
for (const m of active) {
  const affected = m.affects.map((a) =>
    a.kind === 'entrance'
      ? `入口「${nodes.find((n) => n.id === a.id)?.name}」${a.effect === 'closed' ? '关闭' : '受限'}`
      : `通行段「${edges.find((e) => e.id === a.id)?.surface}」${a.effect === 'blocked' ? '封断' : '受限'}`);
  ts.append(el('div', { class: m.status === 'delayed' ? 'notice warn' : 'notice guard' },
    el('b', {}, `${m.status === 'delayed' ? '🛠 已延期 · ' : '🛠 进行中 · '}${m.title}`),
    el('div', {}, `区间：${m.start} → ${m.status === 'delayed' ? `${m.endPlanned}（已延期至 ${m.rescheduledTo}）` : m.endPlanned}`),
    el('div', {}, '作用对象：' + affected.join('；')),
    m.delayReason ? el('div', { class: 'muted' }, '延期原因：' + m.delayReason) : null,
    el('div', { class: 'muted' }, m.note),
  ));
}
ts.append(mapSVG({ state, profileKey: 'half' }));
ts.append(el('p', { class: 'muted' }, BRIDGE_LOAD_NOTE));
