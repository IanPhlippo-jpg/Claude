// Machine tool (not in the regression): a flange with a circular pattern of holes, a mirrored boss and a lofted
// neck, built with the B-rep kernel; prints which bodies are exact and saves e2e-out/brep-showcase.png.
// Usage: npm run build:e2e, vite preview on 4173, then node e2e/tools/brep-showcase.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.kernel', 'brep'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const rect = (id, plane, x0, y0, x1, y1) => { let s = K.createSketch(id, id, plane); const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0]; return s; };
  const d = K.createDocument('Flens');
  let flange = K.createSketch('s1', 'Sketch1', 'top');
  flange = K.addCircle(flange, { x: 0, y: 0 }, 50)[0];
  flange = K.addCircle(flange, { x: 0, y: 0 }, 15)[0];
  const hole = K.addCircle(K.createSketch('s2', 'Sketch2', 'top'), { x: 35, y: 0 }, 5)[0];
  d.planes.p10 = { id: 'p10', name: 'Plane1', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 10, 0] };
  d.planes.p40 = { id: 'p40', name: 'Plane2', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 40, 0] };
  const neck1 = rect('s3', 'p10', -25, -25, 25, 25);
  const neck2 = K.addCircle(K.createSketch('s4', 'Sketch4', 'p40'), { x: 0, y: 0 }, 18)[0];
  const lug = rect('s5', 'top', 50, -8, 62, 8);
  d.sketches = { s1: flange, s2: hole, s3: neck1, s4: neck2, s5: lug };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'l1', type: 'loft', name: 'Loft1', sketchId: 's3', sketchId2: 's4', suppressed: false, op: 'boss' },
    { id: 'c1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false },
    { id: 'p1', type: 'circularPattern', name: 'CirPattern1', suppressed: false, featureIds: ['c1'], axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 360, count: 6 },
    { id: 'b1', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's5', suppressed: false, op: 'boss', end: 'blind', depth: 6, reverse: false },
    { id: 'm1', type: 'mirror', name: 'Mirror1', suppressed: false, plane: 'right', featureIds: ['b1'] },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
const ok = await page.waitForFunction(() => window.__phlippoStore.getState().rebuild.bodies.every((b) => b.exact), null, { timeout: 60000 }).then(() => true, () => false);
const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, bodies: s.rebuild.bodies.map((b) => ({ exact: !!b.exact, vol: b.exactVolume })) }; });
console.log(ok, JSON.stringify(st));
await page.evaluate(() => window.__phlippoZoomFit?.());
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/brep-showcase.png' });
await browser.close();
