// Evaluate ▸ Thickness Analysis and Undercut Analysis on the door handle lever.
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
const kruk = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk.kcad', 'utf8')); delete kruk.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), kruk);
await page.waitForTimeout(1200);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-small:has-text("Thickness Analysis")');
await page.waitForTimeout(500);
await page.locator('[data-testid="thickness-pm"] input.k-num').first().fill('9');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
const legend = await page.locator('[data-testid="thickness-legend"]').innerText();
const thin = Number(/(\d+) faces thinner/.exec(legend)?.[1] ?? -1);
check('Thickness Analysis (target 9 mm): the walls around the 8 x 8 square hole are thin regions', thin >= 1 && /Minimum thickness/.test(legend), legend);
await page.mouse.move(5, 900);
await shot('ev1-thickness');
await page.click('[data-testid="thickness-pm"] .k-pm-ok');
await page.click('.k-cm-small:has-text("Undercut Analysis")');
await page.waitForTimeout(500);
await page.click('[data-testid="undercut-pm"] .k-pm-stylebtn:has-text("Z")');
await page.waitForTimeout(600);
const u = await page.locator('[data-testid="undercut-legend"]').innerText();
const nums = u.split(/\r?\n/).map((l) => /^\s*(\d+) /.exec(l)).filter(Boolean).map((m) => Number(m[1]));
check('Undercut Analysis (pull Z): five classes counted, some faces free', nums.length === 5 && nums[4] > 0, u);
await page.mouse.move(5, 900);
await shot('ev2-undercut');
await page.click('[data-testid="undercut-pm"] .k-pm-ok');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
