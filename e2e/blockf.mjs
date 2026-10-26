// Block F (playlist follow-ups): Delete Face (patch a hole), Pierce relation, Sketch Color, shared-sketch icon,
// Loft Start/End Constraints (Direction Vector, Tangency To Face).
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// a plate 60 x 40 x 10 with a Ø10 through hole, both from one sketch on the Top Plane (rectangle + circle);
// a second extrude reuses the same sketch (shared sketch)
await S(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  s = K.addLine(s, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  s = K.addLine(s, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  s = K.addLine(s, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  s = K.addLine(s, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  s = K.addCircle(s, { x: 0, y: 0 }, 5)[0];
  let p = K.createSketch('s2', 'Path', 'front');
  p = K.addLine(p, { x: 12, y: -10 }, { x: 12, y: 40 })[0];
  const d = K.createDocument('Plate');
  d.sketches = { s1: s, s2: p };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'k2', type: 'sketch', name: 'Path', sketchId: 's2', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 5, reverse: true, contours: [0] },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1200);
const vol = () => S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return a + Math.abs(v); }, 0); });
await page.click('.k-tree-row[data-id="e1"] .caret');
await page.waitForTimeout(200);
check('shared sketch shows the hand icon', await S(() => !!document.querySelector('.k-tree-row svg path[stroke="#8a5a2b"]')));
const v0 = await vol();

// Delete Face: the hole wall, Delete and Patch
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.find((x) => x.curved);
  s.setSelectedFace({ bodyId: b.id, faceId: f.id });
  s.startDeleteFace();
});
await page.waitForTimeout(300);
check('Delete Face PM with the picked face', (await page.locator('[data-testid="deleteface-faces"]').innerText()).includes('Face<'));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(800);
const v1 = await vol();
check('Delete and Patch fills the hole (volume grows by about π·5²·15)', v1 - v0 > 1000 && v1 - v0 < 1300, `${v0} -> ${v1}`);
await page.screenshot({ path: `${OUT}/blockf-deleteface.png` });

// Pierce: a point on the Top Plane pierces the path of the Front sketch at x = 12
await S(() => {
  const K = window.__phlippoKit;
  const s = window.__phlippoStore.getState();
  s.newSketch('top');
});
await page.waitForTimeout(300);
const sid = await S(() => window.__phlippoStore.getState().activeSketchId);
const pid = await S((sid) => {
  const K = window.__phlippoKit;
  const s = window.__phlippoStore.getState();
  let id = null;
  s.commit('Point', (k) => { const [k2, e] = K.addPoint(k, { x: 3, y: 4 }); id = e.p; return k2; });
  return id;
}, sid);
await S((pid) => window.__phlippoStore.setState({ selection: [{ kind: 'point', id: pid }] }), pid);
await page.waitForTimeout(300);
check('Pierce offered for one point', (await page.locator('[data-testid="rel-pierce"]').count()) === 1);
await page.click('[data-testid="rel-pierce"]');
await page.waitForTimeout(300);
const px = await S(({ sid, pid }) => window.__phlippoStore.getState().doc.sketches[sid].points[pid], { sid, pid });
check('Pierce moves the point onto the path (x = 12)', Math.abs(px.x - 12) < 1e-3, JSON.stringify(px));
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(300);

// Sketch Color
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Sketch Color', { ...s.doc, sketches: { ...s.doc.sketches, s2: { ...s.doc.sketches.s2, color: '#d0342c' } } }); });
check('sketch colour stored', (await S(() => window.__phlippoStore.getState().doc.sketches.s2.color)) === '#d0342c');

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
