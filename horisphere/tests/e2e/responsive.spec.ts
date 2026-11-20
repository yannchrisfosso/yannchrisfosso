import { expect, test } from "@playwright/test";

const WIDTHS = [360, 390, 430, 768, 1280, 1440];
const ROUTES = ["/", "/comparer", "/favoris", "/mon-univers", "/deux-mondes", "/deux-mondes/vue", "/installer", "/aide", "/ville/douala-cm"];

for (const width of WIDTHS) {
  test(`aucun débordement horizontal à ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForTimeout(400);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${route} à ${width}px`).toBeLessThanOrEqual(width);
    }
  });
}

test("mobile : navigation basse et module Deux mondes Mini compact", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" }).last();
  await expect(nav).toBeVisible();
  for (const label of ["Explorer", "Comparer", "Favoris", "Mon univers"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  const duo = page.getByRole("region", { name: /^Deux mondes :/ }).first();
  const box = await duo.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(120);
  // La carte peut être réduite
  await page.getByRole("button", { name: "Réduire la carte" }).click();
  await expect(page.locator("#carte-zone")).toBeHidden();
  await page.getByRole("button", { name: "Afficher la carte" }).click();
  await expect(page.locator("#carte-zone")).toBeVisible();
});

test("desktop : barre supérieure et panneau de favoris", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" }).first();
  for (const label of ["Explorer", "Comparer", "Favoris", "Mon univers"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Mes favoris/ }).first()).toBeVisible();
  // Carte WebGL, ou message de repli explicite si le navigateur n'a pas WebGL (Firefox sans GPU, par exemple)
  await expect(
    page.getByRole("region", { name: /Carte du monde interactive/ }).or(page.getByText("La carte interactive n'a pas pu démarrer")),
  ).toBeVisible();
});
