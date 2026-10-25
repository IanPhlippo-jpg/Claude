// Phase 4 check: a plate part is built, an assembly is created, the plate is inserted twice,
// a coincident and a concentric mate stack the plates, the BOM lists the part, the file survives a reload.
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
const A = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const boxes = s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return { id: b.id, min: bb.min.toArray(), max: bb.max.toArray() }; });
  return { kind: s.doc.kind, components: (s.doc.components || []).map((c) => ({ id: c.id, name: c.name, fixed: c.fixed, position: c.position })), mates: (s.doc.mates || []).map((m) => ({ type: m.type, name: m.name })), bodies: boxes, errors: s.rebuild.errors, tab: s.tab, inserting: s.insertingComponent, mateEdit: s.mateEdit ? { type: s.mateEdit.draft.type, refs: s.mateEdit.draft.refs.map((r) => r.label) } : null };
});

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

// ---- the plate: 80 x 80 x 10 with a Ø35 hole (as in the features check)
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 300, cy - 300);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 150, cy);
await page.mouse.click(cx + 150, cy + 80);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('80');
await page.locator('.k-modify input.k-num').press('Enter');
await page.waitForTimeout(200);
await page.mouse.click(cx, cy - 150);
await page.mouse.click(cx - 80, cy - 150);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('80');
await page.locator('.k-modify input.k-num').press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const centre = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const pts = Object.values(sk.points); const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return window.__phlippoProject({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }); });
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(centre.x, centre.y);
await page.mouse.click(centre.x + 60, centre.y);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(centre.x + 60, centre.y);
await page.mouse.click(centre.x + 120, centre.y - 120);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('35');
await page.locator('.k-modify input.k-num').press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
await page.evaluate(() => window.__phlippoStore.getState().renameDocument('Plate'));
const plateFile = await page.evaluate(() => JSON.stringify({ format: 'phlippo-cad', ...window.__phlippoStore.getState().doc }));
check('plate part built', plateFile.includes('"Boss-Extrude1"'));

