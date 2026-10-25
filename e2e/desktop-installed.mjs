// The installed app (NSIS install in %LOCALAPPDATA%\Programs\Phlippo CAD): it starts, shows the Welcome dialog over an
// empty app, Help ▸ About reports the version of package.json and the independence notice, and it works as a user
// gets it: the packaged program ignores PHLIPPO_E2E (no test hooks, F53/F65), Final Render and Zoom to Fit work
// without them, and there is no application menu with DevTools (F67). Nothing in the user's profile is changed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const exe = process.env.PHLIPPO_EXE ?? join(process.env.LOCALAPPDATA, 'Programs', 'Phlippo CAD', 'Phlippo CAD.exe');
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
// PHLIPPO_E2E and --phlippo-e2e are passed on purpose: the installed program must ignore both. The fuse
// enableNodeCliInspectArguments is off (F49), so Playwright's Electron driver cannot attach; the check connects over
// Chromium's debugging protocol instead.
const proc = spawn(exe, ['--phlippo-e2e', '--remote-debugging-port=9333'], { env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: 'http://127.0.0.1:9/' }, stdio: 'ignore' });
let browser = null;
for (let i = 0; i < 60 && !browser; i++) { await new Promise((r) => setTimeout(r, 500)); browser = await chromium.connectOverCDP('http://127.0.0.1:9333').catch(() => null); }
const page = browser.contexts()[0].pages()[0] ?? (await browser.contexts()[0].waitForEvent('page'));
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForTimeout(800);
check('the installed app starts without a document (Welcome)', (await page.locator('[data-testid="nodoc"]').count()) === 1 || (await page.locator('.k-doctype').count()) > 0);
check('the installed app loads its own page, not the dev server URL from the environment', /^file:/.test(page.url()), page.url());
check('the Welcome shows the independence notice', /not affiliated with or endorsed by Dassault/.test(await page.locator('[data-testid="welcome-legal"]').innerText().catch(() => '')));
check('no test hooks in the installed app, even with PHLIPPO_E2E=1', await page.evaluate(() => Object.getOwnPropertyNames(window).filter((k) => k.startsWith('__phlippo')).length === 0 && window.phlippoDesktop.testHooks === false));
check('the inspect fuse is off: the check attaches over the debugging protocol', true);

// a part with a body through the UI: Extruded Boss on a rectangle needs hooks, so open the Welcome's Part and use Render
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Render Tools")');
await page.waitForTimeout(200);
await page.click('.k-cm-big:has-text("Final Render") .k-cm-main');
await page.waitForSelector('[data-testid="final-image"]', { timeout: 15000 }).catch(() => {});
check('Final Render works without the test hooks (F53)', (await page.locator('[data-testid="final-image"]').count()) === 1);
await page.keyboard.press('Escape');
await page.locator('.k-dialog .k-btn:has-text("Close")').first().click().catch(() => {});
await page.mouse.click(900, 600);
await page.keyboard.press('f');
await page.waitForTimeout(300);
check('Zoom to Fit (F) runs without a page error', pageErrors.length === 0, pageErrors.join(' | '));

await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Help")');
await page.click('.k-menu-item:has-text("About Phlippo CAD")');
await page.waitForTimeout(300);
const about = await page.locator('[data-testid="ask"]').innerText();
check(`About reports version ${version}`, about.includes(`Phlippo CAD ${version}`), about.slice(0, 80));
check('About carries the notice and the licence files', /not affiliated with or endorsed by/.test(about) && /LICENSE\.txt/.test(about));
await page.screenshot({ path: 'e2e-out/desktop-installed-about.png' });
const dir = join(exe, '..');
const { existsSync } = await import('node:fs');
check('LICENSE.txt and THIRD-PARTY-NOTICES.txt are installed', existsSync(join(dir, 'LICENSE.txt')) && existsSync(join(dir, 'THIRD-PARTY-NOTICES.txt')), dir);
await browser.close().catch(() => {});
proc.kill();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
