// Jog with real bends: one clean closed sheet of constant thickness, two bends of radius r (inside) and r + t
// (outside), the volume equal to the flat area x t (K = 0.5). Each case failed on 339f8d1, where the jog was a
// Z block overlapping the fixed and the moved part.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type Document, type Feature } from '../document/types';
import { rebuildDocument, setRebuildBudget } from './rebuild';
import { meshVolume, planarFaces } from './solid';
import { isClosed } from './meshCheck';

setRebuildBudget(Infinity);
const F = (f: Record<string, unknown>) => f as unknown as Feature;
const t = 2, r = 2;
const BA = (k: number) => (Math.PI / 2) * (r + k * t);

/** tab 120 x 80 on the top plane (t 2, r 2, K 0.5), a jog line across the 80 at its middle (world z = -40) */
function jogDoc(jog: Record<string, unknown> = {}, holes = false): Document {
  const d = createDocument('Jog');
  d.sheetMetal = { thickness: t, bendRadius: r, kFactor: 0.5 } as never;
  let s = createSketch('s1', 's1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 80 }, { x: 0, y: 80 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (holes) for (const y of [15, 65]) s = addCircle(s, { x: 60, y }, 5)[0];
  d.sketches.s1 = s;
  d.sketches.j = addLine(createSketch('j', 'j', 'top'), { x: 0, y: 40 }, { x: 120, y: 40 })[0];
  d.features.push(F({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false }),
    F({ id: 'js', type: 'sketch', name: 'Sketch2', sketchId: 'j', suppressed: false }),
    F({ id: 'jg', type: 'jog', name: 'Jog1', sketchId: 'j', suppressed: false, offset: 10, flipSide: false, reverse: false, ...jog }));
  return d;
}

/** the circle (centre in y, z and radius) through the vertices of each curved face (the bend axes run along x) */
function bendCircles(g: THREE.BufferGeometry): { y: number; z: number; r: number }[] {
  const pos = g.getAttribute('position');
  return planarFaces(g, 'b').filter((f) => f.curved).map((f) => {
    const pts: [number, number][] = [];
    for (const ti of f.triangles) for (let k = 0; k < 3; k++) {
      const p: [number, number] = [pos.getY(3 * ti + k), pos.getZ(3 * ti + k)];
      if (!pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-4)) pts.push(p);
    }
    pts.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const [A, B, C] = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]];
    const dd = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const s2 = (p: [number, number]) => p[0] * p[0] + p[1] * p[1];
    const y = (s2(A) * (B[1] - C[1]) + s2(B) * (C[1] - A[1]) + s2(C) * (A[1] - B[1])) / dd;
    const z = (s2(A) * (C[0] - B[0]) + s2(B) * (A[0] - C[0]) + s2(C) * (B[0] - A[0])) / dd;
    const rr = Math.max(...pts.map((p) => Math.abs(Math.hypot(p[0] - y, p[1] - z))));
    expect(Math.min(...pts.map((p) => Math.hypot(p[0] - y, p[1] - z))), 'all vertices on one circle').toBeGreaterThan(rr - 1e-3);
    return { y, z, r: rr };
  });
}

const body = (d: Document) => {
  const res = rebuildDocument(d);
  expect(res.errors).toEqual({});
  expect(res.bodies).toHaveLength(1);
  return res.bodies[0].geometry;
};

