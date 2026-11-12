// Opbouw van de vier gaatjesprints van de kabeldoos (advies Fable 5.2, 2026-11-12): waar elk onderdeel in het raster
// van 2,54 staat, welke draadbruggen en soldeerbruggen er aan de koperzijde lopen en welke draden naar een andere print
// gaan. Eén bron voor de 3D-prints (onderdelen.mjs), de opbouwtekeningen TRN-10 tot TRN-13 en de interne draadlijst
// (src/qa/opbouwTrein.ts) en de controle (elk net hangt aan elkaar, geen twee netten in één gat, niets over elkaar).
//
// Raster: kolom c van links (−X) naar rechts, rij r van achter (−Z) naar voor; gat (c, r) ligt op x0 + 2,54 c,
// y0 + 2,54 r vanaf de linkerachterhoek van de print (zoals het decal: beeld-x = x + w/2, beeld-y = z + h/2).
// Een gaatjesprint (FR2) heeft alleen aan de onderkant koperen eilandjes: de SMD-onderdelen (1206, 1812) liggen daar
// over twee naburige eilandjes, de bruggen ook.
// Soorten bruggen: 'tin' (soldeerbrug tussen naburige gaten), 'blank' (blanke draad 0,5 mm, langs een rij of kolom),
// 'dik' (blanke draad Ø1,0 = 0,79 mm², voor de 5,2 A van de voeding en de 0 V-retour) en 'draad' (geïsoleerd
// montagedraad van eilandje tot eilandje, mag kruisen).
// Maten met bron: docs/Maten-en-bronnen.md; AANNAME staat erbij waar een maat niet gepubliceerd is.

export const STEEK = 2.54;

// ---------------------------------------------------------------- onderdelen (sjablonen)
// pinnen: [dc, dr] in rasterstappen vanaf het ankergat; vorm: rechthoek [x0, y0, x1, y1] in mm vanaf het ankergat,
// hoogte boven de print (mm), kant 'boven' of 'onder'
const S = STEEK;
export const SJABLONEN = {
  // adapterprintje Artekit DA-SOT23-3-X2 (12,7 x 12,07, DIP-8 op 7,62) met 2 x AO3400A, in een IC-voet DIP-8
  // (Artekit: pin 1 = IC1-3, 2 = nc, 3 = IC2-1, 4 = IC2-2, 5 = IC2-3, 6 = nc, 7 = IC1-1, 8 = IC1-2; AO3400A: 1 G, 2 S, 3 D)
  adapter: { pinnen: [[0, 3], [1, 3], [2, 3], [3, 3], [3, 0], [2, 0], [1, 0], [0, 0]], vorm: [-2.225, -2.54, 9.845, 10.16], h: 7.0, kant: 'boven', kleur: '#1f4fa3' },
  // DIP-16 (LTV-844): pin 1..8 vooraan van links naar rechts, 9..16 achteraan van rechts naar links
  dip16: { pinnen: [...Array.from({ length: 8 }, (_, i) => [i, 3]), ...Array.from({ length: 8 }, (_, i) => [7 - i, 0])], vorm: [-1.0, 0.61, 7 * S + 1.0, 7.01], h: 4.0, kant: 'boven', kleur: '#151617' },
  // printklem Phoenix MPT 0,5/..-2,54 (6 A, 0,14 tot 0,5 mm², hoogte 8,5 boven de print en diepte 6,2: AANNAME)
  mpt: (n) => ({ pinnen: Array.from({ length: n }, (_, i) => [i, 0]), vorm: [-1.5, -3.1, (n - 1) * S + 1.5, 3.1], h: 8.5, kant: 'boven', kleur: '#2c6fd1' }),
  // printklem Phoenix MKDS 1,5/..-5,08 (13,5 A, tot 1,5 mm²; diepte 7,6 en hoogte 10: AANNAME)
  mkds: (n) => ({ pinnen: Array.from({ length: n }, (_, i) => [2 * i, 0]), vorm: [-S, -3.8, (n - 1) * 2 * S + S, 3.8], h: 10, kant: 'boven', kleur: '#2e9e4f' }),
  // IRF4905 (TO-220) plat gelegd, de pootjes 3 mm van het lichaam omgeplooid: G, D, S in een kolom
  to220plat: { pinnen: [[0, 0], [0, 1], [0, 2]], vorm: [3.0, -2.54, 19.5, 7.62], h: 4.6, kant: 'boven', kleur: '#151617' },
  // printhouder steekzekering ATO met 2 soldeerpennen 10,16 uit elkaar (AANNAME: na te meten, zo nodig opboren)
  ato: { pinnen: [[0, 0], [4, 0]], vorm: [2 * S - 9.8, -3.6, 2 * S + 9.8, 3.6], h: 7.5, kant: 'boven', kleur: '#151617' },
  // elco radiaal Ø6,3 x 11, pootjes 2,5 (op 2,54)
  elco: { pinnen: [[0, 0], [1, 0]], vorm: [S / 2 - 3.15, -3.15, S / 2 + 3.15, 3.15], rond: 3.15, h: 11, kant: 'boven', kleur: '#1c2b4a' },
  // vrouwelijke pinrij
  pinrij: (n) => ({ pinnen: Array.from({ length: n }, (_, i) => [i, 0]), vorm: [-S / 2, -1.25, (n - 0.5) * S, 1.25], h: 8.5, kant: 'boven', kleur: '#151617' }),
  // Pololu D24V10F5 (17,8 x 12,7) op zijn 5 pinnen (EN VIN GND VOUT PG), het printje naar achter
  pololu: { pinnen: Array.from({ length: 5 }, (_, i) => [i, 0]), vorm: [2 * S - 8.9, -11.43, 2 * S + 8.9, 1.27], h: 6.1, kant: 'boven', kleur: '#1f6b3a' },
  // SMD aan de koperzijde, over twee naburige eilandjes ('h' = naar rechts, 'v' = naar voor)
  r1206: (r = 'h') => ({ pinnen: r === 'h' ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], vorm: r === 'h' ? [S / 2 - 1.6, -0.8, S / 2 + 1.6, 0.8] : [-0.8, S / 2 - 1.6, 0.8, S / 2 + 1.6], h: 0.6, kant: 'onder', kleur: '#151617' }),
  // polyfuse 1812 (Bourns MF-MSMF: 4,37 tot 4,73 lang, 3,07 tot 3,41 breed)
  ptc1812: (r = 'h') => ({ pinnen: r === 'h' ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]], vorm: r === 'h' ? [S / 2 - 2.25, -1.6, S / 2 + 2.25, 1.6] : [-1.6, S / 2 - 2.25, 1.6, S / 2 + 2.25], h: 0.9, kant: 'onder', kleur: '#e3b505' }),
};

