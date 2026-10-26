// Machine tool (not in the regression): opens the parts of voorbeelden/deurkruk with the B-rep kernel on and reports
// per part which bodies became exact, the volume against the mesh kernel and any rebuild error; screenshots per part.
// Usage: npm run build:e2e, vite preview on 4173, then node e2e/tools/brep-parts.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const OUT = 'e2e-out';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.kernel', 'brep'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const rows = [];
for (const name of ['Deur', 'Rozet', 'Sleutelrozet', 'Vierkantstift', 'Kruk']) {
  const text = readFileSync(`voorbeelden/deurkruk/${name}.kcad`, 'utf8');
  await page.evaluate((t) => { const d = JSON.parse(t); delete d.format; window.__phlippoStore.getState().openDocument(d); }, text);
  const mesh = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return Math.abs(v); }));
  await page.waitForFunction(() => window.__phlippoStore.getState().rebuild.bodies.some((b) => b.exact), null, { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { features: s.doc.features.filter((f) => f.type !== 'sketch').map((f) => f.type), errors: s.rebuild.errors, bodies: s.rebuild.bodies.map((b) => ({ exact: !!b.exact, vol: b.exactVolume })) }; });
  rows.push({ name, ...st, mesh });
  await page.screenshot({ path: `${OUT}/brep-part-${name}.png` });
}
console.log(JSON.stringify(rows, null, 1));
console.log('page errors:', pageErrors);
await browser.close();
