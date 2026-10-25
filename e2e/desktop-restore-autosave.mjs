// Puts a document back as the autosave of the installed app (PHLIPPO_EXE): node e2e/desktop-restore-autosave.mjs <file.json>
// Since 0.3.4 the installed program has no test hooks (QA F53/F65); the unpackaged shell (`electron .` on dist/) uses the
// same profile (%APPDATA%\phlippo-cad), so it reads and writes the installed app's autosave. Run `npm run build` first.
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';

const exe = process.env.PHLIPPO_EXE;
const file = process.argv[2];
if (!file) { console.log('usage: node e2e/desktop-restore-autosave.mjs <file.json>'); process.exit(1); }
const doc = JSON.parse(readFileSync(file, 'utf8'));
const app = await electron.launch({ args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.evaluate((d) => { localStorage.setItem('phlippo.autosave', JSON.stringify({ format: 'phlippo-cad', ...d }, null, 2)); }, doc);
const back = await page.evaluate(() => JSON.parse(localStorage.getItem('phlippo.autosave')).features.map((f) => f.name));
console.log('autosave now:', back);
await app.close();
