// Drag Handles, part 2 (docs/32 item 6): Mid Plane and Direction 2 ends, thin and Offset From Surface ends, snapping
// to model geometry (vertex on the ruler, a drop on a parallel face makes Up To Surface), Esc cancels, Alt fine steps,
// shell / pattern / hole / draft values, and the sketch of an extrusion dragged from the model (a dimensioned line
// changes its dimension, one undo step). Real mouse drags (page.mouse.down/move/up) on the handles.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { frames, settle } from './lib/wait.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
const SHOTS = process.env.E2E_SHOTS ?? OUT;
mkdirSync(OUT, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
await settle(page);

// helpers in the page: a rectangle sketch (sketch x, y; Top plane: world x, -z) with optional length dimensions
await page.evaluate(() => {
  const K = window.__phlippoKit;
  window.__dh2 = {
    rect(id, plane, x0, y0, x1, y1, dims) {
      let s = K.createSketch(id, id, plane);
      const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const ids = [];
      let first = null, prev = null;
      for (let i = 0; i < 4; i++) {
        const [n, l] = K.addLine(s, prev ?? { x: c[i][0], y: c[i][1] }, i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first);
        s = n; first ??= l.p1; prev = l.p2; ids.push(l.id);
      }
      s = K.addConstraint(s, 'horizontal', [ids[0]])[0];
      s = K.addConstraint(s, 'vertical', [ids[1]])[0];
      s = K.addConstraint(s, 'horizontal', [ids[2]])[0];
      s = K.addConstraint(s, 'vertical', [ids[3]])[0];
      if (dims) {
        s = K.addConstraint(s, 'length', [ids[0]], { value: Math.abs(x1 - x0) })[0];
        s = K.addConstraint(s, 'length', [ids[1]], { value: Math.abs(y1 - y0) })[0];
      }
      return { s, ids };
    },
    open(name, sketches, features, planes = {}) {
      const d = { ...K.createDocument(name), sketches, planes: { ...K.createDocument(name).planes, ...planes } };
      d.features = features;
      window.__phlippoStore.getState().openDocument(d);
    },
    faceAt(normal, coord, axis) {
      const s = window.__phlippoStore.getState();
      for (const b of s.rebuild.bodies) {
        const f = b.faces.find((x) => !x.curved && x.normal[axis] * normal > 0.99 && Math.abs(x.centroid[axis] - coord) < 1e-3);
        if (f) return { bodyId: b.id, faceId: f.id };
      }
      return null;
    },
  };
});
const st = (fn, arg) => page.evaluate(fn, arg);
const feat = (id) => st((fid) => window.__phlippoStore.getState().doc.features.find((f) => f.id === fid), id);
const bbox = () => st(() => {
  const bs = window.__phlippoStore.getState().rebuild.bodies;
  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const b of bs) { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; ['x', 'y', 'z'].forEach((k, i) => { box.min[i] = Math.min(box.min[i], bb.min[k]); box.max[i] = Math.max(box.max[i], bb.max[k]); }); }
  return { min: box.min.map((v) => Math.round(v * 100) / 100), max: box.max.map((v) => Math.round(v * 100) / 100), errors: Object.keys(window.__phlippoStore.getState().rebuild.errors).length };
});
const vol = () => st(() => {
  let v = 0;
  for (const b of window.__phlippoStore.getState().rebuild.bodies) {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const a = g.getAttribute('position');
    for (let i = 0; i + 2 < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; }
  }
  return Math.abs(v);
});
const selectFace = async (normal, coord, axis = 1) => { const ok = await st(([n, c, a]) => { const f = window.__dh2.faceAt(n, c, a); window.__phlippoStore.setState({ selectedFeatureId: null, selectedFace: f, selectedFaces: [] }); return !!f; }, [normal, coord, axis]); await frames(page, 2); return ok; };
const selectFeature = async (id) => { await st((fid) => { window.__phlippoStore.setState({ selectedFace: null, selectedFaces: [] }); window.__phlippoStore.getState().setSelectedFeature(fid); }, id); await frames(page, 2); };
const view = async () => { await page.keyboard.press('Control+7'); await page.keyboard.press('f'); await settle(page); };
const has = async (id) => (await page.locator(`[data-testid="${id}"]`).count()) === 1;

