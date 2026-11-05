// Schrijft het bureau van de foto (2026-11-05) als Phlippo CAD-documenten, met de maten van IKEA:
// LAGKAPTEN-tafelblad 1400 x 600 x 34 mm op twee ALEX-ladekasten 360 x 580 x 700 mm (samen 734 mm hoog),
// met in het blad de ingebouwde nagelstofafzuiging en haar draaiknop (voorbeelden/afzuiging).
// Elke ladekast heeft vijf lades die op geleiders lopen: een lade rust met haar loopregels op de geleiders van de kast
// (Coincident), staat in het midden (Coincident op het Right Plane) en schuift tussen dicht en open (Distance-limiet).
// Gebruik: node voorbeelden/bureau/maak-bureau.mjs
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, TOP } from '../lib/schets.mjs';
import { afzuigingComponenten, bladUitsparingen } from '../afzuiging/maak-afzuiging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const MATEN = {
  blad: { breedte: 1400, diepte: 600, dikte: 34 },
  // korpus 564 diep + ladefront 16 = 580 (ALEX: 36 x 58 x 70 cm)
  kast: { breedte: 360, diepte: 580, hoogte: 700, front: 16, wand: 16, rug: 8 },
  lade: { aantal: 5, fronthoogte: 136, voeg: 3, onder: 4, frontbreedte: 356, bakbreedte: 296, bakhoogte: 100, bakonder: 14, bakdiepte: 520, wand: 8 },
  // geleider in de kast (onder) en loopregel aan de lade (erop), hoogte gemeten vanaf de onderkant van het ladefront
  geleider: { binnen: 150, hoogte: 10, onder: 30, lengte: 510 },
  loopregel: { binnen: 146, buiten: 162, lengte: 490 },
  uitschuif: 450, // de lade gaat zo ver open (binnendiepte 52 cm bij IKEA)
  overstekVoor: 20, // blad steekt vooraan uit, kasten staan flush met de achterkant en de zijkanten
};

const WIT = { name: 'Spaanplaat, wit gelakt', density: 650, color: '#f2f2ef' };
const GRIJS = { name: 'Staal, verzinkt', density: 7850, color: '#a9adb3' };

// een schets met rechthoeken; elke rechthoek is [x1, y1, x2, y2] in schetscoördinaten
function rechthoekSchets(id, name, plane, rects) {
  const points = { [`origin_${id}`]: { x: 0, y: 0 } };
  const entities = {};
  const entityOrder = [];
  rects.forEach(([x1, y1, x2, y2], r) => {
    const hoeken = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    hoeken.forEach(([x, y], i) => (points[`${id}p${r}_${i}`] = { x, y }));
    for (let i = 0; i < 4; i++) {
      const eid = `${id}l${r}_${i}`;
      entities[eid] = { id: eid, kind: 'line', p1: `${id}p${r}_${i}`, p2: `${id}p${r}_${(i + 1) % 4}`, construction: false };
      entityOrder.push(eid);
    }
  });
  return { id, name, plane, points, scalars: {}, entities, constraints: {}, entityOrder, constraintOrder: [], origin: `origin_${id}` };
}

const schetsFeature = (n) => ({ id: `ks${n}`, type: 'sketch', name: `Sketch${n}`, sketchId: `s${n}`, suppressed: false });
const extrude = (id, name, n, op, depth, reverse, extra = {}) => ({ id, type: 'extrude', name, sketchId: `s${n}`, suppressed: false, op, end: 'blind', depth, reverse, ...extra });
const deel = (name, material, sketches, features, planes = {}) => ({ format: 'phlippo-cad', version: 1, name, units: 'mm', planes, variables: {}, equations: [], sketches, features, material });
const vlak = (id, name, origin, n) => {
  // zoals de app een vlak op een face legt (planeOnFace): u = X tenzij de normaal langs X ligt
  const u = Math.abs(n[0]) > 0.9 ? [0, 0, -1] : [1, 0, 0];
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { id, name, origin, u, v, n, kind: 'face' };
};

/** hoogte (Y) van de onderkant van ladefront i in de kast, i = 0 is de onderste */
export const ladeY = (i) => MATEN.lade.onder + i * (MATEN.lade.fronthoogte + MATEN.lade.voeg);
/** Z van het voorvlak van het korpus (lokaal in de kast): het ladefront ligt ervoor */
export const korpusVoor = () => MATEN.kast.diepte / 2 - MATEN.kast.front;

