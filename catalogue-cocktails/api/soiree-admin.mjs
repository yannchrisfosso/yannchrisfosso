// Vercel : espace barman. Même logique que la fonction Netlify (lib/soiree-core.mjs).
// POST /api/soiree-admin { action, ... }
import { handleAdmin } from "../lib/soiree-core.mjs";

export function POST(request) {
  return handleAdmin(request, (k) => process.env[k]);
}
