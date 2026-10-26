// docs/14 step 2: the B-rep kernel in the app. A part is rebuilt by OpenCascade in its worker and the exact bodies
// replace the mesh ones (exact volume, a hole as one cylinder); a selected face stays selected across the swap; a
// fillet stays exact; a shell (no B-rep version yet) falls back to the mesh kernel and the part still builds.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { checks, exitCode, track } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const state = () => S(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, bodies: s.rebuild.bodies.map((b) => ({ id: b.id, exact: !!b.exact, vol: b.exactVolume, closed: b.edges.filter((e) => e.closed).length, straight: b.edges.filter((e) => e.straight).length, faces: b.faces.length })) }; });
const waitExact = (n = 1) => page.waitForFunction((k) => { const b = window.__phlippoStore.getState().rebuild.bodies; return b.length === k && b.every((x) => x.exact); }, n, { timeout: 60000 }).then(() => true, () => false);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); localStorage.setItem('phlippo.kernel', 'brep'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-40, -30], [40, -30], [40, 30], [-40, 30]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 10)[0];
  const d = K.createDocument('Exact');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
const ok1 = await waitExact();
const s1 = await state();
const exact1 = 80 * 60 * 10 - Math.PI * 100 * 10;
check('the plate becomes an exact B-rep body after the rebuild', ok1 && s1.bodies[0].exact, JSON.stringify(s1));
check('its volume is exact', Math.abs(s1.bodies[0].vol - exact1) < 1e-6, String(s1.bodies[0].vol));
check('the hole is one cylinder: 12 straight edges and 2 circular ones', s1.bodies[0].straight === 12 && s1.bodies[0].closed === 2, JSON.stringify(s1.bodies[0]));
await page.screenshot({ path: `${OUT}/brep-plate.png` });

// a face selected on the exact body survives the next swap (the face is found again by its place)
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const top = b.faces.reduce((a, f) => (f.centroid[1] > a.centroid[1] ? f : a));
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: top.id } });
});
const topBefore = await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; return b.faces.find((f) => f.id === s.selectedFace.faceId).centroid; });
// the next rebuild (an edit elsewhere) first shows the mesh, then swaps to the exact body: the face stays selected
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Same', { ...s.doc }); });
await waitExact();
await page.waitForTimeout(200);
const sel = await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = s.selectedFace && b.faces.find((x) => x.id === s.selectedFace.faceId); return f ? f.centroid : null; });
check('a selected face stays the same face when the exact body replaces the mesh', !!sel && Math.abs(sel[1] - topBefore[1]) < 1e-3, JSON.stringify({ sel, topBefore }));

// a fillet on the long top edge: still exact
await S(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const e = b.edges.filter((x) => x.straight && Math.abs(x.centroid.y - 10) < 1e-3).sort((a, c) => c.centroid.x - a.centroid.x)[0];
  s.startRound('fillet');
  window.__phlippoStore.getState().toggleSelectedEdge(e.id);
  window.__phlippoStore.getState().updateFeatureDraft({ size: 3 });
});
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(300);
const ok2 = await page.waitForFunction(() => { const s = window.__phlippoStore.getState(); return s.doc.features.some((f) => f.type === 'fillet') && s.rebuild.bodies.every((b) => b.exact); }, null, { timeout: 60000 }).then(() => true, () => false);
const s2 = await state();
const exact2 = exact1 - (1 - Math.PI / 4) * 9 * 60;
check('Fillet1 is built by the B-rep kernel: exact volume', ok2 && !Object.keys(s2.errors).length && Math.abs(s2.bodies[0].vol - exact2) < 1e-4, JSON.stringify(s2));
await page.screenshot({ path: `${OUT}/brep-fillet.png` });

// Mass Properties uses the exact volume
await S(() => window.__phlippoStore.getState().setDialog('mass'));
await page.waitForTimeout(400);
const massText = await page.locator('.k-mass-dialog').first().evaluate((el) => el.innerText + ' ' + [...el.querySelectorAll('textarea, pre')].map((t) => t.value ?? t.textContent).join(' ')).catch(() => '');
await S(() => window.__phlippoStore.getState().setDialog(null));
const volShown = /Volume\s*=?\s*([\d.,]+)/i.exec(massText);
check('Mass Properties shows the exact volume', !!volShown && Math.abs(parseFloat(volShown[1].replace(/,/g, '')) - exact2) < 0.6, (volShown ?? [''])[0] || massText.replace(/\s+/g, ' ').slice(0, 300));

// a shell with the top face open (B-rep when OpenCascade's offset agrees with the mesh kernel's wall)
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Shell', { ...s.doc, features: [...s.doc.features, { id: 'sh1', type: 'shell', name: 'Shell1', suppressed: false, thickness: 2, faces: [{ normal: [0, 1, 0], point: [0, 10, 20] }] }] }); });
await page.waitForTimeout(2500);
const s3 = await state();
// next to a fillet the B-rep offset and the mesh wall can differ: then the mesh kernel builds it (safety net)
check('Shell1 (top face open) builds without an error', s3.bodies.length === 1 && !s3.errors.sh1, JSON.stringify(s3));
await page.screenshot({ path: `${OUT}/brep-shell.png` });
// a linear pattern has no B-rep version yet: the mesh kernel builds it (fallback), the part stays whole
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('Pattern', { ...s.doc, features: [...s.doc.features, { id: 'lp1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['e1'], dir1: { axis: [1, 0, 0], spacing: 100, count: 2 } }] }); });
await page.waitForTimeout(2500);
const s4 = await state();
check('a linear pattern falls back to the mesh kernel; the bodies are still built', s4.bodies.length >= 1 && s4.bodies.some((b) => !b.exact) && !s4.errors.lp1, JSON.stringify(s4));

// an assembly: the door handle; every part is refined once and the assembly is rebuilt from the exact parts
const asm = readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8');
await page.evaluate((t) => { const d = JSON.parse(t); delete d.format; window.__phlippoStore.getState().openDocument(d); }, asm);
await page.locator('[data-testid="ask-no"]').click({ timeout: 3000 }).catch(() => undefined);
const okAsm = await page.waitForFunction(() => { const s = window.__phlippoStore.getState(); return s.doc.kind === 'assembly' && s.rebuild.bodies.length > 5 && s.rebuild.bodies.every((b) => b.exact); }, null, { timeout: 90000 }).then(() => true, () => false);
const sa = await S(() => { const s = window.__phlippoStore.getState(); return { n: s.rebuild.bodies.length, exact: s.rebuild.bodies.filter((b) => b.exact).length, errors: Object.keys(s.rebuild.errors).length }; });
check('the door handle assembly: every component is an exact body', okAsm && sa.n === sa.exact && !sa.errors, JSON.stringify(sa));
await S(() => window.__phlippoZoomFit?.());
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/brep-deurkruk.png` });

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
