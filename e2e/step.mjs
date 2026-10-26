// QA F51/F47: STEP out and back in through OpenCascade (File ▸ Save As ▸ STEP, File ▸ Open of a .step), and a fillet
// that keeps its edge when the extrude below it gets deeper.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const menuItem = (label) => page.locator(`.k-menu-item:has-text("${label}")`).first();
const vol = () => S(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => { const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry; const a = g.getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return Math.abs(v); }));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// a 60 x 40 x 10 block with a D20 hole
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 10)[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);
const [v0] = await vol();
check('block with hole built', Math.abs(v0 - (24000 - Math.PI * 100 * 10)) < 30, String(v0));

// ---- Save As ▸ STEP AP214
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.waitForTimeout(150);
check('File menu offers Save As ▸ STEP AP214', (await menuItem('Save As ▸ STEP AP214 (*.step)…').count()) === 1);
await menuItem('Save As ▸ STEP AP214 (*.step)…').click();
await page.waitForTimeout(300);
check('Export Options for STEP: Output as AP214 and the unit', (await page.locator('[data-testid="export-step-schema"]').count()) === 1 && (await page.locator('[data-testid="export-unit"]').count()) === 1);
const dl = page.waitForEvent('download', { timeout: 60000 });
await page.locator('[data-testid="export-ok"]').click();
await page.locator('[data-testid="ask-yes"]').waitFor({ timeout: 60000 });
const info = await page.locator('[data-testid="ask"]').innerText().catch(() => '');
check('STEP Info names one solid and its volume', /1 solid/.test(info) && /AP214/.test(info), info.replace(/\s+/g, ' ').slice(0, 160));
await page.screenshot({ path: `${OUT}/step-info.png` });
await page.locator('[data-testid="ask-yes"]').click();
const file = await dl;
const buf = Buffer.concat(await (await file.createReadStream()).toArray());
const text = buf.toString('utf8');
check('Blok.step downloads as an ISO 10303-21 file with a closed solid', file.suggestedFilename() === 'Blok.step' && text.startsWith('ISO-10303-21;') && /MANIFOLD_SOLID_BREP/.test(text), `${file.suggestedFilename()} ${buf.length} bytes`);
check('the cylinder of the hole is one face in the STEP, not facets (planar faces merged)', (text.match(/ADVANCED_FACE/g) ?? []).length < 200, String((text.match(/ADVANCED_FACE/g) ?? []).length));

// ---- File ▸ Open of the STEP: a new part with one Imported body of the same volume
await page.setInputFiles('#phlippo-open-file', { name: 'Blok.step', mimeType: 'model/step', buffer: buf });
// the open part has changes: Save changes? -> Don't Save, as with any File ▸ Open
await page.locator('[data-testid="ask-no"]').click({ timeout: 60000 });
await page.waitForFunction(() => window.__phlippoStore.getState().doc.features.some((f) => f.type === 'imported'), null, { timeout: 60000 });
await page.waitForTimeout(300);
const st = await S(() => { const s = window.__phlippoStore.getState(); return { name: s.doc.name, features: s.doc.features.map((f) => f.type), errors: s.rebuild.errors, bodies: s.rebuild.bodies.length }; });
const [v1] = await vol();
check('Blok.step opens as a new part "Blok" with one Imported body', st.name === 'Blok' && st.features.join() === 'imported' && st.bodies === 1 && !Object.keys(st.errors).length, JSON.stringify(st));
check('the imported body has the volume that was exported (within 0.5 %)', Math.abs(v1 - v0) / v0 < 0.005, `${v1} vs ${v0}`);
await page.screenshot({ path: `${OUT}/step-imported.png` });

// ---- a damaged STEP file: a message, the open part stays
await page.setInputFiles('#phlippo-open-file', { name: 'kapot.step', mimeType: 'model/step', buffer: Buffer.from('ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n') });
await page.waitForFunction(() => window.__phlippoStore.getState().messages.some((m) => /Cannot open kapot\.step/.test(m.text)), null, { timeout: 60000 }).catch(() => undefined);
const msgs = await S(() => window.__phlippoStore.getState().messages.map((m) => m.text));
check('a STEP file without solids is refused with a message; the part stays open', msgs.some((m) => /Cannot open kapot\.step/.test(m)) && (await S(() => window.__phlippoStore.getState().doc.name)) === 'Blok', msgs.slice(-2).join(' | '));

// ---- F47: a fillet on a top edge keeps its edge when the block becomes thicker
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = K.createDocument('Rand');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(400);
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const top = b.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-6).sort((x, y) => y.centroid.x - x.centroid.x)[0];
  window.__phlippoStore.getState().startRound('fillet');
  window.__phlippoStore.getState().toggleSelectedEdge(top.id);
});
await page.waitForTimeout(300);
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(400);
const r1 = await S(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, f: s.doc.features.map((f) => f.type) }; });
check('Fillet1 on the top edge', r1.f.includes('fillet') && !Object.keys(r1.errors).length, JSON.stringify(r1));
const [vf10] = await vol();
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Depth', { ...s.doc, features: s.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 25 } : f)) }); });
await page.waitForTimeout(400);
const r2 = await S(() => window.__phlippoStore.getState().rebuild.errors);
const [vf25] = await vol();
check('after Boss-Extrude1 goes from 10 to 25 mm the fillet still finds its edge (F47)', !Object.keys(r2).length && Math.abs(vf25 - vf10 - 2400 * 15) < 40, `${JSON.stringify(r2)} ${vf10} -> ${vf25}`);
await page.screenshot({ path: `${OUT}/step-f47.png` });

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
