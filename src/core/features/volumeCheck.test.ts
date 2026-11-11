import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { kernelMismatch, shapeMismatch, shapeTolerance, volumeLimit, volumeMismatch, VOLUME_MISMATCH, VOLUME_MISMATCH_FLAT } from './volumeCheck';
import { meshVolume } from './solid';

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z).toNonIndexed();

describe('exact vs faceted volume cross-check (QA F159, QA 0.5.12 F172/F198)', () => {
  it('the limit follows the body: 0.01 % without curved surfaces, more with them, never above 0.5 %', () => {
    const plate = box(80, 10, 40);
    expect(volumeLimit(plate, 32000)).toBeCloseTo(VOLUME_MISMATCH_FLAT, 9);
    const disc = new THREE.CylinderGeometry(20, 20, 10, 256).toNonIndexed();
    const v = Math.PI * 400 * 10;
    // the side of the disc is curved: 2π·20·10 mm² × 0.03 mm on 12 566 mm³ = 0.3 % (plus 0.01 %), under the ceiling of 0.5 %
    expect(volumeLimit(disc, v)).toBeGreaterThan(VOLUME_MISMATCH_FLAT * 10);
    expect(volumeLimit(disc, v)).toBeLessThanOrEqual(VOLUME_MISMATCH);
    expect(volumeLimit(plate, 0)).toBe(VOLUME_MISMATCH);
  });

  it('a prismatic body speaks on the volume alone where the flat 0.5 % was blind (the F140 numbers)', () => {
    // 7.74 mm³ on 30 440 is 0.025 %: the old default of 0.5 % stayed quiet (F198, QA 0.5.13); the default is now the
    // limit of a body without curved surfaces, 0.01 %
    expect(volumeMismatch(30439.07, 30431.33)).toMatch(/differ by 0\.025 % \(the tessellation allows 0\.010 %\)/);
    expect(volumeMismatch(30439.07, 30431.33, VOLUME_MISMATCH_FLAT)).toMatch(/differ by 0\.025 % \(the tessellation allows 0\.010 %\)/);
    // a plate built 0.05 mm too thick: under the shape tolerance (0.1 mm), 0.5 % too much volume on a flat body
    const a = box(80, 10, 40), b = box(80, 10.05, 40);
    expect(shapeMismatch(a, b)).toBeNull();
    expect(kernelMismatch(a, Math.abs(meshVolume(a)), b, Math.abs(meshVolume(b)))).toMatch(/exact volume/);
    expect(kernelMismatch(a, Math.abs(meshVolume(a)), a, Math.abs(meshVolume(a)))).toBeNull();
  });

  it('stays quiet within the tessellation margin and speaks above it', () => {
    expect(volumeMismatch(30439.07, 30439.91, VOLUME_MISMATCH)).toBeNull();
    expect(volumeMismatch(1000, 1004.9, VOLUME_MISMATCH)).toBeNull();
    expect(volumeMismatch(1000, 1003)).toMatch(/differ by 0\.30 %/);
    expect(volumeMismatch(1000, 1006, VOLUME_MISMATCH)).toMatch(/differ by 0\.60 %/);
    expect(volumeMismatch(54393.4, 54428.24 + 600)).toMatch(/Warning: B-rep and mesh disagree: the exact volume/);
  });

  it('ignores empty or broken numbers', () => {
    expect(volumeMismatch(0, 0)).toBeNull();
    expect(volumeMismatch(NaN, 10)).toBeNull();
  });
});

describe('shape cross-check on every vertex (QA 0.5.12 F202)', () => {
  it('finds one vertex 0.5 mm off on a large body (no sampling)', () => {
    // 540 000 vertices: the old check sampled every 6th
    const a = new THREE.SphereGeometry(50, 300, 300).toNonIndexed();
    const b = a.clone();
    const p = b.getAttribute('position');
    // a vertex in the middle of the sphere, all its copies (non-indexed: every triangle that has it)
    const i0 = Math.floor(p.count / 2) - (Math.floor(p.count / 2) % 3);
    const v = new THREE.Vector3().fromBufferAttribute(p, i0);
    const n = v.clone().normalize().multiplyScalar(0.5);
    for (let i = 0; i < p.count; i++) if (new THREE.Vector3().fromBufferAttribute(p, i).distanceTo(v) < 1e-9) p.setXYZ(i, v.x + n.x, v.y + n.y, v.z + n.z);
    expect(shapeMismatch(a, a)).toBeNull();
    expect(shapeMismatch(a, b)).toMatch(/lie 0\.50 mm apart/);
  }, 60000);
});

describe('the shape tolerance does not grow with the body (QA 0.5.13, F202)', () => {
  it('a missed R2 corner (0.83 mm) on a 4 m long beam is still found', () => {
    const a = box(4000, 40, 40);
    const b = a.clone();
    const p = b.getAttribute('position');
    // one corner of the beam pushed 0.83 mm out along x (the corner a missed R2 fillet leaves)
    for (let i = 0; i < p.count; i++) if (p.getX(i) > 1999 && p.getY(i) > 19 && p.getZ(i) > 19) p.setXYZ(i, p.getX(i) + 0.83, p.getY(i), p.getZ(i));
    expect(shapeTolerance(a)).toBeLessThan(0.11);
    expect(shapeMismatch(a, a)).toBeNull();
    expect(shapeMismatch(a, b)).toMatch(/0\.83 mm apart/);
  });
});
