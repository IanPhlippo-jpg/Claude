// Standard Parts (QA 0.5.11 row 37, P2-8): the Part Library folder of the Task Pane makes ISO 4762 screws, ISO 4032
// nuts and ISO 7089 washers to the dimensions of their standard and inserts them into the open assembly; Auto Fasteners
// chooses the screw size from the ISO 273 clearance hole (Ø6.6 -> M6) and a length of the standard series.
import { chromium } from 'playwright';
import { exitCode, dontSave } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';
import { settle, frames } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Assembly")');
await dontSave(page);
await settle(page);
const S = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  return { kind: s.doc.kind, comps: (s.doc.components ?? []).map((c) => ({ name: c.name, pos: c.position, fixed: c.fixed })), mates: (s.doc.mates ?? []).map((m) => m.type), errors: s.rebuild.errors, bodies: s.rebuild.bodies.length, ghost: !!s.insertGhost, fe: !!s.fastenerEdit };
});

// a 40 x 40 x 10 plate (Top Plane, extruded up) with a Ø6.6 through hole (ISO 273 medium for M6) in the middle
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const s0 = window.__phlippoStore.getState();
  s0.cancelInsertComponent();
  let sk = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, c[i], c[(i + 1) % 4])[0];
  const plate = K.createDocument('Plaat');
  plate.sketches.sk1 = sk;
  plate.planes.face = { ...K.REFERENCE_PLANE_DEFS.top, id: 'face', name: 'Face', origin: [0, 10, 0], kind: 'face' };
  plate.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'f3', type: 'hole', name: 'Ø6.6 (6.6) Diameter Hole1', suppressed: false, plane: 'face', points: [{ x: 0, y: 0 }], holeType: 'simple', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.4, csDiameter: 12.4, csAngle: 90 },
  ];
  window.__phlippoStore.getState().insertComponent(plate, { atOrigin: true });
});
await settle(page);
let st = await S();
check('assembly with the plate (Ø6.6 hole) as its first, fixed component', st.kind === 'assembly' && st.comps.length === 1 && st.comps[0].fixed && !Object.keys(st.errors).length, JSON.stringify(st));

// Task Pane ▸ Part Library ▸ Standard Parts: not loaded yet, Load now
await page.click('.k-taskpane-btn[data-pane="library"]');
await page.waitForSelector('[data-testid="toolbox-folder"]');
check('Standard Parts folder in the Part Library offers Load now while it is not loaded', (await page.locator('[data-testid="stdparts-load"]').count()) === 1);
await page.click('[data-testid="stdparts-load"]');
await page.waitForSelector('[data-testid="stdparts"]');
const folders = await page.locator('[data-testid="toolbox-type"] optgroup').evaluateAll((g) => g.map((x) => x.label));
check('Standard Parts lists Bolts and Screws, Nuts, Washers, Pins, Retaining Rings and Bearings', JSON.stringify(folders) === JSON.stringify(['Bolts and Screws', 'Nuts', 'Washers', 'Pins', 'Retaining Rings', 'Bearings']), JSON.stringify(folders));
const standards = await page.locator('[data-testid="toolbox-type"] option').evaluateAll((o) => o.map((x) => x.value));
check('13 standards: ISO 4762, 4017, 7380-1, 10642, 4026, 4032, 7040, 7089, 2338, 8752, DIN 471, 472, ISO 15 bearings', standards.length === 13 && ['iso4017', 'iso7380', 'iso10642', 'iso4026', 'iso7040', 'iso2338', 'iso8752', 'din471', 'din472', 'iso15'].every((x) => standards.includes(x)), JSON.stringify(standards));
await page.selectOption('[data-testid="toolbox-type"]', 'iso4762');
await page.selectOption('[data-testid="toolbox-size"]', 'M6');
const lens = await page.locator('[data-testid="toolbox-length"] option').evaluateAll((o) => o.map((x) => Number(x.value)));
check('ISO 4762 M6 offers the lengths of its standard range (10 to 60)', lens[0] === 10 && lens[lens.length - 1] === 60 && lens.includes(20), JSON.stringify(lens));
await page.selectOption('[data-testid="toolbox-length"]', '20');
const dims = await page.locator('[data-testid="stdparts-dims"]').innerText();
check('the dimensions of ISO 4762 M6 x 20 are shown (dk 10, k 6, s 5, t 3)', /ISO 4762 M6 x 20/.test(dims) && /dk = 10\b/.test(dims) && /k = 6\b/.test(dims) && /s = 5\b/.test(dims) && /t = 3\b/.test(dims) && /6\.4 \/ 6\.6 \/ 7/.test(dims), dims);
await page.screenshot({ path: `${OUT}/library-stdparts.png` });

