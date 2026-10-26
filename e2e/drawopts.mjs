// Drawing Property Panel options that were grey: Section View (Half Section, Slice, Partial, Auto hatching,
// custom scale), Detail View (Full / Jagged outline, Pin position), Dimension (tolerance, precision, override,
// prefix/suffix, dual, Leaders arrows, Other font height, select and drag the text).
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
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
const drw = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete drw.format;
// keep the four model views, drop the example's section/detail views
drw.sheets[0].views = drw.sheets[0].views.filter((v) => !v.section && !v.detail);
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), drw);
await page.waitForTimeout(2500);
const sheet = () => page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0]);
const front = (await sheet()).views.find((v) => v.type === 'front');
const top = (await sheet()).views.find((v) => v.type === 'top');

const section = async (opts, pos) => {
  await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDrawingSection('v'); }, top.id);
  await page.waitForTimeout(200);
  for (const o of opts) await page.click(`[data-testid="${o}"]`);
  await page.evaluate((id) => window.__phlippoStore.getState().setSectionLine(id, 0), top.id);
  await page.evaluate((p) => window.__phlippoStore.getState().placeSectionView(p), pos);
  await page.waitForTimeout(1200);
  const s = await sheet();
  return s.views[s.views.length - 1];
};

// Half Section
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView(null));
const half = await section(['sv-half'], [300, 208]);
check('Half Section: the section view is cut on one half', half.section && half.section.half === 'top', JSON.stringify(half.section));
check('Half Section shows hatch and the outside half', (await page.locator(`path[data-hatch-variant]`).count()) >= 1);
await page.screenshot({ path: `${OUT}/drawopts-half.png` });
await page.evaluate(() => window.__phlippoStore.getState().undo());

// Slice section + custom scale
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView(null));
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDrawingSection('v'); }, top.id);
await page.waitForTimeout(200);
await page.click('.k-section-title:has-text("Section View")').catch(skip('drawopts:55'));
await page.click('[data-testid="sv-slice"]');
await page.click('.k-section-title:has-text("Scale")').catch(skip('drawopts:57'));
await page.click('[data-testid="sv-customscale"]');
await page.selectOption('[data-testid="sv-scale"]', '2:1');
await page.evaluate((id) => window.__phlippoStore.getState().setSectionLine(id, 0), top.id);
await page.evaluate(() => window.__phlippoStore.getState().placeSectionView([300, 208]));
await page.waitForTimeout(1000);
let s = await sheet();
let sv = s.views[s.views.length - 1];
check('Slice section with custom scale 2 : 1', sv.section?.slice === true && sv.scale?.[0] === 2 && sv.scale?.[1] === 1, JSON.stringify({ sec: sv.section, scale: sv.scale }));
await page.evaluate(() => window.__phlippoStore.getState().undo());

// Partial section and Auto hatching on the door handle assembly
const asmDrw = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk-tekening.kcad', 'utf8')); delete asmDrw.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asmDrw);
await page.waitForTimeout(2500);
const afront = (await sheet()).views.find((v) => v.type === 'front');
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDrawingSection('h'); }, afront.id);
await page.waitForTimeout(200);
await page.click('.k-section-title:has-text("Section View")').catch(skip('drawopts:75'));
await page.click('[data-testid="sv-autohatch"]');
await page.click('[data-testid="sv-partial"]');
await page.evaluate((id) => window.__phlippoStore.getState().setSectionLine(id, 0), afront.id);
await page.evaluate((p) => window.__phlippoStore.getState().placeSectionView(p), [afront.position[0], 60]);
await page.waitForTimeout(2500);
s = await sheet();
sv = s.views[s.views.length - 1];
const variants = await page.evaluate(() => [...new Set([...document.querySelectorAll('path[data-hatch-variant]')].map((p) => p.getAttribute('data-hatch-variant')))]);
check('Auto hatching: the components get different hatches', sv.section?.autoHatch && variants.length >= 2, JSON.stringify(variants));
check('Partial section keeps its depth', sv.section?.depth === 10, JSON.stringify(sv.section));
await page.screenshot({ path: `${OUT}/drawopts-autohatch.png` });

