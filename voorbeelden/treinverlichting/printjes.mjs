// De bovenkant van elke print in de kabeldoos als decal: soldeermasker met textuur, koperbanen, pads, via's en opdruk;
// opschriften op de chips. Bron voor de ESP32-S3-DevKitC-1: de maattekening van Espressif (docs/ESP32-S3-DevKitC-1-v1.1-
// maten.png): de opdruk staat daar letterlijk (pinnamen, onderdeelnamen, BOOT, RESET, UART, USB, RGB@IO38). De banen
// van de ESP zijn niet gepubliceerd: die zijn getekend zoals ze ongeveer lopen. De Modelbouwled-bordjes volgen de
// schakeling van de productpagina (16 x led + via een eigen SMD-weerstand, de min gemeenschappelijk).
import { Plaat, opschrift } from '../lib/printplaat.mjs';

// ---------------------------------------------------------------- het Modelbouwled-bordje (61,1 x 20,9, rood)
/** B = M.bordje; beeld-x = x + 30,55, beeld-y = z + 10,45 */
export function bordjeArt(B) {
  const W = B.x, H = B.z, p = new Plaat(W, H, { masker: 'rood', seed: 3 });
  const L = B.klem.n * B.klem.steek, px = (i) => W / 2 - L / 2 + B.klem.steek * (i + 0.5);
  const yAchter = H / 2 - B.z / 2 + B.klem.diep / 2 + 0.2, yVoor = H - yAchter; // hart van de klemstroken
  const xEind = [B.eind.diep / 2 + 0.2, W - B.eind.diep / 2 - 0.2], yPlus = H / 2 - B.eind.steek / 2, yMin = H / 2 + B.eind.steek / 2;
  // de min: een kopervlak onder de achterste klemstrook, met de min van beide eindklemmen langs de buitenrand
  p.vlak([[px(0) - 1.6, 0.9], [px(15) + 1.6, 0.9], [px(15) + 1.6, yAchter + 2.1], [px(0) - 1.6, yAchter + 2.1]]);
  for (const [k, xe] of xEind.entries()) {
    const xr = k ? W - 1.2 : 1.2, xv = k ? px(15) + 1.6 : px(0) - 1.6;
    p.baan([[xe, yMin], [xr, yMin], [xr, 5.2], [xr + (k ? -1.4 : 1.4), 3.8], [xv, 3.8]], 0.9);
  }
  // de plus: een brede baan van eindklem tot eindklem, tussen de weerstanden en de achterste klemstrook
  const yBus = H / 2 - 2.9;
  p.baan([[xEind[0], yPlus], [xEind[0] + 2.4, yBus], [xEind[1] - 2.4, yBus], [xEind[1], yPlus]], 0.8);
  for (let i = 0; i < 16; i++) {
    const x = px(i);
    p.ring(x, yAchter, 1.7, 1.0, i === 0); // led - (onder de klemstrook)
    p.ring(x, yVoor, 1.7, 1.0, i === 0); // led +
    // de weerstand (0805, overlangs): bovenste pad aan de plus, onderste naar de klem van de led
    p.pad(x, H / 2 - 0.95, 1.35, 1.0).pad(x, H / 2 + 0.95, 1.35, 1.0);
    p.baan([[x, yBus], [x, H / 2 - 0.95]], 0.35);
    p.baan([[x, H / 2 + 0.95], [x, yVoor]], 0.3);
    p.tekst(x + 0.95, H / 2 + 2.75, String(i + 1), { h: 0.72, anker: 'middle' });
  }
  p.via(px(0) - 0.4, H / 2 - 4.8).via(px(15) + 0.4, H / 2 - 4.8);
  for (const xe of xEind) { p.ring(xe, yPlus, 2.4, 1.3, true); p.ring(xe, yMin, 2.4, 1.3); }
  // opdruk: + en - bij de eindklemmen, IN en OUT, de versie
  for (const [k, xe] of xEind.entries()) {
    const xt = k ? xe - 4.4 : xe + 4.4;
    p.tekst(xt, yPlus, '+', { h: 1.6, vet: true }).tekst(xt, yMin, '−', { h: 1.6, vet: true });
    p.tekst(k ? W - 7.0 : 7.0, 2.7, k ? 'OUT' : 'IN', { h: 0.95, vet: true });
  }
  p.tekst(W - 7.0, H - 2.7, 'V1.5', { h: 0.8 }).tekst(7.0, H - 2.7, '12V', { h: 0.8 });
  for (const [x, y] of [[2.6, 2.6], [W - 2.6, 2.6], [2.6, H - 2.6], [W - 2.6, H - 2.6]]) p.cirkel(x, y, 1.75, 0.15);
  return p.decal('dc1', 'Opdruk en banen', [0, B.pcb, 0]);
}
/** opschrift "102" (1 kΩ) op de 16 weerstanden 0805, met de vertinde kapjes */
export function weerstandenArt(n, steek, l = 2.0, b = 1.25, h = 0.5) {
  const L = n * steek, p = opschrift(L, l, [], { ppm: 80 });
  for (let i = 0; i < n; i++) {
    const x = steek * (i + 0.5);
    p.eigen(`<rect x="${x - b / 2}" y="0" width="${b}" height="0.32" fill="#c9cbcc"/><rect x="${x - b / 2}" y="${l - 0.32}" width="${b}" height="0.32" fill="#c9cbcc"/>`);
    p.tekst(x, l / 2, '102', { h: 0.42, draai: 90, kleur: '#e9e9e4' });
  }
  return p.decal('dc1', 'Opschrift weerstanden', [0, h, 0]);
}

