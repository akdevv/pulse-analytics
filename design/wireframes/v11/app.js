/* v11 — working prototype. State lives in localStorage so the flow survives
   page loads: create a site → install → first event → analytics has data. */

const KEY = "pulse.v11";

/* visitors/trend/online are per-site so the list has real variety to read:
   a big steady site, a spiking one, a falling one, a quiet one, two unfinished. */
const SEED_SITES = [
  { id: "s1", name: "Acme Docs", domain: "docs.acme.dev", live: true, visitors: 12480, trend: 12, online: 148 },
  { id: "s2", name: "Acme Blog", domain: "blog.acme.dev", live: true, visitors: 8310, trend: 41, online: 96 },
  { id: "s3", name: "Pulse Landing", domain: "pulse.dev", live: true, visitors: 5120, trend: -8, online: 31 },
  { id: "s4", name: "Status", domain: "status.acme.dev", live: true, visitors: 940, trend: 0, online: 4 },
  { id: "s5", name: "Changelog", domain: "changelog.acme.dev", live: true, visitors: 312, trend: -22, online: 0 },
  { id: "s6", name: "Marketing site", domain: "acme.com", live: false },
];

const store = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  },
  write(patch) {
    const next = { ...store.read(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },
  sites() {
    const s = store.read().sites;
    // no state yet, or state saved before sites carried stats — reseed.
    // An empty list is a real choice (you deleted them all), so leave it alone.
    if (!s || (s.length && !s.some((x) => "visitors" in x))) {
      store.write({ sites: SEED_SITES });
    }
    return store.read().sites;
  },
  user() {
    return store.read().user || { name: "Ashish", email: "ashish@acme.dev" };
  },
};

const params = new URLSearchParams(location.search);
const siteId = params.get("site") || store.sites()[0].id;
const site = () => store.sites().find((s) => s.id === siteId) || store.sites()[0];

/* --- numbers -------------------------------------------------------------
   Deterministic per site + range, so the same view always shows the same
   figures and switching range visibly changes them. */

const RANGES = {
  "24h": { label: "Last 24 hours", points: 24, unit: "h", scale: 0.06 },
  "7d": { label: "Last 7 days", points: 7, unit: "d", scale: 1 },
  "30d": { label: "Last 30 days", points: 30, unit: "d", scale: 3.9 },
  "90d": { label: "Last 90 days", points: 90, unit: "d", scale: 11.2 },
};

const METRICS = {
  visitors: { label: "visitors", base: 12480, fmt: fmtNum, delta: "+12%" },
  visits: { label: "visits", base: 19600, fmt: fmtNum, delta: "+8%" },
  pageviews: { label: "pageviews", base: 32100, fmt: fmtNum, delta: "+14%" },
  bounce: { label: "bounce rate", base: 41, fmt: (n) => Math.round(n) + "%", delta: "-3pt", flat: true },
  duration: { label: "time on site", base: 134, fmt: fmtDuration, delta: "+9s", flat: true },
};

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toLocaleString();
}

function fmtDuration(s) {
  s = Math.round(s);
  return Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
}

function total(metricKey, range, filters) {
  const m = METRICS[metricKey];
  const n = m.flat ? m.base : m.base * RANGES[range].scale;
  return filters.length ? n * Math.pow(0.42, filters.length) : n;
}

// smooth-ish wave, no randomness: same page reload, same chart
function series(metricKey, range, filters, offset = 0) {
  const { points } = RANGES[range];
  const per = total(metricKey, range, filters) / points;
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin((i / points) * Math.PI * 2 - Math.PI / 2);
    const drift = Math.sin((i + offset * 3) / 2.3);
    return Math.max(1, per * (1 + wave * 0.35 + drift * 0.12) * (offset ? 0.89 : 1));
  });
}

