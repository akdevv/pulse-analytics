import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth.context"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description:
    "Pulse Analytics is a platform for tracking and analyzing your data.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark font-sans antialiased">
        <Providers>
          <AuthProvider>
            {children}
            <Toaster richColors />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
