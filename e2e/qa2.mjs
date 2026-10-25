// QA report fixes, batch 2: units in value fields, no feature with a zero depth or an empty sketch, instance limit,
// a boolean that produces nothing is an error of that feature only, dangling edge references warn, mouse gestures.
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
const lastMsg = () => S(() => (window.__phlippoStore.getState().messages.at(-1) ?? {}).text ?? '');

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(400);

// a 60 x 40 plate from the kit, plus an empty sketch
const plate = () => S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  const empty = K.createSketch('s2', 'Sketch2', 'top');
  // a small square far away from the plate: a cut with it touches nothing
  let far = K.createSketch('s3', 'Sketch3', 'top');
  far = K.addLine(far, { x: 100, y: 100 }, { x: 110, y: 100 })[0];
  far = K.addLine(far, { x: 110, y: 100 }, { x: 110, y: 110 })[0];
  far = K.addLine(far, { x: 110, y: 110 }, { x: 100, y: 110 })[0];
  far = K.addLine(far, { x: 100, y: 110 }, { x: 100, y: 100 })[0];
  const d = K.createDocument('Plaat');
  d.sketches = { s1: sk, s2: empty, s3: far };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 's3', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await plate();
await page.waitForTimeout(600);

console.log('step 1: units in a value field: the Extrude depth typed as 2in becomes 50.8 mm');
// ---- units in a value field: the Extrude depth typed as 2in becomes 50.8 mm
await S(() => { const s = window.__phlippoStore.getState(); s.setState ? null : null; window.__phlippoStore.setState({ selectedFeatureId: 'k1' }); s.startFeature('extrude', 'boss'); });
await page.waitForTimeout(400);
const depthField = page.locator('.k-pm-valuerow[data-tip="Depth"] input.k-num');
check('Extrude PM shows the depth field with its icon', (await depthField.count()) === 1);
await depthField.fill('2in');
await page.waitForTimeout(150);
check('2in in the depth field becomes 50.8 mm', Math.abs((await S(() => window.__phlippoStore.getState().featureEdit.draft.depth)) - 50.8) < 1e-6);
await depthField.fill('3cm');
await page.waitForTimeout(150);
check('3cm becomes 30 mm', Math.abs((await S(() => window.__phlippoStore.getState().featureEdit.draft.depth)) - 30) < 1e-6);
await depthField.fill('abc');
await page.waitForTimeout(150);
check('letters leave the value as it was', Math.abs((await S(() => window.__phlippoStore.getState().featureEdit.draft.depth)) - 30) < 1e-6);
await depthField.fill('0');
await page.waitForTimeout(150);
check('0 is held at the minimum (0.01)', (await S(() => window.__phlippoStore.getState().featureEdit.draft.depth)) >= 0.01);
// a zero depth through the store does not commit
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ depth: 0 }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(200);
check('a zero depth does not commit', !!(await S(() => window.__phlippoStore.getState().featureEdit)) && /positive number/.test(await lastMsg()), await lastMsg());
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ depth: Infinity })); // ignored: the draft keeps 0
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(200);
check('an infinite depth does not commit', !!(await S(() => window.__phlippoStore.getState().featureEdit)));
await S(() => window.__phlippoStore.getState().cancelFeature());
await page.screenshot({ path: `${OUT}/qa2-extrude-pm.png` });

console.log('step 2: an empty sketch gives no extrude');
// ---- an empty sketch gives no extrude
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k2' }); window.__phlippoStore.getState().startFeature('extrude', 'boss'); });
await page.waitForTimeout(200);
check('Extrude on an empty sketch is refused with a message', !(await S(() => window.__phlippoStore.getState().featureEdit)) && /empty/.test(await lastMsg()), await lastMsg());

