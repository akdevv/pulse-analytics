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
    <div className="flex h-full flex-col">
      {/* Who this page is about. The breadcrumb stops at Sites and the tabs
          name the section, so the site is named once, here. */}
      <div className="shrink-0 px-1 pt-1 pb-0">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          {site ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                {site.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                  site.isActive
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    site.isActive ? "bg-success" : "bg-muted-foreground"
                  }`}
                />
                {site.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-sm text-muted-foreground">
                {site.domain}
              </span>
            </>
          ) : error ? (
            // A deleted or foreign site used to sit on a skeleton forever.
            <h1 className="text-xl font-semibold tracking-tight text-destructive">
              Site unavailable
            </h1>
          ) : (
            <Skeleton className="h-7 w-40" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pt-1 pb-10">{children}</div>
    </div>
  );
}
