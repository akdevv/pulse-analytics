"use client";

import { useParams } from "next/navigation";
import { AskPanel } from "@/components/ai/ask-panel";

export default function AskPage() {
  const { id } = useParams<{ id: string }>();
  return <AskPanel siteId={id} />;
}
