import { expect } from "@playwright/test";

export const PIN = process.env.E2E_PIN;
if (!PIN) throw new Error("Définis E2E_PIN (PIN de l'espace barman) avant de lancer les tests.");

/** Appel direct à l'API barman depuis une page du site (même origine). */
export async function adminApi(page, action, extra = {}, token) {
  return page.evaluate(async ({ action, extra, token }) => {
    const r = await fetch("/api/soiree-admin", {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: JSON.stringify({ action, ...extra }),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, { action, extra, token });
}

/** Ouvre un contexte « barman » déjà connecté (jeton obtenu une fois avec le PIN). */
export async function ownerPage(browser, use, token) {
  const ctx = await browser.newContext(use);
  await ctx.addInitScript((t) => { localStorage.setItem("bar-token", JSON.stringify({ token: t, exp: new Date(Date.now() + 864e5).toISOString() })); localStorage.removeItem("bar-draft"); }, token);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto("/bar");
  await expect(page.locator("#app")).toBeVisible();
  return page;
}

export async function guestPage(browser, use) {
  const ctx = await browser.newContext(use);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { page, errors };
}

/** Coche exactement ces cocktails dans /bar (après « Tout retirer »). */
export async function selectOnly(owner, names) {
  await owner.locator("#q").fill("");
  await owner.locator('[data-cat="tous"]').click();
  await owner.locator("#none").click();
  for (const n of names) {
    await owner.locator("#q").fill(n);
    await owner.locator(`input[data-n="${n}"]`).evaluate((e) => { if (!e.checked) e.click(); });
  }
  await owner.locator("#q").fill("");
}

export const bannerNames = (page) => page.locator("#tonight .it span").allTextContents();
