import Link from "next/link";

import { AuthPanel, AuthPanelMobile } from "@/components/auth/auth-panel";
import { PulseLogo } from "@/components/landing/shared";

/* ── Auth chrome ───────────────────────────────────────────────
   Both auth pages shipped this background, logo and centring as
   copy-pasted markup. It belongs to the route group, so it lives here.

   Even split from lg up: mark and form on the left sharing one left
   edge in a centred column, landscape on the right. Below lg the
   landscape becomes a short header band carrying the mark, and the form
   starts directly beneath it rather than floating mid-screen. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark grid min-h-dvh bg-charcoal lg:grid-cols-2">
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
