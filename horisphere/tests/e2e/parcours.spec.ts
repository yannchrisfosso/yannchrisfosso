import { expect, test, type Page } from "@playwright/test";

const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim().toUpperCase());

test("Parcours A — heure du Cameroun, puis favori persistant", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Rechercher une ville ou un pays" });
  await search.fill("Cameroun");
  await expect(page.getByRole("option").first()).toContainText("Douala");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/ville\/douala-cm$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Douala");
  await expect(page.getByText("Africa/Douala").first()).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: /^UTC\+1$/ })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter aux favoris" }).click();
  await page.goto("/favoris");
  await expect(page.getByRole("link", { name: /Douala/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Douala/ }).first()).toBeVisible();
});

test("Parcours B — configurer Deux mondes et le retrouver sur l'accueil", async ({ page }) => {
  await page.goto("/deux-mondes");
  const right = page.getByRole("combobox", { name: "Changer la ville de droite" });
  await right.fill("Tokyo");
  await page.getByRole("option", { name: /Tokyo/ }).first().click();
  await page.getByRole("radio", { name: /Confort/ }).check({ force: true });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.goto("/");
  const duo = page.getByRole("region", { name: /Deux mondes : Québec et Tokyo/ });
  await expect(duo).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: /Deux mondes : Québec et Tokyo/ })).toBeVisible();
  // Inverser
  await page.goto("/deux-mondes");
  await page.getByRole("button", { name: "Inverser l'ordre des deux villes" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.goto("/deux-mondes/vue");
  await expect(page.getByRole("region", { name: /Deux mondes : Tokyo et Québec/ }).first()).toBeVisible();
});

test("Parcours C — thème : aperçu non persistant, enregistrement persistant, contraste", async ({ page }) => {
  await page.goto("/mon-univers");
  await expect.poll(() => bg(page)).toBe("#341B2C");
  await page.getByRole("radio", { name: /Jade solaire/ }).click();
  await expect.poll(() => bg(page)).toBe("#163F3B");
  // Aperçu signalé comme non enregistré, visible aussi sur les autres pages
  await expect(page.getByRole("region", { name: "Aperçu de thème non enregistré" })).toBeVisible();
  await page.getByRole("link", { name: "Comparer" }).first().click();
  await expect.poll(() => bg(page)).toBe("#163F3B");
  await page.goto("/mon-univers");
  await page.reload();
  await expect.poll(() => bg(page)).toBe("#341B2C");
  await page.getByRole("radio", { name: /Jade solaire/ }).click();
  await page.getByRole("toolbar").getByRole("button", { name: "Enregistrer" }).click();
  await page.reload();
  await expect.poll(() => bg(page)).toBe("#163F3B");
  // Couleur de texte illisible → avertissement + correction proposée
  await page.getByRole("textbox", { name: "Texte : code hexadécimal" }).fill("#1A4540");
  await expect(page.getByText(/Texte sur le fond : 1\.\d+:1/)).toBeVisible();
  await page.getByRole("button", { name: /^Utiliser #/ }).first().click();
  await expect(page.getByText(/Texte sur le fond :/)).toHaveCount(0);
  // Annuler revient en arrière, abandonner revient à l'enregistré
  await page.getByRole("toolbar").getByRole("button", { name: "Abandonner" }).click();
  await expect.poll(() => bg(page)).toBe("#163F3B");
});

test("Parcours D — comparer un appel Québec / Douala (hiver, été, heure sautée)", async ({ page }) => {
  await page.goto("/comparer?a=quebec-ca&b=douala-cm&d=2026-12-03&t=09:00");
  const result = page.locator('[aria-live="polite"]').filter({ hasText: "à Québec" }).first();
  await expect(result).toContainText("15:00");
  await expect(result).toContainText("Jeudi 3 décembre 2026");
  await page.goto("/comparer?a=quebec-ca&b=douala-cm&d=2026-07-03&t=09:00");
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: "à Québec" }).first()).toContainText("14:00");
  await page.goto("/comparer?a=quebec-ca&b=douala-cm&d=2026-03-08&t=02:30");
  await expect(page.getByRole("alert").filter({ hasText: "n'existe pas" })).toBeVisible();
  await page.goto("/comparer?a=quebec-ca&b=douala-cm&d=2026-11-01&t=01:30");
  await expect(page.getByRole("alert").filter({ hasText: "existe deux fois" })).toBeVisible();
  await page.goto("/comparer?a=quebec-ca&b=douala-cm&d=2026-12-03&t=20:00");
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: "à Québec" }).first()).toContainText("le lendemain");
});

test("Changement de date : chaque lieu garde sa propre date", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-12-31T23:59:30Z") });
  await page.goto("/ville/auckland-nz");
  await expect(page.getByText("Vendredi 1er janvier 2027")).toBeVisible();
  await page.goto("/ville/toronto-ca");
  await expect(page.getByText("Jeudi 31 décembre 2026")).toBeVisible();
  await page.goto("/ville/katmandou-np");
  await expect(page.getByText("UTC+5:45", { exact: true })).toBeVisible();
});

