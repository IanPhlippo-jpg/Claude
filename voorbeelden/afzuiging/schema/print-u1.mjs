// Opbouw van de gaatjesprint -U1 (40 x 50 mm, raster 2,54) in de voedingsbox, versie 7.2: waar elk onderdeel staat
// (bovenaanzicht, onderdeelzijde), welke gaatjes het gebruikt en de draadbruggen aan de soldeerzijde per net. Een
// voorstel dat de netlijst van het aansluitschema volgt; maak-schema.mjs tekent er blad 11 van (opstellingsplan) en
// controleert dat geen twee onderdelen hetzelfde gaatje gebruiken en dat elk net verbonden is.
// Raster: kolom i = 0..14 (x = 2,22 + 2,54 i), rij j = 0..18 (z = 1,86 + 2,54 j), gezien van boven met de voorkant van de
// box (de schakelaar) onderaan; de 4 hoekgaten Ø2 (M2,5) zijn geen rastergaten.
export const PRINT = { b: 40, h: 50, x0: 2.22, z0: 1.86, steek: 2.54, ni: 15, nj: 19, hoekgaten: [[3, 3], [37, 3], [3, 47], [37, 47]] };
export const gx = (i) => PRINT.x0 + PRINT.steek * i;
export const gz = (j) => PRINT.z0 + PRINT.steek * j;

