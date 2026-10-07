"use client";

import { useEffect } from "react";
import { PulseLogo } from "@/components/landing/shared";
import { DEMO_COOKIE, DEMO_HOME } from "@/lib/demo/mode";

export default function DemoPage() {
  useEffect(() => {
    document.cookie = `${DEMO_COOKIE}=1; path=/; samesite=lax`;
    window.location.replace(DEMO_HOME);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-charcoal">
      <div className="flex items-center gap-3 text-[14px] text-ink/70">
        <PulseLogo size={22} />
        Loading the demo…
      </div>
    </main>
  );
}
