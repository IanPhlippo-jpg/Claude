// Since 0.3.4 the installed program has no test hooks (QA F53/F65); the unpackaged shell (`electron .` on dist/) uses the
// same profile (%APPDATA%\phlippo-cad), so it reads and writes the installed app's autosave. Run `npm run build` first.
import { _electron as electron } from 'playwright';
import { writeFileSync } from 'node:fs';
const app = await electron.launch({ args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const page = await app.firstWindow();
await page.waitForTimeout(6000);
const doc = await page.evaluate(() => JSON.stringify(window.__phlippoStore.getState().doc));
writeFileSync('e2e-out/user-part1.json', doc);
const sk = await page.evaluate(() => { const d = window.__phlippoStore.getState().doc; return Object.values(d.sketches).map((s) => ({ name: s.name, ents: Object.values(s.entities).map((e) => e.kind + (e.construction ? '(c)' : '')), cons: s.constraintOrder.map((id) => s.constraints[id].kind + (s.constraints[id].value !== undefined ? '=' + s.constraints[id].value : '')) })); });
console.log(JSON.stringify(sk, null, 1));
await app.close();
