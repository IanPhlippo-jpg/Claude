// De berekening van een balustrade volgens NBN B 03-004 (lasten uit Buildwise Contact 2016/4 en 2018/4) en EN 1991-1-1
// + ANB: de horizontale lijnlast op de handregel, buiten gecombineerd met de wind (EN 1991-1-4 + ANB), de puntlasten op
// de handregel en op de vulling, de verticale last op de handregel. De staander als uitkraging (buiging, doorbuiging, las
// aan de voet of de afstandhouders), de voetplaat en de ankers (trek, dwarskracht naar de rand, de ondergrond), het glas
// (spanning, doorbuiging, ruitmaat tussen de klemmen), de handregel en de vulling, en de geometrische regels (hoogte,
// openingen, beklimbaarheid, de driehoek langs de trap). Elk resultaat krijgt een oordeel: groen (benut ≤ 90 %), oranje
// (90-100 % of een aanname die je moet nakijken) of rood. Vereenvoudigd en voorzichtig; de echte ankers reken je na met de
// software van de fabrikant. Node en browser.
import { NORM, piekstuwdruk, cpNet } from './normen.mjs';
import { PROFIEL, SOORTEN, STIJL, ANKER, RAND, GLASOPBOUW, PATROON, ONDERGROND, RANDAFSTAND } from './onderdelen.mjs';

const fvw = () => NORM.fu.v / (Math.sqrt(3) * 0.8 * NORM.gammaM2.v); // N/mm², vereenvoudigde lasmethode
const E = (P) => P.E ?? NORM.E.v;
const fy = (P) => P.fy ?? NORM.fy.v;
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const gw = (v, d = 1) => r(v, d).toString().replace('.', ',');
const gam = () => NORM.gammaQ.v;

/** lasdoorsnede (keel a rondom de staander): weerstandsmoment in mm³; plat profiel: twee lassen van lengte h (W = a h² / 3) */
export function lasW(P, a) { return P.vorm === 'buis' ? Math.PI * (P.b / 2) ** 2 * a : P.vorm === 'koker' ? a * P.h * P.b + (a * P.h ** 2) / 3 : (a * P.h ** 2) / 3; }
/** keel van de las rondom de staander: de wanddikte, 3 tot 5 mm (berekening, lasblad en werkwijze gebruiken dezelfde waarde) */
export const keel = (P) => Math.min(5, Math.max(3, P.t ?? 4));
/** keel op een dunne wand of plaat: a ≤ 0,7 · t, niet kleiner dan 2 mm (praktisch minimum), in stappen van 0,5 */
export const keelDun = (t) => Math.max(2, Math.min(3, Math.floor(0.7 * t * 2) / 2));

// ---------------------------------------------------------------- de ondergrond en het anker
/** het anker voor de ondergrond: beton = keilbout of chemisch (M12, of M10 in het U-profiel en de muurplaat) */
export function ankerVoor(k, klein = false) {
  const og = ONDERGROND[k.ondergrond] ?? ONDERGROND.beton;
  if (og.anker) return og.anker;
  const keil = k.anker === 'keil' && !(k.opbouw > 0); // door een opbouw (chape, tegels) geen keilbout: de klemlengte past niet
  return klein ? (keil ? 'keil10' : 'chem10') : keil ? 'keil12' : 'chem12';
}
/** reductie voor de randafstand (AANNAME); bouten in staal: geen */
export const psiRand = (k, anker) => (anker === 'bout12' ? 1 : k.bevestiging === 'zij' ? RAND.zij : RAND.boven);

/**
 * de hefbomen (mm) van de lasten tot het punt dat je rekent: st = staander en las, anker = de ankers; bovenop met een
 * opbouw > 40 mm staat de voetplaat op de draagvloer (onder de chape); langs een trap staat de voet tot een optrede lager
 * dan de neuslijn; zijmontage: tot de bovenste afstandhouder (40 mm onder de vloerpas) en tot het draaipunt van de console
 */
export function armen(k) {
  const opb = k.opbouw ?? 0, trap = k.vorm === 'trap' ? k.optrede : 0;
  if (k.bevestiging === 'zij') return { st: k.H + opb + 40, anker: k.H + opb + 240, voet: opb, trap };
  const voet = opb > 40 ? opb : 0;
  return { st: k.H + voet + trap, anker: k.H + voet + trap, voet, trap };
}

// ---------------------------------------------------------------- wind (buiten)
/** volheid φ van de balustrade (dicht deel van het aanzicht) */
export function volheid(k) {
  const st = STIJL(k.soort, k.stijl);
  if (k.soort === 'glasstaal' || k.soort === 'glasU') return 1;
  if (k.soort === 'staven' && st.vulling === 'plaat') return 1 - (PATROON[st.patroon]?.open ?? 0);
  if (k.soort === 'staven') { const P = PROFIEL[st.staaf], g = k.tussenruimte ?? 100, plint = k.plint !== false ? 400 : 0; return Math.min(1, (plint + (k.H - 450) * (P.b / (P.b + g))) / k.H); }
  const P = PROFIEL[st.spijl], g = Math.min(st.gat ?? k.tussenruimte ?? 100, k.tussenruimte ?? 100);
  return Math.min(1, P.b / (P.b + g) + 60 / k.H); // spijlen + onderregel en handregel
}
/**
 * de wind op de balustrade (buiten): qp(z) uit de windsnelheid, het terrein en de hoogte boven het maaiveld; cp,net uit
 * tabel 7.9 (dichte wand, φ ≥ 0,8) of cf = 2,0 op de netto oppervlakte (open vulling, EN 1991-1-4 fig. 7.33, AANNAME).
 * f = de druk op de bruto oppervlakte (kN/m²). Een staander krijgt het ongunstigste van zone B (volle afstand) en zone A
 * (halve afstand aan het vrije einde); een glasplaat in het U-profiel het gewogen gemiddelde over zijn breedte.
 */
export function windLast(k, lijnLengte = null) {
  if (k.plaats !== 'buiten') return null;
  const p = piekstuwdruk(k.windVb ?? 26, k.terrein ?? 'II', k.windHoogte ?? 6), phi = volheid(k), Hm = k.H / 1000;
  const L = (lijnLengte ?? Math.max(k.L1 ?? 0, k.vorm === 'recht' || k.vorm === 'trap' ? 0 : k.L2 ?? 0, k.vorm === 'u' ? k.L3 ?? 0 : 0)) / 1000;
  const cp = cpNet(L / Hm), dicht = phi >= 0.8;
  const cpSt = dicht ? Math.max(cp.B, cp.A / 2) : 2.0 * phi, f = p.qp * cpSt;
  const cpPlaat = (w) => (dicht ? (Math.min(w, 0.3 * k.H) * cp.A + Math.max(0, w - 0.3 * k.H) * cp.B) / Math.max(1, w) : 2.0 * phi);
  return { ...p, phi, cp, cpSt, f, cpPlaat, lh: L / Hm, dicht, psiW: NORM.psi0.wind, psiQ: NORM.psi0[k.cat] ?? 0.7 };
}
/** combinatie (karakteristiek, zonder γ): lijnlast + ψ0 · wind of wind + ψ0 · lijnlast (Contact 2016/4: de wind enkel met de lijnlast) */
export function combineer(Mq, Mw, w) {
  if (!w || !Mw) return { M: Mq, welke: 'lijnlast', M1: Mq, M2: 0 };
  const M1 = Mq + w.psiW * Mw, M2 = Mw + w.psiQ * Mq;
  return { M: Math.max(M1, M2), welke: M1 >= M2 ? `lijnlast + ${w.psiW} · wind` : `wind + ${w.psiQ} · lijnlast`, M1, M2 };
}