describe('jog: two real bends in one clean sheet', () => {
  it('outside offset 10: closed, two bends of r 2 and r + t 4, volume = (80 - 6 + 4 + 2 BA) x 120 x t', () => {
    const g = body(jogDoc());
    expect(isClosed(g)).toBe(true);
    expect(g.userData.openArea).toBeUndefined();
    const radii = bendCircles(g).map((c) => Math.round(c.r * 1000) / 1000).sort();
    expect(radii).toEqual([2, 2, 4, 4]);
    const v = Math.abs(meshVolume(g)), hand = (80 - 6 + 4 + 2 * BA(0.5)) * 120 * t;
    expect(Math.abs(v - hand) / hand).toBeLessThan(0.005);
    g.computeBoundingBox();
    // the moved part lies 10 below the sketch face (the bottom face y = 0, normal -y)
    expect(g.boundingBox!.min.y).toBeCloseTo(-10, 4);
    expect(g.boundingBox!.max.y).toBeCloseTo(t, 4);
  });
  it('inside offset and overall dimension: the moved face lies D - t and D + t from the sketch face', () => {
    for (const [type, low] of [['inside', -12], ['overall', -8]] as const) {
      const g = body(jogDoc({ offsetType: type }));
      expect(isClosed(g), type).toBe(true);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y, type).toBeCloseTo(low, 4);
      const h = -low - 6, hand = (80 - 6 + h + 2 * BA(0.5)) * 120 * t;
      expect(Math.abs(Math.abs(meshVolume(g)) - hand) / hand, type).toBeLessThan(0.005);
    }
  });
  it('fix projected length off adds no material: the volume stays 80 x 120 x t, the part gets shorter', () => {
    const g = body(jogDoc({ fixProjected: false }));
    expect(isClosed(g)).toBe(true);
    expect(Math.abs(Math.abs(meshVolume(g)) - 80 * 120 * t) / (80 * 120 * t)).toBeLessThan(0.005);
    g.computeBoundingBox();
    const span = g.boundingBox!.max.z - g.boundingBox!.min.z;
    // projected: 80 - (2 BA + h - (2r + t)) = 80 - (2 BA + 4 - 6)
    expect(span).toBeCloseTo(80 - (2 * BA(0.5) - 2), 3);
  });
  it('Jog Position: the first bend starts at -BA/2 (centerline), -(r + t), -r or 0 (bend outside) from the line', () => {
    for (const [position, x1] of [['centerline', -BA(0.5) / 2], ['materialInside', -(r + t)], ['materialOutside', -r], ['bendOutside', 0]] as const) {
      const cs = bendCircles(body(jogDoc({ position })));
      // bend 1: the axis at the sketch face side (y = -r), bend 2 further along the moving side
      const b1 = cs.find((c) => Math.abs(c.y + r) < 1e-3)!, b2 = cs.find((c) => Math.abs(c.y + r) > 1)!;
      const s = Math.sign(b2.z - b1.z);
      expect(s * (b1.z + 40), position).toBeCloseTo(x1, 3);
      expect(Math.abs(b2.z - b1.z), position).toBeCloseTo(2 * r + t, 3);
    }
  });
  it('an offset smaller than 2r + t: two shallower bends that meet, still r and r + t, closed', () => {
    const g = body(jogDoc({ offset: 3 }));
    expect(isClosed(g)).toBe(true);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(-3, 4);
    const phi = Math.acos(1 - 3 / (2 * r + t)), x1 = -(phi * (r + t / 2)) / 2;
    // the two bends run into each other (one curved face per side): every vertex of them lies at r or r + t from one
    // of the two axes by hand (section x along the moving side, y along the jog; world y = -y, z = -40 +- x)
    const axes = [[x1, r], [x1 + (2 * r + t) * Math.sin(phi), r - (2 * r + t) * Math.cos(phi)]];
    const pos = g.getAttribute('position');
    const curved = planarFaces(g, 'b').filter((f) => f.curved).flatMap((f) => f.triangles);
    expect(curved.length).toBeGreaterThan(40);
    const fits = (s: number) => curved.every((ti) => [0, 1, 2].every((k) => {
      const y = pos.getY(3 * ti + k), z = pos.getZ(3 * ti + k);
      return axes.some(([ax, ay]) => [r, r + t].some((R) => Math.abs(Math.hypot(z - (-40 + s * ax), y + ay) - R) < 1e-3));
    }));
    expect(fits(1) || fits(-1)).toBe(true);
    const hand = (80 - (2 * r + t) * Math.sin(phi) + 2 * phi * (r + t / 2)) * 120 * t;
    expect(Math.abs(Math.abs(meshVolume(g)) - hand) / hand).toBeLessThan(0.005);
  });
  it('Jog Angle 60: the middle leg leans, the bends are 60 degrees, the volume by hand', () => {
    const g = body(jogDoc({ jogAngle: 60 }));
    expect(isClosed(g)).toBe(true);
    const phi = Math.PI / 3, h = (10 - (2 * r + t) * (1 - Math.cos(phi))) / Math.sin(phi);
    const run = (2 * r + t) * Math.sin(phi) + h * Math.cos(phi), hand = (80 - run + h + 2 * phi * (r + t / 2)) * 120 * t;
    expect(Math.abs(Math.abs(meshVolume(g)) - hand) / hand).toBeLessThan(0.005);
  });
  it('Custom Bend Allowance K 0.4 with fix projected length off: cut at the developed length of K 0.4', () => {
    const g = body(jogDoc({ fixProjected: false, customAllowance: { type: 'kFactor', value: 0.4 } }));
    expect(isClosed(g)).toBe(true);
    // the material (mid fibre, K 0.5) is the 80 less the two bends of K 0.4 plus the same bends of K 0.5
    const hand = (80 - 2 * BA(0.4) + 2 * BA(0.5)) * 120 * t;
    expect(Math.abs(Math.abs(meshVolume(g)) - hand) / hand).toBeLessThan(0.005);
    const b1 = bendCircles(g).find((c) => Math.abs(c.y + r) < 1e-3)!;
    expect(Math.abs(b1.z + 40)).toBeCloseTo(BA(0.4) / 2, 3);
  });
  it('the holes of the fixed and the moved part stay, the body stays one closed sheet', () => {
    const g = body(jogDoc({}, true));
    expect(isClosed(g)).toBe(true);
    const hand = ((80 - 6 + 4 + 2 * BA(0.5)) * 120 - 2 * Math.PI * 25) * t;
    expect(Math.abs(Math.abs(meshVolume(g)) - hand) / hand).toBeLessThan(0.005);
  });
});

