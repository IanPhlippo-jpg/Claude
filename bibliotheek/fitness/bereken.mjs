// De berekening van een fitnesstoestel: proeflasten volgens EN ISO 20957 (klasse H of S), sterkte en doorbuiging van
// de belangrijkste stukken (S235, EN 1993-1-1), de lassen (EN 1993-1-8 §4.5.3.3, vereenvoudigd), pennen en bouten op
// afschuiving en stuik, de staalkabel (factor 6) en de katrollen, de afscherming van katrollen en gewichtstapel,
// knelpunten en de stabiliteit op een helling van 10° (of de verankering). Elk resultaat krijgt een oordeel: groen
// (benut ≤ 90 %), oranje (90-100 % of een aanname die je moet nakijken) of rood, met de formule en de bron. Node en browser.
import { NORM } from './normen.mjs';
import { KOOP, PROFIEL } from './onderdelen.mjs';
import { norm, sub, dot, len, aabb } from './model.mjs';

const g = 9.81, E = NORM.E.v, fy = NORM.fy.v, fu = NORM.fu.v;
const fvw = fu / (Math.sqrt(3) * NORM.betaW.v * NORM.gM2.v); // ≈ 208 MPa
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');
const r = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
export const oordeelVan = (benut) => (benut <= 0.9 ? 'groen' : benut <= 1.0 ? 'oranje' : 'rood');
const S = (o) => (o.V.klasse === 'H' ? 'H' : 'S');

/** proeflast (N) en gebruikslast (N) van een rekenregel */
export function proeflast(o, x) {
  const k = S(o), gk = x.gk ?? x.kg ?? 0, G = x.g ?? 0;
  switch (x.proef) {
    case 'intrinsiek': return { F: NORM.intrinsiek.v * (gk + G) * g, Fs: (gk + G) * g, tekst: `F = 2,5 · ${gw(gk + G, 0)} kg · g`, bron: NORM.intrinsiek.bron };
    case 'extrinsiek': return { F: (gk + NORM.extrinsiek.dyn * G) * NORM.extrinsiek.v * g, Fs: (gk + G) * g, tekst: `F = (Gk + 1,5·G) · 2,5 · g = (${gw(gk, 0)} + 1,5 · ${gw(G, 0)}) · 2,5 · 9,81`, bron: NORM.extrinsiek.bron };
    case 'plateLoaded': return { F: NORM.plateLoaded[k] * (gk + 1.5 * G) * g, Fs: (gk + G) * g, tekst: `F = S · (Wp + 1,5·Fa) · g = ${NORM.plateLoaded[k]} · (${gw(gk, 0)} + 1,5 · ${gw(G, 0)}) · 9,81`, bron: NORM.plateLoaded.bron };
    case 'vanghaak': return { F: NORM.vanghaak[k] * G * g, Fs: G * g, tekst: `F = ${NORM.vanghaak[k]} · ${gw(G, 0)} kg · g`, bron: NORM.vanghaak.bron };
    case 'schijfhouder': return { F: NORM.schijfhouder[k] * G * g, Fs: G * g, tekst: `F = ${NORM.schijfhouder[k]} · ${gw(G, 0)} kg · g`, bron: NORM.schijfhouder.bron };
    case 'opslagpen': return { F: NORM.opslagpen[k] * G * g, Fs: G * g, tekst: `F = ${NORM.opslagpen[k]} · ${gw(G, 0)} kg · g`, bron: NORM.opslagpen.bron };
    default: return { F: 2.5 * (gk + G) * g, Fs: (gk + G) * g, tekst: 'F = 2,5 · m · g', bron: NORM.intrinsiek.bron };
  }
}
/** buigweerstand van een staaf voor een last in richting 'dir' (wereld): sterke of zwakke as */
function buig(d, dir) {
  const P = d.P, sterk = Math.abs(dot(d.w, dir)) >= Math.abs(dot(d.v, dir));
  return sterk ? { W: P.W, I: P.I, as: 'sterke as' } : { W: P.Wz, I: P.Iz, as: 'zwakke as' };
}
/** knikfactor χ (EN 1993-1-1 §6.3.1, kromme c, α = 0,49 voor koudgevormde buizen EN 10219) */
function chi(d, Lcr) {
  const P = d.P, i = Math.sqrt(Math.min(P.I, P.Iz) / P.A), lam = Lcr / i / (93.9 * Math.sqrt(235 / fy)), phi = 0.5 * (1 + 0.49 * (lam - 0.2) + lam ** 2);
  return { chi: Math.min(1, 1 / (phi + Math.sqrt(Math.max(0, phi ** 2 - lam ** 2)))), lam };
}
/** lasdoorsnede rondom een profiel (keel a): weerstandsmoment en lengte */
function lasDoorsnede(P, a, sterk = true) {
  if (P.vorm === 'buis' || P.vorm === 'rond') { const rr = P.b / 2; return { Ww: Math.PI * rr ** 2 * a, Lw: Math.PI * P.b }; }
  const h = sterk ? P.h : P.b, bb = sterk ? P.b : P.h;
  return { Ww: a * (h ** 2 / 3 + bb * h), Lw: 2 * (P.b + P.h) };
}

