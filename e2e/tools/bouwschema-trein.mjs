// Bouwschema van de kabeldoos (treinverlichting, versie 2): per stap de onderdelen uit voorbeelden/treinverlichting/Kabeldoos.kcad
// in Phlippo CAD (de nieuwe delen uit elkaar geschoven in de richting waarin ze erin gaan), een beeld van het venster en
// de uitleg; samen een PDF (A4 liggend) in voorbeelden/treinverlichting/tekeningen.
// Nodig: de app met VITE_TEST_HOOKS (npm run build:e2e en vite preview, of de dev-server) op E2E_URL (standaard poort 5184).
// Gebruik: node e2e/tools/bouwschema-trein.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = 'voorbeelden/treinverlichting';
const UIT = `${DIR}/tekeningen`;
const BEELD = 'e2e-out/bouwschema-trein';
rmSync(BEELD, { recursive: true, force: true });
mkdirSync(BEELD, { recursive: true });
mkdirSync(UIT, { recursive: true });
const doos = JSON.parse(readFileSync(`${DIR}/Kabeldoos.kcad`, 'utf8'));
delete doos.format;
const VERSIE = `versie 3 (${/\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? ''})`;

// groepen onderdelen (id's zoals in Kabeldoos.kcad)
const G = {
  bak: /^d1$/, deksel: /^d2$/, dekselschroeven: /^sd\d$/, ophangschroeven: /^sv\d$/, dcbus: /^w1$/,
  tules: /^t\d+$/, goten: /^g\d+$/,
  bordjes: /^b\d+(k\d|e\d|r)?$/, bordje1: /^b1(k\d|e\d|r)?$/,
  prints: /^(u\d+|p\d|pb\d|v\d+|i\d+|e\d+|eo\d+)$/, printschroeven: /^(us|ps|vs|is|es)\d+$/,
};
const of = (...namen) => namen.map((n) => G[n]);
const ALLES_OPEN = of('bak', 'tules', 'dcbus', 'bordjes', 'prints', 'printschroeven', 'ophangschroeven');
/** een beeld: welke groepen, welke verschoven (dx, dy, dz in mm), van onderen bekeken, de toets van het aanzicht; of een bestand */
const beeld = (toon, schuif = [], opts = {}) => ({ toon, schuif, ...opts });
const bestand = (f) => ({ bestand: f });
const kopie = (f) => ({ kopie: f });

