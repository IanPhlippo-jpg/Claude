// Section View options: Section 2 (quarter cut), cap colour, graphics-only, zonal, selected bodies, Save.
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
const part = JSON.parse(readFileSync('voorbeelden/deurkruk/Rozet.kcad', 'utf8'));
delete part.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), part);
await page.waitForTimeout(800);
console.log('A');
await page.evaluate(() => window.__phlippoStore.getState().startSectionView());
console.log('B');
await page.waitForTimeout(300);
await page.evaluate(() => window.__phlippoStore.getState().updateSectionView({ graphicsOnly: true }));
console.log('C');
await page.waitForTimeout(800);
console.log('D');
await page.screenshot({ path: `${OUT}/dbg1.png`, clip: { x: 800, y: 380, width: 560, height: 480 } });
await page.evaluate(() => window.__phlippoStore.getState().updateSectionView({ graphicsOnly: false, cap: false }));
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/dbg2.png`, clip: { x: 800, y: 380, width: 560, height: 480 } });
console.log(errors);
await browser.close();