// ---------------------------------------------------------------- de vier prints
const rasterVan = (w, h, rijen = null, y0 = null) => {
  const nx = Math.floor(w / S - 0.5), ny = rijen ?? Math.floor(h / S - 0.5);
  return { nx, ny, x0: (w - (nx - 1) * S) / 2, y0: y0 ?? (h - (ny - 1) * S) / 2 };
};

/** uitgangsprint 132 x 25,4: 8 adapterprintjes (16 MOSFET's AO3400A) in IC-voeten, per groep een polyfuse 0,5 A,
 *  de klemmen -X3 (16 groepen en 2 x 0 V) en de PCA9685 op 4 afstandsbussen erboven (rechts) */
function uitgang() {
  const P = { naam: 'Uitgangsprint', code: 'U', w: 132, h: 25.4, ...rasterVan(132, 25.4) };
  P.schroeven = [[2.54, 2.54], [129.46, 2.54], [2.54, 22.86], [129.46, 22.86], [62.2, 12.7]];
  // de PCA9685 (gaten 56 x 19 hart op hart) op 4 afstandsbussen M2,5 x 10, rond Ø5 (AANNAME), gaten Ø2,7 bijboren
  P.pca = { cx: 91.4, cy: 12.7, bus: { d: 5, h: 10 } };
  P.boringen = [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]].map(([x, y]) => [P.pca.cx + x, P.pca.cy + y]);
  const o = [], b = [];
  const ADAPTER = [2, 7, 12, 17, 26, 31, 36, 41];
  ADAPTER.forEach((c, k) => {
    const g1 = 2 * k + 1, g2 = g1 + 1;
    o.push({ ref: `-U${k + 1}`, naam: `-Q${g1}, -Q${g2}`, soort: 'adapter', c, r: 0, nets: [`D${g1}`, '', `G${g2}`, 'M', `D${g2}`, '', `G${g1}`, 'M'] });
    // pull-down van de gate (100 kΩ, 1206) tussen G en S
    o.push({ ref: `-R${g1 + 1}`, waarde: '100 kΩ', soort: 'r1206', c, r: 0, nets: ['M', `G${g1}`] });
    o.push({ ref: `-R${g2 + 1}`, waarde: '100 kΩ', soort: 'r1206', c: c + 2, r: 3, nets: [`G${g2}`, 'M'] });
    // S1 en S2 naar de 0 V-rail op rij 2
    b.push({ soort: 'blank', net: 'M', pad: [[c, 0], [c, 2]] }, { soort: 'tin', net: 'M', pad: [[c + 3, 3], [c + 3, 2]] });
  });
  // 0 V-rail (Ø1,0) op rij 2 en de toevoer van de klem -X3:17/18 langs kolom 21
  b.push({ soort: 'dik', net: 'M', pad: [[2, 2], [44, 2]] }, { soort: 'dik', net: 'M', pad: [[19, 7], [21, 7], [21, 2]] });
  o.push({ ref: '-X3', naam: '-X3:1..16', soort: 'mpt', n: 16, c: 2, r: 7, nets: Array.from({ length: 16 }, (_, i) => `K${i + 1}`), klemmen: Array.from({ length: 16 }, (_, i) => String(i + 1)) });
  o.push({ ref: '-X3', naam: '-X3:17, 18', soort: 'mkds', n: 2, c: 19, r: 7, nets: ['M', 'M'], klemmen: ['17', '18'] });
  for (let g = 1; g <= 16; g++) {
    const k = 1 + g, a = ADAPTER[Math.ceil(g / 2) - 1], drain = g % 2 ? [a, 3] : [a + 3, 0];
    if (g % 2) {
      // oneven groep: polyfuse op rij 6 recht achter zijn klem
      o.push({ ref: `-F${g + 1}`, waarde: '0,5 A', soort: 'ptc1812', c: k, r: 6, nets: [`K${g}`, `D${g}`] });
      b.push({ soort: 'tin', net: `K${g}`, pad: [[k, 7], [k, 6]] }, { soort: 'draad', net: `D${g}`, pad: [[k + 1, 6], drain] });
    } else {
      // even groep: polyfuse op rij 4 (rij 6 is bezet door de polyfuse van de buur)
      o.push({ ref: `-F${g + 1}`, waarde: '0,5 A', soort: 'ptc1812', c: k, r: 4, nets: [`K${g}`, `D${g}`] });
      b.push({ soort: 'draad', net: `K${g}`, pad: [[k, 7], [k, 4]] }, { soort: 'draad', net: `D${g}`, pad: [[k + 1, 4], drain] });
    }
  }
  P.onderdelen = o;
  P.bruggen = b;
  return P;
}

