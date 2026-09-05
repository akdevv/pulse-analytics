"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOC_GROUPS } from "@/content/docs/nav";

export function DocsNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-8">
      {DOC_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2.5">
          <h2 className="px-3 text-[11.5px] font-medium text-ink/50">
            {group.title}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const href = `/docs/${item.slug}`;
              const active = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 text-[13.5px] transition-colors duration-150 ease-[var(--ease-out)] ${
                      active
                        ? "bg-ink/[0.055] text-ink"
                        : "text-ink/60 hover:bg-ink/[0.03] hover:text-ink/90"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
