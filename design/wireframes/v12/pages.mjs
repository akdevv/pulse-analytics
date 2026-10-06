import { shell, rail, siteHead, logo } from "./chrome.mjs";

const F = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toLocaleString("en-US");

/* ── The merged analytics screen ────────────────────────────
   B's measured column and card treatment, A's instrument density:
   sparkline and delta per metric, tight rows, five breakdowns. */
const analytics = (c) => shell("Analytics", `
.mrow{display:grid;grid-template-columns:repeat(4,1fr)}
.m{padding:16px 18px;border-right:1px solid var(--seam)}
.m:last-child{border-right:0}
.mtop{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-height:26px}
.m .v{font-size:31px;display:block;margin-top:11px}
.m .d{display:block;margin-top:8px;font-size:11.5px;font-weight:500}
.chartcard{padding:18px 20px 12px;margin-top:16px}
.chh{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.chh b{font-size:14px;font-weight:500}
.leg{display:flex;gap:14px}
.leg i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:6px}
.plotwrap{position:relative;padding-left:42px;height:300px}
/* The readout under the pointer. A trend line you cannot interrogate is a
   picture of data rather than a reading of it. */
.cursor{position:absolute;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--rule) 8%,var(--rule) 92%,transparent);pointer-events:none}
.dot{position:absolute;width:9px;height:9px;border-radius:50%;background:var(--accent);border:2px solid var(--panel);translate:-50% -50%;box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 22%,transparent)}
.dot.ghost{width:6px;height:6px;background:var(--ink);opacity:.3;box-shadow:none;border-width:1px}
.readout{position:absolute;translate:14px -50%;background:var(--raised);border:1px solid var(--seam);border-radius:9px;padding:9px 11px;white-space:nowrap;box-shadow:0 12px 28px -12px rgba(0,0,0,.85);pointer-events:none}
.readout .when{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--t5);margin-bottom:7px}
.readout .r{display:flex;align-items:center;gap:8px;font-size:12.5px;font-variant-numeric:tabular-nums;margin-top:3px}
.readout .r i{width:6px;height:6px;border-radius:50%;flex:none}
.readout .r span{color:var(--t5);flex:1}
.readout .r b{font-weight:500;color:var(--t2)}
.plot{width:100%;height:100%;display:block}
.yaxis{position:absolute;inset:0 auto 0 0;width:36px}
.yaxis span{position:absolute;right:0;translate:0 -50%;font-size:11px;color:var(--t5);font-variant-numeric:tabular-nums}
.xaxis{position:relative;height:18px;margin-left:42px;margin-top:9px}
.xaxis span{position:absolute;translate:-50% 0;font-size:11px;color:var(--t5)}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.p{padding:16px 18px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.ph b{font-size:14px;font-weight:500}
.mini{display:flex;gap:2px}
.mini span{padding:3px 8px;border-radius:5px;font-size:11px;font-weight:500;color:var(--t5)}
.mini span.on{background:var(--raised);color:var(--ink)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead td{padding-bottom:7px;border-bottom:1px solid var(--seam)}
tbody tr{cursor:pointer}
tbody tr:hover td{background:color-mix(in oklab,var(--ink) 4%,transparent)}
tbody tr:hover td:first-child{border-radius:4px 0 0 4px}
tbody tr:hover td:last-child{border-radius:0 4px 4px 0}
tbody td{padding:8px 0;border-bottom:1px solid var(--rule);font-size:13px;transition:background .12s var(--ease)}
tbody tr:last-child td{border-bottom:0}
td.l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t2)}
td.l.mn{font-family:var(--mono);font-size:12px}
td.s{width:88px;padding-left:14px}
td.n{width:58px;text-align:right;font-variant-numeric:tabular-nums;color:var(--t3);font-size:12.5px}
.track{display:block;height:4px;border-radius:2px;background:var(--rule);overflow:hidden}
.track i{display:block;height:100%;background:var(--accent);opacity:.8;border-radius:2px}
`, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Analytics")}
  <div class="card mrow">
    ${[
      ["Pageviews", F(c.O.totalPageviews), c.SPARK_PV, `<span class="d up">↗ 12.4%</span>`],
      ["Sessions", F(c.O.totalSessions), c.SPARK_SE, `<span class="d up">↗ 8.1%</span>`],
      ["Visitors", F(c.O.totalVisitors), c.SPARK_VI, `<span class="d dn">↘ 2.0%</span>`],
    ].map(([l, v, sp, d]) => `<div class="m"><div class="mtop"><span class="meta">${l}</span><svg width="86" height="24" fill="none"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".7" stroke-width="1.3"/></svg></div><span class="fig v">${v}</span>${d}</div>`).join("")}
    <div class="m"><div class="mtop"><span class="meta">Active now</span></div><span class="fig v" style="color:var(--powder)">3</span><span class="d" style="color:var(--t5)">last 5 min</span></div>
  </div>

  <div class="card chartcard">
    <div class="chh"><b>Traffic</b><div class="leg"><span class="meta"><i style="background:var(--accent)"></i>Pageviews</span><span class="meta"><i style="background:var(--powder)"></i>Sessions</span><span class="meta"><i style="background:var(--t5)"></i>Previous week</span></div></div>
    <div class="plotwrap">
      <div class="yaxis">${c.yTicks.map((t) => `<span style="top:${t.y}%">${t.label}</span>`).join("")}</div>
      ${c.chartSvg}
      <div class="cursor" style="left:calc(42px + ${c.hover.x}% - ${c.hover.x / 100} * 42px)"></div>
      <span class="dot ghost" style="left:calc(42px + ${c.hover.x}% - ${c.hover.x / 100} * 42px);top:${c.hover.yPrev}%"></span>
      <span class="dot" style="left:calc(42px + ${c.hover.x}% - ${c.hover.x / 100} * 42px);top:${c.hover.y}%"></span>
      <div class="readout" style="right:14px;top:${c.hover.y}%">
        <div class="when">${c.hover.stamp}</div>
        <div class="r"><i style="background:var(--accent)"></i><span>Pageviews</span><b>${c.hover.pv}</b></div>
        <div class="r"><i style="background:var(--powder)"></i><span>Sessions</span><b>${c.hover.se}</b></div>
        <div class="r"><i style="background:var(--t5)"></i><span>Previous week</span><b>${c.hover.prev}</b></div>
      </div>
    </div>
    <div class="xaxis">${c.dayTicks.map((t) => `<span style="left:${t.x}%">${t.label}</span>`).join("")}</div>
  </div>

  <div class="duo">
    ${[
      ["Top pages", "Page", "Views", c.PAGES.slice(0, 7), true, ""],
      ["Sources", "Source", "Views", c.REFS.slice(0, 7), false, ""],
      ["Countries", "Country", "Views", c.GEO.slice(0, 6), false, ""],
      ["Technology", "Name", "Views", c.DEV, false, `<div class="mini"><span class="on">Device</span><span>Browser</span><span>OS</span></div>`],
    ].map(([t, lh, vh, rs, mn, extra]) => `<div class="card p">
      <div class="ph"><b>${t}</b>${extra}</div>
      <table><thead><tr><td class="meta">${lh}</td><td class="s"></td><td class="meta n">${vh}</td></tr></thead>
      <tbody>${rs.map((r) => `<tr><td class="l${mn ? " mn" : ""}">${r.label}</td><td class="s"><span class="track"><i style="width:${(r.share * 100).toFixed(1)}%"></i></span></td><td class="n">${F(r.value)}</td></tr>`).join("")}</tbody></table>
    </div>`).join("")}
  </div>

  <div class="card p" style="margin-top:16px">
    <div class="ph"><b>Custom events</b><span class="meta">Count · Visitors</span></div>
    <table><thead><tr><td class="meta">Event</td><td class="s"></td><td class="meta n">Count</td></tr></thead>
    <tbody>${c.EVT.map((r) => `<tr><td class="l mn">${r.label}</td><td class="s"><span class="track"><i style="width:${(r.share * 100).toFixed(1)}%"></i></span></td><td class="n">${F(r.value)}</td></tr>`).join("")}</tbody></table>
  </div>
</div></main></div>`);

/* ── Sites list ─────────────────────────────────────────────
   A site card that answers "is this one healthy and busy", with a
   week of shape on it. The old card spent its space on a tracking
   id, which is a setup detail, not a reason to look. */
const sites = (c) => shell("Sites", `
.top{display:flex;align-items:center;gap:14px;margin-bottom:22px}
.top h1{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:25px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(316px,1fr));gap:16px}
.sc{padding:17px 18px;display:flex;flex-direction:column;gap:15px;transition:border-color .15s var(--ease)}
.sc:hover{border-color:color-mix(in oklab,var(--accent) 45%,transparent)}
.sct{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.sct b{font-family:var(--display);font-weight:600;letter-spacing:-0.025em;font-size:17px;display:block}
.sct .dm{font-family:var(--mono);font-size:11.5px;color:var(--t5);margin-top:5px;display:block}
.live{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--success)}
.live i{width:5px;height:5px;border-radius:50%;background:currentColor}
.paused{color:var(--t5)}
.nums{display:flex;gap:22px}
.nums .n b{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:19px;font-variant-numeric:tabular-nums;display:block}
.nums .n span{font-size:11px;color:var(--t5);margin-top:3px;display:block}
.spark{margin-top:auto;opacity:.85}
.empty{padding:34px 30px}
.empty h2{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:19px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:26px}
.steps li{list-style:none;display:flex;gap:11px}
.steps .n{width:23px;height:23px;flex:none;border:1px solid var(--seam);border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--t5)}
.steps b{display:block;font-size:13px;font-weight:500;margin-bottom:4px}
.steps p{font-size:12.5px;line-height:1.55;color:var(--t5)}
`, `<div class="app">${rail("sites")}<main><div class="col">
  <div class="top"><h1>Sites</h1><button class="btn primary" style="margin-left:auto">＋ Add site</button></div>
  <div class="grid">
    ${[["Acme Docs", "example.com", c.O.totalPageviews, c.O.totalVisitors, true, c.SPARK_PV],
       ["Marketing site", "acme.dev", 2184, 412, true, c.SPARK_SE],
       ["Staging", "staging.acme.dev", 0, 0, false, null]]
      .map(([n, d, pv, vi, live, sp]) => `<a class="card sc">
        <div class="sct"><span><b>${n}</b><span class="dm">${d}</span></span>
          <span class="live ${live ? "" : "paused"}"><i></i>${live ? "Live" : "Paused"}</span></div>
        <div class="nums"><span class="n"><b>${F(pv)}</b><span>pageviews</span></span><span class="n"><b>${F(vi)}</b><span>visitors</span></span></div>
        ${sp ? `<svg class="spark" width="100%" height="34" viewBox="0 0 92 26" preserveAspectRatio="none" fill="none"><path d="${sp}" stroke="var(--accent)" stroke-opacity=".55" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`
             : `<div class="spark" style="height:34px;display:grid;place-items:center;font-size:12px;color:var(--t5)">no events yet</div>`}
      </a>`).join("")}
  </div>

  <div class="card empty" style="margin-top:30px">
    <h2>Track your first site</h2>
    <p class="lede">Give us a domain and you get a one-line snippet back. Events land as they happen — no nightly batch, no cookie banner.</p>
    <div style="display:flex;gap:9px;margin-top:16px"><button class="btn primary">Add a site</button><button class="btn">Read the docs</button></div>
    <ol class="steps">
      ${[["Add the site", "A name and a domain. Two fields, nothing else to decide."],
         ["Paste one line", "A script tag in your &lt;head&gt;. Any stack, no build step."],
         ["Watch it land", "The first visit shows up live while you are still on the page."]]
        .map(([t, b], i) => `<li><span class="n">${i + 1}</span><span><b>${t}</b><p>${b}</p></span></li>`).join("")}
    </ol>
  </div>
