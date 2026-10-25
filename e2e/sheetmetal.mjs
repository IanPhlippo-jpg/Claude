// Sheet metal (videos 16/21/24): Base Flange/Tab from an open L sketch, Edge Flange on a straight edge, Flatten.
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
await shot('sm1-base-flange-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
let s = await S();
const t = 3, r = 3, depth = 60;
const expectedBase = ((40 - (r + t)) * t + (30 - (r + t)) * t + (Math.PI / 4) * ((r + t) ** 2 - r ** 2)) * depth;
const v1 = await volume();
check('Base-Flange1 built: L sheet with the bend (3 mm, radius 3, 60 wide)', Math.abs(v1 - expectedBase) < expectedBase * 0.03 && Object.keys(s.errors).length === 0, `${v1.toFixed(0)} vs ${expectedBase.toFixed(0)} ${JSON.stringify(s.errors)}`);
check('tree: Sheet-Metal1, Base-Flange1 and a suppressed Flat-Pattern1', s.sm && s.sm.thickness === 3 && s.features.includes('Base-Flange1') && s.features.includes('Flat-Pattern1(s)'), JSON.stringify(s));
check('Sheet-Metal1 row in the FeatureManager', (await page.locator('.k-tree-row:has-text("Sheet-Metal")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('sm2-base-flange');

// Edge Flange on the top edge of the vertical leg (the straight edge at y = 30 on the outer face)
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-big:has-text("Edge Flange") .k-cm-main');
await page.waitForTimeout(400);
check('Edge Flange PM asks for an edge', (await page.locator('.k-selbox:has-text("Select a straight edge")').count()) === 1);
const picked = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  // the straight edge with the highest centroid (top of the vertical leg), 60 long
  const cands = b.edges.filter((e) => e.straight && Math.abs(e.length - 60) < 0.5);
  cands.sort((a, c) => c.centroid.y - a.centroid.y);
  if (!cands.length) return null;
  s.toggleSelectedEdge(cands[0].id);
  return { y: cands[0].centroid.y, edge: !!window.__phlippoStore.getState().featureEdit?.draft?.edge };
});
check('picked edge goes into Flange Parameters', !!picked && picked.edge && (await page.locator('.k-selbox-row:has-text("Edge<1>")').count()) === 1, JSON.stringify(picked));
await page.locator('.k-section:has-text("Flange Length") input.k-num').first().fill('32');
await page.locator('.k-section:has-text("Flange Length") input.k-num').first().press('Enter');
await page.waitForTimeout(500);
await shot('sm3-edge-flange-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
s = await S();
const v2 = await volume();
const leg = 32 - (r + t);
const expectedFlange = ((Math.PI / 4) * ((r + t) ** 2 - r ** 2) + leg * t) * depth;
check('Edge-Flange1 adds the bend + a 28 mm leg (outer virtual sharp 32)', Math.abs(v2 - v1 - expectedFlange) < expectedFlange * 0.05 && Object.keys(s.errors).length === 0, `${(v2 - v1).toFixed(0)} vs ${expectedFlange.toFixed(0)} ${JSON.stringify(s.errors)}`);
check('tree lists Edge-Flange1 before Flat-Pattern1', s.features.indexOf('Edge-Flange1') < s.features.indexOf('Flat-Pattern1(s)'), s.features.join(','));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('sm4-edge-flange');

// Flatten: the sheet unfolds to a flat plate of the developed length
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-big:has-text("Flatten") .k-cm-main');
await page.waitForTimeout(800);
s = await S();
const v3 = await volume();
const ba = (Math.PI / 2) * (r + 0.5 * t), sb = (r + t) * Math.tan(Math.PI / 4);
const flatLen = 70 - 2 * sb + ba + (leg + ba);
check('Flat-Pattern1 unsuppressed: one flat body', s.features.includes('Flat-Pattern1') && s.bodies === 1 && Object.keys(s.errors).length === 0, JSON.stringify(s));
check('flat volume = developed length x width x thickness', Math.abs(v3 - flatLen * depth * t) < flatLen * depth * t * 0.03, `${v3.toFixed(0)} vs ${(flatLen * depth * t).toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('sm5-flat-pattern');
await page.click('.k-cm-big:has-text("Flatten") .k-cm-main');
await page.waitForTimeout(800);
check('Flatten again folds the sheet back', Math.abs((await volume()) - v2) < 1);

// Sheet-Metal1: change the thickness to 2 -> the sheet rebuilds
await page.locator('.k-tree-row:has-text("Sheet-Metal")').first().dblclick();
await page.waitForTimeout(300);
check('Sheet-Metal1 PM with Bend Parameters', (await page.locator('.k-pm-title:has-text("Sheet-Metal1")').count()) === 1 && (await page.locator('.k-section:has-text("Bend Parameters")').count()) === 1);
await page.locator('.k-section:has-text("Bend Parameters") input.k-num').first().fill('2');
await page.locator('.k-section:has-text("Bend Parameters") input.k-num').first().press('Enter');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
check('thickness 2 gives a thinner sheet', (await volume()) < v2 * 0.8, String(await volume()));

// reload keeps everything
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 4000 }).catch(() => {}); // the autosave waits under Recent Documents, as the original
await page.waitForTimeout(800);
s = await S();
check('reload keeps Sheet-Metal1, the flanges and the flat pattern feature', s.sm && s.sm.thickness === 2 && s.features.includes('Edge-Flange1') && s.features.includes('Flat-Pattern1(s)'), JSON.stringify(s));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
