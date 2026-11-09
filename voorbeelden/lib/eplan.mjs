// Schakelschema's zoals EPLAN Electric P8 ze afdrukt, volgens de Europese normen. Gedeeld door de schema's van de
// afzuiging en de treinverlichting (voorbeelden/<project>/schema/maak-schema.mjs).
//
// Normen
// - IEC/EN 61082-1: opbouw van het document, kolomverwijzing (blad.kolom), onderbrekingspunten met kruisverwijzing.
// - IEC/EN 60617: de symbolen (weerstand, condensator, zekering, PTC, transistor, MOSFET, optocoupler, motor, klem).
// - IEC/EN 81346-1 en -2: referentieaanduidingen =installatie +plaats -product; de kennletter van het product volgt
//   de klassen van 81346-2 (zie KLASSEN en controleerAanduiding).
// - IEC 61355: de documentsoort per blad (&EAA titelblad, &EAB inhoudsopgave, &EFS schema, &EMA klemmenplan,
//   &EPC stuklijst).
// - ISO 5457: A3 liggend, archiefrand 20 mm links, 10 mm rondom; ISO 7200: de velden van het titelblok.
// Opmaak zoals het EPLAN-normblad: kolommen 0 tot 9 bovenaan, het titelblok over de hele breedte onderaan (wijzigingen,
// datum/getekend/gecontroleerd/norm, eigenaar, project, bladbenaming, tekeningnummer, =installatie +plaats, blad), het
// vorige en het volgende bladnummer onderaan het tekenvlak, black boxes in streep-punt, alles in zwart.
export const W = 420, H = 297; // A3 liggend, mm
export const FX0 = 20, FX1 = 410, FY0 = 10, FY1 = 287; // kader (ISO 5457)
export const KOLOMMEN = 10, KOLB = (FX1 - FX0) / KOLOMMEN; // kolommen 0..9 van 39 mm
export const KY = FY0 + 5; // onderkant van de kolomstrook
export const TY = FY1 - 27; // bovenkant van het titelblok
// het tekenvlak
export const X0 = FX0, X1 = FX1, Y0 = KY, Y1 = TY;

/** de kolom (0..9) van een x op het blad */
export const kolom = (x) => Math.max(0, Math.min(KOLOMMEN - 1, Math.floor((x - FX0) / KOLB)));
/** kruisverwijzing naar blad b, kolom van x: "/3.4" (IEC 61082-1, zoals EPLAN) */
export const ref = (b, x) => `/${b}.${kolom(x)}`;

// ---- ISO/IEC 81346-2: klassen van objecten (kennletter van een productaanduiding) ----
export const KLASSEN = {
  B: 'opnemen van informatie (sensor)', C: 'opslaan (condensator)', E: 'uitstralen (licht, warmte)', F: 'beschermen (zekering)',
  G: 'opwekken (bron)', H: 'materiaal behandelen', K: 'informatie verwerken (besturing, IC, optocoupler)', M: 'mechanische energie (motor)',
  N: 'afdekken', P: 'informatie tonen', Q: 'energie of signaal schakelen (schakelaar, transistor)', R: 'begrenzen of stabiliseren (weerstand, diode)',
  S: 'menselijke handeling omzetten (knop)', T: 'omvormen (voeding, regelaar)', U: 'objecten op hun plaats houden (print, drager)',
  W: 'geleiden (kabel)', X: 'verbinden (klem, stekker)',
};
/** een productaanduiding volgens 81346: "-" + klasse (1 of 2 letters, de eerste uit KLASSEN) + volgnummer */
export function controleerAanduiding(a) {
  const m = /^-([A-Z])([A-Z]?)(\d+)$/.exec(a);
  return !!m && m[1] in KLASSEN;
}

// ---- tekenen ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ZWART = '#000';
export const T = (x, y, s, { size = 2.5, anchor = 'start', bold = false, hoek = 0, italic = false } = {}) =>
  `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" font-size="${size}" text-anchor="${anchor}" fill="${ZWART}"${bold ? ' font-weight="700"' : ''}${italic ? ' font-style="italic"' : ''}${hoek ? ` transform="rotate(${hoek} ${x} ${y})"` : ''}>${esc(s)}</text>`;
