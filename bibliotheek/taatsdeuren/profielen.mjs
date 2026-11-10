// De deurprofielen zichtbaar: de doorsnede van elk profiel (kozijn, vleugel, roede, glaslat) als wanden, met de sponning
// voor het glas, de isolatiezone bij een geïsoleerd profiel, het glas en de glaslat; en een blad A3 "Deurprofielen en
// verbindingen" met per profiel de doorsnede, het artikel en de posities, en hoe de stukken samenkomen (verstek 45° rood,
// roede stomp tegen het kader, kozijn onder recht op de vloer). Doorsneden van koopprofielen zijn vereenvoudigd (de echte
// vorm staat in de catalogus); maten zicht x diepte, wand en isolatie komen uit de catalogi. Werkt in Node en browser.
import { STAAF } from './prijzen.mjs';
import { MATEN } from './deuren.mjs';
import { stuklijst } from './stuklijst.mjs';
import { W, H, T, L, g, titelblok, esc } from './blad.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
const ARC = '<defs><pattern id="arcering" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="1.6" stroke="#111" stroke-width="0.18"/></pattern></defs>';

/**
 * de doorsnede van een rol in deze deur: { rol, prof, naam, V (zicht), D (diepte), t, wanden: [{ v0, v1, z0, z1, iso }],
 * sponning: { a, b, zijden } } in mm; v = over de zichtbreedte (0 = buitenkant, V = glaskant), z = over de diepte (0 = voor)
 */
