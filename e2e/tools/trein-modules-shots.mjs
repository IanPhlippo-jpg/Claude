// Beelden van versie 4 van de kabeldoos (kant-en-klare modules): de doos open met de moduleplaat (iso en boven), de
// moduleplaat alleen en een close-up van modules op hun paaltjes. Gebruik: node e2e/tools/trein-modules-shots.mjs <uitmap>
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const UIT = process.argv[2];
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const lees = () => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; return d; };
const filter = (f) => { const d = lees(); d.components = d.components.filter((c) => f(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 900_000 });
  const e = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(e).length) fouten.push(JSON.stringify(e).slice(0, 300));
};
const rust = async () => {
  // na het zoomen de muis naar een lege hoek van het venster (rechtsonder), niet over de boom (die licht dan een deel op)
  await page.mouse.move(1500, 1000); await page.waitForTimeout(300);
  await page.mouse.move(1840, 1010); await page.waitForTimeout(300);
  await page.evaluate(() => { for (const c of document.querySelectorAll('.k-viewport canvas')) for (const t of ['pointerleave', 'mouseleave', 'pointerout', 'mouseout']) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: -10, clientY: -10 })); });
  await page.waitForTimeout(1800);
};
const shot = async (toets, naam, zoom = '') => {
  await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1200);
  for (const stap of (process.env[`ZOOM_${naam.toUpperCase().replace(/-/g, '_')}`] ?? zoom).split(';').filter(Boolean)) {
    const [x, y, n] = stap.split(',').map(Number);
    await page.mouse.move(x, y);
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
  }
  await rust();
  await page.screenshot({ path: `${UIT}/${naam}.png` });
};
const wat = (process.env.SHOTS ?? 'open,plaat,closeup').split(',');
// de doos open (zonder deksel en zijn schroeven): de moduleplaat met alle modules boven de bordjes
if (wat.includes('open')) {
  await open(filter((id) => !/^(d2|sd\d)$/.test(id)));
  await shot('Control+7', 'doos-open-iso');
  await shot('Control+5', 'doos-open-boven');
}
if (wat.includes('plaat')) {
  await open(filter((id) => /^(mp|mps\d|m[a-z0-9]+_\d+)$/.test(id)));
  await shot('Control+7', 'moduleplaat-iso');
}
if (wat.includes('closeup')) {
  await open(filter((id) => /^(d1|mp|mps\d|m[a-z0-9]+_\d+)$/.test(id)));
  await shot('Control+7', 'closeup-modules', process.env.ZOOM ?? '960,540,3;900,600,4');
}
console.log('fouten', fouten);
await browser.close();
