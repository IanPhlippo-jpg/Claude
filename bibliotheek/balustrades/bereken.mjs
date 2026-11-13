// De berekening van een balustrade: horizontale lijnlast (EN 1991-1-1 + ANB) op de handregel, de staander als
// uitkraging (buiging, doorbuiging, las aan de voet), de voetplaat en de ankers (trek per anker), het glas (spanning en
// doorbuiging), de handregel tussen de staanders, en de regels van NBN B 03-004 (hoogte, openingen, niet beklimbaar).
// Elk resultaat krijgt een oordeel: groen (benut ≤ 90 %), oranje (90-100 % of een aanname die je moet nakijken) of rood.
// Vereenvoudigd en voorzichtig; de echte ankers reken je na met de software van de fabrikant. Node en browser.
import { NORM } from './normen.mjs';
import { PROFIEL, SOORTEN, STIJL, ANKER, RAND, GLASOPBOUW } from './onderdelen.mjs';

const fvw = () => NORM.fu.v / (Math.sqrt(3) * 0.8 * NORM.gammaM2.v); // N/mm², vereenvoudigde lasmethode
const E = (P) => (P.fy === 230 ? 200000 : NORM.E.v);
const fy = (P) => P.fy ?? NORM.fy.v;
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const gw = (v, d = 1) => r(v, d).toString().replace('.', ',');

/** lasdoorsnede (keel a rondom de staander): weerstandsmoment in mm³ */
export function lasW(P, a) { return P.vorm === 'buis' ? Math.PI * (P.b / 2) ** 2 * a : P.vorm === 'koker' ? a * P.h * P.b + (a * P.h ** 2) / 3 : (a * P.h ** 2) / 3 * 2; }
export const keel = (P) => Math.min(5, Math.max(3, P.t ?? 4));

/** voetplaat (boven) of console (zij) voor een staander: maten, gaten, hefboom van de ankers */
export function plaatVoor(P, zij, maat = null, t = 10, perRij = 1) {
  if (zij) {
    const w = P.b + (perRij > 1 ? 120 : 60), gaten = perRij > 1 ? [[-(w / 2 - 30), -60], [w / 2 - 30, -60], [-(w / 2 - 30), -190], [w / 2 - 30, -190]] : [[0, -60], [0, -190]];
    return { b: w, l: 230, t, z: 180, nTrek: perRij, gaten, rand: 30 };
  }
  const b = maat ?? Math.max(140, Math.ceil((P.h + 90) / 10) * 10), e = b / 2 - 25;
  return { b, l: b, t, z: b - 25 - 10, nTrek: 2, gaten: [[-e, -e], [e, -e], [e, e], [-e, e]], rand: 25 };
}

/** de grootste staanderafstand (mm) voor een profiel en een voetplaat, met wat hem beperkt */
export function maxAfstand(k, P, voet, anker) {
  const q = NORM.lijnlast[k.cat].q, g = NORM.gammaQ.v, zij = k.bevestiging === 'zij';
  const arm = k.H + (zij ? 20 : 0), armA = zij ? k.H + 240 : k.H;
  const psi = zij ? RAND.zij : RAND.boven, A = ANKER[anker];
  const grenzen = {
    buiging: (fy(P) * P.W) / (NORM.gammaM0.v * g * q * arm),
    doorbuiging: (NORM.doorbuigingStaal.v * 3 * E(P) * P.I) / (q * arm ** 3),
    las: (fvw() * lasW(P, keel(P))) / (g * q * arm),
    ankers: (psi * A.NRd * 1000 * voet.z * voet.nTrek) / (g * q * armA),
  };
  const [wat, a] = Object.entries(grenzen).sort((x, y) => x[1] - y[1])[0];
  return { a, wat, grenzen };
}

