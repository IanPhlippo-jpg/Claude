// The Delete key must never freeze the app: nothing selected, a feature, a sketch line, a dimension, a face, a component, a drawing view.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { readFileSync } from 'node:fs';

const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// the page answers within 20 s after the key (a frozen page does not; a slow runner rebuilds for seconds)
const alive = async (label) => {
  const t0 = Date.now();
  const r = await Promise.race([page.evaluate(() => 1), new Promise((res) => setTimeout(() => res('timeout'), 20000))]);
  check(`Delete with ${label}: the app keeps responding`, r === 1, `${r} after ${Date.now() - t0} ms`);
  return r === 1;
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);
await page.click('.k-viewport', { position: { x: 600, y: 500 } });
await page.keyboard.press('Delete');
if (!(await alive('nothing selected (empty part)'))) process.exit(1);

// a part with a sketch and an extrusion
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'front');
  const pts = [[0, 0], [80, 0], [80, 40], [0, 40]];
  let first = null, prev = null;
  for (let i = 0; i < pts.length; i++) {
    const a = prev ?? { x: pts[i][0], y: pts[i][1] };
    const b = i + 1 < pts.length ? { x: pts[i + 1][0], y: pts[i + 1][1] } : first;
    const [n, l] = K.addLine(s, a, b);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  s = { ...s, constraints: { ...s.constraints, d1: { id: 'd1', kind: 'length', refs: [Object.keys(s.entities)[0]], value: 80 } }, constraintOrder: [...s.constraintOrder, 'd1'] };
  const d = { ...window.__phlippoKit.createDocument('Part1'), sketches: { s1: s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false }] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.click('.k-viewport', { position: { x: 600, y: 500 } });
await page.keyboard.press('Delete');
if (!(await alive('nothing selected (part with a body)'))) process.exit(1);

// a face selected
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: b.faces[0].id } }); });
await page.keyboard.press('Delete');
if (!(await alive('a face selected'))) process.exit(1);
await page.keyboard.press('Escape');

// the feature selected in the tree
await page.evaluate(() => window.__phlippoStore.getState().setSelectedFeature('f1'));
await page.keyboard.press('Delete');
await page.waitForTimeout(400);
if (!(await alive('a feature selected'))) process.exit(1);
await page.keyboard.press('Escape');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

// in the sketch: a line and the dimension
await page.evaluate(() => window.__phlippoStore.getState().openDocument(window.__phlippoStore.getState().doc));
await page.evaluate(() => window.__phlippoStore.getState().editSketch('s1'));
await page.waitForTimeout(400);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches.s1; const id = Object.keys(sk.entities)[1]; s.setSelection([{ kind: 'entity', id }]); });
await page.keyboard.press('Delete');
await page.waitForTimeout(300);
if (!(await alive('a sketch line selected'))) process.exit(1);
await page.evaluate(() => window.__phlippoStore.getState().selectConstraint('d1'));
await page.keyboard.press('Delete');
await page.waitForTimeout(300);
if (!(await alive('a dimension selected'))) process.exit(1);
await page.keyboard.press('Escape');
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());

// an assembly component and a drawing view
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asm);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__phlippoStore.getState().setSelectedFeature('c7'));
await page.keyboard.press('Delete');
await page.waitForTimeout(500);
if (!(await alive('an assembly component selected'))) process.exit(1);
await page.keyboard.press('Escape');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete tek.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(1200);
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v4'));
await page.keyboard.press('Delete');
await page.waitForTimeout(500);
await alive('a drawing view selected');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
// every failed check and every page error makes the run fail (QA v0.3.4 F57)
process.exitCode = exitCode(results, errors);
await browser.close();
