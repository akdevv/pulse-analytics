"use client";

import { useEffect, useState } from "react";

import type { Heading } from "@/content/docs/nav";

/* Scroll spy for the contents rail. The bottom margin keeps a heading from
   counting as current while it is still low on the screen, so the mark
   tracks what you are reading rather than what has barely appeared. */
export function Toc({
  headings,
  editUrl,
}: {
  headings: Heading[];
  editUrl: string;
}) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -66% 0px", threshold: 0 }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <div className="flex flex-col">
      {headings.length > 1 && (
        <nav aria-label="On this page">
          <p className="text-[11.5px] font-medium text-ink/55">On this page</p>
          <ul className="mt-3.5 flex flex-col gap-1">
            {headings.map((heading) => {
              const current = active === heading.id;
              return (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    aria-current={current ? "location" : undefined}
                    className={`relative block py-1 pl-4 text-[12.5px] leading-snug transition-colors duration-200 ease-[var(--ease-out)] ${
                      current ? "text-ink" : "text-ink/55 hover:text-ink/90"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute top-[0.85em] left-0 size-[5px] rounded-full bg-tangerine transition-opacity duration-200 ease-[var(--ease-out)] ${
                        current ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {heading.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-7 border-t border-ink/8 pt-6">
        <a
          href={editUrl}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 text-[12.5px] text-ink/55 transition-colors duration-150 ease-[var(--ease-out)] hover:text-ink"
        >
          Edit this page
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink/40 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-ink"
            aria-hidden
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </div>
  );
}
