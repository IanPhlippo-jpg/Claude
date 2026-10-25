import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { vertexChamferTool } from './round';
import { csg, meshVolume } from './solid';

describe('Chamfer ▸ Vertex', () => {
  it('cuts a tetrahedron of d³/6 off a box corner', () => {
    const box = new THREE.BoxGeometry(40, 30, 20).toNonIndexed();
    const tool = vertexChamferTool(box, new THREE.Vector3(20, 15, 10), 6, 6, 6);
    expect(tool).not.toBeNull();
    const out = csg(box, tool!, 'subtract');
    expect(Math.abs(Math.abs(meshVolume(out)) - (24000 - 36))).toBeLessThan(1.5);
  });

  it('refuses a point that is not a corner', () => {
    const box = new THREE.BoxGeometry(40, 30, 20).toNonIndexed();
    expect(vertexChamferTool(box, new THREE.Vector3(0, 15, 10), 5, 5, 5)).toBeNull();
  });
});
