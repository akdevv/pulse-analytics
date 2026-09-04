/* Floating state switcher — scaffolding, not product UI.
   Every page can exist in three states; this jumps between the ones that exist.
   Add a family here when its state files are built. */

(() => {
  const STATES = {
    sites: ["sites.html", "sites-empty.html", "sites-loading.html"],
    analytics: ["analytics.html", "analytics-empty.html", "analytics-loading.html"],
  };

  const LABEL = { "": "default", empty: "empty", loading: "loading" };

  const here = location.pathname.split("/").pop() || "sites.html";
  const family = here.replace(/\.html$/, "").split("-")[0];
  const pages = STATES[family];
  if (!pages) return;

  const bar = document.createElement("nav");
  bar.className = "statebar";
  bar.setAttribute("aria-label", "Page state");
  bar.innerHTML =
    `<span>${family}</span>` +
    pages
      .map((page) => {
        const variant = page.replace(/\.html$/, "").split("-")[1] || "";
        return `<a href="${page}" class="${page === here ? "on" : ""}">${LABEL[variant]}</a>`;
      })
      .join("");

  addEventListener("DOMContentLoaded", () => document.body.append(bar));
})();
