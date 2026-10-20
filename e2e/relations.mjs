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
await page.click('.k-doctype:has-text("Part")');
// start a sketch by double-clicking the Front Plane in the FeatureManager
await page.dblclick('.k-tree-row:has-text("Front Plane")');
await page.waitForTimeout(500);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
const status = async () => (await page.locator('.k-statusbar .status').first().textContent()).trim();

await page.keyboard.press('r');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 160, cy - 100);
console.log('rect on origin:', await status());

await page.keyboard.press('Escape');
await page.mouse.click(cx + 80, cy);
await page.keyboard.down('Control');
await page.mouse.click(cx + 160, cy - 50);
await page.keyboard.up('Control');
await page.click('.k-tool.small:has-text("Equal")');
console.log('after equal:', await status());

await page.keyboard.press('m');
await page.mouse.click(cx + 80, cy);
await page.mouse.click(cx + 80, cy + 60);
const input = page.locator('.k-modify input[type=number]');
await input.fill('50');
await input.press('Enter');
await page.waitForTimeout(100);
console.log('after length 50:', await status());

await page.keyboard.press('Escape');
await page.keyboard.press('m');
await page.mouse.click(cx + 200, cy - 100);
await page.mouse.click(cx + 260, cy - 100);
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
console.log('after redundant dim:', await status());
console.log('message:', (await page.locator('.k-status-msg').textContent().catch(() => '')).trim());
await page.screenshot({ path: `${OUT}/05-overdefined.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await page.waitForTimeout(100);
console.log('after undo:', await status());

// polygon
await page.click('.k-cm-iconbtn[data-tip="Polygon"]');
await page.mouse.click(cx - 250, cy);
await page.mouse.click(cx - 200, cy);
await page.waitForTimeout(100);
console.log('after polygon:', await status());

// circle + arc + tangent
await page.keyboard.press('c');
await page.mouse.click(cx + 400, cy);
await page.mouse.click(cx + 440, cy);
await page.keyboard.press('a');
await page.mouse.click(cx + 300, cy + 150);
await page.mouse.click(cx + 500, cy + 150);
await page.mouse.click(cx + 400, cy + 220);
await page.keyboard.press('Escape');
await page.mouse.click(cx + 400, cy + 40);
await page.keyboard.down('Control');
await page.mouse.click(cx + 400, cy + 220);
await page.keyboard.up('Control');
console.log('relations offered:', await page.locator('.k-tool.small').allTextContents());
await page.click('.k-tool.small:has-text("Tangent")');
await page.waitForTimeout(100);
console.log('after tangent:', await status());

// drag the circle centre
await page.keyboard.press('Escape');
await page.mouse.move(cx + 400, cy);
await page.mouse.down();
await page.mouse.move(cx + 380, cy - 20, { steps: 5 });
await page.mouse.move(cx + 360, cy - 40, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(100);
console.log('after drag:', await status());

// centerline + mirror: draw a circle and a vertical centerline, select both, Mirror
await page.keyboard.press('c');
await page.mouse.click(cx + 150, cy + 250);
await page.mouse.click(cx + 180, cy + 250);
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Line (L)"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Centerline")');
await page.mouse.click(cx + 250, cy + 170);
await page.mouse.click(cx + 250, cy + 330);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.mouse.click(cx + 180, cy + 250); // circle edge
await page.keyboard.down('Control');
await page.mouse.click(cx + 250, cy + 300); // centerline
await page.keyboard.up('Control');
console.log('selection for mirror:', await page.evaluate(() => window.__phlippoStore.getState().selection.length));
const count = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId].entityOrder.length; });
const before = await count();
await page.click('.k-cm-small:has-text("Mirror Entities")');
await page.waitForTimeout(100);
console.log('entities before/after mirror:', before, '/', await count());
await page.screenshot({ path: `${OUT}/06-relations.png` });

// feature tree: rollback bar exists, tree has system items
console.log('tree items:', (await page.locator('.k-tree').first().textContent()).replace(/\s+/g, ' ').slice(0, 120));
console.log('rollback bar:', await page.locator('.k-rollback-bar').count());
console.log('errors:', errors);
await browser.close();