// back to the handle part drawing for the detail view and dimensions
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), drw);
await page.waitForTimeout(2000);
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDetailView(); }, front.id);
await page.waitForTimeout(200);
await page.click('.k-section-title:has-text("Detail View")').catch(skip('drawopts:93'));
await page.click('[data-testid="dv-jagged"]');
await page.click('[data-testid="dv-pin"]');
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.setDetailCircle(id, [0, 0], 12); s.setDetailCircle(id, [0, 0], 12); }, front.id);
await page.evaluate(() => window.__phlippoStore.getState().placeDetailView([330, 90]));
await page.waitForTimeout(1000);
s = await sheet();
const det = s.views[s.views.length - 1];
check('Detail View: Jagged outline drawn, not pinned', det.detail?.outline === 'jagged' && det.detail?.pinned === false && (await page.locator('.k-detail-outline').count()) === 1, JSON.stringify(det.detail));
// unpinned: the detail view follows its parent
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); const v = s.doc.sheets[0].views.find((x) => x.id === id); s.moveDrawingView(id, [v.position[0] + 10, v.position[1]]); }, front.id);
const det2 = (await sheet()).views.find((v) => v.id === det.id);
check('an unpinned detail view moves with its parent', Math.abs(det2.position[0] - det.position[0] - 10) < 1e-6, JSON.stringify([det.position, det2.position]));
await page.screenshot({ path: `${OUT}/drawopts-detail.png` });

// Dimension: click its text to select it, Dimension PM with Value / Leaders / Other
const dim = (await sheet()).dimensions.find((d) => d.kind === 'linear' && d.orientation === 'h');
const dimEl = page.locator(`[data-dim-id="${dim.id}"] text`).first();
await dimEl.click();
await page.waitForTimeout(200);
check('clicking a dimension selects it and opens the Dimension PM', await page.evaluate((id) => window.__phlippoStore.getState().selectedDrawingDimensionId === id, dim.id) && (await page.locator('[data-testid="dim-tab-leaders"]').count()) === 1);
await page.selectOption('[data-testid="dim-tol"]', 'bilateral');
await page.waitForTimeout(150);
check('Bilateral tolerance shown stacked (+0.10 / -0.10)', (await page.locator(`[data-dim-id="${dim.id}"] [data-testid="dim-tol-upper"]`).textContent()) === '+0.10' && (await page.locator(`[data-dim-id="${dim.id}"] [data-testid="dim-tol-lower"]`).textContent()) === '-0.10');
await page.selectOption('[data-testid="dim-tol"]', 'symmetric');
await page.selectOption('[data-testid="dim-precision"]', '1');
await page.waitForTimeout(150);
check('Symmetric tolerance and unit precision .1', (await page.locator(`[data-dim-id="${dim.id}"] text`).first().textContent()) === '138.0 ±0.10', await page.locator(`[data-dim-id="${dim.id}"] text`).first().textContent());
await page.click('.k-section-title:has-text("Dual Dimension")');
await page.click('[data-testid="dim-dual"]');
await page.waitForTimeout(150);
check('Dual dimension in inches', /\[5\.43\]/.test(await page.locator(`[data-dim-id="${dim.id}"] [data-testid="dim-dual-text"]`).textContent()));
await page.click('[data-testid="dim-override"]');
await page.fill('[data-testid="dim-override-text"]', '138 REF');
await page.click('.k-section-title:has-text("Dimension Text")');
await page.fill('[data-testid="dim-prefix"]', '2x ');
await page.waitForTimeout(150);
check('Override value and prefix', /^2x 138 REF/.test(await page.locator(`[data-dim-id="${dim.id}"] text`).first().textContent()), await page.locator(`[data-dim-id="${dim.id}"] text`).first().textContent());
await page.click('[data-testid="dim-tab-leaders"]');
await page.click('[data-testid="dim-arrows-outside"]');
await page.waitForTimeout(150);
check('Leaders ▸ arrows outside', (await page.locator(`[data-dim-id="${dim.id}"]`).getAttribute('data-arrows')) === 'outside');
await page.click('[data-testid="dim-tab-other"]');
await page.click('.k-pm label:has-text("Use document font") input');
await page.waitForTimeout(150);
check('Other ▸ text height 5 mm', (await sheet()).dimensions.find((d) => d.id === dim.id).fontSize === 5);
// drag the text
const bb = await page.locator(`[data-dim-id="${dim.id}"] text`).first().boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 - 40, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(200);
const dimAfter = (await sheet()).dimensions.find((d) => d.id === dim.id);
check('dragging the dimension text moves it', dimAfter.label[1] > dim.label[1] + 2, JSON.stringify([dim.label, dimAfter.label]));
await page.screenshot({ path: `${OUT}/drawopts-dimension.png` });
await page.locator('.k-sheet-host').focus();
await page.keyboard.press('Delete');
await page.waitForTimeout(200);
check('Delete removes the selected dimension', !(await sheet()).dimensions.some((d) => d.id === dim.id));


