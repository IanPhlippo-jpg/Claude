// Look-dev for the default part look (studioLook.ts): a box like the one of the 2025 reference frame (01/0062),
// isometric at 1920 x 1080, next to that frame -> e2e-out/studio-compare.png. Lighting and studio settings can be set
// live: CFG='{"studio":{"metalness":0.4},"light":{"ambient":0.3}}' node e2e/tools/calib-studio.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-55, -30], [55, -30], [55, 30], [-55, 30]].map(([x, y]) => ({ x, y }));
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, c[i], c[(i + 1) % 4])[0];
  const d = K.createDocument('Box'); d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1500);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(1800, 1000);
if (process.env.CFG) await page.evaluate((cfg) => { Object.assign(window.__phlippoStudio, cfg.studio ?? {}); const L = window.__phlippoLighting; if (cfg.light) { if (cfg.light.ambient !== undefined) L.ambient = cfg.light.ambient; Object.assign(L.key, cfg.light.key ?? {}); } window.__phlippoStore.getState().toggleShow('grid'); }, JSON.parse(process.env.CFG));
if (process.env.NOAO) await page.evaluate(() => window.__phlippoStore.getState().toggleShow('ambientOcclusion'));
if (process.env.NOREFLECT) await page.evaluate(() => window.__phlippoStore.getState().setScene({ floorReflections: false }));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'e2e-out/studio-box.png' });
// grey levels inside each face (a grid of points, world coordinates) -> min / mean / max, to set beside the reference
const faces = await page.evaluate(() => {
  const P = window.__phlippoProjectWorld, out = { top: [], front: [], right: [] };
  for (let i = 1; i < 10; i++) for (let j = 1; j < 4; j++) {
    out.top.push(P(-55 + i * 11, 20, -30 + j * 15));
    out.front.push(P(-55 + i * 11, j * 5, 30));
    out.right.push(P(55, j * 5, -30 + i * 6));
  }
  return out;
});
const buf = await page.screenshot();
const stats = await page.evaluate(async ([b64, faces]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const r = {};
  for (const [k, pts] of Object.entries(faces)) {
    const v = pts.map((p) => g.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data[0]);
    r[k] = [Math.min(...v), Math.round(v.reduce((s, x) => s + x, 0) / v.length), Math.max(...v)];
  }
  return r;
}, [buf.toString('base64'), faces]);
console.log('faces [min, mean, max]:', JSON.stringify(stats), '| reference: top [138, 195, 240], front [109, 135, 169], right [160, 165, 187]');
console.log(errors.length ? 'errors ' + errors.slice(0, 3) : 'ok');
await browser.close();
// side by side with the reference box (python is used for the image work, as elsewhere in the look tools)
execFileSync('python', ['-c', `
from PIL import Image
ref=Image.open('referentie-video/playlist/01/frames/0062.jpg').crop((600,140,1080,470)).resize((720,495))
ours=Image.open('e2e-out/studio-box.png')
w,h=ours.size
ours=ours.crop((int(w*0.3),int(h*0.22),int(w*0.82),int(h*0.78)))
ours.thumbnail((720,495))
s=Image.new('RGB',(1460,500),'white'); s.paste(ref,(0,0)); s.paste(ours,(740,0)); s.save('e2e-out/studio-compare.png')
`]);
