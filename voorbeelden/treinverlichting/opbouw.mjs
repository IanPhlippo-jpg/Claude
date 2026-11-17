// Versie 4 (Ian, 2026-11-13: "Voor de treindoos zou ik graag willen dat je zoveel mogelijk printjes gebruikt die ik
// gewoon kan bestellen"): geen gaatjesprints meer, kant-en-klare modules met schroefklemmen, WAGO-hendelklemmen en
// dupontkabels. Versie 5 (Ian, 2026-11-15: "Als je met 2 lagen werkt is het te moeilijk om de kabels aan te sluiten"):
// geen moduleplaat meer; alle modules staan op palen in de bodem van de rechterhelft, op één laag met de bordjes.
// Versie 6 fase B (2026-11-15): de modules van de uitbreiding (IR, servo's, MCP23017): de servoprint, de regelaar voor de
// servo's en 2 WAGO-klemmen in de rechterhelft (tussen de PCA9685 en de optocouplers), de IR-driver (-Q4, -Q3) en de
// MCP23017 (-K5, plaats voor een tweede -K8) in de linkerhelft naast bordje 16; elke module heeft zijn helft.
//
// Eén bron voor: de 3D-modules (onderdelen.mjs), de palen en klikhouders in de rechterhelft (maak-kabeldoos.mjs),
// het montageblad TRN-10 en de interne draadlijst TRN-14 (src/qa/opbouwTrein.ts), het schema (schema/maak-schema.mjs)
// en de controle (elke draad op een bestaande klem met het juiste net, geen klem met twee netten, modules niet over
// elkaar, binnen het modulevak van de rechterhelft en vrij van pilaren, bussen, tules en sleutelgaten, de gaten vrij van
// de klemmen).
//
// Assenstelsel van een module: oorsprong in het midden van de print, x langs de lengte (l), z langs de breedte (b), y = 0
// onderaan de print. Een module staat met rot (0, 90, 180, 270 graden om +Y, zoals draaiY in de assemblage) op
// (cx, cz) van de doos. Maten en bron per module: docs/Maten-en-bronnen.md, hoofdstuk "Versie 4".
import { M } from './maten.mjs';

const R = M.rechts, N = M.naad;
/** de bovenkant van de bodem (de WAGO-klemmen staan in hun klikhouder op de bodem) en de onderkant van een module (op
 *  zijn palen van 5) */
export const BODEM_TOP = 0;
export const MODULE_Y = BODEM_TOP + R.modulePaal.h;

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
/** de servoprint (-K7, 0x42): zelfde print; V+ = de servovoeding V6 (schroefklem V+ en GND op de rand tegenover de
 *  servopinnen, AANNAME), de 16 kanalen met 3 pinnen (puls, V+, GND) voor de stekkers van de servo's */
const pcaX = (k) => -22.86 + k * 2.54 + Math.floor(k / 4) * 1.27; // de servopinnen (AANNAME: 2,54 rechts van de Adafruit-tekening, vrij van de schroeven)
const pcaMod = (servo) => ({
  naam: servo ? 'Servoprint PCA9685, 16 kanalen (0x42)' : 'PWM-print PCA9685, 16 kanalen', kort: 'PCA9685', servo, l: 62.5, b: 25.4, pcb: 1.6, h: servo ? 22 : 8.5, kleur: '#1f4fa3',
  gaten: [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]], gat: 2.5, schroef: 'M2,5',
  klemmen: [
    ...PCA_ZIJ.map((n, r) => ({ naam: `L:${n}`, label: n, x: -29.2, z: -6.35 + r * 2.54, soort: 'pin', in: '+y' })),
    ...PCA_ZIJ.map((n, r) => ({ naam: `R:${n}`, label: n, x: 29.2, z: -6.35 + r * 2.54, soort: 'pin', in: '+y' })),
    ...Array.from({ length: 16 }, (_, k) => ({ naam: `PWM${k}`, label: String(k), x: pcaX(k), z: 3.5, soort: 'pin', in: '+y' })),
    ...(servo ? [{ naam: 'V+t', label: 'V+', x: 17.5, z: -8.4, soort: 'schroef', in: '-z' }, { naam: 'GNDt', label: 'GND', x: 22.5, z: -8.4, soort: 'schroef', in: '-z' }] : []),
  ],
  nets: { ...Object.fromEntries(PCA_ZIJ.flatMap((n) => [[`L:${n}`, servo && n === 'V+' ? 'V6' : PCA_NET[n]], [`R:${n}`, servo && n === 'V+' ? 'V6' : PCA_NET[n]]])), ...Object.fromEntries(Array.from({ length: 16 }, (_, k) => [`PWM${k}`, servo ? `SERVO${k + 1}` : `PWM${k}`])), ...(servo ? { 'V+t': 'V6', GNDt: 'M' } : {}) },
  aanname: servo ? 'de schroefklem V+/GND (plaats) en de hoogte met de servostekkers (22): AANNAME' : undefined,
});
const pca = pcaMod(false);

/** 8-kanaals MOSFET-module met optocouplers, 3,3 V-ingang (algemeen, "8 Channel MOSFET ... Optocoupler Isolation PWM",
 *  versie B): per kanaal een 2-polige uitgang (+ = VIN+, − = drain), VIN+/VIN−, en een pinrij VCC GND IN1..IN8 */
