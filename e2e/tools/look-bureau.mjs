// look: het bureau van de foto (voorbeelden/bureau). Opent de assemblage, sleept met Move Component lades open
// (de mates houden ze op de geleider en tussen 0 en 450 mm) en maakt screenshots.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const open = async (f) => { const d = JSON.parse(readFileSync(`voorbeelden/bureau/${f}`, 'utf8')); delete d.format; await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d); await page.waitForTimeout(2500); };
const iso = async () => { await page.keyboard.press('Control+7'); await page.waitForTimeout(600); await page.keyboard.press('f'); await page.mouse.move(700, 1000); await page.waitForTimeout(1500); };
const pos = (id) => page.evaluate((i) => window.__phlippoStore.getState().doc.components.find((c) => c.id === i).position, id);
const proj = (p) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), p);
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(ok ? 'ok ' : 'FAIL', name, info); };

// trekt aan het midden van een ladefront, in de wereld met `d` verschoven
async function sleep(id, d) {
  const p = await pos(id);
  const a = await proj([p[0], p[1] + 68, p[2] + 16]);
  const b = await proj([p[0] + d[0], p[1] + 68 + d[1], p[2] + 16 + d[2]]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  return [p, await pos(id)];
}

await open('Bureau.kcad');
await iso();
await page.screenshot({ path: 'e2e-out/bureau-dicht.png' });
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Move Component") .k-cm-main');
await page.waitForTimeout(300);
const r = (v) => v.map((x) => Math.round(x));
let [p0, p1] = await sleep('l8', [0, 0, 250]);
check('rechts, middelste lade: schuift naar voren, niet opzij of omhoog', p1[2] - p0[2] > 100 && p1[2] - p0[2] <= 450 && Math.abs(p1[0] - p0[0]) < 0.01 && Math.abs(p1[1] - p0[1]) < 0.01, `${r(p0)} -> ${r(p1)}`);
[p0, p1] = await sleep('l10', [0, 0, 900]);
check('rechts, bovenste lade: verder trekken stopt op 450 mm', Math.abs(p1[2] - p0[2] - 450) < 0.01, `${r(p0)} -> ${r(p1)}`);
[p0, p1] = await sleep('l4', [60, 80, 300]);
check('links, vierde lade: schuin trekken blijft op de geleider', Math.abs(p1[0] - p0[0]) < 0.01 && Math.abs(p1[1] - p0[1]) < 0.01 && p1[2] - p0[2] > 50, `${r(p0)} -> ${r(p1)}`);
[p0, p1] = await sleep('l10', [0, 0, -900]);
check('rechts, bovenste lade: dichtduwen stopt tegen de kast', Math.abs(p1[2] - (p0[2] - 450)) < 0.01, `${r(p0)} -> ${r(p1)}`);
[p0, p1] = await sleep('l9', [0, 0, 400]);
await page.click('.k-cm-big:has-text("Move Component") .k-cm-main');
await iso();
await page.screenshot({ path: 'e2e-out/bureau-lades-open.png' });
// van opzij, zodat de geleiders en loopregels zichtbaar zijn
await page.keyboard.press('Control+3');
await page.waitForTimeout(600);
await page.keyboard.press('f');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'e2e-out/bureau-zijaanzicht.png' });
console.log(`${results.filter((x) => x.ok).length}/${results.length} passed`, 'errors', errors);
await browser.close();
