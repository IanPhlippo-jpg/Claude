// look: de kabeldoos van de treinverlichting (voorbeelden/treinverlichting, versie 2) in de app: dicht, open (zonder
// deksel, met en zonder gootdeksels), van boven, de goten van dichtbij, de gootdeksels op hun plaat, de ESP, de prints,
// een bordje en een doorsnede. Nodig: de app met VITE_TEST_HOOKS op E2E_URL (standaard poort 5184).
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
const lees = (f) => { const d = JSON.parse(readFileSync(f, 'utf8')); delete d.format; return d; };
// wacht tot de rebuild klaar is (de bak alleen al ~33 s) en meld fouten of overgeslagen features
const open = async (d, wacht = 3000) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(wacht);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
  const fout = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(fout).length) errors.push(`rebuild: ${JSON.stringify(fout).slice(0, 400)}`);
};
const kijk = async (toets, naam) => { await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.mouse.move(700, 1000); await page.waitForTimeout(2000); await page.screenshot({ path: `e2e-out/${naam}.png` }); };
const zoom = async (x, y, n, naam) => {
  await page.mouse.move(x, y);
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
  await page.mouse.move(700, 1000); await page.waitForTimeout(2000);
  await page.screenshot({ path: `e2e-out/${naam}.png` });
};
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const zonder = (re) => { const d = lees(F); d.components = d.components.filter((c) => !re.test(c.id)); return d; };
const alleen = (re) => { const d = lees(F); d.components = d.components.filter((c) => re.test(c.id)); return d; };
const sel = (process.env.LOOK ?? '').split(',').filter(Boolean), doe = (n) => !sel.length || sel.includes(n);

if (doe('doos')) {
  await open(lees(F));
  await kijk('Control+7', 'trein-doos-dicht');
  // open met de gootdeksels erop
  await open(zonder(/^(d2|sd\d)$/));
  await kijk('Control+7', 'trein-doos-open');
  // zonder de gootdeksels: de goten met hun vingers en sleuven
  await open(zonder(/^(d2|sd\d|g\d+)$/));
  await kijk('Control+7', 'trein-goten');
  await kijk('Control+5', 'trein-doos-boven');
  // de goten van dichtbij: de sleuven voor de klemmen, de klikvingers, de zijgoot met een tule
  await page.keyboard.press('Control+7'); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1500);
  await zoom(720, 470, 6, 'trein-kabels');
  // een gootdeksel opgetild boven zijn goot (de nokken en de klikgroef)
  const d = zonder(/^(d2|sd\d)$/);
  for (const c of d.components) if (/^g[46]$/.test(c.id)) c.position = [c.position[0], c.position[1] + 25, c.position[2]];
  await open(d);
  await page.keyboard.press('Control+7'); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1500);
  await zoom(900, 500, 4, 'trein-gootdeksel');
  // doorsnede door rij 3 (de goten, de ring met zijn bordjes en een gootdeksel in doorsnede)
  await open(zonder(/^(sd\d)$/));
  await page.evaluate(() => window.__phlippoStore.setState({ sectionView: { plane: 'right', offset: 0, flip: false, cap: true } }));
  await page.waitForTimeout(2000);
  await kijk('Control+7', 'trein-doorsnede');
  await page.evaluate(() => window.__phlippoStore.setState({ sectionView: null }));
}
if (doe('platen')) {
  await open(lees('voorbeelden/treinverlichting/Gootdeksels-plaat.kcad'));
  await kijk('Control+7', 'trein-plaat-gootdeksels');
  await open(lees('voorbeelden/treinverlichting/Kabeldoos-deksel.kcad'));
  await kijk('Control+7', 'trein-deksel');
}
if (doe('prints')) {
  // de ESP op haar draagprint, van dichtbij
  await open(alleen(/^e\d+$|^es\d$/), 4000);
  await kijk('Control+7', 'trein-esp');
  await kijk('Control+5', 'trein-esp-boven');
  // de voeding, de uitgangen en de ingangen
  await open(alleen(/^[viu]\d+$|^[viu]s\d$/), 4000);
  await kijk('Control+7', 'trein-prints');
  // één bordje
  await open(alleen(/^b1(k\d|e\d|r)?$/), 3000);
  await kijk('Control+7', 'trein-bordje');
}
console.log('errors', errors);
await browser.close();
