import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth.context";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description:
    "Pulse Analytics is a platform for tracking and analyzing your data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark antialiased">
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
