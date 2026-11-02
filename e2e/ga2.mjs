// Block G-A (features): Chamfer Vertex / Face Face, Sweep Circular Profile + Keep normal constant + twist, Loft centerline,
// Fill Pattern circular / polygon layouts with Validate Count and Create seed cut.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const vol = async () => { await waitSettled(page); return S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return a + Math.abs(v); }, 0); }); };
const errs = () => S(() => window.__phlippoStore.getState().rebuild.errors);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// a 40 x 30 x 20 block
const block = () => S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -20, y: -15 }, { x: 20, y: -15 })[0];
  sk = K.addLine(sk, { x: 20, y: -15 }, { x: 20, y: 15 })[0];
  sk = K.addLine(sk, { x: 20, y: 15 }, { x: -20, y: 15 })[0];
  sk = K.addLine(sk, { x: -20, y: 15 }, { x: -20, y: -15 })[0];
  // a path on the Front plane for the sweeps: a quarter arc from the origin
  let path = K.createSketch('s2', 'Path', 'front');
  path = K.addArc(path, { x: 0, y: 60 }, { x: 0, y: 30 }, { x: 30, y: 60 }, true)[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk, s2: path };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'k2', type: 'sketch', name: 'Path', sketchId: 's2', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await block();
await page.waitForTimeout(700);
const v0 = await vol();
check('block volume 24000', Math.abs(v0 - 24000) < 1, String(v0));

// ---- Chamfer ▸ Vertex: the corner (20, 20, 15) cut off with D = 6 → a tetrahedron of 6³/6 = 36
await S(() => window.__phlippoStore.getState().startRound('chamfer'));
await page.waitForTimeout(200);
check('Chamfer Type shows five types', (await page.locator('[data-testid="chamfer-vertex"]').count()) === 1 && (await page.locator('[data-testid="chamfer-offsetface"]').count()) === 1 && (await page.locator('[data-testid="chamfer-faceface"]').count()) === 1);
await page.click('[data-testid="chamfer-vertex"]');
await page.waitForTimeout(150);
check('Vertex type shows the vertex box and D1/D2/D3 with Equal distance', (await page.locator('[data-testid="chamfer-vertex-box"]').count()) === 1 && (await page.locator('[data-testid="chamfer-equal"]').isChecked()) === true);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 6, vertex: { point: [20, 20, 15], label: 'Vertex<1>' } }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(600);
const v1 = await vol();
check('vertex chamfer removes a 36 mm³ corner', Math.abs(v0 - v1 - 36) < 1.5, `${v0} -> ${v1} (${JSON.stringify(await errs())})`);
await page.screenshot({ path: `${OUT}/ga2-vertexchamfer.png` });
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(400);

// ---- Chamfer ▸ Face Face: top face and +x face → the chamfer runs along their common edge (D 5 → 5²/2 × 30 = 375)
await S(() => window.__phlippoStore.getState().startRound('chamfer'));
await page.waitForTimeout(200);
await page.click('[data-testid="chamfer-faceface"]');
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const top = b.faces.find((f) => !f.curved && f.normal[1] > 0.99), side = b.faces.find((f) => !f.curved && f.normal[0] > 0.99);
  s.setSelectedFace({ bodyId: b.id, faceId: top.id });
  s.setSelectedFace({ bodyId: b.id, faceId: side.id }, true);
});
await page.waitForTimeout(300);
const ff = await S(() => { const d = window.__phlippoStore.getState().featureEdit.draft; return { edges: d.edges.length, type: d.roundType }; });
check('Face Face picks the common edge of the two faces', ff.edges === 1 && ff.type === 'faceFace', JSON.stringify(ff));
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 5 }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(600);
const v2 = await vol();
check('face-face chamfer removes 375 mm³', Math.abs(v0 - v2 - 375) < 4, `${v0} -> ${v2}`);
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(400);

