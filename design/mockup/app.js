/* Pulse — clickable design mockup.
 *
 * Every screen and every control in one page: hash routing, a live chart
 * readout, ranked rows that scope the page, range switching against real
 * payloads for three windows, and the loading and failure states the app
 * cannot be asked to produce on demand.
 *
 * No framework and no build. The point is to judge the design, and a
 * dependency between the design and looking at it is a dependency too many.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const F = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : Math.round(n).toLocaleString("en-US");
const int = (n) => Math.round(n).toLocaleString("en-US");
const host = (u) => {
  if (!u || u === "Direct") return "Direct";
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

/* ── state ─────────────────────────────────────────────────────────────── */
const state = {
  route: { view: "sites", site: null, tab: "analytics" },
  range: "7d",
  filter: null,        // { kind, label, factor }
  tech: "devices",
  thread: 0,
  demo: "live",        // live | loading | failed
  asking: false,
};

const sites = () => window.DATA.sites;
const siteById = (id) => sites().find((s) => s.id === id);

/* ── geometry ──────────────────────────────────────────────────────────── */
const W = 1000, H = 300;

function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}` +
         ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}` +
         ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A round step with headroom, so the top gridline is a number a person says. */
function niceScale(max) {
  if (!max) return { yMax: 4, ticks: [4, 3, 2, 1, 0] };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return { yMax: step * 4, ticks: [4, 3, 2, 1, 0].map((i) => step * i) };
}

const blocks = (a, size) => {
  const out = [];
  for (let i = 0; i < a.length; i += size) {
    const s = a.slice(i, i + size);
    out.push(s.reduce((x, y) => x + y, 0) / s.length);
  }
  return out;
};
const sparkPath = (vals, w = 86, h = 24) => {
  const max = Math.max(...vals, 1) * 1.12;
  return smooth(vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * w, (1 - v / max) * h]));
};

/* ── data shaping ──────────────────────────────────────────────────────── */
function view() {
  const site = siteById(state.route.site);
  const raw = site?.ranges?.[state.range];
  if (!raw) return null;

  // A filter scopes every figure on the page by that row's share, which is
  // what picking a row is asking for. The API cannot do it yet; the shape of
  // the interaction is what is being judged here.
  const f = state.filter?.factor ?? 1;
  const scale = (n) => Math.round(n * f);

  const ts = raw.timeseries.map((p) => ({
    time: p.time,
    pageviews: scale(p.pageviews),
    sessions: scale(p.sessions),
  }));

  const rows = (items, key, val) => {
    const vals = items.map(val);
    const max = Math.max(...vals, 1);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    return items.map((r, i) => ({
      label: key(r), value: vals[i], share: vals[i] / max, pct: ((vals[i] / total) * 100).toFixed(1),
    }));
  };

  const tech = { devices: raw.devices.devices, browsers: raw.devices.browsers, os: raw.devices.os }[state.tech];
  const techKey = { devices: "device", browsers: "browser", os: "os" }[state.tech];

  return {
    site, raw, ts,
    overview: {
      pageviews: scale(raw.overview.totalPageviews),
      sessions: scale(raw.overview.totalSessions),
      visitors: scale(raw.overview.totalVisitors),
    },
    pages: rows(raw.pages.slice(0, 8), (r) => r.page, (r) => scale(r.pageviews)),
    refs: rows(raw.referrers.slice(0, 8), (r) => host(r.source), (r) => scale(r.pageviews)),
    geo: rows(raw.geo.slice(0, 8), (r) => r.country, (r) => scale(r.pageviews)),
    tech: rows(tech.slice(0, 8), (r) => r[techKey] || "Unknown", (r) => scale(r.pageviews)),
    events: rows(raw.events.slice(0, 5), (r) => r.eventName, (r) => scale(r.count)),
  };
}

const RANGE_LABEL = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };
const PREV_LABEL = { "7d": "Previous week", "30d": "Previous 30 days", "90d": "Previous 90 days" };

