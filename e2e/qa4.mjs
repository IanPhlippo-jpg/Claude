// QA report v0.3.4 fixes: Ctrl+N during Edit Component asks to save (F74/F41), half-valid files are refused (F80),
// rebuild errors are visible (What's Wrong, the marker inside the tree pane, the status bar) and Save asks first (F78,
// F40), refused or adjusted values are explained (F81), the pattern limit is said, Linear Pattern is grey without a body
// (F14), the beam estimate shows no safety colour (F56), Final Render keeps the selection out of the image (F79).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track, skip } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// ---- F14: Linear Pattern (and its flyout) is grey in an empty part
check('empty part: Linear Pattern greyed (F14)', await page.locator('.k-cm-big:has-text("Linear Pattern") .k-cm-main').evaluate((el) => el.disabled || !!el.closest('[disabled]') || el.classList.contains('disabled')));

// a block with a hole for the next steps
const block = () => S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  return d;
});

// ---- F80: half-valid files are refused with a message, the open document stays
const refused = await S((d) => {
  const st = window.__phlippoStore.getState();
  st.openDocument(d);
  const tries = {
    badEntity: () => { const x = structuredClone(d); const line = Object.values(x.sketches.s1.entities).find((e) => e.kind === 'line'); line.p1 = 'nope'; return x; },
    unknownFeature: () => { const x = structuredClone(d); x.features[1].type = 'bogusFeature'; return x; },
    depthHuge: () => { const x = structuredClone(d); x.features[1].depth = 1e11; return x; },
    depthNegative: () => { const x = structuredClone(d); x.features[1].depth = -5; return x; },
    missingSketch: () => { const x = structuredClone(d); x.features[1].sketchId = 'gone'; return x; },
  };
  const out = {};
  for (const [k, make] of Object.entries(tries)) {
    const doc = make(); doc.name = 'Kapot-' + k;
    window.__phlippoStore.getState().openDocument(doc);
    const s = window.__phlippoStore.getState();
    out[k] = { stillBlok: s.doc.name === 'Blok', msg: (s.messages ?? []).slice(-1)[0]?.text ?? '' };
  }
  return out;
}, await block());
check('a dangling point, unknown type, depth 1e11 / -5 or missing sketch is refused (F80)', Object.values(refused).every((r) => r.stillBlok && /Cannot open/.test(r.msg)), JSON.stringify(refused));
check('the refusal names the problem', /point that does not exist/.test(refused.badEntity.msg) && /unknown type/.test(refused.unknownFeature.msg) && /outside 0/.test(refused.depthHuge.msg) && /sketch that does not exist/.test(refused.missingSketch.msg), JSON.stringify(refused));

