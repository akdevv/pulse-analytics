"use client";

import { useParams } from "next/navigation";
import { AskPanel } from "@/components/ai/ask-panel";
import { SiteTabs } from "@/components/sites/site-tabs";

export default function AskPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <SiteTabs />
      <div className="p-5">
        <AskPanel siteId={id} />
      </div>
    </>
  );
}
