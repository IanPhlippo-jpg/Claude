import { chromium } from 'playwright';
import { checks, exitCode, skip } from './lib/check.mjs';
const { results, check } = checks();
const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// start a sketch by double-clicking the Front Plane in the Feature Tree
await page.dblclick('.k-tree-row:has-text("Front Plane")');
await page.waitForTimeout(500);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
const status = async () => (await page.locator('.k-statusbar .status').first().textContent()).trim();

await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 160, cy - 100);
check('a rectangle on the origin is under defined', (await status()) === 'Under Defined');

await page.keyboard.press('Escape');
await page.mouse.click(cx + 80, cy);
await page.keyboard.down('Control');
await page.mouse.click(cx + 160, cy - 50);
await page.keyboard.up('Control');
await page.click('.k-pm-relbtn:has-text("Equal")');
check('Equal leaves it under defined', (await status()) === 'Under Defined');

await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 80, cy);
await page.mouse.click(cx + 80, cy + 60);
const input = page.locator('.k-modify input.k-num');
await input.fill('50');
await input.press('Enter');
await page.waitForTimeout(100);
check('a 50 mm length makes it fully defined', (await status()) === 'Fully Defined', await status());

await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 200, cy - 100);
await page.mouse.click(cx + 260, cy - 100);
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
check('a redundant dimension makes it over defined', (await status()) === 'Over Defined', await status());
check('the status bar explains the over defined sketch', /over defined/.test((await page.locator('.k-status-msg').textContent().catch(skip('relations.mjs:51', ''))) ?? ''));
await page.screenshot({ path: `${OUT}/05-overdefined.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z');
await page.waitForTimeout(100);
check('undo makes it fully defined again', (await status()) === 'Fully Defined', await status());

// polygon
await page.click('.k-cm-iconbtn[data-tip="Polygon"]');
await page.mouse.click(cx - 250, cy);
await page.mouse.click(cx - 200, cy);
await page.waitForTimeout(100);
check('a polygon makes the sketch under defined', (await status()) === 'Under Defined');

// circle + arc + tangent
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(cx + 400, cy);
await page.mouse.click(cx + 440, cy);
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Centerpoint Arc"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("3 Point Arc")');
await page.mouse.click(cx + 300, cy + 150);
await page.mouse.click(cx + 500, cy + 150);
await page.mouse.click(cx + 400, cy + 220);
await page.keyboard.press('Escape');
await page.mouse.click(cx + 400, cy + 40);
await page.keyboard.down('Control');
await page.mouse.click(cx + 400, cy + 220);
await page.keyboard.up('Control');
check('the PM offers Tangent, Equal and Concentric', JSON.stringify(await page.locator('.k-pm-relbtn').allTextContents()) === JSON.stringify(['Tangent', 'Equal', 'Concentric']), JSON.stringify(await page.locator('.k-pm-relbtn').allTextContents()));
await page.click('.k-pm-relbtn:has-text("Tangent")');
await page.waitForTimeout(100);
check('Tangent applied, still under defined', (await status()) === 'Under Defined', await status());

// drag the circle centre
await page.keyboard.press('Escape');
await page.mouse.move(cx + 400, cy);
await page.mouse.down();
await page.mouse.move(cx + 380, cy - 20, { steps: 5 });
await page.mouse.move(cx + 360, cy - 40, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(100);
check('a drag keeps the sketch under defined', (await status()) === 'Under Defined');

// centerline + mirror: draw a circle and a vertical centerline, select both, Mirror
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
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
check('two items selected for Mirror', (await page.evaluate(() => window.__phlippoStore.getState().selection.length)) === 2);
const count = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return s.doc.sketches[s.activeSketchId].entityOrder.length; });
const before = await count();
await page.click('.k-cm-small:has-text("Mirror Entities")');
await page.waitForTimeout(100);
check('Mirror adds the mirrored entity', (await count()) > before, `${before} -> ${await count()}`);
await page.screenshot({ path: `${OUT}/06-relations.png` });

// feature tree: rollback bar exists, tree has system items
check('the tree lists the sketch', /Sketch1/.test(await page.locator('.k-tree').first().textContent()));
check('the rollback bar is shown', (await page.locator('.k-rollback-bar').count()) === 1);
console.log('errors:', errors);
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
await browser.close();
