// look: de ingebouwde afzuiging (voorbeelden/afzuiging) in de app: de assemblage isometrisch met de lade half open,
// van onderen (klauwen, ventilator), de module alleen, en het bureau met de afzuiging in het blad
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
const lees = (f) => { const d = JSON.parse(readFileSync(f, 'utf8')); delete d.format; return d; };
const open = async (d) => { await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d); await page.waitForTimeout(3000); };
const kijk = async (toets, naam) => { await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.mouse.move(700, 1000); await page.waitForTimeout(1800); await page.screenshot({ path: `e2e-out/${naam}.png` }); };

// assemblage, en met het rooster eraf en de cassette half uitgetild
const asm = lees('voorbeelden/afzuiging/Afzuiging.kcad');
await open(asm);
await kijk('Control+7', 'afzuiging-iso');
await kijk('Control+6', 'afzuiging-onder');
await kijk('Control+3', 'afzuiging-links'); // de wipschakelaar in de kom van de linkerzijwand
// de draaiknop alleen: kuip, sierring, Dial, klauwen en schroeven
const knop = lees('voorbeelden/afzuiging/Afzuiging.kcad');
knop.components = knop.components.filter((c) => /^a(7|8|12|dk\d|sd\d)$/.test(c.id));
await open(knop);
await kijk('Control+7', 'afzuiging-draaiknop');
const uit = lees('voorbeelden/afzuiging/Afzuiging.kcad');
for (const c of uit.components) {
  if (c.id === 'a2') c.position = [0, 140, 0];
  if (c.id === 'a3' || /^af\d/.test(c.id)) c.position = [0, 70, 0];
}
await open(uit);
await kijk('Control+7', 'afzuiging-cassette-uit');
// doorsnede door het midden (luchtweg: rooster, filterlagen, ventilator, lamellen) en door de klauwtorens
const doorsnede = async (sv, toets, naam) => { await page.evaluate((x) => window.__phlippoStore.setState({ sectionView: x }), sv); await page.waitForTimeout(1500); await kijk(toets, naam); };
await open(lees('voorbeelden/afzuiging/Afzuiging.kcad'));
await doorsnede({ plane: 'right', offset: 0, flip: false, cap: true }, 'Control+4', 'afzuiging-doorsnede');
await doorsnede({ plane: 'right', offset: 0, flip: false, cap: true }, 'Control+7', 'afzuiging-doorsnede-iso');
await doorsnede({ plane: 'front', offset: 40, flip: false, cap: true }, 'Control+1', 'afzuiging-doorsnede-klauwen');
await doorsnede({ plane: 'front', offset: 20, flip: false, cap: true }, 'Control+1', 'afzuiging-doorsnede-schakelaar');
await page.evaluate(() => window.__phlippoStore.setState({ sectionView: null }));
// de module alleen
await open(lees('voorbeelden/afzuiging/Romp.kcad'));
await kijk('Control+7', 'afzuiging-module');
// het bureau
await open(lees('voorbeelden/bureau/Bureau.kcad'));
await kijk('Control+7', 'bureau-met-afzuiging');
console.log('errors', errors);
await browser.close();
