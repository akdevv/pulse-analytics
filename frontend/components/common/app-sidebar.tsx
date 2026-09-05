"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IoMdLogOut } from "react-icons/io";
import { MdLocalActivity } from "react-icons/md";
import { PiBookOpenTextBold, PiGlobeSimpleBold } from "react-icons/pi";
import { RiUserSmileLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth.context";

// Account-level destinations only. Everything scoped to one site is a tab on
// that site's pages, and nothing here is listed before it works.
const NAV = [
  { title: "Sites", url: "/dashboard/sites", icon: PiGlobeSimpleBold },
  // Signed out, the docs are reachable from the landing nav. Signed in, this
  // was the only way in and it was missing.
  { title: "Docs", url: "/docs", icon: PiBookOpenTextBold },
];

const ACCOUNT = {
  title: "Account",
  url: "/dashboard/account",
  icon: RiUserSmileLine,
};

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const item = ({ title, url, icon: Icon }: (typeof NAV)[number]) => (
    <SidebarMenuItem key={title}>
      <SidebarMenuButton asChild isActive={pathname?.startsWith(url)}>
        <Link href={url}>
          <Icon className="size-5" />
          <span>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-none">
      <SidebarContent className="flex flex-col gap-0">
        <SidebarHeader className="p-4 text-lg font-semibold">
          <Link
            href="/dashboard/sites"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <MdLocalActivity className="size-5 text-secondary" />
            <span>Pulse Analytics</span>
          </Link>
        </SidebarHeader>

        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupContent>
            <SidebarMenu>{NAV.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account and logout are the same errand, so they sit together. */}
        <SidebarFooter className="mt-auto gap-1 p-4">
          <SidebarMenu>{item(ACCOUNT)}</SidebarMenu>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full cursor-pointer justify-start"
          >
            <IoMdLogOut className="mr-2 size-5" />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
