import { readFile } from "node:fs/promises";
import path from "node:path";

import { DOCS_VERSION, getDocLink } from "@/content/docs/nav";

const DOCS_DIR = path.join(process.cwd(), "content", "docs", DOCS_VERSION);

// pulse.js and the SDK both append /api/v1/track themselves, so every
// snippet in the docs needs the bare origin, not the value of
// NEXT_PUBLIC_API_URL (which carries the /api/v1 suffix).
const API_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).origin;

/** Markdown body for a page, or null when the slug is not a known doc.
    The DOCS lookup is what keeps a request path out of readFile. */
export async function getDocContent(slug: string): Promise<string | null> {
  if (!getDocLink(slug)) return null;
  const raw = await readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8");
  return raw.replaceAll("{{API_ORIGIN}}", API_ORIGIN);
}
