import { mountChrome, el, badge, clear, archSectionFig, compassSVG, fmtM, fmtPct, $, $$, setSelectValue, getSelectValue } from './ui.js';
import { bridges, nodes, edges, maintenance, photoChecks, TODAY, BRIDGE_LOAD_NOTE } from './data.js';
import { buildState, bridgeEndStatus, entranceState, edgeState, evaluatePhoto, nodeById } from './graph.js';

mountChrome('bridge.html');

const params = new URLSearchParams(location.search);
let currentId = params.get('id') || bridges[0].id;
const sel = $('#bridge-select');
for (const b of bridges) sel.append(el('option', { value: b.id }, `${b.name}（${b.type}）`));
setSelectValue(sel, currentId);
sel.addEventListener('change', () => { currentId = getSelectValue(sel); history.replaceState(null, '', `?id=${currentId}`); render(); });

// 演示开关：手动关闭/恢复某端入口，证明“一端维护不影响另一端观景”
const overrides = { extraClosed: [] };

function render() {
  const b = bridges.find((x) => x.id === currentId);
  const state = buildState(TODAY, { entrancesClosed: overrides.extraClosed });
  const st = bridgeEndStatus(state, b);
  const root = $('#root');
  clear(root);

  // ---------- 标题与基础 ----------
  root.append(el('h1', {}, b.name, ' ', el('span', { class: 'tag mist' }, b.dynasty)));
  root.append(el('p', { class: 'subtitle' }, `编号 ${b.id} · ${b.type} · ${b.material}`));

  const kv = (label, value, hint) => el('div', { class: 'card flat', style: 'box-shadow:none;margin:0' },
    el('div', { class: 'muted', style: 'font-size:12px' }, label),
    el('div', { style: 'font-size:20px;font-weight:700;color:#3f5a3c' }, value),
    hint ? el('div', { class: 'muted', style: 'font-size:12px' }, hint) : null);
  const base = el('div', { class: 'grid cols-3' },
    kv('计算跨径', `${b.spanM} m`, '虚构教学数据'),
    kv('桥面总长', `${b.deckLenM} m`, '按通行段合计'),
    kv('桥面标称宽度', `${b.deckWidthM} m`, '逐段宽度见空间库'),
  );
  root.append(base);
  root.append(el('div', { class: 'notice guard' },
    el('b', {}, '承载声明'), BRIDGE_LOAD_NOTE));

  // ---------- 结构 ----------
  const secStruct = el('section', {}, el('h2', {}, '一、结构（桥梁本体）'),
    archSectionFig(b),
    el('ul', {}, ...b.structural.map((x) => el('li', {}, x))));
  root.append(secStruct);

  // ---------- 故事 ----------
  root.append(el('section', {}, el('h2', {}, '二、桥的故事'), el('p', {}, b.story),
    el('p', { class: 'muted' }, '文中楹联、碑刻、习俗与人物均为虚构，仅用于导览叙事练习。')));

  // ---------- 两端入口矩阵（关键：不整桥布尔） ----------
  const secEnd = el('section', {},
    el('h2', {}, '三、入口与穿越状态（逐对象推导，无“整桥开放”布尔值）'),
    el('div', { class: 'notice info' },
      el('b', {}, '为什么没有“整桥开放/关闭”开关？'),
      '桥梁本体一直在；变化的是某端入口门、某条桥面段或附近道路。一端维护可能切断穿越，但另一端的桥窗观景不受影响。'),
  );
  const cols = el('div', { class: 'grid cols-2 status-matrix' });
  for (const end of st.ends) {
    const usable = end.state.usable;
    const col = el('div', { class: 'end-col' },
      el('h3', {}, end.node.name, ' ', badge(usable, usable ? '入口开放' : '入口关闭')),
      el('p', { class: 'muted' }, end.node.sign || ''),
      usable
        ? el('ul', { class: 'reason-list ok' }, el('li', {}, '当前无关闭该入口的维护或临时指令'))
        : el('ul', { class: 'reason-list' }, ...end.state.reasons.map((r) => el('li', {}, r.text))),
      el('div', { class: 'row' },
        el('button', {
          class: usable ? 'danger' : 'moss',
          onclick: () => {
            const i = overrides.extraClosed.indexOf(end.node.id);
            if (i >= 0) overrides.extraClosed.splice(i, 1); else overrides.extraClosed.push(end.node.id);
            render();
          } }, usable ? '模拟临时关闭此入口' : '恢复此入口（取消临时覆盖）'),
      ),
    );
    cols.append(col);
  }
  secEnd.append(cols);
  secEnd.append(el('div', { class: 'card flat', style: 'border-style:dashed' },
    el('b', {}, '穿越结论：'), st.crossingNote,
    st.crossingBlockedBy.length ? el('ul', { class: 'reason-list' },
      ...st.crossingBlockedBy.map((x) => el('li', {}, `${x.edge.id}：${x.reason.text}`))) : null));

  // 各桥窗观景可达性
  const winBox = el('div', { class: 'grid cols-2' });
  for (const w of b.windows) {
    const atNode = nodeById[w.from];
    // 观景可达：机位入口必须开放，且机位连接段可半日步行
    const entClosed = atNode.kind === 'entrance' && !entranceState(state, atNode.id).usable;
    // 机位是 view 时，找其相邻 entrance
    let gateClosed = false;
    if (atNode.kind === 'view') {
      const linked = edges.find((e) => e.id.includes('view') && (e.a === w.from || e.b === w.from));
      const gateId = [linked?.a, linked?.b].find((id) => nodeById[id]?.kind === 'entrance');
      gateClosed = gateId && !entranceState(state, gateId).usable;
    }
    const blocked = entClosed || gateClosed;
    winBox.append(el('div', { class: 'card window-shot' },
      compassSVG(w.bearingDeg, true),
      el('div', {},
        el('b', {}, w.name),
        el('div', { class: 'muted' }, `机位：${atNode.name} · 应拍方位 ${w.bearingDeg}°`),
        el('div', { class: 'muted' }, w.note),
        el('div', { style: 'margin-top:6px' }, badge(!blocked, !blocked ? '该桥窗观景当前可达' : '观景暂不可达（对应入口关闭）')),
      )));
  }
  secEnd.append(el('h3', {}, '桥窗与观景可达性'), winBox);
  root.append(secEnd);

  // ---------- 空间库：通行段 ----------
  const relEdges = edges.filter((e) => e.bridgeId === b.id);
  const secSpace = el('section', {}, el('h2', {}, '四、空间库记录（通行段 · 宽度 · 坡度 · 维护区间）'),
    el('p', { class: 'muted' }, '宽度/坡度为逐段实测值；“未知”表示尚未测绘，规划时会据此判定“无法确认”，不会猜测。'));
  const tbl = el('table', {},
    el('thead', {}, el('tr', {},
      el('th', {}, '通行段'), el('th', {}, '类型'), el('th', {}, '连接'),
      el('th', {}, '长度'), el('th', {}, '宽度'), el('th', {}, '坡度'),
      el('th', {}, '路面'), el('th', {}, '维护区间'), el('th', {}, '当日状态'))));
  const tb = el('tbody');
  for (const e of relEdges) {
    const es = edgeState(state, e.id);
    tb.append(el('tr', { class: es.usable ? '' : 'blocked' },
      el('td', {}, e.id, e.note ? el('div', { class: 'muted' }, e.note) : null),
      el('td', {}, el('span', { class: `tag ${e.kind === 'deck' ? 'amber' : 'mist'}` },
        e.kind === 'deck' ? '桥面段' : '附近道路')),
      el('td', {}, `${nodeById[e.a].name} ↔ ${nodeById[e.b].name}`),
      el('td', { class: 'num', html: `${e.lenM} m` }),
      el('td', { class: 'num', html: fmtM(e.widthM) }),
      el('td', { class: 'num', html: fmtPct(e.slopePct) }),
      el('td', {}, e.surface),
      el('td', { class: 'muted' }, e.maintWindow),
      el('td', {}, es.usable ? badge(true, '可通行') : el('div', {}, badge(false, '阻断'),
        el('ul', { class: 'reason-list' }, ...es.reasons.map((r) => el('li', {}, r.text))))),
    ));
  }
  tbl.append(tb);
  secSpace.append(tbl);
  root.append(secSpace);

  // ---------- 维护项目 ----------
  const relM = maintenance.filter((m) => m.affects.some((a) =>
    (a.kind === 'entrance' && nodes.find((n) => n.id === a.id)?.bridgeId === b.id) ||
    (a.kind === 'edge' && edges.find((e) => e.id === a.id)?.bridgeId === b.id)));
  const secM = el('section', {}, el('h2', {}, '五、维护项目与区间（含延期）'));
  if (!relM.length) secM.append(el('p', { class: 'muted' }, '暂无登记维护项目。年度例行：' + b.deckAnnualMaint.every + '，' + b.deckAnnualMaint.scope + '。'));
  for (const m of relM) {
    const delayed = m.status === 'delayed';
    secM.append(el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('b', {}, m.title), el('span', 'spacer'),
        badge(m.status === 'active', m.status === 'active' ? '进行中' : delayed ? '已延期' : '已完工',
          m.status === 'active' ? 'bad' : delayed ? 'warn' : 'ok')),
      el('div', { class: 'muted' }, `计划区间：${m.start} → ${m.endPlanned}` +
        (m.endActual ? `；实际完工 ${m.endActual}` : delayed ? `；顺延至 ${m.rescheduledTo}` : '')),
      delayed ? el('div', { class: 'notice warn', style: 'margin:8px 0' }, '延期原因：' + m.delayReason) : null,
      el('ul', { class: 'muted' }, ...m.affects.map((a) => el('li', {},
        `${a.kind === 'entrance' ? '入口' : '通行段'}「${a.kind === 'entrance' ? nodeById[a.id].name : (nodeById[edges.find(e=>e.id===a.id).a].name + '↔' + nodeById[edges.find(e=>e.id===a.id).b].name)}」：${a.detail}`))),
      el('div', { class: 'muted' }, m.note),
    ));
  }
  secM.append(el('p', { class: 'muted' }, '年度例行养护：' + b.deckAnnualMaint.every + ' · ' + b.deckAnnualMaint.scope + '（' +
    '该区间到来时对应通行段会单独标记，不默认封闭全桥）。'));
  root.append(secM);

  // ---------- 保护提示 ----------
  root.append(el('section', {}, el('h2', {}, '六、保护提示'),
    el('ul', {}, ...b.protection.map((x) => el('li', {}, x))),
    el('div', { class: 'notice guard' }, '桥窗与石构件属于文物本体，只观不触；导览中的“开放/可达”仅指步行导览可达性，不构成任何结构安全或承载鉴定。')));

  // ---------- 拍摄方向验收 ----------
  const secPhoto = el('section', {}, el('h2', {}, '七、桥窗拍摄方向验收'),
    el('p', { class: 'muted' }, '核验方法：计算机位节点到桥体几何中心的真实方位角（北=0°，顺时针），与照片申报方位比较，容差 35°。'));
  const checks = photoChecks.filter((c) => c.bridgeId === b.id);
  for (const c of checks) {
    const r = evaluatePhoto(c, b);
    secPhoto.append(el('div', { class: 'card window-shot' },
      compassSVG(c.declaredBearingDeg, r.pass),
      el('div', { style: 'flex:1' },
        el('div', { class: 'row' }, el('b', {}, `机位「${nodeById[c.at].name}」 · 申报 ${c.declaredBearingDeg}°`),
          el('span', 'spacer'), badge(r.pass, r.pass ? '方向合格' : '拍摄方向错误')),
        el('div', { class: 'muted' }, `真值（机位→桥心）：${r.actual.toFixed(1)}°，偏差 ${r.delta.toFixed(1)}° / 容差 ±${r.tolDeg}°`),
        el('div', { class: 'muted' }, c.note))));
  }
  root.append(secPhoto);
}
render();
