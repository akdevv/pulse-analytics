import {
  CopyCommand,
  GhostButton,
  GitHubIcon,
  PrimaryButton,
  Reveal,
} from "./shared";
import { REPO } from "./site";
import { dots } from "./surfaces";

const GRADIENT = [
  "radial-gradient(120% 60% at 50% 120%, color-mix(in oklab, var(--color-tangerine) 38%, transparent), transparent 60%)",
  "radial-gradient(45% 55% at 82% 100%, color-mix(in oklab, var(--color-tangerine-soft) 18%, transparent), transparent 70%)",
  "radial-gradient(45% 55% at 12% 0%, color-mix(in oklab, var(--color-powder) 9%, transparent), transparent 70%)",
  "linear-gradient(to bottom, oklch(0.215 0 0), var(--color-charcoal) 55%, oklch(0.19 0.012 45))",
].join(", ");

const DOTS = dots(
  "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent 80%)",
  5
);

export function CTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-ink/8">
            <div
              className="relative isolate overflow-hidden px-6 py-20 text-center md:py-28"
              style={{ background: GRADIENT }}
            >
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={DOTS}
              />

              <h2 className="pa-zoom mx-auto max-w-3xl font-display text-[38px] leading-[1.02] font-semibold tracking-[-0.035em] text-balance text-ink sm:text-[52px] md:text-[60px]">
                See your traffic.
                <span className="block text-ink/35">
                  Leave your visitors alone.
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-pretty text-ink/60">
                Open source and MIT licensed. Run it on your own box, or sign up
                and try it here.
              </p>

              <div className="mx-auto mt-9 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
                <PrimaryButton
                  href="/register"
                  className="h-11 justify-center py-0"
                >
                  Get started
                </PrimaryButton>
                <GhostButton
                  href={REPO}
                  external
                  className="h-11 justify-center py-0"
                >
                  <GitHubIcon size={14} />
                  View source
                </GhostButton>
              </div>

              <div className="mt-8">
                <CopyCommand command="npm install @akdevv/pulse" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
