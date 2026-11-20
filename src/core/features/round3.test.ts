import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyEdges, edgeRef, joinedOf, roundEdges, subEdgeAt } from './edgesets';
import { applyRound, applyTools, cornerTools, keepEdgeRadii, roundTools, tangentChain } from './round';
import { meshVolume, planarFaces } from './solid';

const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));

describe('fillet options of the intended design', () => {
  it('Round corners: two top edges meeting at a corner get a round corner (less material than the mitre)', () => {
    const g = new THREE.BoxGeometry(40, 40, 40).toNonIndexed();
    const es = bodyEdges(g, 'b').filter((e) => Math.abs(e.centroid.y - 20) < 1e-6 && (Math.abs(e.centroid.x - 20) < 1e-6 || Math.abs(e.centroid.z - 20) < 1e-6));
    expect(es.length).toBe(2);
    const t = roundTools(es, 'fillet', 5);
    const plain = vol(applyTools(g, t.cutters, t.adders));
    const corners = cornerTools(es, 5, { roundCorners: true });
    expect(corners.length).toBe(1);
    const round = vol(applyTools(g, [...t.cutters, ...corners], t.adders));
    expect(round).toBeLessThan(plain - 1);
  });
  it('Setback: three edges at a corner blend into a bigger sphere corner', () => {
    const g = new THREE.BoxGeometry(40, 40, 40).toNonIndexed();
    const es = bodyEdges(g, 'b').filter((e) => [e.centroid.x, e.centroid.y, e.centroid.z].filter((c) => Math.abs(c - 20) < 1e-6).length === 2 && e.centroid.x > -1 && e.centroid.y > -1 && e.centroid.z > -1);
    expect(es.length).toBe(3);
    const t = roundTools(es, 'fillet', 5);
    const plain = vol(applyTools(g, t.cutters, t.adders));
    const sb = vol(applyTools(g, [...t.cutters, ...cornerTools(es, 5, { setback: 5 })], t.adders));
    expect(sb).toBeLessThan(plain - 1);
  });
  it('Overflow > Keep edge: a 15 mm fillet on a 10 mm thick plate is held to 10 mm', () => {
    const g = new THREE.BoxGeometry(80, 10, 80).toNonIndexed();
    const e = bodyEdges(g, 'b').find((x) => Math.abs(x.centroid.y - 5) < 1e-6 && Math.abs(x.centroid.z - 40) < 1e-6)!;
    const src = g;
    const pa = src.getAttribute('position');
    const faces = planarFaces(g, 'k').map((fc) => ({ normal: fc.normal, points: fc.triangles.flatMap((t) => [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pa, t * 3 + k))) }));
    const [r] = keepEdgeRadii([e], 15, faces);
    expect(r).toBeCloseTo(10, 1);
    expect(applyRound(g, [e], 'fillet', r)).toBeTruthy();
  });
  it('Tangent propagation: the slot outline is four SW edges in one chain; on, the whole chain; off, only the picked edge', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-20, -5); shape.lineTo(20, -5); shape.absarc(20, 0, 5, -Math.PI / 2, Math.PI / 2, false); shape.lineTo(-20, 5); shape.absarc(-20, 0, 5, Math.PI / 2, (3 * Math.PI) / 2, false);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: false, curveSegments: 24 }).toNonIndexed();
    const all = bodyEdges(g, 's');
    const top = all.filter((e) => e.points.every((p) => Math.abs(p.z - 10) < 1e-6));
    // SW: two straight edges of 40 and two half circles, one tangent chain
    expect(top.map((e) => (e.straight ? 'L' : 'C') + e.length.toFixed(1)).sort()).toEqual(['C15.7', 'C15.7', 'L40.0', 'L40.0']);
    expect(new Set(top.map((e) => e.chain)).size).toBe(1);
    const line = top.find((e) => e.straight && e.centroid.y < 0)!;
    // selection time: the tangent chain of the picked edge
    expect(tangentChain(all, [line.id]).sort()).toEqual(top.map((e) => e.id).sort());
    const on = roundEdges(all, { ...edgeRef(line), pick: [0, -5, 10] }, true);
    expect(on).toHaveLength(1);
    expect(on[0].closed).toBe(true);
    expect(on[0].length).toBeCloseTo(80 + 10 * Math.PI, 0);
    const off = roundEdges(all, { ...edgeRef(line), pick: [0, -5, 10] }, false);
    expect(off.map((e) => e.id)).toEqual([line.id]);
    // the joined loop (a reference saved before the SW edge split) still gives the run that was clicked (as subEdgeAt)
    const loop = joinedOf(all, line);
    const run = subEdgeAt(loop, new THREE.Vector3(0, -5, 10));
    expect(run.straight).toBe(true);
    expect(run.length).toBeCloseTo(40, 3);
    const old = roundEdges(all, { ...edgeRef(loop), pick: [25, 0, 10] }, false);
    expect(old).toHaveLength(1);
    expect(old[0].straight).toBe(false);
    expect(old[0].length).toBeCloseTo(Math.PI * 5, 0);
  });
});
