// Schrijft het bureau van de foto (2026-11-05) als drie Phlippo CAD-documenten, met de maten van IKEA:
// LAGKAPTEN-tafelblad 1400 x 600 x 34 mm op twee ALEX-kasten 360 x 580 x 700 mm (samen 734 mm hoog).
// Gebruik: node voorbeelden/bureau/maak-bureau.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const MATEN = {
  blad: { breedte: 1400, diepte: 600, dikte: 34 },
  kast: { breedte: 360, diepte: 580, hoogte: 700 },
  deur: { rand: 16, voeg: 2, diepte: 3 }, // zichtbare kastrand, voeg rond de deur, diepte van de voeg
  overstekVoor: 20, // blad steekt vooraan uit, kasten staan flush met de achterkant en de zijkanten
};

const WIT = { name: 'Spaanplaat, wit gelakt', density: 650, color: '#f2f2ef' };

// een schets met rechthoeken; elke rechthoek is [x1, y1, x2, y2] in schetscoördinaten
function rechthoekSchets(id, name, plane, rects) {
  const points = { [`origin_${id}`]: { x: 0, y: 0 } };
  const entities = {};
  const entityOrder = [];
  rects.forEach(([x1, y1, x2, y2], r) => {
    const hoeken = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    hoeken.forEach(([x, y], i) => (points[`${id}p${r}${i}`] = { x, y }));
    for (let i = 0; i < 4; i++) {
      const eid = `${id}l${r}${i}`;
      entities[eid] = { id: eid, kind: 'line', p1: `${id}p${r}${i}`, p2: `${id}p${r}${(i + 1) % 4}`, construction: false };
      entityOrder.push(eid);
    }
  });
  return { id, name, plane, points, scalars: {}, entities, constraints: {}, entityOrder, constraintOrder: [], origin: `origin_${id}` };
}

const leeg = { planes: {}, variables: {}, equations: [] };

export function tafelblad() {
  const { breedte: b, diepte: d, dikte: t } = MATEN.blad;
  // Top Plane: schets-x = X, schets-y = -Z; uitgetrokken naar boven (+Y)
  const s1 = rechthoekSchets('s1', 'Sketch1', 'top', [[-b / 2, -d / 2, b / 2, d / 2]]);
  return {
    format: 'phlippo-cad', version: 1, name: 'LAGKAPTEN tafelblad', units: 'mm', ...leeg,
    sketches: { s1 },
    features: [
      { id: 'ks1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
      { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: t, reverse: false },
    ],
    material: WIT,
  };
}

export function kast() {
  const { breedte: b, diepte: d, hoogte: h } = MATEN.kast;
  const { rand, voeg, diepte } = MATEN.deur;
  const s1 = rechthoekSchets('s1', 'Sketch1', 'top', [[-b / 2, -d / 2, b / 2, d / 2]]);
  // voorvlak (Z = +d/2): de voeg is een ring tussen de deurrand en de kastrand
  const xi = b / 2 - rand;
  const xo = xi + voeg;
  const s2 = rechthoekSchets('s2', 'Sketch2', 'voorvlak', [
    [-xo, rand - voeg, xo, h - rand + voeg],
    [-xi, rand, xi, h - rand],
  ]);
  return {
    format: 'phlippo-cad', version: 1, name: 'ALEX kast', units: 'mm', variables: {}, equations: [],
    planes: { voorvlak: { id: 'voorvlak', name: 'Face<1>', origin: [0, 0, d / 2], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' } },
    sketches: { s1, s2 },
    features: [
      { id: 'ks1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
      { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: h, reverse: false },
      { id: 'ks2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
      { id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'blind', depth: diepte, reverse: true },
    ],
    material: WIT,
  };
}

export function bureau() {
  const { blad, kast: k, overstekVoor } = MATEN;
  const x = blad.breedte / 2 - k.breedte / 2;
  const z = -overstekVoor / 2; // kastdiepte 580 in een blad van 600: achterkant flush
  const deel = (doc) => { const { format, ...p } = doc; return { ...p, kind: 'part' }; };
  const comp = (id, name, part, position) => ({ id, name, part: deel(part), position, rotation: [0, 0, 0, 1], fixed: true, suppressed: false });
  return {
    format: 'phlippo-cad', version: 1, name: 'Bureau', units: 'mm', sketches: {}, features: [], ...leeg,
    kind: 'assembly',
    components: [
      comp('c1', 'ALEX kast<1>', kast(), [-x, 0, z]),
      comp('c2', 'ALEX kast<2>', kast(), [x, 0, z]),
      comp('c3', 'LAGKAPTEN tafelblad<1>', tafelblad(), [0, k.hoogte, 0]),
    ],
    mates: [],
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 2) + '\n');
  schrijf('LAGKAPTEN-tafelblad.kcad', tafelblad());
  schrijf('ALEX-kast.kcad', kast());
  schrijf('Bureau.kcad', bureau());
  console.log('geschreven: LAGKAPTEN-tafelblad.kcad, ALEX-kast.kcad, Bureau.kcad');
}
