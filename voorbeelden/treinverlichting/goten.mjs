// Kabelgoten van de kabeldoos (versie 2): vingerkanalen zoals in een schakelkast, met een klikdeksel per goot.
//
// De wanden tussen de rijen bordjes zijn tegelijk het kader van de bordjes: elke rij ligt in een ring (0,3 speling
// rondom), tussen twee ringen ligt een goot van 5,4 breed en 60 hoog. Langs de achterwand en de zijwanden is de
// buitenwand van de doos de buitenkant van de goot. De sleuven in de wanden zijn van boven open tot 5,2 boven de bodem
// (0,6 boven de print: de draadingangen van de klemmen liggen op 6,1 tot 8,9). Voor een klemmenrij staat per twee
// klemmen een sleuf (steek 5,08, sleuf 3,24): elke draad gaat recht uit zijn klem door een sleuf de goot in; elders
// sleuven van 4 met vingers van minstens 5.
// Opbouw in het model (weinig features, geen samenvallende vlakken): de voet van alle wanden in één boss (1,6 dik, tot
// de onderkant van de sleuven: het kader van de bordjes), de vingers erop in enkele bosses (1,2 dik, 0,2 binnen de voet
// aan elke kant: geen gedeeld vlak en geen overhang), korte klikgroeven (45°/45°) alleen in de klikvingers. Een snede
// met honderden sleuven of een groef over de hele lengte maakt de mesh-kernel traag (meer dan 100 s); zo blijft de bak
// rond 30 s. Alles print rechtop zonder support: staande wanden, sleuven open naar boven, groeven met vlakken van 45°.
//
// Deksels: een U-profiel (plaat 1,6 op de vingers, twee benen 1,2 buiten de vingers, 0,1 speling) voor de goten tussen
// twee ringen, met per been twee nokken die in de groef van de klikvingers klikken (op x = -34,5 en 34,5); langs een
// buitenwand een deksel met één been en aan de andere kant een neus die in een groef in de buitenwand haakt (inhaken,
// dan dichtklikken).
import { yv, xv, zv, deel, PETG_GOOT } from './hulp.mjs';

export const GOOT = {
  b: 5.4, // binnenbreedte van een goot tussen twee rijen
  achter: 4.8, // binnenbreedte van de goot langs de achterwand
  zij: 11.0, // binnenbreedte van de goten langs de zijwanden
  wand: 1.6, // dikte van de voet van een wand (het kader van de bordjes, tot de onderkant van de sleuven)
  vingerDik: 1.2, // dikte van de vingers (3 lijnen van 0,4), midden op de voet: 0,2 smaller aan elke kant
  speling: 0.3, // tussen een bordje en de voet van de wand van zijn ring
  sleufBodem: 5.2,
  top: 60, // bovenkant van de vingers = onderkant van de deksels
  sleuf: 4, vinger: 5, // gewone sleuven en de kleinste vinger ertussen
  groef: { y: 53, diep: 0.35 }, // klikgroef voor de benen: midden op 53 (7 onder de bovenkant), 0,35 diep, flanken 45°
  neus: { diep: 0.5 }, // groef in de buitenwand voor de neus van een randdeksel, midden in de plaat van het deksel
  deksel: { dik: 1.6, been: 1.2, speling: 0.1, nok: 0.35, nokLang: 5 }, // nok 0,35 vanaf het been = 0,25 voorbij de vinger
  vingersPerFeature: 60,
  klik: 6, groefLang: 8, // een klikvinger is 6 breed (geen sleuf), de groef erin 8 lang (tot in de lucht ernaast of in de vinger)
};

const r3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Sleuven langs een wand van a tot b: eerst de vaste sleuven (voor de klemmen: [midden, breedte]), de rest gewone
 * sleuven van G.sleuf met gelijke vingers van minstens G.vinger; aan de uiteinden altijd een vinger.
 */