// ---------------------------------------------------------------- ESP32-S3-DevKitC-1 v1.1 (62,74 x 25,40, zwart)
// getekend in de coördinaten van de maattekening: b = vanaf de linkerrand (naar rechts), a = vanaf de antennerand (naar
// beneden); stelsel: beeld-x = a, beeld-y = 25,4 - b (van boven gezien ligt de antenne links)
const J1 = ['3V3', '3V3', 'RST', '4', '5', '6', '7', '15', '16', '17', '18', '8', '3', '46', '9', '10', '11', '12', '13', '14', '5V', 'G'];
const J3 = ['G', 'TX', 'RX', '1', '2', '42', '41', '40', '39', '38', '37', '36', '35', '0', '45', '48', '47', '21', '20', '19', 'G', 'G'];
/** de plaats (b, a) van een punt op de maattekening, gemeten in pixels (oorsprong linksboven van de print, 23,55 px/mm) */
const tk = (xp, yp) => [(xp - 500) / 23.6, (yp - 365) / 23.5];
export function espArt(P) {
  const p = new Plaat(P.x, P.z, { masker: 'zwart', afwerking: 'enig', seed: 11 }).stelsel([0, -1, 1, 0, 0, P.z]);
  const pinA = (i) => P.pin.eerste + i * P.pin.steek, bL = P.pin.rand, bR = P.z - P.pin.rand;
  // kopervlakken onder het masker (massa) links en rechts van de onderdelen
  p.vlak([[3.6, 19.6], [7.0, 19.6], [7.0, 47.0], [5.4, 49.5], [3.6, 49.5]]);
  p.vlak([[19.0, 22.0], [21.8, 22.0], [21.8, 54.0], [19.0, 54.0]]);
  // banen van de modulepads naar de pinnen (links 14 pads, rechts 14, onder 12) en verder naar beneden
  for (let i = 0; i < 14; i++) {
    const a = 1.3 + i * 1.27;
    if (i < J1.length - 2) p.baan([[bL, pinA(i)], [2.6, pinA(i)], [3.6, a], [4.4, a]], 0.25);
    p.baan([[bR, pinA(i)], [22.8, pinA(i)], [21.8, a], [21.2, a]], 0.25);
  }
  for (let i = 0; i < 8; i++) {
    const b = 6.0 + i * 1.6, a0 = 19.0;
    const naarL = i < 4, pin = naarL ? 8 + i * 2 : 6 + i * 2, bp = naarL ? bL : bR;
    p.baan([[b, a0], [b, a0 + 1.2 + (naarL ? i : 7 - i) * 0.45], [naarL ? 3.0 : 22.4, pinA(pin) - 0.8], [naarL ? 3.0 : 22.4, pinA(pin)], [bp, pinA(pin)]], 0.25);
  }
  // voeding: 5V (J1 pin 21) naar de LDO en de USB; 3V3 van de LDO naar de module en J1 pin 1-2
  p.baan([[bL, pinA(20)], [3.4, pinA(20) - 2.1], [3.4, 31.5], [9.6, 27.0]], 0.6);
  p.baan([[16.2, 26.0], [18.2, 24.4], [18.2, 21.0]], 0.6);
  p.baan([[bL, pinA(20)], [5.2, pinA(20) + 1.8], [10.6, 57.5], [14.6, 57.5], [19.0, 58.4]], 0.5);
  // USB D+ en D- als paar naar de module (J4) en naar de USB-UART U3 (J2)
  for (const d of [0, 0.5]) {
    p.baan([[19.2 + d, 57.8], [19.2 + d, 52.0], [16.8 + d, 49.6], [16.8 + d, 44.4], [15.0 + d, 42.6]], 0.2);
    p.baan([[6.0 + d, 57.8], [6.0 + d, 55.2], [8.6 + d, 52.6], [11.2 + d, 47.0]], 0.2);
  }
  // TX/RX van U3 naar de module, de knoppen naar EN en GPIO0, de led
  p.baan([[13.4, 40.6], [13.4, 36.5], [21.0, 36.5], [22.4, 35.1], [22.4, pinA(1)]], 0.2);
  p.baan([[12.8, 40.6], [12.8, 37.2], [7.8, 37.2], [7.8, 30.4]], 0.2);
  p.baan([[7.7, 46.0], [7.7, 44.0], [5.0, 41.3], [5.0, pinA(2) + 1.0]], 0.25);
  p.baan([[18.1, 46.0], [18.1, 44.6], [20.6, 42.1], [20.6, pinA(13)], [bR, pinA(13)]], 0.25);
  p.baan([[7.7, 33.6], [10.0, 31.3], [10.0, 28.6]], 0.25);
  for (const [b, a] of [[3.1, 18.4], [22.3, 18.4], [9.0, 31.9], [16.4, 31.9], [12.4, 38.3], [11.0, 50.2], [14.7, 50.2], [12.85, 59.6], [3.3, 59.0], [22.1, 59.0], [7.0, 20.8], [19.4, 20.8]]) p.via(b, a, 0.55);
  // de pinnen: koperring met vierkant voor pin 1
  for (let i = 0; i < P.pin.n; i++) { p.ring(bL, pinA(i), 1.55, 1.02, i === 0); p.ring(bR, pinA(i), 1.55, 1.02, i === 0); }
  // pads van de SMD-onderdelen (uit de maattekening) en de modulepads
  for (let i = 0; i < 14; i++) { p.pad(4.15, 1.3 + i * 1.27, 1.0, 0.85); p.pad(21.55, 1.3 + i * 1.27, 1.0, 0.85); }
  for (let i = 0; i < 12; i++) p.pad(5.6 + i * 1.27, 19.0, 0.85, 1.0);
  const tweepol = (b0, a0, b1, a1) => { // 2 pads aan de korte kanten van een rechthoek (b, a)
    const lb = b1 - b0, la = a1 - a0;
    if (la >= lb) { p.pad((b0 + b1) / 2, a0 + 0.3, lb + 0.25, 0.75); p.pad((b0 + b1) / 2, a1 - 0.3, lb + 0.25, 0.75); }
    else { p.pad(b0 + 0.3, (a0 + a1) / 2, 0.75, la + 0.25); p.pad(b1 - 0.3, (a0 + a1) / 2, 0.75, la + 0.25); }
  };
  for (const r of [[6.0, 22.0, 7.4, 23.4], [7.8, 22.0, 9.2, 23.4], [6.0, 25.0, 7.4, 26.4], [6.0, 27.0, 7.4, 28.4], [10.0, 21.5, 13.0, 22.2], [13.5, 21.5, 16.5, 22.2],
    [11.6, 36.7, 13.0, 37.5], [13.3, 36.7, 14.7, 37.5], [15.9, 36.7, 17.3, 37.5], [18.0, 36.7, 19.4, 37.5], [5.6, 41.0, 7.0, 43.5], [5.6, 43.8, 7.0, 46.0],
    [11.6, 51.2, 13.6, 52.8], [11.6, 53.4, 13.6, 55.0], [3.5, 54.6, 5.2, 55.4], [19.8, 54.6, 21.5, 55.4], [10.0, 54.6, 11.4, 55.6], [14.0, 54.6, 15.4, 55.6],
    [18.2, 23.9, 19.0, 25.6], [18.2, 26.2, 19.0, 28.0], [6.5, 46.5, 7.5, 48.0], [19.2, 46.5, 20.2, 48.0]]) tweepol(...r);
  // LDO U2 (SOT-223): 3 pootjes links, koelvlak rechts; Q1/Q2 (SOT-23); U3 (QFN-24) met pads rondom
  for (let k = 0; k < 3; k++) p.pad(9.3, 23.9 + k * 2.3, 1.6, 1.1);
  p.pad(16.6, 26.5, 2.2, 3.6);
  for (const b0 of [11.4, 16.4]) { p.pad(b0 + 0.6, 31.6, 0.7, 0.9); p.pad(b0 + 2.4, 31.6, 0.7, 0.9); p.pad(b0 + 1.5, 34.0, 0.7, 0.9); }
  for (let k = 0; k < 6; k++) { const o = -1.25 + k * 0.5; p.pad(13.4 + o, 40.3, 0.24, 0.7); p.pad(13.4 + o, 44.9, 0.24, 0.7); p.pad(11.1, 42.6 + o, 0.7, 0.24); p.pad(15.7, 42.6 + o, 0.7, 0.24); }
  p.pad(13.4, 42.6, 2.4, 2.4);
  // knoppen (4 pootjes elk) en de USB-bussen (5 pinnen + 4 lippen)
  for (const b of [7.7, 18.1]) for (const [db, da] of [[-3.1, -1.85], [3.1, -1.85], [-3.1, 1.85], [3.1, 1.85]]) p.pad(b + db, 48.8 + da, 1.2, 0.9);
  for (const b of [6.2, 19.5]) {
    for (let k = 0; k < 5; k++) p.pad(b - 1.3 + k * 0.65, 57.6, 0.4, 1.35);
    for (const db of [-3.4, 3.4]) { p.pad(b + db, 58.6, 1.4, 1.9); p.pad(b + db * 0.72, 60.6, 1.6, 1.4); }
  }
  // opdruk: pinnamen (onder elke pin, zoals op de tekening), kaders van de pinrijen en de onderdeelnamen
  for (let i = 0; i < P.pin.n; i++) {
    p.tekst(bL + 0.15, pinA(i) + 1.27, J1[i], { h: J1[i].length > 2 ? 0.55 : 0.62 });
    p.tekst(bR, pinA(i) + 1.27, J3[i], { h: J3[i].length > 2 ? 0.55 : 0.62 });
  }
  p.kader(0.12, 0.12, 2.95, 56.3, 0.12).kader(22.33, 0.12, 2.95, 56.3, 0.12);
  p.lijn([[4.0, 18.9], [4.0, 19.6], [4.6, 19.6]], 0.12).lijn([[21.6, 18.9], [21.6, 19.6], [21.0, 19.6]], 0.12);
  const n = (xp, yp, t, o = {}) => { const [b, a] = tk(xp, yp); p.tekst(b, a, t, { h: 0.62, ...o }); };
  n(605, 840, 'U4');
  n(657, 858, 'C1', { draai: 90 }); n(695, 852, 'R24', { draai: 90 }); n(741, 865, 'R5'); n(791, 865, 'C6');
  n(618, 958, 'C10'); n(590, 1002, 'C9', { draai: 90 }); n(612, 1002, 'C2', { draai: 90 }); n(634, 1002, 'C8', { draai: 90 }); n(620, 1048, 'C7');
  n(887, 1050, 'U2'); n(982, 937, 'R11', { draai: 90 }); n(984, 1000, 'D5', { draai: 90 });
  n(708, 1088, 'RGB@IO38', { h: 0.9 }); n(685, 1152, 'D6'); n(772, 1127, 'Q2'); n(900, 1127, 'Q1');
  n(672, 1232, 'R17'); n(776, 1252, 'R13'); n(826, 1252, 'R8'); n(887, 1252, 'R10'); n(941, 1252, 'R12');
  n(675, 1284, 'C11'); n(613, 1348, 'R18'); n(613, 1372, 'R19'); n(722, 1360, 'C12', { draai: 90 }); n(708, 1393, 'R16'); n(708, 1413, 'R14');
  n(902, 1408, 'U3'); n(985, 1342, 'R7'); n(985, 1372, 'R9');
  n(686, 1432, 'BOOT', { h: 1.05 }); n(930, 1432, 'RESET', { h: 1.05 }); n(805, 1463, 'C15');
  n(700, 1568, 'C13'); n(805, 1570, 'C3'); n(905, 1568, 'C14');
  n(614, 1602, 'D2', { draai: 90 }); n(640, 1602, 'D3', { draai: 90 }); n(666, 1602, 'D4', { draai: 90 });
  n(900, 1602, 'D8', { draai: 90 }); n(936, 1602, 'D9', { draai: 90 }); n(998, 1610, 'D10', { draai: 90 });
  n(749, 1630, 'D1'); n(858, 1630, 'D7');
  n(650, 1674, 'UART', { h: 1.15 }); n(955, 1677, 'USB', { h: 1.15 });
  // omtrekken: LDO, U3 met pin-1-stip, de knoppen
  const kd = (x0, y0, x1, y1) => { const [b0, a0] = tk(x0, y0), [b1, a1] = tk(x1, y1); p.kader(b0, a0, b1 - b0, a1 - a0, 0.12); };
  kd(718, 908, 922, 1066); kd(762, 1308, 885, 1432); kd(630, 1478, 742, 1552); kd(873, 1478, 985, 1552);
  const [bd, ad] = tk(887, 1307); p.cirkel(bd, ad, 0.2, 0.1, true);
  return p.decal('dc1', 'Opdruk en banen', [0, P.pcb, 0]);
}
/** het opschrift op de afschermkap van de module (lasergemarkeerd), met de matrixcode */
export function kapArt(P) {
  const p = new Plaat(P.x, P.z, { masker: 'geen', ppm: 50 }).stelsel([0, -1, 1, 0, 0, P.z]);
  const kleur = '#4d5156', bm = (P.module.van + P.module.van + P.module.z) / 2;
  p.tekst(bm, 4.0, 'ESP32-S3-WROOM-1', { h: 1.05, vet: true, kleur });
  p.tekst(bm, 6.0, 'ESP32-S3-WROOM-1-N16R8', { h: 0.62, kleur });
  p.tekst(bm, 7.4, 'FCC ID: 2AC7Z-ESPS3WROOM1', { h: 0.58, kleur });
  p.tekst(bm, 8.7, 'CMIIT ID: 2021DP2397', { h: 0.58, kleur });
  // 14 x 14 matrixcode van 4,2 mm (vast patroon)
  let s = 12345, code = '';
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const c0b = bm - 2.1, c0a = 10.6, k = 0.3;
  for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) {
    const rand = i === 0 || j === 13 || (i === 13 && j % 2 === 0) || (j === 0 && i % 2 === 1);
    if (rand || (i > 0 && i < 13 && j > 0 && j < 13 && rnd() < 0.5)) code += `<rect x="${(c0b + j * k).toFixed(3)}" y="${(c0a + i * k).toFixed(3)}" width="${k + 0.01}" height="${k + 0.01}" fill="${kleur}"/>`;
  }
  p.eigen(code);
  p.tekst(bm, 16.0, 'N16R8  2312', { h: 0.62, kleur });
  return p.decal('dc1', 'Opschrift kap', [0, P.pcb + P.module.h, 0]);
}

