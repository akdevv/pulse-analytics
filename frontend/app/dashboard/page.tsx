"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSites } from "@/lib/api/sites.api";
import type { Site } from "@/lib/types/site.types";

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const data = await getSites();
        setSites(data);
      } catch (err) {
        console.error("Failed to fetch sites:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground text-sm p-1">Loading...</div>;
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <p className="text-sm font-medium">No sites yet</p>
        <p className="text-xs text-muted-foreground">
          Create a site to start tracking analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="p-1 space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Your Sites</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a site to view its analytics.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <button
            key={site.id}
            onClick={() => router.push(`/dashboard/${site.id}`)}
            className="text-left rounded-lg border bg-card p-4 hover:bg-accent transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-accent-foreground">
                  {site.name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {site.domain}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  site.isActive
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    site.isActive ? "bg-green-500" : "bg-muted-foreground"
                  }`}
                />
                {site.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest font-medium">
              {site.rateLimitTier}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