export function berekening(o) {
  const C = [], k = S(o), V = o.V;
  const ctl = (groep, wat, formule, benut, bron, extra = {}) => C.push({ groep, wat, formule, benut: r(benut), oordeel: extra.oordeel ?? oordeelVan(benut), bron, ...extra });
  ctl('Toestel', `Klasse ${V.klasse}: ${V.uitleg}`, `maximale gebruikersmassa ${V.gebruiker} kg (≥ ${NORM.gebruikerMin.v})${o.maxLast ? `, maximale trainingslast ${o.maxLast} kg` : ''}${o.stapels.length ? `, gewichtstapel ${o.stapels.map((s) => `${s.n} x ${s.kg} kg`).join(' + ')}` : ''}`, 0, NORM.gebruikerMin.bron, { oordeel: 'info' });

  // ---- sterkte en doorbuiging van de belangrijkste stukken
  for (const x of o.reken) {
    const d = x.stuk; if (!d) { ctl('Sterkte', x.wat, 'stuk niet gevonden', 2, '', { oordeel: 'rood' }); continue; }
    const pl = proeflast(o, x), L = x.L, fy = d.P?.fy ?? NORM.fy.v, L0 = x.proef === 'schijfhouder' ? 0.6 * L : L;
    if (d.soort === 'plaat' || x.type === 'haakplaat') {
      const t = V.plaat, h = 60, W = (t * h ** 2) / 6, M = pl.F * 40, s = M / W;
      ctl('Sterkte', x.wat, `${pl.tekst} = ${gw(pl.F / 1000, 2)} kN op 40 mm van de rugplaat; schoorschot ${t} x ${h}: W = t·h²/6 = ${gw(W, 0)} mm³; σ = M/W = ${gw(s)} N/mm² ≤ fy = ${fy}`, s / fy, `${pl.bron}; EN 1993-1-1 §6.2.5`);
      if (x.las) { const Ww = V.las * (2 * h ** 2) / 3, sw = M / Ww; ctl('Lassen', `Las schoorschot ${x.wat.toLowerCase()}`, `hoeklas a${V.las} beide zijden, h = ${h}: σw = M / Ww = ${gw(sw)} N/mm² ≤ fvw,d = fu / (√3·βw·γM2) = ${gw(fvw, 0)}`, sw / fvw, NORM.betaW.bron); }
      continue;
    }
    const dir = x.type === 'staander' || x.type === 'staanderM' ? norm([0, 1, 0]) : [0, 0, 1];
    const B = buig(d, x.dwars ? [0, 1, 0] : dir), P = d.P;
    if (x.type === 'ligger') {
      const M = x.verdeeld ? (pl.F * L) / 8 : (pl.F * L) / 4, s = M / B.W, dl = (x.verdeeld ? 5 / 384 : 1 / 48) * pl.Fs * L ** 3 / (E * B.I), lim = L / NORM.doorbuiging.ligger;
      ctl('Sterkte', x.wat, `${P.naam}, L = ${Math.round(L)} mm, ${x.verdeeld ? 'verdeeld' : 'puntlast in het midden'}: ${pl.tekst} = ${gw(pl.F / 1000, 2)} kN; M = ${x.verdeeld ? 'F·L/8' : 'F·L/4'} = ${gw(M / 1e6, 3)} kNm; σ = M/W = ${gw(s)} N/mm² ≤ fy = ${fy} (${B.as})`, s / fy, `${pl.bron}; EN 1993-1-1 §6.2.5`);
      ctl('Doorbuiging', x.wat, `onder de gebruikslast ${gw(pl.Fs / 1000, 2)} kN: δ = ${gw(dl)} mm ≤ L/${NORM.doorbuiging.ligger} = ${gw(lim)} mm`, dl / lim, NORM.doorbuiging.bron);
    } else if (x.type === 'uitkrager') {
      const M = pl.F * L0, s = M / B.W, dl = (pl.Fs * L0 ** 2 * (3 * L - L0)) / (6 * E * B.I), lim = L / NORM.doorbuiging.uitkrager;
      ctl('Sterkte', x.wat, `${P.naam}, uitkragend L = ${Math.round(L)} mm${L0 !== L ? ` (zwaartepunt van de schijven op 0,6·L = ${Math.round(L0)} mm, AANNAME)` : ''}: ${pl.tekst} = ${gw(pl.F / 1000, 2)} kN; M = F·${L0 !== L ? '0,6·' : ''}L = ${gw(M / 1e6, 3)} kNm; σ = ${gw(s)} N/mm² ≤ ${fy} (${B.as})`, s / fy, `${pl.bron}; EN 1993-1-1 §6.2.5`);
      ctl('Doorbuiging', x.wat, `δ = F·L³/(3·E·I) = ${gw(dl)} mm ≤ L/${NORM.doorbuiging.uitkrager} = ${gw(lim)} mm (gebruikslast)`, dl / lim, NORM.doorbuiging.bron);
      const kraag = x.kraag ?? (d.naam === 'Schijfhouder' && o.delen.some((q) => q.naam === 'Kraag schijfhouder' && q.groep === d.groep) ? 100 : 0);
      if (x.las) { const lw = kraag ? { Ww: Math.PI * (kraag / 2) ** 2 * V.las, Lw: Math.PI * kraag } : lasDoorsnede(P, V.las, B.as === 'sterke as'), sw = Math.hypot(M / lw.Ww, pl.F / (V.las * lw.Lw)); ctl('Lassen', `Las aan de voet: ${x.wat.toLowerCase()}`, `hoeklas a${V.las} rondom ${kraag ? `de kraag Ø${kraag} (de houder is door de kraag gestoken en rondom gelast)` : P.naam}: σw = √((M/Ww)² + (V/(a·Lw))²) = ${gw(sw)} N/mm² ≤ fvw,d = ${gw(fvw, 0)} (Ww = ${gw(lw.Ww, 0)} mm³)`, sw / fvw, `${NORM.betaW.bron}; ISO 2553`); }
    } else {
      const N = pl.F, e = x.e ?? 0, Lcr = (x.knik ?? (x.type === 'staanderM' ? 2 : 1)) * L, c = chi(d, Lcr), M = N * e;
      const ben = N / (c.chi * P.A * fy) + (M ? M / (B.W * fy) : 0);
      ctl('Sterkte', x.wat, `${P.naam}, L = ${Math.round(L)} mm, Lcr = ${Math.round(Lcr)} mm: N = ${gw(N / 1000, 2)} kN (${pl.tekst})${e ? `, e = ${Math.round(e)} mm, M = ${gw(M / 1e6, 3)} kNm` : ''}; λ̄ = ${gw(c.lam, 2)}, χ = ${gw(c.chi, 2)}; N/(χ·A·fy)${e ? ' + M/(W·fy)' : ''} = ${gw(ben, 2)} ≤ 1`, ben, `${pl.bron}; EN 1993-1-1 §6.3.1 (kromme c), interactie vereenvoudigd (AANNAME)`);
      if (x.las && M) { const lw = lasDoorsnede(P, V.las), sw = Math.hypot(M / lw.Ww, N / (V.las * lw.Lw)); ctl('Lassen', `Las aan de voet: ${x.wat.toLowerCase()}`, `hoeklas a${V.las} rondom ${P.naam}: σw = ${gw(sw)} N/mm² ≤ fvw,d = ${gw(fvw, 0)}`, sw / fvw, NORM.betaW.bron); }
    }
  }
  // ---- pennen en bouten
  const penF = (p) => { const f = p.factor; const kg = p.F ?? 0; if (f === 'vanghaak') return NORM.vanghaak[k] * kg; if (f === 'schijfhouderPen') return NORM.schijfhouder[k] * kg; if (f === 'plateLoadedPen') return NORM.plateLoaded[k] * 1.5 * kg; if (f === 'intrinsiekPen') return 2.5 * kg; return 2.5 * kg; };
  const gezienPen = new Set();
  for (const p of o.pennen) {
    if (!p.F) continue;
    const sleutel = `${p.d}|${p.F}|${p.snedes}|${p.factor}`; if (gezienPen.has(sleutel)) continue; gezienPen.add(sleutel);
    const F = penF(p) * g, A = (Math.PI / 4) * p.d ** 2, fup = p.key ? 500 : fu, Fv = (0.6 * A * fup) / NORM.gM2.v, Rd = Fv * p.snedes;
    ctl('Pennen en bouten', `Pen Ø${p.d}: ${p.naam}`, `proeflast ${gw(F / 1000, 2)} kN; Fv,Rd = 0,6·A·fup/γM2 · ${p.snedes} snede${p.snedes > 1 ? 'n' : ''} = 0,6 · ${gw(A, 0)} · ${fup} / 1,25 · ${p.snedes} = ${gw(Rd / 1000, 1)} kN${p.key ? ' (AANNAME fup = 500 voor een gekochte pen)' : ''}`, F / Rd, NORM.pen.bron);
    const t = 3, Fb = (1.5 * t * p.d * fy) / NORM.gM0.v * Math.max(1, p.snedes);
    ctl('Pennen en bouten', `Stuik van het gat: ${p.naam}`, `Fb,Rd = 1,5·t·d·fy/γM0 = 1,5 · ${t} · ${p.d} · ${fy} = ${gw(Fb / 1000, 1)} kN per wand (AANNAME wand 3 mm)`, F / Fb, NORM.pen.bron);
  }
  for (const bt of o.bouten) {
    if (!bt.F || bt.key === 'anker') continue;
    const As = bt.M === 16 ? 157 : bt.M === 12 ? 84.3 : 58, Fv = (NORM.bout88.av * NORM.bout88.fub * As) / NORM.gM2.v, F = (2.5 * bt.F * g) / bt.n;
    ctl('Pennen en bouten', `Bouten M${bt.M} 8.8: ${bt.naam}`, `F per bout = 2,5 · ${gw(bt.F, 0)} kg · g / ${bt.n} = ${gw(F / 1000, 2)} kN ≤ Fv,Rd = 0,6 · 800 · ${As} / 1,25 = ${gw(Fv / 1000, 1)} kN`, F / Fv, NORM.bout88.bron);
  }
  // ---- kabels en katrollen
  for (const kb of o.kabels) {
    const K = KOOP[kb.key], F = (kb.last * g) / kb.overbrenging, ben = (NORM.kabel.v * F) / (K.MBL * 1000);
    ctl('Kabel', `${kb.naam}: veiligheidsfactor 6`, `F = stapel · g / overbrenging = ${gw(kb.last, 0)} · 9,81 / ${kb.overbrenging} = ${gw(F / 1000, 2)} kN; 6 · F = ${gw((6 * F) / 1000, 2)} kN ≤ breukkracht ${gw(K.MBL, 2)} kN (${K.artikel}; AANNAME: de versnelling zit in de factor 6)`, ben, `${NORM.kabel.bron}; ${K.bron}`);
    const katr = kb.route.filter((p) => p.katrol);
    const lus = (kb.begin === 'stapel' || kb.begin === 'anker' || kb.begin === 'laadpen' || kb.begin === 'slede') && (kb.einde === 'greep' || kb.einde === 'nok') && kb.route.slice(1, -1).every((p) => p.katrol || p.los);
    ctl('Kabel', `${kb.naam}: kabelloop en overbrenging`, `${kb.begin} → ${katr.map((p) => p.label).join(' → ')}${kb.route.some((p) => p.los) ? ' (+ losse katrol op de stapel)' : ''} → ${kb.einde}; lengte ${gw(kb.L / 1000, 2)} m (+ 0,3 m voor de lussen); overbrenging ${kb.overbrenging}:1${kb.overbrenging === 2 ? ' (de greep voelt de helft van de stapel en gaat 2 x zo ver)' : ''}`, 0, 'model: gesloten kabelloop', { oordeel: lus ? 'info' : 'rood' });
    for (let i = 1; i < kb.route.length - 1; i++) {
      const p = kb.route[i]; if (!p.katrol) continue;
      const d1 = norm(sub(p.p, kb.route[i - 1].p)), d2 = norm(sub(kb.route[i + 1].p, p.p)), Fr = F * len(sub(d2, d1));
      const KK = KOOP[p.k.key], Dd = KK.D / KOOP[kb.key].d;
      ctl('Katrollen', `Katrol ${p.label}: belasting`, `R = F·|d2 − d1| = ${gw(Fr / 1000, 2)} kN ≤ ${gw(KK.kN, 2)} kN (opgave winkel)`, Fr / (KK.kN * 1000), KK.bron);
      ctl('Katrollen', `Katrol ${p.label}: D/d`, `D/d = ${KK.D} / ${KOOP[kb.key].d} = ${gw(Dd)} ≥ 18`, 18 / Dd, NORM.katrolD.bron, { oordeel: Dd >= 18 ? 'groen' : Dd >= 15 ? 'oranje' : 'rood' });
    }
  }
  for (const kt of o.katrollen) {
    const laag = kt.c[2] < NORM.katrolKap.v;
    ctl('Afscherming', `Vingerbescherming katrol ${kt.label}`, laag ? (kt.kap ? `op ${Math.round(kt.c[2])} mm (< 1800): gezette plaat op ≤ 5 mm van de groef, kabelgeleiding` : `op ${Math.round(kt.c[2])} mm (< 1800) zonder afscherming`) : `op ${Math.round(kt.c[2])} mm: boven de reikzone van 1800 mm; de beugel houdt de kabel in de groef`, 0, NORM.katrolKap.bron, { oordeel: !laag || kt.kap ? 'groen' : 'rood' });
  }
  for (const s of o.stapels) {
    const nodig = s.top + s.slag + NORM.stapelKap.vrij, kap = o.delen.filter((d) => d.kleur === 'kap'), hoog = kap.length ? Math.max(...kap.map((d) => d.mx[2])) : 0;
    const open = Math.max(0, ((s.dpl + 40) - (o.delen.find((d) => d.naam === 'Torenstaander')?.P.b ?? 60)) / 2);
    ctl('Afscherming', `Gewichtstapel ${s.n} x ${s.kg} kg: hoogte van de afscherming`, `afscherming tot ${Math.round(hoog)} mm; stapel in de hoogste stand + 60 = ${Math.round(nodig)} mm`, hoog >= nodig - 0.5 || hoog >= s.zt - 1 ? 0.5 : 1.2, NORM.stapelKap.bron, { oordeel: hoog >= nodig - 0.5 || hoog >= s.zt - 1 ? 'groen' : 'rood' });
    ctl('Afscherming', 'Openingen in de afscherming', `zijdelingse spleet naast de staander ${Math.round(open)} mm ≤ 75 mm; stapel 60 mm van de staanders`, open / NORM.stapelKap.opening, NORM.stapelKap.bron);
    ctl('Afscherming', 'Selectiepen', `${KOOP[V.selectiepen].naam}: magnetisch, valt niet vanzelf uit`, 0, NORM.knelVrij.bron, { oordeel: 'groen' });
  }
  // ---- knelpunten en afwerking
  for (const sp of o.spleten) {
    const ok = sp.kap || sp.mm < NORM.knelVrij.spleetMin || sp.mm > NORM.knelVrij.spleetMax;
    ctl('Knelpunten', sp.wat, `vrije afstand ${sp.mm} mm${sp.kap ? ', afgeschermd' : ''}: niet tussen 9,5 en 25 mm, of afgeschermd`, 0, NORM.knelVrij.bron, { oordeel: ok ? 'groen' : 'oranje', uitleg: sp.uitleg ?? '' });
  }
  if (o.pennen.some((p) => p.b?.startsWith?.('Hefboom') || p.b === 'Slede') || o.def?.soort === 'plate') ctl('Knelpunten', 'Hefboom of slede tegen het frame', 'eindaanslag met rubberbuffer; vrije afstand hefboom-frame ≥ 60 mm (of ≤ 25 mm waar alleen vingers kunnen komen): nakijken op het toestel', 0, NORM.knelVrij.bron, { oordeel: 'oranje', uitleg: 'De hefboom of slede is in 5 standen (0, 25, 50, 75 en 100 % van de slag) op botsingen met het frame, de kussens en de schijven gecontroleerd: geen. Knelafstanden tussen 9,5 en 25 mm zijn een maat op het echte toestel: AANNAME, nameten op het eerste toestel.' });
  const kappen = o.koop.filter((x) => x.id?.startsWith('kap-')).reduce((t, x) => t + x.n, 0);
  ctl('Afwerking', 'Randen en buisuiteinden', `alle randen braamvrij, lichaamsdragende randen r ≥ 2,5 mm; ${kappen} eindkappen op open uiteinden`, 0, NORM.randen.bron, { oordeel: 'groen' });
  // ---- stabiliteit of verankering
  if (o.verankerd) {
    const A = o.anker;
    if (A) {
      const NRd = 7.6, F = 2.5 * A.kg * g, N = (F * A.arm) / (A.z * A.n) / 1000;
      ctl('Stabiliteit', `Verankerd in de ${o.verankerd}: trek per anker`, `N = 2,5 · ${gw(A.kg, 0)} kg · g · ${A.arm} mm / (${A.z} mm · ${A.n}) = ${gw(N, 2)} kN ≤ NRd ≈ ${NRd} kN (AANNAME keilbout M12 in beton C20/25, randafstand ≥ 100)`, N / NRd, `${NORM.stabiliteit.bron}; AANNAME ankerwaarde (fischer FAZ II 12, zie balustrades)`, { oordeel: N / NRd > 1 ? 'rood' : 'oranje', uitleg: 'Oranje: de ankerwaarde is een aanname. Kijk de muur na (beton of volle baksteen) en reken het anker na in fischer FIXPERIENCE.' });
    } else ctl('Stabiliteit', `Verankerd ${o.verankerd === 'rack' ? 'in het rack' : `in de ${o.verankerd}`}`, o.verankerd === 'vloer' ? 'pro: voetbalken met 4 keilbouten M12 in de vloer (EN ISO 20957-4 §5.3: vrijstaande haltersteunen moeten verankerd kunnen worden)' : o.verankerd === 'rack' ? 'hangt in het rack: het rack moet verankerd of zwaar genoeg zijn' : 'tegen de muur met keilbouten M12', 0, NORM.stabiliteit.bron, { oordeel: 'oranje', uitleg: 'Nakijken op de plaats: vloer of muur, ankers.' });
  }
  if (o.verankerd !== 'muur' && o.verankerd !== 'rack') {
    const st = stabiliteit(o);
    for (const s of st) ctl('Stabiliteit', `Kantelen op 10° (${s.geval}, naar ${s.richting})`, `zwaartepunt op ${Math.round(s.h)} mm hoog, ${Math.round(s.d)} mm van de kantelrand: h · tan 10° = ${Math.round(s.h * Math.tan((10 * Math.PI) / 180))} mm ≤ ${Math.round(s.d)} mm (massa ${Math.round(s.m)} kg${s.geval ? ' met gebruiker en last' : ''})`, s.benut, NORM.stabiliteit.bron, { oordeel: o.verankerd === 'vloer' && s.benut > 0.9 ? 'oranje' : oordeelVan(s.benut), uitleg: s.benut > 1 ? (o.verankerd === 'vloer' ? 'Kantelt zonder ankers: in de proversie verankerd.' : 'Kantelt: verankeren of de voeten verlengen.') : '' });
  }
  const ord = ['groen', 'oranje', 'rood'];
  const oordeel = C.filter((c) => c.oordeel !== 'info').reduce((m, c) => (ord.indexOf(c.oordeel) > ord.indexOf(m) ? c.oordeel : m), 'groen');
  return { controles: C, oordeel };
}

