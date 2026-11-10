// Tekenen van een taatsdeur (deuren.mjs) als SVG: vooraanzicht met kozijn, kader, roeden, bogen, glas, taatsassen
// en greep, en de maatvoering (ISO 129-1: maten in mm, maatlijnen 0,18, pijlen). Werkt in Node en in de browser.
import { lengte, kaderVan, veelhoek, MATEN } from './deuren.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
const rad = (g) => (g * Math.PI) / 180;
/** band rond een rechte hartlijn (breedte w) of een boog (straal r, breedte w) als veelhoek */
export function band(d, w) {
  if (d.a) {
    const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], l = Math.hypot(dx, dy) || 1, n = [(-dy / l) * (w / 2), (dx / l) * (w / 2)];
    return [[d.a[0] + n[0], d.a[1] + n[1]], [d.b[0] + n[0], d.b[1] + n[1]], [d.b[0] - n[0], d.b[1] - n[1]], [d.a[0] - n[0], d.a[1] - n[1]]];
  }
  const st = Math.max(8, Math.ceil(Math.abs(d.g1 - d.g0) / 2)), uit = [], inn = [];
  for (let i = 0; i <= st; i++) { const a = rad(d.g0 + ((d.g1 - d.g0) * i) / st); uit.push([d.c[0] + (d.r + w / 2) * Math.cos(a), d.c[1] + (d.r + w / 2) * Math.sin(a)]); inn.push([d.c[0] + (d.r - w / 2) * Math.cos(a), d.c[1] + (d.r - w / 2) * Math.sin(a)]); }
  return [...uit, ...inn.reverse()];
}
const zichtVan = (o, d) => (d.soort === 'roede' || d.soort === 'boog' ? o.sys.roede.zicht : d.soort === 'kozijn' || d.soort === 'boogkozijn' ? o.sys.kozijn.zicht : o.sys.kader.zicht);

/**
 * vooraanzicht in een <g>: s = schaal (mm papier per mm), (ox, oy) = linksonder van het kozijn op het papier (y omlaag)
 * kleuren: { staal, glas, lijn }; maten: true = hoofdmaten en roedematen erbij
 */
