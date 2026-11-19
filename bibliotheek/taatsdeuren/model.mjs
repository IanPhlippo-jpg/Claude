// 3D-model (Phlippo CAD .kcad) van een taatsdeur uit deuren.mjs: elk staafdeel, elke boog en elke ruit een onderdeel,
// met de greep (voor en achter) en het taatsbeslag. Assen: x breedte, y hoogte, z diepte (0 = midden van de deur).
import { Onderdeel, component, vlak } from '../../voorbeelden/lib/schets.mjs';
import { veelhoek, MATEN } from './deuren.mjs';

let tel = 0;
const zv = (z, naam) => vlak(`z${++tel}`, naam ?? `Plane ${tel}`, [0, 0, z], [0, 0, 1], 'reference');
const yv = (y, naam) => vlak(`y${++tel}`, naam ?? `Plane ${tel}`, [0, y, 0], [0, 1, 0], 'reference');
const STAAL = { name: 'S235, gestraald en gepoedercoat zwart structuur (RAL 9005)', density: 7850, color: '#24272a' };
const GLAS = { name: 'gelaagd glas 44.2 helder', density: 2500, color: '#b9d3dc' };
const RVS = { name: 'staal, zwart gepoedercoat (greep)', density: 7850, color: '#111214' };
const BESLAG = { name: 'taatsscharnier (staal verzinkt)', density: 7850, color: '#9aa0a6' };

/** een veelhoek in het xy-vlak, van z0 tot z1 */
function plaatDeel(naam, mat, pts, z0, z1) {
  const o = new Onderdeel(naam, mat);
  o.schets(zv(z0, `Plane ${naam}`), (s) => s.lus(pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])));
  o.extrude('boss', z1 - z0, { naam });
  return o.doc();
}
/** een boogband (hartlijnstraal r, breedte w) met echte bogen, van z0 tot z1 */
function boogDeel(naam, mat, d, w, z0, z1, dx = 0, dy = 0) {
  const o = new Onderdeel(naam, mat), r1 = d.r + w / 2, r0 = d.r - w / 2, c = [d.c[0] + dx, d.c[1] + dy];
  const P = (r, g) => [c[0] + r * Math.cos((g * Math.PI) / 180), c[1] + r * Math.sin((g * Math.PI) / 180)];
  // bogen van 180° in twee helften (een boog in de schets is ten hoogste een halve cirkel)
  const gm = (d.g0 + d.g1) / 2;
  o.schets(zv(z0, `Plane ${naam}`), (s) => s.pad([P(r1, d.g0), { boog: c, naar: P(r1, gm), ccw: true }, { boog: c, naar: P(r1, d.g1), ccw: true }, P(r0, d.g1), { boog: c, naar: P(r0, gm), ccw: false }, { boog: c, naar: P(r0, d.g0), ccw: false }, P(r1, d.g0)]));
  o.extrude('boss', z1 - z0, { naam });
  return o.doc();
}
function cilinderY(naam, mat, x, z, r, y0, y1) {
  const o = new Onderdeel(naam, mat);
  o.schets(yv(y0, `Plane ${naam}`), (s) => s.cirkelW([x, y0, z], r));
  o.extrude('boss', y1 - y0, { naam });
  return o.doc();
}
function blokZ(naam, mat, x0, y0, x1, y1, z0, z1) { return plaatDeel(naam, mat, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1); }

