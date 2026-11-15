// Alle werkplaatsbladen van een fitnesstoestel (SVG, mm): overzicht A3 in eerste hoekprojectie met de hoofdmaten,
// stuklijst (ISO 7573), lasdetails (ISO 2553), boringen, kabelschema (kabelmachines), bekledingsblad (kussens),
// bestellijst met zaagplan op 6 m en plaatnesting, en een A4 per stuk. Node en browser.
import { svg, A3, A4L, lijn, tk, maat, tabel, titelblok, schaal, rij, lasSymbool, lasSymboolFlare, f, naamVan, versieTekst, esc } from './blad.mjs';
import { tekenBalken, omhullende, alleGeo, PROJ, iso } from './aanzicht.mjs';
import { stuklijst, zaagplan, nesting, totalen, KLEM } from './stuklijst.mjs';
import { puntOp } from './vorm.mjs';
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
import { KOOP } from './onderdelen.mjs';
import { lengteStuk, dot, add, mul, sub, aabb } from './model.mjs';
import { gatFouten, SPELING } from './controle.mjs';

const afstLijn = (p, a, u) => { const q = sub(p, a), t = dot(q, u); return Math.hypot(...sub(q, mul(u, t))); };
/** waarvoor dient een gat: bout, pen, lager, Westside of vrij (kabel, oog) */
function gatDoel(o, d, p, as, dia) {
  const par = (a) => Math.abs(dot(a, as)) > 0.98;
  for (const bt of o.bouten) for (const q of bt.punten ?? [bt.p]) if (par(bt.as) && afstLijn(p, q, bt.as) < 1) return bt.key === 'anker' ? `anker M${bt.M}` : `bout M${bt.M}`;
  for (const pn of o.pennen) if (par(pn.as) && afstLijn(p, pn.p, pn.as) < 1) return pn.lager && Math.abs(pn.lager - dia) < 3 ? `flensglijlager Ø${pn.lager}` : pn.key ? `pen Ø${pn.d} (${pn.naam.slice(0, 22)})` : `pen/as Ø${pn.d}`;
  if (d.westside && dia === d.westside.d) return `Westside (pen Ø${o.V.pin})`;
  return 'vrij gat (kabel, oog of as)';
}
/** de gaten van een stuk als rijen voor de boortabel: per (vlak, Ø, wanden, doel) de posities */
export function boorRijen(o, d) {
  const per = new Map();
  for (const g of d.gaten) {
    let p, as, vlak, pos, wanden;
    if (d.soort === 'staaf') { p = add(d.a, mul(d.u, g.s)); as = g.as === 'v' ? d.v : d.w; vlak = g.as === 'w' ? 'A' : 'B'; pos = Math.round(g.s); wanden = g.door ?? 2; }
    else { p = g.p; as = [0, 0, 0]; as[d.as.t] = 1; vlak = 'plaat'; pos = `${Math.round(g.x)}/${Math.round(g.y)}`; wanden = 1; }
    const doel = gatDoel(o, d, p, as, g.d), k = `${vlak}|${g.d}|${wanden}|${doel}`;
    if (!per.has(k)) per.set(k, { vlak, d: g.d, wanden, doel, pos: [] });
    per.get(k).pos.push(pos);
  }
  return [...per.values()];
}

const r0 = (v) => Math.round(v);
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');
const datum = (meta) => meta.datum ?? new Date().toISOString().slice(0, 10);
const nr = (o, n) => `${o.id}-${o.versie === 'pro' ? 'P' : 'T'}-${n}`;

/** zet een aanzicht van alle balken in een vak [x, y, w, h] met schaal k (papier-mm per mm); geeft { svg, box, P, k, ox, oy } */
function aanzicht(geo, proj, k, x, y) {
  const [x0, y0] = omhullende(geo, proj), ox = x - x0 * k, oy = y - y0 * k;
  const t = tekenBalken(geo, { proj, schaal: k, ox, oy, lw: 0.25 });
  return { ...t, ox, oy, k, proj, naar: (p) => { const q = proj(p); return [ox + q[0] * k, oy + q[1] * k]; } };
}

