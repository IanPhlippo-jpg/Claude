// Puts a document back as the autosave of the installed app (PHLIPPO_EXE): node e2e/desktop-restore-autosave.mjs <file.json>
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';

const exe = process.env.PHLIPPO_EXE;
const file = process.argv[2];
if (!exe || !file) { console.log('usage: PHLIPPO_EXE=... node e2e/desktop-restore-autosave.mjs <file.json>'); process.exit(1); }
const doc = JSON.parse(readFileSync(file, 'utf8'));
const app = await electron.launch({ executablePath: exe, args: [], env: { ...process.env, PHLIPPO_E2E: '1' } });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.evaluate((d) => { localStorage.setItem('phlippo.autosave', JSON.stringify({ format: 'phlippo-cad', ...d }, null, 2)); }, doc);
const back = await page.evaluate(() => JSON.parse(localStorage.getItem('phlippo.autosave')).features.map((f) => f.name));
console.log('autosave now:', back);
await app.close();