test("Favoris : réorganisation et suppression au clavier", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "horisphere.favorites",
      JSON.stringify({ v: 1, data: ["quebec-ca", "douala-cm", "tokyo-jp"].map((locationId, position) => ({ locationId, position, createdAt: "2026-01-01" })) }),
    ),
  );
  await page.goto("/favoris");
  await page.getByRole("button", { name: "Descendre Québec" }).click();
  const order = await page.locator("main ul li h3, main ul li a.font-display").allTextContents();
  expect(order.map((t) => t.trim()).slice(0, 3)).toEqual(["Douala", "Québec", "Tokyo"]);
  await page.getByRole("button", { name: "Retirer Tokyo des favoris" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Retirer Tokyo des favoris" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retirer Québec des favoris" })).toBeVisible();
});

test("Navigation clavier : recherche rapide avec « / »", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.locator("body").press("/");
  const dialogSearch = page.getByRole("dialog").getByRole("combobox");
  await expect(dialogSearch).toBeFocused();
  await page.keyboard.type("yaounde");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ville\/yaounde-cm$/);
});

test("PWA : manifeste, service worker et parcours d'installation honnête", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.name).toContain("Horisphère");
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  expect(m.shortcuts.map((s: { url: string }) => s.url)).toContain("/deux-mondes/vue");
  for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto("/installer");
  const reg = await page.evaluate(async () => {
    const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 15000))]);
    return !!r;
  });
  expect(reg).toBe(true);
  await expect(page.getByRole("heading", { name: /Widgets et bulle flottante : pas encore/ })).toBeVisible();
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).not.toContain("ajouter un widget");
});

test("Hors ligne : une page déjà visitée reste disponible", async ({ page, context, browserName }) => {
  await page.goto("/favoris");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForTimeout(1500);
  if (browserName === "webkit") {
    // L'émulation hors ligne de Playwright/WebKit coupe la navigation avant le service worker
    // (« WebKit encountered an internal error »). On vérifie donc directement le cache réel du service worker.
    const cached = await page.evaluate(async () => {
      const urls = ["/", "/favoris", "/deux-mondes/vue", "/hors-ligne"];
      const hits = await Promise.all(urls.map(async (u) => !!(await caches.match(u))));
      const html = await (await caches.match("/favoris"))!.text();
      return { hits, hasHeading: html.includes("Favoris") };
    });
    expect(cached.hits).toEqual([true, true, true, true]);
    expect(cached.hasHeading).toBe(true);
    return;
  }
  await context.setOffline(true);
  // Navigation plutôt que reload() : WebKit (Playwright) échoue sur un rechargement hors ligne servi par service worker
  await page.goto("/favoris");
  await expect(page.getByRole("heading", { level: 1, name: "Favoris" })).toBeVisible();
  await page.goto("/ville/lima-pe").catch(() => {});
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Vous êtes hors connexion|Lima/);
  await context.setOffline(false);
});

test("Ensembles de favoris : créer, affecter, filtrer, renommer, supprimer", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "horisphere.favorites",
      JSON.stringify({ v: 1, data: ["quebec-ca", "douala-cm"].map((locationId, position) => ({ locationId, position, createdAt: "2026-01-01" })) }),
    ),
  );
  await page.goto("/favoris");
  // Migration v1 → v2 : ensembles par défaut
  const filters = page.getByRole("group", { name: "Filtrer par ensemble" });
  await expect(filters.getByRole("button", { name: /^Famille/ })).toBeVisible();
  await filters.getByRole("button", { name: /Nouvel ensemble/ }).click();
  await page.getByRole("textbox", { name: "Nom du nouvel ensemble" }).fill("Vacances");
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  await expect(filters.getByRole("button", { name: /^Vacances/ })).toHaveAttribute("aria-pressed", "true");
  await filters.getByRole("button", { name: /^Tous/ }).click();
  await page.locator("summary[aria-label='Ensembles de Douala']").click();
  await page.getByRole("checkbox", { name: "Vacances" }).check();
  await filters.getByRole("button", { name: /^Vacances/ }).click();
  await expect(page.getByRole("button", { name: "Retirer Douala des favoris" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retirer Québec des favoris" })).toHaveCount(0);
  await page.getByRole("button", { name: /Renommer « Vacances »/ }).click();
  await page.getByRole("textbox", { name: "Nouveau nom de l'ensemble" }).fill("Été");
  await page.getByRole("button", { name: "Renommer", exact: true }).click();
  await expect(filters.getByRole("button", { name: /^Été/ })).toBeVisible();
  await page.reload();
  await filters.getByRole("button", { name: /^Été/ }).click();
  await expect(page.getByRole("button", { name: "Retirer Douala des favoris" })).toBeVisible();
  await page.getByRole("button", { name: "Supprimer l'ensemble" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(filters.getByRole("button", { name: /^Été/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retirer Québec des favoris" })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("horisphere.favorites")!));
  expect(stored.v).toBe(2);
});
