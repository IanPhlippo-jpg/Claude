// Delete in a sketch with relations: a line of a (center) rectangle, the whole rectangle by box selection, a dimension
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';

const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const alive = async (label) => {
  const r = await Promise.race([page.evaluate(() => 1), new Promise((res) => setTimeout(() => res('timeout'), 4000))]);
  check(`Delete with ${label}: the app keeps responding`, r === 1, String(r));
  if (r !== 1) { console.log('FROZEN at', label); await browser.close(); process.exit(1); }
};
const ents = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? Object.keys(sk.entities).length : -1; });

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
for (const [tool, a, b] of [['centerRectangle', [0, 0], [40, 20]], ['rectangle', [60, 30], [120, 70]]]) {
  await page.evaluate((t) => window.__phlippoStore.getState().setTool(t), tool);
  let p = await P(...a); await page.mouse.click(p.x, p.y);
  p = await P(...b); await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(250);
}
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const n0 = await ents();
// click the top line of the center rectangle and delete it
let p = await P(10, 20); await page.mouse.click(p.x, p.y);
await page.waitForTimeout(200);
await page.keyboard.press('Delete');
await page.waitForTimeout(500);
await alive('one line of a center rectangle');
const n1 = await ents();
check('the line is deleted', n1 === n0 - 1, `${n0} -> ${n1}`);
// a corner point
p = await P(120, 70); await page.mouse.click(p.x, p.y);
await page.keyboard.press('Delete');
await page.waitForTimeout(500);
await alive('a corner point of a rectangle');
// box-select everything and delete
const a = await P(-60, 90), b = await P(160, -40);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(300);
await page.keyboard.press('Delete');
await page.waitForTimeout(800);
await alive('everything box-selected');
check('everything is deleted', (await ents()) === 0, String(await ents()));
// Ctrl+Z restores, then delete again
await page.keyboard.press('Control+z');
await page.waitForTimeout(500);
await alive('undo after delete');
await page.keyboard.press('Control+a');
await page.keyboard.press('Delete');
await page.waitForTimeout(800);
await alive('select all + delete');

// the Delete button of the Dimension Property Panel
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const l = Object.values(sk.entities).find((e) => e.kind === 'line' && !e.construction); s.commit('Dim', (k) => ({ ...k, constraints: { ...k.constraints, dd: { id: 'dd', kind: 'length', refs: [l.id], value: 50 } }, constraintOrder: [...k.constraintOrder, 'dd'] })); window.__phlippoStore.getState().selectConstraint('dd'); });
await page.waitForTimeout(400);
await page.locator('.k-pm-host button:has-text("Delete")').first().click();
await page.waitForTimeout(600);
await alive('the Delete button of the Dimension PM');
check('the page still shows the app (no white screen)', (await page.locator('.k-viewport').count()) === 1 && (await page.locator('.k-cm-tabs').count()) === 1);
// a relation PM Delete button
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const c = sk.constraintOrder.map((id) => sk.constraints[id]).find((k) => k.kind === 'horizontal'); if (c) s.selectConstraint(c.id); });
await page.waitForTimeout(300);
const btn = page.locator('.k-pm-host button:has-text("Delete")').first();
if (await btn.count()) { await btn.click(); await page.waitForTimeout(600); }
await alive('the Delete button of a relation');
check('still no white screen', (await page.locator('.k-viewport').count()) === 1);
// exit the sketch and delete the sketch feature from the tree context menu
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(400);
await page.locator('.k-tree-row:has-text("Sketch1")').first().click({ button: 'right' });
await page.waitForTimeout(200);
const del = page.locator('.k-menu-item:has-text("Delete")').first();
if (await del.count()) { await del.click(); await page.waitForTimeout(600); }
await alive('Delete from the tree context menu');
check('still no white screen after the tree Delete', (await page.locator('.k-viewport').count()) === 1);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
// every failed check and every page error makes the run fail (QA v0.3.4 F57)
process.exitCode = exitCode(results, errors);
await browser.close();
