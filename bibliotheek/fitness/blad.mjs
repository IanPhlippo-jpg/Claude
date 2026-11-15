// Bladopmaak voor de fitnesstoestellen: kader (ISO 5457), maatlijnen (ISO 129-1), projectiesymbool eerste hoek
// (ISO 5456-2) en lassymbolen (ISO 2553) uit de balustrades; tabel en tekst uit de taatsdeuren. Eigen titelblok (ISO 7200)
// met het toestel, de versie en het tekeningnummer. Node en browser.
import { T, L, g, tabel, esc, A3, A4L, A4, f, svg, poly, lijn, tk, maat, eersteHoek, lasSymbool } from '../balustrades/blad.mjs';

export { T, L, g, tabel, esc, A3, A4L, A4, f, svg, poly, lijn, tk, maat, eersteHoek, lasSymbool };
export const naamVan = (o) => `${o.id} ${o.naam}`;
export const versieTekst = (o) => `${o.V.naam} (EN ISO 20957 klasse ${o.V.klasse})`;

/** titelblok ISO 7200 rechtsonder: 180 x 32 (A3) of 125 x 28 (A4); opts { titel, nr, rev, datum, blad, schaal } */
export function titelblok(o, [w, h], opts = {}) {
  const groot = w >= 400, bw = groot ? 180 : 125, bh = groot ? 40 : 35, rh = bh / 5, tx = w - 10 - bw, ty = h - 10 - bh, el = [];
  el.push(`<rect x="${tx}" y="${ty}" width="${bw}" height="${bh}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
  for (let i = 1; i < 5; i++) el.push(lijn(tx, ty + i * rh, tx + bw, ty + i * rh, 0.25));
  const veld = (xx, rij, kop, waarde, hh = 2.4, vet = false, max = 80) => { if (xx > 0) el.push(lijn(tx + xx, ty + rij * rh, tx + xx, ty + rij * rh + rh, 0.25)); el.push(tk(tx + xx + 1, ty + rij * rh + 2.3, kop, 1.5, { kleur: '#555' }), tk(tx + xx + 1, ty + rij * rh + rh - 1.4, String(waarde).slice(0, max), hh, { vet })); };
  const k1 = bw * 0.38, k2 = bw * 0.62, k3 = bw * 0.78;
  veld(0, 0, 'Eigenaar', 'Ian · laswerken', groot ? 2.5 : 2.2, true); veld(k1, 0, 'Bibliotheek', 'Fitnesstoestellen', groot ? 2.3 : 2);
  veld(k3, 0, 'Projectie', '', 2); el.push(eersteHoek(tx + k3 + 4, ty + 1.6, groot ? 0.48 : 0.4));
  veld(0, 1, 'Titel', opts.titel ?? naamVan(o), groot ? 2.8 : 2.3, true, groot ? 70 : 50);
  veld(0, 2, 'Toestel', groot ? `${naamVan(o)} · ${o.V.naam}, klasse ${o.V.klasse}` : `${o.id} · ${o.V.naam} (klasse ${o.V.klasse})`, groot ? 2.1 : 1.8, false, groot ? 70 : 46); veld(k2, 2, 'Tekeningnummer', opts.nr ?? `${o.id}-${o.versie === 'pro' ? 'P' : 'T'}`, groot ? 2.3 : 2, true); veld(k3 + (groot ? 12 : 6), 2, 'Rev.', opts.rev ?? '1', 2.2);
  veld(0, 3, 'Maten en toleranties', groot ? 'mm · ISO 2768-m · lassen ISO 5817-C' : 'mm · ISO 2768-m · ISO 5817-C', groot ? 2.1 : 1.6); veld(k1 + (groot ? 10 : 6), 3, 'Schaal', opts.schaal ?? '', 2.1); veld(k2, 3, 'Uitgifte', opts.datum ?? '', 2); veld(k3 + (groot ? 12 : 6), 3, 'Blad', opts.blad ?? '1 / 1', 2.1);
  veld(0, 4, 'Getekend', opts.getekend ?? 'model (bibliotheek fitness)', groot ? 1.9 : 1.6); veld(k1 + (groot ? 10 : 6), 4, 'Goedgekeurd', opts.goedgekeurd ?? '______', 1.9); veld(k2, 4, 'Documentsoort', opts.soort ?? 'werkplaatstekening', groot ? 1.9 : 1.6, false, 22); veld(k3 + (groot ? 12 : 6), 4, 'Materiaal', opts.materiaal ?? 'S235, RAL', 1.6, false, 14);
  return el.join('');
}
/** standaardschaal die past (ISO 5455): de grootste uit de reeks die kleiner is dan s */
export function schaal(s) {
  const reeks = [2, 1, 1 / 2, 1 / 2.5, 1 / 5, 1 / 10, 1 / 15, 1 / 20, 1 / 25, 1 / 30, 1 / 40, 1 / 50];
  const k = reeks.find((x) => x <= s) ?? 1 / 50;
  return { k, tekst: k >= 1 ? `${k}:1` : `1:${Math.round(1 / k * 10) / 10}`.replace('.', ',') };
}
/** tekst afbreken op n tekens */
export function rij(t, n) { const w = String(t).split(' '), uit = []; let r = ''; for (const x of w) { if ((r + ' ' + x).trim().length > n) { if (r) uit.push(r); r = x; } else r = (r + ' ' + x).trim(); } if (r) uit.push(r); return uit; }
