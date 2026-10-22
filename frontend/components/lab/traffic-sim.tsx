"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Button, C, Stat, fit, fmt, useLoop } from "./kit";

type Dot = { x: number; y: number; vy: number };
type Ack = { x: number; y: number };
type Cube = { k: number; n: number };

const BATCH = 100;

export function TrafficSim() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [slider, setSlider] = useState(45);
  const state = useRef({
    dots: [] as Dot[],
    acks: [] as Ack[],
    cubes: [] as Cube[],
    queue: 0,
    spawn: 0,
    flushT: 0,
    stored: 0,
    boost: 0,
    bars: new Array(12).fill(0).map((_, i) => 34 + ((i * 7) % 5) * 4),
    barT: 0,
  });
  const [stats, setStats] = useState({ rate: 0, queue: 0, stored: 0 });
  const lastStats = useRef(0);

  // Slider 0..100 maps to 1..10,000 events/s on a log scale.
  const rateFor = (v: number) => Math.round(10 ** (v / 25));

  const ref = useLoop<HTMLDivElement>((dt, now) => {
    const cv = canvas.current;
    if (!cv) return;
    const s = state.current;
    const { ctx, w, h } = fit(cv);
    const mid = h * 0.46;

    s.boost = Math.max(0, s.boost - dt * 0.25);
    const rate = rateFor(slider) * (1 + s.boost * 30);
    // Each dot stands for many events once traffic is high.
    const dotsPerSec = Math.min(70, 1.4 * rate ** 0.45);
    const perDot = rate / dotsPerSec;

    const L = {
      browser: w * 0.07,
      ingest: w * 0.22,
      q0: w * 0.3,
      q1: w * 0.54,
      worker: w * 0.63,
      db: w * 0.76,
      c0: w * 0.85,
      c1: w * 0.97,
    };

    const label = (t: string, x: number, y: number, sub?: string) => {
      ctx.textAlign = "center";
      ctx.fillStyle = C.ink(0.85);
      ctx.font = '500 13px "DM Sans", sans-serif';
      ctx.fillText(t, x, y);
      if (sub) {
        ctx.fillStyle = C.ink(0.4);
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(sub, x, y + 16);
      }
    };
    const box = (x: number, r: number, hot = false) => {
      ctx.beginPath();
      ctx.roundRect(x - r, mid - r, r * 2, r * 2, 12);
      ctx.fillStyle = "#1b1b1b";
      ctx.fill();
      ctx.strokeStyle = hot ? "rgb(242 106 46 / 0.7)" : C.ink(0.16);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    // Wires.
    ctx.strokeStyle = C.ink(0.08);
    ctx.beginPath();
    ctx.moveTo(L.browser, mid);
    ctx.lineTo(L.db, mid);
    ctx.stroke();

    // Spawn requests from a column of browsers.
    if (dt > 0) s.spawn += dt * dotsPerSec;
    while (s.spawn >= 1) {
      s.spawn -= 1;
      s.dots.push({
        x: L.browser + 18,
        y: mid + (Math.random() - 0.5) * 70,
        vy: 0,
      });
    }
    for (let i = s.dots.length - 1; i >= 0; i--) {
      const d = s.dots[i];
      d.x += dt * 190;
      d.y += (mid - d.y) * Math.min(1, dt * 5);
      if (d.x >= L.ingest - 22) {
        s.dots.splice(i, 1);
        s.queue += perDot;
        s.acks.push({ x: L.ingest - 22, y: mid - 32 });
      }
    }
    for (let i = s.acks.length - 1; i >= 0; i--) {
      const a = s.acks[i];
      a.x -= dt * 420;
      if (a.x <= L.browser + 20) s.acks.splice(i, 1);
    }

    // The worker flushes once a second, or sooner when 100 are waiting.
    s.flushT += dt;
    const cap = Math.max(BATCH * 4, rate * 0.5);
    if (
      dt > 0 &&
      s.queue >= 1 &&
      (s.flushT >= 1 || (s.queue >= BATCH && s.flushT >= 0.3))
    ) {
      const take = Math.min(s.queue, cap);
      s.queue -= take;
      s.flushT = 0;
      s.cubes.push({ k: 0, n: take });
    }
    for (let i = s.cubes.length - 1; i >= 0; i--) {
      const c = s.cubes[i];
      c.k += dt * 1.4;
      if (c.k >= 1) {
        s.cubes.splice(i, 1);
        s.stored += c.n;
        s.bars[s.bars.length - 1] += c.n / Math.max(20, rate * 0.08);
      }
    }
    s.barT += dt;
    if (s.barT > 2) {
      s.barT = 0;
      s.bars.shift();
      s.bars.push(0);
    }

    // Stations.
    // Browsers: a little stack of windows.
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.roundRect(L.browser - 20 + k * 3, mid - 32 + k * 18, 36, 24, 4);
      ctx.fillStyle = "#1b1b1b";
      ctx.fill();
      ctx.strokeStyle = C.ink(0.2);
      ctx.stroke();
    }
    label("Browsers", L.browser, mid + 64, "pulse.js");

    box(L.ingest, 22, true);
    ctx.fillStyle = C.soft;
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("204", L.ingest, mid + 4);
    label("Ingest", L.ingest, mid + 64, "4.8 ms");

    // Queue tube with events filling from the right.
    ctx.beginPath();
    ctx.roundRect(L.q0, mid - 26, L.q1 - L.q0, 52, 14);
    ctx.fillStyle = "#171717";
    ctx.fill();
    ctx.strokeStyle = C.ink(0.16);
    ctx.stroke();
    const cols = Math.floor((L.q1 - L.q0 - 20) / 7);
    const shown = Math.min(cols * 6, Math.round(s.queue / Math.max(1, perDot)));
    ctx.fillStyle = C.soft;
    for (let k = 0; k < shown; k++) {
      const x = L.q1 - 13 - Math.floor(k / 6) * 7;
      const y = mid - 18 + (k % 6) * 7;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    label("Queue", (L.q0 + L.q1) / 2, mid + 64, "Redis");

    box(L.worker, 22);
    ctx.strokeStyle = C.ink(0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(L.worker, mid, 6, 0, Math.PI * 2);
    ctx.stroke();
    label("Worker", L.worker, mid + 64, "100 per insert");

    // Database cylinder.
    const dbw = 26;
    ctx.fillStyle = "#1b1b1b";
    ctx.strokeStyle = C.ink(0.2);
    ctx.beginPath();
    ctx.ellipse(L.db, mid - 20, dbw, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L.db - dbw, mid - 20);
    ctx.lineTo(L.db - dbw, mid + 20);
    ctx.ellipse(L.db, mid + 20, dbw, 7, 0, Math.PI, 0, true);
    ctx.lineTo(L.db + dbw, mid - 20);
    ctx.fill();
    ctx.stroke();
    label("Database", L.db, mid + 64, "TimescaleDB");

    // Batches in flight.
    for (const c of s.cubes) {
      const x = L.worker + (L.db - L.worker) * c.k;
      const y = mid - Math.sin(Math.PI * c.k) * 26;
      ctx.fillStyle = C.soft;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.k * 3);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }

    // Dashboard chart.
    const maxBar = Math.max(60, ...s.bars);
    const bw = (L.c1 - L.c0) / s.bars.length;
    s.bars.forEach((v, i) => {
      const bh = (v / maxBar) * 70;
      ctx.fillStyle = i === s.bars.length - 1 ? C.hot : C.ink(0.22);
      ctx.fillRect(L.c0 + i * bw + 1, mid + 30 - bh, bw - 2, bh);
    });
    label("Dashboard", (L.c0 + L.c1) / 2, mid + 64, "live");

    // Moving requests and replies on top.
    ctx.fillStyle = C.soft;
    for (const d of s.dots) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.cool;
    for (const a of s.acks) ctx.fillRect(a.x - 6, a.y - 1, 12, 2);
    if (s.acks.length) {
      ctx.fillStyle = "rgb(188 208 212 / 0.8)";
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText("204 replies", (L.browser + L.ingest) / 2 + 10, mid - 42);
    }

    if (now - lastStats.current > 150) {
      lastStats.current = now;
      setStats({ rate, queue: s.queue, stored: s.stored });
    }
  });

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-ink/8 bg-well">
        <canvas
          ref={canvas}
          className="block h-[300px] w-full"
          aria-label="Requests flowing through ingest, a queue and a worker into the database"
        />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="grid grid-cols-3 gap-x-8">
          <Stat label="Traffic" value={`${fmt(stats.rate)}/s`} tone="hot" />
          <Stat label="In the queue" value={fmt(stats.queue)} />
          <Stat label="Stored" value={fmt(stats.stored)} tone="cool" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label
            htmlFor="sim-rate"
            className="flex items-center gap-3 text-[12.5px] text-ink/60"
          >
            Traffic
            <input
              id="sim-rate"
              type="range"
              min={0}
              max={100}
              value={slider}
              onChange={(e) => setSlider(+e.target.value)}
              className="w-40 accent-tangerine"
            />
          </label>
          <Button onClick={() => (state.current.boost = 1)}>
            <Zap size={13} /> Launch a spike
          </Button>
        </div>
      </div>
      <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink/60">
        Each dot is a request. The blue ticks are 204 replies going straight
        back, the dots piling up are the queue, and the orange squares are
        batches of up to 100 events written in one go.
      </p>
    </div>
  );
}
