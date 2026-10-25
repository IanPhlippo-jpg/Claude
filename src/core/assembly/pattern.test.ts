import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { patternOffsets } from './assembly';

describe('component patterns', () => {
  it('linear: 3 x 2 grid minus the seed = 5 offsets', () => {
    const m = patternOffsets({ id: 'p', name: 'L', kind: 'linear', seeds: [], dir: [1, 0, 0], spacing: 10, count: 3, dir2: [0, 0, 1], spacing2: 5, count2: 2 });
    expect(m.length).toBe(5);
    const t = m.map((x) => new THREE.Vector3().setFromMatrixPosition(x).toArray());
    expect(t).toContainEqual([20, 0, 0]);
    expect(t).toContainEqual([20, 0, 5]);
  });
  it('circular: 4 equal instances over 360 degrees around Y through a point', () => {
    const m = patternOffsets({ id: 'p', name: 'C', kind: 'circular', seeds: [], dir: [0, 1, 0], axisPoint: [10, 0, 0], spacing: 0, count: 4, angle: 360, equal: true });
    expect(m.length).toBe(3);
    const p = new THREE.Vector3(20, 0, 0).applyMatrix4(m[1]);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });
  it('circular partial angle with equal spacing spreads over the angle', () => {
    const m = patternOffsets({ id: 'p', name: 'C', kind: 'circular', seeds: [], dir: [0, 1, 0], spacing: 0, count: 3, angle: 90, equal: true });
    const p = new THREE.Vector3(1, 0, 0).applyMatrix4(m[1]);
    expect(p.z).toBeCloseTo(-1, 6);
  });
});
