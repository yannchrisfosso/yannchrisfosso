"use client";

/**
 * Carte mondiale interactive (MapLibre GL JS, BSD-3).
 * Fond : frontières Natural Earth 1:50m (domaine public) servies localement, sans tuiles tierces :
 * aucune clé, aucun traceur, fonctionne hors ligne une fois en cache.
 * Couches : océan, terres, frontières, graticule, ombre nuit/crépuscule calculée (solaire), marqueurs de villes.
 * Les marqueurs sont placés aux coordonnées réelles des villes du catalogue, chacune liée à sa zone IANA.
 */
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import type { Map as MlMap, Marker } from "maplibre-gl";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { useEffect, useRef, useState } from "react";
import vendor from "@/data/vendor.json";
import { allLocations, countryName, getLocation, type Location } from "@/lib/catalog";
import { getZonedParts } from "@/lib/time/engine";
import { formatTime, type HourCycle } from "@/lib/time/format";
import { altitudeFromSubsolar, nightShade, subsolarPoint } from "@/lib/time/solar";
import type { ResolvedTheme } from "@/lib/theme/tokens";
import { hexToRgb } from "@/lib/theme/color";

maplibregl.setWorkerUrl(vendor.maplibreWorker);

const MERC_MAX = 85.051129;
const WORLD_CORNERS: [[number, number], [number, number], [number, number], [number, number]] = [
  [-180, MERC_MAX],
  [180, MERC_MAX],
  [180, -MERC_MAX],
  [-180, -MERC_MAX],
];

let topologyPromise: Promise<Topology> | null = null;
function loadTopology() {
  topologyPromise ??= fetch("/geo/countries-50m.json").then((r) => {
    if (!r.ok) throw new Error("fond de carte indisponible");
    return r.json();
  });
  return topologyPromise;
}

function graticule(step = 30): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let lon = -180; lon <= 180; lon += step) {
    const coords: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 2) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
  }
  for (let lat = -60; lat <= 60; lat += step) {
    const coords: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 2) coords.push([lon, lat]);
    features.push({ type: "Feature", properties: { equator: lat === 0 }, geometry: { type: "LineString", coordinates: coords } });
  }
  return { type: "FeatureCollection", features };
}

