// Plain module (no "use client") so server and client components get real strings.
export const RIM = [
  "radial-gradient(ellipse 50% 220px at 50% 0%, color-mix(in oklab, var(--color-tangerine) 55%, transparent), transparent)",
  "linear-gradient(to bottom, color-mix(in oklab, var(--color-tangerine) 22%, transparent), transparent 45%)",
  "linear-gradient(to bottom, color-mix(in oklab, var(--color-ink) 12%, transparent), color-mix(in oklab, var(--color-ink) 6%, transparent))",
].join(", ");
export const HALO =
  "radial-gradient(ellipse 45% 100% at 50% 0%, color-mix(in oklab, var(--color-tangerine) 18%, transparent), transparent 75%)";

const DOT = (alpha: number) =>
  `radial-gradient(circle, color-mix(in oklab, var(--color-ink) ${alpha}%, transparent) 1px, transparent 1.5px)`;

export function dots(mask: string, alpha = 6, size = 22) {
  return {
    backgroundImage: DOT(alpha),
    backgroundSize: `${size}px ${size}px`,
    maskImage: mask,
  };
}

export const STAGE = {
  backgroundImage: `radial-gradient(ellipse 80% 70% at 50% 0%, color-mix(in oklab, var(--color-ink) 4%, transparent), transparent), ${DOT(5)}`,
  backgroundSize: "100% 100%, 18px 18px",
  maskImage: "linear-gradient(to bottom, black 40%, transparent)",
};