/** verbinding of lijn; dun = verbinding (0,25), dik = symbool (0,35) */
export const L = (pts, { w = 0.25, streep = '' } = {}) =>
  `<polyline points="${pts.map((p) => p.map((v) => +v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${ZWART}" stroke-width="${w}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
/** T-knooppunt (aftakking), gevuld */
export const punt = (x, y) => `<circle cx="${x}" cy="${y}" r="0.6" fill="${ZWART}"/>`;
export const rect = (x, y, w, h, { streep = '', w2 = 0.35, vul = 'none' } = {}) =>
  `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" fill="${vul}" stroke="${ZWART}" stroke-width="${w2}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
const STREEPPUNT = '4 1 0.6 1';
/** aanduiding en functietekst naast een symbool */
const label = (x, y, code, waarde, anchor = 'start') => [code ? T(x, y, code, { size: 2.8, anchor }) : '', waarde ? T(x, y + 3.2, waarde, { size: 2.3, anchor }) : ''].join('');

/** weerstand verticaal van (x, y) naar (x, y + 20) */
export const weerstand = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 1.5, y + 6, 3, 8), L([[x, y + 14], [x, y + 20]]), label(x - 3, y + 9, code, waarde, 'end')].join('');
/** weerstand horizontaal van (x, y) naar (x + 20, y) */
export const weerstandH = (x, y, code, waarde) => [L([[x, y], [x + 6, y]]), rect(x + 6, y - 1.5, 8, 3), L([[x + 14, y], [x + 20, y]]), T(x + 10, y - 3, code, { anchor: 'middle', size: 2.8 }), T(x + 10, y + 5, waarde, { anchor: 'middle', size: 2.3 })].join('');
/** condensator verticaal van (x, y) naar (x, y + 16); gepolariseerd met + aan de bovenkant */
export const condensator = (x, y, code, waarde, elco = true) => [L([[x, y], [x, y + 7]]), L([[x - 3.5, y + 7], [x + 3.5, y + 7]], { w: 0.5 }), elco ? rect(x - 3.5, y + 8.4, 7, 0.9, { w2: 0.35, vul: ZWART }) : L([[x - 3.5, y + 9], [x + 3.5, y + 9]], { w: 0.5 }), elco ? T(x - 4.5, y + 6.5, '+', { size: 2.4, anchor: 'end' }) : '', L([[x, y + 9.3], [x, y + 16]]), label(x + 5, y + 7.5, code, waarde)].join('');
/** zekering horizontaal van (x, y) naar (x + 20, y) */
export const zekering = (x, y, code, waarde) => [L([[x, y], [x + 5, y]]), rect(x + 5, y - 2, 10, 4), L([[x + 5, y], [x + 15, y]], { w: 0.25 }), L([[x + 15, y], [x + 20, y]]), T(x + 10, y - 3.5, code, { anchor: 'middle', size: 2.8 }), T(x + 10, y + 6, waarde, { anchor: 'middle', size: 2.3 })].join('');
/** zelfherstellende zekering (PTC) verticaal van (x, y) naar (x, y + 20) */
export const ptc = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 2, y + 6, 4, 8), L([[x - 3.5, y + 15], [x + 3.5, y + 5], [x + 5, y + 5]], { w: 0.25 }), L([[x, y + 14], [x, y + 20]]), label(x + 6, y + 9, code, waarde)].join('');
/** diode verticaal van (x, y) (anode) naar (x, y + 14) (kathode) */
export const diode = (x, y, code, waarde) => [L([[x, y], [x, y + 4.5]]), `<polygon points="${x - 3},${y + 4.5} ${x + 3},${y + 4.5} ${x},${y + 9.5}" fill="none" stroke="${ZWART}" stroke-width="0.35"/>`, L([[x - 3, y + 9.5], [x + 3, y + 9.5]], { w: 0.5 }), L([[x, y + 9.5], [x, y + 14]]), label(x + 5, y + 6, code, waarde)].join('');
/** maakcontact (schakelaar, handbediend), horizontaal van (x, y) naar (x + 20, y), getekend in rust (open) */
export const schakelaar = (x, y, code, waarde) => [L([[x, y], [x + 6, y]]), L([[x + 6, y], [x + 14, y - 4.5]], { w: 0.35 }), L([[x + 14, y], [x + 20, y]]), L([[x + 10, y - 2.3], [x + 10, y - 8]], { w: 0.25, streep: '1.2 0.8' }), L([[x + 8, y - 8], [x + 12, y - 8]], { w: 0.35 }), L([[x + 8, y - 8], [x + 8, y - 9.2]], { w: 0.35 }), T(x + 10, y + 5, code, { anchor: 'middle', size: 2.8 }), T(x + 10, y + 8.2, waarde, { anchor: 'middle', size: 2.3 })].join('');
/** klem: open cirkel met de aanduiding van de klemmenstrook en het klemnummer */
export const klem = (x, y, code, nr, { kant = 'rechts' } = {}) => {
  const r = kant === 'rechts';
  return `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff" stroke="${ZWART}" stroke-width="0.35"/>${T(x + (r ? 2.2 : -2.2), y - 1.4, code, { size: 2.3, anchor: r ? 'start' : 'end' })}${T(x + (r ? 2.2 : -2.2), y + 2.6, nr, { size: 2.3, anchor: r ? 'start' : 'end' })}`;
};
/** aansluitpunt van een toestel (in een black box): punt met aansluitaanduiding */
export const aansluiting = (x, y, naam, anchor = 'start') => `<circle cx="${x}" cy="${y}" r="0.5" fill="${ZWART}"/>${T(x + (anchor === 'start' ? 1.6 : -1.6), y - 1.2, naam, { size: 2.1, anchor })}`;
/** N-MOSFET verticaal: gate links (x - 9, y), drain boven (x + 2, y - 9), source onder (x + 2, y + 9) */
export const nmos = (x, y, code, type, pins = true) => [
  `<circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="${ZWART}" stroke-width="0.35"/>`,
  L([[x - 9, y], [x - 3.5, y]]), L([[x - 3.5, y - 3.5], [x - 3.5, y + 3.5]], { w: 0.5 }),
  L([[x - 2, y - 4], [x - 2, y - 2]], { w: 0.5 }), L([[x - 2, y - 1], [x - 2, y + 1]], { w: 0.5 }), L([[x - 2, y + 2], [x - 2, y + 4]], { w: 0.5 }),
  L([[x - 2, y - 3], [x + 2, y - 3], [x + 2, y - 9]]), L([[x - 2, y + 3], [x + 2, y + 3], [x + 2, y + 9]]), L([[x - 2, y], [x + 2, y], [x + 2, y + 3]]),
  `<polygon points="${x - 2},${y} ${x - 0.2},${y - 1} ${x - 0.2},${y + 1}" fill="${ZWART}"/>`,
  T(x + 4, y - 7.5, code, { size: 2.6 }), type ? T(x + 4, y + 11.5, type, { size: 2.0 }) : '',
  pins ? [T(x + 3, y - 9.6, 'D', { size: 1.9 }), T(x + 3, y + 10.8, 'S', { size: 1.9 }), T(x - 9, y - 1, 'G', { size: 1.9 })].join('') : '',
].join('');
/** NPN-transistor: basis links (x - 10, y), collector boven (x + 3, y - 10), emitter onder (x + 3, y + 10) */
export const npn = (x, y, code, type) => [
  `<circle cx="${x + 0.5}" cy="${y}" r="6" fill="none" stroke="${ZWART}" stroke-width="0.35"/>`,
  L([[x - 10, y], [x - 2, y]]), L([[x - 2, y - 4], [x - 2, y + 4]], { w: 0.5 }),
  L([[x - 2, y - 1.5], [x + 3, y - 5], [x + 3, y - 10]]), L([[x - 2, y + 1.5], [x + 3, y + 5], [x + 3, y + 10]]),
  `<polygon points="${x + 3},${y + 5} ${x + 0.4},${y + 4.6} ${x + 1.6},${y + 2.9}" fill="${ZWART}"/>`,
  T(x + 8, y - 1, code, { size: 2.8 }), T(x + 8, y + 2.6, type, { size: 2.3 }),
  T(x + 4, y - 10.5, 'C', { size: 1.9 }), T(x + 4, y + 12, 'E', { size: 1.9 }), T(x - 10, y - 1, 'B', { size: 1.9 }),
].join('');
/** P-MOSFET verticaal: gate links (x - 12, y), source boven (x + 3, y - 12), drain onder (x + 3, y + 12) */
export const pmos = (x, y, code, type) => [
  `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${ZWART}" stroke-width="0.35"/>`,
  L([[x - 12, y], [x - 5, y]]), L([[x - 5, y - 4], [x - 5, y + 4]], { w: 0.5 }),
  L([[x - 3, y - 5], [x - 3, y - 2.5]], { w: 0.5 }), L([[x - 3, y - 1], [x - 3, y + 1]], { w: 0.5 }), L([[x - 3, y + 2.5], [x - 3, y + 5]], { w: 0.5 }),
  L([[x - 3, y - 4], [x + 3, y - 4], [x + 3, y - 12]]), L([[x - 3, y + 4], [x + 3, y + 4], [x + 3, y + 12]]), L([[x - 3, y], [x + 3, y], [x + 3, y - 4]]),
  `<polygon points="${x - 0.2},${y} ${x - 2.4},${y - 1.3} ${x - 2.4},${y + 1.3}" fill="${ZWART}" transform="rotate(180 ${x - 1.3} ${y})"/>`,
  T(x + 10, y - 1, code, { size: 2.8 }), T(x + 10, y + 2.6, type, { size: 2.3 }),
  T(x + 4, y - 12.6, 'S', { size: 1.9 }), T(x + 4, y + 14, 'D', { size: 1.9 }), T(x - 12, y - 1, 'G', { size: 1.9 }),
].join('');
/** optocoupler: led links (anode boven (x - 4, y - 8), kathode onder (x - 4, y + 8)), transistor rechts (collector (x + 5, y - 8), emitter (x + 5, y + 8)); de omhulling in streep-punt */
export const opto = (x, y, code, pins) => [
  rect(x - 8, y - 6, 16, 12, { streep: STREEPPUNT, w2: 0.25 }),
  L([[x - 4, y - 8], [x - 4, y - 2.5]]), `<polygon points="${x - 6},${y - 2.5} ${x - 2},${y - 2.5} ${x - 4},${y + 1}" fill="none" stroke="${ZWART}" stroke-width="0.35"/>`, L([[x - 6, y + 1], [x - 2, y + 1]], { w: 0.35 }), L([[x - 4, y + 1], [x - 4, y + 8]]),
  L([[x - 1, y - 1.5], [x + 1, y - 0.5]], { w: 0.25 }), L([[x - 1, y + 0.5], [x + 1, y + 1.5]], { w: 0.25 }),
  L([[x + 2.5, y - 3], [x + 2.5, y + 3]], { w: 0.5 }), L([[x + 2.5, y - 1.5], [x + 5, y - 4], [x + 5, y - 8]]), L([[x + 2.5, y + 1.5], [x + 5, y + 4], [x + 5, y + 8]]),
  code ? T(x - 9, y - 7, code, { size: 2.4, anchor: 'end' }) : '',
  pins ? [T(x - 5, y - 6.6, pins[0], { size: 1.7, anchor: 'end' }), T(x - 5, y + 8.2, pins[1], { size: 1.7, anchor: 'end' }), T(x + 6, y - 6.6, pins[2], { size: 1.7 }), T(x + 6, y + 8.2, pins[3], { size: 1.7 })].join('') : '',
].join('');
/** gelijkstroommotor: cirkel met M en = */
export const motor = (x, y, code, regels = []) => [`<circle cx="${x}" cy="${y}" r="8" fill="#fff" stroke="${ZWART}" stroke-width="0.35"/>`, T(x, y + 1, 'M', { anchor: 'middle', size: 4.5 }), L([[x - 3, y + 3.8], [x + 3, y + 3.8]], { w: 0.35 }), T(x + 11, y - 2, code, { size: 2.8 }), ...regels.map((r, i) => T(x + 11, y + 2 + i * 3.2, r, { size: 2.3 }))].join('');
/**
 * black box (toestel dat niet verder wordt opengetekend): rechthoek in streep-punt, aanduiding linksboven erbuiten,
 * de functieteksten erin, de aansluitpunten op de rand met hun aansluitaanduiding
 */
