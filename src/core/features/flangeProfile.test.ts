import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { meshVolume } from './solid';
import { edgeFlangeGeometry, flangeProfilePlane, type SheetMetalParams } from './sheetmetal';

const P: SheetMetalParams = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
const vol = (g: THREE.BufferGeometry | null) => Math.abs(meshVolume(g!));
// a 90 degree flange on the edge x = 20 (z from -30 to 30) of a sheet whose top face is y = 0
const base = { a: [20, 0, -30] as [number, number, number], b: [20, 0, 30] as [number, number, number], faceNormal: [0, 1, 0] as [number, number, number], faceCentroid: [0, 0, 0] as [number, number, number], angle: 90, length: 30, lengthMode: 'tangentBend' as const, position: 'materialOutside' as const, flip: false };

describe('Edit Flange Profile', () => {
  it('the profile plane is the flange outer face: x along the edge, y up the leg', () => {
    const fp = flangeProfilePlane(base, P)!;
    expect(fp.length).toBeCloseTo(60, 9);
    expect(fp.plane.u).toEqual([0, 0, 1]);
    expect(fp.plane.v[1]).toBeCloseTo(1, 9);
    // the outer face of a 90 degree flange lies at x = 20 + r + t
    expect(fp.plane.origin[0]).toBeCloseTo(24, 9);
  });

  it('a tab 20 wide and 25 high with a Ø8 hole: the flange takes that width, length and hole', () => {
    const circle = Array.from({ length: 48 }, (_, i) => ({ x: 30 + 4 * Math.cos((2 * Math.PI * i) / 48), y: 15 + 4 * Math.sin((2 * Math.PI * i) / 48) }));
    const tab = [{ x: 20, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 25 }, { x: 20, y: 25 }];
    const r = edgeFlangeGeometry({ ...base, profile: [{ outer: tab, holes: [circle], area: 0 }] }, P);
    expect(r.error).toBeUndefined();
    const ring = (Math.PI / 4) * (16 - 4);
    // the bend 20 wide plus the leg 20 × 25 × 2 minus the hole
    const expected = ring * 20 + 20 * 25 * 2 - Math.PI * 16 * 2;
    expect(vol(r.geometry)).toBeCloseTo(expected, -1);
    r.geometry!.computeBoundingBox();
    const bb = r.geometry!.boundingBox!;
    expect(bb.min.z).toBeCloseTo(-10, 1);
    expect(bb.max.z).toBeCloseTo(10, 1);
  });
});
