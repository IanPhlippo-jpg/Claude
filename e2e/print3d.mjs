// 3D Print tab (docs/33, docs/34, docs/35): the calibration cube and the door handle lever on the plate, slice, layer
// preview in several colour modes, export for a Bambu Lab P1S (.gcode.3mf, after confirming the assumptions) and an
// Elegoo Neptune 4 Pro (.gcode), a part outside the volume refused, OK / Cancel / Esc, the plate saved in the document,
// the tab with an assembly, and no tab on a drawing.
// node e2e/print3d.mjs   (E2E_URL: a build with VITE_TEST_HOOKS=1; PRINT_SHOTS: folder for the screenshots)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { checks, exitCode } from './lib/check.mjs';
import { settle, frames } from './lib/wait.mjs';

const { results, check } = checks();
const OUT = process.env.PRINT_SHOTS ?? process.env.E2E_OUT ?? 'e2e-out';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
// the pointer goes off the buttons first, so no tooltip of a button that just changed covers the picture
const shot = async (n) => { await page.mouse.move(1100, 1040); await frames(page, 2); await page.screenshot({ path: `${OUT}/${n}.png` }); };
const big = (label) => page.locator(`.k-cm-big:has(.k-cm-label:text-is("${label}")) .k-cm-main`);
const open = async (file) => {
  await page.setInputFiles('#phlippo-open-file', { name: file.split('/').pop(), mimeType: 'application/json', buffer: readFileSync(file) });
  // the open document has unsaved changes (the plate): Don't Save
  const no = page.locator('[data-testid="ask-no"]');
  if (await no.isVisible({ timeout: 4000 }).catch(() => false)) await no.click();
  const want = file.split('/').pop().replace(/\.kcad$/, '');
  await page.waitForFunction((n) => window.__phlippoStore.getState().doc.name === n, want, { timeout: 30000 }).catch(async () => { await shot('debug-open'); });
  await settle(page);
};
const toTab = async () => {
  await page.click('.k-cm-tab:has-text("3D Print")');
  await page.locator('[data-testid="print-tab-settings"]').click({ timeout: 20000 }).catch(() => undefined);
  try { await page.waitForSelector('[data-testid="print-pm"] [data-testid="print-printer"]', { timeout: 20000 }); } catch (e) { await shot('debug-totab'); throw e; }
};
const sliced = () => page.waitForSelector('[data-testid="print-summary"]', { timeout: 180000 });
const exportFile = async () => {
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await big('Export').click();
  // the printer data rests on assumptions: confirm
  const ask = page.locator('[data-testid="ask-yes"]');
  if (await ask.isVisible({ timeout: 3000 }).catch(() => false)) await ask.click();
  const f = await dl;
  const path = `${OUT}/${f.suggestedFilename()}`;
  await f.saveAs(path);
  return { name: f.suggestedFilename(), bytes: readFileSync(path) };
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await settle(page);

// --- the calibration cube (T1): a 20 mm box built with the app's own model
await page.evaluate(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }];
  for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0];
  const d = K.createDocument('Kalibratiekubus');
  d.sketches.s1 = s;
  d.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false });
  st.openDocument(d);
});
await settle(page);
const tabs = await page.locator('.k-cm-tab').allTextContents();
check('the 3D Print tab sits after Evaluate for a part', tabs.indexOf('3D Print') === tabs.indexOf('Evaluate') + 1, tabs.join(' | '));
await toTab();
check('the Property Panel and the plate view show', (await page.locator('[data-testid="print-view"] canvas').count()) === 1);
check('the printer list holds the FDM printers of the database', (await page.locator('[data-testid="print-printer"] option').count()) >= 4);
await page.selectOption('[data-testid="print-printer"]', 'bambu-p1s');
await frames(page, 4);
await shot('01-tab-pm-empty-plate');
await big('Add to Plate').click();
await frames(page, 6);
check('Add to Plate puts the cube on the plate', (await page.locator('.k-print-part').count()) === 1);
await shot('02-plate-cube');
await big('Slice Plate').click();
await sliced();
await frames(page, 6);
const cubeSummary = await page.locator('[data-testid="print-summary"]').innerText();
check('the cube slices into 100 layers with time and grams', /Layers\s*100/.test(cubeSummary) && /\d+(\.\d)? g/.test(cubeSummary), cubeSummary.replace(/\s+/g, ' '));
await shot('03-cube-preview-type');
const cmax = Number(await page.locator('[data-testid="print-layer-top"]').getAttribute('max'));
await page.locator('[data-testid="print-layer-top"]').fill(String(Math.round(cmax / 2)));
await frames(page, 4);
await shot('04-cube-half');
await page.selectOption('[data-testid="print-colorby"]', 'height');
await frames(page, 4);
await shot('05-cube-layer-height');
await page.selectOption('[data-testid="print-colorby"]', 'type');
await page.locator('[data-testid="print-layer-top"]').fill(String(cmax));
const cubeFile = await exportFile();
check('Export writes a .gcode.3mf (a ZIP) after confirming the assumptions', /\.gcode\.3mf$/.test(cubeFile.name) && cubeFile.bytes[0] === 0x50 && cubeFile.bytes[1] === 0x4b, cubeFile.name);
await frames(page, 4);
await shot('06-export');
// the plate is in the document (file format 4)
const stored = await page.evaluate(() => window.__phlippoStore.getState().doc.print3d?.plates?.[0]?.items?.length ?? 0);
check('the plate is stored in the document', stored === 1, String(stored));

