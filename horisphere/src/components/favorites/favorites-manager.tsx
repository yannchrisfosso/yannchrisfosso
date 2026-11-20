"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { ChevronDown, ChevronUp, FolderHeart, GripVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { countryName, getLocation, type Location } from "@/lib/catalog";
import { normalize } from "@/lib/search";
import { calendarDayDiff, formatDelta, formatUtcOffset, getZonedParts } from "@/lib/time/engine";
import { capitalize, formatShortDate, relativeDayLabel } from "@/lib/time/format";
import { dayPeriod, solarAltitude } from "@/lib/time/solar";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { favorites, favoritesInSet, MAX_SET_NAME, useFavoritesData } from "@/lib/state/favorites";
import { assignDuo, duoStore, useDuo } from "@/lib/state/duo";
import { useSettings } from "@/lib/state/settings";
import { useActiveTheme } from "@/lib/state/theme";
import { SearchBox } from "@/components/search/search-box";
import { DayPeriodBadge, TimeDisplay } from "@/components/clock/parts";
import { DEFAULT_ACCENTS } from "@/components/clock/clock-card";
import { Button, cx, Flag, IconButton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { FavoritesEmpty } from "./favorites-panel";

function Row({
  loc,
  index,
  total,
  draggable,
}: {
  loc: Location;
  index: number;
  total: number;
  draggable: boolean;
}) {
  const now = useNow();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const theme = useActiveTheme();
  const duo = useDuo();
  const controls = useDragControls();
  const p = now ? getZonedParts(now, loc.tz) : null;
  const dev = now && deviceZone ? getZonedParts(now, deviceZone) : null;
  const period = now ? dayPeriod(solarAltitude(now, loc.lat, loc.lon)) : null;
  const accent = theme.clockOverrides[loc.id]?.accent ?? DEFAULT_ACCENTS[index % 2];
  const inDuo = duo.locationIdA === loc.id ? "a" : duo.locationIdB === loc.id ? "b" : null;
  const dd = p && dev ? calendarDayDiff(dev, p) : 0;

  const content = (
    <div className="hs-themed hs-panel flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card p-3 sm:flex-nowrap sm:p-4">
      {draggable && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onPointerDown={(e) => controls.start(e)}
          className="hidden cursor-grab touch-none self-stretch px-1 text-text-muted active:cursor-grabbing sm:flex sm:items-center"
          title="Glisser pour réorganiser"
        >
          <GripVertical className="size-5" />
        </button>
      )}
      <span aria-hidden className="h-10 w-1 shrink-0 rounded-full" style={{ background: accent }} />
      <div className="min-w-0 flex-1">
        <Link href={`/ville/${loc.id}`} className="flex items-center gap-2 font-display text-lg font-semibold hover:underline">
          <Flag cc={loc.cc} />
          <span className="truncate">{loc.city}</span>
        </Link>
        <p className="truncate text-sm text-text-muted">
          {countryName(loc.cc)}
          {loc.region ? ` · ${loc.region}` : ""} · {p ? formatUtcOffset(p.offsetMinutes) : loc.tz}
        </p>
        <SetTags loc={loc} />
      </div>
      <div className="order-last w-full text-left sm:order-none sm:w-auto sm:text-right">
        <TimeDisplay parts={p} cycle={settings.hourCycle} seconds={settings.showSeconds} className="text-2xl leading-none font-semibold" secondsClassName="text-[0.6em]" />
        <p className="text-xs text-text-muted">
          {p ? capitalize(formatShortDate(p)) : ""}
          {p && dev ? ` · ${formatDelta(p.offsetMinutes - dev.offsetMinutes, { zeroLabel: "votre heure" })}` : ""}
          {dd ? ` · ${relativeDayLabel(dd)}` : ""}
        </p>
        {period && p && <DayPeriodBadge period={period} hour={p.hour} compact className="text-xs text-text-muted" />}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-2">
        <SetsMenu loc={loc} />
        <div role="group" aria-label={`Deux mondes : placer ${loc.city}`} className="mr-1 flex overflow-hidden rounded-control border border-border">
          {(["a", "b"] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              aria-pressed={inDuo === slot}
              onClick={() => {
                duoStore.set((d) => assignDuo(d, slot, loc.id));
                const d = duoStore.get();
                toast(`Deux mondes : ${getLocation(d.locationIdA)?.city} et ${getLocation(d.locationIdB)?.city}`);
              }}
              title={slot === "a" ? "Deux mondes : à gauche" : "Deux mondes : à droite"}
              className={cx(
                "h-9 px-2.5 text-xs font-bold transition-colors",
                inDuo === slot ? "bg-primary text-on-primary" : "text-text-muted hover:text-text",
              )}
            >
              <span aria-hidden>{slot === "a" ? "◧" : "◨"}</span>
              <span className="sr-only">{slot === "a" ? "à gauche" : "à droite"}</span>
            </button>
          ))}
        </div>
        <IconButton label={`Monter ${loc.city}`} disabled={!draggable || index === 0} onClick={() => favorites.move(loc.id, -1)}>
          <ChevronUp className="size-5" aria-hidden />
        </IconButton>
        <IconButton label={`Descendre ${loc.city}`} disabled={!draggable || index === total - 1} onClick={() => favorites.move(loc.id, 1)}>
          <ChevronDown className="size-5" aria-hidden />
        </IconButton>
        <IconButton
          label={`Retirer ${loc.city} des favoris`}
          onClick={() => {
            favorites.remove(loc.id);
            toast(`${loc.city} retirée des favoris`, "info");
          }}
        >
          <Trash2 className="size-5" aria-hidden />
        </IconButton>
      </div>
    </div>
  );

  if (!draggable) return <li>{content}</li>;
  return (
    <Reorder.Item value={loc.id} dragListener={false} dragControls={controls} as="li" className="list-none">
      {content}
    </Reorder.Item>
  );
}