export const toestel = (x, y, w, h, code, regels, pins = []) => [
  rect(x, y, w, h, { streep: STREEPPUNT, w2: 0.3 }), T(x, y - 1.6, code, { size: 2.8 }),
  ...regels.map((r, i) => T(x + (pins.some((p) => p.x < w / 2) ? 9 : 2.5), y + 5 + i * 3.4, r, { size: 2.3 })),
  ...pins.map((p) => aansluiting(x + p.x, y + p.y, p.naam, p.x < w / 2 ? 'start' : 'end')),
].join('');
/**
 * onderbrekingspunt (EPLAN): de verbinding loopt op een ander blad verder; pijlpunt in de richting waarin ze
 * doorloopt, de naam (het potentiaal) erboven, de kruisverwijzing eronder
 */
export const onderbreking = (x, y, naam, verwijzing, richting = 'rechts') => {
  // de pijlpunt wijst waar de verbinding verder loopt; de teksten staan aan de binnenkant (niet buiten het kader)
  if (richting === 'onder' || richting === 'boven') {
    // naam en verwijzing gecentreerd voorbij de pijlpunt
    const s = richting === 'onder' ? 1 : -1;
    return [`<polygon points="${x},${y} ${x - 1.1},${y - s * 2.2} ${x + 1.1},${y - s * 2.2}" fill="${ZWART}"/>`,
      naam ? T(x, y + (s > 0 ? 3.2 : -4.4), naam, { size: 2.2, anchor: 'middle' }) : '', verwijzing ? T(x, y + (s > 0 ? 6.2 : -1.6), verwijzing, { size: 2.0, anchor: 'middle' }) : ''].join('');
  }
  const s = richting === 'rechts' ? 1 : -1, a = s > 0 ? 'end' : 'start';
  return [`<polygon points="${x},${y} ${x - s * 2.2},${y - 1.1} ${x - s * 2.2},${y + 1.1}" fill="${ZWART}"/>`,
    naam ? T(x - s * 3, y - 1.4, naam, { size: 2.5, anchor: a }) : '', verwijzing ? T(x - s * 3, y + 3.2, verwijzing, { size: 2.3, anchor: a }) : ''].join('');
};
/** potentiaalrail van xa tot xb op hoogte y; onderbrekingspunten aan de uiteinden met waar het vandaan komt / heen gaat */
export const rail = (y, xa, xb, naam, { van = '', naar = '' } = {}) => [
  L([[xa, y], [xb, y]], { w: 0.35 }),
  van ? onderbreking(xa, y, naam, van, 'links') : T(xa + 1, y - 1.4, naam, { size: 2.5 }),
  naar ? onderbreking(xb, y, naam, naar, 'rechts') : '',
].join('');

