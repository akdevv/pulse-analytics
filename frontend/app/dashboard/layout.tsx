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
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

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

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col border-l border-[var(--seam)] bg-background">
          <SiteHeader />
          <main className="hide-scrollbar flex-1 overflow-y-auto">
            <div className="page-col flex min-h-full flex-col">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