function SetTags({ loc }: { loc: Location }) {
  const data = useFavoritesData();
  const item = data.items.find((f) => f.locationId === loc.id);
  const names = (item?.setIds ?? []).map((id) => data.sets.find((s) => s.id === id)?.name).filter(Boolean);
  if (!names.length) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-1">
      {names.map((n) => (
        <span key={n} className="rounded-full border border-border-glow/70 px-2 py-0.5 text-[0.7rem] font-bold text-secondary-ink">
          {n}
        </span>
      ))}
    </p>
  );
}

/** Choix des ensembles d'un favori (cases à cocher dans un menu dépliant). */
function SetsMenu({ loc }: { loc: Location }) {
  const data = useFavoritesData();
  const item = data.items.find((f) => f.locationId === loc.id);
  if (!data.sets.length) return null;
  return (
    <details className="group relative">
      <summary
        className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-control text-text hover:bg-surface-sunken marker:hidden [&::-webkit-details-marker]:hidden"
        aria-label={`Ensembles de ${loc.city}`}
        title="Ensembles"
      >
        <FolderHeart className="size-5" aria-hidden />
      </summary>
      <fieldset className="absolute right-0 z-30 mt-1 w-56 rounded-card border border-border-glow/70 bg-surface-raised p-3 shadow-card">
        <legend className="sr-only">Ensembles de {loc.city}</legend>
        <p className="mb-1 text-xs font-bold tracking-[0.12em] text-text-muted uppercase" aria-hidden>
          Ensembles
        </p>
        {data.sets.map((set) => (
          <label key={set.id} className="flex cursor-pointer items-center gap-2 rounded-control px-1 py-1.5 font-semibold hover:bg-surface-sunken">
            <input
              type="checkbox"
              checked={!!item?.setIds?.includes(set.id)}
              onChange={() => favorites.toggleInSet(set.id, loc.id)}
              className="size-4 accent-[var(--color-primary)]"
            />
            {set.name}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

/** Filtres par ensemble, création, renommage et suppression. */
function SetsBar({ active, onActive }: { active: string | null; onActive: (id: string | null) => void }) {
  const data = useFavoritesData();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const activeSet = data.sets.find((s) => s.id === active);
  const count = (id: string) => data.items.filter((f) => f.setIds?.includes(id)).length;
  const chip = (on: boolean) =>
    cx(
      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
      on ? "border-transparent bg-button text-on-button" : "border-border-glow/70 text-text hover:border-primary-ink",
    );
  return (
    <section aria-labelledby="ensembles-titre" className="flex flex-col gap-3">
      <h2 id="ensembles-titre" className="sr-only">
        Ensembles de favoris
      </h2>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par ensemble">
        <button type="button" aria-pressed={!active} className={chip(!active)} onClick={() => onActive(null)}>
          Tous <span className="tabular opacity-80">{data.items.length}</span>
        </button>
        {data.sets.map((s) => (
          <button key={s.id} type="button" aria-pressed={active === s.id} className={chip(active === s.id)} onClick={() => onActive(s.id)}>
            {s.name} <span className="tabular opacity-80">{count(s.id)}</span>
          </button>
        ))}
        {!creating && (
          <button type="button" className={cx(chip(false), "border-dashed")} onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Nouvel ensemble
          </button>
        )}
      </div>
      {creating && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = favorites.createSet(name);
            if (id) {
              toast(`Ensemble « ${name.trim()} » créé`);
              setName("");
              setCreating(false);
              onActive(id);
            } else toast("Nom vide ou déjà utilisé", "info");
          }}
        >
          <label htmlFor="nouvel-ensemble" className="sr-only">
            Nom du nouvel ensemble
          </label>
          <input
            id="nouvel-ensemble"
            autoFocus
            value={name}
            maxLength={MAX_SET_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Amis, Voyage 2027…"
            className="hs-themed h-10 rounded-control border border-border bg-surface-sunken px-3 text-sm font-medium"
          />
          <Button type="submit" size="sm" variant="primary">
            Créer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Annuler
          </Button>
        </form>
      )}
      {activeSet && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {renaming === activeSet.id ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                favorites.renameSet(activeSet.id, name);
                setRenaming(null);
                toast("Ensemble renommé");
              }}
            >
              <label htmlFor="renommer-ensemble" className="sr-only">
                Nouveau nom de l&apos;ensemble
              </label>
              <input
                id="renommer-ensemble"
                autoFocus
                value={name}
                maxLength={MAX_SET_NAME}
                onChange={(e) => setName(e.target.value)}
                className="hs-themed h-9 rounded-control border border-border bg-surface-sunken px-3 font-medium"
              />
              <Button type="submit" size="sm" variant="primary">
                Renommer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                Annuler
              </Button>
            </form>
          ) : confirmDelete ? (
            <>
              <span className="font-semibold">Supprimer « {activeSet.name} » ? Les villes restent dans vos favoris.</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  favorites.deleteSet(activeSet.id);
                  setConfirmDelete(false);
                  onActive(null);
                  toast("Ensemble supprimé", "info");
                }}
              >
                Confirmer la suppression
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(activeSet.name);
                  setRenaming(activeSet.id);
                }}
              >
                <Pencil className="size-4" aria-hidden /> Renommer « {activeSet.name} »
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden /> Supprimer l&apos;ensemble
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function FavoritesManager() {
  const data = useFavoritesData();
  const list = data.items;
  const [filter, setFilter] = useState("");
  const [setId, setSetId] = useState<string | null>(null);
  const activeSet = data.sets.some((s) => s.id === setId) ? setId : null;
  const ids = list.map((f) => f.locationId);
  const filtered = useMemo(() => {
    const q = normalize(filter);
    const inSet = favoritesInSet(list, activeSet).map((f) => f.locationId);
    if (!q) return inSet;
    return inSet.filter((id) => {
      const l = getLocation(id);
      return l && [l.city, countryName(l.cc), l.region ?? "", l.tz].some((s) => normalize(s).includes(q));
    });
  }, [list, filter, activeSet]);
  const filtering = filter.trim().length > 0 || activeSet !== null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="hs-rise">
        <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Sur cet appareil · sans compte</p>
        <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Favoris</h1>
        <p className="mt-2 text-text-muted">
          Ajoutez, triez, rangez en ensembles (« Famille », « Travail »…) et choisissez les deux villes de votre module « Deux mondes »
          (◧ gauche, ◨ droite).
        </p>
      </header>

      <section aria-labelledby="ajouter-favori" className="hs-rise hs-rise-2">
        <h2 id="ajouter-favori" className="mb-2 font-semibold">
          Ajouter un lieu
        </h2>
        <SearchBox
          size="md"
          label="Ajouter un lieu aux favoris"
          placeholder="Rechercher une ville à ajouter"
          excludeIds={ids}
          onSelect={(l) => {
            favorites.add(l.id);
            toast(`${l.city} ajoutée aux favoris`);
          }}
        />
      </section>

      {list.length === 0 ? (
        <FavoritesEmpty />
      ) : (
        <section aria-labelledby="liste-favoris" className="hs-rise hs-rise-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="liste-favoris" className="font-display text-2xl font-semibold">
              Mes lieux <span className="text-base text-text-muted tabular">({list.length})</span>
            </h2>
            <label className="hs-themed flex h-10 min-w-0 items-center gap-2 rounded-control border border-border bg-surface-sunken px-3 sm:w-72">
              <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
              <span className="sr-only">Rechercher dans mes favoris</span>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer mes favoris"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-muted"
              />
            </label>
          </div>
          <div className="mb-4">
            <SetsBar active={activeSet} onActive={setSetId} />
          </div>
          {filtering && (
            <p className="mb-2 text-sm text-text-muted" aria-live="polite">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              {activeSet && filtered.length === 0 ? " — ajoutez des villes à cet ensemble avec le bouton « Ensembles » de chaque ligne" : ""} — revenez à « Tous » sans filtre pour réorganiser.
            </p>
          )}
          {filtering ? (
            <ul className="flex flex-col gap-2">
              {filtered.map((id, i) => (
                <Row key={id} loc={getLocation(id)!} index={i} total={filtered.length} draggable={false} />
              ))}
            </ul>
          ) : (
            <Reorder.Group axis="y" values={ids} onReorder={(next: string[]) => favorites.reorder(next)} as="ul" className="flex flex-col gap-2">
              {ids.map((id, i) => (
                <Row key={id} loc={getLocation(id)!} index={i} total={ids.length} draggable />
              ))}
            </Reorder.Group>
          )}
          <p className="mt-3 text-xs text-text-muted">
            Astuce : glissez la poignée (ordinateur) ou utilisez les flèches pour changer l&apos;ordre. Les favoris sont enregistrés
            instantanément dans ce navigateur.
          </p>
        </section>
      )}
    </div>
  );
}