export function sectie(o, rol) {
  const sys = o.sys, deel = rol === 'glaslat' ? { staaf: sys.glaslat.staaf } : sys[rol], prof = deel.staaf, st = STAAF[prof] ?? {}, naam = st.naam ?? prof;
  const gd = o.glasDikte ?? 8.8;
  // profiel met eigen wanden (het systeem op maat): de doorsnede zoals ze in het aanvraagdossier staat
  if (st.wanden) return { rol, prof, naam, V: st.zicht, D: st.diepte, t: st.wand ?? 0, wanden: st.wanden.map(([v0, v1, z0, z1]) => ({ v0, v1, z0, z1, rubber: !!st.rubber })), sleuf: st.sleuf, gaten: st.gaten ?? [], koop: true, artikel: st.artikel, inloop: o.sys.inloop };
  if (rol === 'glaslat' && st.L) {
    // L-profiel: het lange been (a) ligt tegen de koker in de diepte, het korte (b) over de rand van het glas
    const [a, b, t] = st.L;
    return { rol, prof, naam, V: b, D: a, t, wanden: [{ v0: 0, v1: t, z0: 0, z1: a }, { v0: 0, v1: b, z0: a - t, z1: a }], koop: true, artikel: st.artikel };
  }
  if (rol === 'glaslat') {
    const m = naam.match(/(\d+)\s*x\s*(\d+)/), [a, b] = m ? [+m[1], +m[2]] : [15, 4];
    return { rol, prof, naam, V: Math.max(a, b), D: Math.min(a, b), t: 0, wanden: [{ v0: 0, v1: Math.max(a, b), z0: 0, z1: Math.min(a, b) }], massief: true };
  }
  const V = deel.zicht, D = deel.diepte;
  if (!st.koop) {
    // eigen staven: koker AxBxT (hol) of platstaal (massief)
    let m;
    if ((m = naam.match(/koker (\d+)x(\d+)x(\d+)/))) { const t = +m[3], Dk = rol === 'roede' && sys.roede.lat ? D - 6 : D; return { rol, prof, naam, V: rol === 'roede' && sys.roede.lat ? 20 : V, D: Dk, t, wanden: doos(rol === 'roede' && sys.roede.lat ? 20 : V, Dk, t) }; }
    if ((m = naam.match(/platstaal (\d+)x(\d+)/))) { const [a, b] = [+m[1], +m[2]], vv = Math.min(a, rol === 'roede' && sys.roede.lat ? 20 : V), dd = a === vv ? b : a; return { rol, prof, naam, V: vv, D: dd, t: 0, wanden: [{ v0: 0, v1: vv, z0: 0, z1: dd }], massief: true, lat: rol === 'roede' ? sys.roede.lat : null }; }
    return { rol, prof, naam, V, D, t: 0, wanden: [{ v0: 0, v1: V, z0: 0, z1: D }], massief: true };
  }
  // aluminium koker (geschroefd): holle doos, het glas in het midden tussen twee L-profielen (voor en achter)
  if (st.alu) return { rol, prof, naam, V, D, t: st.wand ?? 2, wanden: doos(V, D, st.wand ?? 2), sponning: null, latten: rol === 'kozijn' ? 0 : rol === 'roede' ? 2 : 1, koop: true, alu: true, artikel: st.artikel };
  // koopprofiel: holle wand (1,5) met een sponning voor het glas aan de glaskant (vleugel één kant, roede beide kanten);
  // het kozijn van een taatsdeur is een holle doos (een pivot heeft geen aanslag nodig)
  const t = st.wand ?? 1.5, a = Math.max(t * 3, D / 2 - gd / 2 - 3);
  const b = rol === 'roede' ? Math.max(8, Math.min(20, (V - 12) / 2)) : Math.min(20, V / 2);
  let wanden;
  if (rol === 'kozijn') wanden = doos(V, D, t);
  else if (rol === 'roede') wanden = [
    { v0: 0, v1: V, z0: 0, z1: t }, { v0: 0, v1: t, z0: t, z1: a }, { v0: V - t, v1: V, z0: t, z1: a },
    { v0: 0, v1: b + t, z0: a - t, z1: a }, { v0: V - b - t, v1: V, z0: a - t, z1: a },
    { v0: b, v1: b + t, z0: a, z1: D - t }, { v0: V - b - t, v1: V - b, z0: a, z1: D - t }, { v0: b, v1: V - b, z0: D - t, z1: D },
  ];
  else wanden = [
    { v0: 0, v1: V, z0: 0, z1: t }, { v0: V - t, v1: V, z0: t, z1: a }, { v0: V - b - t, v1: V, z0: a - t, z1: a },
    { v0: V - b - t, v1: V - b, z0: a, z1: D - t }, { v0: 0, v1: V - b, z0: D - t, z1: D }, { v0: 0, v1: t, z0: t, z1: D - t },
  ];
  if (st.iso) wanden = isoleer(wanden, st.iso, t);
  return { rol, prof, naam, V, D, t, wanden, sponning: rol === 'kozijn' ? null : { a, b, zijden: rol === 'roede' ? 2 : 1 }, iso: st.iso, koop: true, artikel: st.artikel };
}
const doos = (V, D, t) => [{ v0: 0, v1: V, z0: 0, z1: t }, { v0: 0, v1: V, z0: D - t, z1: D }, { v0: 0, v1: t, z0: t, z1: D - t }, { v0: V - t, v1: V, z0: t, z1: D - t }];
/** geïsoleerd: de wanden die de isolatiezone [i0, i1] kruisen worden onderbroken; daar komt een isolatiestrook (kunststof), en
 * elke stalen schaal wordt dichtgemaakt met een wand op i0 en op i1 */
function isoleer(wanden, [i0, i1], t) {
  const uit = [];
  for (const w of wanden) {
    if (w.z1 <= i0 || w.z0 >= i1) { uit.push(w); continue; }
    if (w.z0 < i0) uit.push({ ...w, z1: i0 });
    if (w.z1 > i1) uit.push({ ...w, z0: i1 });
    uit.push({ v0: w.v0, v1: Math.max(w.v1, w.v0 + 3), z0: Math.max(w.z0, i0), z1: Math.min(w.z1, i1), iso: true });
  }
  // schaal dicht: over de breedte die er op die diepte is
  const breed = (z) => { const r = wanden.filter((w) => w.z0 <= z && w.z1 >= z); return [Math.min(...r.map((w) => w.v0)), Math.max(...r.map((w) => w.v1))]; };
  for (const [z0, z1] of [[i0 - t, i0], [i1, i1 + t]]) { const [v0, v1] = breed((z0 + z1) / 2); if (Number.isFinite(v0)) uit.push({ v0, v1, z0, z1 }); }
  return uit;
}

