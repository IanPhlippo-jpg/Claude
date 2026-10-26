// Desktop app check: launches the Electron shell on the built bundle (dist/), verifies the bridge,
// the window buttons (maximize / restore) and that the app renders. Run `npm run build` first.
import { _electron as electron } from 'playwright';
import { mkdirSync } from 'node:fs';
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
await page.waitForSelector('.k-viewport', { timeout: 30000 });
await page.waitForTimeout(800);
// start-up as the original: the Welcome dialog over an empty window (no document is made: this runs in the real profile)
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
await app.close();
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed ? 1 : 0);
