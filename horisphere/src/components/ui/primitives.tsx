"use client";

import Link from "next/link";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "surface" | "cta" | "chip";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-button text-on-button hover:brightness-110 active:brightness-95",
  cta: "hs-cta rounded-full hover:brightness-105 active:brightness-95",
  /** Sur une carte colorée : pastille translucide et encre de la carte */
  chip: "rounded-full bg-(--hs-card-chip) text-(--hs-card-ink) hover:brightness-105",
  secondary: "bg-surface-raised text-text border border-border-glow/60 hover:border-primary-ink",
  ghost: "text-text hover:bg-surface-raised",
  surface: "bg-surface text-on-surface border border-border-surface hover:brightness-[0.98]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[0.95rem] gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cx(
    "hs-themed inline-flex items-center justify-center rounded-control font-semibold whitespace-nowrap select-none",
    "transition-[filter,background-color,border-color,transform] duration-(--motion-duration) active:scale-[0.98]",
    "disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    sizes[size],
    extra,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { variant?: Variant; size?: Size }
>(function Button({ variant, size, className, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
});

export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function IconButton({
  label,
  className,
  children,
  tone = "bg",
  pressed,
  ...rest
}: Omit<ComponentProps<"button">, "aria-label"> & { label: string; tone?: "bg" | "surface" | "card"; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx(
        "hs-themed inline-flex size-10 shrink-0 items-center justify-center rounded-control transition-colors duration-(--motion-duration)",
        tone === "bg"
          ? "text-text hover:bg-surface-raised"
          : tone === "card"
            ? "text-(--hs-card-ink) hover:bg-(--hs-card-chip)"
            : "text-on-surface hover:bg-[color-mix(in_srgb,var(--color-on-surface)_8%,transparent)]",
        "disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Drapeau SVG (flag-icons, MIT). Décoratif par défaut : le nom du pays est toujours écrit à côté. */
export function Flag({ cc, className, title, round }: { cc: string; className?: string; title?: string; round?: boolean }) {
  if (round) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/flags/1x1/${cc.toLowerCase()}.svg`}
        alt={title ?? ""}
        aria-hidden={title ? undefined : true}
        loading="lazy"
        decoding="async"
        width={28}
        height={28}
        className={cx("inline-block size-[1.6em] shrink-0 rounded-full object-cover shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-surface)_80%,transparent)]", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${cc.toLowerCase()}.svg`}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      loading="lazy"
      decoding="async"
      width={24}
      height={18}
      className={cx("inline-block h-[0.9em] w-auto shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-text)_15%,transparent)]", className)}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={sid} className="min-w-0 cursor-pointer">
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-text-muted">{description}</span>}
      </label>
      <button
        id={sid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "hs-themed relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-(--motion-duration)",
          checked ? "border-transparent bg-primary" : "border-border bg-surface-sunken",
        )}
      >
        <span
          aria-hidden
          className={cx(
            "inline-block size-5 rounded-full shadow transition-transform duration-(--motion-duration)",
            checked ? "translate-x-6 bg-on-primary" : "translate-x-1 bg-text-muted",
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  tone = "bg",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  label: string;
  size?: "sm" | "md";
  tone?: "bg" | "surface";
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        "hs-themed inline-flex max-w-full flex-wrap gap-1 rounded-control border p-1",
        tone === "bg" ? "border-border bg-surface-sunken" : "border-border-surface bg-[color-mix(in_srgb,var(--color-on-surface)_5%,transparent)]",
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <label
            key={o.value}
            className={cx(
              "relative inline-flex cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius-control)-4px)] font-semibold transition-colors duration-(--motion-duration)",
              "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus",
              size === "sm" ? "h-8 px-2.5 text-sm" : "h-9 px-3.5 text-[0.92rem]",
              active
                ? "bg-primary text-on-primary"
                : tone === "bg"
                  ? "text-text-muted hover:text-text"
                  : "text-on-surface-muted hover:text-on-surface",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, id }: { eyebrow?: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold tracking-[0.16em] text-secondary-ink uppercase">{eyebrow}</p>}
        <h2 id={id} className="font-display text-2xl leading-tight font-semibold sm:text-[1.7rem]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cx("hs-themed hs-panel rounded-card p-5 sm:p-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
