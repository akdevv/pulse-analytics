"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, C, fit, fmt, useLoop } from "./kit";

const WINDOW = 20;
const SAMPLE = 0.1;
const N = WINDOW / SAMPLE;
const BASE = 150;
const DB_EVENTS_PER_SEC = 700; // what the database takes as single inserts
const QUEUE_PER_FLUSH = 600; // the worker, writing in batches of 100

type Side = {
  backlog: number;
  wait: number[];
  timedOut: number;
  load: number;
};

export function WithWithout() {
  const direct = useRef<HTMLCanvasElement>(null);
  const queued = useRef<HTMLCanvasElement>(null);
  const sim = useRef({
    t: 0,
    spikeAt: 4,
    sampleT: 0,
    flushT: 0,
    queue: 0,
    a: { backlog: 0, wait: new Array(N).fill(5), timedOut: 0, load: 0 } as Side,
    b: {
      backlog: 0,
      wait: new Array(N).fill(4.8),
      timedOut: 0,
      load: 0,
    } as Side,
  });
  const [view, setView] = useState({
    aWait: 5,
    bWait: 4.8,
    aLoad: 0.2,
    bLoad: 0.1,
    aOut: 0,
    rate: BASE,
  });
  const last = useRef(0);

  const draw = (cv: HTMLCanvasElement | null, side: Side, color: string) => {
    if (!cv) return;
    const { ctx, w, h } = fit(cv);
    // Log scale from 1 ms to 10 s.
    const y = (ms: number) =>
      h - 14 - ((Math.log10(Math.max(1, ms)) - 0) / 4) * (h - 28);
    ctx.font = '10.5px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    [1, 10, 100, 1000, 10000].forEach((ms) => {
      ctx.strokeStyle = C.ink(0.07);
      ctx.beginPath();
      ctx.moveTo(44, y(ms) + 0.5);
      ctx.lineTo(w, y(ms) + 0.5);
      ctx.stroke();
      ctx.fillStyle = C.ink(0.35);
      ctx.fillText(ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`, 0, y(ms) + 3.5);
    });
    // Timeout threshold.
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = "rgb(239 90 70 / 0.5)";
    ctx.beginPath();
    ctx.moveTo(44, y(3000));
    ctx.lineTo(w, y(3000));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgb(239 90 70 / 0.7)";
    ctx.textAlign = "right";
    ctx.fillText("requests time out", w, y(3000) - 5);

    const step = (w - 44) / (N - 1);
    ctx.beginPath();
    side.wait.forEach((v, k) => {
      const px = 44 + k * step;
      const py = y(v);
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const ref = useLoop<HTMLDivElement>((dt, now) => {
    const s = sim.current;
    if (dt > 0) {
      s.t += dt;
      if (s.t - s.spikeAt > 14) s.spikeAt = s.t + 1;
      const k = s.t - s.spikeAt;
      const spike = k < 0 ? 0 : 1800 * Math.min(1, k / 0.6) * Math.exp(-k / 3);
      const rate = BASE * (1 + Math.sin(s.t * 1.3) * 0.15) + spike;

      // Without a queue, every request waits for its own insert.
      s.a.backlog = Math.max(0, s.a.backlog + (rate - DB_EVENTS_PER_SEC) * dt);
      const aWait = 5 + (s.a.backlog / DB_EVENTS_PER_SEC) * 1000;
      if (aWait > 3000) s.a.timedOut += rate * dt;
      s.a.load = Math.min(1, rate / DB_EVENTS_PER_SEC);

      // With the queue, the reply never waits; the worker drains in batches.
      s.queue += rate * dt;
      s.flushT += dt;
      if (s.flushT >= 1) {
        s.flushT -= 1;
        const take = Math.min(s.queue, QUEUE_PER_FLUSH);
        s.queue -= take;
        s.b.load = Math.min(1, take / 100 / 20);
      }

      s.sampleT += dt;
      while (s.sampleT >= SAMPLE) {
        s.sampleT -= SAMPLE;
        s.a.wait.push(aWait);
        s.a.wait.shift();
        s.b.wait.push(4.8);
        s.b.wait.shift();
      }
      if (now - last.current > 150) {
        last.current = now;
        setView({
          aWait,
          bWait: 4.8,
          aLoad: s.a.load,
          bLoad: s.b.load,
          aOut: s.a.timedOut,
          rate,
        });
      }
    }
    draw(direct.current, s.a, "#ef5a46");
    draw(queued.current, s.b, C.soft);
  });

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          title="Writing straight to the database"
          note="Each pageview waits for its own insert."
          canvas={direct}
          wait={view.aWait}
          load={view.aLoad}
          out={view.aOut}
          bad
        />
        <Panel
          title="With Pulse's queue"
          note="Reply first, write in batches later."
          canvas={queued}
          wait={view.bWait}
          load={view.bLoad}
          out={0}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-ink/55">
          Same traffic on both sides:{" "}
          <span className="font-medium text-ink tabular-nums">
            {fmt(view.rate)} events/s
          </span>
        </p>
        <Button onClick={() => (sim.current.spikeAt = sim.current.t)}>
          <Zap size={13} /> Launch a spike
        </Button>
      </div>
      <p className="max-w-2xl text-[14.5px] leading-relaxed text-ink/60">
        The left side is the obvious design: insert the row, then reply. A
        launch overwhelms the database and visitors start waiting seconds for a
        tracking call. The right side is Pulse: the reply never waits, and the
        worker catches up a few batches at a time.
      </p>
    </div>
  );
}

function Panel({
  title,
  note,
  canvas,
  wait,
  load,
  out,
  bad,
}: {
  title: string;
  note: string;
  canvas: React.RefObject<HTMLCanvasElement | null>;
  wait: number;
  load: number;
  out: number;
  bad?: boolean;
}) {
  const waitText =
    wait < 100 ? `${wait.toFixed(1)} ms` : `${(wait / 1000).toFixed(2)} s`;
  return (
    <div className="rounded-2xl border border-ink/8 bg-well p-4 sm:p-5">
      <p className="font-display text-[17px] font-semibold text-ink">{title}</p>
      <p className="text-[13px] text-ink/45">{note}</p>
      <p className="mt-4 text-[11.5px] text-ink/45">Visitor wait, last 20 s</p>
      <canvas ref={canvas} className="mt-1 block h-[150px] w-full" />
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[11.5px] text-ink/45">Visitor waits</div>
          <div
            className={cn(
              "mt-1 font-display text-[20px] font-semibold tabular-nums",
              bad && wait > 100 ? "text-[#ef5a46]" : "text-ink"
            )}
          >
            {waitText}
          </div>
        </div>
        <div>
          <div className="text-[11.5px] text-ink/45">Timed out</div>
          <div
            className={cn(
              "mt-1 font-display text-[20px] font-semibold tabular-nums",
              out > 0 ? "text-[#ef5a46]" : "text-ink"
            )}
          >
            {fmt(out)}
          </div>
        </div>
        <div>
          <div className="text-[11.5px] text-ink/45">Database load</div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/10">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                load > 0.95 ? "bg-[#ef5a46]" : "bg-powder"
              )}
              style={{ width: `${Math.max(4, load * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
