import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GhostButton, PrimaryButton, Reveal } from "./shared";
import { DashboardMockup } from "./dashboard-mockup";
import { InstrumentStrip, YourVisit } from "./hero-live";
import { REPO } from "./site";
import { dots } from "./surfaces";

const GLOW = [
  "radial-gradient(ellipse 100% 70% at 50% 14%, transparent 42%, var(--color-charcoal) 90%)",
  "radial-gradient(620px 380px at 30% 0%, color-mix(in oklab, var(--color-tangerine) 14%, transparent), transparent)",
].join(", ");

const DOTS = dots(
  "radial-gradient(ellipse 70% 55% at 50% 30%, black 20%, transparent 76%)"
);

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-6 sm:pt-32 md:pt-36">
      <div aria-hidden className="absolute inset-0" style={DOTS} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: GLOW }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14">
        <div className="pa-hero-copy">
          <Reveal>
            <Link
              href={`${REPO}/releases`}
              target="_blank"
              rel="noreferrer"
              className="group mb-8 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/3 py-1 pr-2.5 pl-1 text-[12px] text-ink/65 transition-colors duration-150 ease-out hover:border-ink/20 hover:text-ink"
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

          <h1 className="font-display text-[44px] leading-[0.94] font-semibold tracking-[-0.04em] text-balance text-ink sm:text-[64px] lg:text-[76px]">
            <Words text="Event analytics" start={80} />{" "}
            <Words text="at" start={240} />{" "}
            <Words
              text="ridiculous scale."
              start={300}
              className="text-tangerine-soft"
            />
          </h1>

          <Reveal delay={120}>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-pretty text-ink/65 sm:text-[17px]">
              Cookieless pageviews and custom events from a 3&nbsp;KB script. A
              thin ingest path, a queue, and TimescaleDB rollups behind it,
              built to take ten thousand events a second.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row">
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

        <Reveal delay={260}>
          <YourVisit />
        </Reveal>
      </div>

      <div className="relative mx-auto mt-14 max-w-6xl px-5 sm:px-6">
        <Reveal delay={320}>
          <InstrumentStrip />
        </Reveal>
      </div>

      <div className="relative mx-auto mt-16 max-w-7xl px-4 sm:mt-20 sm:px-6">
        <Reveal delay={200}>
          <DashboardMockup />
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
