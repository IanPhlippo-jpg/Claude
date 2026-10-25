// look-dev: the door handle drawing (voorbeelden/deurkruk/Deurkruk-tekening.kcad) -> e2e-out/look-drawing*.png
// With LOOK_ACTIONS=1 also runs Auto Balloon, BOM, Hole Table and General Table as a user would.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const d = JSON.parse(readFileSync(process.env.LOOK_FILE ?? 'voorbeelden/deurkruk/Deurkruk-tekening.kcad', 'utf8')); delete d.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), d);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'e2e-out/look-drawing.png' });
if (process.env.LOOK_ACTIONS) {
  const px = (x, y) => page.evaluate(([x, y]) => window.__phlippoSheet.toPx([x, y]), [x, y]);
  const clickAt = async (x, y) => { const p = await px(x, y); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300); };
  // fresh Auto Balloon on the iso view (default Square layout), as Ian would
  await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; s.applyDocument('clear', { ...s.doc, sheets: [{ ...sh, symbols: [], magneticLines: [] }] }); s.startSymbol('autoBalloon'); });
  if (process.env.LOOK_LAYOUT) await page.click(`[data-testid="balloon-layout-${process.env.LOOK_LAYOUT}"]`);
  const iso = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.find((v) => v.type === 'isometric').position);
  await clickAt(iso[0], iso[1]);
  await page.waitForTimeout(800);
  await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.selectDrawingView(s.doc.sheets[0].views.find((x) => x.type === 'front').id); s.insertHoleTable(); });
  await page.mouse.move(700, 700); await page.waitForTimeout(200);
  await clickAt(30, 120);
  await page.evaluate(() => window.__phlippoStore.getState().insertGeneralTable(3, 3));
  await clickAt(30, 60);
  await page.mouse.move(300, 1000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e-out/look-drawing2.png' });
}
console.log(JSON.stringify(await page.evaluate(() => { const s = window.__phlippoStore.getState().doc.sheets[0]; return { size: s.size, scale: s.scale, views: s.views.map((v) => ({ name: v.name, type: v.type, pos: v.position, scale: v.scale, parent: v.parentId })), symbols: (s.symbols ?? []).length, tables: (s.tables ?? []).map((t) => t.kind + '@' + t.position), notes: (s.notes ?? []).map((n) => n.text.slice(0, 30) + '@' + n.position) }; }), null, 1));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
