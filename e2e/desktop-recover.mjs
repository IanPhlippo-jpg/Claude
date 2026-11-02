// Auto-Recover in the desktop app (QA F153, F154, F156, F162): Electron on the built bundle (dist/, run `npm run build`
// first), or on a dev server with PHLIPPO_DEV_URL=http://127.0.0.1:<port>. Everything runs in a throw-away profile
// (PHLIPPO_USER_DATA): the user's documents, settings and auto-recover copies are never touched.
//   1. two documents with the same name, each with a change: the forced auto-recover write keeps a copy of each (F153);
//   2. the renderer cannot choose the folder: a folder it names is ignored; the shell's folder dialog can (F156);
//   3. the program is killed (a crash) and started again: Document Recovery opens, the copy opens as an unsaved
//      "Part1 (Recovered)" with the change in it (F154); saving it removes its copy and only its copy (F153);
//   4. software OpenGL: the profile file holds only the choice, and turning it off removes it (F162).
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-recover-'));
const env = { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: process.env.PHLIPPO_DEV_URL ?? '', PHLIPPO_USER_DATA: profile };
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`);
};
const start = async () => {
  // Linux runners (CI) start Electron without its sandbox: unprivileged user namespaces are off there
  const app = await electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
  await page.waitForSelector('.k-viewport', { timeout: 60000 });
  await page.waitForTimeout(800);
  return { app, page };
};
const recoverFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.autorecover.kcad')) : []);
const defaultDir = path.join(profile, 'autorecover');

// ---- first run: two documents named Part1, each with its own change ----
let { app, page } = await start();
await page.keyboard.press('Escape');
const makePart = (depth) => page.evaluate((depth) => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  st.newDocument('part');
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[-20, -15], [20, -15], [20, 15], [-20, 15]];
  for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const doc = window.__phlippoStore.getState().doc;
  window.__phlippoStore.getState().applyDocument('Recover test', { ...doc, sketches: { s1: sk }, features: [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false }] });
  const s = window.__phlippoStore.getState();
  return { id: s.doc.id, name: s.doc.name, dirty: s.dirty };
}, depth);
const a = await makePart(8);
check('a new document has a stable id and unsaved changes', !!a.id && a.name === 'Part1' && a.dirty, JSON.stringify(a));
check('the forced auto-recover write succeeds', await page.evaluate(() => window.__phlippoAutoRecover.write()));
await page.waitForTimeout(50);
const b = await makePart(12);
check('a second document with the same name has another id', !!b.id && b.id !== a.id && b.name === 'Part1', JSON.stringify(b));
await page.evaluate(() => window.__phlippoAutoRecover.write());
let files = recoverFiles(defaultDir);
check('two documents named Part1 keep two copies in <profile>/autorecover (F153)', files.length === 2 && files.every((n) => n.startsWith('Part1~')), files.join(', '));
const listed = await page.evaluate(() => window.phlippoDesktop.listRecover());
check('Document Recovery lists both as Part1', listed.length === 2 && listed.every((r) => r.label === 'Part1'), JSON.stringify(listed));

// ---- F156: the renderer names no folder ----
const evil = `${profile}-evil`;
await page.evaluate((folder) => window.phlippoDesktop.writeRecover({ folder, id: 'probe', name: 'Probe', data: new TextEncoder().encode('{}').buffer }), evil);
check('a folder sent by the renderer is ignored and not created (F156)', !fs.existsSync(evil) && recoverFiles(defaultDir).some((n) => n.startsWith('Probe~')));
await page.evaluate(() => window.phlippoDesktop.removeRecover({ id: 'probe' }));
check('the copy of a document is removed by its id', !recoverFiles(defaultDir).some((n) => n.startsWith('Probe~')));
const chosen = path.join(profile, 'chosen folder');
await app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] }); }, chosen);
await page.evaluate(() => window.__phlippoStore.getState().setDialog('options'));
await page.locator('.k-opt-cat:has-text("Backup/Recover")').click();
const shownBefore = await page.locator('[data-testid="recover-folder"]').inputValue();
check('Options shows the folder of the shell, read-only', path.normalize(shownBefore) === defaultDir && (await page.locator('[data-testid="recover-folder"]').getAttribute('readonly')) !== null, shownBefore);
await page.locator('[data-testid="recover-folder-browse"]').click();
await page.waitForTimeout(300);
const shownAfter = await page.locator('[data-testid="recover-folder"]').inputValue();
const settings = JSON.parse(fs.readFileSync(path.join(profile, 'autorecover.json'), 'utf8'));
check('Browse… uses the folder dialog of the shell and the choice is kept in the profile', path.normalize(shownAfter) === chosen && path.normalize(settings.folder) === chosen, `${shownAfter} / ${JSON.stringify(settings)}`);
await page.evaluate(() => window.__phlippoAutoRecover.write());
check('the next copy goes to the chosen folder', recoverFiles(chosen).length === 1, recoverFiles(chosen).join(', '));
await page.locator('[data-testid="recover-folder-default"]').click();
await page.waitForTimeout(300);
check('Default goes back to <profile>/autorecover', path.normalize(await page.locator('[data-testid="recover-folder"]').inputValue()) === defaultDir && !fs.existsSync(path.join(profile, 'autorecover.json')));
// ---- F162: only the choice is kept ----
await page.evaluate(() => window.phlippoDesktop.setSoftwareGL(true));
const gpuFile = path.join(profile, 'gpu.json');
check('software OpenGL keeps only the choice in gpu.json (F162)', fs.existsSync(gpuFile) && fs.readFileSync(gpuFile, 'utf8') === '{"software":true}', fs.existsSync(gpuFile) ? fs.readFileSync(gpuFile, 'utf8') : 'missing');
await page.locator('.k-opt-cat:not(.child)', { hasText: /^Performance$/ }).first().click();
// the note reads the shell's status first: wait for it
await page.locator('[data-testid="software-gl-note"]').waitFor({ timeout: 5000 }).catch(() => undefined);
check('Options says software OpenGL takes effect at the next start, with a way back', (await page.locator('[data-testid="software-gl-note"]').count()) === 1 && (await page.locator('[data-testid="software-gl-off"]').count()) === 1);
await page.evaluate(() => window.phlippoDesktop.setSoftwareGL(false));
check('turning software OpenGL off removes the file', !fs.existsSync(gpuFile));
await page.keyboard.press('Escape');

// ---- a crash: the process ends without saving ----
// the whole process tree goes at once (the GPU and renderer processes too), as in a crash
const exited = new Promise((r) => app.process().once('exit', r));
if (process.platform === 'win32') (await import('node:child_process')).spawnSync('taskkill', ['/pid', String(app.process().pid), '/T', '/F']);
else app.process().kill('SIGKILL');
await exited;
// the single-instance lock of the killed program is released by the system a moment later
await new Promise((r) => setTimeout(r, 1500));

({ app, page } = await start());
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const pane = await page.evaluate(() => window.__phlippoStore.getState().taskPane);
check('after the crash Document Recovery opens by itself', pane === 'recovery', String(pane));
const items = page.locator('[data-testid="recovery-disk"] li');
check('it lists both Part1 copies', (await items.count()) === 2 && (await items.allInnerTexts()).every((t) => t.includes('Part1.kcad')), (await items.allInnerTexts()).join(' | '));
// the newest copy first: the second document (depth 12)
await items.first().click();
const opened = await page.waitForFunction(() => /Recovered/.test(window.__phlippoStore.getState().doc.name), null, { timeout: 30000 }).then(() => true, () => false);
const rec = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { id: s.doc.id, name: s.doc.name, dirty: s.dirty, depth: s.doc.features.find((f) => f.type === 'extrude')?.depth }; });
check('the recovered copy opens as "Part1 (Recovered)" with unsaved changes (F154)', opened && rec.name === 'Part1 (Recovered)' && rec.dirty === true, JSON.stringify(rec));
check('the recovered copy holds the change', rec.depth === 12 && rec.id === b.id, JSON.stringify(rec));
check('the title row shows "(Recovered)"', (await page.locator('.k-title').innerText()).includes('Part1 (Recovered)'));
// Save: a recovered document has no file, so the dialog asks; its copy goes, the other Part1 copy stays
const target = path.join(profile, 'saved', 'Recovered.kcad');
fs.mkdirSync(path.dirname(target), { recursive: true });
await app.evaluate(({ dialog }, f) => { globalThis.__saves = 0; dialog.showSaveDialog = async () => { globalThis.__saves++; return { canceled: false, filePath: f }; }; }, target);
await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
await page.keyboard.press('Control+s');
await page.waitForFunction(() => !window.__phlippoStore.getState().dirty, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
const saves = await app.evaluate(() => globalThis.__saves);
files = recoverFiles(defaultDir);
check('Save asks for a file (no handle of an earlier document is reused)', saves === 1 && fs.existsSync(target), String(saves));
check('after Save only the other Part1 copy is left (F153)', files.length === 1 && (await page.evaluate(() => window.__phlippoStore.getState().dirty)) === false, files.join(', '));
await app.close();

fs.rmSync(profile, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
