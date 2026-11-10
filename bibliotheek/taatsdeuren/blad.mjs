// Werkblad A3 liggend van één taatsdeur: vooraanzicht met maten (links), doorsnede van het profiel, zaaglijst,
// laserlijst en glaslijst (rechts) en een titelblok met de velden van ISO 7200; kader volgens ISO 5457.
// Werkt in Node (PDF) en in de browser (configurator).
import { lijsten, MATEN } from './deuren.mjs';
import { vooraanzicht } from './teken.mjs';
import { STAAF } from './prijzen.mjs';

export const W = 420, H = 297;
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const g = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
export const T = (x, y, t, h = 2.6, o = {}) => `<text x="${x}" y="${y}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}>${esc(t)}</text>`;
export const L = (x1, y1, x2, y2, w = 0.25) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="${w}"/>`;

/** tabel: kolommen [[kop, breedte, rechts?]], rijen; geeft [svg, hoogte] */
export function tabel(x, y, kol, rijen, h = 4.6, size = 2.3) {
  const bt = kol.reduce((s, k) => s + k[1], 0), uit = [`<rect x="${x}" y="${y}" width="${bt}" height="${h * (rijen.length + 1)}" fill="none" stroke="#111" stroke-width="0.3"/>`, `<rect x="${x}" y="${y}" width="${bt}" height="${h}" fill="#e9ecee" stroke="none"/>`];
  let xx = x;
  kol.forEach(([k, b, r]) => { uit.push(T(r ? xx + b - 1.2 : xx + 1.2, y + h * 0.7, k, size * 0.92, { vet: true, anker: r ? 'end' : undefined })); xx += b; });
  rijen.forEach((rij, i) => {
    const yy = y + h * (i + 1);
    uit.push(L(x, yy, x + bt, yy, 0.13));
    xx = x;
    rij.forEach((c, j) => { const [, b, r] = kol[j]; uit.push(T(r ? xx + b - 1.2 : xx + 1.2, yy + h * 0.7, c, size, { anker: r ? 'end' : undefined })); xx += b; });
  });
  return [uit.join(''), h * (rijen.length + 1)];
}

/** doorsnede van de vleugel: kader met glas (enkel of dubbel), glaslatten en een roede (schaal 1:2) */
function doorsnede(o, x, y) {
  const sys = o.sys, s = 0.5, k = sys.kader, r = sys.roede, el = [], gd = o.glasDikte ?? 8.8, m = k.diepte / 2;
  const R = (x0, y0, w, h, vul = '#2b2e31') => el.push(`<rect x="${x + x0 * s}" y="${y + y0 * s}" width="${w * s}" height="${h * s}" fill="${vul}" stroke="#111" stroke-width="0.2"/>`);
  // glas in het midden: enkel = één ruit; dubbel = 44.2 | 14 | 6 met een afstandhouder
  const glas = (x0, w) => { if (o.opbouw === 'dubbel') { R(x0, m - gd / 2, w, 8.8, '#cfdde3'); R(x0, m + gd / 2 - 6, w, 6, '#cfdde3'); R(x0 + 2, m - gd / 2 + 8.8, 8, 14, '#888'); } else R(x0, m - gd / 2, w, gd, '#cfdde3'); };
  if (sys.koop) return doorsnedeKoop(o, x, y, R, glas, el);
  R(0, 0, k.zicht, k.diepte);
  glas(k.zicht + 2, 70);
  R(k.zicht, m - gd / 2 - 4, 15, 4); R(k.zicht, m + gd / 2, 15, 4);
  // roede: kern zo dik als het glas, latten 30x3 voor en achter
  const xr = k.zicht + 72, kd = r.lat ? r.diepte - 6 : r.diepte;
  R(xr, m - kd / 2, 20, kd); if (r.lat) { R(xr - 5, m - kd / 2 - 3, 30, 3); R(xr - 5, m + kd / 2, 30, 3); }
  glas(xr + 22, 50);
  el.push(T(x, y - 3, `Doorsnede A-A (1:2): kader, ${o.opbouw === 'dubbel' ? 'dubbel glas 44.2 | 14 | 6 gehard' : 'veiligheidsglas'}, glaslatten, roede`, 2.4, { vet: true }));
  el.push(T(x, y + k.diepte * s + 5, `${k.uitleg}; ${r.uitleg}`, 2));
  return el.join('');
}

/** doorsnede bij koopprofielen (vereenvoudigd): holle profielen met wand 1,5, bij een geïsoleerd profiel twee stalen
 * schalen met de isolatiezone ertussen; sponning (lip) aan de voorkant, glaslat aan de achterkant */
function doorsnedeKoop(o, x, y, R, glas, el) {
  const sys = o.sys, s = 0.5, k = sys.kader, r = sys.roede, gd = o.glasDikte ?? 8.8, m = k.diepte / 2;
  const hol = (x0, w, h, prof) => {
    const st = STAAF[prof] ?? {}, t = st.wand ?? 1.5, iso = st.iso;
    const schaal = (y0, hh) => { R(x0, y0, w, hh); R(x0 + t, y0 + t, w - 2 * t, hh - 2 * t, '#fff'); };
    if (iso) { schaal(0, iso[0]); R(x0, iso[0], w, iso[1] - iso[0], '#e3cf8f'); schaal(iso[1], h - iso[1]); } else schaal(0, h);
  };
  hol(0, k.zicht, k.diepte, k.staaf);
  glas(k.zicht + 2, 70);
  R(k.zicht, m - gd / 2 - 4, 12, 4); R(k.zicht, m + gd / 2, 15, 4, '#6b7075');
  const xr = k.zicht + 72;
  hol(xr, r.zicht, r.diepte, r.staaf);
  R(xr - 12, m - gd / 2 - 4, 12, 4); R(xr + r.zicht, m - gd / 2 - 4, 12, 4); R(xr - 15, m + gd / 2, 15, 4, '#6b7075'); R(xr + r.zicht, m + gd / 2, 15, 4, '#6b7075');
  glas(xr + r.zicht + 2, 40);
  el.push(T(x, y - 3, `Doorsnede A-A (1:2, vereenvoudigd): ${sys.kort}, ${o.opbouw === 'dubbel' ? 'isolerend glas 44.2 | 14 | 6 gehard' : 'veiligheidsglas'}`, 2.4, { vet: true }));
  el.push(T(x, y + k.diepte * s + 5, `${k.uitleg}; ${r.uitleg}.`, 2), T(x, y + k.diepte * s + 8.5, `${sys.glaslat.uitleg}${sys.iso ? '; geel = isolatiezone' : ''}. Sponning en dichtingen volgens de catalogus.`, 2));
  return el.join('');
}

/** het blad; opts: { nr, rev, datum, prijs: { regels: [[wat, bedrag]], totaal }, schaal } */
export function werkblad(o, opts = {}) {
  const Ls = lijsten(o), el = [];
  // kader ISO 5457: archiefrand 20 links, 10 rondom; rasterverwijzing weggelaten (werkblad)
  el.push(`<rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  // vooraanzicht in het linkerdeel (± 190 x 255 mm)
  const KB = o.kozijn.B, KH = o.kozijn.H, s = Math.min(150 / KB, 238 / KH), sch = [1, 2, 5, 10, 15, 20, 25, 30].find((n) => 1 / n <= s) ?? 30;
  const sc = 1 / sch;
  el.push(vooraanzicht(o, sc, 52, 268, { tekst: 3 }));
  el.push(T(52, 18, `Vooraanzicht (schaal 1:${sch}), van de kant met de greep`, 3, { vet: true }));
  el.push(T(52, 22.5, `${o.scharnier === 'verdekt' ? 'Rood: de 3 verdekte scharnieren en de draairichting (de punt wijst naar de scharnierkant).' : 'Rode streep-punt: hart taatsas.'} Maten in mm; roedehoogtes op het hart, vanaf de onderkant van de vleugel.`, 2.2));
  // rechts: lijsten
  let y = 16;
  const x = 214;
  const [zt, zh] = tabel(x, y + 4, [['Zaaglijst', 70], ['Staaf', 34], ['Lengte', 18, 1], ['n', 8, 1], ['Bewerking', 66]], Ls.zaag.map((r) => [r.wat, STAAF[r.prof]?.artikel ?? r.prof, g(r.l), r.n, r.bew.length > 52 ? `${r.bew.slice(0, 51)}…` : r.bew]), 4.3, 2.15);
  el.push(T(x, y + 2.5, 'Zaaglijst (staven)', 2.8, { vet: true }), zt); y += zh + 9;
  const [lt, lh] = tabel(x, y + 4, [['Lasergesneden', 70], ['Maat', 52, 0], ['n', 8, 1], ['Plaat / opmerking', 66]], Ls.laser.map((r) => [r.wat, r.vorm === 'boog' ? `R${g(r.r)} x ${r.zicht}, ${g(r.hoek)}°` : `${r.b} x ${r.l}`, r.n, `${r.mat}; ${r.opm}`]), 4.3, 2.15);
  el.push(T(x, y + 2.5, 'Laserlijst (DXF bij de configurator)', 2.8, { vet: true }), lt); y += lh + 9;
  const [gt, gh] = tabel(x, y + 4, [[o.opbouw === 'dubbel' ? 'Dubbel glas' : 'Glas', 50], ['Vorm', 28], ['Breedte', 20, 1], ['Hoogte', 20, 1], ['m²', 16, 1], ['n', 8, 1]], Ls.glas.map((r) => [r.deel, r.vorm, r.b, r.h, g(r.m2, 2), r.n]), 4.3, 2.15);
  el.push(T(x, y + 2.5, `Glaslijst (glasmaat = daglicht + ${(o.sys.inloop ?? MATEN.inloop) - 2} mm rondom)`, 2.8, { vet: true }), gt); y += gh + 12;
  if (y < 205) el.push(doorsnede(o, x + 4, y + 2));
  // prijs (als meegegeven) rechtsonder boven het titelblok
  if (opts.prijs) {
    const [pt] = tabel(x + 120, 214, [['Kostprijs', 52], ['€', 24, 1]], [...opts.prijs.regels.map(([a, b]) => [a, g(b)]), ['Totaal (excl. btw)', g(opts.prijs.totaal)]], 4.2, 2.15);
    el.push(pt);
  }
  el.push(titelblok(o, { ...opts, schaal: `1:${sch} (A3)` }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${el.join('\n')}</svg>`;
}

/** titelblok (ISO 7200) rechtsonder op een A3-blad: 196 x 32; opts: { nr, rev, datum, blad, schaal, titel } */
export function titelblok(o, opts = {}) {
  const el = [], tx = W - 10 - 196, ty = H - 10 - 32;
  el.push(`<rect x="${tx}" y="${ty}" width="196" height="32" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
  for (const yy of [8, 16, 24]) el.push(L(tx, ty + yy, tx + 196, ty + yy, 0.25));
  const veld = (xx, rij, kop, waarde, h = 2.6, vet = false) => { if (xx > 0) el.push(L(tx + xx, ty + rij * 8, tx + xx, ty + rij * 8 + 8, 0.25)); el.push(T(tx + xx + 1.2, ty + rij * 8 + 2.6, kop, 1.7, { kleur: '#555' }), T(tx + xx + 1.2, ty + rij * 8 + 6.6, waarde, h, { vet })); };
  veld(0, 0, 'Eigenaar', 'Ian · laswerken', 2.6, true); veld(70, 0, 'Bibliotheek', 'Stalen deuren', 2.6);
  veld(0, 1, 'Titel', opts.titel ?? `Deur ${o.stijl.naam} · opening ${o.B} x ${o.H}`, 3, true);
  veld(0, 2, 'Systeem', o.sys.naam, 2.4); veld(70, 2, 'Tekeningnummer', opts.nr ?? `TD-${o.stijl.id}`, 2.6, true); veld(130, 2, 'Rev.', opts.rev ?? '1', 2.6); veld(150, 2, 'Uitgifte', opts.datum ?? '', 2.4);
  veld(0, 3, 'Maten en toleranties', 'mm · ISO 2768-m · lassen ISO 5817-C', 2.3); veld(70, 3, 'Schaal', opts.schaal ?? '', 2.4); veld(100, 3, 'Opgesteld', 'Ian · laswerken', 2.3); veld(150, 3, 'Blad', opts.blad ?? '1 / 1', 2.4);
  return el.join('');
}