// Jog PropertyManager as SW 2025: Up To Surface / Offset From Surface, Fixed Face, Use gauge table, Override value.
// Each case failed before (the end conditions, the fixed face and the gauge/override fields did not exist).
const vol90 = (D: number) => (80 - 6 + (D - 6) + 2 * BA(0.5)) * 120 * t;
const relErr = (g: THREE.BufferGeometry, hand: number) => Math.abs(Math.abs(meshVolume(g)) - hand) / hand;
/** a planar face parallel to the sheet at world height y (as a pick stores it: normal, point, label) */
const face = (y: number, z = -20) => ({ normal: [0, 1, 0], point: [60, y, z], label: 'Face<1>' });
/** the z range of the moved part (the vertices below the sheet) */
const movedZ = (g: THREE.BufferGeometry, moved = (y: number) => y < -5) => {
  const pos = g.getAttribute('position');
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) if (moved(pos.getY(i))) { lo = Math.min(lo, pos.getZ(i)); hi = Math.max(hi, pos.getZ(i)); }
  return [lo, hi];
};

describe('jog PropertyManager: end conditions, fixed face, gauge table, override value', () => {
  it('Up To Surface: the far face of the moved part ends at the picked face (15 below the sketch face)', () => {
    const g = body(jogDoc({ offsetEnd: 'upToSurface', surface: face(-15), offset: 10 }));
    expect(isClosed(g)).toBe(true);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(-15, 4);
    expect(relErr(g, vol90(15))).toBeLessThan(0.005);
  });
  it('Up To Surface with Inside Offset: the near face of the moved part ends at the face', () => {
    const g = body(jogDoc({ offsetEnd: 'upToSurface', surface: face(-15), offsetType: 'inside' }));
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(-17, 4);
    expect(relErr(g, vol90(17))).toBeLessThan(0.005);
  });
  it('Offset From Surface: the offset short of the face, Reverse offset beyond it', () => {
    for (const [rev, low] of [[false, -12], [true, -18]] as const) {
      const g = body(jogDoc({ offsetEnd: 'offsetFromSurface', surface: face(-15), surfaceOffset: 3, reverseOffset: rev }));
      expect(isClosed(g), `reverse ${rev}`).toBe(true);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y, `reverse ${rev}`).toBeCloseTo(low, 4);
      expect(relErr(g, vol90(-low)), `reverse ${rev}`).toBeLessThan(0.005);
    }
  });
  it('a face that is not parallel to the sheet, or no face, is an error', () => {
    for (const s of [{ normal: [0, 0, 1], point: [0, -15, 0], label: 'Face<2>' }, undefined]) {
      const res = rebuildDocument(jogDoc({ offsetEnd: 'upToSurface', surface: s }));
      expect(res.errors.jg).toMatch(/parallel|Select a planar face/);
    }
  });
  it('Fixed Face: the side of the picked point stays; it wins over flipSide; flipSide alone (old files) still works', () => {
    // the line at z = -40, the tab from z = -80 to 0; default: the near side (z up to 0) moves, flipSide: the far side
    const nearMoves = (g: THREE.BufferGeometry) => { const [lo, hi] = movedZ(g); return Math.abs(hi) < 1e-4 && lo > -50; };
    const farMoves = (g: THREE.BufferGeometry) => { const [lo, hi] = movedZ(g); return Math.abs(lo + 80) < 1e-4 && hi < -30; };
    expect(nearMoves(body(jogDoc()))).toBe(true);
    const flipOld = body(jogDoc({ flipSide: true }));
    expect(farMoves(flipOld)).toBe(true);
    // fixed face picked on the near side (z = -10): the far side moves, as flipSide (same solid)
    const near = body(jogDoc({ fixedFace: { normal: [0, -1, 0], point: [60, 0, -10], label: 'Face<3>' } }));
    expect(farMoves(near)).toBe(true);
    expect(Math.abs(meshVolume(near))).toBeCloseTo(Math.abs(meshVolume(flipOld)), 3);
    // picked on the far side (z = -70) with flipSide set: the fixed face wins, the near side moves
    const far = body(jogDoc({ flipSide: true, fixedFace: { normal: [0, -1, 0], point: [60, 0, -70], label: 'Face<3>' } }));
    expect(nearMoves(far)).toBe(true);
    expect(relErr(far, vol90(10))).toBeLessThan(0.005);
    // the other face of the sheet picked on the near side does the same as the sketch face there
    expect(farMoves(body(jogDoc({ fixedFace: { normal: [0, 1, 0], point: [60, t, -10], label: 'Face<1>' } })))).toBe(true);
    // with Reverse Direction (the jog goes up) the picked side still stays
    const rev = body(jogDoc({ reverse: true, fixedFace: { normal: [0, -1, 0], point: [60, 0, -10], label: 'Face<3>' } }));
    const [lo, hi] = movedZ(rev, (y) => y > t + 5);
    expect(lo).toBeCloseTo(-80, 4);
    expect(hi).toBeLessThan(-30);
  });
  it('Use gauge table: the radius of the part (gauge) unless cleared; an old jog with its own radius keeps it', () => {
    const radii = (jog: Record<string, unknown>, gauge: boolean) => {
      const d = jogDoc(jog);
      if (gauge) d.sheetMetal = { ...d.sheetMetal!, gauge: { table: 'Sample Table - Steel', gauge: 'Gauge 14' } };
      return bendCircles(body(d)).map((c) => Math.round(c.r * 1000) / 1000).sort((a, b) => a - b);
    };
    expect(radii({}, true)).toEqual([2, 2, 4, 4]);
    expect(radii({ radius: 5, useGauge: true }, true)).toEqual([2, 2, 4, 4]);
    expect(radii({ radius: 5 }, true)).toEqual([5, 5, 7, 7]);
    expect(radii({ radius: 5, useGauge: false }, true)).toEqual([5, 5, 7, 7]);
    // no gauge table on the part: Use gauge table does not apply
    expect(radii({ radius: 5, useGauge: true }, false)).toEqual([5, 5, 7, 7]);
  });
  it('Jog Angle with a gauge table: the 90 degree preset unless Override value (old files keep their angle)', () => {
    const phi = Math.PI / 3, h = (10 - (2 * r + t) * (1 - Math.cos(phi))) / Math.sin(phi);
    const v60 = (80 - ((2 * r + t) * Math.sin(phi) + h * Math.cos(phi)) + h + 2 * phi * (r + t / 2)) * 120 * t;
    for (const [o, hand] of [[false, vol90(10)], [true, v60], [undefined, v60]] as const) {
      const d = jogDoc({ jogAngle: 60, overrideAngle: o });
      d.sheetMetal = { ...d.sheetMetal!, gauge: { table: 'Sample Table - Steel', gauge: 'Gauge 14' } };
      expect(relErr(body(d), hand), `override ${o}`).toBeLessThan(0.005);
    }
    // no gauge table: the angle is used as typed
    expect(relErr(body(jogDoc({ jogAngle: 60, overrideAngle: false })), v60)).toBeLessThan(0.005);
  });
});
