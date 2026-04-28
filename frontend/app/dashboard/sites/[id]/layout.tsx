"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { getSiteById } from "@/lib/api/sites.api";
import type { Site } from "@/lib/types/site.types";

const TABS = [
  { label: "Analytics", href: (id: string) => `/dashboard/sites/${id}` },
  { label: "Setup", href: (id: string) => `/dashboard/sites/${id}/setup` },
  { label: "Settings", href: (id: string) => `/dashboard/sites/${id}/settings` },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    getSiteById(id).then(setSite).catch(() => null);
  }, [id]);

  return (
    <div className="flex flex-col h-full">
      {/* Site header */}
      <div className="px-1 pt-1 pb-0 shrink-0">
        <div className="flex items-center gap-2.5 mb-4">
          {site ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">{site.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
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
              <span className="text-sm text-muted-foreground">{site.domain}</span>
            </>
          ) : (
            <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          )}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => {
            const href = tab.href(id);
            const isActive = pathname === href;
            return (
              <Link
                key={tab.label}
                href={href}
                className={`relative px-3 pb-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pt-5 px-1 pb-10">
        {children}
      </div>
    </div>
  );
}
