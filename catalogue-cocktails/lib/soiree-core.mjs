// Logique commune de « Disponibles ce soir » (PRD § 6 et § 7), identique sur Netlify et sur Vercel.
// Les fonctions de chaque hébergeur ne font que lire les variables d'environnement et appeler ces deux handlers.
//
// GET  /api/soiree        -> { active, selection, updatedAt, version, etapesPubliques }
// POST /api/soiree-admin  { action, ... }
//   "login"          { pin }                                -> { ok, token, expiresAt, state }   (401 PIN faux, 429 bloqué)
//   "verify"         (jeton)                                -> { ok, state }
//   "save"           (jeton) { active, selection, version } -> { ok, state }  (400 publication vide, 409 version périmée)
//   "presets"        (jeton)                                -> { ok, presets }
//   "preset-save"    (jeton) { name, selection }            -> { ok, presets }
//   "preset-delete"  (jeton) { name }                       -> { ok, presets }
//   "set-etapes-publiques" (jeton) { value: booléen }     -> { ok, settings }
// Tous les POST doivent venir du site lui-même (en-tête Origin), sinon 403.
// Le jeton est envoyé dans « Authorization: Bearer … ». Le PIN n'est jamais stocké ni renvoyé.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getBarStore } from "./store.mjs";
import { NAMES } from "../netlify/shared/names.mjs";
import { STEPS } from "./steps-data.mjs";

const KNOWN = new Set(NAMES);
const MAX_FAILS = 5;                      // N-06 : 5 échecs…
const LOCK_MS = 5 * 60 * 1000;            // …= 5 min de blocage
const LOCK_S = LOCK_MS / 1000;            // durée d'expiration native (Upstash : EX)
const SESSION_MS = 30 * 24 * 3600 * 1000; // B-03 : session de 30 jours
const EMPTY = { active: false, selection: [], updatedAt: null, version: 0 };
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const sha = (s) => createHash("sha256").update(String(s)).digest();
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 40);
const stampOf = (key, prefix) => Number(key.slice(prefix.length).split("-")[0]);

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
// Identifiants inconnus refusés (PRD § 7) : null signale l'erreur.
function checkSel(sel) {
  if (!Array.isArray(sel) || sel.length > 200) return null;
  const out = [...new Set(sel)];
  return out.every((n) => typeof n === "string" && KNOWN.has(n)) ? out : null;
}

// Vérification d'origine : un POST de l'espace barman doit venir du site lui-même (protection contre les requêtes croisées).
function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let o; try { o = new URL(origin).host; } catch { return false; }
  const hosts = [new URL(req.url).host, req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean);
  return hosts.some((h) => h.split(",")[0].trim() === o);
}
const SETTINGS_KEY = "etapes-publiques"; // Upstash : « yanniel:etapes-publiques »
async function readSettings(store) {
  try { const v = await store.getJSON(SETTINGS_KEY); return { etapesPubliques: !!(v && v.public) }; } catch { return { etapesPubliques: false }; }
}
const privateJson = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

/* ---------- Étapes de préparation (privées par défaut) ----------
   GET /api/etapes?id=<slug> -> 200 { id, steps } si « Afficher les étapes aux visiteurs » est activé
   OU si la session barman est valide ; sinon 401. Jamais mis en cache. */
export async function handleSteps(req, env) {
  const id = new URL(req.url).searchParams.get("id") || "";
  const steps = Object.prototype.hasOwnProperty.call(STEPS, id) ? STEPS[id] : null;
  if (!steps) return privateJson({ ok: false, error: "unknown_cocktail" }, 404);
  let isPublic = false;
  try { isPublic = (await readSettings(await getBarStore(env))).etapesPubliques; } catch {}
  if (!isPublic) {
    const pinEnv = env("ADMIN_PIN"), secret = env("SESSION_SECRET");
    const auth = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!pinEnv || !secret || !checkToken(auth, signingKey(secret, pinEnv))) return privateJson({ ok: false, error: "private" }, 401);
  }
  return privateJson({ ok: true, id, steps });
}

