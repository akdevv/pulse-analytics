import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { transformerNotationHighlight } from "@shikijs/transformers";
import { createHighlighter } from "shiki";

import { slugify } from "@/content/docs/nav";
import { CodeBlock } from "./code-block";

type MdNode = { value?: string; children?: MdNode[] };

function textOf(node: MdNode | undefined): string {
  if (!node) return "";
  if (node.value) return node.value;
  return (node.children ?? []).map(textOf).join("");
}

const ANCHOR =
  "before:absolute before:right-full before:pr-[0.35em] before:font-normal before:text-tangerine/75 before:opacity-0 before:transition-opacity before:content-['#'] group-hover:before:opacity-100 focus-visible:before:opacity-100 max-lg:before:content-none";

function heading(Tag: "h2" | "h3", className: string): Components["h2"] {
  return function Heading({ node, children }) {
    const id = slugify(textOf(node));
    return (
      <Tag id={id} className={`group relative scroll-mt-22 ${className}`}>
        <a href={`#${id}`} className={ANCHOR}>
          {children}
        </a>
      </Tag>
    );
  };
}

const LINK =
  "text-ink underline decoration-tangerine/50 decoration-1 underline-offset-3 transition-[text-decoration-color] duration-150 hover:decoration-tangerine";

const COMPONENTS: Components = {
  h2: heading(
    "h2",
    "mt-13 mb-4 font-display text-[1.32rem] leading-snug font-medium tracking-[-0.02em] text-ink"
  ),
  h3: heading(
    "h3",
    "mt-10 mb-3 text-[1.02rem] font-semibold tracking-[-0.01em] text-ink/94"
  ),
  p: ({ children }) => <p className="my-4.5">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  a: ({ href, children }) => {
    if (href?.startsWith("/"))
      return (
        <Link href={href} className={LINK}>
          {children}
        </Link>
      );
    return (
      <a
        href={href}
        className={LINK}
        {...(!href?.startsWith("#") && { target: "_blank", rel: "noreferrer" })}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="my-4.5 flex list-disc flex-col gap-2 pl-5.5 marker:text-ink/40">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4.5 flex list-decimal flex-col gap-2 pl-5.5 marker:text-ink/40">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-8 rounded-xl border border-ink/12 bg-ink/4 px-4.5 py-3.5 text-[14px] text-ink/70 [&_p]:my-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-11 border-ink/10" />,
  // Not spreading props keeps react-markdown's `node` off the DOM element.
  pre: ({ children, className, style }) => (
    <CodeBlock>
      <pre className={className} style={style}>
        {children}
      </pre>
    </CodeBlock>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-ink/14 pr-4 pb-2.5 text-left font-mono text-[10.5px] font-medium tracking-[0.15em] whitespace-nowrap text-ink/60 uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-ink/7 py-2.5 pr-4 align-top first:text-ink [tr:last-child_&]:border-b-0">
      {children}
    </td>
  ),
};

const INLINE_CODE =
  "[&_:not(pre)>code]:rounded-[5px] [&_:not(pre)>code]:border [&_:not(pre)>code]:border-ink/7 [&_:not(pre)>code]:bg-ink/8 [&_:not(pre)>code]:px-[0.36em] [&_:not(pre)>code]:py-[0.1em] [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-ink";

const PROSE = [
  "text-[15px] leading-[1.75] text-ink/74",
  "[&>*:first-child]:mt-0",
  "[&>p:first-child]:mb-9 [&>p:first-child]:text-[17px] [&>p:first-child]:leading-[1.62] [&>p:first-child]:text-ink/82",
  INLINE_CODE,
].join(" ");

// The rehype plugin is synchronous, so grammars load up front into one shared highlighter.
const LANGS = ["html", "bash", "ts", "tsx", "astro", "sql"];

let highlighter: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  highlighter ??= createHighlighter({ themes: ["vesper"], langs: LANGS });
  return highlighter;
}

export async function Markdown({ children }: { children: string }) {
  const shiki = await getHighlighter();

  return (
    <div className={PROSE}>
      <ReactMarkdown
        components={COMPONENTS}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeShikiFromHighlighter,
            shiki,
            {
              theme: "vesper",
              defaultLanguage: "text",
              transformers: [transformerNotationHighlight()],
            },
          ],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
