// Bouwschema van de afzuiging: per stap de onderdelen uit voorbeelden/bureau/Bureau.kcad in Phlippo CAD (de nieuwe
// delen uit elkaar geschoven in de richting waarin ze erin gaan), een beeld van het venster en de uitleg; samen een
// PDF (A4 liggend) in voorbeelden/afzuiging/tekeningen. Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184
// (E2E_URL) en de stuklijst uit de werktekeningen (AFZUIGING_TEKENINGEN=1 npx vitest run src/qa/tekeningenAfzuiging.test.ts).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REVISIE_TEKST } from '../../voorbeelden/afzuiging/revisie.mjs';
import { ONDERHOUD } from '../../voorbeelden/afzuiging/onderhoud.mjs';

const UIT = 'voorbeelden/afzuiging/tekeningen';
const BEELD = 'e2e-out/bouwschema';
mkdirSync(BEELD, { recursive: true });
const bureau = JSON.parse(readFileSync('voorbeelden/bureau/Bureau.kcad', 'utf8'));
delete bureau.format;
// versie 7.2: een stuk blad met de twee huiden en de latten ertussen (zonder honingraat), in het assenstelsel van de module
const detail = JSON.parse(readFileSync('voorbeelden/bureau/Tafelblad-detail.kcad', 'utf8'));
delete detail.format;
// positie in de stuklijst per benaming
const pos = new Map(readFileSync(`${UIT}/stuklijst.csv`, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1).map((r) => r.split(';').map((v) => v.replace(/^"(.*)"$/, '$1').replace(/""/g, '"'))).map(([p, , n]) => [n, p]));

// groepen onderdelen (id's zoals in Bureau.kcad)
const G = {
  blad: /^t1$/,
  romp: /^a1$/, frame: /^a6$/, rooster: /^a2$/, persbouten: /^a2p\d$/, filter: /^a3$/, foam: /^a3f$/, lip: /^a3l$/, instroom: /^a9$/, bodem: /^a4$/, dichting: /^a4d$/, buffers: /^a4b\d$/, fan: /^a5$/,
  m8bus: /^a10$/, klauwen: /^ak\d$/, rubber: /^akr\d$/, moeren: /^an\d$/, m5: /^as5\d$/, m3: /^as3\d$/, m4: /^as4\d$/, draadeind: /^as6\d$/, meetbuis: /^a18$/,
  box: /^a20$/, boxdeksel: /^a28$/, dekselschroeven: /^asbd\d$/, boxschroeven: /^asb\d$/, boxinhoud: /^(a2[1-79]b?|as25\d|as2\d|asa\d)$/,
  knophouder: /^a7$/, knopdeksel: /^a12$/, knop: /^a8$/, adapter: /^a14$/, usbknop: /^a15$/, knopklauwen: /^adk\d$/, knoprubber: /^adkr\d$/, knopmoeren: /^adn\d$/, m4knop: /^asd\d$/, m25knop: /^ask\d$/, m25deksel: /^asdk\d$/, m2knop: /^asu\d$/,
  kasten: /^[kl]\d+$/,
};
const of = (...namen) => namen.map((n) => G[n]);
const MODULE = of('romp', 'frame', 'klauwen', 'rubber', 'moeren', 'm5', 'instroom', 'foam', 'lip', 'meetbuis', 'm8bus', 'bodem', 'dichting', 'buffers', 'fan', 'm4', 'draadeind', 'm3');
const BOX = of('box', 'boxinhoud', 'boxdeksel', 'dekselschroeven', 'boxschroeven');
const KNOP = of('knophouder', 'knopdeksel', 'knop', 'adapter', 'usbknop', 'knopklauwen', 'knoprubber', 'knopmoeren', 'm4knop', 'm25knop', 'm25deksel', 'm2knop');
const FILTERS = of('filter', 'rooster', 'persbouten');

