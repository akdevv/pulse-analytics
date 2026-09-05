import { redirect } from "next/navigation";

import { DOCS } from "@/content/docs/nav";

// /docs has no page of its own. The first entry in reading order is the
// front door, and keeping it here means the order lives in one file.
export default function DocsIndex() {
  redirect(`/docs/${DOCS[0]!.slug}`);
}
