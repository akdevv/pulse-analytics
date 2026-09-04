/* <site-tabs> — Analytics / Setup / Settings for the current site.
   Lives in the page, under the top bar: it navigates content, not chrome.
   IIFE-scoped so its names can't collide with the other component scripts. */

(() => {
  const TABS = [
    ["analytics.html", "Analytics"],
    ["setup.html", "Setup"],
    ["settings.html", "Settings"],
  ];

  class SiteTabs extends HTMLElement {
    connectedCallback() {
      const here = (location.pathname.split("/").pop() || "")
        .replace(/-(empty|loading)\.html$/, ".html");
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
      if (!site) return;

      this.className = "site-tabs";
      this.setAttribute("role", "navigation");
      this.setAttribute("aria-label", "Site sections");
      this.innerHTML = TABS.map(
        ([page, label]) =>
          `<a href="${page}?site=${site.id}" class="${here === page ? "on" : ""}"
              ${here === page ? 'aria-current="page"' : ""}>${label}</a>`
      ).join("");
    }
  }

  customElements.define("site-tabs", SiteTabs);
})();
