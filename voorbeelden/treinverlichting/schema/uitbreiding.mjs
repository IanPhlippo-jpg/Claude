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
    i.push(punt(x, 28), weerstand(x, 28, `-R${9 + n}`, n === 1 ? '120 Ω 1 W' : ''));
    i.push(L([[x, 48], [x, 50.8]]), klem(x, 52, '-X9', String(n), { kant: 'links' }), L([[x, 53.2], [x, 56]]));
    i.push(irLed(x, 56, `-E${20 + n}`, n === 1 ? 'TSAL6200' : ''), L([[x, 70], [x, 88]]));
  }
  i.push(T(26, 63, 'in het', { size: 1.9 }), T(26, 66, 'veld', { size: 1.9 }), T(26, 69, '-W21..-W28', { size: 1.8 }), T(26, 72, 'getwist', { size: 1.8 }), T(120, 26.4, 'L+ = de klemmen n+ van -Q4 (VIN+)', { size: 2.0 }));
  // -Q4: 8-kanaals MOSFET-module met optocouplers (zoals -Q1, blad 4). Fable 5.2 TN4: getekend als gesloten blok met zijn
  // klemmen (geen kale MOSFET's met de gate op IN: tussen IN en de MOSFET zit per kanaal een PC817 en de printweerstand)
  i.push(toestel(30, 88, 182, 44, '-Q4', ['', '', `8 kanalen, per kanaal PC817 + MOSFET, zoals -Q1 ${ref(B.uit, 60)}`, 'n− = drain van kanaal n, VIN− = de sources samen', 'IN n: led van de PC817 tussen VCC en IN n (actief laag)'], []));
  for (let n = 1; n <= 8; n++) {
    const x = xs(n);
    i.push(aansluiting(x, 88, `${n}−`, 'end'));
    i.push(aansluiting(x - 13, 132, `IN${n}`, 'start'), L([[x - 13, 132], [x - 13, 140]]));
  }
  i.push(aansluiting(212, 116, 'VIN−', 'end'));
  // Fable 5.2 T4/EN2: de stuurkant van -Q4: VCC uit de 3,3 V van -K4 (VCCo), GND uit -X6 J3:1 (niet meer uit B3V3)
  i.push(aansluiting(30, 121, 'VCC (3V3, -K4 VCCo)'), aansluiting(30, 126.5, 'GND (-X6 J3:1)'));
  // -Q3: snelle MOSFET-module zonder optocoupler (AOD4184): moduleert alle IR-leds samen met de draaggolf van GPIO47
  i.push(L([[212, 116], [262, 116], [262, 121]]), toestel(240, 112, 48, 46, '-Q3', [], []), nmos(260, 130, '', '', true), T(266, 146, 'AOD4184', { size: 2.0 }));
  i.push(T(265, 153, 'zonder optocoupler', { size: 1.9 }), T(265, 156, '(snel: 30-56 kHz)', { size: 1.9 }));
  i.push(L([[251, 130], [244, 130], [244, 150], [228, 150]]), onderbreking(228, 150, 'GPIO47 (RMT)', ref(B.besturing, 160), 'links'));
  i.push(L([[262, 139], [262, ym]]), punt(262, ym));
  // -K5: MCP23017, GPA0..7 = schakeluitgangen IR-led 1..8, GPB0..7 = ingangen 17..24 (blad Servo's)
  i.push(toestel(26, 140, 186, 34, '-K5', ['', '', 'MCP23017, I2C 0x20 (A0, A1, A2 aan GND), VCC = L3, GND = M; RESET aan L3', 'GPA0..GPA7 → IN1..IN8 van -Q4: kiest IR-led n (polariteit: dashboard, TRN-22 C)', 'GPB0..GPB6 ← ingangen 17..23 (blad Servo\'s); GPA7/GPB7 nooit ingang'], []));
  for (let n = 1; n <= 8; n++) i.push(aansluiting(xs(n) - 13, 140, `GPA${n - 1}`, 'start'));
  i.push(L([[60, 174], [60, 190]]), onderbreking(60, 190, 'SDA', ref(B.besturing, 300), 'onder'), L([[80, 174], [80, 190]]), onderbreking(80, 190, 'SCL', ref(B.besturing, 300), 'onder'));
  i.push(aansluiting(60, 174, 'SDA'), aansluiting(80, 174, 'SCL'));
  i.push(L([[180, 174], [180, 190]]), onderbreking(180, 190, 'GPB0..6', ref(B.servo, 112), 'onder'), aansluiting(180, 174, 'GPB'));
  // ontvangers: -B1 leerontvanger in de doos (GPIO48), -B2..-B4 op de baan (GPIO11, 39, 42), met RC-filter 100 Ω + 4,7 µF
  const ontv = [['-B1', 'TSMP58000 (leren)', 'achter het venster', 'GPIO48'], ['-B2', 'TSOP38238', 'op de baan', 'GPIO11'], ['-B3', 'TSOP38238', 'op de baan', 'GPIO39'], ['-B4', 'TSOP38238', 'op de baan', 'GPIO42']];
  // Fable 5.2 E11/EN2: de ontvangers op de baan uit B3V3 (-X12, achter de polyfuse -F20 MF-R030, blad 6); -B1 in de doos uit L3
  i.push(L([[300, 84], [300, 40 + 3 * 48]], { w: 0.35 }), onderbreking(300, 84, 'B3V3', ref(B.besturing, 350), 'boven'));
  ontv.forEach(([b, type, waar, gpio], k) => {
    const y = 44 + k * 48;
    // -B1 in de doos zit kort bij de ESP (3,3 V van J1:2): geen RC-filter; -B2..-B4 op de baan: 100 Ω + 4,7 µF bij de ontvanger
    if (k === 0) i.push(onderbreking(318, y, 'L3', ref(B.besturing, 220), 'links'), L([[318, y], [334, y]]), T(304, y + 4, 'van -K1 J1:2', { size: 1.8 }), L([[334, y + 22], [322, y + 22], [322, y + 28]]));
    else i.push(punt(300, y), weerstandH(300, y, `-R${18 + k}`, '100 Ω'), punt(322, y), condensator(322, y, `-C${1 + k}`, '4,7 µF'), L([[322, y + 16], [322, y + 22], [334, y + 22]]), L([[320, y], [334, y]]));
    i.push( toestel(334, y - 6, 40, 32, b, ['', '', type, waar], [{ x: 0, y: 6, naam: 'Vs' }, { x: 0, y: 28, naam: 'GND' }, { x: 40, y: 18, naam: 'OUT' }]));
    i.push(L([[322, y + 22], [322, y + 28], [328, y + 28]]), L([[328, y + 28], [328, y + 34]]), onderbreking(328, y + 34, 'M', '', 'onder'));
    // E11: in de doos 1 kΩ in elke ontvangerlijn (pootje in de klem van de ESP en in een WAGO 221-2411 -X14)
    if (k === 0) i.push(L([[374, y + 12], [405, y + 12]]), onderbreking(405, y + 12, gpio, ref(B.besturing, 160), 'rechts'));
    else i.push(weerstandH(374, y + 12, `-R${21 + k}`, '1 kΩ'), L([[394, y + 12], [405, y + 12]]), onderbreking(405, y + 12, gpio, ref(B.besturing, 160), 'rechts'), T(376, y + 24, `-W${30 + k}`, { size: 1.8 }));
  });
  i.push(T(25, 200, '-E21..-E28: IR-led 940 nm (Vishay TSAL6200), op de baan, elk een getwist paar -W21..-W28 (niet naast de ontvangerkabels); -R10..-R17 120 Ω 1 W in -X9 (WAGO 221-2411): piek 89 mA.', { size: 2.2 }));
  i.push(T(25, 205, 'IR-led n brandt alleen als -Q4 kanaal n aan staat EN GPIO47 de draaggolf geeft (-Q3; duty 33 of 50 %). Codering NEC, RC5, raw (geleerd) of continu (zonder draaggolf: dan -R10..-R17 470 Ω 0,5 W, Fable 5.2 EN1).', { size: 2.2 }));
  i.push(T(25, 210, 'Leren en IR-zelftest: -B1 (TSMP58000) geeft de draaggolf door (frequentie en pulstijden). -B2..-B4: gedemoduleerd (38 kHz), actief laag (interne pull-up ± 30 kΩ, geen extra weerstand).', { size: 2.2 }));
  i.push(T(25, 215, 'Reflexsensoren (FTR) niet hier maar op ingang 17-23 van -K5 (blad 8). Ontvangers: B3V3 uit -X12, 0 V uit -X13, kabel getwist, hoogstens 3 m (AANNAME), RC-filter bij de ontvanger.', { size: 2.2 }));
  i.push(T(25, 227, `-Q4: 8-kanaals MOSFET-module, per kanaal PC817 + MOSFET zoals -Q1 ${ref(B.uit, 60)} (VCC = 3V3 van -K4, VIN+ = L+). -Q3: AOD4184 zonder optocoupler. Eerst meten met de IR-zelftest (TRN-22 F, G) vóór de leds in de baan gaan.`, { size: 2.2 }));
  i.push(T(25, 222, 'Kruisverwijzingen naar blad 6 (besturing): GPIO47, GPIO48, GPIO11, GPIO39, GPIO42, SDA, SCL en L3 (3,3 V). Plaats in de doos: TRN-10 en TRN-11.', { size: 2.2 }));
  return { titel: ['IR', 'zenden en ontvangen'], inhoud: i };
}

