// Bug hunt: every Command Ribbon command (and its flyout items), every menu item and every tree context-menu item,
// for a part, an assembly and a drawing. After each click the state is reset; page errors, console errors and the
// crash screen are reported per command. Runs at Ian's screen size (1280 x 672 CSS px, 150 %).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5, acceptDownloads: true });
let errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|WebGL|GL_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
page.on('filechooser', () => undefined);
page.on('dialog', (d) => d.dismiss().catch(() => undefined));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

const load = (f) => { const d = JSON.parse(readFileSync(f, 'utf8')); delete d.format; return d; };
const docs = [
  ['sketch', load('voorbeelden/deurkruk/Kruk.kcad')],
  ['part', load('voorbeelden/deurkruk/Kruk.kcad')],
  ['assembly', load('voorbeelden/deurkruk/Deurkruk.kcad')],
  ['drawing', load('voorbeelden/deurkruk/Kruk-tekening.kcad')],
];
const only = process.env.ONLY;
const report = [];
let clicks = 0;

let currentKind = '';
const reset = async (doc) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press('Escape').catch(() => undefined);
  await page.evaluate((d) => {
    const S = window.__phlippoStore;
    const s = S.getState();
    const patch = {};
    for (const [k, v] of Object.entries(s)) if (typeof v !== 'function' && v && (/Edit$/.test(k) || ['analysis', 'ask', 'confirmDelete', 'drawingTool', 'markupMode', 'isolated'].includes(k))) patch[k] = null;
    S.setState({ ...patch, dialog: null, planePick: false, insertingComponent: false });
    if (s.activeSketchId) S.getState().exitSketch();
    S.getState().openDocument(JSON.parse(d.doc));
    if (d.sketch) {
      // an open sketch with a rectangle, a line and a circle on the Front Plane
      S.getState().newSketch('front');
      const K = window.__phlippoKit;
      S.getState().commit('Test geometry', (sk) => {
        const c = [[0, 0], [60, 0], [60, 40], [0, 40]];
        for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
        sk = K.addCircle(sk, { x: 30, y: 20 }, 8)[0];
        return K.addLine(sk, { x: -20, y: -10 }, { x: 80, y: 50 })[0];
      });
      const ids = S.getState().doc.sketches[S.getState().activeSketchId]?.entityOrder ?? [];
      S.setState({ selection: ids.slice(0, 2).map((id) => ({ kind: 'entity', id })) });
    }
  }, { doc: JSON.stringify(doc), sketch: currentKind === 'sketch' });
  await page.waitForTimeout(150);
};
const check = async (kind, label) => {
  await page.waitForTimeout(300);
  const crash = await page.locator('[data-testid="crash"]').count();
  if (errs.length || crash) {
    report.push({ doc: kind, command: label, errors: [...new Set(errs)].slice(0, 3), crash: !!crash });
    console.log('BUG', kind, '|', label, '|', [...new Set(errs)].slice(0, 2).join(' / '), crash ? '(crash screen)' : '');
    if (crash) await page.click('[data-testid="crash"] button').catch(() => undefined);
  }
  errs = [];
};