const BREAKDOWNS = {
  sources: {
    referrers: [["google.com", 3910], ["direct", 2880], ["news.ycombinator.com", 1702], ["github.com", 1140], ["x.com", 870]],
    channels: [["Organic search", 4310], ["Direct", 2880], ["Social", 1980], ["Referral", 1420]],
    campaigns: [["launch-week", 1210], ["docs-banner", 640], ["newsletter-08", 380]],
  },
  pages: {
    top: [["/", 9124], ["/docs/getting-started", 6402], ["/pricing", 4318], ["/docs/api/events", 3157], ["/blog/self-hosting", 2210]],
    entry: [["/", 6120], ["/docs/getting-started", 3980], ["/blog/self-hosting", 1740]],
    exit: [["/pricing", 2870], ["/docs/faq", 1610], ["/", 1240]],
  },
  places: {
    countries: [["United States", 3204], ["India", 2110], ["Germany", 1180], ["United Kingdom", 940], ["Canada", 720]],
    regions: [["California", 1120], ["Karnataka", 810], ["Bavaria", 460]],
    cities: [["San Francisco", 640], ["Bengaluru", 590], ["Berlin", 310]],
  },
  tech: {
    browser: [["Chrome", 7180], ["Safari", 3110], ["Firefox", 1240], ["Edge", 690]],
    os: [["macOS", 5120], ["Windows", 3960], ["iOS", 1900], ["Android", 1070]],
    screen: [["Desktop", 8710], ["Mobile", 3060], ["Tablet", 840]],
  },
};

/* --- shared chrome ------------------------------------------------------- */

function toast(msg) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2400);
}

function href(page) {
  return `${page}?site=${siteId}`;
}

/* --- analytics ----------------------------------------------------------- */

