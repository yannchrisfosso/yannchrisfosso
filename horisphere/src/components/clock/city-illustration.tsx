"use client";

/**
 * Zone d'illustration au bas des cartes d'horloge.
 * - Si public/villes/<id>.webp existe (liste générée au build), l'image est affichée.
 * - Sinon, une illustration SVG stylisée et légère est dessinée : silhouette urbaine propre à la ville
 *   (générée à partir de son identifiant), relief, eau, végétation selon la latitude, soleil ou lune.
 * Aucune photographie : les couleurs viennent du dégradé de la carte (variables CSS).
 */
import cityImages from "@/data/city-images.json";
import type { Location } from "@/lib/catalog";
import { cx } from "@/components/ui/primitives";

const available = new Set<string>(cityImages as string[]);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

function Palm({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} 120) scale(${s})`}>
      <path d="M0 0 C 2 -18, 4 -32, 9 -44" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 -44 c -10 -4 -20 -2 -27 4 c 9 -9 19 -10 27 -4 m0 0 c 8 -7 18 -8 26 -3 c -9 -2 -18 -1 -26 3 m0 0 c -2 -9 -9 -15 -18 -17 c 9 0 15 6 18 17 m0 0 c 4 -8 11 -12 20 -12 c -8 2 -14 6 -20 12" fill="currentColor" />
    </g>
  );
}

function Pine({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} 120) scale(${s})`}>
      <path d="M0 0 L0 -8 M-9 -8 L0 -34 L9 -8 Z M-7 -20 L0 -42 L7 -20 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
    </g>
  );
}

function RoundTree({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} 120) scale(${s})`}>
      <rect x="-1.2" y="-12" width="2.4" height="12" fill="currentColor" />
      <circle cx="0" cy="-18" r="9" fill="currentColor" />
      <circle cx="-6" cy="-13" r="6" fill="currentColor" />
      <circle cx="6" cy="-13" r="6" fill="currentColor" />
    </g>
  );
}

export function CityIllustration({ location, night, className }: { location: Location; night: boolean; className?: string }) {
  if (available.has(location.id)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/villes/${location.id}.webp`}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        width={600}
        height={300}
        className={cx("size-full object-cover", className)}
      />
    );
  }
  const r = rng(hash(location.id));
  const lat = Math.abs(location.lat);
  const Tree = lat < 24 ? Palm : lat > 45 ? Pine : RoundTree;
  const sunX = 40 + r() * 220;
  const n = 9 + Math.floor(r() * 6);
  const buildings: { x: number; w: number; h: number; spire: boolean }[] = [];
  let x = 70 + r() * 30;
  for (let i = 0; i < n && x < 250; i++) {
    const w = 8 + r() * 14;
    const h = 14 + r() * (location.pop >= 2 ? 46 : 28);
    buildings.push({ x, w, h, spire: r() > 0.82 });
    x += w + 1 + r() * 3;
  }
  const hill = `M0 92 C 50 ${70 + r() * 10}, 90 ${76 + r() * 8}, 150 ${80 + r() * 6} S 250 ${66 + r() * 12}, 300 ${80 + r() * 8} L300 120 L0 120 Z`;
  return (
    <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMax slice" className={cx("size-full", className)} aria-hidden focusable="false">
      {night ? (
        <g fill="var(--color-surface)">
          <circle cx={sunX} cy="30" r="11" opacity="0.9" />
          <circle cx={sunX + 6} cy="26" r="10" fill="var(--hs-card-mid)" />
          {[0.15, 0.32, 0.5, 0.68, 0.86].map((t, i) => (
            <circle key={i} cx={t * 300} cy={10 + ((i * 37) % 30)} r="1.1" opacity="0.8" />
          ))}
        </g>
      ) : (
        <g>
          <circle cx={sunX} cy="36" r="22" fill="var(--color-surface)" opacity="0.28" />
          <circle cx={sunX} cy="36" r="13" fill="var(--color-surface)" opacity="0.75" />
        </g>
      )}
      <path d={hill} fill="currentColor" opacity="0.14" />
      <g fill="currentColor" opacity="0.32">
        {buildings.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={104 - b.h} width={b.w} height={b.h + 2} rx="1" />
            {b.spire && <path d={`M${b.x + b.w / 2 - 2} ${104 - b.h} L${b.x + b.w / 2} ${88 - b.h} L${b.x + b.w / 2 + 2} ${104 - b.h} Z`} />}
          </g>
        ))}
      </g>
      {night && (
        <g fill="var(--color-surface)" opacity="0.7">
          {buildings.slice(0, 8).map((b, i) => (
            <rect key={i} x={b.x + 2} y={104 - b.h + 4 + (i % 3) * 5} width="2" height="2" />
          ))}
        </g>
      )}
      <rect x="0" y="104" width="300" height="16" fill="currentColor" opacity="0.18" />
      <g stroke="var(--color-surface)" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round">
        <line x1="30" y1="110" x2="70" y2="110" />
        <line x1="150" y1="114" x2="200" y2="114" />
        <line x1="230" y1="109" x2="262" y2="109" />
      </g>
      <g opacity="0.55">
        <Tree x={18 + r() * 14} s={0.9 + r() * 0.3} />
        <Tree x={48 + r() * 10} s={0.7 + r() * 0.2} />
        <Tree x={268 + r() * 12} s={0.85 + r() * 0.3} />
      </g>
    </svg>
  );
}
