import { api, badge, esc, blockerHtml, unknownHtml } from './common.js';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get('b')) $('bridge-select').value = params.get('b');

const FIRST_ENT = { anj: 'ent_anj_n', qfl: 'ent_qfl_w' };
const FIRST_APPROACH = { anj: 'e_anj_n_gate_deck', qfl: 'e_qfl_w_gate_deck' };
const IMG = { anj: '/assets/img/arch-hero.svg', qfl: '/assets/img/covered-bridge.svg' };

async function load() {
  const bridgeId = $('bridge-select').value;
  const date = $('date-input').value;
  const overrides = {};
  if ($('close-end1').checked) {
    overrides.entranceClosed = { [FIRST_ENT[bridgeId]]: { closed: true, reason: '前端演练：第一端入口临时关闭' } };
  }
  if ($('block-approach').checked) {
    overrides.edgeBlocked = { [FIRST_APPROACH[bridgeId]]: { blocked: true, reason: '前端演练：第一端引道临时封闭' } };
  }
  const { json: s } = await api(`/api/stories?bridgeId=${bridgeId}&date=${date}`, { date, overrides });
  render(s);
}

function render(s) {
  $('story').innerHTML = `
  <div class="card bridge">
    <img src="${IMG[s.id]}" alt="${esc(s.name)}原创插画">
    <h2>${esc(s.name)} <span class="muted">${esc(s.nameEn)}</span></h2>
    <p class="meta">${badge('region', s.region.name)} ${esc(s.dynasty)} · 评估日 ${esc(s.evaluatedAt)}，参照起点：${esc(s.origin)}</p>
    <p>${esc(s.story)}</p>
    <div class="notice info">本页刻意不提供“整座桥开放/关闭”字段；请分别阅读下方<b>端级入口</b>、<b>桥面穿越</b>与<b>观景</b>结论。</div>
  </div>

  <div class="grid cols-2" style="margin-top:18px">
    <div class="card">
      <h3>结构档案</h3>
      <dl class="kv">
        <dt>形制</dt><dd>${esc(s.structure.type)}</dd>
        <dt>跨径</dt><dd>${esc(s.structure.spanM)} m，矢高 ${esc(s.structure.riseM)} m</dd>
        <dt>材料</dt><dd>${esc(s.structure.material)}</dd>
        <dt>桥面净宽</dt><dd>${s.structure.deck.widthM == null ? '未测量' : esc(s.structure.deck.widthM) + ' m'} · ${esc(s.structure.deck.surface)}</dd>
        <dt>护栏</dt><dd>${esc(s.structure.deck.rail)}</dd>
      </dl>
      <p class="muted">${esc(s.structure.notes)}</p>
    </div>
    <div class="card">
      <h3>保护提示</h3>
      ${s.protection.map((p) => `<div class="notice ${/承载/.test(p.level) ? 'warn' : 'info'}"><b>${esc(p.level)}：</b>${esc(p.text)}</div>`).join('')}
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <h3>端级入口与桥头（对象分离）</h3>
    ${s.ends.map((e) => `
      <div class="end-row">
        <div><b>${esc(e.label)}</b>
          <span style="margin-left:8px">入口：${e.entrance.status === 'open' ? badge('open', '入口开放') : badge('closed', '入口关闭：' + e.entrance.reason)}</span>
          <span style="margin-left:8px">桥头：${e.deck.reachable ? badge('open', `引道可达（${e.deck.minutes} 分钟）`) : badge('closed', '暂不可达：' + (e.deck.reason || ''))}</span>
        </div>
        <p class="muted">${esc(e.entrance.name)}：${esc(e.entrance.accessNote)}</p>
        ${e.deck.reachable
          ? `<p class="muted">实际引道段：${e.deck.edgeIds.map((id) => `<span class="tag">${esc(id)}</span>`).join(' ')}</p>`
          : blockerHtml(e.deck.blockers, e.deck.blockers?.length === 0 && /不连通/.test(e.deck.reason || ''))}
      </div>`).join('')}
  </div>

  <div class="card" style="margin-top:18px">
    <h3>桥面穿越</h3>
    ${s.crossing.possible
      ? `<div class="notice ok">当前可沿古桥桥面穿越，步行 ${s.crossing.minutes} 分钟。<br><span class="muted">穿越段：${s.crossing.edgeIds.map((id) => `<span class="tag">${esc(id)}</span>`).join(' ')}</span></div>`
      : `<div class="notice danger"><b>当前不能沿桥面穿越。</b>${esc(s.crossing.reason || '')}</div>${blockerHtml(s.crossing.blockers, s.crossing.noNetworkEvenIfReopened)}`}
  </div>

  <div class="card" style="margin-top:18px">
    <h3>观景点（逐点独立求值）</h3>
    ${s.views.map((v) => `
      <div class="end-row">
        <b>${esc(v.label)}</b>（${esc(v.end)}端 · 桥在镜头 ${v.bearingToBridgeDeg ?? '?'}° 方位）
        ${v.reachable
          ? badge('open', `可达，${v.minutes} 分钟`)
          : badge('closed', '不可达')}
        ${v.reachable
          ? `<p class="muted">路径：${v.edgeIds.map((id) => `<span class="tag">${esc(id)}</span>`).join(' ')}</p>`
          : blockerHtml(v.blockers, v.noNetworkEvenIfReopened)}
      </div>`).join('')}
    <div class="notice warn">拍摄前请核对镜头方位；背对桥梁提交的素材会在编辑台被标记为“拍摄方向错误”。</div>
  </div>`;
}

$('load-btn').addEventListener('click', load);
$('bridge-select').addEventListener('change', load);
$('date-input').addEventListener('change', load);
$('close-end1').addEventListener('change', load);
$('block-approach').addEventListener('change', load);
load();