/** de doorsnede tekenen: v naar rechts, z naar beneden (voor boven), schaal s (mm papier per mm); met glas en glaslat */
export function tekenSectie(sec, x, y, s, { glas = true, maten = true, o = null, h = 2.3 } = {}) {
  const el = [], R = (v0, z0, w, d, vul, sw = 0.25) => `<rect x="${f(x + v0 * s)}" y="${f(y + z0 * s)}" width="${f(w * s)}" height="${f(d * s)}" fill="${vul}" stroke="#111" stroke-width="${sw}"/>`;
  const gd = o?.glasDikte ?? 8.8, dub = o?.opbouw === 'dubbel';
  // glas in de gleuf van het profiel (systeem op maat), met het U-rubber rond de rand
  if (glas && sec.sleuf) {
    const zc = (sec.sleuf.z0 + sec.sleuf.z1) / 2, inl = sec.inloop ?? 10;
    for (const k of sec.sleuf.kanten) {
      const v0 = k > 0 ? sec.V - inl : -14, v1 = k > 0 ? sec.V + 14 : inl;
      el.push(R(k > 0 ? sec.V - sec.sleuf.diep : 0, sec.sleuf.z0, sec.sleuf.diep, sec.sleuf.z1 - sec.sleuf.z0, '#3a3d40', 0.15));
      el.push(R(v0, zc - gd / 2, v1 - v0, gd, '#d6e4e9', 0.2));
    }
  }
  // glas en glaslat (lichtgrijs) achter het profiel
  if (glas && !sec.sleuf && sec.rol !== 'glaslat' && sec.rol !== 'kozijn') {
    const zg = sec.sponning ? sec.sponning.a + 3 : sec.D / 2 - gd / 2, lijn = (v0, v1) => {
      el.push(R(v0, zg, v1 - v0, gd, '#d6e4e9', 0.2));
      if (dub) el.push(R(v0, zg + 8.8, v1 - v0, 14, '#eef2f3', 0.15), R(v0 + (v1 > v0 ? 0 : 0), zg + 8.8, 0.01, 14, 'none', 0.15));
    };
    if (sec.sponning) {
      const { b } = sec.sponning, inl = MATEN.inloop;
      lijn(sec.V - inl, sec.V + 14);
      el.push(R(sec.V - b, zg + gd + 3, b, Math.min(15, sec.D - (zg + gd + 3)), '#9aa0a5', 0.2));
      if (sec.sponning.zijden === 2) { lijn(-14, inl); el.push(R(0, zg + gd + 3, b, Math.min(15, sec.D - (zg + gd + 3)), '#9aa0a5', 0.2)); }
    } else if (!sec.massief || sec.rol === 'roede') {
      lijn(sec.V + 2, sec.V + 14);
      if (sec.rol === 'roede') lijn(-14, -2);
      // aluminium: L-profielen 20x10 voor en achter het glas, tegen de koker
      if (sec.latten) {
        const lst = STAAF[o?.sys.glaslat.staaf]?.L ?? [20, 10, 2], [la, lb, lt] = lst;
        const L2 = (v0, zijde) => { const kant = (x, w) => (zijde > 0 ? x : v0 * 2 - x - w); for (const [z0, z1, onder] of [[zg - la, zg, true], [zg + gd, zg + gd + la, false]]) { el.push(R(kant(v0, lt), z0, lt, z1 - z0, '#5a6066', 0.15), R(kant(v0, lb), onder ? zg - lt : zg + gd, lb, lt, '#5a6066', 0.15)); } };
        L2(sec.V, 1);
        if (sec.latten === 2) L2(0, -1);
      }
    }
  }
  // de wanden: staal gearceerd, isolatie geel
  for (const w of sec.wanden) el.push(R(w.v0, w.z0, w.v1 - w.v0, w.z1 - w.z0, w.iso ? '#e3cf8f' : w.rubber ? '#3a3d40' : sec.massief ? '#8a9095' : '#2b2f33', 0.2));
  for (const [gv, gz, gdm] of sec.gaten ?? []) el.push(`<circle cx="${f(x + gv * s)}" cy="${f(y + gz * s)}" r="${f((gdm / 2) * s)}" fill="#fff" stroke="#111" stroke-width="0.2"/>`);
  // roede van platstaal met latten voor en achter (eigen staven)
  if (sec.lat) { const l = 30; el.push(R(sec.V / 2 - l / 2, -3, l, 3, '#8a9095', 0.2), R(sec.V / 2 - l / 2, sec.D, l, 3, '#8a9095', 0.2)); }
  if (maten) {
    const by = y + sec.D * s + 4;
    el.push(L(x, by, x + sec.V * s, by, 0.15), L(x, by - 1, x, by + 1, 0.15), L(x + sec.V * s, by - 1, x + sec.V * s, by + 1, 0.15), T(x + sec.V * s / 2, by + h + 0.6, `${g(sec.V, 1)} zicht`, h, { anker: 'middle' }));
    const bx = x - 4 - (sec.rol === 'roede' && glas ? 14 * s : 0);
    el.push(L(bx, y, bx, y + sec.D * s, 0.15), L(bx - 1, y, bx + 1, y, 0.15), L(bx - 1, y + sec.D * s, bx + 1, y + sec.D * s, 0.15), `<text x="${f(bx - 1)}" y="${f(y + sec.D * s / 2)}" font-size="${h}" text-anchor="middle" transform="rotate(-90 ${f(bx - 1)} ${f(y + sec.D * s / 2)})">${esc(`${g(sec.D, 1)} diep`)}</text>`);
  }
  return el.join('');
}

