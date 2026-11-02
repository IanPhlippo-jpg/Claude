// Fillet / Chamfer Property Panel options: asymmetric, conic profile, multi radius, variable size,
// partial edge, Face Fillet, Full Round Fillet, FilletXpert and Chamfer Angle-Distance.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// a block 80 x 40 x 20 (top sketch, extruded up)
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, 40], [0, 40]];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = { ...K.createDocument('Block'), sketches: { sk1: s1 }, features: [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
  ] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1200);

const volume = async () => { await waitSettled(page); return page.evaluate(() => {
  const g = window.__phlippoStore.getState().rebuild.bodies[0].geometry;
  const p = g.getAttribute('position');
  let v = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(v);
}); };
// the long top edges (length 80, at the top of the block)
const topLongEdges = () => page.evaluate(() => {
  const b = window.__phlippoStore.getState().rebuild.bodies[0];
  const ys = b.edges.map((e) => e.centroid.y);
  const top = Math.max(...ys);
  return b.edges.filter((e) => e.straight && Math.abs(e.length - 80) < 1e-3 && Math.abs(e.centroid.y - top) < 1e-3).map((e) => e.id);
});
const faceBy = (n) => page.evaluate((n) => {
  const b = window.__phlippoStore.getState().rebuild.bodies[0];
  const f = b.faces.filter((x) => !x.curved && x.normal[0] * n[0] + x.normal[1] * n[1] + x.normal[2] * n[2] > 0.99).sort((a, c) => c.area - a.area)[0];
  return { bodyId: b.id, faceId: f.id };
}, n);
const startFillet = async (kind = 'fillet') => {
  await page.evaluate((k) => window.__phlippoStore.getState().startRound(k), kind);
  await page.waitForTimeout(200);
};
const pickTopEdges = async (n = 1) => {
  const ids = (await topLongEdges()).slice(0, n);
  for (let i = 0; i < ids.length; i++) await page.evaluate(([id, add]) => window.__phlippoStore.getState().toggleSelectedEdge(id, add), [ids[i], i > 0]);
  await page.waitForTimeout(200);
};
const ok = async () => { await page.locator('.k-pm-ok').first().click({ timeout: 15000 }); await page.waitForTimeout(600); };
const undo = async () => { await page.evaluate(() => window.__phlippoStore.getState().undo()); await page.waitForTimeout(500); };
const V0 = await volume();
check('block volume 80 x 40 x 20', Math.abs(V0 - 64000) < 1, String(V0));

// Constant size, circular: reference
await startFillet();
await pickTopEdges(1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5 }));
await ok();
const Vc = await volume();
const circRemoved = V0 - Vc;
check('constant fillet R5 removes (1 - pi/4) r^2 L', Math.abs(circRemoved - (1 - Math.PI / 4) * 25 * 80) < 15, String(circRemoved));
await undo();

// Profile: Conic Rho 0.8 removes less (a fuller corner)
await startFillet();
await pickTopEdges(1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5 }));
await page.selectOption('[data-testid="fillet-profile"]', 'conicRho');
await page.waitForTimeout(200);
check('Profile select offers Conic Rho and shows rho', (await page.locator('.k-pm-valuerow:has-text("ρ")').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ rho: 0.8 }));
await page.screenshot({ path: `${OUT}/fillet-conic.png` });
await ok();
const conicRemoved = V0 - (await volume());
check('conic rho fillet removes less than the circular one', conicRemoved > 1 && conicRemoved < circRemoved - 5, `${conicRemoved} vs ${circRemoved}`);
await undo();

// Asymmetric
await startFillet();
await pickTopEdges(1);
await page.selectOption('[data-testid="fillet-sym"]', 'asymmetric');
await page.waitForTimeout(200);
check('Asymmetric shows a second distance', (await page.locator('.k-pm-valuerow:has-text("D2")').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5, size2: 10 }));
await ok();
const asymRemoved = V0 - (await volume());
check('asymmetric fillet removes more than the symmetric R5', asymRemoved > circRemoved + 10, `${asymRemoved}`);
await undo();

// Multi Radius: two edges, radius 3 and 8
await startFillet();
await pickTopEdges(2);
await page.click('[data-testid="fillet-multi"]');
await page.waitForTimeout(200);
check('Multi Radius lists a radius per edge', (await page.locator('.k-pm-valuerow:has-text("Edge<")').count()) === 2);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ radii: [3, 8] }));
await ok();
const multiRemoved = V0 - (await volume());
check('multi radius removes R3 + R8', Math.abs(multiRemoved - (1 - Math.PI / 4) * (9 + 64) * 80) < 25, `${multiRemoved}`);
await undo();