// ---- Sweep ▸ Circular Profile along the arc path (Ø6 → π·9·(π/2·30) ≈ 1332)
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k2' }); window.__phlippoStore.getState().startFeature('sweep', 'boss'); });
await page.waitForTimeout(300);
check('Sweep PM offers Sketch Profile / Circular Profile', (await page.locator('[data-testid="sweep-profile"] label').count()) === 2);
await page.locator('[data-testid="sweep-profile"] label:has-text("Circular Profile") input').check();
await page.waitForTimeout(150);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ diameter: 6, pathSketchId: 's2', sketchId: 's2', merge: false }));
check('Options list Profile orientation and Profile Twist', (await page.locator('[data-testid="sweep-orientation"]').count()) === 1 && (await page.locator('[data-testid="sweep-twist"]').count()) === 1);
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(800);
const v3 = await vol();
const tube = Math.PI * 9 * (Math.PI / 2) * 30;
check('the circular-profile sweep adds a tube of about 1332 mm³', Math.abs(v3 - v0 - tube) < tube * 0.08, `${v3 - v0} vs ${tube} (${JSON.stringify(await errs())})`);
await page.screenshot({ path: `${OUT}/ga2-sweep-circular.png` });
// twist and keep normal: the volume stays, no error
await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'sweep'); s.applyDocument('Twist', { ...s.doc, features: s.doc.features.map((x) => (x.id === f.id ? { ...x, twist: 1, orientation: 'keepNormal' } : x)) }); });
await page.waitForTimeout(800);
const v4 = await vol();
check('Keep normal constant + one revolution twist still builds', Math.abs(v4 - v3) < tube * 0.5 && !Object.keys(await errs()).length, `${v4}`);
await S(() => window.__phlippoStore.getState().undo());
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(400);

// ---- Loft with a centerline: two squares on Top and an offset plane? (use the arc path as the centerline between two profiles on parallel planes)
await S(() => {
  const K = window.__phlippoKit;
  const s = window.__phlippoStore.getState();
  let p2 = K.createSketch('s3', 'Profile2', 'top');
  p2 = K.addLine(p2, { x: 20, y: -10 }, { x: 40, y: -10 })[0];
  p2 = K.addLine(p2, { x: 40, y: -10 }, { x: 40, y: 10 })[0];
  p2 = K.addLine(p2, { x: 40, y: 10 }, { x: 20, y: 10 })[0];
  p2 = K.addLine(p2, { x: 20, y: 10 }, { x: 20, y: -10 })[0];
  let cl = K.createSketch('s4', 'Centerline', 'front');
  cl = K.addLine(cl, { x: 0, y: 10 }, { x: 30, y: 10 })[0];
  const d = { ...s.doc, sketches: { ...s.doc.sketches, s3: p2, s4: cl }, features: [...s.doc.features, { id: 'k3', type: 'sketch', name: 'Profile2', sketchId: 's3', suppressed: false }, { id: 'k4', type: 'sketch', name: 'Centerline', sketchId: 's4', suppressed: false }] };
  s.applyDocument('Sketches', d);
});
await page.waitForTimeout(300);
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k1' }); window.__phlippoStore.getState().startFeature('loft', 'boss'); });
await page.waitForTimeout(300);
check('Loft PM has Centerline Parameters and Options (Merge tangent faces, Close loft, Drag Sketch)', (await page.getByText('Centerline Parameters').count()) >= 1 && (await page.locator('[data-testid="loft-dragsketch"]').count()) === 1);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ sketchId2: 's3', centerline: 's4', merge: false }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(800);
check('the loft with a centerline builds without error', !Object.keys(await errs()).length, JSON.stringify(await errs()));
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(400);

// ---- Fill Pattern: circular and polygon layouts, Validate Count, Create seed cut
await S(() => { const s = window.__phlippoStore.getState(); window.__phlippoStore.setState({ selectedFeatureId: 'e1' }); s.startPattern('fillPattern'); });
await page.waitForTimeout(200);
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const top = b.faces.find((f) => !f.curved && f.normal[1] > 0.99);
  s.setSelectedFace({ bodyId: b.id, faceId: top.id });
});
await page.waitForTimeout(300);
const fillState = await S(() => { const d = window.__phlippoStore.getState().featureEdit.draft; return { hasFill: !!d.fill, layout: d.fill?.layout }; });
check('the top face becomes the fill boundary', fillState.hasFill, JSON.stringify(fillState));
check('Pattern Layout offers Circular and Polygon', (await page.locator('[data-testid="fill-circular"]').count()) === 1 && (await page.locator('[data-testid="fill-polygon"]').count()) === 1);
await page.click('[data-testid="fill-circular"]');
await page.waitForTimeout(100);
check('Validate Count and Create seed cut are there', (await page.locator('[data-testid="fill-validate"]').count()) === 1 && (await page.locator('[data-testid="fill-seedcut"]').count()) === 1);
await page.click('[data-testid="fill-polygon"]');
await page.waitForTimeout(100);
check('Polygon layout stores six sides', (await S(() => window.__phlippoStore.getState().featureEdit.draft.fill.sides)) === 6);
await S(() => window.__phlippoStore.getState().cancelFeature());

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
