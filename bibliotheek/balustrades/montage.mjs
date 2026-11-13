// Montage per verbinding van een balustrade: kleine 3D-scènes (uit elkaar en samen) van de voet (voetplaat met ankers
// of console met afstandhouders), de vulling (spijl op de regel, staaf of plaat tegen de staander), de handregel (op de
// staander en in verstek op de hoek), de glasklem en het U-profiel. Elke scène bestaat uit convexe prisma's in mm
// (x rechts, y omhoog, z naar de kijker); de 3D op de pagina is verbinding3d.mjs van de taatsdeuren, het A4-blad
// tekent ze isometrisch met tekenScène (taatsdeuren/montage.mjs). Node en browser.
import { tekenScène } from '../taatsdeuren/montage.mjs';
import { KLEUR } from '../taatsdeuren/verbinding.mjs';
import { PROFIEL, ANKER, GLASOPBOUW, KOOP } from './onderdelen.mjs';
import { hoogtes } from './model.mjs';
import { esc, eersteHoek, naamVan, maatTekst } from './blad.mjs';

// ---------------------------------------------------------------- prisma's (zoals taatsdeuren/verbinding.mjs)
const P = (as, pts, a0, a1, pts1 = null) => ({ as, pts, a0, a1, pts1 });
const cirkel = (cu, cv, r, n = 14) => Array.from({ length: n }, (_, i) => [cu + r * Math.cos((2 * Math.PI * i) / n), cv + r * Math.sin((2 * Math.PI * i) / n)]);
const cil = (as, cu, cv, r, a0, a1, n = 14) => P(as, cirkel(cu, cv, r, n), a0, a1);
const doos = (x0, x1, y0, y1, z0, z1) => P('z', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1);
const zeskant = (as, cu, cv, s, a0, a1) => P(as, cirkel(cu, cv, s / Math.sqrt(3), 6), a0, a1);
/** koker (4 wanden) of buis of vol profiel langs y, van y0 tot y1, gecentreerd op (x, z) */
function staanderSolids(Pf, x, z, y0, y1) {
  if (Pf.vorm === 'buis') return [cil('y', x, z, Pf.b / 2, y0, y1, 20)];
  if (Pf.vorm === 'rond') return [cil('y', x, z, Pf.b / 2, y0, y1, 14)];
  if (Pf.vorm !== 'koker') return [doos(x - Pf.b / 2, x + Pf.b / 2, y0, y1, z - Pf.h / 2, z + Pf.h / 2)];
  const b = Pf.b / 2, h = Pf.h / 2, t = Pf.t;
  return [doos(x - b, x + b, y0, y1, z - h, z - h + t), doos(x - b, x + b, y0, y1, z + h - t, z + h), doos(x - b, x - b + t, y0, y1, z - h + t, z + h - t), doos(x + b - t, x + b, y0, y1, z - h + t, z + h - t)];
}
const BETON = '#cfcac0', GLAS = '#9fd0e3', INOX = '#c5ccd3', ALU = '#c5ccd3', STAAL = KLEUR.staal;
const ankerDelen = (A, pts, as, nr, buiten, uit) => {
  const d = [{ naam: A.naam, nr, label: `${A.mortel ? 'draadstang in injectiemortel' : 'keilbout'} M${A.d}, hef ${A.hef}${buiten ? ', RVS A4' : ''}`, kleur: KLEUR.bout, uit, solids: pts.flatMap(([x, y, z]) => (as === 'y' ? [cil('y', x, z, A.d / 2, y - A.hef, y + 22, 10), zeskant('y', x, z, A.d * 1.6, y + 2, y + 2 + A.d * 0.8), cil('y', x, z, A.d * 1.05, y, y + 2, 14)] : [cil('z', x, y, A.d / 2, z - A.hef, z + 22, 10), zeskant('z', x, y, A.d * 1.6, z + 2, z + 2 + A.d * 0.8), cil('z', x, y, A.d * 1.05, z, z + 2, 14)])) }];
  if (A.mortel) d.push({ naam: 'Injectiemortel fischer FIS V Plus', kleur: '#d9c27a', alleenSamen: true, solids: pts.map(([x, y, z]) => (as === 'y' ? cil('y', x, z, A.gat / 2, y - A.hef, y - 2, 12) : cil('z', x, y, A.gat / 2, z - A.hef, z - 2, 12))) });
  return d;
};