// ---- F78: a model with rebuild errors opens with What's Wrong; the marker sits inside the tree pane
await S(() => {
  const st = window.__phlippoStore.getState();
  const d = structuredClone(st.doc);
  d.name = 'Met fouten';
  // a cut through nothing: valid file, but the feature cannot be rebuilt
  d.sketches.s2 = window.__phlippoKit.addCircle(window.__phlippoKit.createSketch('s2', 'Sketch2', 'front'), { x: 500, y: 500 }, 3)[0];
  d.features.push({ id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'c1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'blind', depth: 5, reverse: false });
  st.openDocument(d);
});
await page.waitForTimeout(500);
const errs = await S(() => Object.keys(window.__phlippoStore.getState().rebuild.errors));
check("a model with rebuild errors opens with What's Wrong (F78)", errs.length > 0 && (await page.locator('[data-testid="whats-wrong"]').count()) === 1 && /Cut-Extrude1/.test(await page.locator('[data-testid="whats-wrong-list"]').innerText()), JSON.stringify(errs));
const marker = await page.locator('[data-testid="tree-error"]').first().evaluate((el) => { const r = el.getBoundingClientRect(); const pane = el.closest('.k-panel-body, .k-manager, .k-tree')?.parentElement?.getBoundingClientRect(); const tree = document.querySelector('.k-tree')?.closest('[class*="k-"]')?.getBoundingClientRect(); return { right: r.right, paneRight: Math.min(pane?.right ?? 9999, document.querySelector('.k-viewport').getBoundingClientRect().left) }; }).catch(skip('qa4.mjs:76', null));
check('the error marker of the feature is visible inside the tree pane (F78)', marker && marker.right <= marker.paneRight + 1, JSON.stringify(marker));
check('the status bar says the model has rebuild errors', /rebuild error/.test(await page.locator('[data-testid="status-errors"]').innerText().catch(skip('qa4.mjs:78', ''))));
await shot('qa4-f78-whatswrong');
await page.locator('[data-testid="whats-wrong"] .k-btn:has-text("Close")').click();
// ---- F40: saving a model with rebuild errors asks first
await S(() => window.__phlippoStore.setState({ dirty: true }));
await page.mouse.click(1000, 600);
await page.keyboard.press('Control+s');
await page.waitForTimeout(300);
check('Save of a model with rebuild errors asks first (F40)', /could not be rebuilt/.test(await page.locator('[data-testid="ask"]').innerText().catch(skip('qa4.mjs:86', ''))));
await page.locator('[data-testid="ask"] .k-btn:has-text("Cancel")').click().catch(skip('qa4: cancel save'));
await S(() => window.__phlippoStore.setState({ dirty: false }));

// ---- F74 / F41: Ctrl+N during Edit Component asks to save the assembly
const part = await block();
await S((part) => {
  const K = window.__phlippoKit;
  const asm = K.createDocument('Assem1', 'assembly');
  asm.components = [{ id: 'c1', name: 'Blok<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }, { id: 'c2', name: 'Blok<2>', part, position: [80, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false }];
  asm.mates = [];
  window.__phlippoStore.getState().openDocument(asm);
}, part);
await page.waitForTimeout(500);
await S(() => window.__phlippoStore.getState().setComponentHidden('c2', true)); // an unsaved change in the assembly
await S(() => window.__phlippoStore.getState().editComponent('c1'));
await page.waitForTimeout(400);
await page.mouse.click(1000, 600);
await page.keyboard.press('Control+n');
await page.waitForTimeout(300);
const ask74 = await page.locator('[data-testid="ask"]').innerText().catch(skip('qa4.mjs:106', ''));
check('Ctrl+N during Edit Component asks to save the assembly (F74)', /being edited in Assem1/.test(ask74) && /save/i.test(ask74), ask74.slice(0, 120));
await page.locator('[data-testid="ask-cancel"]').click();
check('Cancel keeps the component edit open', await S(() => !!window.__phlippoStore.getState().editContext));
await S(() => window.__phlippoStore.getState().returnToAssembly());
await page.waitForTimeout(300);
await S(() => window.__phlippoStore.setState({ dirty: false }));

// ---- F81: refused and adjusted values are explained
await S(() => window.__phlippoStore.getState().openDocument(window.__phlippoKit.createDocument('Leeg')));
await S((d) => window.__phlippoStore.getState().openDocument(d), await block());
await page.waitForTimeout(400);
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-tree-row:has-text("Boss-Extrude1")');
await S(() => window.__phlippoStore.getState().editFeature?.('e1'));
await page.waitForTimeout(300);
const depth = page.locator('.k-pm-host .k-section:has-text("Direction 1") input.k-num').first();
if (await depth.count()) {
  await depth.fill('1e7');
  await depth.blur();
  await page.waitForTimeout(150);
  check('a depth of 1e7 is refused with a note (F81)', /Refused/.test(await page.locator('[data-testid="num-note"]').first().innerText().catch(skip('qa4.mjs:127', ''))));
  await depth.fill('-5');
  await depth.blur();
  await page.waitForTimeout(150);
  check('a depth of -5 is adjusted with a note (F81)', /Adjusted to/.test(await page.locator('[data-testid="num-note"]').first().innerText().catch(skip('qa4.mjs:131', ''))));
  await shot('qa4-f81-note');
  await S(() => window.__phlippoStore.getState().cancelFeature());
} else check('the Extrude panel opens for editing', false);
// pattern limit
await S(() => { const s = window.__phlippoStore.getState(); window.__phlippoStore.setState({ selectedFeatureId: 'e1' }); s.startPattern('linearPattern'); s.updateFeatureDraft({ featureIds: ['e1'], dir1: { axis: [1, 0, 0], spacing: 70, count: 20 }, dir2: { axis: [0, 0, 1], spacing: 50, count: 20 } }); });
await page.waitForTimeout(300);
check('more than 250 instances: the pattern panel says so (F81)', /maximum is 250/.test(await page.locator('[data-testid="pattern-limit"]').innerText().catch(skip('qa4.mjs:138', ''))));
await S(() => window.__phlippoStore.getState().cancelFeature());

// ---- F79: Final Render restores the selection and does not keep it in the image state
await S(() => { const st = window.__phlippoStore.getState(); const b = st.rebuild.bodies[0]; st.setSelectedFace({ bodyId: b.id, faceId: b.faces[0].id }); });
await page.click('.k-cm-tab:has-text("Render Tools")');
let selDuring = null;
const watch = S(() => new Promise((res) => { const un = window.__phlippoStore.subscribe((s) => { if (!s.selectedFace) { un(); res(true); } }); setTimeout(() => { un(); res(false); }, 8000); }));
await page.click('.k-cm-big:has-text("Final Render") .k-cm-main');
selDuring = await watch;
await page.waitForSelector('[data-testid="final-image"]', { timeout: 15000 }).catch(skip('qa4: final image'));
check('Final Render clears the selection highlight while rendering (F79)', selDuring === true);
check('and puts the selection back afterwards', await S(() => !!window.__phlippoStore.getState().selectedFace));

console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exitCode = exitCode(results, errors);
await browser.close();
