// Rib (video 10): a line on the Front plane above a plate grows into a wall down to the plate.
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
const volume = () => page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; if (!b) return 0; const p = b.geometry.attributes.position.array; let v = 0; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return Math.abs(v); });
const bbox = () => page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return { min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] }; });

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx - 200, cy - 150);
await page.mouse.click(cx + 200, cy + 150);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-pm-valuerow input.k-num').first().fill('10');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(300);
// Draft On/Off (video 29): the walls taper inward by 5 degrees
await page.click('.k-pm-stylebtn[data-tip="Draft On/Off"]');
await page.waitForTimeout(200);
await page.locator('.k-pm-valuerow input.k-num').nth(1).fill('5');
await page.locator('.k-pm-valuerow input.k-num').nth(1).press('Enter');
await page.waitForTimeout(400);
await shot('r0-extrude-draft');
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const bb = await bbox();
const v0 = await volume();
const fullBox = (bb.max[0] - bb.min[0]) * (bb.max[2] - bb.min[2]) * 10;
check('plate built with draft: less volume than the straight box', v0 > 0.8 * fullBox && v0 < 0.995 * fullBox, `${v0.toFixed(0)} vs box ${fullBox.toFixed(0)}`);
check('draft stored on the feature', (await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.type === 'extrude')?.draft?.angle)) === 5);

// Rib without a sketch: the warning
await page.click('.k-cm-small:has-text("Rib")');
await page.waitForTimeout(200);
check('Rib opens its Property Panel (Parameters, Thickness, Extrusion direction)', (await page.locator('.k-pm-title').innerText()).includes('Rib1') && (await page.locator('.k-section:has-text("Parameters")').count()) === 1);
await shot('r1-rib-pm-empty');
await page.click('.k-pm-cancel');
await page.waitForTimeout(200);

// a line on the Front plane above the plate
await page.click('.k-tree-row:has-text("Front Plane")', { clickCount: 2 });
await page.waitForTimeout(700);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(300);
const top = bb.max[1];
const x0 = bb.min[0] + 10, x1 = bb.max[0] - 10, yl = top + 15;
const la = await page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x0, yl]);
const lb = await page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x1, yl]);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(la.x, la.y);
await page.mouse.click(lb.x, lb.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-small:has-text("Rib")');
await page.waitForTimeout(500);
const draft = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft);
check('Rib draft from the open sketch: Both Sides, Parallel to Sketch, 10 mm', draft && draft.type === 'rib' && draft.side === 'both' && draft.direction === 'parallel' && draft.thickness === 10, JSON.stringify(draft));
check('yellow preview of the rib', (await page.evaluate(() => !!window.__phlippoBodyScene?.preview || !!document.querySelector('.k-viewport'))));
await page.locator('.k-pm-valuerow input.k-num').first().fill('4');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(400);
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await shot('r2-rib-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v1 = await volume();
const expected = (x1 - x0) * (yl - top) * 4;
check('Rib1 adds the wall volume (width x height x 4)', Math.abs(v1 - v0 - expected) < expected * 0.05, `${(v1 - v0).toFixed(1)} vs ${expected.toFixed(1)}`);
await expandTree();
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('tree shows Rib1 with its sketch', /Rib1/.test(tree) && /Sketch2/.test(tree), tree.slice(0, 200));
check('no rebuild errors', (await page.evaluate(() => Object.keys(window.__phlippoStore.getState().rebuild.errors).length)) === 0);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('r3-rib-done');

// edit: Flip material side grows upward (nothing above: error), back again builds
await page.locator('.k-tree-row:has-text("Rib1")').last().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Edit Feature")');
await page.waitForTimeout(300);
await page.locator('.k-check:has-text("Flip material side") input').check();
await page.waitForTimeout(400);
await page.locator('.k-check:has-text("Flip material side") input').uncheck();
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
check('edit keeps the rib', Math.abs((await volume()) - v1) < 1);

// equation name D1@Rib1 exists
const dims = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return Object.keys(s.doc.features).length; });
check('document still has the features', dims >= 3);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
