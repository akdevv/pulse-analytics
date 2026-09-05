/* The shell every page shares. Written once so seven comps cannot drift,
   which is the failure the app itself had. */

export const logo = `<svg viewBox="0 0 24 16" width="21" fill="none" stroke="var(--accent)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"/></svg>`;

const ICON = {
  sites: `<path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/><path d="M3 10h14M10 3c2.4 3 2.4 11 0 14M10 3C7.6 6 7.6 14 10 17"/>`,
  docs: `<path d="M5 3h7l3 3v11H5z"/><path d="M8 9h5M8 12h5"/>`,
  account: `<circle cx="10" cy="7.5" r="3"/><path d="M4.5 16a5.5 5.5 0 0 1 11 0"/>`,
  out: `<path d="M8 4H5v12h3"/><path d="M12 13l3-3-3-3M15 10H8"/>`,
  chevron: `<path d="M7 8.5 10 11.5 13 8.5"/>`,
  search: `<circle cx="9" cy="9" r="5"/><path d="m13 13 3.5 3.5"/>`,
};
const icon = (k, size = 15) =>
  `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

/* The opacity ladder. Every step was measured against the panel it sits on:
   the old low end ran text at 3.0–4.3:1, under AA, which is most of why the
   screens read as murk rather than as quiet. 56% is the floor for anything
   that is a word; below that is rules and tracks only. */
export const SHELL_CSS = `
:root{
  --t1: var(--ink);
  --t2: color-mix(in oklab, var(--ink) 88%, transparent);
  --t3: color-mix(in oklab, var(--ink) 72%, transparent);
  --t4: color-mix(in oklab, var(--ink) 62%, transparent);
  --t5: color-mix(in oklab, var(--ink) 56%, transparent);
  --rule: color-mix(in oklab, var(--ink) 9%, transparent);
}
.meta{color:var(--t5)}
.app{display:grid;grid-template-columns:236px 1fr;min-height:100vh}
.app{max-width:100%;overflow-x:clip}
.app>main{min-width:0}
.card,.col{min-width:0}
pre{white-space:pre-wrap;word-break:break-word}
.rail{background:var(--bg);border-right:1px solid var(--seam);padding:14px 12px;display:flex;flex-direction:column;gap:14px;position:sticky;top:0;height:100vh}
.brand{display:flex;align-items:center;gap:9px;padding:2px 8px;font-size:13.5px;font-weight:600;letter-spacing:-0.02em}
.nav{display:flex;flex-direction:column;gap:2px}
.nav a{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;font-size:13.5px;color:var(--t5);position:relative;white-space:nowrap}
.nav a:hover{background:color-mix(in oklab,var(--ink) 5%,transparent);color:var(--t2)}
.nav a.on{background:var(--panel);color:var(--t1)}
.nav a.on::before{content:"";position:absolute;left:0;top:50%;translate:0 -50%;width:2px;height:15px;border-radius:2px;background:var(--accent)}
.nav a.on svg{color:var(--accent)}
.railgroup .meta{padding:0 10px 7px;display:block;font-size:10.5px}

/* The rail had two links and then a hand's height of nothing. What belongs in
   that space is the thing you actually switch between. */
.switch{display:flex;align-items:center;gap:9px;width:100%;background:var(--panel);border:1px solid var(--seam);border-radius:8px;padding:8px 10px;cursor:pointer;text-align:left}
.switch:hover{border-color:color-mix(in oklab,var(--accent) 40%,transparent)}
.switch .pip{width:6px;height:6px;border-radius:50%;background:var(--success);flex:none}
.switch b{flex:1;min-width:0;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.switch svg{color:var(--t5);flex:none}
.sitelist{display:flex;flex-direction:column;gap:1px}
.sitelist a{display:flex;align-items:center;gap:9px;padding:6px 10px;border-radius:6px;font-size:12.5px;color:var(--t5)}
.sitelist a:hover{background:color-mix(in oklab,var(--ink) 5%,transparent);color:var(--t2)}
.sitelist a.on{background:var(--panel);color:var(--t1)}
.sitelist .pip{width:5px;height:5px;border-radius:50%;background:var(--success);flex:none}
.sitelist .pip.off{background:color-mix(in oklab,var(--ink) 26%,transparent)}
.sitelist .n{margin-left:auto;font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--t5)}

