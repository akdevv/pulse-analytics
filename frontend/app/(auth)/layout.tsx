import Link from "next/link";

import { AuthPanel, AuthPanelMobile } from "@/components/auth/auth-panel";
import { PulseLogo } from "@/components/landing/shared";
import { BG } from "@/components/landing/tokens";

/* ── Auth chrome ───────────────────────────────────────────────
   Both auth pages shipped this background, logo and centring as
   copy-pasted markup. It belongs to the route group, so it lives here.

   Even split from lg up: mark and form on the left sharing one left
   edge in a centred column, landscape on the right. Below lg the
   landscape becomes a footer band rather than disappearing, so a phone
   keeps the identity without the form dropping below the fold. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="dark grid min-h-dvh lg:grid-cols-2"
      style={{ background: BG }}
    >
      <div className="relative flex min-h-dvh flex-col lg:min-h-0">
        <div className="mx-auto flex w-full max-w-86 flex-1 flex-col px-6 pt-9 pb-6 sm:pt-10">
          <header>
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

          <main className="flex flex-1 items-center py-12 sm:py-14">
            {children}
          </main>
        </div>

        <AuthPanelMobile />
      </div>

      <AuthPanel />
    </div>
  );
}
