import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createHighlighter } from "shiki";

import { slugify } from "@/content/docs/nav";
import { CodeBlock } from "./code-block";

/** Flatten a heading's hast children back to text, so `## The \`ep\` field`
    still produces a usable id. Typed locally because @types/hast is a
    transitive dependency here, not a direct one. */
type MdNode = { value?: string; children?: MdNode[] };

function textOf(node: MdNode | undefined): string {
  if (!node) return "";
  if (node.value) return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/* Block-level typography lives in the .docs-prose rules in globals.css.
   Only the elements that need behaviour are mapped here: headings that
   need anchor ids, links that should go through the router, and code
   blocks that get a copy button. */
const COMPONENTS: Components = {
  h2: ({ node, children }) => {
    const id = slugify(textOf(node));
    return (
      <h2 id={id}>
        <a href={`#${id}`} className="docs-anchor">
          {children}
        </a>
      </h2>
    );
  },
  h3: ({ node, children }) => {
    const id = slugify(textOf(node));
    return (
      <h3 id={id}>
        <a href={`#${id}`} className="docs-anchor">
          {children}
        </a>
      </h3>
    );
  },
  a: ({ href, children }) => {
    if (href?.startsWith("/")) return <Link href={href}>{children}</Link>;
    if (href?.startsWith("#")) return <a href={href}>{children}</a>;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
  // className and style are what the highlighter puts on the tag. Spreading
  // the rest would drag react-markdown's `node` handle onto the element.
  pre: ({ children, className, style }) => (
    <CodeBlock>
      <pre className={className} style={style}>
        {children}
      </pre>
    </CodeBlock>
  ),
  // A table wide enough to scroll needs a scroll container that is not the
  // table itself, or the cells stop sharing the width evenly.
  table: ({ children }) => (
    <div className="docs-table">
      <table>{children}</table>
    </div>
  ),
};

/* The default @shikijs/rehype plugin loads grammars on demand, which makes
   the transform async, and react-markdown runs its pipeline synchronously.
   Loading the languages up front gives a highlighter the plugin can use
   without awaiting. One instance is shared across every page in a build. */
const LANGS = ["html", "bash", "ts", "tsx", "astro", "sql"];

let highlighter: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  highlighter ??= createHighlighter({ themes: ["vesper"], langs: LANGS });
  return highlighter;
}

export async function Markdown({ children }: { children: string }) {
  const shiki = await getHighlighter();

  return (
    <div className="docs-prose">
      <ReactMarkdown
        components={COMPONENTS}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeShikiFromHighlighter, shiki, { theme: "vesper" }],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