/** Image (projection Mercator) de l'ombre nocturne, avec dégradé de crépuscule. */
async function nightImage(instant: number, color: string, maxAlpha: number): Promise<ImageBitmap | null> {
  if (typeof OffscreenCanvas === "undefined" && typeof document === "undefined") return null;
  const W = 360;
  const H = 360;
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(W, H) : Object.assign(document.createElement("canvas"), { width: W, height: H });
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  const img = ctx.createImageData(W, H);
  const sub = subsolarPoint(instant);
  const { r, g, b } = hexToRgb(color);
  for (let y = 0; y < H; y++) {
    const mercY = Math.PI * (1 - (2 * (y + 0.5)) / H);
    const lat = (Math.atan(Math.sinh(mercY)) * 180) / Math.PI;
    for (let x = 0; x < W; x++) {
      const lon = -180 + (360 * (x + 0.5)) / W;
      const a = nightShade(altitudeFromSubsolar(lat, lon, sub));
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(a * maxAlpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return createImageBitmap(canvas);
}

/** Zoom initial : le globe occupe la hauteur du cadre ; la projection plane couvre sa largeur. */
function fitZoom(el: HTMLElement, projection: "globe" | "mercator"): number {
  const w = el.clientWidth || 600;
  const h = el.clientHeight || 400;
  if (projection === "globe") return Math.max(0, Math.log2((Math.min(w, h) * 0.98 * Math.PI) / 512));
  return Math.max(0, Math.log2(w / 512));
}

/** Monde entier en projection plane (sans l'Antarctique). */
const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-168, -50],
  [188, 74],
];

type Ring = [number, number][];

function polygonsOf(f: GeoJSON.Feature): Ring[][] {
  const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  if (!g) return [];
  return (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Ring[][];
}

/**
 * Anneaux qui franchissent l'antiméridien (îles Aléoutiennes, Tchoukotka, Fidji…) : on les rend continus
 * (longitudes au-delà de 180°) pour éviter les longues lignes horizontales parasites en projection plane.
 */
function fixAntimeridian(f: GeoJSON.Feature) {
  for (const poly of polygonsOf(f)) {
    for (const ring of poly) {
      let jump = false;
      for (let i = 1; i < ring.length; i++) if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) jump = true;
      if (jump) for (const pt of ring) if (pt[0] < 0) pt[0] += 360;
    }
  }
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}

/** Région d'un pays (d'après son plus grand polygone) pour colorer les continents. */
function regionIndex(f: GeoJSON.Feature): number {
  const outer = polygonsOf(f)
    .map((p) => p[0])
    .filter(Boolean)
    .sort((x, y) => ringArea(y) - ringArea(x))[0];
  if (!outer) return 3;
  let minX = 999,
    maxX = -999,
    minY = 90,
    maxY = -90;
  for (const [x, y] of outer) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  let lon = (minX + maxX) / 2;
  if (lon > 180) lon -= 360;
  const lat = (minY + maxY) / 2;
  if (lat < -60) return 6; // Antarctique
  if (lon < -30) return lat > 12 ? 0 : 1; // Amérique du Nord / du Sud
  if (lon < 55 && lat >= 36) return 2; // Europe
  if (lon < 52 && lat < 36) return 4; // Afrique
  if (lon > 110 && lat < -8) return 5; // Océanie
  return 3; // Asie et Moyen-Orient
}

function landColorExpression(stops: string[], fallback: string): maplibregl.ExpressionSpecification {
  return ["match", ["get", "r"], 0, stops[0], 1, stops[1], 2, stops[2], 3, stops[3], 4, stops[4], 5, stops[5] ?? stops[3], fallback];
}

function citiesGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: allLocations().map((l) => ({ type: "Feature", properties: { pop: l.pop }, geometry: { type: "Point", coordinates: [l.lon, l.lat] } })),
  };
}

export interface WorldMapProps {
  theme: ResolvedTheme;
  favoriteIds: string[];
  /** Villes dont l'étiquette reste visible (favoris, exemples, Deux mondes) */
  featuredIds?: string[];
  focusId?: string | null;
  selectedId?: string | null;
  onSelect?: (l: Location) => void;
  projection: "globe" | "mercator";
  reducedMotion: boolean;
  hourCycle: HourCycle;
  now: number;
  className?: string;
}

interface MarkerEntry {
  marker: Marker;
  el: HTMLButtonElement;
  loc: Location;
  favorite: boolean;
  featured: boolean;
}