export function sleufPatroon(a, b, vast, G = GOOT, vol = []) {
  // vol: stukken [x0, x1] die een vinger moeten blijven (daar zit de klikgroef): ze delen de rest op zoals een vaste sleuf
  const v = [...vast].sort((p, q) => p[0] - q[0]).map(([c, w]) => [c - w / 2, c + w / 2]);
  const uit = [...v], grenzen = [a, ...[...v, ...vol].sort((p, q) => p[0] - q[0]).flat(), b];
  // tussen twee vaste sleuven (of een uiteinde): k gewone sleuven met k + 1 gelijke vingers van minstens G.vinger
  for (let i = 0; i < grenzen.length; i += 2) {
    const start = grenzen[i], L = grenzen[i + 1] - start;
    const k = Math.max(0, Math.floor((L - G.vinger) / (G.sleuf + G.vinger))), f = (L - k * G.sleuf) / (k + 1);
    for (let j = 0; j < k; j++) { const s0 = start + f + j * (G.sleuf + f); uit.push([s0, s0 + G.sleuf]); }
  }
  return uit.sort((p, q) => p[0] - q[0]).map(([p, q]) => [r3(p), r3(q)]);
}

/** de vaste sleuven voor een klemmenrij: per twee klemmen één sleuf (de draden 0,35 tegen de vinger aan) */
export function klemSleuven(midden, n, steek, dDraad = 1.4) {
  const uit = [];
  for (let k = 0; k < Math.floor(n / 2); k++) uit.push([midden - (n * steek) / 2 + steek + 2 * steek * k, steek + dDraad - 0.7]);
  if (n % 2) uit.push([midden + (n * steek) / 2 - steek / 2, dDraad + 0.6]);
  return uit;
}

/** de vingers van een wand: het stuk van van tot tot zonder de sleuven, als rechthoeken van G.vingerDik rond het hart c */
export function vingers(wand, G = GOOT) {
  const { as, c, van, tot, sleuven } = wand, h = G.vingerDik / 2, uit = [];
  let a = van;
  for (const [s0, s1] of [...sleuven].sort((p, q) => p[0] - q[0])) {
    if (s0 - a >= 1.0) uit.push([a, Math.min(s0, tot)]);
    a = Math.max(a, s1);
    if (a >= tot) break;
  }
  if (tot - a >= 1.0) uit.push([a, tot]);
  return uit.map(([p, q]) => (as === 'x' ? [r3(p), r3(c - h), r3(q), r3(c + h)] : [r3(c - h), r3(p), r3(c + h), r3(q)]));
}

/**
 * Alle gootwanden op het onderdeel: de voet (ringen en balken van G.wand, tot de onderkant van de sleuven: het kader
 * van de bordjes), de vingers erop (G.vingerDik, 0,2 smaller aan elke kant: geen samenvallende vlakken, geen overhang)
 * en de klikgroeven.
 * ringen: [[x0, z0, x1, z1]] (buitenmaat), balken: [[x0, z0, x1, z1]], wanden: [{ as, c, van, tot, sleuven }],
 * groeven: [{ as, van, tot, lijnen: [{ c, s, y, d }] }]
 */