const mosfet = (q, k0, inNet = (i) => `PWM${k0 + i}`, vinMin = 'M') => ({
  naam: '8-kanaals MOSFET-module met optocouplers (3,3 V)', kort: 'MOSFET-module', l: 87, b: 47, pcb: 1.6, h: 15, kleur: '#1f4fa3',
  gaten: [[-41.5, -21.5], [41.5, -21.5], [-41.5, 21.5], [41.5, 21.5]], gat: 3.0, schroef: 'M3',
  klemmen: [
    ...Array.from({ length: 16 }, (_, i) => { const n = Math.floor(i / 2) + 1, plus = i % 2 === 0; return { naam: `${n}${plus ? '+' : '−'}`, label: plus ? '+' : '−', x: -37.5 + i * S5, z: 15.5, soort: 'schroef', in: '+z' }; }),
    ...rij(['VIN+', 'VIN−'], -35, -19, S5, 'schroef', ['VIN+', 'VIN−'], '-z'),
    ...rij(['VCC', 'GND', ...Array.from({ length: 8 }, (_, i) => `IN${i + 1}`)], -2.86, -20, 2.54, 'pin', undefined, '+y'),
  ],
  nets: {
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [[`${i + 1}+`, 'L+'], [`${i + 1}−`, `${q}D${i + 1}`]]).flat()),
    'VIN+': 'L+', 'VIN−': vinMin, VCC: '3V3', GND: 'GND', ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`IN${i + 1}`, inNet(i)])),
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

/** MCP23017-module CJMCU-2317: 26 x 21 (verkoper), geen bevestigingsgaten: 2 paaltjes aan de korte kanten, een
 *  plaatschroef 2,5 x 8 met een sluitring Ø8 klemt de rand (klem: true). Pinnen (AANNAME, na te kijken op de opdruk):
 *  één rij GPA0..7, VCC, GND en één rij GPB0..7, SCL, SDA; RESET en A0..A2 met weerstanden op de print (AANNAME) */
const mcp = (adres) => ({
  naam: `I/O-uitbreiding MCP23017 (CJMCU-2317, ${adres})`, kort: 'MCP23017', l: 26, b: 21, pcb: 1.6, h: 8.5, kleur: '#5b2a86', klem: true,
  gaten: [[-14.5, 0], [14.5, 0]], gat: 2.5, schroef: 'M2,5 + sluitring Ø8',
  klemmen: [
    ...rij([...Array.from({ length: 8 }, (_, i) => `GPA${i}`), 'VCC', 'GND'], -11.43, 9.0, 2.54, 'pin', undefined, '+y'),
    ...rij([...Array.from({ length: 8 }, (_, i) => `GPB${i}`), 'SCL', 'SDA'], -11.43, -9.0, 2.54, 'pin', undefined, '+y'),
  ],
  nets: { ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [[`GPA${i}`, adres === '0x20' ? `GPA${i}` : `GPA${i}b`], [`GPB${i}`, adres === '0x20' ? `IN${17 + i}` : `IN${25 + i}`]]).flat()), VCC: '3V3', GND: 'GND', SCL: 'GPIO9', SDA: 'GPIO8' },
  aanname: 'maat 26 x 21 (verkoper), de pinvolgorde en de weerstanden op RESET en A0..A2: AANNAME, na te kijken',
});
/** snelle MOSFET-module zonder optocoupler (AOD4184, "D4184"): 34 x 17 (AANNAME), schroefklemmen DC+/DC− en OUT+/OUT−
 *  aan de korte kanten, 2 pinnen PWM/GND; schakelt OUT− naar DC− */
const aod = {
  naam: 'MOSFET-module AOD4184 zonder optocoupler', kort: 'AOD4184', l: 34, b: 17, pcb: 1.6, h: 12, kleur: '#1d6b3a',
  gaten: [[-6, -4.5], [6, -4.5]], gat: 3.0, schroef: 'M3',
  klemmen: [
    ...rij(['DC+', 'DC−'], -2.5, 0, S5, 'schroef', undefined, '-x').map((k) => ({ ...k, x: -13.25, z: k.x })),
    ...rij(['OUT+', 'OUT−'], -2.5, 0, S5, 'schroef', undefined, '+x').map((k) => ({ ...k, x: 13.25, z: k.x })),
    ...rij(['PWM', 'GND'], -1.27, 4.5, 2.54, 'pin', undefined, '+y'),
  ],
  nets: { 'DC+': '', 'DC−': 'M', 'OUT+': '', 'OUT−': 'Q3D', PWM: 'GPIO47', GND: 'GND' },
  aanname: 'maat 34 x 17, gaten en klemmen: AANNAME (de modules verschillen per verkoper), na te meten',
};
/** regelaar XL4015 (8-36 V -> 1,25-32 V, 5 A) met koelplaatje: 51,5 x 26,3 x 14 (AANNAME), 4 gaten Ø3, schroefklemmen
 *  IN+/IN− en OUT+/OUT− aan de korte kanten; op 5,5 V gezet voor de servo's */
