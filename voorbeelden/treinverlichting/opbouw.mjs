// Versie 4 (Ian, 2026-11-13: "Voor de treindoos zou ik graag willen dat je zoveel mogelijk printjes gebruikt die ik
// gewoon kan bestellen"): geen gaatjesprints meer. Alle elektronica zijn kant-en-klare modules op één geprinte
// moduleplaat boven de bordjes; ze worden met schroefklemmen, WAGO-hendelklemmen en dupontkabels verbonden.
//
// Eén bron voor: de 3D-modules (onderdelen.mjs), de moduleplaat met haar paaltjes en klikhouders (maak-kabeldoos.mjs),
// het montageblad TRN-10 en de interne draadlijst TRN-14 (src/qa/opbouwTrein.ts), het schema (schema/maak-schema.mjs)
// en de controle (elke draad op een bestaande klem met het juiste net, geen klem met twee netten, modules niet over
// elkaar en binnen de plaat, de gaten vrij van de klemmen).
//
// Assenstelsel van een module: oorsprong in het midden van de print, x langs de lengte (l), z langs de breedte (b), y = 0
// onderaan de print. Een module staat met rot (0, 90, 180, 270 graden om +Y, zoals draaiY in de assemblage) op
// (cx, cz) van de doos. Maten en bron per module: docs/Maten-en-bronnen.md, hoofdstuk "Versie 4".
import { M } from './maten.mjs';

const P = M.plaat;
/** bovenkant van de moduleplaat en de onderkant van een module (op zijn paaltjes) */
export const PLAAT_TOP = P.y0 + P.dik;
export const MODULE_Y = PLAAT_TOP + P.paal.h;

// de pinnen van de ESP32-S3-DevKitC-1 v1.1 (docs/Maten-en-bronnen.md): J1 vooraan, J3 achteraan, vanaf de antenne
export const J1 = ['3V3', '3V3', 'RST', '4', '5', '6', '7', '15', '16', '17', '18', '8', '3', '46', '9', '10', '11', '12', '13', '14', '5V', 'G'];
export const J3 = ['G', 'TX', 'RX', '1', '2', '42', '41', '40', '39', '38', '37', '36', '35', '0', '45', '48', '47', '21', '20', '19', 'G', 'G'];
// ingang 1..16 op deze GPIO's (firmware/src/hw.h, INGANG_PINNEN)
export const INGANG_GPIO = [1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41];
const espNet = (t) => (t === 'G' ? 'GND' : t === '3V3' ? '3V3' : t === '5V' ? '5V' : INGANG_GPIO.includes(+t) && /^\d+$/.test(t) ? `IN${INGANG_GPIO.indexOf(+t) + 1}` : /^\d+$/.test(t) ? `GPIO${t}` : t);

// ---------------------------------------------------------------- de modules (catalogus)
// klem: { naam (uniek in de module), label (opdruk), x, z, soort: 'schroef' (5,0), 'schroef35' (3,5), 'pin' (2,54,
// dupont), 'wago' }, de draadingang naar 'in' (de richting in het modulestelsel: '+z', '-z', '+x', '-x')
const rij = (namen, x0, z, steek, soort, labels = namen, in_ = '+z') => namen.map((n, i) => ({ naam: n, label: labels[i], x: x0 + i * steek, z, soort, in: in_ }));
const S5 = 5.0;

/** ESP-schroefklemadapter 44-pin met de ESP32-S3-DevKitC-1 erin (2 x 22 schroefklemmen, steek 3,5: AANNAME) */
const espAdapter = (() => {
  const l = 84.5, b = 73.5, zr = b / 2 - 9;
  return {
    naam: 'ESP32-S3-schroefklemadapter 44-pin met ESP32-S3-DevKitC-1', kort: 'ESP-adapter', l, b, pcb: 1.6, h: 17.3, kleur: '#1d1f22',
    gaten: [[-40.5, -34], [40.5, -34], [-40.5, 34], [40.5, 34]], gat: 3.0, schroef: 'M3',
    klemmen: [
      ...rij(J1.map((_, i) => `J1:${i + 1}`), -36.75, zr, 3.5, 'schroef35', J1.map((t) => t), '+z'),
      ...rij(J3.map((_, i) => `J3:${i + 1}`), -36.75, -zr, 3.5, 'schroef35', J3.map((t) => t), '-z'),
    ],
    nets: { ...Object.fromEntries(J1.map((t, i) => [`J1:${i + 1}`, espNet(t)])), ...Object.fromEntries(J3.map((t, i) => [`J3:${i + 1}`, espNet(t)])) },
    aanname: 'maat 84,5 x 73,5 (verkoper), gaten Ø3 op 81 x 68 en klemsteek 3,5: AANNAME, na te meten',
  };
})();

