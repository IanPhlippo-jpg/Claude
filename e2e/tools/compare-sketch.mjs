// Machine tool (design round): the BasePlate sketch of the reference video next to the app, in sketch mode on the Top
// Plane: the empty sketch (frame 57), the rectangle just drawn (frame 70), the 80 × 80 fully defined (frame 82) and the Ø35 circle added (frame 95).
// Saves e2e-out/cmp-sk-57.png, cmp-sk-70.png, cmp-sk-82.png and cmp-sk-95.png (reference left, app right). Usage: dev server on 5173,
// then node e2e/tools/compare-sketch.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(500);
// frame 57: the empty sketch on the Top Plane, the red sketch origin in the middle
await page.mouse.move(1100, 560);
await page.screenshot({ path: 'e2e-out/app-sk-57.png' });
// frame 70: a corner rectangle from the origin, its Property Panel open
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
await page.waitForTimeout(200);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
let p = await P(0, 0); await page.mouse.click(p.x, p.y);
p = await P(92, 75); await page.mouse.click(p.x, p.y);
await page.mouse.move(820, 680);
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/app-sk-70.png' });
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
// frames 82 and 95: the dimensioned sketch (built the same way as compare-baseplate), edited on the Top Plane
const open = (withCircle) => page.evaluate((circle) => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  let l0, l1, l2, l3, c;
  [sk, l0] = K.addLine(sk, sk.origin, { x: 80, y: 0 });
  [sk, l1] = K.addLine(sk, l0.p2, { x: 80, y: 80 });
  [sk, l2] = K.addLine(sk, l1.p2, { x: 0, y: 80 });
  [sk, l3] = K.addLine(sk, l2.p2, l0.p1);
  for (const l of [l0, l2]) sk = K.addConstraint(sk, 'horizontal', [l.id])[0];
  for (const l of [l1, l3]) sk = K.addConstraint(sk, 'vertical', [l.id])[0];
  sk = K.addConstraint(sk, 'length', [l0.id], { value: 80 })[0];
  sk = K.addConstraint(sk, 'length', [l3.id], { value: 80 })[0];
  if (circle) {
    [sk, c] = K.addCircle(sk, { x: 40, y: 38 }, 17.5);
    sk = K.addConstraint(sk, 'diameter', [c.id], { value: 35 })[0];
  }
  const d = K.createDocument('BasePlate');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
  window.__phlippoStore.getState().editSketch('s1');
}, withCircle);
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => undefined);
await open(false);
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => undefined);
await page.waitForTimeout(600);
await page.mouse.move(1300, 770);
await page.screenshot({ path: 'e2e-out/app-sk-82.png' });
await open(true);
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => undefined);
await page.waitForTimeout(600);
await page.screenshot({ path: 'e2e-out/app-sk-95.png' });
await browser.close();
const py = `
from PIL import Image
for n in (57, 70, 82, 95):
    r = Image.open('referentie-video/frames/f_%04d.jpg' % n).convert('RGB')
    a = Image.open('e2e-out/app-sk-%d.png' % n).convert('RGB')
    o = Image.new('RGB', (r.width + a.width, max(r.height, a.height)), 'white')
    o.paste(r, (0, 0)); o.paste(a, (r.width, 0))
    o.resize((o.width // 2, o.height // 2)).save('e2e-out/cmp-sk-%d.png' % n)
`;
execFileSync('python', ['-c', py], { stdio: 'inherit' });
console.log('saved e2e-out/cmp-sk-57.png, cmp-sk-70.png, cmp-sk-82.png and cmp-sk-95.png');
