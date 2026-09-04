/* Silhouette generator for the v12 family.
 *
 * v12 stacked one shape at four opacities, which reads as a single form
 * behind tracing paper. Real depth comes from tone: each layer gets its
 * own colour, stepping from the ground toward the sky, so the ranges sit
 * behind one another rather than through one another.
 *
 * `sharp` is the lever between the two readings. Wide bumps give rolling
 * ranges, narrow ones give something unmistakably plotted. */
export type Layer = { d: string; fill: string };

function rand(seed: number, i: number) {
  let t = (seed + i * 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function ridgePath({
  seed,
  base,
  amp,
  w,
  h,
  bumps = 4,
  sharp = 1,
  pts = 60,
}: {
  seed: number;
  base: number;
  amp: number;
  w: number;
  h: number;
  bumps?: number;
  sharp?: number;
  pts?: number;
}) {
  /* one wide bump anchors the range so it has a main peak, the rest vary */
  const set = Array.from({ length: bumps }, (_, k) => ({
    m: 0.02 + rand(seed, k * 7 + 1) * 0.96,
    s: (0.05 + rand(seed, k * 7 + 2) * 0.1) * sharp,
    a: 0.34 + rand(seed, k * 7 + 3) * 0.66,
  }));

  const ys = Array.from({ length: pts }, (_, i) => {
    const x = i / (pts - 1);
    let v = 0;
    for (const b of set) v += b.a * Math.exp(-Math.pow((x - b.m) / b.s, 2));
    return v;
  });

  const peak = Math.max(...ys, 0.001);
  const p = ys.map<[number, number]>((v, i) => [
    (i / (pts - 1)) * w,
    base - (v / peak) * amp,
  ]);

  let d = `M0,${h} L${p[0][0].toFixed(0)},${p[0][1].toFixed(0)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    d +=
      ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(0)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(0)}` +
      ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(0)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(0)}` +
      ` ${p2[0].toFixed(0)},${p2[1].toFixed(0)}`;
  }
  return `${d} L${w},${h} Z`;
}

/** Tonal ramp from a far colour to a near one, in oklch so the steps are
 *  perceptually even rather than bunching in the middle. */
export function ramp(
  n: number,
  from: [number, number, number],
  to: [number, number, number]
) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    const c = from.map((v, k) => v + (to[k] - v) * t);
    return `oklch(${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(1)})`;
  });
}
