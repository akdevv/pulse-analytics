/* Builds the page comps. Chart geometry is computed from the real payload so
   every screen shows the same true numbers. */
import { readFileSync, writeFileSync } from "node:fs";
import { pages } from "./pages.mjs";

const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const OUT = import.meta.dirname;
const W = 1000, H = 300;

const compact = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : n.toLocaleString("en-US");
const host = (u) => {
  if (!u || u === "Direct") return "Direct";
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
};

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

const pv = d.timeseries.map((p) => p.pageviews);
const se = d.timeseries.map((p) => p.sessions);

/* A round step with headroom, so the top gridline is a number a person would
   say. The axis labels are then positioned from the same scale the path uses —
   they were laid out over the container instead, which is why they never
   lined up with the plot. */
const niceScale = (max) => {
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return { yMax: step * 4, ticks: [4, 3, 2, 1, 0].map((i) => step * i) };
};
const { yMax, ticks } = niceScale(Math.max(...pv));
const pts = (vals) => vals.map((v, i) => [(i / (vals.length - 1)) * W, (1 - v / yMax) * H]);
const LINE = smooth(pts(pv)), LINE2 = smooth(pts(se));

const spark = (vals, w = 86, h = 24) => {
  const max = Math.max(...vals) * 1.12;
  return smooth(vals.map((v, i) => [(i / (vals.length - 1)) * w, (1 - v / max) * h]));
};
// Mean over each block, not every nth sample: picking one hour in four keeps
// the noise and loses the trend, which is the opposite of a sparkline's job.
const blocks = (a, size) => {
  const out = [];
  for (let i = 0; i < a.length; i += size) {
    const s = a.slice(i, i + size);
    out.push(s.reduce((x, y) => x + y, 0) / s.length);
  }
  return out;
};

// One label per day, taken at the midnight bucket — an hourly axis was
// printing the same hour seven times, and the first label twice.
const dayTicks = [];
d.timeseries.forEach((p, i) => {
  const at = new Date(p.time);
  if (at.getHours() === 0 && i > 2 && i < d.timeseries.length - 2)
    dayTicks.push({ x: (i / (d.timeseries.length - 1)) * 100, label: at.toLocaleDateString("en", { month: "short", day: "numeric" }) });
});

const rows = (items, key, val) => {
  const max = Math.max(...items.map(val));
  const total = items.reduce((s, x) => s + val(x), 0);
  return items.map((r) => ({ label: key(r), value: val(r), share: val(r) / max, pct: ((val(r) / total) * 100).toFixed(1) }));
};

const ctx = {
  O: d.overview,
  chartSvg: `<svg class="plot" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((t) => `<line x1="0" x2="${W}" y1="${((1 - t / yMax) * H).toFixed(1)}" y2="${((1 - t / yMax) * H).toFixed(1)}" stroke="var(--ink)" stroke-opacity="0.05" vector-effect="non-scaling-stroke"/>`).join("")}
    <path d="${LINE} L${W},${H} L0,${H} Z" fill="url(#g)"/>
    <path d="${LINE2}" fill="none" stroke="var(--powder)" stroke-opacity="0.42" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
    <path d="${LINE}" fill="none" stroke="var(--accent)" stroke-width="1.7" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
  </svg>`,
  yTicks: ticks.map((t) => ({ y: (1 - t / yMax) * 100, label: compact(t) })),
  dayTicks,
  SPARK_PV: spark(blocks(pv, 6)),
  SPARK_SE: spark(blocks(se, 6)),
  SPARK_VI: spark(blocks(pv, 6).map((v, i) => v * (0.72 + ((i * 7) % 11) / 32))),
  PAGES: rows(d.pages.slice(0, 8), (r) => r.page, (r) => r.pageviews),
  REFS: rows(d.referrers.slice(0, 8), (r) => host(r.source), (r) => r.pageviews),
  GEO: rows(d.geo.slice(0, 8), (r) => r.country, (r) => r.pageviews),
  DEV: rows(d.devices.devices, (r) => r.device, (r) => r.pageviews),
  EVT: rows(d.events.slice(0, 5), (r) => r.eventName, (r) => r.count),
};

for (const [name, fn] of Object.entries(pages)) {
  writeFileSync(`${OUT}/${name}.html`, fn(ctx));
  console.log("built", name);
}