/** voetplaat (boven) of console (zij) voor een staander: maten, gaten, hefboom van de ankers */
export function plaatVoor(P, zij, maat = null, t = 10, perRij = 1) {
  if (zij) {
    const w = P.b + (perRij > 1 ? 120 : 60), gaten = perRij > 1 ? [[-(w / 2 - 30), -60], [w / 2 - 30, -60], [-(w / 2 - 30), -190], [w / 2 - 30, -190]] : [[0, -60], [0, -190]];
    return { b: w, l: 230, t, z: 180, nTrek: perRij, gaten, rand: 30 };
  }
  const b = maat ?? Math.max(140, Math.ceil((P.h + 90) / 10) * 10), e = b / 2 - 25;
  return { b, l: b, t, z: b - 25 - 10, nTrek: 2, gaten: [[-e, -e], [e, -e], [e, e], [-e, e]], rand: 25 };
}

/** de lasten per mm staanderafstand (Nmm/mm): lijnlast en wind, voor de staander (st) en de ankers (anker) */
export function lastPerA(k, w = windLast(k)) {
  const q = NORM.lijnlast[k.cat].q, A = armen(k), Hw = k.H;
  const mq = { st: q * A.st, anker: q * A.anker };
  const fw = w ? w.f / 1000 : 0; // N/mm²
  const armW = (arm) => arm - k.H + Hw / 2; // resultante van de wind op de halve hoogte
  const mw = { st: fw * Hw * armW(A.st), anker: fw * Hw * armW(A.anker) };
  const c = { st: combineer(mq.st, mw.st, w), anker: combineer(mq.anker, mw.anker, w) };
  return { q, A, Hw, fw, mq, mw, c, w };
}

