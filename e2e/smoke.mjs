import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-Claude/72cb6de8-0893-594a-95ed-130ce81e494b/scratchpad/e2e';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.k-viewport');
await page.screenshot({ path: `${OUT}/01-start.png` });

// new sketch on front plane via ribbon (Features tab)
await page.click('text=Schets op voorvlak');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;

// draw a rectangle: press R, click two corners
await page.keyboard.press('r');
await page.mouse.click(cx - 120, cy + 80);
await page.mouse.move(cx + 120, cy - 60);
await page.mouse.click(cx + 120, cy - 60);
await page.waitForTimeout(100);
// circle
await page.keyboard.press('c');
await page.mouse.click(cx + 250, cy);
await page.mouse.click(cx + 290, cy);
// line chain from rectangle corner
await page.keyboard.press('Escape');
await page.keyboard.press('l');
await page.mouse.click(cx + 120, cy - 60); // snaps to corner → coincident
await page.mouse.click(cx + 200, cy - 150);
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
let status = await page.locator('.k-statusbar .status').first().textContent();
console.log('status after drawing:', status.trim());

// smart dimension on the bottom line: D, click line, click to place
await page.keyboard.press('d');
await page.mouse.click(cx, cy + 80);
await page.mouse.click(cx, cy + 130);
await page.waitForTimeout(200);
// edit the value in the property manager input
const input = page.locator('.k-panel input[type=number]').first();
await input.fill('100');
await input.press('Enter');
await page.waitForTimeout(200);
status = await page.locator('.k-statusbar .status').first().textContent();
console.log('status after dimension:', status.trim());
await page.screenshot({ path: `${OUT}/02-sketch-light.png` });

// relation count / dim text shown
const dimText = await page.locator('.k-overlay text').allTextContents();
console.log('dimension labels:', dimText);
const glyphs = await page.locator('.k-overlay rect[width="14"]').count();
console.log('relation glyphs:', glyphs);

// undo twice, redo once
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+z');
await page.keyboard.press('Control+y');
await page.waitForTimeout(100);
console.log('dimension labels after undo/undo/redo:', await page.locator('.k-overlay text').allTextContents());

// dark mode + relations panel
await page.keyboard.press('Control+Shift+d');
await page.click('text=Relaties >> nth=0');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/03-sketch-dark.png` });

// exit sketch, isometric, screenshot
await page.keyboard.press('Control+Shift+d');
await page.click('[data-tip="Schets afsluiten"]');
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-part-iso.png` });

// autosave persisted?
await page.reload();
await page.waitForSelector('.k-viewport');
const treeText = await page.locator('.k-tree').textContent();
console.log('tree after reload:', treeText.replace(/\s+/g, ' ').trim());
console.log('errors:', errors);
await browser.close();