function initAnalytics() {
  const s = site();
  const root = document.querySelector("[data-analytics]"); // site name lives in the sidebar switcher
  // chips live in the filter bar, outside [data-analytics] — delegate from the
  // column so one listener covers the controls and the content alike
  const page = root.closest(".column");

  if (!s.live) {
    document.querySelector("[data-range]").hidden = true;
    document.querySelector("[data-filterbar]").hidden = true;
    root.innerHTML = `
      <div class="box dash stack center" style="padding:64px 16px">
        <strong class="big">Waiting for the first event</strong>
        <p class="muted">${s.domain} hasn't reported anything yet. Nothing to chart until it does.</p>
        <div class="row" style="justify-content:center">
          <a class="btn primary" href="${href("setup.html")}">Finish setup</a>
        </div>
      </div>`;
    document.querySelector("[data-live]").textContent = "not installed";
    return;
  }

  const state = { metric: "visitors", range: "7d", filters: [], tabs: { sources: "referrers", pages: "top", places: "countries", tech: "browser" } };

  const rangeSel = document.querySelector("[data-range]");
  rangeSel.innerHTML = Object.entries(RANGES).map(([k, v]) => `<option value="${k}" ${k === state.range ? "selected" : ""}>${v.label}</option>`).join("");
  rangeSel.addEventListener("change", () => { state.range = rangeSel.value; render(); });

  document.querySelector("[data-add-filter]").addEventListener("click", () => {
    addFilter("country", "India");
  });

  document.querySelector("[data-clear-filters]").addEventListener("click", () => {
    state.filters = [];
    render();
  });

  function addFilter(dim, value) {
    if (state.filters.some((f) => f.dim === dim && f.value === value)) return;
    state.filters.push({ dim, value });
    render();
  }

  /* The plot is stretched to the panel (preserveAspectRatio=none) so the line
     can be drawn on a fixed 100x40 grid. Axis labels are HTML around the svg —
     text inside it would be stretched by the same amount. */
  function chart(el) {
    const now = series(state.metric, state.range, state.filters);
    const prev = series(state.metric, state.range, state.filters, 1);
    const max = Math.max(...now, ...prev) * 1.1;
    const W = 100, H = 40;
    const at = (v, i, arr) => `${(i / (arr.length - 1)) * W},${H - (v / max) * H}`;
    const path = (arr) => arr.map(at).join(" ");
    const { fmt } = METRICS[state.metric];
    const { points, unit } = RANGES[state.range];
    const ago = (n) => `${n}${unit} ago`;

    el.innerHTML = `
      <div class="chartwrap">
        <div class="chart-y" aria-hidden="true">
          <span>${fmt(max)}</span><span>${fmt(max / 2)}</span><span>${fmt(0)}</span>
        </div>
        <svg class="svgchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
             aria-label="${METRICS[state.metric].label} over ${RANGES[state.range].label}">
          <line class="grid" x1="0" y1="0.5" x2="${W}" y2="0.5" vector-effect="non-scaling-stroke"></line>
          <line class="grid mid" x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" vector-effect="non-scaling-stroke"></line>
          <line class="grid" x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" vector-effect="non-scaling-stroke"></line>
          <polygon class="area" points="0,${H} ${path(now)} ${W},${H}"></polygon>
          <polyline class="prev" points="${path(prev)}" vector-effect="non-scaling-stroke"></polyline>
          <polyline class="now" points="${path(now)}" vector-effect="non-scaling-stroke"></polyline>
        </svg>
        <div class="chart-x" aria-hidden="true">
          <span>${ago(points)}</span><span>${ago(Math.round(points / 2))}</span><span>now</span>
        </div>
      </div>`;
  }

  // share-of-total drawn as a bar behind each row: reads at a glance, costs no space
  function table(group, rows) {
    const scale = RANGES[state.range].scale * Math.pow(0.42, state.filters.length);
    const top = Math.max(...rows.map(([, n]) => n));
    return rows.map(([name, n]) => `
      <div class="tr click" style="--pct:${Math.round((n / top) * 100)}%"
           data-filter-dim="${group}" data-filter-value="${name}" role="button" tabindex="0">
        <span class="tr-name">${name}</span>
        <span class="num">${fmtNum(n * scale)}</span>
        <span class="num muted">${Math.round((n / top) * 100)}%</span>
      </div>`).join("");
  }

  const CARD_TITLES = { sources: "Sources", pages: "Pages", places: "Places", tech: "Tech" };

  function card(group, tabs) {
    return `
      <section class="panel" data-card="${group}">
        <header class="panel-head">
          <strong>${CARD_TITLES[group]}</strong>
          <div class="segmented">
            ${tabs.map((t) => `<button class="${state.tabs[group] === t ? "on" : ""}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
          </div>
        </header>
        <div class="tbl">${table(group, BREAKDOWNS[group][state.tabs[group]])}</div>
        <button class="panel-more" data-details="${group}">Show all →</button>
      </section>`;
  }

  function render() {
    document.querySelector("[data-live]").innerHTML = `<span class="pulse-dot"></span> ${140 + (Date.now() / 1000 % 20 | 0)} online`;

    document.querySelector("[data-filters]").innerHTML =
      state.filters
        .map((f, i) => `<span class="chip"><span class="chip-dim">${f.dim}</span>${f.value}
          <button data-drop="${i}" aria-label="Remove ${f.dim} filter">✕</button></span>`)
        .join("") ||
      `<span class="filter-hint">None — click any row below to narrow the page to it.</span>`;
    document.querySelector("[data-clear-filters]").hidden = state.filters.length < 2;

    document.querySelector("[data-metrics]").innerHTML = Object.entries(METRICS).map(([k, m]) => `
      <button class="metric ${k === state.metric ? "on" : ""}" data-metric="${k}" aria-pressed="${k === state.metric}">
        <span class="label">${m.label}</span>
        <span class="val">${m.fmt(total(k, state.range, state.filters))}</span>
        <span class="trend ${m.delta.startsWith("-") ? "down" : "up"}">${m.delta}</span>
      </button>`).join("");

    chart(document.querySelector("[data-chart]"));
    document.querySelector("[data-chart-title]").textContent =
      `${METRICS[state.metric].label[0].toUpperCase()}${METRICS[state.metric].label.slice(1)} over ${RANGES[state.range].label.toLowerCase().replace("last ", "the last ")}`;

    document.querySelector("[data-cards]").innerHTML =
      card("sources", ["referrers", "channels", "campaigns"]) +
      card("pages", ["top", "entry", "exit"]) +
      card("places", ["countries", "regions", "cities"]) +
      card("tech", ["browser", "os", "screen"]);
  }

  // one delegated listener for the whole analytics page
  page.addEventListener("click", (e) => {
    const metric = e.target.closest("[data-metric]");
    if (metric) { state.metric = metric.dataset.metric; return render(); }

    const drop = e.target.closest("[data-drop]");
    if (drop) { state.filters.splice(+drop.dataset.drop, 1); return render(); }

    const tab = e.target.closest("[data-tab]");
    if (tab) {
      state.tabs[tab.closest("[data-card]").dataset.card] = tab.dataset.tab;
      return render();
    }

    const details = e.target.closest("[data-details]");
    if (details) return openDetails(details.dataset.details);

    const row = e.target.closest("[data-filter-value]");
    if (row) return addFilter(row.dataset.filterDim, row.dataset.filterValue);
  });

  page.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.dataset?.filterValue) {
      addFilter(e.target.dataset.filterDim, e.target.dataset.filterValue);
    }
  });

  function openDetails(group) {
    const dlg = document.querySelector("[data-details-dialog]");
    // every tab's rows, deduped by name, biggest first
    const rows = [...new Map(Object.values(BREAKDOWNS[group]).flat().map((r) => [r[0], r])).values()]
      .sort((a, b) => b[1] - a[1]);
    dlg.querySelector("[data-details-title]").textContent = `${group} — all ${rows.length}`;
    dlg.querySelector("[data-details-body]").innerHTML = table(group, rows);
    dlg.showModal();
  }

  document.querySelector("[data-details-dialog]").addEventListener("click", (e) => {
    const row = e.target.closest("[data-filter-value]");
    if (!row) return;
    document.querySelector("[data-details-dialog]").close();
    addFilter(row.dataset.filterDim, row.dataset.filterValue);
  });

  render();
  setInterval(() => {
    document.querySelector("[data-live]").innerHTML = `<span class="pulse-dot"></span> ${140 + (Date.now() / 1000 % 20 | 0)} online`;
  }, 5000);
}

/* --- sites list ---------------------------------------------------------- */

/* Real app: <img src="https://icons.duckduckgo.com/ip3/<domain>.ico"> with this
   lettered tile as the fallback for sites that have no icon or haven't loaded. */
function favicon(site) {
  return `<span class="fav" aria-hidden="true">${site.domain[0].toUpperCase()}</span>`;
}

function trendLabel(n) {
  if (n === 0) return `<span class="trend flat">no change</span>`;
  return `<span class="trend ${n > 0 ? "up" : "down"}">${n > 0 ? "▲" : "▼"} ${Math.abs(n)}%</span>`;
}

function initSites() {
  const list = document.querySelector("[data-sites]");
  const search = document.querySelector("[data-search]");
  const view = () => store.read().view || "grid";

  function card(s) {
    if (!s.live) {
      return `
        <div class="sitecard unfinished">
          <div class="sitecard-head">
            ${favicon(s)}
            <span class="sitecard-name">
              <strong>${s.name}</strong>
              <span class="muted">${s.domain}</span>
            </span>
            <span class="pill">not installed</span>
          </div>
          <p class="muted sitecard-note">No events received yet.</p>
          <a class="btn" href="setup.html?site=${s.id}">Finish setup</a>
        </div>`;
    }
    return `
      <a class="sitecard" href="analytics.html?site=${s.id}">
        <div class="sitecard-head">
          ${favicon(s)}
          <span class="sitecard-name">
            <strong>${s.name}</strong>
            <span class="muted">${s.domain}</span>
          </span>
          <span class="pill live"><i></i>${s.online}</span>
        </div>
        <div class="spark sitecard-spark"></div>
        <div class="sitecard-foot">
          <strong>${fmtNum(s.visitors)}</strong>
          <span class="muted">visitors · 7d</span>
          ${trendLabel(s.trend)}
        </div>
      </a>`;
  }

  function row(s) {
    return `
      <a class="siterow ${s.live ? "" : "unfinished"}" href="${s.live ? `analytics.html?site=${s.id}` : `setup.html?site=${s.id}`}">
        ${favicon(s)}
        <span class="siterow-name">
          <strong>${s.name}</strong>
          <span class="muted">${s.domain}</span>
        </span>
        ${s.live
          ? `<span class="spark"></span>
             <span class="siterow-num"><strong>${fmtNum(s.visitors)}</strong></span>
             ${trendLabel(s.trend)}
             <span class="pill live"><i></i>${s.online}</span>`
          : `<span class="pill">not installed</span>`}
      </a>`;
  }

  function render() {
    const q = (search?.value || "").trim().toLowerCase();
    const sites = store.sites().filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q)
    );

    document.querySelectorAll("[data-view]").forEach((b) =>
      b.classList.toggle("on", b.dataset.view === view())
    );

    if (!sites.length) {
      list.className = "";
      list.innerHTML = `
        <div class="box dash stack center" style="padding:48px 16px">
          <strong>No site matches “${q}”</strong>
          <p class="muted">Check the spelling, or clear the search.</p>
        </div>`;
      return;
    }

    list.className = view() === "grid" ? "sitegrid" : "sitelist";
    list.innerHTML = sites.map(view() === "grid" ? card : row).join("");
  }

  search?.addEventListener("input", render);
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      store.write({ view: b.dataset.view });
      render();
    })
  );

  wireNewSiteDialog();
  render();
}

/* shared by the default and empty states — both offer "add a site" */
function wireNewSiteDialog() {
  const dlg = document.querySelector("[data-new-site]");
  if (!dlg) return;

  document.querySelectorAll("[data-open-new]").forEach((b) =>
    b.addEventListener("click", () => { dlg.showModal(); dlg.querySelector("input").focus(); })
  );
  dlg.querySelector("[data-cancel]").addEventListener("click", () => dlg.close());

  dlg.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = dlg.querySelector("[name=name]").value.trim();
    const domain = dlg.querySelector("[name=domain]").value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const err = dlg.querySelector(".err");

    if (!name || !domain) { err.textContent = "Both fields are required."; return; }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) { err.textContent = "That doesn't look like a domain — try example.com"; return; }
    if (store.sites().some((s) => s.domain === domain)) { err.textContent = "You already track that domain."; return; }

    const id = "s" + Date.now();
    store.write({ sites: [...store.sites(), { id, name, domain, live: false }] });
    dlg.close();
    location.href = `setup.html?site=${id}`;
  });
}

/* --- setup --------------------------------------------------------------- */

const INSTALL = {
  script: {
    note: "Paste this before </head>. Nothing else to install.",
    code: (key, o) =>
      `<script defer src="https://cdn.pulse.dev/p.js"\n        data-site="${key}"${o}></` + `script>`,
  },
  npm: {
    note: "Install the package, then call init once at your app entry point.",
    code: (key, o) =>
      `npm i @pulse/analytics\n\nimport { pulse } from "@pulse/analytics";\n\npulse.init({\n  site: "${key}",${o}\n});`,
  },
  next: {
    note: "Add it to app/layout.tsx — next/script keeps it out of the bundle.",
    code: (key, o) =>
      `import Script from "next/script";\n\n<Script\n  defer\n  src="https://cdn.pulse.dev/p.js"\n  data-site="${key}"${o}\n/>`,
  },
  wp: {
    note: "Install the Pulse plugin, then paste the key into its settings field.",
    code: (key) => `Plugins → Add new → “Pulse Analytics”\n\nTracking key: ${key}`,
  },
};

/* Same stroke language as the sidebar rail: 20x20, fill none, round caps.
   The dots are a stroked path with round caps, so one rule styles all three. */
const VERIFY_MARK = {
  checking: `<path d="M10 3a7 7 0 1 1-6.9 5.7"/>`,
  live: `<path d="M5.6 10.3l3 3 5.9-6.6"/>`,
  waiting: `<path d="M5 10h.01M10 10h.01M15 10h.01"/>`,
};

const verifyMark = (status) =>
  `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${VERIFY_MARK[status]}</svg>`;

function initSetup() {
  const s = site();
  const key = "pls_" + s.id.slice(-6) + "x9f2";
  const state = { method: "script", opts: { hash: false, outbound: false, local: false } };

  const snippetEl = document.querySelector("[data-snippet]");
  document.querySelector("[data-key]").textContent = key;

  // the options are only worth showing because they change the code you copy
  function options() {
    const on = Object.entries(state.opts).filter(([, v]) => v).map(([k]) => k);
    if (!on.length) return "";
    if (state.method === "npm") {
      return on.map((k) => `\n  ${{ hash: "hashRouting", outbound: "outboundLinks", local: "countLocalhost" }[k]}: true,`).join("");
    }
    return on.map((k) => `\n        data-${k}`).join("");
  }

  function snippet() {
    return INSTALL[state.method].code(key, options());
  }

  function render() {
    document.querySelectorAll("[data-method]").forEach((b) =>
      b.classList.toggle("on", b.dataset.method === state.method)
    );
    document.querySelector("[data-method-note]").textContent = INSTALL[state.method].note;
    snippetEl.textContent = snippet();
    // WordPress takes no snippet flags, so hide controls that would do nothing
    document.querySelector("[data-options]").hidden = state.method === "wp";
  }

  document.querySelectorAll("[data-method]").forEach((b) =>
    b.addEventListener("click", () => { state.method = b.dataset.method; render(); })
  );
  document.querySelectorAll("[data-opt]").forEach((c) =>
    c.addEventListener("change", () => { state.opts[c.dataset.opt] = c.checked; render(); })
  );

  document.querySelector("[data-copy]").addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(snippet());
      toast("Copied");
    } catch {
      toast("Copy failed — select it and copy manually");
    }
    e.target.textContent = "Copied";
    setTimeout(() => (e.target.textContent = "Copy"), 1500);
  });

  /* verification: three states, and the check is a real async round trip
     so the pending state is visible rather than theoretical */
  const mark = document.querySelector("[data-verify-mark]");
  const title = document.querySelector("[data-verify-title]");
  const note = document.querySelector("[data-verify-note]");
  const checkBtn = document.querySelector("[data-check]");
  const goBtn = document.querySelector("[data-analytics-link]");
  goBtn.href = href("analytics.html");

  function show(status) {
    document.querySelector("[data-verify]").dataset.status = status;
    mark.innerHTML = verifyMark(status);
    if (status === "checking") {
      title.textContent = "Checking…";
      note.textContent = `Asking our collector about ${s.domain}`;
      checkBtn.disabled = true;
      goBtn.hidden = true;
      return;
    }
    checkBtn.disabled = false;
    if (status === "live") {
      title.textContent = "Receiving events";
      note.textContent = `Last event just now, from ${s.domain}`;
      goBtn.hidden = false;
      checkBtn.hidden = true;
    } else {
      title.textContent = "No events yet";
      note.textContent = `Nothing from ${s.domain}. Paste the snippet, deploy, then check again.`;
      goBtn.hidden = true;
      // a later check can go back to waiting — don't strand the button hidden
      checkBtn.hidden = false;
    }
  }

  function check() {
    show("checking");
    setTimeout(() => show(site().live ? "live" : "waiting"), 900);
  }

  checkBtn.addEventListener("click", check);
  render();
  check();

  // prototype shortcut: pretend the snippet went live
  if (!s.live) {
    const fake = document.createElement("button");
    fake.className = "btn scaffold";
    fake.title = "Prototype only — stands in for the snippet going live";
    fake.textContent = "Pretend an event arrived";
    fake.addEventListener("click", () => {
      store.write({ sites: store.sites().map((x) => (x.id === s.id ? { ...x, live: true } : x)) });
      fake.remove();
      check();
    });
    document.querySelector("[data-verify] .verify-actions").append(fake);
  }
}

/* --- site settings ------------------------------------------------------- */

function initSettings() {
  const s = site();
  const form = document.querySelector("[data-site-form]");
  const fields = form.elements;
  const saveBtn = form.querySelector("[data-save]");
  const revertBtn = form.querySelector("[data-revert]");
  const dirtyNote = form.querySelector("[data-dirty]");
  const err = form.querySelector(".err");

  const fill = () => {
    fields.name.value = s.name;
    fields.domain.value = s.domain;
  };
  fill();

  // nothing to save until something differs from what is stored
  function syncDirty() {
    const dirty = fields.name.value.trim() !== s.name || fields.domain.value.trim() !== s.domain;
    saveBtn.disabled = !dirty;
    revertBtn.disabled = !dirty;
    dirtyNote.hidden = !dirty;
  }
  form.addEventListener("input", syncDirty);

  revertBtn.addEventListener("click", () => { fill(); err.textContent = ""; syncDirty(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = fields.name.value.trim();
    const domain = fields.domain.value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!name || !domain) { err.textContent = "Both fields are required."; return; }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) { err.textContent = "That doesn't look like a domain — try example.com"; return; }
    if (store.sites().some((x) => x.domain === domain && x.id !== s.id)) { err.textContent = "Another site already uses that domain."; return; }

    err.textContent = "";
    store.write({ sites: store.sites().map((x) => (x.id === s.id ? { ...x, name, domain } : x)) });
    s.name = name;
    s.domain = domain;
    fill();
    syncDirty();
    toast("Saved");
  });

  /* preferences save on change — no second Save button to hunt for */
  const prefs = () => store.read().prefs?.[s.id] || { dnt: true, excludeSelf: false, publicDash: false, tz: "UTC" };
  const setPref = (k, v) => {
    const all = store.read().prefs || {};
    store.write({ prefs: { ...all, [s.id]: { ...prefs(), [k]: v } } });
  };

  const share = document.querySelector("[data-share]");
  document.querySelector("[data-share-link]").textContent = `pulse.dev/p/${s.id}`;

  document.querySelectorAll("[data-pref]").forEach((el) => {
    const k = el.dataset.pref;
    if (el.type === "checkbox") el.checked = !!prefs()[k];
    else el.value = prefs()[k];
    if (k === "publicDash") share.hidden = !prefs()[k];

    el.addEventListener("change", () => {
      const v = el.type === "checkbox" ? el.checked : el.value;
      setPref(k, v);
      if (k === "publicDash") share.hidden = !v;
      toast("Saved");
    });
  });

  /* tracking key */
  const keyEl = document.querySelector("[data-key]");
  keyEl.textContent = "pls_" + s.id.slice(-6) + "x9f2";

  document.querySelector("[data-copy-key]").addEventListener("click", () => {
    navigator.clipboard?.writeText(keyEl.textContent);
    toast("Key copied");
  });
  document.querySelector("[data-copy-share]").addEventListener("click", () => {
    navigator.clipboard?.writeText(document.querySelector("[data-share-link]").textContent);
    toast("Link copied");
  });

  const regen = document.querySelector("[data-regen-dialog]");
  document.querySelector("[data-regen]").addEventListener("click", () => regen.showModal());
  regen.querySelector("[data-cancel]").addEventListener("click", () => regen.close());
  regen.querySelector("[data-confirm]").addEventListener("click", () => {
    keyEl.textContent = "pls_" + Math.random().toString(36).slice(2, 12);
    regen.close();
    toast("New key issued — update the snippet on your site");
  });

  /* delete, gated on typing the domain */
  const del = document.querySelector("[data-delete-dialog]");
  const confirmBtn = del.querySelector("[data-confirm]");
  const input = del.querySelector("input");
  del.querySelector("[data-domain-echo]").textContent = s.domain;
  confirmBtn.disabled = true;

  document.querySelector("[data-delete]").addEventListener("click", () => del.showModal());
  del.querySelector("[data-cancel]").addEventListener("click", () => del.close());
  input.addEventListener("input", () => (confirmBtn.disabled = input.value.trim() !== s.domain));
  confirmBtn.addEventListener("click", () => {
    store.write({ sites: store.sites().filter((x) => x.id !== s.id) });
    location.href = "sites.html";
  });
}

/* --- account ------------------------------------------------------------- */

function initAccount() {
  const u = store.user();
  const profile = document.querySelector("[data-profile]");
  const p = profile.elements;
  p.name.value = u.name;
  p.email.value = u.email;

  profile.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = profile.querySelector(".err");
    if (!/^\S+@\S+\.\S+$/.test(p.email.value)) { err.textContent = "That email address isn't valid."; return; }
    err.textContent = "";
    store.write({ user: { name: p.name.value.trim(), email: p.email.value.trim() } });
    toast("Profile saved");
  });

  const pw = document.querySelector("[data-password]");
  const pf = pw.elements;
  pw.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = pw.querySelector(".err");
    if (pf.next.value.length < 10) { err.textContent = "Use at least 10 characters."; return; }
    if (pf.next.value !== pf.repeat.value) { err.textContent = "The two new passwords don't match."; return; }
    err.textContent = "";
    pw.reset();
    toast("Password changed");
  });

  document.querySelector("[data-reset]").addEventListener("click", () => {
    localStorage.removeItem(KEY);
    location.href = "sites.html";
  });
}

/* --- boot ---------------------------------------------------------------- */

({
  analytics: initAnalytics,
  sites: initSites,
  "sites-empty": wireNewSiteDialog,
  setup: initSetup,
  settings: initSettings,
  account: initAccount,
})[document.body.dataset.page]?.();

// ?selftest=1 — the smallest check that the number plumbing still works
if (params.get("selftest")) {
  console.assert(fmtNum(12480) === "12.5k", "fmtNum");
  console.assert(fmtDuration(134) === "2m 14s", "fmtDuration");
  console.assert(series("visitors", "7d", []).length === 7, "series length follows range");
  console.assert(total("visitors", "30d", []) > total("visitors", "7d", []), "longer range, bigger total");
  console.assert(total("visitors", "7d", [1]) < total("visitors", "7d", []), "filters narrow the total");
  console.log("selftest done");
}
