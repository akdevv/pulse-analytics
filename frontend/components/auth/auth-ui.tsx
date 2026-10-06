import Link from "next/link";

/** Shared by every field on both pages, so they cannot drift apart.
 *
 *  Three things here are load-bearing rather than decorative.
 *  `dark:bg-*` is required because the base Input ships `dark:bg-input/30`
 *  and this route sets `class="dark"`: without a matching modifier the
 *  grey default outranks this fill on specificity and the tint never
 *  renders. The font size is set only from `md` up, so the base
 *  `text-base` survives on mobile and Safari does not zoom the page on
 *  focus. And the placeholder sits at /40, which clears the 4.5:1 floor
 *  over the field fill. */
export const AUTH_INPUT = [
  "h-11 rounded-lg border px-3.5 shadow-none md:text-[15px]",
  "border-ink/10 bg-ink/[0.035] dark:bg-ink/[0.035] text-ink",
  "placeholder:text-ink/40",
  "transition-[border-color,background-color,box-shadow] duration-150 ease-[var(--ease-out)]",
  "hover:border-ink/20",
  "focus-visible:border-ring focus-visible:bg-ink/[0.05] dark:focus-visible:bg-ink/[0.05]",
  "focus-visible:ring-[3px] focus-visible:ring-ring/20",
  "aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/20 dark:aria-invalid:ring-destructive/20",
].join(" ");

export const AUTH_LABEL =
  "text-[13px] font-medium text-ink/70 data-[error=true]:text-destructive";

export const AUTH_MESSAGE = "text-[12.5px] leading-snug";

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
      <div className="pa-lift mb-8" style={{ ["--pa-delay" as string]: "0ms" }}>
        <h1 className="font-display text-[30px] leading-[1.08] font-semibold tracking-[-0.035em] text-ink sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2.5 max-w-[36ch] text-[14.5px] leading-relaxed text-pretty text-ink/55">
          {subtitle}
        </p>
      </div>

      {/* role=alert so a failed submit is announced, not just repainted */}
      {error && (
        <div
          role="alert"
          className="pa-lift mb-6 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13px] leading-snug text-destructive"
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
        className="pa-lift mt-8 text-center text-[13.5px] text-ink/55"
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
      className="pa-btn group mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-tangerine text-[15px] font-semibold text-charcoal shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_8px_20px_-10px_var(--pa-accent-glow)] hover:brightness-[1.05] focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className="relative z-10">{loading ? busy : idle}</span>
      {!loading && (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative z-10 transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5"
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
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
        className="rounded-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors duration-150 ease-[var(--ease-out)] hover:decoration-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {label}
      </Link>
    </>
  );
}
