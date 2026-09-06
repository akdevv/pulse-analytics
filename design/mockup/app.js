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
  thread: "t1",
  install: "script",   // setup: which install path is shown
  dirty: false,        // settings: has the form been edited
  confirmText: "",     // settings: typed confirmation before deleting
  railMenu: false,     // mobile: the rail's site menu
  demoOpen: false,     // the mockup-only state switcher
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
  search: `<circle cx="9" cy="9" r="5"/><path d="m13 13 3.5 3.5"/>`,
};
const icon = (k, s = 15) =>
  `<svg viewBox="0 0 20 20" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

function railHtml() {
  const r = state.route;
  const cur = r.site ? siteById(r.site) : null;

  const sparkFor = (s) => {
    const ts = s.ranges?.["7d"]?.timeseries;
    if (!ts) return null;
    return sparkPath(blocks(ts.map((p) => p.pageviews), Math.max(1, Math.round(ts.length / 18))), 100, 26);
  };
  const pvFor = (s) => (s.ranges ? F(s.ranges["7d"].overview.totalPageviews) : "0");

  // The site you are in, given the room it deserves. The rail used to carry a
  // switcher pill and a list of the same sites underneath it — two controls
  // for one job, which is why it read as unresolved.
  const currentBlock = (s) => `
    <div class="sitecard ${s.ranges ? "" : "quiet"}">
      <div class="sctop">
        <span class="scname">${esc(s.name)}</span>
        <span class="scpip ${s.active ? "" : "off"}" title="${s.active ? "Receiving events" : "No events yet"}"></span>
      </div>
      <span class="scdom">${esc(s.domain)}</span>
      ${sparkFor(s)
        ? `<svg class="scspark" viewBox="0 0 100 26" preserveAspectRatio="none" fill="none" aria-hidden="true">
             <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stop-color="var(--accent)" stop-opacity=".22"/>
               <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
             <path d="${sparkFor(s)} L100,26 L0,26 Z" fill="url(#rg)"/>
             <path d="${sparkFor(s)}" stroke="var(--accent)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>
           </svg>`
        : `<div class="scspark empty">no events yet</div>`}
      <div class="scfoot"><b class="fig">${pvFor(s)}</b><span>views · 7d</span></div>
    </div>`;

  const compact = (s, on = false) => `<a class="siterow ${on ? "on" : ""}" href="#/site/${s.id}/analytics" data-go="#/site/${s.id}/analytics"${on ? ' aria-current="page"' : ""}>
      <span class="pip ${s.active ? "" : "off"}"></span>
      <span class="nm">${esc(s.name)}</span>
      <span class="n">${pvFor(s)}</span>
    </a>`;

  return `
  <aside class="rail">
    <div class="brand">
      <span class="mark"><svg viewBox="0 0 24 16" width="17" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"/></svg></span>
      <span class="word">Pulse</span>
    </div>

    <button class="jump" data-toast="Command palette is not part of this mockup.">
      ${icon("search", 14)}<span>Jump to…</span><kbd>⌘K</kbd>
    </button>

    <div class="zone">
      <div class="zhead"><span class="meta">${cur ? "Current site" : "All sites"}</span><a class="zlink" href="#/sites" data-go="#/sites">All sites →</a></div>
      ${currentBlock(cur ?? {
        name: "All sites", domain: `${sites().length} sites`, active: sites().some((x) => x.active),
        ranges: sites().find((x) => x.ranges)?.ranges,
      })}
      <div class="siterows">${sites().map((x) => compact(x, x.id === cur?.id)).join("")}</div>
      <a class="addrow" href="#/new" data-go="#/new"><span class="plus">+</span>Add site</a>
    </div>

    <div class="spacer"></div>

    ${usageBlock()}

    <nav class="nav">
      <a class="${r.view === "docs" ? "on" : ""}" href="#/docs" data-go="#/docs">${icon("docs")}<span>Docs</span></a>
    </nav>

    <button class="railmenu" data-railmenu aria-haspopup="true" aria-expanded="${state.railMenu ? "true" : "false"}">
      <span class="pip ${cur ? (cur.active ? "" : "off") : "hide"}"></span>
      <span class="rm">${cur ? esc(cur.name) : "All sites"}</span>
      ${icon("chevron", 14)}
    </button>
    ${state.railMenu ? `<div class="railsheet">
      <a href="#/sites" data-go="#/sites">All sites</a>
      ${sites().map((x) => `<a href="#/site/${x.id}/analytics" data-go="#/site/${x.id}/analytics" class="${x.id === r.site ? "on" : ""}">
        <span class="pip ${x.active ? "" : "off"}"></span>${esc(x.name)}<span class="n">${pvFor(x)}</span></a>`).join("")}
      <a href="#/new" data-go="#/new">+ Add site</a>
      <a href="#/docs" data-go="#/docs">Docs</a>
      <a href="#/notes" data-go="#/notes">About this mockup</a>
    </div>` : ""}

    <a class="acct ${r.view === "account" ? "on" : ""}" href="#/account" data-go="#/account">
      <span class="av">AK</span>
      <span class="who"><b>Ashish</b><span>you@example.com</span></span>
      ${icon("chevron", 14)}
    </a>
    <a class="notelink" href="#/notes" data-go="#/notes">About this mockup</a>
  </aside>`;
}

/* What filled the rail's dead half was a spacer. This is the question that
   space can actually answer: how much am I collecting, across everything,
   and is it going up. Both figures are summed from the same payloads the
   dashboard reads — there is no quota here, because the product does not
   have one to report. */
function usageBlock() {
  const totals = (key) =>
    sites().reduce((sum, s) => sum + (s.ranges?.[key]?.overview.totalPageviews ?? 0), 0);
  const last30 = totals("30d");
  const prior = Math.max(0, totals("90d") - last30 * 2);
  const change = prior ? ((last30 - prior) / prior) * 100 : 0;

  // Summed across sites, day by day. A bar comparing this month to last was
  // always full — with growth the larger value is always the current one, so
  // the ratio could never say anything. The shape can.
  const series = [];
  for (const s of sites()) {
    (s.ranges?.["30d"]?.timeseries ?? []).forEach((p, i) => { series[i] = (series[i] ?? 0) + p.pageviews; });
  }
  return `
  <div class="usage">
    <div class="uhead"><span class="meta">Last 30 days</span><span class="udelta ${change >= 0 ? "up" : "dn"}">${change >= 0 ? "↗" : "↘"} ${Math.abs(change).toFixed(0)}%</span></div>
    <div class="ufig"><b class="fig">${F(last30)}</b><span>events · all sites</span></div>
    ${series.length > 1 ? `<svg class="uspark" viewBox="0 0 100 22" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="${sparkPath(series, 100, 22)}" stroke="var(--accent)" stroke-opacity=".8" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
    </svg>` : ""}
    <div class="ufoot"><span>vs ${F(prior)} before</span></div>
  </div>`;
}

function siteHeadHtml(site, tab) {
  const ago = site.active ? "12s" : "never";
  return `
  <div class="head">
    <h1>${esc(site.name)}</h1><span class="sub">${esc(site.domain)}</span>
    <span class="st">
      <span class="ago">last event ${ago}${site.active ? " ago" : ""}</span>
      <span class="live ${site.active ? "" : "off"}"><i style="${site.active ? "" : "background:currentColor"}"></i>${site.active ? "Receiving" : "Not receiving"}</span>
    </span>
  </div>
  <div class="bar">
    <div class="tabs">
      ${[["analytics", "Analytics"], ["ask", "Ask AI"], ["setup", "Setup"], ["settings", "Settings"]]
        .map(([k, l]) => `<a class="${tab === k ? "on" : ""}" href="#/site/${site.id}/${k}" data-go="#/site/${site.id}/${k}">${l}</a>`).join("")}
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
        ${kind ? `data-filter="${kind}" data-label="${esc(r.label)}" data-share="${r.share}" data-pct="${r.pct}" role="button" tabindex="0"` : ""}>
      <td class="l${opts.mono ? " mn" : ""}" title="${esc(r.label)}">${esc(r.label)}</td>
      <td class="s"><span class="track"><i style="--w:${r.share.toFixed(3)}"></i></span></td>
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

  <div class="card mrow">
    ${[["Pageviews", F(v.overview.pageviews), spark(pv), delta(d1)],
       ["Sessions", F(v.overview.sessions), spark(se), delta(d1 * 0.66)],
       ["Visitors", F(v.overview.visitors), spark(pv.map((x, i) => x * (0.7 + ((i * 7) % 11) / 32))), delta(d1 * -0.17)]]
      .map(([l, val, sp, d]) => `<div class="m"><div class="mtop"><span class="meta">${l}</span>
        <svg width="86" height="24" fill="none" aria-hidden="true"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".7" stroke-width="1.3"/></svg></div>
        <span class="fig v">${val}</span>${d}</div>`).join("")}
    <div class="m"><div class="mtop"><span class="meta"><span class="pip live-pip"></span>Active now</span>
      <span class="ticker" aria-hidden="true">${[3,5,4,7,6,4,8,5,7,9,6,8].map((h) => `<i style="height:${h * 11}%"></i>`).join("")}</span></div>
      <span class="fig v" style="color:var(--powder)">${state.filter ? "—" : 3}</span>
      <span class="d muted-d">last 5 min</span></div>
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
        <path d="${smooth(pts(prev))}" fill="none" stroke="var(--ink)" stroke-opacity="0.16" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
        <path d="${smooth(pts(pv))} L${W},${H} L0,${H} Z" fill="url(#g)"/>
        <path d="${smooth(pts(se))}" fill="none" stroke="var(--powder)" stroke-opacity="0.85" stroke-width="1.3" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
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

  <div>${rankTable("Custom events", "Event", "Count", v.events, { mono: true })}</div>

