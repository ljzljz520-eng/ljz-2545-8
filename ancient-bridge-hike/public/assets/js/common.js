// 公共助手
export async function api(path, body) {
  const r = await fetch(path, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  const json = await r.json();
  return { status: r.status, json };
}
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function badge(kind, text, title) {
  return `<span class="badge ${kind}" title="${esc(title || '')}"><span class="dot ${kind}"></span>${esc(text)}</span>`;
}
export const openBadge = (isOpen, t1, t2) =>
  isOpen ? badge('open', t1 || '开放') : badge('closed', t2 || '关闭/不可达');

export function blockerHtml(blockers, noNetworkEvenIfReopened) {
  if (noNetworkEvenIfReopened) {
    return '<div class="notice danger">即使全部维护段恢复，该点在路网中仍不连通——需要新增步道或更换集合点，不能自动改点。</div>';
  }
  if (!blockers || !blockers.length) return '';
  return blockers.map((b) => {
    if (b.kind === 'edge') {
      const delay = b.maintenance?.delayed
        ? `<span class="badge closed">维护已延期：原窗口 ${b.maintenance.original.start} ~ ${b.maintenance.original.end}，现延至 ${b.maintenance.end}</span>` : '';
      return `<div class="notice danger">通行段 <span class="tag">${esc(b.edgeId)}</span> 封闭：${esc(b.reason || '维护')}（窗口 ${b.maintenance?.start || ''} ~ ${b.maintenance?.end || ''}） ${delay}</div>`;
    }
    return `<div class="notice danger">入口 <span class="tag">${esc(b.nodeId)}</span> 已关闭：${esc(b.reason || '')}</div>`;
  }).join('');
}
export function unknownHtml(items) {
  if (!items || !items.length) return '';
  const fields = [...new Set(items.map((i) => i.label))].join('、');
  return `<div class="notice warn"><b>无法确认：</b>${esc(fields)}。系统不臆测、不自动判定适合儿童或无障碍。</div>`;
}
