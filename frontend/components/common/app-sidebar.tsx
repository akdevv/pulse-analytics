"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IoMdLogOut } from "react-icons/io";
import { MdLocalActivity } from "react-icons/md";
import { PiGlobeSimpleBold } from "react-icons/pi";
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

// Menu items.
const items = [
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
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

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