/** ingangsprint 88 x 25,4: 4 x LTV-844 (AC-ingang: contact, PNP en NPN), 16 x 2,2 kΩ (1206), de klemmen -X4 met per 4
 *  ingangen een COM, en een polyfuse 0,3 A voor de +12 V van de knoppen */
function ingang() {
  const P = { naam: 'Ingangsprint', code: 'I', w: 88, h: 25.4, ...rasterVan(88, 25.4) };
  P.schroeven = [[2.54, 2.54], [85.46, 2.54], [2.54, 22.86], [85.46, 22.86]];
  P.boringen = [];
  const o = [], b = [];
  // de klemmen: IN1..IN4, COM1, IN5..IN8, COM2, ... COM4, +12 V, +12 V, 0 V, 0 V (klem 1..24 van links naar rechts)
  const KLEM = [];
  for (let k = 0; k < 4; k++) { for (let ch = 1; ch <= 4; ch++) KLEM.push(`IN${4 * k + ch}`); KLEM.push(`COM${k + 1}`); }
  KLEM.push('P12', 'P12', 'M', 'M');
  const kc = (net) => 5 + KLEM.indexOf(net); // kolom van de (eerste) klem met dat net
  o.push({ ref: '-X4', naam: '-X4:1..24', soort: 'mpt', n: 24, c: 5, r: 7, nets: KLEM, klemmen: KLEM.map((_, i) => String(i + 1)) });
  for (let k = 0; k < 4; k++) {
    const c = 1 + 8 * k, nets = new Array(16).fill('');
    for (let ch = 1; ch <= 4; ch++) {
      const n = 4 * k + ch, a = c + 2 * ch - 2;
      nets[2 * ch - 2] = `R${n}`; nets[2 * ch - 1] = `COM${k + 1}`; // led (AC: twee leds tegen elkaar)
      nets[18 - 2 * ch - 1] = `C${n}`; nets[17 - 2 * ch - 1] = 'M'; // collector, emitter
      o.push({ ref: `-R${17 + n}`, waarde: '2,2 kΩ', soort: 'r1206', rot: 'v', c: a, r: 4, nets: [`R${n}`, `IN${n}`] });
      b.push({ soort: 'draad', net: `IN${n}`, pad: [[a, 5], [kc(`IN${n}`), 7]] });
      b.push({ soort: 'blank', net: `COM${k + 1}`, pad: [[a + 1, 4], [a + 1, 6]] });
      // emitter naar de 0 V-rail op rij 0 (de laatste emitter ligt te dicht bij de schroef: met een draadje)
      if (a + 1 < 32) b.push({ soort: 'tin', net: 'M', pad: [[a + 1, 1], [a + 1, 0]] });
      else b.push({ soort: 'draad', net: 'M', pad: [[a + 1, 1], [31, 0]] });
    }
    o.push({ ref: `-K${k + 3}`, waarde: 'LTV-844', soort: 'dip16', c, r: 1, nets });
    b.push({ soort: 'blank', net: `COM${k + 1}`, pad: [[c + 1, 6], [c + 7, 6]] }, { soort: 'draad', net: `COM${k + 1}`, pad: [[c + 7, 6], [kc(`COM${k + 1}`), 7]] });
  }
  b.push({ soort: 'blank', net: 'M', pad: [[2, 0], [31, 0]] }, { soort: 'draad', net: 'M', pad: [[31, 0], [28, 7]] });
  // +12 V voor knoppen en sensoren: L+ (van -X2:7) door de polyfuse -F18 0,3 A naar klem 21 en 22
  o.push({ ref: '-F18', waarde: '0,3 A', soort: 'ptc1812', c: 25, r: 8, nets: ['L+', 'P12'] });
  b.push({ soort: 'tin', net: 'L+', pad: [[24, 8], [25, 8]] }, { soort: 'tin', net: 'P12', pad: [[26, 8], [26, 7], [25, 7]] });
  b.push({ soort: 'tin', net: 'M', pad: [[27, 7], [28, 7], [28, 8]] });
  P.onderdelen = o;
  P.bruggen = b;
  return P;
}