export default function WorldMap(props: WorldMapProps) {
  const { theme, favoriteIds, featuredIds = [], focusId, selectedId, onSelect, projection, reducedMotion, hourCycle, now, className } = props;
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Création de la carte (une seule fois)
  useEffect(() => {
    if (!container.current) return;
    let map: MlMap;
    try {
      const t = themeRef.current.map;
      map = new maplibregl.Map({
        container: container.current,
        style: {
          version: 8,
          projection: { type: projection === "globe" ? "globe" : "mercator" },
          sources: {},
          layers: [{ id: "ocean", type: "background", paint: { "background-color": t.ocean } }],
        },
        center: [10, 22],
        zoom: fitZoom(container.current, projection),
        minZoom: -2,
        maxZoom: 7,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        renderWorldCopies: projection !== "globe",
        fadeDuration: 0,
      });
    } catch {
      queueMicrotask(() => setError("La carte interactive n'a pas pu démarrer sur cet appareil (WebGL indisponible)."));
      return;
    }
    mapRef.current = map;
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (domaine public)',
      }),
      "bottom-right",
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
    map.touchZoomRotate.disableRotation();
    map.keyboard.enable();

    map.on("load", async () => {
      try {
        const topo = await loadTopology();
        const obj = topo.objects.countries as GeometryCollection;
        const land = feature(topo, obj) as unknown as GeoJSON.FeatureCollection;
        for (const f of land.features) {
          f.properties = { ...(f.properties ?? {}), r: regionIndex(f) };
          fixAntimeridian(f);
        }
        const borders = mesh(topo, obj, (a, b) => a !== b) as unknown as GeoJSON.MultiLineString;
        // Frontières : on coupe les segments qui sautent d'un bord à l'autre de la carte
        borders.coordinates = borders.coordinates.flatMap((line) => {
          const parts: GeoJSON.Position[][] = [[]];
          line.forEach((pt, i) => {
            if (i > 0 && Math.abs(pt[0] - line[i - 1][0]) > 180) parts.push([]);
            parts[parts.length - 1].push(pt);
          });
          return parts.filter((p) => p.length > 1);
        });
        const t = themeRef.current.map;
        map.addSource("land", { type: "geojson", data: land });
        map.addSource("borders", { type: "geojson", data: { type: "Feature", properties: {}, geometry: borders } });
        map.addSource("graticule", { type: "geojson", data: graticule() });
        map.addLayer({ id: "graticule", type: "line", source: "graticule", paint: { "line-color": t.graticule, "line-width": 0.6, "line-opacity": 0.35 } });
        map.addLayer({ id: "land-glow", type: "line", source: "land", paint: { "line-color": t.landStops[2], "line-width": 6, "line-blur": 6, "line-opacity": 0.25 } });
        map.addLayer({ id: "land", type: "fill", source: "land", paint: { "fill-color": landColorExpression(t.landStops, t.graticule), "fill-antialias": true } });
        map.addLayer({ id: "borders", type: "line", source: "borders", paint: { "line-color": t.border, "line-width": 0.6, "line-opacity": 0.7 } });
        // Lumières des villes (thème « Atlas nuit »)
        map.addSource("cities", { type: "geojson", data: citiesGeoJSON() });
        map.addLayer({
          id: "city-lights",
          type: "circle",
          source: "cities",
          layout: { visibility: t.style === "nightlights" ? "visible" : "none" },
          paint: {
            "circle-color": t.lights,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, ["+", 1.2, ["*", 0.8, ["get", "pop"]]], 5, ["+", 3, ["*", 2, ["get", "pop"]]]],
            "circle-blur": 0.9,
            "circle-opacity": 0.75,
          },
        });
        map.addSource("night", { type: "image", coordinates: WORLD_CORNERS } as unknown as maplibregl.ImageSourceSpecification);
        map.addLayer({ id: "night", type: "raster", source: "night", paint: { "raster-opacity": 1, "raster-fade-duration": 0 } });
        if (projection !== "globe") map.fitBounds(WORLD_BOUNDS, { padding: 8, duration: 0 });
        setReady(true);
      } catch {
        setError("Le fond de carte n'a pas pu être chargé. La recherche et les favoris restent disponibles.");
      }
    });
    map.on("error", () => {
      /* erreurs de rendu non bloquantes : la carte reste facultative */
    });

    const markers = markersRef.current;
    return () => {
      markers.forEach((m) => m.marker.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Projection globe / plan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection({ type: projection === "globe" ? "globe" : "mercator" });
    if (projection === "globe") map.easeTo({ zoom: fitZoom(map.getContainer(), projection), duration: reducedMotion ? 0 : 500 });
    else map.fitBounds(WORLD_BOUNDS, { padding: 8, duration: reducedMotion ? 0 : 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, ready]);

  // Couleurs du thème
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const t = theme.map;
    map.setPaintProperty("ocean", "background-color", t.ocean);
    map.setPaintProperty("land", "fill-color", landColorExpression(t.landStops, t.graticule));
    map.setPaintProperty("land-glow", "line-color", t.landStops[2]);
    map.setPaintProperty("borders", "line-color", t.border);
    map.setPaintProperty("graticule", "line-color", t.graticule);
    map.setPaintProperty("city-lights", "circle-color", t.lights);
    map.setLayoutProperty("city-lights", "visibility", t.style === "nightlights" ? "visible" : "none");
  }, [theme, ready]);

  // Ombre de la nuit : recalculée chaque minute
  const minute = now - (now % 60_000);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !minute) return;
    let cancelled = false;
    nightImage(minute, theme.map.night, theme.map.nightAlpha).then((bitmap) => {
      if (cancelled || !bitmap || !mapRef.current) return;
      const src = map.getSource("night") as maplibregl.ImageSource | undefined;
      src?.updateImage({ image: bitmap } as unknown as Parameters<maplibregl.ImageSource["updateImage"]>[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [minute, ready, theme.map.night, theme.map.nightAlpha]);

  // Marqueurs : villes populaires + favoris
  const favKey = favoriteIds.join(",") + "|" + featuredIds.join(",");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const wanted = new Map<string, { loc: Location; favorite: boolean; featured: boolean }>();
    for (const l of allLocations()) if (l.pop >= 2) wanted.set(l.id, { loc: l, favorite: false, featured: false });
    for (const id of [...featuredIds, ...favoriteIds]) {
      const l = getLocation(id);
      if (l) wanted.set(id, { loc: l, favorite: favoriteIds.includes(id), featured: true });
    }
    const existing = markersRef.current;
    for (const [id, m] of existing) {
      const w = wanted.get(id);
      if (!w || w.favorite !== m.favorite || w.featured !== m.featured) {
        m.marker.remove();
        existing.delete(id);
      }
    }
    for (const [id, { loc, favorite, featured }] of wanted) {
      if (existing.has(id)) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "hs-marker";
      el.dataset.fav = favorite ? "1" : "0";
      el.dataset.featured = featured ? "1" : "0";
      el.dataset.pop = String(loc.pop);
      el.tabIndex = favorite || featured ? 0 : -1;
      el.innerHTML = `<span class="hs-marker-dot" aria-hidden="true"></span><span class="hs-marker-label"><span class="hs-marker-city"></span><span class="hs-marker-time tabular"></span></span>`;
      (el.querySelector(".hs-marker-city") as HTMLElement).textContent = loc.city;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(loc);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center", opacityWhenCovered: "0", subpixelPositioning: true })
        .setLngLat([loc.lon, loc.lat])
        .addTo(map);
      existing.set(id, { marker, el, loc, favorite, featured });
    }
    const updateTiers = () => {
      const z = map.getZoom();
      for (const m of existing.values()) {
        const visible = m.favorite || m.featured || m.loc.pop >= 3 || (m.loc.pop >= 2 && z >= 2.4);
        m.el.style.display = visible ? "" : "none";
        m.el.dataset.labels = z >= 3 ? "1" : "0";
      }
    };
    updateTiers();
    map.on("zoomend", updateTiers);
    return () => {
      map.off("zoomend", updateTiers);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey, ready]);

  // Heures et libellés accessibles des marqueurs (chaque minute)
  useEffect(() => {
    if (!ready || !minute) return;
    for (const m of markersRef.current.values()) {
      const p = getZonedParts(minute, m.loc.tz);
      const time = formatTime(p, hourCycle);
      (m.el.querySelector(".hs-marker-time") as HTMLElement).textContent = time;
      m.el.setAttribute("aria-label", `${m.loc.city}, ${countryName(m.loc.cc)} — ${time}`);
      m.el.dataset.selected = m.loc.id === selectedId ? "1" : "0";
    }
  }, [minute, ready, hourCycle, selectedId, favKey]);

  // Déplacement fluide vers un lieu choisi
  useEffect(() => {
    const map = mapRef.current;
    const l = getLocation(focusId);
    if (!map || !ready || !l) return;
    const target = { center: [l.lon, l.lat] as [number, number], zoom: Math.max(map.getZoom(), 3) };
    if (reducedMotion) map.jumpTo(target);
    else map.flyTo({ ...target, speed: 1.4, curve: 1.3, essential: false });
  }, [focusId, ready, reducedMotion]);

  if (error) {
    return (
      <div className={className} role="note">
        <div className="flex h-full items-center justify-center rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={container}
        className="hs-map size-full"
        role="region"
        aria-label="Carte du monde interactive : villes populaires et favoris, ombre de la nuit en temps réel. Toutes les fonctions sont aussi accessibles par la recherche et la liste des favoris."
      />
    </div>
  );
}
