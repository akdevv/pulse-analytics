/* ── Design tokens ─────────────────────────────────────────────
   Tangerine #FF5B19 = action + brand. Powder blue #AECACD = live
   telemetry. Platinum #E5E3D2 = ink. Charcoal #161616 = ground.

   These live outside "./shared" on purpose. shared.tsx carries a
   "use client" directive, and a server component importing a value
   across that boundary receives a client reference rather than the
   string, so `linear-gradient(180deg, ${ACCENT})` interpolated the
   reference's source text into the stylesheet and the rule died.
   Plain module, no directive, real values on both sides.
   ───────────────────────────────────────────────────────────── */
export const ACCENT = "oklch(0.6832 0.2107 38.6427)";
export const POWDER = "oklch(0.8192 0.0304 204.4701)";
export const INK = "oklch(0.9128 0.0228 101.3697)";
export const ACCENT_SOFT = "oklch(0.7800 0.1400 45)";
export const SURFACE_1 = "oklch(0.2350 0 0)";
export const SURFACE_2 = "oklch(0.2603 0 0)";
export const BG = "oklch(0.2002 0 0)";
/** @deprecated use SURFACE_1 */
export const SURFACE = SURFACE_1;

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
