// Block G-D (Surfaces): Thicken, Cut With Surface, Thickened Cut, Extend, Untrim/Delete Hole, Filled, Ruled, Flatten,
// Replace Face — on a 60 x 40 x 20 block with planar surfaces on reference planes.
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
const S = (fn, arg) => page.evaluate(fn, arg);
const vol = () => S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return a + Math.abs(v); }, 0); });
const surfArea = (idx) => S((idx) => { const s = window.__phlippoStore.getState(); const b = s.rebuild.surfaceBodies?.[idx]; if (!b) return -1; const p = b.geometry.getAttribute('position'); let a = 0; for (let i = 0; i + 2 < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i); const ux = p.getX(i + 1) - ax, uy = p.getY(i + 1) - ay, uz = p.getZ(i + 1) - az; const vx = p.getX(i + 2) - ax, vy = p.getY(i + 2) - ay, vz = p.getZ(i + 2) - az; const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; a += Math.hypot(cx, cy, cz) / 2; } return a; }, idx);
const errs = () => S(() => window.__phlippoStore.getState().rebuild.errors);
const nSurf = () => S(() => (window.__phlippoStore.getState().rebuild.surfaceBodies ?? []).length);
const rect = (K, sk, x0, y0, x1, y1) => { sk = K.addLine(sk, { x: x0, y: y0 }, { x: x1, y: y0 })[0]; sk = K.addLine(sk, { x: x1, y: y0 }, { x: x1, y: y1 })[0]; sk = K.addLine(sk, { x: x1, y: y1 }, { x: x0, y: y1 })[0]; sk = K.addLine(sk, { x: x0, y: y1 }, { x: x0, y: y0 })[0]; return sk; };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// block 60 x 40 x 20 (Top sketch, extrude +y 20) and three sketches: Right plane big rectangle, plane at y=15 and y=10
await S(() => {
  const K = window.__phlippoKit;
  const rect = (sk, x0, y0, x1, y1) => { sk = K.addLine(sk, { x: x0, y: y0 }, { x: x1, y: y0 })[0]; sk = K.addLine(sk, { x: x1, y: y0 }, { x: x1, y: y1 })[0]; sk = K.addLine(sk, { x: x1, y: y1 }, { x: x0, y: y1 })[0]; sk = K.addLine(sk, { x: x0, y: y1 }, { x: x0, y: y0 })[0]; return sk; };
  const s1 = rect(K.createSketch('s1', 'Sketch1', 'top'), -30, -20, 30, 20);
  const sRight = rect(K.createSketch('s2', 'RightRect', 'right'), -50, -10, 50, 40); // on x = 0 (right plane: u = z, v = y)
  const s15 = rect(K.createSketch('s3', 'Rect15', 'pl15'), -50, -40, 50, 40);
  let s10 = rect(K.createSketch('s4', 'Rect10', 'pl10'), -50, -40, 50, 40);
  s10 = K.addCircle(s10, { x: 0, y: 0 }, 5)[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1, s2: sRight, s3: s15, s4: s10 };
  d.planes = {
    pl15: { id: 'pl15', name: 'Plane15', origin: [0, 15, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], kind: 'reference' },
    pl10: { id: 'pl10', name: 'Plane10', origin: [0, 10, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], kind: 'reference' },
  };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'k2', type: 'sketch', name: 'RightRect', sketchId: 's2', suppressed: false },
    { id: 'k3', type: 'sketch', name: 'Rect15', sketchId: 's3', suppressed: false },
    { id: 'k4', type: 'sketch', name: 'Rect10', sketchId: 's4', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
    { id: 'sfR', type: 'surface', kind: 'planar', name: 'Surface-Plane1', suppressed: false, sketchId: 's2' },
    { id: 'sf15', type: 'surface', kind: 'planar', name: 'Surface-Plane2', suppressed: false, sketchId: 's3' },
    { id: 'sf10', type: 'surface', kind: 'planar', name: 'Surface-Plane3', suppressed: false, sketchId: 's4' },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);
const v0 = await vol();
check('block 48000 with three planar surfaces', Math.abs(v0 - 48000) < 1 && (await nSurf()) === 3, `${v0} surfaces ${await nSurf()} ${JSON.stringify(await errs())}`);
await page.click('.k-cm-tab:has-text("Surfaces")');
await page.waitForTimeout(200);
for (const l of ['Filled Surface', 'Ruled Surface', 'Surface Flatten', 'Replace Face', 'Delete Hole', 'Extend Surface', 'Untrim Surface', 'Thicken', 'Thickened Cut', 'Cut With Surface']) check(`Surfaces tab has ${l}`, (await page.locator(`.k-cm-main:has-text("${l}"), .k-cm-small:has-text("${l}")`).count()) >= 1);
await page.screenshot({ path: `${OUT}/gd-surfaces-tab.png` });

const run = async (kind, patch) => {
  await S((kind) => window.__phlippoStore.getState().startSurface(kind), kind);
  await page.waitForTimeout(200);
  if (patch) await S((p) => window.__phlippoStore.getState().updateFeatureDraft(p), patch);
  await S(() => window.__phlippoStore.getState().commitFeature());
  await page.waitForTimeout(700);
};
const undo = async () => { await S(() => window.__phlippoStore.getState().undo()); await page.waitForTimeout(400); };

// ---- Cut With Surface: the Right-plane surface (x = 0) cuts away one half → 24000
await run('cutWithSurface', { target: 'sfR' });
const v1 = await vol();
check('Cut With Surface halves the block', Math.abs(v1 - 24000) < 5, `${v1} ${JSON.stringify(await errs())}`);
await undo();

// ---- Thickened Cut: the surface at y = 10 thickened 4 removes a 60 x 40 x 4 slab (clipped to the block)
await run('thickenCut', { target: 'sf10', thickness: 4 });
const v2 = await vol();
check('Thickened Cut removes about 9600 mm³', Math.abs(v0 - v2 - 9600) < 400, `${v0 - v2} ${JSON.stringify(await errs())}`);
await undo();

// ---- Thicken: the y = 15 surface (100 x 80) becomes a slab of 2 → 16000 (merged with the block where it overlaps)
await run('thicken', { target: 'sf15', thickness: 2, merge: false });
const v3 = await vol();
check('Thicken makes a 100 x 80 x 2 slab (volume grows by about 16000)', Math.abs(v3 - v0 - 16000) < 800, `${v3 - v0} ${JSON.stringify(await errs())}`);
await undo();

// ---- Replace Face: the top face of the block replaced by the y = 15 surface → 60 x 40 x 15
await S(() => {
  const s = window.__phlippoStore.getState();
  s.startSurface('replaceFace');
  const b = s.rebuild.bodies[0];
  const top = b.faces.find((f) => !f.curved && f.normal[1] > 0.99);
  s.setSelectedFace({ bodyId: b.id, faceId: top.id });
});
await page.waitForTimeout(300);
check('Replace Face lists the picked face', (await page.locator('[data-testid="replace-faces"]').innerText()).includes('Face<'));
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ target: 'sf15' }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(800);
const v4 = await vol();
check('Replace Face trims the block to the surface (36000)', Math.abs(v4 - 36000) < 10, `${v4} ${JSON.stringify(await errs())}`);
await undo();

