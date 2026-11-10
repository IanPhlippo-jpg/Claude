// Aanvraagdossier voor een leverancier of extrudeur (NL en EN): het aluminium profielsysteem voor taatsdeuren in steel
// look dat Ian nodig heeft (P1 vleugelprofiel, P2 roede, P3 kozijn, P4 glasrubber, C1 hoekverbinder, C2 schroeven,
// pivot), met de doorsneden op 2:1 en alle maten, de verbindingen en de offerteaanvraag met de hoeveelheden per deur.
// De doorsneden komen uit STAAF (prijzen.mjs), dezelfde als in de bibliotheek (systeem 'aanvraag').
// Gebruik: node bibliotheek/taatsdeuren/maak-aanvraag.mjs -> aanvraag/Profielaanvraag-NL.pdf en -EN.pdf
import { ontwerp, STIJLEN, MATEN } from './deuren.mjs';
import { STAAF } from './prijzen.mjs';
import { vooraanzicht } from './teken.mjs';
import { zaagplan } from './bestel.mjs';
import { telling } from './werkwijze.mjs';
import { sectie, tekenSectie } from './profielen.mjs';
import { maat } from './detail.mjs';
import { W, H, T, L, g, tabel, esc } from './blad.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
const KEUZE = { systeem: 'aanvraag' };

