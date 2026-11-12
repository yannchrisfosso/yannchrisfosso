// T-11 (PRD § 10) : Lighthouse mobile sur l'accueil ≥ 90 en performance, accessibilité et bonnes pratiques ;
// N-05 : LCP < 2,5 s. Usage : CHROME_PATH=/chemin/chrome npm run test:lighthouse [-- <url>]
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const url = process.argv[2] || process.env.BASE_URL || "https://bar-yanniel.vercel.app/";
const out = path.join(mkdtempSync(path.join(tmpdir(), "lh-")), "report.json");
const flags = ["--headless=new", "--no-sandbox", ...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : [])];
execFileSync("npx", ["-y", "lighthouse@12.6.1", url, "--only-categories=performance,accessibility,best-practices",
  "--form-factor=mobile", `--chrome-flags=${flags.join(" ")}`, "--output=json", `--output-path=${out}`, "--quiet"], { stdio: "inherit" });

const r = JSON.parse(readFileSync(out, "utf8"));
const scores = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
const lcp = r.audits["largest-contentful-paint"].numericValue / 1000;
const ok = Object.values(scores).every((s) => s >= 90) && lcp < 2.5;
console.log(`T-11 ${url}`, scores, `LCP ${lcp.toFixed(2)} s`, ok ? "→ RÉUSSI" : "→ ÉCHOUÉ");
process.exit(ok ? 0 : 1);