export function gootwanden(o, { ringen, balken, wanden, groeven }, G = GOOT) {
  const w = G.wand;
  o.schets(yv(-0.5, 'Plane voet gootwanden'), (s) => {
    for (const [x0, z0, x1, z1] of ringen) { s.rrectW([x0, 0, z0], [x1, 0, z1]); s.rrectW([x0 + w, 0, z0 + w], [x1 - w, 0, z1 - w]); }
    for (const [x0, z0, x1, z1] of balken) s.rrectW([x0, 0, z0], [x1, 0, z1]);
  });
  o.extrude('boss', G.sleufBodem + 0.5, { naam: 'Gootwanden (voet)' });
  // de vingers in groepen van hoogstens G.vingersPerFeature: één boolean met honderden losse blokken is voor de exacte
  // kernel (OCCT) te zwaar, enkele kleinere gaan vlot
  const alle = wanden.flatMap((wd) => vingers(wd, G)), n = Math.ceil(alle.length / G.vingersPerFeature);
  for (let k = 0; k < n; k++) {
    const deelLijst = alle.slice(Math.round((k * alle.length) / n), Math.round(((k + 1) * alle.length) / n));
    o.schets(yv(G.sleufBodem - 0.5, `Plane vingers ${k + 1}`), (s) => deelLijst.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1])));
    o.extrude('boss', G.top - G.sleufBodem + 0.5, { naam: `Gootwanden (vingers ${k + 1})` });
  }
  // klikgroeven: een driehoek (45°/45°) per vingervlak, over het hele bereik (door de sleuven is het lucht)
  groefSneden(o, groeven, G);
}
/** sneden met een driehoek (45°/45°) langs een vlak: per groep één schets en één snede langs X of Z */
export function groefSneden(o, groeven, G = GOOT) {
  const drie = (c, s, y, D) => [[c + s * D, y - 2 * D], [c + s * D, y + 2 * D], [c - s * D, y]];
  groeven.forEach((g, i) => {
    if (g.as === 'x') o.schets(xv(g.van, `Plane klikgroeven ${i + 1}`), (s) => g.lijnen.forEach((l) => s.lusW(drie(l.c, l.s, l.y, l.d ?? G.groef.diep).map(([z, y]) => [g.van, y, z]))));
    else o.schets(zv(g.van, `Plane klikgroeven ${i + 1}`), (s) => g.lijnen.forEach((l) => s.lusW(drie(l.c, l.s, l.y, l.d ?? G.groef.diep).map(([x, y]) => [x, y, g.van]))));
    o.extrude('cut', g.tot - g.van, { naam: `Klikgroeven ${g.naam ?? i + 1}` });
  });
}

/** het dwarsprofiel van een gootdeksel [u, y] zoals het op de goot zit. Midden: u = 0 in het midden van een goot van
 *  breedte b. Rand: u = 0 op de buitenwand, de goot (breedte b) ernaast, de neus in de buitenwand */
export function dekselProfiel(soort, b, G = GOOT) {
  const K = G.deksel, yg = G.groef.y, top = G.top, boven = top + K.dik;
  const { L0, L1 } = beenMaat(soort, b, G), n = K.nok;
  if (soort === 'midden') {
    const half = [[L1, boven], [L1, yg - n], [L0, yg - n], [L0, top]];
    return [...half, ...half.map(([u, y]) => [-u, y]).reverse()];
  }
  const yn = top + K.dik / 2;
  return [[0.1, boven], [L1, boven], [L1, yg - n], [L0, yg - n], [L0, top], [0.1, top], [0.1, yn - n], [0.1 - n, yn], [0.1, yn + n]];
}
/** binnen- en buitenkant van het been (u) */
function beenMaat(soort, b, G = GOOT) {
  const inzet = (G.wand - G.vingerDik) / 2, K = G.deksel; // de vingers staan 0,2 binnen de voet
  const L0 = (soort === 'midden' ? b / 2 : b) + G.wand - inzet + K.speling;
  return { L0, L1: L0 + K.been };
}
/** de nokken van een deksel (45° op en af, 0,3 in het been): per been een driehoek [u, y] */
export function nokProfielen(soort, b, G = GOOT) {
  const { L0 } = beenMaat(soort, b, G), n = G.deksel.nok, yg = G.groef.y;
  const nok = [[L0 + 0.3, yg - n], [L0, yg - n], [L0 - n, yg], [L0, yg + n], [L0 + 0.3, yg + n]];
  return soort === 'midden' ? [nok, nok.map(([u, y]) => [-u, y])] : [nok];
}
/** de breedte van een deksel (dwars) */
export const dekselBreedte = (soort, b, G = GOOT) => { const u = dekselProfiel(soort, b, G).map((p) => p[0]); return Math.max(...u) - Math.min(...u); };

