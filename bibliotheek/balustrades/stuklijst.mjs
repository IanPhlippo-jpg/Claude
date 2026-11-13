// De stuklijst van een balustrade (ISO 7573): elke positie met aantal, benaming, materiaal, maat, zaagsnede (haaks,
// verstek of schuin langs de trap) en gewicht; de zaaglijst, het zaagplan (staven van 6 m, eerst de langste), de
// laserlijst (voetplaten, consoles, platen), de glaslijst en de bestellijst van de kooponderdelen. Node en browser.
import { PROFIEL, KOOP, ANKER, GLASOPBOUW, GLASTINT, PATROON } from './onderdelen.mjs';
import { lengtes } from './model.mjs';
import { ZAAGSNEDE, STAAFLENGTE } from '../taatsdeuren/bestel.mjs';

export { ZAAGSNEDE, STAAFLENGTE };
export const ROL = { staander: 'Staander', handregel: 'Handregel', onderregel: 'Onderregel', bovenregel: 'Bovenregel', spijl: 'Spijl', staaf: 'Horizontale staaf', afstandhouder: 'Afstandhouder (zijmontage)', drager: 'Handregeldrager', uprofiel: 'U-bodemprofiel' };
const RHO = 7.85e-6;
const r0 = (v) => Math.round(v);
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

/** tekst van de zaagsnede van beide uiteinden */
export function zaagTekst(d) {
  const [a, b] = d.zaag ?? [0, 0];
  const een = (f, vlak) => (f < 0.05 ? 'haaks' : `${vlak === 'plan' || vlak === 'helling' ? 'verstek' : 'schuin'} ${gw(f)}°`);
  if (a < 0.05 && b < 0.05) return 'haaks / haaks';
  return `${een(a, d.vlakA)} / ${een(b, d.vlakB)}${(d.zin ?? [1, 1])[0] !== (d.zin ?? [1, 1])[1] && a > 0.05 && b > 0.05 ? ' (evenwijdig)' : ''}`;
}

