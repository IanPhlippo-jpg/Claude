// Drawing by design (Ian's screenshot 2026-10-21): Auto Balloon layouts without crossing leaders, magnetic lines
// only while used, dragging balloons / notes / tables, balloons moving with their view, tables following the cursor,
// the ISO title block, automatic sheet scale and Standard 3 View without overlapping views.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

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
await page.click('.k-doctype:has-text("Part")');
const drw = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk-tekening.kcad', 'utf8')); delete drw.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), drw);
await page.waitForTimeout(2500);
const px = (x, y) => page.evaluate(([x, y]) => window.__phlippoSheet.toPx([x, y]), [x, y]);
const clickAt = async (x, y) => { const p = await px(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300); };
const sheet = () => page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0]);
const crosses = (p1, q1, p2, q2) => {
  const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p1, q1, p2) * o(p1, q1, q2) < 0 && o(p2, q2, p1) * o(p2, q2, q1) < 0;
};
const balloonCheck = (sh) => {
  const b = (sh.symbols ?? []).filter((s) => s.kind === 'balloon');
  let cross = 0, close = 0;
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
    if (crosses(b[i].anchor, b[i].position, b[j].anchor, b[j].position)) cross++;
    if (Math.hypot(b[i].position[0] - b[j].position[0], b[i].position[1] - b[j].position[1]) < 8) close++;
  }
  return { n: b.length, cross, close };
};
const isoId = (await sheet()).views.find((v) => v.type === 'isometric').id;
const isoPos = (await sheet()).views.find((v) => v.type === 'isometric').position;

// Auto Balloon, default Square layout
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; s.applyDocument('clear', { ...s.doc, sheets: [{ ...sh, symbols: [], magneticLines: [] }] }); s.startSymbol('autoBalloon'); });
await page.waitForTimeout(200);
check('Auto Balloon PM: Balloon Layout with 6 layouts, Square active', (await page.locator('[data-testid="balloon-layout"] .k-pm-typebtn').count()) === 6 && (await page.locator('[data-testid="balloon-layout-square"].active').count()) === 1);
await clickAt(isoPos[0], isoPos[1]);
await page.waitForTimeout(600);
let sh = await sheet();
let bc = balloonCheck(sh);
check('Square: a balloon per part, no crossing leaders, none on top of another', bc.n === 6 && bc.cross === 0 && bc.close === 0, JSON.stringify(bc));
check('Square: magnetic lines inserted but not drawn while not in use', (sh.magneticLines ?? []).length >= 1 && (await page.locator('[data-testid="magnetic-line"]').count()) === 0, String((sh.magneticLines ?? []).length));
check('balloons belong to their view', (sh.symbols ?? []).every((s) => s.viewId === isoId));
check('Auto Balloon is one undo step', await page.evaluate(() => { const S = window.__phlippoStore.getState; S().undo(); const n = (S().doc.sheets[0].symbols ?? []).length; S().redo(); return n === 0 && (S().doc.sheets[0].symbols ?? []).length === 6; }));
await page.screenshot({ path: `${OUT}/drawfix-square.png` });

// Top layout: one row above the view, ordered by the parts
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; s.applyDocument('clear', { ...s.doc, sheets: [{ ...sh, symbols: [], magneticLines: [] }] }); s.startSymbol('autoBalloon'); });
await page.click('[data-testid="balloon-layout-top"]');
await clickAt(isoPos[0], isoPos[1]);
await page.waitForTimeout(600);
sh = await sheet();
bc = balloonCheck(sh);
const ys = (sh.symbols ?? []).map((s) => s.position[1]);
check('Top: all balloons on one line above the view, no crossing leaders', bc.n === 6 && bc.cross === 0 && Math.max(...ys) - Math.min(...ys) < 1e-6 && ys[0] > isoPos[1], JSON.stringify({ bc, y: ys[0] }));
await page.screenshot({ path: `${OUT}/drawfix-top.png` });

// drag a balloon: it slides along its magnetic line (y stays), the line shows while dragging
const b0 = (await sheet()).symbols[0];
const from = await px(b0.position[0], b0.position[1]);
await page.mouse.move(from.x, from.y);
await page.mouse.down();
await page.mouse.move(from.x + 40, from.y + 6, { steps: 5 });
const lineWhileDrag = await page.locator('[data-testid="magnetic-line"]').count();
await page.mouse.up();
await page.waitForTimeout(200);
const b0b = (await sheet()).symbols.find((s) => s.id === b0.id);
check('dragging a balloon slides it along the magnetic line', Math.abs(b0b.position[1] - b0.position[1]) < 1e-6 && b0b.position[0] > b0.position[0] + 2 && lineWhileDrag === 1, JSON.stringify({ before: b0.position, after: b0b.position, lineWhileDrag }));

