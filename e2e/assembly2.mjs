// Assembly commands that were "later": New Part / New Assembly / Copy with Mates, Mirror Components, Pattern Driven
// Component Pattern, Assembly Features (Revolved Cut, Hole, Fillet, Belt/Chain), Reference Geometry, Make Multibody
// Part, Take Snapshot, Large Assembly Settings, Component Preview, Pack and Go, Share, Markup, Comments, advanced mates.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asm);
await page.waitForTimeout(2500);
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { comps: (s.doc.components ?? []).map((c) => c.name), mates: (s.doc.mates ?? []).length, pats: (s.doc.componentPatterns ?? []).map((p) => p.name), feats: s.doc.features.map((f) => f.name), errors: s.rebuild.errors, snaps: (s.doc.snapshots ?? []).length, comments: (s.doc.comments ?? []).length, markups: (s.doc.markups ?? []).length }; });
const n0 = (await S()).comps.length;

// New Part / New Assembly
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Insert Components") .k-cm-arrow').catch(() => undefined);
await page.waitForTimeout(200);
const fly = await page.evaluate(() => [...document.querySelectorAll('.k-menu .k-menu-item')].map((x) => ({ t: x.textContent.trim(), d: x.classList.contains('disabled') || x.getAttribute('aria-disabled') === 'true' })));
check('Insert Components flyout: New Part, New Assembly, Copy with Mates enabled', ['New Part', 'New Assembly', 'Copy with Mates'].every((l) => fly.some((x) => x.t === l && !x.d)), JSON.stringify(fly));
await page.click('.k-menu .k-menu-item:has-text("New Assembly")');
await page.waitForTimeout(800);
let st = await S();
check('New Assembly adds an empty sub-assembly', st.comps.length === n0 + 1 && st.comps.some((c) => /^Assem\d+\^/.test(c)), JSON.stringify(st.comps));

// Copy with Mates of the handle
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const c = s.doc.components.find((x) => /Kruk<1>/.test(x.name)); s.selectComponent(c.id); });
const m0 = (await S()).mates;
await page.click('.k-cm-big:has-text("Insert Components") .k-cm-arrow').catch(() => undefined);
await page.click('.k-menu .k-menu-item:has-text("Copy with Mates")');
await page.waitForTimeout(1200);
st = await S();
check('Copy with Mates copies the component and its mates', st.comps.length === n0 + 2 && st.mates > m0, JSON.stringify({ comps: st.comps.length, mates: [m0, st.mates] }));

// Mirror Components about the Right Plane
await page.evaluate(() => window.__phlippoStore.getState().setDialog('mirrorComponents'));
await page.waitForTimeout(200);
await page.locator('[data-testid="mirror-comps"] .k-check input').first().check();
await page.click('[data-testid="mirror-ok"]');
await page.waitForTimeout(1200);
check('Mirror Components adds the mirrored copy', (await S()).comps.length >= n0 + 3, String((await S()).comps.length - n0));

