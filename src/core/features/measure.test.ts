import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { faceMeasure, massProperties, polylineDistance, symmetricEigen } from './measure';

describe('mass properties', () => {
  it('box: volume, area, centroid and inertia match the closed forms', () => {
    const g = new THREE.BoxGeometry(40, 20, 30).toNonIndexed().translate(5, 10, -3);
    const m = massProperties(g, 0.001);
    expect(m.volume).toBeCloseTo(24000, 3);
    expect(m.area).toBeCloseTo(2 * (40 * 20 + 20 * 30 + 40 * 30), 3);
    expect(m.mass).toBeCloseTo(24, 6);
    expect(m.centroid.x).toBeCloseTo(5, 4);
    expect(m.centroid.y).toBeCloseTo(10, 4);
    expect(m.centroid.z).toBeCloseTo(-3, 4);
    // I_xx about the centroid = m (h^2 + d^2) / 12
    expect(m.inertiaCentroid[0][0]).toBeCloseTo((24 * (20 * 20 + 30 * 30)) / 12, 3);
    expect(m.inertiaCentroid[1][1]).toBeCloseTo((24 * (40 * 40 + 30 * 30)) / 12, 3);
    expect(m.inertiaCentroid[2][2]).toBeCloseTo((24 * (40 * 40 + 20 * 20)) / 12, 3);
    expect(Math.abs(m.inertiaCentroid[0][1])).toBeLessThan(1e-6);
    // principal moments are the diagonal, sorted
    expect(m.principalMoments[0]).toBeCloseTo((24 * (20 * 20 + 30 * 30)) / 12, 3);
    expect(Math.abs(m.principalAxes[0].x)).toBeCloseTo(1, 6);
  });

  it('cylinder volume is close to pi r^2 h', () => {
    const g = new THREE.CylinderGeometry(10, 10, 20, 96, 1, false).toNonIndexed();
    const m = massProperties(g);
    expect(m.volume).toBeGreaterThan(Math.PI * 100 * 20 * 0.998);
    expect(m.volume).toBeLessThan(Math.PI * 100 * 20 * 1.001);
  });

  it('jacobi finds the eigenvalues of a symmetric matrix', () => {
    const { values, vectors } = symmetricEigen([[2, 1, 0], [1, 2, 0], [0, 0, 5]]);
    expect(values[0]).toBeCloseTo(1, 8);
    expect(values[1]).toBeCloseTo(3, 8);
    expect(values[2]).toBeCloseTo(5, 8);
    expect(Math.abs(vectors[2].z)).toBeCloseTo(1, 8);
  });
});

describe('measure', () => {
  it('distance between two parallel lines', () => {
    const r = polylineDistance([new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)], [new THREE.Vector3(-5, 4, 3), new THREE.Vector3(20, 4, 3)]);
    expect(r.distance).toBeCloseTo(5, 8);
  });
  it('area and perimeter of a face', () => {
    const g = new THREE.PlaneGeometry(10, 4, 2, 2).toNonIndexed();
    const tris = [...Array(Math.floor(g.getAttribute('position').count / 3)).keys()];
    const f = faceMeasure(g, tris);
    expect(f.area).toBeCloseTo(40, 8);
    expect(f.perimeter).toBeCloseTo(28, 8);
  });
});