const xl = {
  naam: 'Regelaar XL4015, 5 A (servo\'s, op 5,5 V)', kort: 'XL4015', l: 51.5, b: 26.3, pcb: 1.6, h: 14, kleur: '#1f4fa3',
  gaten: [[-22.5, -10.5], [22.5, -10.5], [-22.5, 10.5], [22.5, 10.5]], gat: 3.0, schroef: 'M3',
  klemmen: [
    ...rij(['IN+', 'IN−'], -2.5, 0, S5, 'schroef', undefined, '-x').map((k) => ({ ...k, x: -21.5, z: k.x })),
    ...rij(['OUT+', 'OUT−'], -2.5, 0, S5, 'schroef', undefined, '+x').map((k) => ({ ...k, x: 21.5, z: k.x })),
  ],
  nets: { 'IN+': 'L19', 'IN−': 'M', 'OUT+': 'V6', 'OUT−': 'M' },
  aanname: 'maat, gaten en klemmen: AANNAME (gangbare XL4015-module met koelplaatje), na te meten',
};

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
  // versie 6 fase B
  '-K7': pcaMod(true),
  '-T3': xl,
  // Fable 5.2 E11/EN2: de 3,3 V naar de baan (ontvangers, reflexsensoren) achter de polyfuse -F20 (MF-R030): net B3V3
  '-X12': wago('B3V3'),
  '-X13': wago('M'),
  // Fable 5.2 EN2: de stuurkant van -Q4 weer uit de 3,3 V in de doos (niet uit B3V3)
  '-Q4': { ...mosfet('Q4', 0, (i) => `GPA${i}`, 'Q3D'), naam: '8-kanaals MOSFET-module met optocouplers (IR-leds kiezen)' },
  '-Q3': aod,
  '-K5': mcp('0x20'),
  '-K8': { ...mcp('0x21'), optioneel: true },
};
/** de helft van elke module (de rest staat rechts) */
export const LINKS = new Set(['-Q4', '-Q3', '-K5', '-K8']);
export const helft = (ref) => (LINKS.has(ref) ? 'links' : 'rechts');

/** waar elke module in de rechterhelft staat (midden, draaiing om +Y). Kolommen van de naad naar rechts: de 2
 *  MOSFET-modules met hun uitgangen naar de bordjes (groep 1 achteraan, zoals rij 1 van de bordjes), de PCA9685 met zijn
 *  PWM-pinnen naar de pinnen van de MOSFET-modules, de ESP met haar USB naar de voorwand, de 2 optocouplerprints met hun
 *  ingangen naar de rechterwand (de kabels van knoppen en sensoren komen daar binnen); achteraan de WAGO-klemmen onder de
 *  DC-bus, vooraan rechts de regelaar */
export const PLAATSING = {
  '-Q1': { cx: 145.3, cz: -61, rot: -90 }, '-Q2': { cx: 145.3, cz: 29, rot: -90 },
  '-K2': { cx: 189.7, cz: -17, rot: -90 },
  '-X6': { cx: 218.75, cz: 66.25, rot: -90 },
  '-K3': { cx: 291.6, cz: -58, rot: 90 }, '-K4': { cx: 291.6, cz: 32, rot: 90 },
  '-T2': { cx: 291, cz: 92, rot: 0 },
  // de WAGO-klemmen per 3 naast elkaar (0,4 vrij) in een klikhouder per rij, de draadingangen naar voren
  '-X1a': { cx: 193.5, cz: -97, rot: 0 }, '-X1b': { cx: 223.7, cz: -97, rot: 0 }, '-X3': { cx: 253.9, cz: -97, rot: 0 },
  '-X2a': { cx: 193.5, cz: -69, rot: 0 }, '-X2b': { cx: 223.7, cz: -69, rot: 0 }, '-X7': { cx: 253.9, cz: -69, rot: 0 },
  // versie 6 fase B, rechterhelft tussen de PCA9685 (-K2) en de optocouplers: de servoprint (servopinnen naar voren),
  // de regelaar van de servo's, en 2 WAGO-klemmen (3,3 V en 0 V) in een klikhouder, de draadingangen naar voren
  '-K7': { cx: 237.5, cz: -45.0, rot: 0 },
  '-T3': { cx: 237.5, cz: -16.0, rot: 0 },
  '-X12': { cx: 222.0, cz: 11.0, rot: 0 }, '-X13': { cx: 252.2, cz: 11.0, rot: 0 },
  // linkerhelft naast bordje 16 (rij 6): de IR-driver met de uitgangen naar de tules vooraan, de AOD4184 ernaast, de
  // MCP23017 en de plaats voor een tweede vóór bordje 16
  '-Q4': { cx: 20, cz: 78, rot: 0 },
  '-Q3': { cx: 76, cz: 72, rot: 90 },
  '-K5': { cx: -86, cz: 90.5, rot: 0 }, '-K8': { cx: -50, cz: 90.5, rot: 0 },
};

/** wat in de rechterhelft geen module mag raken: [naam, x0, z0, x1, z1] (pilaren, bussen, de tules aan de binnenkant,
 *  de sleutelgaten met de kop van de schroef, 11 vrij aan de naad voor de draden van de bordjes) */
export function hindernissen() {
  const xs = N.x + N.spleet, X1 = R.x1, Z = M.doos.binnen / 2, T = M.doos.invoer, ti = T.tule.l - T.tule.flens - M.doos.wand + 0.3, rt = M.doos.invoer.gat / 2;
  const uit = [
    ['draadruimte aan de naad', xs - 1, -Z, xs + 11.1, Z],
    ['pilaar achter', xs, -Z, xs + N.pilaar.l, -Z + N.pilaar.d], ['pilaar voor', xs, Z - N.pilaar.d, xs + N.pilaar.l, Z],
    ['bus rechtsachter', X1 - 7, -Z, X1, -Z + 7], ['bus rechtsvoor', X1 - 7, Z - 7, X1, Z],
  ];
  for (const x of R.tules.voor) uit.push([`tule voor ${x}`, x - rt, Z - ti, x + rt, Z]);
  for (const x of R.tules.achter) uit.push([`tule achter ${x}`, x - rt, -Z, x + rt, -Z + ti]);
  for (const z of R.tules.rechts) uit.push([`tule rechts ${z}`, X1 - ti, z - rt, X1, z + rt]);
  const SG = M.doos.sleutelgat;
  for (const z of R.sleutelgatZ) uit.push([`sleutelgat ${z.toFixed(1)}`, R.sleutelgatX - SG.kop / 2, z - SG.kop / 2, R.sleutelgatX + SG.kop / 2, z + SG.slag + 4]);
  return uit;
}