/** onderdelen: aanduiding, omschrijving, omtrek [i0, j0, i1, j1] in rastercellen (inclusief), pennen { naam: [i, j] } */
export const ONDERDELEN = [
  { code: '-T3', naam: 'D24V10F5', omtrek: [3, 0, 9, 4], pennen: { VIN: [3, 1], GND: [3, 2], VOUT: [3, 3] }, noot: 'pinvolgorde op het bordje nakijken' },
  { code: '-C2', naam: '47 µF', rond: 3.15, omtrek: [1, 2, 1, 3], pennen: { '+': [1, 2], '-': [1, 3] } },
  { code: '-F1', naam: 'T 3,15 A', omtrek: [10, 1, 12, 2], pennen: { 1: [10, 1], 2: [12, 1] } },
  { code: '-R12', naam: '1N5819', omtrek: [13, 2, 13, 3], pennen: { A: [13, 2], K: [13, 3] }, staand: true },
  { code: '-R14', naam: '1 kΩ', omtrek: [11, 3, 11, 4], pennen: { 1: [11, 3], 2: [11, 4] }, staand: true },
  { code: '-C3', naam: '10 nF', omtrek: [12, 3, 12, 4], pennen: { 1: [12, 3], 2: [12, 4] }, staand: true },
  { code: '-B1', naam: 'SDP810', omtrek: [0, 5, 6, 15], pennen: { VDD: [1, 15], GND: [2, 15], SDA: [3, 15], SCL: [4, 15] }, noot: 'poorten naar boven; aansluitingen volgens het datablad' },
  { code: '-K1', naam: 'ESP32-C3 SuperMini', omtrek: [7, 5, 14, 11], pennen: {
    '5V': [7, 5], GND: [8, 5], '3V3': [9, 5], GPIO4: [10, 5], GPIO3: [11, 5], GPIO7: [12, 5], GPIO5: [7, 11], GPIO6: [8, 11] },
    noot: 'USB-C naar rechts; alleen de gebruikte pinnen getekend: nakijken op de opdruk' },
  { code: '-R2', naam: '10 kΩ', omtrek: [7, 12, 7, 13], pennen: { 1: [7, 12], 2: [7, 13] }, staand: true },
  { code: '-R3', naam: '10 kΩ', omtrek: [8, 12, 8, 13], pennen: { 1: [8, 12], 2: [8, 13] }, staand: true },
  { code: '-R7', naam: '4,7 kΩ', omtrek: [9, 12, 9, 13], pennen: { 1: [9, 12], 2: [9, 13] }, staand: true },
  { code: '-R8', naam: '4,7 kΩ', omtrek: [10, 12, 10, 13], pennen: { 1: [10, 12], 2: [10, 13] }, staand: true },
  { code: '-R9', naam: '56 kΩ', omtrek: [11, 12, 11, 13], pennen: { 1: [11, 12], 2: [11, 13] }, staand: true },
  { code: '-R10', naam: '56 kΩ', omtrek: [12, 12, 12, 13], pennen: { 1: [12, 12], 2: [12, 13] }, staand: true },
  { code: '-X1', naam: 'klem 24 V', omtrek: [11, 14, 13, 15], pennen: { 1: [11, 15], 2: [13, 15] } },
  { code: '-Q1', naam: 'BC547', omtrek: [2, 17, 4, 17], pennen: { C: [2, 17], B: [3, 17], E: [4, 17] } },
  { code: '-R1', naam: '1 kΩ', omtrek: [2, 18, 3, 18], pennen: { 1: [2, 18], 2: [3, 18] } },
  { code: '-R11', naam: '10 kΩ', omtrek: [5, 17, 5, 18], pennen: { 1: [5, 17], 2: [5, 18] }, staand: true },
  { code: '-Q3', naam: 'BC547', omtrek: [6, 17, 8, 17], pennen: { C: [6, 17], B: [7, 17], E: [8, 17] } },
  { code: '-R6', naam: '1 kΩ', omtrek: [6, 18, 7, 18], pennen: { 1: [6, 18], 2: [7, 18] } },
  { code: '-Q2', naam: 'IRF4905', omtrek: [9, 17, 11, 17], pennen: { G: [9, 17], D: [10, 17], S: [11, 17] }, noot: 'staand, de metalen rug naar achter' },
  { code: '-R5', naam: '10 kΩ', omtrek: [8, 18, 9, 18], pennen: { 1: [9, 18], 2: [8, 18] } },
  { code: '-R4', naam: '10 kΩ', omtrek: [10, 18, 11, 18], pennen: { 1: [11, 18], 2: [10, 18] } },
];
// draden van de print naar buiten (soldeerogen aan de rand): -Q4 (schakelaar), -X9 (M8 naar de ventilator), -X8 (USB-C)
export const DRADEN = [
  { code: '-Q4:1', cel: [14, 14], net: 'X1+', draad: '0,75 mm²' }, { code: '-Q4:2', cel: [14, 15], net: 'Q4', draad: '0,75 mm²' },
  { code: '-X9:1', cel: [13, 16], net: 'FAN+', draad: '0,5 mm²' }, { code: '-X9:3', cel: [14, 16], net: 'M', draad: '0,5 mm²' },
  { code: '-X9:4', cel: [0, 16], net: 'PWM', draad: '0,25 mm²' }, { code: '-X9:2', cel: [14, 12], net: 'TACHO', draad: '0,25 mm²' },
  { code: '-X8:VBUS', cel: [13, 12], net: 'L5', draad: '0,25 mm²' }, { code: '-X8:GND', cel: [13, 13], net: 'M', draad: '0,25 mm²' },
  { code: '-X8:CC1', cel: [14, 13], net: 'CC1', draad: '0,25 mm²' }, { code: '-X8:CC2', cel: [11, 16], net: 'CC2', draad: '0,25 mm²' },
  // -C1 (470 µF / 50 V, Ø10 x 20) en -R13 (SB560, over -C1 gesoldeerd, de ring aan +) staan naast de print op de bodem
  // van de box: op de print passen ze niet meer
  { code: '-C1:+', cel: [8, 15], net: 'L+', draad: '0,5 mm²' }, { code: '-C1:-', cel: [9, 15], net: 'M', draad: '0,5 mm²' },
];
/** de netlijst (zoals het aansluitschema, bladen 3 tot 5): net -> pennen 'code.pen' */
export const NETTEN = {
  'X1+': ['-X1.1', '-Q4:1'],
  Q4: ['-Q4:2', '-F1.1'],
  'L+': ['-F1.2', '-C1:+', '-C2.+', '-T3.VIN', '-Q2.S', '-R4.1'],
  M: ['-X1.2', '-C1:-', '-C2.-', '-T3.GND', '-Q1.E', '-Q3.E', '-R11.2', '-B1.GND', '-K1.GND', '-C3.2', '-X9:3', '-X8:GND'],
  L5: ['-T3.VOUT', '-R12.A', '-R9.1', '-R10.1', '-X8:VBUS'],
  '5V K1': ['-R12.K', '-K1.5V'],
  L3: ['-K1.3V3', '-R2.1', '-R3.1', '-R7.1', '-R8.1', '-B1.VDD'],
  PWM_GPIO: ['-K1.GPIO3', '-R1.1'],
  Q1B: ['-R1.2', '-Q1.B', '-R2.2'],
  PWM: ['-Q1.C', '-X9:4'],
  GPIO4: ['-K1.GPIO4', '-R14.1', '-C3.1'],
  TACHO: ['-R14.2', '-R3.2', '-X9:2'],
  GPIO7: ['-K1.GPIO7', '-R6.1'],
  Q3B: ['-R6.2', '-Q3.B', '-R11.1'],
  Q3C: ['-Q3.C', '-R5.2'],
  GATE: ['-R5.1', '-R4.2', '-Q2.G'],
  'FAN+': ['-Q2.D', '-X9:1'],
  SDA: ['-K1.GPIO5', '-R7.2', '-B1.SDA'],
  SCL: ['-K1.GPIO6', '-R8.2', '-B1.SCL'],
  CC1: ['-R9.2', '-X8:CC1'],
  CC2: ['-R10.2', '-X8:CC2'],
};
export const KLEUR = { 'L+': '#c62828', 'X1+': '#c62828', Q4: '#c62828', 'FAN+': '#c62828', M: '#1565c0', L5: '#ef6c00', '5V K1': '#ef6c00', L3: '#8d6e63' };

