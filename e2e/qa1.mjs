// QA report fixes, batch 1: start-up without a document (Welcome over an empty window), Recent Documents / autosave
// per document, Rebuild keeps undo and the unsaved flag, "Save changes?" before Open / New / Close, Modify refuses 0,
// Confirm Delete defaults, Trimetric start view, no GPU leak over repeated feature edits, Enter repeats the last command.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
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
const st = () => S(() => { const s = window.__phlippoStore.getState(); return { hasDocument: s.hasDocument, dialog: s.dialog, dirty: s.dirty, canUndo: s.canUndo, features: s.doc.features.length, name: s.doc.name, viewName: s.viewName, ask: s.ask ? s.ask.text : null }; });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(400);

// ---- start-up: Welcome over an empty window, nothing in the tree, Command Ribbon greyed
let s = await st();
check('start-up shows the Welcome dialog without a document', s.dialog === 'welcome' && !s.hasDocument, JSON.stringify(s));
check('no Feature Tree and an empty graphics area without a document', (await page.locator('[data-testid="manager-empty"]').count()) === 1 && (await page.locator('[data-testid="nodoc"]').count()) === 1);
check('Command Ribbon greyed without a document', (await page.locator('.k-cm.k-cm-nodoc').count()) === 1);
check('no recent documents on a clean start', (await page.locator('.k-welcome').innerText()).includes('No recent documents'));
await page.screenshot({ path: `${OUT}/qa1-startup.png` });

// ---- a new part: Trimetric, as the original
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(500);
s = await st();
check('new part opens in Trimetric', s.hasDocument && s.viewName === '*Trimetric', JSON.stringify(s));
check('no watermark logo in the empty part', (await page.locator('[data-testid="bg-logo"]').count()) === 0);

// a plate with a hole (two features) from the kit
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  const d = K.createDocument('Plaat');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);

// ---- Rebuild keeps undo history and the unsaved flag
await S(() => window.__phlippoStore.getState().applyDocument('Depth', { ...window.__phlippoStore.getState().doc, features: window.__phlippoStore.getState().doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 20 } : f)) }));
await page.waitForTimeout(300);
s = await st();
check('an edit makes the document dirty and undoable', s.dirty && s.canUndo, JSON.stringify(s));
await page.keyboard.press('Control+b');
await page.waitForTimeout(500);
s = await st();
check('Rebuild (Ctrl+B) keeps undo and the unsaved flag', s.dirty && s.canUndo && s.features === 2, JSON.stringify(s));
check('title shows the unsaved asterisk', (await page.locator('.k-mb-title, .k-titlebar, header').first().innerText().catch(() => '')).includes('*') || (await page.evaluate(() => document.body.innerText.includes('Plaat *'))));

// ---- Save changes? before New (Ctrl+N) and Open; Cancel keeps everything
await page.keyboard.press('Control+n');
await page.waitForTimeout(300);
s = await st();
check('Ctrl+N with unsaved changes asks "Save changes to Plaat?"', s.ask === 'Save changes to Plaat?', JSON.stringify(s));
check('the question offers Save, Don\'t Save and Cancel', (await page.locator('[data-testid="ask-yes"]').innerText()) === 'Save' && (await page.locator('[data-testid="ask-no"]').innerText()) === "Don't Save" && (await page.locator('[data-testid="ask-cancel"]').count()) === 1);
await page.screenshot({ path: `${OUT}/qa1-savechanges.png` });
await page.click('[data-testid="ask-cancel"]');
await page.waitForTimeout(200);
s = await st();
check('Cancel keeps the document and its changes', s.ask === null && s.dialog === null && s.features === 2 && s.dirty, JSON.stringify(s));
await page.keyboard.press('Control+n');
await page.waitForTimeout(200);
await page.click('[data-testid="ask-no"]');
await page.waitForTimeout(200);
s = await st();
check("Don't Save goes on to the New dialog", s.dialog === 'new', JSON.stringify(s));
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().setDialog(null));

// ---- the autosave per document: Welcome ▸ Recent lists it, Document Recovery too
await S(() => window.__phlippoStore.getState().setDialog('welcome'));
await page.waitForTimeout(200);
check('Recent Documents lists the plate', (await page.locator('[data-testid="welcome-recent-0"]').innerText()).includes('Plaat.kcad'));
await S(() => window.__phlippoStore.getState().setDialog(null));
await page.click('.k-taskpane-btn[data-tip="Document Recovery"]');
await page.waitForTimeout(200);
check('Document Recovery lists the recovery copy', (await page.locator('[data-testid="recovery-list"]').innerText()).includes('Plaat.kcad'));
await page.click('.k-taskpane-btn[data-tip="Document Recovery"]');

