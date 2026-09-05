import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DOCS,
  DOCS_VERSION,
  extractHeadings,
  getDocLink,
  getDocNeighbours,
} from "@/content/docs/nav";
import { getDocContent } from "@/lib/docs";
import { Markdown } from "@/components/docs/markdown";
import { Toc } from "@/components/docs/toc";

const REPO = "https://github.com/akdevv/pulse-analytics";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocLink(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description };
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={back ? "rotate-180" : undefined}
      aria-hidden
    >
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocLink(slug);
  const content = doc ? await getDocContent(slug) : null;
  if (!doc || !content) notFound();

  const headings = extractHeadings(content);
  const { prev, next } = getDocNeighbours(slug);

  return (
    <div className="flex min-w-0 flex-1">
      {/* Keyed on the slug so the entrance replays per page, once, and
          stays out of the way of everything else on the screen. */}
      <main
        key={slug}
        className="docs-enter min-w-0 flex-1 py-12 pb-28 lg:pl-10 xl:pl-12"
      >
        <div className="max-w-[68ch]">
          <h1 className="docs-title">{doc.title}</h1>
          <Markdown>{content}</Markdown>

          {(prev || next) && (
            <nav className="mt-20 flex items-start justify-between gap-8 border-t border-ink/8 pt-8">
              {prev ? (
                <Link href={`/docs/${prev.slug}`} className="docs-pager group">
                  <span className="docs-pager-label">
                    <Arrow back />
                    Previous
                  </span>
                  <span className="docs-pager-title">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/docs/${next.slug}`}
                  className="docs-pager group items-end text-right"
                >
                  <span className="docs-pager-label">
                    Next
                    <Arrow />
                  </span>
                  <span className="docs-pager-title">{next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>

      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto py-12 pl-8 xl:block">
        <Toc
          headings={headings}
          editUrl={`${REPO}/blob/main/frontend/content/docs/${DOCS_VERSION}/${slug}.md`}
        />
      </aside>
    </div>
  );
}
