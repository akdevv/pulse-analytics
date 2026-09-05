"use client";

import { useParams } from "next/navigation";
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
      {/* Who this page is about. The breadcrumb stops at Sites and the tabs
          name the section, so the site is named once, here. */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--seam)] px-5 py-4">
        {site ? (
          <>
            <h1 className="figure text-[20px]">{site.name}</h1>
            <span className="font-mono text-[11px] text-foreground/45">
              {site.domain}
            </span>
            <span
              className={`meta ml-auto flex items-center gap-1.5 ${
                site.isActive ? "text-success" : "text-foreground/40"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  site.isActive ? "bg-success" : "bg-foreground/30"
                }`}
              />
              {site.isActive ? "Receiving" : "Paused"}
            </span>
          </>
        ) : error ? (
          // A deleted or foreign site used to sit on a skeleton forever.
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
