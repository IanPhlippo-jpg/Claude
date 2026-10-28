// Plastic part features (QA v0.5.1 F121) through the menus and the Property Panel: Dome on a face (round: sphere
// segment, Reverse into the body), Mounting Boss with fins and a screw hole, Snap Hook, Indent of a plate around a
// block, Lip/Groove on two shelled halves. Each feature lands in the tree with its own icon and survives a rebuild.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { menuPath } from './lib/menu.mjs';
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
const errs = () => S(() => JSON.stringify(window.__phlippoStore.getState().rebuild.errors));
/** volumes of the bodies (mm³), from their triangles */
const volumes = () => S(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => {
  const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry, p = g.getAttribute('position').array;
  let v = 0;
  for (let i = 0; i < p.length; i += 9) v += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
  return Math.round(v * 10) / 10;
}));
/** selects the face of a body whose outward normal is n and that lies farthest along it (largest first) */
const pickFace = (n, bodyIndex = 0, nearest = null) => S(({ n, bodyIndex, nearest }) => {
  const st = window.__phlippoStore.getState(), b = st.rebuild.bodies[bodyIndex];
  const faces = b.faces.filter((f) => !f.curved && f.normal[0] * n[0] + f.normal[1] * n[1] + f.normal[2] * n[2] > 0.99);
  const along = (f) => f.centroid[0] * n[0] + f.centroid[1] * n[1] + f.centroid[2] * n[2];
  const dist = (f) => Math.hypot(...f.centroid.map((c, k) => c - nearest[k]));
  faces.sort((a, c) => (nearest ? dist(a) - dist(c) : along(c) - along(a) || c.area - a.area));
  st.setSelectedFace({ bodyId: b.id, faceId: faces[0].id });
  return faces[0].id;
}, { n, bodyIndex, nearest });
const insert = async (label) => {
  await page.hover('.k-brand');
  await page.click('.k-mb-menu:has-text("Insert")');
  await page.waitForTimeout(150);
  await menuPath(page, label).click();
  await page.waitForTimeout(400);
};
const field = async (testid, v) => {
  const inp = page.locator(`[data-testid="${testid}"] input`).first();
  await inp.fill(String(v));
  await inp.press('Enter');
  await page.waitForTimeout(400);
};
/** puts the open feature's position at a corner of the body's face plane: (+-1, +-1) picks the corner */
const placeAt = (cu, cv) => S(({ cu, cv }) => {
  const st = window.__phlippoStore.getState(), d = st.featureEdit.draft, pl = st.doc.planes[d.plane];
  const p = st.rebuild.bodies[0].geometry.getAttribute('position');
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (let i = 0; i < p.count; i++) {
    const r = [p.getX(i) - pl.origin[0], p.getY(i) - pl.origin[1], p.getZ(i) - pl.origin[2]];
    const x = r[0] * pl.u[0] + r[1] * pl.u[1] + r[2] * pl.u[2], y = r[0] * pl.v[0] + r[1] * pl.v[1] + r[2] * pl.v[2];
    lo = [Math.min(lo[0], x), Math.min(lo[1], y)]; hi = [Math.max(hi[0], x), Math.max(hi[1], y)];
  }
  st.updateFeatureDraft({ point: { x: cu < 0 ? lo[0] + 14 : hi[0] - 14, y: cv < 0 ? lo[1] + 14 : hi[1] - 14 } });
}, { cu, cv });
const ok = async () => { await S(() => window.__phlippoStore.getState().commitFeature()); await page.waitForTimeout(700); };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// a plate 80 x 60 x 10 with a round pad Ø30 x 5 on it
await S(() => {
  const K = window.__phlippoKit;
  let s1 = K.createSketch('s1', 'Sketch1', 'top');
  const c = [{ x: -40, y: -30 }, { x: 40, y: -30 }, { x: 40, y: 30 }, { x: -40, y: 30 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  const d = K.createDocument('Behuizing');
  d.sketches = { s1, s2: K.addCircle(K.createSketch('s2', 'Sketch2', 'top'), { x: 20, y: 10 }, 15)[0] };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 15, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);
const v0 = (await volumes())[0];
check('the part opens: plate and round pad', Math.abs(v0 - (48000 + Math.PI * 225 * 5)) < 30, String(v0));
const up = await S(() => { const fs = window.__phlippoStore.getState().rebuild.bodies[0].faces.filter((x) => !x.curved).sort((a, b) => b.area - a.area).slice(0, 2); const d = (f) => f.centroid.reduce((s, c, k) => s + c * f.normal[k], 0); return (d(fs[0]) > d(fs[1]) ? fs[0] : fs[1]).normal.map((x) => Math.round(x)); });

// ---- Dome on the round top face of the pad: a sphere segment of 6 mm
await pickFace(up);
await insert('Features ▸ Dome…');
check('Insert ▸ Features ▸ Dome… opens the Dome panel with the picked face', (await page.locator('.k-pm-host').innerText()).includes('Dome') && /Face<\d+>/.test(await page.locator('[data-testid="dome-face"]').innerText()));
check('Elliptical dome is offered on a round face, Continuous dome is not', (await page.locator('[data-testid="dome-elliptical"]').isEnabled()) && !(await page.locator('[data-testid="dome-continuous"]').isEnabled()));
const clip = { x: 500, y: 250, width: 1300, height: 650 };
const before = await page.screenshot({ clip });
await field('dome-distance', 6);
await page.waitForTimeout(800);
check('the dome shows in the model while the panel is open (preview)', !before.equals(await page.screenshot({ clip })));
await page.screenshot({ path: `${OUT}/plastics-dome-pm.png` });
await ok();
const v1 = (await volumes())[0];
const cap = (Math.PI * 36 * (3 * ((225 + 36) / 12) - 6)) / 3;
check('Dome1 adds the sphere segment (Ø30, 6 high)', Math.abs(v1 - v0 - cap) / cap < 0.03, `${v1 - v0} vs ${cap.toFixed(1)}`);
check('Dome1 is in the tree with its icon', (await page.locator('.k-tree-row:has-text("Dome1")').count()) === 1);
// edit: Reverse makes it a dimple
await S(() => { const st = window.__phlippoStore.getState(); const f = st.doc.features.find((x) => x.type === 'dome'); st.editFeature(f.id); });
await page.waitForTimeout(400);
await page.locator('[data-testid="dome-reverse"]').click();
await page.waitForTimeout(400);
await ok();
const v2 = (await volumes())[0];
check('Reverse Direction makes the dome a dimple in the pad', Math.abs(v0 - v2 - cap) / cap < 0.03, `${v0 - v2}`);
check('no rebuild errors after the dome', (await errs()) === '{}', await errs());

// ---- Mounting Boss on the plate top, at (-20, -10) in the face, with 4 fins and a Ø3.5 hole
await pickFace(up, 0, [-25, 10, 0].map((x, k) => (up[k] ? 10 : x)));
await insert('Fastening Feature ▸ Mounting Boss…');
await placeAt(-1, -1);
await page.waitForTimeout(500);
check('Insert ▸ Fastening Feature ▸ Mounting Boss… opens its panel', (await page.locator('.k-pm-host').innerText()).includes('Mounting Boss') && (await page.locator('[data-testid="mb-fins"]').count()) === 1);
await page.screenshot({ path: `${OUT}/plastics-boss-pm.png` });
const vb0 = (await volumes())[0];
await ok();
const vb1 = (await volumes())[0];
check('Mounting Boss1 adds the boss with fins, less the hole', vb1 - vb0 > 700 && vb1 - vb0 < 1300, `${(vb1 - vb0).toFixed(1)}`);
check('Mounting Boss1 is in the tree', (await page.locator('.k-tree-row:has-text("Mounting Boss1")').count()) === 1);
check('no rebuild errors after the mounting boss', (await errs()) === '{}', await errs());

// ---- Snap Hook on the plate top
await pickFace(up, 0, [30, -20, 0].map((x, k) => (up[k] ? 10 : x)));
await insert('Fastening Feature ▸ Snap Hook…');
await placeAt(1, -1);
await field('sh-height', 15);
const vs0 = (await volumes())[0];
await ok();
const vs1 = (await volumes())[0];
const hook = (2 * 15 + 1.5 * 0.6 + 0.5 * 1.5 * 2.4) * 6;
check('Snap Hook1 adds the beam and its lip', Math.abs(vs1 - vs0 - hook) < 6, `${(vs1 - vs0).toFixed(1)} vs ${hook}`);
check('no rebuild errors after the snap hook', (await errs()) === '{}', await errs());
await page.screenshot({ path: `${OUT}/plastics-part.png` });

// ---- Indent: a plate and a block pressed half into it (two bodies), the plate wraps around the block
await S(() => {
  const K = window.__phlippoKit;
  const rect = (id, name, x0, y0, x1, y1) => { let sk = K.createSketch(id, name, 'top'); const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]; for (let i = 0; i < 4; i++) sk = K.addLine(sk, c[i], c[(i + 1) % 4])[0]; return sk; };
  const d = K.createDocument('Indent');
  d.sketches = { s1: rect('s1', 'Sketch1', -50, -50, 50, 50), s2: rect('s2', 'Sketch2', -5, -5, 5, 5) };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Plate', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 4, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Block', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 12, reverse: false, merge: false, direction2: { end: 'blind', depth: 2 } },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);
check('plate and block are two bodies', (await volumes()).length === 2, JSON.stringify(await volumes()));
await insert('Features ▸ Indent…');
check('the Indent panel asks for the target body first', (await page.locator('[data-testid="indent-target"]').getAttribute('class')).includes('focus'));
await S(() => { const st = window.__phlippoStore.getState(); const b = st.rebuild.bodies.find((x) => x.featureIds.includes('e1')); st.setSelectedFace({ bodyId: b.id, faceId: b.faces[0].id }); });
await page.waitForTimeout(200);
await S(() => { const st = window.__phlippoStore.getState(); const b = st.rebuild.bodies.find((x) => x.featureIds.includes('e2')); st.setSelectedFace({ bodyId: b.id, faceId: b.faces[0].id }); });
await page.waitForTimeout(400);
check('target Plate and tool Block are filled in', (await page.locator('[data-testid="indent-target"]').innerText()).includes('Plate') && (await page.locator('[data-testid="indent-tool"]').innerText()).includes('Block'));
await field('indent-thickness', 1);
await field('indent-clearance', 0.5);
await page.screenshot({ path: `${OUT}/plastics-indent-pm.png` });
await ok();
const vi = await S(() => { const st = window.__phlippoStore.getState(); return st.rebuild.bodies.map((b) => b.featureIds.join(',')); });
const vols = await volumes();
// pocket: block grown 0.5 (11 x 11) through the plate's 4 mm; wall: grown 1.5 (13 x 13) minus grown 0.5, above (10.5 - 4 = 6.5 + 1) and below (2.5 - 0 ... )
const plateVol = vols[vi.findIndex((x) => x.includes('e1'))];
check('Indent1 changes the plate: pocket for the block, wall around it', plateVol > 40000 - 11 * 11 * 4 && Math.abs(plateVol - 40000) > 50, `${plateVol} ${JSON.stringify(vols)}`);
check('no rebuild errors after the indent', (await errs()) === '{}', await errs());
await page.screenshot({ path: `${OUT}/plastics-indent.png` });

// ---- Lip/Groove: two open frames (a box's halves) meeting at their rims
await S(() => {
  const K = window.__phlippoKit;
  const frame = (id, name) => {
    let sk = K.createSketch(id, name, 'top');
    for (const [x0, y0, x1, y1] of [[-30, -20, 30, 20], [-28, -18, 28, 18]]) { const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]; for (let i = 0; i < 4; i++) sk = K.addLine(sk, c[i], c[(i + 1) % 4])[0]; }
    return sk;
  };
  const d = K.createDocument('Doos');
  d.sketches = { s1: frame('s1', 'Sketch1'), s2: frame('s2', 'Sketch2') };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Upper', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 15, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Lower', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: true, merge: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);
const lv0 = await volumes();
check('the two halves are two bodies', lv0.length === 2, JSON.stringify(lv0));
const rim = (featureId, sign) => S(({ featureId, sign, n }) => {
  const st = window.__phlippoStore.getState(), b = st.rebuild.bodies.find((x) => x.featureIds.includes(featureId));
  // the rim at the joint (on the sketch plane): normal along -n for the upper half, +n for the lower
  const f = b.faces.find((x) => !x.curved && Math.round(x.normal[0] * n[0] + x.normal[1] * n[1] + x.normal[2] * n[2]) === sign && Math.abs(x.centroid[0] * n[0] + x.centroid[1] * n[1] + x.centroid[2] * n[2]) < 1e-6);
  st.setSelectedFace({ bodyId: b.id, faceId: f.id });
}, { featureId, sign, n: up.map(Math.abs) });
await insert('Fastening Feature ▸ Lip/Groove…');
check('the Lip/Groove panel asks for the groove rim first', (await page.locator('[data-testid="lg-groove"]').getAttribute('class')).includes('focus'));
await rim('e1', -1);
await page.waitForTimeout(200);
await rim('e2', 1);
await page.waitForTimeout(500);
check('groove and lip rim faces are filled in', /Face<\d+>/.test(await page.locator('[data-testid="lg-groove"]').innerText()) && /Face<\d+>/.test(await page.locator('[data-testid="lg-lip"]').innerText()));
await page.screenshot({ path: `${OUT}/plastics-lg-pm.png` });
await ok();
const lv1 = await volumes();
const ids = await S(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => b.featureIds.join(',')));
const upper = (v) => v[ids.findIndex((x) => x.startsWith('e1'))], lower = (v) => v[ids.findIndex((x) => x.startsWith('e2'))];
// lip 1 wide x 2 high along the inner opening (56 x 36); groove 1.1 wide x 2.1 deep
const lipVol = (58 * 38 - 56 * 36) * 2, grooveVol = (58.2 * 38.2 - 56 * 36) * 2.1;
check('the lower half gets the lip', Math.abs(lower(lv1) - lower(lv0) - lipVol) < 15, `${(lower(lv1) - lower(lv0)).toFixed(1)} vs ${lipVol}`);
check('the upper half gets the groove (with the gap)', Math.abs(upper(lv0) - upper(lv1) - grooveVol) < 15, `${(upper(lv0) - upper(lv1)).toFixed(1)} vs ${grooveVol.toFixed(1)}`);
check('Lip&Groove1 is in the tree', (await page.locator('.k-tree-row:has-text("Lip&Groove1")').count()) === 1);
check('no rebuild errors after the lip and groove', (await errs()) === '{}', await errs());
await page.screenshot({ path: `${OUT}/plastics-lg.png` });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
