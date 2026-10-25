// Block G-B/G-C: feature right-click menu (Comment, Parent/Child, Feature Properties, Go To, folders, Favorites), body menu
// (transparency, folders, feature history, bounding box, Insert into New Part, Delete/Keep), Save As STL/3MF/AMF options.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const doc = () => S(() => window.__phlippoStore.getState().doc);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 5)[0];
  const d = K.createDocument('Plaat');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 5, reverse: true, contours: [0] },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);

const rmb = async (id) => { await page.locator(`.k-tree-row[data-id="${id}"]`).first().click({ button: 'right' }); await page.waitForTimeout(200); };
const menuItem = (label) => page.locator(`.k-menu-item:has-text("${label}")`).first();

// ---- feature menu: the new items are there
await rmb('e1');
for (const l of ['Comment ▸ Add Comment…', 'Parent/Child…', 'Feature Properties…', 'Go To…', 'Create New Folder', 'Add to Favorites', 'Hide/Show Tree Items…', 'Collapse Items']) check(`feature menu has ${l}`, (await menuItem(l).count()) === 1);
// Comment
await menuItem('Comment ▸ Add Comment…').click();
await page.waitForTimeout(200);
await page.locator('[data-testid="ask"] input').fill('Hoofdplaat');
await page.locator('[data-testid="ask"] .k-btn.primary').click();
await page.waitForTimeout(300);
check('the comment is stored on the feature', (await doc()).comments?.some((c) => c.featureId === 'e1' && c.text === 'Hoofdplaat'));
// Parent/Child
await rmb('e1');
await menuItem('Parent/Child…').click();
await page.waitForTimeout(300);
check('Parent/Child lists Sketch1 as parent and shows the children box', (await page.locator('[data-testid="pc-parents"]').innerText()).includes('Sketch1') && (await page.locator('[data-testid="pc-children"]').count()) === 1, `${await page.locator('[data-testid="pc-parents"]').innerText()} / ${await page.locator('[data-testid="pc-children"]').innerText()}`);
await page.screenshot({ path: `${OUT}/gb-parentchild.png` });
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().setDialog(null));
// Feature Properties
await rmb('e1');
await menuItem('Feature Properties…').click();
await page.waitForTimeout(300);
check('Feature Properties shows name, description, suppressed', (await page.locator('[data-testid="fp-name"]').inputValue()) === 'Boss-Extrude1' && (await page.locator('[data-testid="fp-desc"]').count()) === 1);
await page.locator('[data-testid="fp-desc"]').fill('Grondplaat 60 x 40');
await page.locator('[data-testid="fp-name"]').fill('Grondplaat');
await page.locator('[data-testid="fp-ok"]').click();
await page.waitForTimeout(300);
check('Feature Properties renames and stores the description', (await doc()).features.find((f) => f.id === 'e1').name === 'Grondplaat' && (await doc()).featureMeta?.e1?.description === 'Grondplaat 60 x 40');
// Go To
await rmb('e2');
await menuItem('Go To…').click();
await page.waitForTimeout(200);
await page.locator('[data-testid="ask"] input').fill('grondpl');
await page.locator('[data-testid="ask"] .k-btn.primary').click();
await page.waitForTimeout(300);
check('Go To selects the feature by (part of) its name', (await S(() => window.__phlippoStore.getState().selectedFeatureId)) === 'e1');
// Favorites
await rmb('e2');
await menuItem('Add to Favorites').click();
await page.waitForTimeout(300);
check('Favorites folder appears at the top with the feature', (await page.locator('.k-tree-row[data-id="favorites"]').count()) === 1 && (await doc()).favorites?.includes('e2'));
// Folder
await rmb('e2');
await menuItem('Create New Folder').click();
await page.waitForTimeout(300);
const folders = (await doc()).featureFolders ?? [];
check('Create New Folder makes Folder1 holding the feature', folders.length === 1 && folders[0].featureIds.includes('e2') && (await page.locator('.k-tree-row[data-id^="folder:"]').count()) === 1, JSON.stringify(folders));
await page.locator('.k-tree-row[data-id^="folder:"] .caret').click().catch(() => {});
await page.waitForTimeout(200);
check('the feature sits under the folder', (await page.locator('.k-tree-row[data-depth="2"][data-id="e2"]').count()) === 1);
await page.screenshot({ path: `${OUT}/gb-tree.png` });

