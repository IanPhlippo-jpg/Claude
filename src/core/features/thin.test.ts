import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, createSketch } from '../sketch/model';
import { REFERENCE_PLANE_DEFS } from './planes';
import { extrudeGeometry, meshVolume } from './solid';
import { offsetPolyline, sketchChains, thinRegions } from './thin';

describe('thin feature', () => {
  it('offsets a polyline with mitred corners', () => {
    const o = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 1, false);
    expect(o).toHaveLength(3);
    expect(o[0].x).toBeCloseTo(0, 9); expect(o[0].y).toBeCloseTo(1, 9);
    expect(o[1].x).toBeCloseTo(9, 9); expect(o[1].y).toBeCloseTo(1, 9);
    expect(o[2].x).toBeCloseTo(9, 9); expect(o[2].y).toBeCloseTo(10, 9);
  });

  it('chains lines and arcs into one open path', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    s = addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 })[0];
    s = addArc(s, { x: 10, y: 5 }, { x: 10, y: 0 }, { x: 10, y: 10 }, true)[0];
    s = addLine(s, { x: 10, y: 10 }, { x: 0, y: 10 })[0];
    const chains = sketchChains(s);
    expect(chains).toHaveLength(1);
    expect(chains[0].closed).toBe(false);
    expect(chains[0].points[0]).toEqual({ x: 0, y: 0 });
    expect(chains[0].points[chains[0].points.length - 1]).toEqual({ x: 0, y: 10 });
  });

  it('an open L profile extruded as a thin feature has the wall volume', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    s = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 })[0];
    s = addLine(s, { x: 40, y: 0 }, { x: 40, y: 30 })[0];
    const regions = thinRegions(sketchChains(s), { mode: 'one', thickness: 2 });
    expect(regions).toHaveLength(1);
    // area of the band: (40 + 30) * 2 minus the corner overlap counted once -> 2 * (40 + 30 - 2) = 136 (mitre keeps the outer corner)
    expect(regions[0].area).toBeCloseTo(136, 3);
    const g = extrudeGeometry(regions, REFERENCE_PLANE_DEFS.front, { end: 'blind', depth: 10, reverse: false })!;
    expect(Math.abs(meshVolume(g))).toBeCloseTo(1360, 2);
  });

  it('a closed circle becomes a ring of the thickness', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    s = addCircle(s, { x: 0, y: 0 }, 10)[0];
    const chains = sketchChains(s);
    expect(chains[0].closed).toBe(true);
    const regions = thinRegions(chains, { mode: 'mid', thickness: 2 });
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    // ring between r = 9 and r = 11 (polygon approximations)
    expect(regions[0].area).toBeGreaterThan(Math.PI * (121 - 81) * 0.97);
    expect(regions[0].area).toBeLessThan(Math.PI * (121 - 81) * 1.03);
  });
});
