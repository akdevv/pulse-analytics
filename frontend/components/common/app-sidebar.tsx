"use client";

import { BookOpenText, CircleUserRound, Globe, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { PulseLogo } from "@/components/landing/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth.context";

const NAV = [
  { title: "Sites", url: "/dashboard/sites", icon: Globe },
  { title: "Docs", url: "/docs", icon: BookOpenText },
];

const ACCOUNT = {
  title: "Account",
  url: "/dashboard/account",
  icon: CircleUserRound,
};

function NavLink({
  title,
  url,
  icon: Icon,
  active,
}: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={url}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors duration-150 ease-[var(--ease-out)] ${
        active
          ? "bg-muted text-foreground"
          : "text-foreground/50 hover:bg-foreground/[0.05] hover:text-foreground/90"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <Icon
        className={`size-4 shrink-0 ${active ? "text-primary" : "text-current"}`}
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
    </Link>
  );
}

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
      <SidebarContent className="flex flex-col gap-0 bg-background">
        <SidebarHeader className="px-4 py-4">
          <Link
            href="/dashboard/sites"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <PulseLogo size={20} />
            <span className="truncate text-[13px] font-semibold tracking-[-0.02em]">
              Pulse Analytics
            </span>
          </Link>
        </SidebarHeader>

        <SidebarGroup className="flex-1 px-3 py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {NAV.map((item) => (
                <NavLink
                  key={item.title}
                  {...item}
                  active={pathname.startsWith(item.url)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="mt-auto gap-0.5 border-t border-[var(--seam)] px-3 py-3">
          <NavLink {...ACCOUNT} active={pathname.startsWith(ACCOUNT.url)} />
          <button
            type="button"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-foreground/50 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-foreground/[0.05] hover:text-foreground/90"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Log out</span>
          </button>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
