/**
 * Fill lines for an area (grid units in, polylines in grid units out): rectilinear, grid, gyroid and honeycomb
 * (docs/33 eis 5, docs/34 2.4). Density is the share of the area the lines cover: line length x line width / area.
 */
import { RegionIndex, clipPolyline, clipSegments, type Paths } from '../geom/polygons';
import type { InfillPattern } from '../types';

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

/** gyroid wave lines at height z (grid units): the level curve of the gyroid, solved per column (docs/34 2.4) */
function gyroidLines(box: Box, period: number, z: number): number[][] {
  const k = (2 * Math.PI) / period;
  const zz = z * k;
  const sz = Math.sin(zz), cz = Math.cos(zz);
  // sin x cos y + sin y cos z + sin z cos x = 0; the lines run along X when |cos z| > |sin z|, else along Y
  const alongX = Math.abs(cz) >= Math.abs(sz);
  const lines: number[][] = [];
  const step = period / 16;
  const [a0, a1, b0, b1] = alongX ? [box.x0, box.x1, box.y0, box.y1] : [box.y0, box.y1, box.x0, box.x1];
  const startRow = Math.floor((b0 * k) / (2 * Math.PI)) - 1, endRow = Math.ceil((b1 * k) / (2 * Math.PI)) + 1;
  for (let row = startRow; row <= endRow; row++) {
    for (const branch of [1, -1]) {
      const pts: number[] = [];
      for (let a = Math.floor(a0 / step) * step - step; a <= a1 + step; a += step) {
        const t = a * k;
        // along X (t = x): A cos y + B sin y = C with A = sin x, B = cos z, C = -sin z cos x
        // along Y (t = y): A cos x + B sin x = C with A = sin z, B = cos y, C = -sin y cos z
        const A = alongX ? Math.sin(t) : sz, B = alongX ? cz : Math.cos(t);
        const C = alongX ? -sz * Math.cos(t) : -Math.sin(t) * cz;
        const R = Math.hypot(A, B);
        const ratio = Math.max(-1, Math.min(1, C / (R || 1e-12)));
        const phi = Math.atan2(B, A);
        const u = phi + branch * Math.acos(ratio) + 2 * Math.PI * row;
        const b = u / k;
        if (alongX) pts.push(a, b); else pts.push(b, a);
      }
      lines.push(pts);
    }
  }
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
      // two wave lines per period; their length is about 1.2 x straight, so the period follows from the density
      const period = (2 * 1.2 * lineWidth) / d;
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
