import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyEdges } from './edgesets';
import { applyRound, applyTools, faceFilletEdges, fullRoundEdges, roundToolsOpts } from './round';
import { meshVolume } from './solid';

const box = () => new THREE.BoxGeometry(80, 10, 80).toNonIndexed();
const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));
const topEdge = (g: THREE.BufferGeometry) => bodyEdges(g, 'b').find((x) => Math.abs(x.centroid.y - 5) < 1e-6 && Math.abs(x.centroid.z - 40) < 1e-6)!;
const removed = (g: THREE.BufferGeometry, r: THREE.BufferGeometry) => vol(g) - vol(r);

describe('fillet and chamfer options', () => {
  it('an asymmetric chamfer removes d1 * d2 / 2 per unit length', () => {
    const g = box();
    const t = roundToolsOpts([topEdge(g)], 'chamfer', 3, { size2: 6 });
    expect(removed(g, applyTools(g, t.cutters, t.adders))).toBeCloseTo(0.5 * 3 * 6 * 80, -1);
  });

  it('a conic fillet with a high rho removes less than the circular one', () => {
    const g = box();
    const circ = removed(g, applyRound(g, [topEdge(g)], 'fillet', 4));
    const t = roundToolsOpts([topEdge(g)], 'fillet', 4, { profile: 'conicRho', rho: 0.8 });
    const conic = removed(g, applyTools(g, t.cutters, t.adders));
    expect(conic).toBeGreaterThan(0);
    expect(conic).toBeLessThan(circ);
    // the circular fillet removes (1 - pi/4) r^2 per unit length
    expect(circ).toBeCloseTo((1 - Math.PI / 4) * 16 * 80, -1);
  });

  it('a variable size fillet removes between the start and end sizes', () => {
    const g = box();
    const t = roundToolsOpts([topEdge(g)], 'fillet', 2, { variable: { start: 2, end: 4 } });
    const r = removed(g, applyTools(g, t.cutters, t.adders));
    expect(r).toBeGreaterThan((1 - Math.PI / 4) * 4 * 80);
    expect(r).toBeLessThan((1 - Math.PI / 4) * 16 * 80);
  });

  it('a partial edge fillet removes only part of the edge', () => {
    const g = box();
    const t = roundToolsOpts([topEdge(g)], 'chamfer', 3, { partial: { start: 0, end: 0.5 } });
    expect(removed(g, applyTools(g, t.cutters, t.adders))).toBeCloseTo(0.5 * 9 * 40, -1);
  });

  it('multi radius gives each edge its own size', () => {
    const g = box();
    const edges = bodyEdges(g, 'b').filter((x) => Math.abs(x.centroid.y - 5) < 1e-6 && Math.abs(Math.abs(x.centroid.z) - 40) < 1e-6);
    expect(edges).toHaveLength(2);
    const t = roundToolsOpts(edges, 'chamfer', 2, { radii: [2, 4] });
    expect(removed(g, applyTools(g, t.cutters, t.adders))).toBeCloseTo(0.5 * (4 + 16) * 80, -1);
  });

  it('face fillet finds the shared edge, full round the two long edges at half the width', () => {
    const g = new THREE.BoxGeometry(80, 30, 10).toNonIndexed();
    const edges = bodyEdges(g, 'b');
    const top = { normal: [0, 1, 0] as [number, number, number], centroid: [0, 15, 0] as [number, number, number], curved: false };
    const front = { normal: [0, 0, 1] as [number, number, number], centroid: [0, 0, 5] as [number, number, number], curved: false };
    const shared = faceFilletEdges(edges, top, front);
    expect(shared).toHaveLength(1);
    expect(shared[0].length).toBeCloseTo(80);
    const fr = fullRoundEdges(edges, top)!;
    expect(fr.edges).toHaveLength(2);
    expect(fr.size).toBeCloseTo(5, 1);
  });
});