// --- Cancel / Esc go back to the state when the tab opened; OK keeps
await page.click('[data-testid="print-ok"]');
await frames(page, 4);
check('OK closes the tab and keeps the plate', (await page.locator('[data-testid="print-view"]').count()) === 0
  && await page.evaluate(() => window.__phlippoStore.getState().doc.print3d?.plates?.[0]?.items?.length) === 1);
await toTab();
await page.click('[data-testid="print-tab-settings"]');
await big('Add to Plate').click();
await frames(page, 4);
check('a second part on the plate', (await page.locator('.k-print-part').count()) === 2);
await page.locator('.k-viewport, [data-testid="print-view"]').first().click({ position: { x: 5, y: 5 } }).catch(() => undefined);
await page.keyboard.press('Escape');
await frames(page, 6);
check('Esc cancels: back to one part and out of the tab', (await page.locator('[data-testid="print-view"]').count()) === 0
  && await page.evaluate(() => window.__phlippoStore.getState().doc.print3d?.plates?.[0]?.items?.length) === 1);

// --- the door handle lever (T12) with support
await open('voorbeelden/deurkruk/Kruk.kcad');
await toTab();
await page.selectOption('[data-testid="print-printer"]', 'bambu-p1s');
await big('Add to Plate').click();
await frames(page, 6);
check('Add to Plate puts the lever on the plate', (await page.locator('.k-print-part').count()) === 1);
check('the lever fits the P1S', (await page.locator('.k-print-out').count()) === 0);
await page.locator('.k-cm-small:has-text("Auto Orient")').click();
await frames(page, 6);
await shot('07-plate-lever');
await page.selectOption('[data-testid="print-support"]', 'normal');
await big('Slice Plate').click();
await sliced();
await frames(page, 6);
const summary = await page.locator('[data-testid="print-summary"]').innerText();
check('the preview shows time, layers and grams', /Total time/.test(summary) && /Layers/.test(summary) && /\d+(\.\d)? g/.test(summary), summary.replace(/\s+/g, ' '));
check('the legend shows in the graphics area', (await page.locator('[data-testid="print-legend"]').count()) === 1);
await shot('08-lever-preview-legend');
const max = Number(await page.locator('[data-testid="print-layer-top"]').getAttribute('max'));
await page.locator('[data-testid="print-layer-top"]').fill(String(Math.round(max / 2)));
await frames(page, 4);
await shot('09-lever-half');
await page.locator('[data-testid="print-move-slider"]').fill('40');
await frames(page, 4);
await shot('10-lever-moves');
await page.selectOption('[data-testid="print-colorby"]', 'speed');
await page.locator('[data-testid="print-layer-top"]').fill(String(max));
await frames(page, 6);
await shot('11-lever-speed');
await page.selectOption('[data-testid="print-colorby"]', 'type');
await page.click('[data-testid="legend-support"]');
await frames(page, 4);
await shot('12-lever-support-hidden');
await page.click('[data-testid="legend-support"]');
const leverFile = await exportFile();
check('Export of the lever: a .gcode.3mf', /\.gcode\.3mf$/.test(leverFile.name), leverFile.name);

