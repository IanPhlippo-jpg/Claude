// Bug hunt (TASKS: PropertyManagers open/OK/Cancel/Undo per feature): every part command is started on a plate with a
// hole and a spare sketch, cancelled, started again, confirmed with OK and undone. No page error, no stuck command, the
// window keeps answering, and Undo brings the part back to where it was.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

const open = () => S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, 60], [0, 60]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 40, y: 30 }, 10)[0];
  let s2 = K.createSketch('s2', 'Sketch2', 'front');
  s2 = K.addCircle(s2, { x: 20, y: 30 }, 5)[0];
  const d = K.createDocument('Sweep');
  d.sketches = { s1: sk, s2 };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }, { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await open();
await page.waitForTimeout(400);

// [label, action, args, select the spare sketch first]
const COMMANDS = [
  ['Extruded Boss/Base', 'startFeature', ['extrude', 'boss'], true], ['Extruded Cut', 'startFeature', ['extrude', 'cut'], true],
  ['Revolved Boss/Base', 'startFeature', ['revolve', 'boss'], true], ['Swept Boss/Base', 'startFeature', ['sweep', 'boss'], true],
  ['Lofted Boss/Base', 'startFeature', ['loft', 'boss'], true], ['Fillet', 'startRound', ['fillet']], ['Chamfer', 'startRound', ['chamfer']],
  ['Shell', 'startShell', []], ['Rib', 'startRib', [], true], ['Mirror', 'startMirror', []], ['Linear Pattern', 'startPattern', ['linearPattern']],
  ['Circular Pattern', 'startPattern', ['circularPattern']], ['Hole Tool', 'startHole', [false]], ['Advanced Hole', 'startHole', [true]],
  ['Draft', 'startDraft', []], ['Combine', 'startCombine', []], ['Move/Copy', 'startMoveBody', []], ['Intersect', 'startIntersect', []],
  ['Deform', 'startDeform', []], ['Wrap', 'startWrap', [], true], ['Thread', 'startThread', []], ['Stud', 'startStud', []],
  ['Helix', 'startHelix', [], true], ['Delete Face', 'startDeleteFace', []], ['Plane', 'startPlane', []], ['Axis', 'startRefGeom', ['axis']],
  ['Decal', 'startDecal', []], ['Base Flange', 'startBaseFlange', [], true], ['Edge Flange', 'startEdgeFlange', []], ['Hem', 'startHem', []],
  ['Jog', 'startJog', [], true], ['Miter Flange', 'startMiterFlange', [], true], ['Sketched Bend', 'startSketchedBend', [], true],
  ['Unfold', 'startUnfold', []], ['Cross-Break', 'startCrossBreak', []], ['Closed Corner', 'startClosedCorner', []], ['Corner Relief', 'startCornerRelief', []],
  ['Break Corner', 'startBreakCorner', []], ['Lofted Bend', 'startLoftedBend', [], true], ['Convert to Sheet Metal', 'startConvertSheet', []],
  ['Vent', 'startVent', [], true], ['Forming Tool', 'startFormTool', []], ['Gusset', 'startGusset', []], ['Tab and Slot', 'startTabSlot', []],
  ['Rip', 'startRip', []], ['Swept Flange', 'startSweptFlange', [], true], ['Weldment', 'startWeldment', []], ['Structural Member', 'startStructuralMember', [], true],
  ['Trim/Extend', 'startTrimExtend', []], ['End Cap', 'startEndCap', []], ['Weld Gusset', 'startWeldGusset', []], ['Weld Bead', 'startWeldBead', []],
  ['Section View', 'startSectionView', []], ['Auto Tolerancing', 'startAutoTolerance', []],
];

const editState = () => S(() => { const s = window.__phlippoStore.getState(); return { fe: !!s.featureEdit, pe: !!s.planeEdit, re: !!s.refEdit, se: !!s.sectionEdit || !!s.sectionView, sm: !!s.sheetMetalEdit, ae: !!s.autoToleranceEdit, de: !!s.decalEdit, n: s.doc.features.length }; });
const cancelAll = () => S(() => {
  const s = window.__phlippoStore.getState();
  for (const k of ['cancelFeature', 'cancelPlane', 'cancelRefGeom', 'cancelSectionView', 'cancelAutoTolerance']) { try { s[k]?.(); } catch { /* not in this state */ } }
  window.__phlippoStore.setState({ sheetMetalEdit: null, decalEdit: null, dialog: null });
});
const alive = async () => (await Promise.race([page.evaluate(() => 1), new Promise((r) => setTimeout(() => r(0), 5000))])) === 1;
const rows = [];
for (const [label, action, args, selectSketch] of COMMANDS) {
  const before = errors.length;
  void label;
  const n0 = (await editState()).n;
  const start = () => S(([a, ar, sel]) => { const s = window.__phlippoStore.getState(); if (sel) window.__phlippoStore.setState({ selectedFeatureId: 'k2' }); s[a](...ar); }, [action, args, !!selectSketch]);
  let opened = false, committed = false;
  try {
    await start();
    await page.waitForTimeout(150);
    const st = await editState();
    opened = st.fe || st.pe || st.re || st.se || st.sm || st.ae || st.de || st.n !== n0;
    await cancelAll();
    await page.waitForTimeout(80);
    await start();
    await page.waitForTimeout(150);
    await S(() => { const s = window.__phlippoStore.getState(); if (s.featureEdit) s.commitFeature(); else if (s.planeEdit) s.commitPlane(); else if (s.refEdit) s.commitRefGeom(); });
    await page.waitForTimeout(250);
    const n1 = (await editState()).n;
    committed = n1 > n0;
    await cancelAll();
    // Undo until the part is as it was (the command may have added a feature, a weldment folder or nothing)
    for (let k = 0; k < 4 && (await editState()).n > n0; k++) { await S(() => window.__phlippoStore.getState().undo()); await page.waitForTimeout(120); }
  } catch (err) {
    errors.push(`pageerror: ${label}: ${String(err?.message ?? err).split('\n')[0]}`);
  }
  const ok = await alive();
  const n2 = (await editState()).n;
  const newErrors = errors.slice(before).filter((e) => e.startsWith('pageerror'));
  rows.push({ label, opened, committed, back: n2 === n0, ok, errors: newErrors.length });
  check(`${label}: opens/cancels/OK/undo without an error, the window answers and the part comes back`, ok && !newErrors.length && n2 === n0, JSON.stringify({ opened, committed, n0, n2, newErrors }));
}
console.log(rows.map((r) => `${r.label.padEnd(24)} open:${r.opened ? 'y' : 'n'} ok:${r.committed ? 'y' : 'n'} back:${r.back ? 'y' : 'n'}`).join('\n'));
await page.screenshot({ path: `${OUT}/pmsweep-end.png` });
await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
