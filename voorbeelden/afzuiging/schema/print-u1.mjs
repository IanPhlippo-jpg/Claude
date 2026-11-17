// Opbouw van de gaatjesprint -U1 (40 x 50 mm, raster 2,54) in de voedingsbox (sinds versie 7.2): waar elk onderdeel staat
// (bovenaanzicht, onderdeelzijde), welke gaatjes het gebruikt en de draadbruggen aan de soldeerzijde per net. Een
// voorstel dat de netlijst van het aansluitschema volgt; maak-schema.mjs tekent er blad 11 van (opstellingsplan) en
// controleert dat geen twee onderdelen hetzelfde gaatje gebruiken en dat elk net verbonden is.
// Raster: kolom i = 0..14 (x = 2,22 + 2,54 i), rij j = 0..18 (z = 1,86 + 2,54 j), gezien van boven met de voorkant van de
// box onderaan (de schakelaar -Q4 zit sinds 7.4 in de achterwand, boven); de 4 hoekgaten Ø2 (M2,5) zijn geen rastergaten.
// 7.4: -C1 geschrapt (P3-6); -R13 aan de soldeerzijde op de pennen van -X1; tachoklem -R15/-R16 (2 x BAT85, P3-7) bij
// GPIO4: rij 4 is helemaal GPIO4 (recht boven -K1.GPIO4), rij 3 de andere kant (M, M, L3).
export const PRINT = { b: 40, h: 50, x0: 2.22, z0: 1.86, steek: 2.54, ni: 15, nj: 19, hoekgaten: [[3, 3], [37, 3], [3, 47], [37, 47]] };
export const gx = (i) => PRINT.x0 + PRINT.steek * i;
export const gz = (j) => PRINT.z0 + PRINT.steek * j;

