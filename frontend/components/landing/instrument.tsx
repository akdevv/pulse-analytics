"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./motion";

// A status light. Changing `pulse` re-triggers the flash.
export function Led({
  on = true,
  pulse,
  className,
}: {
  on?: boolean;
  pulse?: number | string;
  className?: string;
}) {
  return (
    <span
      key={pulse}
      aria-hidden
      data-on={on}
      className={cn("pa-led", pulse !== undefined && "pa-led-flash", className)}
    />
  );
}

// One module in the instrument grid: a mono channel label, an LED, content.
export function Channel({
  id,
  label,
  led,
  pulse,
  className,
  children,
}: {
  id: string;
  label: string;
  led?: boolean;
  pulse?: number | string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("pa-channel group/ch", className)}>
      <div className="flex items-center justify-between gap-3 font-mono text-[10.5px] tracking-[0.08em] text-ink/40 uppercase">
        <span className="truncate">
          <span className="text-ink/25">{id} · </span>
          {label}
        </span>
        <Led on={led} pulse={pulse} />
      </div>
      {children}
    </div>
  );
}

// Digits that roll in when they change, in the dot-matrix face.
export function Rolling({
  value,
  roll = true,
  className,
}: {
  value: string;
  roll?: boolean;
  className?: string;
}) {
  // Counters that change several times a second skip the roll; it would
  // never get to finish.
  if (!roll)
    return (
      <span className={cn("pa-dot inline-flex tabular-nums", className)}>
        {value}
      </span>
    );
  return (
    <span className={cn("pa-dot inline-flex tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      {value.split("").map((ch, i) => (
        <span
          key={`${value.length - i}-${ch}`}
          aria-hidden
          className="pa-digit inline-block"
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

// An oscilloscope trace. Each change of `beat` adds a spike that scrolls off.
export function Scope({
  beat,
  className,
}: {
  beat: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const spikes = useRef<number[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    spikes.current.push(0);
  }, [beat]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let phase = 0;
    let visible = false;
    const observer = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    function draw() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgb(229 227 210 / 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0.5; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, h / 2 + 0.5);
      ctx.lineTo(w, h / 2 + 0.5);
      ctx.stroke();

      // Spikes enter at the right edge and travel left.
      spikes.current = spikes.current
        .map((s) => s + 2.2)
        .filter((s) => s < w + 40);

      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const t = (x + phase) / 30;
        let y = Math.sin(t) * h * 0.05 + Math.sin(t * 2.3) * h * 0.03;
        for (const s of spikes.current) {
          const d = x - (w - s);
          if (Math.abs(d) < 16)
            y -= Math.cos((d / 16) * Math.PI * 0.5) * h * 0.34;
        }
        if (x === 0) ctx.moveTo(x, h / 2 + y);
        else ctx.lineTo(x, h / 2 + y);
      }
      ctx.strokeStyle = "#f26a2e";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#f26a2e";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      phase += 1.2;
      if (visible && !reduced) raf = requestAnimationFrame(draw);
    }
    if (reduced) draw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("block size-full", className)}
    />
  );
}
