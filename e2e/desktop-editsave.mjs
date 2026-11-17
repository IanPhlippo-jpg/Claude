// Desktop shell, QA 0.5.14 advice (0.5.15):
//   P1-1 Ctrl+S during Edit Component writes the assembly (with the edited part) to the assembly file, never the part;
//   P1-2 a restart for the graphics choice never drops unsaved work: the shell refuses it, the app asks to save first;
//   P2-1 Options ▸ OK keeps options that another path saved meanwhile.
// Runs the built bundle (dist/) in a throw-away profile: `npm run build:e2e` first.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'phlippo-editsave-'));
const target = path.join(profile, 'Pins.kcad');
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` (${detail})`}`); };
const shots = process.env.E2E_SHOTS ?? null;
const shot = (page, n) => (shots ? page.screenshot({ path: path.join(shots, `${n}.png`) }) : Promise.resolve());

const env = { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '', PHLIPPO_USER_DATA: profile };
const app = await electron.launch({ args: process.platform === 'linux' ? ['.', '--no-sandbox'] : ['.'], env });
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForFunction(() => !!window.__phlippoStore);
await page.evaluate(() => window.__phlippoStore.getState().setDialog(null));
await app.evaluate(({ dialog }, f) => { globalThis.__saves = 0; dialog.showSaveDialog = async () => { globalThis.__saves++; return { canceled: false, filePath: f }; }; }, target);
const S = (fn, arg) => page.evaluate(fn, arg);
const ctrlS = async () => {
  await S(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.keyboard.press('Control+s');
};

// ---- P1-1: an assembly with two different parts of the same name (P2-13), saved, then one part edited in context
await S(() => {
  const K = window.__phlippoKit;
  const part = (id) => ({ ...K.createDocument('Pin'), id });
  const comp = (id, p, x) => ({ id, name: `Pin<${id}>`, part: p, position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: x === 0, suppressed: false });
  const a = K.createDocument('Pins', 'assembly');
  a.id = 'asm-e2e';
  a.components = [comp('c1', part('p1'), 0), comp('c2', part('p2'), 50)];
  window.__phlippoStore.getState().openDocument(a);
  window.__phlippoStore.setState({ dirty: true });
});
await ctrlS();
await page.waitForFunction(() => !window.__phlippoStore.getState().dirty, null, { timeout: 15000 });
const first = JSON.parse(fs.readFileSync(target, 'utf8'));
check('the assembly is saved as an assembly', first.kind === 'assembly' && first.components?.length === 2, first.kind);

await S(() => window.__phlippoStore.getState().editComponent('c1'));
await page.waitForFunction(() => window.__phlippoStore.getState().doc.kind === 'part');
await S(() => { const st = window.__phlippoStore.getState(); st.applyDocument('Units', { ...st.doc, units: 'in' }); });
await shot(page, 'p1-1-edit-component');
await ctrlS();
await page.waitForFunction(() => !window.__phlippoStore.getState().dirty, null, { timeout: 15000 }).catch(() => {});
const second = JSON.parse(fs.readFileSync(target, 'utf8'));
const st1 = await S(() => { const s = window.__phlippoStore.getState(); return { kind: s.doc.kind, name: s.doc.name, ctx: !!s.editContext, dirty: s.dirty, msg: s.messages.map((m) => m.text).slice(-1)[0] }; });
check('Ctrl+S during Edit Component writes the assembly, not the part (P1-1)', second.kind === 'assembly' && second.name === 'Pins', `${second.kind} ${second.name}`);
check('the saved assembly holds the edited part', second.components?.[0]?.part?.units === 'in', JSON.stringify(second.components?.map((c) => c.part.units)));
check('the other part with the same name is left alone (P2-13)', second.components?.[1]?.part?.id === 'p2' && second.components?.[1]?.part?.units === 'mm');
check('the edit stays open, the part keeps its name, nothing unsaved', st1.kind === 'part' && st1.name === 'Pin' && st1.ctx && !st1.dirty, JSON.stringify(st1));
check('only one Save dialog (the second save reuses the assembly file)', (await app.evaluate(() => globalThis.__saves)) === 1);
await shot(page, 'p1-1-saved');
await S(() => window.__phlippoStore.getState().returnToAssembly());

// ---- P1-2: a restart with unsaved changes
await S(() => { const st = window.__phlippoStore.getState(); st.applyDocument('Units', { ...st.doc, units: 'mm' }); });
await page.waitForTimeout(300); // the dirty flag reaches the shell over IPC
const refused = await S(() => window.phlippoDesktop.restartApp());
check('the shell refuses a restart while there are unsaved changes (P1-2)', refused === false && !app.process().killed, String(refused));
await S(() => window.phlippoDesktop.setSoftwareGL(true));
await S(() => window.__phlippoStore.getState().setDialog('options'));
// System Options has more than one "Performance" page (Drawings ▸ Performance too): the one with software OpenGL
const perfCats = page.locator('.k-opt-cat', { hasText: /^\s*Performance\s*$/ });
for (let i = 0; i < (await perfCats.count()); i++) {
  await perfCats.nth(i).click();
  if (await page.locator('text=Use software OpenGL').count()) break;
}
const off = page.locator('[data-testid="software-gl-off"]');
await off.waitFor({ timeout: 5000 }).catch(() => {});
check('Options shows the button back to the graphics card', (await off.count()) === 1);
if (await off.count()) {
  await off.click();
  const ask = page.locator('[data-testid="ask"]');
  await ask.waitFor({ timeout: 5000 }).catch(() => {});
  const text = (await ask.count()) ? await ask.innerText() : '';
  await shot(page, 'p1-2-save-question');
  check('the restart asks to save first (Save / Don\'t Save / Cancel)', /Save/.test(text) && /Cancel/.test(text), text.slice(0, 120));
  await page.locator('[data-testid="ask"] .k-btn:has-text("Cancel")').click().catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(500);
  const alive = await S(() => ({ dirty: window.__phlippoStore.getState().dirty, units: window.__phlippoStore.getState().doc.units }));
  check('Cancel keeps the app and the unsaved work', alive.dirty === true && !app.process().killed, JSON.stringify(alive));
}
await S(() => window.phlippoDesktop.setSoftwareGL(false));
await S(() => window.__phlippoStore.getState().setDialog(null));

// ---- P2-1: Options ▸ OK after another path saved an option
await S(() => window.__phlippoStore.getState().setDialog('options'));
await page.waitForSelector('.k-opt-cat');
await S(() => {
  // the Material dialog saves a favourite while Options is open (a write the dialog's copy does not know about)
  const p = JSON.parse(localStorage.getItem('phlippo.prefs') ?? '{}');
  p['material.favorites'] = JSON.stringify(['AISI 304']);
  localStorage.setItem('phlippo.prefs', JSON.stringify(p));
});
await page.click('.k-dialog .k-btn.primary:has-text("OK")');
await page.waitForTimeout(300);
const fav = await S(() => JSON.parse(localStorage.getItem('phlippo.prefs') ?? '{}')['material.favorites']);
check('Options ▸ OK keeps a favourite saved elsewhere (P2-1)', fav === JSON.stringify(['AISI 304']), String(fav));
// ---- P3-1: Package Files writes every file into one folder the user picks, by base name only
const packDir = fs.mkdtempSync(path.join(profile, 'pack-'));
await app.evaluate(({ dialog }, d) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [d] }); }, packDir);
const packed = await S(() => {
  const data = (t) => new TextEncoder().encode(t).buffer;
  return window.phlippoDesktop.savePackage([{ name: 'Pins.kcad', data: data('{}') }, { name: '../Pin.kcad', data: data('{}') }, { name: 'x.exe', data: data('MZ') }]);
});
const inDir = fs.readdirSync(packDir).sort();
check('Package Files: one folder, base names only, only .kcad (P3-1)', packed?.count === 2 && inDir.join(',') === 'Pin.kcad,Pins.kcad' && packed.skipped.length === 1, JSON.stringify({ packed, inDir }));
check('no page errors', errors.length === 0, errors.join(' | '));

await S(() => window.phlippoDesktop.close(true)).catch(() => {});
await app.close().catch(() => {});
fs.rmSync(profile, { recursive: true, force: true });
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
