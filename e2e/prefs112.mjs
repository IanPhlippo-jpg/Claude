// QA 0.5.12 F112: two more options of Tools ▸ Options that do something, proved in the app with the mouse.
// - Sketch ▸ Relations/Snaps ▸ Tangent: a line drawn from outside a circle snaps to the tangent point, the overlay
//   shows the tangent mark, and the line gets a Tangent relation; with the option off the mark does not come.
// - Feature Tree ▸ Name feature on creation: OK in the PropertyManager opens the new feature's name for typing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { exitCode } from './lib/check.mjs';

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
const setPref = (k, v) => S(([k, v]) => { const s = window.__phlippoStore.getState(); s.setPrefs({ ...s.prefs, [k]: v }); }, [k, v]);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => S(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const move = async (x, y) => { const q = await P(x, y); await page.mouse.move(q.x, q.y); await page.waitForTimeout(80); };
const click = async (x, y) => { await move(x, y); await page.mouse.click((await P(x, y)).x, (await P(x, y)).y); await page.waitForTimeout(80); };
const sketch = () => S(() => { const s = window.__phlippoStore.getState(); const k = s.doc.sketches[s.activeSketchId]; return { lines: k.entityOrder.filter((id) => k.entities[id].kind === 'line').map((id) => [k.points[k.entities[id].p1], k.points[k.entities[id].p2]]), cons: k.constraintOrder.map((id) => k.constraints[id].kind) }; });

// a circle of radius 10 at the origin
await S(() => window.__phlippoStore.getState().setTool('circle'));
await click(0, 0); await click(10, 0);
await page.keyboard.press('Escape');
// a line from (40, 0): the tangent point seen from there is (2.5, 9.682)
const T = { x: 2.5, y: Math.sqrt(100 - 6.25) };
await S(() => window.__phlippoStore.getState().setTool('line'));
await click(40, 0);
await move(T.x + 0.15, T.y - 0.1);
check('Tangent snap: the tangent mark shows at the tangent point', (await page.locator('[data-testid="snap-tangent"]').count()) === 1);
await page.screenshot({ path: `${OUT}/prefs112-tangent.png` });
await click(T.x + 0.15, T.y - 0.1);
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const s1 = await sketch();
const end = s1.lines[0]?.[1];
check('the line ends on the tangent point', !!end && Math.hypot(end.x - T.x, end.y - T.y) < 0.02, JSON.stringify(end));
check('the line gets a Tangent relation', s1.cons.includes('tangent'), JSON.stringify(s1.cons));

// with Tangent off the mark does not come at the same place
await setPref('snaps.tangent', false);
await S(() => window.__phlippoStore.getState().setTool('line'));
await click(40, -30);
await move(T.x + 0.15, T.y - 0.1);
check('Tangent off: no tangent mark', (await page.locator('[data-testid="snap-tangent"]').count()) === 0);
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
await setPref('snaps.tangent', true);

// Name feature on creation: OK opens the new feature's name for typing
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(300);
await setPref('fm.nameOnCreation', true);
await S(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const box = page.locator('.k-tree input.k-input');
const focused = await S(() => document.activeElement?.tagName === 'INPUT' && /Extrude/.test(document.activeElement.value));
check('Name feature on creation: the new feature name is open for typing', (await box.count()) === 1 && focused, String(await box.count()));
await page.screenshot({ path: `${OUT}/prefs112-name.png` });
await page.keyboard.type('Plaat');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const names = await S(() => window.__phlippoStore.getState().doc.features.map((f) => f.name));
check('the typed name is the feature name', names.includes('Plaat'), JSON.stringify(names));
// off (the default): no name box after OK
await setPref('fm.nameOnCreation', false);
await S(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await page.waitForTimeout(300);
const before = (await S(() => window.__phlippoStore.getState().doc.features.length));
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const after = (await S(() => window.__phlippoStore.getState().doc.features.length));
check('Name feature on creation off: no name box', (await box.count()) === 0, JSON.stringify({ before, after }));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
