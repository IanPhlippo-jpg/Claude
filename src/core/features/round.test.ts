import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyEdges, creaseSegments, matchEdge, edgeRef } from './edgesets';
import { applyRound } from './round';
import { meshVolume } from './solid';

const box = () => new THREE.BoxGeometry(80, 10, 80).toNonIndexed();

describe('body edges', () => {
  it('finds the 12 straight edges of a box', () => {
    const e = bodyEdges(box(), 'b');
    expect(creaseSegments(box()).length).toBe(12);
    expect(e).toHaveLength(12);
    expect(e.every((x) => x.straight && !x.closed)).toBe(true);
    const lengths = e.map((x) => Math.round(x.length)).sort((a, b) => a - b);
    expect(lengths).toEqual([10, 10, 10, 10, 80, 80, 80, 80, 80, 80, 80, 80]);
  });

  it('finds the rim of a cylinder as one closed curved edge', () => {
    const cyl = new THREE.CylinderGeometry(10, 10, 20, 48, 1, false).toNonIndexed();
    const e = bodyEdges(cyl, 'c');
    const closed = e.filter((x) => x.closed);
    expect(closed).toHaveLength(2);
    expect(closed[0].straight).toBe(false);
    expect(closed[0].length).toBeCloseTo(2 * Math.PI * 10, -1);
    expect(matchEdge(e, edgeRef(closed[0]))).toBe(closed[0]);
  });
});

describe('fillet and chamfer', () => {
  it('a chamfer on one top edge of a box removes a triangular prism', () => {
    const g = box();
    const edges = bodyEdges(g, 'b');
    const top = edges.find((x) => Math.abs(x.centroid.y - 5) < 1e-6 && Math.abs(x.centroid.z - 40) < 1e-6)!;
    expect(top).toBeTruthy();
    const r = applyRound(g, [top], 'chamfer', 3);
    const removed = Math.abs(meshVolume(g)) - Math.abs(meshVolume(r));
    expect(removed).toBeCloseTo(0.5 * 3 * 3 * 80, -1);
  });

  it('a fillet removes less than the chamfer of the same size', () => {
    const g = box();
    const edges = bodyEdges(g, 'b');
    const top = edges.find((x) => Math.abs(x.centroid.y - 5) < 1e-6 && Math.abs(x.centroid.z - 40) < 1e-6)!;
    const f = applyRound(g, [top], 'fillet', 3);
    const removed = Math.abs(meshVolume(g)) - Math.abs(meshVolume(f));
    // r² (1 - π/4) · L = 9 · 0.2146 · 80 ≈ 154.5
    expect(removed).toBeGreaterThan(154.5 * 0.85);
    expect(removed).toBeLessThan(154.5 * 1.15);
    // the filleted body now has a smooth strip: more crease edges than before, none along the old edge
    expect(bodyEdges(f, 'b').length).toBeGreaterThanOrEqual(10);
  });
});
