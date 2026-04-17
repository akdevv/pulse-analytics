import Link from "next/link";
import { LOGO_FONT, PulseLogo } from "./shared";

const COLS = [
  { title: "Explore", links: ["Stack", "Architecture", "Metrics", "Roadmap"] },
  { title: "Source", links: ["GitHub", "Issues", "License (MIT)", "Changelog"] },
  { title: "The author", links: ["Hire me", "Reach out", "Blog", "Résumé"] },
  { title: "Meta", links: ["Built in 2 weekends", "0 investors", "1 keyboard", "404 ads"] },
];

export function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/6">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
              <PulseLogo size={26} />
              <span className="text-[16px] text-white" style={LOGO_FONT}>
                Pulse Analytics
              </span>
            </Link>
            <p className="text-[13.5px] text-white/45 max-w-xs leading-relaxed">
              Built at scale, the old-fashioned way. No boring charts allowed.
            </p>
            <div className="mt-6 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-[0.18em]">
                Last deploy · 2 commits ago
              </span>
            </div>
          </div>

          {COLS.map(({ title, links }) => (
            <div key={title}>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/30 mb-5">
                {title}
              </div>
              <ul className="space-y-3">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="group inline-flex items-center gap-1 text-[13px] text-white/60 transition-colors hover:text-white"
                    >
                      <span>{l}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-white/6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-mono text-white/30 tracking-wide">
            © 2025 · made with ink and grit
          </p>
          <div className="flex items-center gap-6">
            {["GitHub", "X", "LinkedIn"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-white"
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