/** de cel van een pen 'code.pen' of van een draad 'code:pen' */
export function cel(ref) {
  const d = DRADEN.find((x) => x.code === ref);
  if (d) return d.cel;
  const [code, pen] = [ref.slice(0, ref.indexOf('.')), ref.slice(ref.indexOf('.') + 1)];
  const o = ONDERDELEN.find((x) => x.code === code);
  if (!o || !o.pennen[pen]) throw new Error(`onbekende pen ${ref}`);
  return o.pennen[pen];
}

/** controle: geen gaatje twee keer, elke pen in precies één net, alle pennen binnen het raster */
export function controleer() {
  const bezet = new Map();
  const zet = (c, wie) => {
    const k = c.join(',');
    if (c[0] < 0 || c[0] >= PRINT.ni || c[1] < 0 || c[1] >= PRINT.nj) throw new Error(`${wie} buiten het raster`);
    if (bezet.has(k)) throw new Error(`gaatje ${k} dubbel: ${bezet.get(k)} en ${wie}`);
    bezet.set(k, wie);
  };
  for (const o of ONDERDELEN) for (const [p, c] of Object.entries(o.pennen)) zet(c, `${o.code}.${p}`);
  for (const d of DRADEN) zet(d.cel, d.code);
  // geen gaatje te dicht bij een hoekgat (de kop van de M2,5: Ø4,5 plus marge)
  for (const [k, wie] of bezet) {
    const [i, j] = k.split(',').map(Number);
    for (const [hx, hz] of PRINT.hoekgaten) if (Math.hypot(gx(i) - hx, gz(j) - hz) < 2.8) throw new Error(`${wie} te dicht bij het hoekgat`);
  }
  // omtrekken overlappen niet (behalve de rand van een rond onderdeel)
  const vlak = new Map();
  for (const o of ONDERDELEN) {
    const [i0, j0, i1, j1] = o.omtrek;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = `${i},${j}`;
      if (vlak.has(k)) throw new Error(`${o.code} overlapt ${vlak.get(k)} in ${k}`);
      vlak.set(k, o.code);
    }
  }
  for (const d of DRADEN) if (vlak.has(d.cel.join(','))) throw new Error(`${d.code} ligt onder ${vlak.get(d.cel.join(','))}`);
  const inNet = new Map();
  for (const [n, refs] of Object.entries(NETTEN)) for (const r of refs) {
    cel(r);
    if (inNet.has(r)) throw new Error(`${r} in twee netten`);
    inNet.set(r, n);
  }
  const alle = [...ONDERDELEN.flatMap((o) => Object.keys(o.pennen).map((p) => `${o.code}.${p}`)), ...DRADEN.map((d) => d.code)];
  const los = alle.filter((r) => !inNet.has(r));
  if (los.length) throw new Error(`niet verbonden: ${los.join(', ')}`);
  return { gaatjes: bezet.size, netten: Object.keys(NETTEN).length };
}
