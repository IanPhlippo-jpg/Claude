// Assembly Features ▸ Extruded Cut on the door handle: a cutaway (upper half around the spindle) made in the assembly only.
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const vols = () => page.evaluate(() => Object.fromEntries(window.__phlippoStore.getState().rebuild.bodies.map((b) => { let v = 0; const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return [b.id, Math.abs(v)]; })));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
// an assembly sketch on the Top Plane: the region around the handle (x -40..60, z -80..120)
await page.evaluate((d) => {
  const K = window.__phlippoKit;
  let s = K.createSketch('cutsk', 'Sketch1', 'top');
  const c = [[-40, 80], [60, 80], [60, -120], [-40, -120]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  d.sketches = { ...(d.sketches ?? {}), cutsk: s };
  d.features = [...(d.features ?? []), { id: 'ksk', type: 'sketch', name: 'Sketch1', sketchId: 'cutsk', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
}, asm);
await page.waitForTimeout(1500);
const v0 = await vols();
await page.evaluate(() => window.__phlippoStore.getState().setSelectedFeature('ksk'));
await page.click('.k-cm-big:has-text("Assembly Features") .k-cm-main');
await page.waitForTimeout(400);
check('Assembly Features starts Cut-Extrude1 on the assembly sketch', await page.evaluate(() => { const d = window.__phlippoStore.getState().featureEdit?.draft; return d?.type === 'extrude' && d.op === 'cut' && d.sketchId === 'cutsk' && d.name === 'Cut-Extrude1'; }));
await page.evaluate(() => window.__phlippoStore.getState().updateFeatureDraft({ end: 'throughAll', reverse: false }));
await page.mouse.move(5, 900);
await shot('ac1-assembly-cut-pm');
await page.locator('.k-pm-host .k-pm-ok').click();
await page.waitForTimeout(6000);
const v1 = await vols();
const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, names: s.doc.features.map((f) => f.name), partFeatures: s.doc.components.find((c) => c.name === 'Kruk<1>').part.features.length }; });
const cutIds = Object.keys(v1).filter((id) => v0[id] - v1[id] > 1);
check('the cutaway opens the rosettes, levers, spindle and door around the handle (the parts themselves unchanged)', Object.keys(st.errors).length === 0 && cutIds.length >= 5 && st.names.includes('Cut-Extrude1') && st.partFeatures === 9, JSON.stringify({ st, cutIds }));
check('the tree lists Cut-Extrude1 after the mates', (await page.locator('.k-tree-row:has-text("Cut-Extrude1")').count()) === 1);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(800);
await shot('ac2-cutaway');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
