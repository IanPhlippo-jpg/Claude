// look-dev: renders the BasePlate (80x80x10, hole 35) in Trimetric under several lighting candidates and prints where
// the three visible faces sit on screen, so the colours can be sampled against calibration frame 0118.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -40, y: -40 }, { x: 40, y: -40 })[0];
  sk = K.addLine(sk, { x: 40, y: -40 }, { x: 40, y: 40 })[0];
  sk = K.addLine(sk, { x: 40, y: 40 }, { x: -40, y: 40 })[0];
  sk = K.addLine(sk, { x: -40, y: 40 }, { x: -40, y: -40 })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 17.5)[0];
  const d = K.createDocument('BasePlate');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(400);
// sample points: top face (away from the hole), +z face, +x face
const pts = await page.evaluate(() => ({ top: window.__phlippoProjectWorld(-28, 10, 28), front: window.__phlippoProjectWorld(-20, 5, 40), right: window.__phlippoProjectWorld(40, 5, -20), topB: window.__phlippoProjectWorld(28, 10, -28) }));
const candidates = JSON.parse(process.env.CANDIDATES ?? '[{"name":"current"}]');
const out = { pts, shots: [] };
for (const c of candidates) {
  await page.evaluate((c) => {
    const L = window.__phlippoLighting;
    if (c.key) L.key.intensity = c.key;
    if (c.dir) L.key.dir = c.dir;
    if (c.ambient !== undefined) L.ambient = c.ambient;
    if (c.fill !== undefined) L.fill.intensity = c.fill;
    if (c.fillDir) L.fill.dir = c.fillDir;
    if (c.base) window.__phlippoBodyScene.faceMat.color.set(c.base);
    if (c.spec !== undefined) window.__phlippoBodyScene.faceMat.specular.set(c.spec);
    if (c.shin !== undefined) window.__phlippoBodyScene.faceMat.shininess = c.shin;
    window.__phlippoCamera.update();
  }, c);
  await page.waitForTimeout(250);
  const file = `e2e-out/tune-${c.name}.png`;
  await page.screenshot({ path: file });
  out.shots.push({ name: c.name, file });
}
writeFileSync('e2e-out/tune-light.json', JSON.stringify(out));
console.log(JSON.stringify(pts));
await browser.close();
