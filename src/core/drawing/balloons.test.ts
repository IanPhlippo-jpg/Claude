import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { layoutBalloons, magneticOrder, visibleAnchors } from './balloons';

const crosses = (p1: number[], q1: number[], p2: number[], q2: number[]) => {
  const o = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p1, q1, p2) !== o(p1, q1, q2) && o(p2, q2, p1) !== o(p2, q2, q1);
};

describe('auto balloon layout', () => {
  const box = { x: 0, y: 0, w: 100, h: 60 };
  it('square: each balloon on the nearest side, outside the view, no crossing leaders', () => {
    const anchors: [number, number][] = [[10, 55], [30, 50], [20, 52], [95, 30], [50, 3], [5, 30]];
    const { positions, lines } = layoutBalloons(anchors, box, 'square');
    expect(positions[0][1]).toBeGreaterThan(60);
    expect(positions[3][0]).toBeGreaterThan(100);
    expect(positions[4][1]).toBeLessThan(0);
    expect(positions[5][0]).toBeLessThan(0);
    for (let i = 0; i < anchors.length; i++)
      for (let j = i + 1; j < anchors.length; j++) {
        expect(crosses(anchors[i], positions[i], anchors[j], positions[j])).toBe(false);
        expect(Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1])).toBeGreaterThanOrEqual(9.99);
      }
    expect(lines.length).toBe(4);
  });
  it('top: all on one magnetic line in anchor order, at least the gap apart', () => {
    const anchors: [number, number][] = [[50, 30], [51, 31], [49, 29], [52, 30], [10, 10], [90, 10]];
    const { positions, lines } = layoutBalloons(anchors, box, 'top');
    expect(lines).toHaveLength(1);
    const xs = positions.map((p) => p[0]);
    const order = anchors.map((_a, i) => i).sort((i, j) => anchors[i][0] - anchors[j][0]);
    for (let k = 1; k < order.length; k++) expect(xs[order[k]] - xs[order[k - 1]]).toBeGreaterThanOrEqual(9.99);
  });
  it('magnetic line order follows the anchors along the line', () => {
    expect(magneticOrder([0, 0], [100, 0], [[80, 5], [20, 5], [50, 5]], [[0, 0], [0, 0], [0, 0]])).toEqual([1, 2, 0]);
  });
});

describe('visible anchors', () => {
  it('a part behind another gets its dot on its visible part, not behind the front one', () => {
    // front view (w = +z): a big plate at z 0..10 and a small block behind it at z -20..-10 sticking out to the right
    const plate = new THREE.BoxGeometry(100, 100, 10).translate(0, 0, 5).toNonIndexed();
    const block = new THREE.BoxGeometry(80, 20, 10).translate(70, 0, -15).toNonIndexed();
    const fr = { u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), w: new THREE.Vector3(0, 0, 1) };
    const a = visibleAnchors([{ id: 'plate', geometry: plate }, { id: 'block', geometry: block }], fr);
    expect(a.get('block')![0]).toBeGreaterThan(50);
    expect(Math.abs(a.get('plate')![0])).toBeLessThan(50);
  });
});
