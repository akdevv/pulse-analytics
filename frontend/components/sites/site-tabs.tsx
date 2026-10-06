"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const TABS = [
  { label: "Analytics", segment: "" },
  { label: "Ask AI", segment: "/ask" },
  { label: "Setup", segment: "/setup" },
  { label: "Settings", segment: "/settings" },
];

/**
 * Section tabs for one site, rendered by the page rather than the layout so a
 * page can hand its own scope controls to the left of the row — the date range
 * on analytics, nothing on the rest.
 */
export function SiteTabs({ children }: { children?: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = `/dashboard/sites/${id}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--seam)] px-5 py-3">
      <div className="flex min-h-9 items-center gap-2">{children}</div>
      <nav
        aria-label="Site sections"
        className="-mb-3 flex gap-1 overflow-x-auto"
      >
        {TABS.map(({ label, segment }) => {
          const href = `${base}${segment}`;
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`relative shrink-0 px-3 pb-3 text-[13px] transition-colors duration-150 ease-[var(--ease-out)] ${
                isActive
                  ? "text-foreground"
                  : "text-foreground/45 hover:text-foreground/90"
              }`}
            >
              {label}
              {isActive && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
