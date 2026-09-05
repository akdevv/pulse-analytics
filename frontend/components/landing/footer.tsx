import Link from "next/link";
import { ACCENT, DISPLAY, LOGO_FONT } from "./tokens";
import { PulseLogo } from "./shared";

const REPO = "https://github.com/akdevv/pulse-analytics";

/* Every href here goes somewhere. The old footer had sixteen links
   pointing at "#", including a column of jokes dressed as navigation. */
const COLS = [
  {
    title: "Explore",
    links: [
      { label: "Stack", href: "#stack" },
      { label: "Architecture", href: "#how-it-works" },
      { label: "Metrics", href: "#features" },
      { label: "The story", href: "#story" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Installation", href: "/docs/installation" },
      { label: "Custom events", href: "/docs/events" },
      { label: "SDK reference", href: "/docs/reference" },
    ],
  },
  {
    title: "Source",
    links: [
      { label: "Repository", href: REPO },
      { label: "Issues", href: `${REPO}/issues` },
      { label: "MIT License", href: `${REPO}/blob/main/LICENSE` },
      { label: "Commits", href: `${REPO}/commits/main` },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-charcoal">
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(229,227,210,0.08) 20%, ${ACCENT} 50%, rgba(229,227,210,0.08) 80%, transparent)`,
          opacity: 0.35,
        }}
      />

      <div className="mx-auto max-w-7xl px-6 pt-20">
        <div className="grid grid-cols-2 gap-x-10 gap-y-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-5 md:col-span-1">
            <Link href="/" className="inline-flex w-fit items-center gap-2.5">
              <PulseLogo size={26} />
              <span className="text-[16px] text-ink" style={LOGO_FONT}>
                Pulse Analytics
              </span>
            </Link>
            <p className="max-w-[260px] text-[13px] leading-relaxed text-ink/55">
              Ten thousand events a second on one box, because the weekend was
              free and the alternative was yard work.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-powder opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-powder" />
              </span>
              <span className="font-mono text-[11px] tracking-[0.18em] text-ink/50 uppercase">
                Last deploy · 2 commits ago
              </span>
            </div>
          </div>

          {COLS.map(({ title, links }) => (
            <nav key={title} className="flex flex-col gap-4">
              <h2 className="font-mono text-[10px] tracking-[0.22em] text-ink/35 uppercase">
                {title}
              </h2>
              <ul className="flex flex-col gap-3">
                {links.map(({ label, href }) => {
                  const external = href.startsWith("http");
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                        className="group inline-flex items-center gap-1.5 text-[13px] text-ink/55 transition-colors duration-200 ease-[var(--ease-out)] hover:text-ink"
                      >
                        {label}
                        <span
                          aria-hidden
                          className="h-px w-0 transition-[width] duration-300 ease-[var(--ease-out)] group-hover:w-3"
                          style={{ background: ACCENT }}
                        />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* The wordmark is the footer's one indulgence: set at the width
            of the page, cropped by the bottom edge, faded almost out. It
            signs the page instead of decorating it. */}
        <div
          aria-hidden
          className="pointer-events-none mt-16 -mb-2 select-none overflow-hidden"
          style={{
            maskImage: "linear-gradient(180deg, #000 0%, transparent 88%)",
            WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 88%)",
          }}
        >
          <span
            className="block whitespace-nowrap text-[min(11vw,9rem)] leading-[0.76] text-ink/[0.055]"
            style={{ ...DISPLAY, fontWeight: 700, letterSpacing: "-0.045em" }}
          >
            Pulse Analytics
          </span>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink/8 py-7 md:flex-row">
          <p className="font-mono text-[11px] tracking-wider text-ink/45">
            © {new Date().getFullYear()} · made with ink and grit
          </p>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-ink/50 uppercase transition-colors duration-200 ease-[var(--ease-out)] hover:text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            akdevv/pulse-analytics
          </a>
        </div>
      </div>
    </footer>
  );
}
