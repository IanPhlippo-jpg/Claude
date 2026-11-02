// Drawing commands that were "later": Relative / Empty / Predefined View, Spell Checker, Format Painter, Linear Note
// Pattern, Magnetic Line, Blocks, Edit Sheet Format, Hole Table, General Table, Add Sheet.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

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
await page.click('.k-doctype:has-text("Part")');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk-tekening.kcad', 'utf8')); delete tek.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(2500);
const sheet = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; return { id: sh.id, name: sh.name, views: sh.views.map((v) => ({ id: v.id, rel: !!v.relative, empty: !!v.empty, pre: !!v.predefined, model: v.model.name })), notes: sh.notes.map((n) => ({ id: n.id, text: n.text, fs: n.fontSize, bold: n.bold })), tables: (sh.tables ?? []).map((t) => t.kind), ml: (sh.magneticLines ?? []).length, other: (s.doc.otherSheets ?? []).length, zones: sh.format?.zones }; });
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoSheet.toPx([x, y]), [x, y]);
const clickSheet = async (x, y) => { const p = await P(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300); };
const v0 = (await sheet()).views.length;

// Relative View
await page.click('.k-cm-tab:text-is("Drawing")');
await page.click('.k-cm-big:has-text("Relative View")');
await page.waitForTimeout(500);
const opts = await page.locator('[data-testid="relview-front"] option').count();
check('Relative View lists the planar faces of the model', opts >= 4, String(opts));
// pick two perpendicular faces automatically
await page.evaluate(() => {
  const f = document.querySelector('[data-testid="relview-front"]'), r = document.querySelector('[data-testid="relview-right"]');
  const parse = (o) => o.textContent.match(/\(([^)]*)\)/)[1].split(',').map(Number);
  const os = [...f.options];
  for (let i = 0; i < os.length; i++) for (let j = 0; j < os.length; j++) {
    const a = parse(os[i]), b = parse(os[j]);
    if (Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) < 1e-3) {
      const set = (el, v) => { const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v)); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set(f, i); set(r, j); return;
    }
  }
});
await page.waitForTimeout(200);
await page.click('[data-testid="relview-ok"]');
await clickSheet(330, 60);
let st = await sheet();
check('Relative View is placed with its own orientation', st.views.length === v0 + 1 && st.views.some((v) => v.rel), JSON.stringify(st.views.slice(-1)));

// Empty View and Predefined View + Insert Model
await page.click('.k-cm-small:has-text("Empty View")');
await clickSheet(40, 40);
await page.click('.k-cm-small:has-text("Predefined View")');
await clickSheet(90, 40);
st = await sheet();
check('Empty View and Predefined View are placed', st.views.some((v) => v.empty) && st.views.some((v) => v.pre), JSON.stringify(st.views.map((v) => [v.empty, v.pre])));
await page.waitForTimeout(300);
await page.locator('[data-testid="insert-model"]').first().click();
await page.waitForTimeout(800);
st = await sheet();
check('Predefined View ▸ Insert Model fills the view', !st.views.some((v) => v.pre), JSON.stringify(st.views.map((v) => [v.pre, v.model])));