/** presses the grip, drags it `delta` units of its value along its arrow, returns the readout; options: Alt held, a
 * screenshot while dragging, Esc instead of releasing, or a pointer target to end on (page pixels) */
async function drag(grip, delta, { layer, alt = false, name, esc = false, to = null } = {}) {
  const el = page.locator(`[data-testid="${grip}"]`);
  const shown = await el.waitFor({ timeout: 10000 }).then(() => true, () => false);
  if (!shown) return null;
  const m = await el.evaluate((e) => ({ ux: Number(e.dataset.ux), uy: Number(e.dataset.uy), k: Number(e.dataset.pxPerUnit) }));
  const b = await el.boundingBox();
  const gx = b.x + b.width / 2, gy = b.y + b.height / 2;
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  if (alt) await page.keyboard.down('Alt');
  const dx = m.ux * m.k * delta, dy = m.uy * m.k * delta;
  await page.mouse.move(gx + dx / 2, gy + dy / 2, { steps: 5 });
  await page.mouse.move(to ? to.x : gx + dx, to ? to.y : gy + dy, { steps: 5 });
  await frames(page, 3);
  const text = await page.locator(`[data-testid="${layer}-value"]`).textContent().catch(() => '');
  if (name) await shot(name);
  if (alt) await page.keyboard.up('Alt');
  if (esc) await page.keyboard.press('Escape');
  await page.mouse.up();
  await settle(page);
  return text;
}

// 1. Mid Plane: the picked top face shows its handle and the one on the bottom face; 20 -> 30 grows 5 mm each way
await st(() => {
  const r = window.__dh2.rect('s1', 'top', 0, 0, 80, -60, false);
  window.__dh2.open('Mid', { s1: r.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'midPlane', depth: 20, reverse: false }]);
});
await settle(page);
await view();
check('Mid Plane: the top face can be picked', await selectFace(1, 10));
check('Mid Plane: a handle on each end face', (await has('dragHandles-grip')) && (await has('dragHandles-grip-mid-')));
await shot('handles-midplane');
// the drag is in value units: 10 more on the total is 5 mm of travel of one end
const mid = await drag('dragHandles-grip', 10, { layer: 'dragHandles', name: 'handles-midplane-drag' });
const bm = await bbox();
check('Mid Plane: dragging the top handle 5 mm makes the total 30 mm (readout 30.00mm)', (await feat('f1')).depth === 30 && mid === '30.00mm', `${(await feat('f1')).depth} ${mid}`);
check('Mid Plane: the body grows symmetrically (-15 .. 15)', bm.min[1] === -15 && bm.max[1] === 15, JSON.stringify(bm));
check('Mid Plane: the top face is picked again after the drag', await has('dragHandles-grip'));
const canUndo0 = await st(() => window.__phlippoStore.getState().undoLabel);
const mid2 = await drag('dragHandles-grip-mid-', 4, { layer: 'dragHandles' });
check('Mid Plane: the bottom handle 2 mm further grows the total by 4 (34)', (await feat('f1')).depth === 34, `${(await feat('f1')).depth} ${mid2} ${canUndo0}`);
await page.keyboard.press('Control+z');
await settle(page);
check('Undo: one step back to 30', (await feat('f1')).depth === 30, String((await feat('f1')).depth));

// 2. Esc cancels a drag; Alt gives 0.1 mm steps
await selectFace(1, 15);
const undoBefore = await st(() => window.__phlippoStore.getState().undoLabel + '|' + window.__phlippoStore.getState().canRedo);
await drag('dragHandles-grip', 7, { layer: 'dragHandles', esc: true });
const afterEsc = await st(() => ({ d: window.__phlippoStore.getState().doc.features.find((f) => f.id === 'f1').depth, u: window.__phlippoStore.getState().undoLabel + '|' + window.__phlippoStore.getState().canRedo }));
const be = await bbox();
check('Esc: the drag is cancelled (depth, model and undo list as before)', afterEsc.d === 30 && be.max[1] === 15 && afterEsc.u === undoBefore, JSON.stringify({ afterEsc, be, undoBefore }));
await selectFace(1, 15);
const fine = await drag('dragHandles-grip', 2.3, { layer: 'dragHandles', alt: true });
const fd = (await feat('f1')).depth;
check('Alt: fine steps of 0.1 (1.15 mm of travel on a Mid Plane end: 32.3)', Math.abs(fd - 32.3) < 1e-6, `${fd} ${fine}`);