/** blad Servo's: tweede PCA9685 op 50 Hz met eigen 5,5 V-voeding, en de extra ingangen met NPN of PNP */
export function servoBlad(B) {
  const i = [], ym = 236;
  i.push(rail(28, 25, 120, 'L+', { van: ref(B.voeding, RECHTS) }), rail(ym, 25, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  // voeding servo's: -F19, -T3 (12 -> 5,5 V), -C5 1000 µF, rail V6
  i.push(punt(35, 28), L([[35, 28], [35, 48]]), zekering(35, 48, '-F19', 'T 3,15 A (5 x 20)'), L([[55, 48], [62, 48]]));
  i.push(toestel(62, 40, 46, 30, '-T3', ['', '', 'XL4015 CC/CV', '12 → 5,5 V, grens 3 A', '(eerst instellen!)'], [{ x: 0, y: 8, naam: 'IN+' }, { x: 0, y: 24, naam: 'IN−' }, { x: 46, y: 8, naam: 'OUT+' }, { x: 46, y: 24, naam: 'OUT−' }]));
  i.push(L([[62, 64], [48, 64], [48, 76]]), onderbreking(48, 78, 'M', '', 'onder'));
  i.push(L([[108, 48], [RECHTS - 10, 48]], { w: 0.35 }), T(112, 46.4, 'V6 (5,5 V servo\'s)', { size: 2.3 }));
  i.push(L([[108, 64], [116, 64], [116, 76]]), onderbreking(116, 78, 'M', '', 'onder'));
  i.push(punt(130, 48), condensator(130, 48, '-C5', '1000 µF 25 V'), L([[130, 64], [130, 76]]), onderbreking(130, 78, 'M', '', 'onder'));
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
  i.push(T(150, 162, '-M1..-M16: servo SG90 of MG90S; hoogstens 4 tegelijk in beweging, bij het opstarten één per 0,3 s, puls uit na aankomst (instelbaar); kabels ≥ 0,25 mm².', { size: 2.2 }));
  // Fable 5.2 E2: ingang 17..23 = reflexsensoren (TCRT5000-module) rechtstreeks op -K5 GPB0..6, 1 kΩ in serie; geen 12 V
  i.push(toestel(26, 176, 52, 30, '-B5', ['', 'TCRT5000-module', '(LM393), invoeging'], [{ x: 52, y: 6, naam: 'VCC' }, { x: 52, y: 14, naam: 'GND' }, { x: 52, y: 24, naam: 'DO' }]));
  i.push(L([[78, 182], [92, 182]]), T(93, 183, `B3V3 (-X17) ${ref(B.besturing, 350)}`, { size: 1.8 }), L([[78, 190], [92, 190]]), T(93, 191, 'M (-X18)', { size: 1.8 }));
  i.push(weerstandH(78, 200, '-R28', '1 kΩ'), L([[98, 200], [112, 200]]), onderbreking(112, 200, 'GPB0', ref(B.ir, 180), 'rechts'));
  i.push(T(26, 214, '-B5..-B8 en -R28..-R31: ingang 17..20 (invoegingen), interne pull-up, actief laag; 1 kΩ in -X15.', { size: 1.9 }), T(26, 217.5, '-K6 (optocouplerprint voor 12 V-sensoren op 17-23) alleen als er geen reflexsensoren zijn.', { size: 1.9 }));
  i.push(toestel(26, 224, 120, 8, '-K8', ['Optioneel: MCP23017 0x21 (A0 aan L3) + 2 optocouplerprints: ingangen 25..38'], []));
  // E3: de 3 mogelijke schakelingen van de optocouplerprint aan de ingangskant (meten: TRN-22 stap A; kiezen: dashboard)
  const vb = [[170, 'printSoort "vcc"', 'gemeenschappelijke VCC = S12', 'NPN/contact trekt IN naar 0 V'], [250, 'printSoort "gnd"', 'gemeenschappelijke GND = M', 'contact of PNP geeft 12 V op IN'], [330, 'printSoort "apart"', 'per kanaal IN+ en IN−', 'NPN of PNP per ingang']];
  for (const [x, t1, t2, t3] of vb) {
    i.push(T(x - 8, 172, t1, { size: 2.3, bold: true }), T(x - 8, 176, t2, { size: 1.9 }), T(x - 8, 179.5, t3, { size: 1.9 }));
    i.push(L([[x, 182], [x, 188]]), T(x + 1.5, 186, x === 330 ? 'IN+' : x === 250 ? 'IN' : 'VCC', { size: 1.7 }), weerstand(x, 188, '', ''), opto(x + 4, 216, '', ['', '', '', '']));
    // "gnd": de led andersom (anode via de weerstand aan IN, kathode aan de gemeenschappelijke GND)
    if (x === 250) i.push(`<rect x="${x - 2.6}" y="212.9" width="5.2" height="4.7" fill="#fff" stroke="none"/>`, `<polygon points="${x - 2},217 ${x + 2},217 ${x},213.5" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 2, 213.5], [x + 2, 213.5]], { w: 0.35 }), L([[x, 212.9], [x, 213.5]]), L([[x, 217], [x, 217.6]]));
    i.push(L([[x, 224], [x, 228]]), T(x + 1.5, 227, x === 330 ? 'IN−' : x === 250 ? 'GND' : 'IN', { size: 1.7 }));
    if (x === 170) i.push(contact(x - 18, 210, 'NPN'), L([[x - 18, 224], [x - 18, 228], [x, 228]]), T(x - 18, 208, '0 V', { size: 1.8, anchor: 'middle' }));
    if (x === 250) i.push(contact(x - 18, 184, 'PNP'), L([[x - 18, 182], [x, 182]]), T(x - 18, 201, '+12 V', { size: 1.8, anchor: 'middle' }));
  }
  i.push(T(25, 244, 'Optocouplerprint: welke schakeling hij heeft, beslist de meting (TRN-22 stap A) en niet de verkoper. "gnd": een NPN-sensor of open-collector-hallsensor krijgt 2,2 kΩ van IN naar S12', { size: 2.2 }));
  i.push(T(25, 248.5, 'en de firmware keert die ingang om; "apart": per ingang NPN (IN+ aan S12, IN− aan de sensor) of PNP (IN+ aan de sensor, IN− aan 0 V). PNP op een print "vcc" weigert de firmware.', { size: 2.2 }));
  i.push(T(25, 253, '-T3: XL4015 CC/CV eerst zonder servo\'s op 5,5 V en 3 A zetten (TRN-22 E); -F19 T 3,15 A in de 12 V. Servo-0 V en M zijn verbonden in -T3; geen GND-dupont tussen -K2 en -K7.', { size: 2.2 }));
  i.push(T(25, 257.5, 'LET OP: nooit PNP (12 V op IN) op een print "vcc": dan staat er 12 V in sperrichting over de led (PC817: hoogstens 6 V). Berekeningen §9.', { size: 2.2, bold: true }));
  return { titel: ['Servo\'s', 'reflexsensoren, ingangsprint'], inhoud: i };
}

export const STUKLIJST_V6 = [
  ['-K5', '1', 'I/O-uitbreiding MCP23017, I2C 0x20, 26 x 21, pinnen (GPA7/GPB7 niet als ingang)', 'CJMCU-2317 of gelijk'],
  ['-Q3', '1', 'MOSFET-module zonder optocoupler, logic level (modulatie IR, 30-56 kHz)', 'AOD4184-module (D4184)'],
  ['-Q4', '1', 'MOSFET-module 8 kanalen met optocouplers, 3,3 V-ingang (IR-led kiezen)', 'zoals -Q1'],
  ['-R10..-R17', '8', 'Weerstand 120 Ω, 1 W (serieweerstand IR-led)', '—'],
  ['-X9', '8', 'Doorverbinder 1 + 1: de weerstand van de IR-led aan de draad naar de led', 'WAGO 221-2411'],
  ['-E21..-E28', '4 (+1)', 'IR-led 940 nm, 5 mm, 100 mA: nu -E21..-E24 aan de 4 stoppunten, -E25..-E28 later (blad 7)', 'Vishay TSAL6200'],
  ['-B1', '1', 'IR-leerontvanger 20-60 kHz, geeft de draaggolf door (achter het venster)', 'Vishay TSMP58000'],
  ['-B2..-B4', '3', 'IR-ontvanger 38 kHz, 2,5-5,5 V', 'Vishay TSOP38238'],
  ['-R19..-R21, -C2..-C4', '3 + 3', 'RC-filter bij de ontvangers op de baan: 100 Ω en elco 4,7 µF', '—'],
  ['-R22..-R24, -X14', '3 + 3', 'Weerstand 1 kΩ in elke ontvangerlijn, in een WAGO 221-2411', 'WAGO 221-2411'],
  ['-B5..-B8', '4', 'Reflexsensor-module (invoegingen), 3,3 V, uitgang actief laag', 'TCRT5000-module (LM393)'],
  ['-R28..-R31, -X15', '4 + 4', 'Weerstand 1 kΩ in de uitgang van de reflexsensor, in een WAGO 221-2411', 'WAGO 221-2411'],
  ['-F20', '1', 'Polyfuse 0,3 A: de 3,3 V naar de baan (B3V3, blad 6)', 'Bourns MF-R030'],
  ['-X12, -X13', '2', 'Verbindingsklem 5-voudig: B3V3 en 0 V van de uitbreiding', 'WAGO 221-415'],
  ['-X17, -X18', '2', 'Verbindingsklem 5-voudig onder de baan: B3V3 en 0 V naar de reflexsensoren (veldkabel -W40)', 'WAGO 221-415'],
  ['-K7', '1', 'Servoprint PCA9685 16 kanalen, adres 0x42 (A1 dichtsolderen), schroefklem V+', 'PCA9685-module'],
  ['-T3', '1', 'Regelaar met stroomgrens (CC/CV), 5 A, op 5,5 V en 3 A gezet', 'XL4015-module met 2 potmeters'],
  ['-F19', '1 + 1', 'Zekeringhouder 5 x 20 paneelmontage + zekering T 3,15 A', 'zoals -F1'],
  ['-C5', '1', 'Elco 1000 µF, 25 V of meer (servovoeding)', '—'],
  ['-M1..-M16', 'naar nood', 'Servo 4,8-6 V (wissels, slagbomen, armseinen)', 'SG90 of MG90S'],
  ['-K6', 'optioneel', 'Optocouplerprint 8 kanalen voor 12 V-sensoren op 17-23 (in plaats van reflexsensoren)', 'zoals -K3'],
  ['-K8', 'optioneel', 'Tweede MCP23017 (0x21) + 2 optocouplerprints: ingangen 25-38 (sensoradvies fase 2)', 'zoals -K5 en -K3'],
];