.col{max-width:1120px;margin:0 auto;padding:24px 32px 64px;width:100%}
.col.narrow{max-width:680px}
.head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.head h1{font-family:var(--display);font-weight:600;letter-spacing:-0.03em;font-size:25px}
.sub{font-family:var(--mono);font-size:12px;color:var(--t5)}
.st{margin-left:auto;display:flex;align-items:center;gap:14px}
.st .live{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--success)}
.st .live i{width:6px;height:6px;border-radius:50%;background:currentColor}
/* Recency is the health signal a status word only gestures at. */
.st .ago{font-size:12.5px;color:var(--t5)}
.lede{margin-top:8px;font-size:13.5px;line-height:1.6;color:var(--t5);max-width:62ch}
.bar{display:flex;align-items:center;gap:10px;margin:18px 0 16px;flex-wrap:wrap}
.tabs{display:flex;gap:3px}
.tabs a{padding:6px 11px;border-radius:6px;font-size:13px;color:var(--t5)}
.tabs a:hover{background:color-mix(in oklab,var(--ink) 5%,transparent);color:var(--t2)}
.tabs a.on{background:var(--panel);color:var(--t1)}
.seg{display:flex;gap:2px;margin-left:auto;background:var(--panel);border:1px solid var(--seam);border-radius:7px;padding:2px}
.seg span{padding:5px 11px;border-radius:5px;font-size:11.5px;font-weight:500;color:var(--t5);cursor:pointer}
.seg span:hover:not(.on){background:color-mix(in oklab,var(--ink) 6%,transparent);color:var(--t2)}
.seg span.on{background:var(--accent);color:var(--bg)}

.card{background:var(--panel);border:1px solid var(--seam);border-radius:11px}
.ch{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:15px 18px;border-bottom:1px solid var(--seam)}
.ch b{font-size:14px;font-weight:500}
.ch p{font-size:12.5px;line-height:1.55;color:var(--t5);margin-top:4px}
.cb{padding:18px}
.btn{display:inline-flex;align-items:center;gap:7px;border-radius:7px;padding:7px 13px;font-size:13px;font-weight:500;border:1px solid var(--seam);background:var(--panel);color:var(--t1);cursor:pointer}
.btn:hover{border-color:color-mix(in oklab,var(--ink) 22%,transparent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.btn.primary:hover{background:color-mix(in oklab,var(--accent) 88%,white)}
.btn.ghost{background:transparent}
.btn.danger{background:transparent;border-color:color-mix(in oklab,oklch(0.63 0.21 25) 45%,transparent);color:oklch(0.74 0.17 25)}
.btn[disabled]{opacity:.45;cursor:not-allowed}
/* Focus is drawn, not inherited: a comp that never shows it ships an app that
   never has it. */
:where(a,button,input,.seg span,.switch):focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
label.f{display:block;margin-bottom:16px}
label.f .lb{display:block;font-size:12.5px;font-weight:500;margin-bottom:6px}
label.f input{width:100%;background:var(--bg);border:1px solid var(--seam);border-radius:7px;padding:9px 11px;color:var(--t1);font-family:inherit;font-size:13.5px}
label.f input:focus{outline:none;border-color:color-mix(in oklab,var(--accent) 55%,transparent);box-shadow:0 0 0 3px color-mix(in oklab,var(--accent) 14%,transparent)}
label.f input::placeholder{color:color-mix(in oklab,var(--ink) 32%,transparent)}
label.f .hint{display:block;margin-top:6px;font-size:12px;color:var(--t5)}
pre{background:var(--bg);border:1px solid var(--seam);border-radius:8px;padding:13px 14px;overflow:auto;font-family:var(--mono);font-size:11.5px;line-height:1.65;color:var(--t3)}
pre .t{color:var(--powder)}
pre .a{color:var(--accent)}
.kv{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--rule);font-size:13px}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--t5)}
.kv .v{font-family:var(--mono);font-size:11.5px;background:var(--bg);border:1px solid var(--seam);border-radius:5px;padding:3px 8px;color:var(--t3)}

