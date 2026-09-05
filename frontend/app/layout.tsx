import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth.context";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description:
    "Pulse Analytics is a platform for tracking and analyzing your data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // The app is dark throughout — landing, auth, docs and dashboard. The
    // class sits on <html> so it also reaches portals and the native surfaces
    // color-scheme controls: scrollbars, form controls, autofill.
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <AuthProvider>
            {children}
            <Toaster richColors />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