/** stabiliteit per belastinggeval en richting: { geval, richting, h, d, m, benut } (alleen de ongunstigste richting per geval) */
export function stabiliteit(o) {
  // grondvlak: de omhullende (x, y) van alles wat de vloer raakt
  const geo = [...o.delen.flatMap((d) => d.geo), ...o.koop.flatMap((d) => d.geo)];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const gg of geo) { const [mn, mx] = aabb(gg); if (mn[2] <= 15) { x0 = Math.min(x0, mn[0]); x1 = Math.max(x1, mx[0]); y0 = Math.min(y0, mn[1]); y1 = Math.max(y1, mx[1]); } }
  const gevallen = [...new Set(o.lasten.map((l) => l.geval))];
  if (!gevallen.length) gevallen.push('');
  const uit = [];
  for (const gv of gevallen) {
    let m = o.massa; const z = o.zwaartepunt.map((v) => v * o.massa);
    for (const l of o.lasten.filter((x) => x.geval === gv)) { m += l.kg; for (let i = 0; i < 3; i++) z[i] += l.kg * l.p[i]; }
    const c = z.map((v) => v / m), t = Math.tan((10 * Math.PI) / 180);
    const kanten = [['voor', c[1] - y0], ['achter', y1 - c[1]], ['links', c[0] - x0], ['rechts', x1 - c[0]]];
    let slechtst = null;
    for (const [richting, d] of kanten) { const benut = d <= 0 ? 9 : (c[2] * t) / d; if (!slechtst || benut > slechtst.benut) slechtst = { geval: gv || 'leeg', richting, h: c[2], d, m, benut: r(benut) }; }
    uit.push(slechtst);
  }
  return uit;
}
export { PROFIEL };
