// Block G-A: Insert Line orientation / midpoint line / add dimensions, Rectangle and Circle add dimensions, Control Vertex
// Parameters, Coradial and Equal Curve Length relations, Dimension All uppercase, Zebra Stripes, Equations solve order.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
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
const sk = () => S(() => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId]; });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
const proj = (x, y) => S(({ x, y }) => window.__phlippoProject({ x, y }), { x, y });
const clickAt = async (x, y) => { const q = await proj(x, y); await page.mouse.click(q.x, q.y); };

// ---- Insert Line: Orientation Horizontal holds the line level; Midpoint line; Add dimensions
await page.click('.k-cm-iconbtn[data-tip^="Line"]');
await page.waitForTimeout(200);
check('Insert Line PM shows Orientation (As sketched / Horizontal / Vertical / Angle)', (await page.locator('[data-testid="line-orientation"] label').count()) === 4);
await page.locator('[data-testid="line-orientation"] label:has-text("Horizontal") input').check();
await page.locator('[data-testid="tool-adddims"]').check();
await clickAt(-40, 0);
await clickAt(30, 17); // off the level: the orientation keeps the line horizontal
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
let s = await sk();
let line = Object.values(s.entities).find((e) => e.kind === 'line');
check('Horizontal orientation keeps the second point level', line && Math.abs(s.points[line.p1].y - s.points[line.p2].y) < 1e-6, line ? JSON.stringify([s.points[line.p1], s.points[line.p2]]) : 'no line');
check('Add dimensions puts a length dimension on the line', Object.values(s.constraints).some((c) => c.kind === 'length' && Math.abs(c.value - 70) < 1e-6), JSON.stringify(Object.values(s.constraints).map((c) => [c.kind, c.value])));
await S(() => window.__phlippoStore.getState().setSketchTool({ lineOrientation: 'sketched', addDimensions: false, midpointLine: true }));
await page.click('.k-cm-iconbtn[data-tip^="Line"]');
await page.waitForTimeout(150);
check('Midpoint line option in the Line PM', (await page.locator('[data-testid="line-midpoint"]').isChecked()) === true);
await clickAt(0, -30);
await clickAt(20, -30);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
s = await sk();
const lines = Object.values(s.entities).filter((e) => e.kind === 'line');
const ml = lines[lines.length - 1];
check('Midpoint line runs from the mirrored point through the first click to the second', ml && Math.abs(s.points[ml.p1].x + 20) < 1e-6 && Math.abs(s.points[ml.p2].x - 20) < 1e-6, ml ? JSON.stringify([s.points[ml.p1], s.points[ml.p2]]) : 'no line');
check('the first click became a midpoint relation', Object.values(s.constraints).some((c) => c.kind === 'midpoint'));
await S(() => window.__phlippoStore.getState().setSketchTool({ midpointLine: false }));

// ---- Rectangle and Circle with Add dimensions
await S(() => window.__phlippoStore.getState().setSketchTool({ addDimensions: true, circleDiameter: true }));
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await clickAt(40, 20);
await clickAt(70, 50);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
s = await sk();
check('Rectangle ▸ Add dimensions adds width and height', Object.values(s.constraints).filter((c) => c.kind === 'length' && Math.abs(c.value - 30) < 1e-6).length >= 2);
await page.click('.k-cm-iconbtn[data-tip^="Circle"]');
await page.waitForTimeout(150);
check('Circle PM shows Diameter dimensions', (await page.locator('[data-testid="circle-diameter"]').isChecked()) === true);
await clickAt(-50, 40);
await clickAt(-40, 40);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
s = await sk();
check('Circle ▸ Add dimensions adds a Ø20 diameter', Object.values(s.constraints).some((c) => c.kind === 'diameter' && Math.abs(c.value - 20) < 1e-6), JSON.stringify(Object.values(s.constraints).map((c) => [c.kind, c.value])));
await S(() => window.__phlippoStore.getState().setSketchTool({ addDimensions: false }));

