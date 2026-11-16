// Stuklijst (ISO 7573) van een fitnesstoestel: posities (staven met lengte, zaagsnede en gaten, laserdelen met maat en
// gaten), kooponderdelen met hoeveelheid en bedrag, bekleding per kussen, zaagplan op staven van 6 m (first fit
// decreasing, zaagsnede 4 mm) en een grove plaatnesting per dikte op platen van 3000 x 1500. Node en browser.
import { KOOP } from './onderdelen.mjs';
import { massa, lengteStuk } from './model.mjs';
import { ZAAGSNEDE, STAAFLENGTE } from '../balustrades/stuklijst.mjs';

export { ZAAGSNEDE, STAAFLENGTE };
const r0 = (v) => Math.round(v);
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
/** buigtoeslag: rechte klemlengte aan elk uiteinde die de buigmachine nodig heeft (wordt na het buigen afgezaagd) */
export const KLEM = 150;
/** snijlengte van een laserdeel in m (buitencontour, uitsparingen en gaten) en het aantal insteken */
export function snijden(d) {
  const omtrek = d.contour ? d.contour.omtrek : d.rond ? Math.PI * d.l : d.vorm === 'driehoek' ? d.l + d.bmaat + Math.hypot(d.l, d.bmaat) : 2 * (d.l + d.bmaat);
  return { m: (omtrek + d.gaten.reduce((t, g) => t + Math.PI * g.d, 0)) / 1000, insteken: 1 + d.gaten.length + (d.contour?.uitsparingen.length ?? 0) };
}
const buigTekst = (d) => `gebogen: ${d.buig.bochten.length} bocht${d.buig.bochten.length > 1 ? 'en' : ''} ${d.buig.bochten.map((x) => `${gw(x, 0)}°`).join(' + ')} op R${d.buig.R} (hartlijn)`;
export const zaagTekst = (d) => { if (d.buig) return buigTekst(d); const [a, b] = d.verstek ?? [0, 0]; return a < 0.5 && b < 0.5 ? 'haaks / haaks' : `${a < 0.5 ? 'haaks' : `schuin ${gw(a)}°`} / ${b < 0.5 ? 'haaks' : `schuin ${gw(b)}°`}`; };
const gatSleutel = (gaten) => gaten.map((g) => `${g.s ?? `${r0(g.x)},${r0(g.y)}`}:${g.d}:${g.as ?? ''}`).sort().join(';');

/** alle posities en de kooponderdelen */
export function stuklijst(o) {
  const per = new Map(), pos = [];
  for (const d of [...o.delen.filter((x) => !x.deelVan), ...(o.gezet ?? [])]) {
    const key = d.vorm === 'gezet' ? `G|${d.naam}|${d.t}|${r0(d.l)}|${r0(d.bmaat)}|${d.zetlijnen.length}` : d.soort === 'staaf' ? `S|${d.naam}|${d.prof}|${r0(lengteStuk(d))}|${d.verstek}|${d.buig ? d.buig.bochten.join(',') : ''}|${gatSleutel(d.gaten)}` : `P|${d.naam}|${d.t}|${r0(d.l)}|${r0(d.bmaat)}|${d.rond}|${gatSleutel(d.gaten)}`;
    if (!per.has(key)) {
      const p = d.soort === 'staaf'
        ? { soort: 'staaf', naam: d.naam, prof: d.prof, mat: d.P.mat ?? 'S235JR(H)', maat: d.P.naam, L: r0(lengteStuk(d)), zaagT: zaagTekst(d), kg: massa(d), n: 0, gaten: d.gaten, voorbeeld: d, opm: [d.opm, d.buig ? `${buigTekst(d)}; gestrekte lengte ${r0(d.L)} mm + 2 x ${KLEM} klemlengte` : '', d.gaten.length ? `${d.gaten.length} gaten` : '', d.westside ? 'Westside-gatpatroon' : ''].filter(Boolean).join('; '), delen: [], buig: d.buig ?? null }
        : { soort: 'plaat', naam: d.naam, mat: 'S235JR', maat: d.rond ? `Ø${r0(d.l)} x ${d.t}` : `${r0(d.l)} x ${r0(d.bmaat)} x ${d.t}`, t: d.t, l: r0(d.l), b: r0(d.bmaat), kg: massa(d), n: 0, gaten: d.gaten, voorbeeld: d, opm: [d.opm, d.gaten.length ? `${d.gaten.length} gaten` : '', d.vorm ? `vorm: ${d.vorm === 'contour' ? 'vrije contour (DXF met bogen)' : d.vorm}` : ''].filter(Boolean).join('; '), delen: [], laser: d.laser !== false, snij: snijden(d) };
      per.set(key, p); pos.push(p);
    }
    const p = per.get(key); p.n += 1; p.delen.push(d.id); d.pos = p;
  }
  // staven eerst (op profiel, dan lengte), dan de laserdelen
  pos.sort((a, b) => (a.soort === b.soort ? (a.soort === 'staaf' ? a.prof.localeCompare(b.prof) || b.L - a.L : b.t - a.t || b.l - a.l) : a.soort === 'staaf' ? -1 : 1));
  pos.forEach((p, i) => { p.pos = i + 1; });
  for (const g of o.gezet ?? []) for (const id of g.kinderen) { const k = o.delen.find((x) => x.id === id); if (k) k.pos = g.pos; }
  for (const d of o.delen) d.posNr = d.pos.pos;
  return { posities: pos, koop: koopLijst(o), bekleding: bekleding(o) };
}

