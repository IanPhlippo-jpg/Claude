// QA report v0.3.3 fixes: the app works without the window test hooks (F53/F61), damaged documents are refused
// without a crash or autosave (F55/F05/F70), Open/New end Edit Component (F74), Edit Component keeps the assembly's
// undo (F39), model changes are undoable (F75), Standard Parts Open asks to save (F41), body and sheet metal commands are
// greyed without a body (F14/F63), plane labels do not overlap and pick their own plane (F66/F18), number fields refuse
// huge values and take arithmetic (F71/F42), the Welcome shows the notice and no trademarked product names (F72/F50),
// a dropped file never navigates (F03), the Tolerance Tree empty text (F64).
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(400);

// ---- Welcome: the independence notice, no trademarked product names anywhere in the visible UI (F72, F50)
check('Welcome shows the independence notice', /not affiliated with or endorsed by Dassault Systèmes SolidWorks Corp\./.test(await page.locator('[data-testid="welcome-legal"]').innerText()));
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(500);
const tmNames = /FeatureManager|PropertyManager|CommandManager|ConfigurationManager|DisplayManager|MotionManager|DimXpert|TolAnalyst|SimulationXpress|FeatureXpert|DraftXpert|Instant3D|RealView|SpeedPak|eDrawings|Hole Wizard|Toolbox|Design Library|Lifecycle and Collaboration|Smart Fasteners|Tree Tree|tree tree|a Auto/;
const visibleNames = await S(() => {
  const texts = [document.body.innerText];
  for (const el of document.querySelectorAll('[data-tip],[title],[aria-label]')) texts.push(el.getAttribute('data-tip') ?? '', el.getAttribute('title') ?? '', el.getAttribute('aria-label') ?? '');
  return texts.join('\n');
});
check('no trademarked product names in the visible part UI (text, tooltips)', !tmNames.test(visibleNames), (visibleNames.match(tmNames) ?? [''])[0]);

// ---- F14: an empty part greys the commands that need a body
const disabled = (sel) => page.locator(sel).evaluate((el) => el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true' || !!el.closest('[disabled]'));
check('empty part: Extruded Cut greyed', await disabled('.k-cm-big:has-text("Extruded Cut") .k-cm-main'));
check('empty part: Fillet greyed', await disabled('.k-cm-big:has-text("Fillet") .k-cm-main'));
check('empty part: Shell and Mirror greyed', (await disabled('.k-cm-small:has-text("Shell")')) && (await disabled('.k-cm-small:has-text("Mirror")')));
check('the document kind is a part (createDocument)', (await S(() => window.__phlippoStore.getState().doc.kind ?? 'part')) === 'part');
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.waitForTimeout(200);
check('empty part: Base Flange stays active, Edge Flange / Unfold / Flatten greyed', !(await disabled('.k-cm-big:has-text("Base Flange") .k-cm-main')) && (await disabled('.k-cm-big:has-text("Edge Flange") .k-cm-main')) && (await disabled('.k-cm-small:has-text("Unfold")')) && (await disabled('.k-cm-small:has-text("Flatten")')));
await shot('qa3-f14-sheetmetal-greyed');

// a block (no sheet metal)
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.waitForTimeout(200);
check('a solid without sheet metal: Convert to Sheet Metal active, Edge Flange and Normal Cut greyed', !(await disabled('.k-cm-small:has-text("Convert to Sheet Metal")')) && (await disabled('.k-cm-big:has-text("Edge Flange") .k-cm-main')) && (await disabled('.k-cm-small:has-text("Normal Cut")')));
await page.click('.k-cm-tab:has-text("Features")');
check('with a body: Extruded Cut and Fillet active', !(await disabled('.k-cm-big:has-text("Extruded Cut") .k-cm-main')) && !(await disabled('.k-cm-big:has-text("Fillet") .k-cm-main')));

// ---- F53: the app's own commands work without the window hooks (keep references, then remove every mirror)
const fitWorks = await S(async () => {
  const cam = window.__phlippoCamera;
  const store = window.__phlippoStore;
  window.__qa = { cam, store };
  for (const k of Object.getOwnPropertyNames(window)) if (k.startsWith('__phlippo') && k !== '__phlippoStore') delete window[k];
  const gone = Object.getOwnPropertyNames(window).filter((k) => k.startsWith('__phlippo') && k !== '__phlippoStore').length === 0;
  cam.scale *= 6;
  cam.update?.();
  const before = cam.scale;
  return { gone, before };
});
await page.mouse.click(1000, 600);
await page.keyboard.press('f');
await page.waitForTimeout(700);
const after = await S(() => window.__qa.cam.scale);
check('without the hooks: F (Zoom to Fit) still fits the model', fitWorks.gone && after < fitWorks.before * 0.6, JSON.stringify({ ...fitWorks, after }));
await page.click('.k-cm-tab:has-text("Render Tools")');
await page.waitForTimeout(200);
await page.click('.k-cm-big:has-text("Final Render") .k-cm-main');
await page.waitForTimeout(1500);
check('without the hooks: Final Render makes the image', await S(() => !!window.__qa.store.getState().finalImage));
await S(() => window.__qa.store.getState().setFinalImage?.(null));
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 10000 });
await page.waitForTimeout(600);
check('the hooks come back after a reload (test build)', await S(() => typeof window.__phlippoCamera === 'object' && typeof window.__phlippoZoomFit === 'function'));