const STAPPEN = [
  {
    titel: 'De doos en de hulpstukken printen', tijd: 'bak ongeveer 14 uur, deksel 7 uur, gootdeksels 3 uur, hulpstukken 1 uur', gereedschap: 'Elegoo Centauri Carbon, PETG zwart (bak) en grijs (deksel, gootdeksels, hulpstukken)',
    beelden: [beeld(of('bak')), beeld(of('deksel'), [], { onder: true })],
    tekst: [
      'Print print/Kabeldoos-bak.stl met de bodem op het bed, print/Kabeldoos-deksel.stl met de buitenkant op het bed, print/Gootdeksels-plaat.stl (9 gootdeksels) en print/Hulpstukken.stl (2 werkhaken en de spatel) plat op het bed: geen support nodig.',
      'Elk deel is hoogstens 230 x 230: leg het in het midden van het bed, dan blijft de hoek voor het filamentmes (rechtsvoor 10 x 20) vrij, ook met een skirt.',
      '0,2 mm lagen, 4 wanden, 30 % gyroid. De vingers van de goten (1,2) en de klemlippen (0,8) zijn dun: buitenwanden op 40 mm/s.',
      'Controleer na het printen: een bordje klikt in zijn 4 klemlippen, een gootdeksel klikt over zijn goot, het deksel valt met zijn rand in de bak.',
    ],
    delen: ['Bak (TRN-01)', 'Deksel (TRN-02)', '9 gootdeksels (TRN-03)', 'Hulpstukken (TRN-04)'],
  },
  {
    titel: 'De gaatjesprints solderen', tijd: '4 tot 5 uur', gereedschap: 'Soldeerbout met fijne punt, tin, kniptang, pincet, multimeter, opbouwtekeningen TRN-10 tot TRN-13',
    beelden: [beeld(of('prints'))],
    tekst: [
      'Zaag uit één gaatjesprint van 160 x 100 de uitgangsprint (132 x 25,4), de ingangsprint (88), de voedingsprint (61) en de draagprint van de ESP (68). Boor in de uitgangsprint de 4 gaten Ø2,7 voor de afstandsbussen van de PCA9685 bij (TRN-10).',
      'Volg per print de opbouwtekening: eerst de IC-voeten, de optocouplers en de klemmen aan de componentenzijde, dan de SMD-onderdelen (polyfuses 1812, weerstanden 1206) aan de koperzijde over twee eilandjes, dan de bruggen (soldeerbrug, blanke draad, Ø1,0 voor de 5 A-paden, geïsoleerde draadjes).',
      'De MOSFET-adapters (2 x AO3400A elk) gaan pas in hun voetje als de print gemeten is: geen kortsluiting tussen +12 V en 0 V, en elke gate met 100 kΩ aan 0 V.',
      'De PCA9685 op 4 afstandsbussen M2,5 x 10 boven de rechterhelft van de uitgangsprint; de ESP steekt in de draagprint (de regelaar zit eronder).',
    ],
    delen: ['Uitgangsprint (TRN-10)', 'Ingangsprint (TRN-11)', 'Voedingsprint (TRN-12)', 'Draagprint ESP (TRN-13)', 'PCA9685', 'ESP32-S3-DevKitC-1'],
  },
  {
    titel: 'Proefopstelling en firmware flashen', tijd: '1 uur', gereedschap: 'Pc met PlatformIO, micro-USB-kabel (data), multimeter, meetblad TRN-20',
    beelden: [beeld([...of('prints', 'printschroeven'), G.bordje1], [[G.bordje1, [0, 0, 118]]], { toets: 'Control+7' })],
    tekst: [
      'Eerst op tafel, nog niet in de doos: de 4 prints verbonden met de draden van de draadlijst TRN-14, één bordje aan groep 1 (R1+ aan -X2:1, G01− aan -X3:1) en één drukknop op IN01 (COM1 aan 0 V).',
      'Flashen: ESP met de micro-USB "UART" aan de pc, in firmware/: python -m platformio run -e doos -t upload. Daarna kan bijwerken zonder kabel (dashboard, Instellingen, Firmware bijwerken).',
      'Adapter in de DC-bus. Meet en noteer op het meetblad TRN-20: 12 V, 5 V, 3,3 V, OE bij reset, de stroom van groep 1 en de spanning over zijn MOSFET (< 0,1 V).',
      'Dashboard, Instellingen, Testmodus: groep 1 vast aan, dan looplicht; de knop op IN01 zet alles aan en uit (standaardinstelling).',
    ],
    delen: ['1 bordje, 1 drukknop', 'Draden van TRN-14'],
  },
  {
    titel: 'De prints in de bak schroeven', tijd: '20 min', gereedschap: 'Kruiskopschroevendraaier PH1, soldeerbout',
    beelden: [beeld([...of('bak', 'prints', 'printschroeven', 'dcbus')], [[G.prints, [0, 40, 0]], [G.printschroeven, [0, 60, 0]], [G.dcbus, [-25, 0, 0]]])],
    tekst: [
      'Voorste rij: links de voedingsprint, in het midden de ingangsprint, rechts de draagprint met de ESP (de USB-poorten in de opening van de rechterwand).',
      'Rij 6: de uitgangsprint met de PCA9685 erboven, naast bordje 16.',
      'Elke print op zijn paaltjes met plaatschroeven 2,5 x 6 (de uitgangsprint met 5, de draagprint met 2): niet te hard aandraaien, het gat in PETG is Ø2,2.',
      'De DC-bus in het gat in de linkerwand, de moer aan de binnenkant; soldeer de pen (+) en de huls (−) met 0,75 mm² aan -X1:1 en -X1:2.',
    ],
    delen: ['15 plaatschroeven 2,5 x 6 bolkop', 'DC-chassisbus 5,5 x 2,5'],
  },
  {
    titel: 'De bordjes in hun klemlippen', tijd: '5 min', gereedschap: 'Spatel (hulpstukken)',
    beelden: [beeld([...of('bak', 'prints', 'printschroeven', 'dcbus'), G.bordjes], [[G.bordjes, [0, 40, 0]]]), kopie('e2e-out/trein-lippen-detail.jpg')],
    tekst: [
      'Druk de 16 Modelbouwled-bordjes in hun ring: bordje 1 links achteraan, dan per rij van links naar rechts; bordje 16 in rij 6.',
      'De print duwt de 4 klemlippen aan de korte kanten opzij (schuine kant) en klikt eronder: het bordje blijft zitten, ook met de doos ondersteboven.',
      'Uitnemen: met het blad van de spatel de 2 lippen aan één kant naar buiten duwen en het bordje aan die kant optillen.',
      'Schrijf het groepsnummer met een stift op elk bordje (of plak een label): G01 tot G16.',
    ],
    delen: ['16 bordjes Modelbouwled'],
  },
  {
    titel: 'Ophangen onder de baan', tijd: '15 min', gereedschap: 'Boormal TRN-00 (A3 op 100 %), tape, boor Ø2,5, schroevendraaier',
    beelden: [beeld([...ALLES_OPEN], [], { onder: true })],
    tekst: [
      'Druk de boormal TRN-00 af op A3 op ware grootte en meet de controlemaat van 100 mm na.',
      'Plak de mal onder de baan (je kijkt van onderen: de USB links op de mal), met links en rechts 60 mm vrij voor de kabels. Boor de 4 kruisjes voor met Ø2,5.',
      'Draai 4 bolkopschroeven 4 x 20 in tot de kop 4 mm onder de baan staat.',
      'Houd de doos met de grote gaten in de zijgoten over de koppen en schuif ze 6 mm naar achteren, tot elke schroef aan het eind van zijn sleuf zit.',
    ],
    delen: ['4 bolkopschroeven 4 x 20'],
  },
  {
    titel: 'Bedraden op werkhoogte en kabels ordenen', tijd: '2 tot 3 uur', gereedschap: 'Striptang, kleine schroevendraaier 2,5, kabelbinders, labels, 2 werkhaken en de spatel (hulpstukken)',
    beelden: [beeld([...ALLES_OPEN], [], { kantel: true, toets: 'Control+2' }), beeld([...ALLES_OPEN], [], { zoom: true })],
    tekst: [
      'Werkhoogte: schuif de doos 6 mm naar voren en neem ze af. Hang de 2 werkhaken met hun sleutelgat aan de 2 voorste schroeven en de doos met haar 2 voorste sleutelgaten aan de knoppen: ze hangt verticaal, 12 cm onder de baan, de open kant naar je toe (beeld boven).',
      'Elke bundel van de baan naar de doos krijgt een kabellus van 50 cm (kabelbinder aan de baan). Labels eerst: G01− tot G16−, R1+ tot R6+, IN01 tot IN16 aan beide uiteinden.',
      'Leddraden door de sleuf onder de goot naast hun bordje of door een membraantule; in de goot door de sleuf voor hun klem. De − van elk bordje apart naar klem nn van de uitgangsprint (-X3), de + per rij naar -X2:1..6.',
      'Knoppen en sensoren: door de tules vooraan naar -X4; per 4 ingangen de COM aan 0 V (contacten, PNP) of +12 V (NPN). Een draad uit een goot halen: gootdeksel optillen met het blad van de spatel, draad trekken met het haakje.',
    ],
    delen: ['Montagedraad 0,25 en 0,5 mm²', 'Kabelbinders, labels', '2 werkhaken'],
  },
  {
    titel: 'Gootdeksels en deksel erop, terug onder de baan', tijd: '15 min', gereedschap: 'Kruiskopschroevendraaier PH2',
    beelden: [beeld([...ALLES_OPEN, ...of('goten', 'deksel', 'dekselschroeven')], [[G.goten, [0, 35, 0]], [G.deksel, [0, 80, 0]], [G.dekselschroeven, [0, 105, 0]]], { voorblad: true })],
    tekst: [
      'Kijk of geen draad boven de vingers van de goten of over de rand van de bak uitsteekt.',
      'Druk de 6 gootdeksels tussen de rijen op hun goot: de nokken klikken in de klikvingers. De 3 randdeksels (achter, links, rechts): de neus in de groef van de buitenwand haken en aan de andere kant dichtklikken.',
      'Zet het deksel erop en draai de 4 plaatschroeven 3 x 12 verzonken in de bussen in de hoeken, kruislings en niet te hard.',
      'Neem de doos van de werkhaken en hang ze weer op de 4 schroeven (6 mm naar achteren schuiven); de kabellussen in de goten of langs de baan vastzetten.',
    ],
    delen: ['9 gootdeksels', '4 plaatschroeven 3 x 12 verzonken'],
  },
  {
    titel: 'Aanzetten, instellen en meten', tijd: '30 min', gereedschap: 'Gsm of tablet, multimeter, meetblad TRN-20, invulblad TRN-21',
    beelden: [bestand(`${DIR}/firmware/ui/beelden/tablet-groepen.png`)],
    tekst: [
      'Adapter in de DC-bus. Het lampje op de ESP wordt groen: de wifi Treinbaan is aan (rood: de PWM-print antwoordt niet, kijk de I2C-draden na).',
      'Verbind de gsm met Treinbaan (wachtwoord treinbaan); het dashboard opent vanzelf, anders http://192.168.4.1. Wijzig het wachtwoord bij Instellingen (vergeten: BOOT 5 s); vul eventueel het thuisnet in.',
      'Testmodus looplicht: kijk of elke groep op de juiste plaats van de baan oplicht. Meet per groep de stroom en noteer alles op het meetblad TRN-20.',
      'Geef elke groep en ingang de naam van het invulblad TRN-21 en hang dat bij de baan. Bewaar scènes voor dag en nacht en koppel de knoppen aan een functie.',
    ],
    delen: [],
  },
];

