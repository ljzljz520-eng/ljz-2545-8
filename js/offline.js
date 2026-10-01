import { mountChrome, el, clear, badge, $ } from './ui.js';
import { CATALOG } from './data.js';
import * as P from './packages.js';

mountChrome('offline.html');

let manifests = {};
let results = {};

async function ensureManifest(key) {
  if (!manifests[key]) manifests[key] = await P.fetchManifest(CATALOG.packages.find((p) =>
    key === 'v3' ? p.version.endsWith('-v3') : p.version.endsWith('-v1')));
  return manifests[key];
}

function renderCatalog() {
  const box = $('#catalog-view'); clear(box);
  for (const def of CATALOG.packages) {
    box.append(el('div', { class: 'card flat', style: 'box-shadow:none' },
      el('div', { class: 'row' },
        el('b', {}, def.version), el('span', 'spacer'),
        def.version === CATALOG.latest ? el('span', { class: 'tag moss' }, '当前版本') : el('span', { class: 'tag amber' }, '归档/旧版'),
        el('span', { class: 'tag' }, `块数 ${def.chunks.length}`),
        el('span', { class: 'tag' }, def.releasedAt.slice(0, 10))),
      el('p', { class: 'muted' }, def.note)));
  }
}

function chunkRows(manifest, rec) {
  const rows = manifest.chunks.map((c) => {
    const s = rec?.chunks[c.id];
    const state = s?.state || 'pending';
    const label = { pending: '待下载', verified: '已校验', corrupt: '哈希不符', missing: '缺块' }[state];
    return el('div', { class: 'chunk-row' },
      el('b', {}, c.id),
      el('div', { class: 'muted' }, `${c.file} · ${c.bytes}B · sha256 ${c.sha256.slice(0, 12)}…`),
      badge(state === 'verified', label, state === 'pending' ? 'neutral' : state === 'verified' ? 'ok' : 'bad'),
      el('span', { class: 'muted' }, s?.error ? s.error : ''));
  });
  const done = rec?.verifiedCount || 0, total = manifest.chunks.length;
  const pct = Math.round((done / total) * 100);
  return el('div', {},
    el('div', { class: 'progress' }, el('span', { style: `width:${pct}%` })),
    el('div', { class: 'muted', style: 'margin:4px 0 8px' },
      `进度 ${done}/${total}（${pct}%） · `,
      rec?.complete ? badge(true, '完整：可激活') : rec ? badge(false, '不完整：缺块/坏块，禁止激活') : '尚未下载'),
    ...rows);
}

async function runDownload(key, mountSel, opts = {}) {
  const manifest = await ensureManifest(key);
  results[key] = await P.downloadPackage(manifest, opts);
  $(mountSel).innerHTML = '';
  $(mountSel).append(chunkRows(manifest, results[key]),
    manifest._fallback ? el('p', { class: 'muted' }, `注：${manifest._fetchError}，已使用内置同源块（教学回退）。`) : null,
    results[key].errors.length ? el('div', { class: 'notice guard' },
      el('b', {}, '块问题（不得忽略）'), ...results[key].errors.map((x) => el('div', {}, x))) : null);
  refreshStore();
  return results[key];
}

$('#btn-download').onclick = async () => {
  $('#dl-progress').innerHTML = '<div class="muted">逐块下载中…</div>';
  await runDownload('v3', '#dl-progress', {
    delayMs: $('#opt-delay').checked ? 350 : 0,
    missingIds: $('#opt-missing').checked ? ['media1'] : [],
    corruptIds: $('#opt-corrupt').checked ? ['geo'] : [],
  });
};
$('#btn-activate').onclick = async () => {
  const manifest = await ensureManifest('v3');
  const rec = P.packageStatus(P.loadStore(), manifest.version) || results.v3;
  const gate = P.activate(manifest, rec);
  if (!gate.ok) { alert('激活被拒绝：\n\n' + gate.reasons.join('\n')); }
  refreshStore(); renderBanner();
};
$('#btn-clear').onclick = () => { P.resetStore(); results = {}; refreshStore(); renderBanner();
  $('#dl-progress').innerHTML = ''; $('#v1-progress').innerHTML = ''; };

$('#btn-v1-download').onclick = () => runDownload('v1', '#v1-progress');
$('#btn-v1-activate').onclick = async () => {
  const manifest = await ensureManifest('v1');
  const rec = P.packageStatus(P.loadStore(), manifest.version) || results.v1;
  const gate = P.activate(manifest, rec);
  $('#v1-progress').append(el('div', { class: 'notice guard', style: 'margin-top:10px' },
    el('b', {}, gate.ok ? '意外放行（不应出现）' : '旧包回灌已被拒绝 ✔'),
    ...gate.reasons.map((r) => el('div', {}, '• ' + r))));
  refreshStore();
};

function refreshStore() {
  const s = P.loadStore();
  const slim = {
    active: s.active,
    downloads: Object.fromEntries(Object.entries(s.downloads).map(([v, r]) => [v, {
      complete: r.complete, verified: `${r.verifiedCount}/${r.totalChunks}`, errors: r.errors,
      activationRejected: r.activationRejected || null,
    }])),
  };
  $('#store-view').textContent = JSON.stringify(slim, null, 2);
}

function renderBanner() {
  const slot = $('#banner-slot'); clear(slot);
  const s = P.loadStore();
  if (!s.active) return;
  slot.append(el('div', { class: 'snapshot-banner' },
    el('span', {}, `📦 已激活只读离线快照 ${s.active.version}（激活于 ${s.active.activatedAt.slice(0, 16).replace('T', ' ')}）。数据冻结，不会被旧包覆盖。`),
    el('span', 'spacer'),
    el('button', { onclick: () => { P.deactivate(); refreshStore(); renderBanner(); } }, '退出快照')));
}

renderCatalog();
refreshStore();
renderBanner();