// ---------------------------------------------------------------- PCA9685-print (62,5 x 25,4, blauw)
/** beeld-x = x + 31,25, beeld-y = z + 12,7; servo-uitgangen 16 x 3, zijkanten 2 x 6, chip op z -7,6 tot -3,2 */
export function pcaArt(P) {
  const W = P.x, H = P.z, p = new Plaat(W, H, { masker: 'blauw', seed: 5 }), X = (x) => x + W / 2, Y = (z) => z + H / 2;
  const sx = (k) => X(-25.4 + k * 2.54 + Math.floor(k / 4) * 1.27), rij = (r) => Y(3.5 + r * 2.54);
  // V+ (middelste rij) en GND (onderste rij) als brede banen, de PWM-rij met een baan per kanaal naar de chip
  p.baan([[sx(0) - 1.5, rij(1)], [sx(15) + 1.5, rij(1)]], 0.9).baan([[sx(0) - 1.5, rij(2) + 1.2], [sx(15) + 1.5, rij(2) + 1.2]], 1.0);
  for (let k = 0; k < 16; k++) {
    const pin = k < 8 ? X(-4.2 + k * 0.65) : X(-4.2 + (k - 8) * 0.65);
    const yp = k < 8 ? Y(-2.6) : Y(-8.2);
    p.baan(k < 8 ? [[pin, yp], [pin, yp + 1.4], [sx(k), rij(0) - 2.0], [sx(k), rij(0)]] : [[pin, yp], [pin, yp - 0.9], [X(5.6) + (k - 8) * 0.0, Y(-9.1) - (k - 8) * 0.0], [X(6.4 + (k - 8) * 0.55), Y(-9.1)], [X(6.4 + (k - 8) * 0.55), Y(-1.4) + (k - 8) * 0.12], [sx(k), rij(0) - 2.0], [sx(k), rij(0)]], 0.22);
  }
  // I2C en voeding van de zijkanten naar de chip (GND OE SCL SDA VCC V+)
  for (const s of [-1, 1]) for (let r = 0; r < 6; r++) {
    const x = X(s * 29.2), y = Y(-6.35 + r * 2.54);
    p.ring(x, y, 1.6, 0.95, r === 0);
    if (r >= 1 && r <= 3) p.baan([[x, y], [X(s * 24.5), y], [X(s * 6.5), Y(-5.4 + (r - 2) * 0.65)]], 0.25);
  }
  p.baan([[X(-29.2), Y(-6.35 + 5 * 2.54)], [X(-27.4), rij(1)], [sx(0) - 1.5, rij(1)]], 0.8).baan([[X(29.2), Y(-6.35 + 5 * 2.54)], [X(27.4), rij(1)], [sx(15) + 1.5, rij(1)]], 0.8);
  for (let k = 0; k < 16; k++) for (let r = 0; r < 3; r++) p.ring(sx(k), rij(r), 1.6, 1.0, r === 0 && k === 0);
  for (const [x, z] of [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]]) { p.gat(X(x), Y(z), 2.6); p.cirkel(X(x), Y(z), 2.2, 0.15); }
  // TSSOP-28: 14 pads aan elke lange kant; 2 weerstanden en een condensator, een led
  for (let i = 0; i < 14; i++) { p.pad(X(-4.23 + i * 0.65), Y(-2.6), 0.35, 1.2); p.pad(X(-4.23 + i * 0.65), Y(-8.2), 0.35, 1.2); }
  for (const x of [0, 2.6]) { p.pad(X(x - 0.6), Y(-2.1), 0.7, 0.9); p.pad(X(x + 0.6), Y(-2.1), 0.7, 0.9); }
  p.pad(X(-8.6), Y(-5.4), 0.9, 0.8).pad(X(-8.6), Y(-3.8), 0.9, 0.8).pad(X(9.0), Y(-5.4), 0.9, 0.8).pad(X(9.0), Y(-3.8), 0.9, 0.8);
  for (const [x, y] of [[-6.8, -9.6], [6.8, -9.6], [-13.0, 0.2], [13.0, 0.2], [0, -10.6]]) p.via(X(x), Y(y));
  // opdruk
  for (let k = 0; k < 16; k++) p.tekst(sx(k), rij(0) - 2.05, String(k), { h: 0.8 });
  for (const [r, t] of [[0, 'PWM'], [1, 'V+'], [2, 'GND']]) p.tekst(sx(15) + 1.7, rij(r), t, { h: 0.7, anker: 'start' });
  for (let g = 0; g < 4; g++) p.kader(sx(g * 4) - 1.27, rij(0) - 1.27, 4 * 2.54, 3 * 2.54, 0.12);
  const zij = ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'];
  for (const s of [-1, 1]) zij.forEach((t, r) => p.tekst(X(s * 29.2) - s * 1.2, Y(-6.35 + r * 2.54), t, { h: 0.58, anker: s < 0 ? 'start' : 'end' }));
  p.kader(X(-4.85) - 0.35, Y(-7.6) - 0.35, 9.7 + 0.7, 4.4 + 0.7, 0.12).cirkel(X(-4.85) + 0.2, Y(-3.2) + 0.65, 0.18, 0.1, true);
  p.tekst(X(0), Y(-11.2), 'PCA9685  16-CH 12-BIT PWM  ·  I2C 0x40', { h: 0.85 });
  p.tekst(X(-13.5), Y(-9.0), 'A0 A1 A2 A3 A4 A5', { h: 0.62 });
  for (let i = 0; i < 6; i++) { p.pad(X(-17.3 + i * 1.53), Y(-7.6), 0.8, 0.8); p.pad(X(-17.3 + i * 1.53), Y(-6.6), 0.8, 0.8); }
  return p.decal('dc1', 'Opdruk en banen', [0, P.pcb, 0]);
}
export function pcaChipArt(P) {
  const p = opschrift(9.7, 4.4, [[4.85, 1.45, 'PCA9685PW', { h: 0.85 }], [4.85, 2.65, 'NXP 2X3415', { h: 0.6 }], [4.85, 3.55, 'TWD23412', { h: 0.55 }]], { kleur: '#a7a9ab' });
  p.cirkel(0.7, 3.6, 0.32, 0.06);
  return p.decal('dc1', 'Opschrift chip', [0, P.pcb + 1.1, -5.4]);
}

