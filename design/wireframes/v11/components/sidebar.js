/* <pulse-sidebar> — account-level navigation, identical on every page.
   Per-site pages (Analytics / Setup / Settings) are tabs in <pulse-topbar>;
   they need a site, so they don't belong in a global rail.
   Fourth field "soon": shown so the shape of the product reads, but inert. */

(() => {
  const icon = (d) =>
    `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${d}</svg>`;

  const ICONS = {
    sites: icon(`<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a11 11 0 0 1 0 14a11 11 0 0 1 0-14"/>`),
    docs: icon(`<path d="M5 3h7l3 3v11H5z"/><path d="M8 9h5M8 12h5"/>`),
    ai: icon(`<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z"/>`),
    billing: icon(`<rect x="3" y="5" width="14" height="10" rx="2"/><path d="M3 9h14"/>`),
    account: icon(`<circle cx="10" cy="7.5" r="3"/><path d="M4.5 16a5.5 5.5 0 0 1 11 0"/>`),
  };

  const NAV = [
    ["sites.html", "Sites", ICONS.sites],
    ["docs.html", "Docs", ICONS.docs],
    ["ai.html", "AI analytics", ICONS.ai, "soon"],
    ["billing.html", "Billing", ICONS.billing, "soon"],
  ];

  const FOOT = ["account.html", "Account", ICONS.account];

  // site pages sit under Sites, so Sites stays lit while you're inside one
  const SITE_PAGES = ["analytics.html", "setup.html", "settings.html"];

  class PulseSidebar extends HTMLElement {
    connectedCallback() {
      // state variants resolve to their base page, so nav highlighting stays put
      const here = (location.pathname.split("/").pop() || "sites.html")
        .replace(/-(empty|loading)\.html$/, ".html");

      const isOn = (page) =>
        here === page || (page === "sites.html" && SITE_PAGES.includes(here));

      const item = ([page, label, svg, soon]) =>
        soon
          ? `<span class="nav-link soon" aria-disabled="true">${svg}<span>${label}</span><i>soon</i></span>`
          : `<a href="${page}" class="nav-link ${isOn(page) ? "on" : ""}"
               ${isOn(page) ? 'aria-current="page"' : ""}>${svg}<span>${label}</span></a>`;

      this.id = "pulse-nav";
      this.className = "box sidebar stack";
      this.innerHTML = `
        <a href="sites.html" class="brand" aria-label="Pulse — all sites">
          <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false">
            <polyline points="1,11 5,11 8,3 12,14 15,8 18,8 20,5 23,5"
                      fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <strong>Pulse</strong>
        </a>

        <nav class="rail">${NAV.map(item).join("")}</nav>

        <div style="flex: 1"></div>

        <nav class="rail">${item(FOOT)}</nav>`;
    }
  }

  customElements.define("pulse-sidebar", PulseSidebar);

  /* --- open/collapse ------------------------------------------------------
     One floating control for both breakpoints: on desktop the rail leaves the
     grid, on mobile it slides in over the page. This is a multi-page
     prototype, so the choice is stored — otherwise every link reopens it.
     Mobile always starts closed: a drawer covering the page on load is wrong. */

  const NAV_KEY = "pulse.v11.nav";
  const isMobile = () => matchMedia("(max-width: 760px)").matches;

  const setNav = (open) => {
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    localStorage.setItem(NAV_KEY, open ? "1" : "0");
  };

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "navtoggle";
  toggle.setAttribute("aria-label", "Toggle navigation");
  toggle.setAttribute("aria-controls", "pulse-nav");
  toggle.innerHTML = "<i></i><i></i><i></i>";
  toggle.addEventListener("click", () =>
    setNav(!document.body.classList.contains("nav-open"))
  );

  const scrim = document.createElement("div");
  scrim.className = "nav-scrim";
  scrim.addEventListener("click", () => setNav(false));

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMobile()) setNav(false);
  });

  // on mobile the drawer sits over the page, so following a link must close it
  addEventListener("click", (e) => {
    if (isMobile() && e.target.closest("pulse-sidebar a")) setNav(false);
  });

  addEventListener("DOMContentLoaded", () => {
    document.body.append(scrim, toggle);
    setNav(isMobile() ? false : localStorage.getItem(NAV_KEY) !== "0");
  });
})();
