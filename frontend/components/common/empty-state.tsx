import Link from "next/link";
import { Button } from "@/components/ui/button";

type Action = { label: string; href: string; primary?: boolean };

/**
 * The shell both teaching empty states share: what is missing, why, what to do
 * about it, and a list of the actual steps. Kept in one place so the sites list
 * and an unreported site don't drift into two different voices.
 */
export function EmptyState({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions: Action[];
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-10 sm:px-10">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {actions.map(({ label, href, primary }) => (
            <Button
              key={href}
              asChild
              size="sm"
              variant={primary ? "default" : "outline"}
            >
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>
      {children ? <div className="mt-9">{children}</div> : null}
    </div>
  );
}

/** The numbered/queried steps below an empty state's copy. */
export function StepList({
  marker,
  items,
}: {
  /** "count" numbers the steps in order; "query" marks each as a thing to check. */
  marker: "count" | "query";
  items: { title: string; body: React.ReactNode }[];
}) {
  return (
    <ol className="grid gap-5 sm:grid-cols-3">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground tabular-nums">
            {marker === "count" ? i + 1 : "?"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
