// Stuklijst van een deur (deuren.ontwerp): elk onderdeel één positie met aantal, benaming, materiaal, maat, gewicht en
// de vorm om te tekenen. Gelijke stukken (ook gespiegeld of omgedraaid) zijn één positie. Volgorde: kozijn, kader,
// roeden en latten, glaslatten, lasergesneden delen, panelen, glas, beslag en klein materiaal (inkoop).
// Werkt in Node en in de browser.
import { veelhoek, lengte, kaderVan, opp, MATEN } from './deuren.mjs';
import { STAAF } from './prijzen.mjs';
import { telling } from './werkwijze.mjs';
import { GLAS, OPBOUW, SCHARNIEREN } from './opties.mjs';
import { gatenVan, glaslatGaten, gatTekst, stukGeo } from './boringen.mjs';

const r1 = (x) => Math.round(x * 10) / 10;
/** materiaal van een staaf: een koopprofiel met zijn artikel, anders S235 */
const matVan = (prof) => { const s = STAAF[prof]; return s?.mat ? `${s.naam}, ${s.mat}` : s?.koop ? `${s.naam}, staal verzinkt` : `S235, ${s?.naam ?? prof}`; };
const zichtVan = (sys, s) => (s === 'roede' || s === 'boog' ? sys.roede.zicht : s === 'kozijn' || s === 'boogkozijn' ? sys.kozijn.zicht : sys.kader.zicht);

/** een recht stuk in eigen assen: u langs de staaf (0..L), v dwars; de eenvoudigste van de 4 spiegelingen. gaten (in
 *  het vlak van de groep) gaan mee: bij gelijke vorm kiest de spiegeling met de eenvoudigste gaten (zo zijn gespiegelde
 *  stukken met dezelfde gaten één positie) */
function lokaal(d, poly, gaten = [], geo = null) {
  const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], l = Math.hypot(dx, dy), u = [dx / l, dy / l], n = [-u[1], u[0]];
  const naar = (p) => [(p[0] - d.a[0]) * u[0] + (p[1] - d.a[1]) * u[1], (p[0] - d.a[0]) * n[0] + (p[1] - d.a[1]) * n[1]];
  const pts = poly.map(naar);
  const u0 = Math.min(...pts.map((p) => p[0])), L = Math.max(...pts.map((p) => p[0])) - u0, v0 = Math.min(...pts.map((p) => p[1])), V = Math.max(...pts.map((p) => p[1])) - v0;
  const basis = pts.map(([x, y]) => [x - u0, y - v0]);
  const g0 = gaten.map((b) => { const [x, y] = naar(b.p); return { ...b, u: x - u0, v: y - v0, kant: b.vlak === 'zijde' && geo ? (geo.dwars(b.p) > 0 ? 'buiten' : 'binnen') : undefined }; });
  const spiegel = [[false, false], [false, true], [true, false], [true, true]];
  const sleutel = (p) => p.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).sort().join(' ');
  const gsl = (gs) => gs.map((b) => `${Math.round(b.u)}|${Math.round(b.v)}|${b.vlak}|${Math.round(b.z ?? 0)}|${gatTekst(b)}`).sort().join(' ');
  const varianten = spiegel.map(([su, sv]) => {
    const p = basis.map(([x, y]) => [su ? L - x : x, sv ? V - y : y]);
    const gs = g0.map((b) => ({ ...b, u: su ? L - b.u : b.u, v: sv ? V - b.v : b.v }));
    return { p, gs, k: sleutel(p), kg: gsl(gs), sv };
  });
  const best = varianten.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.kg < b.kg ? -1 : a.kg > b.kg ? 1 : 0))[0];
  // de buitenkant (naar de rand van de deur) in eigen assen: v = 0 of v = V
  let vBuiten = null;
  if (geo) { const vb = naar(geo.buiten(geo.L / 2))[1] - v0; vBuiten = Math.round(best.sv ? V - vb : vb); }
  return { pts: best.p, L, V, sleutel: best.k, boringen: best.gs.map(({ p, ...b }) => b), gatSleutel: best.kg, vBuiten };
}
/** hoek van een uiteinde tegen de as: 90 = recht, 45 = verstek */
function eindhoeken(pts) {
  const s = [...pts].sort((a, b) => a[0] - b[0]), hoek = (p, q) => Math.round((Math.atan2(Math.abs(q[1] - p[1]), Math.abs(q[0] - p[0]) || 1e-9) * 180) / Math.PI);
  return [hoek(s[0], s[1]), hoek(s[2], s[3])];
}
/** de gaten kort in de opmerking: '; gaten: 4 x Ø6,5, 2 x Ø5,5 ⌵ Ø10 x 90°' */
const gatenOpm = (gs) => { if (!gs?.length) return ''; const t = new Map(); for (const b of gs) t.set(gatTekst(b), (t.get(gatTekst(b)) ?? 0) + 1); return `; gaten: ${[...t].map(([k, n]) => `${n} x ${k}`).join(', ')}`; };
const bewerking = (h, tot) => h.map((x) => (x >= 89 ? 'recht' : tot ? `schuin ${90 - x}° (volgens de boog)` : `verstek ${x}°`)).join(' · ');

