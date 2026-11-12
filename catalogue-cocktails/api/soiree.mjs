// Vercel : lecture publique de « Disponibles ce soir ». Même logique que la fonction Netlify (lib/soiree-core.mjs).
// GET /api/soiree -> { active, selection, updatedAt, version }
import { handleSoiree } from "../lib/soiree-core.mjs";

export function GET() {
  return handleSoiree((k) => process.env[k]);
}
