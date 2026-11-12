// Vérifie le son de la vidéo d'ambiance (v1.9) avec WebKit et Chromium à 390×844.
// Usage : node tests/video/check-sound.cjs <url> [jeton-de-contournement-vercel]
// (CHROMIUM_PATH = chemin de Chromium si les navigateurs sont dans des dossiers différents)
// - « son bloqué » : Chromium avec sa règle réelle par défaut (--autoplay-policy=document-user-activation-required) ; WebKit avec un refus simulé
//   de play() avec son tant qu'aucun geste n'a eu lieu (Playwright ne permet pas de régler la politique WebKit).
const { webkit, chromium, devices } = require("@playwright/test");
const [url, bypass] = process.argv.slice(2);
const headers = bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true", "x-vercel-skip-toolbar": "1" } : {};
const simulateBlocked = () => {
  let gesture = false;
  ["pointerdown", "touchstart", "click", "keydown"].forEach((e) => document.addEventListener(e, () => { gesture = true; }, true));
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.muted && !gesture) return Promise.reject(new DOMException("son bloqué (simulé)", "NotAllowedError"));
    return orig.call(this);
  };
};
const state = (p) => p.evaluate(() => ({ paused: ambianceVideo.paused, muted: ambianceVideo.muted, vol: +ambianceVideo.volume.toFixed(2), bouton: ambianceSound.textContent, choix: (() => { try { return localStorage.getItem("ambiance-son-coupe"); } catch (e) { return "?"; } })() }));
// Défilement à la molette : contrairement à page.evaluate() (qui compte comme un geste dans Chromium),
// la molette n'autorise pas le son, comme le défilement au doigt sur iPhone.
const show = async (p) => {
  if (p.context().browser().browserType().name() === "webkit") { // WebKit mobile : pas de molette ; evaluate n'y vaut pas un geste
    await p.locator("#ambiance").evaluate((e) => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(1500); return;
  }
  await p.mouse.move(195, 400);
  if (!p.__shown) { // premier affichage : distance fixe, sans aucune lecture de la page (qui vaudrait un geste dans Chromium)
    p.__shown = true; await p.mouse.wheel(0, 560); await p.waitForTimeout(1800); return;
  }
  for (let k = 0; k < 60; k++) {
    const b = await p.locator("#ambiance").boundingBox();
    const mid = b.y + b.height / 2;
    if (mid > 300 && mid < 544) break;
    await p.mouse.wheel(0, mid > 544 ? 250 : -250); await p.waitForTimeout(80);
  }
  await p.waitForTimeout(1500);
};
const tapText = async (p) => { const b = await p.locator("#humeurs h2").boundingBox(); await p.mouse.click(b.x + 20, b.y + 10); await p.waitForTimeout(1300); };

(async () => {
  let fails = 0;
  const check = (label, cond, data) => { if (!cond) fails++; console.log(`${cond ? "✓" : "✘"} ${label}`, JSON.stringify(data)); };
  for (const [name, type] of [["WebKit", webkit], ["Chromium", chromium]]) {
    const exe = type === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
    const browser = await type.launch(type === chromium ? { ...exe, ignoreDefaultArgs: ["--autoplay-policy=no-user-gesture-required"], args: ["--autoplay-policy=document-user-activation-required"] } : {}); // règle par défaut de Chrome : muet autorisé, son après un geste
    // 1) son bloqué au démarrage
    const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, extraHTTPHeaders: headers });
    if (type === webkit) await ctx.addInitScript(simulateBlocked);
    const p = await ctx.newPage(); const errors = [];
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url, { waitUntil: "networkidle" }); await show(p);
    let s = await state(p); check(`${name} son bloqué → lecture muette, bouton 🔇`, !s.paused && s.muted && s.bouton === "🔇", s);
    await tapText(p);
    s = await state(p); check(`${name} clic sur la page → son actif, bouton 🔊, volume 0,6`, !s.paused && !s.muted && s.bouton === "🔊" && Math.abs(s.vol - 0.6) < 0.05, s);
    if (name === "WebKit") await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); else for (let k = 0; k < 40; k++) await p.mouse.wheel(0, 400);
    await p.waitForTimeout(800);
    s = await state(p); check(`${name} hors écran → pause et son coupé`, s.paused && s.muted, s);
    await show(p);
    s = await state(p); check(`${name} retour à l'écran → le son revient`, !s.paused && !s.muted && s.bouton === "🔊", s);
    await p.locator("#ambianceSound").click(); await p.waitForTimeout(300);
    s = await state(p); check(`${name} clic sur le bouton → son coupé, choix mémorisé`, s.muted && s.bouton === "🔇" && s.choix === "1", s);
    await p.reload({ waitUntil: "networkidle" }); p.__shown = true; await show(p); // le navigateur restaure la position : on se cale sur la vidéo await tapText(p);
    s = await state(p); check(`${name} rechargement + clic sur la page → reste muet (choix respecté)`, !s.paused && s.muted && s.bouton === "🔇", s);
    await p.locator("#ambianceSound").click(); await p.waitForTimeout(1300);
    s = await state(p); check(`${name} réactivation par le bouton → son actif, choix effacé`, !s.muted && s.bouton === "🔊" && s.choix === null, s);
    check(`${name} aucune erreur dans la console`, errors.length === 0, errors);
    await ctx.close();
    // 2) son autorisé dès l'ouverture
    const browser2 = type === chromium ? await chromium.launch({ ...exe, args: ["--autoplay-policy=no-user-gesture-required"] }) : browser;
    const ctx2 = await browser2.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, extraHTTPHeaders: headers });
    const p2 = await ctx2.newPage(); await p2.goto(url, { waitUntil: "networkidle" }); await show(p2);
    s = await state(p2); check(`${name} son autorisé → son actif dès l'affichage, bouton 🔊`, !s.paused && !s.muted && s.bouton === "🔊", s);
    await ctx2.close(); if (browser2 !== browser) await browser2.close();
    await browser.close();
  }
  console.log(fails ? `${fails} vérification(s) en échec` : "Toutes les vérifications sont réussies");
  process.exit(fails ? 1 : 0);
})();
