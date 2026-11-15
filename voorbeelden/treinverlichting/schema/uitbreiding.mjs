// Versie 6 (Ian, 2026-11-15) in het aansluitschema: IR zenden en ontvangen (blad "IR"), servo's en extra ingangen met
// NPN of PNP (blad "Servo's"), en de stuklijst van de uitbreiding. Wensen van Ian: "Treindoos moet IR leds, IR sensors,
// FTR sensoren moeten kunnen binnenlezen, uitsturen." "Wissels, seinen of slagbomen moeten ook kunnen." "PNP moeten ook
// kunnen." De plaats van deze modules in de doos volgt in fase B (opbouw.mjs, montageblad); daarom een eigen stuklijst.
// Vrije GPIO's: 47 (IR zenden), 48, 11, 39, 42 (IR ontvangen); de rest gaat over I2C (MCP23017 0x20 en 0x21, PCA9685
// 0x42 voor de servo's; 0x40 = lichtgroepen 1-16, 0x41 blijft vrij voor 17-32).
import { L, T, punt, weerstand, weerstandH, condensator, zekering, klem, nmos, opto, toestel, rail, onderbreking, ref, aansluiting, motor } from '../../lib/eplan.mjs';

const RECHTS = 405;

/** IR-led (anode boven (x, y), kathode onder (x, y + 14)) met 2 pijltjes naar buiten */
function irLed(x, y, code, waarde) {
  return [L([[x, y], [x, y + 4.5]]), `<polygon points="${x - 3},${y + 4.5} ${x + 3},${y + 4.5} ${x},${y + 9.5}" fill="none" stroke="#000" stroke-width="0.35"/>`,
    L([[x - 3, y + 9.5], [x + 3, y + 9.5]], { w: 0.5 }), L([[x, y + 9.5], [x, y + 14]]),
    L([[x + 3.5, y + 5], [x + 6.5, y + 3]], { w: 0.25 }), L([[x + 3.5, y + 7.5], [x + 6.5, y + 5.5]], { w: 0.25 }),
    `<polygon points="${x + 6.5},${y + 3} ${x + 5},${y + 3.2} ${x + 5.8},${y + 4.4}" fill="#000"/>`, `<polygon points="${x + 6.5},${y + 5.5} ${x + 5},${y + 5.7} ${x + 5.8},${y + 6.9}" fill="#000"/>`,
    T(x + 4, y + 12, code, { size: 2.0 }), waarde ? T(x + 4, y + 14.6, waarde, { size: 1.7 }) : ''].join('');
}
/** maakcontact verticaal van (x, y) naar (x, y + 14) */
function contact(x, y, tekst) {
  return [L([[x, y], [x, y + 4]]), L([[x, y + 4], [x - 3.2, y + 10]], { w: 0.35 }), L([[x, y + 10], [x, y + 14]]), tekst ? T(x + 1.5, y + 8, tekst, { size: 1.8 }) : ''].join('');
}

