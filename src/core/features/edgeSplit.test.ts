/**
 * The SW edge split: along a bent side a line, the arc of the bend and the next line are three edges (SOLIDWORKS), not
 * one curved edge; Tangent propagation selects the chain at build time; an old reference to a joined chain still
 * rebuilds (the whole chain for a fillet, one straight edge with a warning for a feature on one edge).
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import type { Document, EdgeFlangeFeature, Feature, MiterFlangeFeature, SketchFeature } from '../document/types';
import { rebuildDocument, setRebuildBudget } from './rebuild';
import { resolvePlaneDef } from './planes';
import { meshVolume } from './solid';
import { edgeRef, joinedOf, matchEdge, type BodyEdge, type EdgeRef } from './edgesets';
import { pp2 } from '../../fab/fixtures';
import { CORNER, CORNER_K, PI } from '../../qa/qaModels';

setRebuildBudget(Infinity);
const T = 3;
const clone = (d: Document): Document => JSON.parse(JSON.stringify(d));
const vol = (d: Document) => {
  const r = rebuildDocument(d);
  return { v: Math.abs(meshVolume(r.bodies[0].geometry)), r };
};
/** the edges of the L profile (pp2: legs 100 and 50 to the outer sharp, 200 deep, t 3, r 3) */
const edgesOf = () => rebuildDocument(pp2()).bodies[0].edges;
/** the outer side at the far end (z = 200): line 94 along x at y 0, the outer bend R6, line 44 up at x 100 */
const outerSide = (edges: BodyEdge[]) => edges.filter((e) => Math.abs(e.centroid.z - 200) < 1e-3 && e.points.every((p) => Math.abs(p.z - 200) < 1e-3) && (e.straight ? e.length > 40 && (Math.abs(e.centroid.y) < 1e-3 || Math.abs(e.centroid.x - 100) < 1e-3) : e.length > 9));
const bottom94 = (edges: BodyEdge[]) => edges.find((e) => e.straight && Math.abs(e.length - 94) < 1e-3 && Math.abs(e.centroid.y) < 1e-3 && Math.abs(e.centroid.z - 200) < 1e-3)!;
const round = (type: 'fillet' | 'chamfer', size: number, edges: EdgeRef[], tangent = true) =>
  ({ id: 'r1', type, name: type === 'fillet' ? 'Fillet1' : 'Chamfer1', suppressed: false, size, edges, ...(tangent ? {} : { tangentPropagation: false }) }) as unknown as Feature;
const toSketch = (doc: Document, plane: string, w: THREE.Vector3) => {
  const p = resolvePlaneDef(doc, plane);
  const o = new THREE.Vector3(...p.origin);
  return { x: w.clone().sub(o).dot(new THREE.Vector3(...p.u)), y: w.clone().sub(o).dot(new THREE.Vector3(...p.v)) };
};

