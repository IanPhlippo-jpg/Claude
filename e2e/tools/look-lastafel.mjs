// look: de lastafel op de schaarheftafel (voorbeelden/lastafel) in de app: de lift zonder tafel (zoals DCT's foto's),
// de tafel in de middelste, laagste en hoogste stand, en de details (valbeveiliging, steunvlak, badge, middenpen).
// Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184. Gebruik: node e2e/tools/look-lastafel.mjs [lift|tafel|standen|detail|bouw]
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
const lees = (f, filter) => { const d = JSON.parse(readFileSync(`voorbeelden/lastafel/${f}`, 'utf8')); delete d.format; if (filter) d.components = d.components.filter((c) => filter.test(c.id)); return d; };
const open = async (d) => {
  const t0 = Date.now();
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 900_000 });
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
  await page.screenshot({ path: `e2e-out/lastafel-${naam}.png` });
};
const wil = process.argv.slice(2), doe = (n) => !wil.length || wil.includes(n);
const zonderPedaal = /^(?!p)/;
if (doe('lift') || doe('detail')) await open(lees('Heftafel.kcad', zonderPedaal));
if (doe('lift')) {
  await kijk('lift-iso', 'Control+7');
  await kijk('lift-zij', 'Control+4', { draai: ['ArrowRight', 'ArrowRight', 'ArrowDown'] });
}
if (doe('detail')) {
  const zij = ['ArrowRight', 'ArrowRight', 'ArrowDown'];
  await kijk('valbeveiliging', 'Control+4', { zoom: 5, punt: [1320, 630], draai: zij });
  await kijk('steunvlak', 'Control+4', { zoom: 7, punt: [1620, 390], draai: zij });
  await kijk('onderframe', 'Control+4', { zoom: 4, punt: [700, 760], draai: zij });
}
if (doe('tafel')) {
  await open(lees('Lastafel.kcad'));
  await kijk('tafel-iso', 'Control+7');
  await kijk('tafel-zij', 'Control+4', { draai: ['ArrowRight', 'ArrowRight', 'ArrowDown'] });
  await kijk('tafel-voor', 'Control+1');
  await kijk('badge', 'Control+4', { zoom: 7, punt: [1128, 482], draai: ['ArrowRight', 'ArrowRight', 'ArrowDown'] });
}
if (doe('standen')) {
  for (const s of ['laag', 'hoog']) { await open(lees(`Lastafel-${s}.kcad`, zonderPedaal)); await kijk(s, 'Control+3'); }
}
if (doe('ce')) {
  await open(lees('Heftafel.kcad', zonderPedaal));
  const zij = ['ArrowRight', 'ArrowRight', 'ArrowDown'];
  await kijk('ce-lift', 'Control+4', { draai: zij });
  await kijk('ce-typeplaat', 'Control+4', { zoom: 8, punt: [1478, 742], draai: zij });
  await kijk('ce-stickers', 'Control+4', { zoom: 6, punt: [1190, 488], draai: zij });
}
if (doe('bouw')) {
  // het bouwplan: de onderdelen stap voor stap (stand midden), telkens hetzelfde aanzicht
  const stappen = [/^o[1237]$/, /^(o[1237]|s\d)$/, /^(o[1237]|s\d|c\d)$/, /^(o[1237]|s\d|c\d|b\d)$/, /^(o\d|s\d|c\d|b\d|h\d|p\d)$/, /./];
  for (const [i, f] of stappen.entries()) { await open(lees('Lastafel.kcad', f)); await kijk(`bouw-${i + 1}`, 'Control+4', { draai: ['ArrowRight', 'ArrowRight', 'ArrowDown'] }); }
}
console.log('errors', errors);
await browser.close();
