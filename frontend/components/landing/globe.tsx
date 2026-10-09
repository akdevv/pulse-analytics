"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LAND_DOTS } from "./land-dots";
import { useReducedMotion } from "./motion";

const RAD = Math.PI / 180;

// Where demo pageviews come from: [lat, lon, country].
const CITIES: [number, number, string][] = [
  [52.5, 13.4, "DE"],
  [48.9, 2.35, "FR"],
  [51.5, -0.13, "GB"],
  [40.7, -74, "US"],
  [37.8, -122.4, "US"],
  [41.9, -87.6, "US"],
  [43.7, -79.4, "CA"],
  [19.4, -99.1, "MX"],
  [-23.5, -46.6, "BR"],
  [-34.6, -58.4, "AR"],
  [28.6, 77.2, "IN"],
  [19.1, 72.9, "IN"],
  [12.97, 77.6, "IN"],
  [35.7, 139.7, "JP"],
  [37.6, 127, "KR"],
  [1.35, 103.8, "SG"],
  [-33.9, 151.2, "AU"],
  [52.4, 4.9, "NL"],
  [59.3, 18.1, "SE"],
  [40.4, -3.7, "ES"],
  [6.5, 3.4, "NG"],
  [-1.3, 36.8, "KE"],
  [30.0, 31.2, "EG"],
  [25.2, 55.3, "AE"],
];
const PATHS = ["/", "/pricing", "/docs", "/blog", "/changelog", "/docs/events"];

// The arcs' destination. Deliberately unnamed: it stands for "the ingest API".
const INGEST: [number, number] = [50.1, 8.7];

const BEATS = [
  {
    rate: "1 / s",
    title: "One pageview.",
    body: "A visitor in Berlin opens your pricing page. One GET request, one 204 back.",
  },
  {
    rate: "100s / s",
    title: "A launch day.",
    body: "Traffic spikes from every timezone. The queue soaks it up, so the database never sees the spike.",
  },
  {
    rate: "10,000 / s",
    title: "Ridiculous scale.",
    body: "Ten thousand events a second is the design target for the ingest path. The load test is still to come.",
  },
];

type Vec = [number, number, number];
type Ping = { v: Vec; age: number; arc: boolean; label?: string };

const toVec = (lat: number, lon: number): Vec => [
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
];

