import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { booleanVolumeOk, csg, meshVolume } from './solid';

describe('boolean volume check (QA v0.3.4 F48)', () => {
  it('accepts the possible results and refuses impossible ones', () => {
    expect(booleanVolumeOk('subtract', 1000, 200, 800)).toBe(true);
    expect(booleanVolumeOk('subtract', 1000, 200, 1300)).toBe(false);
    expect(booleanVolumeOk('intersect', 1000, 200, 150)).toBe(true);
    expect(booleanVolumeOk('intersect', 1000, 200, 400)).toBe(false);
    expect(booleanVolumeOk('union', 1000, 200, 1100)).toBe(true);
    expect(booleanVolumeOk('union', 1000, 200, 600)).toBe(false);
    expect(booleanVolumeOk('union', 1000, 200, 1500)).toBe(false);
    // open or inside-out inputs are not judged
    expect(booleanVolumeOk('union', -5, 200, 1)).toBe(true);
  });
  it('passes a real boolean of two boxes', () => {
    const a = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    const b = new THREE.BoxGeometry(10, 10, 10).toNonIndexed().translate(5, 0, 0);
    expect(Math.abs(meshVolume(csg(a, b, 'union')))).toBeCloseTo(1500, 0);
    expect(Math.abs(meshVolume(csg(a, b, 'subtract')))).toBeCloseTo(500, 0);
  });
});