// Insert: the screw follows the pointer, a click in the viewport places it
const vp = await page.locator('.k-viewport').boundingBox();
const insertAt = async (fx, fy) => {
  await page.click('[data-testid="toolbox-insert"]');
  await settle(page);
  await page.mouse.move(vp.x + vp.width * fx, vp.y + vp.height * fy, { steps: 4 });
  await frames(page, 3);
  const g = (await S()).ghost;
  await page.mouse.click(vp.x + vp.width * fx, vp.y + vp.height * fy);
  await settle(page);
  if ((await S()).ghost) await page.evaluate(() => window.__phlippoStore.getState().placeInsertGhost([80, 0, 0]));
  await page.evaluate(() => window.__phlippoStore.getState().cancelInsertComponent());
  await settle(page);
  return g;
};
const ghost = await insertAt(0.7, 0.5);
st = await S();
check('Insert puts the screw on the pointer and a click places it', ghost && st.comps.some((c) => c.name === 'ISO 4762 M6 x 20<1>'), JSON.stringify(st.comps.map((c) => c.name)));
check('the inserted screw rebuilds as a body of the assembly', st.bodies === 2 && !Object.keys(st.errors).length, JSON.stringify({ bodies: st.bodies, errors: st.errors }));
const screw = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const c = s.doc.components.find((x) => x.name === 'ISO 4762 M6 x 20<1>');
  const b = s.rebuild.bodies.find((x) => x.id === c.id);
  b.geometry.computeBoundingBox();
  const bb = b.geometry.boundingBox;
  return { features: c.part.features.map((f) => f.type), ext: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] };
});
check('the screw is a part of sketches and features (revolve, socket cut), head Ø10 and 26 long', JSON.stringify(screw.features) === JSON.stringify(['sketch', 'revolve', 'sketch', 'extrude']) && screw.ext.filter((e) => Math.abs(e - 10) < 0.1).length === 2 && screw.ext.some((e) => Math.abs(e - 26) < 0.01), JSON.stringify(screw));

// a nut and a washer of the same size
await page.selectOption('[data-testid="toolbox-type"]', 'iso4032');
check('a nut has no length', (await page.locator('[data-testid="toolbox-length"]').count()) === 0);
await insertAt(0.75, 0.6);
await page.selectOption('[data-testid="toolbox-type"]', 'iso7089');
await insertAt(0.8, 0.4);
st = await S();
check('ISO 4032 M6 nut and ISO 7089 washer inserted', st.comps.some((c) => c.name === 'ISO 4032 M6<1>') && st.comps.some((c) => c.name === 'ISO 7089 6 - 200 HV<1>') && st.bodies === 4 && !Object.keys(st.errors).length, JSON.stringify({ comps: st.comps.map((c) => c.name), bodies: st.bodies, errors: st.errors }));
await page.screenshot({ path: `${OUT}/library-inserted.png` });

