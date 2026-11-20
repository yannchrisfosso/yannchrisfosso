/**
 * Décors légers (SVG, couleurs des tokens) : cadran romain en bord d'écran et horizon au coucher du soleil.
 * Purement décoratifs, masqués aux technologies d'assistance, sans animation permanente.
 */
import { cx } from "@/components/ui/primitives";

const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

export function RomanDial({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cx("pointer-events-none select-none", className)} aria-hidden focusable="false">
      <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-secondary)" strokeOpacity="0.55" strokeWidth="3" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="var(--color-secondary)" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="60" fill="var(--color-bg)" fillOpacity="0.35" stroke="var(--color-primary)" strokeOpacity="0.35" />
      {ROMAN.map((n, i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        return (
          <text
            key={n}
            x={100 + Math.cos(a) * 86}
            y={100 + Math.sin(a) * 86}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-display)"
            fontSize="12"
            fill="var(--color-secondary)"
            fillOpacity="0.75"
          >
            {n}
          </text>
        );
      })}
      <line x1="100" y1="100" x2="100" y2="58" stroke="var(--color-secondary)" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="100" x2="138" y2="112" stroke="var(--color-secondary)" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Horizon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" className={cx("pointer-events-none select-none", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id="hs-horizon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-bg)", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "var(--color-primary)", stopOpacity: 0.35 }} />
        </linearGradient>
      </defs>
      <rect width="1440" height="220" fill="url(#hs-horizon-sky)" />
      <circle cx="1080" cy="150" r="46" fill="var(--color-secondary)" fillOpacity="0.85" />
      <path d="M0 160 C 160 110, 280 120, 420 140 S 700 100, 860 130 S 1180 110, 1440 140 V220 H0 Z" fill="var(--color-surface-raised)" fillOpacity="0.75" />
      <path d="M0 190 C 200 150, 380 170, 560 175 S 900 150, 1100 172 S 1340 160, 1440 170 V220 H0 Z" fill="var(--color-bg)" />
      <path d="M560 200 C 700 190, 860 192, 1000 200" stroke="var(--color-secondary)" strokeOpacity="0.4" strokeWidth="2" fill="none" />
    </svg>
  );
}
