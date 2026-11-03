// Block G-H (Frames): the Frames tab, Frame, Structural Member (profile library, corner treatment), the cut list
// (Cut-List-Items, Properties dialog), End Cap, Gusset, Weld Bead (Weld Folder), Trim/Extend.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
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
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const vol = async () => { await waitSettled(page); return S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6; } return a + Math.abs(v); }, 0); }); };
const errs = () => S(() => window.__phlippoStore.getState().rebuild.errors);
const nBodies = () => S(() => window.__phlippoStore.getState().rebuild.bodies.length);
const names = () => S(() => window.__phlippoStore.getState().doc.features.map((f) => f.name));
const pickFace = (pred, additive = false) => S(({ pred, additive }) => {
  const s = window.__phlippoStore.getState();
  const fn = new Function('f', 'b', `return ${pred}`);
  for (const b of s.rebuild.bodies) { const f = b.faces.find((f) => !f.curved && fn(f, b)); if (f) { s.setSelectedFace({ bodyId: b.id, faceId: f.id }, additive); return b.id; } }
  return null;
}, { pred, additive });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// an L path on the Front plane: (0,0) -> (300,0) -> (300,200)
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('p1', 'Path', 'front');
  sk = K.addLine(sk, { x: 0, y: 0 }, { x: 300, y: 0 })[0];
  sk = K.addLine(sk, { x: 300, y: 0 }, { x: 300, y: 200 })[0];
  const d = K.createDocument('Frame');
  d.sketches = { p1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Path', sketchId: 'p1', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);

// ---- the Frames tab and the Frame feature
check('Command Ribbon has a Frames tab', (await page.locator('.k-cm-tab:has-text("Frames")').count()) === 1);
await page.click('.k-cm-tab:has-text("Frames")');
for (const l of ['Frame', 'Structural Member', 'Trim/Extend', 'End Cap', 'Gusset', 'Weld Bead', 'Cut List', '3D Sketch']) check(`Frames tab has ${l}`, (await page.locator(`.k-cm-group :text-is("${l}")`).count()) >= 1);
await page.click('.k-cm-big:has-text("Frame") .k-cm-main');
await page.waitForTimeout(300);
check('Frame: the document is a frame part with a Frame tree item', (await S(() => !!window.__phlippoStore.getState().doc.weldment)) && (await page.locator('.k-tree-row[data-id="weldment"]').count()) === 1 && (await names()).includes('Frame'));
await shot('gh0-weldments-tab');

// ---- Structural Member: ISO square tube 40 x 40 x 4 along the L, end miter
await page.click('.k-cm-big:has-text("Structural Member") .k-cm-main');
await page.waitForTimeout(400);
check('Structural Member PM: Selections (Standard/Type/Size, Groups), Settings (corner treatment)', (await page.locator('.k-pm-title:has-text("Structural Member")').count()) >= 1 && (await page.locator('[data-testid="sm-standard"]').count()) === 1 && (await page.locator('[data-testid="sm-corner"]').isChecked()));
check('the library offers the ISO types', (await page.locator('[data-testid="sm-type"] option').count()) === 6);
await page.locator('[data-testid="sm-path"]').selectOption('p1');
await page.locator('[data-testid="sm-type"]').selectOption('square tube');
await page.locator('[data-testid="sm-size"]').selectOption('40 x 40 x 4');
await page.waitForTimeout(800);
check('preview: two members along the path', /2 member\(s\)/.test(await page.locator('[data-testid="sm-groups"]').innerText()), await page.locator('[data-testid="sm-groups"]').innerText());
await shot('gh1-structural-member-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const area = 40 * 40 - 32 * 32 - (4 - Math.PI) * (64 - 16); // EN 10219-2 corner radii ro 8, ri 4
const v1 = await vol();
check('Structural Member1: two mitered tubes, volume = area × (300 + 200)', Math.abs(v1 - area * 500) < area * 500 * 0.03 && (await nBodies()) === 2 && !Object.keys(await errs()).length, `${v1.toFixed(0)} vs ${area * 500} ${JSON.stringify(await errs())}`);
check('tree: Cut list(2) with two Cut-List-Items (different lengths)', (await page.locator('.k-tree-row:has-text("Cut list(2)")').count()) === 1);
await page.locator('.k-tree-row[data-id="bodies"] .caret').click();
await page.waitForTimeout(200);
check('Cut-List-Item1 and Cut-List-Item2 folders', (await page.locator('.k-tree-row[data-id^="cutitem:"]').count()) === 2);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('gh2-members');

// ---- End Cap on the free end of the horizontal member (x = 0, normal -x)
await page.click('.k-cm-tab:has-text("Frames")');
await page.click('.k-cm-small:has-text("End Cap")');
await page.waitForTimeout(300);
check('End Cap PM: Parameters, Offset (thickness ratio), Corner Treatment', (await page.locator('[data-testid="ec-faces"]').count()) === 1 && (await page.locator('[data-testid="ec-ratio"]').isChecked()));
await pickFace('f.normal[0] < -0.99 && Math.abs(f.centroid[0]) < 0.5');
await page.waitForTimeout(400);
check('the end face is picked', (await page.locator('[data-testid="ec-faces"] .k-selbox-row').count()) === 1);
await page.locator('[data-testid="ec-ratio"]').uncheck();
await page.waitForTimeout(500);
await shot('gh3-endcap-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const v2 = await vol();
// offset 2 on each side: (40 - 4) x (40 - 4) with the R8 corners of the tube come in to R6, 5 thick
check('End Cap1: a plate of 36 x 36 (R6 corners) x 5 as a new body', Math.abs(v2 - v1 - (36 * 36 - (4 - Math.PI) * 36) * 5) < 60 && (await nBodies()) === 3 && !Object.keys(await errs()).length, `${(v2 - v1).toFixed(0)} ${JSON.stringify(await errs())}`);

// ---- Gusset between the top of the horizontal member and the inner face of the vertical one
await page.click('.k-cm-tab:has-text("Frames")');
await page.click('.k-cm-small:has-text("Gusset")');
await page.waitForTimeout(300);
check('Gusset PM: Supporting Faces, Profile (triangular/polygonal, d1 d2 thickness), Parameters', (await page.locator('[data-testid="wg-faces"]').count()) === 1 && (await page.locator('[data-testid="wg-poly"]').count()) === 1);
await pickFace('f.normal[1] > 0.99 && Math.abs(f.centroid[1] - 20) < 0.5 && f.centroid[0] < 250');
await pickFace('f.normal[0] < -0.99 && Math.abs(f.centroid[0] - 280) < 0.5 && f.centroid[1] > 50', true);
await page.waitForTimeout(500);
check('two supporting faces picked', (await page.locator('[data-testid="wg-faces"] .k-selbox-row').count()) === 2);
await shot('gh4-gusset-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const v3 = await vol();
check('Gusset1: a 30 x 30 x 5 triangular plate', Math.abs(v3 - v2 - 0.5 * 30 * 30 * 5) < 60 && (await nBodies()) === 4 && !Object.keys(await errs()).length, `${(v3 - v2).toFixed(0)} ${JSON.stringify(await errs())}`);

// ---- Weld Bead along the same corner (its own body in the Weld Folder, not in the cut list)
await page.click('.k-cm-tab:has-text("Frames")');
await page.click('.k-cm-small:has-text("Weld Bead")');
await page.waitForTimeout(300);
await pickFace('f.normal[1] > 0.99 && Math.abs(f.centroid[1] - 20) < 0.5 && f.centroid[0] < 250');
await pickFace('f.normal[0] < -0.99 && Math.abs(f.centroid[0] - 280) < 0.5 && f.centroid[1] > 50', true);
await page.waitForTimeout(300);
await page.locator('[data-testid="wb-intermittent"]').check();
await page.waitForTimeout(400);
check('Weld Bead PM: Weld Path, Settings with intermittent weld (length, pitch)', (await page.locator('[data-testid="wb-faces"] .k-selbox-row').count()) === 2 && (await page.locator('.k-section:has-text("Settings") input.k-num').count()) >= 4);
await shot('gh5-weldbead-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
check('Weld Bead1: Weld Folder(1) in the tree, the cut list counts the 4 other bodies', (await nBodies()) === 5 && (await page.locator('.k-tree-row:has-text("Weld Folder(1)")').count()) === 1 && (await page.locator('.k-tree-row:has-text("Cut list(4)")').count()) === 1 && !Object.keys(await errs()).length, JSON.stringify(await errs()));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('gh6-frame');

// ---- Cut list properties
await page.click('.k-cm-tab:has-text("Frames")');
await page.click('.k-cm-small:has-text("Cut List")');
await page.waitForTimeout(400);
const rows = await page.locator('[data-testid="cutlist-table"] tbody tr').count();
const table = (await page.locator('[data-testid="cutlist-table"]').innerText()).replace(/\s+/g, ' ');
check('Cut-List Properties: 4 items (2 tubes, cap, gusset) with description, length (to the long edge of the miter: 320 and 220) and the 45° miter angles', rows === 4 && /SQUARE TUBE 40 x 40 x 4/.test(table) && /320 mm/.test(table) && /220 mm/.test(table) && /45°/.test(table) && /End cap/.test(table) && /Gusset/.test(table), table.slice(0, 300));
await shot('gh7-cutlist');
await page.locator('[data-testid="cutlist-dialog"] .k-btn:has-text("OK")').click();

// ---- Trim/Extend: a T of two members without corner treatment, the upright trimmed by the beam
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('p2', 'Path', 'front');
  sk = K.addLine(sk, { x: 0, y: 0 }, { x: 300, y: 0 })[0];
  sk = K.addLine(sk, { x: 150, y: -100 }, { x: 150, y: 100 })[0];
  const d = K.createDocument('Tee');
  d.sketches = { p2: sk };
  d.weldment = true;
  d.features = [
    { id: 'w', type: 'weldment', name: 'Frame', suppressed: false },
    { id: 'k1', type: 'sketch', name: 'Path', sketchId: 'p2', suppressed: false },
    { id: 'm1', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 'p2', standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'none', gap: 0, rotation: 0 },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);
check('T frame: two crossing members', (await nBodies()) === 2);
const vT0 = await vol();
await page.click('.k-cm-tab:has-text("Frames")');
await page.click('.k-cm-small:has-text("Trim/Extend")');
await page.waitForTimeout(300);
check('Trim/Extend PM: Corner Type, Bodies to be Trimmed, Trimming Boundary (Face/Plane | Bodies)', (await page.locator('[data-testid="te-bodies"]').count()) === 1 && (await page.locator('[data-testid="te-bybodies"]').isChecked()));
// the upright: a face with normal +x at x = 170
await pickFace('f.normal[0] > 0.99 && Math.abs(f.centroid[0] - 170) < 0.5');
await page.waitForTimeout(200);
await page.locator('[data-testid="te-trimming"]').click();
await pickFace('f.normal[1] > 0.99 && Math.abs(f.centroid[1] - 20) < 0.5 && Math.abs(f.centroid[0] - 150) < 0.5');
await page.waitForTimeout(500);
check('bodies to trim and trimming body filled in', (await page.locator('[data-testid="te-bodies"] .k-selbox-row').count()) === 1 && (await page.locator('[data-testid="te-trimming"] .k-selbox-row').count()) === 1);
await shot('gh8-trimextend-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const vT1 = await vol();
check('Trim/Extend1 removes the upright inside the beam', vT0 - vT1 > 2000 && (await nBodies()) === 2 && !Object.keys(await errs()).length, `${(vT0 - vT1).toFixed(0)} ${JSON.stringify(await errs())}`);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('gh9-trimextend');

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
