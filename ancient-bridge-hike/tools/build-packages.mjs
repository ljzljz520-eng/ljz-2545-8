// 生成离线导览包：分块文件 + 带版本与 SHA-256 的清单
import { createHash } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets', 'packages');
const chunkDir = join(outDir, 'chunks');
await rm(outDir, { recursive: true, force: true });
await mkdir(chunkDir, { recursive: true });

const sha = (s) => createHash('sha256').update(s).digest('hex');
const MB = '千溪谷—松坡 古桥徒步离线导览';

const chunkContent = (id, v) => ({
  core: { id, version: v, kind: '空间库骨架', items: ['节点与通行段索引', '入口对象表', '维护日历占位'] },
  stories: { id, version: v, kind: '桥梁故事文本', body: `${MB}｜安吉石拱桥与清风廊桥故事（${v} 版校订）。` },
  map: { id, version: v, kind: '分幅示意地图', tiles: ['qianxi-01', 'qianxi-02', 'songpo-01'] },
  media: { id, version: v, kind: '原创插画与解说音频脚本', files: ['arch-hero.svg', 'covered-bridge.svg'] },
});

async function writeChunk(id, v) {
  const file = `${id}-${v}.json`;
  const body = JSON.stringify(chunkContent(id, v), null, 2);
  await writeFile(join(chunkDir, file), body);
  return { id, file: `chunks/${file}`, size: Buffer.byteLength(body), sha256: sha(body) };
}

const versions = [];
const vdefs = [
  { version: '1.0.0', date: '2026-08-01', notes: '首发整包：安吉桥故事、千溪谷地幅。', type: 'full', chunks: ['core', 'stories', 'map', 'media'] },
  { version: '2.0.0', date: '2026-08-20', notes: '增补清风廊桥与松坡地幅，整包刷新。', type: 'full', chunks: ['core', 'stories', 'map', 'media'] },
  { version: '3.0.0', date: '2026-09-10', notes: '秋季节庆解说更新，整包刷新。', type: 'full', chunks: ['core', 'stories', 'map', 'media'] },
  { version: '4.0.0', date: '2026-09-28', notes: '增量：桥故事校订与原创插画替换（北岸维护信息同步）。', type: 'delta', parentVersion: '3.0.0', chunks: ['stories', 'media'] },
];

for (const vd of vdefs) {
  const chunks = [];
  for (const id of vd.chunks) chunks.push(await writeChunk(id, vd.version));
  versions.push({
    version: vd.version, createdAt: `${vd.date}T09:00:00+08:00`,
    type: vd.type, parentVersion: vd.parentVersion || null, notes: vd.notes, chunks,
  });
}

const manifest = {
  packageId: 'qianxi-guide',
  latest: '4.0.0',
  latestType: 'delta',
  versions,
};
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('packages built:', versions.map((v) => v.version).join(' -> '));
