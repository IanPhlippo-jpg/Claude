// Block E: Move with Triad (drag an arrow, turn a ring) and the light cyan faces of a selected mate (fr. 365/372).
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const rozet = JSON.parse(readFileSync('voorbeelden/deurkruk/Rozet.kcad', 'utf8')); delete rozet.format;
const pin = JSON.parse(readFileSync('voorbeelden/deurkruk/Vierkantstift.kcad', 'utf8')); delete pin.format;
await S(({ rozet, pin }) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Triad', 'assembly');
  d.components = [{ id: 'g', name: 'Rozet<1>', part: rozet, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }, { id: 'p', name: 'Vierkantstift<1>', part: pin, position: [80, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
}, { rozet, pin });
await page.waitForTimeout(1200);
await page.click('.k-cm-tab:has-text("Assembly")').catch(skip('triad:31'));
await page.click('.k-tree-row:has-text("Vierkantstift<1>")', { button: 'right' });
await page.click('.k-menu-item:has-text("Move with Triad")');
await page.waitForTimeout(300);
check('Move with Triad shows the triad', (await page.locator('[data-testid="move-triad"]').count()) === 1);
await page.screenshot({ path: `${OUT}/triad1.png` });
const before = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'p').position);
const arrow = await page.locator('[data-testid="triad-arrow-x"] path').boundingBox();
const cx = arrow.x + arrow.width / 2, cy = arrow.y + arrow.height / 2;
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 40, cy + 20, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
const after = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'p').position);
check('dragging the X arrow moves the component along X only', Math.abs(after[0] - before[0]) > 1 && Math.abs(after[1] - before[1]) < 1e-6 && Math.abs(after[2] - before[2]) < 1e-6, JSON.stringify({ before, after }));
const q0 = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'p').rotation);
// a point on the Y ring that is not under an arrow, then a drag around the centre
const rp = await S(() => { const pl = document.querySelector('[data-testid="triad-ring-y"]'); const r = pl.ownerSVGElement.getBoundingClientRect(); for (const t of pl.getAttribute('points').split(' ')) { const [x, y] = t.split(',').map(Number); const e = document.elementFromPoint(x + r.left, y + r.top); if (e?.getAttribute('data-testid') === 'triad-ring-y') return [x + r.left, y + r.top]; } return null; });
await page.mouse.move(rp[0], rp[1]);
await page.mouse.down();
await page.mouse.move(rp[0] + 50, rp[1] - 40, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
const q1 = await S(() => window.__phlippoStore.getState().doc.components.find((c) => c.id === 'p').rotation);
check('dragging a ring turns the component', JSON.stringify(q0) !== JSON.stringify(q1), JSON.stringify({ q0, q1 }));
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('Esc ends Move with Triad', (await page.locator('[data-testid="move-triad"]').count()) === 0);

// a mate: its faces are cyan while it is selected
await S(() => { const s = window.__phlippoStore.getState(); s.undo(); s.undo(); });
await S(() => window.__phlippoStore.getState().startMate());
const pick = (cid, n) => S(({ cid, n }) => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies.find((x) => x.id === cid);
  const f = b.faces.filter((x) => !x.curved && x.normal[0] * n[0] + x.normal[1] * n[1] + x.normal[2] * n[2] > 0.99).sort((a, c) => c.area - a.area)[0];
  s.setSelectedFace({ bodyId: cid, faceId: f.id });
}, { cid, n });
await pick('g', [0, 0, 1]);
await pick('p', [0, 0, -1]);
await S(() => window.__phlippoStore.getState().commitMate());
await page.waitForTimeout(600);
const selMate = await S(() => { const s = window.__phlippoStore.getState(); return s.doc.mates?.some((m) => m.id === s.selectedFeatureId); });
check('the new mate stays selected', selMate);
await page.screenshot({ path: `${OUT}/triad2-mate-cyan.png` });
console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
