import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocsNav } from "@/components/docs/docs-nav";
import { DocsHeader } from "@/components/docs/docs-header";

export const metadata: Metadata = {
  title: { default: "Documentation", template: "%s · Pulse docs" },
  description:
    "Install Pulse Analytics on any site, track pageviews and custom events, and understand what happens to them.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal">
      <DocsHeader />
      <div className="mx-auto flex max-w-[80rem] px-5 sm:px-8">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col overflow-y-auto border-r border-ink/8 py-12 pr-8 lg:flex">
          <DocsNav />
        </aside>
        {children}
      </div>
    </div>
  );
}
