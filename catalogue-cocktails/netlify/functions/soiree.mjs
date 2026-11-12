// Netlify : lecture publique de « Disponibles ce soir ». Logique dans lib/soiree-core.mjs.
// GET /api/soiree -> { active, selection, updatedAt, version }
import { handleSoiree } from "../../lib/soiree-core.mjs";

export default async () => handleSoiree((k) => Netlify.env.get(k));

export const config = { path: "/api/soiree", method: "GET" };
