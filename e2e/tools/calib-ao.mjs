// measures the ambient occlusion in the inside corner of the reference L-block (dev server: window.__phlippoAO is
// changed live). Usage: CFG='{"radius":0.12,"intensity":1}' node e2e/tools/calib-ao.mjs
// Reference (beginners' part, default grey): the vertical face reads 230 away from the corner and about 160 a short
// way above it; the floor face reads 254 far from it and about 134 close to it.
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'front');
  const p = [[0, 0], [65, 0], [65, 15], [30, 15], [30, 62], [0, 62]].map(([x, y]) => ({ x, y }));
  for (let i = 0; i < p.length; i++) sk = K.addLine(sk, p[i], p[(i + 1) % p.length])[0];
  const d = K.createDocument('Part1');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'midPlane', depth: 30, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1500);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(640, 700);
await page.waitForTimeout(800);
// points in world space: on the vertical face (x = 30) 2, 8 and 25 mm above the floor face (y = 15), and on the floor
// face 2, 8 and 25 mm from the vertical face; all half-way in depth (z = 0)
const pts = await page.evaluate(() => {
  const P = window.__phlippoProjectWorld;
  return { wall2: P(30, 17, 0), wall8: P(30, 23, 0), wall25: P(30, 40, 0), floor2: P(32, 15, 0), floor8: P(38, 15, 0), floor25: P(55, 15, 0) };
});
const measure = async (cfg) => {
  await page.evaluate(async (cfg) => { Object.assign(window.__phlippoAO, cfg); window.__phlippoStore.getState().toggleShow('grid'); }, cfg);
  await page.waitForTimeout(1200);
  const buf = await page.screenshot();
  return page.evaluate(async ([b64, pts]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const r = {}; for (const [k, p] of Object.entries(pts)) r[k] = g.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data[0];
    return r;
  }, [buf.toString('base64'), pts]);
};
for (const cfg of process.env.CFG ? [JSON.parse(process.env.CFG)] : [{ radius: 0.06 }, { radius: 0.12 }, { radius: 0.2 }, { radius: 0.12, intensity: 1.5 }]) console.log(JSON.stringify(cfg), JSON.stringify(await measure(cfg)));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