// ---------------------------------------------------------------- werkplaatsmodel (optie werkplaats; de standaarduitvoer blijft gelijk)
const KOOP = { 'fab.soort': 'koop' };
const r3 = (v) => Math.round(v * 1000) / 1000;
/** de wanddikte van een koker uit zijn staafsleutel ('koker40x40x2' -> 2), anders null (massief of koopprofiel) */
const wandVan = (staaf) => { const m = /^koker\d+x\d+x(\d+(?:\.\d+)?)$/.exec(staaf ?? ''); return m ? Number(m[1]) : null; };
/** een boss als eigen lichaam in een onderdeel met meer lichamen (een gelaste groep); geeft het id van de feature */
function lichaam(ond, plane, teken, diepte, naam) {
  ond.schets(plane, teken);
  ond.extrude('boss', diepte, { naam });
  const f = ond.features[ond.features.length - 1];
  f.merge = false;
  return f.id;
}
/** een staafdeel in een gelaste groep: een koker hol (de holte alleen in dit lichaam, open aan beide uiteinden), de rest vol */
function staafIn(ond, d, w, t, wand, dx, dy, B, H, naam) {
  if (!d.a) {
    const r1 = d.r + w / 2, r0 = d.r - w / 2, c = [d.c[0] + dx, d.c[1] + dy], gm = (d.g0 + d.g1) / 2;
    const P = (r, g) => [c[0] + r * Math.cos((g * Math.PI) / 180), c[1] + r * Math.sin((g * Math.PI) / 180)];
    lichaam(ond, zv(-t / 2, `Plane ${naam}`), (s) => s.pad([P(r1, d.g0), { boog: c, naar: P(r1, gm), ccw: true }, { boog: c, naar: P(r1, d.g1), ccw: true }, P(r0, d.g1),
      { boog: c, naar: P(r0, gm), ccw: false }, { boog: c, naar: P(r0, d.g0), ccw: false }, P(r1, d.g0)]), t, naam);
    return;
  }
  const id = lichaam(ond, zv(-t / 2, `Plane ${naam}`), (s) => s.lus(veelhoek(d, w, B, H).map(([x, y]) => [r3(x + dx), r3(y + dy)])), t, naam);
  if (!wand) return;
  // de holte rond de hartlijn, een zichtbreedte voorbij elk uiteinde; Feature Scope = dit lichaam, zodat het verstek van de buur heel blijft
  const ex = d.b[0] - d.a[0], ey = d.b[1] - d.a[1], l = Math.hypot(ex, ey), u = [ex / l, ey / l], nv = [-u[1], u[0]], h = w / 2 - wand;
  const A = [d.a[0] + dx - u[0] * w, d.a[1] + dy - u[1] * w], E = [d.b[0] + dx + u[0] * w, d.b[1] + dy + u[1] * w];
  ond.schets(zv(-t / 2 + wand, `Plane ${naam} holte`), (s) => s.lus([[A[0] + nv[0] * h, A[1] + nv[1] * h], [E[0] + nv[0] * h, E[1] + nv[1] * h], [E[0] - nv[0] * h, E[1] - nv[1] * h],
    [A[0] - nv[0] * h, A[1] - nv[1] * h]].map(([x, y]) => [r3(x), r3(y)])));
  ond.extrude('cut', t - 2 * wand, { naam: `${naam} holte` });
  ond.features[ond.features.length - 1].scope = [`${id}#0`];
}
/** een rechte lat met doorsnede `sec` ([[n, z], ...]: n dwars naar het glas toe, z in de diepte) langs a -> b */
function latIn(ond, naam, a, b, binnen, sec) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const pl = vlak(`l${++tel}`, `Plane ${naam}`, [a[0], a[1], 0], [u[0], u[1], 0], 'reference');
  lichaam(ond, pl, (s) => s.lusW(sec.map(([q, z]) => [a[0] + binnen[0] * q, a[1] + binnen[1] * q, z])), l, naam);
}
/** de glaslatten van een ruit (lat 15 x 4 voor, gelast; hoeklijn 15 x 15 x 3 achter, geschroefd): een stuk per zijde op de binnenrand */
function glaslatten(o, v, p, voor, achter, k) {
  const gz = (o.glasDikte ?? 8.8) / 2, op = (q) => Math.abs(q[0] - k) < 0.01 || Math.abs(q[0] - (v.B - k)) < 0.01 || Math.abs(q[1] - k) < 0.01
    || Math.abs(q[1] - (v.H - k)) < 0.01;
  const mx = p.reduce((s, q) => s + q[0], 0) / p.length, my = p.reduce((s, q) => s + q[1], 0) / p.length;
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!op(a) || !op(b) || l < 20 || (Math.abs(a[0] - b[0]) > 0.01 && Math.abs(a[1] - b[1]) > 0.01)) return;
    const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], nn = [-u[1], u[0]], s = (mx - a[0]) * nn[0] + (my - a[1]) * nn[1] > 0 ? 1 : -1, binnen = [nn[0] * s, nn[1] * s];
    const A = [a[0] + v.x, a[1] + v.y], B = [b[0] + v.x, b[1] + v.y];
    latIn(voor, `Glaslat voor ${Math.round(l)}`, A, B, binnen, [[0, gz], [4, gz], [4, gz + 15], [0, gz + 15]]);
    latIn(achter, `Glaslat achter ${Math.round(l)}`, A, B, binnen, [[0, -gz - 15], [3, -gz - 15], [3, -gz - 3], [15, -gz - 3], [15, -gz], [0, -gz]]);
  });
}
/**
 * het werkplaatsmodel (docs/36 LF4 en OA2): het kozijn en elke vleugel als één gelast onderdeel met een lichaam per
 * staaf (kokers hol met de wand uit hun staaf), de glaslatten voor gelast in de vleugel en de hoeklijnen achter als
 * eigen (geschroefd) onderdeel; glas en taatsbeslag koopdelen (eigenschap fab.soort = koop); greep zoals in het model.
 */