/** PCA9685-breakout 16 kanalen (AZ-Delivery, pinnen gesoldeerd): 62,5 x 25,4, gaten M2,5 op 56 x 19 */
const PCA_ZIJ = ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'];
const PCA_NET = { GND: 'GND', OE: 'GPIO10', SCL: 'GPIO9', SDA: 'GPIO8', VCC: '3V3', 'V+': '' };
const pcaX = (k) => -22.86 + k * 2.54 + Math.floor(k / 4) * 1.27; // de servopinnen (AANNAME: 2,54 rechts van de Adafruit-tekening, vrij van de schroeven)
const pca = {
  naam: 'PWM-print PCA9685, 16 kanalen', kort: 'PCA9685', l: 62.5, b: 25.4, pcb: 1.6, h: 8.5, kleur: '#1f4fa3',
  gaten: [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]], gat: 2.5, schroef: 'M2,5',
  klemmen: [
    ...PCA_ZIJ.map((n, r) => ({ naam: `L:${n}`, label: n, x: -29.2, z: -6.35 + r * 2.54, soort: 'pin', in: '+y' })),
    ...PCA_ZIJ.map((n, r) => ({ naam: `R:${n}`, label: n, x: 29.2, z: -6.35 + r * 2.54, soort: 'pin', in: '+y' })),
    ...Array.from({ length: 16 }, (_, k) => ({ naam: `PWM${k}`, label: String(k), x: pcaX(k), z: 3.5, soort: 'pin', in: '+y' })),
  ],
  nets: { ...Object.fromEntries(PCA_ZIJ.flatMap((n) => [[`L:${n}`, PCA_NET[n]], [`R:${n}`, PCA_NET[n]]])), ...Object.fromEntries(Array.from({ length: 16 }, (_, k) => [`PWM${k}`, `PWM${k}`])) },
};

/** 8-kanaals MOSFET-module met optocouplers, 3,3 V-ingang (algemeen, "8 Channel MOSFET ... Optocoupler Isolation PWM",
 *  versie B): per kanaal een 2-polige uitgang (+ = VIN+, − = drain), VIN+/VIN−, en een pinrij VCC GND IN1..IN8 */
const mosfet = (q, k0) => ({
  naam: '8-kanaals MOSFET-module met optocouplers (3,3 V)', kort: 'MOSFET-module', l: 87, b: 47, pcb: 1.6, h: 15, kleur: '#1f4fa3',
  gaten: [[-41.5, -21.5], [41.5, -21.5], [-41.5, 21.5], [41.5, 21.5]], gat: 3.0, schroef: 'M3',
  klemmen: [
    ...Array.from({ length: 16 }, (_, i) => { const n = Math.floor(i / 2) + 1, plus = i % 2 === 0; return { naam: `${n}${plus ? '+' : '−'}`, label: plus ? '+' : '−', x: -37.5 + i * S5, z: 15.5, soort: 'schroef', in: '+z' }; }),
    ...rij(['VIN+', 'VIN−'], -35, -19, S5, 'schroef', ['VIN+', 'VIN−'], '-z'),
    ...rij(['VCC', 'GND', ...Array.from({ length: 8 }, (_, i) => `IN${i + 1}`)], -2.86, -20, 2.54, 'pin', undefined, '+y'),
  ],
  nets: {
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [[`${i + 1}+`, 'L+'], [`${i + 1}−`, `${q}D${i + 1}`]]).flat()),
    'VIN+': 'L+', 'VIN−': 'M', VCC: '3V3', GND: 'GND', ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`IN${i + 1}`, `PWM${k0 + i}`])),
  },
  aanname: 'maat 87 x 47 (verkoper), gaten Ø3 op 83 x 43, de klemmen en de hoogte 15: AANNAME, na te meten',
});

