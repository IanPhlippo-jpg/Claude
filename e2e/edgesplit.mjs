// SW edge split along a bent side: an L profile (base flange, t 3, r 3) shows the outer side at its far end as three
// edges (line 94, bend arc, line 44); a click on the straight part picks that edge alone; a fillet with Tangent
// propagation on previews and rounds the whole chain, off only the picked straight edge.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';
import { settle } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('L-profiel', 'part');
  d.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  let s = K.createSketch('s1', 'Sketch1', 'front');
  s = K.addLine(s, { x: 0, y: 0 }, { x: 100, y: 0 })[0];
  s = K.addLine(s, { x: 100, y: 0 }, { x: 100, y: 50 })[0];
  d.sketches.s1 = s;
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 200, midPlane: false, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await waitSettled(page);

// the outer side at z = 200 (the end facing the viewer): three edges in one tangent chain
const side = () => page.evaluate(() => {
  const b = window.__phlippoStore.getState().rebuild.bodies[0];
  const on = b.edges.filter((e) => e.points.every((p) => Math.abs(p.z - 200) < 1e-3) && e.length > 9 && (e.straight ? Math.abs(e.centroid.y) < 1e-3 || Math.abs(e.centroid.x - 100) < 1e-3 : true) && (e.straight || e.length > 9));
  return on.map((e) => ({ id: e.id, kind: (e.straight ? 'L' : 'C') + e.length.toFixed(2), chain: e.chain ?? null }));
});
const s0 = await side();
check('the outer side is a line 94, the bend arc and a line 44 (SW)', JSON.stringify(s0.map((e) => e.kind).sort()) === JSON.stringify(['C9.42', 'L44.00', 'L94.00']), JSON.stringify(s0));
check('the three edges are one tangent chain', s0.length === 3 && new Set(s0.map((e) => e.chain)).size === 1 && !!s0[0].chain, JSON.stringify(s0));
const line = s0.find((e) => e.kind === 'L94.00');

// a click on the middle of the straight part picks that edge only; a slow runner (software GL) can miss a click while
// it draws: the edge is lit again before every click, and the click is repeated until `done` (as features.mjs)
const pick = async (done) => {
  for (let k = 0; k < 10 && !(await page.evaluate(done)); k++) {
    const p = await page.evaluate(() => window.__phlippoProjectWorld(47, 0, 200));
    await page.mouse.move(p.x + (k % 2), p.y);
    await page.waitForFunction(() => !!window.__phlippoStore.getState().hoverEdge, undefined, { timeout: 3000 }).catch(() => undefined);
    await page.mouse.click(p.x + (k % 2), p.y);
    await page.waitForFunction(done, undefined, { timeout: 3000 }).catch(() => undefined);
  }
  await settle(page);
};
const px = await page.evaluate(() => window.__phlippoProjectWorld(47, 0, 200));
await page.mouse.move(px.x, px.y);
await page.waitForFunction(() => !!window.__phlippoStore.getState().hoverEdge, undefined, { timeout: 5000 }).catch(() => undefined);
const hover = await page.evaluate(() => window.__phlippoStore.getState().hoverEdge);
check('hovering the straight part highlights that edge', hover === line?.id, `${hover} vs ${line?.id}`);
await pick(() => window.__phlippoStore.getState().selectedEdges.length > 0);
const sel = await page.evaluate(() => window.__phlippoStore.getState().selectedEdges);
check('a click selects the straight edge alone', sel.length === 1 && sel[0] === line?.id, JSON.stringify(sel));
await shot('es1-straight-edge-selected');

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
const V0 = await volume();

// Fillet with the straight edge picked: the preview covers the whole chain with Tangent propagation, the line without
const corner = (r) => r * r * (1 - Math.PI / 4);
for (const tangent of [true, false]) {
  await page.evaluate(() => window.__phlippoStore.setState({ selectedEdges: [] }));
  await page.evaluate(() => window.__phlippoStore.getState().startRound('fillet'));
  await settle(page);
  await pick(() => (window.__phlippoStore.getState().featureEdit?.draft?.edges?.length ?? 0) > 0);
  const draft = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft);
  check(`fillet PM lists the one picked edge (tangent ${tangent})`, draft?.edges?.length === 1, JSON.stringify(draft?.edges?.length));
  await page.evaluate(([t]) => window.__phlippoStore.getState().updateFeatureDraft({ size: 2, tangentPropagation: t }), [tangent]);
  await settle(page);
  await shot(`es2-fillet-preview-tangent-${tangent ? 'on' : 'off'}`);
  await page.locator('.k-pm-ok').first().click({ timeout: 15000 });
  const removed = V0 - (await volume());
  const errs = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors);
  check(`fillet builds (tangent ${tangent})`, Object.keys(errs).length === 0, JSON.stringify(errs));
  // on: both lines and the bend (Pappus at the outer R6); off: the line of 94 only
  const want = tangent ? (94 + 44) * corner(2) + corner(2) * (Math.PI / 2) * (6 - 0.2234 * 2) : 94 * corner(2);
  check(`fillet R2 removes ${want.toFixed(1)} mm3 (tangent ${tangent})`, Math.abs(removed - want) / want < 0.06, removed.toFixed(2));
  await shot(`es3-fillet-tangent-${tangent ? 'on' : 'off'}`);
  await page.evaluate(() => window.__phlippoStore.getState().undo());
  await settle(page);
}

console.log(JSON.stringify(results.map((r) => `${r.ok ? 'ok' : 'FAIL'} ${r.name} ${r.info}`), null, 1));
await browser.close();
process.exitCode = exitCode(results, errors);
