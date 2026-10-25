// Sketch editing tools: Trim Entities, Sketch Fillet, Offset Entities, Linear/Circular Sketch Pattern, Move/Copy/Rotate, Convert Entities.
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

// a 40 x 30 rectangle and a vertical line crossing its bottom side
let a = await P(0, 0), b = await P(40, 30);
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(a.x, a.y);
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
a = await P(20, -10); b = await P(20, 10);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(a.x, a.y);
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
check('rectangle + crossing line = 5 lines', (await count('line')) === 5, (await K()).join(','));

// Trim Entities: click the bit of the crossing line that sticks out below the rectangle
await page.click('.k-cm-big:has-text("Trim Entities") .k-cm-main');
await page.waitForTimeout(100);
check('Trim PM with Trim to closest', (await page.locator('.k-pm-title:has-text("Trim")').count()) === 1 && (await page.locator('.k-check:has-text("Trim to closest")').count()) === 1);
a = await P(20, -5);
await page.mouse.click(a.x, a.y);
await page.waitForTimeout(200);
const afterTrim = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const ys = sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e.kind === 'line').map((e) => [sk.points[e.p1].y, sk.points[e.p2].y]); return ys; });
check('the piece below the rectangle is gone, the rest stays (5 lines, lowest y = 0)', afterTrim.length === 5 && Math.min(...afterTrim.flat()) >= -1e-6, JSON.stringify(afterTrim));
await page.keyboard.press('Escape');

// Sketch Fillet: radius 5 at the top-right corner (click the top side, then the right side)
await page.click('.k-cm-iconbtn[data-tip="Sketch Fillet"]');
await page.waitForTimeout(100);
await page.locator('.k-section:has-text("Fillet Parameters") input.k-num').first().fill('5');
await page.locator('.k-section:has-text("Fillet Parameters") input.k-num').first().press('Tab');
a = await P(10, 30); b = await P(40, 15);
await page.mouse.click(a.x, a.y);
await page.waitForTimeout(100);
await page.mouse.click(b.x, b.y);
await page.waitForTimeout(300);
check('Sketch Fillet adds an arc with two tangent relations', (await count('arc')) === 1 && (await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk.constraintOrder.map((id) => sk.constraints[id].kind).filter((k) => k === 'tangent').length; })) >= 2, (await K()).join(','));
await page.keyboard.press('Escape');
await shot('t1-trim-fillet');

// Sketch Chamfer 4 at the bottom-left corner (left side, then bottom side); Extend the trimmed line downward is not possible (nothing below) -> extend upward to the top side
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Sketch Fillet"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Sketch Chamfer")');
await page.waitForTimeout(100);
await page.locator('.k-section:has-text("Chamfer Parameters") input.k-num').first().fill('4');
await page.locator('.k-section:has-text("Chamfer Parameters") input.k-num').first().press('Tab');
a = await P(0, 15); b = await P(10, 0);
await page.mouse.click(a.x, a.y);
await page.waitForTimeout(100);
await page.mouse.click(b.x, b.y);
await page.waitForTimeout(300);
const chamfered = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e.kind === 'line').map((e) => [sk.points[e.p1], sk.points[e.p2]]).some(([p, q]) => Math.abs(p.x + p.y - 4) < 1e-6 && Math.abs(q.x + q.y - 4) < 1e-6); });
check('Sketch Chamfer adds the 4 x 4 corner line', chamfered, JSON.stringify(await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return { tool: s.tool, sel: s.selection, lines: sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e.kind === 'line').map((e) => [sk.points[e.p1], sk.points[e.p2]]) }; })));
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Trim Entities") .k-cm-arrow');
await page.click('.k-menu-item:has-text("Extend Entities")');
await page.waitForTimeout(100);
const extTool = await page.evaluate(() => window.__phlippoStore.getState().tool);
check('Extend Entities tool from the Trim fly-out', extTool === 'extend', extTool);
await page.keyboard.press('Escape');

