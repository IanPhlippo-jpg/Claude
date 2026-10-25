// Reads the autosave of the installed app (PHLIPPO_EXE) without changing it
import { _electron as electron } from 'playwright';
const app = await electron.launch({ executablePath: process.env.PHLIPPO_EXE, args: [], env: { ...process.env, PHLIPPO_E2E: '1' } });
const page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 30000 });
console.log('autosave:', await page.evaluate(() => JSON.parse(localStorage.getItem('phlippo.autosave') ?? '{"features":[]}').features.map((f) => f.name)));
console.log('open doc:', await page.evaluate(() => window.__phlippoStore.getState().doc.features.map((f) => f.name)));
await app.close();
