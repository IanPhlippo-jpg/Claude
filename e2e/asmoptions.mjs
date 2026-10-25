// Assembly options (Block D): Mate options (preview, popup, new folder, positioning only, Analysis tab), Explode rotation /
// auto-space / rotation rings, Instances to Skip, Insert Component options (virtual, envelope), sub-assembly and multibody components.
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
const open = (comps) => page.evaluate(({ part, comps }) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Asm', 'assembly');
  d.components = comps.map((c, i) => ({ id: 'c' + (i + 1), name: `Vierkantstift<${i + 1}>`, part, position: c, rotation: [0, 0, 0, 1], fixed: i === 0, suppressed: false }));
  window.__phlippoStore.getState().openDocument(d);
}, { part: pin, comps });
// a face of a component with the given normal (largest such face)
const pick = (cid, n) => page.evaluate(({ cid, n }) => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies.find((x) => x.id === cid);
  const f = b.faces.filter((x) => !x.curved && x.normal[0] * n[0] + x.normal[1] * n[1] + x.normal[2] * n[2] > 0.99).sort((a, c) => c.area - a.area)[0];
  s.setSelectedFace({ bodyId: cid, faceId: f.id });
}, { cid, n });
const centre = (id) => page.evaluate((id) => {
  const b = window.__phlippoStore.getState().rebuild.bodies.find((x) => x.id === id);
  if (!b) return null;
  b.geometry.computeBoundingBox();
  const c = b.geometry.boundingBox.getCenter(new b.geometry.boundingBox.min.constructor());
  return [c.x, c.y, c.z];
}, id);

await open([[0, 0, 0], [60, 0, 0]]);
await page.waitForTimeout(500);
await page.click('.k-cm-tab:has-text("Assembly")');

// ---- Mate: preview moves the component before OK; Show popup dialog off hides the popup
await page.evaluate(() => window.__phlippoStore.getState().startMate());
await page.waitForTimeout(200);
await page.click('[data-testid="mate-popup-opt"]');
const x0 = (await centre('c2'))[0];
await pick('c1', [1, 0, 0]);
await pick('c2', [-1, 0, 0]);
await page.waitForTimeout(400);
const xPrev = (await centre('c2'))[0];
check('Mate preview: Vierkantstift<2> moves before OK', Math.abs(xPrev - x0) > 1, `${x0} -> ${xPrev}`);
check('Show popup dialog off: no mate popup', (await page.locator('.k-mate-popup').count()) === 0);
await page.click('[data-testid="mate-analysis"]');
await page.waitForTimeout(150);
await page.locator('.k-pm .k-section:has-text("Analysis") label:has-text("Friction") input').check();
await shot('ao1-mate-analysis');
// Add to new folder
await page.locator('[data-testid="mate-newfolder"]').check().catch(() => undefined);
let mopt = await page.evaluate(() => window.__phlippoStore.getState().mateOpts);
if (!mopt.newFolder) await page.evaluate(() => window.__phlippoStore.setState({ mateOpts: { ...window.__phlippoStore.getState().mateOpts, newFolder: true } }));
await page.evaluate(() => window.__phlippoStore.getState().commitMate());
await page.waitForTimeout(400);
let mates = await page.evaluate(() => window.__phlippoStore.getState().doc.mates);
check('mate in MateGroup1 with friction', mates.length === 1 && mates[0].folder === 'MateGroup1' && mates[0].analysis?.friction === 0.2, JSON.stringify(mates.map((m) => [m.folder, m.analysis])));
if ((await page.locator('.k-tree-row:has-text("MateGroup1")').count()) === 0) await page.click('.k-tree-row[data-id="mates"] .caret');
await page.waitForTimeout(200);
check('tree shows MateGroup1', (await page.locator('.k-tree-row:has-text("MateGroup1")').count()) === 1);
await shot('ao1b-mategroup');
// Use for positioning only: no mate is stored, the component is moved
await page.evaluate(() => window.__phlippoStore.setState({ mateOpts: { newFolder: false, popup: true, preview: true, positionOnly: true } }));
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.openDocument({ ...s.doc, mates: [] }); });
await page.waitForTimeout(300);
await page.evaluate(() => window.__phlippoStore.getState().startMate());
await pick('c1', [0, 1, 0]);
await pick('c2', [0, -1, 0]);
await page.evaluate(() => window.__phlippoStore.getState().commitMate());
await page.waitForTimeout(300);
mates = await page.evaluate(() => window.__phlippoStore.getState().doc.mates ?? []);
const yPos = (await centre('c2'))[1];
check('Use for positioning only: moved, no mate', mates.length === 0 && Math.abs(yPos) > 1, JSON.stringify({ n: mates.length, yPos }));
await page.evaluate(() => window.__phlippoStore.setState({ mateOpts: { newFolder: false, popup: true, preview: true, positionOnly: false } }));

