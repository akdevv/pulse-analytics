import Link from "next/link";
import { PulseLogo } from "./shared";
import { NPM, REPO } from "./site";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Install", href: "/#install" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Installation", href: "/docs/installation" },
      { label: "Custom events", href: "/docs/events" },
      { label: "SDK reference", href: "/docs/reference" },
      { label: "Architecture", href: "/docs/how-it-works" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: REPO },
      { label: "Releases", href: `${REPO}/releases` },
      { label: "Changelog", href: `${REPO}/commits/main` },
      { label: "Report an issue", href: `${REPO}/issues` },
      { label: "npm package", href: NPM },
    ],
  },
];

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-ink/8 bg-charcoal">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-3 gap-x-4 gap-y-10 py-14 sm:gap-x-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:py-16">
          <div className="col-span-3 flex flex-col items-start gap-4 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5"
              aria-label="Pulse home"
            >
              <PulseLogo size={24} />
              <span className="font-display text-[16px] font-bold tracking-logo text-ink">
                Pulse
              </span>
            </Link>
            <p className="max-w-65 text-[13.5px] leading-relaxed text-ink/50">
              Self-hosted, cookieless web analytics. SDK, ingestion pipeline,
              and dashboard in one repository.
            </p>
          </div>

          {COLS.map(({ title, links }) => (
            <nav key={title} aria-label={title} className="flex flex-col gap-4">
              <h2 className="text-[12.5px] font-medium text-ink/40">{title}</h2>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href }) => {
                  const external = href.startsWith("http");
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                        className="text-[13.5px] text-ink/65 transition-colors duration-150 ease-out hover:text-ink sm:text-[14px]"
                      >
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink/6 py-6 text-[12.5px] text-ink/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Pulse Analytics</p>
          <p>
            Built by{" "}
            <a
              href="https://akdevv.com"
              target="_blank"
              rel="noreferrer"
              className="text-ink/60 underline decoration-ink/20 underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ink/50"
            >
              akdevv
            </a>
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="pa-wordmark pointer-events-none mx-auto max-w-6xl overflow-hidden px-6 select-none"
      >
        <span className="pa-dot block translate-y-[12%] text-center text-[clamp(88px,24vw,320px)] leading-[0.8] font-black tracking-[0.02em]">
          PULSE
        </span>
      </div>
    </footer>
  );
}
