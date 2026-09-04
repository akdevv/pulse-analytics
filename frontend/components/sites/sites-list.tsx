"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteCard } from "@/components/sites/site-card";
import { getSites } from "@/lib/api/sites.api";
import type { Site } from "@/lib/types/site.types";

export function SitesList() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

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
    return (
      <div className="text-sm text-muted-foreground">Loading sites...</div>
    );
  }

  if (sites?.length === 0) {
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
