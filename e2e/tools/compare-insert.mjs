// Machine tool (design round): a new assembly right after the BasePlate part, with Insert Component open, next to
// reference frame 320 -> e2e-out/cmp-320.png (reference left, app right). Usage: dev server on 5173, then
// node e2e/tools/compare-insert.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  let l0, l1, l2, l3;
  [sk, l0] = K.addLine(sk, sk.origin, { x: 80, y: 0 });
  [sk, l1] = K.addLine(sk, l0.p2, { x: 80, y: 80 });
  [sk, l2] = K.addLine(sk, l1.p2, { x: 0, y: 80 });
  [sk, l3] = K.addLine(sk, l2.p2, l0.p1);
  sk = K.addCircle(sk, { x: 45, y: 45 }, 17.5)[0];
  const d = K.createDocument('BasePlate');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("New")');
await page.waitForTimeout(200);
await page.click('.k-doctype:has-text("Assembly")');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => undefined);
await page.waitForTimeout(800);
await page.mouse.move(1150, 450);
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-out/app-320.png' });
await browser.close();
const py = `
from PIL import Image
r = Image.open('referentie-video/frames/f_0320.jpg').convert('RGB')
a = Image.open('e2e-out/app-320.png').convert('RGB')
o = Image.new('RGB', (r.width + a.width, max(r.height, a.height)), 'white')
o.paste(r, (0, 0)); o.paste(a, (r.width, 0))
o.resize((o.width // 2, o.height // 2)).save('e2e-out/cmp-320.png')
o.crop((0, 60, 480, 1000)).save('e2e-out/cmp-320-pm-ref.png')
o.crop((1920, 60, 2400, 1000)).save('e2e-out/cmp-320-pm-app.png')
`;
execFileSync('python', ['-c', py], { stdio: 'inherit' });
console.log('saved e2e-out/cmp-320.png');
