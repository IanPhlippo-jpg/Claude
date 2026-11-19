// 3D Print tab in resin mode (docs/33 phase 4, docs/34 3.4): an Elegoo Saturn 4 Ultra switches the tab to resin
// settings; the door handle lever auto-oriented for resin, with supports, sliced into pixel masks; the layer slider shows
// the mask; Export writes a .goo file (magic tag, ending string, header size checked here); exposure beyond the limits
// is refused; a printer that takes .ctb slices but does not export; a hollow cube without a drain hole shows a cavity.
// node e2e/print3dResin.mjs   (E2E_URL: a build with VITE_TEST_HOOKS=1; PRINT_SHOTS: folder for the screenshots)
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
const shot = async (n) => { await page.mouse.move(1100, 1040); await frames(page, 2); await page.screenshot({ path: `${OUT}/${n}.png` }); };
const big = (label) => page.locator(`.k-cm-big:has(.k-cm-label:text-is("${label}")) .k-cm-main`);
const open = async (file) => {
  await page.setInputFiles('#phlippo-open-file', { name: file.split('/').pop(), mimeType: 'application/json', buffer: readFileSync(file) });
  const no = page.locator('[data-testid="ask-no"]');
  if (await no.isVisible({ timeout: 4000 }).catch(() => false)) await no.click();
  const want = file.split('/').pop().replace(/\.kcad$/, '');
  await page.waitForFunction((n) => window.__phlippoStore.getState().doc.name === n, want, { timeout: 30000 });
  await settle(page);
};
const toTab = async () => {
  await page.click('.k-cm-tab:has-text("3D Print")');
  await page.locator('[data-testid="print-tab-settings"]').click({ timeout: 20000 }).catch(() => undefined);
  await page.waitForSelector('[data-testid="print-pm"] [data-testid="print-printer"]', { timeout: 20000 });
};
const status = () => page.locator('.k-statusbar').innerText();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');

// --- the lever on a Saturn 4 Ultra
await open('voorbeelden/deurkruk/Kruk.kcad');
await toTab();
const resinOptions = await page.locator('[data-testid="print-printer"] option', { hasText: '(resin)' }).count();
check('the printer list holds the 21 resin printers, marked (resin)', resinOptions === 21, String(resinOptions));
await page.selectOption('[data-testid="print-printer"]', 'elegoo-saturn-4-ultra');
await frames(page, 4);
check('a resin printer switches the panel to resin settings', (await page.locator('[data-testid="print-resin"]').count()) === 1 && (await page.locator('[data-testid="print-pattern"]').count()) === 0);
const facts = await page.locator('[data-testid="print-resin-facts"]').innerText();
check('the LCD of the printer is shown: 11520 x 5120 px, 19 x 24 µm, .goo', /11520 x 5120/.test(facts) && /19\.0 x 24\.0/.test(facts) && /\.goo/.test(facts), facts);
await big('Add to Plate').click();
await frames(page, 6);
check('the lever goes on the LCD', (await page.locator('.k-print-part').count()) === 1 && (await page.locator('.k-print-out').count()) === 0);
await page.locator('.k-cm-small:has-text("Auto Orient")').click();
await frames(page, 6);
await shot('01-resin-settings-lever');
// exposure beyond the limits: shown in red, slicing refused
const expo = page.locator('.k-print-row:has(.k-print-label:text-is("Normal (s)")) input');
await expo.fill('90');
await expo.press('Enter');
await frames(page, 4);
check('an exposure of 90 s is shown as a problem', /Exposure 90 s is outside 0.1 to 60 s/.test(await page.locator('[data-testid="print-resin-problems"]').innerText().catch(() => '')));
await big('Slice Plate').click();
await frames(page, 6);
check('slicing with 90 s exposure is refused', /Exposure 90 s is outside/.test(await status()));
await shot('02-resin-exposure-refused');
await expo.fill('2.5');
await expo.press('Enter');
await page.selectOption('[data-testid="print-resin-support"]', 'normal');
await big('Slice Plate').click();
await page.waitForSelector('[data-testid="print-resin-summary"]', { timeout: 240000 });
await frames(page, 8);
const summary = await page.locator('[data-testid="print-resin-summary"]').innerText();
check('the summary shows print time, layers, resin in ml, grams and cost', /Print time/.test(summary) && /\d+ × 0\.05 mm/.test(summary) && /ml/.test(summary) && /€/.test(summary),
  summary.replace(/\s+/g, ' '));
