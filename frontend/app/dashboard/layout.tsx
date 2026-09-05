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
      <div className="flex h-dvh w-full gap-2 bg-sidebar p-2">
        <div className="hidden w-64 shrink-0 flex-col gap-3 p-4 md:flex">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 rounded-xl bg-background p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-sidebar">
        <AppSidebar />
        <div className="flex-1 p-2">
          <div className="flex h-full flex-col rounded-xl bg-background">
            <SiteHeader />
            <main className="hide-scrollbar flex flex-1 overflow-y-auto p-0 md:p-3">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
