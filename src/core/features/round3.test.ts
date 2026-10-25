import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyEdges, subEdgeAt } from './edgesets';
import { applyRound, applyTools, cornerTools, keepEdgeRadii, roundTools, tangentChain } from './round';
import { meshVolume, planarFaces } from './solid';

const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));

describe('fillet options of the original', () => {
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
  it('Tangent propagation: on, the merged slot outline is one edge; off, only the straight run that was clicked', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-20, -5); shape.lineTo(20, -5); shape.absarc(20, 0, 5, -Math.PI / 2, Math.PI / 2, false); shape.lineTo(-20, 5); shape.absarc(-20, 0, 5, Math.PI / 2, (3 * Math.PI) / 2, false);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 10, bevelEnabled: false, curveSegments: 24 }).toNonIndexed();
    const loop = bodyEdges(g, 's').find((e) => e.points.every((p) => Math.abs(p.z - 10) < 1e-6))!;
    expect(tangentChain([loop], [loop.id])).toEqual([loop.id]);
    const run = subEdgeAt(loop, new THREE.Vector3(0, -5, 10));
    expect(run.straight).toBe(true);
    expect(run.length).toBeCloseTo(40, 3);
    const arc = subEdgeAt(loop, new THREE.Vector3(25, 0, 10));
    expect(arc.straight).toBe(false);
    expect(arc.length).toBeCloseTo(Math.PI * 5, 0);
  });
});
