import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addCircle, addConstraint, addLine, addPolygon, createSketch } from '../../../core/sketch/model';
import type { Sketch } from '../../../core/sketch/types';
import type { ExtrudeFeature, PatternFeature, PlaneDef } from '../../../core/document/types';
import { planarFaces } from '../../../core/features/solid';
import { bodyEdges } from '../../../core/features/edgesets';
import type { Body } from '../../../core/features/rebuild';
import { linearMap, roundValue, rulerTicks, valueAtPoint, type ModelHandle } from './handleMath';
import { endHandle, extrudeEnds } from './extrudeHandles';
import { dragSketchEdge, measureDimension } from './sketchDrag';
import { patternHandles } from './valueHandles';
import { findSnap, snapScene } from './snapGeometry';
import { createDocument } from '../../../core/document/types';

const top: PlaneDef = { id: 'top', name: 'Top', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] };
const ext = (o: Partial<ExtrudeFeature>): ExtrudeFeature => ({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10,
  reverse: false, ...o });

describe('drag handle values', () => {
  it('rounds to the ruler increment, Alt to the fine one, snapped values stay exact and in range', () => {
    const h = { step: 0.5, fine: 0.1, min: 0.1, max: 100 };
    expect(roundValue(12.34, h, false)).toBe(12.5);
    expect(roundValue(12.34, h, true)).toBe(12.3);
    expect(roundValue(12.3456789, h, false, true)).toBe(12.345679);
    expect(roundValue(-3, h, false)).toBe(0.1);
  });
  it('ruler ticks: at least 8 px apart, every fifth a major one', () => {
    const t = rulerTicks(4, 0, 20);
    expect(t[1].v - t[0].v).toBe(2);
    expect(t.filter((x) => x.major).map((x) => x.v)).toEqual([0, 10, 20]);
  });
});

describe('extrusion ends', () => {
  it('Blind: one end at the depth along the normal; a Cut floor faces back to the sketch', () => {
    const [d1] = extrudeEnds(ext({}), top, { x: 0, y: 0 });
    expect(d1.key).toBe('d1');
    expect(d1.point.y).toBeCloseTo(10);
    const [c] = extrudeEnds(ext({ op: 'cut', reverse: true, depth: 3 }), top, { x: 0, y: 0 });
    expect(c.point.y).toBeCloseTo(-3);
    expect(c.outward.y).toBeCloseTo(1);
  });
  it('Mid Plane: a handle on each end face; dragging one of them 2 mm makes the total 4 mm longer (symmetric)', () => {
    const ends = extrudeEnds(ext({ end: 'midPlane', depth: 20 }), top, { x: 5, y: -5 });
    expect(ends.map((e) => e.key)).toEqual(['mid+', 'mid-']);
    expect(ends[0].point.y).toBeCloseTo(10);
    expect(ends[1].point.y).toBeCloseTo(-10);
    const h = endHandle(ext({ end: 'midPlane', depth: 20 }), ends[1]);
    expect(h.toValue(2)).toBe(24);
    const doc = { ...createDocument('t'), features: [ext({ end: 'midPlane', depth: 20 })] };
    const f = h.apply(doc, 24)!.doc.features[0] as ExtrudeFeature;
    expect(f.depth).toBe(24);
    expect(f.end).toBe('midPlane');
  });
  it('Direction 2 Blind has its own end the other way', () => {
    const ends = extrudeEnds(ext({ direction2: { end: 'blind', depth: 4 } }), top, { x: 0, y: 0 });
    expect(ends.map((e) => [e.key, Math.round(e.point.y)])).toEqual([['d1', 10], ['d2', -4]]);
  });
  it('Offset From Surface: the end sits the offset before the face, dragging toward the face makes the offset smaller', () => {
    const f = ext({ end: 'offsetFromSurface', surface: { normal: [0, 1, 0], point: [0, 30, 0], label: 'Face<1>' }, offset: 5 });
    const [e] = extrudeEnds(f, top, { x: 0, y: 0 });
    expect(e.point.y).toBeCloseTo(25);
    const h = endHandle(f, e);
    expect(h.toValue(2)).toBeCloseTo(3);
  });
  it('a Blind end dropped on a parallel face becomes Up To Surface', () => {
    const [e] = extrudeEnds(ext({}), top, { x: 0, y: 0 });
    const doc = { ...createDocument('t'), features: [ext({})] };
    const out = endHandle(ext({}), e).apply(doc, 30, { bodyId: 'b', faceId: 'f', normal: [0, 1, 0], point: [0, 30, 0], label: 'Face<3>' })!.doc.features[0] as ExtrudeFeature;
    expect(out.end).toBe('upToSurface');
    expect(out.surface?.label).toBe('Face<3>');
  });
});

