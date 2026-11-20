"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Download, RotateCcw, Save, TriangleAlert, Undo2, Upload, Wand2, X } from "lucide-react";
import { getLocation } from "@/lib/catalog";
import { contrastRatio, isHex, normalizeHex } from "@/lib/theme/color";
import { CLOCK_ACCENTS, PRESETS, getPreset, type Palette } from "@/lib/theme/presets";
import { resolveTheme, sanitizeTheme, type CardStyle, type ThemePreference } from "@/lib/theme/tokens";
import { themeActions, themesEqual, useDraftState, useSavedTheme, useSystemDark } from "@/lib/state/theme";
import { updateSettings, useSettings } from "@/lib/state/settings";
import { useFavorites } from "@/lib/state/favorites";
import { useDuo } from "@/lib/state/duo";
import { useDeviceZone, useNow } from "@/lib/time/ticker";
import { copyText } from "@/lib/share";
import { ClockCard } from "@/components/clock/clock-card";
import { computeLocationTime } from "@/components/clock/use-location-time";
import { DuoStrip } from "@/components/duo/duo-strip";
import { EXAMPLE_IDS } from "@/components/favorites/favorites-panel";
import { Button, Card, cx, Segmented, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const FIELDS: { key: keyof Palette; label: string; help: string }[] = [
  { key: "background", label: "Fond", help: "Couleur de fond de toute l'application" },
  { key: "primary", label: "Couleur principale", help: "Accents, liens, éléments actifs" },
  { key: "secondary", label: "Couleur secondaire", help: "Favoris, repères, frise horaire" },
  { key: "button", label: "Boutons", help: "Boutons d'action principaux" },
  { key: "surface", label: "Surfaces et cartes", help: "Cartes d'horloge et panneaux clairs" },
  { key: "text", label: "Texte", help: "Texte sur le fond" },
];

function Section({ title, children, description, id }: { title: string; description?: ReactNode; children: ReactNode; id: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 id={id} className="font-display text-xl font-semibold">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function RatioBadge({ ratio, min }: { ratio: number; min: number }) {
  const ok = ratio >= min;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular",
        ok ? "bg-surface-sunken text-text-muted" : "bg-primary text-on-primary",
      )}
      title={`Contraste ${ratio.toFixed(2)}:1 (minimum ${min}:1)`}
    >
      {ok ? <Check className="size-3" aria-hidden /> : <TriangleAlert className="size-3" aria-hidden />}
      {ratio.toFixed(1)}:1
    </span>
  );
}

function ColorRow({
  field,
  value,
  overridden,
  onChange,
  onReset,
  badge,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
  badge?: ReactNode;
}) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }
  const id = `couleur-${field.key}`;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-2.5 last:border-0">
      <input
        id={id}
        type="color"
        value={value.toLowerCase()}
        onChange={(e) => onChange(normalizeHex(e.target.value))}
        className="size-11 shrink-0 cursor-pointer rounded-control border border-border bg-transparent p-1"
        aria-describedby={`${id}-aide`}
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-semibold">
          {field.label} {badge}
        </label>
        <p id={`${id}-aide`} className="text-xs text-text-muted">
          {field.help}
        </p>
      </div>
      <input
        aria-label={`${field.label} : code hexadécimal`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (isHex(e.target.value)) onChange(normalizeHex(e.target.value));
        }}
        spellCheck={false}
        className="hs-themed h-10 w-[6.5rem] rounded-control border border-border bg-surface-sunken px-2 font-mono text-sm uppercase"
      />
      <Button size="sm" variant="ghost" onClick={onReset} disabled={!overridden} aria-label={`Rétablir ${field.label.toLowerCase()} du thème`}>
        <RotateCcw className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