/** PC817 8-kanaals optocouplerprint 3,6-24 V (MakerMind RBS18122 / NOYITO): 84 x 38, gaten op 78 x 32, klemmen 5,0;
 *  ingang: VCC (gemeenschappelijk) en IN1..IN8 (naar 0 V trekken = actief), uitgang: VCC GND OUT1..OUT8 (jumper: pull-up) */
const opto = (k, k0) => ({
  naam: 'Optocouplerprint PC817, 8 kanalen (3,6-24 V)', kort: 'Optocouplerprint', l: 84, b: 38, pcb: 1.6, h: 12, kleur: '#1f4fa3',
  gaten: [[-39, -16], [39, -16], [-39, 16], [39, 16]], gat: 3.0, schroef: 'M3',
  klemmen: [
    ...rij(['VCC', ...Array.from({ length: 8 }, (_, i) => `IN${i + 1}`), 'GNDi'], -22.5, 14.5, S5, 'schroef', ['VCC', ...Array.from({ length: 8 }, (_, i) => `IN${i + 1}`), 'GND'], '+z'),
    ...rij(['VCCo', ...Array.from({ length: 8 }, (_, i) => `OUT${i + 1}`), 'GND'], -22.5, -14.5, S5, 'schroef', ['VCC', ...Array.from({ length: 8 }, (_, i) => `OUT${i + 1}`), 'GND'], '-z'),
  ],
  nets: { VCC: 'S12', GNDi: '', VCCo: '3V3', GND: 'GND', ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [[`IN${i + 1}`, `${k}IN${i + 1}`], [`OUT${i + 1}`, `IN${k0 + i + 1}`]]).flat()) },
  aanname: 'gaten Ø3 (78 x 32 volgens de verkoper), de volgorde van de klemmen en de hoogte 12: AANNAME, na te kijken op de opdruk',
});

/** Joy-IT SBC-Buck02: 12 -> 5 V, 5 A, 31 x 46 x 19 (datablad 2022-05-31), 3-polige schroefklem VIN GND VOUT */
const buck = {
  naam: 'Spanningsregelaar 12 -> 5 V, Joy-IT SBC-Buck02', kort: 'SBC-Buck02', l: 46, b: 31, pcb: 1.6, h: 19, kleur: '#1d1f22',
  gaten: [[-20, -12.5], [20, -12.5], [-20, 12.5], [20, 12.5]], gat: 3.0, schroef: 'M3',
  klemmen: rij(['VIN', 'GND', 'VOUT'], -5, 0, S5, 'schroef', undefined, '-x').map((k) => ({ ...k, x: -19, z: k.x })),
  nets: { VIN: 'L+', GND: 'GND', VOUT: '5V' },
  aanname: 'gaten Ø3 op 40 x 25 en de volgorde VIN GND VOUT: AANNAME, na te kijken',
};

/** WAGO 221-415 (5 klemmen, 0,2 tot 4 mm², 32 A): 29,8 x 18,7 x 8,3 (AANNAME), de draden van voren (+z) */
const wago = (net) => ({
  naam: 'Verbindingsklem WAGO 221-415 (5-voudig)', kort: 'WAGO 221-415', l: 29.8, b: 18.7, pcb: 0, h: 8.3, kleur: '#d9d6cf', wago: true,
  gaten: [], gat: 0,
  klemmen: Array.from({ length: 5 }, (_, i) => ({ naam: String(i + 1), label: String(i + 1), x: -11.9 + i * 5.95, z: 9.35, soort: 'wago', in: '+z' })),
  nets: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [String(i + 1), net])),
  aanname: 'maat 29,8 x 18,7 x 8,3: AANNAME (WAGO-catalogus, na te kijken)',
});

export const MODULES = {
  '-X6': espAdapter,
  '-K2': pca,
  '-Q1': mosfet('Q1', 0),
  '-Q2': mosfet('Q2', 8),
  '-K3': opto('K3', 0),
  '-K4': opto('K4', 8),
  '-T2': buck,
  '-X1a': wago('L+'), '-X1b': wago('L+'),
  '-X2a': wago('M'), '-X2b': wago('M'),
  '-X3': wago('S12'),
  '-X7': wago('3V3'),
};

