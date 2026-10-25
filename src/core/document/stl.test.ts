import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { exportStl, geometryFromPositions, parseStl } from './stl';
import { meshVolume } from '../features/solid';

describe('stl', () => {
  it('binary round trip keeps every triangle', () => {
    const g = new THREE.BoxGeometry(10, 20, 30).toNonIndexed();
    const buf = exportStl(g, 'box');
    expect(buf.byteLength).toBe(84 + 12 * 50);
    const pos = parseStl(buf);
    expect(pos.length).toBe(12 * 9);
    const back = geometryFromPositions(pos);
    expect(Math.abs(meshVolume(back))).toBeCloseTo(6000, 3);
  });
  it('an inside-out mesh is turned outward', () => {
    const g = new THREE.BoxGeometry(2, 2, 2).toNonIndexed();
    const pos = Array.from(g.getAttribute('position').array as Float32Array);
    for (let i = 0; i + 8 < pos.length; i += 9) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; }
    expect(meshVolume(geometryFromPositions(pos))).toBeCloseTo(8, 6);
  });
  it('reads ascii stl', () => {
    const ascii = 'solid t\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid t\n';
    const pos = parseStl(new TextEncoder().encode(ascii).buffer as ArrayBuffer);
    expect(pos).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });
});
