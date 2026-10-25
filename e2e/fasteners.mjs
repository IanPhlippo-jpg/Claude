// Assembly ▸ Smart Fasteners: a base plate and a bracket plate with two M6 clearance holes get two ISO 4762 M6 screws.
import { chromium } from 'playwright';
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const plate = (name, t, color) => {
    let s = K.createSketch('sk1', 'Sketch1', 'top');
    const c = [[-40, -25], [40, -25], [40, 25], [-40, 25]];
    let first = null, prev = null;
    for (let i = 0; i < 4; i++) {
      const p = prev ?? { x: c[i][0], y: c[i][1] };
      const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
      const [n, l] = K.addLine(s, p, q);
      s = n; if (!first) first = l.p1; prev = l.p2;
    }
    const d = { ...K.createDocument(name), sketches: { sk1: s } };
    d.planes.face = { id: 'face', name: 'Face', origin: [0, t, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], kind: 'face' };
    d.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
      { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: t, reverse: false },
      { id: 'f3', type: 'hole', name: 'M6 Clearance Hole1', suppressed: false, plane: 'face', points: [{ x: -25, y: 0 }, { x: 25, y: 0 }], holeType: 'simple', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.4, csDiameter: 12.4, csAngle: 90 },
    ];
    d.appearance = color;
    return { ...d, kind: 'part' };
  };
  const asm = K.createDocument('Assem2', 'assembly');
  asm.components = [
    { id: 'a', name: 'BasePlate<1>', part: plate('BasePlate', 10, '#9ea3a8'), position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false },
    { id: 'b', name: 'Bracket<1>', part: plate('Bracket', 8, '#3a5fa8'), position: [0, 10, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false },
  ];
  asm.mates = [];
  window.__phlippoStore.getState().openDocument(asm);
});
await page.waitForTimeout(1200);
await page.click('.k-cm-big:has-text("Smart Fasteners") .k-cm-main');
await page.waitForTimeout(600);
const holes = await page.locator('[data-testid="fastener-holes"] .k-selbox-row').count();
const groups = await page.locator('[data-testid="fastener-groups"]').innerText();
check('Smart Fasteners finds the 4 holes as 2 groups of coaxial holes: Socket Head Cap Screw M6 x 25', holes === 4 && (groups.match(/Group/g) ?? []).length === 2 && /Socket Head Cap Screw M6 x 25/.test(groups), groups);
await page.mouse.move(5, 900);
await shot('sf1-smart-fasteners-pm');
await page.click('[data-testid="fastener-pm"] .k-pm-ok');
await page.waitForTimeout(1500);
const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { comps: s.doc.components.map((c) => c.name), mates: s.doc.mates.map((m) => m.name), bodies: s.rebuild.bodies.length, pos: s.doc.components.slice(2).map((c) => c.position.map((x) => Math.round(x * 100) / 100)) }; });
check('two ISO 4762 M6 x 25 screws inserted on the bracket, with Concentric and Coincident mates', st.comps.filter((n) => /^ISO 4762 M6 x 25<\d>$/.test(n)).length === 2 && st.mates.length === 4 && st.bodies === 4 && st.pos.every((p) => Math.abs(p[1] - 18) < 0.01), JSON.stringify(st));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(500);
await shot('sf2-fasteners');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