/** de scènes van een balustrade */
export function montage(o) {
  const k = o.k, sc = [], buiten = k.plaats === 'buiten', A = ANKER[o.ankerType];
  if (k.soort === 'glasU') {
    const G = GLASOPBOUW[o.glas.opbouw], zij = k.bevestiging === 'zij', t = G.dikte;
    const prof = zij ? [doos(-60, 60, -170, 30, 0, 8), doos(-60, 60, -170, 30, 8 + 0, 8), doos(-60, 60, -60, -50, 8, 50 + t), doos(-60, 60, -60, 30, 50 + t, 58 + t), doos(-60, 60, -60, 30, 8, 18)] : [doos(-60, 60, 0, 12, -50, 50), doos(-60, 60, 12, 110, -50, -t / 2 - 22), doos(-60, 60, 12, 110, t / 2 + 22, 50)];
    const gz = zij ? 8 + 21 + t / 2 : 0;
    sc.push({ id: 'uprofiel', titel: 'Glas in het U-profiel', sub: `Q-railing Easy Glass Smart ${zij ? 'zijmontage MOD 8240' : 'topmontage MOD 8210'}, glas ${G.naam}`, materiaal: 'alu',
      delen: [
        { naam: 'Vloer (beton)', kleur: BETON, solids: [zij ? doos(-90, 90, -300, 0, -200, 0) : doos(-90, 90, -120, 0, -90, 90)], geenNr: true },
        ...ankerDelen(A, zij ? [[0, -120, 0]] : [[0, 12, 0]], zij ? 'z' : 'y', 2, buiten, zij ? [0, 0, 120] : [0, 160, 0]),
        { naam: KOOP[zij ? 'qrZij' : 'qrTop'].naam.split(',')[0], nr: 1, label: 'aluminium, op maat gezaagd, gaten voorgeboord', kleur: ALU, uit: [0, zij ? 0 : 60, zij ? 60 : 0], solids: prof },
        { naam: 'Rubberset MOD 8200', nr: 3, label: 'klemrubbers aan beide kanten van het glas', kleur: KLEUR.rubber, uit: [0, 220, 0], solids: [doos(-55, 55, zij ? -20 : 20, zij ? 25 : 105, gz - t / 2 - 18, gz - t / 2), doos(-55, 55, zij ? -20 : 20, zij ? 25 : 105, gz + t / 2, gz + t / 2 + 18)] },
        { naam: `Glas ${G.naam}`, nr: 4, label: 'gehard-gelaagd, op zetblokjes', kleur: GLAS, alpha: 0.55, uit: [0, 420, 0], solids: [doos(-60, 60, zij ? -95 : 20, 420, gz - t / 2, gz + t / 2)] },
      ],
      gaten: [{ p: zij ? [0, -120, 8] : [0, 12, 0], volg: 'x', tekst: `Ø${A.gat} x ${A.diep} in beton, ${A.naam}, om de ${o.ankerAfstand} mm` }],
      middelen: [[A.naam, `om de ${o.ankerAfstand} mm`, A.mortel ? 'ETA-02/0024' : 'ETA-05/0069'], ['Rubberset Q-railing MOD 8200', '1 per 2,5 m', 'Q-railing'], ['Eindkap MOD 8212', '2', '']],
      stappen: [`Zet de ankers om de ${o.ankerAfstand} mm in de vloer${zij ? 'rand' : ''} (plaatsingsblad), profiel waterpas met uitvulplaatjes.`, 'Leg de zetblokjes in het profiel en zet het glas erop (2 personen, zuignappen).', 'Duw de rubbers aan beide kanten in en zet het glas met de stelsleutel loodrecht.', 'Eindkappen en, buiten, het drainageprofiel; voeg tussen de platen 8 mm.'],
      let: 'Geen gaten boren in het glas en het profiel niet lassen: alles is geklemd.', kijk: { yaw: -35, pitch: 22 } });
    if (k.hr === 'rond') sc.push({ id: 'handregelU', titel: 'U-handregel op het glas', sub: 'Q-railing Ø42,4 inox met glasrubber MOD 5124', materiaal: 'alu',
      delen: [
        { naam: `Glas ${G.naam}`, nr: 1, kleur: GLAS, alpha: 0.55, solids: [doos(-200, 200, 0, 200, -t / 2, t / 2)] },
        { naam: 'Glasrubber MOD 5124', nr: 2, label: 'in de sleuf van de handregel', kleur: KLEUR.rubber, uit: [0, 60, 0], solids: [doos(-200, 200, 190, 212, -t / 2 - 2, t / 2 + 2)] },
        { naam: 'U-handregel Ø42,4 inox MOD 6920', nr: 3, label: 'op maat gezaagd, verstek in de hoeken', kleur: INOX, uit: [0, 130, 0], solids: [P('x', cirkel(212, 0, 21.2, 20), -200, 200)] },
        { naam: 'Eindkap MOD 6732', nr: 4, kleur: INOX, uit: [80, 130, 0], solids: [P('x', cirkel(212, 0, 21.5, 20), 200, 206)] },
      ],
      middelen: [['Glasrubber MOD 5124', 'rol 5 m', ''], ['Eindkap MOD 6732', '2', ''], [o.hoeken ? 'Verbinder MOD 6790 per hoek' : 'Verbinder MOD 6790 bij een stuik', String(Math.max(0, o.segs.length - 1)), '']],
      stappen: ['Zaag de handregel op lengte (RVS-zaagblad), verstek op de hoeken.', 'Leg de rubber op de glasrand en klop de handregel erover met een rubberen hamer.', 'Eindkappen erop; hoeken met de verbinder.'], kijk: { yaw: -30, pitch: 26 } });
    return sc;
  }
  const Pf = PROFIEL[o.staander.prof], vp = o.staander.voet, zij = k.bevestiging === 'zij', hh = hoogtes(k), inox = o.st.staander === 'inox';
  const postKleur = inox ? INOX : STAAL;
  // ---- voet
  if (!zij) {
    const e = vp.b / 2 - 25, tot = 420;
    sc.push({ id: 'voet', titel: 'Staander op de voetplaat', sub: `${Pf.naam} op ${vp.b} x ${vp.l} x ${vp.t}, ${vp.gaten.length} x ${A.naam}`, materiaal: inox ? 'inox' : 'staal',
      delen: [
        { naam: 'Vloer (beton)', kleur: BETON, solids: [doos(-vp.b, vp.b, -140, -6, -vp.b, vp.b)], geenNr: true },
        { naam: 'Uitvulplaatjes', nr: 4, label: 'kunststof 1-5 mm, onder de plaat', kleur: '#3a3f44', uit: [0, 40, 0], solids: [doos(-e - 15, -e + 15, -6, 0, -15, 15), doos(e - 15, e + 15, -6, 0, -15, 15)] },
        { naam: `Voetplaat ${vp.b} x ${vp.l} x ${vp.t}`, nr: 2, label: `lasergesneden, ${vp.gaten.length} x Ø${A.plaatgat}`, kleur: inox ? INOX : KLEUR.plaat, uit: [0, 90, 0], solids: [doos(-vp.b / 2, vp.b / 2, 0, vp.t, -vp.l / 2, vp.l / 2)] },
        { naam: `Staander ${Pf.naam}`, nr: 1, label: 'haaks gezaagd', kleur: postKleur, uit: [0, 230, 0], solids: staanderSolids(Pf, 0, 0, vp.t, tot) },
        ...(inox ? [] : [{ naam: 'Lasnaad', label: `hoeklas a${Math.min(5, Math.max(3, Pf.t ?? 4))} rondom`, kleur: KLEUR.las, alleenSamen: true, solids: [doos(-Pf.b / 2 - 4, Pf.b / 2 + 4, vp.t, vp.t + 4, -Pf.h / 2 - 4, -Pf.h / 2), doos(-Pf.b / 2 - 4, Pf.b / 2 + 4, vp.t, vp.t + 4, Pf.h / 2, Pf.h / 2 + 4), doos(-Pf.b / 2 - 4, -Pf.b / 2, vp.t, vp.t + 4, -Pf.h / 2, Pf.h / 2), doos(Pf.b / 2, Pf.b / 2 + 4, vp.t, vp.t + 4, -Pf.h / 2, Pf.h / 2)] }]),
        ...ankerDelen(A, vp.gaten.map(([x, z]) => [x, vp.t, z]), 'y', 3, buiten, [0, 330, 0]),
      ],
      gaten: [{ p: [vp.gaten[1][0], vp.t, vp.gaten[1][1]], volg: `Voetplaat ${vp.b} x ${vp.l} x ${vp.t}`, tekst: `${vp.gaten.length} x Ø${A.plaatgat} in de plaat; Ø${A.gat} x ${A.diep} in het beton` }],
      middelen: [[A.naam, `${vp.gaten.length} per staander`, A.mortel ? 'ETA-02/0024' : 'ETA-05/0069'], ['Moer en sluitring', `${vp.gaten.length}`, 'ISO 4032 / ISO 7089'], inox ? ['Afdekrozet Ø48,3', '1', ''] : ['Hoeklas', `a${Math.min(5, Math.max(3, Pf.t ?? 4))} rondom`, 'ISO 2553, ISO 5817-C']],
      stappen: [`Las de staander haaks op de voetplaat (mal op de lastafel), hoeklas rondom.`, 'Zet de ankers in de vloer (plaatsingsblad: boren, reinigen, mortel of keilbout).', 'Uitvulplaatjes onder de plaat tot de staander loodrecht staat.', `Sluitring en moer op elk anker, aandraaien met de momentsleutel (${A.mortel ? (A.d === 12 ? 40 : 20) : A.d === 12 ? 60 : 45} Nm).`],
      let: 'Buiten: kitvoeg rond de voetplaat bovenaan, geen water laten staan.', kijk: { yaw: -35, pitch: 26 } });
  } else {
    sc.push({ id: 'voet', titel: 'Zijmontage tegen de vloerrand', sub: `${Pf.naam}, 2 afstandhouders 40x40x3, console ${vp.b} x 230 x ${vp.t}`, materiaal: 'staal',
      delen: [
        { naam: 'Vloerrand (beton)', kleur: BETON, solids: [doos(-160, 160, -300, 0, -320, 0)], geenNr: true },
        { naam: `Console ${vp.b} x 230 x ${vp.t}`, nr: 2, label: `lasergesneden, ${vp.gaten.length} x Ø${A.plaatgat}`, kleur: KLEUR.plaat, uit: [0, 0, 70], solids: [doos(-vp.b / 2, vp.b / 2, -250, -20, 0, vp.t)] },
        { naam: 'Afstandhouders koker 40x40x3', nr: 3, label: '30 lang, haaks', kleur: STAAL, uit: [0, 0, 130], solids: [doos(-20, 20, -110, -70, vp.t, vp.t + 30), doos(-20, 20, -180, -140, vp.t, vp.t + 30)] },
        { naam: `Staander ${Pf.naam}`, nr: 1, label: 'loopt 250 mm onder de vloerpas door', kleur: postKleur, uit: [0, 0, 210], solids: staanderSolids(Pf, 0, vp.t + 30 + Pf.h / 2, -250, 220) },
        { naam: 'Lasnaad', label: 'hoeklas a3 rondom', kleur: KLEUR.las, alleenSamen: true, solids: [doos(-23, 23, -113, -110, vp.t, vp.t + 30), doos(-23, 23, -183, -180, vp.t, vp.t + 30)] },
        ...ankerDelen(A, vp.gaten.map(([x, y]) => [x, y, vp.t]), 'z', 4, buiten, [0, 0, 300]),
      ],
      gaten: [{ p: [vp.gaten[0][0], vp.gaten[0][1], vp.t], volg: `Console ${vp.b} x 230 x ${vp.t}`, tekst: `${vp.gaten.length} x Ø${A.plaatgat} in de console; Ø${A.gat} x ${A.diep} in de vloerrand` }],
      middelen: [[A.naam, `${vp.gaten.length} per staander`, A.mortel ? 'ETA-02/0024' : 'ETA-05/0069'], ['Hoeklas', 'a3 rondom', 'ISO 2553'], ['Uitvulplaatjes', 'achter de console', '']],
      stappen: ['Las de afstandhouders haaks op de staander en de console erop (mal: alle consoles even hoog).', 'Boor de ankers in de vloerrand op 60 en 190 mm onder de vloerpas.', 'Console op de ankers, uitvullen tot de staander loodrecht staat, moeren aandraaien.'],
      let: `De vloerrand moet ≥ 260 mm dik zijn (hier ${k.vloerdikte} mm) en de randafstand van het anker volgens de ETA.`, kijk: { yaw: -55, pitch: 18 } });
  }
  // ---- vulling
  if (k.soort === 'spijlen') {
    const S = PROFIEL[o.st.spijl], gap = o.openingen.find((x) => /spijlen/.test(x.wat))?.mm ?? 100;
    sc.push({ id: 'vulling', titel: 'Spijlen op de onderregel', sub: `${S.naam} om de ${Math.round(gap + S.b)} mm tussen koker 40x20x2 en de ${hh.bovenregel ? 'bovenregel' : 'handregel'}`, materiaal: 'staal',
      delen: [
        { naam: `Staander ${Pf.naam}`, nr: 1, kleur: STAAL, solids: staanderSolids(Pf, -Pf.b / 2, 0, 0, 380) },
        { naam: 'Onderregel koker 40x20x2', nr: 2, label: 'tussen de staanders, haaks', kleur: STAAL, uit: [60, -60, 0], solids: [doos(0, 360, 60, 80, -20, -18), doos(0, 360, 60, 80, 18, 20), doos(0, 360, 60, 62, -18, 18), doos(0, 360, 78, 80, -18, 18)] },
        { naam: `Spijlen ${S.naam}`, nr: 3, label: `tussenruimte ${Math.round(gap)} mm (≤ 110)`, kleur: STAAL, uit: [60, 120, 0], solids: [0, 1, 2].map((i) => S.vorm === 'rond' ? cil('y', gap + S.b / 2 + i * (gap + S.b), 0, S.b / 2, 80, 380, 12) : doos(gap + i * (gap + S.b), gap + S.b + i * (gap + S.b), 80, 380, -S.h / 2, S.h / 2)) },
        { naam: 'Lasnaad', label: 'hoeklas a3 rondom', kleur: KLEUR.las, alleenSamen: true, solids: [0, 1, 2].map((i) => doos(gap - 2 + i * (gap + S.b), gap + S.b + 2 + i * (gap + S.b), 80, 83, -S.h / 2 - 2, S.h / 2 + 2)) },
      ],
      middelen: [['Hoeklas spijl op regel', 'a3 rondom', 'ISO 2553'], ['Hoeklas regel tegen staander', 'a3 rondom', 'ISO 2553'], ['Latje als mal', `${Math.round(gap)} mm`, '']],
      stappen: ['Leg de staanders op de lastafel, regels ertussen haaks hechten.', `Zet de spijlen met een latje van ${Math.round(gap)} mm als mal, hecht onder en boven.`, 'Las rondom, beurtelings links en rechts zodat het veld vlak blijft; slijp de lassen vlak.'], kijk: { yaw: -28, pitch: 20 } });
  } else if (k.soort === 'staven') {
    const pl = o.st.vulling === 'plaat';
    const S = pl ? null : PROFIEL[o.st.staaf];
    sc.push({ id: 'vulling', titel: pl ? 'Plaat in het veld' : 'Horizontale staven en plint', sub: pl ? `plaat 3 mm ${o.st.patroon}, onderbroken gelast` : `${S.naam} tegen de staander, plint tot 450 mm`, materiaal: 'staal',
      delen: [
        { naam: `Staander ${Pf.naam}`, nr: 1, kleur: STAAL, solids: staanderSolids(Pf, -Pf.b / 2, 0, 0, 600) },
        ...(pl ? [{ naam: 'Plaat 3 mm (lasergesneden)', nr: 2, label: 'in het midden van de staander', kleur: '#8f969e', uit: [80, 0, 80], solids: [doos(2, 360, 80, 600, -1.5, 1.5)] }, { naam: 'Lasnaad', label: 'a3 30(150) aan beide kanten', kleur: KLEUR.las, alleenSamen: true, solids: [doos(0, 3, 150, 180, -4, 4), doos(0, 3, 330, 360, -4, 4), doos(0, 3, 510, 540, -4, 4)] }]
          : [{ naam: 'Plint 3 mm', nr: 2, label: 'dicht van 50 tot 450 mm: niet beklimbaar', kleur: '#8f969e', uit: [80, 0, 80], solids: [doos(2, 360, 50, 450, -1.5, 1.5)] }, { naam: `Staven ${S.naam}`, nr: 3, label: 'tussenruimte ≤ 110 mm', kleur: STAAL, uit: [80, 60, 0], solids: [0, 1].map((i) => S.vorm === 'rond' ? cil('x', 470 + i * 120, 0, S.b / 2, 0, 360, 12) : doos(0, 360, 470 + i * 120, 470 + i * 120 + S.b, -S.h / 2, S.h / 2)) }, { naam: 'Lasnaad', label: 'a3 rondom', kleur: KLEUR.las, alleenSamen: true, solids: [0, 1].map((i) => doos(0, 3, 466 + i * 120, 470 + i * 120 + S.b + 4, -S.h / 2 - 2, S.h / 2 + 2)) }]),
      ],
      middelen: pl ? [['Onderbroken hoeklas', 'a3 30(150)', 'ISO 2553']] : [['Hoeklas staaf tegen staander', 'a3 rondom', 'ISO 2553'], ['Plint', 'onderbroken a3 30(150)', 'ISO 2553']],
      stappen: pl ? ['Plaat in het midden van de staanders op afstandsblokjes.', 'Hecht om de 150 mm aan beide kanten, beurtelings.', 'Onderbroken lassen 30 mm; niet doorlassen zodat de plaat niet trekt.'] : ['Plint tussen de staanders, onderbroken gelast.', 'Staven met afstandsblokjes als mal (≤ 110 mm), hechten en rondom lassen.', 'Lassen vlak slijpen.'],
      let: pl ? '' : 'Horizontale staven zijn beklimbaar: de plint tot 450 mm is verplicht in een woning (NBN B 03-004).', kijk: { yaw: -28, pitch: 18 } });
  } else {
    const G = GLASOPBOUW[o.glas.opbouw], t = G.dikte;
    sc.push({ id: 'klem', titel: 'Glas in de glasklemmen', sub: `${KOOP[inox ? 'klemRond' : 'klemVlak'].naam.split(',')[0]}, glas ${G.naam}`, materiaal: 'glas',
      delen: [
        { naam: `Staander ${Pf.naam}`, nr: 1, kleur: postKleur, solids: staanderSolids(Pf, -Pf.b / 2, 0, 0, 260) },
        ...(inox ? [] : [{ naam: 'Blindklinkmoer M8', nr: 2, label: 'in een gat Ø11 in de wand', kleur: KLEUR.bout, uit: [40, 0, 0], solids: [cil('x', 130, 0, 5.5, -1, 12, 12), cil('x', 130, 0, 7.5, -1, 0, 12)] }]),
        { naam: 'Glasklem RVS', nr: 3, label: 'met rubbers voor het glas', kleur: INOX, uit: [110, 0, 0], solids: [doos(0, 45, 105, 155, -t / 2 - 9, -t / 2), doos(0, 45, 105, 155, t / 2, t / 2 + 9), doos(0, 12, 105, 155, -t / 2, t / 2)] },
        { naam: 'Bolkopschroef M8x16 RVS', nr: 4, label: 'ISO 7380', kleur: KLEUR.bout, uit: [190, 0, 0], solids: [cil('x', 130, 0, 4, 0, 16, 10)] },
        { naam: `Glas ${G.naam}`, nr: 5, label: '12 mm van de staander, op rubbertjes', kleur: GLAS, alpha: 0.55, uit: [300, 0, 0], solids: [doos(12, 380, 20, 260, -t / 2, t / 2)] },
      ],
      gaten: inox ? [] : [{ p: [0, 130, 0], volg: `Staander ${Pf.naam}`, tekst: 'Ø11 doorgaand in één wand, blindklinkmoer M8' }],
      middelen: [['Glasklem Q-railing MOD 2100', '4 per glasplaat', 'Q-railing'], inox ? ['Bevestiging op de buis', 'volgens Q-railing', ''] : ['Blindklinkmoer M8 RVS', '1 per klem', 'ISO 15983'], ['Bolkopschroef M8x16 RVS', '1 per klem', 'ISO 7380']],
      stappen: ['Boor Ø11 in de staander, 120 mm van boven en onder het glas (stuktekening), zet de blindklinkmoer.', 'Na het coaten: klemmen losjes vastschroeven.', 'Glas erin met de rubbers, uitlijnen (voeg gelijk), klemmen aandraaien.'], let: 'Geen staal tegen glas: altijd de rubbers van de klem.', kijk: { yaw: -40, pitch: 18 } });
  }
  // ---- handregel (op de staander, verstek op de hoek als er een is)
  const hoek = o.hoeken > 0 || o.knikken > 0, rond = k.hr === 'rond', inoxHr = rond && k.soort === 'glasstaal';
  const top = 300, hrY = rond ? top + (inoxHr ? 50 : 0) + 21.2 : top + 4;
  const hrA = rond ? P('x', cirkel(hrY, 0, 21.2, 20), -360, hoek ? 0 : 360) : hoek ? P('y', [[-360, -25], [-25, -25], [25, 25], [-360, 25]], top, top + 8) : doos(-360, 360, top, top + 8, -25, 25);
  const hrB = hoek ? (rond ? P('z', cirkel(0, hrY, 21.2, 20), -360, 0) : P('y', [[-25, -360], [25, -360], [25, 25], [-25, -25]], top, top + 8)) : null;
  sc.push({ id: 'handregel', titel: hoek ? 'Handregel in verstek op de hoekstaander' : 'Handregel op de staander', sub: `${rond ? (inoxHr ? 'inox Ø42,4 op een drager' : 'buis Ø42,4x2,6') : 'platstaal 50x8'} op ${Pf.naam}`, materiaal: inoxHr ? 'inox' : 'staal',
    delen: [
      { naam: `Staander ${Pf.naam}`, nr: 1, kleur: postKleur, solids: staanderSolids(Pf, 0, 0, 0, top) },
      ...(inoxHr ? [{ naam: 'Handregeldrager RVS', nr: 3, label: 'geschroefd op de staander', kleur: INOX, uit: [0, 60, 0], solids: [cil('y', 0, 0, 8, top, top + 50, 12), doos(-20, 20, top, top + 4, -20, 20)] }] : []),
      { naam: `Handregel ${rond ? 'Ø42,4' : '50x8'}${hoek ? ' (lijn 1)' : ''}`, nr: 2, label: hoek ? 'verstek op de hoek' : 'doorlopend over de staanders', kleur: inoxHr ? INOX : STAAL, uit: [-120, 130, 0], solids: [rond ? (hoek ? P('x', cirkel(hrY, 0, 21.2, 20), -360, 0) : P('x', cirkel(hrY, 0, 21.2, 20), -360, 360)) : hrA] },
      ...(hoek ? [{ naam: `Handregel ${rond ? 'Ø42,4' : '50x8'} (lijn 2)`, nr: 4, label: 'verstek op de hoek', kleur: inoxHr ? INOX : STAAL, uit: [0, 130, -120], solids: [rond ? P('z', cirkel(0, hrY, 21.2, 20), -360, 0) : hrB] }] : []),
      ...(inoxHr ? [] : [{ naam: 'Lasnaad', label: hoek ? 'V-naad in het verstek, a3 op de staander' : 'a3 aan beide zijden', kleur: KLEUR.las, alleenSamen: true, solids: [doos(-Pf.b / 2 - 2, Pf.b / 2 + 2, top - 3, top, -Pf.h / 2 - 3, -Pf.h / 2), doos(-Pf.b / 2 - 2, Pf.b / 2 + 2, top - 3, top, Pf.h / 2, Pf.h / 2 + 3)] }]),
    ],
    middelen: inoxHr ? [['Handregeldrager', '1 per staander', ''], ['Eindkap Ø42,4', '2', '']] : [['Hoeklas', 'a3 aan beide zijden', 'ISO 2553'], ...(hoek ? [['V-naad in het verstek', 'doorgelast, vlak geslepen', 'ISO 2553']] : [])],
    stappen: hoek ? ['Zaag beide stukken in verstek (de helft van de hoek of de knik).', 'Hecht ze op de hoekstaander, controleer de hoek met de mal.', 'Las het verstek door (V-naad) en slijp het vlak; las de handregel op elke staander.'] : ['Leg de handregel op de staanders en hecht hem.', 'Las hem op elke staander, aan beide zijden.', 'Slijp de lassen vlak.'],
    kijk: { yaw: -40, pitch: 26 } });
  return sc;
}

