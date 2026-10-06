/* The three directions. Same data, same palette, same type — different
   compositions, so the choice between them is a choice about layout and
   density rather than about colour. */

const shell = (title, css, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css">
<style>${css}</style></head><body>${body}</body></html>`;

const logo = `<svg viewBox="0 0 24 16" width="21" fill="none" stroke="var(--accent)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"/></svg>`;

const chart = (c, h, showGrid = true) => `
<svg class="plot" viewBox="0 0 ${c.W} ${c.H}" preserveAspectRatio="none" style="height:${h}px">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.17"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${showGrid ? c.yTicks.map((t) => `<line x1="0" x2="${c.W}" y1="${(t.y / 100) * c.H}" y2="${(t.y / 100) * c.H}" stroke="var(--ink)" stroke-opacity="0.055" vector-effect="non-scaling-stroke"/>`).join("") : ""}
  <path d="${c.AREA}" fill="url(#g)"/>
  <path d="${c.LINE2}" fill="none" stroke="var(--powder)" stroke-opacity="0.5" stroke-width="1.1" vector-effect="non-scaling-stroke"/>
  <path d="${c.LINE}" fill="none" stroke="var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
</svg>`;

const axis = (c) => `<div class="xaxis">${c.dayTicks.map((t) => `<span style="left:${t.x}%">${t.label}</span>`).join("")}</div>`;
const yaxis = (c) => `<div class="yaxis">${c.yTicks.map((t) => `<span style="top:${t.y}%">${t.label}</span>`).join("")}</div>`;

const rowList = (items, opts = {}) => items.map((r) => `
  <div class="row"${opts.mono ? ' data-mono' : ""} style="--share:${r.share}">
    <span class="rl">${r.label}</span>
    <span class="rv"><i class="pct">${r.pct}%</i><b>${opts.fmt(r.value)}</b></span>
  </div>`).join("");

export function comps(c) {
  const F = c.compact;

  /* ══ A — Instrument ════════════════════════════════════════
     One screen, nothing scrolls, everything butts together in a
     hairline grid. Density is the argument: it should read as a
     panel of gauges, not a page of cards. */
  const A = shell("A — Instrument", `
  .app{display:grid;grid-template-columns:196px 1fr;height:100vh;overflow:hidden}
  .rail{background:var(--bg);border-right:1px solid var(--seam);display:flex;flex-direction:column;padding:14px 10px}
  .brand{display:flex;align-items:center;gap:9px;padding:4px 8px 16px;font-size:13px;font-weight:600;letter-spacing:-0.02em}
  .site{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--seam);border-radius:6px;padding:7px 9px;margin-bottom:14px}
  .site b{font-family:var(--mono);font-size:11px;font-weight:400;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
  .nav a{display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:5px;font-size:13px;color:color-mix(in oklab,var(--ink) 52%,transparent)}
  .nav a.on{background:var(--panel);color:var(--ink);position:relative}
  .nav a.on::before{content:"";position:absolute;left:0;top:50%;translate:0 -50%;width:2px;height:14px;border-radius:2px;background:var(--accent)}
  .dot{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.55}
  .main{display:flex;flex-direction:column;min-width:0;overflow:hidden}
  .top{display:flex;align-items:center;gap:14px;padding:0 16px;height:46px;border-bottom:1px solid var(--seam);background:var(--bg)}
  .top h1{font-size:14px;font-weight:500;letter-spacing:-0.01em}
  .seg{display:flex;gap:1px;margin-left:auto;background:var(--seam);border:1px solid var(--seam);border-radius:6px;overflow:hidden}
  .seg span{padding:4px 10px;font-size:11px;font-weight:500;background:var(--bg);color:color-mix(in oklab,var(--ink) 50%,transparent)}
  .seg span.on{background:var(--accent);color:var(--bg)}
  .tabs{display:flex;gap:2px;padding:0 16px;border-bottom:1px solid var(--seam);background:var(--bg)}
  .tabs a{padding:8px 10px;font-size:12.5px;color:color-mix(in oklab,var(--ink) 45%,transparent);border-bottom:2px solid transparent;margin-bottom:-1px}
  .tabs a.on{color:var(--ink);border-color:var(--accent)}
  .grid{flex:1;display:grid;grid-template-rows:auto 1fr;gap:1px;background:var(--seam);min-height:0}
  .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--seam)}
  .m{background:var(--panel);padding:11px 14px;display:flex;flex-direction:column;gap:7px}
  .m .top-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
  .m .v{font-size:25px}
  .m svg{opacity:.75}
  .m .d{font-size:11px;font-weight:500}
  .lower{display:grid;grid-template-columns:1.62fr 1fr;gap:1px;background:var(--seam);min-height:0}
  .chartcell{background:var(--panel);display:flex;flex-direction:column;min-height:0;padding:12px 14px 8px}
  .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .ch b{font-size:13px;font-weight:500}
  .leg{display:flex;gap:12px}
  .leg i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px}
  .plotwrap{position:relative;flex:1;min-height:0;padding-left:34px}
  .plot{width:100%;display:block}
  .yaxis span{position:absolute;left:0;translate:0 -50%;font-size:10px;color:color-mix(in oklab,var(--ink) 38%,transparent)}
  .xaxis{position:relative;height:16px;margin-left:34px;margin-top:4px}
  .xaxis span{position:absolute;translate:-50% 0;font-size:10px;color:color-mix(in oklab,var(--ink) 38%,transparent)}
  .side{display:grid;grid-template-rows:1fr 1fr;gap:1px;background:var(--seam);min-height:0}
  .p{background:var(--panel);padding:11px 14px;display:flex;flex-direction:column;min-height:0}
  .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .ph b{font-size:12.5px;font-weight:500}
  .cols{display:flex;justify-content:space-between;padding:0 7px 5px;border-bottom:1px solid var(--seam);margin-bottom:4px}
  .rows{display:flex;flex-direction:column;gap:1px;overflow:hidden}
  .row{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5.5px 7px;border-radius:3px;font-size:12.5px;overflow:hidden}
  .row::before{content:"";position:absolute;inset:0 auto 0 0;width:calc(var(--share)*100%);background:var(--accent);opacity:.13;border-radius:3px}
  .row[data-mono] .rl{font-family:var(--mono);font-size:11.5px}
  .rl,.rv{position:relative}
  .rl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:color-mix(in oklab,var(--ink) 88%,transparent)}
  .rv{display:flex;align-items:baseline;gap:9px;font-variant-numeric:tabular-nums}
  .pct{font-style:normal;font-size:11px;color:color-mix(in oklab,var(--ink) 34%,transparent)}
  .rv b{font-weight:500;font-size:12px;color:color-mix(in oklab,var(--ink) 72%,transparent)}
  .strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--seam)}
  `, `
  <div class="app">
    <aside class="rail">
      <div class="brand">${logo}<span>Pulse</span></div>
      <div class="site"><span class="dot" style="color:var(--success);opacity:1"></span><b>example.com</b><span class="meta" style="font-size:10px">7D</span></div>
      <nav class="nav">
        <a class="on"><span class="dot"></span>Analytics</a>
        <a><span class="dot"></span>Ask AI</a>
        <a><span class="dot"></span>Setup</a>
        <a><span class="dot"></span>Settings</a>
      </nav>
      <div style="flex:1"></div>
      <nav class="nav"><a><span class="dot"></span>Docs</a><a><span class="dot"></span>Account</a></nav>
    </aside>
    <div class="main">
      <div class="top">
        <h1>Acme Docs</h1>
        <span class="mono" style="font-size:11px;color:color-mix(in oklab,var(--ink) 42%,transparent)">example.com</span>
        <div class="seg"><span class="on">7D</span><span>30D</span><span>90D</span></div>
      </div>
      <div class="tabs"><a class="on">Analytics</a><a>Ask AI</a><a>Setup</a><a>Settings</a></div>
      <div class="grid">
        <div class="metrics">
          <div class="m"><div class="top-row"><span class="meta">Pageviews</span><svg width="92" height="26" fill="none"><path d="${c.SPARK_PV}" stroke="var(--accent)" stroke-width="1.4"/></svg></div><span class="fig v">${F(c.O.totalPageviews)}</span><span class="d up">↗ 12.4%</span></div>
          <div class="m"><div class="top-row"><span class="meta">Sessions</span><svg width="92" height="26" fill="none"><path d="${c.SPARK_SE}" stroke="var(--accent)" stroke-opacity=".65" stroke-width="1.4"/></svg></div><span class="fig v">${F(c.O.totalSessions)}</span><span class="d up">↗ 8.1%</span></div>
          <div class="m"><div class="top-row"><span class="meta">Visitors</span><svg width="92" height="26" fill="none"><path d="${c.SPARK_VI}" stroke="var(--accent)" stroke-opacity=".65" stroke-width="1.4"/></svg></div><span class="fig v">${F(c.O.totalVisitors)}</span><span class="d dn">↘ 2.0%</span></div>
          <div class="m"><div class="top-row"><span class="meta">Active now</span></div><span class="fig v" style="color:var(--powder)">3</span><span class="d" style="color:color-mix(in oklab,var(--ink) 40%,transparent)">last 5 min</span></div>
        </div>
        <div class="lower">
          <div class="chartcell">
            <div class="ch"><b>Traffic</b><div class="leg"><span class="meta"><i style="background:var(--accent)"></i>Pageviews</span><span class="meta"><i style="background:var(--powder)"></i>Sessions</span></div></div>
            <div class="plotwrap"><div class="yaxis">${c.yTicks.map((t)=>`<span style="top:${t.y}%">${t.label}</span>`).join("")}</div>${chart(c, 300)}</div>
            ${axis(c)}
          </div>
          <div class="side">
            <div class="p"><div class="ph"><b>Top pages</b><span class="meta">Views</span></div><div class="rows">${rowList(c.PAGES.slice(0,6),{mono:true,fmt:F})}</div></div>
            <div class="p"><div class="ph"><b>Sources</b><span class="meta">Views</span></div><div class="rows">${rowList(c.REFS.slice(0,6),{fmt:F})}</div></div>
          </div>
        </div>
      </div>
      <div class="strip">
        <div class="p"><div class="ph"><b>Countries</b><span class="meta">Views</span></div><div class="rows">${rowList(c.GEO.slice(0,4),{fmt:F})}</div></div>
        <div class="p"><div class="ph"><b>Devices</b><span class="meta">Views</span></div><div class="rows">${rowList(c.DEV,{fmt:F})}</div></div>
        <div class="p"><div class="ph"><b>Events</b><span class="meta">Count</span></div><div class="rows">${rowList(c.EVT.slice(0,4),{mono:true,fmt:F})}</div></div>
      </div>
    </div>
  </div>`);


  /* ══ B — Focused ═══════════════════════════════════════════
     Plausible's argument in this palette: a few numbers, one big
     chart, four panels. A measured column with real margins, large
     display figures, nothing competing with the trend. */
  const B = shell("B — Focused", `
  .app{display:grid;grid-template-columns:212px 1fr;min-height:100vh}
  .rail{background:var(--bg);border-right:1px solid var(--seam);padding:18px 12px;display:flex;flex-direction:column}
  .brand{display:flex;align-items:center;gap:9px;padding:2px 8px 20px;font-size:13.5px;font-weight:600;letter-spacing:-0.02em}
  .nav a{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;font-size:13.5px;color:color-mix(in oklab,var(--ink) 50%,transparent)}
  .nav a.on{background:var(--panel);color:var(--ink)}
  .dot{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.5}
  .col{max-width:1080px;margin:0 auto;padding:28px 32px 60px;width:100%}
  .head{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}
  .head h1{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:26px}
  .head .st{margin-left:auto;display:flex;align-items:center;gap:7px;font-size:12px;color:var(--success)}
  .head .st i{width:6px;height:6px;border-radius:50%;background:currentColor}
  .sub{font-family:var(--mono);font-size:12px;color:color-mix(in oklab,var(--ink) 42%,transparent)}
  .bar{display:flex;align-items:center;gap:10px;margin:22px 0 20px}
  .tabs{display:flex;gap:4px}
  .tabs a{padding:6px 11px;border-radius:6px;font-size:13px;color:color-mix(in oklab,var(--ink) 48%,transparent)}
  .tabs a.on{background:var(--panel);color:var(--ink)}
  .seg{display:flex;gap:2px;margin-left:auto;background:var(--panel);border:1px solid var(--seam);border-radius:7px;padding:2px}
  .seg span{padding:5px 11px;border-radius:5px;font-size:11.5px;font-weight:500;color:color-mix(in oklab,var(--ink) 48%,transparent)}
  .seg span.on{background:var(--accent);color:var(--bg)}
  .card{background:var(--panel);border:1px solid var(--seam);border-radius:12px}
  .mrow{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:16px}
  .m{padding:20px 22px;border-right:1px solid var(--seam)}
  .m:last-child{border-right:0}
  .m .v{font-size:40px;margin-top:12px;display:block}
  .m .d{display:block;margin-top:9px;font-size:12px;font-weight:500}
  .chartcard{padding:20px 22px 14px;margin-bottom:16px}
  .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
  .ch b{font-size:14px;font-weight:500}
  .leg{display:flex;gap:14px}
  .leg i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:6px}
  .plotwrap{position:relative;padding-left:40px}
  .plot{width:100%;display:block}
  .yaxis span{position:absolute;left:0;translate:0 -50%;font-size:11px;color:color-mix(in oklab,var(--ink) 38%,transparent)}
  .xaxis{position:relative;height:18px;margin-left:40px;margin-top:8px}
  .xaxis span{position:absolute;translate:-50% 0;font-size:11px;color:color-mix(in oklab,var(--ink) 38%,transparent)}
  .duo{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .p{padding:18px 20px}
  .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .ph b{font-size:14px;font-weight:500}
  .cols{display:flex;justify-content:space-between;padding:0 9px 8px;border-bottom:1px solid var(--seam);margin-bottom:6px}
  .rows{display:flex;flex-direction:column;gap:2px}
  .row{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px;border-radius:4px;font-size:13.5px;overflow:hidden}
  .row::before{content:"";position:absolute;inset:0 auto 0 0;width:calc(var(--share)*100%);background:var(--accent);opacity:.11;border-radius:4px}
  .row[data-mono] .rl{font-family:var(--mono);font-size:12.5px}
  .rl,.rv{position:relative}
  .rl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:color-mix(in oklab,var(--ink) 90%,transparent)}
  .rv{display:flex;align-items:baseline;gap:10px}
  .pct{font-style:normal;font-size:12px;color:color-mix(in oklab,var(--ink) 34%,transparent);font-variant-numeric:tabular-nums}
  .rv b{font-weight:500;font-size:13px;color:color-mix(in oklab,var(--ink) 72%,transparent);font-variant-numeric:tabular-nums}
  `, `
  <div class="app">
    <aside class="rail">
      <div class="brand">${logo}<span>Pulse Analytics</span></div>
      <nav class="nav"><a class="on"><span class="dot"></span>Sites</a><a><span class="dot"></span>Docs</a></nav>
      <div style="flex:1"></div>
      <nav class="nav"><a><span class="dot"></span>Account</a><a><span class="dot"></span>Log out</a></nav>
    </aside>
    <main>
      <div class="col">
        <div class="head"><h1>Acme Docs</h1><span class="sub">example.com</span><span class="st"><i></i>Receiving</span></div>
        <div class="bar">
          <div class="tabs"><a class="on">Analytics</a><a>Ask AI</a><a>Setup</a><a>Settings</a></div>
          <div class="seg"><span class="on">7D</span><span>30D</span><span>90D</span></div>
        </div>
        <div class="card mrow">
          <div class="m"><span class="meta">Pageviews</span><span class="fig v">${F(c.O.totalPageviews)}</span><span class="d up">↗ 12.4%</span></div>
          <div class="m"><span class="meta">Sessions</span><span class="fig v">${F(c.O.totalSessions)}</span><span class="d up">↗ 8.1%</span></div>
          <div class="m"><span class="meta">Visitors</span><span class="fig v">${F(c.O.totalVisitors)}</span><span class="d dn">↘ 2.0%</span></div>
          <div class="m"><span class="meta">Active now</span><span class="fig v" style="color:var(--powder)">3</span><span class="d" style="color:color-mix(in oklab,var(--ink) 40%,transparent)">last 5 min</span></div>
        </div>
        <div class="card chartcard">
          <div class="ch"><b>Traffic</b><div class="leg"><span class="meta"><i style="background:var(--accent)"></i>Pageviews</span><span class="meta"><i style="background:var(--powder)"></i>Sessions</span></div></div>
          <div class="plotwrap"><div class="yaxis">${c.yTicks.map((t)=>`<span style="top:${t.y}%">${t.label}</span>`).join("")}</div>${chart(c, 300)}</div>
          ${axis(c)}
        </div>
        <div class="duo">
          <div class="card p"><div class="ph"><b>Top pages</b></div><div class="cols"><span class="meta">Page</span><span class="meta">Views</span></div><div class="rows">${rowList(c.PAGES.slice(0,7),{mono:true,fmt:F})}</div></div>
          <div class="card p"><div class="ph"><b>Sources</b></div><div class="cols"><span class="meta">Source</span><span class="meta">Views</span></div><div class="rows">${rowList(c.REFS.slice(0,7),{fmt:F})}</div></div>
          <div class="card p"><div class="ph"><b>Countries</b></div><div class="cols"><span class="meta">Country</span><span class="meta">Views</span></div><div class="rows">${rowList(c.GEO.slice(0,6),{fmt:F})}</div></div>
          <div class="card p"><div class="ph"><b>Events</b></div><div class="cols"><span class="meta">Name</span><span class="meta">Count</span></div><div class="rows">${rowList(c.EVT.slice(0,5),{mono:true,fmt:F})}</div></div>
        </div>
      </div>
    </main>
  </div>`);

  /* ══ C — Workbench ═════════════════════════════════════════
     A primary column that owns the trend and a details rail beside
     it that never moves. Breakdowns are tables with a share track
     rather than filled rows, so five fit without shouting. */
  const C = shell("C — Workbench", `
  .app{display:grid;grid-template-columns:56px 1fr;height:100vh;overflow:hidden}
  .rail{background:var(--bg);border-right:1px solid var(--seam);display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:6px}
  .ricon{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;color:color-mix(in oklab,var(--ink) 42%,transparent);font-size:13px}
  .ricon.on{background:var(--panel);color:var(--accent)}
  .main{display:flex;flex-direction:column;min-width:0}
  .top{display:flex;align-items:center;gap:12px;padding:0 20px;height:52px;border-bottom:1px solid var(--seam)}
  .top h1{font-family:var(--display);font-weight:600;letter-spacing:-0.025em;font-size:17px}
  .chip{display:flex;align-items:center;gap:7px;background:var(--panel);border:1px solid var(--seam);border-radius:20px;padding:4px 11px;font-family:var(--mono);font-size:11px;color:color-mix(in oklab,var(--ink) 66%,transparent)}
  .chip i{width:5px;height:5px;border-radius:50%;background:var(--success)}
  .seg{display:flex;gap:2px;margin-left:auto;background:var(--panel);border:1px solid var(--seam);border-radius:7px;padding:2px}
  .seg span{padding:5px 11px;border-radius:5px;font-size:11.5px;font-weight:500;color:color-mix(in oklab,var(--ink) 48%,transparent)}
  .seg span.on{background:var(--accent);color:var(--bg)}
  .tabs{display:flex;gap:2px;padding:0 20px;border-bottom:1px solid var(--seam)}
  .tabs a{padding:10px 11px;font-size:13px;color:color-mix(in oklab,var(--ink) 45%,transparent);border-bottom:2px solid transparent;margin-bottom:-1px}
  .tabs a.on{color:var(--ink);border-color:var(--accent)}
  .body{display:grid;grid-template-columns:1fr 372px;flex:1;min-height:0}
  .left{padding:20px;border-right:1px solid var(--seam);display:flex;flex-direction:column;gap:16px;min-height:0}
  .right{padding:20px;display:flex;flex-direction:column;gap:20px;background:var(--bg);overflow:hidden}
  .mrow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .m{background:var(--panel);border:1px solid var(--seam);border-radius:9px;padding:13px 15px}
  .m .v{font-size:26px;display:block;margin-top:9px}
  .m .d{display:block;margin-top:7px;font-size:11.5px;font-weight:500}
  .chartcard{background:var(--panel);border:1px solid var(--seam);border-radius:11px;padding:16px 18px 10px;flex:1;display:flex;flex-direction:column;min-height:0}
  .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .ch b{font-size:13.5px;font-weight:500}
  .leg{display:flex;gap:13px}
  .leg i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:6px}
  .plotwrap{position:relative;flex:1;min-height:0;padding-left:38px}
  .plot{width:100%;display:block;height:100%}
  .yaxis span{position:absolute;left:0;translate:0 -50%;font-size:10.5px;color:color-mix(in oklab,var(--ink) 36%,transparent)}
  .xaxis{position:relative;height:16px;margin-left:38px;margin-top:6px}
  .xaxis span{position:absolute;translate:-50% 0;font-size:10.5px;color:color-mix(in oklab,var(--ink) 36%,transparent)}
  .sec h3{font-size:12px;font-weight:500;letter-spacing:0.02em;margin-bottom:9px;color:color-mix(in oklab,var(--ink) 80%,transparent)}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  td{padding:6px 0;font-size:12.5px;border-bottom:1px solid color-mix(in oklab,var(--seam) 55%,transparent)}
  tr:last-child td{border-bottom:0}
  td.l{color:color-mix(in oklab,var(--ink) 86%,transparent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  td.l.mn{font-family:var(--mono);font-size:11.5px}
  td.s{width:78px;padding-left:12px}
  td.n{width:56px;text-align:right;font-variant-numeric:tabular-nums;color:color-mix(in oklab,var(--ink) 70%,transparent);font-size:12px}
  .track{height:4px;border-radius:2px;background:color-mix(in oklab,var(--ink) 8%,transparent);overflow:hidden}
  .track i{display:block;height:100%;background:var(--accent);opacity:.8;border-radius:2px}
  `, `
  <div class="app">
    <aside class="rail">
      <div class="ricon" style="margin-bottom:6px">${logo}</div>
      <div class="ricon on">◧</div><div class="ricon">✦</div><div class="ricon">⌘</div><div class="ricon">⚙</div>
      <div style="flex:1"></div><div class="ricon">?</div><div class="ricon">◕</div>
    </aside>
    <div class="main">
      <div class="top">
        <h1>Acme Docs</h1>
        <span class="chip"><i></i>example.com</span>
        <div class="seg"><span class="on">7D</span><span>30D</span><span>90D</span></div>
      </div>
      <div class="tabs"><a class="on">Analytics</a><a>Ask AI</a><a>Setup</a><a>Settings</a></div>
      <div class="body">
        <div class="left">
          <div class="mrow">
            <div class="m"><span class="meta">Pageviews</span><span class="fig v">${F(c.O.totalPageviews)}</span><span class="d up">↗ 12.4%</span></div>
            <div class="m"><span class="meta">Sessions</span><span class="fig v">${F(c.O.totalSessions)}</span><span class="d up">↗ 8.1%</span></div>
            <div class="m"><span class="meta">Visitors</span><span class="fig v">${F(c.O.totalVisitors)}</span><span class="d dn">↘ 2.0%</span></div>
            <div class="m"><span class="meta">Active</span><span class="fig v" style="color:var(--powder)">3</span><span class="d" style="color:color-mix(in oklab,var(--ink) 40%,transparent)">now</span></div>
          </div>
          <div class="chartcard">
            <div class="ch"><b>Traffic</b><div class="leg"><span class="meta"><i style="background:var(--accent)"></i>Pageviews</span><span class="meta"><i style="background:var(--powder)"></i>Sessions</span></div></div>
            <div class="plotwrap"><div class="yaxis">${c.yTicks.map((t)=>`<span style="top:${t.y}%">${t.label}</span>`).join("")}</div>${chart(c, 330)}</div>
            ${axis(c)}
          </div>
        </div>
        <div class="right">
          ${[["Top pages", c.PAGES.slice(0,6), true],["Sources", c.REFS.slice(0,5), false],["Countries", c.GEO.slice(0,5), false],["Devices", c.DEV, false],["Events", c.EVT.slice(0,4), true]]
            .map(([t, rs, mn]) => `<div class="sec"><h3>${t}</h3><table>${rs.map((r)=>`<tr><td class="l${mn?" mn":""}">${r.label}</td><td class="s"><span class="track"><i style="width:${(r.share*100).toFixed(1)}%"></i></span></td><td class="n">${F(r.value)}</td></tr>`).join("")}</table></div>`).join("")}
        </div>
      </div>
    </div>
  </div>`);

  return { "a-instrument": A, "b-focused": B, "c-workbench": C };
}
