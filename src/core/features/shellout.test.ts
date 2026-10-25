import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyShellOutward } from './shell';
import { meshVolume } from './solid';

describe('Shell outward', () => {
  it('a 20 mm cube with a 2 mm outward wall, open at the top', () => {
    const g = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();
    const r = applyShellOutward(g, 2, [{ normal: [0, 1, 0], point: [0, 10, 0] }]);
    // outer 24 x 22 x 24 (no wall above the open top) minus the 20^3 cavity... the outer box grows on all sides: 24^3 - cavity 20 x 22 x 20 (through the top)
    const v = Math.abs(meshVolume(r));
    expect(v).toBeGreaterThan(24 ** 3 - 20 * 22 * 20 - 200);
    expect(v).toBeLessThan(24 ** 3 - 20 * 20 * 20 + 10);
  });
});