/** wat in de linkerhelft geen module mag raken: de bordjes met hun draadzones (de draden komen uit de sleuf voor het
 *  bordje en gaan van voren in de klemstrook, de eindklemmen van opzij), de sleuven, de tules (links en vooraan), de
 *  sleutelgaten, de bussen en de naad (bodemlippen, kuiltjes) */
export function hindernissenLinks(L, plat = false) {
  const B = M.bordje, D = M.doos, Z = D.binnen / 2, X = L.X, rt = D.invoer.gat / 2, ti = D.invoer.tule.l - D.invoer.tule.flens - D.wand + 0.3, SG = D.sleutelgat;
  const uit = [['naad (bodemlippen en haken)', N.x - 12, -Z, N.x + 1, Z]];
  // een plat oogje in de bodem (plat = true) houdt geen draad tegen: dan alleen het bordje met zijn klemmen (+ 1)
  for (const d of L.rijen.flat().filter((q) => q.soort === 'bordje')) uit.push(plat ? [`bordje ${d.nr}`, d.cx - B.x / 2 - 1, d.cz - B.z / 2 - 1, d.cx + B.x / 2 + 1, d.cz + B.z / 2 + 1] : [`bordje ${d.nr} met draadzone`, d.cx - B.x / 2 - 8, d.cz - B.z / 2 - 2, d.cx + B.x / 2 + 8, d.cz + B.z / 2 + 10]);
  for (const s of L.bodem) uit.push(['draadsleuf', s[0], s[1], s[2], s[3]]);
  for (const t of L.tules) uit.push(t.wand === 'links' ? [`tule links ${t.c}`, -X, t.c - rt, -X + ti, t.c + rt] : [`tule voor ${t.c}`, t.c - rt, Z - ti, t.c + rt, Z]);
  for (const [x, z] of L.sleutelgaten) uit.push([`sleutelgat ${z.toFixed(1)}`, x - SG.kop / 2, z - SG.kop / 2, x + SG.kop / 2, z + SG.slag + 4]);
  for (const [x, z] of L.bussen) uit.push(['bus', x - D.bus.r, z - D.bus.r, x + D.bus.r, z + D.bus.r]);
  return uit;
}

// ---------------------------------------------------------------- oogjes voor kabelbinders (Fable 5.2 D2/D8)
/** de voetafdruk van een module zoals de controle hem ziet: met de klempaaltjes (MCP23017) */
function voetMetPalen(r) {
  const f = voetafdruk(r);
  if (!MODULES[r].klem) return f;
  const g = gatenDoos(r);
  return [Math.min(f[0], ...g.map((q) => q[0] - 3)), Math.min(f[1], ...g.map((q) => q[1] - 3)), Math.max(f[2], ...g.map((q) => q[0] + 3)), Math.max(f[3], ...g.map((q) => q[1] + 3))];
}
/** de rechthoek [x0, z0, x1, z1] van een oogje met midden (x, z); as = de richting van sleuf naar sleuf */
export function oogRect(x, z, as) {
  const O = M.oog, l = 2 * O.sleuf.l + O.brug, b = O.sleuf.b;
  return as === 'x' ? [x - l / 2, z - b / 2, x + l / 2, z + b / 2] : [x - b / 2, z - l / 2, x + b / 2, z + l / 2];
}
/** de 2 sleuven van een oogje (door de bodem): [x0, z0, x1, z1]; het kanaal eronder is de hele rechthoek */
export function oogSleuven(o) {
  const [x0, z0, x1, z1] = o.rect, l = M.oog.sleuf.l;
  return o.as === 'x' ? [[x0, z0, x0 + l, z1], [x1 - l, z0, x1, z1]] : [[x0, z0, x1, z0 + l], [x0, z1 - l, x1, z1]];
}
const raakt = (a, b, m) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;
/** de modules met dupont (pinnen) die een oogje krijgen */
export const MET_DUPONT = () => Object.keys(MODULES).filter((q) => !MODULES[q].optioneel && MODULES[q].klemmen.some((k) => k.soort === 'pin'));
let oogCache;
/**
 * De oogjes voor een kabelbinder in de bodem (trekontlasting, Fable 5.2 D2/D8): eerst één bij elke module met dupont
 * (zo dicht mogelijk bij haar pinnen), dan één bij elke tule aan de binnenkant (zo dicht mogelijk vóór de tule, de sleuven
 * evenwijdig met de wand: de binder gaat om de kabel die uit de tule komt). Elk oogje 0,3 vrij van de modules (de
 * WAGO-klemmen met hun klikhouder), van de bordjes met hun klemmen, de sleuven, tules, sleutelgaten, bussen, pilaren,
 * de houder van de leerontvanger en de naad, en 1 vrij van een ander oogje. Geeft [{ bij, helft, x, z, as, rect }]
 * (L = indeling() van de linkerhelft).
 */