/** voedingsprint 61 x 25,4: klem -X1 (12 V in van de DC-bus, 0 V naar de uitgangsprint), zekering 7,5 A, P-MOSFET
 *  IRF4905 tegen ompolen, elco, klemmen -X2 (+ per rij bordjes, +12 V en 0 V naar de ingangsprint) */
function voeding() {
  const P = { naam: 'Voedingsprint', code: 'V', w: 61, h: 25.4, ...rasterVan(61, 25.4) };
  P.schroeven = [[2.54, 2.54], [58.46, 2.54], [2.54, 22.86], [58.46, 22.86]];
  P.boringen = [];
  const o = [], b = [];
  o.push({ ref: '-X1', naam: '-X1:1..3', soort: 'mkds', n: 3, c: 2, r: 7, nets: ['J+', 'M', 'M'], klemmen: ['1', '2', '3'] });
  o.push({ ref: '-X2', naam: '-X2:1..8', soort: 'mpt', n: 8, c: 13, r: 7, nets: ['L+', 'L+', 'L+', 'L+', 'L+', 'L+', 'L+', 'M'], klemmen: ['1', '2', '3', '4', '5', '6', '7', '8'] });
  o.push({ ref: '-F1', waarde: 'ATO 7,5 A', soort: 'ato', c: 12, r: 1, nets: ['J+', 'F+'] });
  o.push({ ref: '-Q17', waarde: 'IRF4905', soort: 'to220plat', c: 1, r: 2, nets: ['GP', 'F+', 'L+'] });
  o.push({ ref: '-R34', waarde: '10 kΩ', soort: 'r1206', rot: 'v', c: 1, r: 1, nets: ['M', 'GP'] });
  o.push({ ref: '-C1', waarde: '470 µF / 25 V', soort: 'elco', c: 19, r: 2, nets: ['L+', 'M'] });
  // 12 V in naar de zekering (geïsoleerd 0,75 mm²), zekering naar de drain (rij 0), source naar de L+-rail (rij 5)
  b.push({ soort: 'draad', net: 'J+', mm2: 0.75, pad: [[2, 7], [12, 1]] });
  b.push({ soort: 'dik', net: 'F+', pad: [[16, 1], [16, 0], [2, 0], [2, 3], [1, 3]] });
  b.push({ soort: 'dik', net: 'L+', pad: [[1, 4], [1, 5], [19, 5]] }, { soort: 'blank', net: 'L+', pad: [[13, 5], [13, 6], [19, 6]] });
  for (let c = 13; c <= 19; c++) b.push({ soort: 'tin', net: 'L+', pad: [[c, 6], [c, 7]] });
  b.push({ soort: 'blank', net: 'L+', pad: [[19, 2], [19, 5]] }, { soort: 'tin', net: 'L+', pad: [[17, 4], [17, 5]] });
  // 0 V: -X1:2 en :3 met een dikke draad (5,2 A terug van de uitgangsprint), de rail op rij 8, de elco, de gate-weerstand
  b.push({ soort: 'dik', net: 'M', pad: [[4, 7], [4, 8], [6, 8], [6, 7]] }, { soort: 'blank', net: 'M', pad: [[6, 8], [20, 8], [20, 7]] });
  b.push({ soort: 'blank', net: 'M', pad: [[20, 2], [20, 7]] }, { soort: 'tin', net: 'M', pad: [[20, 6], [21, 6]] });
  b.push({ soort: 'draad', net: 'M', pad: [[1, 1], [4, 8]] });
  P.onderdelen = o;
  P.bruggen = b;
  return P;
}

