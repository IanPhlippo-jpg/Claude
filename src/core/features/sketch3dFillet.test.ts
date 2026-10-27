import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { filletCorners, sketch3DChains } from './sweep';

describe('3D sketch fillet', () => {
  it('rounds a right-angle corner with an arc of the radius, tangent to both lines', () => {
    const chain = sketch3DChains([[[0, 0, 0], [50, 0, 0]], [[50, 0, 0], [50, 0, 40]]], [{ at: [50, 0, 0], r: 10 }])[0];
    // the arc runs from (40, 0, 0) to (50, 0, 10) around the centre (40, 0, 10)
    const centre = new THREE.Vector3(40, 0, 10);
    const arc = chain.filter((p) => p.x > 40 - 1e-9 && p.z < 10 + 1e-9 && !(p.x === 0));
    expect(arc.length).toBeGreaterThan(4);
    for (const p of arc) expect(p.distanceTo(centre)).toBeCloseTo(10, 6);
    expect(chain[0].toArray()).toEqual([0, 0, 0]);
    expect(chain[chain.length - 1].toArray()).toEqual([50, 0, 40]);
    // the path is shorter than the sharp corner by 2r - πr/2
    let len = 0;
    for (let i = 1; i < chain.length; i++) len += chain[i].distanceTo(chain[i - 1]);
    expect(len).toBeCloseTo(90 - 20 + (Math.PI * 10) / 2, 1);
  });

  it('leaves a corner sharp when the radius does not fit the shorter line', () => {
    const c = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0), new THREE.Vector3(5, 5, 0)];
    expect(filletCorners(c, [{ at: [5, 0, 0], r: 10 }]).length).toBe(3);
  });
});