// ---- Control Vertex Parameters on a selected point
const pid = await S(() => { const K = window.__phlippoKit; const st = window.__phlippoStore.getState(); let id = null; st.commit('Point', (k) => { const [k2, pt] = K.addPoint(k, { x: 10, y: 60 }); id = pt.p; return k2; }); return id; });
await S((pid) => window.__phlippoStore.setState({ selection: [{ kind: 'point', id: pid }] }), pid);
await page.waitForTimeout(200);
check('a selected point shows Control Vertex Parameters', (await page.locator('[data-testid="point-x"]').count()) === 1);
await page.locator('[data-testid="point-x"] input.k-num').fill('55');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check('X moves the point', Math.abs((await S((pid) => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId].points[pid].x; }, pid)) - 55) < 1e-6);
await page.keyboard.press('Escape');

// ---- Coradial and Equal Curve Length between two arcs
const arcs = await S(() => {
  const K = window.__phlippoKit;
  const st = window.__phlippoStore.getState();
  let ids = [];
  st.commit('Arcs', (k) => { let [k2, a] = K.addArc(k, { x: -80, y: -60 }, { x: -70, y: -60 }, { x: -80, y: -50 }, true); let b; [k2, b] = K.addArc(k2, { x: -78, y: -58 }, { x: -72, y: -58 }, { x: -78, y: -52 }, true); ids = [a.id, b.id]; return k2; });
  return ids;
});
await S((ids) => window.__phlippoStore.setState({ selection: ids.map((id) => ({ kind: 'entity', id })) }), arcs);
await page.waitForTimeout(250);
check('two arcs offer Coradial and Equal Curve Length', (await page.locator('.k-pm-relbtn:has-text("Coradial")').count()) === 1 && (await page.locator('.k-pm-relbtn:has-text("Equal Curve Length")').count()) === 1);
await page.click('.k-pm-relbtn:has-text("Coradial")');
await page.waitForTimeout(300);
s = await sk();
const [a, b] = arcs.map((id) => s.entities[id]);
check('Coradial: same centre and radius', Math.hypot(s.points[a.center].x - s.points[b.center].x, s.points[a.center].y - s.points[b.center].y) < 1e-4 && Math.abs(s.scalars[a.r] - s.scalars[b.r]) < 1e-4, `${JSON.stringify(s.points[a.center])} ${JSON.stringify(s.points[b.center])} ${s.scalars[a.r]} ${s.scalars[b.r]}`);
check('the relation shows its glyph in Existing Relations', (await page.locator('.k-pm-relations li:has-text("Coradial")').count()) >= 1);

// ---- Dimension All uppercase
const dimId = await S(() => { const s = window.__phlippoStore.getState(); const k = s.doc.sketches[s.activeSketchId]; return k.constraintOrder.find((id) => k.constraints[id].kind === 'length'); });
await S((id) => window.__phlippoStore.getState().selectConstraint(id), dimId);
await page.waitForTimeout(250);
check('Dimension PM has All uppercase', (await page.locator('[data-testid="dim-uppercase"]').count()) === 1);
await page.locator('[data-testid="dim-uppercase"]').check();
await page.waitForTimeout(200);
check('All uppercase stored on the dimension', (await S((id) => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId].constraints[id].uppercase; }, dimId)) === true);
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(300);

// ---- Zebra Stripes (Evaluate) on a body
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: window.__phlippoStore.getState().doc.features[0].id }); window.__phlippoStore.getState().startFeature('extrude', 'boss'); });
await page.waitForTimeout(300);
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-small:has-text("Zebra Stripes")');
await page.waitForTimeout(500);
check('Zebra Stripes turns on', (await S(() => window.__phlippoStore.getState().show.zebra)) === true);
check('the bodies use the stripe matcap', await S(() => { let found = false; window.__phlippoScene.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshMatcapMaterial && o.name && !o.name.startsWith('decal')) found = true; }); return found; }));
await page.screenshot({ path: `${OUT}/ga1-zebra.png` });
await page.click('.k-cm-small:has-text("Zebra Stripes")');

// ---- Equations: Automatic solve order
await S(() => window.__phlippoStore.getState().setDialog('equations'));
await page.waitForTimeout(300);
check('Equations dialog has Automatic solve order', (await page.locator('[data-testid="eq-autosolve"]').count()) === 1);
await page.keyboard.press('Escape');

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
