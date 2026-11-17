// Puts a document back as the autosave of the desktop app: node e2e/desktop-restore-autosave.mjs <file.json>
// Since 0.5.16 (QA 0.5.14 advice P2-6) the desktop app keeps its autosave on disk, in the auto-recover folder of the
// profile, instead of in the browser storage; it starts with a new document and Document Recovery offers the copies.
// This script writes the document as such a copy through the shell's own bridge (the release build has no test hooks,
// QA F53/F65), starts the shell again and checks that Document Recovery lists it: exit 1 when it does not.
// The unpackaged shell (`electron .` on dist/) uses the installed app's profile (%APPDATA%\phlippo-cad); with
// PHLIPPO_USER_DATA (the CI) it works in that profile instead. Run `npm run build` first.
import { _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.log('usage: node e2e/desktop-restore-autosave.mjs <file.json>'); process.exit(1); }
const doc = JSON.parse(readFileSync(file, 'utf8'));
const id = doc.id ?? `restored-${Date.now()}`;
const name = doc.name ?? 'Restored';
// Linux runners (CI) start Electron without its sandbox: unprivileged user namespaces are off there
const launch = () => electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
let app = await launch();
let page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
const written = await page.evaluate(({ d, id, name }) => window.phlippoDesktop.writeRecover({ id, name, data: new TextEncoder().encode(JSON.stringify({ format: 'phlippo-cad', ...d, id })).buffer }), { d: doc, id, name });
console.log('auto-recover copy written:', JSON.stringify(written));
await Promise.race([app.close(), new Promise((res) => setTimeout(res, 10000))]);
// the next start of the shell finds it: Document Recovery opens by itself and lists it
app = await launch();
page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
const items = page.locator('[data-testid="recovery-disk"] li');
await items.first().waitFor({ timeout: 30000 }).catch(() => undefined);
const texts = await items.allInnerTexts();
const ok = !written?.error && texts.some((t) => t.includes(name));
console.log(`${ok ? 'ok  ' : 'FAIL'} Document Recovery lists the copy after a restart (${texts.join(' | ') || 'empty'})`);
await Promise.race([app.close(), new Promise((res) => setTimeout(res, 10000))]);
process.exit(ok ? 0 : 1);