/** tabel met kopregel; kolommen: [kop, breedte] */
export function tabel(x, y, kolommen, rijen, { h = 6.5, kop = 7, size = 2.5 } = {}) {
  const r = [];
  let cx = x;
  const bt = kolommen.reduce((s, [, w]) => s + w, 0);
  r.push(rect(x, y, bt, kop + h * rijen.length, { w2: 0.35 }), L([[x, y + kop], [x + bt, y + kop]], { w: 0.35 }));
  kolommen.forEach(([k, w], i) => { r.push(T(cx + 1.5, y + kop - 2.2, k, { size: 2.4, bold: true })); if (i) r.push(L([[cx, y], [cx, y + kop + h * rijen.length]], { w: 0.18 })); cx += w; });
  rijen.forEach((rij, j) => {
    let xx = x;
    const yy = y + kop + h * (j + 1);
    if (j < rijen.length - 1) r.push(L([[x, yy], [x + bt, yy]], { w: 0.13 }));
    rij.forEach((cel, k) => { r.push(T(xx + 1.5, yy - h / 2 + size * 0.35, cel, { size })); xx += kolommen[k][1]; });
  });
  return r.join('');
}

// ---- normblad: kader, kolommen en titelblok ----
/**
 * project: { naam, omschrijving, eigenaar, tekeningnr, installatie ('=TRN'), plaats ('+DOOS'), datum, getekend,
 * gecontroleerd, norm, revisie: { index, datum, naam, wat } }
 * b: { nr, totaal, titel (1 tot 3 regels), soort ('&EFS'), soortNaam ('Schema'), vorig, volgend }
 */
