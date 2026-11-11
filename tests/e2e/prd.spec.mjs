// Scénarios T-01 à T-10 du PRD (§ 10), exécutés contre la production.
import { test, expect } from "@playwright/test";
import { PIN, adminApi, ownerPage, guestPage, selectOnly, bannerNames } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

let token;
test.beforeAll(async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto("/");
  const r = await adminApi(p, "login", { pin: PIN });
  expect(r.status, "connexion barman").toBe(200);
  token = r.body.token;
  // Point de départ propre : soirée HORS LIGNE.
  await adminApi(p, "save", { active: false, selection: [] }, token);
});

test.afterAll(async ({ browser }) => {
  // Nettoyage (§ 10) : soirée HORS LIGNE, modèles de test supprimés.
  const p = await (await browser.newContext()).newPage();
  await p.goto("/");
  await adminApi(p, "save", { active: false, selection: [] }, token);
  await adminApi(p, "preset-delete", { name: "Test-e2e" }, token);
});

test("T-01 Parcours invité : accueil → humeur → fiche → Verres = 4", async ({ browser }, info) => {
  const { page, errors } = await guestPage(browser, info.project.use);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("L'art du cocktail");
  await page.locator('[data-mood="frais"]').click();
  await expect(page.locator("#activeMood")).toContainText("Frais & mentholé");
  const card = page.locator("#grid .card").first();
  const name = (await card.locator(".n").textContent()).trim();
  await card.click();
  await expect(page.locator("#shName")).toHaveText(name);
  await expect.poll(() => page.locator("#shImg").evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  const first = await page.evaluate((n) => C.find((c) => c.n === n).ing[0], name);
  await page.locator('#shBody [data-p="4"]').evaluate((b) => b.click());
  const want = String(Math.round(first[0] * 4 * 2) / 2).replace(".", ",");
  await expect(page.locator("#shBody .dose li .q").first()).toContainText(want);
  expect(errors).toEqual([]);
});

test("T-03 Publication sur deux appareils (3 cocktails)", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  const pick = ["Mojito", "Negroni", "Paloma"];
  await selectOnly(owner, pick);
  await expect(owner.locator("#stTitle")).toHaveText("HORS LIGNE");
  await owner.locator("#publish").click();
  await expect(owner.locator("#stTitle")).toHaveText("EN LIGNE");
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 3 cocktails");
  const { page } = await guestPage(browser, info.project.use);
  await page.goto("/");
  await expect(page.locator("#tonight")).toBeVisible();
  await expect(page.locator("#tonight .ti")).toContainText("3 cocktails disponibles");
  expect((await bannerNames(page)).sort()).toEqual([...pick].sort());
  await expect(page.locator('[data-cat="soir"]')).toHaveAttribute("aria-pressed", "true");
  const firstThree = (await page.locator("#grid .card .n").allTextContents()).slice(0, 3);
  expect(firstThree.sort()).toEqual([...pick].sort());
  await expect(page.locator("#grid .card .tn")).toHaveCount(3);
});

test("T-04 Mise à jour sans recharger (≤ 60 s)", async ({ browser }, info) => {
  const { page } = await guestPage(browser, info.project.use);
  await page.goto("/");
  await expect(page.locator("#tonight .ti")).toContainText("3 cocktails");
  const owner = await ownerPage(browser, info.project.use, token);
  await owner.locator("#q").fill("Margarita");
  await owner.locator('input[data-n="Margarita"]').evaluate((e) => e.click());
  await expect(owner.locator("#status")).toContainText("Mis à jour pour les invités", { timeout: 15_000 });
  const t0 = Date.now();
  await expect(page.locator("#tonight .ti")).toContainText("4 cocktails", { timeout: 65_000 });
  expect(Date.now() - t0).toBeLessThanOrEqual(65_000);
});

test("T-05 « Surprends-moi » ne tire que les cocktails publiés (20 lancers)", async ({ browser }, info) => {
  const { page } = await guestPage(browser, info.project.use);
  await page.goto("/");
  await expect(page.locator("#tonight")).toBeVisible();
  const published = (await bannerNames(page)).sort();
  for (let k = 0; k < 20; k++) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("#surprise").click();
    await expect(page.locator("#sheet")).toHaveClass(/open/, { timeout: 10_000 });
    expect(published).toContain((await page.locator("#shName").textContent()).trim());
    await page.locator("#shClose").evaluate((b) => b.click());
    await expect(page.locator("#sheet")).not.toHaveClass(/open/);
  }
});

test("T-06 Publication vide refusée", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  await owner.locator("#none").click();
  await expect(owner.locator("#warn")).toContainText("Arrêter la soirée");
  await owner.locator("#publish").click();
  await expect(owner.locator("#warn")).toContainText("Impossible de publier une carte vide");
  const r = await adminApi(owner, "save", { active: true, selection: [] }, token);
  expect(r.status).toBe(400);
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 4 cocktails");
});