`;
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
    return `<a class="card sc" href="#/site/${s.id}/analytics" data-go="#/site/${s.id}/analytics">
      <div class="sct"><span><b>${esc(s.name)}</b><span class="dm">${esc(s.domain)}</span></span>
        <span class="live ${s.active ? "" : "off"}"><i></i>${s.active ? "Receiving" : "Not receiving"}</span></div>
      <div class="nums">
        <span class="n"><b>${r ? F(r.overview.totalPageviews) : 0}</b><span>pageviews</span></span>
        <span class="n"><b>${r ? F(r.overview.totalVisitors) : 0}</b><span>visitors</span></span>
      </div>
      ${sp ? `<svg class="spark" width="100%" height="34" viewBox="0 0 86 24" preserveAspectRatio="none" fill="none"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`
           : `<div class="spark" style="height:34px;display:grid;place-items:center;font-size:12px;color:var(--t5)">no events yet</div>`}
    </a>`;
  };
  const live = sites().filter((x) => x.ranges);
  const sum = (k, r = "7d") => live.reduce((n, x) => n + x.ranges[r].overview[k], 0);
  const series = [];
  for (const x of live) (x.ranges["7d"].timeseries ?? []).forEach((pt, i) => { series[i] = (series[i] ?? 0) + pt.pageviews; });

  return `
  <div class="head"><h1>Sites</h1>
    <span class="action"><button class="btn primary" data-go="#/new">+ Add site</button></span></div>

  <div class="card allsites">
    <div class="asnums">
      ${[["Pageviews", F(sum("totalPageviews"))], ["Sessions", F(sum("totalSessions"))],
         ["Visitors", F(sum("totalVisitors"))], ["Sites reporting", `${live.length} of ${sites().length}`]]
        .map(([l, v]) => `<div class="stat"><span class="meta">${l}</span><b class="fig">${v}</b></div>`).join("")}
    </div>
    <svg class="asspark" viewBox="0 0 200 40" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <defs><linearGradient id="asg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".18"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      <path d="${sparkPath(blocks(series, Math.max(1, Math.round(series.length / 40))), 200, 40)} L200,40 L0,40 Z" fill="url(#asg)"/>
      <path d="${sparkPath(blocks(series, Math.max(1, Math.round(series.length / 40))), 200, 40)}" stroke="var(--accent)" stroke-opacity=".75" stroke-width="1.3" vector-effect="non-scaling-stroke"/>
    </svg>
    <span class="meta asfoot">Last 7 days, all sites</span>
  </div>

  <div class="grid">${sites().map(card).join("")}</div>
  <p class="muted">Last 7 days on each. Staging has never reported — open it to see the state a new site lands in.</p>`;
}

/* Syntax colour without the bug the first version shipped: escaping, then
   running replacements over the result, let a later pattern match the markup
   an earlier one had just inserted — which is how a curl block came out
   reading `"t">curl`. Tokenise once, emit once. */
function code(src, kind) {
  const RULES = kind === "sql"
    ? [[/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|AND|AS|FILTER|ROUND|SUM|NULLIF|DESC|ASC|LIKE|interval|now)\b/g, "t"],
       [/'[^']*'/g, "a"]]
    : kind === "html"
    ? [[/<\/?\w+/g, "t"], [/[\w-]+(?==)/g, "a"]]
    : [[/^\w+/gm, "t"], [/"[^"]*"/g, "a"]];

  const marks = [];
  for (const [re, cls] of RULES) {
    for (const m of src.matchAll(re)) {
      if (!marks.some((k) => m.index < k.end && k.start < m.index + m[0].length))
        marks.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  }
  marks.sort((a, b) => a.start - b.start);

  let out = "", at = 0;
  for (const m of marks) {
    out += esc(src.slice(at, m.start)) + `<span class="${m.cls}">` + esc(src.slice(m.start, m.end)) + "</span>";
    at = m.end;
  }
  return out + esc(src.slice(at));
}

const INSTALL = (site) => ({
  script: {
    label: "Script tag",
    note: "Works on any stack. Nothing to build, nothing to install.",
    kind: "html",
    src: `<script src="https://api.pulse.dev/pulse.js"\n        data-tid="${site.tid}"\n        data-host="https://api.pulse.dev"></script>`,
  },
  npm: {
    label: "npm",
    note: "For apps that already have a bundler. Gives you trackEvent and the usePulse hook.",
    kind: "js",
    src: `npm i @akdevv/pulse\n\nimport { init } from "@akdevv/pulse";\n\ninit({ trackingId: "${site.tid}", host: "https://api.pulse.dev" });`,
  },
  next: {
    label: "Next.js",
    note: "App Router. The component mounts once and follows client-side navigation.",
    kind: "js",
    src: `import { Pulse } from "@akdevv/pulse/react";\n\nexport default function RootLayout({ children }) {\n  return (\n    <html><body>\n      {children}\n      <Pulse trackingId="${site.tid}" />\n    </body></html>\n  );\n}`,
  },
});

function setupView(site) {
  const live = !!site.ranges;
  const opts = INSTALL(site);
  const cur = opts[state.install] ?? opts.script;
  const curl = `curl -X POST "https://api.pulse.dev/api/v1/track" -G \\\n  --data-urlencode "tid=${site.tid}" \\\n  --data-urlencode "t=PAGEVIEW" \\\n  --data-urlencode "dl=https://${site.domain}/"`;

  const week = live ? site.ranges["7d"] : null;
  const spark = week
    ? sparkPath(blocks(week.timeseries.map((p) => p.pageviews), Math.max(1, Math.round(week.timeseries.length / 20))), 160, 30)
    : null;

  return `${siteHeadHtml(site, "setup")}

  ${live ? `
  <div class="verify ok">
    <span class="vmark">✓</span>
    <div class="vtext">
      <b>Installed and reporting</b>
      <p>First event arrived 12 June. ${int(week.overview.totalPageviews)} pageviews in the last 7 days, most recently 12 seconds ago.</p>
    </div>
    <svg class="vspark" viewBox="0 0 160 30" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="${spark}" stroke="var(--success)" stroke-opacity=".7" stroke-width="1.3" vector-effect="non-scaling-stroke"/>
    </svg>
    <button class="btn" data-go="#/site/${site.id}/analytics">Open dashboard</button>
  </div>` : `
  <div class="verify wait">
    <span class="pip"><i></i><i></i></span>
    <div class="vtext">
      <b>Waiting for your first event</b>
      <p>This page becomes the dashboard the moment one arrives. Nothing to refresh — it is listening.</p>
    </div>
    <span class="meta">checking every 5s</span>
  </div>`}

  <div class="card">
    <div class="ch">
      <span><b>Install</b><p>${esc(cur.note)}</p></span>
      <div class="mini">${Object.entries(opts).map(([k, o]) => `<span class="${(state.install ?? "script") === k ? "on" : ""}" data-install="${k}" role="button" tabindex="0">${o.label}</span>`).join("")}</div>
    </div>
    <div class="cb">
      <div class="codewrap">
        <pre>${code(cur.src, cur.kind)}</pre>
        <button class="copy float" data-copy="${esc(cur.src)}">Copy</button>
      </div>
      <p class="muted">Put it before the closing <code>&lt;/head&gt;</code>. Events from <code>${esc(site.domain)}</code> and its subdomains are kept; anything else is dropped, including localhost.</p>
    </div>
  </div>

  <div class="duo">
    <div class="card">
      <div class="ch"><span><b>Send a test event</b><p>Tells a broken snippet apart from a quiet site.</p></span></div>
      <div class="cb"><div class="codewrap">
        <pre>${code(curl, "sh")}</pre>
        <button class="copy float" data-copy="${esc(curl)}">Copy</button>
      </div></div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Keys</b><p>The tracking id is public — it ships in your page source.</p></span></div>
      <div class="cb" style="padding-top:6px;padding-bottom:8px">
        <div class="key">
          <span>${site.tid}</span>
          <button class="copy" data-copy="${site.tid}">Copy</button>
        </div>
        <div class="kv"><span class="k">Domain</span><span class="v">${esc(site.domain)}</span></div>
        <div class="kv"><span class="k">Created</span><span class="v">${esc(site.created)}</span></div>
      </div>
    </div>
  </div>`;
}

function settingsView(site) {
  const events = site.ranges ? int(site.ranges["90d"].overview.totalPageviews) : "0";
  const armed = state.confirmText.trim().toLowerCase() === site.domain.toLowerCase();
  return `${siteHeadHtml(site, "settings")}
  <div class="settings">
    <div class="card">
      <div class="ch"><span><b>General</b><p>The name is yours alone. The domain decides which events are kept, so changing it changes what arrives.</p></span></div>
      <div class="cb">
        <label class="f"><span class="lb">Site name</span><input value="${esc(site.name)}" data-dirty></label>
        <label class="f" style="margin-bottom:12px"><span class="lb">Domain</span>
          <input value="${esc(site.domain)}" data-dirty data-domain>
          <span class="hint">No https:// and no trailing slash. Subdomains of this are counted too.</span></label>
        <div class="warn" id="domainwarn" hidden>
          Events already recorded stay. New events from <b>${esc(site.domain)}</b> stop being kept the moment you save.
        </div>
        <div class="rowend">
          <span class="meta" id="dirtyhint" ${state.dirty ? "" : "hidden"}>Unsaved changes</span>
          <button class="btn primary" id="save" ${state.dirty ? "" : "disabled"} data-toast="Site updated.">Save changes</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="ch"><span><b>Tracking key</b><p>Public by design — it ships in your page source. Regenerate only if you need the old snippet to stop reporting.</p></span></div>
      <div class="cb">
        <div class="key">
          <span>${site.tid}</span>
          <span style="display:flex;align-items:center;gap:10px">
            <span class="meta" style="color:var(--success)">Active</span>
            <button class="copy" data-copy="${site.tid}">Copy</button>
          </span>
        </div>
        <div class="between">
          <p class="muted">Last regenerated ${esc(site.created)} — never since.</p>
          <button class="btn" data-toast="Tracking key regenerated.">Regenerate key</button>
        </div>
      </div>
    </div>

    <div class="card danger">
      <div class="ch"><span><b>Delete this site</b><p>Removes ${esc(site.domain)} and every event recorded for it. There is no undo and no export.</p></span></div>
      <div class="cb">
        <p class="muted" style="margin-bottom:12px">${events} events across 90 days would go with it. Type <code>${esc(site.domain)}</code> to confirm.</p>
        <div class="confirmrow">
          <input class="cinput" placeholder="${esc(site.domain)}" value="${esc(state.confirmText)}" data-confirm-input aria-label="Type the domain to confirm deletion">
          <button class="btn danger" ${armed ? "" : "disabled"} data-toast="Site deleted.">Delete site</button>
        </div>
      </div>
    </div>
  </div>`;
}

const EXAMPLES = [
  "Which day last week had the most pageviews?",
  "What share of traffic is mobile?",
  "Which referrer sends the most sessions?",
];

/* Threads are conversations, not single questions — the API keeps a thread of
   messages and re-runs the stored SQL when one is reopened, so the mockup
   holds the same shape. */
const q = (text) => ({ role: "user", text });
const a = (text, cols, rows, sql, ms) => ({ role: "assistant", text, cols, rows, sql, ms });

let THREADS = [
  {
    id: "t1", title: "Busiest day last week", when: "12 min ago",
    messages: [
      q("Which day last week had the most pageviews?"),
      a("Tuesday 2 September, with 1,486 pageviews — about 21% above the week's daily average of 1,229.",
        ["Day", "Pageviews", "Sessions"],
        [["2026-09-02", "1,486", "602"], ["2026-09-04", "1,402", "571"], ["2026-08-31", "1,338", "544"]],
        "SELECT day, SUM(pageviews) AS pageviews, SUM(sessions) AS sessions\nFROM ask_daily\nWHERE day >= now() - interval '7 days'\nGROUP BY day ORDER BY pageviews DESC LIMIT 3;", 42),
    ],
  },
  {
    id: "t2", title: "Where the docs traffic goes", when: "Yesterday",
    // The long one: a real thread wanders, narrows, and doubles back.
    messages: [
      q("How much of my traffic is the docs?"),
      a("A little over a third. 3,241 of 9,062 pageviews in the last 7 days were under /docs — 35.8%.",
        ["Section", "Pageviews", "Share"],
        [["/docs", "3,241", "35.8%"], ["marketing", "4,077", "45.0%"], ["blog", "1,744", "19.2%"]],
        "SELECT CASE WHEN page LIKE '/docs/%' THEN '/docs'\n            WHEN page LIKE '/blog/%' THEN 'blog'\n            ELSE 'marketing' END AS section,\n       SUM(pageviews) AS pageviews\nFROM ask_daily\nWHERE day >= now() - interval '7 days'\nGROUP BY 1 ORDER BY 2 DESC;", 38),
      q("Which docs pages specifically?"),
      a("Quickstart carries most of it, then installation. The five docs pages split fairly evenly after that.",
        ["Page", "Pageviews", "Sessions"],
        [["/docs/quickstart", "1,596", "612"], ["/docs/installation", "1,004", "418"], ["/docs/events", "733", "301"], ["/docs/reference", "412", "188"]],
        "SELECT page, SUM(pageviews) AS pageviews, SUM(sessions) AS sessions\nFROM ask_daily\nWHERE day >= now() - interval '7 days' AND page LIKE '/docs/%'\nGROUP BY page ORDER BY pageviews DESC;", 51),
      q("Is any of them losing people?"),
      a("/docs/events is the weakest at 1.08 pageviews per session — people arrive there and leave without going deeper. Quickstart is the healthiest at 2.61.",
        ["Page", "Per session"],
        [["/docs/events", "1.08"], ["/docs/reference", "1.42"], ["/docs/installation", "1.64"], ["/docs/quickstart", "2.61"]],
        "SELECT page,\n       ROUND(SUM(pageviews)::numeric / NULLIF(SUM(sessions), 0), 2) AS per_session\nFROM ask_daily\nWHERE day >= now() - interval '7 days' AND page LIKE '/docs/%'\nGROUP BY page ORDER BY per_session ASC;", 61),
      q("Where do the people landing on /docs/events come from?"),
      a("Mostly search. 58% of sessions that start on /docs/events arrive from Google, against 31% across the site as a whole — it is answering a query rather than continuing a visit.",
        ["Referrer", "Sessions", "Share"],
        [["google.com", "174", "57.8%"], ["Direct", "71", "23.6%"], ["news.ycombinator.com", "34", "11.3%"], ["github.com", "22", "7.3%"]],
        "SELECT referrer, SUM(sessions) AS sessions\nFROM ask_daily\nWHERE day >= now() - interval '7 days' AND page = '/docs/events'\nGROUP BY referrer ORDER BY sessions DESC;", 44),
      q("And is that getting better or worse?"),
      a("Slightly better. Per-session depth on /docs/events was 0.94 four weeks ago and is 1.08 now — still the lowest page on the site, but moving the right way.",
        ["Week", "Per session"],
        [["Week of 10 Aug", "0.94"], ["Week of 17 Aug", "0.99"], ["Week of 24 Aug", "1.02"], ["Week of 31 Aug", "1.08"]],
        "SELECT date_trunc('week', day) AS week,\n       ROUND(SUM(pageviews)::numeric / NULLIF(SUM(sessions), 0), 2) AS per_session\nFROM ask_daily\nWHERE day >= now() - interval '28 days' AND page = '/docs/events'\nGROUP BY 1 ORDER BY 1;", 73),
    ],
  },
  {
    id: "t3", title: "Mobile share over time", when: "3 days ago",
    messages: [
      q("Is mobile traffic growing?"),
      a("Yes, slowly. Mobile was 29.4% of pageviews in the first month of the window and 33.6% in the last — up about four points over 90 days.",
        ["Month", "Mobile", "Views"],
        [["June", "29.4%", "18,204"], ["July", "31.1%", "27,880"], ["August", "33.6%", "36,102"]],
        "SELECT date_trunc('month', day) AS month,\n       ROUND(100.0 * SUM(pageviews) FILTER (WHERE device = 'mobile')\n             / NULLIF(SUM(pageviews), 0), 1) AS mobile_pct,\n       SUM(pageviews) AS views\nFROM ask_daily\nWHERE day >= now() - interval '90 days'\nGROUP BY 1 ORDER BY 1;", 88),
    ],
  },
];

/* One exchange: what you asked and what came back, kept together. Rendered as
   a pair rather than as a flat list of messages, so the eye can find where one
   question ends and the next begins without counting bubbles. */
function exchange(pair, i) {
  const [ask, reply] = pair;
  return `<div class="ex">
    ${ask ? `<div class="said"><p>${esc(ask.text)}</p></div>` : ""}
    ${reply ? `<div class="reply">
      <span class="who" aria-hidden="true">
        <svg viewBox="0 0 24 16" width="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"/></svg>
      </span>
      <div class="body">
        <p class="answer">${esc(reply.text)}</p>
        <div class="res"><table>
          <thead><tr>${reply.cols.map((c, j) => `<th${j ? ' class="n"' : ""}>${c}</th>`).join("")}</tr></thead>
          <tbody>${reply.rows.map((r) => `<tr>${r.map((c, j) => `<td class="${j ? "n" : "mn"}">${c}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>
        <details class="sql">
          <summary>
            <span class="caret" aria-hidden="true">›</span>
            <span>SQL</span>
            <span class="dim">${reply.rows.length} rows · ${reply.ms} ms</span>
          </summary>
          <div class="sqlbody">
            <pre>${code(reply.sql, "sql")}</pre>
            <button class="copy" data-copy="${esc(reply.sql)}">Copy</button>
          </div>
        </details>
      </div>
    </div>` : ""}
  </div>`;
}

const pairUp = (messages) => {
  const out = [];
  for (const m of messages) {
    if (m.role === "user") out.push([m, null]);
    else if (out.length && !out[out.length - 1][1]) out[out.length - 1][1] = m;
    else out.push([null, m]);
  }
  return out;
};

function askView(site) {
  const t = THREADS.find((x) => x.id === state.thread);

  return `${siteHeadHtml(site, "ask")}
  <div class="wrap">
    <aside class="threads">
      <button class="btn newthread" data-newthread>
        <span class="plus" aria-hidden="true">+</span>New chat
      </button>
      <div class="tlist">
        ${THREADS.map((x) => `<div class="titem ${x.id === state.thread ? "on" : ""}" data-thread="${x.id}" role="button" tabindex="0">
          <span class="tt">${esc(x.title)}</span>
          <span class="tw">${esc(x.when)}</span>
          <button class="tdel" data-del-thread="${x.id}" title="Delete chat" aria-label="Delete ${esc(x.title)}">
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 6h12M8 6V4.5h4V6M6.5 6l.6 9.5h5.8L13.5 6"/></svg>
          </button>
        </div>`).join("")}
        ${THREADS.length ? "" : `<p class="tempty">No chats yet.</p>`}
      </div>
    </aside>

    <div class="conv">
      <div class="convhead">
        <span class="ct">${t ? esc(t.title) : "New chat"}</span>
        ${t ? `<span class="cw">${esc(t.when)}</span>` : ""}
      </div>

      <div class="msgs" id="msgs">
        <div class="col2">
          ${t
            ? pairUp(t.messages).map(exchange).join("") +
              (state.asking ? `<div class="ex"><div class="reply"><span class="who" aria-hidden="true"></span><div class="body"><div class="thinking"><i></i><i></i><i></i></div></div></div></div>` : "")
            : `<div class="firstrun">
                <h2>Ask about ${esc(site.domain)}</h2>
                <p>Questions become SQL over your rollups. You get the rows and the query that produced them.</p>
                <div class="chips">${EXAMPLES.map((x) => `<button class="chip" data-example>${esc(x)}</button>`).join("")}</div>
              </div>`}
        </div>
      </div>

      <div class="composer">
        <div class="col2 crow">
          <div class="cfield">
            <input placeholder="Ask about this site's traffic…" id="askbox" ${state.asking ? "disabled" : ""}>
            <kbd>⏎</kbd>
          </div>
          <button class="btn primary" data-ask ${state.asking ? "disabled" : ""}>Ask</button>
        </div>
      </div>
    </div>
  </div>`;
}

function newSiteView() {
  return `
  <div class="head"><h1>Add a site</h1></div>
  <p class="lede">A name and a domain. You get the snippet on the next screen, and the first visit shows up while you are still looking at it.</p>
  <div class="two">
    <div class="card">
      <div class="ch"><span><b>The site</b><p>Both fields can be changed later.</p></span></div>
      <div class="cb">
      <label class="f"><span class="lb">Site name</span><input placeholder="Acme Docs" id="nsName"><span class="hint">What you will call it inside Pulse.</span></label>
      <label class="f"><span class="lb">Domain</span><input placeholder="example.com" id="nsDomain"><span class="hint">No https:// and no trailing slash. Events from subdomains count too.</span></label>
      <div style="display:flex;gap:9px;justify-content:flex-end"><button class="btn ghost" data-go="#/sites">Cancel</button><button class="btn primary" data-create>Create site</button></div>
    </div></div>
    <div class="card">
      <div class="ch"><span><b>What you will get</b><p>One line, before the closing &lt;/head&gt;.</p></span></div>
      <div class="cb">
        <pre>&lt;<span class="t">script</span> <span class="a">src</span>="https://api.pulse.dev/pulse.js"
        <span class="a">data-tid</span>="pk-…"&gt;&lt;/<span class="t">script</span>&gt;</pre>
        <p class="muted">No cookie banner and no consent flow: Pulse sets no cookies and stores no visitor identifiers.</p>
      </div>
    </div>
  </div>`;
}

function accountView() {
  return `
  <div class="head"><h1>Account</h1><span class="sub">you@example.com</span></div>
  <div class="stack narrowstack">
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
        <label class="f"><span class="lb">New password</span>
          <input type="password" id="pw" placeholder="New password">
          <span class="hint" id="pwrules">
            <span class="rule off" data-rule="len"><i></i>8 characters</span>
            <span class="rule off" data-rule="upper"><i></i>An uppercase letter</span>
            <span class="rule off" data-rule="digit"><i></i>A number</span>
          </span>
        </label>
        <label class="f" style="margin-bottom:10px"><span class="lb">Confirm password</span><input type="password" placeholder="Repeat it"></label>
        <div class="rowend"><button class="btn primary" data-toast="Password changed.">Change password</button></div>
      </div>
    </div>

    <div class="card">
      <div class="ch"><span><b>Sessions</b><p>Signed in on two devices. Signing out here ends this one only.</p></span></div>
      <div class="cb" style="padding-top:var(--s1)">
        <div class="kv"><span class="k">This browser · macOS</span><span class="v">active now</span></div>
        <div class="kv"><span class="k">iPhone · Safari</span><span class="v">2 days ago</span></div>
        <div class="between" style="margin-top:var(--s3)">
          <p class="muted">Ends the session in this browser.</p>
          <button class="btn" data-go="#/sites">Sign out</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* Docs had been an H1 and a card reading "Not part of this mockup" — the only
   non-site item in the rail landing on a page that says the work was not done.
   It is a plausible index now, built from the pieces Setup already owns. */
function docsView() {
  const PAGES = [
    ["Quickstart", "Create a site, paste one line, see your first event land.", "5 min"],
    ["Installation", "Script tag, npm, Next.js, Astro, React and Vite.", "8 min"],
    ["Tracking events", "trackEvent, the usePulse hook, and data-pulse-event.", "6 min"],
    ["How it works", "The hot path, the queue, the worker, and why /track answers 204.", "9 min"],
    ["SDK reference", "Every signature, every /track parameter, and the rate limits.", "reference"],
  ];
  return `
  <div class="head"><h1>Docs</h1></div>
  <p class="lede">Five pages, readable signed out. Everything here is markdown in the repo and rendered at <code>/docs</code>.</p>

  <div class="card">
    <div class="ch"><span><b>Get started</b><p>The snippet is the whole install; the rest is optional.</p></span></div>
    <div class="cb">
      <pre>&lt;<span class="t">script</span> <span class="a">src</span>="https://api.pulse.dev/pulse.js"
        <span class="a">data-tid</span>="pk-…"&gt;&lt;/<span class="t">script</span>&gt;</pre>
    </div>
  </div>

  <div class="doclist">
    ${PAGES.map(([t, d, len]) => `<a class="card docrow" href="#/docs" data-go="#/docs">
      <span class="dt">${t}</span>
      <span class="dd">${d}</span>
      <span class="dl">${len}</span>
    </a>`).join("")}
  </div>`;
}

/* Where the mockup admits what it is. Off the product screens, in one place. */
function notesView() {
  const rows = [
    ["Real", "Every figure on the analytics screens, at all three ranges, dumped from the local API against 96,627 seeded events across two sites."],
    ["Real", "The traffic generator models sessions — a visitor, a device, a referrer and a few pages in a row — with a diurnal curve, a weekend dip and growth across the window."],
    ["Not built", "Period deltas and the dashed comparison line need a previous-window query the analytics API does not have."],
    ["Not built", "Scoping the page by a ranked row is applied client-side; /analytics takes no filter parameter."],
    ["Not built", "The per-site sparkline needs a timeseries in the sites list response."],
    ["Canned", "Ask AI replies are fixed text. The threads, the folding and the SQL are the design; the answers are not generated."],
  ];
  return `
  <div class="head"><h1>About this mockup</h1></div>
  <p class="lede">A clickable design for the Pulse app. Some of it is wired to real data and some of it is drawn — this page says which, so no screen has to carry a disclaimer.</p>
  <div class="card">
    <div class="cb" style="padding-top:var(--s1);padding-bottom:var(--s2)">
      ${rows.map(([tag, text]) => `<div class="noterow"><span class="tag ${tag === "Real" ? "ok" : ""}">${tag}</span><p>${text}</p></div>`).join("")}
    </div>
  </div>`;
}

/* ── render ────────────────────────────────────────────────────────────── */
function render() {
  const r = state.route;
  let body = "";
  if (r.view === "sites") body = sitesView();
  else if (r.view === "new") body = newSiteView();
  else if (r.view === "account") body = accountView();
  else if (r.view === "docs") body = docsView();
  else if (r.view === "notes") body = notesView();
  else if (r.view === "site") {
    const site = siteById(r.site);
    if (!site) { location.hash = "#/sites"; return; }
    body = { analytics: analyticsView, setup: setupView, settings: settingsView, ask: askView }[r.tab](site);
  }

  const showDemo = r.view === "site" && r.tab === "analytics" && siteById(r.site)?.ranges;
  // Wide for data, narrow for forms and reading. It was three widths that all
  // hugged the left, so the app appeared to slide sideways between pages.
  const narrow = ["account", "new", "notes", "docs"].includes(r.view) ||
    (r.view === "site" && ["settings", "setup"].includes(r.tab));
  document.body.innerHTML = `
    <div class="app">${railHtml()}<main><div class="col${narrow ? " narrow" : ""}"${showDemo ? ' style="padding-bottom:104px"' : ""}>${body}</div></main></div>
    ${showDemo ? `<div class="demo ${state.demoOpen ? "open" : ""}">
      <button class="demotoggle" data-demoopen aria-expanded="${state.demoOpen ? "true" : "false"}">
        <span class="ddot ${state.demo}"></span><span class="dlabel">${state.demo === "live" ? "Live data" : state.demo === "loading" ? "Loading state" : "Failed state"}</span>
      </button>
      ${state.demoOpen ? `<span class="dopts">${[["live", "Live"], ["loading", "Loading"], ["failed", "Failed"]]
        .map(([k, l]) => `<button class="${state.demo === k ? "on" : ""}" data-demo="${k}">${l}</button>`).join("")}</span>` : ""}
    </div>` : ""}`;

  if (showDemo && state.demo === "live") wireChart();
  // A chat opens at the latest turn, not the first one.
  if (r.view === "site" && r.tab === "ask") {
    const box = $("#msgs");
    if (box) box.scrollTop = box.scrollHeight;
  }
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

/* Asking appends to the open thread, or opens one. The reply is canned — the
   point is the shape of the exchange, not the answer. */
const CANNED = [
  ["Direct is the largest source at 6,712 pageviews, 74% of the week. Google is second at 793.",
   ["Source", "Pageviews"], [["Direct", "6,712"], ["google.com", "793"], ["news.ycombinator.com", "535"]],
   "SELECT referrer, SUM(pageviews) AS pageviews\nFROM ask_daily\nWHERE day >= now() - interval '7 days'\nGROUP BY referrer ORDER BY pageviews DESC LIMIT 3;", 39],
  ["Mobile is 33.6% of pageviews this week — 3,045 of 9,062. Desktop is 57.1% and tablet the rest.",
   ["Device", "Pageviews", "Share"], [["desktop", "5,174", "57.1%"], ["mobile", "3,045", "33.6%"], ["tablet", "843", "9.3%"]],
   "SELECT device, SUM(pageviews) AS pageviews\nFROM ask_daily\nWHERE day >= now() - interval '7 days'\nGROUP BY device ORDER BY pageviews DESC;", 33],
];
let canned = 0;

function ask(text) {
  const question = (text ?? "").trim();
  if (!question || state.asking) return;

  let t = THREADS.find((x) => x.id === state.thread);
  if (!t) {
    t = { id: "t" + Date.now(), title: question.replace(/\?$/, "").slice(0, 42), when: "just now", messages: [] };
    THREADS.unshift(t);
    state.thread = t.id;
  }
  t.messages.push(q(question));
  state.asking = true;
  render();
  scrollChat();

  setTimeout(() => {
    const [text2, cols, rows, sql, ms] = CANNED[canned++ % CANNED.length];
    t.messages.push(a(text2, cols, rows, sql, ms));
    state.asking = false;
    render();
    scrollChat();
  }, 1300);
}

function scrollChat() {
  const box = $("#msgs");
  if (box) box.scrollTop = box.scrollHeight;
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
  if (next.tab !== state.route.tab || next.site !== state.route.site) { state.dirty = false; state.confirmText = ""; }
  state.route = next;
  state.railMenu = false;
  scrollTo(0, 0);
  render();
});

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-railmenu]")) { state.railMenu = !state.railMenu; render(); return; }

  const go = e.target.closest("[data-go]");
  if (go) { e.preventDefault(); state.railMenu = false; location.hash = go.dataset.go; return; }

  const range = e.target.closest("[data-range]");
  if (range) { state.range = range.dataset.range; state.filter = null; render(); return; }

  const inst = e.target.closest("[data-install]");
  if (inst) { state.install = inst.dataset.install; render(); return; }

  const tech = e.target.closest("[data-tech]");
  if (tech) { state.tech = tech.dataset.tech; render(); return; }

  if (e.target.closest("[data-demoopen]")) { state.demoOpen = !state.demoOpen; render(); return; }

  const demo = e.target.closest("[data-demo]");
  if (demo) { state.demo = demo.dataset.demo; state.demoOpen = false; render(); return; }

  const row = e.target.closest("[data-filter]");
  if (row) {
    const { filter, label, share, pct } = row.dataset;
    const same = state.filter?.kind === filter && state.filter?.label === label;
    state.filter = same ? null : { kind: filter, label, factor: Number(pct) / 100, pct };
    render();
    return;
  }
  if (e.target.closest("[data-clear-filter]")) { state.filter = null; render(); return; }

  // The delete button lives inside the row, so closest() matches both. The
  // row defers; the delete handler below claims it.
  const thread = e.target.closest("[data-thread]");
  if (thread && !e.target.closest("[data-del-thread]")) {
    state.thread = thread.dataset.thread;
    render();
    return;
  }

  if (e.target.closest("[data-newthread]")) { state.thread = null; render(); return; }

  const delThread = e.target.closest("[data-del-thread]");
  if (delThread) {
    e.stopPropagation();
    const id = delThread.dataset.delThread;
    THREADS = THREADS.filter((x) => x.id !== id);
    if (state.thread === id) state.thread = THREADS[0]?.id ?? null;
    render();
    return;
  }
  const ex = e.target.closest("[data-example]");
  if (ex) { ask(ex.textContent); return; }

  if (e.target.closest("[data-ask]")) { ask($("#askbox")?.value); return; }

  const copy = e.target.closest("[data-copy]");
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.copy);
    copy.textContent = "Copied"; copy.classList.add("done");
    setTimeout(() => { copy.textContent = "Copy"; copy.classList.remove("done"); }, 1600);
    return;
  }

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
  if (e.key === "Enter" && e.target.id === "askbox") { e.preventDefault(); ask(e.target.value); return; }
  if (e.key !== "Enter" && e.key !== " ") return;
  const hit = e.target.closest("[data-range],[data-tech],[data-demo],[data-install],[data-thread],[data-filter]");
  if (hit) { e.preventDefault(); hit.click(); }
});