export function vooraanzicht(o, s, ox, oy, { staal = '#2b2e31', glas = '#cfdde3', lijn = '#111', paneel = '#4a5056', maten = true, assen = true, tekst = 3 } = {}) {
  const X = (x) => ox + x * s, Y = (y) => oy - y * s, el = [];
  const poly = (p, vul, sw = 0.25, extra = '') => el.push(`<polygon points="${p.map(([x, y]) => `${f(X(x))},${f(Y(y))}`).join(' ')}" fill="${vul}" stroke="${lijn}" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`);
  // glas eerst, dan het staal erover
  for (const v of [...o.vleugels, ...o.vast]) for (const p of v.ruiten) poly(p.map(([x, y]) => [x + v.x, y + v.y]), glas, 0.15);
  for (const v of [...o.vleugels, ...o.vast]) for (const p of v.panelen ?? []) poly(p.map(([x, y]) => [x + v.x, y + v.y]), paneel, 0.15);
  const vorm = (d, Bv, Hv) => (d.a ? veelhoek(d, zichtVan(o, d), Bv, Hv) : band(d, zichtVan(o, d)));
  for (const d of o.kozijn.delen) poly(vorm(d, o.kozijn.B, o.kozijn.H), staal, 0.2);
  for (const v of [...o.vleugels, ...o.vast]) for (const d of v.delen) poly(vorm(d, v.B, v.H).map(([x, y]) => [x + v.x, y + v.y]), staal, 0.2);
  // taatsassen (streep-punt) en greep
  for (const v of o.vleugels) {
    const xa = v.taats === 'links' ? v.x + 100 : v.x + v.B - 100;
    if (assen && o.scharnier === 'verdekt') {
      // de 3 scharnieren op de scharnierkant en de draairichting: twee lijnen van de sluitkant naar het midden van de scharnierkant
      const xs = v.taats === 'links' ? v.x : v.x + v.B, xo = v.taats === 'links' ? v.x + v.B : v.x;
      for (const y of [v.y + 250, v.y + v.H / 2, v.y + v.H - 250]) el.push(`<rect x="${f(X(xs) - 0.6)}" y="${f(Y(y + 85))}" width="1.2" height="${f(170 * s)}" fill="#b00"/>`);
      el.push(`<polyline points="${f(X(xo))},${f(Y(v.y))} ${f(X(xs))},${f(Y(v.y + v.H / 2))} ${f(X(xo))},${f(Y(v.y + v.H))}" fill="none" stroke="#b00" stroke-width="0.2" stroke-dasharray="3 1.5"/>`);
    } else if (assen) el.push(`<line x1="${f(X(xa))}" y1="${f(Y(-60))}" x2="${f(X(xa))}" y2="${f(Y(v.y + v.H + 80))}" stroke="#b00" stroke-width="0.2" stroke-dasharray="6 1.2 1.2 1.2"/>`);
    const xg = v.taats === 'links' ? v.x + v.B - MATEN.greep.afstand : v.x + MATEN.greep.afstand;
    el.push(`<rect x="${f(X(xg) - 12.5 * s)}" y="${f(Y(1050 + 400))}" width="${f(25 * s)}" height="${f(800 * s)}" rx="${f(12 * s)}" fill="${staal}" stroke="${lijn}" stroke-width="0.1"/>`);
  }
  // vloer
  el.push(`<line x1="${f(X(-120))}" y1="${f(Y(0))}" x2="${f(X(o.kozijn.B + 120))}" y2="${f(Y(0))}" stroke="${lijn}" stroke-width="0.5"/>`);
  for (let x = -120; x < o.kozijn.B + 120; x += 60) el.push(`<line x1="${f(X(x))}" y1="${f(Y(0))}" x2="${f(X(x - 40))}" y2="${f(Y(-40))}" stroke="${lijn}" stroke-width="0.13"/>`);
  if (maten) {
    const m = maatlijnen(o, X, Y, s, tekst);
    el.push(...m);
  }
  return el.join('\n');
}
const pijl = (x, y, dx, dy) => { const n = [-dy, dx]; return `<polygon points="${f(x)},${f(y)} ${f(x + dx * 2.5 + n[0] * 0.6)},${f(y + dy * 2.5 + n[1] * 0.6)} ${f(x + dx * 2.5 - n[0] * 0.6)},${f(y + dy * 2.5 - n[1] * 0.6)}" fill="#111"/>`; };
function maatH(x1, x2, y0, y, t, h) { return [`<line x1="${f(x1)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y + Math.sign(y - y0) * 1.5)}" stroke="#111" stroke-width="0.18"/>`, `<line x1="${f(x2)}" y1="${f(y0)}" x2="${f(x2)}" y2="${f(y + Math.sign(y - y0) * 1.5)}" stroke="#111" stroke-width="0.18"/>`, `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}" stroke="#111" stroke-width="0.18"/>`, pijl(x1, y, 1, 0), pijl(x2, y, -1, 0), `<text x="${f((x1 + x2) / 2)}" y="${f(y - 1)}" font-size="${h}" text-anchor="middle">${t}</text>`].join(''); }
function maatV(y1, y2, x0, x, t, h) { return [`<line x1="${f(x0)}" y1="${f(y1)}" x2="${f(x + Math.sign(x - x0) * 1.5)}" y2="${f(y1)}" stroke="#111" stroke-width="0.18"/>`, `<line x1="${f(x0)}" y1="${f(y2)}" x2="${f(x + Math.sign(x - x0) * 1.5)}" y2="${f(y2)}" stroke="#111" stroke-width="0.18"/>`, `<line x1="${f(x)}" y1="${f(y1)}" x2="${f(x)}" y2="${f(y2)}" stroke="#111" stroke-width="0.18"/>`, pijl(x, y1, 0, 1), pijl(x, y2, 0, -1), `<text x="${f(x - 1)}" y="${f((y1 + y2) / 2)}" font-size="${h}" text-anchor="middle" transform="rotate(-90 ${f(x - 1)} ${f((y1 + y2) / 2)})">${t}</text>`].join(''); }
/** hoofdmaten: opening, kozijn, vleugel(s), roedehoogtes en boogstralen */
function maatlijnen(o, X, Y, s, h) {
  const el = [], KB = o.kozijn.B, KH = o.kozijn.H, v0 = o.vleugels[0];
  el.push(maatH(X(0), X(KB), Y(KH) - 2, Y(KH) - 10, `${Math.round(KB)} (opening ${o.B})`, h));
  el.push(maatV(Y(0), Y(KH), X(0) - 2, X(0) - 10, `${Math.round(KH)} (opening ${o.H})`, h));
  o.vleugels.forEach((v, i) => el.push(maatH(X(v.x), X(v.x + v.B), Y(0) + 4, Y(0) + 12 + i * 0, `vleugel ${Math.round(v.B)}`, h)));
  el.push(maatV(Y(v0.y), Y(v0.y + v0.H), X(KB) + 2, X(KB) + 10, `vleugel ${Math.round(v0.H)}`, h));
  // hoogtes van de horizontale roeden (hart) vanaf de onderkant van de vleugel
  const ys = [...new Set(v0.delen.filter((d) => d.soort === 'roede' && d.a && Math.abs(d.a[1] - d.b[1]) < 1e-6).map((d) => Math.round(d.a[1])))].sort((a, b) => a - b);
  ys.forEach((y, i) => el.push(maatV(Y(v0.y), Y(v0.y + y), X(KB) + 2, X(KB) + 18 + i * 7, `${y}`, h * 0.9)));
  // bogen: straal op de hartlijn
  const bogen = [...o.kozijn.delen.filter((d) => d.r), ...o.vleugels.flatMap((v) => v.delen.filter((d) => d.r).map((d) => ({ ...d, c: [d.c[0] + v.x, d.c[1] + v.y] })))];
  const gezien = new Set();
  for (const d of bogen) {
    const k = `${Math.round(d.r)}|${Math.round(d.c[0])}|${Math.round(d.c[1])}`; if (gezien.has(k)) continue; gezien.add(k);
    const g = rad((d.g0 + d.g1) / 2 + 12), p = [d.c[0] + d.r * Math.cos(g), d.c[1] + d.r * Math.sin(g)];
    el.push(`<line x1="${f(X(d.c[0]))}" y1="${f(Y(d.c[1]))}" x2="${f(X(p[0]))}" y2="${f(Y(p[1]))}" stroke="#111" stroke-width="0.18"/>`, pijl(X(p[0]), Y(p[1]), -Math.cos(g), Math.sin(g)), `<text x="${f(X((d.c[0] + p[0]) / 2) + 1)}" y="${f(Y((d.c[1] + p[1]) / 2) - 1)}" font-size="${h * 0.9}">R${Math.round(d.r)}</text>`);
  }
  return el;
}

/** een eenvoudig losstaand svg-blad (voor de controle en de configurator): de deur passend in w x h mm */
export function losseTekening(o, w = 200, h = 280, opts = {}) {
  const KB = o.kozijn.B, KH = o.kozijn.H, s = Math.min((w - 70) / KB, (h - 40) / KH);
  const ox = 30, oy = h - 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/>${vooraanzicht(o, s, ox, oy, opts)}</svg>`;
}
export { kaderVan, lengte };
