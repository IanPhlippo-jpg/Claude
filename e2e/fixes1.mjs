// Fixes after user feedback: Center Rectangle, Add construction lines, centred dimension text, ribbon flyouts above the
// tab strip, the Modify box layout, the turning logo behind an empty document.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? Object.values(sk.entities).filter((e) => e.kind === 'line').map((e) => ({ c: !!e.construction, a: sk.points[e.p1], b: sk.points[e.p2] })) : null; });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(400);
// since 0.3.2 (QA F15) the graphics area has no watermark, as the original
check('an empty part shows no watermark logo in the graphics area', (await page.locator('[data-testid="bg-logo"], .k-bg-logo').count()) === 0);
await shot('fx0-empty-logo');

// sketch on the Front Plane
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);

// the rectangle flyout opens above the tab strip (not clipped by the Command Ribbon)
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Corner Rectangle"]) .k-cm-small-arrow');
await page.waitForTimeout(200);
const menu = await page.evaluate(() => { const m = [...document.querySelectorAll('.k-menu')].find((x) => /Center Rectangle/.test(x.textContent)); if (!m) return null; const r = m.getBoundingClientRect(); const tabs = document.querySelector('.k-cm-tabs').getBoundingClientRect(); const top = document.elementFromPoint(r.left + 20, Math.min(r.bottom - 8, tabs.bottom + 4)); return { inBody: m.parentElement === document.body, bottom: r.bottom, tabsBottom: tabs.bottom, onTop: !!top && m.contains(top) }; });
check('the Corner/Center Rectangle flyout is drawn above the tab strip', menu && menu.inBody && menu.bottom > menu.tabsBottom && menu.onTop, JSON.stringify(menu));
await page.mouse.move(5, 900);
await shot('fx1-flyout');
await page.keyboard.press('Escape');

// Center Rectangle: 80 x 40 around (0, 0)
await page.evaluate(() => window.__phlippoStore.getState().setTool('centerRectangle'));
let p = await P(0, 0); await page.mouse.click(p.x, p.y);
p = await P(40, 20); await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
let L = await S();
const solid = L.filter((l) => !l.c);
const xs = solid.flatMap((l) => [l.a.x, l.b.x]), ys = solid.flatMap((l) => [l.a.y, l.b.y]);
check('Center Rectangle: an 80 x 40 rectangle around the centre with two construction diagonals', solid.length === 4 && Math.abs(Math.max(...xs) - Math.min(...xs) - 80) < 0.5 && Math.abs(Math.max(...ys) - Math.min(...ys) - 40) < 0.5 && L.filter((l) => l.c).length === 2, JSON.stringify({ w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), cons: L.filter((l) => l.c).length }));

// Corner Rectangle with Add construction lines (from the midpoints)
await page.evaluate(() => window.__phlippoStore.getState().setTool('rectangle'));
await page.waitForTimeout(200);
await page.click('[data-testid="rect-construction"]');
await page.click('[data-testid="rect-midpoints"]');
await page.waitForTimeout(100);
p = await P(60, 30); await page.mouse.click(p.x, p.y);
p = await P(120, 70); await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
L = await S();
check('Corner Rectangle ▸ Add construction lines (From Midpoints) adds two construction lines', L.filter((l) => l.c).length === 4 && L.filter((l) => !l.c).length === 8, JSON.stringify(L.filter((l) => l.c).length));

// a dimension: the text sits in the middle between the arrows
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const sk = s.doc.sketches[s.activeSketchId];
  const top = Object.values(sk.entities).find((e) => e.kind === 'line' && !e.construction && Math.abs(sk.points[e.p1].y - 70) < 1e-6 && Math.abs(sk.points[e.p2].y - 70) < 1e-6);
  s.commit('Dim', (k) => ({ ...k, constraints: { ...k.constraints, dimT: { id: 'dimT', kind: 'length', refs: [top.id], value: 60, labelOffset: { x: 70, y: 85 } } }, constraintOrder: [...k.constraintOrder, 'dimT'] }));
});
await page.waitForTimeout(400);
const lbl = await page.evaluate(() => { const el = [...document.querySelectorAll('.k-viewport *')].find((x) => x.children.length === 0 && x.textContent.trim() === '60.00'); if (!el) return null; const r = el.getBoundingClientRect(); return { cx: r.left + r.width / 2 }; });
const mid = await P(90, 85);
check('the dimension text is centred between the arrows', lbl && Math.abs(lbl.cx - mid.x) < 6, JSON.stringify({ lbl, mid }));

// the Modify box in the layout of the original
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setModify({ id: 'dimT', x: 900, y: 400 }); });
await page.waitForTimeout(300);
const mod = await page.evaluate(() => { const m = document.querySelector('.k-modify'); if (!m) return null; const r = m.getBoundingClientRect(); const name = m.querySelector('[data-testid="modify-name"]'); const acts = m.querySelector('.k-modify-actions'); return { w: Math.round(r.width), value: m.querySelector('input.k-num')?.value, name: name?.textContent, actionsBeforeName: !!(acts && name && (acts.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
check('Modify box: narrow, icon row under the title, then the name and the value', mod && mod.w < 230 && mod.value === '60.00mm' && /@Sketch1/.test(mod.name) && mod.actionsBeforeName, JSON.stringify(mod));
await shot('fx2-modify');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