// ---- Untrim / Delete Hole: the y = 10 surface has a Ø10 hole → the area grows by π·25
const a10 = await surfArea(2);
await run('untrim', { target: 'sf10' });
const a10b = await surfArea(2);
check('Untrim closes the hole (area + 78.5)', Math.abs(a10b - a10 - Math.PI * 25) < 1, `${a10} -> ${a10b}`);
await undo();
await run('deleteHole', { target: 'sf10' });
check('Delete Hole closes it too', Math.abs((await surfArea(2)) - a10 - Math.PI * 25) < 1);
await undo();

// ---- Extend Surface: the y = 15 surface (100 x 80) extended 5 → + 2·100·5 + 2·80·5 = 1800
const a15 = await surfArea(1);
await run('extend', { target: 'sf15', distance: 5 });
check('Extend Surface adds 1800 mm² of strips', Math.abs((await surfArea(1)) - a15 - 1800) < 2, `${a15} -> ${await surfArea(1)}`);
await undo();

// ---- Filled Surface over the outer boundary of the holed surface → a new 100 x 80 patch
await run('filled', { target: 'sf10', fillWhich: 'outer' });
check('Filled Surface makes a new surface body of 8000 mm²', (await nSurf()) === 4 && Math.abs((await surfArea(3)) - 8000) < 1, `${await nSurf()} ${await surfArea(3)}`);
await undo();

// ---- Surface Flatten of the y = 15 surface: same area, laid beside
await run('flatten', { target: 'sf15' });
check('Surface Flatten makes a flat copy with the same area', (await nSurf()) === 4 && Math.abs((await surfArea(3)) - 8000) < 1, `${await surfArea(3)}`);
await undo();

// ---- Ruled Surface from a top edge of the block, tangent, 8 → a strip 60 x 8 (or 40 x 8)
await S(() => {
  const s = window.__phlippoStore.getState();
  s.startSurface('ruled');
  const b = s.rebuild.bodies[0];
  const e = b.edges.find((x) => x.straight && Math.abs(x.points[0].y - 20) < 1e-6 && Math.abs(x.points[x.points.length - 1].y - 20) < 1e-6);
  s.toggleSelectedEdge(e.id);
});
await page.waitForTimeout(300);
check('Ruled Surface takes the picked edge', (await page.locator('[data-testid="ruled-edge"]').innerText()).includes('Edge<1>'));
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ distance: 8, ruledMode: 'tangent' }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(700);
const ar = await surfArea(3);
check('the ruled strip is 8 wide along the edge (480 or 320 mm²)', Math.abs(ar - 480) < 1 || Math.abs(ar - 320) < 1, `${ar} ${JSON.stringify(await errs())}`);
await page.screenshot({ path: `${OUT}/gd-ruled.png` });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