// 3. Snapping: a plate (top at y = 10) and a separate block 25 high; the plate's handle over the block's corner
//    snaps to 25 (ruler mark); released on the block's top face it becomes Up To Surface
await st(() => {
  const a = window.__dh2.rect('s1', 'top', 0, 0, 80, -60, false), b = window.__dh2.rect('s2', 'top', 100, 0, 130, -30, false);
  window.__dh2.open('Snap', { s1: a.s, s2: b.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'f2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 25, reverse: false }]);
});
await settle(page);
await view();
await selectFace(1, 10);
const corner = await st(() => window.__phlippoProjectWorld(100, 25, 30));
const topB = await st(() => window.__phlippoProjectWorld(115, 25, 15));
await drag('dragHandles-grip', 3, { layer: 'dragHandles', esc: true, to: { x: corner.x + 2, y: corner.y + 1 }, name: 'handles-snap-vertex' });
// the same drag again, now looking at the snap state before Esc
{
  const el = page.locator('[data-testid="dragHandles-grip"]');
  const b = await el.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y - 20, { steps: 4 });
  await page.mouse.move(corner.x + 2, corner.y + 1, { steps: 6 });
  await frames(page, 3);
  const kind = await page.locator('[data-testid="dragHandles-snap"]').getAttribute('data-kind').catch(() => null);
  const txt = await page.locator('[data-testid="dragHandles-value"]').textContent().catch(() => '');
  check('Snap: the pointer on the block corner snaps the depth to it (vertex, 25.00mm)', kind === 'vertex' && txt === '25.00mm', `${kind} ${txt}`);
  await page.mouse.move(topB.x, topB.y, { steps: 6 });
  await frames(page, 3);
  const kind2 = await page.locator('[data-testid="dragHandles-snap"]').getAttribute('data-kind').catch(() => null);
  const txt2 = await page.locator('[data-testid="dragHandles-value"]').textContent().catch(() => '');
  await shot('handles-snap-face');
  check('Snap: over the block top face (parallel) the value is 25 as well (face)', kind2 === 'face' && txt2 === '25.00mm', `${kind2} ${txt2}`);
  await page.mouse.up();
  await settle(page);
}
const us = await feat('f1');
const bs = await bbox();
check('Snap: released on the parallel face, the end condition becomes Up To Surface with that face', us.end === 'upToSurface' && /^Face<\d+>$/.test(us.surface?.label ?? '') && Math.abs(us.surface.point[1] - 25) < 1e-6, JSON.stringify(us));
check('Up To Surface: the plate now reaches 25 and rebuilds without errors', bs.max[1] === 25 && bs.errors === 0, JSON.stringify(bs));

// 4. Direction 2, thin feature, Offset From Surface, a cut
await st(() => {
  const a = window.__dh2.rect('s1', 'top', 0, 0, 80, -60, false), b = window.__dh2.rect('s2', 'top', 100, 0, 130, -30, false);
  window.__dh2.open('Ends', { s1: a.s, s2: b.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, direction2: { end: 'blind', depth: 5 } },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'f2', type: 'extrude', name: 'Extrude-Thin1', sketchId: 's2', suppressed: false, op: 'boss', end: 'offsetFromSurface', depth: 10, reverse: false, surface: { normal: [0, 1, 0], point: [0, 40, 0], label: 'Plane' }, offset: 10, thin: { mode: 'one', thickness: 2 } }]);
});
await settle(page);
await view();
await selectFeature('f1');
check('Direction 2: the selected feature shows a handle on each end', (await has('featureHandles-grip')) && (await has('featureHandles-grip-d2')));
await drag('featureHandles-grip-d2', 3, { layer: 'featureHandles' });
check('Direction 2: dragging its handle 3 mm makes it 8 deep', (await feat('f1')).direction2?.depth === 8, JSON.stringify((await feat('f1')).direction2));
check('the thin feature with Offset From Surface rebuilds (top at 30)', (await bbox()).max[1] === 30, JSON.stringify(await bbox()));
check('Offset From Surface (thin): its end face shows the handle', await selectFace(1, 30));
const off = await drag('dragHandles-grip', 4, { layer: 'dragHandles' });
const ft = await feat('f2');
check('Offset From Surface: dragging the end 4 mm toward the face makes the offset 6 (thin wall)', ft.offset === 6 && ft.end === 'offsetFromSurface' && (await bbox()).max[1] === 34, `${ft.offset} ${off} ${JSON.stringify(await bbox())}`);

