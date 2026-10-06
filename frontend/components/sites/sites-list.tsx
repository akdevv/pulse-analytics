"use client";

import { EmptyState, StepList } from "@/components/common/empty-state";
import { SiteCard } from "@/components/sites/site-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSites } from "@/hooks/useSites";
import { getErrorMessage } from "@/lib/utils";

export function SitesList() {
  const { data: sites, isLoading, error } = useSites();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        {getErrorMessage(error, "Failed to load sites.")}
      </p>
    );
  }

  if (!sites?.length) {
    return (
      <EmptyState
        title="Track your first site"
        description="Give us a domain and you get a one-line snippet back. Events land as they happen — there is no nightly batch to wait for, and no cookie banner to add."
        actions={[
          { label: "Add a site", href: "/dashboard/sites/new", primary: true },
          { label: "Read the docs", href: "/docs/quickstart" },
        ]}
      >
        <StepList
          marker="count"
          items={[
            {
              title: "Add the site",
              body: "A name and a domain. Two fields, nothing else to decide.",
            },
            {
              title: "Paste one line",
              body: (
                <>
                  A script tag in your{" "}
                  <code className="font-mono text-[11px]">&lt;head&gt;</code>.
                  Any stack, no build step.
                </>
              ),
            },
            {
              title: "Watch it land",
              body: "The first visit shows up live while you are still on the page.",
            },
          ]}
        />
      </EmptyState>
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