/** onderdelen: aanduiding, omschrijving, omtrek [i0, j0, i1, j1] in rastercellen (inclusief), pennen { naam: [i, j] } */
export const ONDERDELEN = [
  { code: '-T3', naam: 'D24V10F5', omtrek: [3, 0, 9, 4], pennen: { VIN: [3, 1], GND: [3, 2], VOUT: [3, 3] }, noot: 'pinvolgorde op het bordje nakijken' },
  { code: '-C2', naam: '47 µF', rond: 3.15, omtrek: [1, 2, 1, 3], pennen: { '+': [1, 2], '-': [1, 3] } },
  { code: '-F1', naam: 'T 3,15 A', omtrek: [10, 1, 12, 2], pennen: { 1: [12, 1], 2: [10, 1] } }, // 7.4: 1 rechts (naar -Q4), 2 links (L+ over rij 1)
  // 7.4: -R15 (GPIO4 -> L3) en -R16 (M -> GPIO4), BAT85 staand (DO-35 past in het raster van 2,54, de BAT54S niet: SOT-23)
  { code: '-R16', naam: 'BAT85', omtrek: [10, 3, 10, 4], pennen: { A: [10, 3], K: [10, 4] }, staand: true },
  { code: '-C3', naam: '10 nF', omtrek: [11, 3, 11, 4], pennen: { 2: [11, 3], 1: [11, 4] }, staand: true },
  { code: '-R15', naam: 'BAT85', omtrek: [12, 3, 12, 4], pennen: { K: [12, 3], A: [12, 4] }, staand: true },
  { code: '-R14', naam: '1 kΩ', omtrek: [13, 4, 14, 4], pennen: { 1: [13, 4], 2: [14, 4] }, stil: true }, // stil: geen pennummers (plaats)
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
  { code: '-X1', naam: '', noot: 'klem 24 V; -R13 eronder op de pennen', omtrek: [11, 14, 13, 15], pennen: { 1: [11, 15], 2: [13, 15] } },
  { code: '-Q1', naam: 'BC547', omtrek: [2, 17, 4, 17], pennen: { C: [2, 17], B: [3, 17], E: [4, 17] } },
  { code: '-R1', naam: '1 kΩ', omtrek: [2, 18, 3, 18], pennen: { 1: [2, 18], 2: [3, 18] } },
  { code: '-R11', naam: '10 kΩ', omtrek: [5, 17, 5, 18], pennen: { 1: [5, 17], 2: [5, 18] }, staand: true },
  { code: '-Q3', naam: 'BC547', omtrek: [6, 17, 8, 17], pennen: { C: [6, 17], B: [7, 17], E: [8, 17] } },
  { code: '-R6', naam: '1 kΩ', omtrek: [6, 18, 7, 18], pennen: { 1: [6, 18], 2: [7, 18] } },
  { code: '-Q2', naam: 'IRF4905', omtrek: [9, 17, 11, 17], pennen: { G: [9, 17], D: [10, 17], S: [11, 17] }, noot: 'staand, de metalen rug naar achter' },
  { code: '-R5', naam: '10 kΩ', omtrek: [8, 18, 9, 18], pennen: { 1: [9, 18], 2: [8, 18] } },
  { code: '-R4', naam: '10 kΩ', omtrek: [10, 18, 11, 18], pennen: { 1: [11, 18], 2: [10, 18] } },
];
// draden van de print naar buiten (soldeerogen aan de rand; met 'op' aan de soldeerzijde op een pen gesoldeerd): -Q4 (schakelaar in de achterwand), -X9 (M8-stekker in de
// linkerwand, naar de ventilator), -X8 (USB-C). 24 V en M 0,5 mm², signalen 0,25 mm²
export const DRADEN = [
  // 7.4: -Q4:1 aan de soldeerzijde op de pen -X1.1 (naast -R13); -Q4:2 aan de achterrand, recht boven -F1.1
  { code: '-Q4:1', op: '-X1.1', net: 'X1+', draad: '0,5 mm²' }, { code: '-Q4:2', cel: [12, 0], net: 'Q4', draad: '0,5 mm²' },
  { code: '-X9:1', cel: [10, 15], net: 'FAN+', draad: '0,5 mm²' }, { code: '-X9:3', cel: [14, 16], net: 'M', draad: '0,5 mm²' },
  { code: '-X9:4', cel: [0, 16], net: 'PWM', draad: '0,25 mm²' }, { code: '-X9:2', cel: [14, 12], net: 'TACHO', draad: '0,25 mm²' },
  { code: '-X8:VBUS', cel: [13, 12], net: 'L5', draad: '0,25 mm²' }, { code: '-X8:GND', cel: [13, 13], net: 'M', draad: '0,25 mm²' },
  { code: '-X8:CC1', cel: [14, 13], net: 'CC1', draad: '0,25 mm²' }, { code: '-X8:CC2', cel: [12, 16], net: 'CC2', draad: '0,25 mm²' },
];
/** de netlijst (zoals het aansluitschema, bladen 3 tot 5): net -> pennen 'code.pen' */
export const NETTEN = {
  'X1+': ['-X1.1', '-Q4:1'],
  Q4: ['-Q4:2', '-F1.1'],
  'L+': ['-F1.2', '-C2.+', '-T3.VIN', '-Q2.S', '-R4.1'],
  M: ['-X1.2', '-C3.2', '-R16.A', '-C2.-', '-T3.GND', '-Q1.E', '-Q3.E', '-R11.2', '-B1.GND', '-K1.GND', '-X9:3', '-X8:GND'],
  L5: ['-T3.VOUT', '-R9.1', '-R10.1', '-X8:VBUS'],
  '5V K1': ['-K1.5V'], // via -R12 op de soldeerzijde (OP_PENNEN)
  L3: ['-R15.K', '-K1.3V3', '-R2.1', '-R3.1', '-R7.1', '-R8.1', '-B1.VDD'],
  PWM_GPIO: ['-K1.GPIO3', '-R1.1'],
  Q1B: ['-R1.2', '-Q1.B', '-R2.2'],
  PWM: ['-Q1.C', '-X9:4'],
  GPIO4: ['-K1.GPIO4', '-R15.A', '-C3.1', '-R16.K', '-R14.1'],
  TACHO: ['-R14.2', '-X9:2', '-R3.2'],
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
/** 7.4: vaste draadbruggen (rastercellen, van pen tot pen) waar de print vol zit; de rest legt maak-schema.mjs zelf.
 *  L+ over rij 1 (onder -T3, daar zitten geen pennen), kolom 5 (onder -B1) en rij 16 naar -Q2.S; M van -X1.2 over rij 14 en
 *  kolom 8 naar -Q3.E en bovenaan van -R16.A, -T3.GND en -C2.- naar -K1.GND; L3 van -R15.K over rij 2 (onder -F1) naar -K1.3V3; FAN+ recht van
 *  -Q2.D naar het oog -X9:1. Kruisingen zonder stip zijn geen verbinding (geïsoleerd draad). */
export const VAST = {
  'L+': [[[10, 1], [3, 1], [2, 1], [2, 2], [1, 2]], [[5, 1], [5, 16], [11, 16], [11, 17], [11, 18]]],
  M: [[[13, 15], [13, 14], [8, 14], [8, 17]], [[13, 14], [13, 13]], [[13, 15], [13, 16], [14, 16]], [[11, 3], [10, 3], [8, 3], [8, 5]],
    [[3, 2], [8, 2], [8, 3]], [[1, 3], [1, 4], [8, 4]]],
  L3: [[[12, 3], [12, 2], [9, 2], [9, 5]]],
  'FAN+': [[[10, 17], [10, 15]]],
};
/** 7.4: diodes aan de soldeerzijde, met de poten op twee pennen gesoldeerd (geen eigen gaatjes): -R13 (SB560) over -X1
 *  (DO-201AD past niet in het raster) en -R12 (1N5819) van -T3.VOUT naar -K1.5V (zo blijft de hoek rechtsboven vrij voor
 *  de tachoklem). ring = de pen aan de kant van de kathode */
export const OP_PENNEN = [
  { code: '-R13', naam: 'SB560', van: '-X1.1', naar: '-X1.2', ring: '-X1.1' },
  { code: '-R12', naam: '1N5819', van: '-T3.VOUT', naar: '-K1.5V', ring: '-K1.5V', label: [1.6, -1.5, 'start'] },
];
export const KLEUR = { 'L+': '#c62828', 'X1+': '#c62828', Q4: '#c62828', 'FAN+': '#c62828', M: '#1565c0', L5: '#ef6c00', '5V K1': '#ef6c00', L3: '#8d6e63' };

/** de cel van een pen 'code.pen' of van een draad 'code:pen' */
export function cel(ref) {
  const d = DRADEN.find((x) => x.code === ref);
  if (d) return d.op ? cel(d.op) : d.cel;
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
  for (const d of DRADEN) if (!d.op) zet(d.cel, d.code);
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
  for (const d of DRADEN) if (!d.op && vlak.has(d.cel.join(','))) throw new Error(`${d.code} ligt onder ${vlak.get(d.cel.join(','))}`);
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
