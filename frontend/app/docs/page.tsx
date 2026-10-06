import { redirect } from "next/navigation";

import { DOCS } from "@/content/docs/nav";

export default function DocsIndex() {
  redirect(`/docs/${DOCS[0]!.slug}`);
}
