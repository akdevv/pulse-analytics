import Link from "next/link";
import { ACCENT, LOGO_FONT, PulseLogo } from "./shared";

const COLS = [
  { title: "Explore", links: ["Stack", "Architecture", "Metrics", "Roadmap"] },
  {
    title: "Source",
    links: ["GitHub", "Issues", "License (MIT)", "Changelog"],
  },
  { title: "The author", links: ["Hire me", "Reach out", "Blog", "Résumé"] },
  {
    title: "Meta",
    links: ["Built in 2 weekends", "0 investors", "1 keyboard", "404 ads"],
  },
];

export function Footer() {
  return (
    <footer className="relative" style={{ background: "var(--pa-bg)" }}>
      {/* top separator with accent center */}
      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, ${ACCENT} 50%, rgba(255,255,255,0.08) 80%, transparent)`,
          opacity: 0.4,
        }}
      />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        {/* main grid */}
        <div className="mb-14 grid grid-cols-2 gap-x-10 gap-y-12 md:grid-cols-6">
          {/* brand col */}
          <div className="col-span-2 flex flex-col gap-5">
            <Link href="/" className="inline-flex w-fit items-center gap-2.5">
              <PulseLogo size={26} />
              <span className="text-[16px] text-white" style={LOGO_FONT}>
                Pulse Analytics
              </span>
            </Link>
            <p className="max-w-[220px] text-[13px] leading-relaxed text-white/40">
              Built at scale, the old-fashioned way. No boring charts allowed.
            </p>
            <div className="mt-auto flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[10.5px] tracking-[0.18em] text-white/35 uppercase">
                Last deploy · 2 commits ago
              </span>
            </div>
          </div>

          {/* link cols */}
          {COLS.map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-4">
              <div className="font-mono text-[10px] tracking-[0.22em] text-white/30 uppercase">
                {title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[13px] text-white/55 transition-colors duration-200 hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/6 pt-8 md:flex-row">
          <p className="font-mono text-[11px] tracking-wider text-white/25">
            © {new Date().getFullYear()} · made with ink and grit
          </p>
          <div className="flex items-center gap-5">
            {["GitHub", "X", "LinkedIn"].map((s) => (
              <a
                key={s}
                href="#"
                className="font-mono text-[11px] tracking-[0.18em] text-white/35 uppercase transition-colors duration-200 hover:text-white/80"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
