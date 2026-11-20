// Génère les icônes PNG de la PWA à partir de public/icons/icon.svg (Playwright/Chromium).
// Usage : node scripts/generate-icons.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"), "utf8");
const targets = [
  { file: "icon-192.png", size: 192, pad: 0, round: true },
  { file: "icon-512.png", size: 512, pad: 0, round: true },
  // Icône « maskable » : fond plein, motif dans la zone de sécurité (80 %)
  { file: "icon-maskable-512.png", size: 512, pad: 0.12, round: false },
  { file: "apple-touch-icon.png", size: 180, pad: 0.06, round: false },
];
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  const body = t.round
    ? svg
    : svg.replace('rx="112"', 'rx="0"');
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#341B2C;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${body.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: join(root, "public/icons", t.file), omitBackground: t.round });
  console.log("icône", t.file);
}
await browser.close();
