"use client";

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

type Crumb = {
  label: string;
  href: string;
};

function buildDashboardCrumbs(pathname: string): Crumb[] {
  const withoutQuery = pathname.split("?")[0];
  const segments = withoutQuery.split("/").filter(Boolean);

  const dashboardIndex = segments.indexOf("dashboard");
  if (dashboardIndex === -1) {
    return [];
  }

  const relevant = segments.slice(dashboardIndex);

  const crumbs: Crumb[] = [];
  let href = "";

  for (let i = 0; i < relevant.length; i++) {
    const segment = relevant[i];
    href += `/${segment}`;

    const isId = /^[0-9a-fA-F-]+$/.test(segment);
    const label = isId
      ? "Details"
      : segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    crumbs.push({ label, href });
  }

  return crumbs;
}

export function SiteHeader() {
  const pathname = usePathname();
  const crumbs = buildDashboardCrumbs(pathname || "/");

  const hasCrumbs = crumbs.length > 0;
  const lastIndex = crumbs.length - 1;

  return (
    <header className="flex h-13 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {hasCrumbs && (
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => {
                const isLast = index === lastIndex;

                if (isLast) {
                  return (
                    <BreadcrumbItem key={crumb.href}>
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  );
                }

                return (
                  <Fragment key={crumb.href}>
                    <BreadcrumbItem
                      className={index === 0 ? "hidden md:block" : undefined}
                    >
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}