// ---- beelden maken in de app ----
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
function samenstelling(b) {
  const doc = structuredClone(doos);
  doc.components = doc.components.filter((c) => b.toon.some((g) => g.test(c.id)));
  for (const c of doc.components) {
    for (const [g, d] of b.schuif) if (g.test(c.id)) c.position = [c.position[0] + d[0], c.position[1] + d[1], c.position[2] + d[2]];
    if (b.onder) {
      // van onderen: alles 180° om Z draaien (x en y wisselen van teken)
      c.position = [-c.position[0], -c.position[1], c.position[2]];
      c.rotation = qmul([0, 0, 1, 0], c.rotation ?? [0, 0, 0, 1]);
    }
    if (b.kantel) {
      // aan de werkhaken: −90° om X (de voorkant naar boven, de open kant naar achter: bekeken met Ctrl+2)
      const [x, y, z] = c.position;
      c.position = [x, z, -y];
      c.rotation = qmul([-Math.SQRT1_2, 0, 0, Math.SQRT1_2], c.rotation ?? [0, 0, 0, 1]);
    }
  }
  doc.mates = [];
  return doc;
}
let n = 0;
for (const [i, s] of STAPPEN.entries()) {
  s.foto = [];
  for (const b of s.beelden) {
    if (b.bestand) { s.foto.push(b.bestand); continue; }
    if (b.kopie) {
      // een beeld dat een ander script maakte (de doorsnede door de klemlippen: trein-fable-shots.mjs), als stapbeeld
      if (!existsSync(b.kopie)) throw new Error(`${b.kopie} ontbreekt: eerst node e2e/tools/trein-fable-shots.mjs`);
      const f = `${BEELD}/stap-${String(i + 1).padStart(2, '0')}-${String(++n).padStart(2, '0')}.jpg`;
      copyFileSync(b.kopie, f);
      s.foto.push(f);
      continue;
    }
    await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), samenstelling(b));
    await page.waitForTimeout(2500);
    await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
    const err = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
    if (Object.keys(err).length) fouten.push(`stap ${i + 1}: ${JSON.stringify(err).slice(0, 300)}`);
    await page.keyboard.press(b.toets ?? 'Control+7');
    await page.waitForTimeout(600);
    await page.keyboard.press('f');
    await page.waitForTimeout(800);
    const v = await page.locator('.k-viewport').boundingBox();
    if (!b.zoom && !b.toets) {
      // dichterbij: de doos vult het beeld (2 stappen inzoomen op het midden)
      await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
      for (let k = 0; k < 2; k++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
    }
    if (b.zoom) {
      // van dichtbij (standaard: de goten links, een bordje in zijn klemlippen, een kabelinvoer)
      const [zx, zy, zn] = b.zoom === true ? [0.35, 0.45, 5] : b.zoom;
      await page.mouse.move(v.x + v.width * zx, v.y + v.height * zy);
      for (let k = 0; k < zn; k++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
    }
    // de muis op een lege plek in het venster (linksboven): zo licht er niets op onder de cursor
    await page.mouse.move(v.x + 25, v.y + 70);
    await page.waitForTimeout(400);
    await page.mouse.move(v.x + 30, v.y + 75);
    await page.waitForTimeout(1500);
    const f = `${BEELD}/stap-${String(i + 1).padStart(2, '0')}-${String(++n).padStart(2, '0')}.jpg`;
    // zonder de werkbalk bovenaan en het assenkruis onderaan
    await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: { x: v.x + 2, y: v.y + 44, width: v.width - 4, height: v.height - 104 } });
    s.foto.push(f);
  }
}

