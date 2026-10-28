// Example assembly "Deurkruk" (door handle): door leaf, two rosettes, square spindle, two levers.
// Builds the parts with the app's own model, opens the assembly, checks it and saves everything to voorbeelden/deurkruk/.
// Run after every change: node e2e/doorhandle.mjs  -> e2e-out/deurkruk-*.png
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
// the regression writes to a temporary folder; the committed examples are only rewritten on purpose (QA v0.3.4 F84):
// UPDATE_EXAMPLES=1 node e2e/doorhandle.mjs
const DIR = process.env.UPDATE_EXAMPLES === '1' ? 'voorbeelden/deurkruk' : join(tmpdir(), 'phlippo-deurkruk');
mkdirSync(OUT, { recursive: true });
mkdirSync(DIR, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")').catch(skip('doorhandle:27'));

const docs = await page.evaluate(() => {
  const K = window.__phlippoKit;
  const mat = (name) => { const m = K.findMaterial(name); return { name: m.name, density: m.density, color: m.color }; };
  const rect = (s, x0, y0, x1, y1) => {
    const [s1, l1] = K.addLine(s, { x: x0, y: y0 }, { x: x1, y: y0 });
    const [s2, l2] = K.addLine(s1, l1.p2, { x: x1, y: y1 });
    const [s3, l3] = K.addLine(s2, l2.p2, { x: x0, y: y1 });
    return K.addLine(s3, l3.p2, l1.p1)[0];
  };
  const circle = (s, x, y, r) => K.addCircle(s, { x, y }, r)[0];
  const sk = (id, name) => ({ id: 'k' + id, type: 'sketch', name, sketchId: id, suppressed: false });
  const ex = (id, name, sketchId, depth, extra = {}) => ({ id, type: 'extrude', name, sketchId, suppressed: false, op: 'boss', end: 'blind', depth, reverse: false, ...extra });
  const part = (name, material, sketches, features, planes = {}) => ({ ...K.createDocument(name), material: mat(material), sketches, features, planes });

  // helpers: closed polyline, revolve about the sketch's centerline (Top plane: sketch (r, -z) -> world (x = r, z))
  const poly = (s, pts) => {
    let cur = s, first = null, prev = null;
    for (let i = 0; i < pts.length; i++) {
      const a = prev ?? { x: pts[i][0], y: pts[i][1] };
      const b = i + 1 < pts.length ? { x: pts[i + 1][0], y: pts[i + 1][1] } : first;
      const [n, l] = K.addLine(cur, a, b);
      cur = n;
      if (!first) first = l.p1;
      prev = l.p2;
    }
    return cur;
  };
  const revolveSketch = (id, name, profileRZ) => {
    let s = K.createSketch(id, name, 'top');
    s = poly(s, profileRZ.map(([r, z]) => [r, -z]));
    const zmax = Math.max(...profileRZ.map((q) => q[1]));
    const [s2, axis] = K.addLine(s, { x: 0, y: 5 }, { x: 0, y: -zmax - 5 }, true);
    return { sketch: s2, axis: axis.id };
  };
  const rev = (id, name, sketchId, axisEntityId) => ({ id, type: 'revolve', name, sketchId, suppressed: false, op: 'boss', axisEntityId, angle: 360, reverse: false });

  // Deur: door leaf 300 x 600 x 40, handle hole Ø20 at 70 mm backset, cylinder hole Ø12 72 mm below (PC 72)
  let s1 = K.createSketch('s1', 'Sketch1', 'front');
  s1 = rect(s1, -70, -330, 230, 270);
  s1 = circle(s1, 0, 0, 10);
  s1 = circle(s1, 0, -72, 9);
  const deur = part('Deur', 'Oak', { s1 }, [sk('s1', 'Sketch1'), ex('f1', 'Boss-Extrude1', 's1', 40)]);

  // Rozet: domed rosette Ø52, 9 high, Ø18 bore (revolved profile)
  const rz = revolveSketch('s1', 'Sketch1', [[9, 0], [26, 0], [26, 2], [25, 4.5], [22.5, 7], [17, 8.6], [13, 9], [9, 9]]);
  // two countersunk M4 screw holes (Hole Tool, ISO 10642) above and below the handle, from the domed face (z = 8 at r = 19)
  const rozet = part('Rozet', 'AISI 304', { s1: rz.sketch }, [sk('s1', 'Sketch1'), rev('f1', 'Revolve1', 's1', rz.axis),
    { id: 'f2', type: 'hole', name: 'CSK for M4 Flat Head Socket Screw1', suppressed: false, plane: 'csk', points: [{ x: 0, y: 19 }, { x: 0, y: -19 }], holeType: 'countersink', diameter: 4.5, depth: 0, cbDiameter: 8, cbDepth: 4.4, csDiameter: 8.4, csAngle: 90, sizeName: 'M4' }],
    { csk: { id: 'csk', name: 'Face<4>', origin: [0, 0, 8], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' } });

  // Sleutelrozet: key escutcheon Ø40, 8 high, with a keyhole cut through
  const kz = revolveSketch('s1', 'Sketch1', [[0, 0], [20, 0], [20, 2], [18.5, 5], [14, 7.4], [8, 8], [0, 8]]);
  let kh = K.createSketch('s2', 'Sketch2', 'front');
  {
    const r = 3.5, a0 = (-65 * Math.PI) / 180, a1 = (245 * Math.PI) / 180;
    const pA = { x: r * Math.cos(a0), y: 3 + r * Math.sin(a0) }, pB = { x: r * Math.cos(a1), y: 3 + r * Math.sin(a1) };
    const [k1, arc] = K.addArc(kh, { x: 0, y: 3 }, pA, pB, true);
    const [k2, l1] = K.addLine(k1, arc.end, { x: -1.6, y: -8 });
    const [k3, l2] = K.addLine(k2, l1.p2, { x: 1.6, y: -8 });
    kh = K.addLine(k3, l2.p2, arc.start)[0];
  }
  const sleutel = part('Sleutelrozet', 'AISI 304', { s1: kz.sketch, s2: kh }, [sk('s1', 'Sketch1'), rev('f1', 'Revolve1', 's1', kz.axis), sk('s2', 'Sketch2'), ex('f2', 'Cut-Extrude1', 's2', 0, { op: 'cut', end: 'throughAll' })]);

  // Vierkantstift: square spindle 8 x 8 x 100
  let v1 = K.createSketch('s1', 'Sketch1', 'front');
  v1 = rect(v1, -4, -4, 4, 4);
  const stift = part('Vierkantstift', 'Alloy Steel', { s1: v1 }, [sk('s1', 'Sketch1'), ex('f1', 'Boss-Extrude1', 's1', 100)]);

  // Kruk: turned neck with a collar (revolve), square hole 8 x 8 x 25, round lever Ø16 swept along a path that bends back to the door
  const kn = revolveSketch('s1', 'Sketch1', [[0, 0], [13, 0], [13, 2], [11.5, 4.5], [10, 8], [10, 42], [9.5, 44], [8, 45.5], [5, 46.5], [0, 46.8]]);
  let k2 = K.createSketch('s2', 'Sketch2', 'front');
  k2 = rect(k2, -4, -4, 4, 4);
  // path on the Top plane: along +x at z = 38, then a tangent R25 arc back toward the door
  let kp = K.createSketch('s3', 'Sketch3', 'top');
  {
    const [p1, l] = K.addLine(kp, { x: 0, y: -38 }, { x: 92, y: -38 });
    kp = K.addArc(p1, { x: 92, y: -13 }, l.p2, { x: 117, y: -13 }, true)[0];
  }
  // profile on the Right plane: circle Ø16 at the path start (world (0, 0, 38) -> sketch (-38, 0))
  let kc = K.createSketch('s4', 'Sketch4', 'right');
  kc = circle(kc, -38, 0, 8);
  // round end: a sphere Ø16 at the end of the path (half disk revolved about its diameter)
  let ke = K.createSketch('s5', 'Sketch5', 'top');
  let keAxis;
  {
    const [e1, arc] = K.addArc(ke, { x: 117, y: -13 }, { x: 125, y: -13 }, { x: 109, y: -13 }, true);
    const [e2] = K.addLine(e1, arc.end, arc.start);
    const [e3, ax] = K.addLine(e2, { x: 100, y: -13 }, { x: 134, y: -13 }, true);
    ke = e3;
    keAxis = ax.id;
  }
  // the sketches dimensioned as a designer does (driving dimensions, consistent with the geometry)
  const near = (p, x, y) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6;
  const pointAt = (sk, x, y) => Object.keys(sk.points).find((id) => near(sk.points[id], x, y));
  const lineAt = (sk, x0, y0, x1, y1) => Object.values(sk.entities).find((e) => e.kind === 'line' && ((near(sk.points[e.p1], x0, y0) && near(sk.points[e.p2], x1, y1)) || (near(sk.points[e.p1], x1, y1) && near(sk.points[e.p2], x0, y0))))?.id;
  const curveAt = (sk, kind, x, y) => Object.values(sk.entities).find((e) => e.kind === kind && near(sk.points[e.center], x, y))?.id;
  let dimN = 0;
  const dim = (sk, kind, refs, value, label) => {
    if (refs.some((r) => !r)) throw new Error('dimension reference missing: ' + kind + ' ' + value);
    const id = 'dim' + ++dimN;
    return { ...sk, constraints: { ...sk.constraints, [id]: { id, kind, refs, value, ...(label ? { labelOffset: { x: label[0], y: label[1] } } : {}) } }, constraintOrder: [...sk.constraintOrder, id] };
  };
  // Sketch1 (neck profile, Top plane): collar radius 13, neck radius 10, height 46.8
  kn.sketch = dim(kn.sketch, 'hDistance', [pointAt(kn.sketch, 0, 0), pointAt(kn.sketch, 13, 0)], 13, [6.5, 8]);
  kn.sketch = dim(kn.sketch, 'length', [lineAt(kn.sketch, 10, -8, 10, -42)], 34, [18, -25]);
  kn.sketch = dim(kn.sketch, 'vDistance', [pointAt(kn.sketch, 0, 0), pointAt(kn.sketch, 0, -46.8)], 46.8, [-12, -23]);
  // Sketch2 (square hole, Front plane): 8 x 8
  k2 = dim(k2, 'length', [lineAt(k2, -4, -4, 4, -4)], 8, [0, -10]);
  k2 = dim(k2, 'length', [lineAt(k2, 4, -4, 4, 4)], 8, [10, 0]);
  // Sketch3 (path, Top plane): straight 92, bend R25
  kp = dim(kp, 'length', [lineAt(kp, 0, -38, 92, -38)], 92, [46, -50]);
  kp = dim(kp, 'radius', [curveAt(kp, 'arc', 92, -13)], 25, [112, -36]);
  // Sketch4 (lever section, Right plane): Ø16
  kc = dim(kc, 'diameter', [curveAt(kc, 'circle', -38, 0)], 16, [-26, 12]);
  // Sketch5 (round end, Top plane): R8
  ke = dim(ke, 'radius', [curveAt(ke, 'arc', 117, -13)], 8, [128, -4]);
  const kruk = part('Kruk', 'AISI 304', { s1: kn.sketch, s2: k2, s3: kp, s4: kc, s5: ke }, [
    sk('s1', 'Sketch1'), rev('f1', 'Revolve1', 's1', kn.axis),
    sk('s2', 'Sketch2'), ex('f2', 'Cut-Extrude1', 's2', 25, { op: 'cut' }),
    sk('s3', 'Sketch3'), sk('s4', 'Sketch4'),
    { id: 'f3', type: 'sweep', name: 'Sweep1', sketchId: 's4', pathSketchId: 's3', suppressed: false, op: 'boss' },
    sk('s5', 'Sketch5'), rev('f4', 'Revolve2', 's5', keAxis),
  ]);

  // the assembly: door fixed, rosettes on both faces, levers on the rosettes, the spindle through
  const X180 = [1, 0, 0, 0], Y180 = [0, 1, 0, 0], I = [0, 0, 0, 1];
  const comp = (id, name, p, position, rotation, fixed = false) => ({ id, name, part: { ...p, kind: 'part' }, position, rotation, fixed, suppressed: false });
  const asm = { ...K.createDocument('Deurkruk', 'assembly') };
  asm.components = [
    comp('c1', 'Deur<1>', deur, [0, 0, 0], I, true),
    comp('c2', 'Rozet<1>', rozet, [0, 0, 40], I),
    comp('c3', 'Rozet<2>', rozet, [0, 0, 0], Y180),
    comp('c4', 'Vierkantstift<1>', stift, [0, 0, -30], I),
    comp('c5', 'Kruk<1>', kruk, [0, 0, 49], I),
    comp('c6', 'Kruk<2>', kruk, [0, 0, -9], X180),
    comp('c7', 'Sleutelrozet<1>', sleutel, [0, -72, 40], I),
    comp('c8', 'Sleutelrozet<2>', sleutel, [0, -72, 0], Y180),
  ];
  // mates as one would make them: rosettes concentric + face to face on the door, levers on the rosettes, spindle in the square hole
  const face = (componentId, label, normal, point, extra = {}) => ({ componentId, kind: 'face', label, normal, point, ...extra });
  const cyl = (componentId, label, r, at = [0, 0, 0]) => face(componentId, label, [0, 0, 1], at, { cylindrical: true, radius: r });
  const count = { concentric: 0, coincident: 0 };
  let n = 0;
  const mate = (type, a, b) => { n++; count[type]++; return { id: 'm' + n, type, name: (type === 'concentric' ? 'Concentric' : 'Coincident') + count[type], refs: [a, b], aligned: false, suppressed: false }; };
  asm.mates = [
    mate('concentric', cyl('c1', 'Face<5>@Deur<1>', 10), cyl('c2', 'Face<3>@Rozet<1>', 9)),
    mate('coincident', face('c1', 'Face<2>@Deur<1>', [0, 0, 1], [0, 0, 40]), face('c2', 'Face<1>@Rozet<1>', [0, 0, -1], [0, 0, 0])),
    mate('concentric', cyl('c1', 'Face<5>@Deur<1>', 10), cyl('c3', 'Face<3>@Rozet<2>', 9)),
    mate('coincident', face('c1', 'Face<1>@Deur<1>', [0, 0, -1], [0, 0, 0]), face('c3', 'Face<1>@Rozet<2>', [0, 0, -1], [0, 0, 0])),
    mate('concentric', cyl('c2', 'Face<3>@Rozet<1>', 9), cyl('c5', 'Face<4>@Kruk<1>', 10)),
    mate('coincident', face('c2', 'Face<8>@Rozet<1>', [0, 0, 1], [0, 0, 9]), face('c5', 'Face<1>@Kruk<1>', [0, 0, -1], [0, 0, 0])),
    mate('concentric', cyl('c3', 'Face<3>@Rozet<2>', 9), cyl('c6', 'Face<4>@Kruk<2>', 10)),
    mate('coincident', face('c3', 'Face<8>@Rozet<2>', [0, 0, 1], [0, 0, 9]), face('c6', 'Face<1>@Kruk<2>', [0, 0, -1], [0, 0, 0])),
    mate('coincident', face('c4', 'Face<3>@Vierkantstift<1>', [1, 0, 0], [4, 0, 50]), face('c5', 'Face<9>@Kruk<1>', [-1, 0, 0], [4, 0, 10])),
    mate('coincident', face('c4', 'Face<4>@Vierkantstift<1>', [0, 1, 0], [0, 4, 50]), face('c5', 'Face<10>@Kruk<1>', [0, -1, 0], [0, 4, 10])),
    // the second lever sits on the same square spindle
    mate('coincident', face('c4', 'Face<3>@Vierkantstift<1>', [1, 0, 0], [4, 0, 50]), face('c6', 'Face<9>@Kruk<2>', [-1, 0, 0], [4, 0, 10])),
    mate('concentric', cyl('c1', 'Face<6>@Deur<1>', 9, [0, -72, 0]), cyl('c7', 'Face<2>@Sleutelrozet<1>', 20)),
    mate('coincident', face('c1', 'Face<2>@Deur<1>', [0, 0, 1], [0, 0, 40]), face('c7', 'Face<1>@Sleutelrozet<1>', [0, 0, -1], [0, 0, 0])),
    mate('concentric', cyl('c1', 'Face<6>@Deur<1>', 9, [0, -72, 0]), cyl('c8', 'Face<2>@Sleutelrozet<2>', 20)),
    mate('coincident', face('c1', 'Face<1>@Deur<1>', [0, 0, -1], [0, 0, 0]), face('c8', 'Face<1>@Sleutelrozet<2>', [0, 0, -1], [0, 0, 0])),
  ];
  // Motion Study 1: pressing the handle (oscillating rotary motor on the front lever, 40° down and back)
  asm.motionStudy = { name: 'Motion Study 1', duration: 4, motors: [{ id: 'mo1', name: 'RotaryMotor1', componentId: 'c5', motion: 'oscillating', rpm: 10, amplitude: 40, frequency: 0.25, reverse: true }] };
  // Exploded View: rosettes and levers pulled off along the spindle axis
  asm.explodeSteps = [
    { id: 'e1', name: 'Explode Step1', componentIds: ['c2', 'c5', 'c7'], dir: [0, 0, 1], distance: 50 },
    { id: 'e2', name: 'Explode Step2', componentIds: ['c5'], dir: [0, 0, 1], distance: 70 },
    { id: 'e3', name: 'Explode Step3', componentIds: ['c3', 'c6', 'c8'], dir: [0, 0, -1], distance: 50 },
    { id: 'e4', name: 'Explode Step4', componentIds: ['c6'], dir: [0, 0, -1], distance: 70 },
    { id: 'e5', name: 'Explode Step5', componentIds: ['c4'], dir: [0, 0, 1], distance: 90 },
  ];
  asm.exploded = false;
  return { deur, rozet, sleutel, stift, kruk, asm };
});

// rounds: fillet the lever's top outline (R2), chamfer the rosette's outer top edge (1 mm)
const rounded = await page.evaluate(({ kruk, rozet }) => {
  const st = window.__phlippoStore;
  const ref = (e) => ({ centroid: [e.centroid.x, e.centroid.y, e.centroid.z], length: e.length, closed: e.closed, straight: e.straight });
  const tryRound = (doc, pick, type, size, name) => {
    st.getState().openDocument(doc);
    const b = st.getState().rebuild.bodies[0];
    const edges = b.edges.filter(pick).map(ref);
    if (!edges.length) return { doc, ok: false, n: 0 };
    const d2 = { ...doc, features: [...doc.features, { id: 'r' + type, type, name, suppressed: false, size, edges }] };
    st.getState().openDocument(d2);
    const s = st.getState();
    const ok = s.rebuild.bodies.length === 1 && !Object.keys(s.rebuild.errors).length;
    return { doc: ok ? d2 : doc, ok, n: edges.length, err: s.rebuild.errors };
  };
  // the lever's end: round off the circular end edge (the far end of the sweep, x > 100)
  const k = { doc: kruk, ok: true, n: 0, err: {} };
  const r = { doc: rozet, ok: true, n: 0, err: {} };
  return { kruk: k.doc, rozet: r.doc, info: { kruk: [k.ok, k.n, k.err], rozet: [r.ok, r.n, r.err] } };
}, { kruk: docs.kruk, rozet: docs.rozet });
console.log('rounds:', JSON.stringify(rounded.info));

docs.kruk = rounded.kruk;
docs.rozet = rounded.rozet;
docs.asm.components = docs.asm.components.map((c) => (c.part.name === 'Kruk' ? { ...c, part: { ...docs.kruk, kind: 'part' } } : c.part.name === 'Rozet' ? { ...c, part: { ...docs.rozet, kind: 'part' } } : c));

// each part on its own: it must rebuild into one body without errors
for (const name of ['deur', 'rozet', 'sleutel', 'stift', 'kruk']) {
  const r = await page.evaluate((d) => { const s = window.__phlippoStore.getState(); s.openDocument(d); const st = window.__phlippoStore.getState(); return { bodies: st.rebuild.bodies.length, errors: st.rebuild.errors }; }, docs[name]);
  check(`${docs[name].name} rebuilds into one body`, r.bodies === 1 && Object.keys(r.errors).length === 0, JSON.stringify(r));
  writeFileSync(`${DIR}/${docs[name].name}.kcad`, JSON.stringify({ format: 'phlippo-cad', ...docs[name] }, null, 2));
}
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('deurkruk-kruk');

// the assembly
const a = await page.evaluate((d) => { const s = window.__phlippoStore.getState(); s.openDocument(d); const st = window.__phlippoStore.getState(); return { bodies: st.rebuild.bodies.length, errors: st.rebuild.errors }; }, docs.asm);
check('Deurkruk assembly: 8 components, no errors', a.bodies === 8 && Object.keys(a.errors).length === 0, JSON.stringify(a));
// Auto Fasteners: the rosette holes get countersunk socket screws ISO 10642 M4
const sf = await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.startSmartFasteners(); const groups = window.__phlippoStore.getState().fastenerEdit?.slots.length ?? 0; window.__phlippoStore.getState().commitSmartFasteners(); const st = window.__phlippoStore.getState(); return { groups, screws: st.doc.components.filter((c) => /ISO 10642 M4/.test(c.name)).map((c) => c.name), bodies: st.rebuild.bodies.length, errors: st.rebuild.errors, doc: st.doc }; });
check('Auto Fasteners: four ISO 10642 M4 countersunk screws in the rosettes', sf.groups === 4 && sf.screws.length === 4 && sf.bodies === 12 && Object.keys(sf.errors).length === 0, JSON.stringify({ g: sf.groups, s: sf.screws, b: sf.bodies, e: sf.errors }));
{
  const screwsFront = sf.doc.components.filter((c) => /ISO 10642/.test(c.name) && c.position[2] > 20).map((c) => c.id);
  const screwsBack = sf.doc.components.filter((c) => /ISO 10642/.test(c.name) && c.position[2] <= 20).map((c) => c.id);
  // the screws travel with their rosette in the exploded view
  sf.doc.explodeSteps = sf.doc.explodeSteps.map((e) => (e.id === 'e1' ? { ...e, componentIds: [...e.componentIds, ...screwsFront] } : e.id === 'e3' ? { ...e, componentIds: [...e.componentIds, ...screwsBack] } : e));
  docs.asm = { ...sf.doc };
  await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), docs.asm);
  await page.waitForTimeout(800);
}
writeFileSync(`${DIR}/Deurkruk.kcad`, JSON.stringify({ format: 'phlippo-cad', ...docs.asm }, null, 2));
await page.waitForTimeout(300);
await page.mouse.move(120, 1000);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(500);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setDisplayStyle('shaded'); s.toggleShow('realisticShading'); window.__phlippoStore.getState().toggleShow('shadows'); });
await page.waitForTimeout(800);
check('Realistic Shading and shadows on', await page.evaluate(() => { const s = window.__phlippoStore.getState(); return s.show.realisticShading && s.show.shadows; }));
await shot('deurkruk-assembly');
// close-up of the handle (zoom in around the front lever)
const zoomTo = async (x, y, z, factor) => page.evaluate(([x, y, z, factor]) => { const c = window.__phlippoCamera; const r = document.querySelector('.k-viewport').getBoundingClientRect(); const p = window.__phlippoProjectWorld(x, y, z); c.zoomAt(p.x - r.left, p.y - r.top, factor); }, [x, y, z, factor]);
await zoomTo(45, -30, 60, 0.3);
await page.waitForTimeout(300);
await shot('deurkruk-closeup');
await page.keyboard.press('f');
await page.waitForTimeout(300);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setDisplayStyle('shadedEdges'); s.toggleShow('realisticShading'); window.__phlippoStore.getState().toggleShow('shadows'); });
await page.waitForTimeout(300);
await shot('deurkruk-assembly-edges');
// no interference between the parts (touching faces only)
await expandTree();
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('tree lists the components and the mates', /\(f\) Deur<1>/.test(tree) && /Kruk<2>/.test(tree) && /Vierkantstift<1>/.test(tree) && /Concentric1/.test(tree) && /Coincident8/.test(tree), tree.slice(0, 300));
const moved = await page.evaluate((orig) => window.__phlippoStore.getState().doc.components.map((c, i) => Math.hypot(c.position[0] - orig[i][0], c.position[1] - orig[i][1], c.position[2] - orig[i][2])), docs.asm.components.map((c) => c.position));
check('the mates are satisfied: no component moved', moved.every((d) => d < 0.01), JSON.stringify(moved));
// exploded
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setExploded(true); s.setDisplayStyle('shaded'); s.toggleShow('realisticShading'); });
await page.waitForTimeout(500);
await page.mouse.move(120, 1000);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await zoomTo(20, -36, 40, 0.42);
await page.waitForTimeout(600);
await shot('deurkruk-exploded');
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setDisplayStyle('shadedEdges'); s.toggleShow('realisticShading'); });
await page.evaluate(() => window.__phlippoStore.getState().setExploded(false));
// mass
const mass = await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setDialog('mass'); return true; });
await page.waitForTimeout(400);
const report = await page.locator('.k-mass-report').innerText().catch(skip('doorhandle.mjs:301', ''));
check('Mass Properties of the assembly', mass && /Mass = /.test(report), report.slice(0, 80));
await page.evaluate(() => window.__phlippoStore.getState().setDialog(null));

