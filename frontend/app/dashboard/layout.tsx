"use client";

import { AppSidebar } from "@/components/common/app-sidebar";
import { SiteHeader } from "@/components/common/site-header";
import { SidebarProvider } from "@/components/ui/sidebar";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-sidebar">
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