export function normblad(project, b, inhoud) {
  const k = [];
  k.push(rect(5, 5, W - 10, H - 10, { w2: 0.25 })); // snijrand
  k.push(rect(FX0, FY0, FX1 - FX0, FY1 - FY0, { w2: 0.7 })); // kader ISO 5457
  // centreermerken (ISO 5457)
  k.push(L([[W / 2, 5], [W / 2, FY0]], { w: 0.7 }), L([[W / 2, FY1], [W / 2, H - 5]], { w: 0.7 }), L([[5, H / 2], [FX0, H / 2]], { w: 0.7 }), L([[FX1, H / 2], [W - 5, H / 2]], { w: 0.7 }));
  // kolomstrook 0..9
  k.push(L([[FX0, KY], [FX1, KY]], { w: 0.35 }));
  for (let i = 0; i < KOLOMMEN; i++) {
    const x = FX0 + KOLB * i;
    if (i) k.push(L([[x, FY0], [x, KY]], { w: 0.25 }));
    k.push(T(x + KOLB / 2, FY0 + 3.7, String(i), { anchor: 'middle', size: 2.8 }));
  }
  // vorig en volgend blad (EPLAN), onderaan het tekenvlak
  if (b.vorig) k.push(T(FX0 + 1.5, TY - 1.5, String(b.vorig), { size: 2.5 }));
  if (b.volgend) k.push(T(FX1 - 1.5, TY - 1.5, String(b.volgend), { size: 2.5, anchor: 'end' }));
  k.push(...titelblok(project, b));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif">
<rect width="${W}" height="${H}" fill="#fff"/>
${k.join('\n')}
${inhoud.join('\n')}
</svg>`;
}

/** het titelblok: de velden van ISO 7200 in de indeling van het EPLAN-normblad */
function titelblok(p, b) {
  const t = [];
  const y0 = TY, y1 = FY1, rh = (y1 - y0) / 4;
  const ry = (n) => y0 + rh * n;
  const kop = (x, y, s) => T(x + 1, y + 2.3, s, { size: 1.8 });
  t.push(L([[FX0, y0], [FX1, y0]], { w: 0.7 }));
  const v = (x) => t.push(L([[x, y0], [x, y1]], { w: 0.35 }));
  const h = (xa, xb, y, w = 0.18) => t.push(L([[xa, y], [xb, y]], { w }));
  // A: wijzigingen (index, datum, naam)
  const A = [FX0, 30, 48, 62];
  for (let n = 1; n < 4; n++) h(A[0], A[3], ry(n));
  t.push(L([[A[1], y0], [A[1], y1]], { w: 0.18 }), L([[A[2], y0], [A[2], y1]], { w: 0.18 }));
  t.push(T(A[0] + 1, ry(4) - 1.6, 'Wijz.', { size: 1.8 }), T(A[1] + 1, ry(4) - 1.6, 'Datum', { size: 1.8 }), T(A[2] + 1, ry(4) - 1.6, 'Naam', { size: 1.8 }));
  if (p.revisie) t.push(T(A[0] + 1, ry(3) - 1.7, p.revisie.index, { size: 2.3 }), T(A[1] + 1, ry(3) - 1.7, p.revisie.datum, { size: 2.0 }), T(A[2] + 1, ry(3) - 1.7, p.revisie.naam, { size: 2.0 }));
  v(A[3]);
  // B: datum, getekend, gecontroleerd, norm
  const B = [62, 77, 106];
  for (let n = 1; n < 4; n++) h(B[0], B[2], ry(n));
  t.push(L([[B[1], y0], [B[1], y1]], { w: 0.18 }));
  [['Datum', p.datum], ['Getek.', p.getekend], ['Gecontr.', p.gecontroleerd], ['Norm', p.norm]].forEach(([l, w], n) => t.push(T(B[0] + 1, ry(n + 1) - 1.8, l, { size: 2.0 }), T(B[1] + 1, ry(n + 1) - 1.8, w ?? '', { size: 2.2 })));
  v(B[2]);
  // C: eigenaar en project, onderaan oorspronkelijk / vervangt / vervangen door
  const C = [106, 146, 206];
  h(C[0], C[2], ry(3), 0.25);
  t.push(L([[C[1], y0], [C[1], ry(3)]], { w: 0.18 }));
  t.push(kop(C[0], y0, 'Eigenaar'), T(C[0] + 2, y0 + 9.5, 'Phlippo CAD', { size: 3.6, bold: true }), T(C[0] + 2, y0 + 15, p.eigenaar, { size: 2.3 }));
  t.push(kop(C[1], y0, 'Project'), T(C[1] + 2, y0 + 9, p.naam, { size: 3.2, bold: true }), T(C[1] + 2, y0 + 14.5, p.omschrijving, { size: 2.3 }));
  const cw = (C[2] - C[0]) / 3;
  [['Oorspr.', p.oorspronkelijk ?? ''], ['Verv. v.', ''], ['Verv. d.', '']].forEach(([l, w], n) => { if (n) t.push(L([[C[0] + cw * n, ry(3)], [C[0] + cw * n, y1]], { w: 0.18 })); t.push(T(C[0] + cw * n + 1, y1 - 1.8, l, { size: 1.8 }), T(C[0] + cw * n + 12, y1 - 1.8, w, { size: 2.0 })); });
  v(C[2]);
  // D: bladbenaming (groot), onderaan de documentsoort (IEC 61355)
  const D = [206, 306];
  h(D[0], D[1], ry(3), 0.25);
  const regels = [].concat(b.titel);
  regels.forEach((r, n) => t.push(T((D[0] + D[1]) / 2, y0 + 8.5 + n * 5 - (regels.length - 1) * 2.5, r, { size: 4, anchor: 'middle', bold: n === 0 })));
  t.push(T(D[0] + 1, y1 - 1.8, 'Documentsoort', { size: 1.8 }), T(D[0] + 22, y1 - 1.8, `${b.soort}  ${b.soortNaam}`, { size: 2.2 }));
  v(D[1]);
  // E: tekeningnummer en revisie
  const E = [306, 350];
  h(E[0], E[1], ry(2), 0.25);
  t.push(kop(E[0], y0, 'Tekeningnr.'), T(E[0] + 2, y0 + 10, p.tekeningnr, { size: 2.8, bold: true }));
  t.push(kop(E[0], ry(2), 'Revisie / taal'), T(E[0] + 2, ry(2) + 9.5, `${p.revisie?.index ?? '0'} / nl`, { size: 2.6 }));
  v(E[1]);
  // F: =installatie en +plaats (IEC 81346-1)
  const F = [350, 384];
  h(F[0], F[1], ry(2), 0.25);
  t.push(T(F[0] + 1.5, y0 + 6, '=', { size: 2.6 }), T(F[0] + 5, y0 + 6, p.installatie.replace(/^=/, ''), { size: 2.8, bold: true }), T(F[0] + 1.5, y0 + 11, p.installatieNaam ?? '', { size: 1.9 }));
  t.push(T(F[0] + 1.5, ry(2) + 6, '+', { size: 2.6 }), T(F[0] + 5, ry(2) + 6, p.plaats.replace(/^\+/, ''), { size: 2.8, bold: true }), T(F[0] + 1.5, ry(2) + 11, p.plaatsNaam ?? '', { size: 1.9 }));
  v(F[1]);
  // G: blad
  const G = [384, FX1];
  h(G[0], G[1], ry(3), 0.25);
  t.push(kop(G[0], y0, 'Blad'), T((G[0] + G[1]) / 2, y0 + 15, String(b.nr), { size: 8, anchor: 'middle', bold: true }));
  t.push(T(G[1] - 1.5, y1 - 1.8, `${b.totaal} Bl.`, { size: 2.3, anchor: 'end' }));
  return t;
}

// ---- de bladsoorten van een EPLAN-project ----
/** titelblad (&EAA): projectgegevens en installatiegegevens, zoals het EPLAN-voorblad */
export function titelblad(project, gegevens, installatie, { normen = [], bladen = 0 } = {}) {
  const i = [];
  i.push(rect(30, 22, 370, 3.5, { w2: 0, vul: '#808080' }), rect(30, 240, 370, 3.5, { w2: 0, vul: '#808080' }));
  i.push(T(35, 42, 'Phlippo CAD', { size: 9, bold: true }), T(35, 49, project.eigenaar, { size: 3.4 }));
  i.push(T(215, 44, project.naam, { size: 9, anchor: 'middle', bold: true }), T(215, 53, project.omschrijving, { size: 4.5, anchor: 'middle' }));
  i.push(L([[35, 62], [395, 62]], { w: 0.35 }), L([[215, 62], [215, 205]], { w: 0.35 }));
  i.push(T(40, 74, 'Projectgegevens', { size: 4.5 }), T(220, 74, 'Installatiegegevens', { size: 4.5 }));
  const lijst = (x, rijen) => rijen.forEach(([k, w], n) => i.push(T(x, 88 + n * 8, k, { size: 3.4, bold: n === 0 }), T(x + 62, 88 + n * 8, w, { size: 3.4 })));
  lijst(40, gegevens);
  lijst(220, installatie);
  i.push(L([[35, 205], [395, 205]], { w: 0.35 }));
  i.push(T(40, 214, 'Normen', { size: 3.2, bold: true }), T(62, 214, normen.join('  ·  '), { size: 2.6 }));
  i.push(T(40, 232, `Bewerkt op: ${project.datum}`, { size: 3.6 }), T(150, 232, `door: ${project.getekend}`, { size: 3.6 }), T(300, 232, `Aantal bladen: ${bladen}`, { size: 3.6 }));
  return i;
}

/** inhoudsopgave (&EAB): een rij per blad, zoals het EPLAN-formulier */
export function inhoudsopgave(project, bladen) {
  const i = [T(FX0 + 3, 26, 'Inhoudsopgave', { size: 7 })];
  i.push(tabel(FX0 + 3, 32, [['Installatie', 34], ['Plaats', 30], ['Blad', 16], ['Bladbenaming', 150], ['Documentsoort', 46], ['Datum', 30], ['Getek.', 34], ['X', 10]],
    bladen.map((b) => [project.installatie, project.plaats, String(b.nr), [].concat(b.titel).join(' — '), `${b.soort} ${b.soortNaam}`, project.datum, project.getekend, ''])));
  i.push(T(FX0 + 3, TY - 6, 'X: een automatisch gemaakt blad dat met de hand werd nabewerkt.', { size: 2.3 }));
  return i;
}

/**
 * klemmenplan (&EMA) van één klemmenstrook, zoals het EPLAN-formulier: een rij per klem; links de doelen buiten de
 * kast (veld), rechts de doelen binnen (print, toestel); de laatste kolom verwijst naar blad en kolom in het schema
 * rijen: { klem, functie, extern, externAansl, kabel, intern, internAansl, brug, verwijzing }
 */
export function klemmenplan(strook, omschrijving, rijen) {
  const i = [T(FX0 + 3, 26, 'Klemmenplan', { size: 7 }), T(FX0 + 75, 26, `Klemmenstrook ${strook}`, { size: 4.5, bold: true }), T(FX0 + 150, 26, omschrijving, { size: 3 })];
  i.push(T(FX0 + 83, 35, 'veld (buiten)', { size: 2.4, italic: true }), T(FX0 + 247, 35, 'kast (binnen)', { size: 2.4, italic: true }));
  i.push(tabel(FX0 + 3, 38, [['Functietekst', 80], ['Kabel', 40], ['Doelaanduiding', 62], ['Aansl.', 16], ['Klem', 18], ['Brug', 12], ['Aansl.', 18], ['Doelaanduiding', 104], ['Blad/kolom', 30]],
    rijen.map((r) => [r.functie, r.kabel ?? '', r.extern ?? '', r.externAansl ?? '', r.klem, r.brug ?? '', r.internAansl ?? '', r.intern ?? '', r.verwijzing ?? '']), { h: 6.2 }));
  return i;
}

/** stuklijst (&EPC), zoals het EPLAN-formulier; rijen: [aanduiding, aantal, benaming, type] */
export function stuklijst(rijen, { vanaf = 0 } = {}) {
  return [T(FX0 + 3, 26, 'Stuklijst', { size: 7 }), tabel(FX0 + 3, 32, [['Aanduiding', 40], ['Aantal', 16], ['Benaming', 205], ['Type / artikelnummer', 123]], rijen.slice(vanaf), { h: 6.4, size: 2.4 })];
}

/** schrijft de bladen als blad-N.svg en samen als schema.html (A3 liggend, voor de PDF) */
export async function schrijf(dir, titel, svgs) {
  const { writeFileSync, readdirSync, unlinkSync } = await import('node:fs');
  const { join } = await import('node:path');
  for (const f of readdirSync(dir)) if (/^blad-\d+\.svg$/.test(f)) unlinkSync(join(dir, f));
  svgs.forEach((svg, k) => writeFileSync(join(dir, `blad-${k + 1}.svg`), svg));
  writeFileSync(join(dir, 'schema.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(titel)}</title>
<style>@page { size: A3 landscape; margin: 0 } body { margin: 0 } .blad { width: 420mm; height: 297mm; page-break-after: always; overflow: hidden } .blad svg { width: 420mm; height: 297mm; display: block }</style></head>
<body>${svgs.map((s) => `<div class="blad">${s.replace(/width="420mm" height="297mm" /, '')}</div>`).join('\n')}</body></html>`);
}

/** het hele project: bladen [{ titel, soort, soortNaam, inhoud }] krijgen nummer, totaal, vorig en volgend */
export function project(p, bladen) {
  const n = bladen.length;
  return bladen.map((b, k) => normblad(p, { ...b, nr: k + 1, totaal: n, vorig: k ? k : '', volgend: k < n - 1 ? k + 2 : '' }, b.inhoud));
}
export const SOORT = {
  titel: ['&EAA', 'Titelblad'], inhoud: ['&EAB', 'Inhoudsopgave'], schema: ['&EFS', 'Schema'], klemmen: ['&EMA', 'Klemmenplan'], stuk: ['&EPC', 'Stuklijst'],
};
export const NORMEN = ['IEC/EN 61082-1', 'IEC/EN 60617', 'IEC/EN 81346-1/-2', 'IEC 61355', 'ISO 7200', 'ISO 5457'];
