import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, createSketch } from '../sketch/model';
import { REFERENCE_PLANE_DEFS } from './planes';
import { sketchRegions } from './regions';
import { loftGeometry, sketchPath, sweepGeometry } from './sweep';
import { meshVolume } from './solid';

describe('sweep', () => {
  it('a circle swept along a straight line is a cylinder', () => {
    // profile: circle r=5 on the Front plane around the origin; path: line along +Z on the Top plane (sketch y -> world -z)
    const profile = addCircle(createSketch('p', 'Sketch1', 'front'), { x: 0, y: 0 }, 5)[0];
    const path = addLine(createSketch('q', 'Sketch2', 'top'), { x: 0, y: 0 }, { x: 0, y: -30 })[0];
    const pts = sketchPath(path, REFERENCE_PLANE_DEFS.top)!;
    expect(pts).toHaveLength(2);
    expect(pts[1].z).toBeCloseTo(30, 5);
    const g = sweepGeometry(sketchRegions(profile), REFERENCE_PLANE_DEFS.front, pts)!;
    const vol = Math.abs(meshVolume(g));
    expect(vol).toBeGreaterThan(Math.PI * 25 * 30 * 0.98);
    expect(vol).toBeLessThan(Math.PI * 25 * 30 * 1.01);
  });

  it('a square swept along a quarter arc keeps its cross-section (volume = area × path length)', () => {
    let profile = createSketch('p', 'Sketch1', 'front');
    const c = [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: 2 }];
    for (let i = 0; i < 4; i++) profile = addLine(profile, c[i], c[(i + 1) % 4])[0];
    // path on the Top plane: quarter arc of radius 20 from the origin, starting along -y (world +z)
    const path = addArc(createSketch('q', 'Sketch2', 'top'), { x: 20, y: 0 }, { x: 0, y: 0 }, { x: 20, y: -20 }, true)[0];
    const pts = sketchPath(path, REFERENCE_PLANE_DEFS.top)!;
    expect(pts.length).toBeGreaterThan(5);
    const g = sweepGeometry(sketchRegions(profile), REFERENCE_PLANE_DEFS.front, pts)!;
    const vol = Math.abs(meshVolume(g));
    const expected = 16 * (Math.PI / 2) * 20;
    expect(vol).toBeGreaterThan(expected * 0.95);
    expect(vol).toBeLessThan(expected * 1.05);
  });
});

describe('loft', () => {
  it('lofting a square to a smaller square 10 up is a frustum', () => {
    let a = createSketch('a', 'Sketch1', 'top');
    const ca = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }];
    for (let i = 0; i < 4; i++) a = addLine(a, ca[i], ca[(i + 1) % 4])[0];
    let b = createSketch('b', 'Sketch2', 'pl');
    const cb = [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }];
    for (let i = 0; i < 4; i++) b = addLine(b, cb[i], cb[(i + 1) % 4])[0];
    const planeB = { ...REFERENCE_PLANE_DEFS.top, id: 'pl', origin: [0, 10, 0] as [number, number, number] };
    const g = loftGeometry(sketchRegions(a)[0], REFERENCE_PLANE_DEFS.top, sketchRegions(b)[0], planeB)!;
    const vol = Math.abs(meshVolume(g));
    // frustum: h/3 (A1 + A2 + sqrt(A1 A2)) = 10/3 (400 + 100 + 200) = 2333
    expect(vol).toBeGreaterThan(2333 * 0.97);
    expect(vol).toBeLessThan(2333 * 1.03);
  });
});