// ---- reload: Welcome again, the document waits under Recent and comes back whole
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(400);
s = await st();
check('after a reload the Welcome dialog shows again, no document open', s.dialog === 'welcome' && !s.hasDocument, JSON.stringify(s));
await page.click('[data-testid="welcome-recent-0"]');
await page.waitForTimeout(600);
s = await st();
check('the recent document opens whole', s.hasDocument && s.features === 2 && s.name === 'Plaat', JSON.stringify(s));

// ---- Modify refuses 0 and negative values for a length
await S(() => { const s = window.__phlippoStore.getState(); s.editSketch('s1'); });
await page.waitForTimeout(300);
const cid = await S(() => {
  const K = window.__phlippoKit;
  const s = window.__phlippoStore.getState();
  let id = null;
  s.commit('Dimension', (k) => { const line = k.entityOrder[0]; const [k2, c] = K.addConstraint(k, 'length', [line], { value: 60 }); id = c.id; return k2; });
  return id;
});
await S((cid) => window.__phlippoStore.getState().setModify({ id: cid, x: 400, y: 300 }), cid);
await page.waitForTimeout(300);
const before = await S((cid) => window.__phlippoStore.getState().doc.sketches.s1.constraints[cid].value, cid);
await page.fill('.k-modify input.k-num', '0');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const after0 = await S((cid) => ({ v: window.__phlippoStore.getState().doc.sketches.s1.constraints[cid].value, open: !!window.__phlippoStore.getState().modify, msg: (window.__phlippoStore.getState().messages.at(-1) ?? {}).text }), cid);
check('Modify refuses 0 for a length and stays open', after0.v === before && after0.open && /larger than zero/.test(after0.msg ?? ''), JSON.stringify(after0));
await page.fill('.k-modify input.k-num', '-5');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const afterNeg = await S((cid) => window.__phlippoStore.getState().doc.sketches.s1.constraints[cid].value, cid);
check('Modify refuses a negative length', afterNeg === before, String(afterNeg));
await page.fill('.k-modify input.k-num', '50');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('Modify accepts 50', (await S((cid) => window.__phlippoStore.getState().doc.sketches.s1.constraints[cid].value, cid)) === 50);
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(300);

// ---- Confirm Delete defaults: absorbed features on, child features off, as the original
await S(() => window.__phlippoStore.getState().requestDeleteFeature('e1'));
await page.waitForTimeout(300);
check('Confirm Delete: "Also delete absorbed features" on, "Delete child features" off by default', (await page.locator('[data-testid="cdel-absorbed"]').isChecked()) === true && (await page.locator('[data-testid="cdel-childopt"]').isChecked()) === false);
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().closeConfirmDelete());

// ---- no GPU leak: 30 depth edits keep the renderer's geometry count flat
const mem = () => S(() => ({ ...window.__phlippoRenderer.info.memory }));
for (let i = 0; i < 3; i++) await S((i) => window.__phlippoStore.getState().applyDocument('Depth', { ...window.__phlippoStore.getState().doc, features: window.__phlippoStore.getState().doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 10 + i } : f)) }), i);
await page.waitForTimeout(400);
const m0 = await mem();
for (let i = 0; i < 30; i++) {
  await S((i) => window.__phlippoStore.getState().applyDocument('Depth', { ...window.__phlippoStore.getState().doc, features: window.__phlippoStore.getState().doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 12 + (i % 7) } : f)) }), i);
  await page.waitForTimeout(60);
}
await page.waitForTimeout(500);
const m1 = await mem();
check('30 feature edits do not grow the GPU geometry count', m1.geometries <= m0.geometries + 2, `${JSON.stringify(m0)} -> ${JSON.stringify(m1)}`);

// ---- Enter repeats the last Command Ribbon command
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(300);
check('the command opens its Property Panel', !!(await S(() => window.__phlippoStore.getState().featureEdit)));
await S(() => window.__phlippoStore.getState().cancelFeature());
await page.waitForTimeout(200);
await page.mouse.click(960, 600);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('Enter runs the last command again', (await S(() => window.__phlippoStore.getState().featureEdit?.draft.type)) === 'extrude');
await S(() => window.__phlippoStore.getState().cancelFeature());

// ---- Close goes through the same question and leaves an empty window
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("Close")');
await page.waitForTimeout(300);
s = await st();
check('Close with unsaved changes asks first', s.ask === 'Save changes to Plaat?', JSON.stringify(s));
await page.click('[data-testid="ask-no"]');
await page.waitForTimeout(300);
s = await st();
check('Close without saving leaves the empty window', !s.hasDocument && (await page.locator('[data-testid="nodoc"]').count()) === 1, JSON.stringify(s));
await page.screenshot({ path: `${OUT}/qa1-closed.png` });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
