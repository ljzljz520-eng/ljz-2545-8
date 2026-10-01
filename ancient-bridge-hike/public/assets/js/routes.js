import { api, badge, esc, blockerHtml, unknownHtml } from './common.js';
const $ = (id) => document.getElementById(id);

const REGION = { qianxi: '千溪谷', songpo: '松坡' };

function buildBody(extra = {}) {
  const overrides = {};
  if ($('close-north').checked) {
    overrides.entranceClosed = { ent_anj_n: { closed: true, reason: '前端演练：安吉桥北入口关闭' } };
  }
  return {
    date: $('date-input').value,
    overrides,
    lockedNodeIds: [...document.querySelectorAll('.lock:checked')].map((el) => el.value),
    ...extra,
  };
}

function certBadge(leg, family) {
  if (!family) return '';
  if (leg.status !== 'ok') return '';
  if (leg.strollerCert === 'unconfirmed') return badge('unknown', '童车：无法确认（含未测段）');
  if (leg.strollerCert === 'measured_block') return badge('closed', '童车：实测不达标');
  if (leg.strollerCert === 'measured_pass') return badge('open', '童车：实测段达标（≠无障碍承诺）');
  return '';
}

function legHtml(leg, family) {
  const cls = leg.status === 'blocked' ? 'blocked' : (leg.decision === 'skipped_local_update' ? 'skip' : '');
  const regions = (leg.regions || []).map((r) => REGION[r] || r).join('、');
  return `<div class="leg ${cls}">
    <h4>${esc(leg.fromLabel || leg.from)} → ${esc(leg.toLabel || leg.targetName || leg.to)}
      ${leg.status === 'ok'
        ? badge('open', `${leg.minutes} 分钟`)
        : badge('closed', leg.decision === 'locked_unreachable' ? '锁定点不可达' : '不可达')}
      ${certBadge(leg, family)}
      ${regions ? badge('region', regions) : ''}
      ${leg.locked ? badge('region', '已锁定') : ''}
    </h4>
    ${leg.status === 'ok'
      ? `<p class="muted">${leg.edgeIds.map((id) => `<span class="tag">${esc(id)}</span>`).join(' ')}</p>`
      : blockerHtml(leg.blockers, leg.noNetworkEvenIfReopened)}
    ${leg.explanation ? `<div class="notice ${leg.decision === 'locked_unreachable' ? 'danger' : 'warn'}">${esc(leg.explanation)}</div>` : ''}
    ${unknownHtml(leg.unknown)}
  </div>`;
}

function resultCard(title, r, isTheme) {
  const stops = isTheme
    ? `<p class="muted">停留点：${r.stops.map((s) => esc(s.label)).join(' · ')}</p>` : '';
  const warnings = (r.warnings || []).map((w) => `<div class="notice warn">${esc(w)}</div>`).join('');
  return `<div class="card">
    <h3>${esc(title)}
      ${r.feasible ? badge('open', '可行') : badge('closed', '不可行/需调整')}
      ${r.crossRegion ? badge('region', '跨片区') : ''}
    </h3>
    ${stops}
    <p class="meta">总步行 ${r.totalMinutes} 分钟 / 预算 ${r.budgetMin} 分钟
      ${r.budgetFit ? badge('open', '时间内') : badge('closed', '超预算')}
      · 未测段计数 ${r.unknownCount} · 阻断段 ${r.legs.filter((l) => l.status === 'blocked').length}</p>
    ${r.legs.map((l) => legHtml(l, r.family)).join('')}
    ${warnings}
    <p class="muted">${esc(r.accessibilityStatement)}</p>
  </div>`;
}

async function run() {
  const planId = $('plan-select').value;
  const routeId = $('theme-select').value;
  const { json } = await api(`/api/compare?routeId=${routeId}&planId=${planId}`, buildBody());
  $('result').innerHTML = `
    <div class="notice info">${esc(json.narrative)}</div>
    <div class="grid cols-2">
      ${resultCard(`预制主题：${json.theme.routeName}`, json.theme, true)}
      ${resultCard(`按图搜索：${json.search.planName}`, json.search, false)}
    </div>
    <div class="card" style="margin-top:18px">
      <h3>并排比较</h3>
      <table><thead><tr><th>维度</th><th>预制主题</th><th>按图搜索</th></tr></thead><tbody>
      <tr><td>可行性</td><td>${json.comparison[0].feasible ? '可行' : '不可行'}</td><td>${json.comparison[1].feasible ? '可行' : '不可行'}</td></tr>
      <tr><td>用时/预算</td><td>${json.comparison[0].totalMinutes}/${json.comparison[0].budgetMin}</td><td>${json.comparison[1].totalMinutes}/${json.comparison[1].budgetMin}</td></tr>
      <tr><td>阻断段</td><td>${json.comparison[0].blockedCount}</td><td>${json.comparison[1].blockedCount}</td></tr>
      <tr><td>局部跳过点</td><td>${json.comparison[0].skippedCount}</td><td>${json.comparison[1].skippedCount}</td></tr>
      <tr><td>未测段</td><td>${json.comparison[0].unknownCount}</td><td>${json.comparison[1].unknownCount}</td></tr>
      <tr><td>跨片区</td><td>${json.comparison[0].crossRegion ? '是' : '否'}</td><td>${json.comparison[1].crossRegion ? '是' : '否'}</td></tr>
      </tbody></table>
    </div>`;
}

async function partial() {
  const routeId = $('theme-select').value;
  const body = buildBody({
    routeId,
    // 仅作前端演示的替换建议：任何被阻断的北端点改投南樟观景台；廊桥点改投西入口
    replacements: { n_anj_vp_n: 'n_anj_vp_s', n_qfl_vp: 'n_qfl_gate_w' },
  });
  const { json } = await api('/api/themes/partial', body);
  const box = document.createElement('div');
  box.className = 'card';
  box.style.marginTop = '18px';
  box.innerHTML = `<h3>局部更新结果 ${json.feasible ? badge('open', '更新后可行') : badge('closed', '仍不可行')}</h3>
    <p class="muted">${esc(json.note)} 用时 ${json.totalMinutes}/${json.budgetMin} 分钟。</p>
    ${json.updatedStops.map((s) => `<p>${s.replaced ? '🔁 ' : ''}${esc(s.label)}</p>`).join('')}
    ${json.legs.map((l) => legHtml(l, true)).join('')}`;
  $('result').prepend(box);
}

$('run-btn').addEventListener('click', run);
$('partial-btn').addEventListener('click', partial);
run();
