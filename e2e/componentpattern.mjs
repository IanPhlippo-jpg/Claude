// Linear and Circular Component Pattern: a square pin (from the door handle example) patterned in an assembly through the ribbon and the PropertyManager.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

const pin = JSON.parse(readFileSync('voorbeelden/deurkruk/Vierkantstift.kcad', 'utf8'));
delete pin.format;
await page.evaluate((part) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Pennen', 'assembly');
  d.components = [{ id: 'c1', name: 'Vierkantstift<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
}, pin);
await page.waitForTimeout(600);
const S = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const boxes = s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const c = b.geometry.boundingBox.getCenter(new b.geometry.boundingBox.min.constructor()); return { id: b.id, c: [c.x, c.y, c.z] }; });
  return { bodies: boxes, patterns: (s.doc.componentPatterns ?? []).map((p) => ({ name: p.name, kind: p.kind, count: p.count, seeds: p.seeds })), inst: (s.rebuild.patternInstances ?? []).map((i) => i.name) };
});

// ---- Linear Component Pattern: select the pin in the tree, 4 instances 20 mm apart along X
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-tree-row:has-text("Vierkantstift<1>")');
await page.click('.k-cm-big:has-text("Linear Component Pattern") .k-cm-main');
await page.waitForTimeout(300);
check('Linear Pattern PropertyManager with the seed preselected', (await page.locator('[data-testid="component-pattern-pm"]').count()) === 1 && (await page.locator('[data-testid="pattern-seeds"]').innerText()).includes('Vierkantstift<1>'));
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(0).fill('20');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(0).press('Tab');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(1).fill('4');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(1).press('Tab');
await page.waitForTimeout(400);
let s = await S();
check('preview shows 4 pins', s.bodies.length === 4, JSON.stringify(s.bodies.length));
await shot('cp1-linear-preview');
await page.click('[data-testid="component-pattern-pm"] .k-pm-ok');
await page.waitForTimeout(500);
s = await S();
const xs = s.bodies.map((b) => b.c[0]).sort((a, b) => a - b);
check('LocalLPattern1: 4 pins 20 mm apart along X', s.patterns.length === 1 && s.patterns[0].name === 'LocalLPattern1' && s.bodies.length === 4 && Math.abs(xs[1] - xs[0] - 20) < 1e-6 && Math.abs(xs[3] - xs[0] - 60) < 1e-6, JSON.stringify({ s: s.patterns, xs }));
check('tree: LocalLPattern1 with Vierkantstift<2..4>', (await page.locator('.k-tree-row:has-text("LocalLPattern1")').count()) === 1 && s.inst.join(',') === 'Vierkantstift<2>,Vierkantstift<3>,Vierkantstift<4>', s.inst.join(','));

// ---- Circular Component Pattern around the Y axis: 6 instances, equal spacing (a pin moved off the axis first)
await page.evaluate(() => { const st = window.__phlippoStore.getState(); const d = { ...st.doc, components: [...st.doc.components, { ...st.doc.components[0], id: 'c2', name: 'Vierkantstift<5>', position: [0, 0, 40], fixed: true }] }; st.openDocument(d); });
await page.waitForTimeout(400);
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-tree-row:has-text("Vierkantstift<5>")');
await page.evaluate(() => window.__phlippoStore.getState().startComponentPattern('circular'));
await page.waitForTimeout(300);
await page.click('[data-testid="component-pattern-pm"] .k-pm-stylebtn[data-tip="Y axis"]');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Parameters") input.k-num').nth(1).fill('6');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Parameters") input.k-num').nth(1).press('Tab');
await page.waitForTimeout(300);
await page.click('[data-testid="component-pattern-pm"] .k-pm-ok');
await page.waitForTimeout(500);
s = await S();
const circ = s.bodies.filter((b) => b.id.startsWith('c2') || b.id.includes('~c2~'));
const radii = circ.map((b) => Math.hypot(b.c[0], b.c[2]));
check('LocalCirPattern1: 6 pins on a circle around Y', s.patterns.length === 2 && circ.length === 6 && radii.every((r) => Math.abs(r - radii[0]) < 1e-3), JSON.stringify({ n: circ.length, radii }));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('cp2-patterns');

// ---- edit: double-click the pattern in the tree, change the count
await page.dblclick('.k-tree-row:has-text("LocalLPattern1")');
await page.waitForTimeout(300);
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(1).fill('2');
await page.locator('[data-testid="component-pattern-pm"] .k-section:has-text("Direction 1") input.k-num').nth(1).press('Tab');
await page.click('[data-testid="component-pattern-pm"] .k-pm-ok');
await page.waitForTimeout(400);
s = await S();
check('edited LocalLPattern1: 2 instances', s.patterns.find((p) => p.name === 'LocalLPattern1').count === 2 && s.bodies.length === 2 + 6, JSON.stringify(s.bodies.length));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
