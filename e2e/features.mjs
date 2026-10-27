// Phase 2 check: rebuild the BasePlate of the reference video (80x80, Ø35, extrude 10, cut), face selection, undo/redo, reload, wheel zoom at the pointer.
import fs from 'node:fs';
import { exitCode, skip } from './lib/check.mjs';
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
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { features: s.doc.features.map((f) => ({ type: f.type, name: f.name, op: f.op })), bodies: s.rebuild.bodies.length, errors: s.rebuild.errors, fe: s.featureEdit ? s.featureEdit.draft : null, active: s.activeSketchId, selFace: s.selectedFace, tab: s.tab }; });
const status = async () => ((await page.locator('.k-statusbar').textContent().catch(() => '')) || '').trim().replace(/\s+/g, ' ');

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
// sketch on Top Plane: 80 x 80 rectangle + Ø35 circle, dimensioned like the video
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy); // corner at the origin
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
// circle in the middle: after the 80 mm dimensions the square spans 80 mm; find its centre from the store
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
await page.waitForTimeout(200);
console.log('sketch status:', (await status()).slice(-60));
await shot('e1-sketch');

// Extruded Boss/Base from inside the sketch
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
console.log('after Extrude click:', JSON.stringify(await S()));
await shot('e2-extrude-preview');
await page.locator('.k-pm-valuerow input.k-num').first().fill('10');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const s1 = await S();
check('Boss-Extrude1 creates one body', s1.bodies === 1 && s1.features.length === 2 && Object.keys(s1.errors).length === 0, JSON.stringify(s1));
await page.keyboard.press('f');
await page.waitForTimeout(500);
await shot('e3-part');
console.log('tree:', (await page.locator('.k-tree').textContent()).replace(/\s+/g, ' ').slice(0, 200));

