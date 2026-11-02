// look-dev: the L-block of the beginners' reference part (65 x 62, 30 and 15 thick, 30 deep) in the current design,
// isometric, at 1280 x 720 like the calibration frames -> e2e-out/look-lblock.png, -sel.png (a face selected).
// Prints the grey levels of the top, front and right faces and of the background.
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: process.env.DARK ? 'dark' : 'light' });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate((dark) => { localStorage.clear(); localStorage.setItem('phlippo.theme', dark ? 'dark' : 'light'); }, !!process.env.DARK);
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
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'midPlane', depth: 30, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1500);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(640, 700);
await page.waitForTimeout(1200);
await page.screenshot({ path: (process.env.DARK ? 'e2e-out/look-dark-lblock' : 'e2e-out/look-lblock')+'.png' });
// the same without ambient occlusion, for comparison
await page.evaluate(() => window.__phlippoStore.getState().toggleShow('ambientOcclusion'));
await page.waitForTimeout(1200);
await page.screenshot({ path: (process.env.DARK ? 'e2e-out/look-dark-lblock' : 'e2e-out/look-lblock')+'-noao.png' });
await page.evaluate(() => window.__phlippoStore.getState().toggleShow('ambientOcclusion'));
await page.waitForTimeout(1200);
// a face selected with a real click (the big front face), then the pointer away; and a face under the pointer (hover)
await page.mouse.click(640, 420);
await page.mouse.move(1100, 650);
await page.waitForTimeout(600);
await page.screenshot({ path: (process.env.DARK ? 'e2e-out/look-dark-lblock' : 'e2e-out/look-lblock')+'-sel.png' });
await page.mouse.move(830, 520);
await page.waitForTimeout(600);
await page.screenshot({ path: (process.env.DARK ? 'e2e-out/look-dark-lblock' : 'e2e-out/look-lblock')+'-hover.png' });
console.log(await page.evaluate(() => JSON.stringify(window.__phlippoStore.getState().selectedFace)));
await browser.close();