// ---------------------------------------------------------------- het A4-blad (zoals taatsdeuren/montage.mjs)
const W4 = 297, H4 = 210, f = (v) => (Math.round(v * 100) / 100).toString();
const T = (x, y, t, h = 2.5, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}>${esc(t)}</text>`;
const L = (x1, y1, x2, y2, w = 0.25) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#111" stroke-width="${w}"/>`;
const rij = (t, max) => { const w = String(t).split(' '), uit = ['']; for (const x of w) { if ((uit.at(-1) + ' ' + x).length > max) uit.push(x); else uit[uit.length - 1] += (uit.at(-1) ? ' ' : '') + x; } return uit; };
function ballonnen(ankers, [vx, vy, vw, vh]) {
  const el = [], mx = vx + vw / 2, r = 3.4;
  for (const kant of [-1, 1]) {
    const lijst = ankers.filter((a) => (kant < 0 ? a.x <= mx : a.x > mx)).sort((a, b) => a.y - b.y), bx = kant < 0 ? vx - 1 : vx + vw + 1, ys = [];
    for (const a of lijst) ys.push(Math.max(a.y, (ys.at(-1) ?? vy - 99) + 2 * r + 1.5));
    for (let i = ys.length - 1; i >= 0; i--) { const lim = i === ys.length - 1 ? vy + vh : ys[i + 1] - 2 * r - 1.5; if (ys[i] > lim) ys[i] = lim; }
    lijst.forEach((a, i) => el.push(L(bx - kant * r, ys[i], a.x, a.y, 0.2), `<circle cx="${f(a.x)}" cy="${f(a.y)}" r="0.6" fill="#111"/>`, `<circle cx="${f(bx)}" cy="${f(ys[i])}" r="${r}" fill="#fff" stroke="#111" stroke-width="0.35"/>`, T(bx, ys[i] + 1.3, String(a.nr), 3.4, { anker: 'middle', vet: true })));
  }
  return el.join('');
}
const MATKL = { staal: '#c2410c', glas: '#0f766e', alu: '#2563a8', inox: '#59626a' };
/** één montageblad A4 liggend */
export function montageBlad(o, sc, meta = {}) {
  const el = [], kl = MATKL[sc.materiaal] ?? '#c2410c', lab = { staal: 'STAAL', glas: 'GLAS', alu: 'ALU + GLAS', inox: 'INOX' }[sc.materiaal] ?? 'STAAL';
  el.push(`<rect x="20" y="10" width="${W4 - 30}" height="${H4 - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  el.push(`<rect x="24" y="14" width="${lab.length * 2.6 + 6}" height="7" fill="${kl}"/>`, T(27, 19.2, lab, 3.4, { vet: true, kleur: '#fff' }));
  el.push(T(lab.length * 2.6 + 34, 19.3, `Montage ${meta.i ?? ''}: ${sc.titel}`, 4.4, { vet: true }), T(24, 26, `${sc.sub} · ${naamVan(o)}`, 2.6, { kleur: '#333' }));
  const vak = [32, 32, 140, 118], gross = tekenScène(sc, { t: 1, vak, ...(sc.kijk ?? {}) });
  el.push(gross.svg, ballonnen(gross.ankers, vak), T(vak[0] + vak[2] / 2, 156, 'Uit elkaar (zonder schaal)', 2.4, { anker: 'middle', kleur: '#555' }));
  const klein = tekenScène(sc, { t: 0, vak: [190, 30, 92, 50], nummers: false, ...(sc.kijk ?? {}) });
  el.push(`<rect x="186" y="28" width="100" height="58" fill="#f6f7f8" stroke="#bbb" stroke-width="0.2"/>`, klein.svg, T(236, 84, 'Samen', 2.4, { anker: 'middle', kleur: '#555' }));
  let y = 92;
  el.push(T(186, y, 'Onderdelen', 2.9, { vet: true })); y += 3.5;
  for (const d of sc.delen.filter((x) => x.nr)) {
    const l = rij(`${d.naam}${d.label ? `: ${d.label}` : ''}`, 66).slice(0, 2);
    el.push(`<circle cx="188.4" cy="${f(y - 0.9)}" r="2.1" fill="#fff" stroke="#111" stroke-width="0.25"/>`, T(188.4, y, String(d.nr), 2.1, { anker: 'middle', vet: true }), `<rect x="191.6" y="${f(y - 2.4)}" width="2.6" height="2.6" fill="${d.kleur}" stroke="#555" stroke-width="0.12"/>`);
    l.forEach((t, i) => el.push(T(195.6, y + i * 2.7, t, 2.05))); y += 2.7 * l.length + 1.1;
  }
  if (sc.gaten?.length) { y += 1.2; el.push(T(186, y, 'Gaten (ISO 15786)', 2.9, { vet: true })); y += 3.4; sc.gaten.forEach((g, i) => { const l = rij(g.tekst, 64).slice(0, 2); el.push(`<rect x="186.2" y="${f(y - 2.6)}" width="3.4" height="3.4" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`, T(187.9, y, 'abcdefgh'[i], 2.3, { anker: 'middle', vet: true, kleur: '#b42318' })); l.forEach((t, j) => el.push(T(191, y + j * 2.6, t, 2.05))); y += 2.6 * l.length + 0.8; }); }
  y += 1.5; el.push(T(186, y, 'Bevestiging en norm', 2.9, { vet: true })); y += 3.4;
  for (const [wat, n, norm] of sc.middelen) { const l = rij(`${wat} · ${n}${norm ? ` · ${norm}` : ''}`, 70).slice(0, 2); if (y + 2.6 * l.length > H4 - 37) break; l.forEach((t, i) => el.push(T(186, y + i * 2.6, `${i ? '  ' : '• '}${t}`, 2.05))); y += 2.6 * l.length + 0.5; }
  let ys = 161; el.push(T(24, ys, 'Zo bouw je het', 2.9, { vet: true })); ys += 3.6;
  const letL = sc.let ? rij(`Let op: ${sc.let}`, 96).slice(0, 2) : [], grens = H4 - 12.5 - 2.7 * letL.length;
  sc.stappen.forEach((s, i) => { rij(s, 96).forEach((t, j) => { if (ys < grens) el.push(T(j ? 28 : 24, ys, `${j ? '' : `${i + 1}. `}${t}`, 2.1)); ys += 2.65; }); ys += 0.3; });
  if (letL.length) { const y0 = Math.min(ys + 1.2, grens + 1.5); letL.forEach((t, i) => el.push(T(24, y0 + i * 2.65, t, 2.1, { kleur: kl, vet: true }))); }
  const tx = W4 - 10 - 100, ty = H4 - 10 - 24, veld = (x, r, kop, w, h = 2.3, vet = false) => { if (x) el.push(L(tx + x, ty + r * 8, tx + x, ty + r * 8 + 8)); el.push(T(tx + x + 1, ty + r * 8 + 2.5, kop, 1.6, { kleur: '#555' }), T(tx + x + 1, ty + r * 8 + 6.5, w, h, { vet })); };
  el.push(`<rect x="${tx}" y="${ty}" width="100" height="24" fill="#fff" stroke="#111" stroke-width="0.5"/>`, L(tx, ty + 8, tx + 100, ty + 8), L(tx, ty + 16, tx + 100, ty + 16));
  veld(0, 0, 'Titel', `Montage: ${sc.titel}`.slice(0, 40), 2.5, true); el.push(eersteHoek(tx + 82, ty + 1.5, 0.32));
  veld(0, 1, 'Balustrade', maatTekst(o).slice(0, 34), 2.1); veld(62, 1, 'Tekeningnummer', `${meta.nr ?? 'BA'}-M${meta.i ?? 1}`, 2.3, true);
  veld(0, 2, 'Opgesteld', 'Ian · laswerken', 2.1); veld(36, 2, 'Uitgifte', meta.datum ?? '', 2.1); veld(62, 2, 'Blad', meta.blad ?? '1 / 1', 2.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" width="${W4}mm" height="${H4}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W4}" height="${H4}" fill="#fff"/>${el.join('\n')}</svg>`;
}
/** alle montagebladen: [{ id, titel, sub, scène, svg }] */
export function montageBladen(o, meta = {}) {
  const sc = montage(o);
  return sc.map((s, i) => ({ id: s.id, titel: s.titel, sub: s.sub, scène: s, svg: montageBlad(o, s, { ...meta, i: i + 1, blad: `${i + 1} / ${sc.length}` }) }));
}
