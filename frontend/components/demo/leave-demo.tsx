"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { exitDemo, isDemo } from "@/lib/demo/mode";

// Signing in for real must not run against the in-memory demo API.
export function LeaveDemo() {
  const pathname = usePathname();
  useEffect(() => {
    if (isDemo()) exitDemo(pathname);
  }, [pathname]);
  return null;
}