// ---- PDF ----
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const img = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(f).toString('base64')}`;
const N = STAPPEN.length;
const kop = (t) => `<div class="kop"><span>Bouwschema kabeldoos treinverlichting · ${VERSIE}</span><span>${t}</span></div>`;
const voorblad = `<section class="blad voor">${kop('')}
  <h1>Bouwschema<br><small>Kabeldoos met ESP32-S3: 16 lichtgroepen, 16 ingangen, eigen wifi; kabelgoten met klikdeksels, bordjes in klemlippen</small></h1>
  <div class="voorinhoud"><img src="${img(STAPPEN.flatMap((q) => q.beelden.map((b, k) => [b, q.foto[k]])).find(([b]) => b.voorblad)[1])}">
  <ol>${STAPPEN.map((s) => `<li>${esc(s.titel)} <em>${esc(s.tijd)}</em></li>`).join('')}</ol></div>
  <p class="noot">Maten staan op de werktekeningen TRN-00 tot TRN-04, de gaatjesprints op de opbouwtekeningen TRN-10 tot TRN-13, de draden tussen de prints in de draadlijst TRN-14, de bedrading in het aansluitschema, de metingen op het meetblad TRN-20, de onderdelen en prijzen in de README.
  Print de doos in PETG op de Elegoo Centauri Carbon, zonder support.</p></section>`;
const bladen = STAPPEN.map((s, i) => `<section class="blad">${kop(`stap ${i + 1} / ${N}`)}
  <div class="stap"><div class="beelden b${s.foto.length}">${s.foto.map((f) => `<img src="${img(f)}">`).join('')}</div>
  <div class="tekst"><div class="nr">${i + 1}</div><h2>${esc(s.titel)}</h2>
  <p class="meta"><b>Tijd</b> ${esc(s.tijd)}<br><b>Gereedschap</b> ${esc(s.gereedschap)}</p>
  <ol>${s.tekst.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
  ${s.delen.length ? `<table><tr><th>Onderdelen</th></tr>${s.delen.map((d) => `<tr><td>${esc(d)}</td></tr>`).join('')}</table>` : ''}
  </div></div></section>`);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:297mm 210mm;margin:0} *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#1d1d1f}
.blad{width:297mm;height:210mm;padding:10mm 12mm;page-break-after:always;overflow:hidden;position:relative}
.kop{display:flex;justify-content:space-between;font-size:9pt;color:#666;border-bottom:0.4mm solid #1d1d1f;padding-bottom:2mm;margin-bottom:5mm}
h1{font-size:30pt;margin:6mm 0 6mm} h1 small{font-size:14pt;font-weight:normal;color:#555}
.voorinhoud{display:flex;gap:8mm} .voorinhoud img{width:165mm;height:105mm;object-fit:contain;background:#f4f5f7;border:0.3mm solid #ccc}
.voorinhoud ol{font-size:11pt;line-height:1.55;margin:0;padding-left:6mm} .voorinhoud em{color:#777;font-style:normal;font-size:9pt}
.noot{font-size:9.5pt;color:#444;margin-top:6mm;max-width:250mm}
.stap{display:flex;gap:7mm;height:178mm} .beelden{flex:0 0 172mm;display:flex;flex-direction:column;gap:3mm}
.beelden img{width:100%;flex:1;min-height:0;object-fit:contain;background:#f4f5f7;border:0.3mm solid #ccc;border-radius:1mm}
.tekst{flex:1;font-size:10pt;line-height:1.4} .nr{font-size:34pt;font-weight:bold;color:#2e9e4f;line-height:1}
h2{font-size:15pt;margin:2mm 0 3mm} .meta{font-size:9pt;color:#444} .tekst ol{padding-left:5mm} .tekst li{margin-bottom:2mm}
table{border-collapse:collapse;font-size:8.5pt;margin-top:2mm;width:100%} th,td{border-bottom:0.2mm solid #ccc;text-align:left;padding:0.6mm 1.5mm} th{background:#eef3ee}
</style></head><body>${voorblad}${bladen.join('')}</body></html>`;
const tmp = resolve(`${BEELD}/bouwschema.html`);
writeFileSync(tmp, html);
await page.setViewportSize({ width: 1123, height: 794 });
await page.goto(pathToFileURL(tmp).href);
await page.pdf({ path: `${UIT}/Bouwschema-kabeldoos.pdf`, width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
for (let i = 0; i <= N; i++) await page.locator('.blad').nth(i).screenshot({ path: `${BEELD}/blad-${i}.png` });
console.log('bouwschema:', N, 'stappen,', n, 'beelden; fouten:', fouten);
await browser.close();
