// Tests de bout en bout (PRD § 10) contre la production.
// PIN de test : variable d'environnement E2E_PIN (jamais écrite dans les tests).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,                 // l'état de la soirée est partagé : on enchaîne les scénarios
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL || "https://catalogue-cocktails-yann.netlify.app", screenshot: "off", trace: "off" },
  projects: [
    { name: "webkit-iphone", use: { ...devices["iPhone 13"] } },
    { name: "chromium", use: { ...devices["Pixel 7"] } },
  ],
});