/* ── chrome ────────────────────────────────────────────────────────────── */
const ICON = {
  sites: `<path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/><path d="M3 10h14M10 3c2.4 3 2.4 11 0 14M10 3C7.6 6 7.6 14 10 17"/>`,
  docs: `<path d="M5 3h7l3 3v11H5z"/><path d="M8 9h5M8 12h5"/>`,
  account: `<circle cx="10" cy="7.5" r="3"/><path d="M4.5 16a5.5 5.5 0 0 1 11 0"/>`,
  out: `<path d="M8 4H5v12h3"/><path d="M12 13l3-3-3-3M15 10H8"/>`,
  chevron: `<path d="M7 8.5 10 11.5 13 8.5"/>`,
};
const icon = (k, s = 15) =>
  `<svg viewBox="0 0 20 20" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

function railHtml() {
  const r = state.route;
  const cur = r.site ? siteById(r.site) : null;
  const total = (s) => (s.ranges ? F(s.ranges["7d"].overview.totalPageviews) : "—");
  return `
  <aside class="rail">
    <div class="brand">
      <svg viewBox="0 0 24 16" width="21" fill="none" stroke="var(--accent)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"/></svg>
      <span>Pulse Analytics</span>
    </div>
    ${cur ? `<button class="switch" data-go="#/sites"><span class="pip" style="${cur.active ? "" : "background:var(--t5)"}"></span><b>${esc(cur.name)}</b>${icon("chevron", 14)}</button>` : ""}
    <nav class="nav">
      <a class="${r.view === "sites" ? "on" : ""}" data-go="#/sites">${icon("sites")}<span>All sites</span></a>
      <a class="${r.view === "docs" ? "on" : ""}" data-go="#/docs">${icon("docs")}<span>Docs</span></a>
    </nav>
    <div class="railgroup">
      <span class="meta">Your sites</span>
      <div class="sitelist">
        ${sites().map((s) => `<a class="${s.id === r.site ? "on" : ""}" data-go="#/site/${s.id}/analytics">
          <span class="pip ${s.active ? "" : "off"}"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</span>
          <span class="n">${total(s)}</span></a>`).join("")}
      </div>
    </div>
    <div class="spacer" style="flex:1"></div>
    <nav class="nav">
      <a class="${r.view === "account" ? "on" : ""}" data-go="#/account">${icon("account")}<span>Account</span></a>
      <a data-go="#/sites">${icon("out")}<span>Log out</span></a>
    </nav>
  </aside>`;
}

function siteHeadHtml(site, tab) {
  const ago = site.active ? "12s" : "never";
  return `
  <div class="head">
    <h1>${esc(site.name)}</h1><span class="sub">${esc(site.domain)}</span>
    <span class="st">
      <span class="ago">last event ${ago}${site.active ? " ago" : ""}</span>
      <span class="live ${site.active ? "" : "off"}"><i style="${site.active ? "" : "background:currentColor"}"></i>${site.active ? "Receiving" : "Listening"}</span>
    </span>
  </div>
  <div class="bar">
    <div class="tabs">
      ${[["analytics", "Analytics"], ["ask", "Ask AI"], ["setup", "Setup"], ["settings", "Settings"]]
        .map(([k, l]) => `<a class="${tab === k ? "on" : ""}" data-go="#/site/${site.id}/${k}">${l}</a>`).join("")}
    </div>
    ${tab === "analytics" && site.ranges ? `<div class="seg" role="group" aria-label="Date range">
      ${["7d", "30d", "90d"].map((k) => `<span class="${state.range === k ? "on" : ""}" data-range="${k}" role="button" tabindex="0">${k.toUpperCase()}</span>`).join("")}
    </div>` : ""}
  </div>`;
}

/* ── views ─────────────────────────────────────────────────────────────── */
function rankTable(title, labelHead, unit, rows, opts = {}) {
  const kind = opts.kind;
  return `<div class="card p">
    <div class="ph"><b>${title}</b>${opts.extra ?? ""}</div>
    <table><thead><tr><td class="meta" style="padding-left:8px">${labelHead}</td><td class="s"></td><td class="meta n">${unit}</td></tr></thead>
    <tbody>${rows.map((r) => `<tr class="${state.filter?.kind === kind && state.filter?.label === r.label ? "sel" : ""}"
        ${kind ? `data-filter="${kind}" data-label="${esc(r.label)}" data-share="${r.share}" data-pct="${r.pct}"` : ""}>
      <td class="l${opts.mono ? " mn" : ""}" title="${esc(r.label)}">${esc(r.label)}</td>
      <td class="s"><span class="track"><i style="width:${(r.share * 100).toFixed(1)}%"></i></span></td>
      <td class="n">${F(r.value)}</td></tr>`).join("")}</tbody></table>
  </div>`;
}

function analyticsView(site) {
  if (!site.ranges) return emptyView(site);
  if (state.demo === "loading") return loadingView(site);
  if (state.demo === "failed") return failedView(site);

  const v = view();
  const pv = v.ts.map((p) => p.pageviews);
  const se = v.ts.map((p) => p.sessions);
  const { yMax, ticks } = niceScale(Math.max(...pv, 1));
  const pts = (vals) => vals.map((x, i) => [(i / Math.max(1, vals.length - 1)) * W, (1 - x / yMax) * H]);

  const win = pv.map((_, i) => {
    const w = pv.slice(Math.max(0, i - 4), i + 5);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const prev = win.map((x, i) => x * (0.80 + 0.13 * Math.sin(i / 24)));

  const spanDays = v.ts.length > 1 &&
    new Date(v.ts[v.ts.length - 1].time).getDate() !== new Date(v.ts[0].time).getDate();
  const fmtX = (t) => new Date(t).toLocaleDateString("en", { month: "short", day: "numeric" });

  const xTicks = [];
  const stepDay = state.range === "7d" ? 1 : state.range === "30d" ? 5 : 14;
  let lastDay = null;
  v.ts.forEach((p, i) => {
    const at = new Date(p.time);
    const key = `${at.getMonth()}-${at.getDate()}`;
    const boundary = state.range === "7d" ? at.getHours() === 0 : true;
    if (boundary && key !== lastDay && i > 1 && i < v.ts.length - 1) {
      if (xTicks.length === 0 || Math.round((i / v.ts.length) * 100) - xTicks[xTicks.length - 1].raw >= (100 / (v.ts.length / stepDay))) {
        xTicks.push({ x: (i / (v.ts.length - 1)) * 100, raw: Math.round((i / v.ts.length) * 100), label: fmtX(p.time) });
      }
      lastDay = key;
    }
  });

  const spark = (vals) => sparkPath(blocks(vals, Math.max(1, Math.round(vals.length / 14))));
  const delta = (n) => `<span class="d ${n >= 0 ? "up" : "dn"}">${n >= 0 ? "↗" : "↘"} ${Math.abs(n).toFixed(1)}%</span>`;
  const pctFor = (cur, base) => (base ? ((cur - base) / base) * 100 : 0);
  const prevTotal = prev.reduce((a, b) => a + b, 0);
  const curTotal = pv.reduce((a, b) => a + b, 0);
  const d1 = pctFor(curTotal, prevTotal);

  return `
  ${siteHeadHtml(site, "analytics")}
  ${state.filter ? `<div class="filterbar">
     Scoped to <b>${esc(state.filter.label)}</b>
     <span class="meta">${state.filter.pct}% of ${RANGE_LABEL[state.range].toLowerCase()}</span>
     <button class="x" data-clear-filter>Clear ✕</button></div>` : ""}

  <div class="card mrow" style="margin-top:${state.filter ? 14 : 0}px">
    ${[["Pageviews", F(v.overview.pageviews), spark(pv), delta(d1)],
       ["Sessions", F(v.overview.sessions), spark(se), delta(d1 * 0.66)],
       ["Visitors", F(v.overview.visitors), spark(pv.map((x, i) => x * (0.7 + ((i * 7) % 11) / 32))), delta(d1 * -0.17)]]
      .map(([l, val, sp, d]) => `<div class="m"><div class="mtop"><span class="meta">${l}</span>
        <svg width="86" height="24" fill="none" aria-hidden="true"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".7" stroke-width="1.3"/></svg></div>
        <span class="fig v">${val}</span>${d}</div>`).join("")}
    <div class="m"><div class="mtop"><span class="meta">Active now</span></div>
      <span class="fig v" style="color:var(--powder)">${state.filter ? "—" : 3}</span>
      <span class="d" style="color:var(--t5)">last 5 min</span></div>
  </div>

  <div class="card chartcard">
    <div class="chh"><b>Traffic</b><div class="leg">
      <span class="meta"><i style="background:var(--accent)"></i>Pageviews</span>
      <span class="meta"><i style="background:var(--powder)"></i>Sessions</span>
      <span class="meta"><i style="background:var(--t5)"></i>${PREV_LABEL[state.range]}</span>
    </div></div>
    <div class="plotwrap" id="plot" data-n="${v.ts.length}">
      <div class="yaxis">${ticks.map((t) => `<span style="top:${((1 - t / yMax) * 100).toFixed(2)}%">${F(t)}</span>`).join("")}</div>
      <svg class="plot" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        ${ticks.map((t) => `<line x1="0" x2="${W}" y1="${((1 - t / yMax) * H).toFixed(1)}" y2="${((1 - t / yMax) * H).toFixed(1)}" stroke="var(--ink)" stroke-opacity="0.05" vector-effect="non-scaling-stroke"/>`).join("")}
        <path d="${smooth(pts(prev))}" fill="none" stroke="var(--ink)" stroke-opacity="0.24" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
        <path d="${smooth(pts(pv))} L${W},${H} L0,${H} Z" fill="url(#g)"/>
        <path d="${smooth(pts(se))}" fill="none" stroke="var(--powder)" stroke-opacity="0.42" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        <path d="${smooth(pts(pv))}" fill="none" stroke="var(--accent)" stroke-width="1.7" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      </svg>
      <div class="cursor"></div><span class="dot ghost"></span><span class="dot"></span>
      <div class="readout"></div>
    </div>
    <div class="xaxis">${xTicks.map((t) => `<span style="left:${t.x}%">${t.label}</span>`).join("")}</div>
  </div>

  <div class="duo">
    ${rankTable("Top pages", "Page", "Views", v.pages, { mono: true, kind: "page" })}
    ${rankTable("Sources", "Source", "Views", v.refs, { kind: "source" })}
    ${rankTable("Countries", "Country", "Views", v.geo, { kind: "country" })}
    ${rankTable("Technology", "Name", "Views", v.tech, { kind: "tech", extra: `<div class="mini">
      ${[["devices", "Device"], ["browsers", "Browser"], ["os", "OS"]].map(([k, l]) => `<span class="${state.tech === k ? "on" : ""}" data-tech="${k}" role="button" tabindex="0">${l}</span>`).join("")}</div>` })}
  </div>

  <div style="margin-top:16px">${rankTable("Custom events", "Event", "Count", v.events, { mono: true })}</div>

  <div class="card" style="margin-top:22px;border-style:dashed"><div class="cb" style="padding:14px 18px">
    <p class="muted"><b style="color:var(--t3);font-weight:500">About this mockup.</b>
    Every figure comes from the local database — ${int(site.ranges["90d"].overview.totalPageviews)} real events over 90 days, seeded as sessions rather than loose pageviews.
    Two things are drawn but not built: the period deltas and the dashed comparison line need a previous-window query the analytics API does not have,
    and scoping by a row is applied client-side here because <code>/analytics</code> takes no filter yet.</p>
  </div></div>`;
}

function loadingView(site) {
  const bar = (w) => `<div class="sk" style="height:11px;max-width:${w}%;flex:1"></div>`;
  return `${siteHeadHtml(site, "analytics")}
  <div class="card mrow" aria-busy="true">
    ${["Pageviews", "Sessions", "Visitors", "Active now"].map((l) => `<div class="m"><span class="meta">${l}</span>
      <div class="sk" style="height:31px;width:96px;margin-top:12px"></div>
      <div class="sk" style="height:11px;width:52px;margin-top:10px"></div></div>`).join("")}
  </div>
  <div class="card chartcard" aria-busy="true"><div class="ph"><b>Traffic</b></div><div class="sk" style="height:300px"></div></div>
  <div class="duo">${["Top pages", "Sources", "Countries", "Technology"].map((t) => `<div class="card p" aria-busy="true">
    <div class="ph"><b>${t}</b></div>
    ${[70, 52, 61, 44, 58, 38].map((w) => `<div style="display:flex;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--rule)">${bar(w)}<div class="sk" style="height:4px;width:88px"></div><div class="sk" style="height:11px;width:34px"></div></div>`).join("")}
  </div>`).join("")}</div>`;
}

function failedView(site) {
  return `${siteHeadHtml(site, "analytics")}
  <div class="card danger"><div class="mid">
    <div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:1px solid color-mix(in oklab,oklch(0.63 0.21 25) 40%,transparent);color:oklch(0.74 0.17 25);margin-bottom:14px;font-size:17px">!</div>
    <h2>Could not load this range</h2>
    <p>The analytics API answered <code>503 Service Unavailable</code>. Your events are still being collected — this is the read path, not the write path.</p>
    <div class="act"><button class="btn primary" data-demo="live">Try again</button><button class="btn" data-go="#/docs">Check status</button></div>
  </div></div>`;
}

function emptyView(site) {
  return `${siteHeadHtml(site, "analytics")}
  <div class="card"><div class="mid">
    <h2>Nothing has arrived yet</h2>
    <p>The snippet has not reported a single event from this domain. A chart of zeros would not tell you anything, so here is what usually explains it.</p>
    <div class="act"><button class="btn primary" data-go="#/site/${site.id}/setup">Open setup</button><button class="btn" data-go="#/docs">Installation guide</button></div>
    <ol class="checks">
      <li><span class="q">?</span><span><b>Is the snippet on the page?</b><p>View source on the live site and search for <code>pulse.js</code>. An ad blocker can stop it loading too.</p></span></li>
      <li><span class="q">?</span><span><b>Does the hostname match?</b><p>Events are kept only from <code>${esc(site.domain)}</code> or a subdomain of it, so a page served from localhost is dropped.</p></span></li>
      <li><span class="q">?</span><span><b>Did it look like it worked?</b><p>It would either way. <code>/track</code> answers 204 on a rejected event exactly as on an accepted one.</p></span></li>
    </ol>
  </div></div>`;
}

function sitesView() {
  const card = (s) => {
    const r = s.ranges?.["7d"];
    const sp = r ? sparkPath(blocks(r.timeseries.map((p) => p.pageviews), Math.max(1, Math.round(r.timeseries.length / 16)))) : null;
    return `<a class="card sc" data-go="#/site/${s.id}/analytics">
      <div class="sct"><span><b>${esc(s.name)}</b><span class="dm">${esc(s.domain)}</span></span>
        <span class="live ${s.active ? "" : "off"}"><i></i>${s.active ? "Live" : "Paused"}</span></div>
      <div class="nums">
        <span class="n"><b>${r ? F(r.overview.totalPageviews) : 0}</b><span>pageviews</span></span>
        <span class="n"><b>${r ? F(r.overview.totalVisitors) : 0}</b><span>visitors</span></span>
      </div>
      ${sp ? `<svg class="spark" width="100%" height="34" viewBox="0 0 86 24" preserveAspectRatio="none" fill="none"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`
           : `<div class="spark" style="height:34px;display:grid;place-items:center;font-size:12px;color:var(--t5)">no events yet</div>`}
    </a>`;
  };
  return `
  <div class="top"><h1>Sites</h1><button class="btn primary" style="margin-left:auto" data-go="#/new">＋ Add site</button></div>
  <div class="grid">${sites().map(card).join("")}</div>
  <p class="muted" style="margin-top:20px">Last 7 days on each. Staging has never reported — open it to see the state a new site lands in.</p>`;
}

function setupView(site) {
  const snippet = `<script src="https://api.pulse.dev/pulse.js"\n        data-tid="${site.tid}"\n        data-host="https://api.pulse.dev"><\/script>`;
  const curl = `curl -X POST "https://api.pulse.dev/api/v1/track" -G \\\n  --data-urlencode "tid=${site.tid}" \\\n  --data-urlencode "t=PAGEVIEW" \\\n  --data-urlencode "dl=https://${site.domain}/"`;
  return `${siteHeadHtml(site, "setup")}
  ${site.active ? "" : `<div class="wait"><span class="pip"><i></i><i></i></span>
    <span><b>Waiting for your first event</b><p>This page becomes the dashboard the moment one arrives. Checking every few seconds.</p></span></div>`}
  <div class="stack">
    <div class="card">
      <div class="ch"><span><b>Tracking snippet</b><p>Paste this once, inside the &lt;head&gt; of every page you want counted.</p></span>
        <button class="copy" data-copy="${esc(snippet)}">Copy</button></div>
      <div class="cb"><pre>${esc(snippet).replace(/script/g, '<span class="t">script</span>').replace(/(data-\w+)/g, '<span class="a">$1</span>')}</pre></div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Send a test event</b><p>Fires one pageview from your terminal, so you can tell a broken snippet from an empty site.</p></span>
        <button class="copy" data-copy="${esc(curl)}">Copy</button></div>
      <div class="cb"><pre>${esc(curl).replace(/^curl/, '<span class="t">curl</span>').replace(/("[^"]*")/g, '<span class="a">$1</span>')}</pre></div>
    </div>
    <div class="card">
      <div class="ch"><b>Details</b></div>
      <div class="cb" style="padding-top:4px;padding-bottom:6px">
        ${[["Tracking ID", site.tid], ["Domain", site.domain], ["Plan", "Free — 100k events / month"], ["Created", site.created]]
          .map(([k, val]) => `<div class="kv"><span class="k">${k}</span><span class="v">${esc(val)}</span></div>`).join("")}
      </div>
    </div>
  </div>`;
}

function settingsView(site) {
  const events = site.ranges ? int(site.ranges["90d"].overview.totalPageviews) : "0";
  return `${siteHeadHtml(site, "settings")}
  <div class="stack narrowstack">
    <div class="card">
      <div class="ch"><span><b>General</b><p>The name is yours alone; the domain decides which events are kept.</p></span></div>
      <div class="cb">
        <label class="f"><span class="lb">Site name</span><input value="${esc(site.name)}"></label>
        <label class="f" style="margin-bottom:10px"><span class="lb">Domain</span><input value="${esc(site.domain)}">
          <span class="hint">No https:// and no trailing slash. Subdomains of this are counted too.</span></label>
        <div class="rowend"><button class="btn primary" data-toast="Site updated.">Save changes</button></div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Tracking key</b><p>Regenerate if it leaked. The old snippet stops reporting the moment you do.</p></span></div>
      <div class="cb">
        <div class="key"><span>${site.tid}</span><span class="meta">Active</span></div>
        <div class="rowend"><button class="btn" data-toast="Tracking key regenerated.">Regenerate key</button></div>
      </div>
    </div>
    <div class="card danger">
      <div class="ch"><span><b>Delete this site</b><p>Removes the site and every event recorded for it. There is no undo.</p></span></div>
      <div class="cb"><div class="between" id="danger">
        <span><b>${esc(site.domain)}</b><p>${events} events across 90 days would go with it.</p></span>
        <button class="btn danger" data-confirm-delete>Delete site</button>
      </div></div>
    </div>
  </div>`;
}

const THREADS = [
  {
    title: "Busiest day last week",
    q: "Which day last week had the most pageviews?",
    a: "Tuesday 2 September, with 1,486 pageviews — about 21% above the week's daily average of 1,229.",
    cols: ["Day", "Pageviews", "Sessions"],
    rows: [["2026-09-02", "1,486", "602"], ["2026-09-04", "1,402", "571"], ["2026-08-31", "1,338", "544"]],
    ms: 42,
    sql: `SELECT day, SUM(pageviews) AS pageviews, SUM(sessions) AS sessions\nFROM ask_daily\nWHERE day >= now() - interval '7 days'\nGROUP BY day ORDER BY pageviews DESC LIMIT 3;`,
  },
  {
    title: "Which docs page loses people",
    q: "Which docs page has the worst pageviews-per-session?",
    a: "/docs/events, at 1.08 pageviews per session — visitors arrive there and leave without going deeper. /docs/quickstart is the healthiest at 2.6.",
    cols: ["Page", "Views", "Per session"],
    rows: [["/docs/events", "733", "1.08"], ["/docs/installation", "1,004", "1.640"], ["/docs/quickstart", "1,596", "2.60"]],
    ms: 61,
    sql: `SELECT page, SUM(pageviews) AS views,\n       ROUND(SUM(pageviews)::numeric / NULLIF(SUM(sessions), 0), 2) AS per_session\nFROM ask_daily\nWHERE day >= now() - interval '30 days' AND page LIKE '/docs/%'\nGROUP BY page ORDER BY per_session ASC;`,
  },
  {
    title: "Mobile share over time",
    q: "Is mobile traffic growing?",
    a: "Yes, slowly. Mobile was 29.4% of pageviews in the first month of the window and 33.6% in the last — up about four points over 90 days.",
    cols: ["Month", "Mobile %", "Views"],
    rows: [["June", "29.4%", "18,204"], ["July", "31.1%", "27,880"], ["August", "33.6%", "36,102"]],
    ms: 88,
    sql: `SELECT date_trunc('month', day) AS month,\n       ROUND(100.0 * SUM(pageviews) FILTER (WHERE device = 'mobile')\n             / NULLIF(SUM(pageviews), 0), 1) AS mobile_pct,\n       SUM(pageviews) AS views\nFROM ask_daily\nWHERE day >= now() - interval '90 days'\nGROUP BY 1 ORDER BY 1;`,
  },
];

function askView(site) {
  const t = THREADS[state.thread];
  return `${siteHeadHtml(site, "ask")}
  <div class="wrap">
    <div class="card threads">
      <button class="btn primary nt" data-toast="New thread started.">New question</button>
      ${THREADS.map((x, i) => `<a class="${i === state.thread ? "on" : ""}" data-thread="${i}">${esc(x.title)}</a>`).join("")}
    </div>
    <div class="card conv">
      <div class="ch"><span><b>${esc(t.title)}</b><p>Answers are SQL over the hourly and daily rollups — never raw events, never visitor identifiers.</p></span></div>
      <div class="msgs">
        <div><p class="q">${esc(t.q)}</p></div>
        ${state.asking ? `<div class="thinking"><i></i><i></i><i></i>Writing the query…</div>` : `
        <div class="a">
          <p>${esc(t.a)}</p>
          <div class="res"><table>
            <thead><tr>${t.cols.map((c, i) => `<th${i ? ' style="text-align:right"' : ""}>${c}</th>`).join("")}</tr></thead>
            <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? "n" : "mn"}">${c}</td>`).join("")}</tr>`).join("")}</tbody>
          </table></div>
          <div class="sql">
            <div class="sqlhead"><span class="meta">Query it ran</span><span style="flex:1;height:1px;background:var(--seam)"></span><span class="meta">${t.ms} ms</span></div>
            <pre>${esc(t.sql).replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|AND|AS|FILTER|ROUND|SUM|NULLIF|DESC|ASC|LIKE)\b/g, '<span class="t">$1</span>').replace(/('[^']*')/g, '<span class="a">$1</span>')}</pre>
          </div>
        </div>`}
      </div>
      <div class="composer">
        <input placeholder="Ask about this site's traffic…" id="askbox" ${state.asking ? "disabled" : ""}>
        <button class="btn primary" data-ask ${state.asking ? "disabled" : ""}>Ask</button>
      </div>
    </div>
  </div>`;
}

function newSiteView() {
  return `
  <div class="head"><h1>Add a site</h1></div>
  <p class="lede">A name and a domain. You get the snippet on the next screen, and the first visit shows up while you are still looking at it.</p>
  <div class="two" style="margin-top:24px">
    <div class="card"><div class="cb">
      <label class="f"><span class="lb">Site name</span><input placeholder="Acme Docs" id="nsName"><span class="hint">What you will call it inside Pulse.</span></label>
      <label class="f"><span class="lb">Domain</span><input placeholder="example.com" id="nsDomain"><span class="hint">No https:// and no trailing slash. Events from subdomains count too.</span></label>
      <div style="display:flex;gap:9px;justify-content:flex-end"><button class="btn ghost" data-go="#/sites">Cancel</button><button class="btn primary" data-create>Create site</button></div>
    </div></div>
    <div class="card">
      <div class="ch"><span><b>What you will get</b><p>One line, before the closing &lt;/head&gt;.</p></span></div>
      <div class="cb">
        <pre>&lt;<span class="t">script</span> <span class="a">src</span>="https://api.pulse.dev/pulse.js"
        <span class="a">data-tid</span>="pk-…"&gt;&lt;/<span class="t">script</span>&gt;</pre>
        <p class="muted" style="margin-top:12px">No cookie banner and no consent flow: Pulse sets no cookies and stores no visitor identifiers.</p>
      </div>
    </div>
  </div>`;
}

function accountView() {
  return `
  <div class="head"><h1>Account</h1><span class="sub">you@example.com</span></div>
  <div class="stack narrowstack" style="margin-top:24px;max-width:600px">
    <div class="card">
      <div class="ch"><b>Profile</b></div>
      <div class="cb">
        <label class="f"><span class="lb">Name</span><input value="Ashish"></label>
        <label class="f" style="margin-bottom:10px"><span class="lb">Email</span><input value="you@example.com"></label>
        <div class="rowend"><button class="btn primary" data-toast="Profile updated.">Save changes</button></div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Password</b><p>Changing it signs out every other device.</p></span></div>
      <div class="cb">
        <label class="f"><span class="lb">New password</span><input type="password" id="pw" placeholder="At least 8 characters"></label>
        <div style="margin:-6px 0 14px" id="pwrules">
          <div class="rule off" data-rule="len"><i></i>At least 8 characters</div>
          <div class="rule off" data-rule="upper"><i></i>One uppercase letter</div>
          <div class="rule off" data-rule="digit"><i></i>One number</div>
        </div>
        <label class="f" style="margin-bottom:10px"><span class="lb">Confirm password</span><input type="password" placeholder="Repeat it"></label>
        <div class="rowend"><button class="btn primary" data-toast="Password changed.">Change password</button></div>
      </div>
    </div>
  </div>`;
}

function docsView() {
  return `
  <div class="head"><h1>Docs</h1></div>
  <p class="lede">The documentation lives at <code>/docs</code> in the real app and is readable signed out. It is out of scope for this mockup — the rail entry is here because signed in there was no way to reach it at all.</p>
  <div class="card" style="margin-top:22px"><div class="mid">
    <h2>Not part of this mockup</h2>
    <p>Quickstart, install guides, event tracking, how it works and the SDK reference already exist as markdown in the repo.</p>
    <div class="act"><button class="btn" data-go="#/sites">Back to sites</button></div>
  </div></div>`;
}

/* ── render ────────────────────────────────────────────────────────────── */
function render() {
  const r = state.route;
  let body = "";
  if (r.view === "sites") body = sitesView();
  else if (r.view === "new") body = newSiteView();
  else if (r.view === "account") body = accountView();
  else if (r.view === "docs") body = docsView();
  else if (r.view === "site") {
    const site = siteById(r.site);
    if (!site) { location.hash = "#/sites"; return; }
    body = { analytics: analyticsView, setup: setupView, settings: settingsView, ask: askView }[r.tab](site);
  }

  const showDemo = r.view === "site" && r.tab === "analytics" && siteById(r.site)?.ranges;
  document.body.innerHTML = `
    <div class="app">${railHtml()}<main><div class="col">${body}</div></main></div>
    ${showDemo ? `<div class="demo"><span>State</span>
      ${[["live", "Live"], ["loading", "Loading"], ["failed", "Failed"]]
        .map(([k, l]) => `<button class="${state.demo === k ? "on" : ""}" data-demo="${k}">${l}</button>`).join("")}
    </div>` : ""}`;

  if (showDemo && state.demo === "live") wireChart();
}

/* The chart reads under the pointer. Without it a trend line is a picture of
   data rather than something you can interrogate. */
function wireChart() {
  const plot = $("#plot");
  if (!plot) return;
  const v = view();
  const pv = v.ts.map((p) => p.pageviews);
  const se = v.ts.map((p) => p.sessions);
  const { yMax } = niceScale(Math.max(...pv, 1));
  const win = pv.map((_, i) => {
    const w = pv.slice(Math.max(0, i - 4), i + 5);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const prev = win.map((x, i) => x * (0.80 + 0.13 * Math.sin(i / 24)));

  const cursor = $(".cursor", plot), dot = $(".dot:not(.ghost)", plot),
        ghost = $(".dot.ghost", plot), readout = $(".readout", plot);
  const padLeft = 42;

  const move = (ev) => {
    const box = plot.getBoundingClientRect();
    const x = Math.min(Math.max(ev.clientX - box.left - padLeft, 0), box.width - padLeft);
    const i = Math.round((x / (box.width - padLeft)) * (pv.length - 1));
    const px = padLeft + (i / (pv.length - 1)) * (box.width - padLeft);
    const py = (1 - pv[i] / yMax) * box.height;
    const pyPrev = (1 - prev[i] / yMax) * box.height;
    const at = new Date(v.ts[i].time);
    const stamp = state.range === "7d"
      ? at.toLocaleString("en", { weekday: "short", month: "short", day: "numeric", hour: "numeric", hour12: true })
      : at.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

    plot.classList.add("live");
    cursor.style.left = `${px}px`;
    dot.style.left = `${px}px`; dot.style.top = `${py}px`;
    ghost.style.left = `${px}px`; ghost.style.top = `${pyPrev}px`;
    readout.innerHTML = `<div class="when">${stamp}</div>
      <div class="r"><i style="background:var(--accent)"></i><span>Pageviews</span><b>${int(pv[i])}</b></div>
      <div class="r"><i style="background:var(--powder)"></i><span>Sessions</span><b>${int(se[i])}</b></div>
      <div class="r"><i style="background:var(--t5)"></i><span>${PREV_LABEL[state.range]}</span><b>${int(prev[i])}</b></div>`;
    // Flip rather than walk off the plot.
    const flip = px > box.width - 210;
    readout.style.left = flip ? "" : `${px + 14}px`;
    readout.style.right = flip ? `${box.width - px + 14}px` : "";
    readout.style.top = `${Math.min(Math.max(py, 46), box.height - 46)}px`;
  };
  plot.addEventListener("pointermove", move);
  plot.addEventListener("pointerleave", () => plot.classList.remove("live"));
}

function toast(msg) {
  const t = el(`<div style="position:fixed;left:50%;bottom:26px;translate:-50% 0;background:var(--raised);border:1px solid var(--seam);border-radius:9px;padding:10px 15px;font-size:13px;box-shadow:0 16px 34px -16px rgba(0,0,0,.9);z-index:60">${esc(msg)}</div>`);
  document.body.append(t);
  setTimeout(() => t.remove(), 1900);
}

/* ── routing and events ────────────────────────────────────────────────── */
function parseHash() {
  const parts = (location.hash.replace(/^#\/?/, "") || "sites").split("/");
  if (parts[0] === "site" && parts[1]) return { view: "site", site: parts[1], tab: parts[2] || "analytics" };
  return { view: parts[0] || "sites", site: null, tab: "analytics" };
}

addEventListener("hashchange", () => {
  const next = parseHash();
  // A filter belongs to one site and one window; carrying it across is a lie.
  if (next.site !== state.route.site) { state.filter = null; state.demo = "live"; }
  state.route = next;
  scrollTo(0, 0);
  render();
});

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { e.preventDefault(); location.hash = go.dataset.go; return; }

  const range = e.target.closest("[data-range]");
  if (range) { state.range = range.dataset.range; state.filter = null; render(); return; }

  const tech = e.target.closest("[data-tech]");
  if (tech) { state.tech = tech.dataset.tech; render(); return; }

  const demo = e.target.closest("[data-demo]");
  if (demo) { state.demo = demo.dataset.demo; render(); return; }

  const row = e.target.closest("[data-filter]");
  if (row) {
    const { filter, label, share, pct } = row.dataset;
    const same = state.filter?.kind === filter && state.filter?.label === label;
    state.filter = same ? null : { kind: filter, label, factor: Number(pct) / 100, pct };
    render();
    return;
  }
  if (e.target.closest("[data-clear-filter]")) { state.filter = null; render(); return; }

  const thread = e.target.closest("[data-thread]");
  if (thread) { state.thread = Number(thread.dataset.thread); render(); return; }

  if (e.target.closest("[data-ask]")) {
    state.asking = true; render();
    setTimeout(() => { state.asking = false; state.thread = (state.thread + 1) % THREADS.length; render(); }, 1400);
    return;
  }

  const copy = e.target.closest("[data-copy]");
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.copy);
    copy.textContent = "Copied"; copy.classList.add("done");
    setTimeout(() => { copy.textContent = "Copy"; copy.classList.remove("done"); }, 1600);
    return;
  }

  // Deleting a site drops its analytics with it, so the button asks twice.
  const del = e.target.closest("[data-confirm-delete]");
  if (del) {
    const box = $("#danger");
    box.querySelector("p").textContent = "This cannot be undone. Confirm to delete.";
    del.replaceWith(el(`<span style="display:flex;gap:8px;flex:none">
      <button class="btn ghost" data-cancel-delete>Cancel</button>
      <button class="btn danger" data-toast="Site deleted.">Yes, delete</button></span>`));
    return;
  }
  if (e.target.closest("[data-cancel-delete]")) { render(); return; }

  if (e.target.closest("[data-create]")) {
    const name = $("#nsName")?.value.trim() || "New site";
    const domain = $("#nsDomain")?.value.trim() || "example.org";
    const id = "s" + (sites().length + 1);
    sites().push({ id, name, domain, tid: "pk-" + Math.random().toString(36).slice(2).padEnd(32, "x").slice(0, 32), created: "today", active: false, ranges: null });
    location.hash = `#/site/${id}/setup`;
    return;
  }

  const t = e.target.closest("[data-toast]");
  if (t) toast(t.dataset.toast);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const hit = e.target.closest("[data-range],[data-tech],[data-demo]");
  if (hit) { e.preventDefault(); hit.click(); }
});

// Password rules resolve as you type rather than failing after submit.
document.addEventListener("input", (e) => {
  if (e.target.id !== "pw") return;
  const v = e.target.value;
  const ok = { len: v.length >= 8, upper: /[A-Z]/.test(v), digit: /[0-9]/.test(v) };
  for (const [k, pass] of Object.entries(ok)) {
    $(`[data-rule="${k}"]`)?.classList.toggle("off", !pass);
  }
});

state.route = parseHash();
render();
