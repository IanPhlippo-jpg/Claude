import type { Sketch, SketchPoint } from '../sketch/types';
import { findContours } from '../sketch/contours';

/** A closed region of a sketch: an outer loop with zero or more holes (nested loops). */
export interface Region {
  outer: SketchPoint[];
  holes: SketchPoint[][];
  area: number;
}

function pointInPolygon(p: SketchPoint, poly: SketchPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function centroid(poly: SketchPoint[]): SketchPoint {
  let x = 0, y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / poly.length, y: y / poly.length };
}

/**
 * Regions to extrude, like "Selected Contours" with everything selected: every closed
 * loop at an even nesting depth is a region; the loops directly inside it are its holes.
 */
export function sketchRegions(s: Sketch): Region[] {
  const loops = findContours(s)
    .filter((c) => c.points.length >= 3 && c.area > 1e-9)
    .sort((a, b) => b.area - a.area);
  const parentOf = loops.map((c, i) => {
    // probe with a vertex and the centroid (a vertex may lie exactly on the parent's boundary)
    const probes = [c.points[0], centroid(c.points)];
    let best = -1;
    for (let j = 0; j < loops.length; j++) {
      if (j === i || loops[j].area <= c.area) continue;
      if (probes.some((p) => pointInPolygon(p, loops[j].points))) {
        if (best < 0 || loops[j].area < loops[best].area) best = j;
      }
    }
    return best;
  });
  const depth = loops.map((_, i) => {
    let d = 0, p = parentOf[i];
    while (p >= 0) {
      d++;
      p = parentOf[p];
    }
    return d;
  });
  const out: Region[] = [];
  loops.forEach((c, i) => {
    if (depth[i] % 2 !== 0) return;
    const holes = loops.filter((_, j) => parentOf[j] === i).map((h) => h.points);
    out.push({ outer: c.points, holes, area: c.area - holes.reduce((a, h) => a + Math.abs(polyArea(h)), 0) });
  });
  return out;
}

export function polyArea(poly: SketchPoint[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return a / 2;
}
