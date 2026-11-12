// Netlify : espace barman (connexion par PIN, publication, modèles). Logique dans lib/soiree-core.mjs.
// POST /api/soiree-admin { action, ... }
import { handleAdmin } from "../../lib/soiree-core.mjs";

export default async (req) => handleAdmin(req, (k) => Netlify.env.get(k));

export const config = { path: "/api/soiree-admin", method: "POST" };
