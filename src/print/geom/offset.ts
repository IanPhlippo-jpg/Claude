/**
 * Polygon offset (docs/34 2.3): every edge moved along its outward normal, round joins where the offsets separate and
 * the original vertex where they cross; the raw curve (which may cross itself) is then united with the positive fill
 * rule, so loops that turned inside out (winding <= 0) drop away. Growing closes holes and merges islands, shrinking
 * removes narrow parts and splits a region.
 */
import { area, boolean, cleanPath, type Path, type Paths } from './boolean';

/** the raw offset curve of one loop: positive delta grows the filled side (outer loops CCW, holes CW) */
function rawOffset(p: Path, delta: number, arcTol: number): Path {
  const n = p.length / 2;
  const out: number[] = [];
  const nx: number[] = [], ny: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = p[2 * j] - p[2 * i], dy = p[2 * j + 1] - p[2 * i + 1], L = Math.hypot(dx, dy) || 1;
    // right of the direction of travel = outside of a counter-clockwise loop
    nx.push(dy / L); ny.push(-dx / L);
  }
  const ad = Math.abs(delta);
  const stepAngle = ad > arcTol ? 2 * Math.acos(1 - arcTol / ad) : Math.PI / 4;
  for (let i = 0; i < n; i++) {
    const k = (i + n - 1) % n;
    const vx = p[2 * i], vy = p[2 * i + 1];
    const ax = vx + nx[k] * delta, ay = vy + ny[k] * delta;
    const bx = vx + nx[i] * delta, by = vy + ny[i] * delta;
    const cross = nx[k] * ny[i] - ny[k] * nx[i];
    const dot = nx[k] * nx[i] + ny[k] * ny[i];
    if (dot > 0.99999 && Math.abs(cross) < 1e-5) { out.push(Math.round((ax + bx) / 2), Math.round((ay + by) / 2)); continue; }
    if (cross * delta > 0) {
      // the offsets separate: a round join around the vertex
      const a0 = Math.atan2(ny[k], nx[k]);
      const sweep = Math.atan2(cross, dot);
      const steps = Math.max(1, Math.ceil(Math.abs(sweep) / stepAngle));
      out.push(Math.round(ax), Math.round(ay));
      for (let s = 1; s < steps; s++) {
        const t = a0 + (sweep * s) / steps;
        out.push(Math.round(vx + Math.cos(t) * delta), Math.round(vy + Math.sin(t) * delta));
      }
      out.push(Math.round(bx), Math.round(by));
    } else {
      // the offsets cross: through the vertex; the small reversed loop has winding <= 0 and drops out of the union
      out.push(Math.round(ax), Math.round(ay), vx, vy, Math.round(bx), Math.round(by));
    }
  }
  return out;
}

/**
 * Offset of a region (outer loops CCW, holes CW) by delta grid units. arcTol: the largest distance of a join chord from
 * the true arc, in grid units.
 */
export function offset(region: Paths, delta: number, arcTol = 50, minArea = 1): Paths {
  if (!region.length) return [];
  if (delta === 0) return boolean(region, [], 'union', minArea);
  const raw: Paths = [];
  for (const p of region) {
    const c = cleanPath(p);
    if (c.length < 6) continue;
    // a loop that the offset removes entirely (a hole when growing, an outline when shrinking) is left out: every point
    // of it lies within half its smaller box side of its boundary, so a box side below 2|delta| means it vanishes
    if ((area(c) > 0) === (delta < 0)) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < c.length; i += 2) { x0 = Math.min(x0, c[i]); x1 = Math.max(x1, c[i]); y0 = Math.min(y0, c[i + 1]); y1 = Math.max(y1, c[i + 1]); }
      if (Math.min(x1 - x0, y1 - y0) < 2 * Math.abs(delta)) continue;
    }
    raw.push(rawOffset(c, delta, arcTol));
  }
  return boolean(raw, [], 'union', minArea);
}

/** opening: shrink then grow by d (removes parts narrower than 2d) */
export const opening = (region: Paths, d: number, arcTol = 50) => offset(offset(region, -d, arcTol), d, arcTol);