// ---- F61: after a drawing was shown, F fits the part again (not the sheet)
await S(() => { const K = window.__phlippoKit; window.__phlippoStore.getState().openDocument(K.createDocument('Draw1', 'drawing')); });
await page.waitForTimeout(500);
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addCircle(sk, { x: 0, y: 0 }, 20)[0];
  const d = K.createDocument('Schijf');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
const s0 = await S(() => { const c = window.__phlippoCamera; c.scale *= 8; c.update?.(); return c.scale; });
await page.mouse.click(1000, 600);
await page.keyboard.press('f');
const fitted = await page.waitForFunction((s) => window.__phlippoCamera.scale < s * 0.5, s0, { timeout: 10000 }).then(() => true, () => false);
check('after a drawing, F fits the part again (F61)', fitted, String(await S(() => window.__phlippoCamera.scale)));

// ---- F55 / F70: a damaged assembly or drawing is refused, the open document and its autosave stay
const before55 = await S(() => ({ name: window.__phlippoStore.getState().doc.name, auto: localStorage.getItem('phlippo.autosave')?.length ?? 0 }));
const r55 = await S(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  const asm = K.createDocument('Kapot', 'assembly');
  asm.components = [{ id: 'c1', name: 'Part1<1>', part: {}, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
  st.openDocument(asm);
  const drw = K.createDocument('KapotDrw', 'drawing');
  drw.sheets = [{}];
  window.__phlippoStore.getState().openDocument(drw);
  const s = window.__phlippoStore.getState();
  return { name: s.doc.name, messages: (s.messages ?? []).slice(-2).map((m) => m.text ?? m) };
});
await page.waitForTimeout(400);
check('a damaged assembly and drawing are refused: the part stays open, no crash', r55.name === before55.name && (await page.locator('[data-testid="crash"]').count()) === 0, JSON.stringify(r55));
check('the autosave of the open part is not replaced by the damaged document', (await S(() => (localStorage.getItem('phlippo.autosave') ?? '').includes('"Kapot"'))) === false);

// ---- F75: renaming a feature, the document, the scene are undoable
await S(() => window.__phlippoStore.getState().renameFeature('e1', 'Schijfdikte'));
const renamed = await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e1').name);
await S(() => window.__phlippoStore.getState().undo());
const undone = await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e1').name);
check('Rename feature is undoable', renamed === 'Schijfdikte' && undone === 'Boss-Extrude1', `${renamed} → ${undone}`);
await S(() => window.__phlippoStore.getState().setScene({ background: 'white' }));
await S(() => window.__phlippoStore.getState().undo());
check('Edit Scene is undoable', (await S(() => window.__phlippoStore.getState().doc.scene?.background ?? 'gradient')) === 'gradient');

// ---- assembly: Edit Component keeps the undo (F39), Open ends the edit context (F74), mates/hide undoable (F75)
await S(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  const part = st.doc;
  const asm = K.createDocument('Assem1', 'assembly');
  asm.components = [
    { id: 'c1', name: 'Schijf<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false },
    { id: 'c2', name: 'Schijf<2>', part, position: [60, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false },
  ];
  asm.mates = [{ id: 'm1', type: 'distance', name: 'Distance1', refs: [{ componentId: 'c1' }, { componentId: 'c2' }], aligned: false, value: 60 }];
  st.openDocument(asm);
});
await page.waitForTimeout(600);
await S(() => window.__phlippoStore.getState().setComponentHidden('c2', true));
await S(() => window.__phlippoStore.getState().setMateSuppressed('m1', true));
const asmUndo = await S(() => window.__phlippoStore.getState().canUndo);
await S(() => window.__phlippoStore.getState().undo());
check('Suppress mate is undoable', (await S(() => !!window.__phlippoStore.getState().doc.mates[0].suppressed)) === false && asmUndo);
await S(() => window.__phlippoStore.getState().editComponent('c1'));
await page.waitForTimeout(500);
check('Edit Component opens the part with its context', await S(() => !!window.__phlippoStore.getState().editContext && window.__phlippoStore.getState().doc.name === 'Schijf'));
await S(() => window.__phlippoStore.getState().returnToAssembly());
await page.waitForTimeout(500);
const back = await S(() => { const s = window.__phlippoStore.getState(); return { kind: s.doc.kind, canUndo: s.canUndo, hidden: s.doc.components.find((c) => c.id === 'c2').hidden }; });
await S(() => window.__phlippoStore.getState().undo()); // the component edit
await S(() => window.__phlippoStore.getState().undo()); // the hide from before Edit Component
const hiddenAfter = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'c2').hidden);
check('Return to Assembly keeps the undo from before Edit Component (F39)', back.kind === 'assembly' && back.canUndo && back.hidden === true && !hiddenAfter, JSON.stringify({ back, hiddenAfter }));
const inEdit = await S(() => { window.__phlippoStore.getState().editComponent('c1'); return !!window.__phlippoStore.getState().editContext; });
check('Edit Component again from the assembly', inEdit);
await page.waitForTimeout(400);
await S(() => window.__phlippoStore.getState().openDocument(window.__phlippoKit.createDocument('Nieuw')));
await page.waitForTimeout(300);
const f74 = await S(() => ({ ctx: window.__phlippoStore.getState().editContext === null, name: window.__phlippoStore.getState().doc.name, bar: [...document.querySelectorAll('.k-viewport button')].some((b) => b.textContent === 'Return to Assembly') }));
check('Open/New during Edit Component ends the edit context (F74)', f74.ctx && f74.name === 'Nieuw' && !f74.bar, JSON.stringify(f74));

