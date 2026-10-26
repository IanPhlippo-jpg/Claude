import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { meshVolume } from './solid';
import { bendAllowance, bendTableK, edgeFlangeGeometry, outerSetback, type SheetMetalParams } from './sheetmetal';

const P: SheetMetalParams = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
const vol = (g: THREE.BufferGeometry | null) => Math.abs(meshVolume(g!));
const base = { a: [20, 0, -30] as [number, number, number], b: [20, 0, 30] as [number, number, number], faceNormal: [0, 1, 0] as [number, number, number], faceCentroid: [0, 0, 0] as [number, number, number], angle: 90, length: 32, lengthMode: 'outerSharp' as const, position: 'materialOutside' as const, flip: false };

describe('sheet metal options of the intended design', () => {
  it('Bend Allowance types: K-Factor, Bend Allowance, Bend Deduction, Bend Table', () => {
    expect(bendAllowance(90, 2, P)).toBeCloseTo((Math.PI / 2) * 3, 6);
    expect(bendAllowance(90, 2, { ...P, allowanceType: 'bendAllowance', allowanceValue: 4.2 })).toBeCloseTo(4.2, 6);
    expect(bendAllowance(45, 2, { ...P, allowanceType: 'bendAllowance', allowanceValue: 4.2 })).toBeCloseTo(2.1, 6);
    expect(bendAllowance(90, 2, { ...P, allowanceType: 'bendDeduction', allowanceValue: 3 })).toBeCloseTo(2 * outerSetback(90, 2, P) - 3, 6);
    expect(bendAllowance(90, 2, { ...P, allowanceType: 'bendTable' })).toBeCloseTo((Math.PI / 2) * (2 + bendTableK(2, 2) * 2), 6);
  });
  it('Edit Flange Profile: offsets narrow the flange and cut reliefs into the sheet', () => {
    const full = edgeFlangeGeometry(base, P);
    const narrow = edgeFlangeGeometry({ ...base, startOffset: 10, endOffset: 10 }, P);
    expect(vol(narrow.geometry)).toBeCloseTo((vol(full.geometry) * 40) / 60, -1);
    expect(narrow.trim).toBeTruthy();
  });
  it('Gap distance and Trim side bends take the flange in at both ends', () => {
    const full = edgeFlangeGeometry(base, P);
    const gap = edgeFlangeGeometry({ ...base, gap: 2 }, P);
    expect(vol(gap.geometry)).toBeCloseTo((vol(full.geometry) * 58) / 60, -1);
    const trim = edgeFlangeGeometry({ ...base, trimSideBends: true }, P);
    expect(vol(trim.geometry)).toBeCloseTo((vol(full.geometry) * 52) / 60, -1);
  });
  it('Angle against a face: parallel to a face tilted 45 degrees gives a 45 degree flange', () => {
    const r = edgeFlangeGeometry({ ...base, angleFace: { normal: [Math.SQRT1_2, -Math.SQRT1_2, 0], mode: 'parallel' } }, P);
    expect(r.error).toBeUndefined();
    r.geometry!.computeBoundingBox();
    const bb = r.geometry!.boundingBox!;
    // a 45 degree flange rises as much as it reaches out
    expect(Math.abs((bb.max.y - bb.min.y) - (bb.max.x - bb.min.x))).toBeLessThan(2.5);
  });
});