</div></main></div>`);


/* ── Setup ──────────────────────────────────────────────────
   The page you land on the moment a site exists, so it leads with
   the one thing to do and says plainly whether it worked. */
const setup = (c) => shell("Setup", `
.wait{display:flex;align-items:center;gap:13px;padding:15px 18px;border:1px solid color-mix(in oklab,var(--powder) 24%,transparent);background:color-mix(in oklab,var(--powder) 7%,transparent);border-radius:10px;margin-bottom:18px}
.wait .pip{position:relative;display:flex;width:8px;height:8px;flex:none}
.wait .pip i{position:absolute;inset:0;border-radius:50%;background:var(--powder)}
.wait .pip i:first-child{animation:ping 1.8s var(--ease) infinite;opacity:.5}
@keyframes ping{0%{transform:scale(1);opacity:.5}75%,100%{transform:scale(2.6);opacity:0}}
.wait b{font-size:13.5px;font-weight:500;display:block}
.wait p{font-size:12.5px;color:var(--t5);margin-top:3px}
.copy{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--seam);background:var(--bg);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--t4);cursor:pointer}
.stack{display:flex;flex-direction:column;gap:16px}
`, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Setup")}
  <div class="wait">
    <span class="pip"><i></i><i></i></span>
    <span><b>Waiting for your first event</b><p>This page turns into the dashboard the moment one arrives. Checking every few seconds.</p></span>
  </div>
  <div class="stack">
    <div class="card">
      <div class="ch"><span><b>Tracking snippet</b><p>Paste this once, inside the &lt;head&gt; of every page you want counted.</p></span><button class="copy">Copy</button></div>
      <div class="cb"><pre>&lt;<span class="t">script</span> <span class="a">src</span>="https://api.pulse.dev/pulse.js"
        <span class="a">data-tid</span>="pk-kdR4zKJf-6h6CBZZc2YUQMsk8tyH_oVE"
        <span class="a">data-host</span>="https://api.pulse.dev"&gt;&lt;/<span class="t">script</span>&gt;</pre></div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Send a test event</b><p>Fires one pageview from your terminal, so you can tell a broken snippet from an empty site.</p></span><button class="copy">Copy</button></div>
      <div class="cb"><pre><span class="t">curl</span> -X POST "https://api.pulse.dev/api/v1/track" -G \\
  --data-urlencode <span class="a">"tid=pk-kdR4zKJf-6h6CBZZc2YUQMsk8tyH_oVE"</span> \\
  --data-urlencode <span class="a">"t=PAGEVIEW"</span> \\
  --data-urlencode <span class="a">"dl=https://example.com/"</span></pre></div>
    </div>
    <div class="card">
      <div class="ch"><b>Details</b></div>
      <div class="cb" style="padding-top:4px;padding-bottom:6px">
        ${[["Tracking ID", "pk-kdR4zKJf-6h6CBZZc2YUQMsk8tyH_oVE"], ["Domain", "example.com"], ["Plan", "Free — 100k events / month"], ["Created", "29 Aug 2026"]]
          .map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`).join("")}
      </div>
    </div>
  </div>
