// 生成真实离线包文件：packages/v3/* 与 packages-archive-v1/v1/*
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CATALOG, BUILTIN_CHUNKS_V3, BUILTIN_CHUNKS_V1 } from './js/data.js';
import { serializeChunk } from './js/packages.js';

const root = dirname(fileURLToPath(import.meta.url));
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');

function build(version, def, chunksObj, outDir) {
  const manifest = { version, releasedAt: def.releasedAt, archived: !!def.archived, chunks: [], note: def.note || '' };
  for (const c of def.chunks) {
    const payload = chunksObj[c.id];
    if (payload === undefined) throw new Error(`${version} 缺块源: ${c.id}`);
    const text = serializeChunk(c.id, payload);
    const file = join(root, outDir, c.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    manifest.chunks.push({ id: c.id, file: c.file, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha(text) });
  }
  const mf = join(root, outDir, 'manifest.json');
  const mfText = JSON.stringify(manifest, null, 2);
  writeFileSync(mf, mfText);
  console.log(`✓ ${version} -> ${outDir}  (${manifest.chunks.length} 块, manifest ${Buffer.byteLength(mfText)}B)`);
  return manifest;
}

const v3def = CATALOG.packages.find((p) => p.version.endsWith('-v3'));
const v1def = CATALOG.packages.find((p) => p.version.endsWith('-v1'));
const m3 = build(v3def.version, v3def, BUILTIN_CHUNKS_V3, 'packages/v3');
const m1 = build(v1def.version, v1def, BUILTIN_CHUNKS_V1, 'packages/archive-v1');
console.log('v3 sha sample:', m3.chunks[0].sha256.slice(0, 16), '| v1 chunks:', m1.chunks.map(c=>c.id).join(','));