function werkplaats(o, naam) {
  const basis = samenstelling(o, naam), sys = o.sys, comps = [];
  let n = 0;
  const at = (nm, doc) => comps.push(component(`c${++n}`, `${nm}<1>`, doc, [0, 0, 0]));
  const maat = (soort) => (soort === 'roede' || soort === 'boog' ? sys.roede : soort === 'kozijn' || soort === 'boogkozijn' ? sys.kozijn : sys.kader);
  const groep = (ond, delen, dx, dy, B, H, wat) => delen.forEach((d, i) => {
    const m = maat(d.soort);
    staafIn(ond, d, m.zicht, m.diepte, d.soort === 'kader' || d.soort === 'kozijn' ? wandVan(m.staaf) : null, dx, dy, B, H, `${wat} ${d.soort} ${i + 1}`);
  });
  const kz = new Onderdeel('Kozijn', STAAL);
  groep(kz, o.kozijn.delen, 0, 0, o.kozijn.B, o.kozijn.H, 'Kozijn');
  at('Kozijn', kz.doc());
  for (const [wat, lijst] of [['Vleugel', o.vleugels], ['Vast', o.vast]]) for (const [i, v] of lijst.entries()) {
    const nm = `${wat}${lijst.length > 1 ? ` ${i + 1}` : ''}`, ond = new Onderdeel(nm, STAAL), achter = new Onderdeel(`${nm} glaslatten achter`, STAAL);
    groep(ond, v.delen, v.x, v.y, v.B, v.H, nm);
    for (const [j, p] of (v.panelen ?? []).entries()) lichaam(ond, zv(-1.5, `Plane ${nm} paneel ${j + 1}`), (s) => s.lus(p.map(([x, y]) => [r3(x + v.x), r3(y + v.y)])), 3, `Paneel ${j + 1}`);
    if (sys.glaslat.achter && !sys.koop) for (const p of v.ruiten) glaslatten(o, v, p, ond, achter, wat === 'Vleugel' ? sys.kader.zicht : 0);
    at(nm, ond.doc());
    if (achter.features.length) at(`${nm} glaslatten achter`, achter.doc());
  }
  for (const c of basis.components) {
    if (/^(Kozijn|Vleugel|Vast|Paneel) /.test(c.name)) continue;
    comps.push({ ...c, id: `c${++n}`, part: /^(Glas|Taatspot|Taatsas|Bovenpen)/.test(c.name) ? { ...c.part, properties: KOOP } : c.part });
  }
  return { ...basis, components: comps, transparentBodies: comps.filter((c) => /^Glas/.test(c.name)).map((c) => c.id) };
}

/**
 * de samenstelling van een ontwerp (deuren.ontwerp). opts.werkplaats (de werkplaatsextensies, docs/36 LF4 en OA2): de
 * kokers hol met hun wanddikte uit de staaf, de glaslatten voor en achter als staven, en glas en taatsbeslag als
 * koopdelen (eigenschap fab.soort = koop). Zonder de optie is de uitvoer ongewijzigd.
 */