// hover + select the top face, then Sketch on it and draw a circle, then Extruded Cut through all
await page.keyboard.press('Control+5'); await page.waitForTimeout(400); await page.mouse.move(cx - 250, cy - 250);
await page.waitForTimeout(200);
check('hover highlights a face', !!(await page.evaluate(() => window.__phlippoStore.getState().hoverFace)));
await shot('e4-hover-face');
await page.mouse.click(cx - 250, cy - 250);
await page.waitForTimeout(200);
check('click selects the face', !!(await page.evaluate(() => window.__phlippoStore.getState().selectedFace)));
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(600);
check('Sketch opens on the selected face', (await S()).active !== null && (await S()).features.length === 3);
await shot('e5-sketch-on-face');
const vp2 = await page.locator('.k-viewport').boundingBox();
const c2 = { x: vp2.x + vp2.width / 2 + 150, y: vp2.y + vp2.height / 2 + 150 };
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(c2.x, c2.y);
await page.mouse.click(c2.x + 40, c2.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Cut") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-pm-valuerow select').first().selectOption('throughAll');
await page.waitForTimeout(300);
await shot('e6-cut-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
const s2 = await S();
check('Cut-Extrude1 through all', s2.features.length === 4 && Object.keys(s2.errors).length === 0, JSON.stringify(s2.errors));
// total volume of all solid bodies (a boss that touches nothing is its own body, as in the original)
const volume = () => page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const g = b.geometry; const a = g.getAttribute('position'); for (let i = 0; i + 2 < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } } return Math.abs(v); });
const volAfterCut = await volume();
const plate = (6400 - Math.PI * 17.5 * 17.5) * 10;
check('the cut removed material from the plate', volAfterCut < plate * 0.995, `volume ${volAfterCut.toFixed(0)} vs plate ${plate.toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e7-part-cut');
// undo the cut, redo it
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);
check('undo removes the cut', (await S()).features.length === 3);
await page.keyboard.press('Control+y');
await page.waitForTimeout(300);
check('redo restores the cut', (await S()).features.length === 4);
// reload: autosave rebuilds the solids
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 4000 }).catch(skip('features:136')); // the autosave waits under Recent Documents, as the original
await page.waitForTimeout(800);
const s3 = await S();
check('autosave rebuilds the solids after reload', s3.bodies === 1 && s3.features.length === 4 && Object.keys(s3.errors).length === 0);
await shot('e8-after-reload');
// fillet on the top outer edge of the plate (edge midpoint at world (40, 10, 0)): hover, select, Fillet, radius 5, OK
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await page.keyboard.press('f');
await page.waitForTimeout(400);
const em = await page.evaluate(() => window.__phlippoProjectWorld(40, 10, 0));
await page.mouse.move(em.x, em.y);
await page.waitForTimeout(150);
check('hover highlights an edge', !!(await page.evaluate(() => window.__phlippoStore.getState().hoverEdge)));
await page.mouse.click(em.x, em.y);
await page.waitForTimeout(150);
check('click selects the edge', (await page.evaluate(() => window.__phlippoStore.getState().selectedEdges.length)) === 1);
await page.click('.k-cm-big:has-text("Fillet") .k-cm-main');
await page.waitForTimeout(600);
await shot('e9-fillet-preview');
await page.locator('.k-pm-valuerow input.k-num').first().fill('5');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(600);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const s4 = await S();
check('Fillet1 added without errors', s4.features.length === 5 && s4.features[4].type === 'fillet' && Object.keys(s4.errors).length === 0, JSON.stringify(s4.errors));
await shot('e10-fillet');
// chamfer on the opposite top edge (midpoint (40, 10, -80))
const em2 = await page.evaluate(() => window.__phlippoProjectWorld(40, 10, -80));
await page.mouse.click(em2.x, em2.y);
await page.waitForTimeout(150);
await page.click('.k-cm-big:has-text("Fillet") .k-cm-arrow');
await page.click('.k-menu-item:has-text("Chamfer")');
await page.waitForTimeout(600);
await page.locator('.k-pm-valuerow input.k-num').first().fill('4');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(400);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const s5 = await S();
check('Chamfer1 added without errors', s5.features.length === 6 && s5.features[5].type === 'chamfer' && Object.keys(s5.errors).length === 0, JSON.stringify(s5.errors));
await shot('e11-chamfer');
if (process.env.E2E_DEBUG) {
  const stats = await page.evaluate(() => {
    const bs = window.__phlippoBodyScene;
    const out = [];
    bs.group.traverse((o) => {
      if (o.isLineSegments) {
        const p = o.geometry.getAttribute('position');
        let n = 0, near = 0, nearUpper = 0;
        for (let i = 0; i + 1 < p.count; i += 2) {
          n++;
          const my = (p.getY(i) + p.getY(i + 1)) / 2, mz = (p.getZ(i) + p.getZ(i + 1)) / 2;
          if (Math.abs(my - 5) < 0.3 && Math.abs(mz) < 0.3) near++;
          if (Math.abs(my - 10) < 0.3 && Math.abs(mz + 5) < 0.3) nearUpper++;
        }
        out.push({ segments: n, lowerTangent: near, upperTangent: nearUpper, visible: o.visible, depthTest: o.material.depthTest });
      }
    });
    return out;
  });
  console.log('EDGE STATS', JSON.stringify(stats));
}
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.waitForTimeout(600);
check('undo removes chamfer and fillet', (await S()).features.length === 4);

// Hole Tool on the top face: select the face, Hole Tool, counterbore, two positions, OK
await page.keyboard.press('Control+7');
await page.waitForTimeout(300);
await page.keyboard.press('f');
await page.waitForTimeout(300);
const fm = await page.evaluate(() => window.__phlippoProjectWorld(15, 10, -15));
await page.mouse.click(fm.x, fm.y);
await page.waitForTimeout(150);
check('face selected for the Hole Tool', !!(await page.evaluate(() => window.__phlippoStore.getState().selectedFace)));
await page.click('.k-cm-big:has-text("Hole Tool") .k-cm-main');
await page.waitForTimeout(300);
await page.locator('.k-pm-typebtn[data-tip="Counterbore"]').click();
const h1 = await page.evaluate(() => window.__phlippoProjectWorld(15, 10, -15));
const h2 = await page.evaluate(() => window.__phlippoProjectWorld(15, 10, -65));
await page.mouse.click(h1.x, h1.y);
await page.mouse.click(h2.x, h2.y);
await page.waitForTimeout(600);
check('two hole positions placed', (await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft.points.length)) === 2);
await shot('e12-hole-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const s6 = await S();
check('Hole1 added without errors', s6.features.length === 5 && s6.features[4].type === 'hole' && Object.keys(s6.errors).length === 0, JSON.stringify(s6.errors));
// Linear pattern of the small cut hole along X
await page.click('.k-tree-row:has-text("Cut-Extrude1")');
await page.click('.k-cm-big:has-text("Linear Pattern") .k-cm-main');
await page.waitForTimeout(300);
await page.locator('.k-pm-valuerow').locator('..').locator('input.k-num').first().fill('15');
await page.locator('.k-field:has-text("Instances") input').fill('3');
await page.locator('.k-field:has-text("Instances") input').press('Enter');
await page.waitForTimeout(800);
await shot('e13-pattern-preview');
// Instances to Skip: click the marker of the second instance (as the original's yellow rings)
check('pattern instance markers shown', (await page.locator('.k-pattern-marker').count()) === 2);
await page.locator('.k-pattern-marker').nth(1).click();
await page.waitForTimeout(300);
check('instance added to Instances to Skip', JSON.stringify(await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft.skip)) === '[1]');
await shot('e13b-pattern-skip');
await page.locator('.k-pattern-marker').nth(1).click();
await page.waitForTimeout(200);
check('clicking again restores the instance', JSON.stringify(await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft.skip)) === '[]');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const s7 = await S();
check('LPattern1 added without errors', s7.features.length === 6 && s7.features[5].type === 'linearPattern' && Object.keys(s7.errors).length === 0, JSON.stringify(s7.errors));
// Mirror about the Right plane
await page.click('.k-cm-small:has-text("Mirror")');
await page.waitForTimeout(800);
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
const s8 = await S();
check('Mirror1 added without errors', s8.features.length === 7 && s8.features[6].type === 'mirror' && Object.keys(s8.errors).length === 0, JSON.stringify(s8.errors));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e14-mirror');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.waitForTimeout(800);
check('undo removes mirror, pattern and holes', (await S()).features.length === 4);

// Shell: select the top face, Shell, 2 mm, OK; the plate becomes a tray open at the top
await page.keyboard.press('Control+7');
await page.waitForTimeout(300);
await page.keyboard.press('f');
await page.waitForTimeout(300);
const sf = await page.evaluate(() => window.__phlippoProjectWorld(5, 10, -40));
await page.mouse.click(sf.x, sf.y);
await page.waitForTimeout(150);
console.log('before Shell:', JSON.stringify(await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; return { selectedFaces: s.selectedFaces.length, hoverEdge: s.hoverEdge, edges: b.edges.length, closed: b.edges.filter((e) => e.closed).length, straight: b.edges.filter((e) => e.straight).length }; })));
await page.click('.k-cm-small:has-text("Shell")');
await page.waitForTimeout(1200);
console.log('shell draft:', JSON.stringify(await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft)));
check('shell draft has the selected face to remove', (await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft.faces.length)) === 1);
await shot('e15-shell-preview');
const volBefore = await volume();
await page.click('.k-pm-ok');
await page.waitForTimeout(1500);
const s9 = await S();
check('Shell1 added without errors', s9.features.length === 5 && s9.features[4].type === 'shell' && Object.keys(s9.errors).length === 0, JSON.stringify(s9.errors));
const volAfter = await volume();
check('shell removed most of the material', volAfter < volBefore * 0.6, `${volBefore.toFixed(0)} -> ${volAfter.toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e16-shell');
await page.keyboard.press('Control+z');
await page.waitForTimeout(800);
check('undo removes the shell', (await S()).features.length === 4);

// Sweep: a circle on the Front plane swept along a line on the Top plane (a tube across the plate, above it)
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Front Plane")', { clickCount: 2 });
await page.waitForTimeout(700);
const pc = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 20 }));
const pr = await page.evaluate(() => window.__phlippoProject({ x: 44, y: 20 }));
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(pc.x, pc.y);
await page.mouse.click(pr.x, pr.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-confirm-ok');
await page.waitForTimeout(500);
await page.click('.k-tree-row:has-text("Top Plane")', { clickCount: 2 });
await page.waitForTimeout(700);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(400);
const la = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 0 }));
const lb = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 60 }));
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(la.x, la.y);
await page.mouse.click(lb.x, lb.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-confirm-ok');
await page.waitForTimeout(500);
const sBefore = await S();
const volBeforeSweep = await volume();
await page.click('.k-tree-row:has-text("Sketch3")');
await page.click('.k-cm-small:has-text("Swept Boss/Base")');
await page.waitForTimeout(400);
const pathSel = page.locator('.k-field:has(> label:text-is("Path")) select');
await pathSel.selectOption({ label: 'Sketch4' });
await page.waitForTimeout(800);
await shot('e17-sweep-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(1000);
const s10 = await S();
check('Sweep1 added without errors', s10.features.length === sBefore.features.length + 1 && s10.features[s10.features.length - 1].type === 'sweep' && Object.keys(s10.errors).length === 0, JSON.stringify(s10.errors));
const volAfterSweep = await volume();
check('sweep added the tube volume', volAfterSweep > volBeforeSweep + Math.PI * 16 * 60 * 0.9, `${volBeforeSweep.toFixed(0)} -> ${volAfterSweep.toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e18-sweep');

// Evaluate: Mass Properties reports the volume of the body; Measure shows the length of a selected edge
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-big:has-text("Mass Properties") .k-cm-main');
await page.waitForTimeout(500);
const report = await page.locator('.k-mass-report').innerText();
const volNow = await volume();
const mv = /Volume = ([\d.]+)/.exec(report);
check('Mass Properties reports the volume', !!mv && Math.abs(parseFloat(mv[1]) - volNow) < 1, `${mv && mv[1]} vs ${volNow.toFixed(2)}`);
check('Mass Properties lists the centre of mass and inertia', /Center of mass/.test(report) && /Lxx = /.test(report));
await shot('e19-mass-properties');
await page.click('.k-cm-big:has-text("Measure") .k-cm-main');
await page.waitForTimeout(300);
const me = await page.evaluate(() => window.__phlippoProjectWorld(20, 10, 0));
await page.mouse.move(me.x, me.y);
await page.waitForTimeout(200);
await page.mouse.click(me.x, me.y);
await page.waitForTimeout(300);
const measureText = await page.locator('.k-measure-dialog').innerText();
check('Measure shows the edge length', /Length \(Edge<1>\):\s*80\.00mm/.test(measureText), measureText.replace(/\s+/g, ' ').slice(0, 160));
await shot('e20-measure');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');

// STL: Save As STL downloads a binary STL of the body; opening an .stl adds an Imported feature
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
// since G-C the STL export shows its Export Options page first (Binary is the default)
await page.click('.k-menu-item:has-text("Save As ▸ STL")');
await page.waitForSelector('[data-testid="export-ok"]');
await page.locator('[data-testid="export-showinfo"]').uncheck().catch(skip('features:368'));
const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid="export-ok"]').click()]);
const stlPath = download.suggestedFilename();
check('Save As STL downloads Part1.stl', stlPath === 'Part1.stl', stlPath);
const stlBuf = fs.readFileSync(await download.path());
const triCount = stlBuf.readUInt32LE(80);
check('the STL holds the body triangles', stlBuf.length === 84 + triCount * 50 && triCount > 100, `${triCount} triangles, ${stlBuf.length} bytes`);
// import a 10 x 10 x 10 box (binary STL built here) into the open document
const boxTris = [];
const q = (x, y, z) => [x, y, z];
const faces = [
  [q(0,0,0), q(10,0,0), q(10,10,0), q(0,10,0)], [q(0,0,10), q(0,10,10), q(10,10,10), q(10,0,10)],
  [q(0,0,0), q(0,0,10), q(10,0,10), q(10,0,0)], [q(0,10,0), q(10,10,0), q(10,10,10), q(0,10,10)],
  [q(0,0,0), q(0,10,0), q(0,10,10), q(0,0,10)], [q(10,0,0), q(10,0,10), q(10,10,10), q(10,10,0)],
];
for (const [a, b, c, d] of faces) boxTris.push([a, b, c], [a, c, d]);
const stl = Buffer.alloc(84 + boxTris.length * 50);
stl.writeUInt32LE(boxTris.length, 80);
boxTris.forEach((t, i) => { const o = 84 + i * 50 + 12; t.flat().forEach((v, k) => stl.writeFloatLE(v, o + k * 4)); });
const featuresBefore = (await S()).features.length;
await page.setInputFiles('#phlippo-open-file', { name: 'box.stl', mimeType: 'model/stl', buffer: stl });
await page.waitForTimeout(800);
const sImp = await S();
check('Imported1 added from box.stl', sImp.features.length === featuresBefore + 1 && sImp.features[sImp.features.length - 1].type === 'imported' && Object.keys(sImp.errors).length === 0, JSON.stringify(sImp.errors));
check('the imported box becomes a solid body (own body, as Insert ▸ Features ▸ Imported)', (await volume()) > volNow + 1000 * 0.5, String(await volume()));
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
check('undo removes the import', (await S()).features.length === featuresBefore);

// Equations: a global variable "Width" drives D1@Sketch1 (the 80 mm of the plate); the body follows
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Tools")');
await page.click('.k-menu-item:has-text("Equations")');
await page.waitForTimeout(300);
check('Equations dialog opens', (await page.locator('.k-dialog-title').innerText()).includes('Equations, Global Variables, and Dimensions'));
await page.fill('.k-eq-table input[placeholder="Add global variable"]', '"Width" = 100');
await page.press('.k-eq-table input[placeholder="Add global variable"]', 'Enter');
await page.waitForTimeout(200);
check('global variable row added', await page.locator('.k-eq-table input.mono').evaluateAll((els) => els.some((e) => e.value.includes('Width'))));
await page.selectOption('.k-eq-table select:not([data-testid="eq-add-suppression"])', { label: '"D1@Sketch1" = 80' });
await page.waitForTimeout(200);
const eqInputs = page.locator('.k-eq-table input.mono');
await eqInputs.last().fill('= "Width"');
await page.waitForTimeout(200);
await page.screenshot({ path: 'e2e-out/e21-equations.png' });
await page.click('.k-dialog-actions button:has-text("OK")');
await page.waitForTimeout(1200);
const sEq = await S();
check('equations stored in the document', (await page.evaluate(() => window.__phlippoStore.getState().doc.equations.length)) === 2 && Object.keys(sEq.errors).length === 0, JSON.stringify(sEq.errors));
const d1 = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.doc.features[0].sketchId]; const dims = sk.constraintOrder.map((id) => sk.constraints[id]).filter((c) => c.value !== undefined); return dims[0].value; });
check('D1@Sketch1 now evaluates to 100', d1 === 100, String(d1));
const volEq = await volume();
check('the plate grew with the width', volEq > volNow * 1.15, `${volNow.toFixed(0)} -> ${volEq.toFixed(0)}`);
check('Equations folder in the tree', (await page.locator('.k-tree-row:has-text("Equations")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('e22-equations-applied');
await page.keyboard.press('Control+z');
await page.waitForTimeout(600);
check('undo removes the equations', (await page.evaluate(() => window.__phlippoStore.getState().doc.equations.length)) === 0);

// Options: System Options - General layout, View > Arrow keys drives the rotation step, Document Properties > Units decimals
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Tools")');
await page.click('.k-menu-item:has-text("Options")');
await page.waitForTimeout(300);
check('Options dialog titled as the original', (await page.locator('.k-options-title').innerText()).includes('System Options - General'));
check('Options category list present', (await page.locator('.k-opt-cat').count()) >= 20);
await page.click('.k-opt-cat:text-is("View")');
await page.waitForTimeout(150);
check('title follows the page', (await page.locator('.k-options-title').innerText()).includes('System Options - View'));
const arrowInput = page.locator('.k-opt-row:has-text("Arrow keys") input[type=number]');
await arrowInput.fill('30');
await page.click('.k-options-tabs button:has-text("Document Properties")');
await page.click('.k-opt-cat:text-is("Units")');
await page.waitForTimeout(150);
check('Document Properties - Units page', (await page.locator('.k-options-title').innerText()).includes('Document Properties - Units'));
await page.selectOption('.k-opt-row:has-text("Decimals:") select', '.123');
await page.screenshot({ path: 'e2e-out/e23-options.png' });
await page.click('.k-options-actions button:has-text("OK")');
await page.waitForTimeout(300);
const prefsNow = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { arrow: s.prefs['view.arrowKeys'], dec: s.prefs['doc.lengthDecimals'], docProps: Object.keys(s.doc.properties || {}).length }; });
check('options stored (system + document)', prefsNow.arrow === 30 && prefsNow.dec === '.123' && prefsNow.docProps > 0, JSON.stringify(prefsNow));
const rotBefore = await page.evaluate(() => window.__phlippoCamera ? window.__phlippoCamera.rotation.toArray() : null);
await page.mouse.click(960, 540);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(500);
const rotAfter = await page.evaluate(() => window.__phlippoCamera ? window.__phlippoCamera.rotation.toArray() : null);
if (rotBefore && rotAfter) {
  const dot = Math.abs(rotBefore[0] * rotAfter[0] + rotBefore[1] * rotAfter[1] + rotBefore[2] * rotAfter[2] + rotBefore[3] * rotAfter[3]);
  const deg = (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
  check('arrow key rotates by the configured 30 degrees', Math.abs(deg - 30) < 1, deg.toFixed(1));
}
// reset the options for the following checks
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setPrefs({ ...s.prefs, 'view.arrowKeys': 15, 'doc.lengthDecimals': '.12' }); });
await page.waitForTimeout(200);

// Material: double-click the Material row, pick 1060 Alloy, Apply -> tree and Mass Properties follow
await page.dblclick('.k-tree-row:has-text("Material <not specified>")');
await page.waitForTimeout(300);
check('Material dialog opens from the tree', (await page.locator('.k-material').count()) === 1);
await page.click('.k-material-cat:has-text("Aluminium Alloys")');
await page.click('.k-material-item:has-text("1060 Alloy")');
check('Properties tab shows the density', (await page.locator('.k-material-props').innerText()).includes('2700'));
await page.screenshot({ path: 'e2e-out/e24-material.png' });
await page.click('.k-material .k-dialog-actions button:has-text("Apply")');
await page.click('.k-material .k-dialog-actions button:has-text("Close")');
await page.waitForTimeout(300);
check('tree shows 1060 Alloy', (await page.locator('.k-tree-row:has-text("1060 Alloy")').count()) === 1);
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-big:has-text("Mass Properties") .k-cm-main');
await page.waitForTimeout(400);
check('Mass Properties uses the material density', (await page.locator('.k-mass-report').innerText()).includes('Density = 0.003') || (await page.locator('.k-mass-report').innerText()).includes('0.0027'));
await page.click('.k-mass-dialog button:has-text("Close")');
await page.click('.k-cm-tab:has-text("Features")');

// Thin Feature: an open L profile on the Front plane is extruded as a wall (Extrude-Thin1), as the original proposes
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Front Plane")', { clickCount: 2 });
await page.waitForTimeout(700);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(300);
const l1 = await page.evaluate(() => window.__phlippoProject({ x: 10, y: 15 }));
const l2 = await page.evaluate(() => window.__phlippoProject({ x: 30, y: 15 }));
const l3 = await page.evaluate(() => window.__phlippoProject({ x: 30, y: 35 }));
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(l1.x, l1.y);
await page.mouse.click(l2.x, l2.y);
await page.mouse.click(l3.x, l3.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
const thinDraft = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft);
check('open profile starts a Thin Feature extrude', thinDraft && thinDraft.thin && thinDraft.name === 'Extrude-Thin1', JSON.stringify(thinDraft && { thin: thinDraft.thin, name: thinDraft.name }));
check('Thin Feature section shows the thickness', (await page.locator('.k-section:has-text("Thin Feature") input[type=checkbox]').first().isChecked()));
await shot('e25-thin-feature');
const volBeforeThin = await volume();
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const sThin = await S();
check('Extrude-Thin1 added without errors', sThin.features[sThin.features.length - 1].name === 'Extrude-Thin1' && Object.keys(sThin.errors).length === 0, JSON.stringify(sThin.errors));
const volAfterThin = await volume();
check('thin wall adds about (20 + 20) x 2 x 10 mm3', volAfterThin - volBeforeThin > 700 && volAfterThin - volBeforeThin < 900, `${(volAfterThin - volBeforeThin).toFixed(0)}`);
await page.keyboard.press('Control+z');
await page.waitForTimeout(500);

// Reference Geometry > Plane: an offset plane 25 mm from the Front Plane appears in the tree as Plane1 and in the graphics area
await page.click('.k-cm-big:has-text("Reference Geometry") .k-cm-main');
await page.waitForTimeout(300);
check('Plane Property Panel open', (await page.locator('.k-pm-title').innerText()).includes('Plane'));
await page.locator('.k-section:has-text("First Reference") input.k-num').first().fill('25');
await page.waitForTimeout(300);
await shot('e26-plane-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(400);
const planes = await page.evaluate(() => Object.values(window.__phlippoStore.getState().doc.planes).filter((p) => p.kind === 'reference').map((p) => ({ name: p.name, origin: p.origin, n: p.n })));
check('Plane1 created 25 mm in front of the Front Plane', planes.length === 1 && planes[0].name === 'Plane1' && Math.abs(planes[0].origin[2] - 25) < 1e-6 && Math.abs(planes[0].n[2] - 1) < 1e-6, JSON.stringify(planes));
check('Plane1 listed in the tree', (await page.locator('.k-tree-row:has-text("Plane1")').count()) === 1);
// a sketch can be started on it (right-click = new sketch, as the reference planes)
await page.click('.k-tree-row:has-text("Plane1")', { button: 'right' });
await page.waitForTimeout(500);
check('sketch opens on Plane1', await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return !!sk && s.doc.planes[sk.plane]?.name === 'Plane1'; }));
await page.keyboard.press('Escape');
await page.click('.k-confirm-cancel').catch(skip('features:533'));
await page.waitForTimeout(300);

// mouse wheel zooms about the pointer: the sketch point under the pointer stays put
await expandTree();
await page.click('.k-tree-row:has-text("Sketch1")', { clickCount: 2 });
await page.waitForTimeout(600);
const probe = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 40 }));
await page.mouse.move(probe.x, probe.y);
await page.mouse.wheel(0, 240);
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 40 }));
const drift = Math.hypot(after.x - probe.x, after.y - probe.y);
check('wheel zoom keeps the point under the pointer', drift < 2, `drift ${drift.toFixed(1)} px`);
await page.keyboard.press('Escape');
await page.click('.k-confirm-ok');
// arrow keys rotate the model
const before = await page.locator('.k-viewname').textContent();
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(400);
check('arrow key rotates (view name cleared)', (await page.locator('.k-viewname').textContent()) === '', `was ${before}`);
await page.keyboard.press('Control+7');
console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