function decodeLand(): Vec[] {
  const bin = atob(LAND_DOTS);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const nums = new Int16Array(bytes.buffer);
  const out: Vec[] = [];
  for (let i = 0; i < nums.length; i += 2)
    out.push(toVec(nums[i] / 10, nums[i + 1] / 10));
  return out;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function Globe() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const [stats, setStats] = useState({ rate: 1, total: 0 });

  useEffect(() => {
    const root = section.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!root || !cv || !ctx) return;

    const land = decodeLand();
    const ingest = toVec(...INGEST);
    const pings: Ping[] = [];
    let raf = 0;
    let last = performance.now();
    let spin = 0;
    let spawn = 0;
    let total = 48245;
    let lastStats = 0;
    let visible = false;
    const buckets: number[][] = [[], [], [], []];

    const progress = () => {
      if (reduced) return 0.62;
      const r = root.getBoundingClientRect();
      const run = root.offsetHeight - window.innerHeight;
      return run > 0 ? clamp(-r.top / run) : 0;
    };

    function frame(now: number) {
      if (!cv || !ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = progress();

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (
        cv.width !== Math.round(w * dpr) ||
        cv.height !== Math.round(h * dpr)
      ) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Camera: the globe starts small on the right and grows to fill the
      // lower half of the frame as the section scrolls.
      const k = ease(p);
      const wide = w >= 900;
      const R = Math.min(w, h) * lerp(wide ? 0.34 : 0.36, wide ? 0.92 : 0.7, k);
      const cx = w * lerp(wide ? 0.68 : 0.5, 0.5, k);
      const cy = h * lerp(wide ? 0.52 : 0.56, wide ? 1.02 : 0.74, k);
      spin += dt * (reduced ? 0 : 0.06);
      // Drift freely at first, then settle with the ingest point centred.
      const lon0 = -INGEST[1] * RAD + (1 - k) * (spin - 0.55);
      const tilt = lerp(0.42, 0.62, k);
      const cl = Math.cos(lon0);
      const sl = Math.sin(lon0);
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);

      const project = (v: Vec, lift = 1) => {
        const x = (v[0] * cl + v[2] * sl) * lift;
        const z = (-v[0] * sl + v[2] * cl) * lift;
        const y = v[1] * lift;
        const y2 = y * ct - z * st;
        const z2 = y * st + z * ct;
        return [cx + x * R, cy - y2 * R, z2] as const;
      };

      // Atmosphere rim.
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
      halo.addColorStop(0, "rgb(242 106 46 / 0.10)");
      halo.addColorStop(1, "rgb(242 106 46 / 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();
      // Sphere body, lit from the upper left, then a thin limb light.
      const body = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        R * 0.1,
        cx,
        cy,
        R
      );
      body.addColorStop(0, "rgb(40 38 36)");
      body.addColorStop(1, "rgb(17 17 17)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      const limb = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      limb.addColorStop(0, "rgb(247 162 107 / 0.55)");
      limb.addColorStop(0.5, "rgb(247 162 107 / 0.08)");
      limb.addColorStop(1, "rgb(247 162 107 / 0)");
      ctx.strokeStyle = limb;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // Land dots, bucketed by depth so each bucket is one fill colour.
      for (const b of buckets) b.length = 0;
      for (const v of land) {
        const [x, y, z] = project(v);
        if (z <= 0 || y < -4 || y > h + 4 || x < -4 || x > w + 4) continue;
        buckets[Math.min(3, Math.floor(z * 4))].push(x, y);
      }
      const size = Math.max(1.3, R / 300);
      buckets.forEach((b, i) => {
        ctx.fillStyle = `rgb(229 227 210 / ${0.18 + i * 0.16})`;
        for (let j = 0; j < b.length; j += 2)
          ctx.fillRect(b[j] - size / 2, b[j + 1] - size / 2, size, size);
      });

      // Event rate climbs from 1/s to 10,000/s across the section.
      const rate = reduced
        ? 400
        : Math.round(10 ** (4 * clamp((p - 0.12) / 0.7)));
      if (!reduced) {
        spawn += dt * Math.min(70, 0.9 * rate ** 0.47);
        total += rate * dt;
      }
      while (spawn >= 1 && pings.length < 140) {
        spawn -= 1;
        // While the rate is tiny, every ping is the Berlin visit from beat one.
        const [lat, lon, cc] =
          rate < 3
            ? CITIES[0]
            : CITIES[Math.floor(Math.random() * CITIES.length)];
        pings.push({
          v: toVec(
            lat + (Math.random() - 0.5) * 4,
            lon + (Math.random() - 0.5) * 4
          ),
          age: 0,
          arc: pings.length < 60,
          label:
            rate < 3
              ? "DE /pricing"
              : rate < 30 || Math.random() < 0.05
                ? `${cc} ${PATHS[Math.floor(Math.random() * PATHS.length)]}`
                : undefined,
        });
      }
      if (reduced && pings.length === 0) {
        for (let i = 0; i < 40; i++) {
          const [lat, lon] = CITIES[i % CITIES.length];
          pings.push({ v: toVec(lat, lon), age: (i % 10) / 10, arc: i < 18 });
        }
      }

      ctx.lineCap = "round";
      for (let i = pings.length - 1; i >= 0; i--) {
        const pg = pings[i];
        if (!reduced) pg.age += dt / 1.4;
        if (pg.age > 1) {
          pings.splice(i, 1);
          continue;
        }
        const [px, py, pz] = project(pg.v);

        if (pg.arc) {
          // Great-circle arc to ingest, lifted off the surface.
          const head = clamp(pg.age / 0.55);
          const tail = clamp((pg.age - 0.3) / 0.55);
          const dot =
            pg.v[0] * ingest[0] + pg.v[1] * ingest[1] + pg.v[2] * ingest[2];
          const om = Math.acos(Math.min(1, Math.max(-1, dot)));
          const so = Math.sin(om) || 1;
          ctx.beginPath();
          let started = false;
          for (let s = 0; s <= 18; s++) {
            const t = lerp(tail, head, s / 18);
            const a = Math.sin((1 - t) * om) / so;
            const b = Math.sin(t * om) / so;
            const v: Vec = [
              pg.v[0] * a + ingest[0] * b,
              pg.v[1] * a + ingest[1] * b,
              pg.v[2] * a + ingest[2] * b,
            ];
            const [ax, ay, az] = project(
              v,
              1 + Math.sin(Math.PI * t) * (0.06 + om * 0.12)
            );
            if (az < -0.05) {
              started = false;
              continue;
            }
            if (started) ctx.lineTo(ax, ay);
            else ctx.moveTo(ax, ay);
            started = true;
          }
          ctx.strokeStyle = `rgb(247 162 107 / ${0.75 * (1 - pg.age)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        if (pz > 0) {
          const ring = 2 + pg.age * 16;
          ctx.strokeStyle = `rgb(242 106 46 / ${1 - pg.age})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, ring, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#f7a26b";
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
          if (pg.label && pg.age < 0.8) {
            ctx.font = '500 11px "JetBrains Mono", monospace';
            ctx.fillStyle = `rgb(229 227 210 / ${0.85 * (1 - pg.age / 0.8)})`;
            ctx.fillText(pg.label, px + 8, py - 8);
          }
        }
      }

      // The ingest point.
      const [ix, iy, iz] = project(ingest);
      if (iz > 0) {
        const pulse = (now / 900) % 1;
        ctx.strokeStyle = `rgb(242 106 46 / ${0.8 * (1 - pulse)})`;
        ctx.beginPath();
        ctx.arc(ix, iy, 5 + pulse * 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f26a2e";
        ctx.fillRect(ix - 3.5, iy - 3.5, 7, 7);
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = "rgb(229 227 210 / 0.8)";
        ctx.fillText("ingest · 204", ix + 10, iy + 4);
      }

      if (now - lastStats > 120) {
        lastStats = now;
        setStats({ rate, total: Math.round(total) });
        setBeat(p < 0.36 ? 0 : p < 0.66 ? 1 : 2);
      }

      if (visible && !reduced) raf = requestAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    observer.observe(root);
    if (reduced) frame(performance.now());

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section
      ref={section}
      aria-labelledby="globe-title"
      className={cn("relative", reduced ? "" : "h-[340vh]")}
    >
      <div
        className={cn(
          "relative h-svh min-h-[560px] overflow-hidden",
          !reduced && "sticky top-0"
        )}
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 size-full"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-charcoal to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-charcoal via-charcoal/70 to-transparent md:h-2/5 md:via-charcoal/30"
        />

        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-between px-5 pt-24 pb-10 sm:px-6 md:pt-28">
          <div className="max-w-xl">
            <p className="mb-4 flex items-center gap-2 text-[13px] text-ink/55">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-tangerine opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-tangerine" />
              </span>
              Live view · demo data
            </p>
            <h2
              id="globe-title"
              className="font-display text-[36px] leading-[0.98] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-[52px] lg:text-[60px]"
            >
              Every dot is a pageview.{" "}
              <span className="text-ink/35">None of them is a person.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-h-[132px] max-w-md">
              {BEATS.map((b, i) => (
                <div
                  key={b.title}
                  aria-hidden={!reduced && i !== beat}
                  className={cn(
                    "transition-[opacity,translate,filter] duration-500 ease-out",
                    reduced
                      ? "mb-4"
                      : cn(
                          "absolute inset-x-0 bottom-0",
                          i === beat
                            ? "translate-y-0 opacity-100"
                            : "pointer-events-none translate-y-3 opacity-0 blur-[3px]"
                        )
                  )}
                >
                  <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                    {b.rate}
                  </p>
                  <p className="mt-1.5 font-display text-[24px] leading-tight font-semibold tracking-display text-ink sm:text-[28px]">
                    {b.title}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-pretty text-ink/60">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>

            <dl className="flex gap-10 md:justify-end md:text-right">
              <div>
                <dt className="text-[12.5px] text-ink/45">Events per second</dt>
                <dd className="mt-1 font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums sm:text-[48px]">
                  {stats.rate.toLocaleString("en-US")}
                </dd>
              </div>
              <div>
                <dt className="text-[12.5px] text-ink/45">Today</dt>
                <dd className="mt-1 font-display text-[40px] leading-none font-semibold tracking-[-0.03em] text-ink/70 tabular-nums sm:text-[48px]">
                  {stats.total.toLocaleString("en-US")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
