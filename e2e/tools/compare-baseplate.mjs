// Machine tool (design round): the BasePlate of the reference video (80 × 80, Ø35 hole, 15 mm) in the app, with the
// Boss-Extrude Property Panel open (frame 111) and finished (frame 118); saves the app shots and side-by-side images
// e2e-out/cmp-111.png and e2e-out/cmp-118.png (reference left, app right). Usage: dev server on 5173, then
// node e2e/tools/compare-baseplate.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); localStorage.setItem('phlippo.kernel', 'brep'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 5, y: 5 }, 17.5)[0];
  const d = K.createDocument('BasePlate');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(300);
await page.evaluate(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k1' }); window.__phlippoStore.getState().startFeature('extrude', 'boss'); window.__phlippoStore.getState().updateFeatureDraft({ depth: 15 }); });
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/app-111.png' });
await page.evaluate(() => window.__phlippoStore.getState().commitFeature());
await page.waitForFunction(() => window.__phlippoStore.getState().rebuild.bodies.every((b) => b.exact), null, { timeout: 30000 }).catch(() => undefined);
await page.waitForTimeout(600);
await page.screenshot({ path: 'e2e-out/app-118.png' });
await browser.close();
const py = `
from PIL import Image
for n in (111, 118):
    r = Image.open('referentie-video/frames/f_%04d.jpg' % n).convert('RGB')
    a = Image.open('e2e-out/app-%d.png' % n).convert('RGB')
    o = Image.new('RGB', (r.width + a.width, max(r.height, a.height)), 'white')
    o.paste(r, (0, 0)); o.paste(a, (r.width, 0))
    o.resize((o.width // 2, o.height // 2)).save('e2e-out/cmp-%d.png' % n)
`;
execFileSync('python', ['-c', py], { stdio: 'inherit' });
console.log('saved e2e-out/cmp-111.png and e2e-out/cmp-118.png');
