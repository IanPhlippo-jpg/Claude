// Extrude end conditions: Offset From Surface with a picked face, then Up To Next; Sensors in the tree.
import { chromium } from 'playwright';
import { exitCode, skip, waitSettled } from './lib/check.mjs';
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
const volume = async () => { await waitSettled(page); return page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; if (!b) return 0; const p = b.geometry.attributes.position.array; let v = 0; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return Math.abs(v); }); };

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
await page.locator('.k-pm-valuerow input.k-num').first().press('Tab');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const v0 = await volume();
check('plate built', v0 > 0);

// a small rectangle on the Top plane (the bottom face of the plate), cut upward
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Top Plane")', { clickCount: 2 });
await page.waitForTimeout(700);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(300);
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx - 40, cy - 40);
await page.mouse.click(cx + 40, cy + 40);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const area = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const pts = Object.values(sk.points); const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); });
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Cut") .k-cm-main');
await page.waitForTimeout(400);
const sel = page.locator('.k-section:has-text("Direction 1") select.k-input').first();
const opts = await sel.locator('option').allInnerTexts();
check('Direction 1 lists Blind, Through All, Through All - Both, Up To Next, Up To Vertex, Up To Surface, Offset From Surface, Up To Body, Mid Plane', opts.join(',') === 'Blind,Through All,Through All - Both,Up To Next,Up To Vertex,Up To Surface,Offset From Surface,Up To Body,Mid Plane', opts.join(','));
await sel.selectOption('offsetFromSurface');
await page.waitForTimeout(200);
check('Offset From Surface asks for a face', (await page.locator('.k-selbox:has-text("Select a face")').count()) === 1);
// pick the top face of the plate (normal +y) through the store, as a click in the graphics area would
const picked = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => Math.abs(x.normal[1] - 1) < 1e-3); if (!f) return null; s.setSelectedFace({ bodyId: b.id, faceId: f.id }); return window.__phlippoStore.getState().featureEdit?.draft?.surface?.label ?? null; });
check('picked face appears in the selection box', !!picked && (await page.locator('.k-selbox-row:has-text("Face<")').count()) === 1, String(picked));
await page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').first().fill('3');
await page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').first().press('Tab');
await page.waitForTimeout(500);
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await shot('u1-offset-from-surface');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v1 = await volume();
check('Offset From Surface 3 mm cuts 7 mm deep (area x 7)', Math.abs(v0 - v1 - area * 7) < area * 0.05, `${(v0 - v1).toFixed(1)} vs ${(area * 7).toFixed(1)}`);
check('no rebuild errors', (await page.evaluate(() => Object.keys(window.__phlippoStore.getState().rebuild.errors).length)) === 0);

// edit: Up To Next goes through to the top face (10 mm)
await page.locator('.k-tree-row:has-text("Cut-Extrude1")').last().click({ button: 'right' });
await page.click('[data-testid="ctx-edit-feature"]');
await page.waitForTimeout(300);
await page.locator('.k-section:has-text("Direction 1") select.k-input').first().selectOption('upToNext');
await page.waitForTimeout(300);
check('Up To Next hides the depth field (by design)', (await page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').count()) === 1);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v2 = await volume();
check('Up To Next cuts through the plate (area x 10)', Math.abs(v0 - v2 - area * 10) < area * 0.05, `${(v0 - v2).toFixed(1)} vs ${(area * 10).toFixed(1)}`);
await shot('u2-up-to-next');

// RMB menu during an extrude lists the end conditions
await page.locator('.k-tree-row:has-text("Cut-Extrude1")').last().click({ button: 'right' });
await page.click('[data-testid="ctx-edit-feature"]');
await page.waitForTimeout(300);
await page.mouse.click(cx + 300, cy - 300, { button: 'right' });
await page.waitForTimeout(200);
const menuText = (await page.locator('.k-ctx').innerText().catch(skip('endconditions.mjs:102', ''))).replace(/\s+/g, ' ');
check('RMB menu offers Up To Next / Up To Vertex / Up To Surface / Offset From Surface', /Up To Next/.test(menuText) && /Up To Vertex/.test(menuText) && /Up To Surface/.test(menuText) && /Offset From Surface/.test(menuText), menuText.slice(0, 160));
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check('Esc with the menu open closes only the menu, the Property Panel stays', (await page.locator('.k-ctx').count()) === 0 && (await page.evaluate(() => !!window.__phlippoStore.getState().featureEdit)));
await page.click('.k-pm-cancel');
await page.waitForTimeout(300);

// Up To Vertex: edit the cut to Blind 3, then Up To Vertex on a top corner of the plate (10 high)
await page.locator('.k-tree-row:has-text("Cut-Extrude1")').last().click({ button: 'right' });
await page.click('[data-testid="ctx-edit-feature"]');
await page.waitForTimeout(300);
await page.locator('.k-section:has-text("Direction 1") select.k-input').first().selectOption('blind');
await page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').first().fill('3');
await page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').first().press('Tab');
await page.click('.k-pm-ok');
await page.waitForTimeout(700);
check('Blind 3 cut', Math.abs(v0 - (await volume()) - area * 3) < area * 0.05);
await page.locator('.k-tree-row:has-text("Cut-Extrude1")').last().click({ button: 'right' });
await page.click('[data-testid="ctx-edit-feature"]');
await page.waitForTimeout(300);
await page.locator('.k-section:has-text("Direction 1") select.k-input').first().selectOption('upToVertex');
await page.waitForTimeout(200);
check('Up To Vertex asks for a vertex', (await page.locator('.k-selbox:has-text("Select a vertex")').count()) === 1);
const corner = await page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; b.geometry.computeBoundingBox(); const m = b.geometry.boundingBox.max; return window.__phlippoProjectWorld(m.x, m.y, m.z); });
await page.mouse.click(corner.x, corner.y);
await page.waitForTimeout(500);
check('the clicked corner becomes Vertex<1>', (await page.locator('.k-selbox-row:has-text("Vertex<1>")').count()) === 1);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
check('Up To Vertex cuts up to the top of the plate (area x 10)', Math.abs(v0 - (await volume()) - area * 10) < area * 0.05, `${(v0 - (await volume())).toFixed(1)} vs ${(area * 10).toFixed(1)}`);

// Sensors: Add Sensor ▸ Mass shows the mass in the tree
await page.locator('.k-tree-row:has-text("Sensors")').first().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Mass")');
await page.waitForTimeout(300);
await expandTree();
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('Mass1 sensor with its value in the tree, as Mass1(74.1112018 g)', /Mass1\(\d+\.\d{7} g\)/.test(tree), tree.slice(0, 200));
await shot('u3-sensor');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
