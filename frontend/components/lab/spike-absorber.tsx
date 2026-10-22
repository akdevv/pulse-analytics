"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Button, C, Stat, fit, fmt, useLoop } from "./kit";

const WINDOW = 30; // seconds of history on screen
const SAMPLE = 0.1;
const N = WINDOW / SAMPLE;
const BASE = 60; // events/s on a normal day
const BATCH = 100;
const MAX_PER_FLUSH = 400; // the worker writes up to 4 batches a second

type Sim = {
  t: number;
  queue: number;
  spikeAt: number;
  flushT: number;
  sampleT: number;
  lastInserts: number;
  arrivals: number[];
  queued: number[];
  inserts: number[];
  totalStored: number;
};

function noise(t: number) {
  return (
    Math.sin(t * 1.7) * 0.18 +
    Math.sin(t * 4.3 + 1) * 0.1 +
    Math.sin(t * 0.6) * 0.12
  );
}

export function SpikeAbsorber() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim>({
    t: 0,
    queue: 0,
    spikeAt: 6,
    flushT: 0,
    sampleT: 0,
    lastInserts: 0,
    arrivals: new Array(N).fill(BASE),
    queued: new Array(N).fill(0),
    inserts: new Array(N).fill(1),
    totalStored: 0,
  });
  const [stats, setStats] = useState({ rate: BASE, queue: 0, inserts: 1 });
  const lastStats = useRef(0);

  const spikeRate = (s: Sim) => {
    const k = s.t - s.spikeAt;
    if (k < 0) return 0;
    // A launch: ramps up fast, tails off over several seconds.
    return 1400 * Math.min(1, k / 0.6) * Math.exp(-k / 3.2);
  };

  const ref = useLoop<HTMLDivElement>((dt, now) => {
    const s = sim.current;
    const cv = canvas.current;
    if (!cv) return;

    if (dt > 0) {
      s.t += dt;
      // A spike every 16 s if nobody presses the button.
      if (s.t - s.spikeAt > 16) s.spikeAt = s.t + 1;
      const rate = Math.max(0, BASE * (1 + noise(s.t)) + spikeRate(s));
      s.queue += rate * dt;
      s.flushT += dt;
      if (s.flushT >= 1) {
        s.flushT -= 1;
        const take = Math.min(s.queue, MAX_PER_FLUSH);
        s.queue -= take;
        s.lastInserts = Math.ceil(take / BATCH);
        s.totalStored += take;
      }
      s.sampleT += dt;
      while (s.sampleT >= SAMPLE) {
        s.sampleT -= SAMPLE;
        s.arrivals.push(rate);
        s.queued.push(s.queue);
        s.inserts.push(s.lastInserts);
        s.arrivals.shift();
        s.queued.shift();
        s.inserts.shift();
      }
      if (now - lastStats.current > 150) {
        lastStats.current = now;
        setStats({ rate, queue: s.queue, inserts: s.lastInserts });
      }
    }

    const { ctx, w, h } = fit(cv);
    const padL = 0;
    const gap = 26;
    const panelH = (h - gap * 2) / 3;
    const panels = [
      {
        label: "Events arriving at ingest, per second",
        data: s.arrivals,
        max: Math.max(400, ...s.arrivals) * 1.1,
        color: C.hot,
        kind: "area" as const,
      },
      {
        label: "Events waiting in the queue",
        data: s.queued,
        max: Math.max(300, ...s.queued) * 1.1,
        color: C.soft,
        kind: "area" as const,
      },
      {
        label: "Database inserts per second (100 events each)",
        data: s.inserts,
        max: 6,
        color: C.cool,
        kind: "bars" as const,
      },
    ];

    panels.forEach((p, i) => {
      const top = i * (panelH + gap);
      const x0 = padL;
      const x1 = w;
      const yb = top + panelH;
      ctx.strokeStyle = C.ink(0.08);
      ctx.beginPath();
      ctx.moveTo(x0, yb + 0.5);
      ctx.lineTo(x1, yb + 0.5);
      ctx.stroke();

      const step = (x1 - x0) / (N - 1);
      if (p.kind === "area") {
        const grad = ctx.createLinearGradient(0, top, 0, yb);
        grad.addColorStop(0, p.color + "66");
        grad.addColorStop(1, p.color + "05");
        ctx.beginPath();
        ctx.moveTo(x0, yb);
        p.data.forEach((v, k) =>
          ctx.lineTo(x0 + k * step, yb - (v / p.max) * panelH)
        );
        ctx.lineTo(x1, yb);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        p.data.forEach((v, k) => {
          const x = x0 + k * step;
          const y = yb - (v / p.max) * panelH;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        // Capacity line at 4 inserts/s.
        const cy = yb - (4 / p.max) * panelH;
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = C.ink(0.2);
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x1, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.ink(0.35);
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = "right";
        ctx.fillText("worker limit · 4/s", x1, cy - 6);
        ctx.fillStyle = p.color;
        for (let k = 0; k < N; k += 10) {
          const v = p.data[k];
          const bh = (v / p.max) * panelH;
          ctx.globalAlpha = 0.75;
          ctx.fillRect(x0 + k * step + 1, yb - bh, step * 10 - 3, bh);
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.ink(0.6);
      ctx.font = '500 12px "DM Sans", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(p.label, x0, top + 12);
    });
  });

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-ink/8 bg-well p-5">
        <canvas
          ref={canvas}
          className="block h-[340px] w-full"
          aria-label="Three live charts: events arriving, the queue, and database writes"
        />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <Stat
            label="Arriving now"
            value={`${fmt(stats.rate)}/s`}
            tone="hot"
          />
          <Stat label="In the queue" value={fmt(stats.queue)} />
          <Stat label="DB inserts" value={`${stats.inserts}/s`} tone="cool" />
          <Stat label="Visitor waits" value="4.8 ms" />
        </div>
        <Button
          onClick={() => {
            sim.current.spikeAt = sim.current.t;
          }}
        >
          <Zap size={13} /> Launch a spike
        </Button>
      </div>
      <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink/60">
        Press the button. Arrivals jump twentyfold, the queue soaks them up, and
        the database keeps writing a few calm batches a second. Visitors get
        their 204 in 4.8 ms the whole time.
      </p>
    </div>
  );
}
