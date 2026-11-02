// Desktop app check: launches the Electron shell on the built bundle (dist/), verifies the bridge,
// the window buttons (maximize / restore) and that the app renders. Run `npm run build` first.
import { _electron as electron } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dontSave } from './lib/check.mjs';
// a fresh profile of its own: the checks never touch the user's documents or settings
const profile = (await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(), 'phlippo-desktop-'));

mkdirSync('e2e-out', { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`);
};

const app = await electron.launch({ args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '', PHLIPPO_USER_DATA: profile } });
const page = await app.firstWindow();
const consoleLog = [];
page.on('console', (m) => consoleLog.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
page.on('pageerror', (e) => consoleLog.push(`pageerror: ${e.message}`.slice(0, 300)));
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForTimeout(800);
// start-up by design: the Welcome dialog over an empty window (no document is made: this runs in the real profile)
check('Welcome dialog over an empty window', (await page.locator('.k-dialog-title').innerText()).includes('Welcome') && (await page.locator('[data-testid="nodoc"]').count()) === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('desktop bridge present', await page.evaluate(() => typeof window.phlippoDesktop?.toggleMaximize === 'function'));
check('window is frameless with the app title row', await page.locator('.k-win-controls button').count() === 3);
const maximized0 = await page.evaluate(() => window.phlippoDesktop.isMaximized());
check('window starts maximized', maximized0 === true, String(maximized0));
await page.click('.k-win-controls button:nth-child(2)');
await page.waitForTimeout(500);
const maximized1 = await page.evaluate(() => window.phlippoDesktop.isMaximized());
check('restore button leaves the maximized state', maximized1 === false, String(maximized1));
await page.click('.k-win-controls button:nth-child(2)');
await page.waitForTimeout(500);
check('maximize button maximizes again', (await page.evaluate(() => window.phlippoDesktop.isMaximized())) === true);
check('title row shows no document name without a document', !(await page.locator('.k-title').innerText()).includes('Part1'));
await page.screenshot({ path: 'e2e-out/desktop-app.png' });
const bounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
check('window fills the screen (maximized bounds)', bounds.width >= 1000 && bounds.height >= 600, JSON.stringify(bounds));
check('the app is served from app://phlippo (F88)', page.url().startsWith('app://phlippo/'), page.url());
// F28: a new assembly starts Insert Component and opens the file dialog by itself (the native dialog is stubbed)
await app.evaluate(({ dialog }) => { globalThis.__opens = 0; dialog.showOpenDialog = async () => { globalThis.__opens++; return { canceled: true, filePaths: [] }; }; });
await page.evaluate(() => window.__phlippoStore.getState().setDialog('welcome'));
await page.waitForTimeout(300);
await page.click('.k-doctype:has-text("Assembly")');
await page.waitForTimeout(800);
const opens = await app.evaluate(() => globalThis.__opens);
check('a new assembly opens the file dialog for Insert Component (F28)', opens === 1 && (await page.evaluate(() => window.__phlippoStore.getState().insertingComponent)) === true, String(opens));
// F51: File > Open of a STEP file in the desktop app: the OpenCascade worker and its WebAssembly start under app://
// with the Content-Security-Policy of the shell (the native dialog is stubbed and returns the fixture)
const stepFile = (await import('node:path')).resolve('e2e/fixtures/plate-hole.step');
await app.evaluate(({ dialog }, f) => { globalThis.__stepOpens = 0; dialog.showOpenDialog = async () => { globalThis.__stepOpens++; return { canceled: false, filePaths: [f] }; }; }, stepFile);
await page.evaluate(() => window.__phlippoStore.getState().cancelInsertComponent?.());
await page.evaluate(() => window.__phlippoStore.getState().setDialog('welcome'));
await page.waitForTimeout(300);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(500);
await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
await page.keyboard.press('Escape');
await page.keyboard.press('Control+o');
await dontSave(page, 1000); // Save changes? → Don't Save, when it asks
const stepOk = await page.waitForFunction(() => window.__phlippoStore.getState().doc.features.some((f) => f.type === 'imported'), null, { timeout: 60000 }).then(() => true, () => false);
const stepState = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { name: s.doc.name, bodies: s.rebuild.bodies.length, msgs: s.messages.map((m) => m.text).slice(-2) }; });
stepState.opens = await app.evaluate(() => globalThis.__stepOpens);
if (!stepOk) console.log(consoleLog.slice(-8).join(' | '));
check('a STEP file opens in the desktop app through the OpenCascade worker (F51)', stepOk && stepState.name === 'plate-hole' && stepState.bodies === 1, JSON.stringify(stepState));
// docs/14: the B-rep kernel refines a part in the desktop app (the worker runs under app:// with its own policy)
await page.evaluate(() => localStorage.setItem('phlippo.kernel', 'brep'));
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-20, -15], [20, -15], [20, 15], [-20, 15]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 5)[0];
  const d = K.createDocument('Exact');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 8, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await dontSave(page, 1000); // Save changes? → Don't Save, when it asks
const exactOk = await page.waitForFunction(() => window.__phlippoStore.getState().rebuild.bodies.some((b) => b.exact), null, { timeout: 60000 }).then(() => true, () => false);
const ev = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies[0]?.exactVolume ?? 0);
check('a part becomes an exact B-rep body in the desktop app (docs/14)', exactOk && Math.abs(ev - (40 * 30 * 8 - Math.PI * 25 * 8)) < 1e-6, String(ev));
await app.close();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
