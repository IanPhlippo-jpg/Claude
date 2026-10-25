import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { REFERENCE_PLANE_DEFS } from './planes';
import { csg, meshVolume } from './solid';
import { baseFlangeGeometry, baseFlangeRegion, bendAllowance, edgeFlangeGeometry, flatLength, flatPatternGeometry, hemFlangeParams, outerSetback, roundCorners, type SheetMetalParams } from './sheetmetal';

const P: SheetMetalParams = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
const vol = (g: THREE.BufferGeometry | null) => Math.abs(meshVolume(g!));

describe('sheet metal', () => {
  it('rounds a 90 degree corner with a tangent arc', () => {
    const pts = roundCorners([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], () => 2);
    // tangent points at 2 mm from the corner, arc centre at (8, 2)
    expect(pts.length).toBeGreaterThan(10);
    expect(pts[1].x).toBeCloseTo(8, 6);
    expect(pts[1].y).toBeCloseTo(0, 6);
    const last = pts[pts.length - 2];
    expect(last.x).toBeCloseTo(10, 6);
    expect(last.y).toBeCloseTo(2, 6);
    for (const q of pts.slice(1, -1)) expect(Math.hypot(q.x - 8, q.y - 2)).toBeCloseTo(2, 6);
  });

  it('base flange: an L profile with inner radius 2 and outer radius 4 at the bend', () => {
    const chain = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }];
    const region = baseFlangeRegion(chain, P)!;
    // area = two straight legs + the quarter ring of the bend
    const legA = (40 - 4) * 2, legB = (30 - 4) * 2, ring = (Math.PI / 4) * (16 - 4);
    expect(region.area).toBeCloseTo(legA + legB + ring, 0);
    const g = baseFlangeGeometry(chain, REFERENCE_PLANE_DEFS.front, P, 60, true)!;
    expect(vol(g)).toBeCloseTo((legA + legB + ring) * 60, -1);
  });

  it('edge flange: a 90 degree flange of length 32 (outer virtual sharp) swept along a 60 mm edge', () => {
    const sheet = new THREE.BoxGeometry(40, 2, 60).translate(0, -1, 0); // top face y = 0
    const r = edgeFlangeGeometry({ a: [20, 0, -30], b: [20, 0, 30], faceNormal: [0, 1, 0], faceCentroid: [0, 0, 0], angle: 90, length: 32, lengthMode: 'outerSharp', position: 'materialOutside', flip: false }, P);
    expect(r.error).toBeUndefined();
    const leg = 32 - 4; // minus (r + t) for the outer virtual sharp
    const expected = ((Math.PI / 4) * (16 - 4) + leg * 2) * 60;
    expect(vol(r.geometry)).toBeCloseTo(expected, -1);
    r.geometry!.computeBoundingBox();
    const bb = r.geometry!.boundingBox!;
    expect(bb.min.x).toBeCloseTo(20, 1); // starts at the edge, goes outward (+x)
    expect(bb.max.y).toBeCloseTo(2 + leg, 1); // up to inner radius + leg
    // it merges with the sheet without a gap
    const merged = csg(sheet, r.geometry!, 'union');
    expect(vol(merged)).toBeCloseTo(40 * 2 * 60 + expected, -1);
  });

  it('flip puts the flange on the other side', () => {
    const r = edgeFlangeGeometry({ a: [20, 0, -30], b: [20, 0, 30], faceNormal: [0, 1, 0], faceCentroid: [0, 0, 0], angle: 90, length: 32, lengthMode: 'outerSharp', position: 'materialOutside', flip: true }, P);
    r.geometry!.computeBoundingBox();
    expect(r.geometry!.boundingBox!.min.y).toBeLessThan(-20);
  });

  it('flat pattern: developed length = legs minus setbacks plus bend allowance', () => {
    const chain = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }];
    const expected = 70 - 2 * outerSetback(90, 2, P) + bendAllowance(90, 2, P);
    expect(flatLength(chain, P)).toBeCloseTo(expected, 6);
    const g = flatPatternGeometry(chain, REFERENCE_PLANE_DEFS.front, P, 60, true)!;
    expect(vol(g)).toBeCloseTo(expected * 2 * 60, 0);
  });

  it('hem: closed and open 180 degree folds; Material Inside cuts the sheet back first', () => {
    const sheet = () => new THREE.BoxGeometry(40, 2, 60).translate(0, -1, 0); // top face y = 0, edge at x = 20
    const base = { a: [20, 0, -30] as [number, number, number], b: [20, 0, 30] as [number, number, number], faceNormal: [0, 1, 0] as [number, number, number], faceCentroid: [0, 0, 0] as [number, number, number], length: 10, lengthMode: 'tangentBend' as const, flip: false };
    // open hem, gap 2 -> inner radius 1, outer 3
    const open = edgeFlangeGeometry({ ...base, ...hemFlangeParams({ hemType: 'open', length: 10, gap: 2, position: 'materialOutside', flip: false }) }, P);
    const halfRing = (Math.PI / 2) * (9 - 1);
    // the bend is faceted (12 segments): within 1 %
    expect(Math.abs(vol(open.geometry) / ((halfRing + 10 * 2) * 60) - 1)).toBeLessThan(0.01);
    open.geometry!.computeBoundingBox();
    const bb = open.geometry!.boundingBox!;
    expect(bb.min.y).toBeCloseTo(-2, 1); // the bend starts at the sheet's inner face
    expect(bb.max.y).toBeCloseTo(4, 1); // hem leg from y = 2 (gap) to 4
    expect(bb.min.x).toBeCloseTo(10, 1); // the leg runs 10 back over the sheet
    expect(open.trim).toBeFalsy();
    // closed hem, Material Inside: the sheet is shortened by r + t first
    const closed = edgeFlangeGeometry({ ...base, ...hemFlangeParams({ hemType: 'closed', length: 10, gap: 0, position: 'materialInside', flip: false }) }, P);
    expect(closed.trim).toBeTruthy();
    const cut = csg(sheet(), closed.trim!, 'subtract');
    const r = 0.01;
    expect(vol(cut)).toBeCloseTo((40 - (r + 2)) * 2 * 60, -1);
    const merged = csg(cut, closed.geometry!, 'union');
    expect(vol(merged)).toBeCloseTo(vol(cut) + vol(closed.geometry), -1);
  });
});

