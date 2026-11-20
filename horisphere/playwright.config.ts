import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    colorScheme: "dark",
    locale: "fr-FR",
    timezoneId: "America/Toronto",
    trace: "off",
  },
  // Trois moteurs : Chromium, Firefox (Gecko) et WebKit (moteur de Safari).
  // E2E_BROWSERS=chromium (par exemple) limite l'exécution à certains moteurs.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 860 } } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 860 } } },
  ].filter((p) => !process.env.E2E_BROWSERS || process.env.E2E_BROWSERS.split(",").includes(p.name)),
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, url: BASE_URL, reuseExistingServer: true, timeout: 60_000 },
});