document.addEventListener("input", (e) => {
  // Save stays disabled until something actually changed, and the domain
  // field says what changing it costs while you are still editing it.
  if (e.target.matches("[data-dirty]")) {
    state.dirty = true;
    $("#save")?.removeAttribute("disabled");
    $("#dirtyhint")?.removeAttribute("hidden");
    if (e.target.matches("[data-domain]")) $("#domainwarn")?.toggleAttribute("hidden", !e.target.value.trim());
    return;
  }
  // Deleting is irreversible, so it asks for the domain rather than a click.
  if (e.target.matches("[data-confirm-input]")) {
    state.confirmText = e.target.value;
    const site = siteById(state.route.site);
    const armed = state.confirmText.trim().toLowerCase() === site.domain.toLowerCase();
    e.target.closest(".confirmrow").querySelector(".btn").toggleAttribute("disabled", !armed);
    return;
  }

  // Password rules resolve as you type rather than failing after submit.
  if (e.target.id !== "pw") return;
  const v = e.target.value;
  const ok = { len: v.length >= 8, upper: /[A-Z]/.test(v), digit: /[0-9]/.test(v) };
  for (const [k, pass] of Object.entries(ok)) {
    $(`[data-rule="${k}"]`)?.classList.toggle("off", !pass);
  }
});

state.route = parseHash();
render();
