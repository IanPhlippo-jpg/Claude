// look: de schakelkast van de robotcel (voorbeelden/robotarm/kast): dicht van voren, open (isometrisch) en de
// montageplaat recht van voren. Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const lees = (f, filter) => { const d = JSON.parse(readFileSync(`voorbeelden/robotarm/kast/${f}`, 'utf8')); delete d.format; if (filter) d.components = d.components.filter((c) => filter(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
  const fout = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(fout).length) errors.push(`rebuild: ${JSON.stringify(fout).slice(0, 600)}`);
};
const kijk = async (naam, toets, { zoom = 0, punt = [960, 540], draai = [] } = {}) => {
  // eerst passend maken, dan inzoomen op het punt van het passende beeld
  await page.keyboard.press(toets); await page.waitForTimeout(700);
  for (const k of draai) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  await page.keyboard.press('f'); await page.waitForTimeout(1200);
  await page.mouse.move(...punt);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(200); }
  await page.mouse.move(1700, 980); await page.evaluate(() => window.__phlippoStore.setState({ hoverFace: null, hoverEdge: null })); await page.waitForTimeout(2500);
  await page.screenshot({ path: `e2e-out/kast-${naam}.png` });
};
await open(lees('Schakelkast.kcad'));
await kijk('dicht', 'Control+1');
await kijk('dicht-iso', 'Control+7');
await open(lees('Schakelkast-open.kcad'));
await kijk('open', 'Control+7');
// de montageplaat recht van voren: zonder deuren
await open(lees('Schakelkast.kcad', (id) => !/^(w\d|e\d+)$/.test(id)));
await kijk('plaat', 'Control+1');
await kijk('rij1', 'Control+1', { zoom: 7, punt: [1000, 330] });
await kijk('rij2', 'Control+1', { zoom: 6, punt: [1040, 500] });
await kijk('rij3', 'Control+1', { zoom: 7, punt: [1060, 655] });
await kijk('klemmen', 'Control+1', { zoom: 7, punt: [1080, 900] });
await open(lees('Schakelkast.kcad'));
await kijk('deur-bediening', 'Control+1', { zoom: 6, punt: [975, 500] });
console.log('errors', errors);
await browser.close();
