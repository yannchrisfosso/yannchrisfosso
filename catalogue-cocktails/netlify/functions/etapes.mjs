// Netlify : étapes de préparation (privées par défaut). Logique dans lib/soiree-core.mjs.
// GET /api/etapes?id=<slug>
import { handleSteps } from "../../lib/soiree-core.mjs";

export default async (req) => handleSteps(req, (k) => Netlify.env.get(k));

export const config = { path: "/api/etapes", method: "GET" };