/** waar elke module op de moduleplaat staat (midden, draaiing om +Y) */
export const PLAATSING = {
  '-X6': { cx: 66.5, cz: -62, rot: 0 }, // de paaltjes rechts nog net op de plaat (x 110)
  '-K2': { cx: -8.75, cz: -87.3, rot: 0 },
  '-T2': { cx: -85.5, cz: -75, rot: 90 },
  // de WAGO-klemmen per 3 naast elkaar (0,4 vrij) in een klikhouder per rij
  '-X1a': { cx: -52.9, cz: -62, rot: 0 }, '-X1b': { cx: -22.7, cz: -62, rot: 0 }, '-X3': { cx: 7.5, cz: -62, rot: 0 },
  '-X2a': { cx: -52.9, cz: -40, rot: 0 }, '-X2b': { cx: -22.7, cz: -40, rot: 0 }, '-X7': { cx: 7.5, cz: -40, rot: 0 },
  '-K3': { cx: -52, cz: 4, rot: 0 }, '-K4': { cx: 52, cz: 4, rot: 0 },
  '-Q1': { cx: -50, cz: 63, rot: 0 }, '-Q2': { cx: 50, cz: 63, rot: 0 },
};

// ---------------------------------------------------------------- afgeleide maten
const rad = (d) => (d * Math.PI) / 180;
/** een punt van het modulestelsel naar de doos (x, z) (draaiing om +Y, zoals draaiY in de assemblage) */
export function naarDoos(ref, x, z) {
  const p = PLAATSING[ref], a = rad(p.rot), c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  return [p.cx + x * c + z * s, p.cz - x * s + z * c];
}
/** de rechthoek van een module in de doos: [x0, z0, x1, z1] */
export function voetafdruk(ref) {
  const m = MODULES[ref], h = [[-m.l / 2, -m.b / 2], [m.l / 2, -m.b / 2], [m.l / 2, m.b / 2], [-m.l / 2, m.b / 2]].map(([x, z]) => naarDoos(ref, x, z));
  return [Math.min(...h.map((q) => q[0])), Math.min(...h.map((q) => q[1])), Math.max(...h.map((q) => q[0])), Math.max(...h.map((q) => q[1]))];
}
/** de gaten van een module in de doos: [x, z, d] */
export const gatenDoos = (ref) => MODULES[ref].gaten.map(([x, z]) => [...naarDoos(ref, x, z), MODULES[ref].gat]);
/** de onderkant van de print van een module (de WAGO-klemmen staan zonder paaltjes in een klikhouder op de plaat) */
export const moduleY = (ref) => (MODULES[ref].wago ? PLAAT_TOP : MODULE_Y);
/** een klem: { ref, naam, label, x, y, z, soort, net } in de doos */
export function klem(ref, naam) {
  const m = MODULES[ref], k = m.klemmen.find((q) => q.naam === naam);
  if (!k) throw new Error(`geen klem ${ref}:${naam}`);
  const [x, z] = naarDoos(ref, k.x, k.z), hoog = { schroef: 8.5, schroef35: 8.5, pin: 8.5, wago: 5 }[k.soort];
  return { ref, ...k, x, y: moduleY(ref) + m.pcb + hoog, z, net: m.nets[naam] ?? '' };
}