// de pinnen van de ESP32-S3-DevKitC-1 v1.1 (docs/Maten-en-bronnen.md): J1 vooraan, J3 achteraan, vanaf de antenne
export const J1 = ['3V3', '3V3', 'RST', '4', '5', '6', '7', '15', '16', '17', '18', '8', '3', '46', '9', '10', '11', '12', '13', '14', '5V', 'G'];
export const J3 = ['G', 'TX', 'RX', '1', '2', '42', '41', '40', '39', '38', '37', '36', '35', '0', '45', '48', '47', '21', '20', '19', 'G', 'G'];
// ingang 1..16 op deze GPIO's (firmware/src/hw.h, INGANG_PINNEN)
export const INGANG_GPIO = [1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41];
const espNet = (t) => (t === 'G' ? 'M' : t === '3V3' ? '3V3' : t === '5V' ? '5V' : /^\d+$/.test(t) ? `GPIO${t}` : '');

/** draagprint van de ESP 68 x 25,4 (10 rijen vanaf 1,27): 2 vrouwelijke pinrijen van 22 (22,86 hart op hart), de
 *  regelaar 12 -> 5 V onder de ESP en de pull-up van OE (1 kΩ) */
function drager() {
  const P = { naam: 'Draagprint ESP', code: 'D', w: 68, h: 25.4, ...rasterVan(68, 25.4, 10, 1.27) };
  P.schroeven = [[3, 12.7], [65, 12.7]];
  P.boringen = [];
  const o = [], b = [];
  o.push({ ref: '-K1 J3', naam: 'pinrij J3', soort: 'pinrij', n: 22, c: 2, r: 0, nets: J3.map(espNet), verbonden: ['M'], groep: 'esp' });
  o.push({ ref: '-K1 J1', naam: 'pinrij J1', soort: 'pinrij', n: 22, c: 2, r: 9, nets: J1.map(espNet), verbonden: ['M', '3V3'], groep: 'esp' });
  o.push({ ref: '-T2', waarde: 'D24V10F5', soort: 'pololu', c: 5, r: 7, nets: ['', 'L+', 'M', '5V', ''] });
  o.push({ ref: '-R1', waarde: '1 kΩ', soort: 'r1206', c: 17, r: 8, nets: ['GPIO10', '3V3'] });
  b.push({ soort: 'tin', net: 'GPIO10', pad: [[17, 9], [17, 8]] }, { soort: 'draad', net: '3V3', pad: [[18, 8], [3, 9]] });
  b.push({ soort: 'draad', net: '5V', pad: [[8, 7], [22, 9]] }, { soort: 'draad', net: 'M', pad: [[7, 7], [23, 9]] });
  P.onderdelen = o;
  P.bruggen = b;
  return P;
}