/** de rollen die in deze deur voorkomen, met hun posities uit de stuklijst */
function rollen(o, posities) {
  const r = [['kozijn', 'Kozijn', /^Kozijn/], ['kader', 'Vleugel (kader)', /^Kader/], ['roede', 'Roede', /^Roede(?! .*lat)|^Roede.*kern/], ['glaslat', STAAF[o.sys.glaslat.staaf]?.rubber ? 'Glasrubber' : 'Glaslat', /^Glaslat/]];
  return r.map(([rol, titel, re]) => ({ rol, titel, pos: posities.filter((p) => p.soort === 'staaf' && re.test(p.naam) && p.prof === (rol === 'glaslat' ? o.sys.glaslat.staaf : o.sys[rol].staaf)) }))
    .filter((x) => x.pos.length);
}

/** blad A3 "Deurprofielen en verbindingen" */
export function profielBlad(o, keuzes = {}, meta = {}) {
  const { posities } = stuklijst(o, keuzes), el = [], sys = o.sys;
  el.push(`<rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  el.push(T(26, 17, `Deurprofielen: ${sys.naam}`, 3.2, { vet: true }));
  el.push(T(26, 22, sys.verbinders ? `Profielsysteem op maat: zie het aanvraagdossier (P1-P4, hoekverbinder C1, schroeven C2). Het glas zit in de gleuf met het U-rubber P4. Voor = de kant met de greep (boven in de doorsnede).` : sys.alu ? `Te bestellen bij ${sys.leverancier}. Kokers en L-profielen op ware maat (wand 2 mm); het glas in het midden tussen twee L-profielen. Voor = de kant met de greep (boven in de doorsnede).` : sys.koop ? `Te bestellen bij ${sys.leverancier}. Doorsneden vereenvoudigd (wand, sponning${sys.iso ? ', isolatiezone' : ''}); de exacte vorm staat in de catalogus van de fabrikant. Voor = de kant met de greep (boven in de doorsnede).` : 'Eigen staven uit de staalhandel. Voor = de kant met de greep (boven in de doorsnede).', 2.1, { kleur: '#333' }));
  // ---- rij 1: per profiel de doorsnede en wat ervan gemaakt wordt
  const rs = rollen(o, posities), kw = Math.min(96, (W - 46) / Math.max(1, rs.length));
  rs.forEach((r, i) => {
    const x0 = 26 + i * (kw + 2), y0 = 27, sec = sectie(o, r.rol), st = STAAF[sec.prof] ?? {};
    el.push(`<rect x="${f(x0)}" y="${y0}" width="${f(kw)}" height="118" fill="none" stroke="#111" stroke-width="0.3"/>`);
    el.push(T(x0 + 2, y0 + 5.5, r.titel, 3, { vet: true }), T(x0 + 2, y0 + 10, st.artikel ? `Artikel ${st.artikel}` : sec.naam, 2.4, { vet: !!st.artikel }));
    const extra = r.rol === 'glaslat' || r.rol === 'kozijn' ? 0 : r.rol === 'roede' ? 28 : 14, s = [3, 2, 1.5, 1, 0.5].find((q) => (r.rol !== 'glaslat' || q <= 2) && (sec.V + extra) * q <= kw - 22 && (sec.D + 8) * q <= 76) ?? 0.5;
    const sx = x0 + 14 + (r.rol === 'roede' ? 14 * s : 0) + (kw - 16 - (sec.V + extra) * s) / 2, sy = y0 + 16 + (76 - (sec.D + 8) * s) / 2;
    el.push(tekenSectie(sec, sx, sy, s, { o }));
    let ty = y0 + 100;
    const regel = (t2, vet = false) => { el.push(T(x0 + 2, ty, t2, 2.1, { vet })); ty += 3.4; };
    regel(`Doorsnede ${s >= 1 ? `${s}:1` : `1:${1 / s}`} · ${sec.V} x ${sec.D}${sec.t ? ` · wand ${g(sec.t, 1)}` : ''}${sec.iso ? ` · isolatie ${sec.iso[1] - sec.iso[0]}` : ''}`);
    regel(`${g(st.kgm ?? 0, 2)} kg/m · staven van ${g((st.lengte ?? 6000) / 1000, 1)} m${st.koop ? '' : ' (staalhandel)'}`);
    const n = r.pos.reduce((t2, p) => t2 + p.n, 0), zagen = [...new Set(r.pos.map((p) => p.zagen).filter(Boolean))].join(', ');
    regel(`${n} stukken: pos ${r.pos.map((p) => p.pos).join(', ')}`, true);
    if (zagen) regel(`zagen ${zagen}`.slice(0, Math.floor(kw / 1.1)));
    if (sec.sponning) regel(`sponning ${g(sec.sponning.b, 0)} breed${sec.sponning.zijden === 2 ? ', beide kanten' : ''}`);
  });
  // ---- rij 2: hoe de stukken samenkomen (vooraanzicht 1:2)
  const dy = 156, s2 = 0.5;
  el.push(T(26, dy - 3, 'Hoe de stukken samenkomen (vooraanzicht 1:2; rood = zaagsnede in verstek 45°, stippellijn = wand achter de zichtkant)', 3, { vet: true }));
  const staaf = (pts, kleur = '#d7dadc') => `<polygon points="${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' ')}" fill="${kleur}" stroke="#111" stroke-width="0.3"/>`;
  const wandLijn = (x1, y1, x2, y2) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#555" stroke-width="0.18" stroke-dasharray="1.4 0.8"/>`;
  const rood = (x1, y1, x2, y2) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#c0392b" stroke-width="0.8"/>`;
  const vak = (x, titel, regels) => { el.push(`<rect x="${x}" y="${dy}" width="125" height="92" fill="none" stroke="#111" stroke-width="0.3"/>`, T(x + 2, dy + 5, titel, 2.7, { vet: true })); regels.forEach((t2, i) => el.push(T(x + 2, dy + 78 + i * 3.4, t2, 2.05))); };
  const k = sys.kader.zicht * s2, ll = 110 * s2, tk = (sectie(o, 'kader').t || 2) * s2;
  // 1. hoek van de vleugel: twee kaderstukken in verstek
  {
    const x = 26, ox = x + 30, oy = dy + 12;
    el.push(staaf([[ox, oy], [ox + ll, oy], [ox + ll, oy + k], [ox + k, oy + k]]), staaf([[ox, oy], [ox + k, oy + k], [ox + k, oy + ll], [ox, oy + ll]]));
    el.push(rood(ox, oy, ox + k, oy + k), wandLijn(ox + tk * 2, oy + tk, ox + ll, oy + tk), wandLijn(ox + tk, oy + tk * 2, ox + tk, oy + ll));
    el.push(T(ox + ll / 2 + 6, oy - 1.5, 'regel', 2), T(ox - 2, oy + ll / 2 + 8, 'staander', 2, { anker: 'end' }), T(ox + k + 3, oy + k + 6, '45°', 2.4, { kleur: '#c0392b', vet: true }));
    vak(x, 'Hoek van de vleugel: verstek', [`Beide stukken 45° zagen (pos ${posities.filter((p) => /^Kader/.test(p.naam)).map((p) => p.pos).join(', ')}).`, sys.alu ? 'Hoekverbinder in beide kokers, 2K-lijm op het verstek,' : sys.iso ? 'Las enkel de stalen schalen, niet de isolatie.' : 'TIG zichtkant, MIG binnen; vlak slijpen.', sys.alu ? 'stelschroeven vast; diagonalen gelijk (± 1 mm).' : 'Diagonalen gelijk (± 1 mm) voor je last.']);
  }
  // 2. roede tegen het kader: stomp (T)
  {
    const x = 26 + 127, ox = x + 25, oy = dy + 14, w = sys.roede.zicht * s2;
    el.push(staaf([[ox, oy], [ox + 90, oy], [ox + 90, oy + k], [ox, oy + k]]), staaf([[ox + 45 - w / 2, oy + k], [ox + 45 + w / 2, oy + k], [ox + 45 + w / 2, oy + k + 34], [ox + 45 - w / 2, oy + k + 34]], '#e2e5e7'));
    el.push(wandLijn(ox, oy + k - tk, ox + 90, oy + k - tk), `<line x1="${f(ox + 45 - w / 2)}" y1="${f(oy + k)}" x2="${f(ox + 45 + w / 2)}" y2="${f(oy + k)}" stroke="#1f5fa8" stroke-width="0.7"/>`);
    el.push(T(ox + 45, oy + k / 2 + 1, 'kader', 2, { anker: 'middle' }), T(ox + 45 + w / 2 + 2, oy + k + 22, 'roede', 2));
    vak(x, 'Roede tegen het kader: stomp (T)', [`Roede recht zagen op de daglichtmaat${sys.koop && !sys.alu ? '; het uiteinde passend uitzagen' : ''}.`, sys.verbinders ? '2 RVS-schroeven 4,8 x 50 door het kader in het' : sys.alu ? 'T-verbinder in het uiteinde, vastschroeven in het kader;' : sys.koop ? 'rond de sponning van het kader (uitklinken).' : 'Kern op afstandsblokjes in het midden van de diepte.', sys.verbinders ? 'schroefkanaal van de roede; naad (blauw) kitten.' : sys.alu ? 'de naad (blauw) kitten. Geen lassen.' : 'Hoeklas rondom (blauw), vlak slijpen.']);
  }
  // 3. kozijn: bovenhoek in verstek, onderaan recht op de vloer
  {
    const x = 26 + 254, ox = x + 30, oy = dy + 12, kk = sys.kozijn.zicht * s2;
    el.push(staaf([[ox, oy], [ox + ll, oy], [ox + ll, oy + kk], [ox + kk, oy + kk]]), staaf([[ox, oy], [ox + kk, oy + kk], [ox + kk, oy + 56], [ox, oy + 56]]));
    el.push(rood(ox, oy, ox + kk, oy + kk), L(ox - 4, oy + 56, ox + kk + 30, oy + 56, 0.5));
    for (let i = 0; i < 6; i++) el.push(L(ox - 4 + i * 6, oy + 56, ox - 8 + i * 6, oy + 60, 0.15));
    el.push(T(ox + kk + 3, oy + kk + 6, '45°', 2.4, { kleur: '#c0392b', vet: true }), T(ox + kk + 3, oy + 54, 'recht (90°) op de vloer', 2));
    vak(x, 'Kozijn: boven verstek, onder recht', [`Bovenregel en stijlen boven 45° (pos ${posities.filter((p) => /^Kozijn/.test(p.naam)).map((p) => p.pos).join(', ')}).`, 'De stijlen staan onderaan recht op de vloer.', 'Taatspot in de vloer, bovenpen in de bovenregel.']);
  }
  el.push(titelblok(o, { ...meta, titel: `Deurprofielen ${o.stijl.naam} · opening ${o.B} x ${o.H}`, schaal: 'zie bij de tekening' }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif">${ARC}<rect width="${W}" height="${H}" fill="#fff"/>${el.join('\n')}</svg>`;
}
