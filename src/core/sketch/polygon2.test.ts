import { describe, expect, it } from 'vitest';
import { addPolygon, createSketch } from './model';
import { solveSketch } from '../solver/solver';
import { threadPreviewCurves } from '../features/thread';

describe('polygon inscribed (default of the Polygon tool)', () => {
  it('puts the circle inside, touching every side, and stays regular when solved', () => {
    let s = createSketch('s', 'S');
    let lines;
    [s, lines] = addPolygon(s, { x: 0, y: 0 }, 10, 6, Math.PI / 2, true);
    const r = solveSketch(s);
    expect(r.residual).toBeLessThan(1e-6);
    expect(r.status).not.toBe('conflict');
    const k = r.sketch;
    for (const l of lines) {
      const a = k.points[l.p1], b = k.points[l.p2];
      // distance from the centre to each side = the circle radius (apothem 10), side length = 2·10·tan 30°
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const d = Math.abs(a.x * b.y - a.y * b.x) / len;
      expect(d).toBeCloseTo(10, 5);
      expect(len).toBeCloseTo(20 * Math.tan(Math.PI / 6), 5);
    }
    // the second click (rotation) is the middle of the first side
    const l0 = lines[0], a = k.points[l0.p1], b = k.points[l0.p2];
    expect((a.x + b.x) / 2).toBeCloseTo(0, 5);
    expect((a.y + b.y) / 2).toBeCloseTo(10, 5);
  });
});

describe('polygon inscribed: independent relations (no false Over Defined)', () => {
  for (const n of [3, 4, 5, 6, 10, 12]) {
    it(`${n} sides: under defined with 4 degrees of freedom, and still regular after a vertex is dragged`, () => {
      let s = createSketch('s', 'S');
      let lines;
      [s, lines] = addPolygon(s, { x: 3, y: -2 }, 10, n, 0.3, true);
      const r = solveSketch(s);
      expect(r.status).toBe('under');
      expect(r.dof).toBe(4);
      const drag = solveSketch(r.sketch, { drag: { point: lines[0].p1, target: { x: r.sketch.points[lines[0].p1].x + 4, y: r.sketch.points[lines[0].p1].y + 1 } } });
      const k = drag.sketch;
      const lens = lines.map((l) => Math.hypot(k.points[l.p2].x - k.points[l.p1].x, k.points[l.p2].y - k.points[l.p1].y));
      for (const len of lens) expect(len).toBeCloseTo(lens[0], 4);
      // regular: every corner on one circle around the centre of the corners
      const cx = lines.reduce((a, l) => a + k.points[l.p1].x, 0) / n, cy = lines.reduce((a, l) => a + k.points[l.p1].y, 0) / n;
      const rad = lines.map((l) => Math.hypot(k.points[l.p1].x - cx, k.points[l.p1].y - cy));
      for (const q of rad) expect(q).toBeCloseTo(rad[0], 4);
    });
  }
});

describe('thread preview (cyan lines of the intended design)', () => {
  it('gives the three corner helices and the profile at both ends', () => {
    const c = threadPreviewCurves({ center: [0, 0, 0], axis: [0, 1, 0], radius: 7, internal: false, pitch: 2, length: 30, method: 'cut', rightHand: true });
    expect(c.length).toBe(5);
    // a helix climbs the length of the thread
    const ys = c[1].map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(30, 0);
    // the end profiles are closed triangles
    expect(c[3].length).toBe(4);
    expect(c[3][0].distanceTo(c[3][3])).toBeLessThan(1e-9);
  });
});