for (const [kind, doc] of docs) {
  if (only && only !== kind) continue;
  currentKind = kind;
  await reset(doc);
  await page.waitForTimeout(1500);
  const tabs = await page.locator('.k-cm-tab').allTextContents();
  for (let ti = 0; ti < tabs.length; ti++) {
    await reset(doc);
    await page.locator('.k-cm-tab').nth(ti).click();
    await page.waitForTimeout(150);
    // every enabled command of the tab (big, small, menu block), then every flyout item
    const labels = await page.evaluate(() => [...document.querySelectorAll('.k-cm-body button.k-cm-main, .k-cm-body button.k-cm-small, .k-cm-body button.k-cm-mbbtn')].map((b) => (b.getAttribute('data-tip') || b.textContent || '').trim()));
    for (let i = 0; i < labels.length; i++) {
      if (/^(Home|Save|Open|New|Print|Options|Rebuild)/.test(labels[i])) continue;
      await page.locator('.k-cm-tab').nth(ti).click().catch(() => undefined);
      const ok = await page.evaluate((i) => { const b = [...document.querySelectorAll('.k-cm-body button.k-cm-main, .k-cm-body button.k-cm-small, .k-cm-body button.k-cm-mbbtn')][i]; if (!b || b.disabled) return false; b.click(); return true; }, i);
      if (!ok) continue;
      clicks++;
      await check(kind, `${tabs[ti]} ▸ ${labels[i]}`);
      await reset(doc);
    }
    const arrows = await page.evaluate(() => document.querySelectorAll('.k-cm-body button.k-cm-arrow, .k-cm-body button.k-cm-small-arrow').length);
    for (let a = 0; a < arrows; a++) {
      await page.locator('.k-cm-tab').nth(ti).click().catch(() => undefined);
      const n = await page.evaluate((a) => { const b = [...document.querySelectorAll('.k-cm-body button.k-cm-arrow, .k-cm-body button.k-cm-small-arrow')][a]; if (!b || b.disabled) return 0; b.click(); return document.querySelectorAll('.k-menu .k-menu-item').length; }, a);
      for (let k = 0; k < n; k++) {
        await page.locator('.k-cm-tab').nth(ti).click().catch(() => undefined);
        const label = await page.evaluate(([a, k]) => {
          const b = [...document.querySelectorAll('.k-cm-body button.k-cm-arrow, .k-cm-body button.k-cm-small-arrow')][a];
          if (!b) return null;
          if (!document.querySelector('.k-menu')) b.click();
          const it = [...document.querySelectorAll('.k-menu .k-menu-item')][k];
          if (!it || it.disabled) return null;
          const t = it.textContent.trim();
          it.click();
          return t;
        }, [a, k]);
        if (!label) continue;
        clicks++;
        await check(kind, `${tabs[ti]} ▸ flyout ▸ ${label}`);
        await reset(doc);
      }
    }
  }
  // the menu bar
  await reset(doc);
  await page.hover('.k-brand').catch(() => undefined);
  const menus = await page.locator('.k-mb-menu').allTextContents();
  for (let mi = 0; mi < menus.length; mi++) {
    await page.hover('.k-brand').catch(() => undefined);
    await page.locator('.k-mb-menu').nth(mi).click().catch(() => undefined);
    const items = await page.locator('.k-menu-item').allTextContents();
    await page.keyboard.press('Escape');
    for (let k = 0; k < items.length; k++) {
      if (/^(Open|Save|Exit|Close|Print|Import|Export|New)/i.test(items[k].trim())) continue;
      await page.hover('.k-brand').catch(() => undefined);
      await page.locator('.k-mb-menu').nth(mi).click().catch(() => undefined);
      const ok = await page.evaluate((k) => { const it = [...document.querySelectorAll('.k-menu-item')][k]; if (!it || it.disabled || it.getAttribute('aria-disabled') === 'true') return false; it.click(); return true; }, k);
      if (!ok) { await page.keyboard.press('Escape'); continue; }
      clicks++;
      await check(kind, `menu ${menus[mi].trim()} ▸ ${items[k].trim()}`);
      await reset(doc);
    }
  }
  // right-click menus of the first tree rows
  const rows = Math.min(14, await page.locator('.k-tree-row').count());
  for (let r = 0; r < rows; r++) {
    await reset(doc);
    const row = page.locator('.k-tree-row').nth(r);
    const rowText = ((await row.textContent().catch(() => '')) ?? '').trim().slice(0, 30);
    await row.click({ button: 'right' }).catch(() => undefined);
    const n = await page.locator('.k-menu .k-menu-item, .k-ctx button').count();
    await page.keyboard.press('Escape');
    for (let k = 0; k < n; k++) {
      await page.locator('.k-tree-row').nth(r).click({ button: 'right' }).catch(() => undefined);
      const label = await page.evaluate((k) => { const it = [...document.querySelectorAll('.k-menu .k-menu-item, .k-ctx button')][k]; if (!it || it.disabled) return null; const t = it.textContent.trim(); it.click(); return t; }, k);
      if (!label) { await page.keyboard.press('Escape'); continue; }
      if (/^(Delete|Open|Save)/.test(label)) { await reset(doc); }
      clicks++;
      await check(kind, `tree "${rowText}" ▸ ${label}`);
      await reset(doc);
    }
  }
}
writeFileSync('e2e-out/clickall.json', JSON.stringify(report, null, 1));
console.log(`\n${clicks} commands clicked, ${report.length} with errors`);
await browser.close();
