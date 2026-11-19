// Section View cap (0.5.14): the section of the fan housing of the extractor (Bureau.kcad, component a4, Right Plane,
// offset 0, cap on, Control+4) showed a diagonal wedge: cap over the hollow inside on one side of a line from bottom
// left to top right. Cause: the mesh is not watertight, the cut segments did not close into loops and the triangulator
// closed each open chain with a straight line. The check samples pixels with a red cap colour: the material on both
// sides of the former diagonal is red, the hollow inside and the cable groove in the hub are not.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { exitCode } from './lib/check.mjs';
import { settle } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_|GPU stall|swiftshader|favicon|Failed to load resource/i.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// the fan housing alone, in the place it has in the desk (world coordinates of the bug)
const doc = JSON.parse(readFileSync('voorbeelden/bureau/Bureau.kcad', 'utf8'));
doc.components = doc.components.filter((c) => c.id === 'a4');
doc.mates = [];
await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), doc);
await page.waitForFunction(() => window.__phlippoStore.getState().rebuild.bodies.length > 0, null, { timeout: 300000 });
await page.evaluate(() => window.__phlippoStore.setState({ sectionView: { plane: 'right', offset: 0, flip: false, cap: true, capColor: '#ff0000' } }));
await page.waitForFunction(() => { let n = 0; window.__phlippoScene.traverse((o) => { if (o.isMesh && /~cap$/.test(o.name)) n++; }); return n > 0; }, null, { timeout: 120000 });
await page.keyboard.press('Control+4');
await settle(page);
await page.keyboard.press('f');
await page.mouse.move(5, 5);
await settle(page);
await page.waitForTimeout(800); // fixed: the zoom-to-fit animation and the light before the pixels are read

// world points on the section plane (x = 0): material (bottom slab, the two walls) and hollow (inside, cable groove)
const P = {
  'bottom slab left': [601.5, -40], 'bottom slab right': [601.5, 40], 'wall z -94': [660, -94], 'wall z +94': [660, 94],
  'hollow z +40': [640, 40], 'hollow z -50': [665, -50], 'hollow, centre': [630, 0], 'cable groove in the hub': [607.5, -7.6],
};
const png = await page.screenshot({ path: `${OUT}/sectioncap.png` });
const px = await page.evaluate(async ({ data, pts }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + data;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const out = {};
  for (const [k, [y, z]] of Object.entries(pts)) {
    const q = window.__phlippoProjectWorld(0, y, z);
    const d = g.getImageData(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3).data;
    let r = 0, gr = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
    out[k] = { at: [Math.round(q.x), Math.round(q.y)], rgb: [r / 9, gr / 9, b / 9].map(Math.round) };
  }
  return out;
}, { data: png.toString('base64'), pts: P });
const red = ({ rgb: [r, g, b] }) => r - Math.max(g, b) > 80;
for (const k of ['bottom slab left', 'bottom slab right', 'wall z -94', 'wall z +94']) check(`cap over the material: ${k}`, red(px[k]), JSON.stringify(px[k]));
for (const k of ['hollow z +40', 'hollow z -50', 'hollow, centre', 'cable groove in the hub']) check(`no cap over the hollow: ${k}`, !red(px[k]), JSON.stringify(px[k]));
// one flat colour: the cap is lit the same everywhere (no dark and light half)
const caps = ['bottom slab left', 'bottom slab right', 'wall z -94', 'wall z +94'].map((k) => px[k].rgb);
const spread = Math.max(...[0, 1, 2].map((i) => Math.max(...caps.map((c) => c[i])) - Math.min(...caps.map((c) => c[i]))));
check('the cap is one flat colour (spread <= 12 per channel)', spread <= 12, JSON.stringify(caps));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
