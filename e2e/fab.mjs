// The fabrication tabs (docs/36): Frames+ on the Frames tab of a part (recognition, saw list with the saw plan, weld
// joints with EXC2 and its warning, cost), Laser & Bend (flat patterns, DXF ZIP, nest, bend sequence), Quote (customer,
// preview, PDF with the ONTWERP watermark, no network request), the Fabrication Settings, the stale mark after a model
// change, the door handle that gives only "No cost assigned", and no fabrication tab on a drawing.
// node e2e/fab.mjs   (E2E_URL: a build with VITE_TEST_HOOKS=1; FAB_SHOTS: folder for the screenshots and the files)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { checks, exitCode } from './lib/check.mjs';
import { settle, frames } from './lib/wait.mjs';

const { results, check } = checks();
const OUT = process.env.FAB_SHOTS ?? process.env.E2E_OUT ?? 'e2e-out';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async (n) => { await page.mouse.move(1100, 1040); await frames(page, 3); await page.screenshot({ path: `${OUT}/${n}.png` }); };
const big = (label) => page.locator(`.k-cm-big:has(.k-cm-label:text-is("${label}")) .k-cm-main`).first();
const small = (label) => page.locator(`.k-cm-small:has(span:text-is("${label}"))`).first();
const tab = (label) => page.click(`.k-cm-tab:text-is("${label}")`);
const open = async (file) => {
  await page.setInputFiles('#phlippo-open-file', { name: file.split('/').pop(), mimeType: 'application/json', buffer: readFileSync(file) });
  const no = page.locator('[data-testid="ask-no"]');
  if (await no.isVisible({ timeout: 3000 }).catch(() => false)) await no.click();
  const want = JSON.parse(readFileSync(file, 'utf8')).name;
  await page.waitForFunction((n) => window.__phlippoStore.getState().doc.name === n, want, { timeout: 60000 });
  await settle(page);
};
const download = async (act) => {
  const dl = page.waitForEvent('download', { timeout: 60000 });
  await act();
  const ask = page.locator('[data-testid="ask-yes"]');
  if (await ask.isVisible({ timeout: 1500 }).catch(() => false)) await ask.click();
  const f = await dl;
  const path = `${OUT}/${f.suggestedFilename()}`;
  await f.saveAs(path);
  return { name: f.suggestedFilename(), bytes: readFileSync(path) };
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');

// ---- LF1 test frame: Frames tab with the Frames+ group
await open('e2e/fixtures/fab/LF1-Proefraam.kcad');
const tabs = await page.locator('.k-cm-tab').allTextContents();
check('a part has the tabs Laser & Bend and Quote after 3D Print', tabs.indexOf('Laser & Bend') === tabs.indexOf('3D Print') + 1 && tabs.includes('Quote'), tabs.join(' | '));
await tab('Frames');
await page.waitForSelector('.k-cm-big:has(.k-cm-label:text-is("Saw List"))', { timeout: 20000 });
await shot('01-frames-tab-fab-group');
await big('Recognize Members').click();
await page.waitForSelector('[data-testid="fab-recognize-sum"]', { timeout: 60000 });
check('LF1: 5 bodies, 5 profiles', /5 bodies: 5 profiles/.test(await page.locator('[data-testid="fab-recognize-sum"]').textContent()));
await shot('02-recognize-members-pm');
await big('Saw List').click();
await page.waitForSelector('[data-testid="fab-view-saw"]');
const sawRows = await page.locator('[data-testid="fab-view-saw"] tbody tr').count();
check('saw list of LF1 has 3 positions', sawRows === 3, String(sawRows));
check('the saw plan shows one bar with rest 2260', /rest 2260/.test(await page.locator('.k-fab-bars').textContent()));
await shot('03-saw-list-and-saw-plan');
const sawPdf = await download(() => big('Export').click());
check('saw list PDF', sawPdf.name.endsWith('zaagstaat.pdf') && sawPdf.bytes.subarray(0, 5).toString() === '%PDF-');
await big('Weld Joint').click();
await page.waitForSelector('[data-testid="fab-view-welds"]');
await shot('04a-weld-joints-symbols');
check('6 weld joints proposed', (await page.locator('[data-testid="fab-weld"]').count()) === 6);
await page.selectOption('[data-testid="fab-exc"]', 'EXC2');
await page.waitForSelector('[data-testid="fab-exc-warning"]');
check('EXC2 shows the fixed warning', /Dit programma controleert dat niet/.test(await page.locator('[data-testid="fab-exc-warning"]').textContent()));
await shot('04-weld-joints-exc2');
await big('Cost').click();
await page.waitForSelector('[data-testid="fab-view-cost"]');
await shot('05-cost-manager');

// ---- docs/37 B-1: a new hourly rate reprices the cost at once (no stale result, no old price on the quote)
const totalOf = async () => Number((await page.locator('[data-testid="fab-view-cost"] .k-fab-viewhead b').textContent()).split('€').pop().replace(/\./g, '').replace(',', '.').trim());
const cost1 = await totalOf();
await page.locator('.k-cm-big:has(.k-cm-label:text-is("Stock Library")) .k-cm-main').first().click();
await page.click('[data-testid="fab-settings-Rates"]');
await page.fill('[data-testid="fab-uurloon"]', '90');
await page.click('[data-testid="fab-settings-close"]');
await frames(page, 4);
const cost2 = await totalOf();
check('B-1: hourly rate 45 -> 90 raises the cost at once and nothing is stale', cost2 > cost1 && (await page.locator('[data-testid="fab-view-stale"]').count()) === 0, `${cost1} -> ${cost2}`);
await shot('05b-cost-after-hourly-rate');

// ---- Quote of LF1: customer, series of 5, preview, PDF and XLSX with one number (ONTWERP while the company data are empty), no network request
await tab('Quote');
await big('Customer').click();
await page.fill('[data-testid="fab-klant-naam"]', 'Klant Test (fictief)');
await shot('06-quote-customer-pm');
await big('Cost Model').click();
await page.fill('[data-testid="fab-reeks"]', '5');
await frames(page, 4);
const salePiece = await page.locator('[data-testid="fab-sale-piece"]').textContent();
const saleSeries = await page.locator('[data-testid="fab-sale-series"]').textContent();
await shot('06b-cost-series-of-5');
await big('Quote').click();
await page.waitForSelector('[data-testid="fab-view-quote"] img');
const quoteExcl = await page.locator('[data-testid="fab-quote-excl"]').textContent();
check('B-5: the quote of a series of 5 charges 5 x the per-piece price of the Cost panel', quoteExcl.trim() === saleSeries.trim(), `${salePiece} x 5 = ${saleSeries}, quote ${quoteExcl}`);
await shot('07-quote-preview');
const requests = [];
page.on('request', (r) => { if (!/^(data|blob):/.test(r.url()) && !r.url().startsWith(new URL(page.url()).origin)) requests.push(r.url()); });
const quote = await download(() => big('Export').click());
const qtext = quote.bytes.toString('latin1');
check('quote PDF numbered and marked ONTWERP', /^Offerte-\d{4}-\d{3}\.pdf$/.test(quote.name) && qtext.includes('(ONTWERP)'), quote.name);
check('no word for Ian only in the customer PDF', !/AANNAME|kostprijs|uurloon/i.test(qtext));
await page.locator('.k-cm-big:has(.k-cm-label:text-is("Export")) .k-cm-arrow').first().click();
const xlsx = await download(() => page.click('text=Quote XLSX'));
check('B-6: the XLSX of the same quote has the same number', xlsx.name === quote.name.replace('.pdf', '.xlsx'), `${quote.name} / ${xlsx.name}`);
check('no network request while making the quote', requests.length === 0, requests.join(' '));
await big('Rates & Materials').click();
await page.waitForSelector('[data-testid="fab-settings"]');
await shot('09-settings-rates');
await page.click('[data-testid="fab-settings-Company"]');
await shot('08-settings-company');
await page.click('[data-testid="fab-settings-Materials"]');
await shot('10-settings-materials');
await page.click('[data-testid="fab-settings-Machines"]');
await shot('10b-settings-machines');
await page.click('[data-testid="fab-settings-close"]');
await small('Add Line').click();
await page.fill('[data-testid="fab-line-text"]', 'Korting');
await page.fill('[data-testid="fab-line-amount"]', '-50');
await page.click('[data-testid="fab-line-add"]');
await frames(page, 4);
await shot('10c-add-line-discount');
await tab('Evaluate');
await big('Costing').click();
await page.waitForSelector('[data-testid="fab-view-cost"]');
check('Costing on Evaluate opens the cost model on the Quote tab', (await page.locator('.k-cm-tab.active').textContent()) === 'Quote');

// ---- a change of the model marks the results out of date and blocks the export
await page.evaluate(() => { const st = window.__phlippoStore.getState(); const d = structuredClone(st.doc); d.features = d.features.map((f) => (f.type === 'structuralMember' && f.id === 'sm2' ? { ...f, size: '40 x 40 x 4' } : f)); st.applyDocument('change', d); });
await settle(page);
await page.waitForSelector('[data-testid="fab-view-stale"]', { timeout: 10000 });
check('the model change marks the result out of date and Export is disabled', await big('Export').isDisabled());
await shot('11-stale-after-model-change');

// ---- PP1 plate: Laser & Bend, flat patterns, DXF ZIP, nest
await open('e2e/fixtures/fab/PP1-Vlakke-plaat.kcad');
await tab('Laser & Bend');
await page.waitForSelector('.k-cm-big:has(.k-cm-label:text-is("Nest"))');
await big('Flat Patterns').click();
await page.waitForSelector('[data-testid="fab-view-plates"]');
await shot('12-laser-tab-flat-patterns');
const zip = await download(() => page.click('[data-testid="fab-dxf-all"]'));
check('all plates as ZIP', zip.name.endsWith('laser.zip') && zip.bytes[0] === 0x50 && zip.bytes[1] === 0x4b);
await big('Nest').click();
await page.waitForSelector('[data-testid="fab-view-nest"] svg');
await shot('13-nest-sheet');
// docs/37 ch. 9 P3.6: the nest ran in the worker and Cancel Nesting is off again; P3.9: a piece dragged over the border
// turns red and blocks the export, dragged back it is fine
const cancelOff = await page.locator('.k-cm-small:has(span:text-is("Cancel Nesting"))').first().evaluate((el) => el.classList.contains('disabled') || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true');
check('P3.6: after nesting Cancel Nesting is off again', cancelOff);
const piece = page.locator('[data-testid="fab-nest-piece"]').first();
const pb = await piece.boundingBox();
await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
await page.mouse.down();
await page.mouse.move(pb.x + pb.width / 2 - pb.width * 0.6, pb.y + pb.height / 2, { steps: 5 });
await page.mouse.up();
await frames(page, 3);
check('P3.9: a piece dragged over the border of the sheet is red', (await page.locator('[data-testid="fab-nest-piece-bad"]').count()) === 1);
await shot('13b-nest-piece-moved-red');
const bad = page.locator('[data-testid="fab-nest-piece-bad"]').first(), bb = await bad.boundingBox();
// a piece over the edge stays visible (red); dragged well inside the sheet
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.mouse.move(bb.x + bb.width / 2 + pb.width * 1.5, bb.y + bb.height / 2, { steps: 5 });
await page.mouse.up();
await frames(page, 3);
await shot('13c-nest-piece-moved-back');
check('P3.9: dragged back inside the sheet it is fine again', (await page.locator('[data-testid="fab-nest-piece-bad"]').count()) === 0);

// ---- PP2 L profile and the hat profile: bend sequence
await open('e2e/fixtures/fab/PP2-L-profiel.kcad');
await tab('Laser & Bend');
await big('Bend Sequence').click();
await page.waitForSelector('[data-testid="fab-bend-step"]', { timeout: 60000 });
await shot('14-bend-sequence-pp2');
const bend = await download(() => small('Bend Sheet').click());
check('bend sheet PDF', bend.name.endsWith('plooiblad.pdf'));
await open('e2e/fixtures/fab/Hoedprofiel.kcad');
await tab('Laser & Bend');
await big('Bend Sequence').click();
await page.waitForSelector('[data-testid="fab-bend-step"]', { timeout: 60000 });
check('hat profile: 4 bend steps', (await page.locator('[data-testid="fab-bend-step"]').count()) === 4);
check('P4.7: the hat shows the flat and its state after each of the 4 steps', (await page.locator('[data-testid="fab-bend-state"]').count()) === 5);
await shot('15-bend-sequence-hat');

// ---- the door handle: nothing but "No cost assigned", no error
await open('voorbeelden/deurkruk/Kruk.kcad');
await tab('Quote');
await big('Cost Model').click();
await page.waitForSelector('[data-testid="fab-view-cost"]', { timeout: 60000 });
check('door handle: everything in No cost assigned', /No cost assigned \(1\)/.test(await page.locator('[data-testid="fab-view-cost"]').textContent()));
await shot('16-deurkruk-no-cost-assigned');

// ---- no fabrication tab on a drawing
await page.evaluate(() => { const K = window.__phlippoKit, st = window.__phlippoStore.getState(); st.openDocument(K.createDocument('Tekening', 'drawing')); });
await settle(page);
const dtabs = await page.locator('.k-cm-tab').allTextContents();
check('no Laser & Bend or Quote tab on a drawing', !dtabs.includes('Laser & Bend') && !dtabs.includes('Quote'), dtabs.join(' | '));

await browser.close();
process.exit(exitCode(results, errors));