// multi-colour on the P1S needs the imported filament-change code
await page.click('[data-testid="print-tab-settings"]');
await page.click('[data-testid="print-add-slot"]');
await frames(page, 2);
check('a P1S takes a second filament (AMS)', (await page.locator('[data-testid="print-slot-1"]').count()) === 1);
await shot('13-settings-ams-slots');
await page.selectOption('[data-testid="print-pattern"]', 'gyroid');
await frames(page, 2);
check('a changed setting greys out Export (stale slice)', await page.locator('.k-cm-big:has(.k-cm-label:text-is("Export"))').evaluate((e) => e.classList.contains('disabled')));

// Elegoo Neptune 4 Pro: Klipper .gcode
await page.selectOption('[data-testid="print-printer"]', 'elegoo-neptune-4-pro');
await frames(page, 4);
await big('Slice Plate').click();
await sliced();
const ne = await exportFile();
const g2 = ne.bytes.toString('utf8');
check('Export for the Neptune 4 Pro writes Klipper G-code with thumbnails and levelling', /\.gcode$/.test(ne.name) && g2.includes(';LAYER_CHANGE') && g2.includes(';gimage:') && g2.includes('BED_MESH_PROFILE'), ne.name);
check('no move to Z0 or the origin in the file', !/G[01] X0 Y0 Z0/.test(g2));
await page.click('[data-testid="print-tab-preview"]');
await frames(page, 6);
await shot('14-neptune-preview');

// a part outside the volume: red, and slicing refused
await page.click('[data-testid="print-tab-settings"]');
await page.locator('.k-print-part').first().click();
await page.locator('.k-cm-small:has-text("Scale")').click();
await page.locator('.k-dialog input').fill('400');
await page.locator('.k-dialog button:has-text("OK")').click();
await frames(page, 6);
check('a part too large for the bed is marked outside', (await page.locator('.k-print-out').count()) === 1);
await shot('15-outside-red');
await big('Slice Plate').click();
await frames(page, 6);
const status = await page.locator('.k-statusbar').innerText();
check('slicing a part outside the bed is refused', /outside the bed|prints up to/.test(status), status.slice(0, 160));
check('the status bar says Editing Plate', /Editing Plate/.test(status));

// --- an assembly: the tab is there, the components go on the plate
await page.click('[data-testid="print-cancel"]');
await open('voorbeelden/deurkruk/Deurkruk.kcad');
const atabs = await page.locator('.k-cm-tab').allTextContents();
check('the 3D Print tab is there for an assembly', atabs.includes('3D Print'), atabs.join(' | '));
await toTab();
await page.selectOption('[data-testid="print-printer"]', 'bambu-p1s');
await big('Add to Plate').click();
await frames(page, 8);
const comps = await page.locator('.k-print-part').count();
check('Add to Plate puts the components of the assembly on the plate(s)', comps >= 3, String(comps));
await shot('16-assembly-plate');
await page.click('[data-testid="print-ok"]');

// --- a drawing: no 3D Print tab
await open('voorbeelden/deurkruk/Kruk-tekening.kcad');
const dtabs = await page.locator('.k-cm-tab').allTextContents();
check('a drawing has no 3D Print tab', !dtabs.includes('3D Print'), dtabs.join(' | '));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.info ? ` (${r.info})` : ''}`);
process.exit(exitCode(results, errors));
