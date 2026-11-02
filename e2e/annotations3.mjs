// Drawing part 3 on the lever drawing: Removed Section (cut face only, placed freely) and Area Hatch/Fill on a model face.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete tek.format;
tek.sheets[0].views = tek.sheets[0].views.filter((v) => !v.section && !v.detail);
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(1200);
const toPx = (p) => page.evaluate((q) => window.__phlippoSheet.toPx(q), p);
const click = async (p) => { const q = await toPx(p); await page.mouse.click(q.x, q.y); await page.waitForTimeout(200); };
const v2s = (id, p) => page.evaluate(([vid, q]) => window.__phlippoSheet.viewToSheet(vid, q), [id, p]);

// Removed Section through the lever (vertical cut in the front view at the middle of the lever), placed in free space
const front = await page.evaluate(() => { const st = window.__phlippoStore.getState(); const v = st.doc.sheets[0].views.find((x) => x.id === 'v1'); const g = window.__phlippoKit.projectedView(v.model, v.type); return { min: g.min, max: g.max }; });
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v1'));
await page.click('.k-cm-tab:has-text("Drawing")');
await page.click('.k-cm-big:has-text("Removed Section") .k-cm-main');
await page.waitForTimeout(200);
const xCut = front.min[0] + (front.max[0] - front.min[0]) * 0.55;
await click(await v2s('v1', [xCut, (front.min[1] + front.max[1]) / 2]));
await click([300, 230]);
await page.waitForTimeout(1500);
const rs = await page.evaluate(() => { const v = window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.section?.removed); return v && { name: v.name, pos: v.position, removed: v.section.removed }; });
check('Removed Section: the cut face only, placed where clicked', rs && rs.removed && Math.abs(rs.pos[0] - 300) < 0.5 && Math.abs(rs.pos[1] - 230) < 0.5 && /Section View/.test(rs.name), JSON.stringify(rs));
const hatchCount = await page.evaluate(() => document.querySelectorAll('path[fill="url(#k-hatch)"]').length);
check('the removed section is hatched', hatchCount >= 1, String(hatchCount));

await page.mouse.move(5, 900);
await shot('an4-removed-section');

// Area Hatch/Fill on the front face of a plate with a hole (front view)
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'front');
  const c = [[0, 0], [80, 0], [80, 60], [0, 60]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  s = K.addCircle(s, { x: 40, y: 30 }, 12)[0];
  const part = { ...K.createDocument('Plaat'), sketches: { s1: s }, kind: 'part' };
  part.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  const d = K.createDocument('Plaat-tekening', 'drawing', { size: 'A3', landscape: true, scale: [1, 1], showFormat: true });
  d.sheets[0].views = [{ id: 'p1', name: 'Drawing View1', type: 'front', position: [150, 160], displayStyle: 'hiddenRemoved', model: part, modelName: 'Plaat<1>' }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1000);
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-small:has-text("Area Hatch/Fill")');
await click([150 - 30, 160 + 20]);
await page.keyboard.press('Escape');
const ah = await page.evaluate(() => (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).filter((s) => s.kind === 'areaHatch').map((s) => s.tris.length));
check('Area Hatch/Fill hatches the picked face (the plate around the hole)', ah.length === 1 && ah[0] > 2 && (await page.locator('.k-area-hatch').count()) === 1, JSON.stringify(ah));
await page.mouse.move(5, 900);
await shot('an4-removed-section-hatch');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
