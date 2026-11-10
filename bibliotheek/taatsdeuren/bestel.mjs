// Bestellijst en zaagplan: per profiel (artikel) hoeveel staven je koopt en welke stukken je uit elke staaf zaagt.
// Stukken op hun lengte (buitenmaat, een verstek inbegrepen) + de zaagsnede; eerst de langste (first fit decreasing).
// Een blad A3 met de bestellijst en per staaf een balk met de stukken en het restant. Werkt in Node en in de browser.
import { STAAF } from './prijzen.mjs';
import { stuklijst } from './stuklijst.mjs';
import { W, H, T, L, g, tabel, titelblok, esc } from './blad.mjs';

export const ZAAGSNEDE = 4; // mm per snede (lintzaag of afkortzaag met een blad van 3-4 mm)
export const STAAFLENGTE = 6000; // handelslengte als het profiel niets anders zegt
const f = (v) => (Math.round(v * 100) / 100).toString();

/** zaagplan: { profielen: [{ prof, naam, artikel, lengte, staven: [{ stukken: [{ pos, l }], rest }], n, m, prijs }] } */
export function zaagplan(o, keuzes = {}) {
  const { posities } = stuklijst(o, keuzes), per = new Map();
  for (const p of posities) if (p.soort === 'staaf' && p.L) {
    const s = STAAF[p.prof] ?? {}, lang = s.lengte ?? STAAFLENGTE;
    if (!per.has(p.prof)) per.set(p.prof, { prof: p.prof, naam: s.naam ?? p.prof, artikel: s.artikel ?? '', lengte: lang, stukken: [], prijsM: s.prijs ?? 0, bron: s.bron ?? '' });
    for (let i = 0; i < p.n; i++) per.get(p.prof).stukken.push({ pos: p.pos, l: Math.ceil(p.L) });
  }
  const profielen = [];
  for (const pr of per.values()) {
    const staven = [];
    for (const st of [...pr.stukken].sort((a, b) => b.l - a.l)) {
      // een stuk langer dan de staaf: lassen kan niet in een zichtbaar profiel -> eigen lengte bestellen (op maat)
      if (st.l + ZAAGSNEDE > pr.lengte) { staven.push({ stukken: [st], rest: 0, opMaat: true }); continue; }
      const b = staven.find((x) => !x.opMaat && x.rest >= st.l + ZAAGSNEDE);
      if (b) { b.stukken.push(st); b.rest -= st.l + ZAAGSNEDE; } else staven.push({ stukken: [st], rest: pr.lengte - st.l - ZAAGSNEDE });
    }
    const m = staven.reduce((t, x) => t + (x.opMaat ? x.stukken[0].l : pr.lengte), 0) / 1000;
    const nodig = pr.stukken.reduce((t, x) => t + x.l, 0) / 1000;
    profielen.push({ ...pr, staven, n: staven.length, m, nodig, verlies: m ? 1 - nodig / m : 0, prijs: m * pr.prijsM });
  }
  profielen.sort((a, b) => b.m - a.m);
  return { profielen, totaal: profielen.reduce((t, p) => t + p.prijs, 0) };
}

/** blad A3: de bestellijst (artikel, aantal staven, meter, prijs) en het zaagplan met een balk per staaf */
export function bestelBlad(o, keuzes = {}, meta = {}) {
  const { profielen, totaal } = zaagplan(o, keuzes), el = [];
  el.push(`<rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  el.push(T(26, 17, `Bestellijst (staven van de handel)${o.sys.leverancier ? ` · ${o.sys.leverancier}` : ''}`, 3, { vet: true }));
  const rijen = profielen.map((p) => [p.artikel || '–', p.naam, `${p.n} x ${g(p.lengte / 1000, 1)} m${p.staven.some((x) => x.opMaat) ? ' (deels op maat)' : ''}`, g(p.m, 1), g(p.nodig, 1), `${Math.round(p.verlies * 100)} %`, g(p.prijsM, 2), g(p.prijs, 0)]);
  const [tt, th] = tabel(26, 20, [['Artikel', 26], ['Profiel', 92], ['Bestellen', 42], ['m', 14, 1], ['nodig m', 18, 1], ['rest', 14, 1], ['€/m', 16, 1], ['€', 18, 1]], [...rijen, ['', 'Totaal profielen (excl. btw)', '', '', '', '', '', g(totaal, 0)]], 4.4, 2.2);
  el.push(tt);
  let y = 20 + th + 6;
  el.push(T(26, y, `Zaagsnede ${ZAAGSNEDE} mm per stuk; lengtes = buitenmaat van het stuk (verstek inbegrepen). Prijzen: zie de bron per profiel op de pagina Werkplaats.`, 2.1, { kleur: '#333' }));
  y += 8;
  el.push(T(26, y, 'Zaagplan: elke balk is één staaf; de nummers zijn de posities uit de stuklijst', 3, { vet: true }));
  y += 4;
  const bx = 26, bw = 345, maxY = H - 10 - 36;
  outer: for (const p of profielen) {
    if (y + 12 > maxY) break;
    el.push(T(bx, y + 3.5, `${p.artikel ? `${p.artikel} · ` : ''}${p.naam}`, 2.4, { vet: true }));
    y += 5;
    for (const [i, st] of p.staven.entries()) {
      if (y + 7 > maxY) { el.push(T(bx, y + 3, '… meer staven: zie de CSV-lijst', 2.1, { kleur: '#555' })); break outer; }
      const lang = st.opMaat ? st.stukken[0].l : p.lengte, s = bw / Math.max(lang, p.lengte);
      el.push(`<rect x="${bx}" y="${f(y)}" width="${f(lang * s)}" height="5" fill="#f2f3f3" stroke="#111" stroke-width="0.2"/>`);
      let x = bx;
      for (const sk of st.stukken) {
        const w = sk.l * s;
        el.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="5" fill="#cfd4d7" stroke="#111" stroke-width="0.2"/>`);
        if (w > 9) el.push(T(x + w / 2, y + 3.6, `${sk.pos} · ${sk.l}`, 2, { anker: 'middle' }));
        else if (w > 3) el.push(T(x + w / 2, y + 3.6, String(sk.pos), 1.8, { anker: 'middle' }));
        x += w + ZAAGSNEDE * s;
      }
      el.push(T(bx + bw + 2, y + 3.6, st.opMaat ? 'op maat' : `staaf ${i + 1} · rest ${Math.max(0, Math.round(st.rest))}`, 1.9, { kleur: '#555' }));
      y += 6.5;
    }
    y += 3;
  }
  el.push(titelblok(o, { ...meta, titel: `Bestellijst en zaagplan ${o.stijl.naam} · opening ${o.B} x ${o.H}`, schaal: '' }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${el.join('\n')}</svg>`;
}
export { esc, L };
