import { api, badge, esc } from './common.js';
const $ = (id) => document.getElementById(id);

let manifest = null;
const state = { currentVersion: null, decisions: [] };

function opts() {
  return {
    toVersion: $('version-select').value,
    mode: $('mode-select').value,
    currentVersion: $('current-select').value || null,
  };
}

async function init() {
  manifest = await (await fetch('/api/packages/manifest')).json();
  $('manifest').innerHTML = `
    <p><b>包：</b>${esc(manifest.packageId)} · 最新 <span class="tag">${esc(manifest.latest)}</span></p>
    <table><thead><tr><th>版本</th><th>类型</th><th>父版本</th><th>块</th><th>说明</th></tr></thead><tbody>
    ${manifest.versions.map((v) => `<tr>
      <td class="tag">${esc(v.version)}</td><td>${v.type === 'delta' ? badge('region', '增量') : badge('open', '整包')}</td>
      <td>${esc(v.parentVersion || '—')}</td><td>${v.chunks.map((c) => esc(c.id)).join('、')}</td>
      <td class="muted">${esc(v.notes)}</td></tr>`).join('')}
    </tbody></table>`;

  const vs = manifest.versions.map((v) => v.version);
  $('version-select').innerHTML = vs.map((v) => `<option ${v === manifest.latest ? 'selected' : ''}>${v}</option>`).join('');
  $('current-select').innerHTML = '<option value="">（未安装）</option>' +
    vs.map((v) => `<option ${v === '3.0.0' ? 'selected' : ''}>${v}</option>`).join('');
  $('mode-select').value = 'delta';
  renderChunks();
}

function renderChunks() {
  const target = manifest.versions.find((v) => v.version === $('version-select').value);
  // 4.0.0 是增量，默认勾选缺一块以演示"缺块不可用"；其它默认全选
  const all = target.chunks.map((c) => c.id);
  const presel = target.type === 'delta' ? all.filter((id) => id !== 'media') : all;
  $('chunks-pick').innerHTML = `模拟“已下载并校验”的块（取消勾选模拟缺块）：
    <div class="pill-list" style="margin-top:6px">${all.map((id) =>
      `<label><input type="checkbox" class="chunk" value="${id}" ${presel.includes(id) ? 'checked' : ''}> ${id}</label>`).join('')}</div>
    <label><input type="checkbox" id="corrupt-one"> 模拟 media 块哈希损坏</label>`;
}

$('version-select')?.addEventListener('change', renderChunks);

$('import-btn').addEventListener('click', async () => {
  const body = {
    ...opts(),
    fetchedChunkIds: [...document.querySelectorAll('.chunk:checked')].map((el) => el.value),
    corruptMedia: $('corrupt-one').checked,
  };
  const { status, json: r } = await api('/api/packages/evaluate', body);

  if (status !== 200) {
    // 旧包回灌 / 增量基线不符：拒绝，不改变本地状态
    $('import-result').innerHTML = `<div class="notice danger"><b>导入被拒绝（${status} ${esc(r.code)}）</b><br>${esc(r.reason)}</div>`;
    return;
  }

  // 损坏模拟：把 media 的校验结果改成不匹配
  if (body.corruptMedia) {
    const m = r.checks.find((c) => c.id === 'media');
    if (m) { m.match = false; r.assess = r.assess; }
    r.assess = {
      usable: false,
      corrupt: ['media'],
      missing: r.assess.missing,
      required: r.assess.required,
      message: 'media 块校验和不符，已隔离；存在坏块的导览包不得当作完整可用。',
    };
  }

  const a = r.assess;
  state.currentVersion = a.usable ? r.decision.toVersion : state.currentVersion;
  $('import-result').innerHTML = `
    <div class="notice ${a.usable ? 'ok' : 'danger'}">
      <b>${a.usable ? '整包可用' : '整包不可用'}</b> — ${esc(a.message)}
    </div>
    <table><thead><tr><th>块</th><th>下载</th><th>SHA-256</th></tr></thead><tbody>
    ${r.checks.map((c) => `<tr><td class="tag">${esc(c.id)}</td>
      <td>${c.fetched ? badge('open', '已下载') : badge('closed', '缺块')}</td>
      <td>${c.match && c.fetched ? badge('open', '一致') : badge(c.fetched ? 'closed' : 'unknown', c.fetched ? '不符' : '未校验')}</td></tr>`).join('')}
    </tbody></table>`;
  $('store-state').textContent = JSON.stringify({
    installedVersion: state.currentVersion,
    targetVersion: r.decision.toVersion,
    usable: a.usable,
    missing: a.missing, corrupt: a.corrupt,
  }, null, 2);
});

$('rollback-btn').addEventListener('click', async () => {
  const { status, json } = await api('/api/packages/evaluate',
    { toVersion: '3.0.0', mode: 'full', currentVersion: '4.0.0' });
  $('import-result').innerHTML = `<div class="notice danger"><b>旧包回灌被拒绝（HTTP ${status}）</b><br>${esc(json.reason)}</div>`;
});

$('clear-btn').addEventListener('click', () => {
  state.currentVersion = null;
  $('store-state').textContent = '本地状态已清空（未安装任何版本）。';
  $('import-result').innerHTML = '';
});

init();
