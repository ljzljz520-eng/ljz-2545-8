// 共享 UI：页眉/页脚、原创 SVG 插画、动态平面图、小组件
import { nodes as NODES, edges as EDGES, bridges as BRIDGES, DISTRICTS } from './data.js';
import { nodeById } from './graph.js';

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
// 跨实现稳健的 select 取值/赋值（真实浏览器原生支持 value，这里同时兜底 option.selected）
export function setSelectValue(sel, value) {
  const hit = [...sel.options].find((o) => o.value === value);
  if (hit) hit.selected = true;
}
export function getSelectValue(sel) {
  const hit = [...sel.options].find((o) => o.selected);
  return hit ? hit.value : (sel.options[0]?.value ?? '');
}

export function badge(ok, text, kind) {
  const k = kind || (ok === true ? 'ok' : ok === false ? 'bad' : 'neutral');
  return el('span', { class: `badge ${k}` }, el('i', { class: `dot ${k}` }), text);
}

export function mountChrome(active) {
  const header = el('header', { class: 'site' },
    el('div', { class: 'site-bar' },
      el('a', { class: 'brand', href: 'index.html' },
        el('span', { class: 'seal' }, '桥'),
        el('span', {}, el('b', {}, '古桥徒步'), el('small', {}, 'GUSHIAO HIKING · 溪谷古桥导览'))),
      el('nav', { class: 'top' },
        ...[['index.html', '首页'], ['bridge.html', '桥梁故事'], ['planner.html', '路线规划'], ['offline.html', '离线包']]
          .map(([h, t]) => el('a', { href: h, class: h === active ? 'active' : '' }, t))),
    ),
  );
  const footer = el('footer', { class: 'site' },
    el('div', { class: 'wrap' },
      el('p', { class: 'fiction-note' },
        '⚠ 本站全部桥梁、地名、历史叙述与测绘数字均为虚构教学示例；不提供任何真实桥梁承载、吨级或车辆通行保证。'),
      el('p', {}, '古桥徒步导览 · 溪石纸本设计 · 纯前端无第三方资源 · 数据按“桥梁本体 / 入口 / 通行段 / 维护项目”分对象建模'),
    ),
  );
  document.body.prepend(header);
  document.body.append(footer);
  return header;
}