// ---------------------------------------------------------------- gaatjesprints (FR2) en de Pololu-regelaar
/** gaatjesraster van een print uit opbouw.mjs (P): de gaten op 2,54, niet bij de schroeven en de bijgeboorde gaten
 *  voor de afstandsbussen; cijfers (kolom, vanaf 1) en letters (rij) langs de rand zoals op de opbouwtekening */
export function gaatjesArt(P, vrij) {
  const p = new Plaat(P.w, P.h, { masker: 'fr2', seed: Math.round(P.w) });
  for (let c = 0; c < P.nx; c++) for (let r = 0; r < P.ny; r++) if (vrij(c, r)) p.gat(P.x0 + c * 2.54, P.y0 + r * 2.54, 1.0);
  for (const [x, y] of P.boringen) p.gat(x, y, 2.7);
  for (let c = 4; c < P.nx; c += 5) p.tekst(P.x0 + c * 2.54, Math.max(0.75, P.y0 - 1.6), String(c + 1), { h: 0.6, kleur: '#f4efe2' });
  for (let r = 0; r < P.ny; r += 2) p.tekst(Math.max(0.6, P.x0 - 1.6), P.y0 + r * 2.54, String.fromCharCode(65 + r), { h: 0.55, kleur: '#f4efe2' });
  return p.decal('dc1', 'Gaatjesraster', [0, 1.6, 0]);
}
export function pololuArt() {
  const W = 17.8, H = 12.7, p = new Plaat(W, H, { masker: 'groen', seed: 9 });
  const pins = ['EN', 'VIN', 'GND', 'VOUT', 'PG'];
  p.vlak([[0.8, 0.8], [W - 0.8, 0.8], [W - 0.8, 4.6], [0.8, 4.6]]);
  pins.forEach((t, i) => { const x = W / 2 + (i - 2) * 2.54; p.ring(x, H / 2 + 5.08, 1.6, 1.0, i === 0); p.tekst(x, H / 2 + 2.95, t, { h: 0.62 }); });
  p.baan([[W / 2 - 2.54, H / 2 + 5.08], [W / 2 - 2.54, H / 2 + 1.8], [W / 2 - 4.4, H / 2]], 0.6).baan([[W / 2 + 2.54, H / 2 + 5.08], [W / 2 + 2.54, H / 2 + 1.8], [W / 2 + 5.2, H / 2 - 0.2]], 0.6);
  for (let k = 0; k < 6; k++) p.pad(4.0 + (k % 3) * 0.95, 4.0 + Math.floor(k / 3) * 2.2, 0.4, 0.8);
  p.pad(W - 4.0, 4.2, 1.2, 1.0).pad(W - 4.0, 6.6, 1.2, 1.0);
  for (const [x, y] of [[2.0, 2.0], [W - 2.0, 2.0], [W / 2, 2.6]]) p.via(x, y, 0.5);
  p.tekst(W / 2 - 4.3, 1.6, 'D24V10F5', { h: 0.7 });
  return p.decal('dc1', 'Opdruk en banen', [0, 1.0, 0]);
}