export function oogjes(L) {
  if (oogCache?.L === L) return oogCache.uit;
  const D = M.doos, Z = D.binnen / 2, X = L.X, ti = D.invoer.tule.l - D.invoer.tule.flens - D.wand + 0.3, b = M.oog.sleuf.b;
  const refs = Object.keys(MODULES), v = Object.fromEntries(refs.map((r) => [r, voetMetPalen(r)]));
  const vast = { links: hindernissenLinks(L, true).map((h) => h.slice(1)), rechts: hindernissen().map((h) => h.slice(1)) };
  for (const r of refs) vast[helft(r)].push(MODULES[r].wago ? [v[r][0] - 1.4, v[r][1] - 1.4, v[r][2] + 1.4, v[r][3] + 1.4] : v[r]);
  const T = M.tsmp;
  vast.rechts.push([T.x - T.blok[0] / 2, Z - T.blok[1], T.x + T.blok[0] / 2, Z]);
  const binnen = { links: [-X, N.x], rechts: [N.x + N.spleet, R.x1] }, uit = [];
  const vrij = (h, rc) => rc[0] >= binnen[h][0] + 0.3 && rc[2] <= binnen[h][1] - 0.3 && rc[1] >= -Z + 0.3 && rc[3] <= Z - 0.3
    && !vast[h].some((q) => raakt(rc, q, 0.3)) && !uit.some((o) => raakt(rc, o.rect, 1.0));
  /** het vrije oogje het dichtst bij (ax, az): een raster van 0,5 rond het anker; as: de voorkeur (de andere kost 3) */
  const zoek = (bij, h, ax, az, voorkeur, straal) => {
    let best = null;
    for (let dx = -straal; dx <= straal; dx += 0.5) for (let dz = -straal; dz <= straal; dz += 0.5) for (const as of ['x', 'z']) {
      const kost = Math.hypot(dx, dz) + (as === voorkeur ? 0 : 3);
      if (best && kost >= best.kost) continue;
      const rc = oogRect(ax + dx, az + dz, as);
      if (vrij(h, rc)) best = { kost, bij, helft: h, x: ax + dx, z: az + dz, as, rect: rc };
    }
    if (best) { delete best.kost; uit.push(best); }
    return best;
  };
  // de modules met dupont: het anker is het midden van de pinnen, de voorkeur de as langs de langste kant
  for (const r of MET_DUPONT()) {
    const p = MODULES[r].klemmen.filter((k) => k.soort === 'pin').map((k) => naarDoos(r, k.x, k.z));
    const ax = p.reduce((a, q) => a + q[0], 0) / p.length, az = p.reduce((a, q) => a + q[1], 0) / p.length, f = v[r];
    zoek(r, helft(r), ax, az, f[2] - f[0] > f[3] - f[1] ? 'x' : 'z', 60);
  }
  // de tules: het anker net vóór de tule (de binnenkant van het lijf + 0,3 + een halve breedte)
  const nd = ti + 0.3 + b / 2;
  const tules = [
    ...L.tules.map((t) => ({ h: 'links', t, p: t.wand === 'links' ? [-X + nd, t.c] : [t.c, Z - nd], as: t.wand === 'links' ? 'z' : 'x' })),
    ...R.tules.voor.map((c) => ({ h: 'rechts', t: { wand: 'voor', c }, p: [c, Z - nd], as: 'x' })),
    ...R.tules.achter.map((c) => ({ h: 'rechts', t: { wand: 'achter', c }, p: [c, -Z + nd], as: 'x' })),
    ...R.tules.rechts.map((c) => ({ h: 'rechts', t: { wand: 'rechts', c }, p: [R.x1 - nd, c], as: 'z' })),
  ];
  for (const q of tules) zoek(`tule ${q.t.wand} ${Math.round(q.t.c)}`, q.h, q.p[0], q.p[1], q.as, 30);
  oogCache = { L, uit };
  return uit;
}

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
/** de onderkant van de print van een module (de WAGO-klemmen staan zonder palen in een klikhouder op de bodem) */
export const moduleY = (ref) => (MODULES[ref].wago ? BODEM_TOP : MODULE_Y);
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
  { van: ['-X5', '+'], naar: ['-F1', 'in'], net: 'J+', mm2: 0.75, kleur: 'rood', wat: '12 V van de DC-bus (pen = +, gesoldeerd) naar de zekeringhouder -F1 in de achterwand (vlaksteker 4,8)' },
  { van: ['-F1', 'uit'], naar: ['-X1a', '1'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: 'L+ na de hoofdzekering T 8 A (5 x 20, in de achterwand)' },
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
  { van: ['-K3', 'VCCo'], naar: ['-K4', 'VCCo'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V uitgangskant optocouplerprint 2 (doorgelust van -K3)' },
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
  // ---- versie 6 fase B: servoprint, servovoeding, IR-driver, MCP23017, leerontvanger
  // de servoprint aan de lichtprint geregen (dupont van de pinnen rechts van -K2 naar links van -K7; V+ niet)
  // Fable 5.2 E17: geen GND-dupont: de 0 V van de servoprint komt via -T3 (de servostroom niet door de dunne draad)
  ...['OE', 'SCL', 'SDA', 'VCC'].map((n) => ({ van: ['-K2', `R:${n}`], naar: ['-K7', `L:${n}`], net: PCA_NET[n], mm2: 0.14, kleur: { GND: 'zwart', OE: 'blauw', SCL: 'groen', SDA: 'geel', VCC: 'oranje' }[n], wat: `${n} van de lichtprint naar de servoprint (dupont)` })),
  // de MCP23017 in de linkerhelft aan de servoprint (2 dupontkabels van 30 cm aan elkaar, over de naad)
  ...['GND', 'SCL', 'SDA', 'VCC'].map((n) => ({ van: ['-K7', `R:${n}`], naar: ['-K5', n], net: PCA_NET[n], mm2: 0.14, kleur: { GND: 'zwart', SCL: 'groen', SDA: 'geel', VCC: 'oranje' }[n], wat: `${n} naar de MCP23017 (2 dupontkabels van 30 cm aan elkaar, over de naad)` })),
  // de servovoeding: L+ door -F19 (T 3,15 A) naar de XL4015, 5,5 V naar de schroefklem V+ van de servoprint
  { van: ['-X1b', '4'], naar: ['-F19', 'in'], net: 'L+', mm2: 0.75, kleur: 'rood', wat: 'L+ naar de zekeringhouder -F19 van de servo\'s (T 3,15 A, in de achterwand)' },
  { van: ['-F19', 'uit'], naar: ['-T3', 'IN+'], net: 'L19', mm2: 0.75, kleur: 'rood', wat: '12 V na -F19 naar de regelaar van de servo\'s' },
  { van: ['-X2b', '4'], naar: ['-T3', 'IN−'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V naar de regelaar van de servo\'s' },
  { van: ['-T3', 'OUT+'], naar: ['-K7', 'V+t'], net: 'V6', mm2: 0.75, kleur: 'rood', wat: '5,5 V voor de servo\'s (eerst instellen!)' },
  { van: ['-T3', 'OUT−'], naar: ['-K7', 'GNDt'], net: 'M', mm2: 0.75, kleur: 'zwart', wat: '0 V voor de servo\'s' },
  // 3,3 V en 0 V voor de IR-driver en de ontvangers op de baan (-X12, -X13; klem 3..5 naar de ontvangers -B2..-B4)
  { van: ['-X2b', '2'], naar: ['-X13', '1'], net: 'M', mm2: 0.5, kleur: 'zwart', wat: '0 V naar de verdeelklem van de uitbreiding' },
  { van: ['-K4', 'VCCo'], naar: ['-Q4', 'VCC'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V ingangskant IR-driver (dupont female-male 50 cm, over de naad; Fable 5.2 EN2)' },
  { van: ['-X6', 'J3:1'], naar: ['-Q4', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V ingangskant IR-driver (dupont female-male 50 cm, over de naad)' },
  // ---- Fable 5.2 EN2: de veldkabels naar de baan (ontvangers -B2..-B4 en reflexsensoren -B5..-B8) en hun klemmen
  ...[2, 3, 4].flatMap((b, k) => [
    { van: ['-X12', String(3 + k)], naar: [`-B${b}`, 'Vs'], net: 'B3V3', mm2: 0.14, kleur: 'oranje', wat: `veldkabel -W${29 + b} (getwist, ± 3 m): 3,3 V naar IR-ontvanger -B${b}`, veld: true },
    { van: ['-X13', String(3 + k)], naar: [`-B${b}`, 'GND'], net: 'M', mm2: 0.14, kleur: 'zwart', wat: `veldkabel -W${29 + b}: 0 V naar IR-ontvanger -B${b}`, veld: true },
    { van: [`-B${b}`, 'OUT'], naar: ['-X14', String(1 + k)], net: `B${b}OUT`, mm2: 0.14, kleur: 'geel', wat: `veldkabel -W${29 + b}: uitgang van -B${b} naar -X14 (WAGO 221-2411, daar -R${20 + b} 1 kΩ naar de ESP)`, veld: true },
  ]),
  { van: ['-X12', '2'], naar: ['-X17', '1'], net: 'B3V3', mm2: 0.25, kleur: 'oranje', wat: 'veldkabel -W40 (± 3 m): 3,3 V naar de verdeelklem -X17 onder de baan (de 4 reflexsensoren)', veld: true },
  { van: ['-X13', '2'], naar: ['-X18', '1'], net: 'M', mm2: 0.25, kleur: 'zwart', wat: 'veldkabel -W40: 0 V naar de verdeelklem -X18 onder de baan', veld: true },
  ...[5, 6, 7, 8].flatMap((b, k) => [
    { van: ['-X17', String(2 + k)], naar: [`-B${b}`, 'VCC'], net: 'B3V3', mm2: 0.14, kleur: 'oranje', wat: `onder de baan: 3,3 V naar reflexsensor -B${b}`, veld: true },
    { van: ['-X18', String(2 + k)], naar: [`-B${b}`, 'GND'], net: 'M', mm2: 0.14, kleur: 'zwart', wat: `onder de baan: 0 V naar reflexsensor -B${b}`, veld: true },
    { van: [`-B${b}`, 'DO'], naar: ['-X15', String(1 + k)], net: `B${b}DO`, mm2: 0.14, kleur: 'wit', wat: `veldkabel -W${36 + b}: uitgang van -B${b} naar -X15 (WAGO 221-2411, daar -R${23 + b} 1 kΩ naar -K5 GPB${k})`, veld: true },
  ]),
  // de IR-driver: L+ voor de IR-leds (via de klemmen n+), VIN− door de AOD4184 naar 0 V, de draaggolf van GPIO47
  { van: ['-X1b', '5'], naar: ['-Q4', 'VIN+'], net: 'L+', mm2: 0.5, kleur: 'rood', wat: '12 V voor de IR-leds (over de naad)' },
  { van: ['-Q4', 'VIN−'], naar: ['-Q3', 'OUT−'], net: 'Q3D', mm2: 0.5, kleur: 'zwart', wat: 'terugweg van de IR-leds door de AOD4184 (piek 0,7 A)' },
  { van: ['-X2b', '5'], naar: ['-Q3', 'DC−'], net: 'M', mm2: 0.5, kleur: 'zwart', wat: '0 V van de AOD4184 (over de naad)' },
  { van: gpioKlem(47), naar: ['-Q3', 'PWM'], net: 'GPIO47', mm2: 0.14, kleur: 'wit', wat: 'IR zenden: draaggolf van GPIO47 (dupont female-male 30 cm, over de naad)' },
  // de MCP23017 kiest de IR-leds: GPA0..7 naar IN1..8 van -Q4
  ...Array.from({ length: 8 }, (_, i) => ({ van: ['-K5', `GPA${i}`], naar: ['-Q4', `IN${i + 1}`], net: `GPA${i}`, mm2: 0.14, kleur: 'wit', wat: `IR-led ${i + 1} kiezen (dupont)` })),
  // de leerontvanger -B1 achter het venstertje in de voorwand (pootjes in 3 dupontbusjes)
  { van: ['-X6', 'J1:2'], naar: ['-B1', 'Vs'], net: '3V3', mm2: 0.14, kleur: 'oranje', wat: '3,3 V voor de IR-leerontvanger' },
  { van: ['-X6', 'J1:22'], naar: ['-B1', 'GND'], net: 'GND', mm2: 0.14, kleur: 'zwart', wat: '0 V voor de IR-leerontvanger' },
  { van: gpioKlem(48), naar: ['-B1', 'OUT'], net: 'GPIO48', mm2: 0.14, kleur: 'geel', wat: 'IR leren: uitgang van de TSMP58000 naar GPIO48' },
].map((d, i) => ({ nr: `W${String(i + 1).padStart(2, '0')}`, ...d }));

/** de elementen die met hun pootjes in de klemmen zitten (geen solderen) */
export const IN_KLEMMEN = [
  { ref: '-R1', wat: 'weerstand 1 kΩ 0,25 W (pull-up van OE)', a: ['-X6', 'J1:1'], b: gpioKlem(10) },
  { ref: '-R2', wat: 'Schottkydiode SB560 (ompoolbeveiliging): kathode (ring) aan L+, anode aan 0 V', a: ['-X1b', '3'], b: ['-X2b', '3'] },
  { ref: '-F18', wat: 'polyfuse Bourns MF-R050 (knoppen en sensoren)', a: ['-X1b', '2'], b: ['-X3', '1'] },
  { ref: '-C5', wat: 'elco 1000 µF 25 V (servovoeding): + aan V+, − aan GND van de servoprint', a: ['-K7', 'V+t'], b: ['-K7', 'GNDt'] },
  { ref: '-F20', wat: 'polyfuse 0,3 A (Bourns MF-R030): de 3,3 V naar de baan (Fable 5.2 E11, EN2)', a: ['-X7', '5'], b: ['-X12', '1'] },
  ...[2, 3, 4].map((b, k) => ({ ref: `-R${20 + b}`, wat: `weerstand 1 kΩ in de lijn van ontvanger -B${b} (EN2)`, a: gpioKlem([11, 39, 42][k]), b: ['-X14', String(1 + k)] })),
  ...[5, 6, 7, 8].map((b, k) => ({ ref: `-R${23 + b}`, wat: `weerstand 1 kΩ in de uitgang van reflexsensor -B${b}: pootje in een dupontbusje op GPB${k}`, a: ['-K5', `GPB${k}`], b: ['-X15', String(1 + k)] })),
];

/** de draden van de groepen en de ingangen (naar de bordjes en de baan; de labels uit de README) */
export const GROEPEN = Array.from({ length: 16 }, (_, k) => {
  const q = k < 8 ? '-Q1' : '-Q2', n = (k % 8) + 1;
  return { groep: k + 1, plus: [q, `${n}+`], min: [q, `${n}−`], ptc: `-F${k + 2}`, wago: `-X8:${k + 1}` };
});
export const INGANGEN = Array.from({ length: 16 }, (_, k) => ({ ingang: k + 1, klem: [k < 8 ? '-K3' : '-K4', `IN${(k % 8) + 1}`], gpio: INGANG_GPIO[k] }));

// ---------------------------------------------------------------- de controle
const VAST = { '-X5': { '+': 'J+', '−': 'M' }, '-F1': { in: 'J+', uit: 'L+' }, '-F18': { a: 'L+', b: 'S12' }, '-F19': { in: 'L+', uit: 'L19' }, '-B1': { Vs: '3V3', GND: 'GND', OUT: 'GPIO48' },
  // Fable 5.2 EN2: de losse klemmen (WAGO 221-2411 in de doos: -X14 ontvangers, -X15 reflexsensoren; WAGO 221-415 onder de
  // baan: -X17 3,3 V, -X18 0 V) en de sensoren op de baan
  '-X14': { 1: 'B2OUT', 2: 'B3OUT', 3: 'B4OUT' }, '-X15': { 1: 'B5DO', 2: 'B6DO', 3: 'B7DO', 4: 'B8DO' },
  '-X17': Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, 'B3V3'])), '-X18': Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, 'M'])),
  ...Object.fromEntries([2, 3, 4].map((b) => [`-B${b}`, { Vs: 'B3V3', GND: 'M', OUT: `B${b}OUT` }])),
  ...Object.fromEntries([5, 6, 7, 8].map((b) => [`-B${b}`, { VCC: 'B3V3', GND: 'M', DO: `B${b}DO` }])) };
/** het net van een eind (een klem van een module of een vast eind) */
export function eindNet(e) {
  if (VAST[e[0]]) return VAST[e[0]][e[1]];
  return klem(e[0], e[1]).net;
}
/** M (0 V van de voeding) en GND (0 V van de logica) zijn hetzelfde net: de regelaar verbindt ze */
const zelfde = (a, b) => a === b || (['M', 'GND'].includes(a) && ['M', 'GND'].includes(b));

/** alle fouten (leeg = goed): draden op bestaande klemmen met het juiste net, de modules binnen de rechterhelft, vrij van
 *  de hindernissen en niet over elkaar, de gaten in de print en vrij van de klemmen, de elementen in de klemmen op hun
 *  net, elke groep en ingang */
export function controleerAlles(Llinks) {
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
  // de modules binnen hun helft, vrij van de hindernissen (0,3) en niet over elkaar (0,3 vrij); de klempaaltjes van een
  // module zonder gaten (MCP23017) horen bij haar voetafdruk
  const refs = Object.keys(MODULES), Z = M.doos.binnen / 2;
  const v = Object.fromEntries(refs.map((r) => { const f = voetafdruk(r); if (!MODULES[r].klem) return [r, f]; const g = gatenDoos(r); return [r, [Math.min(f[0], ...g.map((q) => q[0] - 3)), Math.min(f[1], ...g.map((q) => q[1] - 3)), Math.max(f[2], ...g.map((q) => q[0] + 3)), Math.max(f[3], ...g.map((q) => q[1] + 3))]]; }));
  const HR = hindernissen(), HL = Llinks ? hindernissenLinks(Llinks) : [];
  for (const r of refs) {
    const [x0, z0, x1, z1] = v[r], rand = MODULES[r].wago ? 1.4 : 0, links = helft(r) === 'links', H = links ? HL : HR;
    const [xa, xb] = links ? [-(Llinks?.X ?? 112.5), N.x] : [N.x + N.spleet, R.x1];
    if (x0 - rand < xa || x1 + rand > xb || z0 - rand < -Z || z1 + rand > Z) fout.push(`${r} steekt buiten de ${helft(r)}erhelft`);
    for (const [naam, a0, b0, a1, b1] of H) if (x0 - rand < a1 + 0.3 && a0 < x1 + rand + 0.3 && z0 - rand < b1 + 0.3 && b0 < z1 + rand + 0.3) fout.push(`${r} op ${naam}`);
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
      if (!m.klem && (Math.abs(gx) + m.gat / 2 > m.l / 2 || Math.abs(gz) + m.gat / 2 > m.b / 2)) fout.push(`${r}: gat (${gx}, ${gz}) buiten de print`);
      if (m.klem && Math.abs(gx) - m.l / 2 > 2.5) fout.push(`${r}: klempaaltje (${gx}) te ver van de print`);
      for (const k of m.klemmen) if (k.soort !== 'pin' && Math.abs(k.x - gx) < 2.5 + m.gat / 2 - 0.01 && Math.abs(k.z - gz) < 3.75 + m.gat / 2) fout.push(`${r}: gat (${gx}, ${gz}) onder klem ${k.naam}`);
    }
  }
  // de oogjes voor de kabelbinders (Fable 5.2 D2/D8): één bij elke tule en bij elke module met dupont, vrij van de modules
  if (Llinks) {
    const og = oogjes(Llinks), nt = Llinks.tules.length + R.tules.voor.length + R.tules.achter.length + R.tules.rechts.length, bt = og.filter((o) => o.bij.startsWith('tule')).length;
    if (bt !== nt) fout.push(`oogjes: ${bt} bij de tules in plaats van ${nt}`);
    for (const r of MET_DUPONT()) if (!og.some((o) => o.bij === r)) fout.push(`geen oogje bij ${r}`);
    for (const o of og) for (const r of refs) if (helft(r) === o.helft && raakt(o.rect, v[r], 0.3 - 1e-9)) fout.push(`oogje bij ${o.bij} onder ${r}`);
  }
  // de elementen in de klemmen op hun net
  const want = { '-R1': ['3V3', 'GPIO10'], '-R2': ['L+', 'M'], '-F18': ['L+', 'S12'], '-C5': ['V6', 'M'], '-F20': ['3V3', 'B3V3'],
    '-R22': ['GPIO11', 'B2OUT'], '-R23': ['GPIO39', 'B3OUT'], '-R24': ['GPIO42', 'B4OUT'], '-R28': ['IN17', 'B5DO'], '-R29': ['IN18', 'B6DO'], '-R30': ['IN19', 'B7DO'], '-R31': ['IN20', 'B8DO'] };
  for (const x of IN_KLEMMEN) { const n = [eindNet(x.a), eindNet(x.b)]; if (n.join() !== want[x.ref].join()) fout.push(`${x.ref} zit op ${n.join(' en ')}`); }
  // elke groep heeft een + (L+) en een − (drain), elke ingang een klem
  for (const g of GROEPEN) { if (eindNet(g.plus) !== 'L+') fout.push(`groep ${g.groep}: + niet op L+`); if (!/D\d$/.test(eindNet(g.min))) fout.push(`groep ${g.groep}: − niet op een drain`); }
  return fout;
}

export { PCA_ZIJ, pcaX, PCA_NET };
