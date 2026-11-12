// Étapes de préparation privées par défaut (v1.10) : visiteur, barman connecté, interrupteur de /bar.
import { test, expect } from "@playwright/test";
import { PIN, adminApi, ownerPage, guestPage } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });
let token;
const STEP_TEXT = /presse doucement la menthe avec le sirop/i; // 1re étape du Mojito

test.beforeAll(async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto("/");
  const r = await adminApi(p, "login", { pin: PIN });
  expect(r.status, "connexion barman").toBe(200);
  token = r.body.token;
  await adminApi(p, "set-etapes-publiques", { value: false }, token); // point de départ : étapes privées
});
test.afterAll(async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto("/");
  await adminApi(p, "set-etapes-publiques", { value: false }, token); // on laisse l'interrupteur DÉSACTIVÉ
});

const openMojito = async (page) => { await page.goto("/#mojito"); await expect(page.locator("#sheet")).toHaveClass(/open/); await page.waitForTimeout(800); };

test("E-01 Visiteur, étapes privées : encart, pas de Mode bar ; doses et astuce visibles ; API 401 privée", async ({ browser }, info) => {
  const { page, errors } = await guestPage(browser, info.project.use);
  await openMojito(page);
  await expect(page.locator("#shStepsBody")).toContainText("Étapes réservées au barman");
  await expect(page.locator("#shStepsBody .steps")).toHaveCount(0);
  await expect(page.locator("#shBody")).not.toContainText(STEP_TEXT);
  await expect(page.locator("#shBar")).toBeHidden();
  await expect(page.locator("#shBody .dose li")).toHaveCount(5);
  await expect(page.locator("#shBody .tip")).toBeVisible();
  await expect(page.locator("#shBody .ings .ing")).toHaveCount(5);
  await expect(page.locator("#shStepsBody a")).toHaveCount(0); // aucun lien vers /bar
  const r = await page.evaluate(async () => { const x = await fetch("/api/etapes?id=mojito", { cache: "no-store" }); return { s: x.status, cc: x.headers.get("cache-control") }; });
  expect(r.s).toBe(401);
  expect(r.cc).toContain("private");
  expect(r.cc).toContain("no-store");
  expect(errors).toEqual([]);
});

test("E-02 Interrupteur sans session : 401 ; sans origine du site : 403", async ({ browser }, info) => {
  const { page } = await guestPage(browser, info.project.use);
  await page.goto("/");
  const r = await adminApi(page, "set-etapes-publiques", { value: true });
  expect(r.status).toBe(401);
  const r2 = await page.request.post("/api/soiree-admin", { data: { action: "set-etapes-publiques", value: true }, headers: { Authorization: "Bearer " + token, Origin: "https://exemple-malveillant.test" }, failOnStatusCode: false }).catch(() => null);
  if (r2) expect(r2.status()).toBe(403);
});

test("E-03 Barman connecté : étapes et Mode bar visibles", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  await openMojito(owner);
  await expect(owner.locator("#shStepsBody .steps li")).toHaveCount(4);
  await expect(owner.locator("#shStepsBody")).toContainText(STEP_TEXT);
  await expect(owner.locator("#shBar")).toBeVisible();
  await owner.locator("#shBar").evaluate((b) => b.click());
  await expect(owner.locator("#barmode")).toHaveClass(/open/);
});

test("E-04 Interrupteur activé depuis /bar : le visiteur voit les étapes ; désactivé : elles disparaissent", async ({ browser }, info) => {
  const owner = await ownerPage(browser, info.project.use, token);
  await expect(owner.locator("#stepsState")).toHaveText("Étapes réservées au barman");
  await owner.locator("#stepsSwitch").click();
  await expect(owner.locator("#stepsState")).toHaveText("Étapes visibles par tous");
  await expect(owner.locator("#stepsSwitch")).toHaveAttribute("aria-checked", "true");
  const { page } = await guestPage(browser, info.project.use);
  await openMojito(page);
  await expect(page.locator("#shStepsBody .steps li")).toHaveCount(4);
  await expect(page.locator("#shBar")).toBeVisible();
  await owner.locator("#stepsSwitch").click();
  await expect(owner.locator("#stepsState")).toHaveText("Étapes réservées au barman");
  const { page: p2 } = await guestPage(browser, info.project.use);
  await openMojito(p2);
  await expect(p2.locator("#shStepsBody")).toContainText("Étapes réservées au barman");
  await expect(p2.locator("#shBar")).toBeHidden();
});
