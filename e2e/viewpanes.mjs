// Two View / Four View panes (QA 0.5.10 F143, F157): in Four View every extra pane draws the part with the studio
// look (not a dark silhouette) and black edges, on the theme's background; without WebGL the app keeps running and
// every pane says it needs WebGL. Screenshot for the user: e2e-out/viewpanes-four.png (and viewpanes-four-dark.png).
import fs from 'node:fs';
import { chromium } from 'playwright';
import { checks, exitCode, track } from './lib/check.mjs';
const { results, check } = checks();
const URL = process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
fs.mkdirSync('e2e-out', { recursive: true });
const gpuLaunch = process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
const errors = [];

const open = async (browser, w, h, theme = 'light') => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  track(page, errors);
  // a dev server's hot reload (files saved meanwhile) must not reload the page under the test
  await page.routeWebSocket(/./, () => {});
  await page.goto(URL);
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('phlippo.theme', t); }, theme);
  await page.reload();
  await page.waitForSelector('.k-viewport');
  await page.click('.k-doctype:has-text("Part")');
  await page.waitForTimeout(400);
  return page;
};
// a 60 x 40 rectangle on the Top Plane, extruded with the default depth
const boxPart = async (page) => {
  await page.click('.k-cm-tab:has-text("Sketch")');
  await page.click('.k-tree-row:has-text("Top Plane")');
  await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
  const at = (x, z) => page.evaluate(([x, z]) => window.__phlippoProjectWorld(x, 0, z), [x, z]);
  const a = await at(-30, -20), b = await at(30, 20);
  await page.mouse.click(a.x, a.y); await page.mouse.click(b.x, b.y);
  await page.keyboard.press('Escape');
  await page.click('.k-cm-big:has-text("Exit Sketch") .k-cm-main');
  await page.click('.k-cm-tab:has-text("Features")');
  await page.click('.k-cm-big:has-text("Extruded Boss") .k-cm-main');
  await page.waitForTimeout(800);
  await page.click('.k-pm-ok');
  await page.waitForTimeout(800);
};
// what a pane's canvas holds: share of drawn pixels, their mean brightness, and dark (edge) pixels
const paneStats = (page, view) => page.evaluate((view) => {
  const c = document.querySelector(`[data-testid="viewpane-${view}"] canvas`);
  if (!c || !c.width) return null;
  const g = c.getContext('2d');
  if (!g) return { notA2dCanvas: true };
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let drawn = 0, sum = 0, dark = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    drawn++; sum += l;
    if (l < 50) dark++;
  }
  return { w: c.width, h: c.height, drawn, share: +(drawn / (c.width * c.height)).toFixed(3), mean: drawn ? Math.round(sum / drawn) : 0, dark, darkShare: drawn ? +(dark / drawn).toFixed(3) : 0 };
}, view);
// the same numbers from a screenshot of an element (a WebGL canvas cannot be read back after its frame)
const shotStats = async (page, selector) => {
  const b64 = (await page.locator(selector).screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let dark = 0, mid = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (l < 50) dark++; else if (l < 200) mid++;
    }
    return { dark, mid, n: d.length / 4 };
  }, b64);
};
const fourView = async (page) => {
  await page.evaluate(() => window.__phlippoStore.getState().setViewportLayout('four'));
  await page.waitForTimeout(2000);
};