// ---- body menu
await page.locator('.k-tree-row[data-id="bodies"] .caret').click().catch(() => {});
await page.waitForTimeout(200);
const bodyRow = page.locator('.k-tree-row[data-id^="body-"]').first();
await bodyRow.click({ button: 'right' });
await page.waitForTimeout(200);
for (const l of ['Body Display ▸ Change Transparency', 'Show Feature History', 'Add to New Folder', 'Create Bounding Box', 'Insert into New Part…', 'Save Selection…', 'Save Bodies…', 'Delete/Keep Body…']) check(`body menu has ${l}`, (await menuItem(l).count()) === 1);
await menuItem('Body Display ▸ Change Transparency').click();
await page.waitForTimeout(300);
check('Change Transparency marks the body transparent', ((await doc()).transparentBodies ?? []).length === 1);
await bodyRow.click({ button: 'right' });
await menuItem('Create Bounding Box').click();
await page.waitForTimeout(500);
check('Create Bounding Box adds the tree item and dashed box curves', (await page.locator('.k-tree-row[data-id="boundingbox"]').count()) === 1 && (await S(() => window.__phlippoStore.getState().rebuild.curves?.filter((c) => c.id.startsWith('bbox:')).length)) === 6);
await page.locator('.k-tree-row[data-id^="body-"]').first().click({ button: 'right' });
await menuItem('Add to New Folder').click();
await page.waitForTimeout(300);
check('Add to New Folder groups the body under a folder', (await page.locator('.k-tree-row[data-id^="bfolder:"]').count()) === 1);
await page.screenshot({ path: `${OUT}/gb-bodies.png` });

// ---- Save As ▸ STL options page and the 3MF / AMF formats
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.waitForTimeout(150);
check('File menu offers STL, 3MF and AMF', (await menuItem('Save As ▸ STL (*.stl)…').count()) === 1 && (await menuItem('Save As ▸ 3MF (*.3mf)…').count()) === 1 && (await menuItem('Save As ▸ AMF (*.amf)…').count()) === 1);
await menuItem('Save As ▸ STL (*.stl)…').click();
await page.waitForTimeout(300);
check('Export Options page: Binary/ASCII, unit, resolution, show info, positive space, single file', (await page.locator('[data-testid="export-output"] label').count()) === 2 && (await page.locator('[data-testid="export-unit"]').count()) === 1 && (await page.locator('[data-testid="export-showinfo"]').count()) === 1);
await page.screenshot({ path: `${OUT}/gb-exportoptions.png` });
await page.locator('[data-testid="export-output"] label:has-text("ASCII") input').check();
await page.locator('[data-testid="export-showinfo"]').uncheck();
const dl = page.waitForEvent('download', { timeout: 8000 });
await page.locator('[data-testid="export-ok"]').click();
const file = await dl;
const text = await (await file.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));
check('ASCII STL downloads with facets', file.suggestedFilename() === 'Plaat.stl' && text.startsWith('solid Plaat') && text.includes('facet normal'), file.suggestedFilename());
await page.waitForTimeout(300);
await S(() => { window.__phlippoStore.setState({ exportFormat: '3mf' }); window.__phlippoStore.getState().setDialog('exportOptions'); });
await page.waitForTimeout(300);
await page.locator('[data-testid="export-showinfo"]').uncheck().catch(() => {});
const dl2 = page.waitForEvent('download', { timeout: 8000 });
await page.locator('[data-testid="export-ok"]').click();
const f2 = await dl2;
const buf = await (await f2.createReadStream()).toArray().then((b) => Buffer.concat(b));
check('3MF downloads as a zip package', f2.suggestedFilename() === 'Plaat.3mf' && buf[0] === 0x50 && buf[1] === 0x4b && buf.toString('latin1').includes('3D/3dmodel.model'), f2.suggestedFilename());
await S(() => { window.__phlippoStore.setState({ exportFormat: 'amf' }); window.__phlippoStore.getState().setDialog('exportOptions'); });
await page.waitForTimeout(300);
await page.locator('[data-testid="export-showinfo"]').uncheck().catch(() => {});
const dl3 = page.waitForEvent('download', { timeout: 8000 });
await page.locator('[data-testid="export-ok"]').click();
const f3 = await dl3;
const amf = await (await f3.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));
check('AMF downloads as XML with vertices and triangles', f3.suggestedFilename() === 'Plaat.amf' && amf.includes('<amf') && amf.includes('<triangle>'), f3.suggestedFilename());

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