/** de grootste staanderafstand (mm) voor een profiel en een voetplaat, met wat hem beperkt */
export function maxAfstand(k, P, voet, anker) {
  const g = gam(), zij = k.bevestiging === 'zij', L = lastPerA(k), A = ANKER[anker], psi = psiRand(k, anker);
  const Q = NORM.lijnlast[k.cat].Q * 1000, arm = L.A.st;
  // doorbuiging (karakteristiek): lijnlast bovenaan, wind als resultante op de halve hoogte
  const dq = (L.q * arm ** 3) / (3 * E(P) * P.I), aw = arm - k.H / 2, dw = L.fw ? (L.fw * k.H * aw ** 2 * (3 * arm - aw)) / (6 * E(P) * P.I) : 0;
  const dPerA = L.w ? Math.max(dq + L.w.psiW * dw, dw + L.w.psiQ * dq) : dq;
  const grenzen = {
    buiging: (fy(P) * P.W) / (NORM.gammaM0.v * g * L.c.st.M),
    doorbuiging: NORM.doorbuigingStaal.v / dPerA,
    las: zij ? (fvw() * 3 * 160 * 170) / (g * L.c.st.M) : (fvw() * lasW(P, keel(P))) / (g * L.c.st.M),
    ankers: A.NRd ? (psi * A.NRd * 1000 * voet.z * voet.nTrek) / (g * L.c.anker.M) : Infinity,
  };
  // de puntlast op de handregel hangt niet van de afstand af: haalt het profiel hem niet, dan kan het niet (P3-4)
  if ((g * Q * arm) / P.W > fy(P) / NORM.gammaM0.v || (zij ? 0 : (g * Q * arm) / lasW(P, keel(P)) > fvw())) grenzen.puntlast = 0;
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
export function kiesStaander(k) {
  const S = SOORTEN[k.soort], st = STIJL(k.soort, k.stijl), zij = k.bevestiging === 'zij';
  const lijst = st.staander === 'inox' ? S.staandersInox : S.staanders;
  const anker = ankerVoor(k);
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
  const L = lastPerA(k), g = gam();
  const N = (g * L.c.anker.M * a) / (keus.voet.z * keus.voet.nTrek);
  const pd = plaatDikte(keus.P, keus.voet, N);
  keus.voet = { ...keus.voet, t: pd.t };
  return { prof: keus.prof, a, aMax: keus.a, beperkt: keus.wat, grenzen: keus.grenzen, anker: keus.anker, voet: keus.voet, Nanker: N, plaat: pd };
}

// ---------------------------------------------------------------- glas
/** effectieve dikte voor de doorbuiging (gelaagd glas, schuifkoppeling ω) */
export function hEff(G, omega = NORM.glas.omega) {
  const z = (G.blad + G.folie) / 2, som3 = G.n * G.blad ** 3, somz = G.n * G.blad * z * z;
  return Math.cbrt(som3 + 12 * omega * somz);
}
/** glas in het U-profiel per mm breedte: spanning (lijnlast + wind, of de puntlast per plaat) en doorbuiging */
export function glasUReken(k, G, wPlaat = 1200) {
  const g = gam(), q = NORM.lijnlast[k.cat], zij = k.bevestiging === 'zij', klemZ = zij ? 0 : 100, arm = k.H - klemZ, hg = arm;
  const w = windLast(k), fw = w ? (w.qp * w.cpPlaat(wPlaat)) / 1000 : 0;
  const Mq = q.q * arm, Mw = (fw * hg * hg) / 2, c = combineer(Mq, Mw, w);
  const beff = Math.min(wPlaat, arm), Mp = (q.Q * 1000 * arm) / beff; // puntlast op de bovenrand van één plaat, gespreid tot de klemlijn
  const M = Math.max(c.M, Mp), sig = (6 * ((g * M) / G.n)) / G.blad ** 2;
  const he = hEff(G), I = (he ** 3) / 12, Eg = NORM.glas.Eglas;
  const dq = (q.q * arm ** 3) / (3 * Eg * I), dw = (fw * hg ** 4) / (8 * Eg * I), d = w ? Math.max(dq + w.psiW * dw, dw + w.psiQ * dq) : dq;
  return { sig, d, M, Mq, Mw, Mp, c, beff, arm, he, fw, w };
}
/** glas tussen 4 klemmen: puntlast op de vrije bovenrand (beff = w / 2, spreiding onder 45° tot de klemlijn, ten hoogste de glashoogte) en wind op de ruit */
export function glasKlemReken(k, G, wg, hg) {
  const g = gam(), Q = NORM.lijnlast[k.cat].Q * 1000, w = windLast(k);
  const beff = Math.min(hg, wg / 2), Mp = (Q * wg) / 4, sigP = (6 * g * Mp) / (beff * G.n * G.blad ** 2);
  const fw = w ? (w.qp * w.cpPlaat(wg)) / 1000 : 0, sigW = (6 * g * fw * wg * wg) / (8 * G.n * G.blad ** 2);
  return { sig: Math.max(sigP, sigW), sigP, sigW, beff, Mp, fw, w };
}
/** glasopbouw: de lichtste toegelaten opbouw die de berekening haalt (≤ 90 %); U-profiel 88.4 / 1010.4, tussen staanders 55.2 / 66.2 */
export function kiesGlas(k, wPlaat = null, hPlaat = null) {
  const publiek = k.cat !== 'A', U = k.soort === 'glasU';
  const toegelaten = U ? ['88.4', '1010.4'] : ['55.2', '66.2'];
  const basis = U ? (publiek ? '1010.4' : '88.4') : publiek ? '66.2' : '55.2';
  const haalt = (op) => { const G = GLASOPBOUW[op]; if (U) { const x = glasUReken(k, G, wPlaat ?? 1200); return x.sig / NORM.glas.fgd <= 0.9 && x.d / NORM.doorbuigingGlas.v <= 0.9; } const x = glasKlemReken(k, G, wPlaat ?? 1150, hPlaat ?? k.H - 150); return x.sig / NORM.glas.fgd <= 0.75; };
  const auto = toegelaten.slice(toegelaten.indexOf(basis)).find(haalt) ?? toegelaten.at(-1);
  const opbouw = k.glas !== 'auto' && toegelaten.includes(k.glas) ? k.glas : auto;
  return { opbouw, auto, toegelaten, ...GLASOPBOUW[opbouw] };
}

/** ankers in het U-profiel: zo ver mogelijk uit elkaar (250, 200, 150 of 125 mm), met de wind erbij */
export function kiesAnkerU(k) {
  const g = gam(), q = NORM.lijnlast[k.cat].q, zij = k.bevestiging === 'zij', z = zij ? 60 : 45, arm = zij ? k.H + 60 : k.H;
  const w = windLast(k), fw = w ? (w.qp * w.cpPlaat(1200)) / 1000 : 0, M = combineer(q * arm, (fw * k.H * (arm - k.H / 2)), w).M;
  const base = ankerVoor(k, true), soorten = base === 'keil10' ? ['keil10', 'keil12'] : base === 'chem10' ? ['chem10', 'chem12'] : [base];
  let laatste = null;
  for (const anker of soorten) for (const afstand of [250, 200, 150, 125]) {
    const N = (g * M * afstand) / z / 1000, NRd = ANKER[anker].NRd == null ? null : psiRand(k, anker) * ANKER[anker].NRd;
    laatste = { anker, afstand, N, NRd, z, arm, M };
    if (NRd == null || N <= NRd) return laatste;
  }
  return laatste;
}

const oordeel = (benut) => (benut <= 0.9 ? 'groen' : benut <= 1.0 ? 'oranje' : 'rood');

/** betonrandbreuk door dwarskracht naar de rand (EN 1992-4 §7.2.2.5, vereenvoudigd: 2 voorste ankers, gescheurd C20/25) */
export function randBreuk(d, hef, c1, s) {
  const k1 = 1.7, fck = 20, al = 0.1 * Math.sqrt(hef / c1), be = 0.1 * (d / c1) ** 0.2;
  const V0 = k1 * d ** al * hef ** be * Math.sqrt(fck) * c1 ** 1.5; // N
  const groep = Math.min(2, (3 * c1 + s) / (3 * c1));
  return { V0, groep, VRd: (V0 * groep) / 1.5 / 1000 };
}

/** wat de configurator niet controleert: vóór de uitvoering na te kijken (en af te vinken door Ian) */
export function nakijkLijst(o) {
  const k = o.k, glas = !!o.glas, uit = [];
  uit.push({ id: 'norm', wat: 'De normtekst NBN B 03-004:2017 zelf (de waarden komen uit de Buildwise-artikels)' });
  if (!glas) uit.push({ id: 'schok', wat: 'Schokproeven: zacht lichaam 50 kg en hard lichaam 0,5 kg (NBN B 03-004) zijn niet aangetoond' });
  if (glas) uit.push({ id: 'glasbreuk', wat: 'Gedrag van het glas na breuk en het attest van het glas- en klemsysteem' });
  uit.push({ id: 'ondergrond', wat: `De ondergrond ter plaatse: ${(ONDERGROND[k.ondergrond] ?? ONDERGROND.beton).naam.toLowerCase()}, opbouw ${k.opbouw ?? 0} mm, betonsterkte en wapening nameten` });
  uit.push({ id: 'ankers', wat: 'De ankers met de echte randafstand en betonsterkte (fischer FIXPERIENCE of de fabrikant)' });
  if (k.plaats === 'buiten') uit.push({ id: 'wind', wat: `De windgegevens ter plaatse: vb,0 ${k.windVb ?? 26} m/s (postcode), terrein ${k.terrein ?? 'II'}, ${k.windHoogte ?? 6} m boven het maaiveld` });
  if (k.vorm === 'trap') uit.push({ id: 'trap', wat: 'Langs de trap: 900 mm hoogte en 50 mm onder de regel zijn AANNAMES uit een secundaire bron' });
  return uit;
}
/** de korte, eerlijke conformiteitstekst voor de klant en het overzicht (P1-8) */
export function conformiteit(o, B) {
  const k = o.k, q = NORM.lijnlast[k.cat], niet = nakijkLijst(o), af = new Set(k.nagekeken ?? []), open = niet.filter((x) => !af.has(x.id));
  const sterkte = `sterkte voorberekend op ${gw(q.q, 1)} kN/m${k.plaats === 'buiten' ? ' + wind' : ''}, puntlasten ${gw(q.Q, 1)} kN op de handregel en ${gw(NORM.puntVulling.Q, 1)} kN op de vulling, ${gw(NORM.verticaal.Q, 0)} kN verticaal`;
  const kort = B.oordeel === 'rood' ? 'Voldoet niet' : `Hoogte, openingen en beklimbaarheid volgens NBN B 03-004; ${sterkte} (vereenvoudigd).`;
  return { kort, sterkte, niet, open, vrijgegeven: !open.length && B.oordeel !== 'rood', label: B.oordeel === 'rood' ? 'rood: voldoet niet' : open.length ? `${B.oordeel}: voorberekend, ${open.length} punt${open.length > 1 ? 'en' : ''} na te kijken` : `${B.oordeel}: nagekeken` };
}

/** de volledige berekening voor een ontwerp (model.mjs) */
export function berekening(o) {
  const k = o.k, q = NORM.lijnlast[k.cat], g = gam(), C = [], zij = k.bevestiging === 'zij', st = STIJL(k.soort, k.stijl), w = windLast(k);
  const ctl = (groep, wat, formule, waarde, grens, eenheid, benut, bron, extra = {}) => C.push({ groep, wat, formule, waarde: r(waarde, 2), grens: r(grens, 2), eenheid, benut: r(benut, 3), oordeel: extra.oordeel ?? oordeel(benut), bron, ...extra });
  ctl('Belasting', `Lijnlast categorie ${q.naam}`, `qk = ${gw(q.q, 1)} kN/m op de handregel, puntlast Qk,h1 = ${gw(q.Q, 1)} kN; Qk,h2 = ${gw(NORM.puntVulling.Q, 1)} kN op de vulling; Qk,v = ${gw(NORM.verticaal.Q, 0)} kN verticaal; γQ = ${g}`, q.q, q.q, 'kN/m', 0, `${NORM.lijnlast.bron}; ${NORM.puntVulling.bron}; ${NORM.verticaal.bron}`, { oordeel: 'info' });
  ctl('Belasting', 'Omgekeerde last', `${gw(NORM.omgekeerd.q, 1)} kN/m naar binnen ≤ qk = ${gw(q.q, 1)} kN/m: de staander, de voetplaat en de ankers zijn symmetrisch, dus gedekt door de lijnlast`, NORM.omgekeerd.q, q.q, 'kN/m', NORM.omgekeerd.q / q.q, NORM.omgekeerd.bron, { oordeel: 'info' });
  if (w) ctl('Belasting', 'Wind (buiten)', `qp(${gw(w.z, 0)} m) = (1 + 7 · ${gw(w.Iv, 3)}) · ½ · 1,25 · (${gw(w.cr, 3)} · ${k.windVb ?? 26})² = ${gw(w.qp, 3)} kN/m² (terrein ${k.terrein ?? 'II'}); ${w.dicht ? `cp,net (tabel 7.9, l/h = ${gw(w.lh, 1)}) A ${gw(w.cp.A, 2)} / B ${gw(w.cp.B, 2)}: staander max(B, A/2) = ${gw(w.cpSt, 2)}` : `open vulling φ = ${gw(w.phi, 2)}: cf · φ = 2,0 · ${gw(w.phi, 2)} = ${gw(w.cpSt, 2)}`} → ${gw(w.f, 3)} kN/m²; combinatie lijnlast + ${w.psiW} · wind of wind + ${w.psiQ} · lijnlast`, w.f, w.f, 'kN/m²', 0, `${NORM.wind.bron}; ${NORM.windRho.bron}`, { oordeel: 'info' });
  else if (k.plaats !== 'buiten') ctl('Belasting', 'Wind', 'binnen: geen wind', 0, 0, '', 0, NORM.wind.bron, { oordeel: 'info' });
  // ---------------------------------------------------------------- NBN B 03-004
  const Hmin = o.vereist;
  ctl('NBN B 03-004', k.vorm === 'trap' ? 'Hoogte boven de trapneus en de vloer' : 'Hoogte van de borstwering', `H = ${k.H} mm ≥ ${Hmin} mm${(k.valhoogte ?? 3) >= 12 ? ' (valhoogte ≥ 12 m)' : ''}`, k.H, Hmin, 'mm', Hmin / k.H, (k.valhoogte ?? 3) >= 12 ? NORM.hoogteHoog.bron : k.vorm === 'trap' ? `${NORM.hoogteTrap.bron}; vide: ${NORM.hoogte.bron}` : NORM.hoogte.bron, { oordeel: k.H >= Hmin ? 'groen' : 'rood' });
  if (k.vorm === 'trap' && o.segs.length > 1 && k.H < NORM.hoogte.v) ctl('NBN B 03-004', 'Hoogte langs de vide na de trap', `H = ${k.H} mm; de vide vraagt ${NORM.hoogte.v} mm`, k.H, NORM.hoogte.v, 'mm', NORM.hoogte.v / k.H, NORM.hoogte.bron, { oordeel: 'rood' });
  for (const op of o.openingen) {
    const ok = op.klim ? op.mm < op.max : op.mm <= op.max;
    const klimFout = op.klim && !ok;
    ctl('NBN B 03-004', `Opening ${op.wat}`, op.klim ? `opening ${gw(op.mm)} mm < ${op.max} mm (kubus 20 mm, niet beklimbaar)` : op.formule ?? `opening ${gw(op.mm)} mm ≤ ${op.max} mm`, op.mm, op.max, 'mm', op.mm / op.max, op.klim ? NORM.klimZone.bron : op.bron ?? (op.trap ? NORM.openingTrap.bron : NORM.opening.bron),
      { oordeel: ok ? 'groen' : klimFout && !o.klim ? 'oranje' : 'rood', uitleg: klimFout ? (o.klim ? 'Beklimbaar: een kind kan erop staan. Niet toegelaten in een woning, school of publieke ruimte. Kies een plint tot 450 mm, een plaat met kleine gaten of verticale spijlen.' : 'Beklimbaar, toegelaten in categorie E (industrie, geen kinderen); zet het in het lastenboek.') : !ok ? op.uitleg ?? '' : '' });
  }
  if (k.soort === 'staven' && st.vulling === 'staven') ctl('NBN B 03-004', 'Niet beklimbaar', o.klim ? (k.plint !== false ? 'dichte plint van 50 tot 450 mm: geen opstap in de zone 110-450 mm' : 'geen plint: horizontale staven in de zone 110-450 mm') : 'categorie E: niet-beklimbaarheid niet geëist', 0, 0, '', 0, NORM.klimZone.bron, { oordeel: !o.klim ? 'oranje' : k.plint !== false ? 'groen' : 'rood', uitleg: 'Horizontale staven zijn een ladder. Wat wel mag: staven boven 450 mm met een dichte plint of plaat eronder, of verticale spijlen.' });
  // ---------------------------------------------------------------- ondergrond
  const og = ONDERGROND[k.ondergrond] ?? ONDERGROND.beton, opb = k.opbouw ?? 0, ankId = o.ankerType;
  if (k.ondergrond && k.ondergrond !== 'beton') {
    const rood = k.ondergrond === 'hout' || (zij && ['welfsel', 'metselwerk'].includes(k.ondergrond));
    ctl('Ondergrond', og.naam, `${ANKER[ankId]?.naam ?? '-'}: ${og.bron}`, 0, 0, '', 0, ANKER[ankId]?.bron ?? og.bron, { oordeel: k.ondergrond === 'staal' ? 'oranje' : rood ? 'rood' : 'oranje', uitleg: k.ondergrond === 'hout' ? 'Hout rekent de configurator niet: laat de bevestiging in de balken rekenen (EN 1995-1-1) of kies een stalen ligger onder de vloer.' : rood ? 'Zijmontage in de rand van een welfsel of in metselwerk kan niet zonder randbalk: kies bovenop de vloer of een stalen ligger.' : k.ondergrond === 'staal' ? 'De bouten zijn gerekend; de stalen ligger zelf (flens, torsie) niet: laten nakijken.' : 'Geen rekenwaarde voor dit anker: vraag de waarde aan fischer en de fabrikant van de vloer.' });
  }
  if (opb > 0) {
    const glasU = k.soort === 'glasU', diep = !zij && opb > 40;
    ctl('Ondergrond', `Opbouw boven de draagvloer: ${opb} mm (chape, isolatie, tegels)`, zij ? `de console zakt ${opb} mm mee: de ankers zitten 60 en 190 mm onder de bovenkant van de draagvloer` : diep ? `> 40 mm: de voetplaat staat op de draagvloer, vóór de chape; de staander is ${opb} mm langer en de hefbomen ook (H + ${opb})` : `≤ 40 mm: de voetplaat op de afwerking, ankerstang ${o.ankerLengte ?? '-'} mm; de hef telt vanaf de draagvloer (boorgat ${opb} + ${ANKER[ankId]?.diep ?? 0} mm)`, opb, 40, 'mm', 0, 'Fable 5.2 P1-2: een voetplaat op een zwevende dekvloer zakt en kantelt; de hef telt in de draagvloer, niet in de chape',
      { oordeel: glasU && diep ? 'rood' : 'oranje', uitleg: glasU && diep ? 'Het U-profiel moet op de draagvloer staan: laat het mee in de chape storten (maatwerk) of kies zijmontage.' : diep ? 'Plaats de voetplaten vóór de chape en spreek de afwerking af met de aannemer (kitvoeg rond de staander).' : 'Keilbouten passen niet door een opbouw: chemisch anker met een langere stang.' });
  }
  // ---------------------------------------------------------------- staander
  if (o.staander) {
    const s = o.staander, P = PROFIEL[s.prof], a = o.afstand, L = lastPerA(k, w), arm = L.A.st;
    const Mq = (L.mq.st * a) / 1e6, Mw = (L.mw.st * a) / 1e6, c = combineer(Mq, Mw, w), Mp = (q.Q * 1000 * arm) / 1e6, MEd = g * Math.max(c.M, Mp), sig = (MEd * 1e6) / P.W;
    const wTekst = w ? ` + wind: Mw = ${gw(L.fw * 1000, 3)} · ${gw(a / 1000, 3)} · ${gw(k.H / 1000, 2)} · ${gw((arm - k.H / 2) / 1000, 3)} = ${gw(Mw, 3)} kNm; ${c.welke} = ${gw(c.M, 3)} kNm` : '';
    ctl('Staander', `Buiging ${P.naam} (afstand ${Math.round(a)} mm)`, `Mq = qk · a · h = ${gw(q.q)} · ${gw(a / 1000, 3)} · ${gw(arm / 1000, 3)} = ${gw(Mq, 3)} kNm${wTekst}; puntlast ${gw(q.Q)} · ${gw(arm / 1000, 3)} = ${gw(Mp, 3)}; MEd = ${g} · ${gw(Math.max(c.M, Mp), 3)} = ${gw(MEd, 3)} kNm; σ = MEd / W = ${gw(sig)} N/mm² ≤ fy/γM0 = ${fy(P)}`, sig, fy(P), 'N/mm²', sig / fy(P), `${NORM.fy.bron}; ${NORM.gammaM0.bron}${w ? `; ${NORM.wind.bron}` : ''}`);
    const dq = (q.q * a * arm ** 3) / (3 * E(P) * P.I), aw = arm - k.H / 2, dw = L.fw ? (L.fw * a * k.H * aw ** 2 * (3 * arm - aw)) / (6 * E(P) * P.I) : 0;
    const dSt = w ? Math.max(dq + w.psiW * dw, dw + w.psiQ * dq) : dq;
    const hrP = PROFIEL[o.hrProf ?? 'plat50x8'], dHr = (5 * q.q * a ** 4) / (384 * E(hrP) * hrP.I), d = dSt + dHr;
    ctl('Staander', 'Doorbuiging bovenaan (zonder γ), staander + handregel', `δ = qk · a · h³ / (3 E I) = ${gw(q.q)} · ${Math.round(a)} · ${Math.round(arm)}³ / (3 · ${E(P)} · ${gw(P.I, 0)}) = ${gw(dq)} mm${dw ? ` (wind ${gw(dw)} mm, combinatie ${gw(dSt)})` : ''} + handregel 5 q a⁴ / (384 E I) = ${gw(dHr, 2)} mm = ${gw(d)} mm ≤ ${NORM.doorbuigingStaal.v} mm (draaiing van de voetplaat en de ankers niet meegeteld)`, d, NORM.doorbuigingStaal.v, 'mm', d / NORM.doorbuigingStaal.v, NORM.doorbuigingStaal.bron);
    if (zij) {
      // het moment gaat als koppel door de twee afstandhouders (170 mm uit elkaar), elk rondom gelast a3 op 4 x 40 mm
      const F = (MEd * 1e6) / 170, tw = F / (3 * 160), tWand = F / (2 * P.t * 40);
      ctl('Staander', 'Las van een afstandhouder (koker 40x40x3, a3 rondom)', `F = MEd / 170 mm = ${gw(MEd * 1e6, 0)} / 170 = ${gw(F / 1000, 2)} kN; τ = F / (a · l) = ${gw(F, 0)} / (3 · 160) = ${gw(tw)} N/mm² ≤ fvw,d = ${gw(fvw())}`, tw, fvw(), 'N/mm²', tw / fvw(), NORM.lassen.bron);
      ctl('Staander', 'Wand van de staander achter de afstandhouder', `τ = F / (2 · t · 40) = ${gw(F, 0)} / (2 · ${P.t} · 40) = ${gw(tWand)} N/mm² ≤ fy / √3 = ${gw(fy(P) / Math.sqrt(3))}`, tWand, fy(P) / Math.sqrt(3), 'N/mm²', tWand / (fy(P) / Math.sqrt(3)), `${NORM.fy.bron}; afschuiving van de twee zijwanden (vereenvoudigd)`);
    } else {
      const aw2 = keel(P), Ww = lasW(P, aw2), sw = (MEd * 1e6) / Ww;
      ctl('Staander', `Hoeklas a${aw2} rondom aan de voetplaat`, `σw = MEd / Wlas = ${gw(MEd * 1e6)} / ${gw(Ww, 0)} = ${gw(sw)} N/mm² ≤ fvw,d = fu / (√3 · βw · γM2) = ${gw(fvw())}${P.fy === 230 ? ' (inox voorzichtig met de S235-waarden fu = 360, βw = 0,8)' : ''}`, sw, fvw(), 'N/mm²', sw / fvw(), NORM.lassen.bron);
    }
    // ankers en voetplaat
    const A = ANKER[s.anker], psi = psiRand(k, s.anker);
    const Mank = g * Math.max(combineer((L.mq.anker * a) / 1e6, (L.mw.anker * a) / 1e6, w).M, (q.Q * 1000 * L.A.anker) / 1e6);
    const N = (Mank * 1e6) / (s.voet.z * s.voet.nTrek) / 1000;
    if (A.NRd) {
      const Nrd = psi * A.NRd;
      ctl('Verankering', `Trek per anker: ${A.naam}`, `N = MEd / (z · n) = ${gw(Mank, 3)} kNm / (${s.voet.z} mm · ${s.voet.nTrek}) = ${gw(N, 2)} kN ≤ ψrand · NRd = ${psi} · ${gw(A.NRd)} = ${gw(Nrd, 2)} kN`, N, Nrd, 'kN', N / Nrd, `${A.bron}; ${RAND.bron}`, { oordeel: N / Nrd > 1 ? 'rood' : N / Nrd > 0.75 ? 'oranje' : 'groen', uitleg: 'Groen tot 75 % (ruim, want de ankerwaarde is een aanname). Oranje: de ankerwaarde is een aanname of een vereenvoudiging: reken het anker na in fischer FIXPERIENCE met de echte randafstand en betonsterkte.' });
    } else ctl('Verankering', `Trek per anker: ${A.naam}`, `N = MEd / (z · n) = ${gw(Mank, 3)} kNm / (${s.voet.z} mm · ${s.voet.nTrek}) = ${gw(N, 2)} kN; geen rekenwaarde voor deze ondergrond`, N, 0, 'kN', 0, A.bron, { oordeel: k.ondergrond === 'hout' ? 'rood' : 'oranje', uitleg: 'Vraag de waarde aan de fabrikant van het anker en van de vloer.' });
    if (!zij && (k.ondergrond ?? 'beton') === 'beton' && A.hef) {
      const c1 = o.rand?.c ?? RANDAFSTAND.c, sp = s.voet.b - 50, rb = randBreuk(A.d, A.hef, c1, sp), V = (g * (q.q * a + L.fw * a * k.H)) / 1000;
      ctl('Verankering', `Dwarskracht naar de rand (2 voorste ankers, c = ${Math.round(c1)} mm)`, `V = γQ · (qk · a + wind) = ${gw(V, 2)} kN ≤ VRd,c = V⁰ · Ac/A⁰ / γMc = ${gw(rb.V0 / 1000, 2)} · ${gw(rb.groep, 2)} / 1,5 = ${gw(rb.VRd, 2)} kN`, V, rb.VRd, 'kN', V / rb.VRd, `EN 1992-4 §7.2.2.5: V⁰Rk,c = k1 · d^α · lf^β · √fck · c1^1,5 (k1 = 1,7 gescheurd, C20/25); ${RANDAFSTAND.bron}`);
    }
    const pd = s.plaat, sp = (6 * N * 1000 * pd.m) / (pd.beff * s.voet.t ** 2);
    ctl('Verankering', `${zij ? 'Console' : 'Voetplaat'} ${s.voet.b} x ${s.voet.l} x ${s.voet.t}`, `σ = 6 · N · m / (beff · t²) = 6 · ${gw(N * 1000, 0)} · ${gw(pd.m, 0)} / (${gw(pd.beff, 0)} · ${s.voet.t}²) = ${gw(sp)} N/mm² ≤ ${NORM.fy.v} (AANNAME beff = b / n, elastisch)`, sp, NORM.fy.v, 'N/mm²', sp / NORM.fy.v, NORM.fy.bron);
    if (zij && k.vloerdikte < 260) ctl('Verankering', 'Dikte van de vloerrand', `draagvloer ${k.vloerdikte} mm; de console reikt tot 250 mm onder de bovenkant van de draagvloer`, k.vloerdikte, 260, 'mm', 260 / k.vloerdikte, 'AANNAME: console 230 mm hoog, ankers op 60 en 190 mm onder de draagvloer, 70 mm beton eronder', { oordeel: 'rood', uitleg: 'Te dunne vloerrand voor zijmontage: kies bovenop de vloer of een console op een stalen ligger.' });
    const amax = Math.min(s.aMax, o.S.maxAfstand);
    ctl('Staander', `Staanderafstand (${!k.afstand || k.afstand === 'auto' ? 'automatisch' : 'vrij gekozen'})`, `a = ${Math.round(a)} mm ≤ min(amax uit de berekening ${Math.round(s.aMax)} mm (beperkt door ${s.beperkt}), grens van de soort ${o.S.maxAfstand} mm)`, a, amax, 'mm', a / Math.max(1, amax), 'uit de berekening hierboven; EISEN.md: een te grote vrije afstand is rood', { oordeel: a <= amax + 0.5 ? 'groen' : 'rood' });
    // handregel tussen de staanders: horizontaal (lijnlast of puntlast) en verticaal (1 kN)
    const hrP2 = hrP, Mh = Math.max((q.q * a * a) / 8, (q.Q * 1000 * a) / 4) * g, sh = Mh / hrP2.W;
    ctl('Handregel', `${hrP2.naam} horizontaal tussen twee staanders`, `MEd = γQ · max(qk · a² / 8; Qk · a / 4) = ${g} · max(${gw((q.q * a * a) / 8e6, 3)}; ${gw((q.Q * a) / 4e3, 3)}) = ${gw(Mh / 1e6, 3)} kNm; σ = ${gw(sh)} N/mm² ≤ ${fy(hrP2)}`, sh, fy(hrP2), 'N/mm²', sh / fy(hrP2), 'vrij opgelegd tussen de staanders (voorzichtig: in werkelijkheid doorgaand)');
    const gesteund = k.soort === 'spijlen' || (k.soort === 'staven' && st.vulling === 'plaat');
    const span = gesteund ? (o.spijlSteek ?? 120) : a, Mv = (g * NORM.verticaal.Q * 1000 * span) / 4, sv = Mv / hrP2.Wv;
    ctl('Handregel', `Verticale last ${gw(NORM.verticaal.Q, 0)} kN op ${hrP2.naam}`, `${gesteund ? `gesteund door de ${k.soort === 'spijlen' ? 'spijlen' : 'plaat'}: overspanning ${Math.round(span)} mm` : `vrij tussen de staanders: overspanning ${Math.round(span)} mm`}; MEd = γQ · Qk,v · L / 4 = ${gw(Mv / 1e6, 3)} kNm; σ = MEd / Wv = ${gw(Mv, 0)} / ${gw(hrP2.Wv, 0)} = ${gw(sv)} N/mm² ≤ ${fy(hrP2)}`, sv, fy(hrP2), 'N/mm²', sv / fy(hrP2), NORM.verticaal.bron, { uitleg: sv > fy(hrP2) ? 'De handregel buigt door onder iemand die erop leunt of zit: kies een koker 50x30, een buis Ø42,4 of een kortere staanderafstand.' : '' });
    if (gesteund && k.soort === 'spijlen') {
      // de spijl als drukstaaf (knik, kromme c) onder de verticale last
      const Ps = PROFIEL[o.st.spijl], Ls = o.spijlLengte ?? k.H - 100, i = Math.sqrt(Ps.I / Ps.A), lam = Ls / i / (93.9 * Math.sqrt(235 / fy(Ps))), phi = 0.5 * (1 + 0.49 * (lam - 0.2) + lam * lam), chi = Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lam * lam))), Nb = (chi * Ps.A * fy(Ps)) / 1000, NEd = g * NORM.verticaal.Q;
      ctl('Handregel', `Spijl ${Ps.naam} onder de verticale last (knik)`, `L = ${Math.round(Ls)} mm, λ̄ = ${gw(lam, 2)}, χ = ${gw(chi, 3)} (kromme c); Nb,Rd = χ · A · fy = ${gw(Nb, 2)} kN ≥ γQ · Qk,v = ${gw(NEd, 2)} kN (de handregel en de onderregel werken als ladderligger)`, NEd, Nb, 'kN', NEd / Nb, 'EN 1993-1-1 §6.3.1 (kromme c, scharnierend: voorzichtig)');
    }
  } else if (o.glas && k.soort === 'glasU') {
    ctl('Handregel', 'Verticale last op de U-handregel', k.hr === 'geen' ? 'geen handregel' : 'de U-handregel staat centrisch op het glas: de verticale last gaat in het glas (vrijgesteld, alleen een gedecentreerde regel telt)', 0, 0, '', 0, NORM.verticaal.bron, { oordeel: 'info' });
  }
  // ---------------------------------------------------------------- vulling: puntlast Qk,h2 = 0,5 kN onder de beschermingshoogte
  const QV = NORM.puntVulling.Q * 1000;
  for (const v of o.vulling ?? []) {
    if (v.soort === 'staaf') {
      const P = PROFIEL[v.prof], Pu = (8 * P.Wpl * fy(P)) / v.L;
      ctl('Vulling', `${v.wat} ${P.naam}, L = ${Math.round(v.L)} mm`, `twee kanten gelast: Pu = 8 · Wpl · fy / L = 8 · ${gw(P.Wpl, 0)} · ${fy(P)} / ${Math.round(v.L)} = ${gw(Pu / 1000, 2)} kN ≥ γQ · Qk,h2 = ${gw((g * QV) / 1000, 2)} kN`, g * QV, Pu, 'N', (g * QV) / Pu, `${NORM.puntVulling.bron}; plastisch mechanisme (EN 1993-1-1 §5.6)`, { uitleg: g * QV > Pu ? 'De spijl of staaf plooit onder een voet of een knie: kies een dikkere spijl (Ø14, vierkant 14) of een kortere overspanning.' : '' });
    } else if (v.soort === 'regel') {
      const P = PROFIEL[v.prof], M = (g * QV * v.L) / 4, s = M / P.W;
      ctl('Vulling', `${v.wat} ${P.naam} horizontaal, L = ${Math.round(v.L)} mm`, `MEd = γQ · Qk,h2 · L / 4 = ${gw(M / 1e6, 3)} kNm; σ = ${gw(s)} N/mm² ≤ ${fy(P)}`, s, fy(P), 'N/mm²', s / fy(P), NORM.puntVulling.bron);
    } else if (v.soort === 'plaat') {
      const m = (fy({}) * v.t * v.t) / 4 * (1 - (v.open ?? 0)), Pu = Math.min(2 * Math.PI * m, v.randen >= 3 ? Infinity : (4 * m * v.h) / v.L);
      ctl('Vulling', `${v.wat} ${v.t} mm, ${Math.round(v.L)} x ${Math.round(v.h)} mm`, `vloeilijnen: m = fy · t² / 4 · (1 − open ${gw(v.open ?? 0, 2)}) = ${gw(m, 0)} Nmm/mm; Pu = min(2π · m; 4 · m · h / L) = ${gw(Pu / 1000, 2)} kN ≥ ${gw((g * QV) / 1000, 2)} kN`, g * QV, Pu, 'N', (g * QV) / Pu, `${NORM.puntVulling.bron}; AANNAME: vloeilijntheorie (bovengrens) voor een plaat op twee randen`, { uitleg: g * QV > Pu ? 'De plaat is te dun voor de puntlast: neem 4 mm of een zetrand.' : '' });
    }
  }
  // ---------------------------------------------------------------- glas
  if (o.glas) {
    const G = o.glas, f = NORM.glas.fgd;
    if (k.soort === 'glasU') {
      const wp = Math.max(...o.panelen.filter((p) => p.rol === 'glas').map((p) => p.w)), x = glasUReken(k, G, wp);
      ctl('Glas', `Spanning ${G.naam}, uitkragend uit het profiel`, `lijnlast M = qk · h = ${gw(x.Mq, 0)} Nmm/mm${x.w ? `; wind ${gw(x.fw * 1000, 2)} kN/m² · h² / 2 = ${gw(x.Mw, 0)}; ${x.c.welke} = ${gw(x.c.M, 0)}` : ''}; puntlast ${gw(q.Q)} kN op één plaat over beff = min(w; h) = ${Math.round(x.beff)} mm: ${gw(x.Mp, 0)}; σ = 6 · (γQ · M / ${G.n}) / t² = ${gw(x.sig)} N/mm² ≤ fg,d = ${f}`, x.sig, f, 'N/mm²', x.sig / f, `${NORM.glas.bronSterkte}; per blad zonder samenwerking (voorzichtig)`);
      ctl('Glas', 'Doorbuiging bovenaan het glas', `δ = qk · h³ / (3 · E · hef³/12)${x.w ? ' + wind' : ''}, hef = ${gw(x.he, 2)} mm (ω = ${NORM.glas.omega}) → ${gw(x.d)} mm ≤ ${NORM.doorbuigingGlas.v} mm`, x.d, NORM.doorbuigingGlas.v, 'mm', x.d / NORM.doorbuigingGlas.v, `${NORM.doorbuigingGlas.bron}; ${NORM.omega.bron}`);
      const lim = G.dikte >= 21 ? 1.0 : 0.5, hg = k.H - (zij ? -100 : 10) - (k.hr === 'rond' ? 30 : 0);
      ctl('Glas', 'Systeem Q-railing Easy Glass Smart', `toegelaten 0,5 kN/m (privé), 1,0 kN/m met 21,52 mm glas; hier ${gw(q.q)} kN/m met ${G.dikte} mm; glas boven het profiel ${Math.round(hg)} mm ≤ ${NORM.glasU.hoog} mm${w ? '; wind niet in de brochure: fiche nakijken' : ''}`, q.q, lim, 'kN/m', Math.max(q.q / lim, hg / NORM.glasU.hoog), `Q-railing Easy Glass Smart-brochure (glasundbeschlag.de); ${NORM.glasU.bron}; hoger: Easy Glass Prime/Pro op offerte`, { oordeel: q.q > lim || hg > NORM.glasU.hoog ? 'rood' : w ? 'oranje' : 'groen' });
      const U = ANKER[o.ankerType], au = kiesAnkerU(k);
      ctl('Verankering', `Ankers in het profiel: ${U.naam} om de ${o.ankerAfstand} mm`, `N = γQ · M · s / z = ${g} · ${gw(au.M, 0)} · ${o.ankerAfstand} / ${au.z} = ${gw(au.N, 2)} kN ≤ ${au.NRd == null ? 'geen rekenwaarde' : `${gw(au.NRd, 2)} kN`}`, au.N, au.NRd ?? 0, 'kN', au.NRd ? au.N / au.NRd : 0, `${U.bron}; AANNAME hefboom ${au.z} mm in het profiel; AANNAME: voorgeboorde gaten om de 250 mm, een kleinere steek = bijboren (fiche nakijken)`, { oordeel: au.NRd == null ? (k.ondergrond === 'hout' ? 'rood' : 'oranje') : au.N > au.NRd ? 'rood' : au.N / au.NRd > 0.75 ? 'oranje' : 'groen', uitleg: 'Oranje: reken de ankers na met de handleiding van Q-railing en fischer FIXPERIENCE.' });
      if (k.hr === 'geen') ctl('Glas', 'Zonder handregel', 'alle bladen gehard; de fabrikant toont aan dat de borstwering blijft staan na breuk van alle bladen (100 N, 10 s, op 1 m)', 0, 0, '', 0, NORM.glas.bron, { oordeel: 'oranje', uitleg: 'Mag, maar vraag het attest van Q-railing voor dit glas (resttrouw na breuk).' });
    } else {
      const gl = o.panelen.filter((p) => p.rol === 'glas'), wg = Math.max(...gl.map((p) => p.w)), hg = Math.max(...gl.map((p) => p.h)), x = glasKlemReken(k, G, wg, hg);
      ctl('Glas', `Spanning ${G.naam} tussen 4 klemmen`, `puntlast op de vrije bovenrand: M = Qk · w / 4 = ${gw(x.Mp / 1e6, 3)} kNm over beff = min(h; w / 2) = ${Math.round(x.beff)} mm (spreiding onder 45°): σ = 6 · γQ · M / (beff · n · t²) = ${gw(x.sigP)} N/mm²${x.w ? `; wind ${gw(x.fw * 1000, 2)} kN/m² over w: σ = ${gw(x.sigW)}` : ''} ≤ ${f}`, x.sig, f, 'N/mm²', x.sig / f, `${NORM.glas.bronSterkte}; AANNAME beff = w / 2 (max de glashoogte)`, { oordeel: x.sig / f > 1 ? 'rood' : x.sig / f > 0.75 ? 'oranje' : 'groen' });
      const L = NORM.glasKlem, m2 = (wg * hg) / 1e6, ben = Math.max(wg / L.breed, hg / L.hoog, m2 / L.m2);
      ctl('Glas', 'Ruitmaat tussen de klemmen (Q-railing MOD 2500)', `ruit ${Math.round(wg)} x ${Math.round(hg)} mm = ${gw(m2, 2)} m² ≤ ${L.breed} x ${L.hoog} mm en ${gw(L.m2, 1)} m²`, Math.max(wg, hg), L.breed, 'mm', ben, L.bron, { oordeel: ben > 1 ? 'rood' : 'oranje', uitleg: ben > 1 ? 'De ruit is groter dan de klemmen dragen: kies een kleinere staanderafstand of een lagere balustrade.' : 'Oranje tot er een attest of tabel van Q-railing is voor deze ruit en dit glas.' });
      const kracht = (g * q.Q) / 2;
      ctl('Glas', 'Klemmen en borgpen', `4 klemmen MOD 2500 per ruit, elk met borgpen MOD 5015; puntlast aan één kant: ≈ γQ · Qk / 2 = ${gw(kracht, 2)} kN op de 2 klemmen van die kant; geen rekenwaarde van de klem gevonden`, kracht, 0, 'kN', 0, `${NORM.glasKlem.bron}; q-railing.com MOD 2500 (glas 6-12,76 mm) en MOD 5015 (borgpen)`, { oordeel: 'oranje', uitleg: 'Vraag het attest of de lasttabel van Q-railing voor de klem.' });
      ctl('Glas', 'Glasopbouw', `${G.naam}: gelaagd, beide bladen gehard, 1B1 (EN 12600), heat-soak (EN 14179); klemmen MOD 2500 voor 6-12,76 mm`, G.dikte, 12.76, 'mm', G.dikte / 12.76, `${NORM.glas.bron}; q-railing.com MOD 2500`, { oordeel: G.dikte <= 12.76 ? 'groen' : 'rood' });
    }
  }
  // ---------------------------------------------------------------- onder een schuin dak (AANNAMES, zie normen.mjs)
  for (const e of o.dak ?? []) {
    const naam = e.kant === 'begin' ? 'begin' : 'einde', s = o.segs[e.seg], G = `Onder het dak (${naam})`, th = gw(e.hoek, 0);
    if (!e.nodig) { ctl(G, 'Afschuining niet nodig', `het dak staat aan de muur op ${e.muur} mm ≥ H + spleet / cos θ = ${k.H} + ${gw(e.verticaal, 0)}`, e.muur, k.H, 'mm', 0, 'geometrie', { oordeel: 'info' }); continue; }
    ctl(G, 'Lengte van het schuine stuk past in de lijn', `xs = (H + s / cos θ − hmuur) / tan θ = (${k.H} + ${e.spleet} / cos ${th}° − ${e.muur}) / tan ${th}° = ${Math.round(e.xs)} mm ≤ beschikbaar ${Math.round(e.beschikbaar)} mm (lijn ${Math.round(s.Lh)} − ${NORM.dakVlak.v} vlak${e.beschikbaar < s.Lh - NORM.dakVlak.v - 0.5 ? ' − het andere schuine stuk' : ''})`, e.xs, e.beschikbaar, 'mm', e.xs / Math.max(1, e.beschikbaar), NORM.dakVlak.bron,
      { oordeel: e.past ? 'groen' : 'rood', uitleg: e.past ? '' : 'Het schuine stuk is langer dan de lijn: het dak komt niet hoog genoeg binnen deze lijn. Maak de lijn langer, of vraag een maatwerkoplossing (bv. een dichte wand tot tegen het dak).' });
    const op = e.spleet + NORM.dakTolerantie.v;
    ctl(G, 'Opening tussen het dak en de balustrade', `spleet ${e.spleet} mm loodrecht op het dak (verticaal ${gw(e.verticaal, 0)} mm) + ${NORM.dakTolerantie.v} mm tolerantie = ${op} mm ≤ ${NORM.dakOpening.v} mm`, op, NORM.dakOpening.v, 'mm', op / NORM.dakOpening.v, `${NORM.dakOpening.bron}; ${NORM.dakTolerantie.bron}`,
      { oordeel: op > NORM.dakOpening.v ? 'rood' : e.spleet < NORM.dakSpleetMin.v ? 'oranje' : 'groen', uitleg: op > NORM.dakOpening.v ? 'Een kind kan tussen het dak en de handregel door: kies een kleinere spleet.' : e.spleet < NORM.dakSpleetMin.v ? `Minder dan ${NORM.dakSpleetMin.v} mm: de balustrade kan het dak raken als het dak doorbuigt of werkt.` : '' });
    ctl(G, 'Lager dan H alleen onder het dak', `waar het dak lager is dan H + 110 mm volgt de bovenkant het dak (opening ≤ 110); vanaf x = (H + 110 / cos θ − hmuur) / tan θ = ${Math.round(e.x110)} mm ≥ xs = ${Math.round(e.xs)} mm staat de volle hoogte H = ${k.H} mm`, e.xs, e.x110, 'mm', e.xs / Math.max(1, e.x110), NORM.dakVolleHoogte.bron, { oordeel: e.xs <= e.x110 + 0.5 ? 'groen' : 'rood' });
    ctl(G, 'Hoogte van de balustrade aan de muur', `bovenkant aan de muur = hmuur − s / cos θ = ${e.muur} − ${gw(e.verticaal, 0)} = ${Math.round(e.top0)} mm ≥ ${NORM.dakWand.v} mm${e.muurplaat ? `; lager dan ${NORM.dakStaander.v} mm: muurplaat in plaats van een eindstaander` : ''}`, e.top0, NORM.dakWand.v, 'mm', NORM.dakWand.v / Math.max(1, e.top0), `${NORM.dakWand.bron}; ${NORM.dakStaander.bron}`,
      { oordeel: e.top0 >= NORM.dakWand.v ? 'groen' : 'rood', uitleg: e.top0 >= NORM.dakWand.v ? '' : 'Het dak komt aan de muur te laag om er een balustrade onder te maken: laat de balustrade verder van de muur beginnen, of sluit de ruimte onder het dak af.' });
    const laag = o.panelen.filter((p) => p.rol === 'glas' && p.seg === e.seg && p.uv && k.soort === 'glasstaal');
    if (laag.length) { const h = Math.min(...laag.map((p) => Math.min(p.hA, p.hB))), zonder = laag.some((p) => p.zonderKlem);
      ctl(G, 'Glas met schuine kant: klemmen aan de lage kant', `laagste glaskant ${Math.round(h)} mm: ${h >= 360 ? '2 klemmen' : h >= 50 ? '1 klem in het midden' : 'geen klem (te laag)'}; 2 klemmen vanaf 360 mm`, h, 50, 'mm', 50 / Math.max(1, h), 'AANNAME: een klem MOD 2500 is ± 50 mm hoog; lager dan 360 mm past er maar één', { oordeel: zonder ? 'oranje' : 'groen', uitleg: zonder ? 'De lage punt van het glas hangt zonder klem: kies een hogere muur, een kortere spleet, of laat de punt in een kort U-profiel op de muurplaat zetten (klemfabrikant laten bevestigen).' : '' }); }
    const mp = (o.platen ?? []).find((x) => x.rol === 'muurplaat' && x.kant === e.kant);
    if (mp) {
      const v = s.velden?.[e.kant === 'begin' ? 0 : s.velden.length - 1], a = v ? v.tb - v.ta + 50 : 1000, A = ANKER[k.anker === 'keil' ? 'keil10' : 'chem10'];
      const F = g * q.q * (a / 1000) / 2, V = F * Math.sqrt(0.25 + 1), Vrd = NORM.dakMuurAnker.v * A.VRd;
      ctl(G, `Muurplaat ${mp.w} x ${mp.h} x ${mp.t}: ${A.naam} (afschuiving)`, `F = γQ · qk · a / 2 = ${g} · ${gw(q.q)} · ${gw(a / 1000, 2)} / 2 = ${gw(F, 2)} kN op de bovenkant; per anker V = F · √(1/4 + 1) = ${gw(V, 2)} kN ≤ ${NORM.dakMuurAnker.v} · VRd = ${gw(Vrd, 2)} kN (AANNAME: het moment F · h over de 2 ankers op h/2 geeft per anker F horizontaal, plus F/2 dwars)`, V, Vrd, 'kN', V / Vrd, `${A.bron}; ${NORM.dakMuurAnker.bron}`, { oordeel: V / Vrd > 1 ? 'rood' : V / Vrd > 0.75 ? 'oranje' : 'groen' });
    }
  }
  const erg = C.some((c) => c.oordeel === 'rood') ? 'rood' : C.some((c) => c.oordeel === 'oranje') ? 'oranje' : 'groen';
  return { controles: C, oordeel: erg, q, wind: w, nakijken: nakijkLijst(o) };
}