// Auto Fasteners: the Ø6.6 hole takes an M6 screw (ISO 273 medium), 10 + washer + nut + 2 pitches = 18.8 -> 20
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Auto Fasteners")');
await page.waitForSelector('[data-testid="fastener-pm"]');
const pmSizes = await page.locator('[data-testid="fastener-size-0"] option').evaluateAll((o) => o.map((x) => x.value));
check('Auto Fasteners offers the sizes M3 to M24', pmSizes.join() === 'M3,M4,M5,M6,M8,M10,M12,M16,M20,M24', pmSizes.join());
const pm = await page.evaluate(() => ({ size: document.querySelector('[data-testid="fastener-size-0"]')?.value, length: document.querySelector('[data-testid="fastener-length-0"]')?.value, grip: document.querySelector('[data-testid="fastener-grip-0"]')?.textContent, groups: document.querySelectorAll('[data-testid="fastener-groups"] .k-selbox-row').length }));
check('Auto Fasteners chooses M6 for the Ø6.6 hole (ISO 273 medium) and length 20', pm.groups === 1 && pm.size === 'M6' && pm.length === '20' && /ISO 273 medium/.test(pm.grip ?? ''), JSON.stringify(pm));
await page.screenshot({ path: `${OUT}/library-autofasteners.png` });
await page.click('[data-testid="fastener-pm"] .k-pm-ok');
await settle(page);
st = await S();
const added = st.comps.find((c) => c.name === 'ISO 4762 M6 x 20<2>');
check('OK adds the library screw ISO 4762 M6 x 20<2>, concentric and coincident with the hole', !st.fe && added && st.mates.join() === 'concentric,coincident', JSON.stringify({ comps: st.comps.map((c) => c.name), mates: st.mates }));
check('the screw sits in the hole with its head on the top face (y = 10)', added && Math.hypot(added.pos[0], added.pos[2]) < 1e-3 && Math.abs(added.pos[1] - 10) < 1e-3, JSON.stringify(added?.pos));
const span = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const c = s.doc.components.find((x) => x.name === 'ISO 4762 M6 x 20<2>'); const b = s.rebuild.bodies.find((x) => x.id === c?.id); if (!b) return null; b.geometry.computeBoundingBox(); return [b.geometry.boundingBox.min.y, b.geometry.boundingBox.max.y]; });
check('the head stays out of the hole: the screw spans y = -10 .. 16 (shank 20 down, head k = 6 up)', span && Math.abs(span[0] + 10) < 0.01 && Math.abs(span[1] - 16) < 0.01, JSON.stringify(span));
check('the assembly rebuilds without errors (5 bodies)', st.bodies === 5 && !Object.keys(st.errors).length, JSON.stringify({ bodies: st.bodies, errors: st.errors }));
await page.screenshot({ path: `${OUT}/library-fastened.png` });

