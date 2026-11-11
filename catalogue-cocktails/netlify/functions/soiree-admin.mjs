// Espace barman : toutes les écritures passent ici (PRD § 6 et § 7).
// POST /api/soiree-admin  { action, ... }
//   "login"          { pin }                              -> { ok, token, expiresAt, state }   (401 PIN faux, 429 bloqué)
//   "verify"         (jeton)                              -> { ok, state }
//   "save"           (jeton) { active, selection, version } -> { ok, state }  (400 si publication vide, 409 si version périmée)
//   "presets"        (jeton)                              -> { ok, presets }
//   "preset-save"    (jeton) { name, selection }          -> { ok, presets }
//   "preset-delete"  (jeton) { name }                     -> { ok, presets }
// Le jeton est envoyé dans l'en-tête « Authorization: Bearer … ». Le PIN n'est jamais stocké ni renvoyé.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { NAMES } from "../shared/names.mjs";

const KNOWN = new Set(NAMES);
const MAX_FAILS = 5;                     // N-06 : 5 échecs…
const LOCK_MS = 5 * 60 * 1000;           // …= 5 min de blocage
const SESSION_MS = 30 * 24 * 3600 * 1000; // B-03 : session de 30 jours
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const sha = (s) => createHash("sha256").update(String(s)).digest();
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 40);
const EMPTY = { active: false, selection: [], updatedAt: null, version: 0 };

// Clé de signature : dépend de SESSION_SECRET et du PIN ; changer le PIN invalide toutes les sessions.
const signingKey = (secret, pin) => createHmac("sha256", secret).update("bar-session-v1:").update(sha(pin)).digest();
function makeToken(key) {
  const payload = b64u(JSON.stringify({ iat: Date.now(), exp: Date.now() + SESSION_MS }));
  return payload + "." + b64u(createHmac("sha256", key).update(payload).digest());
}
function checkToken(token, key) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return false;
  const good = createHmac("sha256", key).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== good.length || !timingSafeEqual(given, good)) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
// Identifiants inconnus refusés (PRD § 7) : on renvoie null pour signaler l'erreur.
function checkSel(sel) {
  if (!Array.isArray(sel) || sel.length > 200) return null;
  const out = [...new Set(sel)];
  return out.every((n) => typeof n === "string" && KNOWN.has(n)) ? out : null;
}

export default async (req, context) => {
  const pinEnv = Netlify.env.get("ADMIN_PIN");
  const secret = Netlify.env.get("SESSION_SECRET");
  if (!pinEnv || !secret) return json({ ok: false, error: "not_configured" }, 503);
  const key = signingKey(secret, pinEnv);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  let store;
  try { store = getStore({ name: "bar-de-yann", consistency: "strong" }); }
  catch (err) { console.error(err); return json({ ok: false, error: "storage_unavailable" }, 503); }

  /* ---------- Connexion : PIN -> jeton ---------- */
  if (body.action === "login") {
    // Compteur unique (toutes adresses confondues) : un attaquant qui change d'IP est bloqué aussi.
    // Les sessions déjà ouvertes (jetons) continuent de fonctionner pendant le blocage.
    // Chaque échec ou réussite crée une NOUVELLE clé (visible immédiatement partout, contrairement
    // à la mise à jour d'une clé existante) : « login-fail/<horodatage> » et « login-ok/<horodatage> ».
    const now = Date.now();
    const stamps = async (prefix) => {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => Number(b.key.slice(prefix.length).split("-")[0])).filter(Number.isFinite);
    };
    let recent = [];
    try {
      const lastOk = Math.max(0, ...(await stamps("login-ok/")));
      recent = (await stamps("login-fail/")).filter((t) => t > now - LOCK_MS && t > lastOk).sort((a, b) => b - a);
    } catch (err) { console.error("lockout read failed", err); }
    if (recent.length >= MAX_FAILS) {
      return json({ ok: false, error: "locked", retryIn: Math.max(1, Math.ceil((recent[MAX_FAILS - 1] + LOCK_MS - now) / 60000)) }, 429);
    }
    if (!timingSafeEqual(sha(body.pin), sha(pinEnv))) {
      try { await store.set(`login-fail/${now}-${Math.random().toString(36).slice(2, 8)}`, "1"); }
      catch (err) { console.error("lockout write failed", err); }
      await new Promise((r) => setTimeout(r, 500));
      const count = recent.length + 1;
      if (count >= MAX_FAILS) return json({ ok: false, error: "locked", retryIn: 5 }, 429);
      return json({ ok: false, error: "bad_pin", left: MAX_FAILS - count }, 401);
    }
    try {
      await store.set(`login-ok/${now}`, "1");
      // Ménage : on retire les traces de plus d'une heure.
      for (const p of ["login-fail/", "login-ok/"]) {
        const { blobs } = await store.list({ prefix: p });
        await Promise.all(blobs.filter((b) => Number(b.key.slice(p.length).split("-")[0]) < now - 3600e3).map((b) => store.delete(b.key)));
      }
    } catch (err) { console.error("lockout reset failed", err); }
    const token = makeToken(key);
    let state = EMPTY;
    try { state = (await store.get("soiree", { type: "json" })) || EMPTY; } catch {}
    return json({ ok: true, token, expiresAt: new Date(Date.now() + SESSION_MS).toISOString(), state: { ...EMPTY, ...state } });
  }

  /* ---------- Toutes les autres actions : jeton obligatoire ---------- */
  const auth = req.headers.get("authorization") || "";
  if (!checkToken(auth.replace(/^Bearer\s+/i, ""), key)) return json({ ok: false, error: "session_expired" }, 401);

  try {
    const state = { ...EMPTY, ...((await store.get("soiree", { type: "json" })) || {}) };
    const presets = (await store.get("presets", { type: "json" })) || {};

    switch (body.action) {
      case "verify":
        return json({ ok: true, state });
      case "save": {
        const sel = body.selection === undefined ? state.selection : checkSel(body.selection);
        if (sel === null) return json({ ok: false, error: "unknown_cocktail" }, 400);
        const active = typeof body.active === "boolean" ? body.active : !!state.active;
        if (active && sel.length === 0) return json({ ok: false, error: "empty_publish", state }, 400);
        if (typeof body.version === "number" && body.version !== state.version) return json({ ok: false, error: "stale_version", state }, 409);
        const next = { active, selection: sel, updatedAt: new Date().toISOString(), version: state.version + 1 };
        await store.setJSON("soiree", next);
        return json({ ok: true, state: next });
      }
      case "presets":
        return json({ ok: true, presets });
      case "preset-save": {
        const name = cleanName(body.name);
        if (!name) return json({ ok: false, error: "name_required" }, 400);
        const sel = checkSel(body.selection);
        if (sel === null) return json({ ok: false, error: "unknown_cocktail" }, 400);
        if (!presets[name] && Object.keys(presets).length >= 30) return json({ ok: false, error: "too_many_presets" }, 400);
        presets[name] = sel;
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