function Preview({ theme }: { theme: ThemePreference }) {
  const now = useNow();
  const deviceZone = useDeviceZone();
  const settings = useSettings();
  const duo = useDuo();
  const favs = useFavorites();
  const systemDark = useSystemDark();
  const resolved = resolveTheme(theme, systemDark);
  const ids = favs.length ? favs.map((f) => f.locationId) : EXAMPLE_IDS;
  const loc = getLocation(ids[0])!;
  return (
    <div
      className="hs-themed overflow-hidden rounded-card border border-border bg-bg shadow-card"
      inert
      style={Object.fromEntries(Object.entries(resolved.vars).filter(([k]) => k.startsWith("--"))) as CSSProperties}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-text">
        <span className="font-display text-lg font-semibold">
          Horisph<em className="text-primary-ink">è</em>re
        </span>
        <span className="flex gap-3 text-xs font-semibold text-text-muted">
          <span className="text-text underline decoration-primary decoration-2 underline-offset-4">Explorer</span>
          <span>Comparer</span>
          <span>Favoris</span>
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div
          className="relative h-24 overflow-hidden rounded-[calc(var(--radius-card)*0.7)]"
          style={{ background: resolved.map.ocean }}
          aria-hidden
        >
          <div className="absolute top-4 left-6 h-12 w-24 rounded-[40%]" style={{ background: resolved.map.land }} />
          <div className="absolute top-8 left-40 h-14 w-20 rounded-[45%]" style={{ background: resolved.map.land }} />
          <div className="absolute top-3 right-6 h-16 w-28 rounded-[40%]" style={{ background: resolved.map.land }} />
          <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: `linear-gradient(90deg, transparent, ${resolved.map.night}88)` }} />
          <span className="absolute top-9 left-14 size-2.5 rounded-full bg-primary" />
          <span className="absolute top-12 left-48 size-3 rounded-full bg-secondary" />
        </div>
        <ClockCard
          location={loc}
          info={now ? computeLocationTime(loc, now, deviceZone) : null}
          settings={settings}
          clockStyle={theme.clockStyle}
          cardStyle={theme.cardStyle}
          override={theme.clockOverrides[loc.id]}
          isFavorite
          onToggleFavorite={() => {}}
        />
        <DuoStrip pref={duo} now={now} cycle={settings.hourCycle} interactive={false} headingLevel={3} />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-9 items-center rounded-control bg-button px-4 text-sm font-semibold text-on-button">Bouton principal</span>
          <span className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-4 text-sm font-semibold text-text">
            Secondaire
          </span>
        </div>
        <p className="text-sm text-text">
          Texte courant <span className="text-text-muted">· texte secondaire</span> · <span className="font-semibold text-primary-ink">lien</span>
        </p>
      </div>
    </div>
  );
}

