// measures the graphics area's lighting on an isometric box (dev server: the LIGHTING object is changed live)
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-50, -50], [50, -50], [50, 50], [-50, 50]];
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = { ...K.createDocument('Box'), sketches: { s1: s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'midPlane', depth: 100, reverse: false }] };
  window.__phlippoStore.getState().openDocument(d);
  window.__phlippoStore.getState().toggleShow?.('origin');
});
await page.waitForTimeout(600);
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
const faces = await page.evaluate(() => { const P = window.__phlippoProjectWorld; return { top: P(10, 50, 10), left: P(10, 10, 50), right: P(50, 10, 10) }; });
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const measure = async (cfg) => {
  await page.evaluate(async (cfg) => {
    const L = window.__phlippoLighting;
    Object.assign(L.key, cfg.key); Object.assign(L.fill, cfg.fill ?? { intensity: 0 }); L.ambient = cfg.ambient;
    const S = window.__phlippoStore; S.getState().toggleShow('grid');
  }, cfg);
  await page.waitForTimeout(250);
  const buf = await page.screenshot();
  const out = await page.evaluate(async ([b64, faces]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const r = {}; for (const [k, p] of Object.entries(faces)) r[k] = g.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data[0];
    return r;
  }, [buf.toString('base64'), faces]);
  return out;
};
if (process.env.CFG) { console.log(JSON.stringify(await measure(JSON.parse(process.env.CFG)))); }
else {
  const amb = await measure({ key: { intensity: 0 }, ambient: 1 });
  const key = await measure({ key: { intensity: 1, dir: [0, 0, 1] }, ambient: 0 });
  console.log('ambient=1:', JSON.stringify(amb), 'linear', lin(amb.top).toFixed(4));
  console.log('key=1 along view:', JSON.stringify(key), 'linear', Object.values(key).map((v) => lin(v).toFixed(4)).join(' '));
  console.log('faces px', JSON.stringify(faces));
}
await browser.close();
