/* Page order, titles, and the pure helpers that go with them. No node
   built-ins in this file: the sidebar and the header are client
   components and import it directly. The markdown loader lives in
   lib/docs.ts. */
export const DOCS_VERSION = "v1";

export type DocLink = {
  slug: string;
  title: string;
  description: string;
};

export type DocGroup = {
  title: string;
  items: DocLink[];
};

export const DOC_GROUPS: DocGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        slug: "quickstart",
        title: "Quickstart",
        description:
          "Create a site, paste one script tag, and confirm the first pageview lands.",
      },
      {
        slug: "installation",
        title: "Installation",
        description:
          "Install Pulse with a script tag or the npm package, on plain HTML, Next.js, Astro, or Vite.",
      },
    ],
  },
  {
    title: "Tracking",
    items: [
      {
        slug: "events",
        title: "Custom events",
        description:
          "Track signups, clicks, and anything else that is not a pageview.",
      },
      {
        slug: "reference",
        title: "SDK reference",
        description:
          "Every method, option, and tracking parameter Pulse accepts.",
      },
    ],
  },
  {
    title: "Background",
    items: [
      {
        slug: "how-it-works",
        title: "How it works",
        description:
          "What happens between a click on your site and a number on the dashboard.",
      },
    ],
  },
];

export const DOCS: DocLink[] = DOC_GROUPS.flatMap((group) => group.items);

export function getDocLink(slug: string): DocLink | undefined {
  return DOCS.find((doc) => doc.slug === slug);
}

/** Previous and next page in reading order, for the footer pager. */
export function getDocNeighbours(slug: string): {
  prev: DocLink | null;
  next: DocLink | null;
} {
  const i = DOCS.findIndex((doc) => doc.slug === slug);
  return {
    prev: i > 0 ? DOCS[i - 1]! : null,
    next: i >= 0 && i < DOCS.length - 1 ? DOCS[i + 1]! : null,
  };
}

/** GitHub-style anchor id, matched by the heading renderer and the on-page
    contents list so both agree without a rehype plugin in between. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export type Heading = { id: string; title: string };

/** Top-level sections (## headings) for the contents rail. Fenced code is
    stripped first, or a shell comment like "## build" becomes a heading. */
export function extractHeadings(markdown: string): Heading[] {
  const body = markdown.replace(/```[\s\S]*?```/g, "");
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
    id: slugify(m[1]!),
    title: m[1]!.trim(),
  }));
}