describe('SW edge split along a bent side', () => {
  const base = vol(pp2()).v;

  it('the side of a bent sheet shows a straight edge, the arc of the bend and a straight edge (one tangent chain)', () => {
    const edges = edgesOf();
    for (const z of [0, 200]) {
      const side = edges.filter((e) => e.points.every((p) => Math.abs(p.z - z) < 1e-3) && e.length > 4);
      const kinds = side.map((e) => (e.straight ? 'L' : 'C') + e.length.toFixed(2)).sort();
      // inner: 94 + R3 quarter + 44; outer: 94 + R6 quarter + 44 (legs to the outer sharp 100 and 50)
      expect(kinds, `z ${z}`).toEqual(['C4.71', 'C9.42', 'L44.00', 'L44.00', 'L94.00', 'L94.00']);
      const arcs = side.filter((e) => !e.straight);
      for (const a of arcs) {
        const chain = side.filter((e) => e.chain === a.chain);
        expect(chain.map((e) => (e.straight ? 'L' : 'C')).join('')).toBe('LCL');
        // the chain as Tangent propagation takes it: the curved edge of before
        expect(joinedOf(edges, a).length).toBeCloseTo(94 + 44 + a.length, 9);
      }
    }
  });

  it('a fillet on the straight part of the side: Tangent propagation off rounds that edge only, on the whole chain', () => {
    const e = bottom94(edgesOf());
    expect(e).toBeDefined();
    const pick: [number, number, number] = [47, 0, 200];
    const doc = (tangent: boolean) => { const d = pp2(); d.features.push(round('fillet', 1, [{ ...edgeRef(e), pick }], tangent)); return d; };
    const off = vol(doc(false)), on = vol(doc(true));
    expect(off.r.errors).toEqual({});
    expect(on.r.errors).toEqual({});
    // off: the corner along the line only; on: along both lines and turned around the bend (Pappus, outer R6)
    const lossOff = 94 * CORNER(1), lossOn = (94 + 44) * CORNER(1) + CORNER(1) * (PI / 2) * (6 - CORNER_K * 1);
    expect(Math.abs(base - off.v - lossOff) / lossOff, `off ${(base - off.v).toFixed(3)} vs ${lossOff.toFixed(3)}`).toBeLessThan(0.06);
    expect(Math.abs(base - on.v - lossOn) / lossOn, `on ${(base - on.v).toFixed(3)} vs ${lossOn.toFixed(3)}`).toBeLessThan(0.06);
  });

  it('a chamfer on the straight part of the side (Tangent propagation off) cuts that edge only', () => {
    const e = bottom94(edgesOf());
    const d = pp2();
    d.features.push(round('chamfer', 1, [{ ...edgeRef(e), pick: [47, 0, 200] }], false));
    const { v, r } = vol(d);
    expect(r.errors).toEqual({});
    expect(Math.abs(base - v - 94 * 0.5) / 47, `${(base - v).toFixed(3)}`).toBeLessThan(0.05);
  });

  it('an edge flange on the straight edge of the side (the end of the long leg)', () => {
    const e = bottom94(edgesOf());
    const d = pp2();
    const ef: EdgeFlangeFeature = { id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: edgeRef(e), angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside', flip: false };
    d.features.push(ef as unknown as Feature);
    const { v, r } = vol(d);
    expect(r.errors).toEqual({});
    // a flange 94 wide of the sheet thickness: its developed length lies between the leg (20 - t - r) and 20
    const added = v - base;
    expect(added, `${added.toFixed(1)}`).toBeGreaterThan(94 * T * (20 - 6) * 0.95);
    expect(added).toBeLessThan(94 * T * 20 * 1.05);
  });

  it('a miter flange along the straight edge of the side', () => {
    const e = bottom94(edgesOf());
    const d = pp2();
    // the profile on the Right plane (x = 0) at the start of the edge: a 20 mm wall down from the bottom face
    let s = createSketch('sk2', 'Sketch2', 'right');
    s = addLine(s, toSketch(d, 'right', new THREE.Vector3(0, 0, 200)), toSketch(d, 'right', new THREE.Vector3(0, -20, 200)))[0];
    d.sketches.sk2 = s;
    const mf: MiterFlangeFeature = { id: 'mf', type: 'miterFlange', name: 'Miter Flange1', sketchId: 'sk2', suppressed: false, edges: [edgeRef(e)], reverse: false, gap: 0.25 };
    d.features.push({ id: 'skf', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature, mf as unknown as Feature);
    const { v, r } = vol(d);
    expect(r.errors).toEqual({});
    const wall = 94 * 20 * T;
    expect(Math.abs(v - base - wall) / wall, `${(v - base).toFixed(1)} vs ${wall}`).toBeLessThan(0.15);
  });
});

describe('an old reference to a joined chain (saved before the SW edge split)', () => {
  /** the reference as a file of de535ea stored it: one curved edge, line 94 + outer bend R6 + line 44 at z = 200 */
  const oldRef = (): EdgeRef => JSON.parse(OLD_REF);

  it('the joined chain gives the reference of before', () => {
    const edges = edgesOf();
    const ref = edgeRef(joinedOf(edges, bottom94(edges))), old = oldRef();
    expect(ref.straight).toBe(false);
    expect(ref.length).toBeCloseTo(old.length, 9);
    ref.centroid.forEach((v, i) => expect(v).toBeCloseTo(old.centroid[i], 9));
  });

  it('a fillet keeps its volume: the whole chain, as before, without a warning', () => {
    const d = pp2();
    d.features.push(round('fillet', 1, [oldRef()]));
    const old = vol(clone(d));
    expect(old.r.errors).toEqual({});
    expect(old.r.warnings ?? {}).toEqual({});
    // the same as the three SW edges picked with Tangent propagation on
    const d2 = pp2();
    d2.features.push(round('fillet', 1, outerSide(edgesOf()).map((e) => edgeRef(e))));
    expect(outerSide(edgesOf())).toHaveLength(3);
    expect(old.v).toBeCloseTo(vol(d2).v, 6);
    // the volume of 0.5.16 (before the split, measured on de535ea)
    expect(old.v).toBeCloseTo(OLD_FILLET_VOLUME, 3);
  });

  it('Tangent propagation off with the click stored: the edge where it was clicked, no warning', () => {
    const d = pp2();
    d.features.push(round('chamfer', 1, [{ ...oldRef(), pick: [47, 0, 200] }], false));
    const { v, r } = vol(d);
    expect(r.errors).toEqual({});
    expect(r.warnings ?? {}).toEqual({});
    expect(v).toBeCloseTo(OLD_CHAMFER_PICK_VOLUME, 3);
  });

  it('a feature on one edge takes the straight edge nearest the old midpoint and says so', () => {
    const edges = edgesOf();
    const e = matchEdge(edges, oldRef());
    expect(e?.id).toBe(bottom94(edges).id);
    const d = pp2();
    const ef: EdgeFlangeFeature = { id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: oldRef(), angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside', flip: false };
    d.features.push(ef as unknown as Feature);
    const r = rebuildDocument(d);
    expect(r.errors).toEqual({});
    expect(r.warnings?.ef).toMatch(/^Warning: edge reference 1 now matches 3 edges after the SW edge split .* picked the straight edge nearest its old midpoint \(94\.00 mm long\): check the selection\.$/);
    // the same flange as on the straight edge picked now
    const d2 = pp2();
    d2.features.push({ ...ef, edge: edgeRef(bottom94(edges)) } as unknown as Feature);
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(vol(d2).v, 6);
  });
});

// measured with the code of de535ea (one joined curved edge): the old files must keep these
const OLD_FILLET_VOLUME = 86997.193195;
const OLD_CHAMFER_PICK_VOLUME = 86982.326213;
const OLD_REF = '{"centroid":[66.06531280118104,8.496825126716969,200.00000000000003],"length":147.41804919336295,"closed":false,"straight":false,"normals":[[0,0,1],[0,-1,0]]}';