check('the pixel mask of a layer shows in the plate view', (await page.locator('[data-testid="print-resin-mask"] canvas').count()) === 1);
await shot('03-resin-lever-preview');
const max = Number(await page.locator('[data-testid="print-resin-layer-slider"]').getAttribute('max'));
await page.locator('[data-testid="print-resin-layer-slider"]').fill(String(Math.round(max * 0.4)));
await frames(page, 6);
const lit = await page.locator('[data-testid="print-resin-mask"] canvas').evaluate((c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
});
check('the mask of a middle layer has lit pixels', lit > 20, String(lit));
await shot('04-resin-lever-layer-40pct');
const dl = page.waitForEvent('download', { timeout: 60000 });
await big('Export').click();
const ask = page.locator('[data-testid="ask-yes"]');
check('Export asks first (format not yet checked against Elegoo, not printed)', await ask.isVisible({ timeout: 4000 }).catch(() => false));
await ask.click();
const f = await dl;
const path = `${OUT}/${f.suggestedFilename()}`;
await f.saveAs(path);
const b = readFileSync(path);
const end = [0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00];
check('Export writes a .goo with the magic tag, the header size and the ending string', /\.goo$/.test(f.suggestedFilename()) && b.subarray(4, 12).equals(Buffer.from([7, 0, 0, 0, 0x44, 0x4c, 0x50, 0]))
  && b.readInt32BE(195470) === 195477 && b.subarray(b.length - 11).equals(Buffer.from(end)) && b.readInt16BE(195314) === 11520, `${f.suggestedFilename()} ${b.length} bytes`);
await shot('05-resin-export');

// --- a printer that takes .ctb: slices, but no export
await page.click('[data-testid="print-tab-settings"]');
await page.selectOption('[data-testid="print-printer"]', 'elegoo-mars-3');
await frames(page, 4);
const factsMars = await page.locator('[data-testid="print-resin-facts"]').innerText({ timeout: 10000 }).catch(async (e) => { await shot('debug-mars'); return String(e); });
check('the Mars 3 says .ctb is not written', /\.ctb \(not written; \.goo only\)/.test(factsMars), factsMars);

// --- a hollow cube without a drain hole: a closed cavity
await page.click('[data-testid="print-cancel"]');
await page.click('.k-doctype:has-text("Part")').catch(() => undefined);
await page.evaluate(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }];
  for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0];
  const d = K.createDocument('Kalibratiekubus');
  d.sketches.s1 = s;
  d.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false });
  st.openDocument(d);
});
await settle(page);
await toTab();
await page.selectOption('[data-testid="print-printer"]', 'elegoo-mars-5-ultra');
await big('Add to Plate').click();
await frames(page, 6);
check('the resin mode says what is still to print: the asymmetric test piece, not the cube', /asymmetrisch proefstuk/.test(await page.locator('[data-testid="print-note"]').innerText()));
// support points by hand: a click on the part adds one there (a red mark), Shift+click takes it away again
const counted = () => page.locator('[data-testid="print-resin-pick"] ~ .k-muted').last().innerText();
await page.click('[data-testid="print-resin-pick"]');
const view = await page.locator('[data-testid="print-view"] canvas').boundingBox();
await page.mouse.click(view.x + view.width / 2, view.y + view.height / 2);
await frames(page, 4);
check('a click on the part with Pick Points adds a support point', /^1 added/.test(await counted()), await counted());
await shot('08-resin-pick-point');
await page.keyboard.down('Shift');
await page.mouse.click(view.x + view.width / 2, view.y + view.height / 2);
await page.keyboard.up('Shift');
await frames(page, 4);
check('Shift+click takes the point away again', /^0 added · 1 removed/.test(await counted()), await counted());
await page.click('[data-testid="print-resin-pick"]');
await page.click('[data-testid="print-pm"] button:text-is("Clear")');
await page.click('[data-testid="print-resin-hollow"]');
await frames(page, 2);
await big('Slice Plate').click();
await page.waitForSelector('[data-testid="print-resin-summary"]', { timeout: 240000 });
await frames(page, 6);
const issues = await page.locator('[data-testid="print-resin-issues"]').innerText();
check('a hollow cube without a drain hole shows a closed cavity', /Cavity/.test(issues), issues.replace(/\s+/g, ' ').slice(0, 120));
await page.locator('[data-testid="print-resin-layer-slider"]').fill('200');
await frames(page, 6);
await shot('06-resin-hollow-cube-cavity');
await page.click('[data-testid="print-tab-settings"]');
await page.click('[data-testid="print-resin-drain"]');
await big('Slice Plate').click();
await page.waitForSelector('[data-testid="print-resin-noissues"], [data-testid="print-resin-issues"] .k-print-issue', { timeout: 240000 });
await frames(page, 6);
const after = await page.locator('[data-testid="print-resin-issues"]').innerText();
check('a drain hole opens the cavity', !/Cavity/.test(after), after.replace(/\s+/g, ' ').slice(0, 120));
await page.locator('[data-testid="print-resin-layer-slider"]').fill('10');
await frames(page, 6);
await shot('07-resin-drain-hole-layer');
// the release test piece of a resin printer: an L with a raised F (a mirrored print shows)
await page.click('[data-testid="print-tab-settings"]');
await page.click('[data-testid="print-resin-testpiece"]');
await frames(page, 6);
check('Add Test Piece puts the L with the F on the plate', (await page.locator('.k-print-part', { hasText: 'Resin test piece' }).count()) === 1);
await shot('09-resin-test-piece');
await page.click('[data-testid="print-ok"]');

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.info ? ` (${r.info})` : ''}`);
process.exit(exitCode(results, errors));