/** bekleding per kussen: multiplex, schuim en de snijmaat van het kunstleer (+ omslag 60 mm rondom) */
export function bekleding(o) {
  return o.kussens.map((k, i) => {
    const L = r0(k.L), B = r0(k.breedte), s = k.schuim, om = 60;
    return { nr: i + 1, naam: k.naam, L, B, dikte: k.dikte, mp: { L: L - 4, B: B - 4, t: 18 }, schuim: { L: L + 6, B: B + 6, t: s }, leer: { L: L + 2 * (s + 18 + om), B: B + 2 * (s + 18 + om) }, inslag: k.inslag ?? 4 };
  });
}

/** kooponderdelen: [{ key, naam, artikel, winkel, prijs, eenheid, hoeveelheid, bedrag, bron, nagekeken, opm }] */
export function koopLijst(o) {
  const uit = new Map(), V = o.V;
  const zet = (key, h, opm = '') => { if (!h) return; const K = KOOP[key], x = uit.get(key) ?? { key, ...K, hoeveelheid: 0, opm: '' }; x.hoeveelheid += h; if (opm && !x.opm.includes(opm)) x.opm = [x.opm, opm].filter(Boolean).join('; '); uit.set(key, x); };
  for (const k of o.koop) {
    const K = KOOP[k.key];
    if (!k.n) continue;
    if (K.eenheid === 'm') zet(k.key, k.meter ?? 0.1 * k.n, k.key === 'stang25' ? 'op lengte gezaagd' : '');
    else if (K.eenheid === 'm²') zet(k.key, (k.oppervlak ?? 0.01) * 1.15, 'met 15 % snijverlies');
    else zet(k.key, k.n);
  }
  // geleidestang: € 5 per zaagsnede bij Damen CNC
  const stangen = o.koop.filter((k) => k.key === 'stang25').length;
  // bekleding
  const bk = bekleding(o);
  if (bk.length) {
    const mpM2 = bk.reduce((t, b) => t + (b.mp.L * b.mp.B) / 1e6, 0), schM2 = bk.reduce((t, b) => t + (b.schuim.L * b.schuim.B) / 1e6, 0), leer = bk.reduce((t, b) => t + (b.leer.L * b.leer.B) / 1e6, 0);
    zet('multiplex', (mpM2 * 1.3) / KOOP.multiplex.m2, `${gw(mpM2, 2)} m² + 30 % zaagverlies (rest blijft op stock)`);
    zet('schuim', (schM2 * 1.3) / KOOP.schuim.m2, `${gw(schM2, 2)} m² + 30 %`);
    zet(V.leer, Math.max(0.5, Math.ceil(((leer * 1.15) / 1.4) * 10) / 10), `${gw(leer, 2)} m² leer, rol 1,4 m breed`);
    zet('inslagmoer', bk.reduce((t, b) => t + b.inslag, 0)); zet('boutM8', bk.reduce((t, b) => t + b.inslag, 0), 'kussen op de kussenplaat'); zet('nietjes', 0.1 * bk.length, '± 500 nietjes per kussen');
  }
  return [...uit.values()].map((x) => ({ ...x, hoeveelheid: Math.round(x.hoeveelheid * 1000) / 1000, bedrag: x.hoeveelheid * x.prijs + (x.key === 'stang25' ? 5 * 2 * stangen : 0) }));
}

