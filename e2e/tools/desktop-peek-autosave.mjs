// Reads the autosave of the installed app (PHLIPPO_EXE) without changing it
// Since 0.3.4 the installed program has no test hooks (QA F53/F65); the unpackaged shell (`electron .` on dist/) uses the
// same profile (%APPDATA%\phlippo-cad), so it reads and writes the installed app's autosave. Run `npm run build` first.
import { _electron as electron } from 'playwright';
const app = await electron.launch({ args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
console.log('autosave:', await page.evaluate(() => JSON.parse(localStorage.getItem('phlippo.autosave') ?? '{"features":[]}').features.map((f) => f.name)));
console.log('open doc:', await page.evaluate(() => window.__phlippoStore.getState().doc.features.map((f) => f.name)));
await app.close();
