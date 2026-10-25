// Desktop shell without PHLIPPO_E2E: no test hooks on window, the Content-Security-Policy is in place, the bridge
// exposes no file paths to name. Run `npm run build` first.
import { _electron as electron } from 'playwright';
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
const env = { ...process.env, VITE_DEV_SERVER_URL: '' };
delete env.PHLIPPO_E2E;
const app = await electron.launch({ args: ['.'], env });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
check('no test hooks without PHLIPPO_E2E', await page.evaluate(() => typeof window.__phlippoStore === 'undefined' && typeof window.__phlippoKit === 'undefined' && typeof window.__phlippoSnapshot === 'undefined'));
check('bridge says testHooks is off', await page.evaluate(() => window.phlippoDesktop.testHooks === false));
check('Content-Security-Policy meta in the page', await page.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? '').includes("default-src 'self'")));
await app.close();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