export function ThemeEditor() {
  const saved = useSavedTheme();
  const { draft, history } = useDraftState();
  const theme = draft ?? saved;
  const systemDark = useSystemDark();
  const resolved = resolveTheme(theme, systemDark);
  const settings = useSettings();
  const favs = useFavorites();
  const dirty = !!draft && !themesEqual(draft, saved);
  const mode = resolved.mode;
  const preset = getPreset(theme.presetId);
  const overrides = theme.overrides[mode] ?? {};
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const setColor = (key: keyof Palette, value: string | null) =>
    themeActions.edit((t) => {
      const current = { ...(t.overrides[mode] ?? {}) };
      if (value === null) delete current[key];
      else current[key] = value;
      return { ...t, overrides: { ...t.overrides, [mode]: current } };
    });

  const v = resolved.vars;
  const badges: Partial<Record<keyof Palette, ReactNode>> = {
    text: <RatioBadge ratio={contrastRatio(resolved.palette.text, resolved.palette.background)} min={4.5} />,
    primary: <RatioBadge ratio={contrastRatio(resolved.palette.primary, resolved.palette.background)} min={3} />,
    secondary: <RatioBadge ratio={contrastRatio(resolved.palette.secondary, resolved.palette.background)} min={3} />,
    button: <RatioBadge ratio={contrastRatio(resolved.palette.button, resolved.palette.background)} min={3} />,
    surface: <RatioBadge ratio={contrastRatio(v["--color-on-surface"], resolved.palette.surface)} min={4.5} />,
  };

  const clockIds = favs.length ? favs.map((f) => f.locationId) : EXAMPLE_IDS;

  return (
    <div className="flex flex-col gap-6">
      <header className="hs-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-secondary-ink uppercase">Personnalisation</p>
          <h1 className="mt-1 font-display text-4xl font-semibold sm:text-5xl">Mon univers</h1>
          <p className="mt-2 max-w-2xl text-text-muted">
            Choisissez, prévisualisez, enregistrez. Chaque changement s&apos;applique immédiatement à toute l&apos;application, mais
            n&apos;est conservé qu&apos;une fois enregistré.
          </p>
        </div>
      </header>

      <div
        role="toolbar"
        aria-label="Actions du thème"
        className="hs-themed sticky top-[calc(var(--header-h)+8px)] z-30 flex flex-wrap items-center gap-2 rounded-card border border-border bg-[color-mix(in_srgb,var(--color-surface-raised)_92%,transparent)] p-2 backdrop-blur-md"
      >
        <p className="mr-auto px-2 text-sm font-semibold" aria-live="polite">
          {dirty ? "Modifications non enregistrées" : "Thème enregistré"}
        </p>
        <Button size="sm" variant="ghost" onClick={() => themeActions.undo()} disabled={!history.length}>
          <Undo2 className="size-4" aria-hidden /> Annuler
        </Button>
        <Button size="sm" variant="ghost" onClick={() => themeActions.discard()} disabled={!dirty}>
          <X className="size-4" aria-hidden /> Abandonner
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            themeActions.resetToDefault();
            toast("Thème par défaut en aperçu — enregistrez pour confirmer", "info");
          }}
        >
          <RotateCcw className="size-4" aria-hidden /> Réinitialiser
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            themeActions.save();
            toast("Thème enregistré");
          }}
          disabled={!dirty}
        >
          <Save className="size-4" aria-hidden /> Enregistrer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Section id="themes" title="Thèmes" description="Cinq ambiances de départ, modifiables ensuite.">
            <div role="radiogroup" aria-labelledby="themes" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {PRESETS.map((p) => {
                const active = p.id === theme.presetId;
                const pal = p.palettes[mode];
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => themeActions.edit({ presetId: p.id, overrides: {} })}
                    className={cx(
                      "hs-themed flex flex-col gap-2 rounded-[calc(var(--radius-card)-6px)] border-2 p-3 text-left transition-colors",
                      active ? "border-primary" : "border-border hover:border-text-muted",
                    )}
                  >
                    <span className="flex h-12 overflow-hidden rounded-control" aria-hidden>
                      <span className="flex-[2]" style={{ background: pal.background }} />
                      <span className="flex-1" style={{ background: pal.primary }} />
                      <span className="flex-1" style={{ background: pal.secondary }} />
                      <span className="flex-1" style={{ background: pal.surface }} />
                    </span>
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      {p.name}
                      {active && <Check className="size-4 text-primary-ink" aria-hidden />}
                    </span>
                    <span className="text-xs text-text-muted">{p.tagline}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section id="mode" title="Mode d'affichage" description={theme.mode === "auto" ? `Automatique : suit votre système (actuellement ${mode === "dark" ? "sombre" : "clair"}).` : undefined}>
            <Segmented
              label="Mode d'affichage"
              value={theme.mode}
              onChange={(m) => themeActions.edit({ mode: m })}
              options={[
                { value: "auto", label: "Automatique" },
                { value: "light", label: "Clair" },
                { value: "dark", label: "Sombre" },
              ]}
            />
          </Section>

          <Section
            id="couleurs"
            title="Couleurs"
            description={`Vous modifiez le mode ${mode === "dark" ? "sombre" : "clair"} du thème « ${preset.name} ». Les ratios indiquent le contraste avec le fond.`}
          >
            <div>
              {FIELDS.map((f) => (
                <ColorRow
                  key={f.key}
                  field={f}
                  value={resolved.palette[f.key]}
                  overridden={!!overrides[f.key]}
                  onChange={(val) => setColor(f.key, val)}
                  onReset={() => setColor(f.key, null)}
                  badge={badges[f.key]}
                />
              ))}
            </div>
            <Switch
              checked={theme.autoContrast}
              onChange={(c) => themeActions.edit({ autoContrast: c })}
              label="Correction automatique de la lisibilité"
              description="Ajuste les textes trop peu contrastés (WCAG 2.2 AA : 4,5:1 pour le texte, 3:1 pour les éléments d'interface)."
            />
            {resolved.issues.length > 0 && (
              <div role="status" className="rounded-control border border-primary-ink bg-surface-sunken p-3">
                <p className="flex items-center gap-2 font-semibold">
                  <TriangleAlert className="size-4 text-primary-ink" aria-hidden />
                  {resolved.issues.length === 1 ? "Une combinaison est peu lisible" : `${resolved.issues.length} combinaisons sont peu lisibles`}
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {resolved.issues.map((i) => (
                    <li key={i.target} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {i.label} : {i.ratio.toFixed(2)}:1 (minimum {i.min}:1)
                        {i.autoFixed && " — corrigé automatiquement à l'affichage"}
                      </span>
                      <span className="inline-block size-5 rounded border border-border" style={{ background: i.suggestion }} aria-hidden />
                      <Button size="sm" variant="secondary" onClick={() => setColor(i.field, i.suggestion)}>
                        <Wand2 className="size-4" aria-hidden /> Utiliser {i.suggestion}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section id="forme" title="Formes et effets">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-sm font-semibold">
                  Arrondis <span className="text-text-muted tabular">{theme.radius} px</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={theme.radius}
                  onChange={(e) => themeActions.edit({ radius: Number(e.target.value) })}
                  className="accent-[var(--color-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-sm font-semibold">
                  Intensité des dégradés <span className="text-text-muted tabular">{theme.gradient} %</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={theme.gradient}
                  onChange={(e) => themeActions.edit({ gradient: Number(e.target.value) })}
                  className="accent-[var(--color-primary)]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="mb-1.5 text-sm font-semibold">Fond des cartes d&apos;horloge</p>
                <Segmented
                  size="sm"
                  label="Fond des cartes d'horloge"
                  value={theme.cardStyle}
                  onChange={(s) => themeActions.edit({ cardStyle: s })}
                  options={[
                    { value: "uni", label: "Uni" },
                    { value: "degrade", label: "Dégradé" },
                    { value: "motif", label: "Motif" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Style d&apos;horloge</p>
                <Segmented
                  size="sm"
                  label="Style d'horloge"
                  value={theme.clockStyle}
                  onChange={(s) => themeActions.edit({ clockStyle: s })}
                  options={[
                    { value: "editorial", label: "Chiffres" },
                    { value: "cadran", label: "Avec cadran" },
                  ]}
                />
              </div>
            </div>
          </Section>

          <Section
            id="animations"
            title="Animations"
            description="Réglage enregistré immédiatement (il concerne votre confort, pas l'apparence du thème)."
          >
            <Segmented
              label="Animations"
              value={settings.motion}
              onChange={(m) => updateSettings({ motion: m })}
              options={[
                { value: "system", label: "Selon le système" },
                { value: "reduced", label: "Réduites" },
                { value: "full", label: "Complètes" },
              ]}
            />
          </Section>

          <Section id="horloges" title="Horloges individuelles" description="Donnez un accent propre à certaines cartes sans changer le thème global.">
            <ul className="flex flex-col">
              {clockIds.map((id) => {
                const l = getLocation(id);
                if (!l) return null;
                const o = theme.clockOverrides[id] ?? {};
                const setOverride = (patch: { accent?: string | null; style?: CardStyle | null }) =>
                  themeActions.edit((t) => {
                    const cur = { ...(t.clockOverrides[id] ?? {}) };
                    if (patch.accent !== undefined) {
                      if (patch.accent === null) delete cur.accent;
                      else cur.accent = patch.accent;
                    }
                    if (patch.style !== undefined) {
                      if (patch.style === null) delete cur.style;
                      else cur.style = patch.style;
                    }
                    const next = { ...t.clockOverrides };
                    if (Object.keys(cur).length) next[id] = cur;
                    else delete next[id];
                    return { ...t, clockOverrides: next };
                  });
                return (
                  <li key={id} className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-0">
                    <span className="min-w-28 font-semibold">{l.city}</span>
                    <div role="radiogroup" aria-label={`Accent de la carte ${l.city}`} className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!o.accent}
                        onClick={() => setOverride({ accent: null })}
                        className={cx(
                          "h-8 rounded-full border px-2.5 text-xs font-bold",
                          !o.accent ? "border-primary text-text" : "border-border text-text-muted",
                        )}
                      >
                        Thème
                      </button>
                      {CLOCK_ACCENTS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={o.accent === c}
                          aria-label={`Accent ${c}`}
                          onClick={() => setOverride({ accent: c })}
                          className={cx(
                            "size-8 rounded-full border-2 transition-transform",
                            o.accent === c ? "scale-110 border-text" : "border-transparent",
                          )}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <select
                      aria-label={`Fond de la carte ${l.city}`}
                      value={o.style ?? ""}
                      onChange={(e) => setOverride({ style: (e.target.value || null) as CardStyle | null })}
                      className="hs-themed ml-auto h-9 rounded-control border border-border bg-surface-sunken px-2 text-sm font-semibold"
                    >
                      <option value="">Fond du thème</option>
                      <option value="uni">Uni</option>
                      <option value="degrade">Dégradé</option>
                      <option value="motif">Motif</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section id="export" title="Exporter ou importer mon thème" description="Pour les utilisateurs avancés : le thème au format JSON.">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  const ok = await copyText(JSON.stringify(theme, null, 2));
                  toast(ok ? "Thème copié (JSON)" : "Copie impossible", ok ? "ok" : "info");
                }}
              >
                <Download className="size-4" aria-hidden /> Copier le JSON
              </Button>
            </div>
            <label htmlFor="import-theme" className="text-sm font-semibold">
              Coller un thème JSON
            </label>
            <textarea
              id="import-theme"
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              rows={4}
              spellCheck={false}
              className="hs-themed rounded-control border border-border bg-surface-sunken p-3 font-mono text-xs"
              placeholder='{ "schemaVersion": 1, "presetId": "jade-solaire", … }'
            />
            {importError && (
              <p role="alert" className="text-sm font-semibold text-primary-ink">
                {importError}
              </p>
            )}
            <div>
              <Button
                size="sm"
                disabled={!importText.trim()}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(importText);
                    if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== 1) throw new Error();
                    themeActions.edit(() => sanitizeTheme(parsed));
                    setImportText("");
                    toast("Thème importé en aperçu — enregistrez pour le garder");
                  } catch {
                    setImportError("Ce texte n'est pas un thème Horisphère valide (schemaVersion 1 attendu).");
                  }
                }}
              >
                <Upload className="size-4" aria-hidden /> Appliquer en aperçu
              </Button>
            </div>
          </Section>
        </div>

        <aside className="min-w-0" aria-label="Aperçu en direct">
          <div className="sticky top-[calc(var(--header-h)+80px)] flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-muted">Aperçu en direct</p>
            <Preview theme={theme} />
          </div>
        </aside>
      </div>
    </div>
  );
}