/* ---------- Lecture publique ---------- */
export async function handleSoiree(env) {
  try {
    const store = await getBarStore(env);
    const state = (await store.getJSON("soiree")) || EMPTY;
    return json({
      active: !!state.active,
      selection: (state.selection || []).filter((n) => KNOWN.has(n)),
      updatedAt: state.updatedAt || null,
      version: state.version || 0,
      etapesPubliques: (await readSettings(store)).etapesPubliques, // le réglage, jamais les étapes
    });
  } catch (err) {
    console.error("soiree read failed", err);
    return json({ error: "storage_unavailable" }, 503);
  }
}

/* ---------- Espace barman ---------- */
export async function handleAdmin(req, env) {
  const pinEnv = env("ADMIN_PIN");
  const secret = env("SESSION_SECRET");
  if (!pinEnv || !secret) return json({ ok: false, error: "not_configured" }, 503);
  if (!sameOrigin(req)) return json({ ok: false, error: "bad_origin" }, 403);
  const key = signingKey(secret, pinEnv);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_request" }, 400); }

  let store;
  try { store = await getBarStore(env); }
  catch (err) { console.error(err); return json({ ok: false, error: "storage_unavailable" }, 503); }

  /* Connexion : PIN -> jeton.
     Compteur unique (toutes adresses confondues) : un attaquant qui change d'IP est bloqué aussi ;
     les sessions déjà ouvertes continuent de fonctionner pendant le blocage. Chaque échec ou réussite
     crée une NOUVELLE clé (« login-fail/… », « login-ok/… ») ; sur Upstash elles expirent seules (EX). */
  if (body.action === "login") {
    const now = Date.now();
    const stamps = async (p) => (await store.keys(p)).map((k) => stampOf(k, p)).filter(Number.isFinite);
    let recent = [];
    try {
      const lastOk = Math.max(0, ...(await stamps("login-ok/")));
      recent = (await stamps("login-fail/")).filter((t) => t > now - LOCK_MS && t > lastOk).sort((a, b) => b - a);
    } catch (err) { console.error("lockout read failed", err); }
    if (recent.length >= MAX_FAILS) {
      return json({ ok: false, error: "locked", retryIn: Math.max(1, Math.ceil((recent[MAX_FAILS - 1] + LOCK_MS - now) / 60000)) }, 429);
    }
    if (!timingSafeEqual(sha(body.pin), sha(pinEnv))) {
      try { await store.set(`login-fail/${now}-${Math.random().toString(36).slice(2, 8)}`, "1", { ttlSeconds: LOCK_S }); }
      catch (err) { console.error("lockout write failed", err); }
      await new Promise((r) => setTimeout(r, 500));
      const count = recent.length + 1;
      if (count >= MAX_FAILS) return json({ ok: false, error: "locked", retryIn: 5 }, 429);
      return json({ ok: false, error: "bad_pin", left: MAX_FAILS - count }, 401);
    }
    try {
      await store.set(`login-ok/${now}`, "1", { ttlSeconds: LOCK_S });
      if (!store.hasTTL) {
        // Netlify Blobs n'expire rien : on retire les traces de plus d'une heure.
        for (const p of ["login-fail/", "login-ok/"]) {
          await Promise.all((await store.keys(p)).filter((k) => stampOf(k, p) < now - 3600e3).map((k) => store.del(k)));
        }
      }
    } catch (err) { console.error("lockout reset failed", err); }
    let state = EMPTY;
    try { state = (await store.getJSON("soiree")) || EMPTY; } catch {}
    return json({ ok: true, token: makeToken(key), expiresAt: new Date(Date.now() + SESSION_MS).toISOString(), state: { ...EMPTY, ...state }, settings: await readSettings(store) });
  }

  /* Toutes les autres actions : jeton obligatoire */
  const auth = req.headers.get("authorization") || "";
  if (!checkToken(auth.replace(/^Bearer\s+/i, ""), key)) return json({ ok: false, error: "session_expired" }, 401);

  try {
    const state = { ...EMPTY, ...((await store.getJSON("soiree")) || {}) };
    const presets = (await store.getJSON("presets")) || {};
    switch (body.action) {
      case "verify":
        return json({ ok: true, state, settings: await readSettings(store) });
      case "set-etapes-publiques": {
        if (typeof body.value !== "boolean") return json({ ok: false, error: "bad_request" }, 400);
        await store.setJSON(SETTINGS_KEY, { public: body.value, updatedAt: new Date().toISOString() });
        return json({ ok: true, settings: { etapesPubliques: body.value } });
      }
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
}
