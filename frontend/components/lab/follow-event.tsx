"use client";

import { useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, C, useLoop } from "./kit";

type Station = {
  name: string;
  sub: string;
  icon: (on: boolean) => React.ReactNode;
  at: string;
  title: string;
  body: string;
};

const X = [90, 262, 434, 606, 778, 930];
const Y = 140;
const DWELL = 2.6;
const TRAVEL = 0.8;
const STEP = DWELL + TRAVEL;
const TOTAL = X.length * STEP + 0.6;

const stroke = (on: boolean) => (on ? C.soft : C.ink(0.6));

const STATIONS: Station[] = [
  {
    name: "Browser",
    sub: "pulse.js",
    at: "0 ms",
    title: "A visitor opens your pricing page.",
    body: "The 3 KB script sends one GET request with the path, referrer and screen size. No cookies are set.",
    icon: (on) => (
      <g fill="none" stroke={stroke(on)} strokeWidth="1.6">
        <rect x="-15" y="-11" width="30" height="22" rx="3" />
        <path d="M-15 -4 H15" />
        <circle cx="-11" cy="-7.5" r="0.9" fill={stroke(on)} />
        <circle cx="-8" cy="-7.5" r="0.9" fill={stroke(on)} />
      </g>
    ),
  },
  {
    name: "Ingest",
    sub: "Express",
    at: "4.8 ms",
    title: "Pulse replies 204 straight away.",
    body: "Ingest checks the event, drops it on a queue and answers. That blue reply is the only thing the visitor waits for: 4.8 ms.",
    icon: (on) => (
      <path
        d="M3 -13 L-8 2 H0 L-3 13 L8 -2 H0 Z"
        fill="none"
        stroke={stroke(on)}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    name: "Queue",
    sub: "BullMQ · Redis",
    at: "5 ms",
    title: "The event waits in line.",
    body: "It joins other events in Redis. If a launch sends a flood of traffic, the line gets longer instead of the database falling over.",
    icon: (on) => (
      <g fill="none" stroke={stroke(on)} strokeWidth="1.6">
        <rect x="-13" y="-12" width="26" height="6" rx="1.5" />
        <rect x="-13" y="-3" width="26" height="6" rx="1.5" />
        <rect x="-13" y="6" width="26" height="6" rx="1.5" />
      </g>
    ),
  },
  {
    name: "Worker",
    sub: "Node",
    at: "0.62 s",
    title: "A worker packs 100 events into one write.",
    body: "Once a second it takes up to 100 events, works out the browser and country, throws the IP away and writes them all in one insert.",
    icon: (on) => (
      <g fill="none" stroke={stroke(on)} strokeWidth="1.6">
        <circle r="5" />
        <path d="M0 -13 V-8 M0 8 V13 M-13 0 H-8 M8 0 H13 M-9 -9 L-6 -6 M6 6 L9 9 M-9 9 L-6 6 M6 -6 L9 -9" />
      </g>
    ),
  },
  {
    name: "Database",
    sub: "TimescaleDB",
    at: "0.66 s",
    title: "The batch lands in the database.",
    body: "TimescaleDB stores the 100 rows and keeps an hourly total up to date, so charts never have to count raw events.",
    icon: (on) => (
      <g fill="none" stroke={stroke(on)} strokeWidth="1.6">
        <ellipse cx="0" cy="-9" rx="12" ry="4" />
        <path d="M-12 -9 V9 C-12 14 12 14 12 9 V-9" />
        <path d="M-12 0 C-12 5 12 5 12 0" />
      </g>
    ),
  },
  {
    name: "Dashboard",
    sub: "Next.js · SSE",
    at: "0.9 s",
    title: "Your chart ticks up by one.",
    body: "The live count updates over an open connection. Under a second after the click, the pageview is on your dashboard.",
    icon: () => null,
  },
];

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function FollowEvent() {
  const [t, setT] = useState(0.4);
  const [playing, setPlaying] = useState(true);
  const ref = useLoop<HTMLDivElement>((dt) => {
    if (playing) setT((v) => (v + dt) % TOTAL);
  });

  const step = Math.min(X.length - 1, Math.floor(t / STEP));
  const inStep = t - step * STEP;
  const dwell = clamp(inStep / DWELL);
  const travelling = inStep > DWELL && step < X.length - 1;
  const u = travelling ? ease(clamp((inStep - DWELL) / TRAVEL)) : 0;
  const px = travelling ? X[step] + (X[step + 1] - X[step]) * u : X[step];
  const py = Y - (travelling ? Math.sin(Math.PI * u) * 18 : 0);
  // After the worker, the event travels as part of a batch.
  const asCube = step >= 3 && !(step === 4 && dwell > 0.35) && step < 5;

  const go = (i: number) => setT(((i + X.length) % X.length) * STEP + 0.05);
  const s = STATIONS[step];

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <div className="overflow-x-auto rounded-2xl border border-ink/8 bg-well">
        <svg
          viewBox="0 0 1020 280"
          className="block min-w-[760px]"
          aria-label="An event travelling from the browser to the dashboard"
        >
          <defs>
            <filter id="fe-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="fe-line" x1="0" x2="1">
              <stop offset="0" stopColor={C.hot} stopOpacity="0.9" />
              <stop offset="1" stopColor={C.soft} stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Track, with the travelled part lit. */}
          <path
            d={`M${X[0]} ${Y} H${X[5]}`}
            stroke={C.ink(0.1)}
            strokeWidth="2"
          />
          <path
            d={`M${X[0]} ${Y} H${px}`}
            stroke="url(#fe-line)"
            strokeWidth="2"
          />

          {/* Background traffic: other pageviews on the same path. */}
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} r="2" fill={C.hot} opacity="0.28">
              <animateMotion
                dur="5.5s"
                begin={`${-(i * 5.5) / 14}s`}
                repeatCount="indefinite"
                path={`M${X[0]} ${Y + 14} H${X[5]}`}
              />
            </circle>
          ))}

          {/* Stations. */}
          {STATIONS.map((st, i) => {
            const on = i === step && !travelling;
            const done = i < step || (i === step && travelling);
            return (
              <g
                key={st.name}
                transform={`translate(${X[i]} ${Y})`}
                className="cursor-pointer"
                onClick={() => go(i)}
              >
                {on && (
                  <rect
                    x="-36"
                    y="-36"
                    width="72"
                    height="72"
                    rx="18"
                    fill={C.hot}
                    opacity="0.35"
                    filter="url(#fe-glow)"
                  />
                )}
                <rect
                  x="-32"
                  y="-32"
                  width="64"
                  height="64"
                  rx="16"
                  fill="#1b1b1b"
                  stroke={on ? C.soft : done ? C.ink(0.28) : C.ink(0.14)}
                  strokeWidth={on ? 1.6 : 1}
                />
                {i === 5 ? (
                  <g>
                    {[10, 16, 12, 20].map((h, k) => (
                      <rect
                        key={k}
                        x={-15 + k * 7}
                        y={12 - h}
                        width="4.5"
                        height={h}
                        rx="1"
                        fill={C.ink(0.35)}
                      />
                    ))}
                    <rect
                      x={13}
                      y={
                        12 -
                        (16 + (step === 5 ? ease(clamp(dwell * 2)) * 8 : 0))
                      }
                      width="4.5"
                      height={
                        16 + (step === 5 ? ease(clamp(dwell * 2)) * 8 : 0)
                      }
                      rx="1"
                      fill={step === 5 ? C.soft : C.ink(0.5)}
                    />
                  </g>
                ) : (
                  st.icon(on)
                )}
                <text
                  y="56"
                  textAnchor="middle"
                  fill={on ? C.ink(0.95) : C.ink(0.6)}
                  fontSize="14"
                  fontWeight="500"
                >
                  {st.name}
                </text>
                <text
                  y="74"
                  textAnchor="middle"
                  fill={C.ink(0.35)}
                  fontSize="11.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {st.sub}
                </text>
              </g>
            );
          })}

          {/* Step 2: the 204 reply flies back to the browser. */}
          {step === 1 &&
            !travelling &&
            (() => {
              const k = ease(clamp(dwell * 1.6));
              const x = X[1] + (X[0] - X[1]) * k;
              const y = Y - 44 - Math.sin(Math.PI * k) * 34;
              return (
                <g opacity={1 - clamp((dwell - 0.75) * 4)}>
                  <path
                    d={`M${X[1]} ${Y - 40} Q ${(X[0] + X[1]) / 2} ${Y - 110} ${X[0]} ${Y - 40}`}
                    fill="none"
                    stroke={C.cool}
                    strokeOpacity="0.35"
                    strokeDasharray="3 4"
                  />
                  <circle cx={x} cy={y} r="5" fill={C.cool} />
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fill={C.cool}
                    fontSize="12"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    204
                  </text>
                </g>
              );
            })()}

          {/* Step 3: the queue fills, our event joins the back. */}
          {step === 2 && !travelling && (
            <g transform={`translate(${X[2]} ${Y - 62})`}>
              {Array.from({ length: 12 }, (_, k) => {
                const filled = k < 6 + Math.floor(dwell * 6);
                const ours = k === 6;
                return (
                  <rect
                    key={k}
                    x={-33 + (k % 6) * 11}
                    y={-(Math.floor(k / 6) * 11)}
                    width="8"
                    height="8"
                    rx="2"
                    fill={ours ? C.soft : filled ? C.hot : C.ink(0.08)}
                    opacity={ours ? 1 : filled ? 0.55 : 1}
                  />
                );
              })}
              <text
                y="-26"
                textAnchor="middle"
                fill={C.ink(0.5)}
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {6 + Math.floor(dwell * 6)} waiting
              </text>
            </g>
          )}

          {/* Step 4: other events converge into one batch. */}
          {step === 3 &&
            !travelling &&
            Array.from({ length: 16 }, (_, k) => {
              const a = (k / 16) * Math.PI * 2;
              const r = 70 * (1 - ease(clamp(dwell / 0.6)));
              return (
                <circle
                  key={k}
                  cx={X[3] + Math.cos(a) * r}
                  cy={Y + Math.sin(a) * r * 0.6}
                  r="2.5"
                  fill={C.hot}
                  opacity={0.7 * (1 - clamp((dwell - 0.55) * 4))}
                />
              );
            })}
          {step === 3 && !travelling && dwell > 0.55 && (
            <text
              x={X[3]}
              y={Y - 48}
              textAnchor="middle"
              fill={C.soft}
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
            >
              ×100 → 1 insert
            </text>
          )}

          {/* Step 5: rows written. */}
          {step === 4 && !travelling && dwell > 0.35 && (
            <text
              x={X[4]}
              y={Y - 48}
              textAnchor="middle"
              fill={C.soft}
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
              opacity={clamp((dwell - 0.35) * 4)}
            >
              +100 rows
            </text>
          )}

          {/* Step 6: +1 on the chart. */}
          {step === 5 && dwell > 0.3 && (
            <text
              x={X[5]}
              y={Y - 48}
              textAnchor="middle"
              fill={C.soft}
              fontSize="13"
              fontWeight="600"
              opacity={clamp((dwell - 0.3) * 4)}
            >
              +1 pageview
            </text>
          )}

          {/* The event we are following. */}
          {!(step === 5 && !travelling) && (
            <g transform={`translate(${px} ${py})`}>
              <circle
                r="14"
                fill={C.hot}
                opacity="0.35"
                filter="url(#fe-glow)"
              />
              {asCube ? (
                <rect
                  x="-7"
                  y="-7"
                  width="14"
                  height="14"
                  rx="2.5"
                  fill={C.soft}
                  transform={`rotate(${travelling ? u * 180 : 0})`}
                />
              ) : (
                <circle
                  r="6.5"
                  fill={C.soft}
                  stroke="#161616"
                  strokeWidth="2.5"
                />
              )}
            </g>
          )}

          {/* Clock. */}
          <g transform="translate(1004 30)">
            <text textAnchor="end" fill={C.ink(0.45)} fontSize="12">
              Time since the click
            </text>
            <text
              y="30"
              textAnchor="end"
              fill={C.soft}
              fontSize="26"
              fontWeight="600"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {s.at}
            </text>
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-h-[104px]">
          <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
            Step {step + 1} of 6 · {s.name}
          </p>
          <p className="mt-2 font-display text-[22px] leading-tight font-semibold tracking-display text-ink">
            {s.title}
          </p>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink/60">
            {s.body}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => go(step - 1)}>
            <SkipBack size={13} /> Back
          </Button>
          <Button onClick={() => setPlaying((p) => !p)} active={playing}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button onClick={() => go(step + 1)}>
            Next <SkipForward size={13} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {STATIONS.map((st, i) => (
          <button
            key={st.name}
            type="button"
            onClick={() => go(i)}
            className={cn(
              "h-1 cursor-pointer rounded-full transition-colors",
              i <= step ? "bg-tangerine-soft" : "bg-ink/12"
            )}
            aria-label={`Go to step ${i + 1}: ${st.name}`}
          />
        ))}
      </div>
    </div>
  );
}