/** een beeld: welke groepen, welke verschoven (dx, dy, dz in mm), van onderen bekeken (180° om Z gedraaid) en de toets van het aanzicht */
const beeld = (toon, schuif = [], opts = {}) => ({ toon, schuif, ...opts });
const STAPPEN = [
  {
    titel: 'Uitsparingen in het tafelblad', tijd: '1 uur', gereedschap: 'Bovenfrees met kopieerring Ø17 en frees Ø12, frees Ø5, MDF-freesmallen (laser), gatzaag Ø44, stofzuiger',
    beelden: [beeld(of('blad')), beeld(of('blad'), [], { onder: true })],
    extra: 'MDF-freesmallen (laser/freesmal-mdf.dxf, tekening AFZ-21); de papieren mallen in schema/ zijn alleen om af te tekenen en na te meten.',
    tekst: [
      'Bovenkant, doorgaand: de uitsparing 212 x 212 mm met hoeken R6 in het midden, langs de MDF-mal met kopieerring Ø17 en frees Ø12 (de opening van de mal is rondom 2,5 mm groter). Het gat Ø44 voor de knop (950 van links, 100 van voor) met de gatzaag.',
      'Onderkant, 15 mm diep: de uitsparing 212 x 102 mm voor de voedingsbox (MDF-mal), met het midden 495 mm van de voorkant, en ernaast 4 voorboorgaten Ø2,5 x 14 (door de gaatjes van de mal).',
      'Alle maten staan op tekening AFZ-20 en AFZ-21. Frees in drie tot vier gangen: LAGKAPTEN is vanbinnen een honingraat van papier. De sleuven komen pas na de latten (volgende stap).',
    ],
    delen: [],
  },
  {
    titel: 'Latten tussen de huiden', tijd: '30 min + een nacht drogen', gereedschap: 'Mes, lange schroevendraaier, PU-lijm of houtlijm D3, lijmklemmen, zaag',
    detail: true,
    beelden: [beeld([/^(h\d|l\d)$/], [[/^l\d$/, [0, -60, 0]]], { onder: true, detail: true }), beeld([/^(h\d|l\d)$/], [], { detail: true, snede: { plane: 'right', offset: 0, flip: false, cap: true }, toets: 'Control+4' })],
    tekst: [
      'Snij in de uitsparing van de module de honingraat rondom 45 mm diep weg (mes en een lange schroevendraaier), tussen de twee huiden.',
      'Zaag vier latten 28 x 44 mm van 212 mm (vuren, geschaafd; meet eerst de kern na: 28 mm bij huiden van 3 mm) en één van 28 x 38 voor de achterkant (de strook tot de uitsparing van de box).',
      'Smeer lijm op de boven- en onderkant, schuif elke lat in de holte, de binnenkant gelijk met de rand van de uitsparing, en klem ze tot de lijm hard is.',
      'Achter de box: snij de honingraat 32 mm diep weg en lijm een lat 10 x 30 x 200 tegen de binnenkant van de onderhuid. Pas daarna de sleuven frezen: 29 x 7 van de box naar de module (4 mm in de lat) en 5 x 5 naar het knopgat.',
    ],
    delen: [],
  },
  {
    titel: 'Magneten in het bovenframe', tijd: '15 min', gereedschap: 'Tweecomponentenlijm, een magneet als hulp voor de pool',
    beelden: [beeld(of('frame'))],
    tekst: [
      'Lijm de vier magneten Ø8 x 1,5 in de gaten aan de bovenkant van het bovenframe, vlak met het oppervlak.',
      'Leg ze allemaal met dezelfde pool naar boven: zet ze eerst op een stapel en neem ze er één voor één af.',
    ],
    delen: ['Bovenframe'],
  },
  {
    titel: 'Lijmen: frame op de romp', tijd: '30 min + een nacht drogen', gereedschap: 'Tweecomponentenlijm, lijmklemmen of gewichten',
    beelden: [beeld(of('romp', 'frame'), [[G.frame, [0, 45, 0]]])],
    tekst: [
      'Lijm het bovenframe rondom op de bovenrand van de romp: de naad moet luchtdicht zijn.',
      'Laat alles een nacht uitharden voor je verder gaat.',
    ],
    delen: ['Romp', 'Bovenframe'],
  },
  {
    titel: 'Klauwen met rubber en M5-schroeven', tijd: '15 min', gereedschap: 'Inbussleutel 3 mm, secondelijm-gel, mes',
    beelden: [beeld(of('romp', 'frame', 'klauwen', 'rubber', 'moeren', 'm5'), [[G.moeren, [0, -15, 0]], [G.m5, [0, 70, 0]]], { ingeklapt: true })],
    tekst: [
      'Snij vier kussentjes van 7,5 x 8 mm uit het neopreen van 4 mm en lijm er één met secondelijm op de bovenkant van elke arm, aan het uiteinde (9,5 tot 17 mm van het schroefgat). Snij ook twee van 6 x 6 uit het neopreen van 3 mm voor de knopklauwen (7,5 tot 13,5 mm).',
      'Druk in elke klauw van onderen een M5-moer in de zeskantkamer (eventueel met een tik of een warme bout).',
      'Schuif elke klauw liggend door het venster onderaan de zijwand in het kanaal van de toren, tot het gat onder de schroef zit.',
      'Draai de M5 x 65 van bovenaf door de lip van het frame een paar slagen in de moer: de klauw blijft ingeklapt binnen de romp liggen.',
    ],
    delen: ['Klauw', 'Klauwrubber', 'M5 zeskantmoer DIN 934', 'M5 x 65 DIN 7991'],
  },
  {
    titel: 'Ventilator op rubberbuffers in de kuip', tijd: '30 min', gereedschap: 'Inbussleutels 2 en 2,5 mm, siliconenkit',
    beelden: [beeld(of('bodem', 'buffers', 'fan', 'm4', 'draadeind'), [[G.fan, [0, 60, 0]], [G.draadeind, [0, 30, 0]], [G.m4, [0, -40, 0]]], { onder: true }), beeld(of('bodem', 'buffers', 'fan'), [], { snede: { plane: 'right', offset: 0, flip: false, cap: true }, toets: 'Control+4' })],
    tekst: [
      'Draai in elke rubberbuffer (Ø15 x 10, M4 binnendraad) een draadeind M4 x 8 half in, en het andere eind 4 mm in een gat van de motor (de fabrikant laat 4 tot 6 mm toe): niet tot op de bodem.',
      'Zet de ventilator met de buffers in de kuip en schroef ze van onderen vast met 4 x M4 x 8 verzonken. De waaier mag nergens de wand raken.',
      'Leid de vier aders door het gat Ø5 in de bodem naar buiten en zet het gat dicht met een druppel siliconenkit (luchtdicht).',
    ],
    delen: ['San Ace C175 9TG24P0S01', 'Ventilatorkuip', 'Rubberbuffer Ø15 x 10 M4', 'Draadeind M4 x 8 DIN 913', 'M4 x 8 DIN 7991'],
  },
  {
    titel: 'Instroomplaat, foamband en afdichtlip', tijd: '30 min', gereedschap: 'Tweecomponentenlijm, siliconeslangetje 2 x 4 mm, schaar, scherp mes, lat, snijmal',
    beelden: [beeld(of('romp', 'frame', 'klauwen', 'm5', 'm8bus', 'instroom', 'foam', 'lip', 'meetbuis'), [[G.instroom, [0, 90, 0]], [G.meetbuis, [0, 90, 0]], [G.foam, [0, 120, 0]], [G.lip, [0, 150, 0]]])],
    tekst: [
      'Lijm een messingbuisje in de instroomplaat: dat is het meetpunt onder het filter. Zet de M8-bus met zijn moer in het gat in de achterwand, onder de richel.',
      'Leg de plaat op de getrapte richel in de romp (die loopt ook langs de torens), de trechter en de randen naar boven, en lijm ze rondom: ook langs de torens, want onder de plaat is het buiten de luchtweg.',
      'Schuif een siliconeslangetje op het buisje onder de plaat en leid het door het gat Ø6 in de achterwand naar buiten.',
      'Kleef de foamband (6 x 4) rondom op de steunrand, binnen de geleiderand; de naad op een korte kant.',
      'Snij de afdichtlip in één stuk uit het zelfklevende siliconenrubber met de snijmal (schema/Snijmal-afdichtlip-1op1-A4.pdf) en kleef ze op de bovenkant van de geleiderand, de buitenrand gelijk met de buitenkant: 3,5 mm steekt naar binnen uit.',
    ],
    delen: ['Instroomplaat', 'Messingbuisje Ø3 x 12', 'M8-inbouwbus 4-polig', 'Foamband 6 x 4', 'Afdichtlip'],
  },
  {
    titel: 'Kuip met ventilator aan de romp', tijd: '20 min', gereedschap: 'Soldeerbout, krimpkous, inbussleutel 2,5 mm',
    beelden: [beeld([...of('romp', 'frame', 'klauwen', 'm5', 'm8bus', 'instroom', 'meetbuis'), ...of('bodem', 'dichting', 'buffers', 'fan', 'm4', 'draadeind', 'm3')], [[G.bodem, [0, -80, 0]], [G.buffers, [0, -80, 0]], [G.fan, [0, -80, 0]], [G.m4, [0, -80, 0]], [G.draadeind, [0, -80, 0]], [G.dichting, [0, -40, 0]], [G.m3, [0, -125, 0]]], { onder: true })],
    tekst: [
      'Kleef de foamband 6 x 2 rondom op de rand van de kuip (de naad stomp tegen elkaar).',
      'Soldeer de vier aders van de ventilator op de M8-bus in de achterwand (rood 1, geel 2, zwart 3, bruin 4; eerst nameten met de datasheet) en leg ze in een lus naast de kuip.',
      'Duw de kuip met de ventilator tegen de onderkant van de instroomplaat, de oren onder de bussen, en schroef ze vast met 4 x M3 x 12 cilinderkop: de foamband wordt ongeveer 0,5 mm ingedrukt en dicht rondom.',
    ],
    delen: ['Kuipdichting', 'M3 x 12 DIN 912'],
  },
  {
    titel: 'Module in het blad', tijd: '5 min', gereedschap: 'Inbussleutel 3 mm',
    beelden: [beeld([G.blad, ...MODULE], MODULE.map((g) => [g, [0, 260, 0]]), { ingeklapt: true }), beeld([G.blad, ...MODULE], [], { onder: true })],
    tekst: [
      'Laat de module van bovenaf in de uitsparing zakken tot het frame op het blad ligt.',
      'Draai de vier M5-schroeven rechtsom aan: de klauw kruipt omhoog, de schuine kant van de kamer duwt hem vanzelf naar buiten door het venster, en daarna schuift hij in de sleuf omhoog tot het rubber de onderkant van het blad raakt (de schroef gaat dan zwaarder).',
      'Draai daarna elke schroef precies een halve slag verder (de inbussleutel wijst de andere kant op) en stop: het rubber begrenst de kracht (het blad is hol). Een hele slag is te veel.',
    ],
    delen: [],
  },
  {
    titel: 'Filter en RVS-plaat', tijd: '5 min', gereedschap: 'Geen',
    beelden: [beeld([G.blad, ...MODULE, ...FILTERS], [[G.filter, [0, 120, 0]], [G.rooster, [0, 230, 0]]])],
    tekst: [
      'Duw het interieurfilter MANN CU 20 013 (195 x 145 x 30, of gelijk) recht naar onder door de lip tot op de foamband, de lange kant van voor naar achter en de pijl (luchtrichting) naar onder; niets te knippen.',
      'Kijk en voel rondom: de lip ligt overal naar onder gebogen tegen de zijkant van het filter. Leg de RVS-plaat erop met de 4 persbouten in de opening van het frame: ze centreren de plaat, de magneten houden ze vast. Tussen de plaat en de plooien blijft 3 tot 5 mm lucht.',
    ],
    delen: ['Interieurfilter MANN CU 20 013', 'Rooster LB', 'Persbout PEM FH4-M3-6'],
  },
  {
    titel: 'Voedingsbox', tijd: '2 uur (print solderen)', gereedschap: 'Soldeerbout, schroevendraaier, inbussleutels 2 en 2,5 mm, boor Ø2,5',
    beelden: [beeld(BOX, [[G.boxinhoud, [0, 70, 0]], [G.boxdeksel, [0, 130, 0]], [G.dekselschroeven, [0, 160, 0]], [G.boxschroeven, [0, -40, 0]]]), beeld([G.blad, ...MODULE, ...BOX], BOX.map((g) => [g, [0, -110, 0]]), { onder: true })],
    tekst: [
      'Bouw de voedingsprint volgens het aansluitschema en schroef ze met 4 x M2,5 op de bussen.',
      'Zet de netadapter op de bodem tegen de aanslagen en schroef de twee klemmen op de paaltjes (M3 x 10). Kort de DC-kabel in, meet met de multimeter welke ader + is en klem + op -X1.1 en - op -X1.2 (-R13 beschermt bij een vergissing).',
      'Zet de schakelaar, de M8-stekker, het messingbuisje en de USB-C-bus (2 x M2) in de wanden. Schuif een stukje slang van 10 cm op de "+"-poort van de drukmeter, open einde naar onder, met een propje filtervlies erin.',
      'Leid het slangetje door de ring tegen de voorwand en schroef het deksel op de paaltjes (4 x M3 x 8). Duw de box van onderen in de uitsparing en zet de rand vast met 4 spaanplaatschroeven 4 x 16 verzonken in de voorboorgaten: tot de kop vlak ligt, niet verder.',
    ],
    delen: ['Voedingsbox', 'Mean Well GST90A24-P1M', 'Voedingsprint', 'Elco 470 µF', 'Schottky SB560', 'USB-C-bus knop', 'Wipschakelaar C&K D502', 'M8-inbouwstekker 4-polig', 'Adapterklem', 'M3 x 10 DIN 7991', 'Deksel voedingsbox', 'M3 x 8 DIN 7991', 'Spaanplaatschroef 4 x 16 verzonken', 'M2,5 x 6 zelftappend', 'M2 x 5 zelftappend'],
  },
  {
    titel: 'Knop', tijd: '30 min', gereedschap: 'Inbussleutel 2 mm, kruiskop PH0, soldeerbout',
    beelden: [beeld(KNOP, [[G.knop, [0, 30, 0]], [G.m4knop, [0, 50, 0]], [G.knopmoeren, [0, -48, 0]], [G.m25knop, [0, -12, 0]], [G.adapter, [0, -70, 0]], [G.usbknop, [40, -55, 40]], [G.m2knop, [40, -68, 40]], [G.knopdeksel, [0, -110, 0]], [G.m25deksel, [0, -122, 0]], [G.knopklauwen, [0, -30, 0]], [G.knoprubber, [0, -30, 0]]]),
      beeld(KNOP, [], { toets: 'Control+2' })],
    tekst: [
      'Druk een M4-moer in elke knopklauw (met het rubberkussentje van stap 4 erop). Zet de houder in het gat Ø44, schuif de klauwen van onderen in hun kanaal en draai de M4 x 65 van bovenaf in tot het rubber het blad raakt, dan een halve slag.',
      'Steek de FPC van de knop door de sleuf in de kom, zet de knop in de kom en schroef hem van onderen vast met 2 x M2,5 x 6 verzonken.',
      'Soldeer 4 draden (VBUS, GND, D+, D-) van de adapterprint naar het USB-C-printje. Steek de FPC in de adapterprint en schuif de print in de groeven.',
      'Leg het USB-C-printje (zonder gaten) tussen de 2 palen: de bus steekt opzij onderaan door de wand, aan de kant van de sleuf. Schroef het deksel vast: de 2 pennetjes van het deksel klemmen het printje.',
    ],
    delen: ['Knophouder', 'Knopklauw', 'Knopklauwrubber', 'M4 zeskantmoer DIN 934', 'M4 x 65 DIN 7991', 'VIEWE-knop 1,5"', 'M2,5 x 6 DIN 7991', 'Adapterprint knop', 'USB-C-bus knophouder', 'Knopdeksel', 'M2,5 x 8 DIN 7991'],
  },
  {
    titel: 'Kabels in de sleuven', tijd: '10 min', gereedschap: 'Eventueel een paar druppels lijm of tape in de sleuf',
    beelden: [beeld([G.blad, ...MODULE, ...BOX, ...KNOP], [], { onder: true })],
    tekst: [
      'Leg de M8-kabel en het siliconeslangetje in de brede sleuf tussen de box en de afzuiging en steek ze in.',
      'Leg de USB-C-kabel (haakse stekkers) in de smalle sleuf naar de knop en steek hem opzij in de knophouder.',
      'Een andere afstand is gewoon een andere kabel: er wordt niets geknipt.',
    ],
    delen: [],
  },
  {
    titel: 'Opstarten en ijken', tijd: '10 min', gereedschap: 'Computer met USB-C-kabel (alleen om te flashen)',
    beelden: [beeld([/./])],
    tekst: [
      'Flash de firmware van de knop en de module (zie de README, PlatformIO, envs knop en module).',
      'Steek het netsnoer in de box en in het stopcontact en zet de schakelaar aan.',
      'Koppel de knop met de box (10 s indrukken, dan de box drie keer kort aan en uit). Houd de knop daarna 5 seconden ingedrukt, bevestig "Nieuw filter?" met kort drukken en wacht tot het ijken klaar is: de drukmeter onthoudt de schone waarde. Een filter van een ander merk: op "Nieuw filter?" 3 s vasthouden.',
      'Draaien regelt de zuigkracht, klikken zet aan en uit. Meldt de knop Filter vervangen, volg dan de volgende stap.',
    ],
    delen: [],
  },
  {
    titel: 'Onderhoud: het filter vervangen', tijd: '5 min', gereedschap: 'Handschoenen, stofmasker FFP2, vuilniszak, vochtige doek',
    beelden: [beeld([G.blad, ...MODULE, ...FILTERS], [[G.filter, [0, 120, 0]], [G.rooster, [0, 230, 0]]])],
    tekst: ONDERHOUD,
    delen: ['Interieurfilter MANN CU 20 013'],
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
  const doc = structuredClone(b.detail ? detail : bureau);
  const past = (c, groepen) => groepen.some((g) => g.test(c.id));
  doc.components = doc.components.filter((c) => past(c, b.toon));
  const hoek = (deg) => { const h = (deg * Math.PI) / 360; return [0, Math.sin(h), 0, Math.cos(h)]; };
  const blad = (b.detail ? detail : bureau).components.find((c) => c.id === 'a1').position[1]; // bovenkant van het blad
  for (const c of doc.components) {
    if (b.ingeklapt && /^a(k|n|kr)\d$/.test(c.id)) {
      // ingeklapt: de arm langs de wand van de toren, onderaan in de zwaaikamer (zoals de test in qaAfzuiging)
      const rechts = c.position[0] > 0;
      c.position = [c.position[0], blad - 60.5 + (/^an/.test(c.id) ? 0.2 : 0), c.position[2]];
      c.rotation = hoek(rechts ? 90 : 270);
    }
    for (const [g, d] of b.schuif) {
      if (!g.test(c.id)) continue;
      const v = d === 'buiten' ? [Math.sign(c.position[0]) * 45, 0, 0] : d;
      c.position = [c.position[0] + v[0], c.position[1] + v[1], c.position[2] + v[2]];
    }
    if (b.onder) {
      // van onderen: alles 180° om Z draaien (x en y wisselen van teken)
      c.position = [-c.position[0], -c.position[1], c.position[2]];
      c.rotation = qmul([0, 0, 1, 0], c.rotation ?? [0, 0, 0, 1]);
    }
  }
  doc.mates = [];
  return doc;
}
let n = 0;
for (const [i, s] of STAPPEN.entries()) {
  s.foto = [];
  for (const b of s.beelden) {
    await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), samenstelling(b));
    await page.waitForTimeout(2500);
    await page.evaluate((x) => window.__phlippoStore.setState({ sectionView: x }), b.snede ?? null);
    if (b.snede) await page.waitForTimeout(1500);
    await page.keyboard.press(b.toets ?? 'Control+7');
    await page.waitForTimeout(600);
    await page.keyboard.press('f');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1500);
    const f = `${BEELD}/stap-${String(i + 1).padStart(2, '0')}-${++n}.jpg`;
    // zonder de werkbalk bovenaan en het assenkruis onderaan
    const vb = await page.locator('.k-viewport').boundingBox();
    await page.screenshot({ path: f, type: 'jpeg', quality: 88, clip: { x: vb.x + 2, y: vb.y + 44, width: vb.width - 4, height: vb.height - 104 } });
    s.foto.push(f);
  }
}

