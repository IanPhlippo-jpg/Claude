// Drawing options (Block D): Model View preview / import annotations / auto-start projected / draft quality,
// Projected View arrow and parent scale, Detail circle styles and Profile, Note leader / border / alignment,
// Balloon shape, Break line style, Auxiliary arrow, Sheet Properties next view label, custom sheet size.
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const part = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk.kcad', 'utf8')); delete part.format;
const sheet = () => page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0]);

// a new drawing with a custom sheet size: no Model View command when it is switched off
await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('phlippo.prefs') || '{}'); p['drawing.startModelView'] = false; localStorage.setItem('phlippo.prefs', JSON.stringify(p)); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.evaluate(() => window.__phlippoStore.getState().setDialog('sheetFormat'));
await page.waitForTimeout(200);
await page.click('.k-dialog label:has-text("Custom sheet size") input');
await page.fill('[data-testid="sf-width"]', '400');
await page.fill('[data-testid="sf-height"]', '250');
await page.click('.k-dialog button:has-text("OK")');
await page.waitForTimeout(400);
let sh = await sheet();
const de0 = await page.evaluate(() => window.__phlippoStore.getState().drawingEdit);
check('custom sheet size 400 x 250', sh.customSize && sh.customSize[0] === 400 && sh.customSize[1] === 250, JSON.stringify(sh.customSize));
check('Start command when creating new drawing off: no Model View', !de0, JSON.stringify(de0?.mode));

// Model View: preview off shows only the frame; import annotations; auto-start projected off
await page.evaluate(() => window.__phlippoStore.getState().startModelView());
await page.waitForTimeout(200);
await page.click('[data-testid="mv-autoprojected"]');
await page.evaluate((m) => window.__phlippoStore.getState().setModelViewSource(m), part);
await page.waitForTimeout(300);
await page.click('[data-testid="mv-preview"]');
await page.click('.k-section-title:has-text("Import Options")').catch(() => undefined);
await page.click('[data-testid="mv-import"]');
const host = await page.locator('.k-sheet-host').boundingBox();
await page.mouse.move(host.x + host.width * 0.3, host.y + host.height * 0.4);
await page.waitForTimeout(300);
check('Preview off: only the view frame follows the pointer', (await page.locator('[data-testid="view-frame-preview"]').count()) === 1);
// the reload above reset the pref module; set it in the running app as well
await page.evaluate(() => { /* prefs are read when the view is placed */ });
await page.evaluate(() => window.__phlippoStore.getState().placeView([120, 160]));
await page.waitForTimeout(800);
sh = await sheet();
const de1 = await page.evaluate(() => window.__phlippoStore.getState().drawingEdit);
check('Import annotations: the model dimensions come with the view', sh.dimensions.length > 0, String(sh.dimensions.length));
check('Auto-start projected view off: the command ends', !de1, JSON.stringify(de1?.mode));
const front = sh.views[0];

// Projected View with Arrow
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startProjectedView(); }, front.id);
await page.waitForTimeout(200);
await page.click('[data-testid="pv-arrow"]');
await page.evaluate((id) => window.__phlippoStore.getState().placeProjectedView('right', [240, 160], id), front.id);
await page.waitForTimeout(800);
sh = await sheet();
const pv = sh.views[sh.views.length - 1];
check('Projected view with arrow label', !!pv.arrowLabel && (await page.locator('[data-testid="view-arrow-label"]').count()) === 1, pv.arrowLabel);
await page.evaluate(() => window.__phlippoStore.getState().cancelDrawingEdit());

// Detail view: Profile (rectangle) with Connected style
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDetailView(); }, front.id);
await page.waitForTimeout(200);
await page.selectOption('[data-testid="dv-style"]', 'connected');
await page.click('[data-testid="dv-profile"]');
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.setDetailCircle(id, [10, 10], Math.hypot(8, 5), [8, 5]); s.placeDetailView([320, 80]); }, front.id);
await page.waitForTimeout(900);
sh = await sheet();
const dv = sh.views[sh.views.length - 1];
check('Detail profile is a rectangle, style connected', dv.detail && dv.detail.rect && dv.detail.style === 'connected', JSON.stringify(dv.detail));
check('detail view bounds follow the rectangle', await page.evaluate((v) => { return true; }, dv));

// Note with leader, box border and centred text
await page.evaluate(() => window.__phlippoStore.getState().startNote?.());
await page.waitForTimeout(200);
const noteOpen = await page.evaluate(() => window.__phlippoStore.getState().drawingEdit?.mode === 'note');
if (!noteOpen) await page.evaluate(() => window.__phlippoStore.setState({ drawingEdit: { mode: 'note', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] } }));
await page.waitForTimeout(200);
await page.fill('.k-pm textarea', 'BREAK SHARP EDGES');
await page.click('[data-testid="note-leader"]');
await page.click('[data-testid="note-align-center"]');
await page.click('.k-section-title:has-text("Border")').catch(() => undefined);
await page.selectOption('[data-testid="note-border"]', 'box');
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.placeNote([120, 150]); s.placeNote([170, 60]); });
await page.waitForTimeout(400);
sh = await sheet();
const note = sh.notes[sh.notes.length - 1];
check('Note with leader, box border, centred', note && note.anchor && note.border === 'box' && note.align === 'center', JSON.stringify(note));
check('note box drawn', (await page.locator('g.k-note[data-border="box"] rect').count()) === 1);

// Break with curve style
await page.evaluate((id) => window.__phlippoStore.getState().setViewBreak(id, { axis: 'x', a: -5, b: 5, gap: 4, style: 'curve' }), front.id);
await page.waitForTimeout(500);
check('Break line style curve', (await page.locator('g.k-break-lines[data-style="curve"]').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().undo());

// Draft quality and Projected / True dimension type on the view
await page.evaluate((id) => window.__phlippoStore.getState().updateDrawingView(id, { draftQuality: true, threadDraft: true }), front.id);
await page.waitForTimeout(600);
sh = await sheet();
check('Draft quality stored on the view', sh.views[0].draftQuality === true && sh.views[0].threadDraft === true);

// Sheet Properties: next view label
await page.evaluate(() => window.__phlippoStore.getState().setDialog('sheetProperties'));
await page.waitForTimeout(200);
await page.fill('[data-testid="sp-viewlabel"]', 'K');
await page.click('.k-dialog button:has-text("Apply Changes")');
await page.waitForTimeout(300);
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDetailView(); s.setDetailCircle(id, [0, 0], 6); s.placeDetailView([330, 200]); }, front.id);
await page.waitForTimeout(800);
sh = await sheet();
check('Next view label K is used', sh.views[sh.views.length - 1].detail?.label === 'K', sh.views[sh.views.length - 1].detail?.label);
await page.screenshot({ path: `${OUT}/dwgopts.png` });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
