// Sheet metal Hem (videos 16/50): closed hem with Material Inside on the top edge of an L sheet, then Flatten.
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
const volume = () => page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); });
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { features: s.doc.features.map((f) => f.name + (f.suppressed ? '(s)' : '')), bodies: s.rebuild.bodies.length, errors: s.rebuild.errors, sm: s.doc.sheetMetal ?? null }; });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
// an open L profile on the Front plane: (0,0) -> (40,0) -> (40,30)
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const p0 = await P(0, 0), p1 = await P(40, 0), p2 = await P(40, 30);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(p0.x, p0.y);
await page.mouse.click(p1.x, p1.y);
await page.mouse.click(p2.x, p2.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// Base Flange/Tab from the Sheet Metal tab
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-big:has-text("Base Flange/Tab") .k-cm-main');
await page.waitForTimeout(500);
const pmTitle = await page.locator('.k-pm-title').innerText();
check('Base Flange PM: Direction 1, Sheet Metal Parameters, Bend Allowance', /Base-Flange1/.test(pmTitle) && (await page.locator('.k-section:has-text("Sheet Metal Parameters")').count()) >= 1 && (await page.locator('.k-section:has-text("Bend Allowance")').count()) === 1 && (await page.locator('.k-section:has-text("Direction 1")').count()) === 1, pmTitle);
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await shot('hm0-base-flange-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
let s = await S();
const t = 3, r = 3, depth = 60;
const expectedBase = ((40 - (r + t)) * t + (30 - (r + t)) * t + (Math.PI / 4) * ((r + t) ** 2 - r ** 2)) * depth;
const v1 = await volume();
check('Base-Flange1 built: L sheet with the bend (3 mm, radius 3, 60 wide)', Math.abs(v1 - expectedBase) < expectedBase * 0.03 && Object.keys(s.errors).length === 0, `${v1.toFixed(0)} vs ${expectedBase.toFixed(0)} ${JSON.stringify(s.errors)}`);
check('tree: Sheet-Metal1, Base-Flange1 and a suppressed Flat-Pattern1', s.sm && s.sm.thickness === 3 && s.features.includes('Base-Flange1') && s.features.includes('Flat-Pattern1(s)'), JSON.stringify(s));
check('Sheet-Metal1 row in the Feature Tree', (await page.locator('.k-tree-row:has-text("Sheet-Metal")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('hm1-base-flange');

// Hem on the top edge of the vertical leg
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Hem")');
await page.waitForTimeout(400);
check('Hem PM: Edges, Type and Size (Closed/Open), Material Inside', (await page.locator('.k-pm-title:has-text("Hem1")').count()) === 1 && (await page.locator('.k-section:has-text("Type and Size")').count()) === 1 && (await page.locator('.k-pm-stylebtn[data-tip="Material Inside"].active').count()) === 1);
const picked = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const cands = b.edges.filter((e) => e.straight && Math.abs(e.length - 60) < 0.5).sort((a, c) => c.centroid.y - a.centroid.y);
  if (!cands.length) return null;
  s.toggleSelectedEdge(cands[0].id);
  return !!window.__phlippoStore.getState().featureEdit?.draft?.edge;
});
check('the top edge is the hem edge', picked === true);
await page.locator('.k-section:has-text("Type and Size") input.k-num').first().fill('10');
await page.locator('.k-section:has-text("Type and Size") input.k-num').first().press('Tab');
await page.waitForTimeout(500);
await shot('hm2-hem-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
s = await S();
const v2 = await volume();
const rr = 0.01;
const expectedHem = ((Math.PI / 2) * ((rr + t) ** 2 - rr ** 2) + 10 * t - (rr + t) * t) * depth;
check('Hem1 (closed, Material Inside): sheet shortened by r + t, 180 degree fold and a 10 mm leg', Math.abs(v2 - v1 - expectedHem) < Math.abs(expectedHem) * 0.04 && Object.keys(s.errors).length === 0, `${(v2 - v1).toFixed(0)} vs ${expectedHem.toFixed(0)} ${JSON.stringify(s.errors)}`);
check('tree lists Hem1 before Flat-Pattern1', s.features.indexOf('Hem1') >= 0 && s.features.indexOf('Hem1') < s.features.indexOf('Flat-Pattern1(s)'), s.features.join(','));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('hm3-hem');
// Flatten: the developed length grows by leg + bend allowance (180) - setback
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Flatten")');
await page.waitForTimeout(900);
const v3 = await volume();
const ba90 = (Math.PI / 2) * (r + 0.5 * t), sb = (r + t);
const flat0 = 70 - 2 * sb + ba90;
const flat1 = flat0 + 10 + Math.PI * (rr + 0.5 * t) - (rr + t);
check('flat pattern includes the hem', Math.abs(v3 - flat1 * depth * t) < flat1 * depth * t * 0.02, `${v3.toFixed(0)} vs ${(flat1 * depth * t).toFixed(0)}`);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