/** de stuklijst: { posities: [{ pos, soort, naam, mat, maat, n, kg, opm, vorm, plaats }] } */
export function stuklijst(o, keuzes = {}) {
  const sys = o.sys, lijst = [], k = sys.kader.zicht, stukken = [];
  const zoek = (sleutel) => lijst.find((p) => p.sleutel === sleutel);
  const voeg = (rij, plaats) => { const p = zoek(rij.sleutel); if (p) { p.n += rij.n; if (plaats) p.plaatsen.push(plaats); return; } lijst.push({ ...rij, plaats, plaatsen: plaats ? [plaats] : [] }); };
  const groepen = [['kozijn', o.kozijn, 0, 0, o.kozijn.B, o.kozijn.H], ...o.vleugels.map((v) => ['vleugel', v, v.x, v.y, v.B, v.H]), ...o.vast.map((v) => [v.soort ?? 'zijlicht', v, v.x, v.y, v.B, v.H])];
  const naamVan = (wat, d) => {
    const st = Math.abs(d.a[0] - d.b[0]) < 1e-6, li = Math.abs(d.a[1] - d.b[1]) < 1e-6;
    if (d.soort === 'kozijn') return st ? (d.a[0] < 1 + sys.kozijn.zicht / 2 || d.a[0] > o.kozijn.B - sys.kozijn.zicht / 2 - 1 ? 'Kozijn: stijl' : 'Kozijn: tussenstijl') : d.a[1] > o.kozijn.H - sys.kozijn.zicht ? 'Kozijn: bovenregel' : d.a[1] < sys.kozijn.zicht ? 'Kozijn: onderregel zijlicht' : 'Kozijn: kalf';
    if (d.soort === 'kader') return st ? 'Kader: staander' : 'Kader: regel';
    return `${wat === 'vleugel' ? 'Roede' : `Roede ${wat}`}${d.tot ? ' tot in de boog' : st ? ' verticaal' : li ? ' horizontaal' : ': straal'}`;
  };
  // 1. staven (zaaglijst): echte vorm uit veelhoek(); bij roeden de kern en de 2 latten apart
  for (const [gi, [wat, g, dx, dy, B, H]] of groepen.entries()) for (const d of g.delen) {
    if (!d.a) continue;
    const w = zichtVan(sys, d.soort), mid = [dx + (d.a[0] + d.b[0]) / 2, dy + (d.a[1] + d.b[1]) / 2];
    const vleugel = wat === 'vleugel' ? g : null;
    const stuk = (prof, breedte, aantal, naam, extra = '', rol = null) => {
      const gaten = rol ? gatenVan(o, { g, d, B, H, rol, vleugel, keuzes }) : [];
      const vorm = lokaal(d, veelhoek(d, breedte, B, H), gaten, rol ? stukGeo(d, breedte, B, H) : null), h = eindhoeken(vorm.pts), s = STAAF[prof];
      const sleutel = `staaf|${prof}|${vorm.sleutel}|${naam}|${vorm.gatSleutel}`;
      voeg({ sleutel, soort: 'staaf', naam, prof, mat: matVan(prof), maat: `L = ${Math.round(vorm.L)}`, L: vorm.L, n: aantal, kg: (s?.kgm ?? 0) * vorm.L / 1000, opm: `${bewerking(h, d.tot)}${extra}${gatenOpm(vorm.boringen)}`, zagen: h.map((x) => `${x}°`).join('/'), vorm, gaten: vorm.boringen, vBuiten: vorm.vBuiten }, mid);
      return sleutel;
    };
    // elk stuk op zijn plaats (voor de opengewerkte tekening): de roede met haar volle zichtbreedte, het nummer van de kern
    const plaats = (sleutel) => stukken.push({ sleutel, d, gi, dx, dy, B, H, w });
    if (d.soort === 'kader' || d.soort === 'kozijn') plaats(stuk(d.soort === 'kader' ? sys.kader.staaf : sys.kozijn.staaf, w, 1, naamVan(wat, d), '', d.soort));
    else if (d.soort === 'roede') {
      const kern = sys.roede.lat ? 20 : w;
      plaats(stuk(sys.roede.staaf, kern, 1, sys.roede.lat ? `${naamVan(wat, d)}: kern` : naamVan(wat, d), '', sys.roede.lat ? 'kern' : 'roede'));
      if (sys.roede.lat) { stuk(sys.roede.lat, w, 1, `${naamVan(wat, d)}: lat voor`, '; voor: hechten om de 150 en lassen'); stuk(sys.roede.lat, w, 1, `${naamVan(wat, d)}: lat achter`, '; achter: geschroefd', 'latAchter'); }
    }
  }
  // 2. glaslatten 15x4: per ruitzijde langs de binnenkant van het kader of het kozijn, voor en achter
  for (const [wat, g, dx, dy, B, H] of groepen) {
    if (wat === 'kozijn') continue;
    const r = wat === 'vleugel' ? k : 0, op = (q) => Math.abs(q[0] - r) < 0.01 || Math.abs(q[0] - (B - r)) < 0.01 || Math.abs(q[1] - r) < 0.01 || Math.abs(q[1] - (H - r)) < 0.01;
    for (const p of g.ruiten) p.forEach((a, i) => {
      const b = p[(i + 1) % p.length], lijn = (Math.abs(a[0] - b[0]) < 0.01 && (Math.abs(a[0] - r) < 0.01 || Math.abs(a[0] - (B - r)) < 0.01)) || (Math.abs(a[1] - b[1]) < 0.01 && (Math.abs(a[1] - r) < 0.01 || Math.abs(a[1] - (H - r)) < 0.01));
      const recht = Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01;
      if (sys.koop ? !recht : !op(a) || !op(b) || !lijn) return;
      const l = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])), s = STAAF[sys.glaslat.staaf];
      if (l < 20) return;
      if (sys.glaslat.achter) {
        const h = STAAF[sys.glaslat.achter], mid = [dx + (a[0] + b[0]) / 2, dy + (a[1] + b[1]) / 2], gg = glaslatGaten(o, l);
        voeg({ sleutel: `glaslat|${l}`, soort: 'staaf', naam: 'Glaslat voor', prof: sys.glaslat.staaf, mat: matVan(sys.glaslat.staaf), maat: `L = ${l}`, L: l, n: 1, kg: (s?.kgm ?? 0) * l / 1000, opm: 'recht; voor: hechten om de 150 en lassen', vorm: { pts: [[0, 0], [l, 0], [l, 15], [0, 15]], L: l, V: 15 } }, mid);
        voeg({ sleutel: `glaslatA|${l}`, soort: 'staaf', naam: 'Glaslat achter (hoeklijn)', prof: sys.glaslat.achter, mat: matVan(sys.glaslat.achter), maat: `L = ${l}`, L: l, n: 1, kg: (h?.kgm ?? 0) * l / 1000, opm: `recht; M4 verzonken in de koker${gatenOpm(gg)}`, vorm: { pts: [[0, 0], [l, 0], [l, 15], [0, 15]], L: l, V: 15 }, gaten: gg }, mid);
        return;
      }
      if (sys.glaslat.staaf === 'dupontL2010') {
        const mid = [dx + (a[0] + b[0]) / 2, dy + (a[1] + b[1]) / 2], gg = glaslatGaten(o, l), vorm = { pts: [[0, 0], [l, 0], [l, 10], [0, 10]], L: l, V: 10 };
        voeg({ sleutel: `glaslat|${l}`, soort: 'staaf', naam: 'L-profiel voor (gekit)', prof: sys.glaslat.staaf, mat: matVan(sys.glaslat.staaf), maat: `L = ${l}`, L: l, n: 1, kg: (s?.kgm ?? 0) * l / 1000, opm: 'recht; met kleefkit tegen de koker', vorm }, mid);
        voeg({ sleutel: `glaslatA|${l}`, soort: 'staaf', naam: 'L-profiel achter (geschroefd)', prof: sys.glaslat.staaf, mat: matVan(sys.glaslat.staaf), maat: `L = ${l}`, L: l, n: 1, kg: (s?.kgm ?? 0) * l / 1000, opm: `recht${gatenOpm(gg)}`, vorm, gaten: gg }, mid);
        return;
      }
      voeg({ sleutel: `glaslat|${l}`, soort: 'staaf', naam: 'Glaslat', prof: sys.glaslat.staaf, mat: matVan(sys.glaslat.staaf), maat: `L = ${l}`, L: l, n: sys.koop ? sys.glaslatRondom ?? 1 : 2, kg: (s?.kgm ?? 0) * l / 1000, opm: sys.koop ? `recht; de andere kant is de sponning van het profiel; ${sys.glaslat.uitleg}` : 'recht; voor gelast, achter geschroefd (M4 verzonken om de 250)', vorm: { pts: [[0, 0], [l, 0], [l, 15], [0, 15]], L: l, V: 15 } }, [dx + (a[0] + b[0]) / 2, dy + (a[1] + b[1]) / 2]);
    });
  }
  // 3. greep en aanslag
  for (const v of o.vleugels) {
    const G = MATEN.greep, xg = v.taats === 'links' ? v.x + v.B - G.afstand : v.x + G.afstand;
    if (!sys.alu) voeg({ sleutel: 'greep', soort: 'staaf', naam: 'Greep (voor en achter)', prof: 'rond25', mat: 'S235, rond Ø25', maat: `L = ${G.lengte}`, L: G.lengte, n: 2, kg: STAAF.rond25.kgm * G.lengte / 1000, opm: 'uiteinden rond slijpen; 2 x M8 op 80 van de uiteinden', vorm: { pts: [[0, 0], [G.lengte, 0], [G.lengte, G.d], [0, G.d]], L: G.lengte, V: G.d, gaten: [80, G.lengte - 80], rond: true } }, [xg, G.hoogte]);
    if (o.scharnier === 'verdekt' && !sys.koop) for (const [l, nm] of [[Math.round(v.H), 'zijde'], [Math.round(v.B), 'boven']]) voeg({ sleutel: `aanslag|${l}`, soort: 'staaf', naam: `Aanslag op het kozijn (${nm})`, prof: 'plat15x4', mat: 'S235, platstaal 15x4', maat: `L = ${l}`, L: l, n: nm === 'zijde' ? 2 : 1, kg: STAAF.plat15x4.kgm * l / 1000, opm: 'recht; op het kozijn gelast', vorm: { pts: [[0, 0], [l, 0], [l, 15], [0, 15]], L: l, V: 15 } }, [v.x + v.B / 2, v.y + v.H + 10]);
  }
  // 4. lasergesneden: bogen (kern in lagen, latten), boog van kader en kozijn, glaslat in de boog, taatsplaten, greephouders
  const bsl = (naam, d, zicht, t) => `boog|${naam}|${Math.round(d.r)}|${Math.round(d.g1 - d.g0)}|${zicht}|${t}`;
  const boog = (naam, d, zicht, t, n, opm, plaats) => voeg({ sleutel: bsl(naam, d, zicht, t), soort: 'laser', naam, mat: `S235, plaat ${t} mm`, maat: `R ${r1(d.r)} x ${zicht}, ${r1(d.g1 - d.g0)}°`, n, kg: ((Math.abs(d.g1 - d.g0) * Math.PI) / 180) * d.r * zicht * t * 7.85e-6, opm, vorm: { r: d.r, zicht, hoek: Math.abs(d.g1 - d.g0), t } }, plaats);
  for (const [gi, [, g, dx, dy]] of groepen.entries()) for (const d of g.delen) {
    if (d.a) continue;
    const w = zichtVan(sys, d.soort);
    stukken.push({ sleutel: d.soort === 'boog' ? bsl('Boogroede: kern', d, 20, sys.boog.kern) : bsl(d.soort === 'boogkozijn' ? 'Kozijn: boog' : 'Kader: boog', d, w, sys.boog.kern), d, gi, dx, dy, w });
    const gm = (((d.g0 + d.g1) / 2) * Math.PI) / 180, p = [dx + d.c[0] + d.r * Math.cos(gm), dy + d.c[1] + d.r * Math.sin(gm)];
    if (d.soort === 'boog') {
      const lagen = sys.boog.roedeLagen ?? 1;
      boog('Boogroede: kern', d, 20, sys.boog.kern, lagen, lagen > 1 ? `${lagen} lagen op elkaar gelast` : 'op de mal 1:1 leggen en hechten', p);
      if (sys.roede.lat) boog('Boogroede: lat voor en achter', d, 30, 3, 2, 'voor gelast, achter geschroefd', p);
    } else boog(d.soort === 'boogkozijn' ? 'Kozijn: boog' : 'Kader: boog', d, zichtVan(sys, d.soort), sys.boog.kern, sys.boog.lagenKader, `${sys.boog.lagenKader} lagen van ${sys.boog.kern} mm op elkaar gelast, rond slijpen`, p);
  }
  for (const v of o.vleugels) if (v.aanzet !== undefined) boog('Glaslat in de boog', { r: v.B / 2 - k - 7.5, g0: 0, g1: 180 }, 15, 4, 2, 'voor gelast, achter geschroefd', [v.x + v.B / 2, v.y + v.H - 30]);
  const inkoop = (naam, mat, n, opm, plaats) => voeg({ sleutel: `inkoop|${naam}`, soort: 'inkoop', naam, mat, maat: '', n, kg: 0, opm }, plaats);
  const plaat = (naam, b, l, t, n, gaten, opm, plaats) => voeg({ sleutel: `plaat|${naam}|${b}|${l}|${t}`, soort: 'laser', naam, mat: `S235, plaat ${t} mm`, maat: `${b} x ${l}`, n, kg: b * l * t * 7.85e-6, opm, vorm: { b, l, t, gaten } }, plaats);
  for (const v of o.vleugels) {
    const xa = v.taats === 'links' ? v.x + MATEN.taats : v.x + v.B - MATEN.taats, xg = v.taats === 'links' ? v.x + v.B - MATEN.greep.afstand : v.x + MATEN.greep.afstand;
    if (o.scharnier !== 'verdekt' && !sys.pivot) {
      plaat('Taatsplaat onder', 36, 220, 8, 1, [[40, 18, 6.8], [180, 18, 6.8]], '2 x M8 tappen (boor Ø6,8) voor de deurplaat van de pivot; in de onderregel gelast', [xa, v.y + 20]);
      plaat('Taatsplaat boven', 36, 140, 8, 1, [[40, 18, 20]], 'Ø20 voor de bovenpen (die in de deur zit); in de bovenregel gelast', [xa, v.y + v.H - 20]);
      voeg({ sleutel: 'plaat|Lasring bovenpen', soort: 'laser', naam: 'Lasring bovenpen (bus in het kozijn)', mat: 'S235, plaat 8 mm', maat: 'Ø30 / Ø21', n: 1, kg: Math.PI * (15 * 15 - 10.5 * 10.5) * 8 * 7.85e-6, opm: 'binnen in de bovenregel van het kozijn gelast, recht boven de taatsas', vorm: { b: 30, l: 30, t: 8, gaten: [[15, 15, 21]] } }, [xa, o.kozijn.H - 20]);
    }
    if (!sys.alu) plaat('Greephouder', 25, 40, 10, 2, [[20, 12.5, 6.8]], 'M8 tappen (boor Ø6,8); op de staander gelast', [xg, MATEN.greep.hoogte - MATEN.greep.lengte / 2 + 80]);
    else inkoop('Deurgreep 800 mm mat zwart, rug aan rug (voor en achter, Intersteel 800 x 40)', 'RVS', 1, 'doorgaande bouten M8 door de staander (Ø9 boren, hart 20 uit de sluitkant)', [xg, MATEN.greep.hoogte]);
  }
  // 5. panelen
  for (const [, g, dx, dy] of groepen) for (const p of g.panelen ?? []) {
    const [x0, y0, x1, y1] = kaderVan(p), b = Math.round(x1 - x0 - 2), l = Math.round(y1 - y0 - 2);
    voeg({ sleutel: `paneel|${b}|${l}`, soort: 'laser', naam: 'Paneel', mat: 'S235, plaat 3 mm', maat: `${b} x ${l}`, n: 1, kg: b * l * 3 * 7.85e-6, opm: '1 mm kleiner dan het vak; in het midden van de diepte ingelast', vorm: { b: l, l: b, t: 3, gaten: [] } }, [dx + (x0 + x1) / 2, dy + (y0 + y1) / 2]);
  }
  // 6. glas: gelijke ruiten samen (ook gespiegeld); glasmaat = daglicht + 4 mm rondom
  const gl = GLAS[keuzes.glas] ?? GLAS.helder, ob = OPBOUW[o.opbouw ?? 'enkel'], ex = 2 * (o.sys.inloop ?? MATEN.inloop) - 4;
  for (const [, g, dx, dy] of groepen) for (const p of g.ruiten ?? []) {
    const [x0, y0, x1, y1] = kaderVan(p), b = Math.round(x1 - x0 + ex), h = Math.round(y1 - y0 + ex), recht = p.length === 4;
    const pts = p.map(([x, y]) => [x - x0, y - y0]);
    // gespiegelde ruiten (links en rechts van een middenroede) hebben dezelfde maat en oppervlakte: één positie
    const key = `${recht ? 'r' : 'v'}|${b}|${h}|${Math.round(opp(p) / 200)}`;
    voeg({ sleutel: `glas|${key}`, soort: 'glas', naam: recht ? 'Ruit' : 'Ruit met vorm (DXF)', mat: o.opbouw === 'dubbel' ? `${gl.soort} | 14 | 6 gehard` : gl.soort, maat: `${b} x ${h}`, n: 1, kg: ((opp(p) + ex * (x1 - x0 + y1 - y0)) / 1e6) * ob.kgm2, opm: recht ? 'veiligheidsglas; glasmaat = daglicht + 4 rondom' : 'veiligheidsglas; snijden op de DXF (daglicht + 4 rondom)', vorm: { pts, b: x1 - x0, h: y1 - y0, recht } }, [dx + (x0 + x1) / 2, dy + (y0 + y1) / 2]);
  }
  // 7. inkoop: scharnieren, klein materiaal
  const t = telling(o), sk = keuzes.scharnierModel ?? (o.scharnier === 'verdekt' ? 'verdekt' : sys.pivot ? 'revolta100' : SCHARNIEREN[keuzes.scharnier] ? keuzes.scharnier : 'budget'), sch = SCHARNIEREN[sk];
  for (const v of o.vleugels) {
    if (o.scharnier === 'verdekt') { const xs = v.taats === 'links' ? v.x : v.x + v.B; inkoop(sch.naam.replace(/^Verdekt: 3 x /, 'Verdekt scharnier '), 'inkoop', 3, '250 onder de bovenkant, 250 boven de onderkant en in het midden', [xs, v.y + v.H - 250]); }
    else inkoop(`${sch.naam.replace(/^Pivot: /, 'Taatsscharnier ')} (pot, as en bovenpen)`, 'inkoop', 1, `tot ${sch.maxKg} kg per vleugel`, [v.taats === 'links' ? v.x + MATEN.taats : v.x + v.B - MATEN.taats, 0]);
  }
  if (sys.alu) {
    const vb = sys.verbinders;
    inkoop(vb?.hoek ?? 'Hoekverbinder voor koker 50x25x2 (vleugel) en 60x30x2 (kozijn)', 'aluminium / zamak', t.hoeken, 'in elke verstekhoek, met stelschroeven en 2K-lijm', null);
    if (t.tees) inkoop(vb?.tee ?? 'T-verbinder voor koker 50x25x2 (roeden)', vb ? 'RVS A2' : 'aluminium / zamak', t.tees, 'in elk uiteinde van een roede', null);
    if (t.tees) inkoop('Afdekdop voor het toegangsgat in de stijl', 'kunststof, kleur van het profiel', t.tees, vb ? 'Ø10' : 'Ø13', null);
    if (t.tees && !vb) { inkoop('Cilinderkopbout M6 x 30, inbus (ISO 4762)', 'RVS A2', t.tees, 'door de binnenwand van de stijl in de T-verbinder (toegang Ø13 in de buitenwand)', null); inkoop('Stelschroef M5 x 6 (ISO 4026)', 'RVS A2', t.tees, 'zet de T-verbinder vast in de roede', null); }
    inkoop('Stelschroef M6 x 8 (ISO 4026)', 'RVS A2', t.hoeken * 4, '4 per hoek, in de hoekverbinder (aangedraaid van de glaszijde)', null);
    inkoop('Afstandsbus Ø12 / Ø8,5 voor de greepbouten', 'RVS', 2 * o.vleugels.length, 'in de koker, zodat de bouten M8 de staander niet platdrukken', null);
    if (o.scharnier !== 'verdekt') { inkoop('Inlegplaat pivot onder 30 x 220 x 6, 2 x M6', 'RVS', o.vleugels.length, 'in de onderregel geschoven voor de hoeken dicht gaan', null); inkoop('Pendrager 30 x 60 (holtehoogte): deur Ø20 voor de pen, kozijn Ø19,2 glijbus; zijdelings M6', 'aluminium of POM', 2 * o.vleugels.length, 'in de bovenregel van de deur en van het kozijn, vast met een stelschroef', null); inkoop('Bout M6 x 16 verzonken, inbus (ISO 10642)', 'RVS A2', 2 * o.vleugels.length, 'deurplaat onder in de inlegplaat', null); inkoop('Stelschroef M6 x 10 (ISO 4026)', 'RVS A2', 2 * o.vleugels.length, 'zet de pendragers vast (glaszijde en muurkant)', null); }
    if (!vb) inkoop('Boorschroef RVS 3,5 x 13 (achterste L-profielen)', 'A2', Math.ceil((t.latM * 1000) / 2 / 300), 'om de 300 mm', null);
  } else {
    inkoop('Schroef M4 x 10 verzonken, RVS (ISO 10642)', 'A2', t.gaten, 'hoeklijnen achter en latten op de roeden, om de 250', null);
    if (o.scharnier !== 'verdekt' && keuzes.scharnier !== 'premium') inkoop('Bout M8 x 20 verzonken, inbus (ISO 10642)', '8.8 verzinkt', 2 * o.vleugels.length, 'deurplaat van de pivot in de taatsplaat (M8)', null);
  }
  inkoop('Glasblokje 3 mm', 'kunststof', t.ruiten * 2, '2 onder elke ruit', null);
  inkoop('Glaskit transparant (koker 310 ml)', 'MS-polymeer', Math.max(1, Math.ceil(t.latM / 12)), 'tegen de vaste lat', null);
  inkoop('Kozijnanker Ø8', 'verzinkt', 6, '3 per stijl', null);
  lijst.forEach((p, i) => { p.pos = i + 1; });
  for (const s of stukken) s.pos = zoek(s.sleutel)?.pos;
  return { posities: lijst, stukken };
}
