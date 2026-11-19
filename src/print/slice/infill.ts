/**
 * Fill lines for an area (grid units in, polylines in grid units out): rectilinear, grid, gyroid and honeycomb
 * (docs/33 eis 5, docs/34 2.4). Density is the share of the area the lines cover: line length x line width / area.
 */
import { RegionIndex, clipPolyline, clipSegments, type Paths } from '../geom/polygons';
import type { InfillPattern } from '../types';

/** line length per area of the gyroid slice, times the period (averaged over z on a plane of ten periods; docs/35 H-4) */
export const GYROID_K = 2.525;

export interface Box { x0: number; y0: number; x1: number; y1: number }

export function boxOf(region: Paths): Box {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const p of region) for (let i = 0; i < p.length; i += 2) {
    b.x0 = Math.min(b.x0, p[i]); b.x1 = Math.max(b.x1, p[i]); b.y0 = Math.min(b.y0, p[i + 1]); b.y1 = Math.max(b.y1, p[i + 1]);
  }
  return b;
}

/**
 * Parallel lines at `spacing` and `angle` (radians) through the region, clipped: segments x0, y0, x1, y1. The lines sit on
 * a grid fixed to the plate origin (not to the part), so lines of neighbouring layers line up.
 */
export function parallelLines(region: Paths | RegionIndex, box: Box, spacing: number, angle: number, phase = 0): number[] {
  const c = Math.cos(angle), s = Math.sin(angle);
  // the corners of the box in the rotated frame (u along the lines, v across)
  const corners = [[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of corners) {
    const u = x * c + y * s, v = -x * s + y * c;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const segs: number[] = [];
  const start = Math.ceil((v0 - phase) / spacing) * spacing + phase;
  for (let v = start; v <= v1; v += spacing) {
    segs.push((u0 - 10) * c - v * s, (u0 - 10) * s + v * c, (u1 + 10) * c - v * s, (u1 + 10) * s + v * c);
  }
  return clipSegments(segs, region);
}

/**
 * Gyroid lines at height z (grid units): the level curve sin x cos y + sin y cos z + sin z cos x = 0 of the slice,
 * traced with marching squares on a grid of period/24 and chained into polylines (docs/35 P2-1: no clamped solution,
 * so no doubled lines where the curve turns).
 */
export function gyroidLines(box: Box, period: number, z: number): number[][] {
  const k = (2 * Math.PI) / period;
  const sz = Math.sin(z * k), cz = Math.cos(z * k);
  const cell = period / 24;
  const x0 = Math.floor(box.x0 / cell) * cell - cell, y0 = Math.floor(box.y0 / cell) * cell - cell;
  const nx = Math.ceil((box.x1 - x0) / cell) + 2, ny = Math.ceil((box.y1 - y0) / cell) + 2;
  const f = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const x = (x0 + i * cell) * k, y = (y0 + j * cell) * k;
    const v = Math.sin(x) * Math.cos(y) + Math.sin(y) * cz + sz * Math.cos(x);
    f[j * (nx + 1) + i] = v === 0 ? 1e-12 : v;
  }
  const F = (i: number, j: number) => f[j * (nx + 1) + i];
  // edge ids: horizontal edge (i, j)-(i+1, j) = 2 * (j * (nx + 1) + i), vertical (i, j)-(i, j+1) = that + 1
  const hEdge = (i: number, j: number) => 2 * (j * (nx + 1) + i), vEdge = (i: number, j: number) => 2 * (j * (nx + 1) + i) + 1;
  const point = (e: number): [number, number] => {
    const id = e >> 1, i = id % (nx + 1), j = Math.floor(id / (nx + 1));
    const [a, b] = e & 1 ? [F(i, j), F(i, j + 1)] : [F(i, j), F(i + 1, j)];
    const t = a / (a - b);
    return e & 1 ? [x0 + i * cell, y0 + (j + t) * cell] : [x0 + (i + t) * cell, y0 + j * cell];
  };
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => { (links.get(a) ?? links.set(a, []).get(a)!).push(b); (links.get(b) ?? links.set(b, []).get(b)!).push(a); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const e: number[] = [];
    const corners = [F(i, j), F(i + 1, j), F(i + 1, j + 1), F(i, j + 1)];
    const edges = [hEdge(i, j), vEdge(i + 1, j), hEdge(i, j + 1), vEdge(i, j)];
    for (let q = 0; q < 4; q++) if ((corners[q] > 0) !== (corners[(q + 1) % 4] > 0)) e.push(edges[q]);
    if (e.length === 2) link(e[0], e[1]);
    else if (e.length === 4) {
      // a saddle: decided by the value in the middle of the cell
      const mid = (corners[0] + corners[1] + corners[2] + corners[3]) / 4;
      if ((mid > 0) === (corners[0] > 0)) { link(e[0], e[1]); link(e[2], e[3]); } else { link(e[0], e[3]); link(e[1], e[2]); }
    }
  }
  const seen = new Set<number>();
  const lines: number[][] = [];
  const walk = (start: number) => {
    const ids = [start];
    seen.add(start);
    let cur = start;
    for (;;) {
      const nxt = (links.get(cur) ?? []).find((n) => !seen.has(n));
      if (nxt === undefined) break;
      seen.add(nxt); ids.push(nxt); cur = nxt;
    }
    return ids;
  };
  // open chains from their ends first, then the closed loops
  for (const [e, l] of links) if (l.length === 1 && !seen.has(e)) lines.push(walk(e).flatMap(point));
  for (const e of links.keys()) if (!seen.has(e)) { const ids = walk(e); lines.push([...ids, ids[0]].flatMap(point)); }
  return lines;
}

/** the unique edges of a hexagon lattice with side a over the box (each edge once, no double extrusion) */
function honeycombSegments(box: Box, a: number, odd: boolean): number[] {
  const h = (Math.sqrt(3) / 2) * a;
  const segs: number[] = [];
  // flat-topped hexagons: columns 1.5a apart, rows 2h apart, odd columns shifted by h; alternate layers mirror in X
  const shift = odd ? 0.75 * a : 0;
  const c0 = Math.floor((box.x0 - shift) / (1.5 * a)) - 1, c1 = Math.ceil((box.x1 - shift) / (1.5 * a)) + 1;
  const r0 = Math.floor(box.y0 / (2 * h)) - 1, r1 = Math.ceil(box.y1 / (2 * h)) + 1;
  for (let col = c0; col <= c1; col++) {
    for (let row = r0; row <= r1; row++) {
      const cx = col * 1.5 * a + shift, cy = row * 2 * h + (col & 1 ? h : 0);
      // three edges per hexagon (top, upper right, lower right) cover the lattice exactly once
      const v = (i: number) => [cx + a * Math.cos((Math.PI / 3) * i), cy + a * Math.sin((Math.PI / 3) * i)];
      const [p0, p1, p2, p5] = [v(0), v(1), v(2), v(5)];
      segs.push(p1[0], p1[1], p2[0], p2[1], p0[0], p0[1], p1[0], p1[1], p5[0], p5[1], p0[0], p0[1]);
    }
  }
  return segs;
}

/**
 * The infill of a sparse area as polylines (grid units). lineWidth in grid units; layer index and z (grid units) set the
 * angle and the phase.
 */
export function infill(region: Paths, pattern: InfillPattern, density: number, lineWidth: number, layer: number, z: number): number[][] {
  if (!region.length || density <= 0) return [];
  const idx = new RegionIndex(region);
  const box = boxOf(region);
  const d = Math.min(1, density);
  const segsToLines = (s: number[]) => { const out: number[][] = []; for (let i = 0; i < s.length; i += 4) out.push([s[i], s[i + 1], s[i + 2], s[i + 3]]); return out; };
  switch (pattern) {
    case 'rectilinear':
      return segsToLines(parallelLines(idx, box, lineWidth / d, layer % 2 ? (3 * Math.PI) / 4 : Math.PI / 4));
    case 'grid':
      return segsToLines([...parallelLines(idx, box, (2 * lineWidth) / d, Math.PI / 4), ...parallelLines(idx, box, (2 * lineWidth) / d, (3 * Math.PI) / 4)]);
    case 'gyroid': {
      // the gyroid slice has about 2.525 / period length per area (measured over a whole period of layers, slicer test),
      // so the period follows from the density
      const period = (GYROID_K * lineWidth) / d;
      return gyroidLines(box, period, z).flatMap((l) => clipPolyline(l, idx));
    }
    case 'honeycomb': {
      const a = (2 * lineWidth) / (Math.sqrt(3) * d);
      return segsToLines(clipSegments(honeycombSegments(box, a, layer % 2 === 1), idx));
    }
  }
}

/** total length of polylines (grid units) */
export const lineLength = (lines: number[][]) => lines.reduce((s, l) => { for (let i = 0; i + 3 < l.length; i += 2) s += Math.hypot(l[i + 2] - l[i], l[i + 3] - l[i + 1]); return s; }, 0);