// ---------------------------------------------------------------- de draden tussen de modules (interne draadlijst)
// een eind: [ref, klem]; andere einden: ['-X5', '+'] (DC-bus, pen), ['-X5', '−'] (huls), ['-F1', 'in'/'uit'] (de draden
// van de zekeringhouder), ['-R1', 'a'/'b'] (de pootjes van de weerstand in de klemmen), ['-F18', 'a'/'b'] (de pootjes van
// de polyfuse), ['-R2', 'K'/'A'] (de diode)
const gpioKlem = (g) => { const i = J1.indexOf(String(g)); if (i >= 0) return ['-X6', `J1:${i + 1}`]; const j = J3.indexOf(String(g)); return ['-X6', `J3:${j + 1}`]; };
export const DRADEN = [
  // voeding
  { van: ['-X5', '+'], naar: ['-F1', 'in'], net: 'J+', mm2: 0.75, kleur: 'rood', wat: '12 V van de DC-bus (pen = +) naar de zekeringhouder (gesoldeerd aan de bus)' },
  { van: ['-F1', 'uit'], naar: ['-X1a', '1'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: 'L+ na de hoofdzekering 7,5 A' },
  { van: ['-X5', '−'], naar: ['-X2a', '1'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V van de DC-bus (huls = −, gesoldeerd)' },
  { van: ['-X1a', '5'], naar: ['-X1b', '1'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: 'brug L+ (2 WAGO-klemmen samen)' },
  { van: ['-X2a', '5'], naar: ['-X2b', '1'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: 'brug 0 V' },
  { van: ['-X1a', '2'], naar: ['-Q1', 'VIN+'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: '12 V naar MOSFET-module 1 (groep 1-8)' },
  { van: ['-X2a', '2'], naar: ['-Q1', 'VIN−'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V-retour van groep 1-8 (tot 2,6 A)' },
  { van: ['-X1a', '3'], naar: ['-Q2', 'VIN+'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: '12 V naar MOSFET-module 2 (groep 9-16)' },
  { van: ['-X2a', '3'], naar: ['-Q2', 'VIN−'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V-retour van groep 9-16 (tot 2,6 A)' },
  { van: ['-X1a', '4'], naar: ['-T2', 'VIN'], net: 'L+', mm2: 0.5, kleur: 'rood', wat: '12 V naar de regelaar' },
  { van: ['-X2a', '4'], naar: ['-T2', 'GND'], net: 'M', mm2: 0.5, kleur: 'zwart', wat: '0 V van de regelaar' },
  { van: ['-X3', '2'], naar: ['-K3', 'VCC'], net: 'S12', mm2: 0.25, kleur: 'rood', wat: '+12 V voor de ingangen 1-8' },
  { van: ['-X3', '3'], naar: ['-K4', 'VCC'], net: 'S12', mm2: 0.25, kleur: 'rood', wat: '+12 V voor de ingangen 9-16' },
  // 5 V en 3,3 V
  { van: ['-T2', 'VOUT'], naar: ['-X6', 'J1:21'], net: '5V', mm2: 0.5, kleur: 'oranje', wat: '5 V voor de ESP (pin 5V)' },
  { van: ['-T2', 'GND'], naar: ['-X6', 'J1:22'], net: 'GND', mm2: 0.5, kleur: 'zwart', wat: '0 V voor de ESP (pin G)' },
  { van: ['-X6', 'J1:1'], naar: ['-X7', '1'], net: '3V3', mm2: 0.25, kleur: 'oranje', wat: '3,3 V van de ESP naar de verdeelklem' },
  { van: ['-X6', 'J1:2'], naar: ['-K2', 'L:VCC'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V voor de PCA9685 (dupont)' },
  { van: ['-X7', '2'], naar: ['-Q1', 'VCC'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V ingangskant MOSFET-module 1 (dupont)' },
  { van: ['-X7', '3'], naar: ['-Q2', 'VCC'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V ingangskant MOSFET-module 2 (dupont)' },
  { van: ['-X7', '4'], naar: ['-K3', 'VCCo'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V uitgangskant optocouplerprint 1' },
  { van: ['-X7', '5'], naar: ['-K4', 'VCCo'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V uitgangskant optocouplerprint 2' },
  { van: ['-X6', 'J3:1'], naar: ['-K2', 'L:GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V van de PCA9685 (dupont)' },
  { van: ['-X6', 'J3:21'], naar: ['-Q1', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V ingangskant MOSFET-module 1 (dupont)' },
  { van: ['-X6', 'J3:21'], naar: ['-Q2', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V ingangskant MOSFET-module 2 (dupont)' },
  { van: ['-X6', 'J3:22'], naar: ['-K3', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V uitgangskant optocouplerprint 1' },
  { van: ['-X6', 'J3:22'], naar: ['-K4', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V uitgangskant optocouplerprint 2' },
  // I2C en OE
  { van: gpioKlem(8), naar: ['-K2', 'L:SDA'], net: 'GPIO8', mm2: 0.14, kleur: 'geel', wat: 'I2C SDA (dupont)' },
  { van: gpioKlem(9), naar: ['-K2', 'L:SCL'], net: 'GPIO9', mm2: 0.14, kleur: 'groen', wat: 'I2C SCL (dupont)' },
  { van: gpioKlem(10), naar: ['-K2', 'L:OE'], net: 'GPIO10', mm2: 0.14, kleur: 'blauw', wat: 'OE, met -R1 1 kΩ naar 3,3 V (pootjes in J1:1 en J1:16)' },
  // PWM naar de MOSFET-modules (dupont female-female)
  ...Array.from({ length: 16 }, (_, k) => ({ van: ['-K2', `PWM${k}`], naar: [k < 8 ? '-Q1' : '-Q2', `IN${(k % 8) + 1}`], net: `PWM${k}`, mm2: 0.14, kleur: 'wit', wat: `PWM groep ${k + 1} (dupont)` })),
  // de 16 ingangen
  ...Array.from({ length: 16 }, (_, k) => ({ van: [k < 8 ? '-K3' : '-K4', `OUT${(k % 8) + 1}`], naar: gpioKlem(INGANG_GPIO[k]), net: `IN${k + 1}`, mm2: 0.14, kleur: 'grijs', wat: `ingang ${k + 1} naar GPIO${INGANG_GPIO[k]}` })),
].map((d, i) => ({ nr: `W${String(i + 1).padStart(2, '0')}`, ...d }));

/** de elementen die met hun pootjes in de klemmen zitten (geen solderen) */
export const IN_KLEMMEN = [
  { ref: '-R1', wat: 'weerstand 1 kΩ 0,25 W (pull-up van OE)', a: ['-X6', 'J1:1'], b: gpioKlem(10) },
  { ref: '-R2', wat: 'Schottkydiode SB560 (ompoolbeveiliging): kathode (ring) aan L+, anode aan 0 V', a: ['-X1b', '3'], b: ['-X2b', '3'] },
  { ref: '-F18', wat: 'polyfuse Bourns MF-R050 (knoppen en sensoren)', a: ['-X1b', '2'], b: ['-X3', '1'] },
];

/** de draden van de groepen en de ingangen (naar de bordjes en de baan; de labels uit de README) */
export const GROEPEN = Array.from({ length: 16 }, (_, k) => {
  const q = k < 8 ? '-Q1' : '-Q2', n = (k % 8) + 1;
  return { groep: k + 1, plus: [q, `${n}+`], min: [q, `${n}−`], ptc: `-F${k + 2}`, wago: `-X8:${k + 1}` };
});
export const INGANGEN = Array.from({ length: 16 }, (_, k) => ({ ingang: k + 1, klem: [k < 8 ? '-K3' : '-K4', `IN${(k % 8) + 1}`], gpio: INGANG_GPIO[k] }));

// ---------------------------------------------------------------- de controle
const VAST = { '-X5': { '+': 'J+', '−': 'M' }, '-F1': { in: 'J+', uit: 'L+' }, '-F18': { a: 'L+', b: 'S12' } };
/** het net van een eind (een klem van een module of een vast eind) */
export function eindNet(e) {
  if (VAST[e[0]]) return VAST[e[0]][e[1]];
  return klem(e[0], e[1]).net;
}
/** M (0 V van de voeding) en GND (0 V van de logica) zijn hetzelfde net: de regelaar verbindt ze */
const zelfde = (a, b) => a === b || (['M', 'GND'].includes(a) && ['M', 'GND'].includes(b));

/** alle fouten (leeg = goed): draden op bestaande klemmen met het juiste net, de modules binnen de plaat en niet over
 *  elkaar, de gaten in de print en vrij van de klemmen, de elementen in de klemmen op hun net, elke groep en ingang */
export function controleerAlles() {
  const fout = [];
  for (const d of DRADEN) {
    for (const e of [d.van, d.naar]) {
      let n;
      try { n = eindNet(e); } catch (err) { fout.push(`${d.nr}: ${err.message}`); continue; }
      if (!zelfde(n, d.net)) fout.push(`${d.nr}: eind ${e.join(' ')} ligt op net ${n} in plaats van ${d.net}`);
    }
  }
  // per klem hoogstens 2 draden (schroefklem) of 1 (WAGO, dupont) en geen twee netten
  const op = new Map();
  for (const d of DRADEN) for (const e of [d.van, d.naar]) { const k = e.join(' '); op.set(k, (op.get(k) ?? 0) + 1); }
  for (const x of IN_KLEMMEN) for (const e of [x.a, x.b]) { const k = e.join(' '); op.set(k, (op.get(k) ?? 0) + 1); }
  for (const [k, n] of op) {
    const [ref, naam] = k.split(' ');
    if (!MODULES[ref]) continue;
    const s = MODULES[ref].klemmen.find((q) => q.naam === naam).soort, max = s === 'pin' || s === 'wago' ? 1 : 2;
    if (n > max) fout.push(`${k}: ${n} draden (hoogstens ${max})`);
  }
  // de modules binnen de plaat (de hoeken rond de bussen uitgespaard) en niet over elkaar (0,3 vrij)
  const refs = Object.keys(MODULES), v = Object.fromEntries(refs.map((r) => [r, voetafdruk(r)]));
  for (const r of refs) {
    const [x0, z0, x1, z1] = v[r];
    if (x0 < -P.x || x1 > P.x || z0 < P.achter || z1 > P.voor) fout.push(`${r} steekt buiten de moduleplaat`);
    for (const [hx, hz] of [[-1, -1], [1, -1]]) {
      const cx = hx * (P.x - P.hoek / 2), cz = P.achter + P.hoek / 2;
      if (Math.abs(cx - (x0 + x1) / 2) < (x1 - x0) / 2 + P.hoek / 2 && Math.abs(cz - (z0 + z1) / 2) < (z1 - z0) / 2 + P.hoek / 2) fout.push(`${r} op de uitsparing van een bus`);
    }
    for (const q of refs) {
      if (q <= r) continue;
      // een WAGO-klem staat in een klikhouder met wandjes van 1,2 (+0,2 speling): die mogen niet onder een andere module
      const m1 = MODULES[r].wago && !MODULES[q].wago ? 1.4 : 0, m2 = MODULES[q].wago && !MODULES[r].wago ? 1.4 : 0, w = m1 + m2;
      const [a0, b0, a1, b1] = v[q];
      if (x0 < a1 + 0.3 + w && a0 < x1 + 0.3 + w && z0 < b1 + 0.3 + w && b0 < z1 + 0.3 + w) fout.push(`${r} en ${q} overlappen`);
    }
    // de gaten binnen de print en vrij van de klemmen (een klem is een blok van 5 x 7,5 rond zijn hart)
    const m = MODULES[r];
    for (const [gx, gz] of m.gaten) {
      if (Math.abs(gx) + m.gat / 2 > m.l / 2 || Math.abs(gz) + m.gat / 2 > m.b / 2) fout.push(`${r}: gat (${gx}, ${gz}) buiten de print`);
      for (const k of m.klemmen) if (k.soort !== 'pin' && Math.abs(k.x - gx) < 2.5 + m.gat / 2 - 0.01 && Math.abs(k.z - gz) < 3.75 + m.gat / 2) fout.push(`${r}: gat (${gx}, ${gz}) onder klem ${k.naam}`);
    }
  }
  // de elementen in de klemmen op hun net
  const want = { '-R1': ['3V3', 'GPIO10'], '-R2': ['L+', 'M'], '-F18': ['L+', 'S12'] };
  for (const x of IN_KLEMMEN) { const n = [eindNet(x.a), eindNet(x.b)]; if (n.join() !== want[x.ref].join()) fout.push(`${x.ref} zit op ${n.join(' en ')}`); }
  // elke groep heeft een + (L+) en een − (drain), elke ingang een klem
  for (const g of GROEPEN) { if (eindNet(g.plus) !== 'L+') fout.push(`groep ${g.groep}: + niet op L+`); if (!/D\d$/.test(eindNet(g.min))) fout.push(`groep ${g.groep}: − niet op een drain`); }
  return fout;
}

export { PCA_ZIJ, pcaX };
