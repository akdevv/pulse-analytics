import Link from "next/link";

import { AuthPanel, AuthPanelMobile } from "@/components/auth/auth-panel";
import { LeaveDemo } from "@/components/demo/leave-demo";
import { PulseLogo } from "@/components/landing/shared";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark grid min-h-dvh bg-charcoal lg:grid-cols-2">
      <LeaveDemo />
      <div className="relative flex min-h-dvh flex-col lg:min-h-0">
        <AuthPanelMobile />

        <div className="mx-auto flex w-full max-w-[392px] flex-1 flex-col px-6 pt-2 pb-10 sm:pt-6 lg:pt-10 lg:pb-6">
          <header className="hidden lg:block">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 rounded-full"
            >
              <PulseLogo size={26} />
              <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink transition-opacity duration-150 ease-out group-hover:opacity-80">
                Pulse Analytics
              </span>
            </Link>
          </header>

          <main className="flex flex-1 lg:items-center lg:py-14">
            {children}
          </main>
        </div>
      </div>

      <AuthPanel />
    </div>
  );
}