// ---- PDF ----
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const img = (f) => `data:image/jpeg;base64,${readFileSync(f).toString('base64')}`;
const N = STAPPEN.length;
const kop = (t) => `<div class="kop"><span>Bouwschema afzuiging Lush Beauty · ${REVISIE_TEKST}</span><span>${t}</span></div>`;
const voorblad = `<section class="blad voor">${kop('')}
  <h1>Bouwschema<br><small>Ingebouwde afzuiging met voedingsbox en knop</small></h1>
  <div class="voorinhoud"><img src="${img(STAPPEN[N - 1].foto[0])}">
  <ol>${STAPPEN.map((s) => `<li>${esc(s.titel)} <em>${esc(s.tijd)}</em></li>`).join('')}</ol></div>
  <p class="noot">De posnummers verwijzen naar de stuklijst op tekening AFZ-00. Maten staan op de werktekeningen AFZ-01 tot AFZ-20, de bedrading in het aansluitschema.
  Print alle delen in PETG op de Elegoo Centauri Carbon, zonder support (zie de README).</p></section>`;
const bladen = STAPPEN.map((s, i) => `<section class="blad">${kop(`stap ${i + 1} / ${N}`)}
  <div class="stap"><div class="beelden b${s.foto.length}">${s.foto.map((f) => `<img src="${img(f)}">`).join('')}</div>
  <div class="tekst"><div class="nr">${i + 1}</div><h2>${esc(s.titel)}</h2>
  <p class="meta"><b>Tijd</b> ${esc(s.tijd)}<br><b>Gereedschap</b> ${esc(s.gereedschap)}</p>
  <ol>${s.tekst.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
  ${s.extra ? `<p class="meta"><b>Mal</b> ${esc(s.extra)}</p>` : ''}
  ${s.delen.length ? `<table><tr><th>Pos</th><th>Onderdeel</th></tr>${s.delen.map((d) => `<tr><td>${pos.get(d) ?? '–'}</td><td>${esc(d)}</td></tr>`).join('')}</table>` : ''}
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
.tekst{flex:1;font-size:10pt;line-height:1.4} .nr{font-size:34pt;font-weight:bold;color:#b08a5a;line-height:1}
h2{font-size:15pt;margin:2mm 0 3mm} .meta{font-size:9pt;color:#444} .tekst ol{padding-left:5mm} .tekst li{margin-bottom:2mm}
table{border-collapse:collapse;font-size:8.5pt;margin-top:2mm;width:100%} th,td{border-bottom:0.2mm solid #ccc;text-align:left;padding:0.6mm 1.5mm} th{background:#f1ede8}
</style></head><body>${voorblad}${bladen.join('')}</body></html>`;
const tmp = resolve(`${BEELD}/bouwschema.html`);
writeFileSync(tmp, html);
await page.setViewportSize({ width: 1123, height: 794 });
await page.goto(pathToFileURL(tmp).href);
await page.pdf({ path: `${UIT}/Bouwschema-afzuiging.pdf`, width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
for (let i = 0; i <= N; i++) await page.locator('.blad').nth(i).screenshot({ path: `${BEELD}/blad-${i}.png` });
console.log('bouwschema:', N, 'stappen,', n, 'beelden; fouten:', fouten);
await browser.close();
