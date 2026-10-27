import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type Feature } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { edgeRef } from './edgesets';
import { curveThroughPoints, joinPieces } from './compositeCurve';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe('composite curve', () => {
  it('joins pieces end to end, turning a piece round where needed', () => {
    const p = joinPieces([[V(0, 0, 0), V(10, 0, 0)], [V(10, 10, 0), V(10, 0, 0)], [V(0, 10, 0), V(10, 10, 0)]]);
    expect(p?.map((q) => [q.x, q.y])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
    expect(joinPieces([[V(0, 0, 0), V(1, 0, 0)], [V(5, 5, 0), V(6, 5, 0)]])).toBeNull();
  });

  it('two top edges of a block make one curve, and a circle swept along it follows both', () => {
    // a 40 × 40 × 20 block; a Ø4 circle on the right plane at the corner (x = 20, y = 20 is not on it: the profile
    // stays where it is drawn and is carried along the path from the path start)
    const d = createDocument('Composite');
    let a = createSketch('sa', 'Sketch1', 'top');
    const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
    for (let i = 0; i < 4; i++) a = addLine(a, c[i], c[(i + 1) % 4])[0];
    d.sketches = { sa: a };
    const base: Feature[] = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
      { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
    ] as Feature[];
    d.features = base;
    const body = rebuildDocument(d, null).bodies[0];
    // the two top edges that meet at the corner (20, 20, 20): x = 20 and z = 20 sides (sketch y maps to -z or z)
    const top = body.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6);
    const corner = top.find((e) => Math.abs(e.centroid.x - 20) < 1e-6)!;
    const end = corner.points[corner.points.length - 1];
    const other = top.find((e) => e !== corner && e.points.some((p) => p.distanceTo(end) < 1e-6))!;
    expect(corner && other).toBeTruthy();
    d.features = [...base, { id: 'cc', type: 'compositeCurve', name: 'CompCurve1', suppressed: false, edges: [edgeRef(corner), edgeRef(other)], sketches: [] } as Feature];
    const r = rebuildDocument(d, null);
    const curve = r.curves?.find((x) => x.id === 'cc');
    expect(r.errors.cc).toBeUndefined();
    expect(curve?.points.length).toBe(3);
    let len = 0;
    for (let i = 1; i < curve!.points.length; i++) len += curve!.points[i].distanceTo(curve!.points[i - 1]);
    expect(len).toBeCloseTo(80, 6);
    // a Ø4 circle at the path start, normal to it, swept along the composite curve (Circular Profile)
    const p0 = curve!.points[0];
    const s2 = addCircle(createSketch('sb', 'Sketch2', 'front'), { x: p0.x, y: p0.y }, 2)[0];
    d.sketches = { ...d.sketches, sb: s2 };
    d.features = [...d.features, { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false }, { id: 'sw', type: 'sweep', name: 'Sweep1', sketchId: 'sb', pathSketchId: 'cc', suppressed: false, op: 'boss', profileType: 'circular', diameter: 4, merge: false } as Feature];
    const r2 = rebuildDocument(d, null);
    expect(r2.errors.sw).toBeUndefined();
    const swept = r2.bodies.find((b) => b.featureIds.includes('sw'));
    // a tube Ø4 over 80 mm: about π · 2² · 80 (less at the mitred corner)
    expect(Math.abs(meshVolume(swept!.geometry))).toBeGreaterThan(Math.PI * 4 * 80 * 0.85);
  });

  it('reports edges that do not join', () => {
    const d = createDocument('Composite');
    let a = createSketch('sa', 'Sketch1', 'top');
    const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
    for (let i = 0; i < 4; i++) a = addLine(a, c[i], c[(i + 1) % 4])[0];
    d.sketches = { sa: a };
    d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false }] as Feature[];
    const body = rebuildDocument(d, null).bodies[0];
    const top = body.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6);
    const bottom = body.edges.filter((e) => e.straight && Math.abs(e.centroid.y) < 1e-6);
    const [e1] = top, e2 = bottom.find((e) => Math.abs(e.centroid.x + e1.centroid.x) > 30 || Math.abs(e.centroid.z + e1.centroid.z) > 30)!;
    d.features = [...d.features, { id: 'cc', type: 'compositeCurve', name: 'CompCurve1', suppressed: false, edges: [edgeRef(e1), edgeRef(e2)], sketches: [] } as Feature];
    expect(rebuildDocument(d, null).errors.cc).toMatch(/connected end to end/);
  });

  it('Curve Through XYZ Points runs through every point and can be a sweep path', () => {
    const pts: [number, number, number][] = [[0, 0, 0], [20, 10, 0], [40, 0, 10], [60, 5, 20]];
    const c = curveThroughPoints({}, { id: 'c', type: 'curvePoints', name: 'Curve1', suppressed: false, points: pts }).points!;
    for (const p of pts) expect(Math.min(...c.map((q) => q.distanceTo(new THREE.Vector3(...p))))).toBeLessThan(1e-9);
    const d = createDocument('Curve');
    const s = addCircle(createSketch('s', 'Sketch1', 'right'), { x: 0, y: 0 }, 2)[0];
    d.sketches = { s };
    d.features = [{ id: 'cv', type: 'curvePoints', name: 'Curve1', suppressed: false, points: pts }, { id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's', suppressed: false }, { id: 'sw', type: 'sweep', name: 'Sweep1', sketchId: 's', pathSketchId: 'cv', suppressed: false, op: 'boss', profileType: 'circular', diameter: 4 }] as Feature[];
    const r = rebuildDocument(d, null);
    expect(r.errors.sw).toBeUndefined();
    expect(r.curves?.some((x) => x.id === 'cv')).toBe(true);
    expect(r.bodies.length).toBe(1);
  });

  it('Curve Through Reference Points follows the points in the order picked', () => {
    const doc = { refGeometry: [{ id: 'a', name: 'Point1', kind: 'point' as const, origin: [0, 0, 0] as [number, number, number] }, { id: 'b', name: 'Point2', kind: 'point' as const, origin: [10, 0, 0] as [number, number, number] }] };
    const c = curveThroughPoints(doc, { id: 'c', type: 'curvePoints', name: 'Curve1', suppressed: false, refPoints: ['b', 'a'] }).points!;
    expect(c[0].x).toBe(10);
    expect(c[c.length - 1].x).toBe(0);
    expect(curveThroughPoints(doc, { id: 'c', type: 'curvePoints', name: 'Curve1', suppressed: false, refPoints: ['a', 'gone'] }).error).toMatch(/no longer there/);
  });
});
