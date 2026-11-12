// Vercel : étapes de préparation (privées par défaut). Même logique que la fonction Netlify (lib/soiree-core.mjs).
// GET /api/etapes?id=<slug>
import { handleSteps } from "../lib/soiree-core.mjs";

export function GET(request) {
  return handleSteps(request, (k) => process.env[k]);
}
