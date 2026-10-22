import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PulseLogo } from "@/components/landing/shared";
import { FollowEvent } from "@/components/lab/follow-event";
import { SpikeAbsorber } from "@/components/lab/spike-absorber";
import { TrafficSim } from "@/components/lab/traffic-sim";
import { VisitorVsServer } from "@/components/lab/visitor-vs-server";
import { WithWithout } from "@/components/lab/with-without";

export const metadata: Metadata = {
  title: "Lab · Pulse Analytics",
  robots: { index: false, follow: false },
};

const EXPERIMENTS = [
  {
    id: "follow",
    name: "Follow one event",
    explains:
      "The whole path, one stop at a time, with a plain sentence at each stop.",
    fit: "A direct replacement for the round-trip section. Works with scroll or as auto-play.",
    Component: FollowEvent,
  },
  {
    id: "spike",
    name: "Spike absorber",
    explains:
      "Why the queue exists: arrivals spike, the queue swells, database writes stay calm.",
    fit: "A second section after the round trip, or the visual for the queue step.",
    Component: SpikeAbsorber,
  },
  {
    id: "with-without",
    name: "With and without the queue",
    explains:
      "What would go wrong without this design, side by side under the same spike.",
    fit: "The strongest argument for the architecture. Good under How it works.",
    Component: WithWithout,
  },
  {
    id: "visitor",
    name: "Visitor vs. server",
    explains:
      "The visitor's part ends at 4.8 ms; everything else runs in the background.",
    fit: "A compact explainer for the 204 and async idea. Familiar to developers as a trace.",
    Component: VisitorVsServer,
  },
  {
    id: "sim",
    name: "Traffic simulator",
    explains:
      "Every request as a dot. You can turn traffic up and watch each part react.",
    fit: "An interactive toy for curious visitors, or a docs page.",
    Component: TrafficSim,
  },
];

export default function LabPage() {
  return (
    <main className="pa-landing min-h-dvh bg-charcoal pb-24">
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-charcoal/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[14px] text-ink/70 transition-colors hover:text-ink"
          >
            <ArrowLeft size={15} />
            <PulseLogo size={20} />
            <span className="font-display font-bold tracking-logo text-ink">
              Pulse
            </span>
          </Link>
          <span className="rounded-full border border-tangerine/30 bg-tangerine/10 px-2.5 py-0.5 font-mono text-[11px] text-tangerine-soft">
            lab
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-16 pb-10 md:pt-20">
          <h1 className="max-w-3xl font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[56px]">
            Ways to explain the round trip
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink/60">
            Five working experiments to replace the 3D particle section. Each
            one explains a different part of the idea. Pick one, or a
            combination, and it goes on the landing page.
          </p>
          <nav aria-label="Experiments" className="mt-8 flex flex-wrap gap-2">
            {EXPERIMENTS.map((e, i) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                className="rounded-full border border-ink/10 px-3 py-1.5 text-[13px] text-ink/65 transition-colors hover:border-tangerine/40 hover:text-ink"
              >
                <span className="mr-1.5 font-mono text-[11px] text-ink/35">
                  {String.fromCharCode(65 + i)}
                </span>
                {e.name}
              </a>
            ))}
          </nav>
        </section>

        {EXPERIMENTS.map((e, i) => (
          <section
            key={e.id}
            id={e.id}
            className="scroll-mt-20 border-t border-ink/8 py-14 md:py-16"
          >
            <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-10">
              <div>
                <p className="font-mono text-[11px] tracking-[0.08em] text-tangerine-soft uppercase">
                  Experiment {String.fromCharCode(65 + i)}
                </p>
                <h2 className="mt-2 font-display text-[30px] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[36px]">
                  {e.name}
                </h2>
              </div>
              <dl className="grid gap-2 text-[14px]">
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-ink/40">Explains</dt>
                  <dd className="text-ink/75">{e.explains}</dd>
                </div>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                  <dt className="text-ink/40">Where it fits</dt>
                  <dd className="text-ink/75">{e.fit}</dd>
                </div>
              </dl>
            </div>
            <e.Component />
          </section>
        ))}

        <section className="border-t border-ink/8 py-14">
          <p className="font-mono text-[11px] tracking-[0.08em] text-ink/40 uppercase">
            For comparison
          </p>
          <h2 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.03em] text-ink">
            The current WebGL particle scene
          </h2>
          <p className="mt-2 max-w-xl text-[14.5px] text-ink/55">
            Still on the landing page until you pick a replacement.
          </p>
          <Link
            href="/#round-trip"
            className="mt-5 inline-flex items-center gap-1.5 text-[14px] text-tangerine-soft hover:text-ink"
          >
            Open it on the landing page <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
    </main>
  );
}