/** blad IR: 8 IR-leds met hun schakeluitgang (-Q4 via -K5) in serie met de snelle modulatie-MOSFET (-Q3, GPIO47), en de 4 ontvangers */
export function irBlad(B) {
  const i = [], ym = 236, xs = (n) => 44 + (n - 1) * 21;
  i.push(rail(28, 25, 222, 'L+', { van: ref(B.voeding, RECHTS) }), rail(ym, 25, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  for (let n = 1; n <= 8; n++) {
    const x = xs(n);
    i.push(punt(x, 28), weerstand(x, 28, `-R${9 + n}`, n === 1 ? '120 Ω' : ''));
    i.push(L([[x, 48], [x, 50.8]]), klem(x, 52, '-X9', String(n), { kant: 'links' }), L([[x, 53.2], [x, 56]]));
    i.push(irLed(x, 56, `-E${20 + n}`, n === 1 ? 'TSAL6200' : ''), L([[x, 70], [x, 88]]));
  }
  i.push(T(26, 63, 'in het', { size: 1.9 }), T(26, 66, 'veld', { size: 1.9 }), T(120, 26.4, 'L+ = de klemmen n+ van -Q4 (VIN+)', { size: 2.0 }));
  // -Q4: 8-kanaals MOSFET-module (zoals -Q1), per kanaal een N-MOSFET; de sources samen op VIN−
  i.push(toestel(30, 88, 182, 44, '-Q4', [], []));
  for (let n = 1; n <= 8; n++) {
    const x = xs(n);
    i.push(aansluiting(x, 88, `${n}−`, 'end'), L([[x, 88], [x, 95]]), nmos(x - 2, 104, '', '', false), L([[x, 113], [x, 116]]), punt(x, 116));
    i.push(L([[x - 11, 104], [x - 13, 104], [x - 13, 132]]), aansluiting(x - 13, 132, `IN${n}`, 'start'), L([[x - 13, 132], [x - 13, 140]]));
  }
  i.push(L([[xs(1), 116], [212, 116]]), aansluiting(212, 116, 'VIN−', 'end'));
  // -Q3: snelle MOSFET-module zonder optocoupler (AOD4184): moduleert alle IR-leds samen met de draaggolf van GPIO47
  i.push(L([[212, 116], [262, 116], [262, 121]]), toestel(240, 112, 48, 46, '-Q3', [], []), nmos(260, 130, '', '', true), T(266, 146, 'AOD4184', { size: 2.0 }));
  i.push(T(265, 153, 'zonder optocoupler', { size: 1.9 }), T(265, 156, '(snel: 30-56 kHz)', { size: 1.9 }));
  i.push(L([[251, 130], [244, 130], [244, 150], [228, 150]]), onderbreking(228, 150, 'GPIO47 (RMT)', ref(B.besturing, 160), 'links'));
  i.push(L([[262, 139], [262, ym]]), punt(262, ym));
  // -K5: MCP23017, GPA0..7 = schakeluitgangen IR-led 1..8, GPB0..7 = ingangen 17..24 (blad Servo's)
  i.push(toestel(26, 140, 186, 34, '-K5', ['', '', 'MCP23017, I2C 0x20 (A0, A1, A2 aan GND), VCC = L3, GND = M; RESET aan L3', 'GPA0..GPA7 → IN1..IN8 van -Q4 (hoog = die IR-led doet mee)', 'GPB0..GPB7 ← ingangen 17..24 (blad Servo\'s)'], []));
  for (let n = 1; n <= 8; n++) i.push(aansluiting(xs(n) - 13, 140, `GPA${n - 1}`, 'start'));
  i.push(L([[60, 174], [60, 190]]), onderbreking(60, 190, 'SDA', ref(B.besturing, 300), 'onder'), L([[80, 174], [80, 190]]), onderbreking(80, 190, 'SCL', ref(B.besturing, 300), 'onder'));
  i.push(aansluiting(60, 174, 'SDA'), aansluiting(80, 174, 'SCL'));
  i.push(L([[180, 174], [180, 190]]), onderbreking(180, 190, 'GPB0..7', ref(B.servo, 300), 'onder'), aansluiting(180, 174, 'GPB'));
  // ontvangers: -B1 leerontvanger in de doos (GPIO48), -B2..-B4 op de baan (GPIO11, 39, 42), met RC-filter 100 Ω + 4,7 µF
  const ontv = [['-B1', 'TSMP58000 (leren)', 'achter het venster', 'GPIO48'], ['-B2', 'TSOP38238 of FTR', 'op de baan', 'GPIO11'], ['-B3', 'TSOP38238 of FTR', 'op de baan', 'GPIO39'], ['-B4', 'TSOP38238 of FTR', 'op de baan', 'GPIO42']];
  i.push(L([[300, 34], [300, 40 + 3 * 48]], { w: 0.35 }), onderbreking(300, 34, 'L3', ref(B.besturing, 220), 'boven'));
  ontv.forEach(([b, type, waar, gpio], k) => {
    const y = 44 + k * 48;
    // -B1 in de doos zit kort bij de ESP (3,3 V van J1:2): geen RC-filter; -B2..-B4 op de baan: 100 Ω + 4,7 µF bij de ontvanger
    if (k === 0) i.push(punt(300, y), L([[300, y], [334, y]]), T(304, y - 1.5, 'van -K1 J1:2', { size: 1.8 }), L([[334, y + 22], [322, y + 22], [322, y + 28]]));
    else i.push(punt(300, y), weerstandH(300, y, `-R${18 + k}`, '100 Ω'), punt(322, y), condensator(322, y, `-C${1 + k}`, '4,7 µF'), L([[322, y + 16], [322, y + 22], [334, y + 22]]), L([[320, y], [334, y]]));
    i.push( toestel(334, y - 6, 48, 32, b, ['', '', type, waar], [{ x: 0, y: 6, naam: 'Vs' }, { x: 0, y: 28, naam: 'GND' }, { x: 48, y: 18, naam: 'OUT' }]));
    i.push(L([[322, y + 22], [322, y + 28], [328, y + 28]]), L([[328, y + 28], [328, y + 34]]), onderbreking(328, y + 34, 'M', '', 'onder'));
    i.push(L([[382, y + 12], [400, y + 12]]), onderbreking(400, y + 12, gpio, ref(B.besturing, 160), 'rechts'));
  });
  i.push(T(25, 200, '-E21..-E28: IR-led 940 nm (Vishay TSAL6200), op de baan; per led -R10..-R17 120 Ω 0,5 W (pootje in de klem n+ van -Q4, het andere in -X9 WAGO 221-2411): piek 89 mA, gemiddeld ± 15 mA (§9).', { size: 2.2 }));
  i.push(T(25, 205, 'IR-led n brandt alleen als GPAn hoog is (-Q4 kanaal n aan) EN GPIO47 de draaggolf geeft (-Q3): één gemoduleerd signaal, een schakeluitgang per led. Codering NEC, RC5 of raw (geleerd).', { size: 2.2 }));
  i.push(T(25, 210, 'Leren: -B1 (TSMP58000) geeft de draaggolf door: de firmware meet frequentie en pulstijden van de eigen zender van Ian. -B2..-B4: gedemoduleerd (38 kHz), actief laag; een FTR-reflexsensor', { size: 2.2 }));
  i.push(T(25, 215, '(fototransistor, TCRT5000-module, AANNAME) werkt op dezelfde klem als hij op 3,3 V werkt. Ontvangers op de baan: 3,3 V uit -X12, 0 V uit -X13, kabel getwist, hoogstens 3 m (AANNAME), RC-filter bij de ontvanger.', { size: 2.2 }));
  i.push(T(25, 227, '-Q4: 8-kanaals MOSFET-module met optocouplers (zoals -Q1), VCC = L3, VIN+ = L+: kanaal n aan = IR-led n doet mee. -Q3: MOSFET-module AOD4184 zonder optocoupler (snel genoeg voor de draaggolf).', { size: 2.2 }));
  i.push(T(25, 222, 'Kruisverwijzingen naar blad 6 (besturing): GPIO47, GPIO48, GPIO11, GPIO39, GPIO42, SDA, SCL en L3 (3,3 V). Plaats in de doos: TRN-10 en TRN-11.', { size: 2.2 }));
  return { titel: ['IR', 'zenden en ontvangen'], inhoud: i };
}

/** blad Servo's: tweede PCA9685 op 50 Hz met eigen 5,5 V-voeding, en de extra ingangen met NPN of PNP */
export function servoBlad(B) {
  const i = [], ym = 236;
  i.push(rail(28, 25, 120, 'L+', { van: ref(B.voeding, RECHTS) }), rail(ym, 25, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  // voeding servo's: -F19, -T3 (12 -> 5,5 V), -C5 1000 µF, rail V6
  i.push(punt(35, 28), L([[35, 28], [35, 48]]), zekering(35, 48, '-F19', 'ATO 3 A'), L([[55, 48], [62, 48]]));
  i.push(toestel(62, 40, 46, 30, '-T3', ['', '', 'XL4015-module', '12 → 5,5 V, 5 A', '(eerst instellen!)'], [{ x: 0, y: 8, naam: 'IN+' }, { x: 0, y: 24, naam: 'IN−' }, { x: 46, y: 8, naam: 'OUT+' }, { x: 46, y: 24, naam: 'OUT−' }]));
  i.push(L([[62, 64], [48, 64], [48, 76]]), onderbreking(48, 78, 'M', '', 'onder'));
  i.push(L([[108, 48], [RECHTS - 10, 48]], { w: 0.35 }), T(112, 46.4, 'V6 (5,5 V servo\'s)', { size: 2.3 }));
  i.push(L([[108, 64], [116, 64], [116, 76]]), onderbreking(116, 78, 'M', '', 'onder'));
  i.push(punt(130, 48), condensator(130, 48, '-C5', '1000 µF 10 V'), L([[130, 64], [130, 76]]), onderbreking(130, 78, 'M', '', 'onder'));
  // -K7: PCA9685 op 0x42, V+ = V6; servo's -M1..-M16 op kanaal 0..15
  i.push(toestel(150, 74, 255, 28, '-K7', ['Servoprint PCA9685, 16 kanalen, I2C 0x42 (A1 dicht), 50 Hz, puls 500-2500 µs', `VCC = L3, GND = M, OE = OE van -K2 (zelfde GPIO10: bij reset geen pulsen, de servo's blijven staan) ${ref(B.besturing, 160)}`, 'V+ (schroefklem) = V6; per kanaal 3 pinnen: PWM, V+, GND'], []));
  i.push(punt(160, 48), L([[160, 48], [160, 74]]), aansluiting(160, 74, 'V+', 'start'));
  const sx = (k) => 175 + k * 52;
  for (let k = 0; k < 4; k++) {
    const x = sx(k), nr = k < 3 ? k + 1 : 16;
    i.push(aansluiting(x, 102, `PWM${nr - 1}`, 'end'), L([[x, 102], [x, 126], [x + 7, 133.8]]), motor(x + 12, 140, `-M${nr}`, []));
    i.push( punt(x + 8, 102), L([[x + 8, 102], [x + 8, 120], [x + 12, 120], [x + 12, 132]]), T(x + 9, 108, 'V+', { size: 1.7 }));
    i.push(L([[x + 16, 102], [x + 16, 126], [x + 17, 133.8]]), T(x + 17, 108, 'GND', { size: 1.7 }), aansluiting(x + 8, 102, ''), aansluiting(x + 16, 102, ''));
    i.push(T(x + 2, 156, nr <= 3 ? ['wissel W1', 'slagboom', 'armsein'][k] : 'wissel W4', { size: 1.9 }));
  }
  i.push(T(sx(2) + 36, 140, '…', { size: 5 }));
  i.push(T(150, 162, '-M1..-M16: servo SG90 of MG90S (4,8-6 V); per servo 2 eindstanden en een snelheid in het dashboard; hoogstens 4 tegelijk in beweging (firmware).', { size: 2.2 }));
  // extra ingangen: -K6 (17..24 op -K5 GPB), optioneel -K8 (MCP23017 0x21) met -K9, -K10 (25..40)
  i.push(toestel(26, 172, 120, 40, '-K6', ['', '', 'Optocouplerprint 3, 8 kanalen (ingangen 17..24)', 'zoals -K3 (NPN) of een PNP-/bipolaire versie', `OUT1..8 → GPB0..7 van -K5 ${ref(B.ir, 60)}`, 'VCC uitgang = L3, GND = M (pull-up op de print)'], []));
  i.push(toestel(26, 222, 120, 10, '-K8', ['Optioneel: MCP23017 0x21 (A0 aan L3) + -K9, -K10: ingangen 25..40'], []));
  // NPN, PNP en bipolair: 3 kleine voorbeelden
  const vb = [[170, 'NPN (zoals nu)', 'COM = +12 V (S12)', 'sensor trekt IN naar 0 V'], [250, 'PNP-print', 'COM = 0 V (M)', 'sensor geeft +12 V op IN'], [330, 'bipolair (PC814)', 'COM = 5 V (L5)', 'per ingang NPN of PNP']];
  for (const [x, t1, t2, t3] of vb) {
    i.push(T(x - 8, 172, t1, { size: 2.3, bold: true }), T(x - 8, 176, t2, { size: 1.9 }), T(x - 8, 179.5, t3, { size: 1.9 }));
    i.push(L([[x, 182], [x, 188]]), T(x + 1.5, 186, 'COM', { size: 1.7 }), weerstand(x, 188, '', ''), opto(x + 4, 216, '', ['', '', '', '']));
    // de PNP-print: de led andersom (anode aan IN, kathode aan COM = 0 V)
    if (x === 250) i.push(`<rect x="${x - 2.6}" y="212.9" width="5.2" height="4.7" fill="#fff" stroke="none"/>`, `<polygon points="${x - 2},217 ${x + 2},217 ${x},213.5" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 2, 213.5], [x + 2, 213.5]], { w: 0.35 }), L([[x, 212.9], [x, 213.5]]), L([[x, 217], [x, 217.6]]));
    // bipolair: een tweede led antiparallel (links ernaast, anode onder)
    if (x === 330) i.push(`<polygon points="${x - 9},${214} ${x - 5},${214} ${x - 7},${210.5}" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 9, 210.5], [x - 5, 210.5]], { w: 0.5 }), L([[x - 7, 210.5], [x - 7, 208.5], [x, 208.5]]), L([[x - 7, 214], [x - 7, 220], [x, 220]]));
    i.push(L([[x, 224], [x, 228]]), T(x + 1.5, 227, 'IN', { size: 1.7 }), x < 300 ? [contact(x - 18, 210, x === 170 ? 'NPN' : 'PNP'), L([[x - 18, 224], [x - 18, 228], [x, 228]]), T(x - 18, 208, x === 170 ? '0 V' : '+12 V', { size: 1.8, anchor: 'middle' })].join('') : '');
  }
  i.push(T(25, 244, 'NPN/PNP per groep van 8: bij een NPN-print gaat COM (de klem VCC aan de ingangskant) aan +12 V, bij een PNP-print aan 0 V. Per ingang: een print met bipolaire optocouplers (PC814, 2 leds', { size: 2.2 }));
  i.push(T(25, 248.5, 'antiparallel) met COM aan 5 V: NPN geeft 5 V over de led, PNP 7 V andersom. De firmware kiest per ingang of per groep "npn" of "pnp" (firmware/README.md). Printtypes: AANNAME, na te kijken.', { size: 2.2 }));
  i.push(T(25, 253, '-T3: XL4015 eerst zonder servo\'s op 5,5 V zetten (multimeter); -F19 3 A in de 12 V naar -T3. Servo-0 V (V6−) en M zijn verbonden in -T3 (gemeenschappelijke min: geen optocoupler nodig).', { size: 2.2 }));
  i.push(T(25, 257.5, 'LET OP: nooit een gewone (NPN-)print met COM aan 0 V: een PNP-sensor zet dan 12 V in sperrichting over de led (PC817: hoogstens 6 V). Berekeningen §9.', { size: 2.2, bold: true }));
  return { titel: ['Servo\'s', 'extra ingangen, NPN/PNP'], inhoud: i };
}

export const STUKLIJST_V6 = [
  ['-K5', '1', 'I/O-uitbreiding MCP23017, 16 I/O, I2C (adres 0x20), 26 x 21, pinnen', 'CJMCU-2317 of gelijk'],
  ['-Q3', '1', 'MOSFET-module zonder optocoupler, logic level, 15 A (modulatie IR, 30-56 kHz)', 'AOD4184-module (D4184)'],
  ['-Q4', '1', 'MOSFET-module 8 kanalen met optocouplers, 3,3 V-ingang (schakeluitgang per IR-led)', 'zoals -Q1'],
  ['-R10..-R17', '8', 'Weerstand 120 Ω, 0,5 W (serieweerstand IR-led)', '—'],
  ['-E21..-E28', '3 tot 8', 'IR-led 940 nm, 5 mm, 100 mA (IR-led 5, 6, 7 aan de stoppunten)', 'Vishay TSAL6200'],
  ['-B1', '1', 'IR-leerontvanger 20-60 kHz, geeft de draaggolf door (in de doos)', 'Vishay TSMP58000'],
  ['-B2..-B4', '3', 'IR-ontvanger 38 kHz, 2,5-5,5 V (of een FTR-reflexsensor)', 'Vishay TSOP38238'],
  ['-R19..-R21, -C2..-C4', '3 + 3', 'RC-filter bij de ontvangers op de baan: 100 Ω en elco 4,7 µF (-B1 in de doos zonder)', '—'],
  ['-X9', '8', 'Doorverbinder 1 + 1: de weerstand van de IR-led aan de draad naar de led', 'WAGO 221-2411'],
  ['-X12, -X13', '2', 'Verbindingsklem 5-voudig: 3,3 V en 0 V van de uitbreiding (IR-driver, ontvangers)', 'WAGO 221-415'],
  ['-K7', '1', 'Servoprint PCA9685 16 kanalen, adres 0x42 (A1 dichtsolderen), schroefklem V+', 'PCA9685-module'],
  ['-T3', '1', 'Regelaar 8-36 V → 1,25-32 V, 5 A (op 5,5 V gezet)', 'XL4015-module'],
  ['-F19', '1', 'Zekeringhouder ATO met draden + zekering 3 A', 'zoals -F1'],
  ['-C5', '1', 'Elco 1000 µF, 10 V of meer (servovoeding)', '—'],
  ['-M1..-M16', 'naar nood', 'Servo 4,8-6 V (wissels, slagbomen, armseinen)', 'SG90 of MG90S'],
  ['-K6', '1', 'Optocouplerprint 8 kanalen (ingangen 17-24): NPN zoals -K3, of PNP-/bipolaire versie', 'zoals -K3 / AANNAME'],
  ['-K8, -K9, -K10', 'optioneel', 'Tweede MCP23017 (0x21) + 2 optocouplerprints: ingangen 25-40 (sensoradvies)', 'zoals -K5 en -K6'],
];
