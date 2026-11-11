// Lecture publique de l'état « Disponibles ce soir ».
// GET /api/soiree -> { active, selection, updatedAt }
import { getStore } from "@netlify/blobs";
import { NAMES } from "../shared/names.mjs";

const EMPTY = { active: false, selection: [], updatedAt: null };

export default async () => {
  try {
    const store = getStore({ name: "bar-de-yann", consistency: "strong" });
    const state = (await store.get("soiree", { type: "json" })) || EMPTY;
    const known = new Set(NAMES);
    const body = {
      active: !!state.active,
      selection: (state.selection || []).filter((n) => known.has(n)),
      updatedAt: state.updatedAt || null,
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("soiree read failed", err);
    return Response.json({ error: "storage_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
};

export const config = { path: "/api/soiree", method: "GET" };
