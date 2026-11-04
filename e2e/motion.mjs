// Motion Study on the door handle: Motion Study 1 tab, Motor Property Panel, Play / Stop of the animation.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
delete asm.motionStudy;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asm);
await page.waitForTimeout(1500);
await page.click('[data-testid="motion-tab"]');
await page.waitForTimeout(300);
check('Motion Study 1 tab opens the Motion Timeline (toolbar, tree, timeline)', (await page.locator('[data-testid="motion-manager"]').count()) === 1 && (await page.locator('.k-motion-row:has-text("Orientation and Camera Views")').count()) === 1 && (await page.locator('.k-motion-tick').count()) >= 5);
await page.click('[data-testid="motion-motor"]');
await page.waitForTimeout(300);
check('Motor PM: Rotary Motor on the lever', (await page.locator('[data-testid="motor-pm"]').count()) === 1 && (await page.locator('[data-testid="motor-comp"] option:checked').innerText()).startsWith('Rozet') === false);
await page.selectOption('[data-testid="motor-comp"]', { label: 'Kruk<1>' });
await page.selectOption('[data-testid="motor-motion"]', 'oscillating');
await page.mouse.move(5, 900);
await shot('mo1-motor-pm');
await page.click('[data-testid="motor-pm"] .k-pm-ok');
await page.waitForTimeout(300);
let s = await page.evaluate(() => { const st = window.__phlippoStore.getState(); return { motors: st.doc.motionStudy?.motors.map((m) => m.name + ':' + m.componentId + ':' + m.motion) }; });
check('RotaryMotor1 in the study and in the Motion Timeline tree', JSON.stringify(s.motors) === '["RotaryMotor1:c5:oscillating"]' && (await page.locator('.k-motion-row:has-text("RotaryMotor1")').count()) === 1, JSON.stringify(s));
await page.click('[data-testid="motion-play"]');
// the time bar moves on with each drawn frame: wait until it passed 0.5 s instead of a fixed 1.2 s (with software GL
// one frame of the assembly can take longer than that, the CI on Windows read 0 and the next frame was at 2.7 s)
await page.waitForFunction(() => window.__phlippoStore.getState().motionTime > 0.5, undefined, { timeout: 30000 }).catch(() => undefined);
const t1 = await page.evaluate(() => window.__phlippoStore.getState().motionTime);
await page.click('[data-testid="motion-stop"]');
const t2 = await page.evaluate(() => window.__phlippoStore.getState().motionTime);
await page.waitForTimeout(300);
const t3 = await page.evaluate(() => window.__phlippoStore.getState().motionTime);
check('Play runs the time bar, Stop holds it', t1 > 0.5 && Math.abs(t3 - t2) < 1e-9, `${t1} ${t2} ${t3}`);
await page.evaluate(() => window.__phlippoStore.getState().setMotionTime(1));
await page.waitForTimeout(300);
await page.mouse.move(5, 900);
await shot('mo2-motion-playing');
await page.click('.k-doctab:has-text("Model")');
check('Model tab closes the Motion Timeline', (await page.locator('[data-testid="motion-manager"]').count()) === 0);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
