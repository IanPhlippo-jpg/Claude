// Boringenblad A4 liggend per stuk met gaten (stuklijst: p.gaten): elk vlak waarin geboord wordt (voor, achter,
// buitenkant, binnenkant, of het been van een hoeklijn) als aanzicht op schaal met de gaten en hun maten vanaf
// uiteinde A (ordinaatmaten, ISO 129-1), per soort gat een doorsnede vergroot (de wand, de boring, de verzinking 90° of
// de schroefdraad volgens ISO 6410) en een gatenstaat. Notatie: Ø = boring, ⌵ = verzinking (ISO 15786).
// Werkt in Node en in de browser.
import { STAAF } from './prijzen.mjs';
import { esc, g } from './blad.mjs';
import { gatTekst, tapBoor } from './boringen.mjs';
import { sectie } from './profielen.mjs';

const W4 = 297, H4 = 210;
const f = (v) => (Math.round(v * 100) / 100).toString();
const T = (x, y, t, h = 2.5, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${h}"${o.anker ? ` text-anchor="${o.anker}"` : ''}${o.vet ? ' font-weight="700"' : ''}${o.kleur ? ` fill="${o.kleur}"` : ''}${o.rot ? ` transform="rotate(${f(o.rot)} ${f(x)} ${f(y)})"` : ''}>${esc(t)}</text>`;
const L = (x1, y1, x2, y2, w = 0.25, extra = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#111" stroke-width="${w}"${extra}/>`;
const HART = ' stroke-dasharray="4 0.8 0.8 0.8"', VERB = ' stroke-dasharray="1.4 0.7"';
const NORM = [5, 2, 1, 1 / 2, 1 / 5, 1 / 10, 1 / 20];
const schaal = (max) => NORM.find((s) => s <= max + 1e-9) ?? 1 / 50;
const st = (s) => (s >= 1 ? `${s}:1` : `1:${Math.round(1 / s)}`);
const LETTERS = 'ABCDEFGHJKLMNP';

/** de wanddikte die bij een gat geboord wordt */
function wand(o, p, b) {
  const s = STAAF[p.prof] ?? {};
  if (b.vlak === 'been') return s.L ? s.L[2] : +(/hoeklijn \d+x\d+x(\d+)/.exec(s.naam ?? '')?.[1] ?? 2);
  if (/plat|lat/.test(s.naam ?? '') && !s.wand) { const m = (s.naam ?? '').match(/(\d+)x(\d+)/); return m ? Math.min(+m[1], +m[2]) : 3; }
  return s.wand ?? (/koker \d+x\d+x(\d+)/.exec(s.naam ?? '')?.[1] * 1 || 2);
}

/** doorsnede van één soort gat, vergroot (schaal s): wand(en) gearceerd, boring, verzinking 90° of schroefdraad */
function gatDoorsnede(b, t, x, y, s) {
  const el = [], r = (b.draad ? tapBoor(b.draad) : b.d) / 2, R = b.verz ? b.verz / 2 : 0, rb = b.d2 ? b.d2 / 2 : r, wb = 2 * Math.max(R, r, rb, b.draad ? +b.draad.slice(1) / 2 : 0) * s + 12;
  const wandje = (top, met, rr) => {
    const bot = top + t * s, kk = R && met ? Math.min(t, R - rr) : 0;
    for (const z of [-1, 1]) {
      const xi = x + z * rr * s, xo = x + z * wb / 2;
      const pts = kk ? [[xo, top], [x + z * R * s, top], [x + z * (R - kk) * s, top + kk * s], [xi, top + kk * s], [xi, bot], [xo, bot]] : [[xo, top], [xi, top], [xi, bot], [xo, bot]];
      el.push(`<polygon points="${pts.map(([a, c]) => `${f(a)},${f(c)}`).join(' ')}" fill="url(#arc2)" stroke="#111" stroke-width="0.3"/>`);
    }
    // schroefdraad (ISO 6410): dun op de buitendiameter
    if (b.draad) for (const z of [-1, 1]) el.push(L(x + z * (+b.draad.slice(1) / 2) * s, top, x + z * (+b.draad.slice(1) / 2) * s, bot, 0.15));
    return bot;
  };
  const twee = b.door === 2 || b.d2 || typeof b.door === 'string';
  let onder = wandje(y, true, r);
  if (twee) onder = wandje(onder + 5, false, rb);
  el.push(L(x, y - 3, x, onder + 3, 0.15, HART));
  el.push(L(x - r * s, onder + 4.5, x + r * s, onder + 4.5, 0.18), T(x, onder + 8, b.draad ? `${b.draad} (boor Ø${g(tapBoor(b.draad), 1)})` : `Ø${g(b.d, 1)}${b.d2 ? ` / Ø${g(b.d2, 1)}` : ''}`, 2, { anker: 'middle' }));
  if (R) el.push(L(x - R * s, y - 2.2, x + R * s, y - 2.2, 0.18), T(x, y - 3.4, `⌵ Ø${g(b.verz, 1)} x 90°`, 2, { anker: 'middle' }));
  el.push(T(x + wb / 2 + 1, y + t * s * 0.75, `${g(t, 1)}`, 1.8, { kleur: '#555' }));
  return el.join('');
}

/** het boringenblad van één positie (p.gaten niet leeg); meta: { nr, datum, blad } */
export function boringBlad(o, p, meta = {}) {
  const el = [], gaten = p.gaten ?? [], Lg = p.vorm.L, V = p.vorm.V, sec = (() => { try { return sectie(o, p.prof === o.sys.kozijn.staaf ? 'kozijn' : 'kader'); } catch { return null; } })();
  const D = STAAF[p.prof]?.diepte ?? sec?.D ?? 40;
  el.push(`<rect x="20" y="10" width="${W4 - 30}" height="${H4 - 20}" fill="none" stroke="#111" stroke-width="0.7"/>`);
  el.push(`<circle cx="31" cy="19.5" r="6" fill="#fff" stroke="#111" stroke-width="0.5"/>`, T(31, 21.2, String(p.pos), 4.6, { anker: 'middle', vet: true }));
  el.push(T(40, 18.5, `Boringen: ${p.n} x ${p.naam}`, 4.2, { vet: true }), T(40, 23.5, `${p.mat} · ${p.maat}${p.zagen ? ` · zagen ${p.zagen}` : ''} · maten in mm vanaf uiteinde A (links)`, 2.4));
  // soorten gaten: letter per maat
  const soorten = [...new Set(gaten.map(gatTekst))], letter = (b) => LETTERS[soorten.indexOf(gatTekst(b))];
  // de vlakken met gaten
  const vlak = (b) => (b.vlak === 'zijde' ? (b.kant === 'binnen' ? 'binnen' : 'buiten') : b.vlak);
  const NAAM = { voor: 'Voorkant (greepkant)', achter: 'Achterkant', buiten: 'Buitenkant (naar de rand van de deur of de muur)', binnen: 'Binnenkant (naar het glas of de deur)', been: 'Been tegen de koker' };
  const vlakken = ['voor', 'achter', 'buiten', 'binnen', 'been'].filter((v) => gaten.some((b) => vlak(b) === v));
  const s = schaal(Math.min(252 / Lg, 3)), X0 = 30;
  let y = 36;
  for (const v of vlakken) {
    const hoog = v === 'voor' || v === 'achter' ? V : v === 'been' ? 15 : D, hs = hoog * s, hier = gaten.filter((b) => vlak(b) === v).sort((a, b) => a.u - b.u);
    const dwars = [...new Set(hier.filter((b) => !b.rechthoek).map((b) => Math.round(((v === 'voor' || v === 'achter') ? (v === 'achter' ? V - b.v : b.v) : v === 'been' ? b.v : b.z) * 10) / 10))];
    el.push(T(X0 - 4, y - 1, `${NAAM[v]} (${st(s)})${dwars.length ? ` · hart op ${dwars.map((x) => g(x, 1)).join(' en ')} ${v === 'voor' || v === 'achter' ? 'van de bovenrand' : v === 'been' ? 'van de glaskant' : 'van de voorkant'}` : ''}`, 2.5, { vet: true }));
    const top = y + 9;
    // de omtrek: voor/achter = de echte vorm (verstek); een zijkant = rechthoek over de lengte van die kant
    if (v === 'voor' || v === 'achter') el.push(`<polygon points="${p.vorm.pts.map(([u, w]) => `${f(X0 + u * s)},${f(top + (v === 'achter' ? V - w : w) * s)}`).join(' ')}" fill="#f4f5f6" stroke="#111" stroke-width="0.35"/>`);
    else {
      const kantV = v === 'buiten' ? p.vBuiten ?? 0 : V - (p.vBuiten ?? 0), q = p.vorm.pts.filter((x) => Math.abs(x[1] - kantV) < 0.6).map((x) => x[0]);
      const [a, c] = q.length >= 2 ? [Math.min(...q), Math.max(...q)] : [0, Lg];
      el.push(`<rect x="${f(X0 + a * s)}" y="${f(top)}" width="${f((c - a) * s)}" height="${f(hs)}" fill="#f4f5f6" stroke="#111" stroke-width="0.35"/>`);
      if (v !== 'been') el.push(L(X0 + a * s, top + hs / 2, X0 + c * s, top + hs / 2, 0.12, HART));
    }
    let vorige = -99, vorigeU = null;
    for (const b of hier) {
      const cx = X0 + b.u * s, dw = v === 'voor' || v === 'achter' ? (v === 'achter' ? V - b.v : b.v) : v === 'been' ? b.v : b.z, cy = top + dw * s;
      if (b.rechthoek) el.push(`<rect x="${f(cx - (b.rechthoek[0] * s) / 2)}" y="${f(cy - (b.rechthoek[1] * s) / 2)}" width="${f(b.rechthoek[0] * s)}" height="${f(b.rechthoek[1] * s)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`);
      else {
        const r = Math.max(0.55, ((b.draad ? tapBoor(b.draad) : b.d) / 2) * s);
        el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`);
        if (b.verz) el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(r + 0.35, (b.verz / 2) * s))}" fill="none" stroke="#111" stroke-width="0.22"/>`);
        if (b.draad) el.push(`<path d="M${f(cx + r * 1.25)},${f(cy)} A${f(r * 1.25)},${f(r * 1.25)} 0 1 1 ${f(cx)},${f(cy + r * 1.25)}" fill="none" stroke="#111" stroke-width="0.15"/>`);
      }
      // ordinaatmaat boven de strook (vanaf uiteinde A); bij gaten dicht bij elkaar wat hoger
      if (vorigeU !== null && Math.abs(b.u - vorigeU) < 0.5) continue; // zelfde plaats, andere diepte: één maat
      const ty = top - 1.6 - (cx - vorige < 3.2 ? 3.6 : 0);
      el.push(L(cx, ty + 0.4, cx, cy - 0.6, 0.12), T(cx + 0.7, ty, g(b.u, 0), 1.9, { rot: -90 }), T(cx, top + hs + 2.6, letter(b), 1.9, { anker: 'middle', vet: true }));
      vorige = cx; vorigeU = b.u;
    }
    // oorsprong van de ordinaatmaten: 0 aan uiteinde A
    el.push(`<circle cx="${f(X0)}" cy="${f(top + hs / 2)}" r="0.7" fill="#111"/>`, T(X0 - 1.5, top + hs / 2 + 0.8, '0', 2.1, { anker: 'end', vet: true }));
    y = top + hs + 9;
  }
  // doorsneden per soort gat (vergroot) links, de gatenstaat rechts
  const yd = Math.max(y + 10, 118);
  el.push(T(25, yd - 6, 'Doorsnede per soort gat (vergroot)', 2.8, { vet: true }));
  let xx = 30;
  soorten.slice(0, 4).forEach((k, i) => {
    const b = gaten.find((x) => gatTekst(x) === k), t = wand(o, p, b);
    if (b.rechthoek) { el.push(T(xx, yd + 3, `${LETTERS[i]}: uitzagen ${k.replace('uitsparing ', '')}`, 2.1, { vet: true }), T(xx, yd + 7, 'hoeken voorboren Ø6, ontbramen', 1.9)); xx += 40; return; }
    const R = Math.max(b.verz ?? 0, b.d2 ?? 0, b.d ?? 0, b.draad ? +b.draad.slice(1) : 0) / 2, sc = [5, 2, 1].find((q) => 2 * R * q + 8 <= 42) ?? 1, wb = 2 * R * sc + 12;
    el.push(T(xx, yd + 1, `${LETTERS[i]} (${st(sc)})`, 2.6, { vet: true }), gatDoorsnede(b, t, xx + wb / 2, yd + 8, sc));
    xx += wb + 14;
  });
  const tx0 = 165, ty = yd - 6;
  el.push(T(tx0, ty, 'Gatenstaat', 2.8, { vet: true }));
  soorten.forEach((k, i) => {
    const lijst = gaten.filter((b) => gatTekst(b) === k), b = lijst[0], yy = ty + 5 + i * 11;
    el.push(T(tx0, yy, LETTERS[i], 2.4, { vet: true }), T(tx0 + 5, yy, `${lijst.length} x ${k}`.slice(0, 68), 2.1, { vet: true }));
    const uitl = `${[...new Set(lijst.map(vlak))].map((v) => NAAM[v].split(' (')[0].toLowerCase()).join(', ')} · ${b.doel ?? ''}`, woorden = uitl.split(' '), r2 = [''];
    for (const w of woorden) { if ((r2.at(-1) + ' ' + w).length > 70) r2.push(w); else r2[r2.length - 1] += (r2.at(-1) ? ' ' : '') + w; }
    r2.slice(0, 2).forEach((t, k) => el.push(T(tx0 + 5, yy + 3.4 + k * 2.7, t, 1.9, { kleur: '#333' })));
  });
  el.push(T(25, Math.min(H4 - 16, yd + 44), 'Ontbramen na het boren. Verzinken met een verzinkboor 90° tot de kop vlak ligt. Getapt: eerst de boormaat, dan tappen.', 2, { kleur: '#555' }));
  // titelblok A4 (ISO 7200, ingekort)
  const tx = W4 - 10 - 120, tyb = H4 - 10 - 24, veld = (x, r, kop, w, h = 2.3, vet = false) => { if (x) el.push(L(tx + x, tyb + r * 8, tx + x, tyb + r * 8 + 8)); el.push(T(tx + x + 1, tyb + r * 8 + 2.5, kop, 1.6, { kleur: '#555' }), T(tx + x + 1, tyb + r * 8 + 6.5, w, h, { vet })); };
  el.push(`<rect x="${tx}" y="${tyb}" width="120" height="24" fill="#fff" stroke="#111" stroke-width="0.5"/>`, L(tx, tyb + 8, tx + 120, tyb + 8), L(tx, tyb + 16, tx + 120, tyb + 16));
  veld(0, 0, 'Titel', `Boringen pos ${p.pos}: ${p.naam}`.slice(0, 52), 2.4, true);
  veld(0, 1, 'Deur', `${o.stijl.naam} · ${o.B} x ${o.H}`.slice(0, 40), 2.2); veld(78, 1, 'Tekeningnummer', `${meta.nr ?? 'TD'}-B${String(p.pos).padStart(2, '0')}`, 2.3, true);
  veld(0, 2, 'Maten', 'mm · ISO 2768-m · ISO 15786', 2.1); veld(52, 2, 'Uitgifte', meta.datum ?? '', 2.1); veld(78, 2, 'Blad', meta.blad ?? '1 / 1', 2.1);
  const ARC = '<defs><pattern id="arc2" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.4" height="1.4" fill="#fff"/><line x1="0" y1="0" x2="0" y2="1.4" stroke="#111" stroke-width="0.16"/></pattern></defs>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W4} ${H4}" width="${W4}mm" height="${H4}mm" font-family="Arial, Helvetica, sans-serif">${ARC}<rect width="${W4}" height="${H4}" fill="#fff"/>${el.join('\n')}</svg>`;
}

/** alle boringenbladen van een deur: [{ pos, svg }] */
export function boringBladen(o, posities, meta = {}) {
  const met = posities.filter((p) => p.gaten?.length);
  return met.map((p, i) => ({ pos: p.pos, naam: p.naam, svg: boringBlad(o, p, { ...meta, blad: `${i + 1} / ${met.length}` }) }));
}
