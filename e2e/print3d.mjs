// 3D Print tab (docs/33, docs/34): the door handle lever on the plate, slice, layer preview, export for a Bambu Lab P1S
// (.gcode.3mf) and an Elegoo Neptune 4 Pro (.gcode), and a part outside the build volume refused.
// node e2e/print3d.mjs   (E2E_URL: a build with VITE_TEST_HOOKS=1; PRINT_SHOTS: folder for the screenshots)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { checks, exitCode } from './lib/check.mjs';
import { settle, frames } from './lib/wait.mjs';

const { results, check } = checks();
const OUT = process.env.PRINT_SHOTS ?? process.env.E2E_OUT ?? 'e2e-out';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const big = (label) => page.locator(`.k-cm-big:has(.k-cm-label:text-is("${label}")) .k-cm-main`);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await settle(page);
await page.setInputFiles('#phlippo-open-file', { name: 'Kruk.kcad', mimeType: 'application/json', buffer: readFileSync('voorbeelden/deurkruk/Kruk.kcad') });
await settle(page);

// the tab is there for a part, between Evaluate and Product Dimensions
const tabs = await page.locator('.k-cm-tab').allTextContents();
check('the 3D Print tab sits after Evaluate', tabs.indexOf('3D Print') === tabs.indexOf('Evaluate') + 1, tabs.join(' | '));
await page.click('.k-cm-tab:has-text("3D Print")');
await page.waitForSelector('[data-testid="print-pm"] [data-testid="print-printer"]', { timeout: 20000 });
await page.waitForSelector('[data-testid="print-view"]');
check('the Property Panel and the plate view show', (await page.locator('[data-testid="print-pm"]').count()) === 1 && (await page.locator('[data-testid="print-view"] canvas').count()) === 1);
const printers = await page.locator('[data-testid="print-printer"] option').count();
check('the printer list holds the FDM printers of the database', printers >= 4, String(printers));
await page.selectOption('[data-testid="print-printer"]', 'bambu-p1s');
await frames(page, 4);
await shot('01-tab-pm-empty-plate');

// Add to Plate
await big('Add to Plate').click();
await frames(page, 6);
const parts = await page.locator('.k-print-part').count();
check('Add to Plate puts the lever on the plate', parts === 1, String(parts));
check('the lever fits the P1S', (await page.locator('.k-print-out').count()) === 0);
await page.locator('.k-cm-small:has-text("Auto Orient")').click();
await frames(page, 6);
await shot('02-plate-part');

// Slice
await page.selectOption('[data-testid="print-support"]', 'normal');
await big('Slice Plate').click();
await page.waitForSelector('[data-testid="print-summary"]', { timeout: 180000 });
await frames(page, 6);
const summary = await page.locator('[data-testid="print-summary"]').innerText();
check('the preview shows time, layers and grams', /Total time/.test(summary) && /Layers/.test(summary) && /\d+(\.\d)? g/.test(summary), summary.replace(/\s+/g, ' '));
check('the legend shows in the graphics area', (await page.locator('[data-testid="print-legend"]').count()) === 1);
await shot('03-preview-legend');
// the layer slider halfway
const max = Number(await page.locator('[data-testid="print-layer-top"]').getAttribute('max'));
await page.locator('[data-testid="print-layer-top"]').fill(String(Math.round(max / 2)));
await frames(page, 4);
await shot('04-preview-half');
await page.locator('[data-testid="print-move-slider"]').fill('40');
await frames(page, 4);
await shot('05-preview-moves');
await page.selectOption('[data-testid="print-colorby"]', 'speed');
await page.locator('[data-testid="print-layer-top"]').fill(String(max));
await frames(page, 6);
await shot('06-preview-speed');
await page.selectOption('[data-testid="print-colorby"]', 'type');

// Export: the Bambu .gcode.3mf
const dl = page.waitForEvent('download', { timeout: 60000 });
await big('Export').click();
const file = await dl;
const path = `${OUT}/${file.suggestedFilename()}`;
await file.saveAs(path);
const bytes = readFileSync(path);
check('Export writes a .gcode.3mf (a ZIP)', /\.gcode\.3mf$/.test(file.suggestedFilename()) && bytes[0] === 0x50 && bytes[1] === 0x4b, file.suggestedFilename());
await frames(page, 4);
await shot('07-export');

// a changed setting makes the slice stale: Export greys out
await page.click('[data-testid="print-tab-settings"]');
// multi-material (AMS on the P1S): a second filament slot
await page.click('[data-testid="print-add-slot"]');
await frames(page, 2);
check('a P1S takes a second filament (AMS)', (await page.locator('[data-testid="print-slot-1"]').count()) === 1);
await shot('07b-settings-ams-slots');
await page.selectOption('[data-testid="print-pattern"]', 'gyroid');
await frames(page, 2);
check('a changed setting greys out Export (stale slice)', await page.locator('.k-cm-big:has(.k-cm-label:text-is("Export"))').evaluate((e) => e.classList.contains('disabled')));

// Elegoo Neptune 4 Pro: Klipper .gcode
await page.selectOption('[data-testid="print-printer"]', 'elegoo-neptune-4-pro');
await frames(page, 4);
await big('Slice Plate').click();
await page.waitForSelector('[data-testid="print-summary"]', { timeout: 180000 });
const dl2 = page.waitForEvent('download', { timeout: 60000 });
await big('Export').click();
const f2 = await dl2;
const p2 = `${OUT}/${f2.suggestedFilename()}`;
await f2.saveAs(p2);
const g2 = readFileSync(p2, 'utf8');
check('Export for the Neptune 4 Pro writes Klipper G-code with thumbnails', /\.gcode$/.test(f2.suggestedFilename()) && g2.includes(';LAYER_CHANGE') && g2.includes(';gimage:'), f2.suggestedFilename());
await page.click('[data-testid="print-tab-preview"]');
await frames(page, 6);
await shot('08-neptune-preview');

// a part outside the volume: red, and slicing refused
await page.click('[data-testid="print-tab-settings"]');
await page.locator('.k-print-part').first().click();
await page.locator('.k-cm-small:has-text("Scale")').click();
await page.locator('.k-dialog input').fill('400');
await page.locator('.k-dialog button:has-text("OK")').click();
await frames(page, 6);
check('a part too large for the bed is marked outside', (await page.locator('.k-print-out').count()) === 1);
await shot('09-outside-red');
await big('Slice Plate').click();
await frames(page, 6);
const status = await page.locator('.k-statusbar').innerText();
check('slicing a part outside the bed is refused', /outside the bed|prints up to/.test(status), status.slice(0, 160));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.info ? ` (${r.info})` : ''}`);
process.exit(exitCode(results));
