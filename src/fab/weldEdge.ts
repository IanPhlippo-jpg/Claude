/**
 * Line contacts for the weld proposal (docs/37 ch. 9, oracle L4.4): two bodies that touch only along an edge, such as a
 * shelf lying between two beams or a side beam that meets the front beam on a corner line. A sharp edge of one body that
 * lies on a planar face of the other (within the gap a weld bridges, 0.6 mm) is a line contact; its length is the
 * covered length along the edge direction (two parallel edges of one plate edge count once).
 */
import { EndType, inflatePathsD, JoinType, type PathsD } from 'clipper2-ts';
import type { FabBody } from './bodies';
import { dot, planeGroups, triangle, triCount, unit, frameOf, type V3 } from './geom';
import { FillRule, unionD } from 'clipper2-ts';

export const LINE_GAP = 0.6;
/** a line contact shorter than this is a point (a corner touching a corner), no seam at all */
export const LINE_POINT = 5;
/**
 * A fillet weld shorter than 30 mm or 6 a (the larger) is not load-bearing (EN 1993-1-8, 4.5.1): it is still proposed,
 * as "korte las, niet dragend", unticked (docs/37 ch. 11). The rule is a design rule, no ban on welding.
 */
export const shortWeld = (lengte: number, a: number) => lengte < Math.max(30, 6 * a);

interface Seg { a: V3; b: V3 }

/**
 * The edges of a body: sharp ones (two triangles at more than 20 degrees, or one triangle only) and, seen along
 * `view`, the silhouette (one triangle towards the viewer, the other away), for the projection of the weld plan.
 */
export function sharpEdges(b: Pick<FabBody, 'soup'>, view?: V3): Seg[] {
  const key = (p: V3) => p.map((x) => Math.round(x * 1000)).join(',');
  const map = new Map<string, { a: V3; b: V3; n: V3[] }>();
  for (let i = 0; i < triCount(b.soup); i++) {
    const t = triangle(b.soup, i);
    if (t.area < 1e-9) continue;
    for (let k = 0; k < 3; k++) {
      const a = t.p[k], c = t.p[(k + 1) % 3];
      const ka = key(a), kc = key(c), id = ka < kc ? `${ka}|${kc}` : `${kc}|${ka}`;
      const e = map.get(id);
      if (e) e.n.push(t.n); else map.set(id, { a, b: c, n: [t.n] });
    }
  }
  const out: Seg[] = [];
  for (const e of map.values()) {
    const sharp = e.n.length !== 2 || dot(e.n[0], e.n[1]) < Math.cos((20 * Math.PI) / 180);
    const outline = !!view && e.n.length === 2 && Math.sign(dot(e.n[0], view)) !== Math.sign(dot(e.n[1], view));
    if (sharp || outline) out.push({ a: e.a, b: e.b });
  }
  return out;
}

function inside(paths: PathsD, x: number, y: number): boolean {
  let w = 0;
  for (const p of paths) for (let i = 0; i < p.length; i++) {
    const a = p[i], c = p[(i + 1) % p.length];
    if (a.y <= y) { if (c.y > y && (c.x - a.x) * (y - a.y) - (x - a.x) * (c.y - a.y) > 0) w++; } else if (c.y <= y && (c.x - a.x) * (y - a.y) - (x - a.x) * (c.y - a.y) < 0) w--;
  }
  return w !== 0;
}

/** the covered length of segments along their own directions (parallel segments merged by projection), the longest group */
function coveredLength(segs: { a: { x: number; y: number }; b: { x: number; y: number } }[]): { len: number; mid: { x: number; y: number } } {
  let best = { len: 0, mid: { x: 0, y: 0 } };
  const used = new Set<number>();
  segs.forEach((s0, i) => {
    if (used.has(i)) return;
    const L0 = Math.hypot(s0.b.x - s0.a.x, s0.b.y - s0.a.y);
    if (L0 < 1e-6) return;
    const d = { x: (s0.b.x - s0.a.x) / L0, y: (s0.b.y - s0.a.y) / L0 };
    const iv: [number, number][] = [];
    let mx = 0, my = 0, w = 0;
    segs.forEach((s, j) => {
      const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
      if (L < 1e-6 || Math.abs(((s.b.x - s.a.x) * d.y - (s.b.y - s.a.y) * d.x) / L) > 0.035) return;
      used.add(j);
      const p = s.a.x * d.x + s.a.y * d.y, q = s.b.x * d.x + s.b.y * d.y;
      iv.push([Math.min(p, q), Math.max(p, q)]);
      mx += (s.a.x + s.b.x) * L; my += (s.a.y + s.b.y) * L; w += 2 * L;
    });
    iv.sort((x, y) => x[0] - y[0]);
    if (!iv.length) return;
    let len = 0, lo = iv[0][0], hi = iv[0][0];
    for (const [a, b] of iv) { if (a > hi + 0.05) { len += Math.max(0, hi - lo); lo = a; hi = b; } else hi = Math.max(hi, b); }
    len += Math.max(0, hi - lo);
    if (len > best.len) best = { len, mid: { x: mx / w, y: my / w } };
  });
  return best;
}

/** the line contact of body a against the planar faces of body b, or null (shorter than LINE_POINT) */
export function lineContact(a: Pick<FabBody, 'soup'>, b: Pick<FabBody, 'soup'>): { lengte: number; punt: V3 } | null {
  const edges = sharpEdges(a);
  let best: { lengte: number; punt: V3 } | null = null;
  for (const g of planeGroups(b.soup, 1)) {
    const n = unit(g.n), { u, v } = frameOf(n);
    const on = edges.filter((e) => Math.abs(dot(e.a, n) - g.d) <= LINE_GAP && Math.abs(dot(e.b, n) - g.d) <= LINE_GAP);
    if (!on.length) continue;
    const poly = inflatePathsD(unionD(g.tris.map((ti) => triangle(b.soup, ti).p.map((p) => ({ x: dot(p, u), y: dot(p, v) }))), [], FillRule.NonZero, 4),
      LINE_GAP, JoinType.Miter, EndType.Polygon, 2, 4, 0.05);
    const segs = on.map((e) => ({ a: { x: dot(e.a, u), y: dot(e.a, v) }, b: { x: dot(e.b, u), y: dot(e.b, v) } }))
      .filter((s) => inside(poly, s.a.x, s.a.y) && inside(poly, s.b.x, s.b.y) && inside(poly, (s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2));
    const c = coveredLength(segs);
    if (c.len >= LINE_POINT && (!best || c.len > best.lengte)) {
      best = { lengte: c.len, punt: [0, 1, 2].map((k) => u[k] * c.mid.x + v[k] * c.mid.y + n[k] * g.d) as V3 };
    }
  }
  return best;
}