// the extended library: a hex head screw M16, a lock nut, a dowel pin, a retaining ring and a ball bearing, each a part
// of the standard's size in the assembly
if (!(await page.locator('[data-testid="stdparts"]').count())) await page.click('.k-taskpane-btn[data-pane="library"]');
await page.waitForSelector('[data-testid="stdparts"]');
const pick = async (std, size, length) => {
  await page.selectOption('[data-testid="toolbox-type"]', std);
  await page.selectOption('[data-testid="toolbox-size"]', size);
  if (length !== undefined) await page.selectOption('[data-testid="toolbox-length"]', String(length));
  await frames(page);
  return page.locator('[data-testid="stdparts-dims"]').innerText();
};
let txt = await pick('iso4017', 'M16', 60);
check('ISO 4017 M16 x 60: s 24, k 10, lengths 30 to 150', /ISO 4017 M16 x 60/.test(txt) && /s = 24\b/.test(txt) && /k = 10\b/.test(txt) && /17 \/ 17\.5 \/ 18\.5/.test(txt), txt);
const l4017 = await page.locator('[data-testid="toolbox-length"] option').evaluateAll((o) => o.map((x) => Number(x.value)));
check('ISO 4017 M16 offers its lengths 30 to 150', l4017[0] === 30 && l4017.at(-1) === 150, JSON.stringify(l4017));
await insertAt(0.62, 0.35);
await pick('iso7040', 'M10');
await insertAt(0.66, 0.7);
await pick('iso2338', '6', 20);
await insertAt(0.72, 0.3);
await pick('din471', '20');
await insertAt(0.78, 0.66);
txt = await pick('iso15', '6204');
check('Ball Bearing 6204: d 20, D 47, B 14 (ISO 15)', /Ball Bearing 6204/.test(txt) && /d = 20\b/.test(txt) && /D = 47\b/.test(txt) && /B = 14\b/.test(txt), txt);
await page.screenshot({ path: `${OUT}/standaard-1-bearing-dims.png` });
await insertAt(0.84, 0.45);
await page.keyboard.press('f');
await settle(page, { quiet: 300 });
st = await S();
const want = ['ISO 4017 M16 x 60<1>', 'ISO 7040 M10<1>', 'ISO 2338 6 m6 x 20<1>', 'DIN 471 20 x 1.2<1>', 'Ball Bearing 6204<1>'];
check('the new library parts are components with their designation as name (BOM)', want.every((n) => st.comps.some((c) => c.name === n)), JSON.stringify(st.comps.map((c) => c.name)));
check('the assembly rebuilds without errors (10 bodies)', st.bodies === 10 && !Object.keys(st.errors).length, JSON.stringify({ bodies: st.bodies, errors: st.errors }));
const ext = await page.evaluate((names) => {
  const s = window.__phlippoStore.getState();
  return Object.fromEntries(names.map((n) => {
    const c = s.doc.components.find((x) => x.name === n);
    const b = c && s.rebuild.bodies.find((x) => x.id === c.id);
    if (!b) return [n, null];
    b.geometry.computeBoundingBox();
    const bb = b.geometry.boundingBox;
    return [n, [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((v) => Math.round(v * 100) / 100).sort((p, q) => p - q)];
  }));
}, want);
const near = (a, b, tol = 0.05) => a && b.every((v, i) => Math.abs(a[i] - v) <= tol);
check('the bearing is 47 x 47 x 14, the pin 6 x 6 x 20, the hex screw 70 long (k 10 + l 60)', near(ext['Ball Bearing 6204<1>'], [14, 47, 47], 0.3) && near(ext['ISO 2338 6 m6 x 20<1>'], [6, 6, 20], 0.1) && Math.abs((ext['ISO 4017 M16 x 60<1>'] ?? [0, 0, 0])[2] - 70) < 0.01, JSON.stringify(ext));
await page.screenshot({ path: `${OUT}/standaard-2-assembly.png` });

// Open: the part opens as a part document of its own (after the question to save the assembly)
await page.click('.k-taskpane-btn[data-pane="library"]').catch(() => {});
if (!(await page.locator('[data-testid="stdparts"]').count())) await page.click('.k-taskpane-btn[data-pane="library"]');
await page.selectOption('[data-testid="toolbox-type"]', 'iso4032');
await page.selectOption('[data-testid="toolbox-size"]', 'M8');
await page.click('[data-testid="toolbox-folder"] button:has-text("Open")');
await dontSave(page, 1000);
await settle(page);
const opened = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { name: s.doc.name, kind: s.doc.kind, bodies: s.rebuild.bodies.length, errors: s.rebuild.errors, tree: s.doc.features.map((f) => f.name) }; });
check('Open makes ISO 4032 M8 a part of its own (hexagon, chamfer revolve cut)', opened.name === 'ISO 4032 M8' && opened.kind !== 'assembly' && opened.bodies === 1 && !Object.keys(opened.errors).length && opened.tree.includes('Cut-Revolve1'), JSON.stringify(opened));
// a bearing and a button head screw opened as parts of their own (the 6204 section, the domed head)
for (const [std, size, length, name, shotName] of [['iso15', '6204', undefined, 'Ball Bearing 6204', 'standaard-3-bearing-part'], ['iso7380', 'M8', 20, 'ISO 7380-1 M8 x 20', 'standaard-4-button-head']]) {
  if (!(await page.locator('[data-testid="stdparts"]').count())) await page.click('.k-taskpane-btn[data-pane="library"]');
  await pick(std, size, length);
  await page.click('[data-testid="toolbox-folder"] button:has-text("Open")');
  await dontSave(page, 1000);
  await settle(page, { quiet: 300 });
  const o = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { name: s.doc.name, bodies: s.rebuild.bodies.length, errors: s.rebuild.errors }; });
  check(`Open makes ${name} a part of its own`, o.name === name && o.bodies === 1 && !Object.keys(o.errors).length, JSON.stringify(o));
  await page.screenshot({ path: `${OUT}/${shotName}.png` });
}

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
