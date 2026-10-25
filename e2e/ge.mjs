// Block G-E (Sheet Metal extras): the Sheet Metal tab in the original's order, Profile Sketch check, Vent, Forming Tool,
// Sheet Metal Gusset, Simple Hole, Extruded Cut sheet metal options (Link to thickness / Normal cut / Optimize geometry),
// Insert Bends, Tab and Slot, Rip, Swept Flange.
import { chromium } from 'playwright';
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const vol = () => S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6; } return a + Math.abs(v); }, 0); });
const errs = () => S(() => window.__phlippoStore.getState().rebuild.errors);
const names = () => S(() => window.__phlippoStore.getState().doc.features.map((f) => f.name));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(400);
await page.click('.k-doctype:has-text("Part")');

// ---- an L sheet from an open profile (as hem.mjs), Mid Plane 60 wide: horizontal leg x 0..40 (y 0..3), vertical leg at x 40 (y up to 30)
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const p0 = await P(0, 0), p1 = await P(40, 0), p2 = await P(40, 30);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(p0.x, p0.y);
await page.mouse.click(p1.x, p1.y);
await page.mouse.click(p2.x, p2.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Sheet Metal")');
// the tab in the original's order
for (const l of ['Base Flange/Tab', 'Convert to Sheet Metal', 'Lofted-Bend', 'Swept Flange', 'Edge Flange', 'Miter Flange', 'Hem', 'Jog', 'Sketched Bend', 'Cross-Break', 'Corners', 'Forming Tool', 'Extruded Cut', 'Simple Hole', 'Vent', 'Sheet Metal Gusset', 'Tab and Slot', 'Rip', 'Flatten', 'Unfold', 'Fold', 'No Bends', 'Insert Bends']) {
  check(`Sheet Metal tab has ${l}`, (await page.locator(`.k-cm-group :text-is("${l}")`).count()) >= 1);
}
await shot('ge0-sheetmetal-tab');
await page.click('.k-cm-big:has-text("Base Flange/Tab") .k-cm-main');
await page.waitForTimeout(500);
check('Base Flange PM: Profile Sketch check says the sketch is valid', (await page.locator('[data-testid="bf-sketchcheck"]').innerText()) === 'The sketch is valid.');
await page.locator('.k-section:has-text("Direction 1") select').first().selectOption('midPlane');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const v0 = await vol();
check('Base-Flange1 built (Mid Plane)', v0 > 10000 && Object.keys(await errs()).length === 0, `${v0.toFixed(0)} ${JSON.stringify(await errs())}`);

// ---- Vent: a sketch on the Top plane (circle r 10 at x 20, two ribs, a spar r 5)
await S(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  let sk = K.createSketch('vent1', 'VentSketch', 'top');
  sk = K.addCircle(sk, { x: 20, y: 0 }, 10)[0];
  sk = K.addCircle(sk, { x: 20, y: 0 }, 5)[0];
  sk = K.addLine(sk, { x: 10, y: 0 }, { x: 30, y: 0 })[0];
  sk = K.addLine(sk, { x: 20, y: -10 }, { x: 20, y: 10 })[0];
  const d = st.doc;
  const fp = d.features.findIndex((f) => f.type === 'flatPattern');
  const feats = d.features.slice();
  feats.splice(fp < 0 ? feats.length : fp, 0, { id: 'kv', type: 'sketch', name: 'VentSketch', sketchId: 'vent1', suppressed: false });
  st.openDocument({ ...d, sketches: { ...d.sketches, vent1: sk }, features: feats });
});
await page.waitForTimeout(600);
const vBefore = await vol();
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Vent")');
await page.waitForTimeout(400);
check('Vent PM: Boundary, Geometry Properties, Flow Area, Ribs, Spars, Fill-In Boundary', (await page.locator('.k-pm-title:has-text("Vent")').count()) >= 1 && (await page.locator('.k-section-name:text-is("Flow Area")').count()) === 1 && (await page.locator('.k-section-name:text-is("Fill-In Boundary")').count()) === 1, await page.locator('.k-pm-title').innerText().catch(() => '?'));
await page.locator('[data-testid="vent-sketch"]').selectOption('vent1');
await page.waitForTimeout(600);
check('Vent lists 2 ribs and 1 spar', (await page.locator('[data-testid="vent-ribs"] .k-selbox-row').count()) === 2 && (await page.locator('[data-testid="vent-spars"] .k-selbox-row').count()) === 1, await page.locator('[data-testid="vent-flow"]').innerText().catch(() => '?'));
await shot('ge1-vent-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vVent = await vol();
// open area: pi 100 - ribs (2·20·3 - 9) - spar ring (pi(6.5² - 3.5²) ≈ 94) + the ring/rib overlaps (~4·3·3) ≈ 314 - 111 - 94 + 36 ≈ 145 → × 3 thick
check('Vent1 cuts the open area through the sheet (≈ 145 mm² × 3)', vBefore - vVent > 300 && vBefore - vVent < 600 && !(await errs()).length, `${(vBefore - vVent).toFixed(0)} ${JSON.stringify(await errs())}`);
check('tree: Vent1', (await names()).includes('Vent1'));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('ge2-vent');

// ---- Forming Tool: a small circular emboss on the top face of the horizontal leg, away from the vent
const topFace = await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.filter((x) => !x.curved && x.normal[1] > 0.99).sort((a, c) => c.area - a.area)[0];
  if (!f) return null;
  s.setSelectedFace({ bodyId: b.id, faceId: f.id });
  return f.centroid;
});
check('the top face of the leg is selected', !!topFace);
await page.click('.k-cm-small:has-text("Forming Tool")');
await page.waitForTimeout(400);
check('Form Tool Feature PM: Type/Position tabs, Placement Face, Forming Tool (Design Library list), Flat Pattern Visibility', (await page.locator('.k-pm-title:has-text("Form Tool Feature")').count()) === 1 && (await page.locator('[data-testid="form-shape"] option').count()) === 6 && (await page.locator('.k-section:has-text("Flat Pattern Visibility")').count()) === 1);
check('the placement face is filled in', (await page.locator('[data-testid="form-face"] .k-selbox-row').count()) === 1);
await S(() => { const st = window.__phlippoStore.getState(); st.updateFeatureDraft({ width: 8, length: 8, height: 4 }); st.addFormToolPoint({ x: 0, y: 18 }); });
await page.waitForTimeout(500);
await page.locator('.k-pm-tabs button:has-text("Position")').click();
check('Position tab lists the placed point', (await page.locator('[data-testid="form-points"] .k-selbox-row').count()) === 1);
await shot('ge3-formtool-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vForm = await vol();
// net: pi·16·4 (bump above the sheet) - pi·1·4 (hollow r 1) ≈ 188
check('circular emboss1 adds a hollow bump (≈ 188 mm³)', vForm - vVent > 120 && vForm - vVent < 260 && !Object.keys(await errs()).length, `${(vForm - vVent).toFixed(0)} ${JSON.stringify(await errs())}`);
check('tree: circular emboss1', (await names()).includes('circular emboss1'));
await shot('ge4-formtool');

// ---- Sheet Metal Gusset across the bend: the top face of the leg and the inner face of the upright
await page.click('.k-cm-small:has-text("Sheet Metal Gusset")');
await page.waitForTimeout(400);
check('Sheet Metal Gusset PM: Position, Profile (Indent depth / Profile dimensions), Dimensions, Preview, Flat Pattern Visibility', (await page.locator('.k-pm-title:has-text("Sheet Metal Gusset")').count()) === 1 && (await page.locator('.k-section:has-text("Profile")').count()) >= 1 && (await page.locator('.k-section:has-text("Preview")').count()) === 1);
const gussetFaces = await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const top = b.faces.filter((x) => !x.curved && x.normal[1] > 0.99).sort((a, c) => c.area - a.area)[0];
  const inner = b.faces.filter((x) => !x.curved && x.normal[0] < -0.99).sort((a, c) => c.area - a.area)[0];
  if (!top || !inner) return null;
  s.setSelectedFace({ bodyId: b.id, faceId: top.id });
  s.setSelectedFace({ bodyId: b.id, faceId: inner.id }, true);
  return window.__phlippoStore.getState().featureEdit?.draft?.faces?.length ?? 0;
});
check('two faces picked for the gusset', gussetFaces === 2, String(gussetFaces));
await shot('ge5a-gusset-before');
const gDepth = page.locator('.k-section:has-text("Profile") input.k-num').first();
await gDepth.fill('8');
await gDepth.press('Enter');
await page.waitForTimeout(600);
await shot('ge5-gusset-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vGusset = await vol();
check('Sheet Metal Gusset1 is pressed across the bend (volume changes, no error)', Math.abs(vGusset - vForm) > 5 && !Object.keys(await errs()).length, `${(vGusset - vForm).toFixed(0)} ${JSON.stringify(await errs())}`);
check('tree: Sheet Metal Gusset1', (await names()).includes('Sheet Metal Gusset1'));
await shot('ge6-gusset');

// ---- Simple Hole on the top face
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.filter((x) => !x.curved && x.normal[1] > 0.99).sort((a, c) => c.area - a.area)[0];
  s.setSelectedFace({ bodyId: b.id, faceId: f.id });
});
await page.click('.k-cm-small:has-text("Simple Hole")');
await page.waitForTimeout(400);
check('Simple Hole PM: title Hole, Direction 1 (Blind/Through All) and the diameter, no Hole Wizard pages', (await page.locator('.k-pm-title').innerText()).trim().startsWith('Hole') && (await page.locator('.k-section-name:text-is("Direction 1")').count()) === 1 && (await page.locator('[data-testid="hole-types"]').count()) === 0, await page.locator('.k-pm-title').innerText());
await S(() => window.__phlippoStore.getState().addHolePoint({ x: 0, y: -18 }));
await page.waitForTimeout(400);
await shot('ge7-simplehole-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vHole = await vol();
check('Hole1: a 6.6 through hole (≈ 103 mm³)', vGusset - vHole > 80 && vGusset - vHole < 130 && (await names()).includes('Hole1'), `${(vGusset - vHole).toFixed(0)} ${(await names()).join(',')}`);

// ---- Extruded Cut on a sheet metal part: Link to thickness / Normal cut / Optimize geometry
await S(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  let sk = K.createSketch('cut1', 'CutSketch', 'top');
  sk = K.addLine(sk, { x: 2, y: -25 }, { x: 8, y: -25 })[0];
  sk = K.addLine(sk, { x: 8, y: -25 }, { x: 8, y: -19 })[0];
  sk = K.addLine(sk, { x: 8, y: -19 }, { x: 2, y: -19 })[0];
  sk = K.addLine(sk, { x: 2, y: -19 }, { x: 2, y: -25 })[0];
  const d = st.doc;
  const fp = d.features.findIndex((f) => f.type === 'flatPattern');
  const feats = d.features.slice();
  feats.splice(fp < 0 ? feats.length : fp, 0, { id: 'kc', type: 'sketch', name: 'CutSketch', sketchId: 'cut1', suppressed: false });
  st.openDocument({ ...d, sketches: { ...d.sketches, cut1: sk }, features: feats });
  window.__phlippoStore.getState().setSelectedFeature('kc');
});
await page.waitForTimeout(500);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Extruded Cut")');
await page.waitForTimeout(400);
check('Extruded Cut PM on a sheet metal part: Link to thickness, Normal cut, Optimize geometry', (await page.locator('[data-testid="cut-linkthickness"]').count()) === 1 && (await page.locator('[data-testid="cut-normal"]').isChecked()) && (await page.locator('[data-testid="cut-optimize"]').isChecked()));
await page.locator('[data-testid="cut-linkthickness"]').check();
await page.waitForTimeout(400);
check('Link to thickness sets the depth to the sheet thickness (3)', (await S(() => window.__phlippoStore.getState().featureEdit?.draft?.depth)) === 3);
await page.locator('[data-testid="cut-normal"]').uncheck();
check('Optimize geometry is greyed when Normal cut is off', await page.locator('[data-testid="cut-optimize"]').isDisabled());
await page.locator('[data-testid="cut-normal"]').check();
await shot('ge8-cut-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vCut = await vol();
check('Cut-Extrude linked to thickness removes 6 × 6 × 3', Math.abs(vHole - vCut - 108) < 6 && !Object.keys(await errs()).length, `${(vHole - vCut).toFixed(0)} ${JSON.stringify(await errs())}`);

// ---- Insert Bends: the alias of Convert to Sheet Metal with its own PM title
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Insert Bends")');
await page.waitForTimeout(400);
check('Insert Bends PM: title Bends with the message about the fixed face', (await page.locator('.k-pm-title').innerText()).trim().startsWith('Bends') && (await page.locator('.k-section:has-text("Message")').count()) === 1);
check('the draft is named Process-Bends1', (await S(() => window.__phlippoStore.getState().featureEdit?.draft?.name)) === 'Process-Bends1');
await page.click('.k-pm-cancel');
await page.waitForTimeout(300);

// ---- Tab and Slot: two plates (the upright beyond the edge of the flat plate)
const twoPlates = () => S(() => {
  const K = window.__phlippoKit;
  let a = K.createSketch('a', 'Plate', 'top');
  a = K.addLine(a, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  a = K.addLine(a, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  a = K.addLine(a, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  a = K.addLine(a, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  let b = K.createSketch('b', 'Upright', 'front');
  b = K.addLine(b, { x: 30, y: -20 }, { x: 33, y: -20 })[0];
  b = K.addLine(b, { x: 33, y: -20 }, { x: 33, y: 20 })[0];
  b = K.addLine(b, { x: 33, y: 20 }, { x: 30, y: 20 })[0];
  b = K.addLine(b, { x: 30, y: 20 }, { x: 30, y: -20 })[0];
  const d = K.createDocument('Tabs');
  d.sketches = { a, b };
  d.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  d.features = [
    { id: 'ka', type: 'sketch', name: 'Plate', sketchId: 'a', suppressed: false },
    { id: 'kb', type: 'sketch', name: 'Upright', sketchId: 'b', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 3, reverse: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'b', suppressed: false, op: 'boss', end: 'midPlane', depth: 40, reverse: false, merge: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await twoPlates();
await page.waitForTimeout(800);
const twoBodies = await S(() => window.__phlippoStore.getState().rebuild.bodies.length);
check('two separate bodies (Merge result off)', twoBodies === 2, String(twoBodies));
const vTS0 = await vol();
const tabEdge = await S(() => {
  const s = window.__phlippoStore.getState();
  const all = s.rebuild.bodies.flatMap((b) => b.edges);
  const e = all.find((x) => x.straight && Math.abs(x.centroid.x - 30) < 0.2 && Math.abs(x.centroid.y - 3) < 0.2 && Math.abs(x.length - 40) < 0.5);
  if (!e) return null;
  s.toggleSelectedEdge(e.id);
  return e.id;
});
check('the top edge of the plate at the upright is selected', !!tabEdge);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Tab and Slot")');
await page.waitForTimeout(400);
check('Tab and Slot PM: Selection (tab edge, slot face), Offset, Spacing, Tab, Slot', (await page.locator('.k-pm-title:has-text("Tab and Slot")').count()) === 1 && (await page.locator('[data-testid="ts-edge"] .k-selbox-row').count()) === 1 && (await page.locator('.k-section:has-text("Spacing")').count()) === 1);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ edgeOffset: 2 }));
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies.find((x) => x.faces.some((f) => !f.curved && f.normal[0] < -0.99 && Math.abs(f.centroid[0] - 30) < 0.2 && f.area > 1000));
  const f = b.faces.find((x) => !x.curved && x.normal[0] < -0.99 && Math.abs(x.centroid[0] - 30) < 0.2 && x.area > 1000);
  s.setSelectedFace({ bodyId: b.id, faceId: f.id });
});
await page.waitForTimeout(500);
check('the slot face is filled in', (await page.locator('[data-testid="ts-face"] .k-selbox-row').count()) === 1);
await shot('ge9-tabslot-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(1000);
const vTS1 = await vol();
// tabs add 3 × 10 × 3 × 3 = 270, slots remove 3 × 10.2 × 3.2 × 3 ≈ 294
check('Tab and Slot1: tabs on the plate, slots through the upright (net ≈ -24 mm³, still two bodies)', Math.abs(vTS1 - vTS0 + 24) < 20 && (await S(() => window.__phlippoStore.getState().rebuild.bodies.length)) === 2 && !Object.keys(await errs()).length, `${(vTS1 - vTS0).toFixed(1)} ${JSON.stringify(await errs())}`);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('ge10-tabslot');

// ---- Rip on an open box (outer boss, inner cut through all)
await S(() => {
  const K = window.__phlippoKit;
  let o = K.createSketch('o', 'Outer', 'top');
  o = K.addLine(o, { x: -20, y: -20 }, { x: 20, y: -20 })[0];
  o = K.addLine(o, { x: 20, y: -20 }, { x: 20, y: 20 })[0];
  o = K.addLine(o, { x: 20, y: 20 }, { x: -20, y: 20 })[0];
  o = K.addLine(o, { x: -20, y: 20 }, { x: -20, y: -20 })[0];
  let i = K.createSketch('i', 'Inner', 'top');
  i = K.addLine(i, { x: -18, y: -18 }, { x: 18, y: -18 })[0];
  i = K.addLine(i, { x: 18, y: -18 }, { x: 18, y: 18 })[0];
  i = K.addLine(i, { x: 18, y: 18 }, { x: -18, y: 18 })[0];
  i = K.addLine(i, { x: -18, y: 18 }, { x: -18, y: -18 })[0];
  const d = K.createDocument('Koker');
  d.sketches = { o, i };
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
  d.features = [
    { id: 'ko', type: 'sketch', name: 'Outer', sketchId: 'o', suppressed: false },
    { id: 'ki', type: 'sketch', name: 'Inner', sketchId: 'i', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'o', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false },
    { id: 'e2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'i', suppressed: false, op: 'cut', end: 'throughAllBoth', depth: 0, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const vRip0 = await vol();
const ripEdge = await S(() => {
  const s = window.__phlippoStore.getState();
  const all = s.rebuild.bodies.flatMap((b) => b.edges);
  const e = all.find((x) => x.straight && Math.abs(x.length - 40) < 0.5 && Math.abs(x.centroid.x - 20) < 0.2 && Math.abs(x.centroid.z - 20) < 0.2);
  if (!e) return null;
  s.toggleSelectedEdge(e.id);
  return e.id;
});
check('a vertical corner edge of the box is selected', !!ripEdge);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Rip")');
await page.waitForTimeout(400);
check('Rip PM: Rip Parameters with the edge, Change Direction buttons and the rip gap', (await page.locator('.k-pm-title').innerText()).trim().startsWith('Rip') && (await page.locator('[data-testid="rip-edges"] .k-selbox-row').count()) === 1 && (await page.locator('[data-testid="rip-both"]').count()) === 1);
const ripGap = page.locator('.k-section:has-text("Rip Parameters") input.k-num').first();
await ripGap.fill('0.5');
await ripGap.press('Enter');
await page.waitForTimeout(500);
await shot('ge11-rip-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vRip1 = await vol();
// removed: len · t · (t + g) = 40 · 2 · 2.5 = 200
check('Rip1 cuts the corner open by the gap (≈ 200 mm³)', Math.abs(vRip0 - vRip1 - 200) < 20 && !Object.keys(await errs()).length, `${(vRip0 - vRip1).toFixed(0)} ${JSON.stringify(await errs())}`);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('ge12-rip');

// ---- Swept Flange: a flat plate, an open profile on the Front plane at the plate's right end, path along the end edge
await S(() => {
  const K = window.__phlippoKit;
  let a = K.createSketch('a', 'Plate', 'top');
  a = K.addLine(a, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  a = K.addLine(a, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  a = K.addLine(a, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  a = K.addLine(a, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  let pr = K.createSketch('pr', 'Profile', 'front');
  pr = K.addLine(pr, { x: 30, y: 3 }, { x: 30, y: 15 })[0];
  pr = K.addLine(pr, { x: 30, y: 15 }, { x: 20, y: 15 })[0];
  const d = K.createDocument('Zoom');
  d.sketches = { a, pr };
  d.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  d.features = [
    { id: 'ka', type: 'sketch', name: 'Plate', sketchId: 'a', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 3, reverse: false },
    { id: 'kp', type: 'sketch', name: 'Profile', sketchId: 'pr', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const vSF0 = await vol();
const pathEdge = await S(() => {
  const s = window.__phlippoStore.getState();
  const all = s.rebuild.bodies.flatMap((b) => b.edges);
  const e = all.find((x) => x.straight && Math.abs(x.centroid.x - 30) < 0.2 && Math.abs(x.centroid.y - 3) < 0.2 && Math.abs(x.length - 40) < 0.5);
  if (!e) return null;
  s.toggleSelectedEdge(e.id);
  return e.id;
});
check('the top end edge of the plate is selected as the path', !!pathEdge);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Swept Flange")');
await page.waitForTimeout(400);
check('Swept Flange PM: Profile and Path (sketch selects, edges box), Sheet Metal Parameters, Flat Pattern Options', (await page.locator('.k-pm-title:has-text("Swept Flange")').count()) === 1 && (await page.locator('[data-testid="sf-edges"] .k-selbox-row').count()) === 1 && (await page.locator('.k-section:has-text("Flat Pattern Options")').count()) === 1);
await page.locator('[data-testid="sf-profile"]').selectOption('pr');
await page.waitForTimeout(700);
await shot('ge13-sweptflange-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(1000);
const vSF1 = await vol();
// the thin profile (12 up + 10 across, 3 thick) swept 40 along the edge: ≈ (12 + 10) · 3 · 40 ≈ 2640 (minus the corner overlap)
check('Swept Flange1 sweeps the sheet profile along the edge (≈ 2500 mm³)', vSF1 - vSF0 > 2000 && vSF1 - vSF0 < 3000 && !Object.keys(await errs()).length, `${(vSF1 - vSF0).toFixed(0)} ${JSON.stringify(await errs())}`);
check('tree: Swept Flange1', (await names()).includes('Swept Flange1'));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('ge14-sweptflange');

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
