import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pulse Analytics",
  description:
    "Self-hosted, cookieless web analytics. SDK, ingestion pipeline, and dashboard in one repository.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The whole app is dark; the class lives on <html> so portals and native controls get it too.
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