describe('snapping to the model', () => {
  // a 10 mm cube from the origin; the handle moves along +Y from an end at y = 5 beside it
  const box = new THREE.BoxGeometry(10, 10, 10).translate(5, 5, 5).toNonIndexed();
  const body: Body = { id: 'b', geometry: box, faces: planarFaces(box, 'b'), edges: bodyEdges(box, 'b'), featureIds: [] };
  const h = { anchor: new THREE.Vector3(20, 5, 5), dir: new THREE.Vector3(0, 1, 0), ...linearMap(5, 1), min: 0.1, max: Infinity, snap: { plane: { point: new THREE.Vector3(20, 5, 5),
    normal: new THREE.Vector3(0, 1, 0) } } } as Pick<ModelHandle, 'anchor' | 'dir' | 'toValue' | 'toOffset' | 'min' | 'max' | 'snap'>;
  const scene = snapScene([body], h);
  // front view (looking along -Z): pixel = 10 × (x, -y)
  const front = { project: (v: THREE.Vector3) => ({ x: v.x * 10, y: -v.y * 10 }), ray: (x: number, y: number) => new THREE.Ray(new THREE.Vector3(x / 10, -y / 10, 1000), new THREE.Vector3(0, 0, -1)) };
  // top view (looking along -Y): pixel = 10 × (x, z)
  const above = { project: (v: THREE.Vector3) => ({ x: v.x * 10, y: v.z * 10 }), ray: (x: number, y: number) => new THREE.Ray(new THREE.Vector3(x / 10, 1000, y / 10), new THREE.Vector3(0, -1, 0)) };
  it('a vertex under the pointer sets the value so the end reaches its height', () => {
    const s = findSnap(scene, h, 103, -98, front.project, front.ray);
    expect(s?.kind).toBe('vertex');
    expect(s?.value).toBeCloseTo(10);
  });
  it('an edge level with the end snaps anywhere along it; a vertex behind the cube does not count', () => {
    const s = findSnap(scene, h, 50, -102, front.project, front.ray);
    expect(s?.kind).toBe('edge');
    expect(s?.value).toBeCloseTo(10);
    // the back top corner (10, 10, 0) lies behind the front face in the top view only along the ray: from the front it
    // projects onto the front corner, which wins as the nearer one
    expect(valueAtPoint(h, new THREE.Vector3(10, 10, 0))).toBeCloseTo(10);
  });
  it('a face parallel to the end snaps, a face across it does not', () => {
    const s = findSnap(scene, h, 50, 50, above.project, above.ray);
    expect(s?.kind).toBe('face');
    expect(s?.value).toBeCloseTo(10);
    expect(s?.face?.normal[1]).toBeCloseTo(1);
    expect(findSnap(scene, h, 50, -50, front.project, front.ray)).toBeNull();
  });
});

describe('pattern handles', () => {
  it('linear: the handle sits on the first instance and moves it by the spacing change', () => {
    const p: PatternFeature = { id: 'p', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['x'], dir1: { axis: [1, 0, 0], spacing: 20, count: 4 } };
    const [h] = patternHandles(createDocument('t'), p, new THREE.Vector3(5, 0, 0));
    expect(h.anchor.x).toBeCloseTo(25);
    expect(h.toValue(3)).toBe(23);
    expect((h.apply({ ...createDocument('t'), features: [p] }, 23)!.doc.features[0] as PatternFeature).dir1!.spacing).toBe(23);
  });
  it('circular (equal spacing over 180°, 4 instances): one degree more at the first instance is three more in total', () => {
    const p: PatternFeature = { id: 'p', type: 'circularPattern', name: 'CirPattern1', suppressed: false, featureIds: ['x'], axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 180, count: 4 };
    const [h] = patternHandles(createDocument('t'), p, new THREE.Vector3(10, 0, 0));
    // the first instance is 60 degrees on
    expect(h.anchor.angleTo(new THREE.Vector3(10, 0, 0))).toBeCloseTo(Math.PI / 3);
    expect(h.toValue((Math.PI * 10) / 180)).toBeCloseTo(183);
    // an equal-spaced full turn has no handle
    expect(patternHandles(createDocument('t'), { ...p, angle: 360 }, new THREE.Vector3(10, 0, 0))).toEqual([]);
  });
});