export const PRINTS = { uitgang: uitgang(), ingang: ingang(), voeding: voeding(), drager: drager() };

// ---------------------------------------------------------------- de draden tussen de prints (interne draadlijst)
// een eind: [print, c, r] (op een eilandje of een pin, aan de koperzijde gesoldeerd), [print, 'klem', '-X1:3'],
// ['pca', 'GND'] (de zijkant van de PCA9685) of ['dc', '+'] (de DC-bus in de linkerwand)
const PCA_ZIJ = ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'];
export { PCA_ZIJ };
const pinGat = (print, ref, net) => {
  const P = PRINTS[print];
  for (const p of pinnen(P)) if ((!ref || p.ref === ref) && p.net === net) return [print, p.c, p.r];
  throw new Error(`geen pin ${ref ?? ''} ${net} op ${print}`);
};
const gateGat = (g) => { const p = pinnen(PRINTS.uitgang).find((q) => q.net === `G${g}` && q.soort === 'adapter'); return ['uitgang', p.c, p.r]; };
export const DRADEN = [
  { van: ['dc', '+'], naar: ['voeding', 'klem', '-X1:1'], net: 'J+', mm2: 0.75, kleur: 'rood', wat: '12 V van de DC-bus (pen = +)' },
  { van: ['dc', '−'], naar: ['voeding', 'klem', '-X1:2'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V van de DC-bus (huls = −)' },
  { van: ['voeding', 'klem', '-X1:3'], naar: ['uitgang', 'klem', '-X3:17'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V-retour van de 16 groepen (tot 5,2 A)' },
  { van: ['voeding', 'klem', '-X2:7'], naar: ['ingang', 24, 8], net: 'L+', mm2: 0.25, kleur: 'rood', wat: '+12 V voor knoppen en sensoren (door -F18)' },
  { van: ['voeding', 'klem', '-X2:8'], naar: ['ingang', 28, 8], net: 'M', mm2: 0.25, kleur: 'zwart', wat: '0 V van de ingangsprint' },
  { van: ['voeding', 17, 4], naar: pinGat('drager', '-T2', 'L+'), net: 'L+', mm2: 0.25, kleur: 'rood', wat: '12 V naar de regelaar (VIN)' },
  { van: ['voeding', 21, 6], naar: pinGat('drager', '-T2', 'M'), net: 'M', mm2: 0.25, kleur: 'zwart', wat: '0 V naar de regelaar en de ESP' },
  { van: pinGat('drager', '-K1 J1', '3V3'), naar: ['pca', 'VCC'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V voor de PCA9685 (L3)' },
  { van: pinGat('drager', '-K1 J1', 'GPIO8'), naar: ['pca', 'SDA'], net: 'GPIO8', mm2: 0.14, kleur: 'geel', wat: 'I2C SDA' },
  { van: pinGat('drager', '-K1 J1', 'GPIO9'), naar: ['pca', 'SCL'], net: 'GPIO9', mm2: 0.14, kleur: 'groen', wat: 'I2C SCL' },
  { van: pinGat('drager', '-K1 J1', 'GPIO10'), naar: ['pca', 'OE'], net: 'GPIO10', mm2: 0.14, kleur: 'blauw', wat: 'OE (1 kΩ pull-up -R1 op de draagprint)' },
  { van: ['uitgang', 22, 2], naar: ['pca', 'GND'], net: 'M', mm2: 0.14, kleur: 'zwart', wat: '0 V van de PCA9685' },
  ...Array.from({ length: 16 }, (_, k) => ({ van: ['pca', `PWM${k}`], naar: gateGat(k + 1), net: `G${k + 1}`, mm2: 0.14, kleur: 'wit', wat: `gate groep ${k + 1} (-Q${k + 1})` })),
  ...Array.from({ length: 16 }, (_, k) => ({ van: pinGat('ingang', `-K${Math.floor(k / 4) + 3}`, `C${k + 1}`), naar: pinGat('drager', null, `GPIO${INGANG_GPIO[k]}`), net: `IN${k + 1}`, mm2: 0.14, kleur: 'grijs', wat: `ingang ${k + 1} naar GPIO${INGANG_GPIO[k]}` })),
].map((d, i) => ({ nr: `W${String(i + 1).padStart(2, '0')}`, ...d }));

// ---------------------------------------------------------------- afgeleide lijsten en de controle
export function gatXY(P, c, r) { return [P.x0 + c * S, P.y0 + r * S]; }
function sjabloon(o) { const t = SJABLONEN[o.soort]; return typeof t === 'function' ? t(o.n ?? o.rot ?? 'h') : t; }

/** alle pinnen van een print: { ref, pin, c, r, net, soort } */
export function pinnen(P) {
  const uit = [];
  for (const o of P.onderdelen) {
    const t = sjabloon(o);
    t.pinnen.forEach(([dc, dr], i) => uit.push({ ref: o.ref, pin: o.klemmen?.[i] ?? String(i + 1), c: o.c + dc, r: o.r + dr, net: o.nets?.[i] ?? '', soort: o.soort, kant: t.kant }));
  }
  return uit;
}
/** de vorm van elk onderdeel in mm op de print: { ref, soort, kant, x0, y0, x1, y1, h, kleur, rond } */
export function vormen(P) {
  return P.onderdelen.map((o) => {
    const t = sjabloon(o), [ax, ay] = gatXY(P, o.c, o.r), [a, b, c, d] = t.vorm;
    return { ref: o.ref, naam: o.naam ?? o.ref, waarde: o.waarde ?? '', soort: o.soort, kant: t.kant, x0: ax + a, y0: ay + b, x1: ax + c, y1: ay + d, h: t.h, kleur: t.kleur, rond: t.rond, o };
  });
}
/** de gaten die een brug raakt (blanke bruggen lopen langs een rij of kolom en raken elk gat ertussen) */
export function brugGaten(br) {
  if (br.soort === 'draad') return [br.pad[0], br.pad[br.pad.length - 1]];
  const uit = [];
  for (let i = 0; i < br.pad.length - 1; i++) {
    const [c0, r0] = br.pad[i], [c1, r1] = br.pad[i + 1], n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let k = i ? 1 : 0; k <= n; k++) uit.push([c0 + Math.sign(c1 - c0) * k, r0 + Math.sign(r1 - r0) * k]);
  }
  return uit;
}
/** de gaten in de buurt van een schroef of boring: niet te gebruiken */
export function vrijeGaten(P) {
  const weg = [...P.schroeven.map((p, i) => [...p, i === 4 ? 3.2 : 2.4]), ...P.boringen.map((p) => [...p, 2.6])];
  return (c, r) => { const [x, y] = gatXY(P, c, r); return c >= 0 && r >= 0 && c < P.nx && r < P.ny && !weg.some(([a, b, d]) => Math.hypot(a - x, b - y) < d); };
}

/** de controle van één print: geeft een lijst fouten (leeg = goed) */
export function controleer(P) {
  const fout = [], vrij = vrijeGaten(P), net = new Map(), sleutel = (c, r) => `${c},${r}`;
  const zet = (c, r, n, wat) => {
    if (!vrij(c, r)) fout.push(`${P.code}: ${wat} op gat (${c}, ${r}) buiten het raster of bij een schroef`);
    if (!n) return;
    const k = sleutel(c, r);
    if (net.has(k) && net.get(k) !== n) fout.push(`${P.code}: gat (${c}, ${r}) heeft twee netten: ${net.get(k)} en ${n} (${wat})`);
    net.set(k, n);
  };
  // een SMD-onderdeel (koperzijde) mag op het eilandje van een pin liggen (zelfde net); twee pinnen in één gat niet
  const bezet = new Map();
  const ouder = new Map(), vind = (k) => { while (ouder.has(k) && ouder.get(k) !== k) k = ouder.get(k); return k; };
  const bind = (a, b) => { const x = vind(a), y = vind(b); if (x !== y) ouder.set(x, y); };
  for (const p of pinnen(P)) {
    const k = `${sleutel(p.c, p.r)}|${p.kant}`;
    if (bezet.has(k)) fout.push(`${P.code}: gat (${p.c}, ${p.r}) dubbel: ${bezet.get(k)} en ${p.ref}:${p.pin}`);
    bezet.set(k, `${p.ref}:${p.pin}`);
    zet(p.c, p.r, p.net, `${p.ref}:${p.pin}`);
  }
  // pinnen met hetzelfde net die in het onderdeel zelf verbonden zijn (de G- en 3V3-pinnen van de ESP)
  for (const o of P.onderdelen) if (o.verbonden) {
    const ps = pinnen({ ...P, onderdelen: P.onderdelen.filter((q) => q === o || (o.groep && q.groep === o.groep)) });
    for (const n of o.verbonden) { const g = ps.filter((p) => p.net === n); for (let i = 1; i < g.length; i++) bind(sleutel(g[i - 1].c, g[i - 1].r), sleutel(g[i].c, g[i].r)); }
  }
  // bruggen: blanke langs rijen of kolommen; een blanke brug mag niet door het gat van een pin van een ander net
  for (const br of P.bruggen) {
    if (br.soort !== 'draad') for (let i = 0; i < br.pad.length - 1; i++) {
      const [c0, r0] = br.pad[i], [c1, r1] = br.pad[i + 1];
      if (c0 !== c1 && r0 !== r1) fout.push(`${P.code}: blanke brug ${br.net} schuin van (${c0}, ${r0}) naar (${c1}, ${r1})`);
    }
    const g = brugGaten(br);
    g.forEach(([c, r]) => zet(c, r, br.net, `brug ${br.net}`));
    for (let i = 1; i < g.length; i++) bind(sleutel(...g[i - 1]), sleutel(...g[i]));
    if (br.soort === 'tin') for (let i = 1; i < g.length; i++) if (Math.abs(g[i][0] - g[i - 1][0]) + Math.abs(g[i][1] - g[i - 1][1]) !== 1) fout.push(`${P.code}: soldeerbrug ${br.net} niet tussen naburige gaten`);
  }
  // elk net met meer dan één gat hangt aan elkaar (de gaten van één net op deze print)
  const perNet = new Map();
  for (const [k, n] of net) { if (!perNet.has(n)) perNet.set(n, []); perNet.get(n).push(k); }
  for (const [n, ks] of perNet) {
    const delen = new Set(ks.map(vind));
    if (delen.size > 1) fout.push(`${P.code}: net ${n} ligt in ${delen.size} losse stukken (${ks.slice(0, 6).join(' ')} ...)`);
  }
  // onderdelen niet over elkaar (per kant), en binnen de print (een klem mag 0,6 voorbij de rand)
  const v = vormen(P);
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    if (a.x0 < -0.6 || a.y0 < -0.6 || a.x1 > P.w + 0.6 || a.y1 > P.h + 0.6) fout.push(`${P.code}: ${a.ref} steekt buiten de print`);
    for (const [sx, sy] of P.schroeven) if (a.kant === 'boven' && sx > a.x0 - 2.25 && sx < a.x1 + 2.25 && sy > a.y0 - 2.25 && sy < a.y1 + 2.25) fout.push(`${P.code}: ${a.ref} op de kop van een schroef`);
    for (let j = i + 1; j < v.length; j++) {
      const b = v[j];
      if (a.kant !== b.kant) continue;
      if (a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) fout.push(`${P.code}: ${a.ref} en ${b.ref} overlappen`);
    }
  }
  return { fout, net, vind };
}

/** de controle van alles: de vier prints en de draden (elk eind op een gat met hetzelfde net) */
export function controleerAlles() {
  const fout = [];
  const c = Object.fromEntries(Object.entries(PRINTS).map(([k, P]) => { const r = controleer(P); fout.push(...r.fout); return [k, r]; }));
  for (const d of DRADEN) for (const e of [d.van, d.naar]) {
    if (!PRINTS[e[0]] || e[1] === 'klem') continue;
    const n = c[e[0]].net.get(`${e[1]},${e[2]}`);
    // een ingang loopt van collector C n naar een GPIO: daar heeft hetzelfde draadje aan elk eind een andere naam
    const goed = /^IN\d+$/.test(d.net) ? /^(C\d+|GPIO\d+)$/.test(n ?? '') : n === d.net;
    if (!goed) fout.push(`${d.nr}: eind ${e.join(' ')} ligt op net ${n ?? 'geen'} in plaats van ${d.net}`);
  }
  return fout;
}
