// De berekening van een fitnesstoestel: proeflasten volgens EN ISO 20957 (klasse H of S), sterkte en doorbuiging van
// de belangrijkste stukken (S235, EN 1993-1-1), de lassen (EN 1993-1-8 §4.5.3.3, vereenvoudigd), pennen en bouten op
// afschuiving en stuik, de staalkabel (factor 6) en de katrollen, de afscherming van katrollen en gewichtstapel,
// knelpunten en de stabiliteit op een helling van 10° (of de verankering). Elk resultaat krijgt een oordeel: groen
// (benut ≤ 90 %), oranje (90-100 % of een aanname die je moet nakijken) of rood, met de formule en de bron. Node en browser.
import { NORM } from './normen.mjs';
import { KOOP, PROFIEL } from './onderdelen.mjs';
import { norm, sub, dot, len, aabb } from './model.mjs';

const kg2N = (kg) => (kg ?? 0) * 9.81;
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
    const B0 = buig(d, x.dwars ? [0, 1, 0] : dir), P = d.P, B = d.buig ? { ...B0, W: B0.W * 0.85, as: `${B0.as}, W x 0,85 in de bocht (buitenwand dunner, ovaal; P2-16)` } : B0;
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
      // netto doorsnede bij Westside-gaten (2 wanden): A·(1 - 2·t·d0/A) (P2-08)
      const red = d.westside ? Math.max(0.5, 1 - (2 * P.t * d.westside.d) / P.A) : 1;
      const ben = N / (c.chi * P.A * red * fy) + (M ? M / (B.W * red * fy) : 0);
      if (d.westside) ctl('Sterkte', `Netto doorsnede: ${x.wat.toLowerCase()}`, `Westside-gat Ø${d.westside.d} door 2 wanden van ${P.t} mm: A netto = A − 2·t·d0 = ${Math.round(P.A * red)} mm² (${Math.round((1 - red) * 100)} % minder); hierboven mee gerekend. Gatenrij om de 25/50 mm: buiten EN 1993-1-8 tabel 3.3 (p1 ≥ 2,2·d0), gangbaar in de sector (AANNAME)`, 0, 'EN 1993-1-1 §6.2.2.2', { oordeel: 'info' });
      ctl('Sterkte', x.wat, `${P.naam}, L = ${Math.round(L)} mm, Lcr = ${Math.round(Lcr)} mm: N = ${gw(N / 1000, 2)} kN (${pl.tekst})${e ? `, e = ${Math.round(e)} mm, M = ${gw(M / 1e6, 3)} kNm` : ''}; λ̄ = ${gw(c.lam, 2)}, χ = ${gw(c.chi, 2)}; N/(χ·A·fy)${e ? ' + M/(W·fy)' : ''} = ${gw(ben, 2)} ≤ 1`, ben, `${pl.bron}; EN 1993-1-1 §6.3.1 (kromme c), interactie vereenvoudigd (AANNAME)`);
      if (x.las && M) { const lw = lasDoorsnede(P, V.las), sw = Math.hypot(M / lw.Ww, N / (V.las * lw.Lw)); ctl('Lassen', `Las aan de voet: ${x.wat.toLowerCase()}`, `hoeklas a${V.las} rondom ${P.naam}: σw = ${gw(sw)} N/mm² ≤ fvw,d = ${gw(fvw, 0)}`, sw / fvw, NORM.betaW.bron); }
    }
  }
  // ---- vermoeiing (EN 1993-1-9, detailcategorie 36 voor een hoeklas aan de voet; AANNAME aantal cycli)
  for (const x of o.reken) {
    if (x.type !== 'uitkrager' || !x.las || !x.stuk || x.stuk.soort !== 'staaf' || !['plateLoaded', 'extrinsiek'].includes(x.proef)) continue;
    const schets = o.delen.some((q) => q.naam.startsWith('Schetsplaat') && q.groep === x.stuk.groep && len(sub(q.a, x.stuk.a)) < 200 + x.stuk.L), pl = proeflast(o, x), L0 = x.proef === 'schijfhouder' ? 0.6 * x.L : x.L, lw = lasDoorsnede(x.stuk.P, V.las), ds = (pl.Fs * L0) / lw.Ww / (schets ? 2 : 1);
    const N = V.klasse === 'S' ? 2e6 : 1e5, dsR = 36 * Math.cbrt(2e6 / N) / 1.35;
    ctl('Vermoeiing', `Las aan de voet: ${x.wat.toLowerCase()}`, `spanningswissel bij gebruik Δσ = M/Ww = ${gw(ds)} N/mm² ≤ ΔσR = 36 · (2·10⁶/N)^(1/3) / γMf = ${gw(dsR)} N/mm² bij N = ${N.toLocaleString('nl-BE')} cycli (${V.klasse === 'S' ? 'pro: 10 jaar sportschool' : 'thuis'}, AANNAME)${schets ? '; met 2 schetsplaten 60 x 10 aan de voet: lasdoorsnede x 2 (AANNAME)' : ''}; ${ds > dsR ? 'doorgelaste voet of schetsplaten nodig' : 'voldoet'}`, ds / dsR, 'EN 1993-1-9 tabel 8.5 (cat. 36), γMf = 1,35');
  }
  // ---- pennen en bouten
  const penF = (p) => { const f = p.factor; const kg = p.F ?? 0; if (f === 'vanghaak') return NORM.vanghaak[k] * kg; if (f === 'schijfhouderPen') return NORM.schijfhouder[k] * kg; if (f === 'plateLoadedPen') return NORM.plateLoaded[k] * 1.5 * kg; if (f === 'intrinsiekPen') return 2.5 * kg; if (f === 'extrinsiekPen') return NORM.extrinsiek.v * NORM.extrinsiek.dyn * kg; return 2.5 * kg; };
  const gezienPen = new Set();
  for (const p of o.pennen) {
    if (!p.F && p.e) ctl('Evenwicht', `Losse haak: ${p.naam}`, p.snedes < 2 ? 'pen door één wand: het moment van de last trekt de pen uit het gat (gladde pen: geen weerstand)' : `pen door beide wanden (${p.hoh} mm): het moment wordt een koppel op de wanden`, p.snedes < 2 ? 9 : 0, 'evenwicht (statica)', { oordeel: p.snedes < 2 ? 'rood' : 'groen' });
    if (!p.F) { ctl('Pennen en bouten', `Pen Ø${p.d}: ${p.naam}`, p.geleiding ?? 'geen rekenlast opgegeven (geleiding of montage): nakijken', 0, NORM.pen.bron, { oordeel: p.geleiding ? 'info' : 'oranje' }); continue; }
    const sleutel = `${p.d}|${p.F}|${p.snedes}|${p.factor}`; if (gezienPen.has(sleutel)) continue; gezienPen.add(sleutel);
    const F = penF(p) * g, A = (Math.PI / 4) * p.d ** 2, fup = p.key ? 500 : fu, Fv = (0.6 * A * fup) / NORM.gM2.v, Rd = Fv * p.snedes;
    ctl('Pennen en bouten', `Pen Ø${p.d}: ${p.naam}`, `proeflast ${gw(F / 1000, 2)} kN; Fv,Rd = 0,6·A·fup/γM2 · ${p.snedes} snede${p.snedes > 1 ? 'n' : ''} = 0,6 · ${gw(A, 0)} · ${fup} / 1,25 · ${p.snedes} = ${gw(Rd / 1000, 1)} kN${p.key ? ' (AANNAME fup = 500 voor een gekochte pen)' : ''}`, F / Rd, NORM.pen.bron);
    const t = p.t ?? 3, e = p.e ?? 0, hoh = p.hoh ?? 0;
    // evenwicht: last op e mm voor de voorste wand, pen steunt in twee wanden op hoh mm: koppel F·e/hoh
    const Fv2 = e && hoh ? F * e / hoh : 0, Fvoor = F + Fv2, Fmax = e && hoh ? Fvoor : F / Math.max(1, p.snedes);
    const Fb = (1.5 * t * p.d * fy) / NORM.gM0.v;
    ctl('Pennen en bouten', `Stuik van het gat: ${p.naam}`, `${e && hoh ? `last ${gw(F / 1000, 2)} kN op ${e} mm voor de wand, pen in 2 wanden op ${hoh} mm: voorste wand F·(1 + e/hoh) = ${gw(Fvoor / 1000, 2)} kN, achterste F·e/hoh = ${gw(Fv2 / 1000, 2)} kN; ` : ''}Fb,Rd = 1,5·t·d·fy/γM0 = 1,5 · ${t} · ${p.d} · ${fy} = ${gw(Fb / 1000, 1)} kN per wand (wand ${t} mm)`, Fmax / Fb, NORM.pen.bron);
    if (e && p.snedes < 2) ctl('Evenwicht', `Losse haak: ${p.naam}`, `last op ${e} mm voor de wand, pen door één wand: het moment F·e = ${gw(F * e / 1e6, 3)} kNm moet de pen uit het gat trekken (gladde pen: geen weerstand)`, 9, 'evenwicht (statica)', { oordeel: 'rood' });
    else if (e) ctl('Evenwicht', `Losse haak: ${p.naam}`, `pen door beide wanden (${hoh} mm): het moment F·e = ${gw(F * e / 1e6, 3)} kNm wordt een koppel van 2 x ${gw(Fv2 / 1000, 2)} kN op de wanden; de wangen van de U-beugel houden de haak recht`, 0, 'evenwicht (statica)', { oordeel: 'groen' });
    const fyp = p.fy ?? fy, W = Math.PI * p.d ** 3 / 32, Mp = e ? F * Math.min(e, 45) : F * (t / 2 + 2) / Math.max(1, p.snedes), MRd = 1.5 * W * fyp / NORM.gM0.v;
    if (p.key) { const Fser = kg2N(p.F), Rser = 0.6 * t * p.d * fy; ctl('Pennen en bouten', `Verwisselbare pen (gebruik): ${p.naam}`, `gebruikslast ${gw(Fser / 1000, 2)} kN ≤ Fb,Rd,ser = 0,6·t·d·fy = 0,6 · ${t} · ${p.d} · ${fy} = ${gw(Rser / 1000, 2)} kN per wand (EN 1993-1-8 §3.13.2)`, Fser / Math.max(1, p.snedes) / Rser, 'EN 1993-1-8 §3.13.2 (verwisselbare pen)'); }
    ctl('Pennen en bouten', `Penbuiging: ${p.naam}`, `M = ${gw(Mp / 1e6, 3)} kNm${e ? ` (last op ${e} mm voor de wand)` : ''} ≤ MRd = 1,5·W·fy = 1,5 · ${gw(W, 0)} · ${fyp} = ${gw(MRd / 1e6, 3)} kNm (EN 1993-1-8 tabel 3.10)`, Mp / MRd, 'EN 1993-1-8 §3.13 tabel 3.10');
  }
  for (const bt of o.bouten) {
    if (!bt.F || bt.key === 'anker') continue;
    const As = bt.M === 16 ? 157 : bt.M === 12 ? 84.3 : 58, Fv = (NORM.bout88.av * NORM.bout88.fub * As) / NORM.gM2.v, F = (2.5 * bt.F * g) / bt.n;
    ctl('Pennen en bouten', `Bouten M${bt.M} 8.8: ${bt.naam}`, `F per bout = 2,5 · ${gw(bt.F, 0)} kg · g / ${bt.n} = ${gw(F / 1000, 2)} kN ≤ Fv,Rd = 0,6 · 800 · ${As} / 1,25 = ${gw(Fv / 1000, 1)} kN`, F / Fv, NORM.bout88.bron);
  }
  // ---- bouten van kopplaten op trek en trek + afschuiving (EN 1993-1-8 tabel 3.4); einde ligger half ingeklemd: M = F·L/12 (AANNAME)
  const gezienKop = new Set();
  for (const bt of o.bouten.filter((x) => x.kop?.ligger)) {
    const x = o.reken.find((r) => r.stuk === bt.kop.ligger); if (!x) continue;
    const sl = `${bt.naam}|${bt.M}`; if (gezienKop.has(sl)) continue; gezienKop.add(sl);
    const pl = proeflast(o, x), M = pl.F * x.L / 12, Ft = M / bt.kop.z, Fvb = pl.F / 2 / 2, As = bt.M === 16 ? 157 : bt.M === 12 ? 84.3 : 58;
    const FtRd = 0.9 * NORM.bout88.fub * As / NORM.gM2.v, FvRd = NORM.bout88.av * NORM.bout88.fub * As / NORM.gM2.v, comb = Fvb / FvRd + Ft / (1.4 * FtRd);
    ctl('Pennen en bouten', `Bout M${bt.M} op trek: ${bt.naam}`, `einde van de ligger half ingeklemd (AANNAME): M = F·L/12 = ${gw(M / 1e6, 3)} kNm; bovenste bout Ft = M/z = ${gw(Ft / 1000, 2)} kN (z = ${Math.round(bt.kop.z)} mm) ≤ Ft,Rd = 0,9·fub·As/γM2 = ${gw(FtRd / 1000, 1)} kN`, Ft / FtRd, 'EN 1993-1-8 tabel 3.4');
    ctl('Pennen en bouten', `Bout M${bt.M} op trek + afschuiving: ${bt.naam}`, `Fv,Ed/Fv,Rd + Ft,Ed/(1,4·Ft,Rd) = ${gw(Fvb / 1000, 2)}/${gw(FvRd / 1000, 1)} + ${gw(Ft / 1000, 2)}/(1,4 · ${gw(FtRd / 1000, 1)}) = ${gw(comb, 2)} ≤ 1`, comb, 'EN 1993-1-8 tabel 3.4');
  }
  // ---- rechtstreekse toetsen (evenwicht, assen op buiging, platen, ogen)
  for (const x of o.toetsen ?? []) ctl(x.groep, x.wat, x.formule, x.benut, x.bron, x.oordeel ? { oordeel: x.oordeel } : {});
  // ---- kabels en katrollen
  for (const kb of o.kabels) {
    const st = o.stapels[0], extra = kb.begin === 'stapel' && st ? (st.extraKg ?? 0) : 0, K = KOOP[kb.key], F = ((kb.last + extra) * g) / kb.overbrenging, ben = (NORM.kabel.v * F) / (K.MBL * 1000);
    ctl('Kabel', `${kb.naam}: veiligheidsfactor 6`, `F = stapel · g / overbrenging = ${gw(kb.last, 0)} · 9,81 / ${kb.overbrenging} = ${gw(F / 1000, 2)} kN; 6 · F = ${gw((6 * F) / 1000, 2)} kN ≤ breukkracht ${gw(K.MBL, 2)} kN (${K.artikel}; AANNAME: de versnelling zit in de factor 6)`, ben, `${NORM.kabel.bron}; ${K.bron}`);
    const katr = kb.route.filter((p) => p.katrol);
    const lus = (kb.begin === 'stapel' || kb.begin === 'anker' || kb.begin === 'laadpen' || kb.begin === 'slede') && (kb.einde === 'greep' || kb.einde === 'nok' || kb.einde === 'anker') && kb.route.slice(1, -1).every((p) => p.katrol || p.los || p.geleider);
    ctl('Kabel', `${kb.naam}: kabelloop en overbrenging`, `${kb.begin} → ${katr.map((p) => p.label).join(' → ')}${kb.route.some((p) => p.los) ? ' (+ losse katrol op de stapel)' : ''} → ${kb.einde}; lengte ${gw(kb.L / 1000, 2)} m (+ 0,3 m voor de lussen); overbrenging ${kb.overbrenging}:1${kb.overbrenging === 2 ? ' (de greep voelt de helft van de stapel en gaat 2 x zo ver)' : ''}`, 0, 'model: gesloten kabelloop', { oordeel: lus ? 'info' : 'rood' });
    for (let i = 1; i < kb.route.length - 1; i++) {
      const p = kb.route[i]; if (!p.katrol) continue;
      const d1 = norm(sub(p.p, kb.route[i - 1].p)), d2 = norm(sub(kb.route[i + 1].p, p.p)), Fr = F * len(sub(d2, d1));
      const KK = KOOP[p.k.key], Dl = KK.D - 10, kern = KOOP[kb.key].kern ?? KOOP[kb.key].d, Dd = Dl / kern; // loopdiameter (groefbodem) / kerndiameter
      ctl('Katrollen', `Katrol ${p.label}: belasting`, `R = F·|d2 − d1| = ${gw(Fr / 1000, 2)} kN ≤ ${gw(KK.kN, 2)} kN (opgave winkel)`, Fr / (KK.kN * 1000), KK.bron);
      ctl('Katrollen', `Katrol ${p.label}: D/d`, `D/d = loopdiameter ${Dl} / kern ${kern} = ${gw(Dd)} ≥ 18`, 18 / Dd, NORM.katrolD.bron, { oordeel: Dd >= 18 ? 'groen' : Dd >= 15 ? 'oranje' : 'rood' });
    }
  }
  for (const kt of o.katrollen) {
    const laag = kt.c[2] < NORM.katrolKap.v;
    ctl('Afscherming', `Vingerbescherming katrol ${kt.label}`, laag ? (kt.kap ? `op ${Math.round(kt.c[2])} mm (< 1800): gezette plaat op ≤ 5 mm van de groef, kabelgeleiding` : `op ${Math.round(kt.c[2])} mm (< 1800) zonder afscherming`) : `op ${Math.round(kt.c[2])} mm: boven de reikzone van 1800 mm; de beugel houdt de kabel in de groef`, 0, NORM.katrolKap.bron, { oordeel: !laag || kt.kap ? 'groen' : 'rood' });
  }
  for (const s of o.stapels) {
    const nodig = s.top + s.slag + NORM.stapelKap.vrij, kap = o.delen.filter((d) => d.kleur === 'kap'), hoog = kap.length ? Math.max(...kap.map((d) => d.mx[2])) : 0;
    const open = o.delen.some((d) => d.naam === 'Afscherming zijkant') ? 0 : Math.max(0, ((s.dpl + 40) - (o.delen.find((d) => d.naam === 'Torenstaander')?.P.b ?? 60)) / 2);
    ctl('Afscherming', `Gewichtstapel ${s.n} x ${s.kg} kg: hoogte van de afscherming`, `afscherming tot ${Math.round(hoog)} mm; stapel in de hoogste stand + 60 = ${Math.round(nodig)} mm`, hoog >= nodig - 0.5 || hoog >= s.zt - 1 ? 0.5 : 1.2, NORM.stapelKap.bron, { oordeel: hoog >= nodig - 0.5 || hoog >= s.zt - 1 ? 'groen' : 'rood' });
    ctl('Afscherming', 'Openingen in de afscherming', `zijdelingse spleet naast de staander ${Math.round(open)} mm ≤ 75 mm${open === 0 ? ' (zijstroken: rondom gesloten)' : ''}; stapel 40 mm van de staanders`, open / NORM.stapelKap.opening, NORM.stapelKap.bron);
    ctl('Afscherming', 'Selectiepen', `${KOOP[V.selectiepen].naam}: magnetisch, valt niet vanzelf uit`, 0, NORM.knelVrij.bron, { oordeel: 'groen' });
  }
  // ---- knelpunten en afwerking
  for (const sp of o.spleten) {
    const ok = sp.kap || sp.mm < NORM.knelVrij.spleetMin || sp.mm > NORM.knelVrij.spleetMax;
    ctl('Knelpunten', sp.wat, `vrije afstand ${sp.mm} mm${sp.kap ? ', afgeschermd' : ''}: niet tussen 9,5 en 25 mm, of afgeschermd`, 0, NORM.knelVrij.bron, { oordeel: ok ? 'groen' : 'oranje', uitleg: sp.uitleg ?? '' });
  }
  const knel = o.knelMeting?.() ?? [];
  if (knel.length) {
    // een knelpunt is een spleet die tijdens de beweging dichtgaat tot onder 25 mm (een vaste spleet knelt niet);
    // aanslagen, wangen naast de rail en de grendel zijn bedoeld contact en zitten onder de slede of bij de as
    const per = new Map();
    for (const k of knel) { const key = `${k.a} - ${k.b}`; per.set(key, [...(per.get(key) ?? []), k]); }
    const fout = [...per.entries()].map(([key, l]) => ({ key, min: Math.min(...l.map((x) => x.mm)), max: Math.max(...l.map((x) => x.mm)), st: l.reduce((m, x) => (x.mm < m.mm ? x : m)).stand }))
      .filter((x) => x.max - x.min > 5 && x.min < NORM.knelVrij.spleetMax && !/Aanslag|Wang|As looprol|As tegenrol|Grendel|Rolplaat/.test(x.key));
    const lijst = fout.slice(0, 6).map((x) => `${x.key}: van ${Math.round(x.max)} naar ${Math.round(x.min)} mm (stand ${x.st})`).join('; ');
    ctl('Knelpunten', 'Bewegend tegen vast: gemeten in stand 0, 0,5 en 1', fout.length ? `spleet die dichtgaat tot onder 25 mm: ${lijst}. Afschermen (kap) of de spleet groter maken.` : `${per.size} plaatsen met minder dan 60 mm vrij gemeten; geen spleet die tijdens de beweging dichtgaat tot onder 25 mm`, 0, NORM.knelVrij.bron, { oordeel: fout.length ? 'oranje' : 'groen' });
  }
  const kappen = o.koop.filter((x) => x.id?.startsWith('kap-')).reduce((t, x) => t + x.n, 0);
  ctl('Afwerking', 'Randen en buisuiteinden', `alle randen braamvrij, lichaamsdragende randen r ≥ 2,5 mm; ${kappen} eindkappen op open uiteinden`, 0, NORM.randen.bron, { oordeel: 'groen' });
  // ---- lassen op vlakovaal (P2-18 v6): het vlakke deel van een ovaal is h − b breed; een breder aansluitend profiel
  // komt met zijn randen op de ronding (las in een V-spleet): zadelplaat of een smaller profiel
  {
    const sl = [];
    for (const l of o.lassen ?? []) for (const [Ov, An] of [[l.A, l.B], [l.B, l.A]]) {
      if (!Ov?.P?.ovaal || An?.soort !== 'staaf' || An.P?.ovaal) continue;
      const vlak = Ov.P.h - Ov.P.b, w = Math.min(An.P.b, An.P.h);
      if (w > vlak - 4) sl.push(`${An.naam} (${Math.round(w)} mm) op ${Ov.naam} (vlak ${Math.round(vlak)} mm)`);
    }
    if (sl.length) ctl('Lassen', 'Aansluitingen op vlakovaal (P2-18)', `${[...new Set(sl)].slice(0, 4).join('; ')}${sl.length > 4 ? ` + ${sl.length - 4}` : ''}: een gelaserde zadelplaat 8 mm (of een aansluitend profiel ≤ vlak − 20 mm), zadelsnede op het stukblad`, 0.95, 'eigen regel (lasbaarheid, ISO 5817-C)', { oordeel: 'oranje' });
  }
  // ---- stabiliteit of verankering
  if (o.verankerd === 'grond') {
    // ingegoten palen (EN 16630, P2-13 v6): horizontaal 50 % van de gebruiker op greephoogte (AANNAME: zwaaien, kippen,
    // vandalisme), x 1,5; poer b x b x h met de bovenkant op d onder maaiveld: passieve gronddruk van d tot D = d + h,
    // Mp = Kp·γ·b·(D³ − d³)/12 (Kp = 3, γ = 18 kN/m³, AANNAME zand/leem, vereenvoudigd)
    const palen = o.delen.filter((d) => d.soort === 'staaf' && Math.min(d.a[2], d.b[2]) < -100), h = Math.max(...o.delen.filter((d) => d.soort === 'staaf' && Math.min(d.a[2], d.b[2]) > 0).map((d) => Math.max(d.a[2], d.b[2])), 500);
    const pb = 0.5, dd = 0.2, DD = 1.0, n = Math.max(1, palen.length), Hk = 1.5 * 0.5 * V.gebruiker * g, M = (Hk * (h + 600)) / n / 1e6, Mp = (3 * 18 * pb * (DD ** 3 - dd ** 3)) / 12;
    ctl('Stabiliteit', 'Ingegoten in betonpoeren (EN 16630)', `${n} palen 600 mm ingegoten in een poer 500 x 500 x 800 C25/30, bovenkant 200 mm onder maaiveld; horizontaal 1,5 · 0,5 · ${V.gebruiker} kg · g = ${gw(Hk / 1000, 2)} kN op ${Math.round(h)} mm: M per paal = ${gw(M, 2)} kNm ≤ passieve gronddruk Kp·γ·b·(D³ − d³)/12 = 3 · 18 · 0,5 · (1,0³ − 0,2³)/12 = ${gw(Mp, 2)} kNm`, M / Mp, 'EN 16630 §4.2 (stabiliteit; belasting AANNAME tot de norm gekocht is); grondmechanica: Kp = 3 (φ = 30°), AANNAME');
  } else if (o.verankerd === 'los') {
    ctl('Stabiliteit', 'Los werktuig', 'ligt of rolt op de vloer en wordt in de handen gedragen: geen kantelproef (EN ISO 20957-1 §6.2 is niet van toepassing op losse werktuigen)', 0, 'AANNAME', { oordeel: 'info' });
  } else if (o.verankerd) {
    const A = o.anker;
    if (A) {
      const NRd = 7.6, F = 2.5 * A.kg * g, N = (F * A.arm) / (A.z * A.n) / 1000, grond = { beton: 7.6, 'volle baksteen': 2.5, 'holle baksteen / snelbouw': 1.2 };
      ctl('Stabiliteit', `Anker per ondergrond (${o.verankerd})`, `trek per anker ${gw(N, 2)} kN; NRd: ${Object.entries(grond).map(([k2, v]) => `${k2} ${gw(v, 1)} kN (${N <= v ? 'ok' : 'NIET'})`).join(', ')}. Beton: keilbout M12; steen: injectieanker met zeefhuls (AANNAME, volgens ETA nakijken). Kies het anker op het montageblad volgens de muur.`, N / grond['holle baksteen / snelbouw'], 'ETA van het anker (AANNAME: richtwaarden)', { oordeel: N <= 1.2 ? 'groen' : N <= 2.5 ? 'oranje' : 'rood' });
      ctl('Stabiliteit', `Verankerd in de ${o.verankerd}: trek per anker`, `N = 2,5 · ${gw(A.kg, 0)} kg · g · ${A.arm} mm / (${A.z} mm · ${A.n}) = ${gw(N, 2)} kN ≤ NRd ≈ ${NRd} kN (AANNAME keilbout M12 in beton C20/25, randafstand ≥ 100)`, N / NRd, `${NORM.stabiliteit.bron}; AANNAME ankerwaarde (fischer FAZ II 12, zie balustrades)`, { oordeel: N / NRd > 1 ? 'rood' : 'oranje', uitleg: 'Oranje: de ankerwaarde is een aanname. Kijk de muur na (beton of volle baksteen) en reken het anker na in fischer FIXPERIENCE.' });
    } else ctl('Stabiliteit', `Verankerd ${o.verankerd === 'rack' ? 'in het rack' : `in de ${o.verankerd}`}`, o.verankerd === 'vloer' ? 'pro: voetbalken met 4 keilbouten M12 in de vloer (EN ISO 20957-4 §5.3: vrijstaande haltersteunen moeten verankerd kunnen worden)' : o.verankerd === 'rack' ? 'hangt in het rack: het rack moet verankerd of zwaar genoeg zijn' : 'tegen de muur met keilbouten M12', 0, NORM.stabiliteit.bron, { oordeel: 'oranje', uitleg: 'Nakijken op de plaats: vloer of muur, ankers.' });
  }
  if (o.verankerd !== 'muur' && o.verankerd !== 'rack' && o.verankerd !== 'grond' && o.verankerd !== 'los') {
    const st = stabiliteit(o);
    for (const s of st) ctl('Stabiliteit', `Kantelen op 10° (${s.geval}, naar ${s.richting})`, `zwaartepunt op ${Math.round(s.h)} mm hoog, ${Math.round(s.d)} mm van de kantelrand: h · tan 10° = ${Math.round(s.h * Math.tan((10 * Math.PI) / 180))} mm ≤ ${Math.round(s.d)} mm (massa ${Math.round(s.m)} kg${s.geval ? ' met gebruiker en last' : ''})`, s.benut, NORM.stabiliteit.bron, { oordeel: o.verankerd === 'vloer' && s.benut > 0.9 ? 'oranje' : oordeelVan(s.benut), uitleg: s.benut > 1 ? (o.verankerd === 'vloer' ? 'Kantelt zonder ankers: in de proversie verankerd.' : 'Kantelt: verankeren of de voeten verlengen.') : '' });
  }
  for (const s of kantelTrek(o)) ctl('Stabiliteit', `Kantelen onder horizontale trek: ${s.wat}`, `trek ${gw(s.F / 1000, 2)} kN op ${Math.round(s.h)} mm hoog naar ${s.richting}: M = ${gw(s.M / 1000, 2)} kNm ≤ tegenmoment eigen gewicht ${gw(s.m, 0)} kg · g · ${Math.round(s.d)} mm = ${gw(s.Mr / 1000, 2)} kNm${s.anker ? ' + verankering' : ''}`, s.benut, 'EN ISO 20957-1 §5.6 (stabiliteit, AANNAME horizontale trek 600 N per greep)');
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

