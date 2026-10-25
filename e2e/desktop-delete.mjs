// The Delete key in the desktop app (Electron on dist/, or the installed exe with PHLIPPO_EXE): sketch a rectangle,
// select a line, press Delete; then a feature; the window must keep responding.
import { _electron as electron } from 'playwright';

const exe = process.env.PHLIPPO_EXE;
const app = await electron.launch(exe ? { executablePath: exe, args: [], env: { ...process.env, PHLIPPO_E2E: '1' } } : { args: ['.'], env: { ...process.env, PHLIPPO_E2E: '1', VITE_DEV_SERVER_URL: '' } });
const page = await app.firstWindow();
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForTimeout(800);
// the installed app holds the user's own autosave: keep a copy and put it back at the end
const savedAutosave = await page.evaluate(() => localStorage.getItem('phlippo.autosave'));
const alive = async (label) => {
  const r = await Promise.race([page.evaluate(() => 1), new Promise((res) => setTimeout(() => res('timeout'), 5000))]);
  console.log(`${r === 1 ? 'ok  ' : 'FAIL'} ${label}`);
  return r === 1;
};
await page.click('.k-doctype:has-text("Part")').catch(() => undefined);
await page.waitForTimeout(500);
await page.keyboard.press('Delete');
await alive('Delete in an empty part');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(500);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
let p = await P(0, 0); await page.mouse.click(p.x, p.y);
p = await P(60, 40); await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
p = await P(30, 40); await page.mouse.click(p.x, p.y);
await page.waitForTimeout(200);
await page.keyboard.press('Delete');
await page.waitForTimeout(800);
const ok1 = await alive('Delete a sketch line');
const n = ok1 ? await page.evaluate(() => { const s = window.__phlippoStore.getState(); return Object.keys(s.doc.sketches[s.activeSketchId]?.entities ?? {}).length; }) : -1;
console.log('entities after delete:', n);
await page.keyboard.press('Control+q').catch(() => undefined);
await page.evaluate(() => window.__phlippoStore.getState().exitSketch()).catch(() => undefined);
await page.waitForTimeout(400);
await page.locator('.k-tree-row:has-text("Sketch1")').first().click().catch(() => undefined);
await page.keyboard.press('Delete');
await page.waitForTimeout(800);
await alive('Delete the sketch feature');
await page.screenshot({ path: 'e2e-out/desktop-delete.png' }).catch(() => undefined);
console.log('logs:', logs.slice(-10));
await page.evaluate((a) => (a === null ? localStorage.removeItem('phlippo.autosave') : localStorage.setItem('phlippo.autosave', a)), savedAutosave).catch(() => undefined);
await app.close();
