"use client";

import { useParams } from "next/navigation";
import { SiteStatus } from "@/components/sites/site-status";
import { Skeleton } from "@/components/ui/skeleton";
import { useSite } from "@/hooks/useSites";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const { data: site, error } = useSite(id);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--seam)] px-5 py-4">
        {site ? (
          <>
            <h1 className="figure text-[20px]">{site.name}</h1>
            <span className="font-mono text-[11px] text-foreground/45">
              {site.domain}
            </span>
            <SiteStatus
              active={site.isActive}
              label="Receiving"
              className="ml-auto"
            />
          </>
        ) : error ? (
          <h1 className="figure text-[20px] text-destructive">
            Site unavailable
          </h1>
        ) : (
          <Skeleton className="h-6 w-44" />
        )}
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