/** alle posities */
export function stuklijst(o) {
  const k = o.k, per = new Map(), pos = [];
  const voeg = (key, maak) => { if (!per.has(key)) { const p = maak(); per.set(key, p); pos.push(p); } const p = per.get(key); p.n += 1; return p; };
  // ---- stalen (en inox) staven
  for (const d of o.delen) {
    if (d.prof === 'koop') continue;
    const P = PROFIEL[d.prof], { hart, lang } = lengtes(d), L = r0(lang);
    const key = `${d.rol}|${d.prof}|${L}|${d.zaag}|${(d.gaten ?? []).length}`;
    voeg(key, () => ({ soort: 'staaf', rol: d.rol, naam: ROL[d.rol] ?? d.rol, prof: d.prof, mat: P.koop ? 'RVS 1.4301' : 'S235JR', maat: P.naam, L, hart: r0(hart), zaag: d.zaag, zaagT: zaagTekst(d), kg: P.kgm * lang / 1000, n: 0, cat: d.cat, gaten: d.gaten ?? [], voorbeeld: d, opm: d.gaten?.length ? `${d.gaten.length} x blindklinkmoer M8 (gat Ø11)` : '' }));
  }
  // ---- gekochte lineaire delen (U-profiel, handregel Q-railing): op maat gezaagd
  for (const d of o.delen.filter((x) => x.prof === 'koop' && x.koop !== 'handregeldrager')) {
    const K = KOOP[d.koop], L = r0(d.L);
    voeg(`koop|${d.koop}|${L}|${d.zaag}`, () => ({ soort: 'koopstaaf', rol: d.rol, naam: ROL[d.rol] ?? d.rol, prof: d.koop, mat: d.rol === 'uprofiel' ? 'aluminium (Q-railing)' : 'RVS (Q-railing)', maat: K.naam, L, hart: L, zaag: d.zaag, zaagT: zaagTekst(d), kg: (d.rol === 'uprofiel' ? 3.6 : 1.6) * L / 1000, n: 0, cat: d.cat, koop: d.koop, voorbeeld: d, opm: 'op maat zagen (alu/RVS-zaagblad)' }));
  }
  // ---- laser: voetplaten, consoles, platen en plinten
  for (const p of o.platen) {
    voeg(`${p.rol}|${p.w}|${p.h}|${p.t}|${p.gaten.length}`, () => ({ soort: 'laser', rol: p.rol, naam: p.rol === 'voetplaat' ? 'Voetplaat' : 'Console (zijmontage)', mat: 'S235JR', maat: `${p.w} x ${p.h} x ${p.t}`, b: p.w, l: p.h, t: p.t, kg: p.w * p.h * p.t * RHO, n: 0, cat: p.cat, gaten: p.gaten, plaat: p, opm: `${p.gaten.length} x Ø${ANKER[o.ankerType]?.plaatgat ?? 14} (anker)` }));
  }
  for (const p of o.panelen.filter((x) => x.rol !== 'glas')) {
    const pat = PATROON[p.patroon] ?? PATROON.vlak;
    voeg(`${p.rol}|${r0(p.w)}|${r0(p.h)}|${p.helling}|${p.patroon}`, () => ({ soort: 'laser', rol: p.rol, naam: p.rol === 'plint' ? 'Plint (dichte plaat tot 450 mm)' : `Plaat ${pat.naam}`, mat: 'S235JR', maat: `${r0(p.w)} x ${r0(p.h)} x 3${p.helling ? ` (parallellogram ${gw(p.helling)}°)` : ''}`, b: r0(p.w), l: r0(p.h), t: 3, kg: p.w * p.h * 3 * RHO * (pat.gewicht ?? 1), n: 0, cat: p.cat, paneel: p, patroon: p.patroon, opm: pat.naam }));
  }
  // ---- glas
  for (const p of o.panelen.filter((x) => x.rol === 'glas')) {
    const G = GLASOPBOUW[p.opbouw];
    voeg(`glas|${r0(p.w)}|${r0(p.h)}|${p.helling}|${p.opbouw}`, () => ({ soort: 'glas', rol: 'glas', naam: `Glas ${G.naam}`, mat: `gelaagd ${GLASTINT[k.glasTint]?.naam.toLowerCase() ?? 'helder'}`, maat: `${r0(p.w)} x ${r0(p.h)}${p.helling ? ` (parallellogram ${gw(p.helling)}°)` : ''}`, b: r0(p.w), l: r0(p.h), m2: (p.w * p.h) / 1e6, kg: (p.w * p.h) / 1e6 * G.kgm2, n: 0, cat: 'glas', paneel: p, opm: 'kanten geslepen, hoeken gefaceteerd' }));
  }
  pos.forEach((p, i) => { p.pos = i + 1; });
  return { posities: pos, koop: koopLijst(o) };
}

/** kooponderdelen met aantal: [{ key, naam, artikel, n, eenheid, prijs, bedrag, bron, cat }] */
export function koopLijst(o) {
  const k = o.k, uit = new Map(), buiten = k.plaats === 'buiten';
  const zet = (key, n, cat = 'basis') => { if (!n) return; const K = KOOP[key]; const x = uit.get(key) ?? { key, ...K, n: 0, cat }; x.n += n; uit.set(key, x); };
  // ankers
  const A = ANKER[o.ankerType], na = o.ankers.length;
  if (A) {
    zet(buiten ? A.koopA4 : A.koop, na, buiten ? 'buiten' : 'basis');
    if (A.mortel) zet('fisv', Math.ceil(na / KOOP.fisv.perKoker));
  }
  if (k.soort !== 'glasU' && k.bevestiging === 'boven') zet('vulplaat', o.staanders.length);
  // glas met staanders
  for (const kl of o.klemmen) zet(kl.koop, 1, 'glas');
  if (o.klemmen.length && o.klemmen[0].koop === 'klemVlak') { zet('klinkmoer', o.klemmen.length, 'glas'); zet('bout8', o.klemmen.length, 'glas'); }
  if (k.soort === 'glasstaal' && k.hr === 'rond') { zet('handregeldrager', o.staanders.length); zet('inoxEindkap', 2); }
  if (o.st.staander === 'inox' && k.bevestiging === 'boven') zet('rozet', o.staanders.length);
  // U-profiel
  if (k.soort === 'glasU') {
    const prof = k.bevestiging === 'zij' ? 'qrZij' : 'qrTop', z = zaagplan(o).profielen.find((p) => p.prof === prof);
    zet(prof, z?.n ?? 1, 'basis');
    zet('qrRubber', z?.n ?? 1);
    zet('qrEindkap', 2);
    zet('qrHoek', o.segs.filter((s) => s.i > 0 && Math.abs(s.draai - 90) < 0.5).length, 'hoek');
    if (buiten) zet('qrDrain', z?.n ?? 1, 'buiten');
    if (k.hr === 'rond') { zet('qrHandregel', Math.ceil(o.lengte / 1000)); zet('qrHandRubber', Math.ceil(o.lengte / 5000)); zet('qrHandKap', 2); zet('qrHandHoek', o.segs.length - 1, o.hoeken ? 'hoek' : 'trap'); }
  }
  return [...uit.values()].map((x) => ({ ...x, bedrag: x.n * x.prijs }));
}

