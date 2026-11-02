// look-dev: an assembly with two plates; select a component in the tree (blue component, triad, breadcrumbs)
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Assembly")').catch(() => {});
await page.evaluate(() => {
  const S = window.__phlippoStore, K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  s = K.addCircle(s, { x: 0, y: 0 }, 17.5)[0];
  const part = { ...K.createDocument('BasePlate'), sketches: { s1: s }, features: [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ] };
  if (S.getState().doc.kind !== 'assembly') S.getState().newDocument('assembly');
  S.getState().insertComponent(part, { atOrigin: true });
  S.getState().insertComponent(part, { position: [0, 10, 0] });
  S.getState().cancelInsertComponent();
  const d = S.getState().doc, [c1, c2] = d.components;
  const ref = (c, y) => ({ componentId: c.id, kind: 'face', label: `Face<1>@${c.name}`, normal: [0, 1, 0], point: [0, y, 0] });
  S.getState().applyDocument('Mate', { ...d, mates: [
    { id: 'm1', type: 'coincident', name: 'Coincident1', refs: [ref(c1, 10), ref(c2, 10)], aligned: true, suppressed: false },
    { id: 'm2', type: 'parallel', name: 'Parallel1', refs: [ref(c1, 10), ref(c2, 20)], aligned: true, suppressed: false },
  ] });
});
await page.waitForTimeout(1200);
await page.keyboard.press('f');
await page.waitForTimeout(600);
await page.click('.k-tree-row:has-text("BasePlate<2>")');
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-compsel.png' });
console.log('crumbs', await page.locator('[data-testid="breadcrumbs"]').count(), 'mates', await page.locator('.k-crumb-mate').count());
console.log('errors', errors);
await browser.close();
