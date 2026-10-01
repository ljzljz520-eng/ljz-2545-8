// ============================================================
// 离线导览包：带版本清单的分块下载
// 规则：
//  1) manifest 声明每块 sha256 与 bytes；块必须逐块下载、逐块校验
//  2) 缺块 / 哈希不符 => 该包不完整，绝不当作完整可用
//  3) 只有“完整且校验通过”的包才能激活；激活后进入只读快照视图
//  4) 旧版本（低于 minActivatable / 归档包）只允许查看，拒绝回灌激活、拒绝覆盖当前版本
// ============================================================
import { CATALOG, BUILTIN_CHUNKS_V3, BUILTIN_CHUNKS_V1 } from './data.js';

const LS_KEY = 'gushao.offline.v1';

export async function sha256Hex(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'sha256-unavailable';
}

export function cmpVersion(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  const pb = String(b).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

const builtinFor = (version) =>
  version.endsWith('-v3') || version.includes('-v3') ? BUILTIN_CHUNKS_V3
    : version.endsWith('-v1') ? BUILTIN_CHUNKS_V1 : null;

// 取清单：file:// 或无服务端时自动回退到内置源（不影响分块/校验语义）
export async function fetchManifest(def) {
  const builtin = builtinFor(def.version);
  if (def.source === 'embedded') return buildBuiltinManifest(def, builtin);
  try {
    const base = versionPath(def.version);
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (!builtin) throw new Error(`清单不可达：${err.message}`);
    return { ...(await buildBuiltinManifest(def, builtin)), _fallback: true, _fetchError: String(err.message || err) };
  }
}

function versionPath(version) {
  return `/packages/${version.replace(/^.*-(v\d+)$/, '$1')}`;
}

async function buildBuiltinManifest(def, chunksObj) {
  const chunks = [];
  for (const c of def.chunks) {
    const payload = chunksObj[c.id];
    if (payload === undefined) { chunks.push({ ...c, missingInSource: true }); continue; }
    const text = serializeChunk(c.id, payload);
    chunks.push({ id: c.id, file: c.file, bytes: new Blob([text]).size, sha256: await sha256Hex(text) });
  }
  return {
    version: def.version, releasedAt: def.releasedAt, archived: !!def.archived,
    chunks,
    note: def.note || '',
  };
}

// 稳定序列化（键排序），保证 node 构建与浏览器回退一致
export function serializeChunk(id, payload) {
  return JSON.stringify({ id, payload }, null, 2);
}

// 模拟分块下载（真实模式 fetch 文件；file:// 回退内置块；可注入故障/延迟/缺块）
export async function downloadChunk(manifestDef, chunkMeta, opts = {}) {
  const { delayMs = 0, corruptIds = [], missingIds = [], forceHttp = false } = opts;
  if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  if (missingIds.includes(chunkMeta.id)) throw new Error(`分块缺失：${chunkMeta.id}（404，源中无此块）`);

  let text;
  const def = CATALOG.packages.find((p) => p.version === manifestDef.version);
  const useHttp = forceHttp && def?.source !== 'embedded';
  if (useHttp) {
    const res = await fetch(`${versionPath(manifestDef.version)}/${chunkMeta.file}`);
    if (!res.ok) throw new Error(`${chunkMeta.file} HTTP ${res.status}`);
    text = await res.text();
  } else {
    const builtin = builtinFor(manifestDef.version);
    const payload = builtin?.[chunkMeta.id];
    if (payload === undefined) throw new Error(`分块缺失：${chunkMeta.id}（内置源也无此块）`);
    text = serializeChunk(chunkMeta.id, payload);
  }
  if (corruptIds.includes(chunkMeta.id)) text = text.replace(/[0-9]/, '9');
  return { id: chunkMeta.id, text };
}

// ---- 本地持久化（下载进度 / 激活态）----
export function loadStore() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || { downloads: {}, active: null }; }
  catch { return { downloads: {}, active: null }; }
}
export function saveStore(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* 隐私模式等忽略 */ }
  return s;
}

export function packageStatus(store, version) {
  return store.downloads[version] || null;
}

// 逐块下载并校验，返回最终结果（complete 才允许激活）
export async function downloadPackage(manifest, opts = {}) {
  const store = loadStore();
  const onProgress = opts.onProgress || (() => {});
  const rec = {
    version: manifest.version, startedAt: new Date().toISOString(),
    chunks: {}, complete: false, errors: [], fallback: !!manifest._fallback,
  };
  store.downloads[manifest.version] = rec;
  saveStore(store);

  for (const meta of manifest.chunks) {
    if (meta.missingInSource) {
      rec.chunks[meta.id] = { state: 'missing', error: '清单声明但源中不存在' };
      rec.errors.push(`${meta.id}: 源缺失`);
      onProgress({ id: meta.id, state: 'missing', rec });
      continue;
    }
    try {
      const { text } = await downloadChunk(manifest, meta, opts);
      const hash = await sha256Hex(text);
      if (hash !== meta.sha256) {
        rec.chunks[meta.id] = { state: 'corrupt', expected: meta.sha256, actual: hash };
        rec.errors.push(`${meta.id}: 哈希不符（期望 ${meta.sha256.slice(0, 10)}… 实得 ${hash.slice(0, 10)}…）`);
      } else {
        rec.chunks[meta.id] = { state: 'verified', sha256: hash, bytes: meta.bytes };
      }
    } catch (err) {
      rec.chunks[meta.id] = { state: 'missing', error: String(err.message || err) };
      rec.errors.push(`${meta.id}: ${err.message || err}`);
    }
    store.downloads[manifest.version] = { ...rec };
    saveStore(store);
    onProgress({ id: meta.id, state: rec.chunks[meta.id].state, rec });
  }

  const total = manifest.chunks.length;
  const verified = manifest.chunks.filter((c) => rec.chunks[c.id]?.state === 'verified').length;
  rec.verifiedCount = verified;
  rec.totalChunks = total;
  rec.complete = verified === total; // 缺块/坏块 => 不完整
  rec.finishedAt = new Date().toISOString();
  store.downloads[manifest.version] = { ...rec };
  saveStore(store);
  onProgress({ id: '__done__', state: rec.complete ? 'complete' : 'incomplete', rec });
  return rec;
}

// 激活门控
export function canActivate(manifest, rec) {
  const reasons = [];
  if (manifest.archived) reasons.push('该版本为归档旧包，只读保留，禁止激活');
  if (cmpVersion(manifest.version, CATALOG.minActivatable) < 0)
    reasons.push(`版本 ${manifest.version} 低于最低可激活版本 ${CATALOG.minActivatable}`);
  if (cmpVersion(manifest.version, CATALOG.latest) < 0)
    reasons.push(`旧包回灌被拒绝：${manifest.version} 不能覆盖当前版本 ${CATALOG.latest}`);
  if (!rec?.complete) reasons.push('分块不完整（存在缺块或哈希不符），缺块不得当完整可用');
  return { ok: reasons.length === 0, reasons };
}

export function activate(manifest, rec) {
  const gate = canActivate(manifest, rec);
  const store = loadStore();
  if (!gate.ok) {
    rec.activationRejected = gate.reasons;
    store.downloads[manifest.version] = { ...rec };
    saveStore(store);
    return gate;
  }
  store.active = { version: manifest.version, activatedAt: new Date().toISOString(), readOnlySnapshot: true };
  saveStore(store);
  return { ok: true };
}

export function deactivate() {
  const store = loadStore();
  store.active = null;
  saveStore(store);
}

export function resetStore() { saveStore({ downloads: {}, active: null }); }
