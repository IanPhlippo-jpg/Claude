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