// moving the view carries its balloons
const vb = await px(isoPos[0] + 2, isoPos[1] - 30);
await page.mouse.move(vb.x, vb.y);
await page.mouse.down();
await page.mouse.move(vb.x - 50, vb.y, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(300);
sh = await sheet();
const moved = sh.views.find((v) => v.id === isoId).position[0] - isoPos[0];
const b0c = sh.symbols.find((s) => s.id === b0.id);
check('dragging the view moves its balloons and leader ends with it', moved < -5 && Math.abs(b0c.position[0] - b0b.position[0] - moved) < 0.01 && Math.abs(b0c.anchor[0] - b0b.anchor[0] - moved) < 0.01, JSON.stringify({ moved, b: b0c.position }));
await page.evaluate(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(200);

// Hole Table: on a free spot, follows the cursor, a click places it
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.selectDrawingView(s.doc.sheets[0].views.find((x) => x.type === 'front').id); s.insertHoleTable(); });
await page.waitForTimeout(200);
sh = await sheet();
let ht = sh.tables.find((t) => t.kind === 'hole');
check('Hole Table starts on a free spot clear of the title block', ht.position[1] - 0 > 10 + 44 + 5, JSON.stringify(ht.position));
const tgt = await px(30, 120);
await page.mouse.move(tgt.x, tgt.y, { steps: 3 });
await page.mouse.click(tgt.x, tgt.y);
await page.waitForTimeout(200);
ht = (await sheet()).tables.find((t) => t.kind === 'hole');
const toolAfter = await page.evaluate(() => window.__phlippoStore.getState().drawingTool);
check('the table follows the cursor and the click places it', Math.abs(ht.position[0] - 28) < 1 && Math.abs(ht.position[1] - 122) < 1 && !toolAfter, JSON.stringify({ pos: ht.position, toolAfter }));
const widths = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-testid="hole-table"] text')].map((t) => { const b = t.getBBox(); return b.width; }); return Math.max(...r); });
const cellW = await page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-testid="hole-table"] rect')].map((r) => +r.getAttribute('width'))));
check('Hole Table columns fit their text', widths < cellW, JSON.stringify({ widths, cellW }));

// drag a table and a note
const tp = await px(ht.position[0] + 3, ht.position[1] - 3);
await page.mouse.move(tp.x, tp.y);
await page.mouse.down();
await page.mouse.move(tp.x + 30, tp.y - 30, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(200);
const ht2 = (await sheet()).tables.find((t) => t.kind === 'hole');
check('a table is dragged with the mouse', ht2.position[0] > ht.position[0] + 3 && ht2.position[1] > ht.position[1] + 3, JSON.stringify(ht2.position));
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; s.applyDocument('note', { ...s.doc, sheets: [{ ...sh, notes: [...sh.notes, { id: 'ntx', text: 'MATERIAL: ALUMINIUM', position: [40, 200] }] }] }); });
await page.waitForTimeout(200);
const np = await px(45, 201);
await page.mouse.move(np.x, np.y);
await page.mouse.down();
await page.mouse.move(np.x + 40, np.y, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(200);
const nt = (await sheet()).notes.find((n) => n.id === 'ntx');
check('a note is dragged with the mouse', nt.position[0] > 45, JSON.stringify(nt.position));

// title block as the intended ISO sheet format
const tbText = await page.locator('.k-sheet-format').textContent();
check('ISO title block: DEBUR AND BREAK SHARP EDGES, DO NOT SCALE DRAWING, NAME/SIGNATURE/DATE, Q.A, size A3', ['DEBUR AND', 'BREAK SHARP', 'DO NOT SCALE', 'SIGNATURE', 'Q.A', 'MFG', 'REVISION', 'A3', 'SHEET 1 OF 1'].every((t) => tbText.includes(t)), tbText.slice(0, 200));
await page.screenshot({ path: `${OUT}/drawfix-tables.png` });

// new drawing of the door handle assembly: automatic scale + Standard 3 View without overlap, inside the sheet
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.openDocument({ ...s.doc, sheets: [{ ...s.doc.sheets[0], views: [], symbols: [], tables: [], notes: [], magneticLines: [], dimensions: [], centerMarks: [], scale: [1, 1] }] }); });
await page.waitForTimeout(500);
await page.evaluate((m) => { const s = window.__phlippoStore.getState(); s.startModelView(); s.setModelViewSource(m); }, asm);
await page.waitForTimeout(500);
const sc = (await sheet()).scale;
check('automatic scaling: the door (600 mm) gets 1 : 5 on A3', sc[0] === 1 && sc[1] === 5, JSON.stringify(sc));
await page.evaluate(() => window.__phlippoStore.getState().placeView([150, 180]));
await page.keyboard.press('Escape');
await page.evaluate(() => window.__phlippoStore.getState().cancelDrawingEdit());
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; s.openDocument({ ...s.doc, sheets: [{ ...sh, views: sh.views.slice(0, 1) }] }); window.__phlippoStore.getState().startStandardThreeViews(); });
await page.waitForTimeout(1500);
const sh3 = await sheet();
const three = await page.evaluate((ids) => ids.map((id) => window.__phlippoSheet.bounds(id)), sh3.views.slice(-3).map((v) => v.id));
let overlap = 0;
for (let i = 0; i < three.length; i++) for (let j = i + 1; j < three.length; j++) {
  const a = three[i], b = three[j];
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
}
const SW = 420, SH = 297;
const inside = three.every((b) => b.x >= 10 && b.y >= 10 && b.x + b.w <= SW - 10 && b.y + b.h <= SH - 10);
const clearTb = three.every((b) => b.y >= 10 + 44 || b.x + b.w <= SW - 10 - 180);
check('Standard 3 View: the three views do not overlap, stay on the sheet and clear of the title block', three.length === 3 && overlap === 0 && inside && clearTb, JSON.stringify({ three, overlap, inside, clearTb }));
await page.screenshot({ path: `${OUT}/drawfix-three.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
