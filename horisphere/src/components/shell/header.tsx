"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  CircleHelp,
  Columns2,
  Compass,
  Download,
  Menu,
  Palette,
  Search,
  Star,
  X,
} from "lucide-react";
import { SearchBox } from "@/components/search/search-box";
import { cx, IconButton } from "@/components/ui/primitives";
import { Logo } from "./logo";

export const PRIMARY_NAV = [
  { href: "/", label: "Explorer", icon: Compass },
  { href: "/comparer", label: "Comparer", icon: ArrowLeftRight },
  { href: "/favoris", label: "Favoris", icon: Star },
  { href: "/mon-univers", label: "Mon univers", icon: Palette },
] as const;

export const SECONDARY_NAV = [
  { href: "/deux-mondes", label: "Deux mondes", icon: Columns2 },
  { href: "/installer", label: "Installer", icon: Download },
  { href: "/aide", label: "Réglages et aide", icon: CircleHelp },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal place le focus sur le premier élément (bouton Fermer) : on le rend au champ de recherche
      d.querySelector<HTMLInputElement>("input[role=combobox]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="Rechercher un lieu"
      className="m-0 mx-auto mt-[max(16px,10vh)] w-[min(640px,calc(100vw-24px))] max-w-none overflow-visible bg-transparent p-0 text-text backdrop:bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] backdrop:backdrop-blur-[2px]"
    >
      {open && (
        <div className="rounded-card border border-border bg-surface-raised p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-display text-lg font-semibold">Où voulez-vous aller ?</p>
            <IconButton label="Fermer la recherche" onClick={onClose}>
              <X className="size-5" aria-hidden />
            </IconButton>
          </div>
          <SearchBox
            autoFocus
            onSelect={(l) => {
              onClose();
              router.push(`/ville/${l.id}`);
            }}
          />
          <p className="px-1 pt-3 pb-1 text-xs text-text-muted">
            Astuce : flèches ↑ ↓ pour parcourir, Entrée pour ouvrir, Échap pour fermer.
          </p>
        </div>
      )}
    </dialog>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label="Plus d'options"
      className="m-0 mt-auto mb-0 w-full max-w-none bg-transparent p-0 text-text backdrop:bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)]"
    >
      <div className="rounded-t-card border border-border bg-surface-raised p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-display text-lg font-semibold">Plus</p>
          <IconButton label="Fermer le menu" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        <nav aria-label="Navigation secondaire">
          <ul className="grid gap-1">
            {SECONDARY_NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className="flex h-12 items-center gap-3 rounded-control px-3 font-semibold hover:bg-surface-sunken aria-[current=page]:text-primary-ink"
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </dialog>
  );
}

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !(e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-[90] rounded-control bg-button px-4 py-2 font-semibold text-on-button focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <header className="hs-themed sticky top-0 z-40 h-(--header-h) border-b border-border bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-3 px-4 md:px-6 lg:px-8">
          <Link href="/" aria-label="Horisphère — accueil" className="mr-2 rounded-control">
            <Logo />
          </Link>

          <nav aria-label="Navigation principale" className="hidden min-w-0 md:block">
            <ul className="flex items-center gap-0.5">
              {[...PRIMARY_NAV, SECONDARY_NAV[0]].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className={cx(
                      "relative inline-flex h-10 items-center rounded-control px-3 text-[0.94rem] font-semibold whitespace-nowrap text-text-muted transition-colors hover:text-text",
                      "aria-[current=page]:text-text",
                      "after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-(--motion-duration) aria-[current=page]:after:scale-x-100",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hs-themed hidden h-10 items-center gap-2 rounded-control border border-border bg-surface-sunken px-3 text-sm font-medium text-text-muted transition-colors hover:text-text lg:inline-flex"
            >
              <Search className="size-4" aria-hidden />
              Rechercher
              <kbd className="ml-3 rounded border border-border px-1.5 text-[0.7rem] font-semibold">Ctrl K</kbd>
            </button>
            <IconButton label="Rechercher un lieu" onClick={() => setSearchOpen(true)} className="lg:hidden">
              <Search className="size-5" aria-hidden />
            </IconButton>
            <Link
              href="/installer"
              aria-current={isActive(pathname, "/installer") ? "page" : undefined}
              className="hidden h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-text-muted hover:text-text md:inline-flex aria-[current=page]:text-text"
            >
              <Download className="size-4" aria-hidden />
              <span className="hidden xl:inline">Installer</span>
              <span className="sr-only xl:hidden">Installer</span>
            </Link>
            <Link
              href="/aide"
              aria-label="Réglages et aide"
              title="Réglages et aide"
              aria-current={isActive(pathname, "/aide") ? "page" : undefined}
              className="hidden size-10 items-center justify-center rounded-control text-text-muted hover:text-text md:inline-flex aria-[current=page]:text-text"
            >
              <CircleHelp className="size-5" aria-hidden />
            </Link>
            <IconButton label="Plus d'options" onClick={() => setMenuOpen(true)} className="md:hidden">
              <Menu className="size-5" aria-hidden />
            </IconButton>
          </div>
        </div>
      </header>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="hs-themed fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[color-mix(in_srgb,var(--color-bg)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.72rem] font-bold transition-colors",
                  active ? "text-primary-ink" : "text-text-muted",
                )}
              >
                <span
                  className={cx(
                    "inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-(--motion-duration)",
                    active && "bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]",
                  )}
                >
                  <Icon className={cx("size-5", active && "fill-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]")} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
