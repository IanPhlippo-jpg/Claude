import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { sectionBody } from './section';
import { meshVolume } from './solid';

const cube = () => new THREE.BoxGeometry(20, 20, 20);

describe('section view', () => {
  it('one plane keeps the half behind it, with a cap', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false }]);
    r.body.computeBoundingBox();
    expect(r.body.boundingBox!.max.z).toBeCloseTo(0, 3);
    expect(r.cap).not.toBeNull();
  });
  it('two planes cut a quarter out (planar)', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false }, { plane: 'right', offset: 0, flip: false }]);
    const g = new THREE.BufferGeometry();
    const all = [...(r.body.getAttribute('position').array as Float32Array), ...(r.cap!.getAttribute('position').array as Float32Array)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
    expect(Math.abs(meshVolume(g))).toBeCloseTo(8000 * 0.75, 0);
  });
  it('zonal keeps the slab between two planes', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 5, flip: false }, { plane: 'front', offset: -5, flip: true }], 'zonal');
    r.body.computeBoundingBox();
    expect(r.body.boundingBox!.max.z).toBeCloseTo(5, 3);
    expect(r.body.boundingBox!.min.z).toBeCloseTo(-5, 3);
  });
  it('a tilted plane (45°) cuts diagonally', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false, rotX: 45 }]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...(r.body.getAttribute('position').array as Float32Array), ...(r.cap!.getAttribute('position').array as Float32Array)], 3));
    expect(Math.abs(meshVolume(g))).toBeCloseTo(4000, 0);
  });
});
