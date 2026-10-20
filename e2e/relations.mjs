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
await page.click('text=Schets op voorvlak');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
const status = async () => (await page.locator('.k-statusbar .status').first().textContent()).trim();

// rectangle anchored on the origin (snap) -> coincident with origin
await page.keyboard.press('r');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 160, cy - 100);
console.log('rect on origin:', await status()); // expect 2 DOF (w,h)

// Equal relation: select bottom + right line with Ctrl, click "Gelijk"
await page.keyboard.press('Escape');
await page.mouse.click(cx + 80, cy);
await page.keyboard.down('Control');
await page.mouse.click(cx + 160, cy - 50);
await page.keyboard.up('Control');
await page.click('.k-tool.small:has-text("Gelijk")');
console.log('after equal:', await status()); // 1 DOF

// dimension the bottom line to 50 -> fully defined
await page.keyboard.press('d');
await page.mouse.click(cx + 80, cy);
await page.mouse.click(cx + 80, cy + 60);
const input = page.locator('.k-panel input[type=number]').first();
await input.fill('50');
await input.press('Enter');
await page.waitForTimeout(100);
console.log('after length 50:', await status()); // Volledig bepaald
const treeStatus = await page.locator('.k-tree .status').first().textContent();
console.log('tree status:', treeStatus.trim());

// add a redundant dimension on the right line -> over-defined
await page.keyboard.press('Escape');
await page.keyboard.press('d');
// right line is now at x = 50mm -> 200px from origin
await page.mouse.click(cx + 200, cy - 100);
await page.mouse.click(cx + 260, cy - 100);
await page.waitForTimeout(150);
console.log('after redundant dim:', await status());
const msg = await page.locator('.k-status-msg').textContent().catch(() => '');
console.log('message:', msg.trim());
await page.screenshot({ path: `${OUT}/05-overdefined.png` });
// undo the redundant dim
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await page.waitForTimeout(100);
console.log('after undo:', await status());

// circle + arc + tangent
await page.keyboard.press('c');
await page.mouse.click(cx + 400, cy);
await page.mouse.click(cx + 440, cy);
await page.keyboard.press('a');
await page.mouse.click(cx + 300, cy + 150);
await page.mouse.click(cx + 500, cy + 150);
await page.mouse.click(cx + 400, cy + 220);
await page.keyboard.press('Escape');
await page.mouse.click(cx + 400, cy + 40); // circle
await page.keyboard.down('Control');
await page.mouse.click(cx + 400, cy + 220); // arc
await page.keyboard.up('Control');
const rels = await page.locator('.k-tool.small').allTextContents();
console.log('relations offered for circle+arc:', rels);
await page.click('.k-tool.small:has-text("Tangent")');
await page.waitForTimeout(100);
console.log('after tangent:', await status());

// drag the circle centre (free point) and verify tangent holds (status still solvable)
await page.keyboard.press('Escape');
await page.mouse.move(cx + 400, cy);
await page.mouse.down();
await page.mouse.move(cx + 380, cy - 20, { steps: 5 });
await page.mouse.move(cx + 360, cy - 40, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(100);
console.log('after drag:', await status());

// spline
await page.keyboard.press('n');
await page.mouse.click(cx - 300, cy - 200);
await page.mouse.click(cx - 200, cy - 260);
await page.mouse.click(cx - 100, cy - 180);
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
const ents = await page.locator('.k-section-title:has-text("Schets")').click().then(async () => (await page.locator('.k-field:has-text("Entiteiten") span').textContent()));
console.log('entities:', ents);
await page.screenshot({ path: `${OUT}/06-relations.png` });

// box selection + delete
await page.keyboard.press('Escape');
await page.mouse.move(cx - 350, cy - 300);
await page.mouse.down();
await page.mouse.move(cx - 50, cy - 150, { steps: 4 });
await page.mouse.up();
await page.keyboard.press('Delete');
await page.waitForTimeout(100);
console.log('entities after box-delete:', await page.locator('.k-field:has-text("Entiteiten") span').textContent());
console.log('errors:', errors);
await browser.close();
