// Bouwschema van de kabeldoos (treinverlichting, versie 5: één laag in 2 helften die in elkaar klikken): per stap de onderdelen uit voorbeelden/treinverlichting/Kabeldoos.kcad
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
// BOUWSCHEMA_HERGEBRUIK=1: de beelden van een vorige keer houden (alleen de teksten en de PDF opnieuw)
const HERGEBRUIK = !!process.env.BOUWSCHEMA_HERGEBRUIK;
if (!HERGEBRUIK) rmSync(BEELD, { recursive: true, force: true });
mkdirSync(BEELD, { recursive: true });
mkdirSync(UIT, { recursive: true });
const doos = JSON.parse(readFileSync(`${DIR}/Kabeldoos.kcad`, 'utf8'));
delete doos.format;
const VERSIE = `versie 6 (${/\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? ''})`;

// groepen onderdelen (id's zoals in Kabeldoos.kcad; versie 5: d1/d3 de bakhelften links/rechts, d2/d4 het deksel)
const G = {
  bakL: /^d1$/, bakR: /^d3$/, deksel: /^(d2|d4)$/, dekselL: /^d2$/, dekselR: /^d4$/, dekselschroeven: /^sd\d$/, ophangschroeven: /^sv\d$/, dcbus: /^w1$/,
  tules: /^t\d+$/,
  bordjes: /^b\d+(k\d|e\d|r)?$/, bordje1: /^b1(k\d|e\d|r)?$/,
  modules: /^m[a-z0-9]+_\d+$/,
  // versie 6 fase B: de modules per helft en de IR-leerontvanger
  modulesR: /^m(?!q4_|q3_|k5_)[a-z0-9]+_\d+$/, modulesL: /^m(q4|q3|k5)_\d+$/, ir: /^ir\d$/,
};
const of = (...namen) => namen.map((n) => G[n]);
const ALLES_OPEN = of('bakL', 'bakR', 'tules', 'dcbus', 'bordjes', 'modules', 'ophangschroeven');
/** een beeld: welke groepen, welke verschoven (dx, dy, dz in mm), van onderen bekeken, de toets van het aanzicht; of een bestand */
const beeld = (toon, schuif = [], opts = {}) => ({ toon, schuif, ...opts });
const bestand = (f) => ({ bestand: f });
const kopie = (f) => ({ kopie: f });
const V5 = process.env.V5_BEELDEN ?? 'e2e-out/trein-v5';

