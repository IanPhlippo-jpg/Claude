// look-dev at Ian's DPI: Boss-Extrude of a dimensioned sketch, and Fillet with one edge picked -> e2e-out/ian-ext-dims.png, ian-fillet.png
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// the reference plate: 80 x 80 with a Ø35 hole, dimensioned, on the Top Plane
await page.evaluate(() => {
  const S = window.__phlippoStore;
  const K = window.__phlippoKit;
  S.getState().newSketch('top');
  S.getState().commit('plate', (sk) => {
    const c = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
    const lines = [];
    for (let i = 0; i < 4; i++) { const r = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] }); sk = r[0]; lines.push(r[1]); }
    const r = K.addCircle(sk, { x: 0, y: 0 }, 17.5); sk = r[0];
    window.__ids = { lines: lines.map((l) => l.id), circle: r[1].id };
    return sk;
  });
  const ids = window.__ids;
  S.getState().commit('dims', (sk) => {
    sk = K.addConstraint(sk, 'length', [ids.lines[0]], { value: 80 })[0];
    sk = K.addConstraint(sk, 'length', [ids.lines[1]], { value: 80 })[0];
    return K.addConstraint(sk, 'diameter', [ids.circle], { value: 35 })[0];
  });
});
await page.waitForTimeout(400);
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'e2e-out/ian-ext-dims.png' });
await page.click('.k-pm-ok').catch(() => undefined);
await page.waitForTimeout(1200);
// Fillet on a vertical edge
await page.evaluate(() => window.__phlippoStore.getState().startRound('fillet'));
await page.waitForTimeout(300);
const edge = await page.evaluate(() => { const b = window.__phlippoStore.getState().rebuild.bodies[0]; const e = b.edges.find((x) => x.straight && Math.abs(x.length - 10) < 1e-3); return e.id; });
await page.evaluate((id) => { const s = window.__phlippoStore.getState(); s.toggleSelectedEdge(id, false); s.updateFeatureDraft({ size: 15 }); }, edge);
await page.waitForTimeout(1500);
await page.screenshot({ path: 'e2e-out/ian-fillet.png' });
const tb = await page.locator('[data-testid="selection-toolbar"]').count();
const n0 = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.edges.length);
await page.click('[data-testid="seltb-face1"]').catch(() => undefined);
await page.waitForTimeout(400);
const n1 = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.edges.length);
await page.screenshot({ path: 'e2e-out/ian-fillet-tb.png' });
console.log('selection toolbar', tb, 'edges', n0, '->', n1);
console.log('errors', errors);
await browser.close();