test("T-07 Modèles : enregistrer, recharger, utiliser, publier, supprimer", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  const pick = ["Aperol Spritz", "Foléré Fizz"];
  await selectOnly(owner, pick); // soirée en ligne : 0 puis 2 → la carte publiée devient ces 2
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 2 cocktails", { timeout: 15_000 });
  await owner.locator("#presetName").fill("Test-e2e");
  await owner.locator("#presetSave").click();
  await expect(owner.locator("#presets")).toContainText("Test-e2e");
  await owner.reload();
  await expect(owner.locator("#presets")).toContainText("Test-e2e · 2 cocktails");
  await selectOnly(owner, ["Mojito"]);
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 1 cocktail", { timeout: 15_000 });
  await owner.locator('[data-load="Test-e2e"]').click();
  await expect(owner.locator("#pending")).toBeVisible();
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 1 cocktail"); // le modèle ne publie rien seul
  await owner.locator("#publishNow").click();
  await expect(owner.locator("#stSub")).toHaveText("les invités voient 2 cocktails");
  const st = await owner.evaluate(async () => (await fetch("/api/soiree", { cache: "no-store" })).json());
  expect(st.selection.sort()).toEqual([...pick].sort());
  await owner.locator('[data-del="Test-e2e"]').click();
  await expect(owner.locator("#presets")).not.toContainText("Test-e2e");
});

test("T-10 Serveur injoignable : site complet, aucun bandeau", async ({ browser }, info) => {
  const { page, errors } = await guestPage(browser, info.project.use);
  await page.route("**/api/soiree", (r) => r.abort());
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(page.locator("#tonight")).toBeHidden();
  await expect(page.locator("#grid .card")).toHaveCount(52);
  await expect(page.locator("#grid .card.off")).toHaveCount(0);
  await expect(page.locator("#grid .tn")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("R-01 Budget : /api/soiree n'est appelé que si la page est visible", async ({ browser }, info) => {
  const ctx = await browser.newContext(info.project.use);
  await ctx.addInitScript(() => {
    let state = "hidden";
    Object.defineProperty(document, "visibilityState", { get: () => state, configurable: true });
    window.__show = () => { state = "visible"; document.dispatchEvent(new Event("visibilitychange")); };
  });
  const page = await ctx.newPage();
  let calls = 0;
  page.on("request", (r) => { if (new URL(r.url()).pathname === "/api/soiree") calls++; });
  await page.goto("/");
  await page.waitForTimeout(3000);
  expect(calls, "aucun appel tant que la page est cachée").toBe(0);
  await page.evaluate(() => window.__show());
  await expect.poll(() => calls).toBe(1);
});

test("T-08 Arrêt de la soirée", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  await owner.locator("#stop").click();
  await expect(owner.locator("#stTitle")).toHaveText("HORS LIGNE");
  const { page } = await guestPage(browser, info.project.use);
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(page.locator("#tonight")).toBeHidden();
  await expect(page.locator("#grid .card .tn")).toHaveCount(0);
  await expect(page.locator("#grid .card.off")).toHaveCount(0);
});

test("T-09 Ancienne version en cache : la nouvelle s'affiche sans manipulation", async ({ browser }, info) => {
  const ctx = await browser.newContext(info.project.use);
  const page = await ctx.newPage();
  // Version N simulée : même site, numéro et nom de cache différents (fichiers lus depuis la production).
  await page.goto("/version.json");
  const [html, sw] = await page.evaluate(async () => Promise.all(["/", "/sw.js"].map(async (u) => (await fetch(u, { cache: "no-store" })).text())));
  const oldHtml = html.replace(/Version v[^<]+/, "Version v0.0-ancienne");
  const oldSw = sw.replace(/const VERSION="[^"]+"/, 'const VERSION="bar-ancienne"');
  await ctx.route("**/sw.js", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: oldSw }));
  await ctx.route(/\/(index\.html)?$/, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: oldHtml }));
  await page.goto("/");
  await expect(page.locator("footer")).toContainText("v0.0-ancienne");
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20_000 });
  // Version N+1 = la production réelle.
  await ctx.unrouteAll({ behavior: "ignoreErrors" });
  await page.goto("/");
  const label = await page.evaluate(async () => (await (await fetch("/version.json", { cache: "no-store" })).json()).label);
  await expect(page.locator("footer")).toContainText(label, { timeout: 20_000 });
  await expect(page.locator("footer")).not.toContainText("v0.0-ancienne");
});

test("T-02 Mauvais PIN 5 fois → blocage 5 min", async ({ browser }, info) => {
  // Le blocage est côté serveur et dure 5 min : on ne le déclenche qu'une fois, sur le dernier projet,
  // sinon le navigateur suivant ne pourrait plus se connecter pour ses propres tests.
  test.skip(info.project.name !== info.config.projects.at(-1).name, "blocage testé une seule fois par exécution");
  const ctx = await browser.newContext(info.project.use);
  const page = await ctx.newPage();
  await page.goto("/bar");
  const wrong = String((Number(PIN) + 1) % 1e6).padStart(6, "0");
  for (let k = 1; k <= 4; k++) {
    await page.locator("#pin").fill(wrong);
    await page.locator("#loginBtn").click();
    await expect(page.locator("#loginErr")).toContainText(`Encore ${5 - k} essai`);
  }
  await page.locator("#pin").fill(wrong);
  await page.locator("#loginBtn").click();
  await expect(page.locator("#loginErr")).toContainText("bloqué 5 min");
  // Même le bon PIN est refusé pendant le blocage (contrôle côté serveur).
  const r = await adminApi(page, "login", { pin: PIN });
  expect(r.status).toBe(429);
});
