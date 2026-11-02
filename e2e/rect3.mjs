// 3 Point Corner Rectangle, 3 Point Center Rectangle, Parallelogram and Midpoint Line, by design
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
const state = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const sk = s.doc.sketches[s.activeSketchId];
  const lines = Object.values(sk.entities).filter((e) => e.kind === 'line').map((e) => ({ id: e.id, c: !!e.construction, a: sk.points[e.p1], b: sk.points[e.p2] }));
  const kinds = sk.constraintOrder.map((id) => sk.constraints[id].kind);
  return { lines, kinds, status: s.solve[s.activeSketchId]?.status };
});
const len = (l) => Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);

// the Property Panel offers all five rectangle types, none greyed out
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
await page.waitForTimeout(200);
const types = await page.evaluate(() => [...document.querySelectorAll('.k-pm-recttypes .k-pm-typebtn')].map((b) => ({ t: b.title, d: b.disabled })));
check('Rectangle Type shows 5 types, all enabled', types.length === 5 && types.every((x) => !x.d), JSON.stringify(types));

// 3 Point Corner Rectangle: a tilted 50 x 30 rectangle
await page.click('[data-testid="rect3corner"]');
await clicks([[0, 0], [40, 30], [22, 54]]);
let S = await state();
let solid = S.lines.filter((l) => !l.c);
const lens = solid.map(len).map((v) => Math.round(v));
check('3 Point Corner Rectangle: four sides 50 / 30 at an angle', solid.length === 4 && lens.filter((v) => v === 50).length === 2 && lens.filter((v) => v === 30).length === 2, JSON.stringify(lens));
check('… with parallel and perpendicular relations', S.kinds.filter((k) => k === 'parallel').length === 2 && S.kinds.includes('perpendicular'), JSON.stringify(S.kinds));

const pm = await page.evaluate(() => ({ rows: document.querySelectorAll('[data-testid="rect-params"] .k-pm-ptpair').length, rel: document.querySelector('[data-testid="rect-relations"]')?.textContent ?? '' }));
check('after drawing, the PM shows Existing Relations and the corner Parameters', pm.rows === 4 && /Parallel/.test(pm.rel) && /Perpendicular/.test(pm.rel), JSON.stringify(pm));

// 3 Point Center Rectangle around (100, 0)
await page.evaluate(() => window.__phlippoStore.getState().setTool('rect3Center'));
await clicks([[100, 0], [120, 0], [110, 10]]);
S = await state();
solid = S.lines.filter((l) => !l.c);
const nr = solid.slice(4);
const xs = nr.flatMap((l) => [l.a.x, l.b.x]), ys = nr.flatMap((l) => [l.a.y, l.b.y]);
check('3 Point Center Rectangle: 40 x 20 around the centre with construction diagonals', nr.length === 4 && Math.abs(Math.max(...xs) - Math.min(...xs) - 40) < 0.5 && Math.abs(Math.max(...ys) - Math.min(...ys) - 20) < 0.5 && S.lines.filter((l) => l.c).length === 2, JSON.stringify({ w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }));

// Parallelogram
await page.evaluate(() => window.__phlippoStore.getState().setTool('parallelogram'));
await clicks([[0, -80], [50, -80], [70, -50]]);
S = await state();
solid = S.lines.filter((l) => !l.c).slice(8);
const fourth = solid.find((l) => Math.abs(l.a.x - 20) < 0.5 && Math.abs(l.a.y + 50) < 0.5 || Math.abs(l.b.x - 20) < 0.5 && Math.abs(l.b.y + 50) < 0.5);
check('Parallelogram: the fourth corner follows from the other three', solid.length === 4 && !!fourth, JSON.stringify(solid.map((l) => [l.a, l.b])));

// Midpoint Line
await page.evaluate(() => window.__phlippoStore.getState().setTool('midpointLine'));
await clicks([[150, -80], [170, -70]]);
S = await state();
const ml = S.lines.filter((l) => !l.c).slice(12)[0];
check('Midpoint Line: symmetric about the first click', ml && Math.abs((ml.a.x + ml.b.x) / 2 - 150) < 0.5 && Math.abs((ml.a.y + ml.b.y) / 2 + 80) < 0.5, JSON.stringify(ml));
check('the sketch solves without conflicts', S.status !== 'conflict' && S.status !== 'over', S.status);
await page.keyboard.press('Escape');
await page.screenshot({ path: `${OUT}/rect3.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
