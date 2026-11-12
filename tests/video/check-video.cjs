// Vérification de la vidéo d'ambiance avec WebKit (moteur de Safari), à 390×844.
// Usage : node tests/video/check-video.cjs <url> <dossier-captures> [jeton-de-contournement-vercel]
const { webkit, devices } = require("@playwright/test");
const fs = require("fs");
const [url, out, bypass] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await webkit.launch();
  const results = {};
  for (const mode of ["standard", "reduce"]) {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"], viewport: { width: 390, height: 844 },
      reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : {},
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#ambiance").evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    const read = () => page.evaluate(() => ({ paused: ambianceVideo.paused, t: +ambianceVideo.currentTime.toFixed(2), muted: ambianceVideo.muted }));
    const a = await read();
    await page.locator("#ambiance").screenshot({ path: `${out}/${mode}-0s.png` });
    await page.waitForTimeout(2000);
    const b = await read();
    await page.locator("#ambiance").screenshot({ path: `${out}/${mode}-2s.png` });
    const btn = page.locator("#ambianceSound");
    const visible = await btn.isVisible();
    await btn.click();
    const on = await page.evaluate(() => ({ muted: ambianceVideo.muted, label: ambianceSound.getAttribute("aria-label"), text: ambianceSound.textContent, paused: ambianceVideo.paused }));
    await btn.click();
    const off = await page.evaluate(() => ({ muted: ambianceVideo.muted, label: ambianceSound.getAttribute("aria-label") }));
    results[mode] = { a, b, avance: +(b.t - a.t).toFixed(2), boutonVisible: visible, sonActive: on, sonCoupe: off, erreurs: errors };
    await page.screenshot({ path: `${out}/${mode}-page.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 1));
})();