const STAPPEN = [
  {
    titel: 'Eerst kopen en meten, het proefstuk, dan de helften en het deksel printen', tijd: 'meten 1 uur, proefstuk 20 min, bak links ± 10 uur, bak rechts ± 10 uur, deksel 2 x 6 uur, hulpstukken 1 uur', gereedschap: 'Multimeter, schuifmaat, meetblad TRN-22, Elegoo Centauri Carbon, PETG zwart (bak) en grijs (deksel, hulpstukken)',
    beelden: [beeld(of('bakL', 'bakR'), [[G.bakR, [40, 0, 0]]]), kopie(`${V5}/helften-op-bed-vp.jpg`)],
    tekst: [
      'Eerst één stuk van elke module kopen en meten met TRN-22 (± € 24 tot € 37): welke schakeling de optocouplerprint heeft, de polariteit van de MOSFET-modules, de XL4015 (5,5 V, 3 A), de IR-zelftest. Meet ook hun maten en gaten (TRN-10 rechts, TRN-11 links: AANNAME); kloppen ze niet: opbouw.mjs aanpassen en de STL opnieuw maken.',
      'Dan het proefstuk (print/Proefstuk.stl, TRN-08, ± 20 min): passen de 4 schroeven van een bordje, de bodemlip en de klikhaak? Zo niet: de krimp in de slicer compenseren (PETG 0,3 tot 0,5 %). Pas dan de helften van 10 uur.',
      'print/Kabeldoos-bak-links.stl en -rechts.stl met de bodem op het bed; print/Kabeldoos-deksel-links.stl met de buitenkant op het bed, -rechts.stl met de binnenkant op het bed (de lip op het bed); de hulpstukken: geen support nodig, ook niet onder de klikhaken (45°).',
      'Elk deel is hoogstens 230 x 230: leg het in het midden van het bed, dan blijft de hoek voor het filamentmes (rechtsvoor 10 x 20) vrij, ook met een skirt. Geen brim aan het naadvlak.',
      '0,2 mm lagen, 4 wanden, 30 % gyroid; buitenwanden op 40 mm/s (schroefpaaltjes Ø5, klikhaken 1,6).',
    ],
    delen: ['Proefstuk (TRN-08)', 'Bak links (TRN-01) en rechts (TRN-02)', 'Deksel links (TRN-04) en rechts (TRN-05)', 'Hulpstukken (TRN-03)'],
  },
  {
    titel: 'De helften passen (droog inklikken)', tijd: '10 min', gereedschap: 'Vlakke tafel, kleine schroevendraaier, detail TRN-06',
    beelden: [beeld(of('bakL', 'bakR'), [[G.bakR, [25, 0, 0]]], { naad: true }), kopie(`${V5}/naad-detail-vp.jpg`)],
    tekst: [
      'Beide helften op een vlakke tafel, de naad naar elkaar. Schuif de rechterhelft tegen de linker: de 5 bodemlippen gaan in hun uitsparingen, de 2 klikhaken (achter en voor) glijden langs de binnenkant van de wand.',
      'Duw tot beide haken hoorbaar klikken (± 10 N per haak): de nok valt in het kuiltje in de wand. Bodem en wanden liggen dan vlak; de voeg is 0,2 breed.',
      'Weer uit elkaar (voor de modules en de proef): de punt van elke haak met een kleine schroevendraaier van de wand weg trekken (van binnen, bovenaan bereikbaar) en de helften uit elkaar schuiven.',
      'Klikt een haak niet of te zwaar: de nok in maten.mjs (naad.haak.nok.d) 0,1 aanpassen en alleen de rechterhelft opnieuw printen.',
    ],
    delen: ['Bak links en rechts'],
  },
  {
    titel: 'De modules in de rechterhelft schroeven', tijd: '45 min', gereedschap: 'Kruiskopschroevendraaier PH1, montageblad TRN-10, multimeter',
    beelden: [beeld(of('bakR', 'modulesR', 'dcbus', 'ir')), beeld(of('bakR', 'modulesR', 'dcbus', 'ir'), [], { toets: 'Control+5' })],
    tekst: [
      'Elke module op haar palen met plaatschroeven 3 x 8 bolkop (de PCA9685 met 2,5 x 6): de MOSFET-modules -Q1 (achter) en -Q2 met hun klemmen naar de naad, de PCA9685 -K2 ernaast, de ESP in haar schroefklemadapter -X6 met de USB naar de voorwand, de optocouplerprints -K3 en -K4 met hun ingangen naar de rechterwand, de regelaar -T2 rechtsvoor.',
      'Druk de 6 WAGO-klemmen 221-415 in hun klikhouders achteraan, 3 per rij, de hendels naar boven en de draadingangen naar voren: -X1 (L+, 2 stuks), -X3 (+12 V sensoren), -X2 (0 V, 2 stuks), -X7 (3,3 V).',
      'De DC-bus in het gat in de achterwand boven de WAGO-klemmen (de moer aan de binnenkant).',
      'Versie 6: de servoprint -K7 (een tweede PCA9685, de brug A1 dicht = adres 0x42) achter de WAGO-klemmen met de servopinnen naar voren, de XL4015 -T3 ervoor, de 2 WAGO-klemmen -X12 (3,3 V) en -X13 (0 V) in de klikhouder vóór de XL4015. Zet de XL4015 eerst op tafel op 5,5 V (12 V erop, multimeter op OUT, aan de potmeter draaien).',
      'De IR-leerontvanger -B1 (TSMP58000) met de lens naar het venstertje in zijn vakje rechts naast de USB-opening, de pootjes naar boven.',
      'Niet te hard aandraaien: de gaten in PETG zijn Ø2,6 (3 mm) en Ø2,2 (2,5 mm).',
    ],
    delen: ['2 MOSFET-modules, 2 optocouplerprints', 'ESP32-S3 in de schroefklemadapter', 'PCA9685, SBC-Buck02, DC-bus', '6 + 2 WAGO 221-415', 'servoprint PCA9685 (0x42), XL4015, TSMP58000', '28 plaatschroeven 3 x 8, 8 x 2,5 x 6'],
  },
  {
    titel: 'De IR-driver en de MCP23017 in de linkerhelft', tijd: '20 min', gereedschap: 'Kruiskopschroevendraaier PH1, montageblad TRN-11',
    beelden: [beeld(of('bakL', 'modulesL')), beeld(of('bakL', 'modulesL'), [], { toets: 'Control+5' })],
    tekst: [
      'Naast bordje 16 (rij 6): de 8-kanaals MOSFET-module -Q4 met haar uitgangen naar voren (naar de tules vooraan) en de AOD4184 -Q3 ernaast, elk met plaatschroeven 3 x 8.',
      'De MCP23017 -K5 vóór bordje 16: hij heeft geen gaten; leg hem tussen de 2 paaltjes en klem de korte kanten met een plaatschroef 2,5 x 8 en een sluitring Ø8 (de ring ligt half op de print). De 2 paaltjes rechts ernaast zijn voor een tweede MCP23017 (-K8, ingangen 25 tot 40), later.',
      'De draden tussen de helften (dupont 30 cm, voor de I2C 2 aan elkaar, en montagedraad, de streepjes op TRN-10 en TRN-11) komen bij het bedraden.',
    ],
    delen: ['8-kanaals MOSFET-module (zoals -Q1)', 'AOD4184-module', 'MCP23017 (CJMCU-2317)', '6 plaatschroeven 3 x 8, 2 x 2,5 x 8 met sluitring Ø8'],
  },
  {
    titel: 'Bedraden met de draadlijst, zonder solderen', tijd: '2 uur', gereedschap: 'Striptang, kleine schroevendraaier 2,5, dupontkabels, draadlijst TRN-14, soldeerbout (alleen de DC-bus)',
    beelden: [kopie(`${V5}/closeup-modules-vp.jpg`)],
    tekst: [
      'Volg de draadlijsten TRN-14 en TRN-15 (W01 tot W94) en de montagebladen TRN-10 en TRN-11: 0,75 mm² voor 12 V en 0 V naar de MOSFET-modules, 0,5 mm² naar de regelaar, dupontkabels female-female op de pinnen van de PCA9685 en de MOSFET-modules (kanaal 0..15 naar IN1..IN8), female-male waar het andere eind in een schroefklem gaat.',
      'Met hun pootjes in de klemmen, geen solderen: de weerstand -R1 (1 kΩ) tussen J1:1 (3V3) en J1:16 (GPIO10) van de adapter, de diode -R2 SB560 tussen -X1:8 (ring = kathode) en -X2:8, de polyfuse -F18 tussen -X1:7 en -X3:1, de elco -C5 (1000 µF) in de schroefklem V+/GND van de servoprint (+ aan V+).',
      'Per groep een polyfuse MF-R050: één pootje in de klem n− van de MOSFET-module, het andere in een WAGO 221-2411 waar straks de − van het bordje bij komt. Label ze G01 tot G16.',
      'Het enige soldeerwerk: de DC-bus. Soldeer aan de pen (+) de draad van de zekeringhouder -F1 en aan de huls (−) een zwarte draad van 0,75 mm² naar -X2:1.',
    ],
    delen: ['Montagedraad 0,14 tot 0,75 mm², dupontkabels', '17 polyfuses MF-R050, 16 WAGO 221-2411', 'SB560, weerstand 1 kΩ, zekeringhouder met 7,5 A'],
  },
  {
    titel: 'Proefopstelling en firmware flashen', tijd: '1 uur', gereedschap: 'Pc met PlatformIO, micro-USB-kabel (data), multimeter, magneet, meetblad TRN-20',
    beelden: [beeld([...of('bakR', 'modules', 'dcbus'), G.bordje1], [[G.bordje1, [-150, 20, 0]]], { toets: 'Control+7' })],
    tekst: [
      'Op tafel, de rechterhelft alleen: één bordje aan groep 1 (G01+ aan -Q1:1+, G01− in de WAGO van zijn polyfuse), één drukknop tussen -K3:IN1 en 0 V (-X2), eventueel een hallsensor op IN2 (+ aan -X3, − aan -X2, uitgang aan IN2).',
      'Flashen: de ESP met de micro-USB "UART" aan de pc (door de opening in de voorwand), in firmware/: python -m platformio run -e doos -t upload (de adapter uit de DC-bus zolang de USB-kabel erin zit). Daarna kan bijwerken zonder kabel (dashboard, Instellingen, Firmware bijwerken).',
      'Adapter in de DC-bus. Meet en noteer op het meetblad TRN-20: 12 V, 5 V, 3,3 V, OE bij reset, +12 V van de ingangen. Stap 8 en 9: gaat het bordje uit als groep 1 uit staat, en toont IN01 "rust" zonder knop? Stap 12: de magneet 10 keer langs de hallsensor, de teller gaat 10 omhoog.',
      'Dashboard, Instellingen, Testmodus: groep 1 vast aan (stroom en spanning n− tot VIN−), dan looplicht; de knop op IN01 zet alles aan en uit (standaardinstelling).',
    ],
    delen: ['1 bordje, 1 drukknop, eventueel 1 hallsensor SS441A en een magneet', 'Draden van TRN-14'],
  },
  {
    titel: 'De helften verbinden: inklikken, eventueel eerst lijm in de voeg', tijd: '15 min + 24 uur uitharden', gereedschap: '2K-epoxy (24 ml), spatel of houtje, vlakke tafel, detail TRN-06',
    beelden: [beeld(of('bakL', 'bakR', 'modules', 'dcbus'), [[G.bakR, [30, 0, 0]], [G.modules, [30, 0, 0]], [G.dcbus, [30, 0, 0]]], { naad: true }), kopie(`${V5}/naad-doorsnede-boven-vp.jpg`)],
    tekst: [
      'Lijmen is niet nodig (de haken houden de helften vast), maar maakt de doos stijver en de naad dicht. Eerst droog passen (stap 2).',
      'Meng de 2K-epoxy en strijk een dunne laag op de stootvlakken van de bodem en de wanden van de rechterhelft, op de 5 bodemlippen en op de buitenkant van de 2 klikhaken. De voeg is overal 0,2: niet te veel lijm, wat uitpuilt meteen wegvegen.',
      'Leg beide helften op een vlakke tafel en schuif ze in elkaar tot de 2 haken klikken. Druk de naad bovenaan en onderaan dicht; de haken houden de helften terwijl de lijm uithardt.',
      'Laat 24 uur liggen op de tafel (niet ophangen). Bodem en wanden zijn nu vlak en dicht; aan de naad blijft 11 mm vrij voor de draden van de bordjes naar de MOSFET-modules.',
    ],
    delen: ['2K-epoxy 24 ml'],
  },
  {
    titel: 'De bordjes vastschroeven', tijd: '15 min', gereedschap: 'Kruiskopschroevendraaier PH1',
    beelden: [beeld([...of('bakL', 'bakR', 'dcbus'), G.bordjes], [[G.bordjes, [0, 40, 0]]]), kopie('e2e-out/trein-v5/schroeven-iso-vp.jpg')],
    tekst: [
      'Leg elk Modelbouwled-bordje op zijn 4 paaltjes: bordje 1 links achteraan, dan per rij van links naar rechts; bordje 16 in rij 6. De gaten in de hoeken van de print vallen op de paaltjes.',
      'Draai 4 schroeven 2,0 x 6 in (bolkop, PH1): met de hand tot de kop de print raakt, dan nog 1/8 slag. Niet doordraaien: dan breekt de draad in het paaltje uit (TRN-07).',
      'Uitnemen: de 4 schroeven eruit en het bordje optillen.',
      'Schrijf het groepsnummer op elk bordje: G01 tot G16.',
    ],
    delen: ['16 bordjes Modelbouwled', '64 schroeven 2,0 x 6'],
  },
  {
    titel: 'Ophangen onder de baan', tijd: '15 min', gereedschap: 'Boormal TRN-00a en TRN-00b (2 x A3 op 100 %), tape, boor Ø2,5, schroevendraaier',
    beelden: [beeld([...ALLES_OPEN], [], { onder: true })],
    tekst: [
      'Druk de 2 bladen van de boormal af op A3 op ware grootte en meet de controlemaat van 100 mm na. Knip blad 2 langs "hier knippen" en leg het over blad 1 tot de kruisen A en B samenvallen; tapen.',
      'Plak de mal onder de baan (je kijkt van onderen), met rondom 60 mm vrij voor de kabels. Boor de 4 kruisjes voor met Ø2,5.',
      'Draai 4 bolkopschroeven 4 x 20 in tot de kop 4 mm onder de baan staat.',
      'Vóór de doos onder de baan gaat: steek in elk oogje in de bodem een losse kabelbinder 2,5 x 100 (nog open). Tegen de baan is het kanaal onder het oogje dicht; op de werkhaken (volgende stap) kan het ook nog (Fable 5.2 DN1).',
      'Houd de doos met de 4 grote gaten over de koppen en schuif ze 6 mm naar achteren, tot elke schroef aan het eind van zijn sleuf zit.',
    ],
    delen: ['4 bolkopschroeven 4 x 20'],
  },
  {
    titel: 'Bedraden op werkhoogte en kabels ordenen', tijd: '2 tot 3 uur', gereedschap: 'Striptang, kleine schroevendraaier 2,5, kabelbinders, labels, 2 werkhaken en de spatel (hulpstukken)',
    beelden: [beeld([...of('bakL', 'bakR', 'tules', 'dcbus', 'bordjes', 'modules', 'ophangschroeven')], [], { kantel: true, toets: 'Control+2' }), beeld([...of('bakL', 'bakR', 'tules', 'dcbus', 'bordjes', 'modules')], [], { zoom: [0.6, 0.45, 4] })],
    tekst: [
      'Werkhoogte: schuif de doos 6 mm naar voren en neem ze af. Hang de 2 werkhaken met hun sleutelgat aan de 2 voorste schroeven en de doos met haar 2 voorste sleutelgaten aan de knoppen: ze hangt verticaal, 12 cm onder de baan, de open kant naar je toe.',
      'Elke bundel van de baan naar de doos krijgt een kabellus van 50 cm (kabelbinder aan de baan). Labels eerst: G01+ tot G16+, G01− tot G16−, IN01 tot IN16 aan beide uiteinden.',
      'Leddraden: door de draadsleuf in de bodem naast hun bordje, of door een tule links of vooraan, rechtstreeks naar hun klem. De + en − van elk bordje van zijn eindklem door de vrije strook voor de rij naar de naad en recht in hun klem (+ in n+, − in de WAGO van de polyfuse). Knoppen en sensoren: door de 4 tules in de rechterwand naar IN n.',
      'IR-leds (versie 6): per led een weerstand 120 Ω met één pootje in de klem n+ van -Q4 en het andere in een WAGO 221-2411 samen met de draad naar de anode; de kathode in de klem n−. Codesoort continu: 470 Ω 0,5 W in plaats van 120 Ω (TRN-22 H). IR-ontvangers op de baan: 3,3 V uit -X12, 0 V uit -X13, de uitgang via 1 kΩ in -X14 naar GPIO11, 39 of 42 (TRN-15). Reflexsensoren: de veldkabel -W40 van -X12:2 en -X13:2 naar -X17/-X18 onder de baan, hun uitgang via 1 kΩ in -X15 naar -K5 GPB0..3. Servokabels door de 5de tule rechts op de pinnen van de servoprint (bruin = GND).',
      'Bundel de draden per rij met een kabelbinder in de vrije strook voor de rij; een draad tussen de bordjes uittrekken met het haakje van de spatel.',
    ],
    delen: ['Montagedraad 0,25 en 0,5 mm²', 'Kabelbinders, labels', '2 werkhaken'],
  },
  {
    titel: 'Het deksel erop', tijd: '20 min', gereedschap: 'Kruiskopschroevendraaier PH2, eventueel 2K-epoxy',
    beelden: [beeld([...ALLES_OPEN, ...of('deksel', 'dekselschroeven')], [[G.dekselL, [0, 60, 0]], [G.dekselR, [40, 60, 0]], [G.dekselschroeven, [0, 80, 0]]], { voorblad: true }), kopie(`${V5}/naad-doorsnede-deksel-vp.jpg`)],
    tekst: [
      'Kijk na dat geen draad boven de bordjes of de modules uitsteekt (binnen 47 hoog, de modules tot 39).',
      'Het deksel: leg beide helften met de buitenkant op de tafel en schuif de rechterhelft met haar lip onder de linkerhelft tot de 4 nokken klikken; eventueel eerst een dun laagje lijm in de sponning (dan 24 uur laten liggen).',
      'Zet het deksel op de doos (de rand van de linkerhelft valt in de bak) en draai de 6 plaatschroeven 3 x 12 verzonken in de bussen, kruislings en niet te hard.',
      'Neem de doos van de werkhaken en hang ze weer op de 4 schroeven (6 mm naar achteren schuiven).',
    ],
    delen: ['Deksel links en rechts', '6 plaatschroeven 3 x 12 verzonken'],
  },
  {
    titel: 'Aanzetten, instellen en meten', tijd: '30 min', gereedschap: 'Gsm of tablet, multimeter, magneet, meetblad TRN-20, invulblad TRN-21',
    beelden: [bestand(`${DIR}/firmware/ui/beelden/tablet-groepen.png`)],
    tekst: [
      'Adapter in de DC-bus. Het lampje op de ESP wordt groen: de wifi Treinbaan is aan (rood: de uitgangsprint antwoordt niet, kijk de I2C-draden na).',
      'Verbind de gsm met Treinbaan (wachtwoord treinbaan); het dashboard opent vanzelf, anders http://192.168.4.1. Wijzig het wachtwoord bij Instellingen (vergeten: BOOT 5 s); vul eventueel het thuisnet in.',
      'Testmodus looplicht: kijk of elke groep op de juiste plaats van de baan oplicht (elke groep is aan of uit, geen dimmers). Meet per groep de stroom en noteer alles op het meetblad TRN-20.',
      'Hallsensoren: in Ingangen de ingang op "Hallsensor (korte puls)" zetten; een loc met magneet erover: het bolletje wordt even groen en de teller telt. Geef elke groep en ingang de naam van het invulblad TRN-21 en koppel de knoppen en sensoren aan een functie.',
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
      // een beeld dat een ander script maakte (bordje 5 met zijn 4 schroeven: trein-v5-shots.mjs), als stapbeeld
      if (!existsSync(b.kopie)) throw new Error(`${b.kopie} ontbreekt: eerst node e2e/tools/trein-v5-shots.mjs (SHOTS=schroeven)`);
      const f = `${BEELD}/stap-${String(i + 1).padStart(2, '0')}-${String(++n).padStart(2, '0')}${b.kopie.endsWith('.png') ? '.png' : '.jpg'}`;
      copyFileSync(b.kopie, f);
      s.foto.push(f);
      continue;
    }
    const vast = `${BEELD}/stap-${String(i + 1).padStart(2, '0')}-${String(n + 1).padStart(2, '0')}.jpg`;
    if (HERGEBRUIK && existsSync(vast)) { n++; s.foto.push(vast); continue; }
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
      // van dichtbij (standaard: de bordjes links, een bordje op zijn schroefpaaltjes, een kabelinvoer)
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
  <h1>Bouwschema<br><small>Kabeldoos met ESP32-S3: 16 lichtgroepen (aan/uit), 16 ingangen (ook hallsensoren), eigen wifi; één laag in 2 helften die in elkaar klikken, kant-en-klare modules, draden rechtstreeks van tule naar klem</small></h1>
  <div class="voorinhoud"><img src="${img(STAPPEN.flatMap((q) => q.beelden.map((b, k) => [b, q.foto[k]])).find(([b]) => b.voorblad)[1])}">
  <ol>${STAPPEN.map((s) => `<li>${esc(s.titel)} <em>${esc(s.tijd)}</em></li>`).join('')}</ol></div>
  <p class="noot">Maten staan op de werktekeningen TRN-00a tot TRN-07 (TRN-06: de naad, TRN-07: de bevestiging van de bordjes), de modules op het montageblad TRN-10, de draden tussen de modules in de draadlijst TRN-14, de bedrading in het aansluitschema, de metingen op het meetblad TRN-20, de onderdelen en prijzen in de README. Geen gaatjesprints: alleen de DC-bus wordt gesoldeerd.
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
