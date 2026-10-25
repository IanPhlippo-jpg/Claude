import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { boundaryLoops, extendSurface, fillLoops, flattenSurface, halfSpaceBox } from './surfaces2';
import { csg, meshVolume } from './solid';

const area = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute('position');
  let a = 0;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i + 2 < p.count; i += 3) {
    A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
    a += B.sub(A).cross(C.sub(A)).length() / 2;
  }
  return a;
};

/** a 40 x 20 plate in the XZ plane with a 6 x 6 square hole in the middle */
function plateWithHole(): THREE.BufferGeometry {
  const shape = new THREE.Shape([new THREE.Vector2(-20, -10), new THREE.Vector2(20, -10), new THREE.Vector2(20, 10), new THREE.Vector2(-20, 10)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-3, -3), new THREE.Vector2(3, -3), new THREE.Vector2(3, 3), new THREE.Vector2(-3, 3)]));
  const g = new THREE.ShapeGeometry(shape).toNonIndexed();
  g.rotateX(-Math.PI / 2);
  return g;
}

describe('surface tools', () => {
  it('finds the outer boundary and the hole of a plate', () => {
    const loops = boundaryLoops(plateWithHole());
    expect(loops.length).toBe(2);
    expect(loops[0].length).toBeGreaterThanOrEqual(4);
  });

  it('Untrim / Delete Hole fills the hole back (area + 36)', () => {
    const g = plateWithHole();
    const patch = fillLoops(g, 'inner')!;
    expect(patch).not.toBeNull();
    expect(Math.abs(area(patch) - 36)).toBeLessThan(0.01);
    expect(Math.abs(area(g) - (800 - 36))).toBeLessThan(0.01);
  });

  it('Filled Surface over the outer boundary makes the full 40 x 20 patch', () => {
    const patch = fillLoops(plateWithHole(), 'outer')!;
    expect(Math.abs(area(patch) - 800)).toBeLessThan(0.01);
  });

  it('Extend Surface adds strips along the open edges', () => {
    const g = new THREE.PlaneGeometry(40, 20).toNonIndexed();
    const strips = extendSurface(g, 5)!;
    // four edges × 5 wide (corners not filled): 2·40·5 + 2·20·5 = 600
    expect(Math.abs(area(strips) - 600)).toBeLessThan(0.5);
  });

  it('Surface Flatten lays a quarter cylinder flat with the same area', () => {
    const cyl = new THREE.CylinderGeometry(10, 10, 30, 24, 1, true, 0, Math.PI / 2).toNonIndexed();
    const flat = flattenSurface(cyl)!;
    expect(Math.abs(area(flat) - area(cyl))).toBeLessThan(0.5);
    flat.computeBoundingBox();
    expect(flat.boundingBox!.max.z - flat.boundingBox!.min.z).toBeLessThan(1e-6);
    // the flat sheet is 30 high and a quarter circumference (≈ 15.7) wide (as a polygon: 24 chords)
    const size = flat.boundingBox!.getSize(new THREE.Vector3());
    expect(Math.abs(Math.max(size.x, size.y) - 30)).toBeLessThan(0.01);
  });

  it('Cut With Surface: the half-space box removes one half of a block', () => {
    const block = new THREE.BoxGeometry(40, 20, 20).toNonIndexed();
    const box = halfSpaceBox({ origin: [0, 0, 0], n: [1, 0, 0] }, 100, false);
    const cut = csg(block, box, 'subtract');
    expect(Math.abs(Math.abs(meshVolume(cut)) - 8000)).toBeLessThan(1);
  });
});
