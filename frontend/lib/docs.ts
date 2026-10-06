import { readFile } from "node:fs/promises";
import path from "node:path";

import { DOCS_VERSION, getDocLink } from "@/content/docs/nav";

const DOCS_DIR = path.join(process.cwd(), "content", "docs", DOCS_VERSION);

// Snippets need the bare origin: the SDK appends /api/v1/track itself.
const API_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).origin;

// The slug is checked against the known docs so a request path never reaches readFile.
export async function getDocContent(slug: string): Promise<string | null> {
  if (!getDocLink(slug)) return null;
  const raw = await readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8");
  return raw.replaceAll("{{API_ORIGIN}}", API_ORIGIN);
}
