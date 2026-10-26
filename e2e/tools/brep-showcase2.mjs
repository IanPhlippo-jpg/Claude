// Machine tool (not in the regression): a sheet metal bracket (base flange, edge flange, jog) and a welded frame of
// square tube with end miters, both with the B-rep kernel; screenshots e2e-out/brep-sheet.png and e2e-out/brep-frame.png.
// Usage: dev server on 5173 (or E2E_URL), then node e2e/tools/brep-showcase2.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.kernel', 'brep'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const open = (fn) => page.evaluate(fn);
const waitExact = () => page.waitForFunction(() => { const b = window.__phlippoStore.getState().rebuild.bodies; return b.length && b.every((x) => x.exact); }, null, { timeout: 60000 }).then(() => true, () => false);
const report = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, bodies: s.rebuild.bodies.map((b) => !!b.exact) }; });

// sheet metal: a U bent from a line chain, then an edge flange on one long edge
await open(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'front');
  sk = K.addLine(sk, { x: 0, y: 40 }, { x: 0, y: 0 })[0];
  sk = K.addLine(sk, { x: 0, y: 0 }, { x: 80, y: 0 })[0];
  sk = K.addLine(sk, { x: 80, y: 0 }, { x: 80, y: 40 })[0];
  const d = K.createDocument('Beugel');
  d.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 };
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 60, midPlane: false, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await waitExact();
await open(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const e = b.edges.filter((x) => x.straight && x.length > 55).sort((a, c) => c.centroid.y - a.centroid.y || c.centroid.x - a.centroid.x)[0];
  const ref = { centroid: [e.centroid.x, e.centroid.y, e.centroid.z], length: e.length, closed: e.closed, straight: e.straight };
  s.applyDocument('Flange', { ...s.doc, features: [...s.doc.features, { id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: ref, angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialOutside', flip: false }] });
});
const ok1 = await waitExact();
console.log('sheet', ok1, JSON.stringify(await report()));
await page.evaluate(() => window.__phlippoZoomFit?.());
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/brep-sheet.png' });

// weldment: a 600 x 400 frame of 40 x 40 x 4 tube, end miters
await open(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [600, 0], [600, 400], [0, 400]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = K.createDocument('Frame');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'w', type: 'weldment', name: 'Weldment', suppressed: false }, { id: 'sm', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 's1', standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'endMiter', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.locator('[data-testid="ask-no"]').click({ timeout: 3000 }).catch(() => undefined);
const ok2 = await waitExact();
console.log('frame', ok2, JSON.stringify(await report()));
await page.evaluate(() => window.__phlippoZoomFit?.());
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/brep-frame.png' });
await browser.close();