export function tafelblad() {
  const { breedte: b, diepte: d, dikte: t } = MATEN.blad;
  // Top Plane: schets-x = X, schets-y = -Z; uitgetrokken naar boven (+Y)
  const o = new Onderdeel('LAGKAPTEN tafelblad', WIT);
  o.schets(TOP, (s) => s.rrect(-b / 2, -d / 2, b / 2, d / 2));
  o.extrude('boss', t);
  // de uitsparingen voor de ingebouwde afzuiging en de draaiknop (voorbeelden/afzuiging), te frezen met een frees Ø10
  bladUitsparingen(o);
  return o.doc();
}

/** het korpus van de ALEX-ladekast met de geleiders; oorsprong onder in het midden, de lades komen aan +Z */
export function ladekast() {
  const { breedte: b, diepte: d, hoogte: h, wand, rug } = MATEN.kast;
  const zv = korpusVoor();
  const g = MATEN.geleider;
  const s1 = rechthoekSchets('s1', 'Sketch1', 'top', [[-b / 2, -zv, b / 2, d / 2]]);
  // de holte voor de lades, vanaf het voorvlak tot tegen de rug
  const s2 = rechthoekSchets('s2', 'Sketch2', 'voorvlak', [[-b / 2 + wand, wand, b / 2 - wand, h - wand]]);
  // geleiders: steken 2 mm in de zijwand zodat ze er één body mee vormen
  const xb = b / 2 - wand + 2;
  const rails = [];
  for (let i = 0; i < MATEN.lade.aantal; i++) {
    const y = ladeY(i) + g.onder;
    rails.push([g.binnen, y, xb, y + g.hoogte], [-xb, y, -g.binnen, y + g.hoogte]);
  }
  const s3 = rechthoekSchets('s3', 'Sketch3', 'voorvlak', rails);
  return deel('ALEX ladekast', WIT, { s1, s2, s3 }, [
    schetsFeature(1), extrude('f1', 'Boss-Extrude1', 1, 'boss', h, false),
    schetsFeature(2), extrude('f2', 'Cut-Extrude1', 2, 'cut', d - MATEN.kast.front - rug, true),
    schetsFeature(3), extrude('f3', 'Geleiders', 3, 'boss', g.lengte, true),
  ], { voorvlak: vlak('voorvlak', 'Face<1>', [0, 0, zv], [0, 0, 1]) });
}

/** een lade: oorsprong onder in het midden van het front, Z = 0 is de achterkant van het front */
export function lade() {
  const L = MATEN.lade;
  const { front } = MATEN.kast;
  const r = MATEN.loopregel;
  const g = MATEN.geleider;
  const s1 = rechthoekSchets('s1', 'Sketch1', 'front', [[-L.bakbreedte / 2, L.bakonder, L.bakbreedte / 2, L.bakonder + L.bakhoogte]]);
  const s2 = rechthoekSchets('s2', 'Sketch2', 'front', [[-L.frontbreedte / 2, 0, L.frontbreedte / 2, L.fronthoogte]]);
  // bovenvlak van de bak: schets-y = -Z
  const s3 = rechthoekSchets('s3', 'Sketch3', 'bakboven', [[-L.bakbreedte / 2 + L.wand, 2, L.bakbreedte / 2 - L.wand, L.bakdiepte - L.wand]]);
  const yl = g.onder + g.hoogte; // de loopregel rust op de geleider
  const s4 = rechthoekSchets('s4', 'Sketch4', 'front', [[r.binnen, yl, r.buiten, yl + 10], [-r.buiten, yl, -r.binnen, yl + 10]]);
  return deel('ALEX lade', WIT, { s1, s2, s3, s4 }, [
    schetsFeature(1), extrude('f1', 'Boss-Extrude1', 1, 'boss', L.bakdiepte, true, { direction2: { end: 'blind', depth: 2 } }),
    // het front; de bak en de loopregels steken er 2 mm in zodat alles één body is
    schetsFeature(2), extrude('f2', 'Boss-Extrude2', 2, 'boss', front, false),
    schetsFeature(3), extrude('f3', 'Cut-Extrude1', 3, 'cut', L.bakhoogte - L.wand, true),
    schetsFeature(4), extrude('f4', 'Loopregels', 4, 'boss', r.lengte, true, { direction2: { end: 'blind', depth: 2 } }),
  ], { bakboven: vlak('bakboven', 'Face<2>', [0, L.bakonder + L.bakhoogte, 0], [0, 1, 0]) });
}

