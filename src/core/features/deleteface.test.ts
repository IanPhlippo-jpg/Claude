import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { deleteFaces } from './deleteface';
import { csg, meshVolume } from './solid';

describe('Delete Face', () => {
  it('Delete and Patch closes a through hole again', () => {
    const plate = new THREE.BoxGeometry(40, 40, 10);
    const hole = new THREE.CylinderGeometry(5, 5, 20, 48).rotateX(Math.PI / 2);
    const g = csg(plate, hole, 'subtract');
    const v0 = Math.abs(meshVolume(g));
    expect(v0).toBeLessThan(16000 - 500);
    // the hole wall: its centroid lies on the axis
    const r = deleteFaces(g, [{ normal: [1, 0, 0], point: [0, 0, 0] }], 'patch');
    expect(r.error).toBeUndefined();
    expect(Math.abs(meshVolume(r.geometry!))).toBeCloseTo(16000, -1);
  });
  it('Delete leaves an open body', () => {
    const box = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    const r = deleteFaces(box, [{ normal: [0, 0, 1], point: [0, 0, 5] }], 'delete');
    expect(r.geometry!.getAttribute('position').count).toBe(30);
  });
});