/** een gootdeksel als onderdeel: het profiel langs +X, lengte l, x = 0 aan het begin; nokken: [x-midden] langs het deksel
 *  (daar klikt het in een groef; elders blijven de benen 0,1 van de vingers) */
export function gootdeksel(soort, b, l, nokken = [], G = GOOT) {
  return dekselPlaat(`Gootdeksel ${soort === 'midden' ? '' : 'rand '}${String(Math.round(l * 10) / 10).replace('.', ',')}`, [{ soort, b, l, nokken }], G, false);
}

/** een printplaat met gootdeksels naast elkaar, de vlakke kant op het bed (y = 0), de benen omhoog; lijst: [{ soort, b, l,
 *  nokken }]. plat = false: één deksel zoals het op de goot zit (de plaat boven, het begin op x = 0, u langs +Z) */
export function dekselPlaat(naam, lijst, G = GOOT, plat = true) {
  const o = deel(naam, PETG_GOOT), boven = G.top + G.deksel.dik, lmax = Math.max(...lijst.map((d) => d.l)), x0 = plat ? -lmax / 2 : 0;
  const breed = lijst.map((d) => dekselBreedte(d.soort, d.b, G)), totaal = breed.reduce((a, q) => a + q, 0) + 4 * (lijst.length - 1);
  let z = -totaal / 2;
  const plaats = lijst.map((d, i) => { const P = dekselProfiel(d.soort, d.b, G), umin = Math.min(...P.map((p) => p[0])); const zc = plat ? z - umin : 0; z += breed[i] + 4; return { ...d, P, zc }; });
  const pt = (d, u, y, x) => [x, plat ? boven - y : y, d.zc + u];
  // per lengte één schets; elk deksel begint aan x0
  const groepen = new Map();
  for (const d of plaats) { const k = r3(d.l); if (!groepen.has(k)) groepen.set(k, []); groepen.get(k).push(d); }
  for (const [l, ds] of groepen) {
    o.schets(xv(x0, `Plane dekseltjes ${l}`), (s) => ds.forEach((d) => s.lusW(d.P.map(([u, y]) => pt(d, u, y, x0)))));
    o.extrude('boss', l, { naam: `Profiel ${String(l).replace('.', ',')}` });
  }
  // de nokken (5 lang): per plaats langs het deksel één schets
  const nk = new Map(), L = G.deksel.nokLang;
  for (const d of plaats) for (const xm of d.nokken ?? []) { const k = r3(x0 + xm - L / 2); if (!nk.has(k)) nk.set(k, []); nk.get(k).push(d); }
  for (const [xs, ds] of nk) {
    o.schets(xv(xs, `Plane nokken ${xs}`), (s) => ds.forEach((d) => nokProfielen(d.soort, d.b, G).forEach((p) => s.lusW(p.map(([u, y]) => pt(d, u, y, xs))))));
    o.extrude('boss', L, { naam: `Nokken ${String(xs).replace('.', ',')}` });
  }
  return o.doc();
}

// Berekening van de klik (PETG: E = 2100 MPa, toelaatbare rek bij herhaald klikken ~2 %): het been is een uitkragende
// balk van t = 1,2 mm en L = 7,0 mm (van de plaat tot de nok); de nok moet 0,25 mm voorbij het vingervlak:
// rek = 1,5 * t * d / L² = 1,5 * 1,2 * 0,25 / 7,0² = 0,92 % (< 2 %). De nok (45°) zit 0,1 vrij in de groef (0,35 diep,
// 45°): trekken haalt het deksel eraf. Met het deksel van de doos erop (1,9 erboven) kan geen gootdeksel loskomen.
export const KLIK_REK = (G = GOOT) => (1.5 * G.deksel.been * (G.deksel.nok - G.deksel.speling)) / (G.groef.y - G.top) ** 2;