console.log('step 3: a cut that touches nothing is an error of that feature; the plate stays');
// ---- a cut that touches nothing is an error of that feature; the plate stays
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k3' }); window.__phlippoStore.getState().startFeature('extrude', 'cut'); });
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ end: 'throughAll' }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(500);
const afterCut = await S(() => { const s = window.__phlippoStore.getState(); return { bodies: s.rebuild.bodies.length, errors: s.rebuild.errors, features: s.doc.features.length }; });
check('the far cut is marked as an error, the plate is still there', afterCut.bodies === 1 && Object.keys(afterCut.errors).length === 1, JSON.stringify(afterCut));
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(300);

console.log('step 4: instance limit');
// ---- instance limit
await S(() => { const s = window.__phlippoStore.getState(); window.__phlippoStore.setState({ selectedFeatureId: 'e1' }); s.startPattern('linearPattern'); });
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ featureIds: ['e1'], dir1: { axis: [1, 0, 0], spacing: 70, count: 100 }, dir2: { axis: [0, 0, 1], spacing: 50, count: 100 } }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(200);
check('10 000 instances are refused', !!(await S(() => window.__phlippoStore.getState().featureEdit)) && /Too many instances/.test(await lastMsg()), await lastMsg());
await S(() => window.__phlippoStore.getState().cancelFeature());

console.log('step 5: dangling edge references: a fillet on the four vertical edges, then the plate grows → the edges move → warning');
// ---- dangling edge references: a fillet on the four vertical edges, then the plate grows → the edges move → warning
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const vertical = b.edges.filter((e) => e.straight && Math.abs(e.points[0].y - e.points[e.points.length - 1].y) > 5);
  window.__phlippoStore.setState({ selectedEdges: vertical.map((e) => e.id) });
  s.startRound('fillet');
});
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ size: 3 }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(500);
const f0 = await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'fillet'); return { edges: f?.edges.length, err: s.rebuild.errors[f?.id] }; });
check('fillet on the four vertical edges builds clean', f0.edges === 4 && !f0.err, JSON.stringify(f0));
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Depth', { ...s.doc, features: s.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 40 } : f)) }); });
await page.waitForTimeout(600);
const f1 = await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'fillet'); return { err: s.rebuild.errors[f?.id] ?? '', bodies: s.rebuild.bodies.length }; });
check('after the plate grows the fillet reports its lost references instead of failing silently', /dangling|could not be found/i.test(f1.err) && f1.bodies === 1, JSON.stringify(f1));
await page.screenshot({ path: `${OUT}/qa2-dangling.png` });

console.log('step 6: mouse gestures: right-drag to the right = Right view; in a sketch left = Line');
// ---- mouse gestures: right-drag to the right = Right view; in a sketch left = Line
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down({ button: 'right' });
await page.mouse.move(cx + 30, cy, { steps: 3 });
await page.waitForTimeout(100);
check('the gesture guide shows while dragging with the right button', (await page.locator('[data-testid="gesture-guide"]').count()) === 1);
check('the aimed command is lit', (await page.locator('.k-gesture-item.active').innerText()) === 'Right');
await page.screenshot({ path: `${OUT}/qa2-gesture.png` });
await page.mouse.move(cx + 90, cy, { steps: 3 });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(400);
check('releasing to the right sets the Right view, no context menu', (await S(() => window.__phlippoStore.getState().viewName)) === '*Right' && (await page.locator('.k-menu').count()) === 0, await S(() => window.__phlippoStore.getState().viewName));
await page.mouse.move(cx, cy);
await page.mouse.down({ button: 'right' });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(300);
check('a plain right-click still opens the context menu', (await page.locator('.k-menu').count()) >= 1);
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().editSketch('s2'));
await page.waitForTimeout(400);
await page.mouse.move(cx, cy);
await page.mouse.down({ button: 'right' });
await page.mouse.move(cx - 90, cy, { steps: 4 });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(300);
check('in a sketch the left gesture starts the Line tool', (await S(() => window.__phlippoStore.getState().tool)) === 'line', await S(() => window.__phlippoStore.getState().tool));
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().exitSketch());

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
