// Alle werkplaatsbladen van een fitnesstoestel (SVG, mm): overzicht A3 in eerste hoekprojectie met de hoofdmaten,
// stuklijst (ISO 7573), lasdetails (ISO 2553), boringen, kabelschema (kabelmachines), bekledingsblad (kussens),
// bestellijst met zaagplan op 6 m en plaatnesting, en een A4 per stuk. Node en browser.
import { svg, A3, A4L, lijn, tk, maat, tabel, titelblok, schaal, rij, lasSymbool, f, naamVan, versieTekst, esc } from './blad.mjs';
import { tekenBalken, omhullende, alleGeo, PROJ, iso } from './aanzicht.mjs';
import { stuklijst, zaagplan, nesting, totalen } from './stuklijst.mjs';
import { KOOP } from './onderdelen.mjs';
import { lengteStuk } from './model.mjs';

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
  const el = [], d = p.voorbeeld;
  el.push(tk(25, 18, `Pos ${p.pos}: ${p.naam}`, 4, { vet: true }), tk(25, 24, `${p.n} stuk${p.n > 1 ? 's' : ''} · ${p.maat} · ${p.mat}${p.L ? ` · L = ${p.L} mm` : ''}${p.zaagT ? ` · ${p.zaagT}` : ''} · ${gw(p.kg, 2)} kg/st`, 2.6));
  if (p.soort === 'staaf') {
    const P = d.P, L = lengteStuk(d), s = schaal(Math.min(200 / L, 40 / Math.max(P.b, P.h))), k = s.k, x0 = 35;
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
      // gatmaten: weinig gaten = maatketen vanaf A; veel gaten = lijst
      const pos = [...new Set(gaten.map((g) => g.s))].sort((a, b) => a - b);
      if (pos.length && pos.length <= 8) pos.forEach((sp, i) => el.push(maat([x0, v.y + hh], [x0 + sp * k, v.y + hh], 5 + i * 4.2, `${r0(sp)}`, 2.1)));
      else if (pos.length) el.push(tk(x0, v.y + hh + 6, `${pos.length} gaten Ø${gaten[0].d}: zie de gatenlijst`, 2.1, { kleur: '#b42318' }));
      el.push(tk(x0 - 6, v.y + hh / 2 + 1, 'A', 2.6, { vet: true }));
    }
    // doorsnede
    const dx = 252, dy = 50, dk = Math.min(1, 28 / Math.max(P.b, P.h));
    el.push(tk(dx - 4, dy - 8, `Doorsnede (${dk >= 1 ? '1:1' : `1:${gw(1 / dk, 1)}`})`, 2.2, { vet: true }));
    if (P.vorm === 'buis' || P.vorm === 'rond') el.push(`<circle cx="${dx + 14}" cy="${dy + 14}" r="${f((P.b / 2) * dk)}" fill="#ddd" stroke="#111" stroke-width="0.4"/>`, P.vorm === 'buis' ? `<circle cx="${dx + 14}" cy="${dy + 14}" r="${f((P.b / 2 - P.t) * dk)}" fill="#fff" stroke="#111" stroke-width="0.3"/>` : '');
    else el.push(`<rect x="${f(dx + 14 - (P.b / 2) * dk)}" y="${f(dy + 14 - (P.h / 2) * dk)}" width="${f(P.b * dk)}" height="${f(P.h * dk)}" fill="#ddd" stroke="#111" stroke-width="0.4"/>`, P.vorm === 'koker' ? `<rect x="${f(dx + 14 - (P.b / 2 - P.t) * dk)}" y="${f(dy + 14 - (P.h / 2 - P.t) * dk)}" width="${f((P.b - 2 * P.t) * dk)}" height="${f((P.h - 2 * P.t) * dk)}" fill="#fff" stroke="#111" stroke-width="0.3"/>` : '');
    el.push(tk(dx - 4, dy + 34, P.naam, 2.1), tk(dx - 4, dy + 37.5, P.norm, 1.8, { kleur: '#555' }));
    // gatenlijst
    let y = 150; const gl = d.gaten.length ? groepGaten(d.gaten) : [];
    if (gl.length) { el.push(tk(25, y, 'Gatenlijst (vanaf uiteinde A, hart gat)', 2.5, { vet: true })); y += 4; for (const l of gl) for (const x of rij(l, 120)) { if (y > 168) break; el.push(tk(25, y, x, 2)); y += 2.8; } }
    const noot = [d.westside ? 'Westside: 50 mm hart op hart, in de bankzone (400-1000 mm boven de vloer) 25 mm; boren met de boormal.' : '', d.opm, 'Algemene toleranties ISO 2768-m; zaagsnede haaks ± 0,5°; ontbramen.'].filter(Boolean);
    for (const n of noot) for (const x of rij(n, 92)) { if (y > 196) break; el.push(tk(25, y + 2, x, 2, { kleur: '#333' })); y += 2.8; }
  } else {
    // plaat
    const l = d.l, b = d.bmaat, s = schaal(Math.min(150 / l, 95 / b)), k = s.k, x0 = 40, y0 = 45;
    if (d.rond) el.push(`<circle cx="${f(x0 + (l * k) / 2)}" cy="${f(y0 + (b * k) / 2)}" r="${f((l * k) / 2)}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
    else if (d.vorm === 'driehoek') el.push(`<polygon points="${f(x0)},${f(y0)} ${f(x0 + l * k)},${f(y0)} ${f(x0)},${f(y0 + b * k)}" fill="#fff" stroke="#111" stroke-width="0.5"/>`);
    else el.push(`<rect x="${x0}" y="${y0}" width="${f(l * k)}" height="${f(b * k)}" fill="#fff" stroke="#111" stroke-width="0.5" rx="${f(Math.min(2, 2.5 * k))}"/>`);
    for (const g of d.gaten) el.push(`<circle cx="${f(x0 + g.x * k)}" cy="${f(y0 + (b - g.y) * k)}" r="${f(Math.max(0.35, (g.d / 2) * k))}" fill="#fff" stroke="#b42318" stroke-width="0.3"/>`);
    el.push(maat([x0, y0], [x0 + l * k, y0], -7, `${r0(l)}`), maat([x0, y0], [x0, y0 + b * k], 7, `${r0(b)}`));
    el.push(tk(x0, y0 - 10, `Plaat ${d.t} mm (schaal ${s.tekst})`, 2.4, { vet: true }));
    let y = y0 + b * k + 14;
    if (d.gaten.length) { el.push(tk(25, y, 'Gaten (x vanaf links, y vanaf onder)', 2.5, { vet: true })); y += 4; for (const g of d.gaten.slice(0, 16)) { el.push(tk(25, y, `Ø${gw(g.d)}: x = ${r0(g.x)}, y = ${r0(g.y)}`, 2.1)); y += 2.8; } }
    for (const n of [d.opm, d.vorm ? `Vorm: ${d.vorm} (DXF uit de tekening)` : '', 'Lasersnijden S235JR, braamvrij, randen r ≥ 2,5 waar het lichaam komt; ISO 2768-m.'].filter(Boolean)) for (const x of rij(n, 92)) { if (y > 170) break; el.push(tk(25, y + 2, x, 2, { kleur: '#333' })); y += 2.8; }
  }
  el.push(titelblok(o, A4L, { titel: `Pos ${p.pos}: ${p.naam}`, nr: `${nr(o, 'S')}${String(p.pos).padStart(2, '0')}`, schaal: '-', datum: datum(meta), blad: meta.blad ?? '' }));
  return svg(A4L, el.join(''));
}
/** gaten samenvatten: per richting en diameter de posities */
function groepGaten(gaten) {
  const per = new Map();
  for (const g of gaten) { const k = `${g.as}|${g.d}`; if (!per.has(k)) per.set(k, []); per.get(k).push(g.s); }
  return [...per.entries()].map(([k, s]) => { const [as, d] = k.split('|'); s.sort((a, b) => a - b); return `${s.length} x Ø${d} ${as === 'w' ? '(aanzicht A)' : '(aanzicht B)'} op ${s.map((x) => r0(x)).join(', ')}`; });
}
export function stukBladen(o, meta = {}) {
  const sl = stuklijst(o);
  return sl.posities.map((p) => ({ pos: p.pos, naam: p.naam, n: p.n, svg: stukBlad(o, p, { ...meta, blad: `${p.pos} / ${sl.posities.length}` }) }));
}

// ---------------------------------------------------------------- lasdetails A3
export function lasBlad(o, meta = {}) {
  const el = [], sl = stuklijst(o);
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
  const rijen = [...per.values()].sort((a, b) => a.p1 - b.p1 || a.p2 - b.p2).map((x) => [`${x.p1} + ${x.p2}`, `${x.n1} / ${x.n2}`.slice(0, 64), x.soort === 'hoek2' ? `hoeklas a${x.keel} beide zijden` : `hoeklas a${x.keel}${x.rondom ? ' rondom' : ''}`, String(x.n), `${r0(x.lengte / x.n)}`, `${gw(x.lengte / 1000, 2)}`, x.groep.slice(0, 26)]);
  const max = 38;
  const [t, h] = tabel(25, 104, [['Pos', 18], ['Stukken', 120], ['Las (ISO 2553)', 44], ['Aantal', 14, true], ['mm/las', 16, true], ['m totaal', 18, true], ['Lasgroep', 48]], rijen.slice(0, max), 3.75, 1.95);
  el.push(tk(25, 100, `Lassen (${o.lassen.length} verbindingen, ${gw(o.lassen.reduce((s, l) => s + l.lengte, 0) / 1000, 1)} m)`, 2.8, { vet: true }), t);
  if (rijen.length > max) el.push(tk(25, 104 + h + 4, `+ ${rijen.length - max} rijen in de CSV`, 2.2, { kleur: '#a00' }));
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
    const per = new Map(); for (const g of p.gaten) { const k = `${g.d}|${g.as ?? 'plaat'}`; per.set(k, (per.get(k) ?? 0) + 1); }
    for (const [k, n] of per) { const [d, as] = k.split('|'); rijen.push([String(p.pos), p.naam.slice(0, 40), String(p.n), `Ø${d}`, String(n), String(n * p.n), as === 'plaat' ? 'gelaserd' : p.voorbeeld.westside && +d === o.V.gat ? 'Westside, boormal' : as === 'w' ? 'aanzicht A, 2 wanden' : 'aanzicht B, 2 wanden']); }
  }
  const [t, h] = tabel(25, 30, [['Pos', 12, true], ['Stuk', 80], ['Stuks', 14, true], ['Ø', 16], ['Per stuk', 18, true], ['Totaal', 16, true], ['Hoe', 50]], rijen.slice(0, 50), 3.9, 2);
  el.push(t);
  const tot = rijen.reduce((s, r) => s + +r[5], 0);
  el.push(tk(25, 30 + h + 5, `Totaal ${tot} gaten.`, 2.4, { vet: true }));
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
  ].filter((b) => b.svg);
  return uit;
}
export { esc };
