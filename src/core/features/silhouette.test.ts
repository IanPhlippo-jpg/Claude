import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { silhouette, smoothEdges } from './silhouette';

describe('silhouette edges', () => {
  it('a cylinder seen from the side has two silhouette lines along its length; a box has none', () => {
    const cyl = new THREE.CylinderGeometry(10, 10, 40, 48, 1, false).toNonIndexed();
    const se = smoothEdges(cyl);
    expect(se.count).toBeGreaterThan(40);
    const out = new Float32Array(se.count * 6);
    const n = silhouette(se, { dir: new THREE.Vector3(0, 0, -1) }, out);
    // the generator lines at x = ±10 (two, or a pair each when a facet edge sits exactly on the rim)
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
    for (let i = 0; i < n; i++) {
      expect(Math.abs(Math.abs(out[i * 6]) - 10)).toBeLessThan(0.2);
      expect(Math.abs(out[i * 6 + 1] - out[i * 6 + 4])).toBeCloseTo(40, 3);
    }
    const box = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    const sb = smoothEdges(box);
    expect(silhouette(sb, { dir: new THREE.Vector3(0.3, -0.5, -1).normalize() }, new Float32Array(sb.count * 6 + 6))).toBe(0);
  });
  it('perspective: the eye position decides', () => {
    const sph = new THREE.SphereGeometry(10, 32, 16).toNonIndexed();
    const se = smoothEdges(sph);
    const out = new Float32Array(se.count * 6);
    const n = silhouette(se, { eye: new THREE.Vector3(0, 0, 100) }, out);
    expect(n).toBeGreaterThan(20);
  });
});
