// Test round after the 1:1 pass (0.5.9 -> 0.5.10): Exit Sketch keeps the sketch selected for Extruded Boss/Base, the
// tab strip stays see-through in the dark theme, the heads-up toolbar drops below the tabs in a narrow window, the
// rectangle Parameters show 0.00, a feature right-click has its header and no doubled items.
import { chromium } from 'playwright';
import { checks, exitCode } from './lib/check.mjs';
const { results, check } = checks();
const URL = process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const open = async (w, h, theme = 'light') => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
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
};
const drawRect = async (page) => {
  const at = (x, z) => page.evaluate(([x, z]) => window.__phlippoProjectWorld(x, 0, z), [x, z]);
  const a = await at(-30, -20), b = await at(30, 20);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await page.keyboard.press('Escape');
};

let page = await open(1920, 1080, 'dark');
await sketchRect(page);
const zeros = await page.locator('.k-pm-ptrow input').evaluateAll((els) => els.map((e) => e.value));
check('rectangle Parameters before drawing: 8 rows showing 0.00', zeros.length === 8 && zeros.every((v) => v === '0.00'), JSON.stringify(zeros));
await drawRect(page);
await page.click('.k-cm-big:has-text("Exit Sketch") .k-cm-main');
await page.waitForTimeout(300);
const sel = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return s.doc.features.find((f) => f.id === s.selectedFeatureId)?.name ?? null; });
check('Exit Sketch leaves the sketch selected', sel === 'Sketch1', String(sel));
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss") .k-cm-main');
await page.waitForTimeout(800);
const draft = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const d = s.featureEdit?.draft; return d ? { type: d.type, sketch: s.doc.sketches[d.sketchId]?.name ?? null } : null; });
check('Extruded Boss/Base right after Exit Sketch takes that sketch', draft?.type === 'extrude' && draft.sketch === 'Sketch1', JSON.stringify(draft));
const darkStrip = await page.evaluate(() => {
  const strip = getComputedStyle(document.querySelector('.k-cm-tabs')).backgroundColor;
  const h = document.querySelector('.k-hud').getBoundingClientRect();
  const hit = document.elementFromPoint(h.left + 12, h.top + h.height / 2);
  return { strip, onHud: !!hit?.closest('.k-hud') };
});
check('dark theme: the tab strip is see-through and the heads-up toolbar can be clicked', /rgba\(0, 0, 0, 0\)|transparent/.test(darkStrip.strip) && darkStrip.onHud, JSON.stringify(darkStrip));
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
// feature right-click: toolbar with Edit Feature, menu with the header and Configure Feature once
await page.click('.k-tree-row:has-text("Boss-Extrude1")', { button: 'right' });
await page.waitForTimeout(200);
const menu = await page.locator('.k-menu .k-menu-item, .k-menu .k-menu-header').allTextContents();
check('feature right-click: header "Feature (Boss-Extrude1)", Configure Feature once, Edit Feature on the toolbar', menu.some((t) => t.includes('Feature (Boss-Extrude1)')) && menu.filter((t) => t.includes('Configure Feature')).length === 1 && (await page.locator('[data-testid="ctx-edit-feature"]').count()) === 1, JSON.stringify(menu));
await page.keyboard.press('Escape');
await page.close();

page = await open(1024, 700);
const lay = await page.evaluate(() => {
  const h = document.querySelector('.k-hud').getBoundingClientRect();
  const t = [...document.querySelectorAll('.k-cm-tab')].pop().getBoundingClientRect();
  return { hudTop: h.top, hudLeft: h.left, tabsRight: t.right, tabsBottom: t.bottom };
});
check('narrow window: the heads-up toolbar sits below the tabs instead of on them', lay.hudTop >= lay.tabsBottom - 1 || lay.hudLeft > lay.tabsRight, JSON.stringify(lay));
await page.close();

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' checks passed');
process.exitCode = exitCode(results, errors);
await browser.close();
