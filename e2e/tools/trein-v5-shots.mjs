// Beelden van versie 5 van de kabeldoos (één laag, 2 helften die in elkaar klikken): de doos open (iso en van boven),
// de modules van dichtbij, de naad (detail en doorsneden), de 2 helften los op het printbed (230 x 230 binnen het bed van
// 256 x 256 met de vrije hoek voor het filamentmes), de doos dicht. Nodig: de app met test-hooks op E2E_URL (de
// dev-server of npm run build:e2e). Gebruik: node e2e/tools/trein-v5-shots.mjs <uitmap>
// SHOTS=open,boven,modules,naad,bed,dicht kiest; ZOOM_<NAAM>="fx,fy,n;..." stuurt het inzoomen (fx, fy: plaats op het
// venster als fractie, n: stappen).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { component } from '../../voorbeelden/lib/schets.mjs';
import { deel, yv, blokken } from '../../voorbeelden/treinverlichting/hulp.mjs';
import { M } from '../../voorbeelden/treinverlichting/maten.mjs';
import { DRADEN, GROEPEN, INGANGEN, klem } from '../../voorbeelden/treinverlichting/opbouw.mjs';
import { indeling } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

const UIT = process.argv[2] ?? 'e2e-out/trein-v5';
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/', { timeout: 300_000 });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const lees = () => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; return d; };
const filter = (f) => { const d = lees(); d.components = d.components.filter((c) => f(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 900_000 });
  const e = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(e).length) fouten.push(JSON.stringify(e).slice(0, 300));
};
const sectie = (s) => page.evaluate((x) => window.__phlippoStore.setState({ sectionView: x }), s);
// na het zoomen de muis naar een lege hoek (geen oranje rand onder de cursor)
const rust = async () => {
  // eerst over het lint bovenaan, dan over de statusbalk onderaan (buiten het venster en de boom: bij sterk inzoomen is er
  // in het venster geen lege plek meer)
  await page.mouse.move(1500, 60); await page.waitForTimeout(400);
  await page.mouse.move(1000, 1066); await page.waitForTimeout(300);
  await page.mouse.move(1200, 1068); await page.waitForTimeout(300);
  await page.evaluate(() => { for (const c of document.querySelectorAll('.k-viewport canvas')) for (const t of ['pointerleave', 'mouseleave', 'pointerout', 'mouseout']) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: -10, clientY: -10 })); });
  // en de voorselectie (oranje rand) wissen: bij sterk inzoomen blijft de muis anders boven een vlak hangen
  await page.evaluate(() => window.__phlippoStore.setState({ hoverFace: null, hoverEdge: null, hover: null, hoverFeatureId: null, hoverPlane: null }));
  await page.waitForTimeout(1800);
};
const shot = async (toets, naam, zoom = '') => {
  await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1200);
  const v = await page.locator('.k-viewport').boundingBox();
  for (const stap of (process.env[`ZOOM_${naam.toUpperCase().replace(/-/g, '_')}`] ?? zoom).split(';').filter(Boolean)) {
    const [fx, fy, n] = stap.split(',').map(Number);
    await page.mouse.move(v.x + fx * v.width, v.y + fy * v.height);
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
  }
  await rust();
  await page.screenshot({ path: `${UIT}/${naam}.png` });
  // hetzelfde beeld zonder de knoppenbalken, voor het bouwschema
  await page.screenshot({ path: `${UIT}/${naam}-vp.jpg`, type: 'jpeg', quality: 88, clip: { x: v.x + 2, y: v.y + 44, width: v.width - 4, height: v.height - 104 } });
};
const wat = (process.env.SHOTS ?? 'open,boven,modules,naad,bed,dicht').split(',');
const DEKSEL = /^(d2|d4|sd\d)$/;
/** de draden schematisch (alleen voor de beelden, niet in Kabeldoos.kcad): de interne draden W01..W61 uit de klem omhoog
 *  tot 23 à 28 hoog, langs x en z en weer naar beneden; de + en − van de groepen van de eindklem van het bordje door de
 *  vrije strook voor de rij rechtstreeks naar de klemmen van de MOSFET-modules; de ingangen van de tules in de rechterwand naar de optocouplerprints. Eén onderdeel per kleur */
