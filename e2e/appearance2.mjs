// Edit Appearance beyond the colour: Basic / Advanced, the Color/Image, Mapping, Illumination and Surface Finish tabs.
// An image laid on the block by box mapping (its texture coordinates follow the mapping size), transparency and a
// knurled finish reach the face material; Cancel puts everything back.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// a small red / white checker PNG to browse to
const png = (() => {
  const W = 64, raw = Buffer.alloc((W * 3 + 1) * W);
  for (let y = 0; y < W; y++) {
    raw[y * (W * 3 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const red = ((x >> 3) + (y >> 3)) % 2 === 1;
      raw.set(red ? [204, 51, 51] : [255, 255, 255], y * (W * 3 + 1) + 1 + x * 3);
    }
  }
  const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
})();
const pngPath = `${OUT}/checker.png`;
writeFileSync(pngPath, png);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Blok', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -30, y: -20 }, { x: 30, y: -20 }, { x: 30, y: 20 }, { x: -30, y: 20 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sa: a };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
const faceMat = () => page.evaluate(() => {
  const m = window.__phlippoScene?.getObjectByName?.(window.__phlippoStore.getState().rebuild.bodies[0].id)?.material;
  if (!m) return null;
  const uv = window.__phlippoScene.getObjectByName(window.__phlippoStore.getState().rebuild.bodies[0].id).geometry.getAttribute('uv');
  let uMax = 0;
  if (uv) for (let i = 0; i < uv.count; i++) uMax = Math.max(uMax, Math.abs(uv.getX(i)));
  return { map: !!m.map, bump: !!m.bumpMap, opacity: m.opacity, transparent: m.transparent, uMax };
});

await page.evaluate(() => window.__phlippoStore.getState().setDialog('appearance'));
await page.waitForSelector('[data-testid="appearance-dialog"]');
const tabs = async () => (await page.locator('[data-testid="appearance-tabs"] button').allInnerTexts()).join('|');
check('Basic: tabs Color/Image and Mapping', (await tabs()) === 'Color/Image|Mapping', await tabs());
// Color/Image ▸ Browse… an image
const chooser = page.waitForEvent('filechooser');
await page.click('[data-testid="appearance-browse"]');
await (await chooser).setFiles(pngPath);
await page.waitForFunction(() => !!window.__phlippoStore.getState().doc.appearanceProps?.['']?.image);
await page.waitForTimeout(500);
check('the image is the appearance (name in the title, thumbnail)', (await page.locator('[data-testid="appearance-name"]').innerText()) === 'checker.png' && (await page.locator('[data-testid="appearance-image"] img').count()) === 1);
let m = await faceMat();
check('the block shows the image (texture on the face material)', m?.map === true, JSON.stringify(m));
// Mapping ▸ Box, width 20 mm: the 60 mm block spans 1.5 images from its centre
await page.click('[data-testid="appearance-tab-mapping"]');
await page.locator('[data-testid="appearance-map-size"]').fill('20');
await page.waitForTimeout(400);
m = await faceMat();
check('Mapping width 20 mm: texture coordinates in images (30 mm / 20 mm = 1.5)', m && Math.abs(m.uMax - 1.5) < 0.05, JSON.stringify(m));
await page.screenshot({ path: `${OUT}/appearance2-image.png` });
// Advanced: Illumination and Surface Finish
await page.click('[data-testid="appearance-advanced"]');
check('Advanced adds Illumination and Surface Finish', (await tabs()) === 'Color/Image|Mapping|Illumination|Surface Finish', await tabs());
await page.click('[data-testid="appearance-tab-illumination"]');
await page.locator('[data-testid="appearance-transparency"]').fill('0.5');
await page.waitForTimeout(300);
m = await faceMat();
check('Transparent amount 50 %: the faces are see-through', m?.transparent && Math.abs(m.opacity - 0.5) < 0.02, JSON.stringify(m));
await page.click('[data-testid="appearance-tab-finish"]');
await page.click('[data-testid="appearance-finish-knurled"]');
await page.waitForTimeout(300);
m = await faceMat();
check('Surface Finish ▸ Knurled: a bump pattern on the faces', m?.bump === true, JSON.stringify(m));
await page.screenshot({ path: `${OUT}/appearance2-advanced.png` });
// Cancel: back to no appearance
await page.click('[data-testid="appearance-cancel"]');
await page.waitForTimeout(400);
const after = await page.evaluate(() => window.__phlippoStore.getState().doc.appearanceProps);
m = await faceMat();
check('Cancel puts everything back', !after && m && !m.map && !m.bump && m.opacity === 1, JSON.stringify({ after, m }));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