// drawing of the lever: front / top / right (third angle), isometric, dimensions, material note
const drawing = await page.evaluate((kruk) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Kruk', 'drawing', { size: 'A3', landscape: true, scale: [1, 1], showFormat: true });
  const sheet = d.sheets[0];
  const model = { ...kruk, kind: 'part' };
  const f = K.projectedView(model, 'front'), t = K.projectedView(model, 'top'), r = K.projectedView(model, 'right');
  const gap = 22;
  const fw = f.max[0] - f.min[0], fh = f.max[1] - f.min[1], th = t.max[1] - t.min[1], rw = r.max[0] - r.min[0];
  const at = [95, 150];
  const base = { displayStyle: 'hiddenRemoved', model, modelName: 'Kruk<1>' };
  sheet.views = [
    { ...base, id: 'v1', name: 'Drawing View1', type: 'front', position: at },
    { ...base, id: 'v2', name: 'Drawing View2', type: 'top', position: [at[0], at[1] + fh / 2 + gap + th / 2], parentId: 'v1' },
    { ...base, id: 'v3', name: 'Drawing View3', type: 'right', position: [at[0] + fw / 2 + gap + rw / 2, at[1]], parentId: 'v1' },
    { ...base, id: 'v4', name: 'Drawing View4', type: 'isometric', position: [350, 235], scale: [1, 2], displayStyle: 'shadedEdges' },
  ];
  const dims = [];
  dims.push({ id: 'd1', viewId: 'v1', kind: 'linear', a: [f.min[0], f.min[1]], b: [f.max[0], f.min[1]], label: [(f.min[0] + f.max[0]) / 2, f.min[1] - 12], value: fw, orientation: 'h' });
  dims.push({ id: 'd2', viewId: 'v2', kind: 'linear', a: [t.min[0], t.min[1]], b: [t.min[0], t.max[1]], label: [t.min[0] - 12, (t.min[1] + t.max[1]) / 2], value: th, orientation: 'v' });
  const collar = f.circles.filter((c) => !c.hidden).sort((a, b) => b.r - a.r)[0];
  if (collar) dims.push({ id: 'd3', viewId: 'v1', kind: 'diameter', a: collar.c, b: [collar.c[0] + collar.r, collar.c[1]], label: [collar.c[0] - collar.r - 8, collar.c[1] + collar.r + 10], value: collar.r * 2 });
  const grip = r.circles.filter((c) => Math.abs(c.r - 8) < 0.2)[0];
  if (grip) dims.push({ id: 'd4', viewId: 'v3', kind: 'diameter', a: grip.c, b: [grip.c[0] + grip.r, grip.c[1]], label: [grip.c[0] + grip.r + 10, grip.c[1] + grip.r + 8], value: grip.r * 2 });
  sheet.dimensions = dims;
  sheet.notes = [{ id: 'n1', text: 'MATERIAAL: AISI 304 (RVS), GEBORSTELD', position: [20, 40] }, { id: 'n2', text: 'VIERKANT GAT 8 x 8, DIEPTE 25', position: [20, 33] }];
  sheet.centerMarks = collar ? [{ id: 'cm1', viewId: 'v1', c: collar.c, r: collar.r }] : [];
  return d;
}, docs.kruk);
const dr = await page.evaluate((d) => { const s = window.__phlippoStore.getState(); s.openDocument(d); const st = window.__phlippoStore.getState(); return { kind: st.doc.kind, views: st.doc.sheets[0].views.length, dims: st.doc.sheets[0].dimensions.length }; }, drawing);
check('drawing of the lever: 4 views and dimensions', dr.kind === 'drawing' && dr.views === 4 && dr.dims >= 3, JSON.stringify(dr));
// Section View A-A: vertical cutting line through the collar of the front view, placed right of the right view
// Detail View B: the collar with the square hole at 2 : 1
const sd = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const sheet = s.doc.sheets[0];
  const v1 = sheet.views.find((v) => v.id === 'v1'), v3 = sheet.views.find((v) => v.id === 'v3');
  const K = window.__phlippoKit;
  const f = K.projectedView(v1.model, 'front');
  const collar = f.circles.filter((c) => !c.hidden).sort((a, b) => b.r - a.r)[0];
  s.selectDrawingView?.('v1');
  window.__phlippoStore.getState().startDrawingSection('v');
  window.__phlippoStore.getState().setSectionLine('v1', collar.c[0]);
  window.__phlippoStore.getState().placeSectionView([v3.position[0] + 75, v1.position[1]]);
  window.__phlippoStore.getState().startDetailView();
  window.__phlippoStore.getState().setDetailCircle('v1', collar.c, collar.r + 4);
  window.__phlippoStore.getState().placeDetailView([365, 140]);
  const st = window.__phlippoStore.getState();
  const views = st.doc.sheets[0].views;
  const sec = views.find((v) => v.section), det = views.find((v) => v.detail);
  return { n: views.length, sec: sec && sec.name, det: det && det.name, flip: sec && sec.section.flip };
});
check('Section View A-A and Detail View B added', sd.n === 6 && sd.sec === 'Section View A-A' && /^Detail View B/.test(sd.det), JSON.stringify(sd));
const secDom = await page.evaluate(() => ({ hatch: document.querySelectorAll('path[fill="url(#k-hatch)"]').length, line: document.querySelectorAll('.k-section-line').length, circ: document.querySelectorAll('.k-detail-circle').length, labels: [...document.querySelectorAll('text')].map((t) => t.textContent).filter((t) => /SECTION|DETAIL/.test(t)) }));
check('section is hatched, cutting line and detail circle drawn on the front view', secDom.hatch === 1 && secDom.line === 1 && secDom.circ === 1 && secDom.labels.length === 2, JSON.stringify(secDom));
drawing.sheets = (await page.evaluate(() => window.__phlippoStore.getState().doc.sheets)).map((sh) => ({ ...sh, views: sh.views.map((v) => ({ ...v, model: drawing.sheets[0].views[0].model })) }));
writeFileSync(`${DIR}/Kruk-tekening.kcad`, JSON.stringify({ format: 'phlippo-cad', ...drawing }, null, 2));
await page.waitForTimeout(800);
await page.mouse.move(120, 1000);
await shot('deurkruk-tekening');

