// 零依赖 Node HTTP 服务：静态文件 + JSON API
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildContext } from '../src/core/graph.js';
import { allStories, bridgeStory } from '../src/core/views.js';
import { searchPlan, evaluateTheme, partialUpdateTheme, compareThemeAndSearch } from '../src/core/planner.js';
import { evaluateImport, assessStore } from '../src/core/packages.js';
import { MEDIA } from '../src/core/catalog.js';
import { checkBearing } from '../src/core/media.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const PORT = process.env.PORT || 4173;
const TODAY = '2026-09-30';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
};

async function readBody(req) {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
  });
}

function contextFrom(url, body = {}) {
  const date = url.searchParams.get('date') || body.date || TODAY;
  return buildContext(date, body.overrides || {});
}

async function verifyChunks(decision, fetchedIds) {
  // 服务端按实际块文件计算哈希，模拟"分块下载后校验"
  const results = [];
  for (const c of decision.chunks) {
    const actual = await hashFile(join(publicDir, 'assets', 'packages', c.file));
    results.push({ id: c.id, fetched: fetchedIds.includes(c.id), actualSha256: actual,
      expectedSha256: c.sha256, match: actual === c.sha256 });
  }
  return results;
}

async function hashFile(p) {
  const buf = await readFile(p);
  return createHash('sha256').update(buf).digest('hex');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(url.pathname, res);
  } catch (err) {
    console.error(err);
    return json(res, 500, { error: String(err && err.message || err) });
  }
});

async function handleApi(req, res, url) {
  const p = url.pathname;
  const body = req.method === 'POST' ? await readBody(req) : {};

  if (p === '/api/health') return json(res, 200, { ok: true, today: TODAY });

  if (p === '/api/stories') {
    const ctx = contextFrom(url, body);
    const bridgeId = url.searchParams.get('bridgeId') || body.bridgeId;
    const origin = url.searchParams.get('origin') || body.origin;
    return json(res, 200, bridgeId
      ? bridgeStory(ctx, bridgeId, origin)
      : { stories: allStories(ctx, origin), evaluatedAt: ctx.date });
  }

  if (p === '/api/plans/search') {
    const ctx = contextFrom(url, body);
    const planId = url.searchParams.get('planId') || body.planId || 'half';
    const lockedNodeIds = body.lockedNodeIds || [];
    return json(res, 200, searchPlan(ctx, planId, { lockedNodeIds }));
  }

  if (p === '/api/themes/evaluate') {
    const ctx = contextFrom(url, body);
    const routeId = url.searchParams.get('routeId') || body.routeId || 'tr_anj_half';
    return json(res, 200, evaluateTheme(ctx, routeId));
  }

  if (p === '/api/themes/partial' && req.method === 'POST') {
    const ctx = contextFrom(url, body);
    return json(res, 200, partialUpdateTheme(ctx, body.routeId, body.replacements || {}));
  }

  if (p === '/api/compare') {
    const ctx = contextFrom(url, body);
    const routeId = url.searchParams.get('routeId') || body.routeId || 'tr_anj_half';
    const planId = url.searchParams.get('planId') || body.planId || 'half';
    return json(res, 200, compareThemeAndSearch(ctx, routeId, planId));
  }

  if (p === '/api/media/check') {
    const id = url.searchParams.get('mediaId') || body.mediaId;
    const media = MEDIA.find((m) => m.id === id) || body.media || null;
    if (!media) return json(res, 404, { error: 'media not found' });
    return json(res, 200, checkBearing(media));
  }

  if (p === '/api/packages/manifest') {
    const raw = await readFile(join(publicDir, 'assets', 'packages', 'manifest.json'), 'utf8');
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(raw);
  }

  if (p === '/api/packages/evaluate') {
    const manifest = JSON.parse(await readFile(join(publicDir, 'assets', 'packages', 'manifest.json'), 'utf8'));
    const decision = evaluateImport({
      manifest,
      toVersion: body.toVersion || url.searchParams.get('toVersion') || manifest.latest,
      mode: body.mode || 'full',
      currentVersion: body.currentVersion || null,
    });
    if (!decision.accepted) return json(res, 409, decision);
    const checks = await verifyChunks(decision, body.fetchedChunkIds || decision.chunks.map((c) => c.id));
    const snapshot = {
      version: decision.toVersion,
      chunks: Object.fromEntries(checks.map((c) => {
        if (!c.fetched) return [c.id, { status: 'missing' }];
        return [c.id, c.match ? { status: 'verified' } : { status: 'corrupt' }];
      })),
    };
    const required = decision.chunks.map((c) => c.id);
    const assess = assessStore(snapshot, decision);
    return json(res, 200, { decision, checks, assess });
  }

  return json(res, 404, { error: 'unknown api' });
}

async function serveStatic(pathname, res) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = normalize(join(publicDir, rel));
  if (!file.startsWith(publicDir)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    // 前端路由回退
    try {
      const idx = await readFile(join(publicDir, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(idx);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  }
}

server.listen(PORT, () => console.log(`古桥徒步网站运行于 http://localhost:${PORT}`));
