// Sketch commands that were "later": Partial Ellipse, Parabola, Conic, Style Spline, Equation Driven Curve,
// Fully Define Sketch, Drag Dimensions, Rapid Sketch and the Perspective view.
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const clicks = async (pts) => { for (const [x, y] of pts) { const p = await P(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(120); } };
const ents = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return Object.values(sk.entities).map((e) => ({ kind: e.kind, style: !!e.style, eq: e.equation?.expr, parabola: !!e.parabola, rho: e.rho })); });
const tool = (t) => page.evaluate((t) => window.__phlippoStore.getState().setTool(t), t);

// flyout entries are enabled now
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Ellipse"]) .k-cm-small-arrow');
await page.waitForTimeout(150);
const fly = await page.evaluate(() => [...document.querySelectorAll('.k-menu .k-menu-item')].filter((x) => /Partial Ellipse|Parabola|Conic/.test(x.textContent)).map((x) => ({ t: x.textContent.trim(), d: x.classList.contains('disabled') || x.hasAttribute('disabled') || x.getAttribute('aria-disabled') === 'true' })));
check('Ellipse flyout: Partial Ellipse, Parabola and Conic are enabled', fly.length === 3 && fly.every((x) => !x.d), JSON.stringify(fly));
await page.keyboard.press('Escape');

// Partial Ellipse: centre, major axis end, start, end
await tool('partialEllipse');
await clicks([[0, 0], [40, 0], [0, 20], [-40, 0]]);
let E = await ents();
check('Partial Ellipse creates an ellipseArc entity', E.some((e) => e.kind === 'ellipseArc'), JSON.stringify(E));

// Parabola: focus, apex, start, end
await tool('parabola');
await clicks([[80, 10], [80, 0], [60, 0], [100, 0]]);
E = await ents();
check('Parabola creates a conic with rho 0.5', E.some((e) => e.kind === 'conic' && e.parabola && Math.abs(e.rho - 0.5) < 1e-9), JSON.stringify(E));

// Conic: start, end, top vertex, rho
await tool('conic');
await clicks([[0, -60], [60, -60], [30, -20], [30, -35]]);
E = await ents();
const conic = E.find((e) => e.kind === 'conic' && !e.parabola);
check('Conic with rho from the shoulder point (≈ 0.63)', conic && Math.abs(conic.rho - 0.625) < 0.05, JSON.stringify(conic));

// Style Spline: four control points, Enter finishes
await tool('styleSpline');
await clicks([[-80, -60], [-70, -20], [-40, -20], [-30, -60]]);
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
E = await ents();
check('Style Spline is a Bezier spline', E.some((e) => e.kind === 'spline' && e.style), JSON.stringify(E));

// Equation Driven Curve through the Property Panel
await tool('equationCurve');
await page.waitForTimeout(200);
await page.fill('[data-testid="eq-expr"]', '5*sin(x/5)');
await page.click('[data-testid="eq-apply"]');
await page.waitForTimeout(300);
E = await ents();
check('Equation Driven Curve y = 5*sin(x/5) is added', E.some((e) => e.kind === 'spline' && e.eq === '5*sin(x/5)'), JSON.stringify(E));
await page.screenshot({ path: `${OUT}/sketchcurves.png` });

// Fully Define Sketch on a fresh sketch with a loose rectangle and a circle
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(300);
await tool('rectangle');
await clicks([[10, 10], [70, 50]]);
await tool('circle');
await clicks([[40, 30], [46, 30]]);
const dof0 = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return s.solve[s.activeSketchId]?.dof; });
await tool('fullyDefine');
await page.waitForTimeout(200);
await page.click('[data-testid="fd-calc"]');
await page.waitForTimeout(800);
const fd = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { dof: s.solve[s.activeSketchId]?.dof, status: s.solve[s.activeSketchId]?.status }; });
check('Fully Define Sketch: the sketch becomes fully defined', dof0 > 0 && fd.dof === 0 && fd.status === 'full', JSON.stringify({ dof0, ...fd }));
await page.screenshot({ path: `${OUT}/fullydefine.png` });

// Drag Dimensions: drag the handle of a length dimension
await page.click('.k-cm-big:has-text("Drag Dimensions")');
const dim = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const c = sk.constraintOrder.map((id) => sk.constraints[id]).find((k) => k.kind === 'length'); s.selectConstraint(c.id); return { id: c.id, v: c.value }; });
await page.waitForTimeout(300);
const grip = await page.locator('[data-testid="instant2d-grip"]').boundingBox();
check('Drag Dimensions shows a drag handle on the selected dimension', !!grip);
if (grip) {
  const sc = await page.evaluate(() => window.__phlippoCamera?.scale ?? null);
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + grip.height / 2 + 1, { steps: 6 });
  await page.mouse.move(grip.x + grip.width / 2 - 60, grip.y + grip.height / 2 + 1, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const v1 = await page.evaluate((id) => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId].constraints[id].value; }, dim.id);
  check('dragging the Drag Dimensions handle changes the dimension value', Math.abs(v1 - dim.v) >= 1, JSON.stringify({ before: dim.v, after: v1, sc }));
}

// Rapid Sketch: with a tool active, clicking the Right Plane edge-on is not possible here, so switch via the store hook
await page.click('.k-cm-big:has-text("Rapid Sketch")');
const rapid = await page.evaluate(() => window.__phlippoStore.getState().rapidSketch);
check('Rapid Sketch toggles on', rapid === true);
const before = await page.evaluate(() => window.__phlippoStore.getState().activeSketchId);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setTool('line'); s.rapidSwitch({ plane: 'right' }); });
await page.waitForTimeout(400);
const after = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { id: s.activeSketchId, plane: s.doc.sketches[s.activeSketchId]?.plane, tool: s.tool }; });
check('Rapid Sketch starts a new sketch on the other plane with the same tool', after.id && after.id !== before && after.plane === 'right' && after.tool === 'line', JSON.stringify(after));
await page.keyboard.press('Escape');
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());

// Perspective (View Settings)
await page.evaluate(() => { const s = window.__phlippoStore.getState(); if (!s.show.perspective) s.toggleShow('perspective'); });
await page.waitForTimeout(400);
const persp = await page.evaluate(() => window.__phlippoStore.getState().show.perspective);
check('View Settings ▸ Perspective is on', persp === true);
await page.screenshot({ path: `${OUT}/perspective.png` });
const pick = await P(10, 10);
check('picking still works in perspective (sketch point projects into the viewport)', pick && pick.x > 0 && pick.y > 0, JSON.stringify(pick));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
