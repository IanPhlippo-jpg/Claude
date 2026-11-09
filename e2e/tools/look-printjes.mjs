// look: de printjes van de kabeldoos (voorbeelden/treinverlichting) van dichtbij, met hun decals: soldeermasker met
// textuur, koperbanen, pads, opdruk en de opschriften op de chips. Nodig: de dev-server met VITE_TEST_HOOKS op 5184.
// Gebruik: node e2e/tools/look-printjes.mjs [naam ...]  (zonder naam: alle beelden)
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
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const alleen = (re) => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; d.components = d.components.filter((c) => re.test(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 300_000 });
  const fout = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(fout).length) errors.push(`rebuild: ${JSON.stringify(fout).slice(0, 400)}`);
};
/** aanzicht (toets), passend maken, dan inzoomen op een punt van het scherm */
const kijk = async (naam, toets, zoom = 0, punt = [960, 540]) => {
  await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1200);
  await page.mouse.move(...punt);
  for (let i = 0; i < zoom; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(200); }
  // de muis naar een lege hoek van het tekenvlak en geen oude hover (anders oranje randen)
  await page.mouse.move(1700, 980); await page.evaluate(() => window.__phlippoStore.setState({ hoverFace: null, hoverEdge: null })); await page.waitForTimeout(2500);
  await page.screenshot({ path: `e2e-out/printje-${naam}.png` });
};
const wil = process.argv.slice(2), doe = (n) => !wil.length || wil.includes(n);
if (doe('esp')) {
  await open(alleen(/^e\d+$|^es\d$/));
  await kijk('esp-boven', 'Control+5');
  await kijk('esp', 'Control+7', 2);
}
if (doe('bordje')) {
  await open(alleen(/^b1(k\d|e\d|r)?$/));
  await kijk('bordje-boven', 'Control+5');
  await kijk('bordje', 'Control+7', 1);
}
if (doe('pca')) { await open(alleen(/^p\d$|^ps\d$/)); await kijk('pca-boven', 'Control+5'); }
if (doe('prints')) {
  await open(alleen(/^[viu]\d+$|^[viu]s\d$/));
  await kijk('prints', 'Control+7');
  await kijk('voeding', 'Control+5', 3, [560, 540]);
}
if (doe('tules')) {
  // de membraantules in de voorwand en de linkerwand, van dichtbij (dicht, met het deksel)
  await open(JSON.parse(readFileSync(F, 'utf8')));
  await kijk('tules', 'Control+7', 4, [700, 640]);
  await kijk('tules-voor', 'Control+1', 3, [900, 600]);
}
if (doe('doos')) {
  const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; d.components = d.components.filter((c) => !/^(d2|sd\d)$/.test(c.id));
  await open(d);
  await kijk('doos', 'Control+7', 3, [1250, 640]);
}
console.log('errors', errors);
await browser.close();
