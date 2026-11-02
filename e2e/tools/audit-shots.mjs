// Screenshots of Phlippo in the states of the main calibration recording (1920 x 1080), for side-by-side checks:
// audit-NN-*.png in e2e-out. Usage: E2E_URL=http://127.0.0.1:4173/ node e2e/tools/audit-shots.mjs [names...]
import { chromium } from 'playwright';
const OUT = process.env.E2E_OUT ?? 'e2e-out';
const only = process.argv.slice(2);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
let n = 0;
const shot = async (name) => { n++; if (only.length && !only.includes(name)) return; await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/audit-${String(n).padStart(2, '0')}-${name}.png` }); };
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.mouse.move(1035, 373);
await shot('part-features');
await page.click('.k-cm-tab:has-text("Sketch")');
await shot('part-sketchtab');
// Top Plane selected in the tree, then Sketch: sketch open (normal to)
await page.click('.k-tree-row:has-text("Top Plane")');
await shot('topplane-selected');
await page.click('.k-cm-big:has-text("Sketch")').catch(() => {});
await page.waitForTimeout(900);
await shot('sketch-open');
// Corner rectangle tool: the PM
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
await shot('rect-pm');
const at = (x, y, z = 0) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);
let a = await at(-40, 0, -40), b = await at(40, 0, 40);
await page.mouse.click(a.x, a.y);
await page.mouse.move(b.x, b.y, { steps: 8 });
await shot('rect-drag');
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
await page.mouse.move(1500, 700);
await shot('rect-done');
// circle
await page.evaluate(() => window.__phlippoStore.getState().setTool('circle'));
await shot('circle-pm');
a = await at(0, 0, 0); b = await at(17.5, 0, 0);
await page.mouse.click(a.x, a.y);
await page.mouse.move(b.x, b.y, { steps: 6 });
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
await page.mouse.move(1500, 700);
await shot('circle-done');
// smart dimension on the top edge
await page.evaluate(() => window.__phlippoStore.getState().setTool('dimension'));
a = await at(0, 0, -40);
await page.mouse.click(a.x, a.y);
await page.mouse.move(a.x, a.y - 60, { steps: 4 });
await shot('dim-place');
await page.mouse.click(a.x, a.y - 60);
await shot('dim-modify');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await shot('dim-done');
// Extruded Boss/Base
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss")');
await page.waitForTimeout(800);
await shot('extrude-pm');
await page.click('.k-pm-ok').catch(() => {});
await page.waitForTimeout(800);
await page.mouse.move(1500, 700);
await shot('extruded');
await page.click('.k-cm-big:has-text("Fillet")').catch(() => {});
await page.waitForTimeout(600);
await shot('fillet-pm');
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Boss-Extrude1")', { button: 'right' });
await shot('feature-rmb');
await page.keyboard.press('Escape');
await browser.close();