</div></main></div>`);

/* ── Settings ───────────────────────────────────────────────
   Two ordinary cards and one that is not ordinary, marked as such
   by its own edge rather than by a red heading alone. */
const settings = (c) => shell("Settings", `
.stack{display:flex;flex-direction:column;gap:16px;max-width:640px}
.danger{border-color:color-mix(in oklab,oklch(0.63 0.21 25) 30%,transparent)}
.danger .ch{border-bottom-color:color-mix(in oklab,oklch(0.63 0.21 25) 22%,transparent)}
.danger .ch b{color:oklch(0.72 0.17 25)}
.rowend{display:flex;justify-content:flex-end;gap:9px;margin-top:4px}
.between{display:flex;align-items:center;justify-content:space-between;gap:18px}
.between p{font-size:12.5px;line-height:1.55;color:var(--t5);margin-top:4px}
.between b{font-size:13.5px;font-weight:500}
.key{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--bg);border:1px solid var(--seam);border-radius:8px;padding:10px 12px;font-family:var(--mono);font-size:11.5px;color:var(--t3);margin-bottom:14px}
`, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Settings")}
  <div class="stack">
    <div class="card">
      <div class="ch"><span><b>General</b><p>The name is yours alone; the domain decides which events are kept.</p></span></div>
      <div class="cb">
        <label class="f"><span class="lb">Site name</span><input value="Acme Docs"></label>
        <label class="f" style="margin-bottom:10px"><span class="lb">Domain</span><input value="example.com"><span class="hint">No https:// and no trailing slash. Subdomains of this are counted too.</span></label>
        <div class="rowend"><button class="btn primary">Save changes</button></div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Tracking key</b><p>Regenerate if it leaked. The old snippet stops reporting the moment you do.</p></span></div>
      <div class="cb">
        <div class="key"><span>pk-kdR4zKJf-6h6CBZZc2YUQMsk8tyH_oVE</span><span class="meta">Active</span></div>
        <div class="rowend"><button class="btn">Regenerate key</button></div>
      </div>
    </div>
    <div class="card danger">
      <div class="ch"><span><b>Delete this site</b><p>Removes the site and every event recorded for it. There is no undo.</p></span></div>
      <div class="cb"><div class="between"><span><b>example.com</b><p>9,041 events across 7 days would go with it.</p></span><button class="btn danger">Delete site</button></div></div>
    </div>
  </div>
</div></main></div>`);

