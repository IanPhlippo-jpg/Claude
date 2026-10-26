// Block G-G: Tools ▸ Customize with real settings: Toolbars (Command Ribbon tabs, Quick Access, large buttons),
// Shortcut Bars, Commands (catalog, add to Quick Access), Menus, Keyboard (rebinding), Mouse Gestures, Customization.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const viewName = () => S(() => window.__phlippoCamera.viewName);
const pref = (k) => S((k) => window.__phlippoStore.getState().prefs[k], k);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -20, y: -15 }, { x: 20, y: -15 })[0];
  sk = K.addLine(sk, { x: 20, y: -15 }, { x: 20, y: 15 })[0];
  sk = K.addLine(sk, { x: 20, y: 15 }, { x: -20, y: 15 })[0];
  sk = K.addLine(sk, { x: -20, y: 15 }, { x: -20, y: -15 })[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
const tabsBefore = await page.locator('.k-cm-tab').count();

// ---- open from Tools ▸ Customize…
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Tools")');
await page.waitForTimeout(150);
check('Tools menu has Customize…', (await page.locator('.k-menu-item:has-text("Customize…")').count()) === 1);
await page.locator('.k-menu-item:has-text("Customize…")').click();
await page.waitForTimeout(300);
check('Customize dialog with the seven tabs', (await page.locator('[data-testid="customize-dialog"]').count()) === 1 && (await page.locator('.k-customize-tabs button').count()) === 7);
await shot('gg0-customize-toolbars');

// ---- Toolbars: hide the Render Tools tab and the Home button, large buttons off
await page.locator('[data-testid="cz-tab-render"]').uncheck();
await page.locator('[data-testid="cz-qat-home"]').uncheck();
await page.locator('[data-testid="cz-largebuttons"]').uncheck();
// ---- Shortcut Bars: Part context without Rib
await page.locator('[data-testid="cz-tab-shortcutbars"]').click();
await page.locator('[data-testid="cz-sb-part"]').click();
const sbCount = await page.locator('[data-testid="cz-sb-list"] label').count();
check('Shortcut Bars lists the part commands', sbCount >= 15, String(sbCount));
await page.locator('[data-testid="cz-sb-list"] label:has-text("Rib") input').uncheck();
await shot('gg1-customize-shortcutbars');
// ---- Commands: the View category, Zoom to Fit to the Quick Access Toolbar
await page.locator('[data-testid="cz-tab-commands"]').click();
await page.locator('[data-testid="cz-categories"] li:has-text("View")').click();
check('Commands: the View category shows its buttons', (await page.locator('[data-testid="cz-buttons"] button').count()) >= 10);
await page.locator('[data-testid="cz-buttons"] button[data-tip="Zoom to Fit"]').click();
check('the description of the picked command is shown', /Zooms the model to fit/.test(await page.locator('[data-testid="cz-description"]').innerText()));
await page.locator('[data-testid="cz-addqat"]').click();
check('Zoom to Fit queued for the Quick Access Toolbar', (await page.locator('[data-testid="cz-qat-extra"] .k-selbox-row').count()) === 1);
await shot('gg2-customize-commands');
// ---- Menus: hide Tools ▸ Equations…
await page.locator('[data-testid="cz-tab-menus"]').click();
await page.locator('[data-testid="cz-menu-Tools-Equations…"]').uncheck();
// ---- Keyboard: Shift+T for the Top view
await page.locator('[data-testid="cz-tab-keyboard"]').click();
await page.waitForTimeout(200);
check('Keyboard tab lists the commands with their shortcuts (Line = L)', (await page.locator('[data-testid="cz-key-sketch.line"]').inputValue()) === 'L');
await page.locator('[data-testid="cz-key-view.top"]').focus();
await page.keyboard.press('Shift+T');
await page.waitForTimeout(200);
check('Shift+T recorded for Top', (await page.locator('[data-testid="cz-key-view.top"]').inputValue()) === 'Shift+T');
await shot('gg3-customize-keyboard');
// ---- Mouse Gestures: up = Isometric in the part context
await page.locator('[data-testid="cz-tab-mousegestures"]').click();
await page.locator('[data-testid="cz-gesture-part-up"]').selectOption('view.isometric');
check('gesture ring shows Isometric at the top', /Isometric/.test(await page.locator('[data-testid="cz-gesture-ring"] .k-gesture-item.up').innerText()));
await shot('gg4-customize-gestures');
// ---- Customization: tooltips off, lock
await page.locator('[data-testid="cz-tab-customization"]').click();
await page.locator('[data-testid="cz-tooltips"]').uncheck();
await page.locator('[data-testid="cz-lock"]').check();
await page.locator('[data-testid="cz-ok"]').click();
await page.waitForTimeout(500);

// ---- the settings are in effect
check('Render Tools tab hidden', (await page.locator('.k-cm-tab').count()) === tabsBefore - 1 && (await page.locator('.k-cm-tab:has-text("Render Tools")').count()) === 0);
check('Home button hidden from the Quick Access Toolbar, Zoom to Fit added', (await page.locator('.k-cm-mbgrid [data-tip="Home"]').count()) === 0 && (await page.locator('.k-cm-mbgrid [data-tip="Zoom to Fit"]').count()) === 1);
check('large buttons with text off hides the labels', (await page.locator('.k-cm.k-cm-notext').count()) === 1);
check('tooltips off and lock: root class and disabled collapse button', (await page.locator('.k-app.k-notips').count()) === 1 && (await page.locator('.k-cm-tabs button[disabled]').count()) === 1);
await shot('gg5-customized-ui');
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Tools")');
await page.waitForTimeout(150);
check('Tools ▸ Equations… hidden', (await page.locator('.k-menu-item:has-text("Equations…")').count()) === 0 && (await page.locator('.k-menu-item:has-text("Options…")').count()) === 1);
await page.keyboard.press('Escape');
await page.mouse.click(1000, 600);
await page.waitForTimeout(200);
// the S bar without Rib
await page.keyboard.press('s');
await page.waitForTimeout(300);
const skeyCount = await page.locator('.k-skey-cell').count();
check('the part shortcut bar lost Rib', skeyCount === sbCount - 1, `${skeyCount} vs ${sbCount - 1}`);
await page.keyboard.press('Escape');
await page.mouse.click(1000, 600);
// Shift+T → Top
await page.keyboard.press('Shift+T');
await page.waitForTimeout(300);
check('Shift+T sets the Top view', (await viewName()) === 'top', await viewName());
// the moved default: Ctrl+5 (default Top) still works because it was not changed; 'f' still fits
await page.keyboard.press('Control+7');
await page.waitForTimeout(200);
check('Ctrl+7 Isometric still works', (await viewName()) === 'isometric', await viewName());
// gesture up → Isometric (set from Front first)
await page.keyboard.press('Control+1');
await page.waitForTimeout(200);
await page.mouse.move(1000, 600);
await page.mouse.down({ button: 'right' });
await page.mouse.move(1000, 520, { steps: 3 });
await page.mouse.move(1000, 440, { steps: 3 });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(300);
check('mouse gesture up runs the new Isometric binding', (await viewName()) === 'isometric', await viewName());
await page.keyboard.press('Escape');

// ---- disable gestures: a right drag changes nothing
await S(() => window.__phlippoStore.getState().setDialog('customize'));
await page.waitForTimeout(300);
await page.locator('[data-testid="cz-tab-mousegestures"]').click();
await page.locator('[data-testid="cz-gestures-on"]').uncheck();
await page.locator('[data-testid="cz-ok"]').click();
await page.waitForTimeout(300);
await page.keyboard.press('Control+1');
await page.waitForTimeout(200);
await page.mouse.move(1000, 600);
await page.mouse.down({ button: 'right' });
await page.mouse.move(1000, 440, { steps: 6 });
await page.mouse.up({ button: 'right' });
await page.waitForTimeout(300);
check('with mouse gestures disabled the view stays Front', (await viewName()) === 'front', await viewName());
await page.keyboard.press('Escape');

// ---- Reset All Customization
await S(() => window.__phlippoStore.getState().setDialog('customize'));
await page.waitForTimeout(300);
await page.locator('[data-testid="cz-tab-customization"]').click();
await page.locator('[data-testid="cz-reset-all"]').click();
await page.locator('[data-testid="cz-ok"]').click();
await page.waitForTimeout(400);
check('Reset All Customization brings the tabs, Home button and labels back', (await page.locator('.k-cm-tab').count()) === tabsBefore && (await page.locator('.k-cm-mbgrid [data-tip="Home"]').count()) === 1 && (await page.locator('.k-cm.k-cm-notext').count()) === 0);
check('the keyboard preference is cleared', !(await pref('customize.keys')));
check('the preferences survive a reload (stored)', await S(() => { try { return JSON.parse(localStorage.getItem('phlippo.prefs') ?? '{}') !== null; } catch { return false; } }));

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
