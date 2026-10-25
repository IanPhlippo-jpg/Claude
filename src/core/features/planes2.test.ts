import { describe, expect, it } from 'vitest';
import { REFERENCE_PLANE_DEFS, referencePlane } from './planes';

describe('reference planes: perpendicular, mid plane, flip normal', () => {
  it('perpendicular to Top through the origin', () => {
    const p = referencePlane('p', 'Plane1', REFERENCE_PLANE_DEFS.top, { ref: 'top', mode: 'perpendicular', distance: 0, angle: 0, flip: false });
    expect(Math.abs(p.n[0] * 0 + p.n[1] * 1 + p.n[2] * 0)).toBeCloseTo(0, 9);
  });
  it('perpendicular through a straight edge', () => {
    const p = referencePlane('p', 'Plane1', REFERENCE_PLANE_DEFS.top, { ref: 'top', mode: 'perpendicular', distance: 0, angle: 0, flip: false, axis: { origin: [0, 0, 5], dir: [1, 0, 0] } });
    expect(Math.abs(p.n[1])).toBeCloseTo(0, 9);
    expect(Math.abs(p.n[2])).toBeCloseTo(1, 9);
    expect(p.origin[2]).toBe(5);
  });
  it('mid plane between Front and a plane 40 mm in front', () => {
    const p = referencePlane('p', 'Plane2', REFERENCE_PLANE_DEFS.front, { ref: 'front', mode: 'mid', distance: 0, angle: 0, flip: false, mid: { origin: [0, 0, 40], n: [0, 0, 1] } });
    expect(p.origin[2]).toBeCloseTo(20, 9);
  });
  it('flip normal turns the plane', () => {
    const p = referencePlane('p', 'Plane3', REFERENCE_PLANE_DEFS.front, { ref: 'front', mode: 'offset', distance: 10, angle: 0, flip: false, flipNormal: true });
    expect(p.n[2]).toBe(-1);
    expect(p.origin[2]).toBe(10);
  });
});