/** de dikte van de voetplaat zodat ze niet plooit tussen de staander en de ankers */
export function plaatDikte(P, voet, Nanker) {
  const m = voet.l === 230 ? 30 : Math.max(10, voet.b / 2 - voet.rand - P.h / 2), beff = voet.b / Math.max(1, voet.nTrek);
  for (const t of [8, 10, 12, 15, 20]) if ((6 * Nanker * m) / (beff * t * t) <= fy({})) return { t, m, beff };
  return { t: 20, m, beff };
}

/** automatisch: ten hoogste 85 % benut, zodat er marge blijft voor de uitvoering */
export const BENUT = 0.85;
/** kies de staander (profiel), de voetplaat en de afstand */
export function kiesStaander(k, segs) {
  const S = SOORTEN[k.soort], st = STIJL(k.soort, k.stijl), zij = k.bevestiging === 'zij';
  const lijst = st.staander === 'inox' ? S.staandersInox : S.staanders;
  const anker = k.anker === 'keil' ? 'keil12' : 'chem12';
  const doel = k.afstand === 'auto' ? Math.min(1200, S.maxAfstand) : k.afstand;
  const kandidaten = k.staander !== 'auto' && lijst.includes(k.staander) ? [k.staander] : lijst;
  let keus = null;
  for (const prof of kandidaten) {
    const P = PROFIEL[prof];
    for (const optie of zij ? [1, 2] : [null, 160, 180, 200, 220, 250]) {
      const voet = zij ? plaatVoor(P, true, null, 10, optie) : plaatVoor(P, false, optie && optie > P.h + 80 ? optie : null);
      const m = maxAfstand(k, P, voet, anker);
      const c = { prof, P, voet, anker, ...m };
      if (!keus || m.a > keus.a) keus = c;
      if (BENUT * m.a >= doel) { keus = c; break; }
    }
    if (BENUT * keus.a >= doel && keus.prof === prof) break;
  }
  const a = k.afstand === 'auto' ? Math.max(300, Math.min(BENUT * keus.a, S.maxAfstand)) : k.afstand;
  // plaatdikte voor de echte trekkracht per anker
  const q = NORM.lijnlast[k.cat].q, g = NORM.gammaQ.v, armA = zij ? k.H + 240 : k.H;
  const N = (g * q * a * armA) / (keus.voet.z * keus.voet.nTrek);
  const pd = plaatDikte(keus.P, keus.voet, N);
  keus.voet = { ...keus.voet, t: pd.t };
  return { prof: keus.prof, a, aMax: keus.a, beperkt: keus.wat, grenzen: keus.grenzen, anker: keus.anker, voet: keus.voet, Nanker: N, plaat: pd };
}

/** glasopbouw: U-profiel (uitkragend) minstens 88.4, publiek 1010.4; tussen staanders 55.2, publiek 66.2 */
export function kiesGlas(k) {
  const publiek = k.cat !== 'A', U = k.soort === 'glasU';
  const auto = U ? (publiek ? '1010.4' : '88.4') : publiek ? '66.2' : '55.2';
  const toegelaten = U ? ['88.4', '1010.4'] : ['55.2', '66.2'];
  const opbouw = k.glas !== 'auto' && toegelaten.includes(k.glas) ? k.glas : auto;
  return { opbouw, auto, toegelaten, ...GLASOPBOUW[opbouw] };
}
/** effectieve dikte voor de doorbuiging (gelaagd glas, schuifkoppeling ω) */
export function hEff(G, omega = NORM.glas.omega) {
  const z = (G.blad + G.folie) / 2, som3 = G.n * G.blad ** 3, somz = G.n * G.blad * z * z;
  return Math.cbrt(som3 + 12 * omega * somz);
}

