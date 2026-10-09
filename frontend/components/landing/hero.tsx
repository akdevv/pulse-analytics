import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GhostButton, PrimaryButton, Reveal } from "./shared";
import { DashboardMockup } from "./dashboard-mockup";
import { CursorDots, LiveChips } from "./hero-live";
import { ScrollTilt } from "./motion";
import { REPO } from "./site";
import { dots } from "./surfaces";

const GLOW = [
  "radial-gradient(ellipse 100% 70% at 50% 14%, transparent 42%, var(--color-charcoal) 90%)",
  "radial-gradient(560px 380px at 50% 0%, color-mix(in oklab, var(--color-tangerine) 18%, transparent), transparent)",
  "radial-gradient(480px 220px at 50% 60%, color-mix(in oklab, var(--color-powder) 6%, transparent), transparent)",
].join(", ");

const DOTS = dots(
  "radial-gradient(ellipse 70% 55% at 50% 30%, black 20%, transparent 76%)"
);

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-6 sm:pt-36 md:pt-40">
      <div aria-hidden className="absolute inset-0" style={DOTS} />
      <CursorDots />
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="pa-aurora pa-aurora-a" />
        <div className="pa-aurora pa-aurora-b" />
        <div className="pa-aurora pa-aurora-c" />
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: GLOW }}
      />

      <div className="pa-hero-copy relative mx-auto max-w-3xl px-5 text-center sm:px-6">
        <Reveal>
          <Link
            href={`${REPO}/releases`}
            target="_blank"
            rel="noreferrer"
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/3 py-1 pr-2.5 pl-1 text-[12px] text-ink/65 backdrop-blur-sm transition-colors duration-150 ease-out hover:border-ink/20 hover:text-ink sm:mb-9"
          >
            <span className="rounded-full bg-tangerine/15 px-2 py-0.5 font-mono text-[10.5px] text-tangerine-soft">
              v0.1
            </span>
            <span>
              Open-source pet project
              <span className="hidden sm:inline"> · not a real product</span>
            </span>
            <ChevronRight
              aria-hidden
              size={13}
              className="text-ink/40 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </Reveal>

        <h1 className="font-display text-[42px] leading-[0.95] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[64px] md:text-[80px]">
          <Words text="Event analytics" start={80} />{" "}
          <span className="sm:block">
            <Words text="at" start={240} />{" "}
            <span className="whitespace-nowrap">
              <Words
                text="ridiculous scale."
                start={300}
                className="pa-shimmer-text"
              />
            </span>
          </span>
        </h1>

        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-md text-[15.5px] leading-relaxed text-pretty text-ink/65 sm:mt-7 sm:max-w-lg sm:text-[17px]">
            Cookieless pageviews and custom events from a 3&nbsp;KB script. A
            thin ingest path, a queue, and TimescaleDB rollups behind it, built
            to take ten thousand events a second.
          </p>
        </Reveal>

        <Reveal delay={180}>
          <div className="mx-auto mt-9 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
            <PrimaryButton
              href="/register"
              className="h-11 justify-center py-0"
            >
              Get started
            </PrimaryButton>
            <GhostButton href="/demo" className="h-11 justify-center py-0">
              Try the live demo
            </GhostButton>
          </div>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-16 max-w-7xl px-4 sm:mt-20 sm:px-6">
        <Reveal delay={240} className="relative">
          <LiveChips />
          <ScrollTilt>
            <DashboardMockup />
          </ScrollTilt>
        </Reveal>
      </div>
    </section>
  );
}

// Each word blurs up in turn; the whole line stays one readable string.
function Words({
  text,
  start,
  className,
}: {
  text: string;
  start: number;
  className?: string;
}) {
  return text.split(" ").map((word, i, all) => (
    <span key={i}>
      <span
        className={`pa-word ${className ?? ""}`}
        style={{ "--pa-delay": `${start + i * 70}ms` } as React.CSSProperties}
      >
        {word}
      </span>
      {i < all.length - 1 && " "}
    </span>
  ));
}