/** zaagplan: per profiel de staven van 6 m met de stukken (eerst de langste) */
export function zaagplan(o, sl = stuklijst(o)) {
  const per = new Map();
  for (const p of sl.posities.filter((x) => x.soort === 'staaf')) {
    if (!per.has(p.prof)) per.set(p.prof, { prof: p.prof, naam: p.voorbeeld.P.naam, norm: p.voorbeeld.P.norm, kgm: p.voorbeeld.P.kgm, prijsFactor: p.voorbeeld.P.prijsFactor ?? 1, lengte: STAAFLENGTE, stukken: [] });
    for (let i = 0; i < p.n; i++) per.get(p.prof).stukken.push({ pos: p.pos, l: Math.ceil(p.L + (p.buig ? 2 * KLEM : 0)) });
  }
  const profielen = [];
  for (const pr of per.values()) {
    const staven = [];
    for (const st of [...pr.stukken].sort((a, b) => b.l - a.l)) {
      const b = staven.find((x) => x.rest >= st.l + ZAAGSNEDE);
      if (b) { b.stukken.push(st); b.rest -= st.l + ZAAGSNEDE; } else staven.push({ stukken: [st], rest: pr.lengte - st.l - ZAAGSNEDE });
    }
    const nodig = pr.stukken.reduce((t, x) => t + x.l + ZAAGSNEDE, 0) / 1000;
    profielen.push({ ...pr, staven, n: staven.length, m: (staven.length * pr.lengte) / 1000, nodig, kg: nodig * pr.kgm });
  }
  return { profielen: profielen.sort((a, b) => b.kg - a.kg) };
}

/** grove plaatnesting: per dikte rijen (shelf) op platen van 3000 x 1500, 10 mm tussenruimte */
export function nesting(o, sl = stuklijst(o)) {
  const W = 3000, H = 1500, gap = 10, perT = new Map();
  for (const p of sl.posities.filter((x) => x.soort === 'plaat' && x.laser)) for (let i = 0; i < p.n; i++) {
    if (!perT.has(p.t)) perT.set(p.t, []);
    perT.get(p.t).push({ pos: p.pos, w: Math.max(p.l, p.b), h: Math.min(p.l, p.b) });
  }
  const uit = [];
  for (const [t, stukken] of [...perT.entries()].sort((a, b) => b[0] - a[0])) {
    const platen = []; let plaat = null, x = 0, y = 0, rij = 0;
    for (const s of stukken.sort((a, b) => b.h - a.h || b.w - a.w)) {
      if (!plaat) { plaat = { stukken: [] }; platen.push(plaat); x = 0; y = 0; rij = 0; }
      if (x + s.w > W) { x = 0; y += rij + gap; rij = 0; }
      if (y + s.h > H) { plaat = { stukken: [] }; platen.push(plaat); x = 0; y = 0; rij = 0; }
      plaat.stukken.push({ ...s, x, y }); x += s.w + gap; rij = Math.max(rij, s.h);
    }
    const opp = stukken.reduce((tt, s) => tt + s.w * s.h, 0) / 1e6;
    uit.push({ t, platen, opp, benut: opp / (platen.length * 4.5), kg: stukken.reduce((tt, s) => tt + s.w * s.h * t * 7.85e-6, 0) });
  }
  return uit;
}

/** totalen: kg staven en laserdelen, m² voor de coating, laslengte, aantallen */
export function totalen(o, sl = stuklijst(o)) {
  let kgStaaf = 0, kgPlaat = 0, opp = 0, gaten = 0, zagen = 0, verstek = 0, laser = 0, bochten = 0, buigPos = 0, snijM = 0, insteken = 0, zettingen = 0, zetPos = 0;
  for (const p of sl.posities) if (p.voorbeeld.zetlijnen?.length) { zettingen += p.voorbeeld.zetlijnen.length * p.n; zetPos += 1; }
  for (const p of sl.posities) {
    if (p.soort === 'staaf') { kgStaaf += p.kg * p.n; opp += (p.voorbeeld.P.omtrek * p.L * p.n) / 1e6; gaten += p.gaten.length * p.n; zagen += p.n; if (p.voorbeeld.verstek.some((a) => a > 0.5)) verstek += p.n; if (p.buig) { bochten += p.buig.bochten.length * p.n; buigPos += 1; } }
    else { kgPlaat += p.kg * p.n; opp += ((p.voorbeeld.kleur === 'kap' ? 1 : 2) * (p.voorbeeld.contour ? p.voorbeeld.contour.opp : p.l * p.b * (p.voorbeeld.rond ? Math.PI / 4 : 1)) * p.n) / 1e6; laser += p.n; if (!p.voorbeeld.stapel && p.snij) { snijM += p.snij.m * p.n; insteken += p.snij.insteken * p.n; } }
  }
  const lasM = o.lassen.reduce((t, l) => t + l.lengte, 0) / 1000;
  return { zettingen, zetPos, kgStaaf, kgPlaat, kg: kgStaaf + kgPlaat, opp, gaten, zagen, verstek, laser, bochten, buigPos, snijM, insteken, lasM, verbindingen: o.lassen.length, kussens: o.kussens.length, katrollen: o.katrollen.length, kabels: o.kabels.length, stapelplaten: o.stapels.reduce((t, s) => t + s.n + 1, 0), bouten: o.bouten.reduce((t, b) => t + b.n, 0) };
}
