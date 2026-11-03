// 3D Sketch dimensions through the UI: a line from the origin Along Z gets a length dimension (Fully Defined, the
// lines turn black), the value typed moves the line, a distance between two end points holds while an end point is
// dragged, and the dimensions are kept with the feature.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);
await page.click('.k-cm-tab:has-text("Sketch")');
await page.locator('.k-cm-big:has-text("Sketch") .k-cm-arrow').first().click();
await page.click('.k-menu-item:has-text("3D Sketch")');
await page.waitForTimeout(300);
const W = (x, y, z) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);
const edit = () => page.evaluate(() => window.__phlippoStore.getState().sketch3dEdit);
const status = () => page.locator('[data-testid="sketch3d-status"]').getAttribute('data-status');
const near = (a, b, t = 0.01) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < t;

// a line from the origin Along Z (Orientation ▸ Along Z gives the relation), then Esc ends the chain
let q = await W(0, 0, 0); await page.mouse.click(q.x, q.y);
await page.locator('[data-testid="sketch3d-orient-z"]').check();
q = await W(0, 0, 25); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y);
await page.waitForTimeout(150);
let e = await edit();
check('a line from the origin Along Z with its relation', e.segments.length === 1 && near(e.segments[0][0], [0, 0, 0]) && Math.abs(e.segments[0][1][0]) < 1e-6 && Math.abs(e.segments[0][1][1]) < 1e-6 && e.relations?.[0]?.kind === 'alongZ', JSON.stringify(e.segments));
check('with the relation only it is Under Defined', (await status()) === 'under');

// Smart Dimension on the line: length dimension at its length; with it the sketch is Fully Defined (lines black)
await page.click('[data-testid="sketch3d-dim-0"]');
await page.waitForTimeout(150);
e = await edit();
check('a length dimension at the length of the line', e.dims?.length === 1 && e.dims[0].kind === 'length' && Math.abs(e.dims[0].value - Math.abs(e.segments[0][1][2])) < 1e-6, JSON.stringify(e.dims));
check('1 relation + 1 dimension: Fully Defined (Property Panel and status bar)', (await status()) === 'full' && (await page.locator('[data-testid="sketch3d-status"]').innerText()) === 'Fully Defined' && (await page.locator('[data-testid="status-sketch3d"]').innerText()) === 'Fully Defined');
const lineColor = () => page.evaluate(() => window.__phlippoScene.getObjectByName('s3d-draft-0')?.material?.color?.getHex());
check('the fully defined line is drawn black', (await lineColor()) === 0, String(await lineColor()));
await page.locator('[data-testid="sketch3d-dimvalue-0"] input').fill('30');
await page.locator('[data-testid="sketch3d-dimvalue-0"] input').press('Enter');
await page.waitForTimeout(200);
e = await edit();
check('value 30 typed: the line ends at (0, 0, 30), the origin stays', near(e.segments[0][0], [0, 0, 0], 1e-6) && near(e.segments[0][1], [0, 0, 30], 1e-6), JSON.stringify(e.segments));
check('the dimension shows 30 in the graphics area', (await page.locator('[data-testid="sketch3d-dimlabel-0"]').textContent()) === '30');
await page.screenshot({ path: `${OUT}/s3d-dims-full.png` });

// a second, free line on from the end: Under Defined again; a distance from the origin to its end
await page.locator('[data-testid="sketch3d-orient-free"]').check();
q = await W(0, 0, 30); await page.mouse.click(q.x, q.y);
q = await W(40, 0, 30); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
e = await edit();
check('the second line from (0, 0, 30) to (40, 0, 30)', e.segments.length === 2 && near(e.segments[1][0], [0, 0, 30]) && near(e.segments[1][1], [40, 0, 30], 0.6), JSON.stringify(e.segments));
check('a free line: Under Defined, drawn blue again', (await status()) === 'under' && (await lineColor()) === 0x1e4fd8);
await page.locator('[data-testid="sketch3d-distance-0"]').selectOption('0');
await page.locator('[data-testid="sketch3d-distance-1"]').selectOption('2');
await page.click('[data-testid="sketch3d-add-distance"]');
await page.waitForTimeout(150);
e = await edit();
const d0 = Math.hypot(...e.segments[1][1]);
check('a distance dimension from the origin to the end of the second line', e.dims?.length === 2 && e.dims[1].kind === 'distance' && Math.abs(e.dims[1].value - d0) < 1e-5, JSON.stringify(e.dims));

// drag that end point (the chain is ended: the end points are drag handles) toward (30, 30, 30) on the XY plane
const g = await page.locator('[data-testid="sketch3d-grip-2"]').boundingBox();
const t = await W(30, 30, 30);
await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
await page.mouse.down();
await page.mouse.move(t.x, t.y, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
e = await edit();
const p = e.segments[1][1];
check('the dragged end moved toward the pointer and the distance held', p[1] > 15 && Math.abs(Math.hypot(...p) - e.dims[1].value) < 1e-5 && near(e.segments[0][1], [0, 0, 30], 1e-5), JSON.stringify({ p, dims: e.dims, l1: e.segments[0] }));
await page.screenshot({ path: `${OUT}/s3d-dims-drag.png` });

// a dimension that would over define is refused
await page.locator('[data-testid="sketch3d-distance-0"]').selectOption('0');
await page.locator('[data-testid="sketch3d-distance-1"]').selectOption('1');
await page.click('[data-testid="sketch3d-add-distance"]');
await page.waitForTimeout(150);
check('a distance on the fully defined line is refused (would over define)', (await edit()).dims.length === 2);

// OK: the dimensions are kept with the feature and come back when it is edited
await page.click('[data-testid="sketch3d-pm"] .k-pm-ok');
await page.waitForTimeout(400);
const f = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((x) => x.type === 'sketch3d'));
check('3DSketch1 keeps its two dimensions', f?.dims?.length === 2, JSON.stringify(f?.dims));
await page.evaluate((id) => window.__phlippoStore.getState().edit3DSketch(id), f.id);
await page.waitForTimeout(200);
check('editing it again shows the dimensions', (await page.locator('[data-testid="sketch3d-dim-row"]').count()) === 2);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
