import { chromium } from 'playwright';
import { checks, exitCode } from './lib/check.mjs';
const { results, check } = checks();
const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.k-viewport');
// Welcome dialog: choose Part
check('the Welcome dialog opens on a clean start', /Welcome/.test(await page.locator('.k-dialog-title').textContent()));
await page.screenshot({ path: `${OUT}/01-welcome.png` });
await page.click('.k-doctype:has-text("Part")');
await page.screenshot({ path: `${OUT}/01-start.png` });

// Sketch button -> plane pick -> click the front plane in the graphics area
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
console.log('plane pick status:', (await page.locator('.k-statusbar').textContent()).trim().slice(0, 60));
await page.screenshot({ path: `${OUT}/01b-planepick.png` });
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
// front plane is drawn centred; iso view -> click slightly left/below centre lands on the front plane
await page.mouse.move(cx - 60, cy + 40);
await page.waitForTimeout(100);
await page.mouse.click(cx - 60, cy + 40);
await page.waitForTimeout(500);
check('a click on the Front Plane starts Sketch1', /Editing Sketch1/.test(await page.locator('.k-status-cell:has-text("Editing")').textContent()));

// draw a rectangle: press R, click two corners
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx - 120, cy + 80);
await page.mouse.move(cx + 120, cy - 60);
await page.mouse.click(cx + 120, cy - 60);
await page.waitForTimeout(100);
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(cx + 250, cy);
await page.mouse.click(cx + 290, cy);
await page.keyboard.press('Escape');
await page.keyboard.press('l');
await page.mouse.click(cx + 120, cy - 60);
await page.mouse.click(cx + 200, cy - 150);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
let status = await page.locator('.k-statusbar .status').first().textContent();
check('the drawn sketch is under defined', status.trim() === 'Under Defined', status.trim());

// smart dimension (M) -> Modify dialog at the pointer
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx, cy + 80);
await page.mouse.click(cx, cy + 130);
await page.waitForTimeout(200);
check('Smart Dimension shows the Modify box', (await page.locator('.k-modify').count()) === 1);
const input = page.locator('.k-modify input.k-num');
await input.fill('100');
await input.press('Enter');
await page.waitForTimeout(200);
status = await page.locator('.k-statusbar .status').first().textContent();
console.log('status after dimension:', status.trim());
await page.keyboard.press('Escape');
await page.screenshot({ path: `${OUT}/02-sketch-light.png` });
check('the dimension reads 100.00', (await page.locator('.k-overlay text').allTextContents()).includes('100.00'), JSON.stringify(await page.locator('.k-overlay text').allTextContents()));


// undo / redo
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+y');
await page.waitForTimeout(100);
check('undo, undo, redo leaves one dimension label', (await page.locator('.k-overlay text').allTextContents()).length === 1, JSON.stringify(await page.locator('.k-overlay text').allTextContents()));

// right-click context menu with context toolbar on a line
await page.mouse.click(cx, cy + 80, { button: 'right' });
await page.waitForTimeout(100);
check('a right-click on a line shows the context toolbar and menu', (await page.locator('.k-ctx-toolbar button').count()) > 0 && (await page.locator('.k-ctx .k-menu-item').count()) > 5);
await page.keyboard.press('Escape');

// D moves the confirmation corner to the cursor
await page.mouse.move(cx, cy);
await page.keyboard.press('d');
check('D moves the confirmation corner to the pointer', (await page.locator('.k-confirm.at-cursor').count()) === 1);
await page.keyboard.press('d');

// dark mode + relations task pane
await page.keyboard.press('Control+Shift+d');
await page.click('.k-cm-big:has-text("Display/Delete Relations") .k-cm-main');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/03-sketch-dark.png` });
await page.keyboard.press('Control+Shift+d');

// exit via the confirmation corner (sketch symbol), isometric view
await page.click('.k-confirm-ok');
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
check('Ctrl+7 shows *Isometric', (await page.locator('.k-viewname').textContent()) === '*Isometric');
// orientation dialog (space) and view selector (ctrl+space)
await page.keyboard.press(' ');
check('space opens the Orientation dialog', (await page.locator('.k-orientation-dialog').count()) === 1);
await page.click('.k-viewgrid-btn:has-text("Front")');
await page.waitForTimeout(300);
check('the Orientation dialog sets *Front', (await page.locator('.k-viewname').textContent()) === '*Front');
await page.keyboard.press('Control+ ');
check('Ctrl+space shows the View Selector', (await page.locator('.k-viewselector').count()) === 1);
await page.screenshot({ path: `${OUT}/04-viewselector.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-part-iso.png` });

// autosave persisted?
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 10000 }); // the autosave waits under Recent Documents, by design
const treeText = await page.locator('.k-tree').textContent();
check('the autosave brings Sketch1 back after a reload', /Sketch1/.test(treeText), treeText.replace(/\s+/g, ' ').trim().slice(0, 160));
console.log('errors:', errors);
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
await browser.close();
