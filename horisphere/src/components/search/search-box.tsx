"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { countryOffsetCount, type Location } from "@/lib/catalog";
import { groupByCountry, search } from "@/lib/search";
import { formatUtcOffset, getZonedParts } from "@/lib/time/engine";
import { formatTime } from "@/lib/time/format";
import { useNowMinute } from "@/lib/time/ticker";
import { useSettings } from "@/lib/state/settings";
import { cx, Flag } from "@/components/ui/primitives";

export function SearchBox({
  onSelect,
  placeholder = "Ville, pays ou fuseau horaire",
  label = "Rechercher une ville ou un pays",
  size = "lg",
  autoFocus,
  className,
  excludeIds,
  clearOnSelect = true,
  inputId,
}: {
  onSelect?: (l: Location) => void;
  placeholder?: string;
  label?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  className?: string;
  excludeIds?: string[];
  clearOnSelect?: boolean;
  inputId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  const listId = useId();
  const autoId = useId();
  const id = inputId ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useNowMinute();
  const settings = useSettings();

  const hits = useMemo(() => {
    const h = search(deferred, 40);
    return excludeIds?.length ? h.filter((x) => !excludeIds.includes(x.location.id)) : h;
  }, [deferred, excludeIds]);
  const groups = useMemo(() => groupByCountry(hits), [hits]);
  const flat = useMemo(() => groups.flatMap((g) => g.hits.map((h) => h.location)), [groups]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const choose = (l: Location) => {
    setOpen(false);
    if (clearOnSelect) setQuery("");
    else setQuery(l.city);
    if (onSelect) onSelect(l);
    else router.push(`/ville/${l.id}`);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.max(0, Math.min(flat.length - 1, a + 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      // Si la frappe est plus rapide que le rendu différé, on recalcule les résultats tout de suite
      const current =
        query === deferred
          ? flat
          : groupByCountry(search(query, 40).filter((x) => !excludeIds?.includes(x.location.id))).flatMap((g) => g.hits.map((h) => h.location));
      const target = current[Math.min(Math.max(0, active), current.length - 1)];
      if (query.trim() && target) {
        e.preventDefault();
        choose(target);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else setQuery("");
    } else if (e.key === "Home" && open) {
      setActive(0);
    } else if (e.key === "End" && open) {
      setActive(flat.length - 1);
    }
  };

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, listId]);

  const showList = open && query.trim().length > 0;
  let idx = -1;

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cx(
          "hs-themed flex items-center gap-2 rounded-control border border-border bg-surface-sunken text-text",
          "focus-within:border-focus focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus)_35%,transparent)]",
          size === "lg" ? "h-14 px-4 text-[1.02rem]" : "h-11 px-3 text-[0.95rem]",
        )}
      >
        <Search className={cx("shrink-0 text-text-muted", size === "lg" ? "size-5" : "size-4")} aria-hidden />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && flat[active] ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="h-full min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="inline-flex size-8 items-center justify-center rounded-full text-text-muted hover:text-text"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Résultats de recherche"
        hidden={!showList}
        className="hs-themed absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain rounded-card border border-border-surface bg-surface p-1.5 text-on-surface shadow-card"
      >
        {showList && flat.length === 0 && (
          <p className="px-3 py-4 text-sm text-on-surface-muted">
            Aucun lieu trouvé pour « {query} ». Essayez le nom d&apos;une grande ville, un pays ou un fuseau (ex. Europe/Paris).
          </p>
        )}
        {showList &&
          groups.map((g) => {
            const multi = now ? countryOffsetCount(g.cc, now) > 1 : false;
            return (
              <div key={g.cc} role="group" aria-label={g.country} className="py-1">
                <div className="flex items-center justify-between gap-2 px-3 pt-1.5 pb-1 text-[0.72rem] font-bold tracking-[0.12em] text-on-surface-muted uppercase">
                  <span className="truncate">{g.country}</span>
                  {multi && <span className="shrink-0 tracking-normal normal-case">Plusieurs fuseaux · choisissez une ville</span>}
                </div>
                {g.hits.map((h) => {
                  idx++;
                  const i = idx;
                  const l = h.location;
                  const p = now ? getZonedParts(now, l.tz) : null;
                  return (
                    <div
                      key={l.id}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onPointerMove={() => setActive(i)}
                      onClick={() => choose(l)}
                      className={cx(
                        "flex cursor-pointer items-center gap-3 rounded-[calc(var(--radius-card)-8px)] px-3 py-2.5",
                        i === active && "bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)]",
                      )}
                    >
                      <Flag cc={l.cc} className="text-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.city}</span>
                        <span className="block truncate text-xs text-on-surface-muted">
                          {l.region ? `${l.region} · ` : ""}
                          {l.tz}
                        </span>
                      </span>
                      {p && (
                        <span className="shrink-0 text-right">
                          <span className="tabular block font-semibold">{formatTime(p, settings.hourCycle)}</span>
                          <span className="block text-xs text-on-surface-muted">{formatUtcOffset(p.offsetMinutes)}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
