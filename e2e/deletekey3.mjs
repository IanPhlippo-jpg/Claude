// Delete in the over-defined center rectangle sketch of the user's own part (e2e/fixtures/user-part1.json)
import { chromium, _electron as electron } from 'playwright';
import { readFileSync } from 'node:fs';
import { skip } from './lib/check.mjs';

const exe = process.env.PHLIPPO_EXE;
const app = exe ? await electron.launch({ executablePath: exe, args: [] }) : null;
const browser = exe ? null : await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = exe ? await app.firstWindow() : await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
const alive = async (label) => {
  const t0 = Date.now();
  const r = await Promise.race([page.evaluate(() => 1), new Promise((res) => setTimeout(() => res('timeout'), 8000))]);
  console.log(`${r === 1 ? 'ok  ' : 'FROZEN'} ${label} (${Date.now() - t0} ms)`);
  if (r !== 1) { console.log(logs); if (app) await app.close().catch(skip('deletekey3.mjs:15')); process.exit(1); }
};
if (!exe) {
  await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
  await page.reload();
  await page.waitForSelector('.k-viewport');
  await page.click('.k-doctype:has-text("Part")');
} else await page.waitForTimeout(6000);
// the installed app holds the user's own autosave: keep a copy and put it back at the end
const savedAutosave = exe ? await page.evaluate(() => localStorage.getItem('phlippo.autosave')) : null;
const doc = JSON.parse(readFileSync(new URL('./fixtures/user-part1.json', import.meta.url), 'utf8'));
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), doc);
await page.waitForTimeout(1500);
await alive('open the part');
const sid = Object.values(doc.sketches).find((s) => s.name === 'Sketch2').id;
const t0 = Date.now();
await page.evaluate((id) => window.__phlippoStore.getState().editSketch(id), sid);
await alive(`edit Sketch2 (${Date.now() - t0} ms)`);
for (const kind of ['line', 'point', 'all']) {
  await page.evaluate(([id, kind]) => {
    const s = window.__phlippoStore.getState();
    const sk = s.doc.sketches[id];
    const ents = Object.values(sk.entities);
    const sel = kind === 'all' ? ents.map((e) => ({ kind: 'entity', id: e.id })) : [{ kind: 'entity', id: ents.find((e) => e.kind === kind && (kind !== 'line' || !e.construction)).id }];
    s.setSelection(sel);
  }, [sid, kind]);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);
  await alive(`Delete ${kind}`);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  await alive(`Undo after deleting ${kind}`);
}
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(500);
for (const name of ['Fillet1', 'Sketch2', 'Boss-Extrude1', 'Sketch1']) {
  await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), doc);
  await page.waitForTimeout(800);
  const id = doc.features.find((f) => f.name === name)?.id;
  await page.evaluate((id) => window.__phlippoStore.getState().setSelectedFeature(id), id);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(1200);
  await alive(`Delete feature ${name}`);
  const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { feats: s.doc.features.map((f) => f.name), dialog: s.dialog, msgs: (s.messages ?? []).slice(-2) }; });
  console.log('   ', JSON.stringify(st));
}
console.log('logs:', logs);
if (app) { await page.evaluate((a) => (a === null ? localStorage.removeItem('phlippo.autosave') : localStorage.setItem('phlippo.autosave', a)), savedAutosave).catch(skip('deletekey3.mjs:63')); await app.close(); } else await browser.close();
