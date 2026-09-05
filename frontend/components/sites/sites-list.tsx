"use client";

import Link from "next/link";
import { SiteCard } from "@/components/sites/site-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSites } from "@/hooks/useSites";
import { getErrorMessage } from "@/lib/utils";

export function SitesList() {
  const { data: sites, isLoading, error } = useSites();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  // Distinct from the empty state below — a failed request used to render as
  // "No sites yet", which reads as data loss.
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getErrorMessage(error, "Failed to load sites.")}
      </p>
    );
  }

  if (!sites?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No sites yet.{" "}
        <Link
          href="/dashboard/sites/new"
          className="underline underline-offset-4"
        >
          Add your first site
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} />
      ))}
    </div>
  );
}
