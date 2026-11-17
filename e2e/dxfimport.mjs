// docs/32 item 5 (exchange): File ▸ Open of a .dxf through the real file input opens a new part with the drawing as
// Sketch1 on the Front Plane; the closed outline with its rounded corners (polyline bulges) and two holes extrudes to
// one body. Insert ▸ DXF/DWG… adds a drawing in inches to an open sketch (converted to mm); a .dwg is refused with
// the advice to save it as DXF.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track, dontSave } from './lib/check.mjs';
import { settle } from './lib/wait.mjs';
import { menuPath } from './lib/menu.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

/** a DXF file (R2013) from group code / value pairs */
const dxf = (units, entities) => [0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1027', 9, '$INSUNITS', 70, units, 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES', ...entities.flat(), 0, 'ENDSEC', 0, 'EOF'].join('\r\n') + '\r\n';
const b = Math.tan(Math.PI / 8); // a 90° arc
// 120 x 80 with R10 corners (one LWPOLYLINE, the corners as bulges), two D20 holes and a text that has no sketch counterpart
const plate = dxf(4, [
  [0, 'LWPOLYLINE', 8, '0', 90, 8, 70, 1, 10, 10, 20, 0, 10, 110, 20, 0, 42, b, 10, 120, 20, 10, 10, 120, 20, 70, 42, b, 10, 110, 20, 80, 10, 10, 20, 80, 42, b, 10, 0, 20, 70, 10, 0, 20, 10, 42, b],
  [0, 'CIRCLE', 8, '0', 10, 30, 20, 40, 30, 0, 40, 10],
  [0, 'CIRCLE', 8, '0', 10, 90, 20, 40, 30, 0, 40, 10],
  [0, 'TEXT', 8, '0', 10, 0, 20, -10, 30, 0, 40, 5, 1, 'PLAAT'],
]);
const area = 120 * 80 - 4 * (100 - 25 * Math.PI) - 2 * Math.PI * 100;

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
await settle(page);

// ---- File ▸ Open of plaat.dxf through the file input
check('File ▸ Open accepts .dxf and .dwg', /\.dxf/.test(await page.locator('#phlippo-open-file').getAttribute('accept')) && /\.dwg/.test(await page.locator('#phlippo-open-file').getAttribute('accept')));
await page.setInputFiles('#phlippo-open-file', { name: 'plaat.dxf', mimeType: 'application/dxf', buffer: Buffer.from(plate) });
await dontSave(page);
await page.waitForFunction(() => Object.values(window.__phlippoStore.getState().doc.sketches).some((k) => k.entityOrder.length > 0), null, { timeout: 30000 });
await settle(page);
const opened = await S(() => {
  const s = window.__phlippoStore.getState();
  const k = Object.values(s.doc.sketches)[0];
  const kinds = {};
  for (const id of k.entityOrder) kinds[k.entities[id].kind] = (kinds[k.entities[id].kind] ?? 0) + 1;
  return { name: s.doc.name, plane: k.plane, sketchName: k.name, kinds, active: s.activeSketchId, selected: s.selectedFeatureId, features: s.doc.features.map((f) => f.type), messages: s.messages.map((m) => m.text) };
});
check('plaat.dxf opens as a new part "plaat" with Sketch1 on the Front Plane', opened.name === 'plaat' && opened.plane === 'front' && opened.sketchName === 'Sketch1' && opened.features.join() === 'sketch', JSON.stringify(opened).slice(0, 200));
check('the outline is 4 lines and 4 arcs (bulges), the holes 2 circles', opened.kinds.line === 4 && opened.kinds.arc === 4 && opened.kinds.circle === 2, JSON.stringify(opened.kinds));
check('the sketch is closed and selected, ready for Extruded Boss/Base', opened.active === null && !!opened.selected);
check('the messages name what came in and what was left out (1 TEXT)', opened.messages.some((m) => /plaat\.dxf opened as Sketch1/.test(m) && /4 lines, 4 arcs, 2 circles/.test(m)) && opened.messages.some((m) => /1 TEXT/.test(m)), opened.messages.join(' | '));
await shot('uitwisseling-dxf-open');

