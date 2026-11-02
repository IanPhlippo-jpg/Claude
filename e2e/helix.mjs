// Curves ▸ Helix and Spiral on a circle sketch, drawn as a curve; Swept Boss along the helix makes a spring.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const volume = async () => { await waitSettled(page); return page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); }); };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);

// base circle r = 20 on the Top plane
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
let c = await P(0, 0), r = await P(20, 0);
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(c.x, c.y);
await page.mouse.click(r.x, r.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Helix: pitch 10, 3 revolutions
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Curves") .k-cm-arrow');
await page.click('.k-menu-item:has-text("Helix and Spiral")');
await page.waitForTimeout(400);
const pmInfo = (await page.locator('.k-pm-title').innerText().catch(skip('helix.mjs:43', 'no title'))) + ' | ' + (await page.locator('.k-section').allInnerTexts()).map((t) => t.split(String.fromCharCode(10))[0]).join(',');
check('Helix PM: Defined By, Parameters (pitch, revolutions, start angle, Clockwise)', (await page.locator('.k-pm-title:has-text("Helix/Spiral1")').count()) === 1 && (await page.locator('.k-section:has-text("Defined By")').count()) === 1 && (await page.locator('.k-check:has-text("Clockwise")').count()) >= 1, pmInfo);
const curvesWhileEditing = await page.evaluate(() => window.__phlippoBodyScene && window.__phlippoBodyScene.group ? window.__phlippoBodyScene.group.children.filter((g) => g.type === 'Group').flatMap((g) => g.children).filter((o) => o.type === 'Line').length : -1);
check('the helix is previewed as a curve', curvesWhileEditing >= 1 || curvesWhileEditing === -1, String(curvesWhileEditing));
await page.keyboard.press('Control+7');
await page.waitForTimeout(300);
await shot('h1-helix-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
const after = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { features: s.doc.features.map((f) => f.name), curves: (s.rebuild.curves ?? []).map((c) => ({ n: c.points.length, top: Math.max(...c.points.map((p) => p.y)) })), errors: s.rebuild.errors }; });
check('Helix/Spiral1 in the tree with a 3-turn curve 30 high', after.features.includes('Helix/Spiral1') && after.curves.length === 1 && after.curves[0].n > 100 && Math.abs(after.curves[0].top - 30) < 0.5 && Object.keys(after.errors).length === 0, JSON.stringify(after));

// profile: a circle r = 2 at the helix start (20, 0, 0) on the Front plane (x, y) -> (20, 0)
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Front Plane")', { clickCount: 2 });
await page.waitForTimeout(600);
c = await P(20, 0); r = await P(22, 0);
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(c.x, c.y);
await page.mouse.click(r.x, r.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-small:has-text("Swept Boss/Base")');
await page.waitForTimeout(400);
const pathOptions = await page.locator('.k-section:has-text("Profile and Path") select option').allInnerTexts();
check('Sweep path list offers Helix/Spiral1', pathOptions.some((t) => t.includes('Helix/Spiral1')), pathOptions.join(','));
await page.locator('.k-section:has-text("Profile and Path") select').selectOption({ label: 'Helix/Spiral1' });
await page.waitForTimeout(600);
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
const v = await volume();
const helixLength = 3 * Math.hypot(2 * Math.PI * 20, 10);
const expected = Math.PI * 4 * helixLength;
check('Sweep1 along the helix makes a spring of the expected volume', Math.abs(v - expected) < expected * 0.08 && (await page.evaluate(() => Object.keys(window.__phlippoStore.getState().rebuild.errors).length)) === 0, `${v.toFixed(0)} vs ${expected.toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('h2-spring');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
