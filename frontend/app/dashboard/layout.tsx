import { AppSidebar } from "@/components/common/app-sidebar";
import { SiteHeader } from "@/components/common/site-header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex w-screen h-screen bg-sidebar">
        <AppSidebar />
        <div className="flex-1 p-2">
          <div className="bg-background rounded-xl h-full">
            <SiteHeader />
            <main className="p-3">{children}</main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