// ---- Extruded Boss/Base of the imported sketch: one body with two holes
await S(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await settle(page);
await S(() => window.__phlippoStore.getState().commitFeature());
await settle(page);
const ext = await S(() => {
  const s = window.__phlippoStore.getState();
  const f = s.doc.features.find((x) => x.type === 'extrude');
  const vol = s.rebuild.bodies.map((bd) => { const g = bd.geometry.index ? bd.geometry.toNonIndexed() : bd.geometry; const a = g.getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return Math.abs(v); });
  return { depth: f?.depth, bodies: s.rebuild.bodies.length, vol, errors: s.rebuild.errors };
});
check('the imported sketch extrudes to one body without errors', ext.bodies === 1 && !Object.keys(ext.errors).length, JSON.stringify(ext));
check('its volume is the area of the outline minus the holes times the depth (within 0.5 %)', ext.depth > 0 && Math.abs(ext.vol[0] - area * ext.depth) / (area * ext.depth) < 0.005, `${ext.vol[0]} vs ${area * ext.depth}`);
await page.keyboard.press('Control+7');
await settle(page);
await shot('uitwisseling-dxf-extrude');

// ---- a DWG file: refused with the advice to save it as DXF; the open part stays
await page.setInputFiles('#phlippo-open-file', { name: 'tekening.dwg', mimeType: 'application/acad', buffer: Buffer.from('AC1032\0\0\0\0\0\0') });
await page.waitForFunction(() => window.__phlippoStore.getState().messages.some((m) => /tekening\.dwg is a DWG file/.test(m.text)), null, { timeout: 30000 });
const dwg = await S(() => ({ name: window.__phlippoStore.getState().doc.name, msg: window.__phlippoStore.getState().messages.map((m) => m.text).find((m) => /DWG/.test(m)) }));
check('a .dwg is refused: closed format, save it as DXF; the part stays open', dwg.name === 'plaat' && /closed format/.test(dwg.msg) && /save it as DXF/.test(dwg.msg), JSON.stringify(dwg));
await shot('uitwisseling-dwg-message');

// ---- Insert ▸ DXF/DWG… into an open sketch: a 1 x 0.5 inch slot outline (lines + arcs) comes in as mm
// (in a new part: a sketch on the Front Plane of the plate would lie behind the body)
await S(() => { window.__phlippoStore.getState().newDocument('part'); window.__phlippoStore.getState().newSketch('front'); });
await settle(page);
const slot = dxf(1, [
  [0, 'LINE', 8, '0', 10, 2.5, 20, 1, 30, 0, 11, 3.5, 21, 1, 31, 0],
  [0, 'ARC', 8, '0', 10, 3.5, 20, 1.25, 30, 0, 40, 0.25, 50, 270, 51, 90],
  [0, 'LINE', 8, '0', 10, 3.5, 20, 1.5, 30, 0, 11, 2.5, 21, 1.5, 31, 0],
  [0, 'ARC', 8, '0', 10, 2.5, 20, 1.25, 30, 0, 40, 0.25, 50, 90, 51, 270],
]);
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Insert")');
const item = menuPath(page, 'DXF/DWG…');
check('Insert offers DXF/DWG… while a sketch is open', (await item.count()) === 1);
const chooser = page.waitForEvent('filechooser');
await item.click();
await (await chooser).setFiles({ name: 'sleuf.dxf', mimeType: 'application/dxf', buffer: Buffer.from(slot) });
await page.waitForFunction(() => { const s = window.__phlippoStore.getState(); return (s.doc.sketches[s.activeSketchId]?.entityOrder.length ?? 0) > 0; }, null, { timeout: 30000 });
await settle(page);
const ins = await S(() => {
  const s = window.__phlippoStore.getState();
  const k = s.doc.sketches[s.activeSketchId];
  const xs = Object.keys(k.points).filter((id) => !id.startsWith('origin')).map((id) => k.points[id].x);
  return { n: k.entityOrder.length, min: Math.min(...xs), max: Math.max(...xs), msg: s.messages.map((m) => m.text) };
});
check('sleuf.dxf goes into the open sketch: 2 lines and 2 arcs, inches converted to mm', ins.n === 4 && Math.abs(ins.min - 2.5 * 25.4) < 1e-6 && Math.abs(ins.max - 3.5 * 25.4) < 1e-6 && ins.msg.some((m) => /inserted into Sketch1/.test(m) && /in converted to mm/.test(m)), JSON.stringify(ins).slice(0, 240));
await page.mouse.move(1000, 1000);
await settle(page);
await shot('uitwisseling-dxf-insert');
await S(() => window.__phlippoStore.getState().exitSketch());
await settle(page);

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
