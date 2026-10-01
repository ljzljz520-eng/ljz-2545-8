import { api, badge, esc } from './common.js';
const $ = (id) => document.getElementById(id);
const h = await (await fetch('/api/health')).json();
$('today').textContent = h.today;
const { json } = await api(`/api/stories?date=${h.today}`);
$('status-body').innerHTML = json.stories.map((s) => {
  const openEnds = s.ends.filter((e) => e.entrance.status === 'open' && e.deck.reachable).length;
  const viewOk = s.views.filter((v) => v.reachable).length;
  return `<article class="card">
    <h3>${esc(s.name)} ${badge('region', s.region.name)}</h3>
    <p class="muted">${esc(s.dynasty)} · 无“整桥开放”布尔值，状态分列如下：</p>
    <div>${s.ends.map((e) => {
      const reach = e.entrance.status === 'closed' || !e.deck.reachable;
      return `<div>${e.label}：${reach
        ? badge('closed', '不可达', e.deck.reason || e.entrance.reason)
        : badge('open', '开放可达')}</div>`;
    }).join('')}</div>
    <p class="muted">桥面穿越：${s.crossing.possible
      ? badge('open', `可穿越 ${s.crossing.minutes} 分钟`)
      : badge('closed', s.crossing.usesBridgeDeck === false && s.crossing.edgeIds ? '仅可绕行，不计穿越' : '不可穿越')}</p>
    <p class="muted">观景：${viewOk}/${s.views.length} 个观景点可达 · 可通达端 ${openEnds}/${s.ends.length}</p>
    <a class="btn ghost small" href="/bridges.html?b=${s.id}">查看故事与保护提示 →</a>
  </article>`;
}).join('');
