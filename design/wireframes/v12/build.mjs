/* Builds the v12 comps from the real analytics payload, so the three options
   are compared on the same true numbers rather than on invented ones. */
import { readFileSync, writeFileSync } from "node:fs";

const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const OUT = import.meta.dirname;

const int = (n) => n.toLocaleString("en-US");
const compact = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : int(n);
const host = (u) => {
  if (!u || u === "Direct") return "Direct";
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

/* ── chart geometry ─────────────────────────────────────────── */
const W = 1000, H = 260;
const pv = d.timeseries.map((p) => p.pageviews);
const se = d.timeseries.map((p) => p.sessions);
const yMax = Math.max(...pv) * 1.12;

const pts = (vals, w = W, h = H) =>
  vals.map((v, i) => [(i / (vals.length - 1)) * w, (1 - v / yMax) * h]);

// Catmull-Rom to cubic: a polyline with round joins is what gives a fake
// chart away, and a real one deserves the same care.
const smooth = (p) => {
  let s = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    s += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}` +
         ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}` +
         ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return s;
};
const LINE = smooth(pts(pv));
const LINE2 = smooth(pts(se));
const AREA = `${LINE} L${W},${H} L0,${H} Z`;

const spark = (vals, w = 92, h = 26) => {
  const max = Math.max(...vals) * 1.1;
  const p = vals.map((v, i) => [(i / (vals.length - 1)) * w, (1 - v / max) * h]);
  return smooth(p);
};
const every = (arr, n) => arr.filter((_, i) => i % n === 0);
const SPARK_PV = spark(every(pv, 4));
const SPARK_SE = spark(every(se, 4));
const SPARK_VI = spark(every(pv, 5).map((v, i) => v * (0.7 + ((i * 7) % 11) / 30)));

// Day boundaries, so the axis names days once each instead of repeating an
// hour label seven times.
const dayTicks = [];
d.timeseries.forEach((p, i) => {
  const at = new Date(p.time);
  if (at.getHours() === 0 || i === 0)
    dayTicks.push({ x: (i / (d.timeseries.length - 1)) * 100, label: at.toLocaleDateString("en", { month: "short", day: "numeric" }) });
});

const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
  y: (1 - f) * 100,
  label: compact(Math.round(yMax * f)),
}));

/* ── row lists ──────────────────────────────────────────────── */
const rows = (items, key, val, max) =>
  items.map((r) => ({
    label: key(r),
    value: val(r),
    share: val(r) / max,
    pct: ((val(r) / items.reduce((s, x) => s + val(x), 0)) * 100).toFixed(1),
  }));

const PAGES = rows(d.pages.slice(0, 7), (r) => r.page, (r) => r.pageviews, d.pages[0].pageviews);
const REFS = rows(d.referrers.slice(0, 7), (r) => host(r.source), (r) => r.pageviews, d.referrers[0].pageviews);
const GEO = rows(d.geo.slice(0, 7), (r) => r.country, (r) => r.pageviews, d.geo[0].pageviews);
const DEV = rows(d.devices.devices, (r) => r.device, (r) => r.pageviews, d.devices.devices[0].pageviews);
const BROW = rows(d.devices.browsers.slice(0, 7), (r) => r.browser, (r) => r.pageviews, d.devices.browsers[0].pageviews);
const EVT = rows(d.events.slice(0, 5), (r) => r.eventName, (r) => r.count, d.events[0].count);

const O = d.overview;
export const ctx = {
  int, compact, LINE, LINE2, AREA, W, H, dayTicks, yTicks,
  SPARK_PV, SPARK_SE, SPARK_VI, PAGES, REFS, GEO, DEV, BROW, EVT, O,
};

const { comps } = await import("./comps.mjs");
for (const [name, html] of Object.entries(comps(ctx))) {
  writeFileSync(`${OUT}/${name}.html`, html);
  console.log("built", name);
}
