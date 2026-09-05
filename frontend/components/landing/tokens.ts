/* ── Design tokens ─────────────────────────────────────────────
   Tangerine #FF5B19 = action + brand. Powder blue #AECACD = live
   telemetry. Platinum #E5E3D2 = ink. Charcoal #161616 = ground.

   These live outside "./shared" on purpose. shared.tsx carries a
   "use client" directive, and a server component importing a value
   across that boundary receives a client reference rather than the
   string, so `linear-gradient(180deg, ${ACCENT})` interpolated the
   reference's source text into the stylesheet and the rule died.
   Plain module, no directive, real values on both sides. The values
   themselves live in globals.css @theme; these are var() references to them.
   ───────────────────────────────────────────────────────────── */
export const ACCENT = "var(--color-tangerine)";
export const POWDER = "var(--color-powder)";
export const INK = "var(--color-ink)";
export const ACCENT_SOFT = "var(--color-tangerine-soft)";
export const SURFACE_1 = "var(--color-surface-1)";
export const SURFACE_2 = "var(--color-surface-2)";
export const BG = "var(--color-charcoal)";

export const DISPLAY = {
  fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  fontWeight: 500,
  letterSpacing: "-0.02em",
} as const;

export const LOGO_FONT = {
  fontFamily: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  fontWeight: 700,
  letterSpacing: "-0.04em",
} as const;
