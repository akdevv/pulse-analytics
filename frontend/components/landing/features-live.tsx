"use client";

import { useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseLogo } from "./shared";
import { useInView, useReducedMotion, useTicker } from "./motion";

export const WELL = "rounded-xl bg-well shadow-well";

const PATHS = [
  "/pricing",
  "/docs/quickstart",
  "/",
  "/blog/rollups",
  "/docs/events",
  "/changelog",
  "/docs/reference",
];
const COUNTRIES = ["DE", "IN", "US", "BR", "JP", "GB", "FR", "NL"];

type FeedRow = { id: number; path: string; country: string; at: number };

const SEED: FeedRow[] = [
  { id: 2, path: "/pricing", country: "DE", at: 0 },
  { id: 1, path: "/docs/quickstart", country: "IN", at: -4 },
  { id: 0, path: "/", country: "US", at: -9 },
];

export function LiveTile() {
  const [{ count, feed, now }, setLive] = useState({
    count: 247,
    feed: SEED,
    now: 0,
  });

  const ref = useTicker<HTMLDivElement>(
    () =>
      setLive(({ count, feed, now }) => {
        const id = feed[0].id + 1;
        const next = now + 2;
        return {
          now: next,
          count: Math.max(212, Math.min(289, count + ((id * 7) % 11) - 5)),
          feed: [
            {
              id,
              path: PATHS[(id * 3) % PATHS.length],
              country: COUNTRIES[(id * 5) % COUNTRIES.length],
              at: next,
            },
            ...feed,
          ].slice(0, 3),
        };
      }),
    2000
  );

  return (
    <div
      ref={ref}
      className="grid h-full grid-cols-1 items-end gap-5 p-6 pb-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8"
    >
      <div>
        <div className="flex items-center gap-2 text-[13px] text-ink/55">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-powder opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-powder" />
          </span>
          On the site now
        </div>
        <div
          key={count}
          className="pa-tick mt-2 font-display text-[56px] leading-none font-semibold tracking-logo text-ink tabular-nums"
        >
          {count}
        </div>
      </div>
      <ul
        className={cn(
          WELL,
          "overflow-hidden px-4 py-2 font-mono text-[11.5px]"
        )}
      >
        {feed.map((e, i) => (
          <li
            key={e.id}
            className={cn(
              "flex items-center gap-3 py-1 text-ink/55",
              i === 0 && e.at > 0 && "pa-feed-in"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-ink/75">
              {e.path}
            </span>
            <span>{e.country}</span>
            <span className="w-8 text-right text-ink/35">
              {now - e.at === 0 ? "now" : `${now - e.at}s`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClickTile({ snippet }: { snippet: React.ReactNode }) {
  const [clicks, setClicks] = useState(0);
  const ref = useTicker<HTMLDivElement>(() => setClicks((c) => c + 1), 2800);

  return (
    <div
      ref={ref}
      className="grid h-full grid-cols-1 items-center gap-6 p-6 pb-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8"
    >
      <div className="relative mx-auto mt-8 w-fit sm:mx-0 sm:mt-6">
        <span
          key={`b${clicks}`}
          className={cn(
            "inline-flex rounded-full bg-linear-to-b from-tangerine-soft to-tangerine px-5 py-2.5 text-[14px] font-medium text-charcoal shadow-glow",
            clicks > 0 && "pa-press"
          )}
        >
          Sign up
        </span>
        <span
          key={`t${clicks}`}
          className={cn(
            "absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-powder/20 bg-powder/10 px-2.5 py-1 font-mono text-[11px] whitespace-nowrap text-powder",
            clicks > 0 && "pa-pop"
          )}
        >
          signup
          <span className="text-powder/60 tabular-nums">+{clicks + 1}</span>
        </span>
        <MousePointer2
          key={`c${clicks}`}
          aria-hidden
          size={22}
          strokeWidth={1.5}
          className={cn(
            "absolute -right-3 -bottom-3 fill-ink text-charcoal",
            clicks > 0 && "pa-cursor"
          )}
        />
      </div>
      {snippet}
    </div>
  );
}

export function AskTile({
  question,
  sql,
  table,
  answer,
}: {
  question: string;
  sql: React.ReactNode;
  table: React.ReactNode;
  answer: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [progress, setTyped] = useState(0);
  const typed = reduced ? question.length : progress;

  useEffect(() => {
    if (!inView || reduced) return;
    const id = setInterval(() => {
      setTyped((t) => {
        if (t >= question.length) clearInterval(id);
        return Math.min(question.length, t + 1);
      });
    }, 28);
    return () => clearInterval(id);
  }, [inView, reduced, question.length]);

  const done = typed >= question.length;

  return (
    <div
      ref={ref}
      className="flex h-full flex-col justify-center gap-2.5 p-6 pb-2"
    >
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ink/7 px-4 py-2.5 text-[13.5px] text-ink/85">
        <span className="sr-only">{question}</span>
        <span aria-hidden>
          {question.slice(0, typed)}
          {!done && <span className="pa-caret" />}
          <span className="invisible">{question.slice(typed)}</span>
        </span>
      </div>
      <div
        data-shown={done}
        className="pa-step grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      >
        {sql}
        {table}
      </div>
      <div
        data-shown={done}
        className="pa-step flex items-end gap-2.5"
        style={{ "--pa-delay": "450ms" } as React.CSSProperties}
      >
        <PulseLogo size={24} />
        <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md border border-ink/8 px-4 py-2.5 text-[13.5px] text-ink/70">
          {answer}
        </div>
      </div>
    </div>
  );
}