const TXT = {
  nl: {
    titel: 'Aanvraag profielsysteem: aluminium taatsdeur in steel look',
    sub: 'Gezocht: een leverancier of extrudeur die dit profielsysteem (of een gelijkwaardig systeem) per staaf levert. De tekeningen zijn een voorstel: een eigen profiel met dezelfde functie en maten is welkom.',
    blad: ['Overzicht en eisen', 'Doorsneden 2:1', 'Verbindingen', 'Offerteaanvraag'],
    kol: [['Code', 13], ['Onderdeel', 46], ['Maat (mm)', 34], ['Eisen', 110], ['Per deur*', 22, 1]],
    rij: {
      P1: ['Vleugelprofiel (kader)', '30 x 45, wand 1,8', 'glasgleuf 12,4 breed x 12 diep, midden in de diepte; holte 14,4 x 41,4 voor hoekverbinder C1'],
      P2: ['Roede (H-profiel)', '30 x 45, wand 1,8', 'gleuf 12,4 x 12 aan beide kanten; massieve kern 6 mm met 2 schroefkanalen Ø3,8'],
      P3: ['Kozijnprofiel', '40 x 50, wand 2', 'koker (mag een standaardkoker zijn); in verstek met hoekverbinder'],
      P4: ['U-glasrubber', '11 x 12,4', 'EPDM Shore A 70, zwart, voor glas 8-8,8 mm (44.2 gelaagd of 8 gehard); op rol'],
      C1: ['Hoekverbinder', 'past in 14,4 x 41,4', 'aluminium, 2 benen van 60 mm, 2 stelschroeven M6 per been (of geperst); ook voor P3'],
      C2: ['Schroef roede', 'RVS 4,8 x 50', 'verzonken, door P1 in het schroefkanaal van P2 (2 per roede-uiteinde)'],
      PV: ['Pivot (taats)', 'deur tot 150 kg', 'onderplaat en bovenpen, as 100 mm uit de rand; past op een vleugel van 45 diep'],
    },
    eisen: ['Algemene eisen', 'Materiaal: EN AW-6063 T6 (of T66). Maattoleranties volgens EN 755-9 en EN 12020-2; wand min. 1,8 mm.', 'Afwerking: poedercoat RAL 9005 fijnstructuur mat, Qualicoat klasse 1, 60-80 µm; ook RAL 7016 en 9016 mogelijk. Of geanodiseerd zwart.', 'Staaflengte 6000 mm (5800-6500 mag), beschermfolie op de zichtzijden, gebundeld per profiel.', 'Glas: gelaagd 44.2 (8,76 mm) of gehard 8 mm. Deur tot 1250 x 3000 mm en 150 kg; binnen.'],
    voorbeeld: 'Voorbeeld: Raster acht, opening 1000 x 2400 (de positie van elk profiel)',
    perDeur: '* meter per deur (Raster acht 1000 x 2400), zaagverlies niet meegerekend',
    doors: { P1: 'P1 vleugelprofiel', P2: 'P2 roede (H)', P3: 'P3 kozijn', P4: 'P4 U-glasrubber (EPDM)' },
    m: { zicht: 'zicht', diep: 'diep', wand: 'wand', gleuf: 'gleuf', holte: 'holte C1', kanaal: 'schroefkanaal', kern: 'kern', open: 'opening (glas)' },
    verb: [
      ['Hoek van de vleugel: verstek 45°', ['P1 in verstek zagen (45°).', 'C1 in beide benen, 2K-lijm op het verstek,', 'stelschroeven M6 vast. Glas mee inbouwen', 'voor het laatste kaderstuk sluit.']],
      ['Roede tegen het kader (T)', ['P2 recht op de daglichtmaat zagen.', 'Door P1 boren Ø5,5 (verzonken) en 2 schroeven', 'C2 in de schroefkanalen van P2; naad kitten.']],
      ['Glas in de gleuf', ['U-rubber P4 rond de rand van elke ruit.', 'Glas loopt 10 mm in de gleuf, 2 mm speling.', 'Glasmaat = daglicht + 8 mm rondom.']],
      ['Pivot', ['As 100 mm uit de scharnierkant.', 'Onderplaat in de onderregel P1 (holte),', 'bovenpen in de bovenregel; plafondplaatje.']],
    ],
    vraag: ['Gevraagd in de offerte', 'Prijs per meter of per kg, per profiel en per kleur (excl. btw); matrijskosten als het profiel nieuw is.', 'Minimale afname per profiel en per kleur; levertijd; levering in België (DAP) en verpakking.', 'Maattekening (PDF of DWG) van uw profiel met gewicht per meter; stalen van 300 mm per profiel.', 'Passende hoekverbinders (C1), rubbers (P4) en pivots (prijs per stuk), of een adres waar ze te koop zijn.', 'Betalingsvoorwaarden; certificaten (Qualicoat, EN 755).'],
    tabel: [['Deur (opening)', 62], ['P1 m', 18, 1], ['P2 m', 18, 1], ['P3 m', 18, 1], ['P4 m', 18, 1], ['C1 st', 16, 1], ['C2 st', 16, 1], ['Glas m²', 18, 1]],
    jaar: 'Verwachte afname: ______ deuren per jaar (± ______ m P1, ______ m P2, ______ m P3).',
    contact: ['Contact', 'Naam: ______________________   Bedrijf: Ian · laswerken', 'Adres: ___________________________________________', 'E-mail: ______________________   Telefoon: ____________________', 'Graag een offerte voor: ____________________ (datum)'],
    voet: 'Maten in mm. Doorsneden op schaal 2:1 op A3. Eerste hoekprojectie (ISO 5456-2).',
  },
  en: {
    titel: 'Request for quotation: aluminium steel-look pivot door profile system',
    sub: 'Wanted: a supplier or extruder delivering this profile system (or an equivalent one) in full bars. The drawings are a proposal: your own profile with the same function and dimensions is welcome.',
    blad: ['Overview and requirements', 'Sections 2:1', 'Joints', 'Request for quotation'],
    kol: [['Code', 13], ['Item', 46], ['Size (mm)', 34], ['Requirements', 110], ['Per door*', 22, 1]],
    rij: {
      P1: ['Door leaf profile (frame)', '30 x 45, wall 1.8', 'glass channel 12.4 wide x 12 deep, centred in depth; cavity 14.4 x 41.4 for corner cleat C1'],
      P2: ['Glazing bar (H profile)', '30 x 45, wall 1.8', 'channel 12.4 x 12 on both sides; solid 6 mm core with 2 screw ports Ø3.8'],
      P3: ['Door frame (jamb) profile', '40 x 50, wall 2', 'tube (may be a standard tube); mitred with corner cleat'],
      P4: ['U glazing gasket', '11 x 12.4', 'EPDM Shore A 70, black, for 8-8.8 mm glass (44.2 laminated or 8 tempered); on rolls'],
      C1: ['Corner cleat', 'fits 14.4 x 41.4', 'aluminium, 2 legs of 60 mm, 2 M6 set screws per leg (or crimp type); also for P3'],
      C2: ['Glazing bar screw', 'stainless 4.8 x 50', 'countersunk, through P1 into the screw port of P2 (2 per bar end)'],
      PV: ['Pivot hinge', 'door up to 150 kg', 'bottom plate and top pin, axis 100 mm from the edge; fits a 45 mm deep leaf'],
    },
    eisen: ['General requirements', 'Alloy EN AW-6063 T6 (or T66). Tolerances to EN 755-9 and EN 12020-2; minimum wall 1.8 mm.', 'Finish: powder coat RAL 9005 fine texture matt, Qualicoat class 1, 60-80 µm; RAL 7016 and 9016 also wanted. Or black anodised.', 'Bar length 6000 mm (5800-6500 accepted), protective film on visible faces, bundled per profile.', 'Glass: laminated 44.2 (8.76 mm) or tempered 8 mm. Door up to 1250 x 3000 mm and 150 kg; interior use.'],
    voorbeeld: 'Example: grid door, opening 1000 x 2400 (where each profile goes)',
    perDeur: '* metres per door (grid door 1000 x 2400), cutting loss not included',
    doors: { P1: 'P1 door leaf profile', P2: 'P2 glazing bar (H)', P3: 'P3 door frame', P4: 'P4 U glazing gasket (EPDM)' },
    m: { zicht: 'face', diep: 'depth', wand: 'wall', gleuf: 'channel', holte: 'cavity C1', kanaal: 'screw port', kern: 'core', open: 'opening (glass)' },
    verb: [
      ['Leaf corner: 45° mitre', ['Cut P1 at 45°.', 'C1 in both legs, 2K adhesive on the mitre,', 'tighten M6 set screws. Glass is fitted', 'before the last frame member closes.']],
      ['Glazing bar to frame (T joint)', ['Cut P2 square to the clear opening.', 'Drill P1 Ø5.5 (countersunk), 2 screws C2', 'into the screw ports of P2; seal the joint.']],
      ['Glass in the channel', ['U gasket P4 around each pane edge.', 'Glass enters 10 mm, 2 mm clearance.', 'Glass size = clear opening + 8 mm all round.']],
      ['Pivot', ['Axis 100 mm from the hinge side.', 'Bottom plate in the bottom rail P1 (cavity),', 'top pin in the top rail; ceiling plate.']],
    ],
    vraag: ['Please quote', 'Price per metre or per kg, per profile and per colour (excl. VAT); die cost if the profile is new.', 'Minimum order per profile and per colour; lead time; delivery to Belgium (DAP) and packing.', 'Dimensioned drawing (PDF or DWG) of your profile with weight per metre; 300 mm samples of each profile.', 'Matching corner cleats (C1), gaskets (P4) and pivot hinges (price each), or where to buy them.', 'Payment terms; certificates (Qualicoat, EN 755).'],
    tabel: [['Door (opening)', 62], ['P1 m', 18, 1], ['P2 m', 18, 1], ['P3 m', 18, 1], ['P4 m', 18, 1], ['C1 pcs', 16, 1], ['C2 pcs', 16, 1], ['Glass m²', 18, 1]],
    jaar: 'Expected volume: ______ doors per year (± ______ m P1, ______ m P2, ______ m P3).',
    contact: ['Contact', 'Name: ______________________   Company: Ian · laswerken (Belgium)', 'Address: _________________________________________', 'E-mail: ______________________   Phone: ____________________', 'Quotation requested by: ____________________ (date)'],
    voet: 'Dimensions in mm. Sections at scale 2:1 on A3. First angle projection (ISO 5456-2).',
  },
};

