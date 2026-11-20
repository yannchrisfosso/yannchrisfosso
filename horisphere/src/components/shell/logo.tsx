import { cx } from "@/components/ui/primitives";

/** Marque Horisphère : une sphère, son horizon et un soleil levant. Couleurs issues des tokens. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("shrink-0", className)} aria-hidden>
      <defs>
        <clipPath id="hs-logo-clip">
          <rect x="0" y="0" width="48" height="25.5" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="26" r="8" fill="var(--color-primary)" clipPath="url(#hs-logo-clip)" />
      <ellipse cx="24" cy="26" rx="19" ry="5.2" fill="none" stroke="var(--color-secondary)" strokeWidth="2.6" />
      <path d="M24 5 C 14 14, 14 34, 24 43" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      <span className="font-display text-[1.35rem] leading-none font-semibold tracking-tight">
        Horisph<span className="italic text-primary-ink">è</span>re
      </span>
    </span>
  );
}
