// Every keyboard shortcut of the intended list, in a part, in a sketch, in an assembly and in a drawing:
// no page error, no crash screen, and the expected effect for the main ones.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5 });
let errs = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|WebGL|GL_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
page.on('dialog', (d) => d.dismiss().catch(skip('keys:13')));
page.on('filechooser', () => undefined);
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const load = (f) => { const d = JSON.parse(readFileSync(f, 'utf8')); delete d.format; return d; };
const keys = ['f', 'F', 'Control+1', 'Control+2', 'Control+3', 'Control+4', 'Control+5', 'Control+6', 'Control+7', 'Control+8', ' ', 'Escape', 's', 'Escape', 'Control+b', 'Control+q', 'Control+r', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowLeft', 'Alt+ArrowLeft', 'Control+ArrowLeft', 'Shift+c', 'Control+Shift+z', 'z', 'Shift+z', 'g', 'Control+z', 'Control+y', 'Enter', 'Escape', 'F9', 'Control+Space', 'Escape', 'l', 'Escape', 'd', 'Escape', 'Delete', 'Escape', 'Tab', 'Escape'];
const run = async (label) => {
  await page.locator('.k-viewport, .k-sheet-host').first().click({ position: { x: 200, y: 200 } });
  for (const k of keys) {
    await page.keyboard.press(k);
    await page.waitForTimeout(120);
    // a dialog that opened (Delete confirm, shortcut bar) is closed again
    if (await page.locator('[data-testid="confirm-delete"]').count()) await page.keyboard.press('Escape');
    const crash = await page.locator('[data-testid="crash"]').count();
    if (errs.length || crash) {
      check(`${label}: ${k}`, false, [...new Set(errs)].slice(0, 2).join(' / ') + (crash ? ' (crash)' : ''));
      if (crash) await page.click('[data-testid="crash"] button').catch(skip('keys:32'));
      errs = [];
    }
  }
  check(`${label}: all shortcuts without errors`, true);
};
const part = load('voorbeelden/deurkruk/Kruk.kcad');
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), part);
await page.waitForTimeout(1500);
// expected effects
await page.locator('.k-viewport').click({ position: { x: 300, y: 300 } });
await page.keyboard.press('Control+1');
await page.waitForTimeout(500);
check('Ctrl+1 = Front view', /Front/.test(await page.locator('.k-viewport').innerText()));
await page.keyboard.press('Control+7');
await page.waitForTimeout(500);
check('Ctrl+7 = Isometric view', /Isometric/.test(await page.locator('.k-viewport').innerText()));
await page.keyboard.press('s');
await page.waitForTimeout(300);
check('S opens the shortcut bar', (await page.locator('.k-shortcut-bar').count()) === 1);
await page.keyboard.press('Escape');
await run('part');
await page.evaluate(() => window.__phlippoStore.getState().openDocument(window.__phlippoStore.getState().doc));
await page.evaluate(() => window.__phlippoStore.getState().newSketch('front'));
await page.waitForTimeout(800);
await run('sketch');
await page.evaluate(() => { const s = window.__phlippoStore.getState(); if (s.activeSketchId) s.exitSketch(); });
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), load('voorbeelden/deurkruk/Deurkruk.kcad'));
await page.waitForTimeout(2500);
await run('assembly');
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), load('voorbeelden/deurkruk/Kruk-tekening.kcad'));
await page.waitForTimeout(2500);
await run('drawing');
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errs);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