// ---------- 原创 SVG：溪谷石拱桥意境图（首页英雄） ----------
export function heroArt() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 520 320');
  svg.setAttribute('role', 'img');
  svg.innerHTML = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dfe8e4"/><stop offset="1" stop-color="#f4efe3"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fb9c2"/><stop offset="1" stop-color="#6f909c"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8b9187"/><stop offset="1" stop-color="#5d655d"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="520" height="320" fill="url(#sky)"/>
  <circle cx="400" cy="70" r="34" fill="#e8d9b0" opacity=".8"/>
  <path d="M0,210 C90,190 140,205 210,196 C300,184 380,205 520,190 L520,320 L0,320 Z" fill="#7c9477" opacity=".55"/>
  <path d="M0,232 C120,220 220,238 330,226 C410,218 470,228 520,222 L520,320 L0,320 Z" fill="#5c7a55" opacity=".5"/>
  <rect x="0" y="250" width="520" height="70" fill="url(#water)"/>
  <!-- 桥体：单孔石拱（原创绘制） -->
  <g>
    <path d="M140,252 L140,196 Q260,118 380,196 L380,252 L340,252 L340,206 Q260,146 180,206 L180,252 Z" fill="url(#stone)"/>
    <path d="M180,252 L180,206 Q260,146 340,206 L340,252 Z" fill="#dfe8e4" opacity=".92"/>
    <path d="M132,196 Q260,106 388,196 L380,196 Q260,118 140,196 Z" fill="#485049"/>
    <g stroke="#3d443d" stroke-width="1.4" opacity=".55">
      <line x1="170" y1="180" x2="200" y2="236"/><line x1="200" y1="160" x2="215" y2="244"/>
      <line x1="232" y1="150" x2="236" y2="248"/><line x1="268" y1="150" x2="264" y2="248"/>
      <line x1="300" y1="160" x2="285" y2="244"/><line x1="330" y1="180" x2="300" y2="236"/>
    </g>
    <rect x="126" y="188" width="268" height="10" fill="#6f7770"/>
    <g fill="#3d443d">
      ${[150, 185, 220, 300, 335, 370].map((x) => `<rect x="${x}" y="168" width="7" height="24" rx="2"/>`).join('')}
    </g>
  </g>
  <!-- 倒影 -->
  <path d="M180,252 Q260,312 340,252" fill="none" stroke="#eef3f0" stroke-width="3" opacity=".7"/>
  <g stroke="#eef3f0" stroke-width="1.4" opacity=".45">
    <line x1="40" y1="268" x2="110" y2="268"/><line x1="410" y1="272" x2="490" y2="272"/>
    <line x1="60" y1="290" x2="130" y2="290"/><line x1="390" y1="296" x2="470" y2="296"/>
  </g>
  <path d="M240,40 q10,-14 22,0 q12,-14 22,0" fill="none" stroke="#8b9187" stroke-width="2" opacity=".5"/>
  <text x="24" y="40" fill="#5d554a" font-size="15" letter-spacing="6" font-family="serif">溪谷寻桥</text>`;
  return el('div', { class: 'hero-fig' }, svg);
}

// ---------- 原创 SVG：石拱桥结构示意（故事页） ----------
export function archSectionFig(bridge) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', '0 0 560 260');
  svg.innerHTML = `
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="#8e3320"/></marker></defs>
  <rect width="560" height="260" fill="#fbf8ef"/>
  <line x1="30" y1="210" x2="530" y2="210" stroke="#6f7770" stroke-width="2"/>
  <text x="30" y="232" font-size="12" fill="#5d554a">基岩河床（虚构示意，不按比例）</text>
  <path d="M90,210 L90,150 Q280,52 470,150 L470,210 L430,210 L430,158 Q280,86 130,158 L130,210 Z" fill="#8b9187"/>
  <path d="M130,210 L130,158 Q280,86 430,158 L430,210 Z" fill="#efe9d8"/>
  <g stroke="#5d655d" stroke-width="1" opacity=".6">
    ${Array.from({ length: 9 }, (_, i) => {
      const t = (i + 1) / 10;
      const x1 = 130 + 300 * t, y1 = 158 + (210 - 158) * Math.abs(t - 0.5) * 0 + 0;
      return '';
    }).join('')}
    <line x1="170" y1="140" x2="195" y2="210"/><line x1="220" y1="118" x2="232" y2="210"/>
    <line x1="275" y1="110" x2="278" y2="210"/><line x1="330" y1="118" x2="324" y2="210"/>
    <line x1="390" y1="140" x2="365" y2="210"/>
  </g>
  <rect x="78" y="140" width="404" height="12" fill="#6f7770"/>
  <g fill="#485049">${[104, 150, 200, 360, 410, 456].map((x) => `<rect x="${x}" y="116" width="8" height="26" rx="2"/>`).join('')}</g>
  <path d="M70,210 L130,210 M430,210 L490,210" stroke="#485049" stroke-width="10"/>
  <text x="60" y="104" font-size="12" fill="#5d554a">望柱/抱鼓石</text>
  <line x1="150" y1="96" x2="112" y2="120" stroke="#8e3320" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="150" y="86" font-size="12" fill="#8e3320">金刚墙落基岩</text>
  <line x1="330" y1="60" x2="300" y2="104" stroke="#8e3320" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="330" y="56" font-size="12" fill="#8e3320">纵联分节并列券 · ${bridge.spanM}m（虚构数据）</text>
  <line x1="470" y1="176" x2="430" y2="176" stroke="#8e3320" stroke-width="1.2" marker-end="url(#arr)"/>
  <text x="436" y="170" font-size="12" fill="#8e3320">桥面通行段 ${bridge.deckWidthM}m</text>`;
  return el('figure', { class: 'figframe' }, svg,
    el('figcaption', {}, '图：桥梁本体结构示意（原创绘制）。宽度/跨径为虚构教学数据，非实测、非承载保证。'));
}

// ---------- 动态平面图 ----------
const KIND_STYLE = {
  parking: { c: '#446673', r: 7, label: '停车场' },
  entrance: { c: '#b3482f', r: 6, label: '入口' },
  view: { c: '#3f7a4f', r: 5.5, label: '观景位' },
  stop: { c: '#b98a3f', r: 6, label: '停留点' },
  shelter: { c: '#5c7a55', r: 6.5, label: '亭/茶寮' },
  junction: { c: '#6f7770', r: 4, label: '桥面节点' },
};
const EDGE_COLOR = { deck: '#b3482f', approach: '#7f9aa6', cross: '#5c7a55' };

export function mapSVG({ state = null, profileKey = 'half', highlightNodeSeq = null, blockedIds = null } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', '0 0 600 430');
  let html = `
  <rect width="600" height="430" fill="#f8f4e8"/>
  <path d="M150,0 C120,120 160,200 120,430" stroke="#9fb9c2" stroke-width="46" fill="none" opacity=".35"/>
  <path d="M420,0 C450,120 400,240 430,430" stroke="#9fb9c2" stroke-width="30" fill="none" opacity=".28"/>
  <text x="26" y="30" font-size="13" fill="#446673" opacity=".8">西谷溪片区</text>
  <text x="330" y="408" font-size="13" fill="#446673" opacity=".8">东溪片区</text>
  <text x="500" y="60" font-size="13" fill="#446673" opacity=".8">西源古道</text>`;

  // 边
  for (const e of EDGES) {
    const a = nodeById[e.a], b = nodeById[e.b];
    const es = state ? state.edgeStatus[e.id] : null;
    const blocked = blockedIds?.includes(e.id) || (es && !es.usable);
    const onPath = highlightNodeSeq && pathContains(highlightNodeSeq, e);
    const col = blocked ? '#c2452c' : EDGE_COLOR[e.kind] || '#999';
    const dash = blocked ? '7 5' : e.kind === 'cross' ? '2 0' : '2 0';
    html += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${col}"
      stroke-width="${onPath ? 5.5 : 3}" ${onPath ? 'opacity=".95"' : 'opacity=".8"'} stroke-dasharray="${dash}" stroke-linecap="round"/>`;
    if (blocked) {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      html += `<text x="${mx}" y="${my - 6}" font-size="11" fill="#a83a28" text-anchor="middle">⛔维护/封断</text>`;
    }
  }
  // 节点
  for (const n of NODES) {
    const st = KIND_STYLE[n.kind];
    const isEntranceClosed = state?.entranceStatus[n.id] && !state.entranceStatus[n.id].usable;
    const onPath = highlightNodeSeq?.includes(n.id);
    html += `<circle cx="${n.x}" cy="${n.y}" r="${onPath ? st.r + 3 : st.r}" fill="${isEntranceClosed ? '#c2452c' : st.c}"
      stroke="#fbf8ef" stroke-width="2"/>`;
    if (isEntranceClosed) html += `<text x="${n.x}" y="${n.y - 11}" font-size="11" fill="#a83a28" text-anchor="middle">入口关闭</text>`;
    const lx = n.x + 9, ly = n.y + 4;
    html += `<text x="${lx}" y="${ly}" font-size="10.5" fill="#3a342c">${n.name}</text>`;
  }
  svg.innerHTML = html;
  return el('div', { class: 'map-box' }, svg,
    el('div', { class: 'legend' },
      el('span', {}, el('i', { style: `border-top-color:${EDGE_COLOR.deck}` }), '桥面段'),
      el('span', {}, el('i', { style: `border-top-color:${EDGE_COLOR.approach}` }), '附近道路'),
      el('span', {}, el('i', { style: `border-top-color:${EDGE_COLOR.cross}` }), '跨区连接'),
      el('span', {}, '⛔ 当日维护/临时封断'),
    ));
}
function pathContains(seq, edge) {
  for (let i = 0; i < seq.length - 1; i++) {
    if ((seq[i] === edge.a && seq[i + 1] === edge.b) || (seq[i] === edge.b && seq[i + 1] === edge.a)) return true;
  }
  return false;
}

// 小罗盘（拍摄方位）
export function compassSVG(deg, pass) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', '0 0 60 60');
  const r = (deg - 90) * Math.PI / 180;
  const x2 = 30 + 20 * Math.cos(r), y2 = 30 + 20 * Math.sin(r);
  svg.innerHTML = `
  <circle cx="30" cy="30" r="26" fill="#fbf8ef" stroke="${pass ? '#3f7a4f' : '#a83a28'}" stroke-width="2"/>
  <text x="30" y="13" text-anchor="middle" font-size="9" fill="#5d554a">N</text>
  <line x1="30" y1="30" x2="${x2}" y2="${y2}" stroke="${pass ? '#3f7a4f' : '#a83a28'}" stroke-width="2.4" marker-end="none"/>
  <circle cx="30" cy="30" r="2.6" fill="#2b2620"/>`;
  return svg;
}

export function fmtM(m) { return m == null ? '<span class="unknown">未知</span>' : `${m} m`; }
export function fmtPct(p) { return p == null ? '<span class="unknown">未知</span>' : `${p}%`; }