// 5. the sketch of an extrusion dragged from the model: an 80 x 60 plate with its two dimensions
await st(() => {
  const K = window.__phlippoKit;
  const a = window.__dh2.rect('s1', 'top', 0, 0, 80, -60, true);
  let c = K.createSketch('s3', 'Sketch3', 'top');
  const [c1, ci] = K.addCircle(c, { x: 120, y: -30 }, 10);
  c = K.addConstraint(c1, 'diameter', [ci.id], { value: 20 })[0];
  window.__dh2.ids = a.ids; window.__dh2.circle = ci.id;
  window.__dh2.open('Sketch drag', { s1: a.s, s3: c }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 's3', suppressed: false }, { id: 'f3', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's3', suppressed: false, op: 'boss', end: 'blind', depth: 15, reverse: false }]);
});
await settle(page);
await view();
await selectFeature('f1');
const ids = await st(() => window.__dh2.ids);
check('Sketch drag: the selected extrusion shows a handle on each line of its profile', (await page.locator('[data-testid^="featureHandles-grip-line:"]').count()) === 4);
const v0 = await vol();
const lineTxt = await drag(`featureHandles-grip-line:${ids[1]}`, 10, { layer: 'featureHandles', name: 'handles-sketchline' });
const dims = await st(() => { const s = window.__phlippoStore.getState().doc.sketches.s1; return s.constraintOrder.map((id) => s.constraints[id]).filter((c) => c.kind === 'length').map((c) => c.value); });
const v1 = await vol();
check('Sketch drag: the right side 10 mm out makes the 80 dimension 90 (readout 90.00mm)', dims[0] === 90 && dims[1] === 60 && lineTxt === '90.00mm', `${dims} ${lineTxt}`);
check('Sketch drag: the plate grows by 10 x 60 x 10', Math.abs(v1 - v0 - 6000) < 1, `${v0.toFixed(1)} -> ${v1.toFixed(1)}`);
check('Sketch drag: the side face (x = 90) shows the handle of the line under it', await selectFace(1, 90, 0) && (await has('dragHandles-grip')));
await drag('dragHandles-grip', -5, { layer: 'dragHandles' });
const dims2 = await st(() => { const s = window.__phlippoStore.getState().doc.sketches.s1; return s.constraintOrder.map((id) => s.constraints[id]).filter((c) => c.kind === 'length').map((c) => c.value); });
check('Sketch drag from the side face: 5 mm in makes it 85', dims2[0] === 85, String(dims2));
await page.keyboard.press('Control+z');
await settle(page);
const dims3 = await st(() => { const s = window.__phlippoStore.getState().doc.sketches.s1; return s.constraintOrder.map((id) => s.constraints[id]).filter((c) => c.kind === 'length').map((c) => c.value); });
check('Sketch drag: one undo step per drag (back to 90)', dims3[0] === 90, String(dims3));
await selectFeature('f3');
const cid = await st(() => window.__dh2.circle);
await drag(`featureHandles-grip-circle:${cid}`, 3, { layer: 'featureHandles' });
const dia = await st(() => { const s = window.__phlippoStore.getState().doc.sketches.s3; return s.constraintOrder.map((id) => s.constraints[id]).find((c) => c.kind === 'diameter').value; });
check('Sketch drag: the circle edge 3 mm out makes the diameter 26', dia === 26, String(dia));

