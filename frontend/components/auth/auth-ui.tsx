import Link from "next/link";

import { ACCENT, DISPLAY } from "@/components/landing/tokens";

/** Shared by both fields on both pages, so they cannot drift apart.
 *
 *  Three things here are load-bearing rather than decorative.
 *  `dark:bg-*` is required because the base Input ships `dark:bg-input/30`
 *  and this route sets `class="dark"`: without a matching modifier the
 *  grey default outranks this fill on specificity and the tint never
 *  renders. The font size is set only from `md` up, so the base
 *  `text-base` survives on mobile and Safari does not zoom the page on
 *  focus. And the placeholder sits at /35 rather than /25, which is the
 *  difference between 5.5:1 and failing the 4.5:1 floor. */
export const AUTH_INPUT = [
  "h-11 rounded-none border-0 border-b px-0 shadow-none md:text-[15px]",
  "border-ink/18 bg-transparent dark:bg-transparent text-ink",
  /* /28 would fail the 4.5:1 floor over this ground; /35 clears it */
  "placeholder:text-ink/35",
  "transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)]",
  "hover:border-ink/32",
  /* the ring is meaningless on a borderless field, so focus doubles the
     rule instead, drawn as a shadow so nothing shifts by a pixel */
  "focus-visible:ring-0 focus-visible:border-ring",
  "focus-visible:shadow-[0_1px_0_0_var(--ring)]",
].join(" ");

export const AUTH_LABEL =
  "font-mono text-[10px] tracking-[0.18em] uppercase text-ink/40";

export function AuthCard({
  title,
  subtitle,
  error,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="pa-lift mb-9" style={{ ["--pa-delay" as string]: "0ms" }}>
        <h1
          className="text-[32px] leading-[1.04] text-ink"
          style={{ ...DISPLAY, fontWeight: 600, letterSpacing: "-0.035em" }}
        >
          {title}
        </h1>
        <p className="mt-2.5 max-w-[34ch] text-[14px] leading-relaxed text-ink/45">
          {subtitle}
        </p>
      </div>

      {/* role=alert so a failed submit is announced, not just repainted */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-snug text-destructive"
          style={{
            background:
              "color-mix(in oklab, var(--destructive) 12%, transparent)",
            border:
              "1px solid color-mix(in oklab, var(--destructive) 28%, transparent)",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="mt-px shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="pa-lift" style={{ ["--pa-delay" as string]: "60ms" }}>
        {children}
      </div>

      <div
        className="pa-lift mt-8 border-t border-ink/8 pt-6 text-[13px] text-ink/45"
        style={{ ["--pa-delay" as string]: "120ms" }}
      >
        {footer}
      </div>
    </div>
  );
}

/* Fading a primary button out on hover reads as "going away". It
   brightens instead, and keeps its label while it works so the button
   does not change width mid-submit. */
export function AuthSubmit({
  loading,
  idle,
  busy,
}: {
  loading: boolean;
  idle: string;
  busy: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="pa-btn mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-[15px] font-semibold text-charcoal hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: ACCENT }}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className="relative z-10">{loading ? busy : idle}</span>
    </button>
  );
}

export function AuthAltLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <>
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-ink/80 underline decoration-ink/20 underline-offset-4 transition-colors duration-150 ease-[var(--ease-out)] hover:text-ink hover:decoration-ink/50"
      >
        {label}
      </Link>
    </>
  );
}
