import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Reveal, SectionHeading } from "./shared";
import { highlight } from "./highlight";
import { InstallCode } from "./install-code";

// Mirrors content/docs/v1/quickstart.md; change both together.
const SNIPPET = `<!-- Pulse Analytics -->
<script
  src="https://pulse.yourdomain.com/pulse.js"
  data-tid="pk-8f2c41a9d7e04b6fa1c35d8e92b74a06"
  data-host="https://pulse.yourdomain.com"
></script>`;

const REACT = `import { usePulse } from "@akdevv/pulse/react"

export function App() {
  usePulse({
    siteId: "pk-8f2c41a9d7e04b6fa1c35d8e92b74a06",
    apiHost: "https://pulse.yourdomain.com",
  })
  return <Routes />
}`;

const STEPS = [
  {
    title: "Create a site",
    body: "Sign in, add a site, and copy its tracking ID. The ID is public, like any analytics tag.",
  },
  {
    title: "Paste one script tag",
    body: "Put it in the <head>. It's 3 KB and sends the pageview as soon as it loads. Use npm instead if you prefer.",
  },
  {
    title: "Load a page",
    body: "The realtime count in the dashboard updates within a few seconds.",
  },
];

export async function Install() {
  const [html, react] = await Promise.all([
    highlight(SNIPPET, "html"),
    highlight(REACT, "tsx"),
  ]);

  return (
    <section id="install" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="Install"
            title="Two minutes"
            muted="to your first pageview."
          />
        </Reveal>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <Reveal delay={60}>
            <ol className="border-t border-ink/8">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] border-b border-ink/8 py-6"
                >
                  <span className="grid size-7 place-items-center rounded-lg border border-ink/10 bg-ink/3 font-mono text-[12px] text-ink/50 tabular-nums shadow-edge">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-[19px] leading-snug font-semibold tracking-display text-ink">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-pretty text-ink/55">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href="/docs/quickstart"
              className="group -mx-3 mt-3 grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center rounded-xl px-3 py-3 transition-colors duration-150 ease-out hover:bg-ink/4"
            >
              <span className="grid size-7 place-items-center rounded-lg border border-ink/10 bg-ink/3 text-ink/50 shadow-edge">
                <BookOpen aria-hidden size={14} />
              </span>
              <span>
                <span className="block text-[15px] font-medium text-ink">
                  Read the quickstart
                </span>
                <span className="block text-[13.5px] text-ink/45">
                  Setup, verifying it works, and troubleshooting.
                </span>
              </span>
              <ArrowRight
                aria-hidden
                size={16}
                className="text-ink/40 transition-[transform,color] duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-ink"
              />
            </Link>
          </Reveal>

          <Reveal delay={120} className="min-w-0">
            <InstallCode
              tabs={[
                {
                  label: "HTML",
                  file: "index.html",
                  lang: "html",
                  html,
                  code: SNIPPET,
                },
                {
                  label: "React",
                  file: "app.tsx",
                  lang: "tsx",
                  html: react,
                  code: REACT,
                },
              ]}
            />
            <p className="mt-4 px-1 text-[13px] text-ink/40">
              Swap in the tracking ID from your site&apos;s settings.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
