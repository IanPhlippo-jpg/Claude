// Tangent Arc, Perimeter Circle, Centerpoint Arc Slot and Horizontal Dimension from the ribbon flyouts.
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const K = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? sk.entityOrder.map((id) => sk.entities[id].kind + (sk.entities[id].construction ? '*' : '')) : []; });
const count = async (kind) => (await K()).filter((k) => k === kind).length;

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
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const click = async (x, y) => { const q = await P(x, y); await page.mouse.move(q.x, q.y); await page.waitForTimeout(50); await page.mouse.click(q.x, q.y); };
const sk = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const k = s.doc.sketches[s.activeSketchId]; return { ents: k.entityOrder.map((id) => { const e = k.entities[id]; return e.kind === 'arc' || e.kind === 'circle' ? { kind: e.kind, c: [k.points[e.center].x, k.points[e.center].y], r: k.scalars[e.r], con: e.construction } : { kind: e.kind }; }), cons: k.constraintOrder.map((id) => ({ kind: k.constraints[id].kind, value: k.constraints[id].value })) }; });
const fly = async (tip, label) => { await page.locator(`.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="${tip}"]) .k-cm-iconarrow, .k-cm-iconfly:has(.k-cm-iconbtn[data-tip="${tip}"]) button:not(.k-cm-iconbtn)`).first().click(); await page.click(`.k-menu-item:has-text("${label}")`); await page.waitForTimeout(150); };
// a line, then a Tangent Arc from its end
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await click(0, 0); await click(40, 0);
await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
await page.evaluate(() => window.__phlippoStore.getState().setTool('tangentArc'));
await click(40, 0); await click(60, 20);
await page.keyboard.press('Escape');
let s = await sk();
const ta = s.ents.find((e) => e.kind === 'arc');
check('Tangent Arc: centre (40, 20), R 20, tangent to the line', ta && Math.abs(ta.c[0] - 40) < 0.5 && Math.abs(ta.c[1] - 20) < 0.5 && Math.abs(ta.r - 20) < 0.5 && s.cons.some((c) => c.kind === 'tangent'), JSON.stringify(s));
// Perimeter Circle through three points
await page.evaluate(() => window.__phlippoStore.getState().setTool('perimeterCircle'));
await click(100, 0); await click(120, 20); await click(100, 40);
await page.keyboard.press('Escape');
s = await sk();
const pc = s.ents.find((e) => e.kind === 'circle');
check('Perimeter Circle: centre (100, 20), R 20', pc && Math.abs(pc.c[0] - 100) < 0.5 && Math.abs(pc.c[1] - 20) < 0.5 && Math.abs(pc.r - 20) < 0.5, JSON.stringify(pc));
// Centerpoint Arc Slot: centre (60, 20), start (80, 20), end at 90 degrees, width 8
await page.evaluate(() => window.__phlippoStore.getState().setTool('centerArcSlot'));
await click(60, 20); await click(80, 20); await click(60, 40); await click(84, 20);
await page.keyboard.press('Escape');
s = await sk();
const slotArcs = s.ents.filter((e) => e.kind === 'arc' && Math.abs(e.c[0] - 60) < 0.5 && Math.abs(e.c[1] - 20) < 0.5);
check('Centerpoint Arc Slot: outer R 24, inner R 16 and the construction centre arc', slotArcs.some((a) => Math.abs(a.r - 24) < 0.6) && slotArcs.some((a) => Math.abs(a.r - 16) < 0.6) && slotArcs.some((a) => a.con), JSON.stringify(s.ents) + await page.evaluate(() => window.__phlippoStore.getState().tool));
await shot('st2-new-tools');
// Horizontal Dimension of the line: 40
await page.evaluate(() => window.__phlippoStore.getState().setTool('hdim'));
await click(20, 0); await click(20, -15);
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
s = await sk();
const hd = s.cons.find((c) => c.kind === 'hDistance');
check('Horizontal Dimension of the line = 40', hd && Math.abs(hd.value - 40) < 0.01, JSON.stringify(s.cons));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