// ---- new assembly (File > New…, Assembly)
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("New")');
await page.waitForTimeout(200);
await page.click('.k-doctype:has-text("Assembly")');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => {}); // Save changes? → Don't Save
await page.waitForTimeout(500);
let a = await A();
check('assembly document with the Assembly tab and Insert Component open', a.kind === 'assembly' && a.tab === 'assembly' && a.inserting, JSON.stringify({ kind: a.kind, tab: a.tab, inserting: a.inserting }));
await shot('e30-assembly-new');
// insert the plate twice through Browse… (file input)
await page.setInputFiles('#phlippo-open-file', { name: 'Plate.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
await page.waitForTimeout(500);
// as the original: the part follows the pointer with the Rotate context toolbar; OK puts it at the origin
{
  const vp = await page.locator('.k-viewport').boundingBox();
  await page.mouse.move(vp.x + vp.width * 0.5, vp.y + vp.height * 0.5);
  await page.mouse.move(vp.x + vp.width * 0.55, vp.y + vp.height * 0.45, { steps: 4 });
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => !!window.__phlippoStore.getState().insertGhost);
  check('Browse puts the part on the pointer (no component yet)', g && (await A()).components.length === 0);
  check('Rotate context toolbar shown', (await page.locator('[data-testid="insert-rotate-bar"]').count()) === 1);
  await shot('e30b-insert-ghost');
  await page.click('[data-testid="rotbar-x"]');
  const rot = await page.evaluate(() => window.__phlippoStore.getState().insertGhost.rotation);
  check('X button turns the part 90°', Math.abs(Math.abs(rot[0]) - Math.SQRT1_2) < 1e-6, JSON.stringify(rot));
  await page.click('[data-testid="rotbar-x"]');
  await page.click('[data-testid="rotbar-x"]');
  await page.click('[data-testid="rotbar-x"]');
  await page.click('.k-pm-ok');
  await page.waitForTimeout(600);
}
a = await A();
check('first component inserted and fixed', a.components.length === 1 && a.components[0].fixed && a.components[0].name === 'Plate<1>', JSON.stringify(a.components));
check('assembly tree root', (await page.locator('.k-tree-row').first().innerText()).includes('Assem1'));
await page.click('.k-cm-big:has-text("Insert Components") .k-cm-main');
await page.waitForTimeout(200);
await page.setInputFiles('#phlippo-open-file', { name: 'Plate.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
await page.waitForTimeout(500);
// a click in the graphics area places the part on the pointer there
{
  // a point with y = 0 in the plane through the origin facing the screen (where the part on the pointer lies)
  const target = await page.evaluate(() => { const d = window.__phlippoCamera.pixelToRay(10, 10).direction; const x = 120, z = -x * d.x / d.z; return window.__phlippoProjectWorld(x, 0, z); });
  await page.mouse.move(target.x - 30, target.y);
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(800);
}
a = await A();
check('second instance Plate<2> placed next to the first', a.components.length === 2 && a.components[1].name === 'Plate<2>' && !a.components[1].fixed && a.components[1].position[0] >= 90, JSON.stringify(a.components));
check('two world bodies, no errors', a.bodies.length === 2 && Object.keys(a.errors).length === 0, JSON.stringify(a.errors));
check('tree shows (f) Plate<1> and (-) Plate<2>', (await page.locator('.k-tree-row:has-text("(f) Plate<1>")').count()) === 1 && (await page.locator('.k-tree-row:has-text("(-) Plate<2>")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e31-assembly-inserted');

// ---- coincident mate: top face of Plate<1> with top face of Plate<2> (anti-aligned: Plate<2> flips onto Plate<1>)
await page.click('.k-cm-big:has-text("Mate") .k-cm-main');
await page.waitForTimeout(300);
check('Mate PropertyManager open', (await page.locator('.k-pm-title').innerText()).includes('Mate'));
const b2 = a.bodies[1];
const p1 = await page.evaluate(() => window.__phlippoProjectWorld(10, 10, -10));
await page.mouse.click(p1.x, p1.y);
await page.waitForTimeout(200);
const p2 = await page.evaluate(([x, z]) => window.__phlippoProjectWorld(x, 10, z), [b2.min[0] + 10, b2.max[2] - 10]);
await page.mouse.click(p2.x, p2.y);
await page.waitForTimeout(300);
a = await A();
check('two mate references selected, Coincident proposed', a.mateEdit && a.mateEdit.refs.length === 2 && a.mateEdit.type === 'coincident', JSON.stringify(a.mateEdit));
await shot('e32-mate-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
a = await A();
check('Coincident1 added', a.mates.length === 1 && a.mates[0].type === 'coincident');
const top2 = a.bodies.find((b) => b.id === a.components[1].id);
check('Plate<2> lies face to face on Plate<1> (y 10..20)', top2 && Math.abs(top2.min[1] - 10) < 0.05 && Math.abs(top2.max[1] - 20) < 0.05, JSON.stringify(top2));

// ---- concentric mate: the two hole walls
await page.click('.k-cm-big:has-text("Mate") .k-cm-main');
await page.waitForTimeout(300);
const h1 = await page.evaluate(() => window.__phlippoProjectWorld(40 - 17.5 * 0.7071, 5, -40 - 17.5 * 0.7071));
await page.mouse.click(h1.x, h1.y);
await page.waitForTimeout(200);
a = await A();
const c2 = a.bodies.find((b) => b.id === a.components[1].id);
const hc = [(c2.min[0] + c2.max[0]) / 2, (c2.min[2] + c2.max[2]) / 2];
const h2 = await page.evaluate(([x, z]) => window.__phlippoProjectWorld(x - 17.5 * 0.7071, 15, z - 17.5 * 0.7071), hc);
await page.mouse.click(h2.x, h2.y);
await page.waitForTimeout(300);
a = await A();
check('two cylindrical references, Concentric proposed', a.mateEdit && a.mateEdit.refs.length === 2 && a.mateEdit.type === 'concentric', JSON.stringify(a.mateEdit));
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
a = await A();
const c2b = a.bodies.find((b) => b.id === a.components[1].id);
check('Concentric1 aligns the holes (Plate<2> centred on Plate<1>)', a.mates.length === 2 && c2b && Math.abs((c2b.min[0] + c2b.max[0]) / 2 - 40) < 0.1 && Math.abs((c2b.min[2] + c2b.max[2]) / 2 + 40) < 0.1, JSON.stringify(c2b));
await expandTree();
check('Mates folder lists both mates', (await page.locator('.k-tree-row:has-text("Coincident1 (Plate<1>,Plate<2>)")').count()) === 1 && (await page.locator('.k-tree-row:has-text("Concentric1")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e33-assembly-mated');

// ---- Bill of Materials and Interference Detection
await page.click('.k-cm-big:has-text("Bill of Materials") .k-cm-main');
await page.waitForTimeout(300);
const bom = await page.locator('.k-bom').innerText();
check('BOM lists Plate with quantity 2', /Plate/.test(bom) && /\b2\b/.test(bom), bom.replace(/\s+/g, ' '));
await shot('e34-bom');
await page.click('.k-bom-dialog button:has-text("Close")');
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-big:has-text("Interference Detection") .k-cm-main');
await page.waitForTimeout(800);
const inter = await page.locator('.k-interference-dialog').innerText();
check('no interference between the stacked plates', /No Interferences/.test(inter), inter.replace(/\s+/g, ' ').slice(0, 120));
await page.click('.k-interference-dialog button:has-text("Close")');

// ---- Move Component: a mated component moves only within its free degrees of freedom; a fixed one not at all
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Move Component") .k-cm-main');
await page.waitForTimeout(200);
const before = (await A()).components[1].position.slice();
const drag0 = await page.evaluate(([x, z]) => window.__phlippoProjectWorld(x, 20, z), [40 + 25, -40 + 25]);
await page.mouse.move(drag0.x, drag0.y);
await page.mouse.down();
await page.mouse.move(drag0.x + 60, drag0.y + 10, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(400);
const after = (await A()).components[1].position;
check('Move Component keeps the mated position (hole stays concentric)', Math.abs(after[0] - before[0]) < 0.5 && Math.abs(after[2] - before[2]) < 0.5, `${before} -> ${after}`);
await page.click('.k-cm-big:has-text("Move Component") .k-cm-main');

// ---- reload: the assembly (components with embedded parts and mates) is restored from the autosave
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 4000 }).catch(() => {}); // the autosave waits under Recent Documents, as the original
await page.waitForTimeout(1000);
a = await A();
check('assembly restored after reload', a.kind === 'assembly' && a.components.length === 2 && a.mates.length === 2 && a.bodies.length === 2, JSON.stringify({ k: a.kind, c: a.components.length, m: a.mates.length, b: a.bodies.length }));

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
for (const r of results) if (!r.ok) console.log(' -', r.name, r.info);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
process.exit(passed === results.length && !errors.length ? 0 : 1);
