// GPU memory over a long session (QA F01, F86): 75 feature edits and 10 New/Open cycles keep the renderer's
// geometries, textures and shader programs flat. A leak shows as steady growth.
import { chromium } from 'playwright';
import { checks, exitCode, track } from './lib/check.mjs';

const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

const openBlock = () => S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 8)[0];
  const d = K.createDocument('Lek');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
const mem = () => S(() => { const i = window.__phlippoRenderer.info; return { geometries: i.memory.geometries, textures: i.memory.textures, programs: (i.programs ?? []).length }; });

await openBlock();
await page.waitForTimeout(800);
// warm-up: the first edits create the shared materials and programs
for (let k = 0; k < 5; k++) { await S((d) => { const st = window.__phlippoStore.getState(); st.applyDocument('Depth', { ...st.doc, features: st.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: d } : f)) }); }, 10 + k); await page.waitForTimeout(60); }
await page.waitForTimeout(400);
const m0 = await mem();
for (let k = 0; k < 75; k++) {
  await S((d) => { const st = window.__phlippoStore.getState(); st.applyDocument('Depth', { ...st.doc, features: st.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: d } : f)) }); }, 12 + (k % 9));
  await page.waitForTimeout(40);
}
await page.waitForTimeout(500);
const m1 = await mem();
check('75 feature edits keep the GPU geometries flat', m1.geometries <= m0.geometries + 2, `${JSON.stringify(m0)} -> ${JSON.stringify(m1)}`);
check('75 feature edits keep the textures and programs flat', m1.textures <= m0.textures + 1 && m1.programs <= m0.programs + 2, `${JSON.stringify(m0)} -> ${JSON.stringify(m1)}`);
for (let k = 0; k < 10; k++) {
  await S(() => window.__phlippoStore.getState().openDocument(window.__phlippoKit.createDocument('Leeg')));
  await page.waitForTimeout(150);
  await openBlock();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(500);
const m2 = await mem();
check('10 New/Open cycles keep the GPU memory flat', m2.geometries <= m0.geometries + 2 && m2.textures <= m0.textures + 1 && m2.programs <= m0.programs + 2, `${JSON.stringify(m0)} -> ${JSON.stringify(m2)}`);
console.log('memory', JSON.stringify({ start: m0, edits: m1, newOpen: m2 }));
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
await browser.close();
