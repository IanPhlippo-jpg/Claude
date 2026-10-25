// Section View (heads-up toolbar): the model is cut by a reference plane with an offset; OK keeps it, the button toggles it off.
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
const drawnBox = () => page.evaluate(() => { const bs = window.__phlippoBodyScene; if (!bs || !bs.group) return null; const m = bs.group.children.find((o) => o.type === 'Mesh' && o.visible); if (!m) return null; m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; return { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] }; });

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
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const a = await P(-40, -30), b = await P(40, 30);
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(a.x, a.y);
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
const c = await P(0, 0), cr = await P(15, 0);
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(c.x, c.y);
await page.mouse.click(cr.x, cr.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-pm-valuerow input.k-num').first().fill('20');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(700);
await page.keyboard.press('f');
await page.waitForTimeout(300);
const full = await drawnBox();
check('plate with a hole drawn', !!full && full.max[0] - full.min[0] > 70, JSON.stringify(full));

// Section View from the heads-up toolbar
await page.click('.k-hud button[data-tip="Section View"]').catch(() => page.click('[data-tip="Section View"]'));
await page.waitForTimeout(400);
check('Section View PM opens (Section Method, Section Options, Section 1)', (await page.locator('[data-testid="section-pm"]').count()) === 1 && (await page.locator('.k-section:has-text("Section 1")').count()) === 1);
// Front plane section at offset 0: the drawn body is only the half behind the plane (z <= 0)
let cut = await drawnBox();
check('the drawn body is cut at the Front plane while editing', !!cut && cut.max[2] < 1 && cut.min[2] < -20, JSON.stringify(cut));
// Right plane with an offset of 10
await page.click('.k-pm-stylebtn[data-tip="Right Plane"]');
await page.locator('[data-testid="section-pm"] input.k-num').first().fill('10');
await page.locator('[data-testid="section-pm"] input.k-num').first().press('Enter');
await page.waitForTimeout(500);
cut = await drawnBox();
check('Right plane, offset 10: cut at x = 10', !!cut && Math.abs(cut.max[0] - 10) < 0.5, JSON.stringify(cut));
await page.click('.k-pm-stylebtn[data-tip="Flip Direction"]');
await page.waitForTimeout(500);
cut = await drawnBox();
check('Flip keeps the other side (x >= 10)', !!cut && Math.abs(cut.min[0] - 10) < 0.5, JSON.stringify(cut));
await shot('sec1-section-view');
await page.click('.k-pm-ok');
await page.waitForTimeout(400);
const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { view: s.sectionView, edit: s.sectionEdit, tab: s.managerTab }; });
check('OK keeps the section and closes the PM', !!st.view && st.view.plane === 'right' && st.view.offset === 10 && st.view.flip && !st.edit, JSON.stringify(st));
check('heads-up Section View button is active', (await page.locator('[data-tip="Section View"].active').count()) === 1);
// the real body is still whole (mass properties, picking)
const real = await page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; b.geometry.computeBoundingBox(); return b.geometry.boundingBox.min.x; });
check('the model itself is untouched', real < -39, String(real));
// toggle off
await page.click('[data-tip="Section View"]');
await page.waitForTimeout(400);
const after = await drawnBox();
check('clicking the button again switches the section off', !!after && after.min[0] < -39 && !(await page.evaluate(() => window.__phlippoStore.getState().sectionView)), JSON.stringify(after));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