/* ── Ask AI ─────────────────────────────────────────────────
   A thread, and under each answer the SQL it ran. Showing the query
   is the product's whole claim, so it is part of the answer rather
   than hidden behind a disclosure. */
const ask = (c) => shell("Ask AI", `
.wrap{display:grid;grid-template-columns:212px 1fr;gap:16px;align-items:start}
.threads{padding:12px}
.threads .nt{width:100%;justify-content:center;margin-bottom:10px}
.threads a{display:block;padding:8px 10px;border-radius:6px;font-size:12.5px;color:var(--t4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.threads a.on{background:var(--raised);color:var(--ink)}
.conv{display:flex;flex-direction:column;min-height:560px}
.msgs{padding:20px;display:flex;flex-direction:column;gap:24px;flex:1}
.q{font-size:16px;font-weight:500;letter-spacing:-0.015em}
.a p{font-size:14px;line-height:1.6;color:var(--t2)}
.sql{margin-top:12px}
.sqlhead{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.res{margin-top:12px;border:1px solid var(--seam);border-radius:8px;overflow:hidden}
.res table{width:100%;border-collapse:collapse}
.res td,.res th{padding:8px 12px;font-size:12.5px;text-align:left;border-bottom:1px solid var(--rule)}
.res th{background:var(--bg);font-weight:500;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--t5)}
.res tr:last-child td{border-bottom:0}
.res td.n{text-align:right;font-variant-numeric:tabular-nums}
.res td.mn{font-family:var(--mono);font-size:11.5px}
.composer{border-top:1px solid var(--seam);padding:14px 18px;display:flex;gap:10px;align-items:center}
.composer input{flex:1;background:var(--bg);border:1px solid var(--seam);border-radius:8px;padding:10px 12px;color:var(--ink);font-family:inherit;font-size:13.5px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
.chip{border:1px solid var(--seam);border-radius:20px;padding:6px 12px;font-size:12.5px;color:var(--t4);cursor:pointer}
`, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Ask AI")}
  <div class="wrap">
    <div class="card threads">
      <button class="btn primary nt">New question</button>
      <a class="on">Busiest day last week</a>
      <a>Which docs page loses people</a>
      <a>Mobile share over time</a>
      <a>Where is Germany traffic landing</a>
    </div>
    <div class="card conv">
      <div class="ch"><span><b>Busiest day last week</b><p>Answers are SQL over the hourly and daily rollups — never raw events, never visitor identifiers.</p></span></div>
      <div class="msgs">
        <div><p class="q">Which day last week had the most pageviews?</p></div>
        <div class="a">
          <p>Tuesday 2 September, with 1,486 pageviews — about 21% above the week's daily average of 1,229.</p>
          <div class="res"><table>
            <thead><tr><th>Day</th><th style="text-align:right">Pageviews</th><th style="text-align:right">Sessions</th></tr></thead>
            <tbody>
              <tr><td class="mn">2026-09-02</td><td class="n">1,486</td><td class="n">602</td></tr>
              <tr><td class="mn">2026-09-04</td><td class="n">1,402</td><td class="n">571</td></tr>
              <tr><td class="mn">2026-08-31</td><td class="n">1,338</td><td class="n">544</td></tr>
            </tbody></table></div>
          <div class="sql">
            <div class="sqlhead"><span class="meta">Query it ran</span><span style="flex:1;height:1px;background:var(--seam)"></span><span class="meta">42 ms</span></div>
            <pre><span class="t">SELECT</span> day, <span class="t">SUM</span>(pageviews) <span class="t">AS</span> pageviews, <span class="t">SUM</span>(sessions) <span class="t">AS</span> sessions
<span class="t">FROM</span> ask_daily
<span class="t">WHERE</span> day &gt;= <span class="a">now()</span> - <span class="a">interval '7 days'</span>
<span class="t">GROUP BY</span> day <span class="t">ORDER BY</span> pageviews <span class="t">DESC</span> <span class="t">LIMIT</span> 3;</pre>
          </div>
        </div>
      </div>
      <div class="composer"><input placeholder="Ask about this site's traffic…"><button class="btn primary">Ask</button></div>
    </div>
  </div>
</div></main></div>`);

/* ── Add site ───────────────────────────────────────────────
   Two fields, and the snippet they are about to get shown beside
   them, so the ask has its payoff attached. */
const addSite = (c) => shell("Add site", `
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.preview pre{font-size:11px}
.muted{font-size:12.5px;line-height:1.55;color:var(--t5)}
`, `<div class="app">${rail("sites")}<main><div class="col">
  <div class="head"><h1>Add a site</h1></div>
  <p class="lede">A name and a domain. You get the snippet on the next screen, and the first visit shows up while you are still looking at it.</p>
  <div class="two" style="margin-top:24px">
    <div class="card"><div class="cb">
      <label class="f"><span class="lb">Site name</span><input placeholder="Acme Docs"><span class="hint">What you will call it inside Pulse.</span></label>
      <label class="f"><span class="lb">Domain</span><input placeholder="example.com"><span class="hint">No https:// and no trailing slash. Events from subdomains count too.</span></label>
      <div style="display:flex;gap:9px;justify-content:flex-end"><button class="btn ghost">Cancel</button><button class="btn primary">Create site</button></div>
    </div></div>
    <div class="card preview">
      <div class="ch"><span><b>What you will get</b><p>One line, before the closing &lt;/head&gt;.</p></span></div>
      <div class="cb">
        <pre>&lt;<span class="t">script</span> <span class="a">src</span>="https://api.pulse.dev/pulse.js"
        <span class="a">data-tid</span>="pk-…"&gt;&lt;/<span class="t">script</span>&gt;</pre>
        <p class="muted" style="margin-top:12px">No cookie banner, no consent flow: Pulse sets no cookies and stores no visitor identifiers.</p>
      </div>
    </div>
  </div>
</div></main></div>`);

/* ── Account ────────────────────────────────────────────────*/
const account = (c) => shell("Account", `
.stack{display:flex;flex-direction:column;gap:16px;max-width:600px}
.rowend{display:flex;justify-content:flex-end;margin-top:4px}
.rule{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--t5);margin-bottom:6px}
.rule i{width:5px;height:5px;border-radius:50%;background:var(--success);flex:none}
.rule.off i{background:color-mix(in oklab,var(--ink) 24%,transparent)}
`, `<div class="app">${rail("account")}<main><div class="col">
  <div class="head"><h1>Account</h1><span class="sub">you@example.com</span></div>
  <div class="stack" style="margin-top:24px">
    <div class="card">
      <div class="ch"><b>Profile</b></div>
      <div class="cb">
        <label class="f"><span class="lb">Name</span><input value="Ashish"></label>
        <label class="f" style="margin-bottom:10px"><span class="lb">Email</span><input value="you@example.com"></label>
        <div class="rowend"><button class="btn primary">Save changes</button></div>
      </div>
    </div>
    <div class="card">
      <div class="ch"><span><b>Password</b><p>Changing it signs out every other device.</p></span></div>
      <div class="cb">
        <label class="f"><span class="lb">New password</span><input type="password" value="············"></label>
        <div style="margin:-6px 0 14px">
          <div class="rule"><i></i>At least 8 characters</div>
          <div class="rule"><i></i>One uppercase letter</div>
          <div class="rule off"><i></i>One number</div>
        </div>
        <label class="f" style="margin-bottom:10px"><span class="lb">Confirm password</span><input type="password" placeholder="Repeat it"></label>
        <div class="rowend"><button class="btn primary">Change password</button></div>
      </div>
    </div>
  </div>
