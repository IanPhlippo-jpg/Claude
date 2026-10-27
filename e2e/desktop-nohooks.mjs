// Desktop shell without PHLIPPO_E2E: no test hooks on window, the Content-Security-Policy is in place, the bridge
// exposes no file paths to name. Run `npm run build` first.
import { _electron as electron } from 'playwright';
// a fresh profile of its own: the checks never touch the user's documents or settings
const profile = (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'phlippo-desktop-'));
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
const env = { ...process.env, VITE_DEV_SERVER_URL: '', PHLIPPO_USER_DATA: profile };
delete env.PHLIPPO_E2E;
// Linux runners (CI) start Electron without its sandbox: unprivileged user namespaces are off there
const app = await electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
check('no test hooks without PHLIPPO_E2E', await page.evaluate(() => typeof window.__phlippoStore === 'undefined' && typeof window.__phlippoKit === 'undefined' && typeof window.__phlippoSnapshot === 'undefined'));
check('bridge says testHooks is off', await page.evaluate(() => window.phlippoDesktop.testHooks === false));
check('Content-Security-Policy meta in the page', await page.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '').includes("default-src 'self'")));
check('no application menu (no DevTools / Reload entries in a menu, F67)', await app.evaluate(({ Menu }) => Menu.getApplicationMenu() === null));
check('permissions are refused (F87)', await page.evaluate(() => navigator.permissions.query({ name: 'notifications' }).then((r) => r.state !== 'granted', () => true)));
// the release build works as a user gets it, without the hooks (F53): Final Render, Zoom to Fit, About
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Render Tools")');
await page.click('.k-cm-big:has-text("Final Render") .k-cm-main');
await page.waitForSelector('[data-testid="final-image"]', { timeout: 15000 }).catch(() => {});
check('Final Render works without the test hooks', (await page.locator('[data-testid="final-image"]').count()) === 1);
await page.locator('.k-dialog .k-btn:has-text("Close")').first().click({ timeout: 3000 }).catch(() => page.keyboard.press('Escape'));
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.mouse.click(900, 600);
await page.keyboard.press('f');
await page.waitForTimeout(300);
check('Zoom to Fit (F) runs without a page error', errs.length === 0, errs.join(' | '));
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Help")');
await page.click('.k-menu-item:has-text("About Phlippo CAD")');
const about = await page.locator('[data-testid="ask"]').innerText();
const version = JSON.parse((await import('node:fs')).readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
check(`About reports ${version} with the notice and the licence files`, about.includes(`Phlippo CAD ${version}`) && /not affiliated with or endorsed by/.test(about) && /LICENSE\.txt/.test(about), about.slice(0, 80));
await app.close();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
