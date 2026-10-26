// Replays the reference video's BasePlate tutorial (1920 x 1080, like the frames) and takes a screenshot at each moment
// that has a reference frame: e2e-out/tut/NNNN.png next to referentie-video/frames/f_NNNN.jpg.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('e2e-out/tut', { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: `e2e-out/tut/${String(n).padStart(4, '0')}.png` }); };
await page.click('.k-doctype:has-text("Part")');
await page.mouse.move(1000, 600);
await shot(17);
// Sketch ▸ pick the Top Plane
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
await shot(50);
await page.click('.k-flyout-toggle');
await page.click('.k-flyout-body .k-tree-row:has-text("Top Plane")');
await page.waitForTimeout(900);
await shot(57);
// Corner Rectangle from the origin, dragging
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
await page.waitForTimeout(200);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
let p = await P(0, 0);
await page.mouse.move(p.x + 40, p.y - 30);
await shot(65);
await page.mouse.move(p.x, p.y, { steps: 4 });
await shot(66);
await page.mouse.click(p.x, p.y);
const q = await P(77, 39);
await page.mouse.move(q.x, q.y, { steps: 6 });
await shot(67);
await page.mouse.click(q.x, q.y);
await page.mouse.move(q.x + 120, q.y + 60);
await shot(69);
await page.keyboard.press('Escape');
await page.mouse.move(1500, 800);
await shot(72);
// Smart Dimension on the bottom line
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.waitForTimeout(200);
const b1 = await P(38, 0);
await page.mouse.move(b1.x, b1.y);
await shot(75);
await page.mouse.click(b1.x, b1.y);
await page.mouse.move(b1.x, b1.y + 60, { steps: 4 });
await shot(76);
await page.mouse.click(b1.x, b1.y + 60);
await page.waitForTimeout(300);
await shot(77);
await page.keyboard.type('80');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await shot(78);
// the left line
const l1 = await P(0, 20);
await page.mouse.click(l1.x, l1.y);
await page.mouse.click(l1.x - 60, l1.y);
await page.waitForTimeout(300);
await page.keyboard.type('80');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('f');
await page.mouse.move(1500, 850);
await shot(85);
// hover the shaded region (the contour lights up)
const mid = await P(40, 40);
await page.mouse.move(mid.x, mid.y);
await shot(86);
// Circle from the middle, dragging
await page.evaluate(() => window.__phlippoStore.getState().setTool('circle'));
await page.waitForTimeout(200);
await page.mouse.click(mid.x, mid.y);
const r = await P(52, 32);
await page.mouse.move(r.x, r.y, { steps: 5 });
await shot(90);
await page.mouse.click(r.x, r.y);
await page.waitForTimeout(300);
await shot(91);
await page.keyboard.press('Escape');
// dimension the circle: Ø35
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
const ce = await P(40 + 14.4, 40);
await page.mouse.click(ce.x, ce.y);
await page.mouse.click(ce.x + 120, ce.y - 80);
await page.waitForTimeout(300);
await shot(93);
await page.keyboard.type('35');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.mouse.move(1500, 850);
await shot(96);
// Extruded Boss/Base, 10 mm
await page.click('.k-cm-tab:has-text("Features")');
await page.hover('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(900);
await shot(105);
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(1200);
await page.mouse.move(1500, 850);
await shot(107);
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
await page.mouse.move(1500, 850);
await shot(116);
// hover the top face: its outline lights up and the feature name shows (frame 170)
{ const tp = await page.evaluate(() => window.__phlippoProjectWorld(66, 10, -66)); await page.mouse.move(tp.x, tp.y); await page.mouse.move(tp.x + 2, tp.y + 1); }
await shot(170);
// Fillet R10 on a vertical edge
await page.hover('.k-cm-big:has-text("Fillet") .k-cm-main');
await page.waitForTimeout(900);
await shot(120);
await page.click('.k-cm-big:has-text("Fillet") .k-cm-main');
await page.waitForTimeout(500);
await shot(122);
const edge = await page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; const e = b.edges.find((x) => x.straight && Math.abs(x.length - 10) < 1e-3 && x.centroid.x > 70 && x.centroid.z > 70) ?? b.edges.find((x) => x.straight && Math.abs(x.length - 10) < 1e-3); return { id: e.id, p: window.__phlippoProjectWorld(e.centroid.x, e.centroid.y, e.centroid.z) }; });
await page.mouse.move(edge.p.x, edge.p.y);
await shot(123);
await page.evaluate((id) => window.__phlippoStore.getState().toggleSelectedEdge(id, false), edge.id);
await page.waitForTimeout(800);
await shot(124);
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
await page.mouse.move(1500, 850);
await shot(131);
console.log('errors', errors);
await browser.close();
