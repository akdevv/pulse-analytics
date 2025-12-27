"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { RiHome9Fill, RiUserSmileLine } from "react-icons/ri";
import { PiGlobeSimpleBold } from "react-icons/pi";
import { MdLocalActivity } from "react-icons/md";
import { IoMdLogOut } from "react-icons/io";

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
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth.api";

// Menu items.
const items = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: RiHome9Fill,
  },
  {
    title: "Sites",
    url: "/dashboard/sites",
    icon: PiGlobeSimpleBold,
  },
  {
    title: "Account",
    url: "/dashboard/account",
    icon: RiUserSmileLine,
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <Sidebar className="border-none">
      <SidebarContent className="flex flex-col gap-0">
        <SidebarHeader className="text-lg font-semibold p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <MdLocalActivity className="size-5 text-secondary" />
            <span>Pulse Analytics</span>
          </Link>
        </SidebarHeader>
        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="mt-auto p-4">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start cursor-pointer"
          >
            <IoMdLogOut className="size-5 mr-2" />
            <span>Logout</span>
          </Button>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
