"use client";

import ReactMarkdown, { type Components } from "react-markdown";

// react-markdown renders text only — no raw HTML, no scripts — so model output
// stays data. Elements are mapped explicitly because this project has no
// typography plugin, and the defaults would ignore the design system.
const COMPONENTS: Components = {
  p: ({ children }) => (
    <p className="text-sm leading-relaxed [&:not(:first-child)]:mt-2.5">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="mt-2 space-y-1 pl-4 text-sm leading-relaxed marker:text-primary/60 [&>li]:list-disc">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]">
      {children}
    </code>
  ),
  a: ({ children }) => <span>{children}</span>,
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
    </div>
  );
}