`;

export const RESPONSIVE_CSS = `
@media (max-width: 900px){
  .app{grid-template-columns:1fr}
  .rail{position:static;height:auto;flex-direction:row;align-items:center;gap:10px;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid var(--seam);padding:10px 14px;max-width:100vw}
  .rail .brand{padding:0;flex:none}
  .rail .railgroup,.rail .sitelist,.rail .spacer{display:none}
  .rail .nav{flex-direction:row;gap:2px}
  /* A grid item's implicit min-width is auto, so the rail's own overflow
     never clipped and the whole document scrolled instead. */
  .rail{min-width:0}
  .rail .switch{width:auto;max-width:170px;margin-left:auto;order:-1}
  /* Icons carry these two once the labels stop fitting. */
  .rail .nav:last-of-type a span{display:none}
  .rail .nav:last-of-type a{padding:7px 8px}
  .col{padding:18px 16px 48px}

  /* Every multi-column grid in the comps collapses here. Without this the
     page was 723px wide inside a 390px viewport — the panels never folded,
     so the whole app scrolled sideways. */
  .mrow{grid-template-columns:repeat(2,1fr)}
  .mrow .m:nth-child(2n){border-right:0}
  .mrow .m:nth-child(-n+2){border-bottom:1px solid var(--seam)}
  .duo,.two,.wrap,.checks,.steps,.grid{grid-template-columns:1fr}
  .plotwrap{height:210px;padding-left:32px}
  .xaxis{margin-left:32px}
  /* No pointer, so no pointer readout. */
  .readout,.cursor,.dot{display:none}
  .m .v{font-size:26px}
  .head h1{font-size:21px}
  .bar{gap:8px}
  .seg{margin-left:0}
  .tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}
  td.s{width:64px;padding-left:10px}
  .threads{order:2}
}

/* Between the rail folding and the desktop grid, three metric columns and a
   two-up panel grid both stop fitting before the breakpoint above. */
@media (max-width: 1180px) and (min-width: 901px){
  .duo{grid-template-columns:1fr}
}
`;

export const shell = (title, css, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css">
<style>${SHELL_CSS}${css}${RESPONSIVE_CSS}</style></head><body>${body}</body></html>`;

const SITES = [
  ["Acme Docs", "9.0K", true],
  ["Marketing site", "2.2K", true],
  ["Staging", "—", false],
];

/** `on` is the account-level section; `site` names the site in context. */
export const rail = (on, site = null) => `
<aside class="rail">
  <div class="brand">${logo}<span>Pulse Analytics</span></div>
  ${site ? `<button class="switch"><span class="pip"></span><b>${site}</b>${icon("chevron", 14)}</button>` : ""}
  <nav class="nav">
    <a class="${on === "sites" ? "on" : ""}">${icon("sites")}<span>All sites</span></a>
    <a class="${on === "docs" ? "on" : ""}">${icon("docs")}<span>Docs</span></a>
  </nav>
  <div class="railgroup">
    <span class="meta">Your sites</span>
    <div class="sitelist">
      ${SITES.map(([n, v, live]) => `<a class="${n === site ? "on" : ""}"><span class="pip ${live ? "" : "off"}"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span><span class="n">${v}</span></a>`).join("")}
    </div>
  </div>
  <div class="spacer" style="flex:1"></div>
  <nav class="nav">
    <a class="${on === "account" ? "on" : ""}">${icon("account")}<span>Account</span></a>
    <a>${icon("out")}<span>Log out</span></a>
  </nav>
</aside>`;

export const siteHead = (tab, opts = {}) => `
<div class="head">
  <h1>Acme Docs</h1><span class="sub">example.com</span>
  <span class="st">
    <span class="ago">last event ${opts.ago ?? "12s"} ago</span>
    <span class="live"><i></i>Receiving</span>
  </span>
</div>
<div class="bar">
  <div class="tabs">
    ${["Analytics", "Ask AI", "Setup", "Settings"].map((t) => `<a class="${t === tab ? "on" : ""}">${t}</a>`).join("")}
  </div>
  ${tab === "Analytics" ? `<div class="seg"><span class="on">7D</span><span>30D</span><span>90D</span></div>` : ""}
</div>`;
