"use client";

import { AppSidebar } from "@/components/common/app-sidebar";
import { SiteHeader } from "@/components/common/site-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth.context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // The session is restored from a cookie on every load, so this renders on
  // every entry to the dashboard. It draws the shell it is about to become
  // rather than a bare word, which used to land as a flash of unstyled page.
  if (isLoading) {
    return (
      <div className="flex h-dvh w-full bg-background">
        <div className="hidden w-64 shrink-0 flex-col gap-3 border-r border-[var(--seam)] p-4 md:flex">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      {/* Charcoal ground, panel-coloured content: the rail is the darkest
          surface in the app, the way it is in the panel on the landing.
          It was the other way round, so the navigation read as the
          foreground and the data read as a hole cut out of it. */}
      <div className="flex h-dvh w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col border-l border-[var(--seam)] bg-background">
          <SiteHeader />
          <main className="hide-scrollbar flex flex-1 flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
