// Straight Slot / Centerpoint Straight Slot (videos 04, 39): entities, relations, solver status, extrude.
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; if (!sk) return null; return { kinds: sk.entityOrder.map((id) => sk.entities[id].kind + (sk.entities[id].construction ? '*' : '')), rels: sk.constraintOrder.map((id) => sk.constraints[id].kind), status: s.solve[sk.id]?.status, tool: s.tool }; });

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
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;

// Straight Slot: start, end, width
await page.click('.k-cm-iconbtn[data-tip="Straight Slot"]');
check('Straight Slot tool active with its Property Panel', (await S()).tool === 'slot' && (await page.locator('.k-pm-title:has-text("Slot")').count()) === 1);
await page.mouse.click(cx - 150, cy);
await page.mouse.move(cx + 150, cy);
await page.waitForTimeout(100);
await page.mouse.click(cx + 150, cy);
await page.mouse.move(cx, cy - 40);
await page.waitForTimeout(150);
await shot('s1-slot-preview');
await page.mouse.click(cx, cy - 40);
await page.waitForTimeout(300);
let st = await S();
check('slot = 2 lines + 2 arcs + construction centerline', st.kinds.filter((k) => k === 'line').length === 2 && st.kinds.filter((k) => k === 'arc').length === 2 && st.kinds.includes('line*'), st.kinds.join(','));
check('relations: 4 tangent + 1 equal', st.rels.filter((r) => r === 'tangent').length === 4 && st.rels.filter((r) => r === 'equal').length === 1, st.rels.join(','));
check('sketch solves (not over defined)', st.status !== 'over' && st.status !== 'error', String(st.status));
await page.keyboard.press('Escape');

// Centerpoint Straight Slot from the fly-out
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Straight Slot"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Centerpoint Straight Slot")');
await page.waitForTimeout(100);
check('Centerpoint Straight Slot tool', (await S()).tool === 'centerSlot');
await page.mouse.click(cx, cy + 150);
await page.mouse.click(cx + 100, cy + 150);
await page.mouse.click(cx, cy + 120);
await page.waitForTimeout(300);
st = await S();
check('second slot added (10 entities)', st.kinds.length === 10, st.kinds.join(','));
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await shot('s2-two-slots');

// Shift+click on an arc: Smart Dimension from the slot's end arc EDGE to the other slot's line (Arc Condition Min)
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.waitForTimeout(100);
// the right end arc of the first slot (centre cx+150, cy; radius 40 px): click on its outer edge with Shift
await page.keyboard.down('Shift');
await page.mouse.click(cx + 190, cy);
await page.keyboard.up('Shift');
await page.waitForTimeout(100);
// the top line of the second slot (y = cy + 150 - 30)
await page.mouse.click(cx + 40, cy + 120);
await page.waitForTimeout(100);
await page.mouse.click(cx + 300, cy + 60);
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const dim = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const c = sk.constraintOrder.map((id) => sk.constraints[id]).find((x) => x.kind === 'distance'); if (!c) return null; const arc = Object.values(c.arcCondition ?? {})[0]; const r = arc ? sk.scalars[sk.entities[arc.entityId].r] : null; const P = (id) => (id in sk.points ? sk.points[id] : sk.points[sk.entities[id].p]); const line = sk.entities[c.refs[1]]; let centreDist = null; if (line && line.kind === 'line') { const p = P(c.refs[0]), la = sk.points[line.p1], lb = sk.points[line.p2]; const dx = lb.x - la.x, dy = lb.y - la.y; centreDist = Math.abs(dx * (p.y - la.y) - dy * (p.x - la.x)) / Math.hypot(dx, dy); } return { value: c.value, arc: !!arc, mode: arc?.mode, r, centreDist }; });
check('Shift+click dimension carries the arc condition (tangent)', !!dim && dim.arc && dim.mode === 'min', JSON.stringify(dim));
check('its value is the centre distance minus the radius (edge of the arc)', !!dim && dim.r > 0 && dim.centreDist !== null && Math.abs(dim.value - (dim.centreDist - dim.r)) < 0.01, JSON.stringify(dim));
await page.keyboard.press('Escape');
await shot('s2b-tangent-dimension');

// extrude: two closed slot contours become one body (two separate bodies, far apart)
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(700);
const r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { bodies: s.rebuild.bodies.length, errors: s.rebuild.errors }; });
check('slots extrude without errors', r.bodies >= 1 && Object.keys(r.errors).length === 0, JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('s3-slot-extruded');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