// ---------------------------------------------------------------- opschriften op losse onderdelen
/** n behuizingen op een rij (steek, lichaam l x b, bovenkant y): per behuizing de regels tekst en een pin-1-merk */
export function rijOpschrift(n, steek, l, b, y, regels, { kerf = true } = {}) {
  const L = n * steek, p = opschrift(L, b, []);
  for (let i = 0; i < n; i++) {
    const x = steek * (i + 0.5);
    regels.forEach(([t, h], k) => p.tekst(x, b / 2 + (k - (regels.length - 1) / 2) * h * 1.5, t, { h, kleur: '#c4c6c8' }));
    if (kerf) p.cirkel(x - l / 2 + 0.8, b - 0.8, 0.3, 0.07);
    else p.eigen(`<path d="M${x - l / 2} ${b / 2 - 0.6} a0.6 0.6 0 0 1 0 1.2" fill="#0a0a0b"/>`);
  }
  return p.decal('dc1', 'Opschrift', [0, y, 0]);
}
/** de bovenkant van een elco: blank aluminium met de breukkerf in een K */
export function elcoArt(d, h) {
  const p = opschrift(d, d, []), c = d / 2;
  p.eigen(`<circle cx="${c}" cy="${c}" r="${c}" fill="#c9ccd0"/><circle cx="${c}" cy="${c}" r="${c * 0.82}" fill="none" stroke="#9fa3a8" stroke-width="0.12"/>`
    + `<path d="M${c - c * 0.5} ${c - c * 0.55}v${c * 1.1}M${c - c * 0.5} ${c}L${c + c * 0.45} ${c - c * 0.55}M${c - c * 0.5} ${c}L${c + c * 0.45} ${c + c * 0.55}" stroke="#7f848a" stroke-width="0.16" fill="none"/>`);
  return p.decal('dc1', 'Bovenkant', [0, h, 0]);
}
export function zekeringArt() {
  const p = opschrift(18.5, 3.8, [[9.25, 1.95, '7.5', { h: 2.0, vet: true }]], { kleur: '#f3efe6' });
  return p.decal('dc1', 'Opschrift', [0, 15.8, 0]);
}
