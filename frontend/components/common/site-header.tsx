"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type Crumb = { label: string; href: string };

const LABELS: Record<string, string> = {
  sites: "Sites",
  account: "Account",
  new: "New site",
};

// Inside a site the trail stops at Sites; the page heading names the site.
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const start = segments.indexOf("dashboard");
  if (start === -1) return [];

  const crumbs: Crumb[] = [];
  let href = "/dashboard";

  for (const segment of segments.slice(start + 1)) {
    href += `/${segment}`;
    if (!LABELS[segment]) break;
    crumbs.push({ label: LABELS[segment], href });
  }

  return crumbs;
}

export function SiteHeader() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const lastIndex = crumbs.length - 1;
  const isTruncated = lastIndex >= 0 && pathname !== crumbs[lastIndex].href;

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {crumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) =>
                index === lastIndex && !isTruncated ? (
                  <BreadcrumbItem key={crumb.href}>
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : (
                  <Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < lastIndex && <BreadcrumbSeparator />}
                  </Fragment>
                )
              )}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}
