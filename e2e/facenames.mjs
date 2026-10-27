// Face names (QA F47): a fillet on the edge of a step keeps that edge when the tall part of the profile grows and an
// equal edge (same direction, same two face normals) is suddenly nearer to where the old one was. Run on the mesh
// kernel and on the B-rep kernel (exact bodies take the names of their mesh twin).
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

for (const kernel of ['mesh', 'brep']) {
  const url = new URL(process.env.E2E_URL ?? 'http://localhost:4173/');
  if (kernel === 'brep') url.searchParams.set('kernel', 'brep');
  await page.goto(url.href);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
  await page.reload();
  await page.waitForSelector('.k-viewport');
  await page.click('.k-doctype:has-text("Part")');
  await page.waitForTimeout(300);
  const exactNow = () => page.waitForFunction(() => { const r = window.__phlippoStore.getState().rebuild; return !r.pending && r.bodies.length > 0 && r.bodies.every((b) => b.exact); }, null, { timeout: 60_000 });
  const settle = async () => {
    if (kernel === 'brep') await exactNow();
    else await page.waitForTimeout(400);
  };
  await page.evaluate(() => {
    const K = window.__phlippoKit;
    const d = K.createDocument('Trap', 'part');
    let s = K.createSketch('sk1', 'Sketch1', 'front');
    const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 20 }, { x: 0, y: 20 }];
    for (let i = 0; i < c.length; i++) s = K.addLine(s, c[i], c[(i + 1) % c.length])[0];
    d.sketches = { sk1: s };
    d.features = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
      { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
    ];
    window.__phlippoStore.getState().openDocument(d);
  });
  await settle();
  // the sharp edges along Z at (x, y)
  const sharpAt = (x, y) => page.evaluate(([x, y]) => window.__phlippoStore.getState().rebuild.bodies[0].edges.some((e) => e.straight && Math.abs(e.centroid.x - x) < 0.05 && Math.abs(e.centroid.y - y) < 0.05 && Math.abs(e.points[0].z - e.points[e.points.length - 1].z) > 19), [x, y]);
  const ref = await page.evaluate(() => {
    const b = window.__phlippoStore.getState().rebuild.bodies[0];
    const e = b.edges.find((e) => e.straight && Math.abs(e.centroid.x - 30) < 0.05 && Math.abs(e.centroid.y - 20) < 0.05);
    return e ? window.__phlippoKit.edgeRef(e) : null;
  });
  check(`${kernel}: the step edge has the names of its two faces`, ref && Array.isArray(ref.faces) && ref.faces[0] !== ref.faces[1], JSON.stringify(ref?.faces));
  await page.evaluate((ref) => {
    const st = window.__phlippoStore.getState();
    st.applyDocument('Fillet', { ...st.doc, features: [...st.doc.features, { id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 3, edges: [ref] }] });
  }, ref);
  await settle();
  check(`${kernel}: Fillet1 rounds the step edge`, !(await sharpAt(30, 20)) && (await sharpAt(60, 10)));
  // the tall part grows from 20 to 60: the step edge moves 40 up; the other convex edge (60, 10) is now nearer
  await page.evaluate(() => {
    const st = window.__phlippoStore.getState();
    const sk = st.doc.sketches.sk1;
    const points = Object.fromEntries(Object.entries(sk.points).map(([id, p]) => [id, Math.abs(p.y - 20) < 1e-9 ? { ...p, y: 60 } : p]));
    st.applyDocument('Height', { ...st.doc, sketches: { ...st.doc.sketches, sk1: { ...sk, points } } });
  });
  await settle();
  const errs = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors);
  check(`${kernel}: after the edit Fillet1 builds`, Object.keys(errs).length === 0, JSON.stringify(errs));
  check(`${kernel}: the fillet stayed on the step edge (now at height 60)`, !(await sharpAt(30, 60)));
  check(`${kernel}: the nearer equal edge (60, 10) stayed sharp`, await sharpAt(60, 10));
  await page.keyboard.press('f');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/facenames-${kernel}.png` });
}

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
