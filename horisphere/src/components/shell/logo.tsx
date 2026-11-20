import { cx } from "@/components/ui/primitives";

/** Marque Horisphère : une planète solaire et son anneau. Couleurs issues des tokens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("shrink-0", className)} aria-hidden>
      <defs>
        <radialGradient id="hs-logo-sphere" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" style={{ stopColor: "var(--color-secondary)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--color-primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-bg)" }} />
        </radialGradient>
      </defs>
      <path d="M5 30 C 12 22, 36 14, 44 16" fill="none" stroke="var(--color-secondary)" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <circle cx="24" cy="24" r="13" fill="url(#hs-logo-sphere)" />
      <path d="M13 21 C 18 24, 30 24, 35 21" fill="none" stroke="var(--color-text)" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M44 16 C 46 22, 22 34, 4 32" fill="none" stroke="var(--color-secondary)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-9" />
      <span className="font-display text-[1.45rem] leading-none font-medium tracking-tight text-text">Horisphère</span>
    </span>
  );
}
