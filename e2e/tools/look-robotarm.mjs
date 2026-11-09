// look: de robotcel (voorbeelden/robotarm/Robotcel.kcad) in de app: de hele cel, de robot alleen (zonder hek en kast)
// van voren, opzij en van achteren, en de pols met de grijper van dichtbij.
// Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184. Gebruik: node e2e/tools/look-robotarm.mjs [cel|robot|grijper]
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
const F = 'voorbeelden/robotarm/Robotcel.kcad';
const lees = (filter) => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; if (filter) d.components = d.components.filter((c) => filter.test(c.id)); return d; };
const open = async (d) => {
  const t0 = Date.now();
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
  const fout = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(fout).length) errors.push(`rebuild: ${JSON.stringify(fout).slice(0, 600)}`);
  console.log('rebuild', ((Date.now() - t0) / 1000).toFixed(0), 's');
};
/** aanzicht, passend maken, inzoomen op een schermpunt (wiel vooruit = inzoomen) en draaien met pijltjes */
const kijk = async (naam, toets, { zoom = 0, punt = [960, 540], draai = [] } = {}) => {
  await page.keyboard.press(toets); await page.waitForTimeout(700);
  for (const k of draai) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  await page.keyboard.press('f'); await page.waitForTimeout(1200);
  await page.mouse.move(...punt);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(200); }
  await page.mouse.move(1700, 980); await page.evaluate(() => window.__phlippoStore.setState({ hoverFace: null, hoverEdge: null })); await page.waitForTimeout(2500);
  await page.screenshot({ path: `e2e-out/robot-${naam}.png` });
};
const wil = process.argv.slice(2), doe = (n) => !wil.length || wil.includes(n);
if (doe('cel')) { await open(lees()); await kijk('cel', 'Control+7'); await kijk('cel-boven', 'Control+5'); }
if (doe('robot') || doe('grijper')) await open(lees(/^(r\d+|g\d)$/));
if (doe('robot')) {
  await kijk('iso', 'Control+7');
  await kijk('voor', 'Control+1');
  await kijk('achter', 'Control+7', { draai: Array(12).fill('ArrowLeft') });
}
if (doe('grijper')) await kijk('pols', 'Control+7', { zoom: 4, punt: [1180, 600] });
console.log('errors', errors);
await browser.close();
