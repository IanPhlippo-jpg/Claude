// Since 0.3.4 the installed program has no test hooks (QA F53/F65); the unpackaged shell (`electron .` on dist/) uses the
// same profile (%APPDATA%\phlippo-cad), so it reads and writes the installed app's autosave. Run `npm run build` first.
import { _electron as electron } from 'playwright';
const app = await electron.launch({ args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const page = await app.firstWindow();
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.waitForTimeout(6000);
await page.screenshot({ path: 'e2e-out/desktop-peek.png' });
const st = await Promise.race([page.evaluate(() => { const s = window.__phlippoStore?.getState(); return s ? { kind: s.doc.kind, name: s.doc.name, feats: s.doc.features.length, dialog: s.dialog, sketch: s.activeSketchId } : 'no store'; }), new Promise((r) => setTimeout(() => r('timeout'), 5000))]);
console.log(JSON.stringify(st));
console.log(logs.slice(-15).join('\n'));
await app.close();
