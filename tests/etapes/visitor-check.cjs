// Contrôle « visiteur » des étapes privées, sans PIN (prévisualisation ou production), WebKit et Chromium, 390×844.
// Usage : node tests/etapes/visitor-check.cjs <url> [jeton-de-contournement-vercel]   (CHROMIUM_PATH si besoin)
const { webkit, chromium, devices } = require("@playwright/test");
const [url, bypass] = process.argv.slice(2);
const headers = bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true", "x-vercel-skip-toolbar": "1" } : {};
(async () => {
  let fails = 0;
  const check = (l, c, d) => { if (!c) fails++; console.log(`${c ? "✓" : "✘"} ${l}`, d === undefined ? "" : JSON.stringify(d)); };
  for (const [name, type] of [["WebKit", webkit], ["Chromium", chromium]]) {
    const b = await type.launch(type === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const ctx = await b.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, extraHTTPHeaders: headers });
    const p = await ctx.newPage(); const errors = [];
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(new URL("/#mojito", url).href, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(4000);
    const s = await p.evaluate(() => ({
      encart: document.getElementById("shStepsBody").textContent.trim(), listes: document.querySelectorAll("#shStepsBody .steps").length,
      lien: document.querySelectorAll("#shStepsBody a").length, modeBar: getComputedStyle(document.getElementById("shBar")).display,
      doses: document.querySelectorAll("#shBody .dose li").length, astuce: !!document.querySelector("#shBody .tip")?.textContent.trim(),
      etapeDansPage: /presse doucement la menthe avec le sirop/i.test(document.documentElement.innerHTML) }));
    check(`${name} encart « Étapes réservées au barman », sans lien`, s.encart === "Étapes réservées au barman" && s.listes === 0 && s.lien === 0, s);
    check(`${name} Mode bar masqué`, s.modeBar === "none");
    check(`${name} doses (5) et astuce visibles`, s.doses === 5 && s.astuce);
    check(`${name} aucun texte d'étape dans la page`, !s.etapeDansPage);
    check(`${name} aucune erreur dans la console`, errors.length === 0, errors); // avant nos propres appels 401 volontaires
    const api = await p.evaluate(async () => { const r = await fetch("/api/etapes?id=mojito", { cache: "no-store" }); return { s: r.status, cc: r.headers.get("cache-control") }; });
    check(`${name} /api/etapes sans session → 401, private, no-store`, api.s === 401 && /private/.test(api.cc) && /no-store/.test(api.cc), api);
    const post = await p.evaluate(async () => (await fetch("/api/soiree-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-etapes-publiques", value: true }) })).status);
    check(`${name} POST de l'interrupteur sans session → 401`, post === 401, post);
    await b.close();
  }
  console.log(fails ? `${fails} vérification(s) en échec` : "Toutes les vérifications visiteur sont réussies");
  process.exit(fails ? 1 : 0);
})();