// ---- F41: Standard Parts Open asks to save unsaved changes first
await S(() => { const st = window.__phlippoStore.getState(); st.setPrefs({ ...st.prefs, 'addin.standardParts': true }); window.__phlippoStore.setState({ dirty: true }); st.setTaskPane('library'); });
await page.waitForTimeout(300);
await page.locator('[data-testid="toolbox-folder"] button:has-text("Open")').click();
await page.waitForTimeout(300);
check('Standard Parts Open with unsaved changes asks "Save changes?"', /Save changes to Nieuw\?/.test(await page.locator('[data-testid="ask"]').innerText().catch(skip('qa3.mjs:191', ''))));
await page.locator('[data-testid="ask"] button:has-text("Cancel"), [data-testid="ask-cancel"]').first().click().catch(() => page.keyboard.press('Escape'));
await S(() => window.__phlippoStore.getState().setTaskPane('library'));

// ---- F66 / F18: plane labels in Trimetric do not overlap and a click on "Top Plane" starts the sketch on Top
await S(() => { window.__phlippoStore.setState({ dirty: false }); window.__phlippoStore.getState().openDocument(window.__phlippoKit.createDocument('Vlakken')); });
await page.waitForTimeout(500);
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const labels = await page.locator('.k-plane-label').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, x: r.x, y: r.y, w: r.width, h: r.height }; }));
const overlap = labels.some((a, i) => labels.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
check('the three plane labels are shown without overlap', labels.length === 3 && !overlap, JSON.stringify(labels));
await shot('qa3-f66-plane-labels');
const top = labels.find((l) => l.t === 'Top Plane');
if (top) {
  await page.mouse.move(top.x + top.w / 2, top.y + top.h / 2);
  await page.waitForTimeout(150);
  await page.mouse.click(top.x + top.w / 2, top.y + top.h / 2);
  await page.waitForTimeout(500);
}
const planeOf = await S(() => { const s = window.__phlippoStore.getState(); return s.activeSketchId ? s.doc.sketches[s.activeSketchId].plane : null; });
check('a click on the "Top Plane" label sketches on the Top Plane', planeOf === 'top', String(planeOf));
await page.keyboard.press('Escape');

// ---- F71 / F42: number fields refuse 1e300 and accept arithmetic
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'front');
  sk = K.addCircle(sk, { x: 0, y: 0 }, 10)[0];
  const d = K.createDocument('Invoer');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(400);
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-tree-row:has-text("Sketch1")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
const depthField = page.locator('.k-pm-host .k-section:has-text("Direction 1") input.k-num').first();
const depth0 = await S(() => window.__phlippoStore.getState().featureEdit?.draft.depth);
await depthField.fill('1e300');
await page.waitForTimeout(150);
const depthHuge = await S(() => window.__phlippoStore.getState().featureEdit?.draft.depth);
await depthField.fill('2*25+5');
await page.waitForTimeout(150);
const depthExpr = await S(() => window.__phlippoStore.getState().featureEdit?.draft.depth);
check('a depth of 1e300 is refused (the value stays)', depthHuge === depth0, `${depth0} → ${depthHuge}`);
check('2*25+5 gives a depth of 55', Math.abs(depthExpr - 55) < 1e-9, String(depthExpr));
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().cancelFeature?.());

// ---- F03: a file dropped outside a drop target is ignored (the page does not navigate)
const dropped = await S(() => { const ev = new DragEvent('drop', { cancelable: true, bubbles: true }); document.body.dispatchEvent(ev); const over = new DragEvent('dragover', { cancelable: true, bubbles: true }); document.body.dispatchEvent(over); return ev.defaultPrevented && over.defaultPrevented; });
check('a dropped file never navigates the window', dropped);

// ---- F64: the Tolerance Tree without a scheme says so once, readable
await S(() => window.__phlippoStore.getState().setManagerTab('autoTolerance'));
await page.waitForTimeout(300);
const dxText = await page.locator('[data-testid="dx-empty"]').evaluate((el) => el.parentElement.innerText).catch(skip('qa3.mjs:251', ''));
check('Tolerance Tree without a scheme: no "Auto Dimension Scheme (n …)" next to "No … scheme"', /No tolerance scheme yet/.test(dxText) && !/Auto Dimension Scheme \(\d/.test(dxText), dxText.slice(0, 160));
const wraps = await page.locator('[data-testid="dx-empty"]').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
check('the empty text wraps instead of being cut off', wraps);
await S(() => window.__phlippoStore.getState().setManagerTab('tree'));

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
await browser.close();