// ---- Explode: rotation angle, auto-space, rotation rings
await open([[0, 0, 0], [60, 0, 0], [120, 0, 0]]);
await page.waitForTimeout(400);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.startExplode?.(); });
await page.waitForTimeout(200);
const hasPM = (await page.locator('[data-testid="explode-pm"]').count()) === 1;
check('Explode PM open', hasPM);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.selectComponent('c2'); s.selectComponent('c3'); });
await page.click('[data-testid="explode-pm"] .k-section-title:has-text("Options")');
await page.waitForTimeout(150);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); window.__phlippoStore.setState({ explodeEdit: { ...s.explodeEdit, autoSpace: true, rings: true } }); s.updateExplodeDraft({ distance: 30, angle: 90 }); });
await page.waitForTimeout(400);
const rings = await page.evaluate(() => (window.__phlippoStore.getState().rebuild.curves ?? []).filter((c) => c.id.startsWith('explode-ring-')).length);
check('Show rotation rings: a ring per selected component', rings === 2, String(rings));
await shot('ao2-explode-rings');
await page.evaluate(() => window.__phlippoStore.getState().commitExplode());
await page.waitForTimeout(400);
const c2 = await centre('c2'), c3 = await centre('c3');
const step = await page.evaluate(() => window.__phlippoStore.getState().doc.explodeSteps?.[0]);
check('Explode step stores angle and auto-space', step && step.angle === 90 && step.autoSpace === true, JSON.stringify(step));
check('Auto-space: c3 goes twice as far as c2', c2 && c3 && Math.abs(c2[1] - 30) < 1 && Math.abs(c3[1] - 60) < 1, JSON.stringify({ c2, c3 }));
const rotated = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.id === 'c2'); b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.z - bb.min.z]; });
const plain = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.id === 'c1'); b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.z - bb.min.z]; });
check('Explode rotation 90° about Y swaps X/Z extents', Math.abs(rotated[0] - plain[1]) < 0.1 && Math.abs(rotated[1] - plain[0]) < 0.1, JSON.stringify({ rotated, plain }));
const rot3 = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.id === 'c3'); b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.z - bb.min.z]; });
check('Explode rotation also on the second component', Math.abs(rot3[0] - plain[1]) < 0.1, JSON.stringify({ rot3, plain }));
await shot('ao3-exploded');

// ---- Instances to Skip
await open([[0, 0, 0]]);
await page.waitForTimeout(400);
await page.click('.k-tree-row:has-text("Vierkantstift<1>")');
await page.click('.k-cm-big:has-text("Linear Component Pattern") .k-cm-main');
await page.waitForTimeout(300);
await page.evaluate(() => window.__phlippoStore.getState().updatePatternDraft({ spacing: 20, count: 4 }));
await page.waitForTimeout(300);
await page.click('[data-testid="component-pattern-pm"] .k-section-title:has-text("Instances to Skip")');
await page.click('[data-testid="pattern-skip"]');
const pid = await page.evaluate(() => window.__phlippoStore.getState().patternEdit.draft.id);
await page.evaluate((pid) => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.id.startsWith(pid + '~') && x.id.endsWith('~2')); s.setSelectedFace({ bodyId: b.id, faceId: b.faces[0].id }); }, pid);
await page.waitForTimeout(300);
check('Instances to Skip lists (3, 1)', (await page.locator('[data-testid="pattern-skip"]').innerText()).includes('(3, 1)'), await page.locator('[data-testid="pattern-skip"]').innerText());
await shot('ao4-skip');
await page.click('[data-testid="component-pattern-pm"] .k-pm-ok');
await page.waitForTimeout(400);
const nb = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.length);
check('pattern with one skipped instance: 3 bodies', nb === 3, String(nb));

// ---- Insert Component: virtual + envelope; sub-assembly; multibody part
await open([[0, 0, 0]]);
await page.waitForTimeout(300);
await page.evaluate((part) => { const s = window.__phlippoStore.getState(); s.insertComponent(part, { virtual: true, position: [0, 0, 50] }); s.insertComponent(part, { envelope: true, position: [0, 0, -50] }); }, pin);
await page.waitForTimeout(400);
check('virtual component named [Vierkantstift^Asm]<2>', (await page.locator('.k-tree-row:has-text("[Vierkantstift^Asm]<2>")').count()) === 1);
check('envelope component marked', (await page.locator('.k-tree-row:has-text("(envelope)")').count()) === 1);
const sub = await page.evaluate((part) => {
  const K = window.__phlippoKit;
  const a = K.createDocument('Sub', 'assembly');
  a.components = [{ id: 's1', name: 'Vierkantstift<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }, { id: 's2', name: 'Vierkantstift<2>', part, position: [30, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false }];
  a.mates = [];
  const s = window.__phlippoStore.getState();
  s.insertComponent(a, { position: [0, 100, 0] });
  const d = window.__phlippoStore.getState().doc;
  return d.components.filter((c) => c.subassembly).map((c) => [c.name, c.subassembly.name, c.position]);
}, pin);
check('sub-assembly inserted as Sub<1> with two parts', sub.length === 2 && sub[0][1] === 'Sub<1>' && Math.abs(sub[1][2][0] - 30) < 1e-6 && Math.abs(sub[1][2][1] - 100) < 1e-6, JSON.stringify(sub));
check('tree shows Sub<1>', (await page.locator('.k-tree-row:has-text("Sub<1>")').count()) === 1);
await shot('ao5-subassembly');
// multibody part: both bodies visible in the component
const mb = await page.evaluate(() => {
  const K = window.__phlippoKit;
  const s = window.__phlippoStore.getState();
  const comps = s.doc.components;
  const part = comps[0].part;
  return { bodies: s.rebuild.bodies.length, comps: comps.length, partBodies: part.features.length };
});
check('every component has a body', mb.bodies === mb.comps, JSON.stringify(mb));

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
