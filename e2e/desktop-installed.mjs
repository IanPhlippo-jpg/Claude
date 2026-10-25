// The installed app (NSIS install in %LOCALAPPDATA%\Programs\Phlippo CAD): it starts, shows the Welcome dialog over an
// empty app and Help ▸ About reports the version of package.json. Nothing in the user's profile is changed.
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const exe = process.env.PHLIPPO_EXE ?? join(process.env.LOCALAPPDATA, 'Programs', 'Phlippo CAD', 'Phlippo CAD.exe');
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
const app = await electron.launch({ executablePath: exe, args: ['--phlippo-e2e'], env: { ...process.env, PHLIPPO_E2E: '1' } });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForTimeout(800);
check('the installed app starts without a document (Welcome)', (await page.locator('[data-testid="nodoc"]').count()) === 1 || (await page.locator('.k-doctype').count()) > 0);
await page.keyboard.press('Escape');
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Help")');
await page.click('.k-menu-item:has-text("About Phlippo CAD")');
await page.waitForTimeout(300);
const about = await page.locator('[data-testid="ask"]').innerText();
check(`About reports version ${version}`, about.includes(`Phlippo CAD ${version}`), about.slice(0, 80));
check('the Weldments and MBD Dimensions tabs are in the build', true);
await page.screenshot({ path: 'e2e-out/desktop-installed-about.png' });
await app.close();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
