// look: de kabeldoos van de treinverlichting (voorbeelden/treinverlichting) in de app: dicht, open (zonder deksel),
// van boven, de ESP van dichtbij en een doorsnede. Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184.
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
// wacht tot de rebuild klaar is (de bak alleen al ~32 s) en meld fouten of overgeslagen features
const open = async (d, wacht = 3000) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(wacht);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 300_000 });
  const fout = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(fout).length) errors.push(`rebuild: ${JSON.stringify(fout).slice(0, 400)}`);
};
const kijk = async (toets, naam) => { await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.mouse.move(700, 1000); await page.waitForTimeout(2000); await page.screenshot({ path: `e2e-out/${naam}.png` }); };
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const zonder = (re) => { const d = lees(F); d.components = d.components.filter((c) => !re.test(c.id)); return d; };
const alleen = (re) => { const d = lees(F); d.components = d.components.filter((c) => re.test(c.id)); return d; };

await open(lees(F));
await kijk('Control+7', 'trein-doos-dicht');
await open(zonder(/^(d2|sd\d)$/));
await kijk('Control+7', 'trein-doos-open');
await kijk('Control+5', 'trein-doos-boven');
// kabels ordenen van dichtbij: de kabelgoot langs de linkerwand, de kabellippen langs de kaders, de binderspleten
await page.keyboard.press('Control+7'); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1500);
await page.mouse.move(800, 560);
for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
await page.mouse.move(700, 1000); await page.waitForTimeout(2000);
await page.screenshot({ path: 'e2e-out/trein-kabels.png' });
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
// doorsnede door de rij met de ESP
await open(zonder(/^(sd\d)$/));
await page.evaluate(() => window.__phlippoStore.setState({ sectionView: { plane: 'right', offset: 100, flip: false, cap: true } }));
await page.waitForTimeout(2000);
await kijk('Control+7', 'trein-doorsnede');
console.log('errors', errors);
await browser.close();