const kader = (el) => el.push(`<rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
/** titelblok (ISO 7200, ingekort) rechtsonder */
function blok(el, t, i, n) {
  const tx = W - 10 - 160, ty = H - 10 - 24, v = (x, r, k, w, h = 2.4, vet = false) => { if (x) el.push(L(tx + x, ty + r * 12, tx + x, ty + r * 12 + 12, 0.25)); el.push(T(tx + x + 1.2, ty + r * 12 + 3, k, 1.7, { kleur: '#555' }), T(tx + x + 1.2, ty + r * 12 + 9, w, h, { vet })); };
  el.push(`<rect x="${tx}" y="${ty}" width="160" height="24" fill="#fff" stroke="#111" stroke-width="0.5"/>`, L(tx, ty + 12, tx + 160, ty + 12, 0.25));
  v(0, 0, 'Ian · laswerken', t.titel.length > 70 ? `${t.titel.slice(0, 68)}…` : t.titel, 2.3, true);
  v(0, 1, '', t.blad[i], 2.6, true); v(100, 1, '', '2026-11-10', 2.3); v(130, 1, '', `${i + 1} / ${n}`, 2.6, true);
}
const svg = (inhoud) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${inhoud}</svg>`;
/** tekst over meerdere regels (afbreken op woorden) */
const regels = (el, x, y, tekst, max, h = 2.3, stap = 3.6, o = {}) => { const w = tekst.split(' '), r = ['']; for (const x2 of w) { if ((r.at(-1) + ' ' + x2).length > max) r.push(x2); else r[r.length - 1] += (r.at(-1) ? ' ' : '') + x2; } r.forEach((l, i) => el.push(T(x, y + i * stap, l, h, o))); return y + r.length * stap; };

/** hoeveelheden per deur uit de bibliotheek (systeem 'aanvraag') */
function perDeur(id, B, Hh) {
  const o = ontwerp(id, B, Hh, KEUZE), z = zaagplan(o, KEUZE), t = telling(o), m = (k) => (z.profielen.find((p) => p.prof === k)?.nodig ?? 0);
  const glas = o.vleugels.concat(o.vast).reduce((s, v) => s + v.ruiten.reduce((q, p) => q + Math.abs(p.reduce((a, c, i) => { const d = p[(i + 1) % p.length]; return a + c[0] * d[1] - d[0] * c[1]; }, 0)) / 2e6, 0), 0);
  return { o, P1: m('aanvraagP1'), P2: m('aanvraagP2'), P3: m('aanvraagP3'), P4: m('aanvraagP4'), C1: t.hoeken, C2: t.tees * 2, glas };
}

// ---------------------------------------------------------------- blad 1: overzicht en eisen
function blad1(t) {
  const el = []; kader(el);
  el.push(T(26, 19, t.titel, 4.6, { vet: true }));
  regels(el, 26, 25, t.sub, 190, 2.5, 3.6, { kleur: '#333' });
  // voorbeelddeur met de profielen aangeduid
  const v = perDeur('raster', 1000, 2400), o = v.o, s = 0.085, ox = 40, oy = 268;
  el.push(T(26, 38, t.voorbeeld, 2.8, { vet: true }));
  el.push(vooraanzicht(o, s, ox, oy, { maten: false, assen: true }));
  const X = (x) => ox + x * s, Y = (y) => oy - y * s, vl = o.vleugels[0];
  const label = (px, py, tx, ty, code) => el.push(`<circle cx="${f(px)}" cy="${f(py)}" r="0.7" fill="#c0392b"/>`, L(px, py, tx, ty, 0.2), `<circle cx="${f(tx)}" cy="${f(ty)}" r="4" fill="#fff" stroke="#c0392b" stroke-width="0.5"/>`, T(tx, ty + 1.1, code, 2.8, { anker: 'middle', vet: true, kleur: '#c0392b' }));
  label(X(vl.x + 15), Y(vl.y + 1200), X(vl.x) - 18, Y(vl.y + 1300), 'P1');
  const r = vl.delen.find((d) => d.soort === 'roede' && d.a && Math.abs(d.a[1] - d.b[1]) < 1);
  if (r) label(X(vl.x + (r.a[0] + r.b[0]) / 2), Y(vl.y + r.a[1]), X(vl.x + vl.B) + 20, Y(vl.y + r.a[1]) - 6, 'P2');
  label(X(15), Y(1800), X(0) - 18, Y(1900), 'P3');
  label(X(vl.x + vl.B * 0.3), Y(vl.y + 2100), X(vl.x + vl.B) + 20, Y(vl.y + 2150), 'P4');
  label(X(vl.x + 15), Y(vl.y + vl.H - 15), X(vl.x) - 18, Y(vl.y + vl.H + 60), 'C1');
  label(X(vl.x + 100), Y(vl.y + 5), X(vl.x + 100) + 24, Y(vl.y) + 12, 'PV');
  // tabel met de onderdelen
  const rijen = ['P1', 'P2', 'P3', 'P4', 'C1', 'C2', 'PV'].map((c) => [c, t.rij[c][0], t.rij[c][1], t.rij[c][2], c === 'P1' ? g(v.P1, 1) : c === 'P2' ? g(v.P2, 1) : c === 'P3' ? g(v.P3, 1) : c === 'P4' ? g(v.P4, 1) : c === 'C1' ? `${v.C1} st` : c === 'C2' ? `${v.C2} st` : `${o.vleugels.length} st`]);
  // lange eisen op 2 regels: tabel met hogere rijen
  const kx = 150, ky = 42, rh = 9, bt = t.kol.reduce((a, k) => a + k[1], 0);
  el.push(`<rect x="${kx}" y="${ky}" width="${bt}" height="${rh * (rijen.length + 1)}" fill="none" stroke="#111" stroke-width="0.3"/>`, `<rect x="${kx}" y="${ky}" width="${bt}" height="${rh}" fill="#e9ecee"/>`);
  let xx = kx; for (const [k, b, rechts] of t.kol) { el.push(T(rechts ? xx + b - 1.5 : xx + 1.5, ky + 6, k, 2.4, { vet: true, anker: rechts ? 'end' : undefined })); xx += b; }
  rijen.forEach((rij, i) => {
    const yy = ky + rh * (i + 1); el.push(L(kx, yy, kx + bt, yy, 0.15)); xx = kx;
    rij.forEach((c, j) => { const [, b, rechts] = t.kol[j]; if (j === 3) regels(el, xx + 1.5, yy + 4, c, 58, 2.1, 3.1); else el.push(T(rechts ? xx + b - 1.5 : xx + 1.5, yy + 5.6, c, j === 0 ? 2.8 : 2.3, { vet: j === 0, anker: rechts ? 'end' : undefined })); xx += b; });
  });
  el.push(T(kx, ky + rh * (rijen.length + 1) + 4, t.perDeur, 2, { kleur: '#555' }));
  let y = ky + rh * (rijen.length + 1) + 14;
  el.push(T(kx, y, t.eisen[0], 3, { vet: true })); y += 6;
  for (const e of t.eisen.slice(1)) y = regels(el, kx + 2, y, `• ${e}`, 120, 2.4, 3.7) + 1.5;
  blok(el, t, 0, 4);
  return svg(el.join('\n'));
}

// ---------------------------------------------------------------- blad 2: doorsneden 2:1 met alle maten
function blad2(t) {
  const el = []; kader(el);
  el.push(T(26, 19, `${t.blad[1]}: P1, P2, P3, P4`, 4, { vet: true }));
  const o = ontwerp('raster', 1000, 2400, KEUZE), s = 2;
  // P1
  {
    const sec = sectie(o, 'kader'), x = 50, y = 50;
    el.push(T(30, 36, t.doors.P1, 3.2, { vet: true }), T(30, 41, `${STAAF.aanvraagP1.kgm} kg/m · EN AW-6063 T6`, 2.3, { kleur: '#555' }));
    el.push(tekenSectie(sec, x, y, s, { o, glas: false, maten: false }));
    el.push(maat(x, y + 45 * s, x + 30 * s, y + 45 * s, -7, `${t.m.zicht} 30`), maat(x, y, x, y + 45 * s, -7, `${t.m.diep} 45`));
    el.push(maat(x + 30 * s, y + 16.3 * s, x + 30 * s, y + 28.7 * s, 8, `${t.m.gleuf} 12,4`), maat(x + 18 * s, y + 28.7 * s, x + 30 * s, y + 28.7 * s, -26, `12 (${t.m.gleuf})`));
    el.push(maat(x + 30 * s, y, x + 30 * s, y + 16.3 * s, 8, '16,3'), maat(x, y + 45 * s, x + 1.8 * s, y + 45 * s, -15, `${t.m.wand} 1,8`));
    el.push(`<rect x="${f(x + 1.8 * s)}" y="${f(y + 1.8 * s)}" width="${f(14.4 * s)}" height="${f(41.4 * s)}" fill="none" stroke="#1f5fa8" stroke-width="0.3" stroke-dasharray="1.5 0.8"/>`, T(x + 9 * s, y + 22.5 * s, `${t.m.holte}`, 2.2, { anker: 'middle', kleur: '#1f5fa8' }), T(x + 9 * s, y + 22.5 * s + 3.5, '14,4 x 41,4', 2.2, { anker: 'middle', kleur: '#1f5fa8' }));
  }
  // P2
  {
    const sec = sectie(o, 'roede'), x = 165, y = 50;
    el.push(T(150, 36, t.doors.P2, 3.2, { vet: true }), T(150, 41, `${STAAF.aanvraagP2.kgm} kg/m · EN AW-6063 T6`, 2.3, { kleur: '#555' }));
    el.push(tekenSectie(sec, x, y, s, { o, glas: false, maten: false }));
    el.push(maat(x, y + 45 * s, x + 30 * s, y + 45 * s, -7, `${t.m.zicht} 30`), maat(x + 30 * s, y, x + 30 * s, y + 45 * s, 7, `${t.m.diep} 45`));
    el.push(maat(x, y + 16.3 * s, x + 12 * s, y + 16.3 * s, 10, '12'), maat(x + 18 * s, y + 16.3 * s, x + 30 * s, y + 16.3 * s, 10, '12'), maat(x + 12 * s, y + 30.5 * s, x + 18 * s, y + 30.5 * s, -12, `${t.m.kern} 6`));
    el.push(maat(x, y + 16.3 * s, x, y + 28.7 * s, -8, '12,4'), T(x + 15 * s + 8, y + 22.5 * s - 9, `${t.m.kanaal} 2 x Ø3,8`, 2.2), L(x + 15 * s, y + 19.5 * s, x + 15 * s + 8, y + 22.5 * s - 10, 0.15));
    el.push(maat(x, y + 19.5 * s, x, y + 25.5 * s, -20, '6'));
  }
  // P3
  {
    const sec = sectie(o, 'kozijn'), x = 270, y = 45;
    el.push(T(255, 36, t.doors.P3, 3.2, { vet: true }), T(255, 41, `${STAAF.aanvraagP3.kgm} kg/m`, 2.3, { kleur: '#555' }));
    el.push(tekenSectie(sec, x, y, s, { o, glas: false, maten: false }));
    el.push(maat(x, y + 50 * s, x + 40 * s, y + 50 * s, -7, `${t.m.zicht} 40`), maat(x + 40 * s, y, x + 40 * s, y + 50 * s, 7, `${t.m.diep} 50`), maat(x, y + 50 * s, x + 2 * s, y + 50 * s, -15, `${t.m.wand} 2`));
  }
  // P4 (4:1)
  {
    const sec = sectie(o, 'glaslat'), x = 60, y = 190, s4 = 4;
    el.push(T(30, 176, `${t.doors.P4} (4:1)`, 3.2, { vet: true }), T(30, 181, 'EPDM Shore A 70', 2.3, { kleur: '#555' }));
    el.push(tekenSectie(sec, x, y, s4, { o, glas: false, maten: false }));
    el.push(maat(x, y + 12.4 * s4, x + 11 * s4, y + 12.4 * s4, -7, '11'), maat(x + 11 * s4, y, x + 11 * s4, y + 12.4 * s4, 7, '12,4'), maat(x + 11 * s4, y + 1.8 * s4, x + 11 * s4, y + 10.6 * s4, 18, `${t.m.open} 8,8`), maat(x, y, x + 2 * s4, y, 6, '2'));
  }
  // glas in P1 met het rubber (2:1)
  {
    const sec = sectie(o, 'kader'), x = 170, y = 190, s2 = 1.5;
    el.push(T(150, 176, `${t.verb[2][0]} (1,5:1)`, 3.2, { vet: true }));
    el.push(tekenSectie(sec, x, y, s2, { o, glas: true, maten: false }));
    el.push(maat(x + 20 * s2, y + 45 * s2, x + 30 * s2, y + 45 * s2, -7, '10'), T(x + 44 * s2 + 3, y + 22.5 * s2 + 1, '44.2 (8,76)', 2.3));
  }
  el.push(T(26, H - 16, t.voet, 2.2, { kleur: '#555' }));
  blok(el, t, 1, 4);
  return svg(el.join('\n'));
}

// ---------------------------------------------------------------- blad 3: verbindingen (vooraanzicht 1:1)
function blad3(t) {
  const el = []; kader(el);
  el.push(T(26, 19, t.blad[2], 4, { vet: true }));
  const vak = (x, y, w, h, [titel, tekst]) => { el.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#111" stroke-width="0.3"/>`, T(x + 3, y + 7, titel, 3, { vet: true })); tekst.forEach((r, i) => el.push(T(x + 3, y + h - 17 + i * 4, r, 2.4))); };
  const staaf = (pts, vul = '#d7dadc') => `<polygon points="${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="${vul}" stroke="#111" stroke-width="0.35"/>`;
  const stip = (x1, y1, x2, y2, k = '#1f5fa8') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${k}" stroke-width="0.3" stroke-dasharray="1.6 0.8"/>`;
  // 1. hoek: P1 in verstek met C1 (1:1)
  {
    const x0 = 26, y0 = 26, ox = x0 + 30, oy = y0 + 18, k = 30, l = 110;
    vak(x0, y0, 190, 120, t.verb[0]);
    el.push(staaf([[ox, oy], [ox + l, oy], [ox + l, oy + k], [ox + k, oy + k]]), staaf([[ox, oy], [ox + k, oy + k], [ox + k, oy + 75], [ox, oy + 75]]));
    el.push(`<line x1="${ox}" y1="${oy}" x2="${ox + k}" y2="${oy + k}" stroke="#c0392b" stroke-width="0.9"/>`, T(ox + k + 3, oy + k + 6, '45°', 3, { kleur: '#c0392b', vet: true }));
    // de hoekverbinder C1 (stippel) in beide benen, 60 mm, met stelschroeven
    el.push(stip(ox + 1.8, oy + 1.8, ox + 1.8 + 60, oy + 1.8), stip(ox + 1.8 + 60, oy + 1.8, ox + 1.8 + 60, oy + 16.2), stip(ox + 16.2, oy + 16.2, ox + 1.8 + 60, oy + 16.2), stip(ox + 1.8, oy + 1.8, ox + 1.8, oy + 61.8), stip(ox + 1.8, oy + 61.8, ox + 16.2, oy + 61.8), stip(ox + 16.2, oy + 16.2, ox + 16.2, oy + 61.8));
    for (const [cx, cy] of [[ox + 35, oy + 9], [ox + 52, oy + 9], [ox + 9, oy + 35], [ox + 9, oy + 52]]) el.push(`<circle cx="${cx}" cy="${cy}" r="1.6" fill="#fff" stroke="#1f5fa8" stroke-width="0.3"/>`);
    el.push(T(ox + 66, oy + 12, 'C1 (60 + 60)', 2.4, { kleur: '#1f5fa8' }), T(ox + 66, oy + 16, 'M6', 2.2, { kleur: '#1f5fa8' }), T(ox + l / 2 + 10, oy - 2, 'P1', 2.6, { vet: true }), T(ox - 3, oy + 50, 'P1', 2.6, { vet: true, anker: 'end' }));
  }
  // 2. roede tegen het kader: 2 schroeven C2 in de schroefkanalen (1:1)
  {
    const x0 = 222, y0 = 26, ox = x0 + 30, oy = y0 + 22;
    vak(x0, y0, 182, 120, t.verb[1]);
    el.push(staaf([[ox, oy], [ox + 120, oy], [ox + 120, oy + 30], [ox, oy + 30]]), staaf([[ox + 45, oy + 30], [ox + 75, oy + 30], [ox + 75, oy + 75], [ox + 45, oy + 75]], '#e2e5e7'));
    // schroeven door P1 (van boven) in de kanalen van P2 (vooraanzicht: de kanalen liggen achter elkaar in de diepte: één lijn)
    el.push(stip(ox + 60, oy - 2, ox + 60, oy + 30 + 40, '#c0392b'), `<polygon points="${f(ox + 57)},${f(oy - 2)} ${f(ox + 63)},${f(oy - 2)} ${f(ox + 60)},${f(oy + 1)}" fill="#c0392b"/>`);
    el.push(T(ox + 64, oy + 52, 'C2: 2 x RVS 4,8 x 50', 2.4, { kleur: '#c0392b' }), T(ox + 125, oy + 16, 'P1', 2.6, { vet: true }), T(ox + 79, oy + 70, 'P2', 2.6, { vet: true }));
  }
  // 3. glas in de gleuf (2:1) en 4. pivot (1:5)
  {
    const o = ontwerp('raster', 1000, 2400, KEUZE), x0 = 26, y0 = 150;
    vak(x0, y0, 190, 110, t.verb[2]);
    el.push(tekenSectie(sectie(o, 'kader'), x0 + 30, y0 + 16, 1.4, { o, glas: true, maten: false }), tekenSectie(sectie(o, 'roede'), x0 + 122, y0 + 16, 1.4, { o, glas: true, maten: false }));
  }
  {
    const x0 = 222, y0 = 150, ox = x0 + 30, oy = y0 + 72, s5 = 0.2;
    vak(x0, y0, 182, 110, t.verb[3]);
    // onderhoek van de vleugel (1:5) met de pivotas op 100 mm
    el.push(staaf([[ox, oy], [ox + 600 * s5, oy], [ox + 600 * s5, oy - 30 * s5], [ox + 30 * s5, oy - 30 * s5], [ox + 30 * s5, oy - 300 * s5], [ox, oy - 300 * s5]]));
    el.push(`<line x1="${f(ox + 100 * s5)}" y1="${f(oy - 330 * s5)}" x2="${f(ox + 100 * s5)}" y2="${f(oy + 12)}" stroke="#c0392b" stroke-width="0.3" stroke-dasharray="6 1.2 1.2 1.2"/>`, `<rect x="${f(ox + 70 * s5)}" y="${f(oy)}" width="${f(60 * s5)}" height="3" fill="#555"/>`);
    el.push(maat(ox, oy + 6, ox + 100 * s5, oy + 6, -4, '100'), T(ox + 100 * s5 + 3, oy - 70 * s5, 'pivot', 2.4, { kleur: '#c0392b' }), L(ox - 10, oy + 3, ox + 140, oy + 3, 0.4));
  }
  blok(el, t, 2, 4);
  return svg(el.join('\n'));
}

// ---------------------------------------------------------------- blad 4: offerteaanvraag
function blad4(t) {
  const el = []; kader(el);
  el.push(T(26, 19, t.blad[3], 4, { vet: true }));
  let y = 30;
  el.push(T(26, y, t.vraag[0], 3.2, { vet: true })); y += 7;
  for (const v of t.vraag.slice(1)) y = regels(el, 28, y, `• ${v}`, 120, 2.6, 4.2) + 1.5;
  y += 6;
  // hoeveelheden per deur voor een paar typische deuren
  const deuren = [['strak', 1000, 2400], ['drievak', 1000, 2400], ['viervak', 1000, 2400], ['raster', 1000, 2400], ['raster12', 1000, 2400], ['japandi', 1000, 2600], ['strak', 1200, 2800]].filter(([id]) => STIJLEN.some((s) => s.id === id));
  const rijen = deuren.map(([id, B, Hh]) => { try { const v = perDeur(id, B, Hh), s = STIJLEN.find((x) => x.id === id); return [`${s.naam} ${B} x ${Hh}`, g(v.P1, 1), g(v.P2, 1), g(v.P3, 1), g(v.P4, 1), v.C1, v.C2, g(v.glas, 2)]; } catch { return null; } }).filter(Boolean);
  const [tt, th] = tabel(26, y, t.tabel, rijen, 5.2, 2.5);
  el.push(tt); y += th + 8;
  el.push(T(26, y, t.jaar, 2.7)); y += 14;
  el.push(T(26, y, t.contact[0], 3.2, { vet: true })); y += 7;
  for (const c of t.contact.slice(1)) { el.push(T(28, y, c, 2.7)); y += 6.5; }
  // rechts: de vier doorsneden klein ter herinnering
  const o = ontwerp('raster', 1000, 2400, KEUZE);
  [['kader', 'P1'], ['roede', 'P2'], ['kozijn', 'P3']].forEach(([rol, code], i) => { const x = 250 + i * 55, yy = 40; el.push(T(x, yy - 4, code, 3, { vet: true }), tekenSectie(sectie(o, rol), x + (rol === 'roede' ? 14 : 0), yy, 1, { o, glas: rol !== 'kozijn', maten: false })); });
  blok(el, t, 3, 4);
  return svg(el.join('\n'));
}

/** de vier bladen van het aanvraagdossier in taal 'nl' of 'en' */
export function aanvraagBladen(taal = 'nl') { const t = TXT[taal]; return [blad1(t), blad2(t), blad3(t), blad4(t)]; }
export { MATEN, esc };