/** de drie mates van lade i in kast c (de geleider): op de geleider, in het midden, tussen dicht en open */
function ladeMates(kastId, kastNaam, ladeId, ladeNaam, i, folder) {
  const g = MATEN.geleider;
  const r = MATEN.loopregel;
  const xr = (g.binnen + MATEN.kast.breedte / 2 - MATEN.kast.wand) / 2;
  const ref = (componentId, kind, label, normal, point) => ({ componentId, kind, label, normal, point });
  const yTop = ladeY(i) + g.onder + g.hoogte;
  return [
    { id: `m${ladeId}a`, type: 'coincident', name: `Geleider ${ladeNaam}`, folder, aligned: false, suppressed: false, refs: [
      ref(kastId, 'face', `Geleider<${2 * i + 1}>@${kastNaam}`, [0, 1, 0], [xr, yTop, 0]),
      ref(ladeId, 'face', `Loopregel<1>@${ladeNaam}`, [0, -1, 0], [(r.binnen + r.buiten) / 2, g.onder + g.hoogte, -MATEN.loopregel.lengte / 2]),
    ] },
    { id: `m${ladeId}b`, type: 'coincident', name: `Midden ${ladeNaam}`, folder, aligned: true, suppressed: false, refs: [
      ref(kastId, 'plane', `Right Plane@${kastNaam}`, [1, 0, 0], [0, 0, 0]),
      ref(ladeId, 'plane', `Right Plane@${ladeNaam}`, [1, 0, 0], [0, 0, 0]),
    ] },
    { id: `m${ladeId}c`, type: 'distanceLimit', name: `Uitschuif ${ladeNaam}`, folder, aligned: false, suppressed: false, value: 0, min: 0, max: MATEN.uitschuif, refs: [
      ref(kastId, 'face', `Face<1>@${kastNaam}`, [0, 0, 1], [0, 0, korpusVoor()]),
      ref(ladeId, 'face', `Face<1>@${ladeNaam}`, [0, 0, -1], [0, 0, 0]),
    ] },
  ];
}

export function bureau() {
  const { blad, kast: k, overstekVoor } = MATEN;
  const x = blad.breedte / 2 - k.breedte / 2;
  const z = -overstekVoor / 2; // kastdiepte 580 in een blad van 600: achterkant flush
  const strip = (doc) => { const { format, ...p } = doc; return { ...p, kind: 'part' }; };
  const comp = (id, name, part, position, fixed) => ({ id, name, part: strip(part), position, rotation: [0, 0, 0, 1], fixed, suppressed: false });
  const components = [];
  const mates = [];
  let n = 0;
  [[-x, 1, 'links'], [x, 2, 'rechts']].forEach(([xk, nr, kant]) => {
    const kastId = `k${nr}`;
    const kastNaam = `ALEX ladekast<${nr}>`;
    components.push(comp(kastId, kastNaam, ladekast(), [xk, 0, z], true));
    for (let i = 0; i < MATEN.lade.aantal; i++) {
      n++;
      const ladeId = `l${n}`;
      const ladeNaam = `ALEX lade<${n}>`;
      components.push(comp(ladeId, ladeNaam, lade(), [xk, ladeY(i), z + korpusVoor()], false));
      mates.push(...ladeMates(kastId, kastNaam, ladeId, ladeNaam, i, `Lades ${kant}`));
    }
  });
  components.push(comp('t1', 'LAGKAPTEN tafelblad<1>', tafelblad(), [0, k.hoogte, 0], true));
  // de ingebouwde afzuiging: oorsprong van de module op het bovenvlak van het blad, in het midden
  const afz = afzuigingComponenten([0, k.hoogte + blad.dikte, 0], 'a');
  components.push(...afz.components);
  mates.push(...afz.mates);
  return { format: 'phlippo-cad', version: 1, name: 'Bureau', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components, mates };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 2) + '\n');
  schrijf('LAGKAPTEN-tafelblad.kcad', tafelblad());
  schrijf('ALEX-ladekast.kcad', ladekast());
  schrijf('ALEX-lade.kcad', lade());
  schrijf('Bureau.kcad', bureau());
  // de kast met deur van de eerste versie is vervangen door de ladekast
  if (existsSync(join(HERE, 'ALEX-kast.kcad'))) rmSync(join(HERE, 'ALEX-kast.kcad'));
  console.log('geschreven: LAGKAPTEN-tafelblad.kcad, ALEX-ladekast.kcad, ALEX-lade.kcad, Bureau.kcad');
}
