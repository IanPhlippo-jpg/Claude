import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { falloff, pointDeform, subdivideOnce } from './deform';
import { meshVolume } from './solid';

describe('Deform ▸ Point', () => {
  it('midpoint subdivision quadruples the triangles and keeps the surface', () => {
    const g = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    const pos = new Float32Array(g.getAttribute('position').array as ArrayLike<number>);
    const sub = subdivideOnce(pos);
    expect(sub.length).toBe(pos.length * 4);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(sub, 3));
    expect(Math.abs(Math.abs(meshVolume(g2)) - 1000)).toBeLessThan(1e-6);
  });

  it('falloff is 1 at the point, 0 at the region edge and stiffer for Rigid', () => {
    expect(falloff(0, 10)).toBe(1);
    expect(falloff(10, 10)).toBe(0);
    expect(falloff(5, 10, 'rigid')).toBeLessThan(falloff(5, 10, 'flexible'));
  });

  it('a point deform pushes a dent into the top of a block and changes its volume accordingly', () => {
    const g = new THREE.BoxGeometry(60, 20, 60).toNonIndexed();
    const out = pointDeform(g, { point: [0, 10, 0], direction: [0, -1, 0], distance: 4, radius: 15 });
    const v0 = Math.abs(meshVolume(g)), v1 = Math.abs(meshVolume(out));
    // the dent removes roughly the integral of the falloff: pi r² d · ~0.3
    expect(v0 - v1).toBeGreaterThan(Math.PI * 15 * 15 * 4 * 0.2);
    expect(v0 - v1).toBeLessThan(Math.PI * 15 * 15 * 4 * 0.6);
    // the mesh was refined around the dent
    expect(out.getAttribute('position').count).toBeGreaterThan(g.getAttribute('position').count * 10);
    // the lowest point of the top face is 4 below the original top
    const p = out.getAttribute('position');
    let minTop = Infinity;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < 0.5 && Math.abs(p.getZ(i)) < 0.5 && p.getY(i) > 0) minTop = Math.min(minTop, p.getY(i));
    expect(Math.abs(minTop - 6)).toBeLessThan(0.3);
  });
});