// ---------------------------------------------------------------- overzicht A3
export function overzicht(o, meta = {}) {
  const geo = alleGeo(o, false), el = [], { B, D, H } = o.maten;
  const s = schaal(Math.min(250 / (B + D), 185 / (H + D)));
  const k = s.k, x0 = 38, y0 = 30;
  const voor = aanzicht(geo, PROJ.voor, k, x0, y0);
  const links = aanzicht(geo, PROJ.links, k, x0 + B * k + 22, y0);
  const boven = aanzicht(geo, PROJ.boven, k, x0, y0 + H * k + 22);
  el.push(voor.svg, links.svg, boven.svg);
  el.push(tk(x0, y0 - 9, `Vooraanzicht (schaal ${s.tekst})`, 2.6, { vet: true }), tk(x0 + B * k + 22, y0 - 9, 'Linkerzijaanzicht (rechts geplaatst, eerste hoek)', 2.6, { vet: true }), tk(x0, y0 + H * k + 22 - 4, 'Bovenaanzicht', 2.6, { vet: true }));
  // hoofdmaten
  const [mn, mx] = o.box;
  const vA = voor.naar([mn[0], 0, mn[2]]), vB = voor.naar([mx[0], 0, mn[2]]), vC = voor.naar([mn[0], 0, mx[2]]);
  el.push(maat([vA[0], vA[1]], [vB[0], vB[1]], 6, `${B}`), maat([vA[0], vA[1]], [vC[0], vC[1]], -6, `${H}`));
  const lA = links.naar([0, mx[1], mn[2]]), lB = links.naar([0, mn[1], mn[2]]);
  el.push(maat([lA[0], lA[1]], [lB[0], lB[1]], 6, `${D}`));
  // hoogte van het kussen of de J-hook
  const hk = o.kussens.length ? Math.max(...o.kussens.map((p) => Math.max(p.a[2], p.b[2]) + p.dikte * p.n[2])) : 0;
  if (hk > 100 && hk < H - 50) { const p1 = links.naar([0, mn[1], 0]), p2 = links.naar([0, mn[1], hk]); el.push(maat([p1[0] + 3, p1[1]], [p2[0] + 3, p2[1]], -10, `${r0(hk)}`)); }
  // iso en gegevens rechts
  const P = iso(-38, 24), [ix0, iy0, ix1, iy1] = omhullende(alleGeo(o, true), P), ik = Math.min(82 / (ix1 - ix0), 70 / (iy1 - iy0));
  el.push(`<rect x="318" y="18" width="88" height="80" fill="#f6f7f8" stroke="#bbb" stroke-width="0.2"/>`, tekenBalken(alleGeo(o, true), { proj: P, schaal: ik, ox: 362 - ((ix0 + ix1) / 2) * ik, oy: 58 - ((iy0 + iy1) / 2) * ik, stijl: 'kleur', lw: 0.15 }).svg, tk(320, 96, 'Isometrie (zonder schaal, met schijven)', 2, { kleur: '#555' }));
  const t = totalen(o), rows = [
    ['Toestel', `${o.id} ${o.naam}`], ['Versie', versieTekst(o)], ['Buitenmaten B x D x H', `${B} x ${D} x ${H} mm`], ['Vloeroppervlak', `${gw(o.vloer, 2)} m²`], ['Massa toestel', `${r0(o.massa)} kg (staal ${r0(t.kg)} kg)`],
    ['Max. gebruiker', `${o.V.gebruiker} kg`], ['Max. trainingslast', o.maxLast ? `${o.maxLast} kg` : o.stapels.length ? `stapel ${o.stapels.map((x) => x.n * x.kg).join(' + ')} kg` : '-'],
    ['Staal', 'S235JR(H), EN 10025-2 / EN 10219'], ['Lassen', `hoeklas a${o.V.las}, ISO 5817-C`], ['Afwerking', 'stralen + poedercoat (RAL)'], ['Stuks / lassen', `${o.delen.length} stalen delen, ${o.lassen.length} lassen`],
  ];
  let y = 108; el.push(tk(318, y - 3, 'Gegevens', 2.8, { vet: true }));
  for (const [a, b] of rows) { el.push(tk(318, y + 1.5, a, 1.9, { kleur: '#555' }), ...rij(b, 40).slice(0, 2).map((x, i) => tk(318, y + 4.6 + i * 2.7, x, 2.2))); y += rij(b, 40).length > 1 ? 9.5 : 7; }
  const noten = [o.def.kort, ...(o.notities ?? []), o.verankerd ? `Verankeren: ${o.verankerd}.` : '', o.veiligheid ? `Veiligheid: ${o.veiligheid}.` : ''].filter(Boolean);
  y += 2; el.push(tk(318, y, 'Opmerkingen', 2.6, { vet: true })); y += 3.5;
  for (const n of noten) for (const x of rij(n, 46)) { if (y > 248) break; el.push(tk(318, y, x, 2)); y += 2.7; }
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: overzicht`, nr: nr(o, 1), schaal: s.tekst, datum: datum(meta), blad: meta.blad ?? '1' }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- stuklijst A3
export function stuklijstBlad(o, meta = {}) {
  const sl = stuklijst(o), el = [], kol = [['Pos', 10, true], ['Aantal', 12, true], ['Benaming', 72], ['Materiaal', 26], ['Afmeting', 44], ['Lengte', 14, true], ['Zaagsnede', 30], ['kg/st', 13, true], ['Opmerking', 159]];
  el.push(tk(25, 18, `Stuklijst (ISO 7573): ${naamVan(o)}, ${o.V.naam.toLowerCase()}`, 3.4, { vet: true }));
  const rijen = sl.posities.map((p) => [String(p.pos), String(p.n), p.naam.slice(0, 44), p.mat, p.maat.slice(0, 28), p.L ? String(p.L) : '', p.zaagT ?? '', gw(p.kg, 2), (p.opm ?? '').slice(0, 104)]);
  const max = Math.floor((250 - 24) / 4.2) - 1, deel = rijen.slice(0, max);
  const [t1, h1] = tabel(25, 22, kol, deel, 4.2, 2.05); el.push(t1);
  if (rijen.length > max) el.push(tk(25, 22 + h1 + 4, `+ ${rijen.length - max} posities: zie de CSV`, 2.2, { kleur: '#a00' }));
  const kg = sl.posities.reduce((t, p) => t + p.kg * p.n, 0);
  el.push(tk(25, 22 + h1 + (rijen.length > max ? 9 : 5), `Totaal staal ${gw(kg, 1)} kg in ${sl.posities.reduce((t, p) => t + p.n, 0)} stukken. Kooponderdelen en bekleding: zie de bestellijst.`, 2.3));
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: stuklijst`, nr: nr(o, 2), schaal: '-', datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- stuk per stuk (A4 liggend)
export function stukBlad(o, p, meta = {}) {
  const el = [], d = p.voorbeeld; let schaalTekst = '-';
  el.push(tk(25, 18, `Pos ${p.pos}: ${p.naam}`, 4, { vet: true }), tk(25, 24, `${p.n} stuk${p.n > 1 ? 's' : ''} · ${p.maat} · ${p.mat}${p.L ? ` · L = ${p.L} mm` : ''}${p.zaagT ? ` · ${p.zaagT}` : ''} · ${gw(p.kg, 2)} kg/st`, 2.6));
  if (p.soort === 'staaf' && d.buig) {
    const P = d.P, pts = d.buig.hoekpunten, e1 = d.ua, e2 = cross3(d.vlak, e1), xy = (q) => { const r = [q[0] - pts[0][0], q[1] - pts[0][1], q[2] - pts[0][2]]; return [r[0] * e1[0] + r[1] * e1[1] + r[2] * e1[2], r[0] * e2[0] + r[1] * e2[1] + r[2] * e2[2]]; };
    const H = pts.map(xy), C = d.pad.map((q) => xy(q.p)), xs = C.map((q) => q[0]).concat(H.map((q) => q[0])), ys = C.map((q) => q[1]).concat(H.map((q) => q[1]));
    const bx = Math.max(...xs) - Math.min(...xs) + P.h, by = Math.max(...ys) - Math.min(...ys) + P.h, sc = schaal(Math.min(170 / bx, 85 / by)), k = sc.k; schaalTekst = sc.tekst;
    const X0 = 40 - (Math.min(...xs) - P.h / 2) * k, Y0 = 50 + (Math.max(...ys) + P.h / 2) * k, T = ([x, y]) => [X0 + x * k, Y0 - y * k];
    el.push(tk(35, 40, `Buigvorm in het buigvlak (${P.naam}, hoogte ${gw(P.h)} in het vlak): hartlijn, hoekpunten en buitenmaat`, 2.3, { vet: true }));
    // buitenmaat: de hartlijn verschoven over ± h/2
    for (const sg of [-1, 1]) { const off = d.pad.map((q) => { const tt = xy(add(q.p, q.t)), pp = xy(q.p), dx = tt[0] - pp[0], dy = tt[1] - pp[1], nl = Math.hypot(dx, dy) || 1; return T([pp[0] - (sg * dy * P.h) / 2 / nl, pp[1] + (sg * dx * P.h) / 2 / nl]); }); el.push(`<polyline points="${off.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="#111" stroke-width="0.5"/>`); }
    el.push(`<polyline points="${C.map((q) => T(q).map(f).join(',')).join(' ')}" fill="none" stroke="#111" stroke-width="0.15" stroke-dasharray="4 1 0.5 1"/>`);
    el.push(`<polyline points="${H.map((q) => T(q).map(f).join(',')).join(' ')}" fill="none" stroke="#2563a8" stroke-width="0.12" stroke-dasharray="1 1"/>`);
    H.forEach((q, i) => { const [x, y] = T(q); el.push(`<circle cx="${f(x)}" cy="${f(y)}" r="0.6" fill="#2563a8"/>`, tk(x + 1, y - 1, `H${i}`, 1.8, { kleur: '#2563a8' })); });
    for (const g of d.gaten) { const q = puntOp(d, g.s), [x, y] = T(xy(q.p)); el.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.max(0.35, (g.d / 2) * k))}" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`); }
    let y = 142;
    el.push(tk(25, y, `Buigtabel (hoekpunten H = snijpunten van de benen; R = ${d.buig.R} op de hartlijn, ≥ 3 x ${gw(P.h)}; gestrekte lengte ${r0(d.L)} mm + 2 x ${KLEM} klem)`, 2.4, { vet: true })); y += 2;
    const rows = H.map((q, i) => [`H${i}`, String(r0(q[0])), String(r0(q[1])), i && i < H.length - 1 ? `${gw(d.buig.bochten[i - 1] ?? 0, 1)}°` : '-', i < H.length - 1 ? String(r0(Math.hypot(H[i + 1][0] - q[0], H[i + 1][1] - q[1]))) : '-', i < d.buig.benen.length ? String(d.buig.benen[i]) : '-']);
    const [tb, th] = tabel(25, y, [['', 8], ['x', 14, true], ['y', 14, true], ['Bocht', 14, true], ['Tot H+1', 16, true], ['Recht been', 18, true]], rows.slice(0, 7), 3.4, 1.75); el.push(tb); y += th + 2;
    for (const n of [d.opm, `Buigen op een buizenbuiger met een matrijs voor ${P.naam} (buigvlak: hoogte ${gw(P.h)} in het vlak); eerst buigen, dan op lengte zagen en boren. Tolerantie hoek ± 1°, been ± 2 mm; nameten in de lasmal.`, 'Algemene toleranties ISO 2768-m.'].filter(Boolean)) for (const x of rij(n, 150)) { if (y > 170) break; el.push(tk(25, y + 2, x, 2, { kleur: '#333' })); y += 2.8; }
  } else if (p.soort === 'staaf') {
    const P = d.P, L = lengteStuk(d), s = schaal(Math.min(200 / L, 40 / Math.max(P.b, P.h))), k = s.k, x0 = 35; schaalTekst = s.tekst;
    const views = [{ y: 50, b: P.b, as: 'w', titel: `Aanzicht A: gaten door de ${P.vorm === 'buis' || P.vorm === 'rond' ? 'buis' : `wanden van ${r0(P.h)}`}` }, { y: 45 + P.b * k + 34, b: P.h, as: 'v', titel: 'Aanzicht B (onder A, 90° gedraaid)' }];
    for (const v of views) {
      const w = L * k, hh = v.b * k, [va, vb] = d.verstek ?? [0, 0], dxa = v.as === 'v' ? Math.tan((va * Math.PI) / 180) * hh : 0, dxb = v.as === 'v' ? Math.tan((vb * Math.PI) / 180) * hh : 0;
      el.push(tk(x0, v.y - (v === views[0] ? 14 : 9), v.titel, 2.3, { vet: true }));
      el.push(`<polygon points="${f(x0 + dxa)},${f(v.y)} ${f(x0 + w - dxb)},${f(v.y)} ${f(x0 + w)},${f(v.y + hh)} ${f(x0)},${f(v.y + hh)}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
      if (P.vorm === 'koker') el.push(lijn(x0 + dxa, v.y + P.t * k, x0 + w - dxb, v.y + P.t * k, 0.18, '#111', '1.5 0.8'), lijn(x0, v.y + hh - P.t * k, x0 + w, v.y + hh - P.t * k, 0.18, '#111', '1.5 0.8'));
      if (P.vorm === 'buis') el.push(lijn(x0, v.y + hh / 2, x0 + w, v.y + hh / 2, 0.15, '#111', '4 1 0.5 1'));
      const gaten = d.gaten.filter((g) => g.as === v.as || P.vorm !== 'koker');
      for (const g of gaten) el.push(`<circle cx="${f(x0 + g.s * k)}" cy="${f(v.y + hh / 2)}" r="${f(Math.max(0.35, (g.d / 2) * k))}" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`);
      if (v === views[0]) el.push(maat([x0, v.y], [x0 + w, v.y], -7, `${r0(L)}`));
      // gatmaten: ordinaatmaten vanaf uiteinde A (0) voor elk gat, hartlijn door het gat
      const pos = [...new Set(gaten.map((g) => r0(g.s)))].sort((a, b) => a - b);
      if (pos.length) {
        const yb = v.y + hh + 2.5;
        el.push(lijn(x0, v.y + hh, x0, yb + 3, 0.15), tk(x0, yb + 5.5, '0', 1.6, { anker: 'middle' }));
        for (const sp of pos) { const xx = x0 + sp * k; el.push(lijn(xx, v.y - 1.5, xx, yb + 3, 0.1, '#b42318', '2 0.6 0.4 0.6'), tk(xx + 0.55, yb + 3.6, String(sp), 1.5, { draai: -90, anker: 'end' })); }
        // Ø bij het eerste gat van elke diameter, in het aanzicht (P2-09b)
        for (const dd of [...new Set(gaten.map((g) => g.d))]) { const g0 = gaten.filter((g) => g.d === dd).sort((a2, b2) => a2.s - b2.s)[0]; el.push(tk(x0 + g0.s * k + 1.2, v.y - 1.8, `Ø${gw(dd)}${g0.door === 1 ? ' (1 wand)' : ' (2 wanden)'}`, 1.6, { kleur: '#b42318' })); }
      }
      el.push(tk(x0 - 6, v.y + hh / 2 + 1, 'A', 2.6, { vet: true }));
    }
    // doorsnede
    const dx = 252, dy = 50, dk = Math.min(1, 28 / Math.max(P.b, P.h));
    el.push(tk(dx - 4, dy - 8, `Doorsnede (${dk >= 1 ? '1:1' : `1:${gw(1 / dk, 1)}`})`, 2.2, { vet: true }));
    if (P.vorm === 'buis' || P.vorm === 'rond') el.push(`<circle cx="${dx + 14}" cy="${dy + 14}" r="${f((P.b / 2) * dk)}" fill="#ddd" stroke="#111" stroke-width="0.4"/>`, P.vorm === 'buis' ? `<circle cx="${dx + 14}" cy="${dy + 14}" r="${f((P.b / 2 - P.t) * dk)}" fill="#fff" stroke="#111" stroke-width="0.3"/>` : '');
    else el.push(`<rect x="${f(dx + 14 - (P.b / 2) * dk)}" y="${f(dy + 14 - (P.h / 2) * dk)}" width="${f(P.b * dk)}" height="${f(P.h * dk)}" fill="#ddd" stroke="#111" stroke-width="0.4"/>`, P.vorm === 'koker' ? `<rect x="${f(dx + 14 - (P.b / 2 - P.t) * dk)}" y="${f(dy + 14 - (P.h / 2 - P.t) * dk)}" width="${f((P.b - 2 * P.t) * dk)}" height="${f((P.h - 2 * P.t) * dk)}" fill="#fff" stroke="#111" stroke-width="0.3"/>` : '');
    el.push(tk(dx - 4, dy + 34, P.naam, 2.1), tk(dx - 4, dy + 37.5, P.norm, 1.8, { kleur: '#555' }));
    // boortabel: elk gat met Ø, aantal, vlak, wanden, doel en positie vanaf uiteinde A
    let y = 138; const br = boorRijen(o, d);
    if (br.length) {
      el.push(tk(25, y, 'Boortabel (posities = hart gat vanaf uiteinde A, in mm)', 2.5, { vet: true })); y += 2;
      const rows = br.map((b, i) => [String(i + 1), `Ø${gw(b.d)}`, String(b.pos.length), b.vlak, `${b.wanden}`, b.doel.slice(0, 30), b.pos.sort((p, q) => p - q).join(', ').slice(0, 150)]);
      const [t, h] = tabel(25, y, [['', 5, true], ['Ø', 10], ['n', 7, true], ['Vlak', 9], ['Wanden', 12, true], ['Voor', 48], ['Posities vanaf A', 150]], rows.slice(0, 5), 3.4, 1.75); el.push(t); y += h + 3;
      if (rows.length > 5) { el.push(tk(25, y, `+ ${rows.length - 5} rijen: zie het boorblad`, 1.9, { kleur: '#b42318' })); y += 2.6; }
    }
    // dwarsmaat, tolerantie en passing (P2-09a/c/d), verstek (P2-09e)
    if (d.gaten.length) { for (const x2 of rij(`Dwarspositie: elk gat op het hart van het vlak (aanzicht A: ${gw(P.b / 2)} mm van de rand, aanzicht B: ${gw(P.h / 2)} mm). Tolerantie: gatenrij ± 0,3 mm onderling, boren met de boormal; staanders per paar samen boren (L en R gelijk); hart gat tot uiteinde A ± 0,5.`, 150)) { el.push(tk(25, y + 1, x2, 1.9, { kleur: '#333' })); y += 2.6; } }
    if (/^(As|Draaias|Halterstang|Geleidestang)/.test(d.naam) || P.vorm === 'rond') { el.push(tk(25, y + 1, `Passing: ${/^As|Draaias/.test(d.naam) ? 'as Ø' + P.b + ' h9 (glijlager) of h6 (kogellager), geslepen waar het lager zit' : 'ronde stang: zaagsnede haaks, kanten afschuinen 1 x 45°'}.`, 1.9, { kleur: '#333' })); y += 2.6; }
    const [va, vb] = d.verstek ?? [0, 0];
    if (va || vb) { const kort = L - (P.h * (Math.tan((va * Math.PI) / 180) + Math.tan((vb * Math.PI) / 180))); el.push(tk(25, y + 1, `Verstek: A ${va}°, B ${vb}° over de hoogte ${gw(P.h)} (aanzicht B); lange zijde ${r0(L)} mm, korte zijde ${r0(kort)} mm; de gaten worden gemeten vanaf de lange zijde.`, 1.9, { kleur: '#333' })); y += 2.6; }
    const weg = (o.weggelaten ?? []).filter((w) => w.deel === d.naam);
    if (weg.length) { for (const x of rij(`Weggelaten Westside-gaten (${weg.length}): ${[...new Set(weg.map((w) => `${r0(w.s)} (${w.reden})`))].slice(0, 8).join(', ')}`, 150)) { el.push(tk(25, y + 1, x, 1.9, { kleur: '#b42318' })); y += 2.6; } }
    const noot = [d.westside ? 'Westside: 50 mm hart op hart, in de bankzone (400-1000 mm boven de vloer) 25 mm; boren met de boormal.' : '', d.opm, 'Algemene toleranties ISO 2768-m; zaagsnede haaks ± 0,5°; ontbramen.'].filter(Boolean);
    for (const n of noot) for (const x of rij(n, 130)) { if (y > 168) break; el.push(tk(25, y + 2, x, 2, { kleur: '#333' })); y += 2.8; }
  } else {
    // plaat
    const l = d.l, b = d.bmaat, s = schaal(Math.min(150 / l, 95 / b)), k = s.k, x0 = 40, y0 = 45; schaalTekst = s.tekst;
    if (d.contour) { const c = d.contour, pad = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x0 + (x - c.minx) * k)},${f(y0 + (b - (y - c.miny)) * k)}`).join(' ') + ' Z'; el.push(`<path d="${pad(c.punten)} ${c.uitsparingen.map((u) => pad(u.punten)).join(' ')}" fill="#fff" fill-rule="evenodd" stroke="#111" stroke-width="0.5"/>`); }
    else if (d.rond) el.push(`<circle cx="${f(x0 + (l * k) / 2)}" cy="${f(y0 + (b * k) / 2)}" r="${f((l * k) / 2)}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
    else if (d.vorm === 'driehoek') el.push(`<polygon points="${f(x0)},${f(y0)} ${f(x0 + l * k)},${f(y0)} ${f(x0)},${f(y0 + b * k)}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
    else el.push(`<rect x="${x0}" y="${y0}" width="${f(l * k)}" height="${f(b * k)}" fill="#fff" stroke="#111" stroke-width="0.5" rx="${f(Math.min(2, 2.5 * k))}"/>`);
    for (const g of d.gaten) el.push(`<circle cx="${f(x0 + g.x * k)}" cy="${f(y0 + (b - g.y) * k)}" r="${f(Math.max(0.35, (g.d / 2) * k))}" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`);
    el.push(maat([x0, y0], [x0 + l * k, y0], -7, `${r0(l)}`), maat([x0, y0], [x0, y0 + b * k], 7, `${r0(b)}`));
    // ordinaatmaten: x vanaf de linkerrand (onder de plaat), y vanaf de onderrand (rechts van de plaat)
    const gx = [...new Set(d.gaten.map((g) => r0(g.x)))], gy = [...new Set(d.gaten.map((g) => r0(g.y)))];
    for (const v of gx) { const xx = x0 + v * k; el.push(lijn(xx, y0 - 1, xx, y0 + b * k + 3, 0.1, '#b42318', '2 0.6 0.4 0.6'), tk(xx + 0.55, y0 + b * k + 3.6, String(v), 1.5, { draai: -90, anker: 'end' })); }
    for (const v of gy) { const yy = y0 + (b - v) * k; el.push(lijn(x0 - 1, yy, x0 + l * k + 3, yy, 0.1, '#b42318', '2 0.6 0.4 0.6'), tk(x0 + l * k + 3.6, yy + 0.55, String(v), 1.5)); }
    if (d.gaten.length) el.push(tk(x0 + l * k + 3.6, y0 + b * k + 3.6, '0', 1.5), tk(x0, y0 + b * k + 3.6, '0', 1.5, { anker: 'middle' }));
    el.push(tk(x0, y0 - 10, `Plaat ${d.t} mm (schaal ${s.tekst})`, 2.4, { vet: true }));
    let y = y0 + b * k + 14;
    if (d.gaten.length) {
      y += 6; el.push(tk(25, y, 'Boortabel (x vanaf de linkerrand, y vanaf de onderrand, hart gat; door de plaat)', 2.5, { vet: true })); y += 2;
      const rows = d.gaten.slice(0, 14).map((g, i) => [String(i + 1), `Ø${gw(g.d)}${g.sleuf ? ` sleuf ${g.sleuf}` : ''}`, String(r0(g.x)), String(r0(g.y)), boorRijen(o, { ...d, gaten: [g] })[0].doel.slice(0, 34)]);
      const [t, h] = tabel(25, y, [['', 5, true], ['Ø', 18], ['x', 12, true], ['y', 12, true], ['Voor', 60]], rows, 3.4, 1.75); el.push(t); y += h + 2;
      if (d.gaten.length > 14) { el.push(tk(25, y + 1, `+ ${d.gaten.length - 14} gaten: zie de CSV`, 1.9, { kleur: '#b42318' })); y += 3; }
    }
    const pasN = d.gaten.some((g) => /Lageroor|Lagerhuis/.test(d.naam) && g.d >= 28) ? `Passing: gat Ø${d.gaten[0].d} H7 (buitenmaat flensglijlager), boren en ruimen of laseren + nadraaien.` : '';
    for (const n of [d.opm, pasN, d.contour ? `Vorm: vrije contour met afrondingen (${gw(d.contour.omtrek / 1000, 2)} m snijlijn${d.contour.uitsparingen.length ? `, ${d.contour.uitsparingen.length} uitsparing${d.contour.uitsparingen.length > 1 ? 'en' : ''}` : ''}); exacte vorm in de DXF (polylijn met bogen); gaten x/y vanaf de omhullende rechthoek.` : d.vorm === 'driehoek' ? `Vorm: rechthoekige driehoek, benen ${r0(l)} x ${r0(b)} mm (de twee maten hierboven), schuine zijde ${r0(Math.hypot(l, b))} mm; hoeken r 2.` : d.vorm ? `Vorm: ${d.vorm}; contour volgens de maten hierboven (DXF: export uit het model, AANNAME)` : '', 'Lasersnijden S235JR, braamvrij, randen r ≥ 2,5 waar het lichaam komt; ISO 2768-m.'].filter(Boolean)) for (const x of rij(n, 92)) { if (y > 170) break; el.push(tk(25, y + 2, x, 2, { kleur: '#333' })); y += 2.8; }
  }
  el.push(titelblok(o, A4L, { titel: `Pos ${p.pos}: ${p.naam}`, nr: `${nr(o, 'S')}${String(p.pos).padStart(2, '0')}`, schaal: schaalTekst, datum: datum(meta), blad: meta.blad ?? '', materiaal: p.mat ? p.mat.slice(0, 14) : 'S235', soort: 'stukblad' }));
  return svg(A4L, el.join(''));
}
export function stukBladen(o, meta = {}) {
  const sl = stuklijst(o);
  return sl.posities.map((p) => ({ pos: p.pos, naam: p.naam, n: p.n, svg: stukBlad(o, p, { ...meta, blad: `${p.pos} / ${sl.posities.length}` }) }));
}

// ---------------------------------------------------------------- lasdetails A3
export function lasBlad(o, meta = {}) {
  const el = [], sl = stuklijst(o);
  el.push(tk(25, 96, 'Lasvolgorde: eerst heften (4 hechtpunten per verbinding, 20 mm), haaksheid en diagonalen meten, dan symmetrisch aflassen van binnen naar buiten. Lasser gekwalificeerd volgens EN ISO 9606-1 (135, FW).', 2.1, { kleur: '#333' }));
  el.push(tk(25, 18, `Lasdetails (ISO 2553): ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, `Hoeklassen a${o.V.las} (MAG 135, G3Si1), kwaliteit ISO 5817-C; lassen glad slijpen waar het lichaam komt. Lasgroepen zijn per ondersamenstel; liggers met flenzen worden gebout.`, 2.2));
  // drie typische details met symbool
  const det = [
    { t: 'Koker op koker, haaks', a: o.V.las, rondom: true },
    { t: 'Koker op plaat (voet, flens)', a: o.V.las, rondom: true },
    { t: 'Plaat op koker (oor, beugel)', a: Math.max(3, o.V.las - 1), beide: true },
  ];
  det.forEach((d, i) => {
    const x = 32 + i * 72, y = 40;
    el.push(`<rect x="${x - 4}" y="${y - 6}" width="66" height="58" fill="#f7f8f9" stroke="#bbb" stroke-width="0.2"/>`, tk(x, y - 1, d.t, 2.4, { vet: true }));
    if (i === 0) el.push(`<rect x="${x + 6}" y="${y + 6}" width="12" height="40" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<rect x="${x + 18}" y="${y + 20}" width="30" height="12" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<polygon points="${x + 18},${y + 20} ${x + 21},${y + 20} ${x + 18},${y + 17}" fill="#e8590c"/>`, lasSymbool([x + 18.5, y + 19], [x + 24, y + 10], { a: d.a, rondom: true }));
    if (i === 1) el.push(`<rect x="${x + 4}" y="${y + 40}" width="50" height="5" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<rect x="${x + 22}" y="${y + 8}" width="12" height="32" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<polygon points="${x + 22},${y + 40} ${x + 19},${y + 40} ${x + 22},${y + 37}" fill="#e8590c"/>`, lasSymbool([x + 21.5, y + 39], [x + 36, y + 22], { a: d.a, rondom: true }));
    if (i === 2) el.push(`<rect x="${x + 4}" y="${y + 30}" width="50" height="12" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<rect x="${x + 26}" y="${y + 8}" width="4" height="22" fill="#fff" stroke="#111" stroke-width="0.4"/>`, `<polygon points="${x + 26},${y + 30} ${x + 23},${y + 30} ${x + 26},${y + 27}" fill="#e8590c"/>`, lasSymbool([x + 25.5, y + 29], [x + 34, y + 18], { a: d.a, beide: true }));
  });
  // tabel van de lassen, samengevat per paar posities
  const per = new Map();
  for (const l of o.lassen) {
    const pa = l.A.posNr ?? '?', pb = l.B.posNr ?? '?', [p1, p2] = [pa, pb].sort((a, b) => a - b), key = `${p1}|${p2}|${l.keel}|${l.soort}`;
    const x = per.get(key) ?? { p1, p2, n1: (p1 === pa ? l.A : l.B).naam, n2: (p1 === pa ? l.B : l.A).naam, keel: l.keel, soort: l.soort, rondom: l.rondom, n: 0, lengte: 0, groep: l.groep };
    x.n += 1; x.lengte += l.lengte; per.set(key, x);
  }
  const flare = (x) => { const A = o.lassen.find((l) => (l.A.posNr === x.p1 && l.B.posNr === x.p2) || (l.A.posNr === x.p2 && l.B.posNr === x.p1)); return A && A.A.P?.vorm === 'koker' && A.B.P?.vorm === 'koker' && (Math.abs(A.A.P.b - A.B.P.b) < 0.5 || Math.abs(A.A.P.h - A.B.P.h) < 0.5); };
  const rijen = [...per.values()].sort((a, b) => a.p1 - b.p1 || a.p2 - b.p2).map((x) => [`${x.p1} + ${x.p2}`, `${x.n1} / ${x.n2}`.slice(0, 64), x.soort === 'hoek2' ? `hoeklas a${x.keel} beide zijden` : flare(x) ? `a${x.keel} 2 zijden + halve V (flare) 2 zijden` : `hoeklas a${x.keel}${x.rondom ? ' rondom' : ''}`, String(x.n), `${r0(x.lengte / x.n)}`, `${gw(x.lengte / 1000, 2)}`, x.groep.slice(0, 26)]);
  const max = 38;
  const [t, h] = tabel(25, 104, [['Pos', 18], ['Stukken', 120], ['Las (ISO 2553)', 44], ['Aantal', 14, true], ['mm/las', 16, true], ['m totaal', 18, true], ['Lasgroep', 48]], rijen.slice(0, max), 3.75, 1.95);
  el.push(tk(25, 100, `Lassen (${o.lassen.length} verbindingen, ${gw(o.lassen.reduce((s, l) => s + l.lengte, 0) / 1000, 1)} m)`, 2.8, { vet: true }), t);
  if (rijen.length > max) el.push(tk(25, 104 + h + 4, `+ ${rijen.length - max} rijen in de CSV`, 2.2, { kleur: '#a00' }));
  // lasplan: isometrie met een merkteken op elke las (oranje), genummerd per paar posities
  const Pi = iso(-38, 24), geoL = alleGeo(o, false), [ix0, iy0, ix1, iy1] = omhullende(geoL, Pi), ik = Math.min(150 / (ix1 - ix0), 62 / (iy1 - iy0)), iox = 258 + (150 - (ix1 - ix0) * ik) / 2 - ix0 * ik, ioy = 32 + (62 - (iy1 - iy0) * ik) / 2 - iy0 * ik;
  el.push(`<rect x="254" y="28" width="158" height="70" fill="#fbfbfa" stroke="#bbb" stroke-width="0.2"/>`, tk(256, 26, `Lasplan: ${o.lassen.length} lassen (oranje = las, a = keelmaat)`, 2.4, { vet: true }), `<g opacity="0.6">${tekenBalken(geoL, { proj: Pi, schaal: ik, ox: iox, oy: ioy, lw: 0.12 }).svg}</g>`);
  for (const l of o.lassen) { if (!l.p) continue; const q = Pi(l.p); el.push(`<circle cx="${f(iox + q[0] * ik)}" cy="${f(ioy + q[1] * ik)}" r="0.9" fill="#e8590c" fill-opacity="0.85" stroke="#7a2e05" stroke-width="0.12"/>`); }
  void sl;
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: lasdetails`, nr: nr(o, 3), schaal: '-', datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- boringen A3
export function boorBlad(o, meta = {}) {
  const el = [], sl = stuklijst(o);
  el.push(tk(25, 18, `Boringen: ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, 'Gaten in kokers door beide wanden, haaks op het vlak; ontbramen. Laserdelen: gaten gelaserd (Ø ≥ plaatdikte).', 2.2));
  const rijen = [];
  for (const p of sl.posities) {
    if (!p.gaten.length) continue;
    for (const b of boorRijen(o, p.voorbeeld)) rijen.push([String(p.pos), p.naam.slice(0, 34), String(p.n), `Ø${gw(b.d)}`, String(b.pos.length), String(b.pos.length * p.n), b.vlak === 'plaat' ? 'gelaserd' : `vlak ${b.vlak}, ${b.wanden} wand${b.wanden > 1 ? 'en' : ''}`, b.doel.slice(0, 30)]);
  }
  const [t, h] = tabel(25, 30, [['Pos', 10, true], ['Stuk', 62], ['Stuks', 11, true], ['Ø', 13], ['Per stuk', 14, true], ['Totaal', 13, true], ['Hoe', 30], ['Voor', 52]], rijen.slice(0, 48), 3.9, 1.9);
  el.push(t);
  const tot = rijen.reduce((s, r) => s + +r[5], 0), fout = gatFouten(o);
  el.push(tk(25, 30 + h + 5, `Totaal ${tot} gaten.${rijen.length > 48 ? ` (+ ${rijen.length - 48} rijen in de CSV)` : ''}`, 2.4, { vet: true }));
  const regels = [`Gatcontrole: ${fout.length ? `${fout.length} fouten` : 'geen fouten'}. Getoetst: bout/pen en gat op dezelfde as (≤ 0,5 mm); speling bout +${SPELING.bout[0]}..+${SPELING.bout[1]} mm, pen +${SPELING.pen[0]}..+${SPELING.pen[1]} mm (ISO 273 fijn tot grof), lagerzitting ${SPELING.lager[0]}..+${SPELING.lager[1]} mm;`, 'randafstand ≥ 1,5 x Ø (EN 1993-1-8 tabel 3.3, e1/e2 ≥ 1,2 d0, hier strenger); niet in de hoekradius van de koker (2t, EN 10219-2); brug tussen twee gaten ≥ 6 mm; niet in de las (keel + 3 mm).', ...fout.slice(0, 4)];
  regels.forEach((x, i) => el.push(tk(25, 30 + h + 10 + i * 3, x, 2, { kleur: fout.length && i > 1 ? '#b42318' : '#333' })));
  // Westside-boormal
  const ws = o.delen.find((d) => d.westside);
  if (ws) {
    const x0 = 250, y0 = 40, k = Math.min(0.12, 195 / ws.L), gl = ws.gaten.filter((g) => g.d === ws.westside.d).map((g) => g.s);
    el.push(tk(x0, y0 - 6, `Westside-gatpatroon (boormal), schaal 1:${gw(1 / k, 1)}`, 2.6, { vet: true }));
    const L = ws.L * k;
    el.push(`<rect x="${x0}" y="${y0}" width="${f(ws.P.b * 0.25)}" height="${f(L)}" fill="#fff" stroke="#111" stroke-width="0.4"/>`);
    for (const s of gl) el.push(`<circle cx="${f(x0 + ws.P.b * 0.125)}" cy="${f(y0 + L - s * k)}" r="${f(Math.max(0.5, ws.westside.d * 0.06))}" fill="#fff" stroke="#b42318" stroke-width="0.25"/>`);
    const zb0 = 400 - ws.a[2], zb1 = 1000 - ws.a[2];
    el.push(maat([x0 + 30, y0 + L - zb1 * k], [x0 + 30, y0 + L - zb0 * k], -8, '25 hoh'), maat([x0 + 30, y0 + L - gl[0] * k], [x0 + 30, y0 + L - zb0 * k], -8, '50 hoh'), maat([x0 + 30, y0 + L], [x0 + 30, y0 + L - gl[0] * k], -16, `${r0(gl[0])}`));
    el.push(tk(x0 + 46, y0 + 10, `${gl.length} gaten Ø${ws.westside.d}`, 2.3), tk(x0 + 46, y0 + 14, `pen Ø${o.V.pin}`, 2.3), tk(x0 + 46, y0 + 18, 'bankzone 400-1000 mm', 2.3), tk(x0 + 46, y0 + 22, 'boven de vloer: 25 mm', 2.3));
  }
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: boringen`, nr: nr(o, 4), schaal: '-', datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- kabelschema A3
export function kabelBlad(o, meta = {}) {
  if (!o.kabels.length) return null;
  const el = [], geo = alleGeo(o, false).filter((g) => g.kleur !== 'kabel'), { B, D, H } = o.maten;
  const s = schaal(Math.min(150 / D, 210 / H, 150 / B)), k = s.k;
  el.push(tk(25, 18, `Kabelschema: ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, `Kabel ${KOOP[o.kabels[0].key].naam}; katrollen ${[...new Set(o.katrollen.map((x) => KOOP[x.key].naam))].join(', ')}. Schaal ${s.tekst}.`, 2.2));
  const views = [[PROJ.links, 30, 34, 'Zijaanzicht (van links)'], [PROJ.voor, 30 + D * k + 25, 34, 'Vooraanzicht']];
  const kleuren = ['#c2410c', '#2563a8', '#0f766e', '#7c3aed'];
  for (const [proj, x, y, titel] of views) {
    const v = aanzicht(geo, proj, k, x, y);
    el.push(`<g opacity="0.35">${v.svg}</g>`, tk(x, y - 3, titel, 2.4, { vet: true }));
    o.kabels.forEach((kb, i) => { const pts = kb.lijn.map((p) => v.naar(p)); el.push(`<polyline points="${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="none" stroke="${kleuren[i % 4]}" stroke-width="0.7"/>`); });
    o.katrollen.forEach((kt, i) => { const [a, b] = v.naar(kt.c); el.push(`<circle cx="${f(a)}" cy="${f(b)}" r="${f(Math.max(1.2, (kt.D / 2) * k))}" fill="none" stroke="#111" stroke-width="0.35"/>`, tk(a + 2.5, b - 2, String.fromCharCode(65 + i), 2.4, { vet: true, kleur: '#b42318' })); });
  }
  // tabellen
  const x0 = 250; let y = 34;
  const [t1, h1] = tabel(x0, y, [['', 6], ['Katrol', 56], ['Ø', 10, true], ['x', 12, true], ['y', 12, true], ['z', 12, true], ['Kap', 46]], o.katrollen.map((kt, i) => [String.fromCharCode(65 + i), kt.label.slice(0, 34), String(kt.D), String(r0(kt.c[0])), String(r0(kt.c[1])), String(r0(kt.c[2])), kt.c[2] < 1800 ? (kt.kapTekst ? 'bovenligger + beugel' : 'gezette plaat 2 mm') : 'boven 1800 mm']), 3.8, 1.9);
  el.push(tk(x0, y - 3, 'Katrollen (coördinaten in mm)', 2.5, { vet: true }), t1); y += h1 + 10;
  for (const [i, kb] of o.kabels.entries()) {
    el.push(`<rect x="${x0}" y="${y - 3}" width="6" height="1.4" fill="${kleuren[i % 4]}"/>`, tk(x0 + 8, y - 1.5, `${kb.naam}`, 2.5, { vet: true })); y += 3;
    const lijnen = [`Loop: ${kb.begin} → ${kb.route.filter((p) => p.katrol).map((p) => String.fromCharCode(65 + o.katrollen.findIndex((x) => x.id === p.katrol))).join(' → ')} → ${kb.einde}`, `Lengte ${gw(kb.L / 1000, 2)} m + 2 x 0,15 m voor de lussen (persklem op de kern, mantel strippen), Ø${kb.d} mm`, `Overbrenging ${kb.overbrenging}:1${kb.overbrenging === 2 ? ' (losse katrol op de stapel; greep: halve kracht, dubbele slag)' : ''}; slag stapel ${kb.slag ? `${kb.slag} mm` : '-'}, greep ${kb.slag ? `${kb.slag * kb.overbrenging} mm` : '-'}`, `Last aan de kabel: ${gw(kb.last, 0)} kg${kb.begin === 'stapel' || kb.begin === 'anker' ? ' (stapel)' : ' (schijven)'}`];
    for (const l of lijnen) for (const x of rij(l, 74)) { el.push(tk(x0, y + 1, x, 2)); y += 2.8; }
    y += 5;
  }
  for (const st of o.stapels) { el.push(tk(x0, y, `Gewichtstapel: ${st.n} x ${st.kg} kg + bovenplaat, geleidestangen Ø25 hart op hart ${st.hoh} mm, slag ${st.slag} mm`, 2)); y += 3; }
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: kabelschema`, nr: nr(o, 5), schaal: s.tekst, datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- bekleding A3
export function bekledingBlad(o, meta = {}) {
  if (!o.kussens.length) return null;
  const el = [], bk = stuklijst(o).bekleding;
  el.push(tk(25, 18, `Bekleding: ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, `Multiplex okoumé 18 mm, koudschuim RG40 50 mm (gelijmd, contactlijm), ${KOOP[o.V.leer].naam.toLowerCase()}, nietjes om de 25 mm, 4 inslagmoeren M8 per kussen.`, 2.2));
  // doorsnede
  const x = 30, y = 40;
  el.push(tk(x, y - 3, 'Doorsnede (schaal 1:2)', 2.5, { vet: true }));
  el.push(`<rect x="${x}" y="${y + 30}" width="100" height="9" fill="#f3ead9" stroke="#111" stroke-width="0.4"/>`, `<rect x="${x + 1}" y="${y + 5}" width="98" height="25" fill="#fdf7d7" stroke="#111" stroke-width="0.3" rx="3"/>`);
  el.push(`<path d="M ${x - 1} ${y + 41} L ${x - 1} ${y + 7} Q ${x - 1} ${y + 3.5} ${x + 3} ${y + 3.5} L ${x + 97} ${y + 3.5} Q ${x + 101} ${y + 3.5} ${x + 101} ${y + 7} L ${x + 101} ${y + 41} L ${x + 85} ${y + 41}" fill="none" stroke="#1b1c1e" stroke-width="0.8"/>`, `<path d="M ${x - 1} ${y + 41} L ${x + 15} ${y + 41}" fill="none" stroke="#1b1c1e" stroke-width="0.8"/>`);
  el.push(`<rect x="${x + 20}" y="${y + 33}" width="4" height="6" fill="#999"/>`, `<rect x="${x + 76}" y="${y + 33}" width="4" height="6" fill="#999"/>`);
  for (const [t, yy] of [['kunstleer (60 mm omgeslagen, nieten)', y + 3], ['koudschuim RG40 50 mm', y + 18], ['multiplex 18 mm', y + 35], ['inslagmoer M8', y + 46]]) el.push(lijn(x + 101, yy, x + 112, yy, 0.2), tk(x + 113, yy + 0.8, t, 2.1));
  const rijen = bk.map((b) => [String(b.nr), b.naam.slice(0, 26), `${b.L} x ${b.B} x ${b.dikte}`, `${b.mp.L} x ${b.mp.B} x 18`, `${b.schuim.L} x ${b.schuim.B} x ${b.schuim.t}`, `${b.leer.L} x ${b.leer.B}`, String(b.inslag)]);
  const [t, h] = tabel(25, 100, [['Nr', 8, true], ['Kussen', 52], ['Afgewerkt', 34], ['Multiplex', 30], ['Schuim (+3 rondom)', 36], ['Snijmaat leer', 32], ['M8', 10, true]], rijen, 4.4, 2.2);
  el.push(tk(25, 96, 'Kussens', 2.8, { vet: true }), t);
  let yy = 100 + h + 8;
  for (const l of ['Werkwijze: 1. multiplex zagen, hoeken r 10, kanten breken; 2. inslagmoeren op de gaten van de kussenplaat (mal); 3. schuim lijmen, 3 mm overmaat rondom, kanten afschuinen;', '4. leer opspannen: eerst het midden van elke zijde, dan naar de hoeken; hoeken plooien; nieten om de 25 mm; 5. overtollig leer wegsnijden, 6. op het frame met 4 x M8 x 30.', `Leer per toestel: ${gw(bk.reduce((s, b) => s + (b.leer.L * b.leer.B) / 1e6, 0), 2)} m² (rol 1,4 m breed).`]) for (const x2 of rij(l, 150)) { el.push(tk(25, yy, x2, 2.1)); yy += 3; }
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: bekleding`, nr: nr(o, 6), schaal: '1:2', datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- bestellijst met zaagplan en nesting A3
export function bestelBlad(o, meta = {}, inst = {}) {
  const el = [], sl = stuklijst(o), zp = zaagplan(o, sl), ns = nesting(o, sl), koopPrijs = inst.koopPrijs ?? {};
  el.push(tk(25, 18, `Bestellijst en zaagplan: ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, 'Staven van 6 m (zaagsnede 4 mm, eerst de langste); laserdelen per dikte op platen 3000 x 1500 (grove nesting); kooponderdelen met winkel.', 2.2));
  let y = 32; const bx = 25, bw = 200;
  for (const p of zp.profielen) {
    if (y > 150) { el.push(tk(bx, y, '… meer profielen in de CSV', 2, { kleur: '#a00' })); break; }
    el.push(tk(bx, y, `${p.naam} (${p.norm}): ${p.n} staaf${p.n > 1 ? 'en' : ''} van 6 m, nodig ${gw(p.nodig, 2)} m, ${gw(p.kg, 1)} kg`, 2.3, { vet: true })); y += 2;
    for (const st of p.staven.slice(0, 6)) {
      let x = bx; el.push(`<rect x="${bx}" y="${y}" width="${bw}" height="4" fill="#eee" stroke="#999" stroke-width="0.15"/>`);
      for (const s of st.stukken) { const w = (s.l / 6000) * bw; el.push(`<rect x="${f(x)}" y="${y}" width="${f(w)}" height="4" fill="#fff" stroke="#111" stroke-width="0.25"/>`); if (w > 6) el.push(tk(x + w / 2, y + 2.9, `${s.pos}: ${s.l}`, 1.7, { anker: 'middle' })); x += w + (4 / 6000) * bw; }
      el.push(tk(bx + bw + 2, y + 3, `rest ${r0(st.rest)}`, 1.7, { kleur: '#555' })); y += 5;
    }
    if (p.staven.length > 6) { el.push(tk(bx, y + 2, `+ ${p.staven.length - 6} staven`, 1.8)); y += 4; }
    y += 3;
  }
  // nesting
  let nx = 25, ny = Math.max(y + 4, 120); const sk = 0.019;
  el.push(tk(nx, ny, 'Laserdelen (grove nesting op 3000 x 1500)', 2.6, { vet: true })); ny += 3;
  for (const n of ns) {
    for (const [i, pl] of n.platen.entries()) {
      if (nx + 3000 * sk > 232) { nx = 25; ny += 1500 * sk + 9; }
      if (ny + 1500 * sk > 280) break;
      el.push(`<rect x="${f(nx)}" y="${f(ny)}" width="${f(3000 * sk)}" height="${f(1500 * sk)}" fill="#f4f4f4" stroke="#777" stroke-width="0.2"/>`);
      for (const s of pl.stukken) el.push(`<rect x="${f(nx + s.x * sk)}" y="${f(ny + s.y * sk)}" width="${f(Math.max(0.2, s.w * sk))}" height="${f(Math.max(0.2, s.h * sk))}" fill="#fff" stroke="#111" stroke-width="0.12"/>`);
      el.push(tk(nx, ny + 1500 * sk + 3, `${n.t} mm, plaat ${i + 1}/${n.platen.length}: ${gw(n.opp, 2)} m² (${r0(n.benut * 100)} %)`, 1.7));
      nx += 3000 * sk + 8;
    }
  }
  // kooponderdelen rechts
  const rijen = sl.koop.map((x) => [x.naam.slice(0, 44), `${gw(x.hoeveelheid, 2)} ${x.eenheid}`, x.winkel.slice(0, 24), `€ ${gw(koopPrijs[x.key] ?? x.prijs, 2)}`, `€ ${gw(x.bedrag, 2)}`, x.nagekeken ? '' : 'A']);
  const [t] = tabel(240, 32, [['Kooponderdeel', 72], ['Aantal', 18, true], ['Winkel', 40], ['Prijs', 16, true], ['Bedrag', 16, true], ['', 4]], rijen.slice(0, 50), 3.7, 1.75);
  el.push(tk(240, 29, 'Kooponderdelen (excl. btw; A = AANNAME, nakijken)', 2.5, { vet: true }), t);
  el.push(titelblok(o, A3, { titel: `${naamVan(o)}: bestellijst`, nr: nr(o, 7), schaal: '-', datum: datum(meta) }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- typeplaatje A4 (EN ISO 20957-1 §7)
export function typeplaatBlad(o, meta = {}) {
  const el = [], tp = o.typeplaat, w = 105, h = 74, x = 40, y = 40;
  el.push(tk(25, 18, `Typeplaatje en markering (EN ISO 20957-1): ${naamVan(o)}`, 3.4, { vet: true }), tk(25, 23, 'Aluminium 0,8 mm geanodiseerd, zwart bedrukt (of gegraveerd), 4 blindklinknagels Ø3 of 3M VHB; schaal 1:1.', 2.2));
  el.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#e9ecef" stroke="#111" stroke-width="0.5"/>`, `<rect x="${x}" y="${y}" width="${w}" height="12" rx="3" fill="#16181b"/>`);
  for (const [cx, cy] of [[x + 4, y + 16], [x + w - 4, y + 16], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) el.push(`<circle cx="${cx}" cy="${cy}" r="1.6" fill="#fff" stroke="#111" stroke-width="0.25"/>`);
  el.push(tk(x + 4, y + 8.5, `${o.id} ${o.naam}`.slice(0, 40), 3.6, { vet: true, kleur: '#fff' }));
  const regels = [['Fabrikant', '[naam en adres van de zaak invullen]'], ['Type / versie', `${o.id}-${o.versie === 'pro' ? 'P' : 'T'} · ${o.V.naam}`], ['Ontwerp', `ontworpen volgens EN ISO 20957 · klasse ${o.V.klasse}`], ['Status', 'PROTOTYPE: proeflast nodig'], ['Max. gebruiker', `${o.V.gebruiker} kg`], ['Max. trainingslast', o.maxLast ? `${o.maxLast} kg` : o.stapels.length ? `stapel ${o.stapels.map((s) => s.n * s.kg).join(' + ')} kg` : 'zie handleiding'], ['Serienummer / jaar', '__________ / 20__']];
  regels.forEach(([a, b], i) => el.push(tk(x + 10, y + 18 + i * 5.6, a, 2.1, { kleur: '#555' }), tk(x + 42, y + 18 + i * 5.6, b, 2.4, { vet: i > 0 && i < 6, kleur: /PROTOTYPE/.test(b) ? '#b42318' : undefined })));
  // waarschuwing (ISO 7010 W001) en de vrije zone
  el.push(`<polygon points="${x + 140},${y} ${x + 156},${y + 28} ${x + 124},${y + 28}" fill="#f5c400" stroke="#111" stroke-width="0.8"/>`, tk(x + 140, y + 24, '!', 14, { vet: true, anker: 'middle' }));
  const wa = ['Lees de handleiding vóór gebruik.', 'Laat kinderen niet zonder toezicht bij het toestel.', 'Vrije zone van 0,6 m rondom het trainingsgebied.', 'Controleer voor elk gebruik pennen, kabels en bouten.', o.V.klasse === 'H' ? 'Klasse H: alleen voor thuisgebruik.' : 'Klasse S: professioneel gebruik, onderhoud volgens schema.'];
  wa.forEach((t, i) => el.push(tk(x + 124, y + 38 + i * 4.4, t, 2.3)));
  el.push(tk(25, y + h + 16, 'Plaats op het toestel', 2.6, { vet: true }), tk(25, y + h + 21, tp ? `Op ${tp.deel.naam.toLowerCase()}, buitenkant, hart op ${Math.round(tp.c[2])} mm boven de vloer (in de 3D zichtbaar). Formaat op het toestel ${Math.round(tp.w)} x ${Math.round(tp.h)} mm (verkleind ontwerp van dit blad).` : 'Op de grootste staander, buitenkant, op ooghoogte.', 2.2));
  el.push(tk(25, y + h + 33, 'Geen normclaim tot de proef gedaan is: "ontworpen volgens" (geen conformiteitsverklaring). Na de proeflast en het meetrapport (zie het technisch dossier) mag de status weg.', 2.2, { kleur: '#b42318' }));
  el.push(tk(25, y + h + 27, 'Bijkomende markering: waarschuwingssticker bij elke klempunt (kabel, katrol, hefboom) en een sticker met de pen-instructie bij elke J-hook en safety.', 2.2));
  el.push(titelblok(o, A4L, { titel: `${naamVan(o)}: typeplaatje`, nr: nr(o, 8), schaal: '1:1', datum: datum(meta) }));
  return svg(A4L, el.join(''));
}

// ---------------------------------------------------------------- lassamenstelling per lasgroep A3 (P1-13)
/** per lasgroep een samenstellingsblad: vooraanzicht en zijaanzicht van alleen die groep, positienummers (ISO 6433),
 *  plaatsmaten van elk stuk vanaf de referentie R (laagste hoek van de groep), diagonaal voor de haaksheid,
 *  lassymbool op elke las en de eis voor de gatenrijen L/R. */
export function samenstellingBladen(o, meta = {}) {
  const sl = stuklijst(o), uit = [];
  const groepen = [...new Set(o.lassen.map((l) => l.groep))].map((g) => ({ g, delen: o.delen.filter((d) => d.groep === g && d.kleur !== 'kap' && !d.stapel), lassen: o.lassen.filter((l) => l.groep === g) })).filter((x) => x.delen.length >= 2 && x.lassen.length >= 1).map((x) => ({ ...x, maat: Math.hypot(...[0, 1, 2].map((j) => Math.max(...x.delen.map((d) => aabb(d.geo[0])[1][j])) - Math.min(...x.delen.map((d) => aabb(d.geo[0])[0][j])))) })).sort((a, b) => b.maat - a.maat);
  for (const [i, G] of groepen.entries()) {
    const el = [], geo = G.delen.flatMap((d) => d.geo), mn = [0, 1, 2].map((j) => Math.min(...geo.map((g) => aabbMn(g)[j]))), mx = [0, 1, 2].map((j) => Math.max(...geo.map((g) => aabbMx(g)[j])));
    const B = mx[0] - mn[0], D = mx[1] - mn[1], H = mx[2] - mn[2], s = schaal(Math.min(165 / Math.max(B, 1), 150 / Math.max(H, 1), 120 / Math.max(D, 1))), k = s.k;
    const voor = aanzicht(geo, PROJ.voor, k, 35, 40), links = aanzicht(geo, PROJ.links, k, 35 + B * k + 30, 40);
    el.push(tk(25, 18, `Lassamenstelling ${i + 1}: ${G.g} (${naamVan(o)})`, 3.4, { vet: true }), tk(25, 23, `${G.delen.length} stukken, ${G.lassen.length} lassen; plaatsmaten vanaf R = laagste hoek van de groep (x links, y voor, z onder). Schaal ${s.tekst}.`, 2.2));
    el.push(voor.svg, links.svg, tk(35, 37, 'Vooraanzicht', 2.4, { vet: true }), tk(35 + B * k + 30, 37, 'Linkerzijaanzicht', 2.4, { vet: true }));
    // referentie en hoofdmaten, diagonaal
    const R = voor.naar(mn), Rx = voor.naar([mx[0], mn[1], mn[2]]), Rz = voor.naar([mn[0], mn[1], mx[2]]);
    el.push(`<circle cx="${f(R[0])}" cy="${f(R[1])}" r="1.4" fill="none" stroke="#b42318" stroke-width="0.3"/>`, tk(R[0] - 4, R[1] + 4, 'R', 2.6, { vet: true, kleur: '#b42318' }));
    el.push(maat([R[0], R[1]], [Rx[0], Rx[1]], 8, `${r0(B)}`), maat([R[0], R[1]], [Rz[0], Rz[1]], -8, `${r0(H)}`));
    const L1 = links.naar([mx[0], mx[1], mn[2]]), L2 = links.naar([mx[0], mn[1], mn[2]]); el.push(maat([L1[0], L1[1]], [L2[0], L2[1]], 8, `${r0(D)}`));
    el.push(lijn(R[0], R[1], Rx[0], Rz[1], 0.15, '#2563a8', '3 1'), tk((R[0] + Rx[0]) / 2 + 2, (R[1] + Rz[1]) / 2, `diagonaal ${r0(Math.hypot(B, H))} ± 1`, 2, { kleur: '#2563a8' }));
    // positienummers (ballonnen) en lassymbolen
    const posVan = (d) => sl.posities.find((p) => p.voorbeeld === d || p.delen?.includes?.(d))?.pos ?? d.posNr ?? '?';
    G.delen.forEach((d, j) => { const c = voor.naar(mul(add(d.geo[0].a, d.geo[0].b), 0.5)), bx = c[0] + 8 + (j % 3) * 3, by = c[1] - 6 - (j % 4) * 2.5; el.push(lijn(c[0], c[1], bx, by, 0.15), `<circle cx="${f(bx)}" cy="${f(by)}" r="2.6" fill="#fff" stroke="#111" stroke-width="0.25"/>`, tk(bx, by + 0.9, String(d.posNr ?? posVan(d)), 2.2, { anker: 'middle', vet: true })); });
    const isFlare = (l) => l.A.P?.vorm === 'koker' && l.B.P?.vorm === 'koker' && (Math.abs(l.A.P.b - l.B.P.b) < 0.5 || Math.abs(l.A.P.h - l.B.P.h) < 0.5);
    G.lassen.slice(0, 18).forEach((l) => { if (!l.p) return; const q = voor.naar(l.p); el.push(isFlare(l) ? lasSymboolFlare([q[0], q[1]], [q[0] + 9, q[1] - 7], { a: l.keel }) : lasSymbool([q[0], q[1]], [q[0] + 9, q[1] - 7], { a: l.keel, rondom: l.rondom, beide: l.soort === 'hoek2' })); });
    if (G.lassen.some(isFlare)) { el.push(tk(255, 250, 'Legende:', 2, { vet: true }), lasSymboolFlare([258, 262], [265, 256], { a: o.V.las }), tk(296, 257, 'halve V met gebogen flank (flare) op de 2 zijden waar de kokerhoeken samenkomen + hoeklas op de 2 andere zijden', 1.8)); }
    // tabel met plaatsmaten
    const rijen = G.delen.slice(0, 26).map((d) => { const a0 = aabbMn(d.geo[0]); return [String(d.posNr ?? posVan(d)), d.naam.slice(0, 34), d.soort === 'staaf' ? d.P.naam.slice(0, 18) : `plaat ${d.t}`, String(r0(a0[0] - mn[0])), String(r0(a0[1] - mn[1])), String(r0(a0[2] - mn[2])), d.soort === 'staaf' ? String(r0(d.L)) : `${r0(d.l)} x ${r0(d.bmaat)}`]; });
    const [t] = tabel(255, 40, [['Pos', 9, true], ['Stuk', 60], ['Profiel', 30], ['x', 11, true], ['y', 11, true], ['z', 11, true], ['L of maat', 22]], rijen, 3.6, 1.8);
    el.push(tk(255, 37, 'Plaatsmaten (laagste hoek van elk stuk t.o.v. R, mm)', 2.4, { vet: true }), t);
    el.push(tk(255, 40 + (rijen.length + 1) * 3.6 + 5, 'Gatenrijen L en R: evenwijdig ± 0,5 mm over de hele lengte, op dezelfde hoogte ± 0,5 mm (meten na het lassen).', 2, { kleur: '#333' }), tk(255, 40 + (rijen.length + 1) * 3.6 + 8, 'Haaksheid: diagonalen gelijk ± 1 mm; lassen volgens het lasblad (a, ISO 5817-C).', 2, { kleur: '#333' }));
    el.push(titelblok(o, A3, { titel: `${naamVan(o)}: lassamenstelling ${G.g}`.slice(0, 70), nr: nr(o, `L${i + 1}`), schaal: s.tekst, datum: datum(meta), soort: 'lassamenstelling' }));
    uit.push({ id: `samenstelling-${i + 1}`, titel: `Lassamenstelling: ${G.g}`, svg: svg(A3, el.join('')) });
  }
  return uit;
}
const aabbMn = (g) => aabb(g)[0];
const aabbMx = (g) => aabb(g)[1];

/** alle bladen: [{ id, titel, svg }] */
export function alleBladen(o, meta = {}, inst = {}) {
  const uit = [
    { id: 'overzicht', titel: 'Overzicht A3', svg: overzicht(o, meta) },
    { id: 'stuklijst', titel: 'Stuklijst', svg: stuklijstBlad(o, meta) },
    { id: 'lassen', titel: 'Lasdetails', svg: lasBlad(o, meta) },
    { id: 'boringen', titel: 'Boringen', svg: boorBlad(o, meta) },
    { id: 'kabel', titel: 'Kabelschema', svg: kabelBlad(o, meta) },
    { id: 'bekleding', titel: 'Bekleding', svg: bekledingBlad(o, meta) },
    { id: 'bestellijst', titel: 'Bestellijst en zaagplan', svg: bestelBlad(o, meta, inst) },
    { id: 'typeplaat', titel: 'Typeplaatje', svg: typeplaatBlad(o, meta) },
    ...samenstellingBladen(o, meta),
  ].filter((b) => b.svg);
  return uit;
}
export { esc };