// 6. Shell thickness, linear pattern spacing, hole depth, draft angle
await st(() => {
  const K = window.__phlippoKit;
  const a = window.__dh2.rect('s1', 'top', 0, 0, 80, -60, false);
  const b = window.__dh2.rect('s2', 'f1', 10, -10, 20, -20, false);
  window.__dh2.open('Values', { s1: a.s, s2: b.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false },
    { id: 'sh', type: 'shell', name: 'Shell1', suppressed: false, thickness: 3, faces: [{ normal: [0, 1, 0], point: [40, 30, 30] }] }], { f1: { id: 'f1', name: 'Face', kind: 'face', origin: [0, 30, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] } });
  void K;
});
await settle(page);
await view();
await selectFeature('sh');
const v3 = await vol();
await drag('featureHandles-grip', 2, { layer: 'featureHandles', name: 'handles-shell' });
const sh = await feat('sh');
check('Shell: dragging the wall handle 2 mm makes the thickness 5 and the part heavier', sh.thickness === 5 && (await vol()) > v3, `${sh.thickness}`);

await st(() => {
  const a = window.__dh2.rect('s1', 'top', 0, 0, 120, -60, false);
  const b = window.__dh2.rect('s2', 'f1', 10, -10, 20, -20, false);
  window.__dh2.open('Pattern', { s1: a.s, s2: b.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'f2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 8, reverse: false },
    { id: 'lp', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['f2'], dir1: { axis: [1, 0, 0], spacing: 20, count: 3 } },
    { id: 'h1', type: 'hole', name: 'Hole1', suppressed: false, plane: 'f1', points: [{ x: 100, y: -40 }], holeType: 'simple', diameter: 6, depth: 5, cbDiameter: 0, cbDepth: 0, csDiameter: 0, csAngle: 90, simple: true }],
  { f1: { id: 'f1', name: 'Face', kind: 'face', origin: [0, 10, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] } });
});
await settle(page);
await view();
await selectFeature('lp');
await drag('featureHandles-grip', 5, { layer: 'featureHandles', name: 'handles-pattern' });
const lp = await feat('lp');
const bp = await bbox();
check('Linear pattern: the handle on the first instance, 5 mm more makes the spacing 25 (last instance at x 65 .. 75)', lp.dir1.spacing === 25 && bp.errors === 0, `${lp.dir1.spacing} ${JSON.stringify(bp)}`);
await selectFeature('h1');
const vh = await vol();
await drag('featureHandles-grip', 3, { layer: 'featureHandles', name: 'handles-hole' });
check('Hole: dragging the bottom 3 mm deeper makes the depth 8 (less material)', (await feat('h1')).depth === 8 && (await vol()) < vh, String((await feat('h1')).depth));

await st(() => {
  const a = window.__dh2.rect('s1', 'top', 0, 0, 60, -40, false);
  window.__dh2.open('Draft', { s1: a.s }, [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false },
    { id: 'dr', type: 'draft', name: 'Draft1', suppressed: false, angle: 5, neutral: { normal: [0, -1, 0], point: [30, 0, 20], label: 'Face<1>' }, faces: [{ normal: [1, 0, 0], point: [60, 15, 20], label: 'Face<2>' }] }]);
});
await settle(page);
await view();
await selectFeature('dr');
const vd = await vol();
const dtxt = await drag('featureHandles-grip', 5, { layer: 'featureHandles', name: 'handles-draft' });
const dr = await feat('dr');
check('Draft: dragging the face handle tilts it further (angle up, less material)', dr.angle > 5 && (await vol()) < vd && (await bbox()).errors === 0, `${dr.angle} ${dtxt}`);

// 7. the Drag Handles toggle turns all of it off
await st(() => window.__phlippoStore.setState({ dragHandles: false }));
await frames(page, 2);
check('Drag Handles off: no handles on the selected feature', (await page.locator('[data-testid^="featureHandles-grip"]').count()) === 0);
await st(() => window.__phlippoStore.setState({ dragHandles: true }));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
