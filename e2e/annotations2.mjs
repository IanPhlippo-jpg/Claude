// Drawing annotations part 2 on the lever drawing: Title Block Fields, Revision Symbol + Revision Table, Revision Cloud, Weld Symbol, Datum Target.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete tek.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(1200);
const toPx = (p) => page.evaluate((q) => window.__phlippoSheet.toPx(q), p);
const click = async (p) => { const q = await toPx(p); await page.mouse.click(q.x, q.y); await page.waitForTimeout(150); };
const sheetState = () => page.evaluate(() => { const s = window.__phlippoStore.getState().doc.sheets[0]; return { tb: s.titleBlock ?? {}, revs: (s.revisions ?? []).map((r) => r.rev), symbols: (s.symbols ?? []).map((x) => x.kind + ':' + (x.text ?? '')) }; });

// Title Block Fields
await page.click('.k-cm-tab:has-text("Sheet Format")');
await page.click('.k-cm-big:has-text("Title Block Fields") .k-cm-main');
await page.waitForTimeout(200);
await page.fill('[data-testid="tb-company"]', 'PHLIPPO');
await page.fill('[data-testid="tb-drawnBy"]', 'IAN');
await page.fill('[data-testid="tb-drawnDate"]', '2026-10-21');
await page.fill('[data-testid="tb-dwgNo"]', 'DK-001');
await page.click('[data-testid="titleblock-pm"] .k-pm-ok');
await page.waitForTimeout(200);
let s = await sheetState();
const tbText = await page.locator('[data-testid="title-block-values"]').innerHTML();
check('Title Block Fields fill the title block (company, drawn by, date, DWG NO.)', s.tb.company === 'PHLIPPO' && /IAN/.test(tbText) && /2026-10-21/.test(tbText) && (await page.locator('text=DK-001').count()) === 1, JSON.stringify(s.tb));

// Revision Symbol: starts the revision table with A
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-small:has-text("Revision Symbol")');
await click([150, 180]);
s = await sheetState();
check('Revision Symbol starts revision A and the Revision Table', JSON.stringify(s.revs) === '["A"]' && s.symbols.includes('revision:A') && (await page.locator('[data-testid="revision-table"]').count()) === 1, JSON.stringify(s));
await page.click('[data-testid="add-revision"]');
await click([300, 120]);
s = await sheetState();
check('Add Revision: B is the current revision (symbol B, B in the REVISION cell of the title block)', JSON.stringify(s.revs) === '["A","B"]' && s.symbols.includes('revision:B') && (await page.locator('[data-testid="tb-revision"]').textContent()) === 'B', JSON.stringify(s));
await page.keyboard.press('Escape');

// Revision Cloud around the collar
await page.click('.k-cm-small:has-text("Revision Cloud")');
await click([120, 150]);
await click([175, 205]);
await page.keyboard.press('Escape');
// Weld Symbol and Datum Target
await page.click('.k-cm-small:has-text("Weld Symbol")');
await click([200, 200]);
await click([225, 225]);
await page.keyboard.press('Escape');
await page.click('.k-cm-small:has-text("Datum Target")');
await click([180, 150]);
await click([200, 130]);
await page.keyboard.press('Escape');
s = await sheetState();
const dom = await page.evaluate(() => ({ cloud: document.querySelectorAll('.k-revision-cloud').length, weld: document.querySelectorAll('.k-weld').length, target: document.querySelectorAll('.k-datum-target').length }));
check('Revision Cloud, Weld Symbol (5) and Datum Target (A1) placed', dom.cloud === 1 && dom.weld === 1 && dom.target === 1 && s.symbols.includes('weld:5') && s.symbols.includes('datumTarget:A1'), JSON.stringify({ dom, s }));
await page.mouse.move(5, 900);
await shot('an3-revisions');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