export function samenstelling(o, naam, opts = {}) {
  if (opts.werkplaats) return werkplaats(o, naam);
  const comps = [], sys = o.sys, glasIds = [];
  let n = 0;
  const at = (nm, doc) => comps.push(component(`c${++n}`, `${nm}<1>`, doc, [0, 0, 0]));
  const diepte = (soort) => (soort === 'roede' || soort === 'boog' ? sys.roede.diepte : soort === 'kozijn' || soort === 'boogkozijn' ? sys.kozijn.diepte : sys.kader.diepte);
  const zicht = (soort) => (soort === 'roede' || soort === 'boog' ? sys.roede.zicht : soort === 'kozijn' || soort === 'boogkozijn' ? sys.kozijn.zicht : sys.kader.zicht);
  const deel = (d, dx, dy, Bv, Hv, wat) => {
    const w = zicht(d.soort), t = diepte(d.soort), nm = `${wat} ${d.soort} ${n + 1}`;
    if (d.a) at(nm, plaatDeel(nm, STAAL, veelhoek(d, w, Bv, Hv).map(([x, y]) => [x + dx, y + dy]), -t / 2, t / 2));
    else at(nm, boogDeel(nm, STAAL, d, w, -t / 2, t / 2, dx, dy));
  };
  for (const d of o.kozijn.delen) deel(d, 0, 0, o.kozijn.B, o.kozijn.H, 'Kozijn');
  const glasT = o.glasDikte ?? 8.8;
  for (const [wat, groep] of [['Vleugel', o.vleugels], ['Vast', o.vast]]) for (const [i, v] of groep.entries()) {
    for (const d of v.delen) deel(d, v.x, v.y, v.B, v.H, `${wat}${groep.length > 1 ? ` ${i + 1}` : ''}`);
    for (const [j, p] of v.ruiten.entries()) {
      const nm = `Glas ${wat.toLowerCase()} ${i + 1}.${j + 1}`;
      at(nm, plaatDeel(nm, GLAS, p.map(([x, y]) => [x + v.x, y + v.y]), -glasT / 2, glasT / 2));
      glasIds.push(`c${n}`);
    }
    for (const [j, p] of (v.panelen ?? []).entries()) {
      const nm = `Paneel ${wat.toLowerCase()} ${i + 1}.${j + 1}`;
      at(nm, plaatDeel(nm, STAAL, p.map(([x, y]) => [x + v.x, y + v.y]), -1.5, 1.5));
    }
  }
  // greep voor en achter op de staander aan de sluitkant, met 2 voeten; taatspot in de vloer en bovenpen
  const G = MATEN.greep;
  for (const v of o.vleugels) {
    const xg = v.taats === 'links' ? v.x + v.B - G.afstand : v.x + G.afstand, y0 = G.hoogte - G.lengte / 2, kd = sys.kader.diepte / 2;
    for (const s of [1, -1]) {
      const zc = s * (kd + G.voet + G.d / 2);
      at(`Greep Ø${G.d}`, cilinderY(`Greep Ø${G.d} x ${G.lengte}`, RVS, xg, zc, G.d / 2, y0, y0 + G.lengte));
      // voet van 16 x 16 van het kader tot net in de greep
      for (const y of [y0 + 80, y0 + G.lengte - 80]) at('Greepvoet', blokZ('Greepvoet 16 x 16', RVS, xg - 8, y - 8, xg + 8, y + 8, s > 0 ? kd : -kd - G.voet - 2, s > 0 ? kd + G.voet + 2 : -kd));
    }
    if (o.scharnier === 'verdekt') continue;
    const xa = v.taats === 'links' ? v.x + MATEN.taats : v.x + v.B - MATEN.taats;
    at('Taatspot (vloer)', cilinderY('Taatspot Ø60 (vloer)', BESLAG, xa, 0, 30, -40, 0));
    at('Taatsas onder', cilinderY('Taatsas Ø20 onder', BESLAG, xa, 0, 10, 0, v.y));
    // bovenpen tot onder het kozijn (bij een rond kozijn: tot onder de boog op de plaats van de as)
    const boog = o.kozijn.delen.find((d) => d.soort === 'boogkozijn');
    const regels = o.kozijn.delen.filter((d) => d.a && Math.abs(d.a[1] - d.b[1]) < 1e-6 && d.a[1] > v.y + v.H && Math.min(d.a[0], d.b[0]) <= xa && Math.max(d.a[0], d.b[0]) >= xa);
    const boven = boog ? boog.c[1] + Math.sqrt((boog.r - sys.kozijn.zicht / 2) ** 2 - (xa - boog.c[0]) ** 2) : Math.min(o.kozijn.H - sys.kozijn.zicht, ...regels.map((d) => d.a[1] - sys.kozijn.zicht / 2));
    const vTop = boog ? v.y + (v.H - v.B / 2) + Math.sqrt((v.B / 2) ** 2 - (xa - v.x - v.B / 2) ** 2) : v.y + v.H;
    // bij een ronde deur een vrije ruimte van 15 tegen het schuine vlak (de bovenpen zit daar in een beugel)
    const vrij = boog ? 15 : 0;
    // bij een ronde deur is de spleet daar te klein voor een pen: het scharnier zit dan in een beugel (werkwijze)
    if (boven - vTop - 2 * vrij > 10) at('Bovenpen', cilinderY('Bovenpen Ø20', BESLAG, xa, 0, 10, vTop + vrij, boven - vrij));
  }
  return { format: 'phlippo-cad', version: 1, name: naam, units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [], transparentBodies: glasIds };
}
