// Beelden van het geluidskastje in Phlippo CAD (zoals e2e/tools/trein-v5-shots.mjs): dicht (iso), open zonder deksel
// (iso en van boven), het deksel met het rooster, de achterkant met de DC-bus en de USB-C.
// Nodig: de app met test-hooks op E2E_URL (standaard http://localhost:5185/).
// Gebruik (vanuit de map van de repo): node voorbeelden/treinverlichting/geluidskastje/maak-fotos.mjs <uitmap>
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const UIT = process.argv[2] ?? 'e2e-out/geluidskastje';
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5185/', { timeout: 300_000 });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const F = 'voorbeelden/treinverlichting/geluidskastje/Geluidskastje.kcad';
const lees = () => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; return d; };
const filter = (f) => { const d = lees(); d.components = d.components.filter((c) => f(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
  const e = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(e).length) fouten.push(JSON.stringify(e).slice(0, 300));
};
const rust = async () => {
  await page.mouse.move(1300, 60); await page.waitForTimeout(300);
  await page.evaluate(() => { for (const c of document.querySelectorAll('.k-viewport canvas')) for (const t of ['pointerleave', 'mouseleave']) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: -10, clientY: -10 })); });
  await page.evaluate(() => window.__phlippoStore.setState({ hoverFace: null, hoverEdge: null, hover: null, hoverFeatureId: null, hoverPlane: null }));
  await page.waitForTimeout(1500);
};
const shot = async (toets, naam, zoom = 0) => {
  await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1200);
  const v = await page.locator('.k-viewport').boundingBox();
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
  await rust();
  await page.screenshot({ path: `${UIT}/${naam}.png`, clip: { x: v.x + 2, y: v.y + 44, width: v.width - 4, height: v.height - 104 } });
};
const DEKSEL = /^(k2|ds\d)$/;
await open(lees());
await shot('Control+7', 'kastje-dicht', 1);
await open(filter((id) => !DEKSEL.test(id)));
await shot('Control+7', 'kastje-open', 1);
await shot('Control+5', 'kastje-open-boven', 1);
await open(filter((id) => /^(k1|j\d)$/.test(id)));
await shot('Control+7', 'kastje-bak', 1);
console.log('fouten', fouten);
await browser.close();