// every extra pane is a viewport of its own (QA 0.5.11 F192): a click selects, the middle button turns that pane
// only, the wheel zooms it; a click on nothing clears the selection; a double click still turns the large view
const paneBox = (page, view) => page.locator(`[data-testid="viewpane-${view}"] canvas`).boundingBox();
const paneCam = (page, view) => page.evaluate((v) => { const c = window.__phlippoPanes?.get(v); return c ? { q: c.rotation.toArray().map((x) => +x.toFixed(4)), scale: +c.scale.toFixed(5) } : null; }, view);
const mainQ = (page) => page.evaluate(() => window.__phlippoCamera.rotation.toArray().map((x) => +x.toFixed(4)));
const sameQ = (a, b) => a && b && a.every((x, i) => Math.abs(x - b[i]) < 1e-3);
const interactive = async (page) => {
  const store = (f) => page.evaluate(f);
  // a click in the middle of the Top pane hits the top face of the box
  const top = await paneBox(page, 'top');
  await store(() => window.__phlippoStore.getState().setSelectedFace(null));
  await page.mouse.click(top.x + top.width / 2, top.y + top.height / 2);
  await page.waitForTimeout(300);
  const sel = await store(() => window.__phlippoStore.getState().selectedFace);
  check('Four View top: a click on the model in the pane selects a face', !!sel?.faceId, JSON.stringify(sel));
  await page.waitForTimeout(300);
  const lit = await paneStats(page, 'top');
  check('Four View top: the pane redraws with the selected face (still drawn)', lit && lit.share > 0.005, JSON.stringify(lit));
  // a click on empty space in the pane clears it
  await page.mouse.click(top.x + top.width - 12, top.y + 12);
  await page.waitForTimeout(300);
  check('Four View top: a click on nothing clears the selection', (await store(() => window.__phlippoStore.getState().selectedFace)) === null);
  // middle drag in the Front pane: that pane turns, the large view does not
  const front = await paneBox(page, 'front');
  const f0 = await paneCam(page, 'front'), m0 = await mainQ(page), s0 = await paneStats(page, 'front');
  const cx = front.x + front.width / 2, cy = front.y + front.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'middle' });
  for (let i = 1; i <= 8; i++) await page.mouse.move(cx + i * 10, cy + i * 6);
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(400);
  const f1 = await paneCam(page, 'front'), m1 = await mainQ(page), s1 = await paneStats(page, 'front');
  check('Four View front: a middle-button drag turns that pane', f0 && f1 && !sameQ(f0.q, f1.q), JSON.stringify({ f0: f0?.q, f1: f1?.q }));
  check('Four View front: ...and not the large view', sameQ(m0, m1), JSON.stringify({ m0, m1 }));
  check('Four View front: the turned pane is drawn anew (other picture, part still there)', s1 && s1.share > 0.005 && JSON.stringify(s0) !== JSON.stringify(s1), JSON.stringify({ s0, s1 }));
  // the wheel zooms the Right pane only
  const right = await paneBox(page, 'right');
  const r0 = await paneCam(page, 'right'), main0 = await page.evaluate(() => window.__phlippoCamera.scale);
  await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(80); }
  await page.waitForTimeout(300);
  const r1 = await paneCam(page, 'right'), main1 = await page.evaluate(() => window.__phlippoCamera.scale);
  check('Four View right: the wheel zooms that pane', r0 && r1 && Math.abs(r1.scale / r0.scale - 1) > 0.2, JSON.stringify({ r0: r0?.scale, r1: r1?.scale }));
  check('Four View right: ...and not the large view', Math.abs(main1 - main0) < 1e-9, JSON.stringify({ main0, main1 }));
  // Ctrl + middle drag pans the Right pane (its view direction stays)
  const t0 = await page.evaluate(() => window.__phlippoPanes.get('right').target.toArray());
  await page.keyboard.down('Control');
  await page.mouse.down({ button: 'middle' });
  for (let i = 1; i <= 5; i++) await page.mouse.move(right.x + right.width / 2 + i * 8, right.y + right.height / 2);
  await page.mouse.up({ button: 'middle' });
  await page.keyboard.up('Control');
  await page.waitForTimeout(300);
  const t1 = await page.evaluate(() => window.__phlippoPanes.get('right').target.toArray()), rq = await paneCam(page, 'right');
  check('Four View right: Ctrl + middle drag pans that pane', Math.hypot(t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2]) > 1 && sameQ(rq.q, r1.q), JSON.stringify({ t0, t1 }));
  // a double click on the Top pane still turns the large view to Top
  await page.mouse.dblclick(top.x + top.width / 2, top.y + top.height / 2);
  await page.waitForTimeout(800);
  const vn = await store(() => window.__phlippoCamera.viewName);
  check('Four View top: a double click turns the large view to Top', vn === 'top', vn);
  await store(() => window.__phlippoStore.getState().setSelectedFace(null));
  await page.screenshot({ path: 'e2e-out/viewpanes-interactive.png' });
};

