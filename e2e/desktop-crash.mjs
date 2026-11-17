// Desktop shell, QA 0.5.14 advice P2-3: a crashed or hung renderer never holds the window hostage.
//   1. crash: the renderer process is killed (webContents.forcefullyCrashRenderer) while the document has unsaved
//      changes; the shell shows its own message, forgets the dirty flag and loads the window again; Document Recovery
//      then offers the copy the autosave wrote to disk (P2-6);
//   2. hang: the renderer runs a busy loop and the user closes the window with unsaved changes; the close question
//      gets no receipt within 5 s, so the shell offers to close, and "Close Phlippo CAD" ends the window;
//   3. the window's "unresponsive" event offers the same choice ("Wait" keeps the window).
// The shell's message boxes are replaced in the main process by a recorder that answers like the user would.
// Runs the built bundle (dist/) in a throw-away profile: `npm run build:e2e` first.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { settle } from './lib/wait.mjs';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-crash-'));
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
const shots = process.env.E2E_SHOTS ?? null;
const shot = (page, n) => (shots ? page.screenshot({ path: path.join(shots, `${n}.png`) }) : Promise.resolve());
const until = async (ok, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ok()) return true; await new Promise((r) => setTimeout(r, 200)); } return ok(); };
const recoverFiles = () => { const d = path.join(profile, 'autorecover'); return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.endsWith('.autorecover.kcad')) : []; };

const env = { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '', PHLIPPO_USER_DATA: profile };
const app = await electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env });
let page = await app.firstWindow();
await page.waitForSelector('.k-viewport', { timeout: 60000 });
await page.waitForFunction(() => !!window.__phlippoStore);
await page.evaluate(() => window.__phlippoStore.getState().setDialog(null));
// every message box of the shell is recorded; the answer is set per step
const boxLog = path.join(profile, 'boxes.jsonl');
await app.evaluate(({ dialog }, log) => {
  globalThis.__boxes = [];
  globalThis.__answer = 0;
  const fsm = process.getBuiltinModule('node:fs');
  dialog.showMessageBox = async (_win, opts) => {
    const b = { message: opts.message, buttons: opts.buttons, answer: globalThis.__answer };
    globalThis.__boxes.push(b);
    fsm.appendFileSync(log, `${JSON.stringify(b)}\n`);
    return { response: globalThis.__answer };
  };
}, boxLog);
const logged = () => (fs.existsSync(boxLog) ? fs.readFileSync(boxLog, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
const boxes = () => app.evaluate(() => globalThis.__boxes);
const makeChange = (depth) => page.evaluate((depth) => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  st.newDocument('part');
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-20, -15], [20, -15], [20, 15], [-20, 15]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const doc = window.__phlippoStore.getState().doc;
  window.__phlippoStore.getState().applyDocument('Crash test', { ...doc, sketches: { s1: sk }, features: [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false }] });
  return window.__phlippoStore.getState().dirty;
}, depth);

// ---- 1. crash with unsaved changes
check('the document has unsaved changes', await makeChange(17));
await settle(page);
check('the autosave put a copy in the auto-recover folder (P2-6)', await until(() => recoverFiles().length === 1, 15000), recoverFiles().join(', '));
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.forcefullyCrashRenderer());
check('the shell shows its own message after the crash (P2-3)', await until(async () => (await boxes()).some((b) => /stopped unexpectedly/.test(b.message)), 15000), JSON.stringify(await boxes()));
// "Reload": the same window loads the app again
const back = await until(() => app.evaluate(({ BrowserWindow }) => { const wc = BrowserWindow.getAllWindows()[0]?.webContents; return !!wc && !wc.isCrashed() && !wc.isLoading(); }), 60000);
check('the shell loads the window again after the crash', back);
// The test driver's page stays marked as crashed after the reload, so from here on the renderer is reached through
// the shell (webContents.executeJavaScript), as a user's window would be.
const R = (js) => app.evaluate(({ BrowserWindow }, code) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(code), js);
check('the app is loaded again with its store', await until(() => R('!!window.__phlippoStore && !!document.querySelector(".k-viewport")').catch(() => false), 60000));
const paneOk = await until(() => R('window.__phlippoStore.getState().taskPane === "recovery" && document.querySelectorAll("[data-testid=recovery-disk] li").length === 1').catch(() => false), 30000);
const after = await R('({ pane: window.__phlippoStore.getState().taskPane, name: window.__phlippoStore.getState().doc.name, items: [...document.querySelectorAll("[data-testid=recovery-disk] li")].map((l) => l.innerText) })');
check('Document Recovery opens and lists the copy of the crashed document', paneOk, JSON.stringify(after));
if (shots) {
  await app.evaluate(async ({ BrowserWindow }, file) => {
    const img = await BrowserWindow.getAllWindows()[0].webContents.capturePage();
    process.getBuiltinModule('node:fs').writeFileSync(file, img.toPNG());
  }, path.join(shots, 'crash-recovery.png'));
}

// ---- 3. "unresponsive": Wait keeps the window
await app.evaluate(() => { globalThis.__answer = 0; globalThis.__boxes = []; });
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].emit('unresponsive'));
check('an unresponsive renderer gets the Wait / Close choice', await until(async () => (await boxes()).some((b) => /not responding/.test(b.message) && b.buttons.includes('Wait')), 5000), JSON.stringify(await boxes()));
check('"Wait" keeps the window', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length === 1));

// ---- 2. hang: close with unsaved changes while the renderer is in a busy loop
await R('window.__phlippoStore.setState({ dirty: true }); true');
check('the document has unsaved changes again', await until(() => R('window.__phlippoStore.getState().dirty'), 5000));
await new Promise((r) => setTimeout(r, 500)); // fixed: the dirty flag reaches the shell over IPC
await app.evaluate(() => { globalThis.__answer = 1; globalThis.__boxes = []; });
// the renderer stops answering: a 30 s busy loop, started without waiting for it
await app.evaluate(({ BrowserWindow }) => { void BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('{ const t = Date.now(); while (Date.now() - t < 30000) {} }').catch(() => undefined); });
const t0 = Date.now();
const exited = new Promise((r) => app.process().once('exit', () => r(true)));
await app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); });
const gone = await Promise.race([exited, new Promise((r) => setTimeout(() => r(false), 25000))]);
// whichever comes first: the missing receipt of the close question (5 s) or the window's own "unresponsive" event
const hang = logged().filter((b) => b.answer === 1 && /does not answer|not responding/.test(b.message));
check('closing a hung window offers to close it within a few seconds (P2-3)', hang.length === 1 && hang[0].buttons.includes('Close Phlippo CAD'), JSON.stringify(logged()));
check('"Close Phlippo CAD" ends the hung window', gone === true && Date.now() - t0 < 25000, `${gone} after ${Date.now() - t0} ms`);

await app.close().catch(() => undefined);
fs.rmSync(profile, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
