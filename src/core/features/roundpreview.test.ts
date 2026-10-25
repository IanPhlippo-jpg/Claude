import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyEdges } from './edgesets';
import { roundPreviewShapes } from './round';

describe('fillet preview lines', () => {
  it('the arcs of a R10 fillet on a vertical box edge run between the tangent lines 10 mm from the edge', () => {
    const g = new THREE.BoxGeometry(80, 10, 80).translate(40, 5, 40).toNonIndexed();
    const e = bodyEdges(g, 'b').find((x) => x.straight && Math.abs(x.length - 10) < 1e-6 && x.centroid.x > 70 && x.centroid.z > 70)!;
    const { lines } = roundPreviewShapes([e], 'fillet', 10);
    for (const l of lines) for (const p of l) {
      // every point lies within the 10 x 10 corner square of the edge at (80, 80)
      expect(p.x).toBeGreaterThan(69.9);
      expect(p.z).toBeGreaterThan(69.9);
      expect(p.x).toBeLessThan(80.1);
      expect(p.z).toBeLessThan(80.1);
    }
    // an arc touches both faces: one end at x = 80 - 10 on the face z = 80, the other at z = 70 on x = 80
    const arc = lines[0];
    const ends = [arc[0], arc[arc.length - 1]].map((p) => [p.x, p.z].map((v) => Math.round(v * 10) / 10).join(','));
    expect(ends.sort()).toEqual(['70,80', '80,70'].sort());
  });
});