// 1. with a graphics card (software GL on other platforms): Four View, light and dark theme
let browser = await chromium.launch(gpuLaunch);
for (const theme of ['light', 'dark']) {
  const page = await open(browser, 1600, 1000, theme);
  await boxPart(page);
  const bodies = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.length);
  check(`${theme}: the part has a body`, bodies === 1, String(bodies));
  await fourView(page);
  for (const view of ['front', 'top', 'right']) {
    const s = await paneStats(page, view);
    check(`${theme} Four View ${view}: the part is drawn (studio shading, not a dark silhouette)`, s && s.share > 0.005 && s.mean > 90, JSON.stringify(s));
    check(`${theme} Four View ${view}: black edges around the faces`, s && s.dark > 40 && s.darkShare < 0.35, JSON.stringify(s));
  }
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="viewpane-top"]')).backgroundImage);
  check(`${theme}: the panes have the graphics area's background of the theme`, theme === 'dark' ? /rgb\(48, 48, 48\)/.test(bg) : /rgb\(253, 253, 253\)/.test(bg), bg.slice(0, 90));
  // the panes borrow the large view's renderer: the large view must still show the part with its edges afterwards
  const mb = await page.locator('.k-viewgrid-main .k-viewport').boundingBox();
  await page.mouse.move(mb.x + mb.width * 0.3, mb.y + mb.height * 0.8);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(600);
  const main = await shotStats(page, '.k-viewgrid-main .k-viewport');
  check(`${theme}: the large view still shows the shaded part with its edges`, main.dark > 100 && main.mid > main.n * 0.05, JSON.stringify(main));
  check(`${theme}: no pane error message`, (await page.locator('[data-testid="viewpane-error"], [data-testid="crash"]').count()) === 0);
  await page.screenshot({ path: theme === 'light' ? 'e2e-out/viewpanes-four.png' : 'e2e-out/viewpanes-four-dark.png' });
  if (theme === 'light') await interactive(page);
  // Two View: the pane and the large view split the whole area (Horizontal: one above the other)
  for (const [layout, view] of [['twoH', 'top'], ['twoV', 'front']]) {
    await page.evaluate((l) => window.__phlippoStore.getState().setViewportLayout(l), layout);
    await page.waitForTimeout(1200);
    const r = await page.evaluate((view) => {
      const g = document.querySelector('[data-testid="viewgrid"]').getBoundingClientRect(), p = document.querySelector(`[data-testid="viewpane-${view}"]`).getBoundingClientRect(), m = document.querySelector('.k-viewgrid-main').getBoundingClientRect();
      return { grid: [g.width, g.height].map(Math.round), pane: [p.left - g.left, p.top - g.top, p.width, p.height].map(Math.round), main: [m.left - g.left, m.top - g.top, m.width, m.height].map(Math.round) };
    }, view);
    const ok = layout === 'twoH'
      ? r.pane[2] > r.grid[0] - 4 && r.main[2] > r.grid[0] - 4 && r.main[1] > r.grid[1] / 2 - 4
      : r.pane[3] > r.grid[1] - 4 && r.main[3] > r.grid[1] - 4 && r.main[0] > r.grid[0] / 2 - 4;
    check(`${theme} ${layout}: the ${view} pane and the large view split the whole area`, ok, JSON.stringify(r));
    const s = await paneStats(page, view);
    check(`${theme} ${layout}: the ${view} pane draws the part`, s && s.share > 0.005 && s.mean > 90 && s.dark > 40, JSON.stringify(s));
  }
  await page.close();
}
await browser.close();

// 2. without WebGL: the app stays up, every pane says it needs WebGL
const pwChromium = chromium.executablePath();
const noGL = { args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-webgl'] };
browser = await chromium.launch(fs.existsSync(pwChromium) ? { ...noGL, executablePath: pwChromium } : { ...noGL, ...(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {}) });
const page = await open(browser, 1600, 1000);
const webgl = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'));
check('no-WebGL browser really has no WebGL', !webgl);
await fourView(page);
for (const layout of ['four', 'twoV', 'twoH']) {
  await page.evaluate((l) => window.__phlippoStore.getState().setViewportLayout(l), layout);
  await page.waitForTimeout(500);
  const want = layout === 'four' ? 3 : 1;
  const notes = await page.locator('[data-testid="viewpane-nowebgl"]').evaluateAll((els) => els.filter((e) => e.offsetWidth > 0 && /needs WebGL/.test(e.textContent)).length);
  check(`no WebGL, ${layout}: every pane shows the WebGL message`, notes === want, `${notes}/${want}`);
  check(`no WebGL, ${layout}: no crash dialog, the ribbon and the tree still there`, (await page.locator('[data-testid="crash"]').count()) === 0 && (await page.locator('.k-cm-tab').count()) > 0 && (await page.locator('.k-tree-row').count()) > 0);
}
await page.screenshot({ path: 'e2e-out/viewpanes-nowebgl.png' });
await page.close();
await browser.close();

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' checks passed');
process.exitCode = exitCode(results, errors);