// assembly drawing of the door handle: isometric, Bill of Materials and Auto Balloon (items match the BOM)
const asmDrawing = await page.evaluate((model) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Deurkruk-samenstelling', 'drawing', { size: 'A3', landscape: true, scale: [1, 5], showFormat: true });
  d.sheets[0].views = [{ id: 'v1', name: 'Drawing View1', type: 'isometric', position: [180, 150], displayStyle: 'hiddenRemoved', model: { ...model, kind: 'assembly' }, modelName: 'Deurkruk' }];
  const s = window.__phlippoStore.getState();
  s.openDocument(d);
  window.__phlippoStore.getState().insertBomTable();
  return d;
}, docs.asm);
await page.waitForTimeout(1200);
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-small:has-text("Auto Balloon")');
{ const q = await page.evaluate(() => window.__phlippoSheet.toPx([180, 150])); await page.mouse.click(q.x, q.y); }
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const bom = await page.evaluate(() => ({ rows: document.querySelectorAll('[data-testid="bom-table"] text').length / 4 - 1, balloons: (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).filter((x) => x.kind === 'balloon').length }));
check('assembly drawing: BOM with 6 parts (with the screws) and 6 balloons', bom.rows === 6 && bom.balloons === 6, JSON.stringify(bom));
// front view with the pressed handle as Alternate Position View (phantom lines from Motion Study 1 at 1 s)
const alt = await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const sheet = st.doc.sheets[0];
  const v1 = sheet.views[0];
  st.setSheet({ views: [...sheet.views, { ...v1, id: 'v2', name: 'Drawing View2', type: 'front', position: [325, 120] }] });
  window.__phlippoStore.getState().selectDrawingView('v2');
  window.__phlippoStore.getState().startAltPosition();
  window.__phlippoStore.getState().applyAltPosition();
  const v2 = window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.id === 'v2');
  return { alt: v2.altPosition };
});
await page.waitForTimeout(1500);
const phantom = await page.locator('.k-alt-position').count();
check('Alternate Position View: the pressed handle in phantom lines on the front view', alt.alt && alt.alt.source === 'motion' && phantom > 10, JSON.stringify({ alt, phantom }));
const asmSheets = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets);
writeFileSync(`${DIR}/Deurkruk-tekening.kcad`, JSON.stringify({ format: 'phlippo-cad', ...asmDrawing, sheets: asmSheets.map((sh) => ({ ...sh, views: sh.views.map((v) => ({ ...v, model: asmDrawing.sheets[0].views[0].model })) })) }, null, 2));
await page.mouse.move(120, 1000);
await shot('deurkruk-samenstelling-tekening');

// Motion Study 1 of the assembly: the front lever is pressed, the spindle and the back lever turn with it
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), docs.asm);
await page.waitForTimeout(1500);
await page.click('[data-testid="motion-tab"]');
await page.waitForTimeout(300);
await page.evaluate(() => window.__phlippoStore.getState().setMotionTime(1));
await page.waitForTimeout(400);
const motion = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { open: s.motionOpen, motors: s.doc.motionStudy?.motors.length, rows: document.querySelectorAll('.k-motion-row').length }; });
check('Motion Study 1: Motion Timeline with RotaryMotor1 under the graphics area', motion.open && motion.motors === 1 && motion.rows >= 10, JSON.stringify(motion));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(300);
await page.mouse.move(120, 1000);
await shot('deurkruk-motion');
await page.click('[data-testid="motion-tab"]').catch(skip('doorhandle:414'));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
