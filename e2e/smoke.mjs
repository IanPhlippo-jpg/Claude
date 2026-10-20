import { chromium } from 'playwright';
const OUT = process.env.E2E_OUT ?? '/tmp/claude-0/-home-user-Claude/72cb6de8-0893-594a-95ed-130ce81e494b/scratchpad/e2e';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.k-viewport');
// Welcome dialog: choose Part
console.log('welcome dialog:', await page.locator('.k-dialog-title').textContent());
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
console.log('editing:', await page.locator('.k-status-cell:has-text("Editing")').textContent());

// draw a rectangle: press R, click two corners
await page.keyboard.press('r');
await page.mouse.click(cx - 120, cy + 80);
await page.mouse.move(cx + 120, cy - 60);
await page.mouse.click(cx + 120, cy - 60);
await page.waitForTimeout(100);
await page.keyboard.press('c');
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
console.log('status after drawing:', status.trim());

// smart dimension (M) -> Modify dialog at the pointer
await page.keyboard.press('m');
await page.mouse.click(cx, cy + 80);
await page.mouse.click(cx, cy + 130);
await page.waitForTimeout(200);
console.log('modify dialog visible:', await page.locator('.k-modify').count());
const input = page.locator('.k-modify input[type=number]');
await input.fill('100');
await input.press('Enter');
await page.waitForTimeout(200);
status = await page.locator('.k-statusbar .status').first().textContent();
console.log('status after dimension:', status.trim());
await page.keyboard.press('Escape');
await page.screenshot({ path: `${OUT}/02-sketch-light.png` });
console.log('dimension labels:', await page.locator('.k-overlay text').allTextContents());
console.log('relation glyphs:', await page.locator('.k-overlay rect[width="14"]').count());

// undo / redo
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+y');
await page.waitForTimeout(100);
console.log('labels after undo/undo/redo:', await page.locator('.k-overlay text').allTextContents());

// right-click context menu with context toolbar on a line
await page.mouse.click(cx, cy + 80, { button: 'right' });
await page.waitForTimeout(100);
console.log('context toolbar buttons:', await page.locator('.k-ctx-toolbar button').count(), 'menu items:', await page.locator('.k-ctx .k-menu-item').count());
await page.keyboard.press('Escape');

// D moves the confirmation corner to the cursor
await page.mouse.move(cx, cy);
await page.keyboard.press('d');
console.log('confirmation corner at cursor:', await page.locator('.k-confirm.at-cursor').count());
await page.keyboard.press('d');

// dark mode + relations task pane
await page.keyboard.press('Control+Shift+d');
await page.click('.k-taskpane-btn[data-tip="Display/Delete Relations"]');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/03-sketch-dark.png` });
await page.keyboard.press('Control+Shift+d');

// exit via the confirmation corner (sketch symbol), isometric view
await page.click('.k-confirm-ok');
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
console.log('view name:', await page.locator('.k-viewname').textContent());
// orientation dialog (space) and view selector (ctrl+space)
await page.keyboard.press(' ');
console.log('orientation dialog:', await page.locator('.k-orientation-dialog').count());
await page.click('.k-viewgrid-btn:has-text("Front")');
await page.waitForTimeout(300);
console.log('view name after Front:', await page.locator('.k-viewname').textContent());
await page.keyboard.press('Control+ ');
console.log('view selector:', await page.locator('.k-viewselector').count());
await page.screenshot({ path: `${OUT}/04-viewselector.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-part-iso.png` });

// autosave persisted?
await page.reload();
await page.waitForSelector('.k-viewport');
const treeText = await page.locator('.k-tree').textContent();
console.log('tree after reload:', treeText.replace(/\s+/g, ' ').trim().slice(0, 160));
console.log('errors:', errors);
await browser.close();
