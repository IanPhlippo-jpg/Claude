import { describe, expect, it } from 'vitest';
import { addCircle, createSketch } from '../sketch/model';
import { REFERENCE_PLANE_DEFS } from './planes';
import { helixPath } from './sweep';

describe('helix', () => {
  it('runs around the circle along the sketch normal with the pitch per revolution', () => {
    let s = createSketch('s', 'Sketch1', 'top');
    s = addCircle(s, { x: 0, y: 0 }, 20)[0];
    const pts = helixPath(s, REFERENCE_PLANE_DEFS.top, { definedBy: 'pitchRevolution', pitch: 10, revolutions: 3, height: 0, startAngle: 0, clockwise: true, reverse: false })!;
    expect(pts).not.toBeNull();
    expect(pts.length).toBeGreaterThan(100);
    // every point at radius 20 from the y axis; the last one 30 high
    for (const p of pts) expect(Math.hypot(p.x, p.z)).toBeCloseTo(20, 6);
    expect(pts[0].y).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1].y).toBeCloseTo(30, 6);
    expect(pts[0].x).toBeCloseTo(20, 6);
  });

  it('height and revolutions / height and pitch define the same helix; no circle gives null', () => {
    let s = createSketch('s', 'Sketch1', 'top');
    s = addCircle(s, { x: 0, y: 0 }, 5)[0];
    const a = helixPath(s, REFERENCE_PLANE_DEFS.top, { definedBy: 'heightRevolution', pitch: 0, revolutions: 2, height: 20, startAngle: 90, clockwise: false, reverse: false })!;
    const b = helixPath(s, REFERENCE_PLANE_DEFS.top, { definedBy: 'heightPitch', pitch: 10, revolutions: 0, height: 20, startAngle: 90, clockwise: false, reverse: false })!;
    expect(a.length).toBe(b.length);
    expect(a[a.length - 1].y).toBeCloseTo(20, 6);
    expect(b[b.length - 1].y).toBeCloseTo(20, 6);
    expect(helixPath(createSketch('e', 'Sketch2', 'top'), REFERENCE_PLANE_DEFS.top, { definedBy: 'pitchRevolution', pitch: 10, revolutions: 3, height: 0, startAngle: 0, clockwise: true, reverse: false })).toBeNull();
  });
});
