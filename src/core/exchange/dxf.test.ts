import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { createSketch } from '../sketch/model';
import { findContours } from '../sketch/contours';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { toDxf } from '../drawing/export2d';
import { readDxf } from './dxfRead';
import { addDxfToSketch, describeCounts } from './dxfSketch';

/** a DXF file from group code / value pairs; `units` is $INSUNITS (omitted: no header unit) */
function dxf(entities: (string | number)[][], opts: { units?: number; blocks?: (string | number)[][] } = {}): string {
  const out: (string | number)[] = [0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1027'];
  if (opts.units !== undefined) out.push(9, '$INSUNITS', 70, opts.units);
  out.push(0, 'ENDSEC');
  if (opts.blocks) { out.push(0, 'SECTION', 2, 'BLOCKS'); for (const b of opts.blocks) out.push(...b); out.push(0, 'ENDSEC'); }
  out.push(0, 'SECTION', 2, 'ENTITIES');
  for (const e of entities) out.push(...e);
  out.push(0, 'ENDSEC', 0, 'EOF');
  return out.map((v) => String(v)).join('\r\n') + '\r\n';
}
const line = (x1: number, y1: number, x2: number, y2: number) => [0, 'LINE', 8, '0', 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0];
const lwpoly = (pts: [number, number, number?][], closed: boolean) => [0, 'LWPOLYLINE', 8, '0', 90, pts.length, 70, closed ? 1 : 0, ...pts.flatMap(([x, y, b]) => (b ? [10, x, 20, y, 42, b] : [10, x, 20, y]))];

/** the sketch on the Front plane extruded `depth` mm: the bodies and their volumes */
function extrude(text: string, depth = 10) {
  const d = readDxf(text);
  const { sketch, counts, merged } = addDxfToSketch(createSketch('sk1', 'Sketch1', 'front'), d);
  const doc = createDocument();
  doc.sketches.sk1 = sketch;
  doc.features.push({ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false });
  doc.features.push({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false });
  const r = rebuildDocument(doc);
  return { d, sketch, counts, merged, errors: r.errors, volumes: r.bodies.map((b) => meshVolume(b.geometry)) };
}

const quarter = Math.tan(Math.PI / 8); // the bulge of a 90° arc

describe('DXF import (docs/32 item 5)', () => {
  it('a rectangle with a rounded corner (LWPOLYLINE with a bulge) extrudes to one closed body', () => {
    // 100 x 50 with an R10 round in the upper right corner, counter-clockwise
    const text = dxf([lwpoly([[0, 0], [100, 0], [100, 40, quarter], [90, 50], [0, 50]], true)], { units: 4 });
    const r = extrude(text);
    expect(r.counts).toEqual({ line: 4, arc: 1 });
    expect(Object.keys(r.errors)).toEqual([]);
    expect(r.volumes).toHaveLength(1);
    const area = 100 * 50 - (100 - Math.PI * 25);
    expect(Math.abs(r.volumes[0] - area * 10) / (area * 10)).toBeLessThan(2e-3);
    // the arc is the exact R10 quarter about (90, 40)
    const arc = Object.values(r.sketch.entities).find((e) => e.kind === 'arc')!;
    expect(arc.kind === 'arc' && r.sketch.scalars[arc.r]).toBeCloseTo(10, 9);
    expect(arc.kind === 'arc' && r.sketch.points[arc.center]).toEqual({ x: expect.closeTo(90, 9), y: expect.closeTo(40, 9) });
  });

  it('separate LINE and ARC entities with tiny gaps close into one profile (end points merged)', () => {
    const g = 2e-6;
    const text = dxf([
      line(0, 0, 100, 0), line(100 + g, 0, 100, 40),
      // the same corner arc as an ARC entity: centre, radius, start and end angle in degrees
      [0, 'ARC', 8, '0', 10, 90, 20, 40, 30, 0, 40, 10, 50, 0, 51, 90],
      line(90, 50 - g, 0, 50), line(0, 50, 0, g),
    ]);
    const r = extrude(text);
    expect(r.d.unitKnown).toBe(false);
    expect(r.merged).toBe(5);
    expect(findContours(r.sketch)).toHaveLength(1);
    expect(r.volumes).toHaveLength(1);
    expect(Math.abs(r.volumes[0] - (5000 - 100 + Math.PI * 25) * 10)).toBeLessThan(100);
  });

  it('a circle becomes a sketch circle and a cylinder', () => {
    const r = extrude(dxf([[0, 'CIRCLE', 8, '0', 10, 20, 20, 30, 30, 0, 40, 15]], { units: 4 }), 20);
    expect(r.counts).toEqual({ circle: 1 });
    const c = Object.values(r.sketch.entities)[0];
    expect(c.kind === 'circle' && r.sketch.points[c.center]).toEqual({ x: 20, y: 30 });
    expect(Math.abs(r.volumes[0] - Math.PI * 225 * 20) / (Math.PI * 225 * 20)).toBeLessThan(3e-3);
  });

  it('a drawing in inches comes in in millimetres', () => {
    const d = readDxf(dxf([line(0, 0, 2, 0), [0, 'CIRCLE', 8, '0', 10, 1, 20, 1, 30, 0, 40, 0.5]], { units: 1 }));
    expect(d.unit).toBe('in');
    expect(d.scale).toBe(25.4);
    const { sketch } = addDxfToSketch(createSketch('s', 'S'), d);
    const ln = Object.values(sketch.entities).find((e) => e.kind === 'line')!;
    if (ln.kind !== 'line') throw new Error('no line');
    expect(sketch.points[ln.p2].x - sketch.points[ln.p1].x).toBeCloseTo(50.8, 9);
    const ci = Object.values(sketch.entities).find((e) => e.kind === 'circle')!;
    expect(ci.kind === 'circle' && sketch.scalars[ci.r]).toBeCloseTo(12.7, 9);
  });

  it('a block reference is placed with its insertion point, rotation and scale; a mirrored one keeps its arcs', () => {
    // block "SQ": a 10 x 10 square with base point (5, 5) and a semicircle on top
    const block = [0, 'BLOCK', 8, '0', 2, 'SQ', 70, 0, 10, 5, 20, 5, 30, 0, ...line(0, 0, 10, 0), ...line(10, 0, 10, 10), ...line(0, 10, 0, 0),
      0, 'ARC', 8, '0', 10, 5, 20, 10, 30, 0, 40, 5, 50, 0, 51, 180, 0, 'ENDBLK', 8, '0'];
    const ins = (x: number, rot: number, sx: number) => [0, 'INSERT', 8, '0', 2, 'SQ', 10, x, 20, 0, 30, 0, 41, sx, 42, Math.abs(sx), 50, rot];
    const d = readDxf(dxf([ins(100, 90, 2), ins(-100, 0, -1)], { blocks: [block] }));
    const { sketch } = addDxfToSketch(createSketch('s', 'S'), d);
    const contours = findContours(sketch);
    expect(contours).toHaveLength(2);
    const areas = contours.map((c) => c.area).sort((a, b) => a - b);
    // square + half disc: 100 + 39.27, scaled 2: x4
    expect(areas[0]).toBeCloseTo(100 + Math.PI * 12.5, 0);
    expect(areas[1]).toBeCloseTo(4 * (100 + Math.PI * 12.5), 0);
    // rotated 90° about the insertion point (100, 0): the top of the block points to -x
    const big = contours.find((c) => c.area > 300)!;
    expect(Math.min(...big.points.map((p) => p.x))).toBeCloseTo(100 - 10 - 10, 1);
  });

  it('ellipses, splines and points; unsupported entities are counted, paper space is left out', () => {
    const text = dxf([
      [0, 'ELLIPSE', 8, '0', 10, 0, 20, 0, 30, 0, 11, 20, 21, 0, 31, 0, 40, 0.5, 41, 0, 42, 2 * Math.PI],
      [0, 'ELLIPSE', 8, '0', 10, 50, 20, 0, 30, 0, 11, 0, 21, 20, 31, 0, 40, 0.25, 41, 0, 42, Math.PI],
      // a cubic B-spline (clamped) through 4 control points
      [0, 'SPLINE', 8, '0', 70, 8, 71, 3, 72, 8, 73, 4, 74, 0, 40, 0, 40, 0, 40, 0, 40, 0, 40, 1, 40, 1, 40, 1, 40, 1, 10, 0, 20, 100, 30, 0, 10, 10, 20, 120, 30, 0, 10, 30, 20, 120, 30, 0, 10, 40, 20, 100, 30, 0],
      [0, 'POINT', 8, '0', 10, 7, 20, 8, 30, 0],
      [0, 'TEXT', 8, '0', 10, 0, 20, 0, 30, 0, 40, 5, 1, 'Hallo'],
      [0, 'TEXT', 8, '0', 10, 0, 20, 0, 30, 0, 40, 5, 1, 'Nog'],
      [0, 'DIMENSION', 8, '0', 2, '*D1'],
      [0, 'LINE', 8, '0', 67, 1, 10, 0, 20, 0, 30, 0, 11, 1, 21, 1, 31, 0],
    ]);
    const d = readDxf(text);
    expect(d.skipped).toEqual({ TEXT: 2, DIMENSION: 1, 'paper space': 1 });
    const { sketch, counts } = addDxfToSketch(createSketch('s', 'S'), d);
    expect(counts).toEqual({ ellipse: 1, ellipseArc: 1, spline: 1, point: 1 });
    expect(describeCounts(counts)).toBe('1 ellipse, 1 partial ellipse, 1 spline, 1 point');
    const sp = Object.values(sketch.entities).find((e) => e.kind === 'spline')!;
    if (sp.kind !== 'spline') throw new Error('no spline');
    const pts = sp.points.map((id) => sketch.points[id]);
    // the curve ends at the end control points and passes through the middle at (20, 115) for this symmetric cubic
    expect(pts[0]).toEqual({ x: 0, y: 100 });
    expect(pts[pts.length - 1].x).toBeCloseTo(40, 6);
    const mid = pts[Math.floor(pts.length / 2)];
    expect(mid.x).toBeCloseTo(20, 6);
    expect(mid.y).toBeCloseTo(115, 6);
    // the half ellipse: major axis along y (20), from (50, 20) counter-clockwise to (50, -20) through (45, 0)
    const ea = Object.values(sketch.entities).find((e) => e.kind === 'ellipseArc')!;
    if (ea.kind !== 'ellipseArc') throw new Error('no partial ellipse');
    expect(sketch.points[ea.start].x).toBeCloseTo(50, 9);
    expect(sketch.points[ea.start].y).toBeCloseTo(20, 9);
    expect(sketch.points[ea.end].y).toBeCloseTo(-20, 9);
  });

  it('a drawing written by the DXF export (R12 POLYLINE) reads back as the same outline', () => {
    const text = toDxf({ width: 200, height: 100, paths: [{ pts: [[10, 10], [60, 10], [60, 40], [10, 40]], closed: true, width: 0.35 }], circles: [{ c: [100, 50], r: 5, width: 0.35 }], texts: [] });
    const d = readDxf(text);
    expect(d.version).toBe('AC1009');
    const { sketch, counts } = addDxfToSketch(createSketch('s', 'S'), d);
    expect(counts).toEqual({ line: 4, circle: 1 });
    expect(findContours(sketch).map((c) => Math.round(c.area)).sort((a, b) => a - b)).toEqual([78, 1500]);
  });

  it('a DWG or binary DXF file is refused with a clear message', () => {
    expect(() => readDxf('AC1032\0\0\0\0')).toThrow(/DWG/);
    expect(() => readDxf('AutoCAD Binary DXF\r\n\x1a\0')).toThrow(/binary DXF/);
    expect(() => readDxf('hello world\nthis is not a dxf\n')).toThrow(/not a DXF/);
  });
});