</div></main></div>`);


/* ── States ─────────────────────────────────────────────────
   Drawn, not left to the implementation. The old app had eight
   panels each saying "no data" for a site that had simply never
   reported, and a failed request that rendered as an empty list. */
const STATE_CSS = `
.sk{background:linear-gradient(90deg,var(--rule) 25%,color-mix(in oklab,var(--ink) 13%,transparent) 50%,var(--rule) 75%);background-size:200% 100%;animation:sh 1.4s linear infinite;border-radius:5px}
@keyframes sh{to{background-position:-200% 0}}
.mrow{display:grid;grid-template-columns:repeat(4,1fr)}
.m{padding:16px 18px;border-right:1px solid var(--seam)}
.m:last-child{border-right:0}
.chartcard{padding:18px 20px;margin-top:16px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.p{padding:16px 18px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.ph b{font-size:14px;font-weight:500}
.mid{display:grid;place-items:center;text-align:center;padding:52px 24px}
.mid h2{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:19px;margin-bottom:8px}
.mid p{font-size:13.5px;line-height:1.6;color:var(--t5);max-width:52ch}
.checks{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:30px;text-align:left;width:100%}
.checks li{list-style:none;display:flex;gap:11px}
.checks .q{width:23px;height:23px;flex:none;border:1px solid var(--seam);border-radius:50%;display:grid;place-items:center;font-size:11px;color:var(--t5)}
.checks b{display:block;font-size:13px;font-weight:500;margin-bottom:4px}
.checks p{font-size:12.5px;line-height:1.55;color:var(--t5)}
code{font-family:var(--mono);font-size:11.5px;background:var(--bg);border:1px solid var(--seam);border-radius:4px;padding:1px 5px}
.err{border-color:color-mix(in oklab,oklch(0.63 0.21 25) 32%,transparent)}
.err .ic{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:1px solid color-mix(in oklab,oklch(0.63 0.21 25) 40%,transparent);color:oklch(0.74 0.17 25);margin-bottom:14px;font-size:17px}
.act{display:flex;gap:9px;margin-top:18px}
`;

const loading = (c) => shell("Analytics — loading", STATE_CSS, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Analytics", { ago: "12s" })}
  <div class="card mrow" aria-busy="true">
    ${["Pageviews", "Sessions", "Visitors", "Active now"].map((l) => `<div class="m"><span class="meta">${l}</span><div class="sk" style="height:31px;width:96px;margin-top:12px"></div><div class="sk" style="height:11px;width:52px;margin-top:10px"></div></div>`).join("")}
  </div>
  <div class="card chartcard" aria-busy="true">
    <div class="ph"><b>Traffic</b></div>
    <div class="sk" style="height:300px"></div>
  </div>
  <div class="duo">
    ${["Top pages", "Sources", "Countries", "Technology"].map((t) => `<div class="card p" aria-busy="true"><div class="ph"><b>${t}</b></div>
      ${Array.from({ length: 6 }).map((_, i) => `<div style="display:flex;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--rule)"><div class="sk" style="height:11px;flex:1;max-width:${[70, 52, 61, 44, 58, 38][i]}%"></div><div class="sk" style="height:4px;width:88px"></div><div class="sk" style="height:11px;width:34px"></div></div>`).join("")}
    </div>`).join("")}
  </div>
</div></main></div>`);

const empty = (c) => shell("Analytics — nothing yet", STATE_CSS, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  <div class="head"><h1>Acme Docs</h1><span class="sub">example.com</span>
    <span class="st"><span class="ago">no events yet</span><span class="live" style="color:var(--t5)"><i style="background:currentColor"></i>Listening</span></span></div>
  <div class="bar"><div class="tabs">${["Analytics", "Ask AI", "Setup", "Settings"].map((t) => `<a class="${t === "Analytics" ? "on" : ""}">${t}</a>`).join("")}</div></div>
  <div class="card">
    <div class="mid">
      <h2>Nothing has arrived yet</h2>
      <p>The snippet has not reported a single event from this domain. A chart of zeros would not tell you anything, so here is what usually explains it.</p>
      <div class="act"><button class="btn primary">Open setup</button><button class="btn">Installation guide</button></div>
      <ol class="checks">
        <li><span class="q">?</span><span><b>Is the snippet on the page?</b><p>View source on the live site and search for <code>pulse.js</code>. An ad blocker can stop it loading too.</p></span></li>
        <li><span class="q">?</span><span><b>Does the hostname match?</b><p>Events are kept only from <code>example.com</code> or a subdomain of it, so a page served from localhost is dropped.</p></span></li>
        <li><span class="q">?</span><span><b>Did it look like it worked?</b><p>It would either way. <code>/track</code> answers 204 on a rejected event exactly as on an accepted one.</p></span></li>
      </ol>
    </div>
  </div>
</div></main></div>`);

const failed = (c) => shell("Analytics — failed", STATE_CSS, `<div class="app">${rail("sites", "Acme Docs")}<main><div class="col">
  ${siteHead("Analytics", { ago: "12s" })}
  <div class="card err">
    <div class="mid">
      <div class="ic">!</div>
      <h2>Could not load this range</h2>
      <p>The analytics API answered <code>503 Service Unavailable</code>. Your events are still being collected — this is the read path, not the write path.</p>
      <div class="act"><button class="btn primary">Try again</button><button class="btn">Check status</button></div>
    </div>
  </div>
</div></main></div>`);

export const pages = { "d-analytics": analytics, "e-sites": sites, "f-setup": setup, "g-settings": settings, "h-ask": ask, "i-add-site": addSite, "j-account": account, "k-loading": loading, "l-empty": empty, "m-failed": failed };
