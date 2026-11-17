import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { referenceTol, TOL } from './tolerance';
import { matchEdge, matchEdges, type BodyEdge, type EdgeRef } from './edgesets';

/** a straight edge along x of the given length, centred at (0, y, z) */
function edge(id: string, length: number, y: number, z = 0): BodyEdge {
  const a = new THREE.Vector3(-length / 2, y, z), b = new THREE.Vector3(length / 2, y, z);
  const n = new THREE.Vector3(0, 0, 1);
  return { id, segments: [{ a, b, n1: n, n2: n }], points: [a, b], closed: false, straight: true, length, centroid: new THREE.Vector3(0, y, z) };
}
const ref = (length: number, y = 0): EdgeRef => ({ centroid: [0, y, 0], length, closed: false, straight: true });

describe('reference margin relative to the size (QA 0.5.14 P3-6)', () => {
  it('is a quarter of the size, between the floor and the old fixed margin', () => {
    expect(referenceTol(0.3)).toBeCloseTo(0.075, 9);
    expect(referenceTol(2)).toBe(TOL.reference);
    expect(referenceTol(100)).toBe(TOL.reference);
    expect(referenceTol(0.001)).toBe(TOL.referenceMin);
    expect(referenceTol(0)).toBe(TOL.reference);
  });
  it('does not let the neighbour of a small edge stand in for it', () => {
    // the 0.3 mm edge of a small chamfer is gone after a rebuild; its neighbour, 0.3 mm away, is no match
    // (the fixed 0.5 mm margin took it)
    expect(matchEdge([edge('neighbour', 0.3, 0.3)], ref(0.3))).toBeNull();
    expect(matchEdges([edge('neighbour', 0.3, 0.3)], ref(0.3))).toEqual([]);
    // two candidates within 0.5 mm: the one at the reference is found, also when it moved a hair
    const found = matchEdge([edge('neighbour', 0.3, 0.3), edge('self', 0.3, 0.02)], ref(0.3));
    expect(found?.id).toBe('self');
  });
  it('keeps the 0.5 mm margin for edges from 2 mm upwards', () => {
    expect(matchEdge([edge('moved', 20, 0.3)], ref(20))?.id).toBe('moved');
    expect(matchEdge([edge('far', 20, 0.6)], ref(20))).toBeNull();
  });
});