/** zaagplan: per profiel de staven (6 m; U-profiel 2,5 m) met de stukken, eerst de langste */
export function zaagplan(o) {
  const per = new Map();
  for (const d of o.delen) {
    if (d.koop === 'handregeldrager') continue;
    const koop = d.prof === 'koop', key = koop ? d.koop : d.prof;
    if (koop && d.koop === 'qrHandregel') continue; // per meter op maat
    const lang = koop ? (KOOP[d.koop].lengte ?? STAAFLENGTE) : STAAFLENGTE;
    if (!per.has(key)) per.set(key, { prof: key, naam: koop ? KOOP[key].naam : PROFIEL[key].naam, artikel: koop ? KOOP[key].artikel : PROFIEL[key].norm, lengte: lang, stukken: [] });
    per.get(key).stukken.push({ rol: d.rol, l: Math.ceil(lengtes(d).lang) });
  }
  const profielen = [];
  for (const pr of per.values()) {
    const staven = [];
    for (const st of [...pr.stukken].sort((a, b) => b.l - a.l)) {
      if (st.l + ZAAGSNEDE > pr.lengte) {
        // langer dan een staaf: in delen (U-profiel: stuiken met een verbinder; staal: stuiklas op een staander)
        const n = Math.ceil(st.l / pr.lengte), stuk = Math.ceil(st.l / n);
        for (let i = 0; i < n; i++) staven.push({ stukken: [{ ...st, l: stuk, deel: true }], rest: Math.max(0, pr.lengte - stuk - ZAAGSNEDE) });
        continue;
      }
      const b = staven.find((x) => x.rest >= st.l + ZAAGSNEDE);
      if (b) { b.stukken.push(st); b.rest -= st.l + ZAAGSNEDE; } else staven.push({ stukken: [st], rest: pr.lengte - st.l - ZAAGSNEDE });
    }
    const nodig = pr.stukken.reduce((t, x) => t + x.l, 0) / 1000;
    profielen.push({ ...pr, staven, n: staven.length, m: (staven.length * pr.lengte) / 1000, nodig });
  }
  return { profielen: profielen.sort((a, b) => b.m - a.m) };
}

/** totalen: kg staal, oppervlak voor de coating, m² glas */
export function totalen(o, sl = stuklijst(o)) {
  let kg = 0, opp = 0, glasM2 = 0, glasKant = 0;
  for (const p of sl.posities) {
    if (p.soort === 'staaf' && !PROFIEL[p.prof].koop) { kg += p.kg * p.n; opp += (PROFIEL[p.prof].omtrek * p.L * p.n) / 1e6; }
    if (p.soort === 'laser') { kg += p.kg * p.n; opp += (2 * p.b * p.l * p.n) / 1e6 * (p.patroon && p.patroon !== 'vlak' ? 1.2 : 1); }
    if (p.soort === 'glas') { glasM2 += p.m2 * p.n; glasKant += (2 * (p.b + p.l) / 1000) * p.n; }
  }
  return { kg, opp, glasM2, glasKant };
}