/** kantelen onder horizontale trek (kabel, duwen): per trekgeval het moment rond de kantelrand in de trekrichting */
export function kantelTrek(o) {
  if (!o.trek?.length) return [];
  const geo = [...o.delen.flatMap((d) => d.geo), ...o.koop.flatMap((d) => d.geo)];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const gg of geo) { const [mn, mx] = aabb(gg); if (mn[2] <= 15) { x0 = Math.min(x0, mn[0]); x1 = Math.max(x1, mx[0]); y0 = Math.min(y0, mn[1]); y1 = Math.max(y1, mx[1]); } }
  const c = o.zwaartepunt, m = o.massa, uit = [];
  const per = new Map(); for (const t of o.trek) { const k = t.wat; if (!per.has(k)) per.set(k, []); per.get(k).push(t); }
  for (const [wat, lijst] of per) {
    const Fx = lijst.reduce((s, t) => s + t.F * t.dir[0], 0), Fy = lijst.reduce((s, t) => s + t.F * t.dir[1], 0);
    const F = Math.hypot(Fx, Fy); if (F < 1) continue;
    const richt = Math.abs(Fy) >= Math.abs(Fx) ? (Fy < 0 ? 'voor' : 'achter') : (Fx < 0 ? 'links' : 'rechts');
    const rand = { voor: [1, y0], achter: [1, y1], links: [0, x0], rechts: [0, x1] }[richt];
    const M = lijst.reduce((s, t) => s + t.F * Math.hypot(t.dir[0], t.dir[1]) * t.p[2], 0), d = Math.abs(c[rand[0]] - rand[1]), Mr = m * g * d;
    const anker = o.verankerd === 'vloer' || o.verankerd === 'muur';
    uit.push({ wat, F, h: M / F, richting: richt, M, Mr, d, m, anker, benut: anker ? Math.min(0.5, M / Mr) : r(M / Mr) });
  }
  return uit;
}
