import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyShell, offsetInward } from './shell';
import { meshVolume } from './solid';

describe('shell', () => {
  it('inward offset of a box shrinks it by the thickness on every side', () => {
    const g = new THREE.BoxGeometry(40, 20, 30).toNonIndexed();
    const inner = offsetInward(g, 2);
    inner.computeBoundingBox();
    const size = inner.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(36, 4);
    expect(size.y).toBeCloseTo(16, 4);
    expect(size.z).toBeCloseTo(26, 4);
    expect(Math.abs(meshVolume(inner))).toBeCloseTo(36 * 16 * 26, 2);
  });

  it('shell with the top face removed leaves an open box with 2 mm walls', () => {
    const g = new THREE.BoxGeometry(40, 20, 30).toNonIndexed();
    const shelled = applyShell(g, 2, [{ normal: [0, 1, 0], point: [0, 10, 0] }]);
    const vol = Math.abs(meshVolume(shelled));
    // outer 40*20*30 minus inner 36*18*26 (open at the top: inner height 20 - 2 = 18)
    expect(vol).toBeCloseTo(40 * 20 * 30 - 36 * 18 * 26, -1);
  });

  it('shell of a cylinder keeps the wall thickness on the curved side', () => {
    const cyl = new THREE.CylinderGeometry(10, 10, 20, 48, 1, false).toNonIndexed();
    const shelled = applyShell(cyl, 1, [{ normal: [0, 1, 0], point: [0, 10, 0] }]);
    const vol = Math.abs(meshVolume(shelled));
    const outer = Math.PI * 100 * 20, inner = Math.PI * 81 * 19;
    // 48-gon approximations: allow a few percent
    expect(vol).toBeGreaterThan((outer - inner) * 0.95);
    expect(vol).toBeLessThan((outer - inner) * 1.05);
  });
});