// Offset Entities: select the left side, offset 3 (reverse = outward for this chain), OK
await page.click('.k-cm-big:has-text("Offset Entities") .k-cm-main');
await page.waitForTimeout(100);
a = await P(0, 15);
await page.mouse.click(a.x, a.y);
await page.locator('.k-section:has-text("Parameters") input.k-num').first().fill('3');
await page.locator('.k-section:has-text("Parameters") input.k-num').first().press('Tab');
// Select chain is on by default (as the original); off: only the picked line is offset
await page.click('[data-testid="offset-chain"]');
const linesBefore = await count('line');
await page.click('.k-pm-ok');
await page.waitForTimeout(300);
check('Offset Entities adds an offset line', (await count('line')) === linesBefore + 1, String(await count('line')));

// Linear Sketch Pattern of a small circle: 3 instances 15 apart
a = await P(5, 40); b = await P(7, 40);
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(a.x, a.y);
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
await page.click('.k-cm-small:has-text("Linear Sketch Pattern")');
await page.waitForTimeout(100);
a = await P(7, 40);
await page.mouse.click(a.x, a.y);
await page.locator('.k-section:has-text("Direction 1") input.k-num').first().fill('15');
await page.locator('.k-section:has-text("Direction 1") input.k-num').nth(1).fill('3');
await page.locator('.k-section:has-text("Direction 1") input.k-num').nth(1).press('Tab');
await page.click('.k-pm-ok');
await page.waitForTimeout(300);
check('Linear Sketch Pattern: 3 circles', (await count('circle')) === 3, String(await count('circle')));

// Move Entities: move the first circle by (0, 10)
await page.click('.k-cm-iconfly:has(.k-cm-small:has-text("Move Entities")) .k-cm-small-arrow').catch(() => undefined);
await page.click('.k-menu-item:has-text("Move Entities")').catch(() => page.click('.k-cm-small:has-text("Move Entities")'));
await page.waitForTimeout(100);
a = await P(7, 40);
await page.mouse.click(a.x, a.y);
await page.locator('.k-section:has-text("Parameters") input.k-num').first().fill('0');
await page.locator('.k-section:has-text("Parameters") input.k-num').nth(1).fill('10');
await page.locator('.k-section:has-text("Parameters") input.k-num').nth(1).press('Tab');
await page.click('.k-pm-ok');
await page.waitForTimeout(300);
const moved = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e.kind === 'circle').map((e) => sk.points[e.center].y); });
check('Move Entities moved one circle up by 10', moved.some((y) => Math.abs(y - 50) < 0.5) && moved.filter((y) => Math.abs(y - 40) < 0.5).length === 2, JSON.stringify(moved));
await shot('t2-offset-pattern-move');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Edit Appearance (Render Tools): a colour for the part
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Render Tools")');
await page.click('.k-cm-big:has-text("Edit Appearance") .k-cm-main');
await page.waitForTimeout(200);
check('Color dialog with swatches', (await page.locator('[data-testid="appearance-dialog"]').count()) === 1 && (await page.locator('.k-swatch').count()) === 12);
await page.locator('.k-swatch').nth(1).click();
await page.click('.k-dialog-actions button:has-text("OK")');
await page.waitForTimeout(200);
check('appearance stored on the document', (await page.evaluate(() => window.__phlippoStore.getState().doc.appearance)) === '#d94b3d');
await page.click('.k-cm-tab:has-text("Sketch")');

// Convert Entities: extrude, then a new sketch on the Top plane converts a model edge
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const bodies = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.length);
check('sketch extrudes to solid bodies', bodies >= 1, String(bodies));
await page.click('.k-tree-row:has-text("Top Plane")', { clickCount: 2 });
await page.waitForTimeout(600);
await page.keyboard.press('Control+5');
await page.waitForTimeout(400);
// select the longest straight edge of the first body through the store (as a click on it would) and convert
const picked = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const e = b.edges.filter((x) => x.straight).sort((p, q) => q.length - p.length)[0]; if (!e) return 0; s.toggleSelectedEdge(e.id); return e.length; });
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Convert Entities") .k-cm-main');
await page.waitForTimeout(300);
const conv = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const l = sk.entityOrder.map((id) => sk.entities[id]).find((e) => e.kind === 'line'); if (!l) return null; const a = sk.points[l.p1], b = sk.points[l.p2]; return Math.hypot(a.x - b.x, a.y - b.y); });
check('Convert Entities turns the model edge into a sketch line of the same length', conv !== null && Math.abs(conv - picked) < 0.01, `${conv} vs ${picked}`);
await shot('t3-convert');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
