/* <pulse-topbar> — thin bar at the top of the content column.
   Says where you are (breadcrumbs) and holds page-level actions passed in as
   children, e.g. <pulse-topbar><button slot-actions>…</button></pulse-topbar>. */

(() => {
  const TITLES = {
    "sites.html": "All sites",
    "analytics.html": "Analytics",
    "ai.html": "AI analytics",
    "setup.html": "Setup",
    "settings.html": "Settings",
    "billing.html": "Billing",
    "docs.html": "Docs",
    "account.html": "Account",
  };

  // pages that belong to one site: they get breadcrumbs through the site, and tabs
  const SITE_PAGES = ["analytics.html", "setup.html", "settings.html"];

  class PulseTopbar extends HTMLElement {
    connectedCallback() {
      // state variants (sites-empty, sites-loading) are the same page to the
      // chrome — the bar must not change shape just because the data is missing
      const file = location.pathname.split("/").pop() || "sites.html";
      const here = file.replace(/-(empty|loading)\.html$/, ".html");
      const stored = (() => {
        try {
          return JSON.parse(localStorage.getItem("pulse.v11")) || {};
        } catch {
          return {};
        }
      })();

      const sites = stored.sites || [];
      const id = new URLSearchParams(location.search).get("site");
      const site = sites.find((s) => s.id === id) || sites[0];

      // whatever the page put inside stays, on the right
      const actions = this.innerHTML;

      // On site pages the trail stops at the site — the tabs below say which page,
      // so repeating it as a crumb would name the same thing twice.
      const crumbs =
        SITE_PAGES.includes(here) && site
          ? [`<a href="sites.html">Sites</a>`, `<span>${site.name}</span>`]
          : [`<span>${TITLES[here] || "Pulse"}</span>`];

      // Section tabs live in the page as <site-tabs>. The bar is where-am-I only.
      this.className = "pagebar";
      this.innerHTML = `
        <div class="pagebar-top">
          <nav class="crumbs" aria-label="Breadcrumb">${crumbs.join('<i aria-hidden="true">/</i>')}</nav>
          <span style="flex:1"></span>
          <span class="row pagebar-actions">${actions}</span>
        </div>`;
    }
  }

  customElements.define("pulse-topbar", PulseTopbar);
})();
