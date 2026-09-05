import Link from "next/link";
import type { Site } from "@/lib/types/site.types";

/**
 * One site in the list. It answers which site and whether it is reporting;
 * the tracking id and tier are there because this is also where you come to
 * copy them. Set in the panel language rather than as a generic card, so the
 * list reads as part of the same instrument as the dashboard behind it.
 */
export function SiteCard({ site }: { site: Site }) {
  return (
    <Link
      href={`/dashboard/sites/${site.id}`}
      className="panel group flex flex-col gap-4 border border-[var(--seam)] p-5 transition-colors duration-150 ease-[var(--ease-out)] hover:border-primary/35"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="figure truncate text-[17px] transition-colors duration-150 group-hover:text-primary">
            {site.name}
          </p>
          <p className="mt-1.5 truncate font-mono text-[11px] text-foreground/45">
            {site.domain}
          </p>
        </div>
        <span
          className={`meta flex shrink-0 items-center gap-1.5 ${
            site.isActive ? "text-success" : "text-foreground/40"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              site.isActive ? "bg-success" : "bg-foreground/30"
            }`}
          />
          {site.isActive ? "Live" : "Paused"}
        </span>
      </div>

      <dl className="flex items-end justify-between gap-3 border-t border-[var(--seam)] pt-3.5">
        <div className="min-w-0">
          <dt className="meta">Tracking ID</dt>
          <dd className="mt-1.5 truncate font-mono text-[11px] text-foreground/70">
            {site.trackingId}
          </dd>
        </div>
        <div className="shrink-0 text-right">
          <dt className="meta">Tier</dt>
          <dd className="mt-1.5 font-mono text-[11px] text-foreground/70 capitalize">
            {site.rateLimitTier.toLowerCase()}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