// Model Items without the sketch placement: the texts go outside the view outline
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), { ...drw, sheets: [{ ...drw.sheets[0], dimensions: [] }] });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__phlippoStore.getState().startModelItems());
await page.waitForTimeout(200);
await page.click('[data-testid="mi-placement"]');
await page.evaluate(() => window.__phlippoStore.getState().insertModelItems());
await page.waitForTimeout(500);
const outside = await page.evaluate(() => {
  const sh = window.__phlippoStore.getState().doc.sheets[0];
  return sh.dimensions.filter((d) => d.kind === 'linear').map((d) => { const b = window.__phlippoSheet.bounds(d.viewId); const p = window.__phlippoSheet.viewToSheet(d.viewId, d.label); const o = p[0] < b.x || p[0] > b.x + b.w || p[1] < b.y || p[1] > b.y + b.h; return o ? true : JSON.stringify({ or: d.orientation, a: d.a, b: d.b, l: d.label, p, bx: b }); });
});
check('Model Items ▸ no sketch placement: linear dimension texts outside the views', outside.length > 0 && outside.every((x) => x === true), JSON.stringify(outside));

// Broken-out Section ▸ Preview
const fv = (await sheet()).views.find((v) => v.type === 'front');
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startBrokenOut(); }, fv.id);
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.addBrokenOutPoint(id, [-10, -10], false); s.addBrokenOutPoint(id, [10, -10], false); s.addBrokenOutPoint(id, [10, 10], false); s.addBrokenOutPoint(id, [-10, 10], false); s.addBrokenOutPoint(id, [-10, -10], true); }, fv.id);
await page.waitForTimeout(200);
const before = await page.locator('.k-bo-outline').count();
await page.click('[data-testid="bo-preview"]');
await page.waitForTimeout(1200);
check('Broken-out Section ▸ Preview shows the cut before OK', before === 0 && (await page.locator('.k-bo-outline').count()) === 1 && !(await sheet()).views.find((v) => v.id === fv.id).brokenOut);
await page.evaluate(() => window.__phlippoStore.getState().cancelDrawingEdit());

// Weld contour and balloon attached to an edge
await page.evaluate(() => window.__phlippoStore.getState().startSymbol('weld'));
await page.waitForTimeout(150);
await page.selectOption('[data-testid="weld-contour"]', 'vgroove');
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.addSymbol({ kind: 'weld', position: [200, 120], anchor: [190, 110], text: '5', contour: s.drawingEdit.weldContour }); });
await page.waitForTimeout(150);
check('Weld Symbol ▸ Contour V-groove', (await page.locator('[data-contour="vgroove"]').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().startSymbol('autoBalloon'));
await page.waitForTimeout(150);
await page.click('[data-testid="balloon-edges"]');
await page.click(`[data-testid="balloon-layout-top"]`);
const ab = await page.evaluate((id) => window.__phlippoSheet.toPx((window.__phlippoStore.getState().doc.sheets[0].views.find((v) => v.id === id).position)), fv.id);
await page.mouse.click(ab.x, ab.y);
await page.waitForTimeout(400);
const heads = await page.evaluate(() => (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).filter((s) => s.kind === 'balloon').map((s) => s.head));
check('Auto Balloon ▸ Leader attachment Edges: arrow on an edge', heads.length >= 1 && heads.every((h) => h === 'arrow'), JSON.stringify(heads));

// Use parent scale of a section view
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.startDrawingSection('v'); s.setDrawingEdit({ useCustomScale: true, scale: [2, 1] }); s.setSectionLine(id, 0); s.placeSectionView([300, 150]); }, fv.id);
await page.waitForTimeout(1000);
const secId = await page.evaluate(() => { const v = window.__phlippoStore.getState().doc.sheets[0].views; return v[v.length - 1].id; });
await page.evaluate((id) => window.__phlippoStore.getState().selectDrawingView(id), secId);
await page.evaluate(() => window.__phlippoStore.getState().setManagerTab('properties'));
await page.waitForTimeout(200);
await page.click('[data-testid="dv-parentscale"]');
await page.waitForTimeout(300);
const secScale = await page.evaluate((id) => window.__phlippoStore.getState().doc.sheets[0].views.find((v) => v.id === id).scale, secId);
check('Drawing View PM ▸ Use parent scale', JSON.stringify(secScale) === JSON.stringify(fv.scale ?? (await sheet()).scale), JSON.stringify(secScale));
await page.screenshot({ path: `${OUT}/drawopts-rest.png` });
console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