/** ankers in het U-profiel: zo ver mogelijk uit elkaar (250, 200, 150 of 125 mm) */
export function kiesAnkerU(k) {
  const q = NORM.lijnlast[k.cat].q, g = NORM.gammaQ.v, zij = k.bevestiging === 'zij', z = zij ? 60 : 45, arm = zij ? k.H + 60 : k.H, psi = zij ? RAND.zij : RAND.boven;
  const soorten = k.anker === 'keil' ? ['keil10', 'keil12'] : ['chem10', 'chem12'];
  let laatste = null;
  for (const anker of soorten) for (const afstand of [250, 200, 150, 125]) {
    const N = (g * q * afstand * arm) / z / 1000, NRd = psi * ANKER[anker].NRd;
    laatste = { anker, afstand, N, NRd, z, arm };
    if (N <= NRd) return laatste;
  }
  return laatste;
}

const oordeel = (benut) => (benut <= 0.9 ? 'groen' : benut <= 1.0 ? 'oranje' : 'rood');

/** de volledige berekening voor een ontwerp (model.mjs) */
export function berekening(o) {
  const k = o.k, q = NORM.lijnlast[k.cat], g = NORM.gammaQ.v, C = [], zij = k.bevestiging === 'zij';
  const ctl = (groep, wat, formule, waarde, grens, eenheid, benut, bron, extra = {}) => C.push({ groep, wat, formule, waarde: r(waarde, 2), grens: r(grens, 2), eenheid, benut: r(benut, 3), oordeel: extra.oordeel ?? oordeel(benut), bron, ...extra });
  ctl('Belasting', `Lijnlast categorie ${q.naam}`, `qk = ${gw(q.q, 1)} kN/m op de handregel, puntlast Qk = ${gw(q.Q, 1)} kN; γQ = ${NORM.gammaQ.v}`, q.q, q.q, 'kN/m', 0, NORM.lijnlast.bron, { oordeel: 'info' });
  // ---------------------------------------------------------------- NBN B 03-004
  const Hmin = o.vereist;
  ctl('NBN B 03-004', k.vorm === 'trap' ? 'Hoogte boven de trapneus en de vloer' : 'Hoogte van de borstwering', `H = ${k.H} mm ≥ ${Hmin} mm`, k.H, Hmin, 'mm', Hmin / k.H, k.vorm === 'trap' ? `${NORM.hoogteTrap.bron}; vide: ${NORM.hoogte.bron}` : (k.valhoogte ?? 3) >= 12 ? NORM.hoogteHoog.bron : NORM.hoogte.bron, { oordeel: k.H >= Hmin ? 'groen' : 'rood' });
  if (k.vorm === 'trap' && o.segs.length > 1 && k.H < NORM.hoogte.v) ctl('NBN B 03-004', 'Hoogte langs de vide na de trap', `H = ${k.H} mm; de vide vraagt ${NORM.hoogte.v} mm`, k.H, NORM.hoogte.v, 'mm', NORM.hoogte.v / k.H, NORM.hoogte.bron, { oordeel: 'rood' });
  for (const op of o.openingen) {
    const ok = op.klim ? op.mm < op.max : op.mm <= op.max;
    const klimFout = op.klim && !ok;
    ctl('NBN B 03-004', `Opening ${op.wat}`, op.klim ? `opening ${gw(op.mm)} mm < ${op.max} mm (kubus 20 mm, niet beklimbaar)` : `opening ${gw(op.mm)} mm ≤ ${op.max} mm`, op.mm, op.max, 'mm', op.mm / op.max, op.klim ? NORM.klimZone.bron : op.trap ? NORM.openingTrap.bron : NORM.opening.bron,
      { oordeel: ok ? 'groen' : klimFout && !o.klim ? 'oranje' : 'rood', uitleg: klimFout ? (o.klim ? 'Beklimbaar: een kind kan erop staan. Niet toegelaten in een woning, school of publieke ruimte. Kies een plint tot 450 mm, een plaat met kleine gaten of verticale spijlen.' : 'Beklimbaar, toegelaten in categorie E (industrie, geen kinderen); zet het in het lastenboek.') : '' });
  }
  if (k.soort === 'staven' && o.st.vulling === 'staven') ctl('NBN B 03-004', 'Niet beklimbaar', o.klim ? (k.plint !== false ? 'dichte plint van 50 tot 450 mm: geen opstap in de zone 110-450 mm' : 'geen plint: horizontale staven in de zone 110-450 mm') : 'categorie E: niet-beklimbaarheid niet geëist', 0, 0, '', 0, NORM.klimZone.bron, { oordeel: !o.klim ? 'oranje' : k.plint !== false ? 'groen' : 'rood', uitleg: 'Horizontale staven zijn een ladder. Wat wel mag: staven boven 450 mm met een dichte plint of plaat eronder, of verticale spijlen.' });
  // ---------------------------------------------------------------- staander
  if (o.staander) {
    const s = o.staander, P = PROFIEL[s.prof], a = o.afstand, arm = k.H + (zij ? 20 : 0);
    const M = (g * q.q * a * arm) / 1e6, Mp = (g * q.Q * 1000 * arm) / 1e6, sig = (Math.max(M, Mp) * 1e6) / P.W;
    ctl('Staander', `Buiging ${P.naam} (afstand ${Math.round(a)} mm)`, `MEd = γQ · qk · a · h = ${g} · ${gw(q.q)} · ${gw(a / 1000, 3)} · ${gw(arm / 1000, 3)} = ${gw(M, 2)} kNm (puntlast: ${gw(Mp, 2)}); σ = MEd / W = ${gw(Math.max(M, Mp) * 1e6)} / ${gw(P.W, 0)} = ${gw(sig)} N/mm² ≤ fy/γM0 = ${fy(P)}`, sig, fy(P), 'N/mm²', sig / fy(P), `${NORM.fy.bron}; ${NORM.gammaM0.bron}`);
    const d = (q.q * a * arm ** 3) / (3 * E(P) * P.I);
    ctl('Staander', 'Doorbuiging bovenaan (zonder γ)', `δ = qk · a · h³ / (3 E I) = ${gw(q.q)} · ${Math.round(a)} · ${Math.round(arm)}³ / (3 · ${E(P)} · ${gw(P.I, 0)}) = ${gw(d)} mm ≤ ${NORM.doorbuigingStaal.v} mm`, d, NORM.doorbuigingStaal.v, 'mm', d / NORM.doorbuigingStaal.v, NORM.doorbuigingStaal.bron);
    const aw = keel(P), Ww = lasW(P, aw), sw = (Math.max(M, Mp) * 1e6) / Ww;
    ctl('Staander', `Hoeklas a${aw} rondom aan de ${zij ? 'console' : 'voetplaat'}`, `σw = MEd / Wlas = ${gw(Math.max(M, Mp) * 1e6)} / ${gw(Ww, 0)} = ${gw(sw)} N/mm² ≤ fvw,d = fu / (√3 · βw · γM2) = ${gw(fvw())}`, sw, fvw(), 'N/mm²', sw / fvw(), NORM.lassen.bron);
    // ankers en voetplaat
    const A = ANKER[s.anker], psi = zij ? RAND.zij : RAND.boven, armA = zij ? k.H + 240 : k.H;
    const N = (g * q.q * a * armA) / (s.voet.z * s.voet.nTrek) / 1000, Nrd = psi * A.NRd;
    ctl('Verankering', `Trek per anker: ${A.naam}`, `N = MEd / (z · n) = ${gw((g * q.q * a * armA) / 1e6, 2)} kNm / (${s.voet.z} mm · ${s.voet.nTrek}) = ${gw(N, 2)} kN ≤ ψrand · NRd = ${psi} · ${gw(A.NRd)} = ${gw(Nrd, 2)} kN`, N, Nrd, 'kN', N / Nrd, `${A.bron}; ${RAND.bron}`, { oordeel: N / Nrd > 1 ? 'rood' : N / Nrd > 0.75 ? 'oranje' : 'groen', uitleg: 'Groen tot 75 % (ruim, want de ankerwaarde is een aanname); oranje = de ankerwaarde is een aanname of een vereenvoudiging: reken het anker na in fischer FIXPERIENCE met de echte randafstand en betonsterkte.' });
    const pd = s.plaat, sp = (6 * N * 1000 * pd.m) / (pd.beff * s.voet.t ** 2);
    ctl('Verankering', `${zij ? 'Console' : 'Voetplaat'} ${s.voet.b} x ${s.voet.l} x ${s.voet.t}`, `σ = 6 · N · m / (beff · t²) = 6 · ${gw(N * 1000, 0)} · ${gw(pd.m, 0)} / (${gw(pd.beff, 0)} · ${s.voet.t}²) = ${gw(sp)} N/mm² ≤ ${NORM.fy.v}`, sp, NORM.fy.v, 'N/mm²', sp / NORM.fy.v, NORM.fy.bron);
    if (zij && k.vloerdikte < 260) ctl('Verankering', 'Dikte van de vloerrand', `vloer ${k.vloerdikte} mm; de console reikt tot 250 mm onder de vloerpas`, k.vloerdikte, 260, 'mm', 260 / k.vloerdikte, 'AANNAME: console 230 mm hoog, ankers op 60 en 190 mm onder de vloerpas, 70 mm beton eronder', { oordeel: 'rood', uitleg: 'Te dunne vloerrand voor zijmontage: kies bovenop de vloer of een console op een stalen ligger.' });
    if (!k.afstand || k.afstand === 'auto') ctl('Staander', 'Staanderafstand (automatisch)', `amax = ${Math.round(s.aMax)} mm, beperkt door ${s.beperkt}; gekozen ${Math.round(a)} mm (≤ ${o.S.maxAfstand} mm)`, a, Math.min(s.aMax, o.S.maxAfstand), 'mm', a / Math.max(1, s.aMax), 'uit de berekening hierboven', { oordeel: a <= s.aMax ? 'groen' : 'rood' });
    // handregel tussen de staanders (vrij opgelegd, voorzichtig)
    const hrP = PROFIEL[k.soort === 'glasstaal' && k.hr === 'rond' ? 'inox42' : k.hr === 'rond' ? 'buis42' : 'plat50x8'];
    const Mh = (g * q.q * a * a) / 8, sh = Mh / hrP.W;
    ctl('Handregel', `${hrP.naam} tussen twee staanders`, `MEd = γQ · qk · a² / 8 = ${gw(Mh / 1e6, 3)} kNm; σ = ${gw(sh)} N/mm² ≤ ${fy(hrP)}`, sh, fy(hrP), 'N/mm²', sh / fy(hrP), 'vrij opgelegd tussen de staanders (voorzichtig: in werkelijkheid doorgaand en door de vulling gesteund)');
  }
  // ---------------------------------------------------------------- glas
  if (o.glas) {
    const G = o.glas, he = hEff(G), Eg = NORM.glas.Eglas, f = NORM.glas.fgd;
    if (k.soort === 'glasU') {
      const klemZ = zij ? 0 : 100, arm = k.H - klemZ, M = g * q.q * arm, sig = (6 * (M / G.n)) / G.blad ** 2;
      ctl('Glas', `Spanning ${G.naam}, uitkragend uit het profiel`, `M = γQ · qk · h = ${g} · ${gw(q.q)} · ${arm} = ${gw(M, 0)} Nmm/mm; σ = 6 · (M / ${G.n}) / t² = ${gw(sig)} N/mm² ≤ fg,d = ${f}`, sig, f, 'N/mm²', sig / f, `${NORM.glas.bronSterkte}; per blad zonder samenwerking (voorzichtig)`);
      const d = (q.q * arm ** 3) / (3 * Eg * (he ** 3 / 12));
      ctl('Glas', 'Doorbuiging bovenaan het glas', `δ = qk · h³ / (3 · E · hef³/12), hef = ${gw(he, 2)} mm (ω = ${NORM.glas.omega}) → ${gw(d)} mm ≤ ${NORM.doorbuigingGlas.v} mm`, d, NORM.doorbuigingGlas.v, 'mm', d / NORM.doorbuigingGlas.v, `${NORM.doorbuigingGlas.bron}; AANNAME ω = ${NORM.glas.omega} voor PVB bij een korte last`);
      const toeg = q.q <= 1.0;
      ctl('Glas', 'Systeem Q-railing Easy Glass Smart', `toegelaten 0,5 kN/m (privé), 1,0 kN/m met 21,52 mm glas; hier ${gw(q.q)} kN/m met ${G.dikte} mm`, q.q, G.dikte >= 21 ? 1.0 : 0.5, 'kN/m', q.q / (G.dikte >= 21 ? 1.0 : 0.5), 'Q-railing Easy Glass Smart-brochure (glasundbeschlag.de); hoger: Easy Glass Prime/Pro op offerte', { oordeel: toeg && q.q <= (G.dikte >= 21 ? 1.0 : 0.5) ? 'groen' : 'rood' });
      const U = o.ankerType && ANKER[o.ankerType], au = kiesAnkerU(k);
      ctl('Verankering', `Ankers in het profiel: ${U.naam} om de ${o.ankerAfstand} mm`, `N = γQ · qk · s · h / z = ${g} · ${gw(q.q)} · ${o.ankerAfstand} · ${au.arm} / ${au.z} = ${gw(au.N, 2)} kN ≤ ${gw(au.NRd, 2)} kN`, au.N, au.NRd, 'kN', au.N / au.NRd, `${U.bron}; AANNAME hefboom ${au.z} mm in het profiel (handleiding Q-railing nakijken)`, { oordeel: au.N > au.NRd ? 'rood' : au.N / au.NRd > 0.75 ? 'oranje' : 'groen', uitleg: 'Groen tot 75 %; reken de ankers na met de handleiding van Q-railing en fischer FIXPERIENCE.' });
      if (k.hr === 'geen') ctl('Glas', 'Zonder handregel', 'alle bladen gehard; de fabrikant toont aan dat de borstwering blijft staan na breuk van alle bladen (100 N, 10 s, op 1 m)', 0, 0, '', 0, NORM.glas.bron, { oordeel: 'oranje', uitleg: 'Mag, maar vraag het attest van Q-railing voor dit glas (resttrouw na breuk).' });
    } else {
      const w = Math.max(...o.panelen.filter((p) => p.rol === 'glas').map((p) => p.w)), hg = Math.max(...o.panelen.filter((p) => p.rol === 'glas').map((p) => p.h));
      const M = (g * q.Q * 1000 * w) / 4, sig = (6 * M) / (hg * G.n * G.blad ** 2);
      ctl('Glas', `Spanning ${G.naam} onder de puntlast in het midden`, `M = γQ · Qk · w / 4 = ${gw(M / 1e6, 3)} kNm over beff = ${Math.round(hg)} mm: σ = 6M / (beff · n · t²) = ${gw(sig)} N/mm² ≤ ${f}`, sig, f, 'N/mm²', sig / f, `${NORM.glas.bronSterkte}; AANNAME beff = glashoogte (opgelegd in 4 klemmen); NBN S 23-002-2 / klemfabrikant nakijken`, { oordeel: sig / f > 1 ? 'rood' : sig / f > 0.75 ? 'oranje' : 'groen' });
      ctl('Glas', 'Glasopbouw', `${G.naam}: gelaagd, beide bladen gehard; klemmen voor 8,76-12,76 mm`, G.dikte, 12.76, 'mm', G.dikte / 12.76, NORM.glas.bron, { oordeel: G.dikte <= 12.76 ? 'groen' : 'rood' });
    }
  }
  const erg = C.some((c) => c.oordeel === 'rood') ? 'rood' : C.some((c) => c.oordeel === 'oranje') ? 'oranje' : 'groen';
  return { controles: C, oordeel: erg, q };
}