describe('dragging sketch geometry from the model', () => {
  /** an 80 x 60 rectangle (shared corners, horizontal / vertical), optionally with its two dimensions */
  const rect = (dims: boolean) => {
    let s: Sketch = createSketch('s1', 'Sketch1', 'top');
    const c = [[0, 0], [80, 0], [80, 60], [0, 60]];
    const ids: string[] = [];
    let first: string | null = null, prev: string | null = null;
    for (let i = 0; i < 4; i++) {
      const [n, l] = addLine(s, prev ?? { x: c[i][0], y: c[i][1] }, i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first!);
      s = n; first ??= l.p1; prev = l.p2; ids.push(l.id);
    }
    s = addConstraint(s, 'horizontal', [ids[0]])[0];
    s = addConstraint(s, 'vertical', [ids[1]])[0];
    s = addConstraint(s, 'horizontal', [ids[2]])[0];
    s = addConstraint(s, 'vertical', [ids[3]])[0];
    if (dims) {
      s = addConstraint(s, 'length', [ids[0]], { value: 80 })[0];
      s = addConstraint(s, 'length', [ids[1]], { value: 60 })[0];
    }
    return { s, ids };
  };
  it('a dimensioned rectangle: dragging its right side 5 mm out makes the 80 dimension 85', () => {
    const { s, ids } = rect(true);
    const r = dragSketchEdge(s, { kind: 'line', id: ids[1], normal: { x: 1, y: 0 } }, 5)!;
    expect(r.changed).toHaveLength(1);
    expect(r.changed[0].value).toBe(85);
    const l = r.sketch.entities[ids[1]] as { p1: string; p2: string };
    expect(r.sketch.points[l.p1].x).toBeCloseTo(85);
    expect(r.sketch.points[l.p2].x).toBeCloseTo(85);
    expect(measureDimension(r.sketch, r.sketch.constraints[r.changed[0].id])).toBeCloseTo(85);
    expect(r.status).not.toBe('conflict');
  });
  it('an undimensioned side moves freely (no dimension changes), the corners follow', () => {
    const { s, ids } = rect(false);
    const r = dragSketchEdge(s, { kind: 'line', id: ids[2], normal: { x: 0, y: 1 } }, -10)!;
    expect(r.changed).toEqual([]);
    const l = r.sketch.entities[ids[2]] as { p1: string; p2: string };
    expect(r.sketch.points[l.p1].y).toBeCloseTo(50);
    const left = r.sketch.entities[ids[3]] as { p1: string; p2: string };
    expect(Math.hypot(r.sketch.points[left.p1].x - r.sketch.points[left.p2].x, r.sketch.points[left.p1].y - r.sketch.points[left.p2].y)).toBeCloseTo(50);
  });
  it('a dimension that would go to zero refuses the drag', () => {
    const { s, ids } = rect(true);
    expect(dragSketchEdge(s, { kind: 'line', id: ids[1], normal: { x: 1, y: 0 } }, -80)).toBeNull();
  });
  it('a circle with a diameter dimension: dragging its edge 2 mm out makes the diameter 4 mm larger', () => {
    let [s, ci] = addCircle(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, 10);
    s = addConstraint(s, 'diameter', [ci.id], { value: 20 })[0];
    const r = dragSketchEdge(s, { kind: 'circle', id: ci.id }, 2)!;
    expect(r.changed[0].value).toBe(24);
    expect(r.sketch.scalars[ci.r]).toBeCloseTo(12);
  });
  it('a side of a regular polygon scales the polygon (its construction circle)', () => {
    const [s, lines] = addPolygon(createSketch('s', 'S', 'top'), { x: 0, y: 0 }, 10, 6, 0, true);
    const l = lines[0];
    const a = s.points[l.p1], b = s.points[l.p2];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k = Math.hypot(m.x, m.y);
    const r = dragSketchEdge(s, { kind: 'line', id: l.id, normal: { x: m.x / k, y: m.y / k } }, 2)!;
    const circle = Object.values(r.sketch.entities).find((e) => e.kind === 'circle') as { r: string };
    expect(r.sketch.scalars[circle.r]).toBeCloseTo(12, 4);
    const a2 = r.sketch.points[l.p1], b2 = r.sketch.points[l.p2];
    expect(Math.hypot((a2.x + b2.x) / 2, (a2.y + b2.y) / 2)).toBeCloseTo(12, 4);
  });
});
