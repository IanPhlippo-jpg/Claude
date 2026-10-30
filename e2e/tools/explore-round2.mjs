// Exploratory screens after the 1:1 pass: dark theme, four-view layout, collapsed ribbon, a narrow window, a drawing,
// with every page error and console error collected -> e2e-out/explore-*.png
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const errors = [];
const open = async (w, h, theme = 'light') => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(`${w}x${h} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${w}x${h} ${m.type()}: ${m.text()}`); });
  await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
  await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('phlippo.theme', t); }, theme);
  await page.reload();
  await page.waitForSelector('.k-viewport');
  await page.click('.k-doctype:has-text("Part")');
  await page.waitForTimeout(400);
  return page;
};
const sketchRect = async (page) => {
  await page.click('.k-cm-tab:has-text("Sketch")');
  await page.click('.k-tree-row:has-text("Top Plane")');
  await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
  const at = (x, z) => page.evaluate(([x, z]) => window.__phlippoProjectWorld(x, 0, z), [x, z]);
  const a = await at(-30, -20), b = await at(30, 20);
  await page.mouse.click(a.x, a.y); await page.mouse.click(b.x, b.y);
  await page.keyboard.press('Escape');
};
// 1. dark theme, sketch
let page = await open(1920, 1080, 'dark');
await sketchRect(page);
await page.screenshot({ path: 'e2e-out/explore-dark-sketch.png' });
await page.click('.k-cm-big:has-text("Exit Sketch") .k-cm-main');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss") .k-cm-main');
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/explore-dark-extrude.png' });
await page.close();
// 2. four views
page = await open(1920, 1080);
await page.evaluate(() => window.__phlippoStore.getState().setViewportLayout('four'));
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/explore-four.png' });
// 3. collapsed ribbon
await page.evaluate(() => window.__phlippoStore.getState().setViewportLayout('single'));
await page.click('[data-tip="Collapse Command Ribbon"]');
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-out/explore-collapsed.png' });
const tabClick = await page.locator('.k-cm-tab:has-text("Sketch")').click({ timeout: 3000 }).then(() => 'ok').catch((e) => e.message.split('\n')[0]);
console.log('tab click with collapsed ribbon:', tabClick);
await page.close();
// 4. narrow window
page = await open(1024, 700);
await page.screenshot({ path: 'e2e-out/explore-narrow.png' });
const hud = await page.evaluate(() => { const h = document.querySelector('.k-hud')?.getBoundingClientRect(); const t = [...document.querySelectorAll('.k-cm-tab')].pop()?.getBoundingClientRect(); const v = document.querySelector('.k-view-controls, .k-winctl, .k-viewport-winbtns')?.getBoundingClientRect(); return { hud: h && [h.left, h.top, h.right, h.bottom], tabsRight: t?.right, tabsBottom: t?.bottom, winbtns: v && [v.left, v.top] }; });
console.log('narrow layout', JSON.stringify(hud));
await sketchRect(page);
await page.screenshot({ path: 'e2e-out/explore-narrow-sketch.png' });
await page.close();
console.log('errors:', errors.length ? '\n' + [...new Set(errors)].join('\n') : 'none');
await browser.close();
