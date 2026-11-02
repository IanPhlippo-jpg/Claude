// Puts a document back as the autosave of the installed app (PHLIPPO_EXE): node e2e/desktop-restore-autosave.mjs <file.json>
// Since 0.3.4 the installed program has no test hooks (QA F53/F65); the unpackaged shell (`electron .` on dist/) uses the
// same profile (%APPDATA%\phlippo-cad), so it reads and writes the installed app's autosave. Run `npm run build` first.
// With PHLIPPO_USER_DATA (the CI) it works in that profile instead, and it checks that the autosave is still there after
// a restart of the shell: exit 1 when it is not.
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.log('usage: node e2e/desktop-restore-autosave.mjs <file.json>'); process.exit(1); }
const doc = JSON.parse(readFileSync(file, 'utf8'));
// Linux runners (CI) start Electron without its sandbox: unprivileged user namespaces are off there
const launch = () => electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const names = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('phlippo.autosave') ?? '{"features":[]}').features.map((f) => f.name));
let app = await launch();
let page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.evaluate((d) => { localStorage.setItem('phlippo.autosave', JSON.stringify({ format: 'phlippo-cad', ...d }, null, 2)); }, doc);
console.log('autosave now:', await names(page));
await Promise.race([app.close(), new Promise((res) => setTimeout(res, 10000))]);
// the next start of the shell finds it
app = await launch();
page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
const back = await names(page);
const want = doc.features.map((f) => f.name);
const ok = JSON.stringify(back) === JSON.stringify(want);
console.log(`${ok ? 'ok  ' : 'FAIL'} the autosave is there after a restart (${back.length} features)`);
await Promise.race([app.close(), new Promise((res) => setTimeout(res, 10000))]);
process.exit(ok ? 0 : 1);