// notes: place two, Format Painter, Linear Note Pattern, Spell Checker
await page.click('.k-cm-tab:has-text("Annotation")');
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.startNote(); s.placeNote([40, 120]); });
await page.waitForTimeout(200);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; const n = sh.notes[sh.notes.length - 1]; s.applyDocument('style', { ...s.doc, sheets: [{ ...sh, notes: sh.notes.map((x) => (x.id === n.id ? { ...x, text: 'MATERAIL: ALUMINIUM', fontSize: 5, bold: true } : x)) }] }); s.startNote(); s.placeNote([40, 100]); s.cancelDrawingEdit(); });
await page.waitForTimeout(300);
st = await sheet();
const [srcNote, dstNote] = st.notes.slice(-2);
await page.click('.k-cm-big:has-text("Format Painter")');
await clickSheet(42, 121);
await clickSheet(42, 101);
await page.keyboard.press('Escape');
st = await sheet();
const painted = st.notes.find((n) => n.id === dstNote.id);
check('Format Painter copies the text height and bold', painted && painted.fs === 5 && painted.bold === true, JSON.stringify({ srcNote, painted }));
await page.click('.k-cm-big:has-text("Linear Note Pattern")');
await page.waitForTimeout(200);
await page.click('[data-testid="np-ok"]');
await page.waitForTimeout(300);
const nNotes = (await sheet()).notes.length;
check('Linear Note Pattern makes the copies (3 in X)', nNotes === st.notes.length + 2, `${st.notes.length} -> ${nNotes}`);
await page.click('.k-cm-big:has-text("Spell Checker")');
await page.waitForTimeout(200);
check('Spell Checker lists the notes with the spell checker on', (await page.locator('[data-testid="spell-check"] textarea[spellcheck="true"]').count()) >= 2);
await page.click('[data-testid="spell-check"] button:has-text("Close")');

// Blocks, Magnetic Line (balloons spread along it)
await page.click('.k-cm-big:has-text("Blocks") .k-cm-main').catch(async () => page.click('.k-cm-big:has-text("Blocks")'));
await clickSheet(200, 40);
check('Blocks ▸ General tolerances inserts its notes', (await sheet()).notes.some((n) => /UNLESS OTHERWISE SPECIFIED/.test(n.text)));
const nBalloons = await page.evaluate(() => (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).filter((s) => s.kind === 'balloon').length);
await page.click('.k-cm-small:has-text("Magnetic Line")');
await clickSheet(260, 200);
await clickSheet(380, 200);
st = await sheet();
const ys = await page.evaluate(() => (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).filter((s) => s.kind === 'balloon').map((s) => s.position[1]));
check('Magnetic Line lines the balloons up', st.ml >= 1 && (nBalloons === 0 || ys.every((y) => Math.abs(y - 200) < 0.05)), JSON.stringify({ nBalloons, ys }));

// Tables
await page.click('.k-cm-big:has-text("Tables") .k-cm-arrow');
await page.evaluate(() => window.__phlippoStore.getState().insertHoleTable());
await page.evaluate(() => window.__phlippoStore.getState().setDialog('generalTable'));
await page.click('[data-testid="gt-insert"]');
await page.locator('[data-testid="gt-cells"] input').nth(3).fill('Ra 1.6');
await page.click('[data-testid="general-table"] button:has-text("Close")');
await page.waitForTimeout(400);
st = await sheet();
check('Hole Table and General Table are on the sheet', st.tables.includes('hole') && st.tables.includes('general') && (await page.locator('[data-testid="hole-table"]').count()) === 1 && (await page.locator('[data-testid="general-table"]').count()) === 1, JSON.stringify(st.tables));
await page.screenshot({ path: `${OUT}/drw2-sheet.png` });

// Edit Sheet Format: zone labels off
await page.click('.k-cm-tab:has-text("Sheet Format")');
await page.click('.k-cm-big:has-text("Edit Sheet Format")');
await page.waitForTimeout(200);
await page.locator('[data-testid="fmt-zones"]').uncheck();
await page.waitForTimeout(200);
check('Edit Sheet Format switches the zone labels off', (await sheet()).zones === false);
await page.evaluate(() => window.__phlippoStore.getState().cancelDrawingEdit());

// Add Sheet and switch back
const first = (await sheet()).id;
await page.click('[data-testid="add-sheet"]');
await page.waitForTimeout(400);
st = await sheet();
check('Add Sheet makes Sheet2 active (empty)', st.id !== first && st.views.length === 0 && st.other === 1 && (await page.locator('[data-testid="sheet-tab"]').count()) === 2, JSON.stringify({ name: st.name, other: st.other }));
await page.locator('[data-testid="sheet-tab"]').first().click();
await page.waitForTimeout(800);
st = await sheet();
check('clicking the first sheet tab shows its views again', st.id === first && st.views.length > 3);
await page.screenshot({ path: `${OUT}/drw2-sheets.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