// Variable Size Fillet 2 → 8
await startFillet();
await page.click('[data-testid="fillet-type-variable"]');
await pickTopEdges(1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ variable: { start: 2, end: 8 } }));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/fillet-variable.png` });
await ok();
const varRemoved = V0 - (await volume());
check('variable fillet removes between R2 and R8', varRemoved > (1 - Math.PI / 4) * 4 * 80 && varRemoved < (1 - Math.PI / 4) * 64 * 80, `${varRemoved}`);
await undo();

// Partial edge 0..50 %
await startFillet();
await pickTopEdges(1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5 }));
await page.click('.k-section-title:has-text("Partial Edge Parameters")');
await page.click('[data-testid="fillet-partial"]');
await ok();
const partRemoved = V0 - (await volume());
check('partial edge fillet removes about half', Math.abs(partRemoved - circRemoved / 2) < 15, `${partRemoved}`);
await undo();

// Face Fillet: top face + front face → their shared edge
await startFillet();
await page.click('[data-testid="fillet-type-face"]');
await page.evaluate((f) => window.__phlippoStore.getState().setSelectedFace(f, true), await faceBy([0, 1, 0]));
await page.evaluate((f) => window.__phlippoStore.getState().setSelectedFace(f, true), await faceBy([0, 0, 1]));
await page.waitForTimeout(200);
const faceEdges = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.edges.length);
check('Face Fillet finds the shared edge of two faces', faceEdges === 1, String(faceEdges));
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5 }));
await ok();
check('face fillet removes as the edge fillet', Math.abs(V0 - (await volume()) - circRemoved) < 15);
await undo();

// Full Round on the 20-high front face is not possible (no long parallel edges? it has): use the top face (40 wide) → R20 on the two long edges
await startFillet();
await page.click('[data-testid="fillet-type-fullRound"]');
// Side Face Set 1 = top, Center Face Set = the 20-high front face, Side Face Set 2 = bottom
for (const n of [[0, 1, 0], [0, 0, 1], [0, -1, 0]]) {
  await page.evaluate((f) => window.__phlippoStore.getState().setSelectedFace(f), await faceBy(n));
  await page.waitForTimeout(250);
}
const fr = await page.evaluate(() => { const d = window.__phlippoStore.getState().featureEdit.draft; return { n: d.edges.length, size: d.size, sets: Object.keys(d.fullRound ?? {}).length }; });
check('Full Round: three face sets, two edges at half the center face height', fr.sets === 3 && fr.n === 2 && Math.abs(fr.size - 10) < 0.05, JSON.stringify(fr));
await page.screenshot({ path: `${OUT}/fillet-fullround.png` });
await ok();
const frRemoved = V0 - (await volume());
check('full round removes the two corners of the front face', frRemoved > 2 * (1 - Math.PI / 4) * 100 * 40 * 0.95, `${frRemoved}`);
await undo();

// FilletXpert: Apply keeps the Property Panel open
await startFillet();
await page.click('[data-testid="fillet-xpert"]');
await pickTopEdges(1);
await page.click('[data-testid="fillet-xpert-apply"]');
await page.waitForTimeout(600);
const xp = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { fillets: s.doc.features.filter((f) => f.type === 'fillet').length, open: !!s.featureEdit }; });
check('FilletXpert Apply adds a fillet and stays open', xp.fillets === 1 && xp.open, JSON.stringify(xp));
await page.evaluate(() => window.__phlippoStore.getState().cancelFeature());
await undo();

// Chamfer Angle-Distance 4 mm at 60°: the other leg is 4 tan(60°)
await startFillet('chamfer');
await page.click('[data-testid="chamfer-angle"]');
await pickTopEdges(1);
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 4, angle: 60 }));
await ok();
const chRemoved = V0 - (await volume());
check('chamfer angle-distance removes d * d tan(a) / 2', Math.abs(chRemoved - 0.5 * 4 * 4 * Math.tan(Math.PI / 3) * 80) < 15, `${chRemoved}`);
await page.screenshot({ path: `${OUT}/fillet-chamfer-angle.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