function draden() {
  const KL = { rood: '#c8202f', zwart: '#1b1b1b', oranje: '#e07a10', geel: '#e3c21a', groen: '#2e9e4f', blauw: '#1f4fa3', wit: '#eeeeee', grijs: '#8a8d91' };
  const per = new Map(), seg = (kleur, a, b, t) => { const lijst = per.get(kleur) ?? []; per.set(kleur, lijst); lijst.push([Math.min(a[0], b[0]) - t / 2, Math.min(a[1], b[1]) - t / 2, Math.min(a[2], b[2]) - t / 2, Math.max(a[0], b[0]) + t / 2, Math.max(a[1], b[1]) + t / 2, Math.max(a[2], b[2]) + t / 2]); };
  const VAST = { '-X5': () => [M.dcbus.x, M.dcbus.y, -M.doos.binnen / 2 + 15], '-F1': (k) => [k === 'in' ? 214 : 200, 12, -84] };
  const p = (e) => (VAST[e[0]] ? VAST[e[0]](e[1]) : (({ x, y, z }) => [x, y, z])(klem(e[0], e[1])));
  DRADEN.forEach((d, i) => {
    const a = p(d.van), b = p(d.naar), h = 23 + (i % 6) * 0.9, t = d.mm2 >= 0.5 ? 1.3 : 0.8;
    seg(d.kleur, a, [a[0], h, a[2]], t); seg(d.kleur, [a[0], h, a[2]], [b[0], h, a[2]], t); seg(d.kleur, [b[0], h, a[2]], [b[0], h, b[2]], t); seg(d.kleur, [b[0], h, b[2]], b, t);
  });
  // de groepen: van de eindklem rechts op het bordje door de vrije strook voor de rij naar de klemmen n+ en n− (de
  // polyfuse in n− niet getekend)
  const L = indeling(), B = M.bordje;
  for (const g of GROEPEN) {
    const d = L.rijen.flat().find((q) => q.nr === g.groep), r = L.rijen.findIndex((rij) => rij.includes(d)), zs = L.tussen[r + 1].zc;
    [[g.plus, 'rood', -1], [g.min, 'zwart', 1]].forEach(([e, kleur, k], j) => {
      const q = klem(e[0], e[1]), y = 8 + j * 1.2, x0 = d.cx + B.x / 2 - 4, z0 = d.cz + k * 2.5, zm = zs + k * 1.2 + (g.groep % 3) * 0.6, xe = q.x - 3.5;
      seg(kleur, [x0, y, z0], [x0 + 3, y, z0], 1.0); seg(kleur, [x0 + 3, y, z0], [x0 + 3, y, zm], 1.0); seg(kleur, [x0 + 3, y, zm], [M.naad.x + 6 + (g.groep % 8), y, zm], 1.0);
      seg(kleur, [M.naad.x + 6 + (g.groep % 8), y, zm], [M.naad.x + 6 + (g.groep % 8), y, q.z], 1.0); seg(kleur, [M.naad.x + 6 + (g.groep % 8), y, q.z], [xe, y, q.z], 1.0);
    });
  }
  // de ingangen: van de tule in de rechterwand naar de klem IN n
  const tz = M.rechts.tules.rechts;
  for (const ing of INGANGEN) {
    const k = klem(ing.klem[0], ing.klem[1]), z0 = tz.reduce((a, q) => (Math.abs(q - k.z) < Math.abs(a - k.z) ? q : a)), y = 12 + (ing.ingang % 4) * 0.7, xr = M.rechts.x1 - 6;
    seg('grijs', [xr, y, z0], [xr - 2, y, z0], 1.0); seg('grijs', [xr - 2, y, z0], [xr - 2, y, k.z], 1.0); seg('grijs', [xr - 2, y, k.z], [k.x + 3.5, y, k.z], 1.0);
  }
  return [...per.entries()].map(([kleur, lijst]) => {
    const o = deel(`Draden ${kleur}`, { name: `draad, ${kleur}`, density: 1500, color: KL[kleur] ?? '#888' });
    blokken(o, lijst, 'Draad');
    const doc = o.doc();
    return component(`dr_${kleur}`, `Draden ${kleur}<1>`, doc, [0, 0, 0]);
  });
}
if (wat.includes('open') || wat.includes('boven')) {
  await open(filter((id) => !DEKSEL.test(id)));
  if (wat.includes('open')) await shot('Control+7', 'doos-open-iso', '0.5,0.5,1');
  if (wat.includes('boven')) await shot('Control+5', 'doos-open-boven');
}
if (wat.includes('modules')) {
  const d = filter((id) => /^(d1|d3|w1|t\d+|m[a-z0-9]+_\d+|b\d+(k\d|e\d|r)?)$/.test(id));
  d.components.push(...draden());
  await open(d);
  await shot('Control+7', 'closeup-modules', '0.62,0.5,3;0.62,0.5,2');
  await shot('Control+5', 'modules-boven-bedraad', '0.72,0.5,2');
}
if (wat.includes('naad')) {
  // de 2 bakhelften: de klikhaak achteraan van dichtbij (iso), daarna doorsneden
  await open(filter((id) => /^(d1|d3)$/.test(id)));
  await shot('Control+7', 'naad-detail', '0.5,0.5,1;0.612,0.34,7;0.612,0.45,3');
  // doorsnede evenwijdig aan de bodem op 20 hoog: haak, nok in het kuiltje, bodemlip
  await sectie({ plane: 'top', offset: 20, flip: false, cap: true });
  await page.waitForTimeout(2500);
  await shot('Control+5', 'naad-doorsnede-boven', '0.51,0.035,11');
  // doorsnede door de haak achteraan (vlak evenwijdig aan het vooraanzicht): de 45°-onderkant
  await sectie({ plane: 'front', offset: -111.5, flip: false, cap: true });
  await page.waitForTimeout(2500);
  await shot('Control+1', 'naad-doorsnede-haak', '0.502,0.55,11');
  await sectie(null);
  // het deksel: de lip van de rechterhelft onder de linkerhelft (doorsnede door een nok)
  await open(filter((id) => /^(d1|d2|d3|d4)$/.test(id)));
  await sectie({ plane: 'front', offset: -83, flip: false, cap: true });
  await page.waitForTimeout(2500);
  await shot('Control+1', 'naad-doorsnede-deksel', '0.505,0.39,14;0.46,0.57,5');
  await sectie(null);
}
if (wat.includes('bed')) {
  // de 2 helften los op het printbed: het bed 256 x 256 (rechtsvoor 10 x 20 vrij voor het filamentmes) met een kader van
  // 230 x 230; elke helft in het midden van haar bed
  const bed = deel('Printbed 256 x 256', { name: 'printbed (PEI)', density: 1000, color: '#c9c3b6' });
  bed.schets(yv(-3.4, 'Plane bed'), (s) => s.lusW([[-128, -128], [128, -128], [128, 108], [118, 108], [118, 128], [-128, 128]].map(([x, z]) => [x, -3.4, z])));
  bed.extrude('boss', 1, { naam: 'Bed' });
  const beddoc = bed.doc();
  delete beddoc.format;
  const kader = deel('Kader 230 x 230', { name: 'kader', density: 1000, color: '#e07a10' });
  kader.schets(yv(-2.4, 'Plane kader'), (s) => { s.rrectW([-116.5, -2.4, -116.5], [116.5, -2.4, 116.5]); s.rrectW([-115, -2.4, -115], [115, -2.4, 115]); });
  kader.extrude('boss', 0.3, { naam: 'Kader 230' });
  const kaderdoc = kader.doc();
  delete kaderdoc.format;
  const d = lees(), links = d.components.find((c) => c.id === 'd1'), rechts = d.components.find((c) => c.id === 'd3');
  const cl = (-114.9 + 110) / 2, cr = (96.2 + 326) / 2, dx = 300;
  links.position = [-cl - dx / 2, 0, 0];
  rechts.position = [-cr + dx / 2, 0, 0];
  d.components = [links, rechts, component('bed1', 'Printbed<1>', beddoc, [-dx / 2, 0, 0]), component('bed2', 'Printbed<2>', beddoc, [dx / 2, 0, 0]), component('kd1', 'Kader 230<1>', kaderdoc, [-dx / 2, 0, 0]), component('kd2', 'Kader 230<2>', kaderdoc, [dx / 2, 0, 0])];
  for (const c of d.components) delete c.part?.format;
  await open(d);
  await shot('Control+5', 'helften-op-bed');
  await shot('Control+7', 'helften-op-bed-iso');
}
if (wat.includes('gaatjes')) {
  // de gaatjes 2 x 2 voor de leddraden: de linkerhelft met de bordjes van rij 2 en 3, van boven, schuin en van onderen
  await open(filter((id) => /^(d1|b[4-9](k\d|e\d|r)?)$/.test(id)));
  await shot('Control+5', 'gaatjes-boven', process.env.ZOOM_GB ?? '0.505,0.31,9');
  await shot('Control+7', 'gaatjes-iso', process.env.ZOOM_GI ?? '0.5,0.42,8');
  await open(filter((id) => /^d1$/.test(id)));
  await shot('Control+6', 'gaatjes-onder', process.env.ZOOM_GO ?? '0.505,0.69,9');
}
if (wat.includes('dicht')) {
  await open(lees());
  await shot('Control+7', 'doos-dicht', '0.5,0.5,1');
}
console.log('fouten', fouten);
await browser.close();