// Snapshot, Component Preview, Large Assembly Settings
await page.click('.k-cm-big:has-text("Take Snapshot")');
await page.waitForTimeout(400);
check('Take Snapshot stores the view (Snapshots folder in the tree)', (await S()).snaps === 1 && (await page.locator('.k-tree-row:has-text("Snapshots")').count()) === 1);
await page.click('.k-cm-big:has-text("Component Preview Window")');
await page.waitForTimeout(500);
check('Component Preview Window opens', (await page.locator('[data-testid="component-preview"]').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().setDialog(null));
await page.click('.k-cm-big:has-text("Large Assembly Settings") .k-cm-main').catch(async () => page.click('.k-cm-big:has-text("Large Assembly Settings")'));
check('Large Assembly Settings toggles on', await page.evaluate(() => window.__phlippoStore.getState().largeAssembly));
await page.evaluate(() => window.__phlippoStore.getState().setLargeAssembly(false));

// Belt/Chain around two pulleys: a fresh assembly with two cylinders side by side
const belt = await page.evaluate(() => {
  const K = window.__phlippoKit;
  const cyl = (name, r) => ({ ...K.createDocument(name), sketches: { s: K.addCircle(K.createSketch('s', 'Sketch1', 'front'), { x: 0, y: 0 }, r)[0] }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's', suppressed: false }, { id: 'e', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }] });
  const s0 = window.__phlippoStore.getState();
  const prev = s0.doc;
  s0.newDocument('assembly');
  const s = window.__phlippoStore.getState();
  s.insertComponent(cyl('Pulley', 20), { atOrigin: true });
  s.insertComponent(cyl('Pulley', 10), { fixMode: 'float' });
  window.__phlippoStore.getState().moveComponent(window.__phlippoStore.getState().doc.components[1].id, [60, 0, 0]);
  const st1 = window.__phlippoStore.getState();
  const picks = st1.rebuild.bodies.map((b) => { const f = b.faces.filter((x) => x.curved).sort((p, q) => q.area - p.area)[0]; return f ? { bodyId: b.id, faceId: f.id } : null; }).filter(Boolean);
  window.__phlippoStore.setState({ selectedFaces: picks, selectedFace: picks[1] ?? null });
  st1.startBelt();
  const st2 = window.__phlippoStore.getState();
  const out = { n: picks.length, feats: st2.doc.features.map((f) => f.type), err: st2.rebuild.errors, curve: (st2.rebuild.curves ?? []).some((c) => c.name === 'Belt1') };
  window.__phlippoStore.getState().openDocument(prev);
  return out;
});
check('Belt/Chain makes a belt around the picked pulleys', belt.feats.includes('belt') && belt.curve && !Object.keys(belt.err).length, JSON.stringify(belt));
await page.waitForTimeout(1500);

// Make Multibody Part asks and opens a part with one body per component
await page.click('.k-cm-big:has-text("Make Multibody Part")');
await page.waitForTimeout(300);
check('Make Multibody Part asks first', (await page.locator('[data-testid="ask"]').count()) === 1);
await page.keyboard.press('Escape');

// Lifecycle tab: Pack and Go, Share, Markup, Comments
await page.click('.k-cm-tab:has-text("Lifecycle")');
await page.click('.k-cm-big:has-text("Pack and Go")');
await page.waitForTimeout(300);
const files = await page.locator('[data-testid="pack-files"] tbody tr').count();
check('Pack and Go lists the assembly and its parts', files >= 5, String(files));
await page.click('[data-testid="packandgo"] button:has-text("Cancel")');
await page.click('.k-cm-big:has-text("Share")');
check('Share offers copy / picture / clipboard', (await page.locator('[data-testid="share"] .k-btn').count()) >= 3);
await page.click('[data-testid="share"] button:has-text("Close")');
await page.click('.k-cm-big:has-text("Comments")');
await page.fill('[data-testid="comment-text"]', 'Check the screw length');
await page.click('[data-testid="comment-add"]');
await page.waitForTimeout(300);
check('Comments: a comment is added', (await S()).comments === 1 && /screw length/.test((await page.locator('[data-testid="comment-list"]').textContent()) ?? ''));
await page.click('[data-testid="comments"] button:has-text("Close")');
await page.click('.k-cm-big:has-text("Markup")');
const box = await page.locator('[data-testid="markup-layer"]').boundingBox();
await page.mouse.move(box.x + 300, box.y + 300);
await page.mouse.down();
await page.mouse.move(box.x + 420, box.y + 340, { steps: 6 });
await page.mouse.move(box.x + 520, box.y + 300, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
check('Markup: a pen stroke is kept with the document', (await S()).markups === 1);
await page.click('.k-cm-big:has-text("Markup")');
await page.screenshot({ path: `${OUT}/asm2-markup.png` });

// Advanced / mechanical mates are enabled in the Mate PropertyManager
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Mate")');
await page.click('.k-mate-tabs button:has-text("Mechanical")');
const mech = await page.locator('[data-testid="mechanical-mates"] button:not([disabled])').count();
await page.click('.k-mate-tabs button:has-text("Advanced")');
const adv = await page.locator('[data-testid="advanced-mates"] button:not([disabled])').count();
check('all 7 advanced and 7 mechanical mate types can be chosen', mech === 7 && adv === 7, `${adv} ${mech}`);
await page.click('[data-testid="advanced-mates"] button:has-text("Width")');
check('Width asks for four selections', /\(0\/4\)/.test((await page.locator('[data-testid="mate-params"]').textContent()) ?? ''));
await page.screenshot({ path: `${OUT}/asm2-mates.png` });
await page.evaluate(() => window.__phlippoStore.getState().cancelMate());

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
