// Espace propriétaire : toutes les écritures passent ici, après vérification du PIN côté serveur.
// POST /api/soiree-admin  { pin, action, ... }
//   action "verify"         -> { ok, state }
//   action "save"           { active?, selection? } -> { ok, state }
//   action "presets"        -> { ok, presets }
//   action "preset-save"    { name, selection } -> { ok, presets }
//   action "preset-delete"  { name } -> { ok, presets }
import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { NAMES } from "../shared/names.mjs";

const KNOWN = new Set(NAMES);
const MAX_FAILS = 8;               // tentatives ratées autorisées…
const FAIL_WINDOW = 15 * 60 * 1000; // …par adresse IP sur 15 minutes
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const sha = (s) => createHash("sha256").update(String(s)).digest();
const cleanSel = (sel) => [...new Set((Array.isArray(sel) ? sel : []).filter((n) => typeof n === "string" && KNOWN.has(n)))];
const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 40);

export default async (req, context) => {
  const expected = Netlify.env.get("ADMIN_PIN");
  if (!expected) return json({ ok: false, error: "pin_not_configured" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  let store;
  try { store = getStore({ name: "bar-de-yann", consistency: "strong" }); }
  catch (err) { console.error(err); return json({ ok: false, error: "storage_unavailable" }, 503); }

  // Anti-essais en série : compteur d'échecs par IP (empreinte, pas l'IP en clair).
  const ipKey = "fails/" + sha(context.ip || "unknown").toString("hex").slice(0, 32);
  const now = Date.now();
  let fails = null;
  try { fails = await store.get(ipKey, { type: "json" }); } catch {}
  if (fails && now - fails.first > FAIL_WINDOW) fails = null;
  if (fails && fails.count >= MAX_FAILS) return json({ ok: false, error: "locked", retryIn: Math.ceil((fails.first + FAIL_WINDOW - now) / 60000) }, 429);

  if (!timingSafeEqual(sha(body.pin), sha(expected))) {
    const next = fails ? { first: fails.first, count: fails.count + 1 } : { first: now, count: 1 };
    try { await store.setJSON(ipKey, next); } catch {}
    await new Promise((r) => setTimeout(r, 600));
    return json({ ok: false, error: "bad_pin", left: Math.max(0, MAX_FAILS - next.count) }, 401);
  }
  if (fails) { try { await store.delete(ipKey); } catch {} }

  try {
    const state = (await store.get("soiree", { type: "json" })) || { active: false, selection: [], updatedAt: null };
    const presets = (await store.get("presets", { type: "json" })) || {};

    switch (body.action) {
      case "verify":
        return json({ ok: true, state });
      case "save": {
        const next = {
          active: typeof body.active === "boolean" ? body.active : !!state.active,
          selection: Array.isArray(body.selection) ? cleanSel(body.selection) : cleanSel(state.selection),
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON("soiree", next);
        return json({ ok: true, state: next });
      }
      case "presets":
        return json({ ok: true, presets });
      case "preset-save": {
        const name = cleanName(body.name);
        if (!name) return json({ ok: false, error: "name_required" }, 400);
        if (!presets[name] && Object.keys(presets).length >= 30) return json({ ok: false, error: "too_many_presets" }, 400);
        presets[name] = cleanSel(body.selection);
        await store.setJSON("presets", presets);
        return json({ ok: true, presets });
      }
      case "preset-delete": {
        delete presets[cleanName(body.name)];
        await store.setJSON("presets", presets);
        return json({ ok: true, presets });
      }
      default:
        return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("soiree-admin failed", err);
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }
};

export const config = { path: "/api/soiree-admin", method: "POST" };
