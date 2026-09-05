"use client";

import { useParams } from "next/navigation";
import { AskPanel } from "@/components/ai/ask-panel";
import { SiteTabs } from "@/components/sites/site-tabs";

export default function AskPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-5">
      <SiteTabs />
      <AskPanel siteId={id} />
    </div>
  );
}
