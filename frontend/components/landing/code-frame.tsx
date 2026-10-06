import {
  siHtml5,
  siPostgresql,
  siReact,
  siTypescript,
  type SimpleIcon,
} from "simple-icons";
import { cn } from "@/lib/utils";
import type { Lang } from "./highlight";

const LANG_ICON: Record<Lang, SimpleIcon> = {
  typescript: siTypescript,
  tsx: siReact,
  sql: siPostgresql,
  html: siHtml5,
};

export function CodeFrame({
  file,
  lang,
  html,
  action,
  className,
}: {
  file: string;
  lang: Lang;
  html: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const parts = file.split("/");
  const name = parts.pop();
  const dir = parts.pop();
  const icon = LANG_ICON[lang];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-ink/8 bg-surface-1 p-1.5 shadow-[inset_0_1px_0_rgb(229_227_210/0.05),0_1px_2px_rgb(0_0_0/0.3),0_20px_44px_-20px_rgb(0_0_0/0.7)]",
        className
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 px-3 font-mono text-[11.5px]">
        <svg
          role="img"
          aria-label={icon.title}
          viewBox="0 0 24 24"
          className="size-3.5 shrink-0 fill-ink/40"
        >
          <path d={icon.path} />
        </svg>
        <span className="truncate">
          {dir && <span className="text-ink/30">{dir}/</span>}
          <span className="text-ink/75">{name}</span>
        </span>
        {action && <div className="-mr-1.5 ml-auto shrink-0">{action}</div>}
      </div>
      <div
        className="pa-code flex-1 overflow-x-auto rounded-[11px] bg-well py-4 shadow-well"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
