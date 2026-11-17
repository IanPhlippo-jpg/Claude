// Tab / Shift+Tab in an assembly (parity list point 11): Tab hides the component under the pointer, Shift+Tab shows
// the hidden component under the pointer (not just the last one hidden), with the real pointer over the graphics area.
import { chromium } from 'playwright';
import { checks, exitCode, track } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
import { frames, settle } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const { results, check } = checks();
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
const pin = JSON.parse(readFileSync('voorbeelden/deurkruk/Vierkantstift.kcad', 'utf8'));
delete pin.format;
await page.evaluate((part) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Pennen', 'assembly');
  const c = (id, x) => ({ id, name: `Vierkantstift<${id}>`, part, position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false });
  d.components = [c('1', 0), c('2', 40), c('3', 80)];
  window.__phlippoStore.getState().openDocument(d);
}, pin);
await settle(page);
await page.keyboard.press('Control+1'); // front view: the three pins side by side
await settle(page);
await page.keyboard.press('f');
await settle(page);

const vp = await page.locator('.k-viewport canvas').boundingBox();
const hovered = () => page.evaluate(() => window.__phlippoStore.getState().hoverFace?.bodyId ?? null);
/** a pointer position over component `id`, found by moving the real pointer along the middle rows */
async function over(id) {
  for (const dy of [0, -20, 20, -40, 40]) {
    for (let x = vp.x + 10; x < vp.x + vp.width - 10; x += 12) {
      await page.mouse.move(x, vp.y + vp.height / 2 + dy);
      await frames(page, 1);
      if ((await hovered()) === id) return { x, y: vp.y + vp.height / 2 + dy };
    }
  }
  return null;
}
const hiddenIds = () => page.evaluate(() => window.__phlippoStore.getState().doc.components.filter((c) => c.hidden).map((c) => c.id).sort().join(','));

const p1 = await over('1');
const p2 = await over('2');
check('the pointer finds pins 1 and 2', !!p1 && !!p2, JSON.stringify({ p1, p2 }));
if (p1 && p2) {
  await page.mouse.move(p1.x, p1.y);
  await frames(page, 2);
  await page.keyboard.press('Tab');
  await settle(page);
  check('Tab hides the component under the pointer', (await hiddenIds()) === '1', await hiddenIds());
  await page.mouse.move(p2.x, p2.y);
  await frames(page, 2);
  await page.keyboard.press('Tab');
  await settle(page);
  check('Tab on the next one hides it too', (await hiddenIds()) === '1,2', await hiddenIds());
  await page.screenshot({ path: `${OUT}/tabshow-hidden.png` });
  // back over where pin 1 was: Shift+Tab shows pin 1, not pin 2 (the last one hidden)
  await page.mouse.move(p1.x, p1.y);
  await frames(page, 2);
  await page.keyboard.press('Shift+Tab');
  await settle(page);
  check('Shift+Tab shows the hidden component under the pointer', (await hiddenIds()) === '2', await hiddenIds());
  await page.screenshot({ path: `${OUT}/tabshow-shown.png` });
  // over empty space: Shift+Tab falls back to the last one hidden with Tab
  await page.mouse.move(vp.x + 20, vp.y + 20);
  await frames(page, 2);
  await page.keyboard.press('Shift+Tab');
  await settle(page);
  check('over empty space Shift+Tab shows the last one hidden with Tab', (await hiddenIds()) === '', await hiddenIds());
}

await browser.close();
process.exitCode = exitCode(results, errors);
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
