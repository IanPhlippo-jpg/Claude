/**
 * The general unfolder (docs/36 P1.4, docs/37 ch. 9): the flat of any bent plate of constant thickness from its mesh,
 * where the model's own Flat-Pattern only unfolds bends of the base flange (edge flanges, hems, jogs, imported parts).
 *
 * 1. The skin: a triangle is skin when the material behind it (along -n) is t thick and ends on a triangle facing the
 *    other way; the walls (edges of the plate, holes) are the rest. The skin falls into two sides; one is unfolded.
 * 2. Regions: skin triangles connected across edges without a crease are one plane (a flange, or one strip of a bend).
 * 3. Unfolding: from the biggest flange, every region is turned about its crease edge into the plane (an isometry, exact
 *    for the planes and the facetted cylinders of the bends). A bend strip is stretched across its crease to the
 *    neutral fibre: by (r + K t) / r where this side is the inside of the bend, (r + K t) / (r + t) on the outside.
 * 4. The flat is built as a plate of thickness t (top, bottom and the walls of the unfolded boundary), so the outline,
 *    holes, arcs and checks come from the same code as every other plate (flatOfPlate).
 * The caller checks the result against the folded part (area x t with K = 0.5 against the volume, the holes).
 */
import type { P2, V3 } from './geom';
import { areaD, EndType, FillRule, inflatePathsD, JoinType, unionD, type PathsD } from 'clipper2-ts';
import { cross, dot, triangle, triCount, unit } from './geom';

interface Tri { v: [number, number, number]; n: V3; c: V3; area: number; /** index in the soup */ src: number }
export interface UnfoldBend { a: P2; b: P2; hoek: number; richting: 'op' | 'neer'; /** inner radius measured on the facets */ r: number }
export interface Unfolded { soup: Float64Array; plooien: UnfoldBend[]; oppervlak: number; /** through holes of the folded part: rings of wall faces besides the outer one */ gaten: number }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** distance along the ray from o in direction d to triangle (a, b, c), or null */
function ray(o: V3, d: V3, a: V3, b: V3, c: V3): number | null {
  const e1 = sub(b, a), e2 = sub(c, a), p = cross(d, e2), det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const s = sub(o, a), u = dot(s, p) / det;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  const q = cross(s, e1), v = dot(d, q) / det;
  if (v < -1e-9 || u + v > 1 + 1e-9) return null;
  const t = dot(e2, q) / det;
  return t > 1e-6 ? t : null;
}

export function unfoldMesh(s: Float64Array, t: number, r: number, k: number | ((rIn: number) => number), curved?: Set<number>): Unfolded | { fout: string } {
  const kOf = typeof k === 'number' ? () => k : k;
  // ---- weld the vertices, the triangles and their edges
  const verts: V3[] = [], ids = new Map<string, number>();
  const vid = (p: V3) => { const key = p.map((x) => Math.round(x * 1e4)).join(','); let i = ids.get(key); if (i === undefined) { i = verts.length; verts.push(p); ids.set(key, i); } return i; };
  const tris: Tri[] = [];
  for (let i = 0; i < triCount(s); i++) {
    const g = triangle(s, i);
    // slivers (CSG seams along a line) carry no area and would join edges across a hole
    if (g.area < 1e-9) continue;
    tris.push({ src: i, v: [vid(g.p[0]), vid(g.p[1]), vid(g.p[2])], n: g.n, area: g.area, c: [0, 1, 2].map((j) => (g.p[0][j] + g.p[1][j] + g.p[2][j]) / 3) as V3 });
  }
  const adj = adjacency(tris, verts);
  const nb = (i: number, j: number) => adj[i][j];

  // ---- 1. the skin: t of material behind the triangle, ending on an opposite triangle
  const skin = tris.map((tr) => {
    const d: V3 = [-tr.n[0], -tr.n[1], -tr.n[2]];
    // the centroid and three points towards the corners: a ray through the seam of two triangles misses both
    const pts = [tr.c, ...tr.v.map((w) => [0, 1, 2].map((q) => (tr.c[q] * 2 + verts[w][q]) / 3) as V3)];
    return pts.some((o0) => {
      let best = Infinity;
      for (let j = 0; j < tris.length; j++) {
        const o = tris[j];
        if (o === tr || dot(o.n, tr.n) > -0.5) continue;
        const h = ray(o0, d, verts[o.v[0]], verts[o.v[1]], verts[o.v[2]]);
        if (h !== null && h < best) best = h;
      }
      return Math.abs(best - t) < Math.max(0.02, 0.06 * t);
    });
  });

  // the two sides: connected skin triangles
  const side = new Array<number>(tris.length).fill(-1);
  let sides = 0;
  for (let i = 0; i < tris.length; i++) {
    if (!skin[i] || side[i] >= 0) continue;
    const stack = [i]; side[i] = sides;
    while (stack.length) {
      const a = stack.pop()!;
      for (let j = 0; j < 3; j++) for (const b of nb(a, j)) if (skin[b] && side[b] < 0) { side[b] = sides; stack.push(b); }
    }
    sides++;
  }
  if (sides < 2) return { fout: 'geen plaat van constante dikte (geen twee zijden gevonden)' };
  const areaOf = (k2: number) => tris.reduce((x, tr, i) => x + (side[i] === k2 ? tr.area : 0), 0);
  const sideA = [...Array(sides).keys()].sort((a, b) => areaOf(b) - areaOf(a))[0];
  const wallArea = tris.reduce((x, tr, i) => x + (skin[i] ? 0 : tr.area), 0);
  if (sides > 2 && areaOf([...Array(sides).keys()].sort((a, b) => areaOf(b) - areaOf(a))[2]) > 0.01 * areaOf(sideA)) return { fout: 'meer dan twee zijden: geen enkele plaat' };
  void wallArea;
  // ---- 2. regions of side A
  const inA = (i: number) => side[i] === sideA;
  const region = new Array<number>(tris.length).fill(-1);
  const regions: number[][] = [];
  for (let i = 0; i < tris.length; i++) {
    if (!inA(i) || region[i] >= 0) continue;
    const rg = regions.length, list = [i], stack = [i]; region[i] = rg;
    while (stack.length) {
      const a = stack.pop()!;
      for (let j = 0; j < 3; j++) for (const b of nb(a, j)) {
        // against the normal of the seed (no drift); a tiny triangle (a CSG seam) has a noisy normal and joins its neighbour
        if (inA(b) && region[b] < 0 && (dot(tris[i].n, tris[b].n) > 0.9999 || tris[b].area < 0.05)) { region[b] = rg; list.push(b); stack.push(b); }
      }
    }
    regions.push(list);
  }
  const rArea = regions.map((l) => l.reduce((x, i) => x + tris[i].area, 0));
  const rNormal = regions.map((l) => tris[l[0]].n);
  // ---- 3. unfold, breadth first from the biggest region; twice: first to find the bend zones and measure their radius
  // from the facets, then with every strip stretched to the neutral fibre of its own radius (docs/37 N-9)
  const root = rArea.indexOf(Math.max(...rArea));
  const curvedR = regions.map((l) => (curved ? l.filter((ti) => curved.has(tris[ti].src)).length > l.length / 2 : null));
  const place = (scaleOf: (R: number) => number) => {
    const pos2 = regions.map(() => new Map<number, P2>());
    const placed = new Array<boolean>(regions.length).fill(false);
    const isStrip = new Array<boolean>(regions.length).fill(false);
    const convex = new Array<boolean>(regions.length).fill(false);
    const parentOf = new Array<number>(regions.length).fill(-1);
    const width = new Array<number>(regions.length).fill(0);
    {
      const n = rNormal[root], big = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u = unit(cross(big as V3, n)), v = cross(n, u), o = verts[tris[regions[root][0]].v[0]];
      for (const i of regions[root]) for (const w of tris[i].v) pos2[root].set(w, { x: dot(sub(verts[w], o), u), y: dot(sub(verts[w], o), v) });
      placed[root] = true;
    }
    const queue = [root];
    while (queue.length) {
      const P = queue.shift()!;
      // every region next to P, turned about the longest edge they share (a short T-junction edge gives a poor direction)
      const best = new Map<number, { a: number; b: number; L: number }>();
      for (const i of regions[P]) for (let j = 0; j < 3; j++) {
        const a = tris[i].v[j], b = tris[i].v[(j + 1) % 3];
        for (const o of nb(i, j)) {
          const R2 = region[o];
          if (R2 < 0 || R2 === P || placed[R2] || !inA(o)) continue;
          const L = Math.hypot(...sub(verts[b], verts[a]));
          if (!best.has(R2) || L > best.get(R2)!.L) best.set(R2, { a, b, L });
        }
      }
      for (const [R, { a, b }] of best) {
        // the crease (a, b): turn region R about it into the plane of P
        const pa = verts[a], pb = verts[b], e = unit(sub(pb, pa)), nR = rNormal[R];
        let f = cross(nR, e);
        const cR = [0, 1, 2].map((q) => regions[R].reduce((acc, ti) => acc + tris[ti].c[q], 0) / regions[R].length) as V3;
        if (dot(sub(cR, pa), f) < 0) f = [-f[0], -f[1], -f[2]];
        // convex: R turns away from the outward normal of P (this side is the outside of the bend)
        const cvx = dot(sub(cR, pa), rNormal[P]) < 0;
        const A2 = pos2[P].get(a)!, B2 = pos2[P].get(b)!;
        const L = Math.hypot(B2.x - A2.x, B2.y - A2.y) || 1, E = { x: (B2.x - A2.x) / L, y: (B2.y - A2.y) / L };
        let F = { x: -E.y, y: E.x };
        // the parent lies on the other side of the crease in the flat
        const cP = [...pos2[P].values()].reduce((acc, q) => ({ x: acc.x + q.x, y: acc.y + q.y }), { x: 0, y: 0 });
        const nP = pos2[P].size;
        if ((cP.x / nP - A2.x) * F.x + (cP.y / nP - A2.y) * F.y > 0) F = { x: -F.x, y: -F.y };
        // a bend strip: a facet of a cylinder (the kernel marks it curved); without that mark, a narrow region for its turn
        const w0 = Math.max(...regions[R].flatMap((ti) => tris[ti].v.map((w) => dot(sub(verts[w], pa), f))));
        const turn = Math.acos(Math.max(-1, Math.min(1, dot(rNormal[P], nR))));
        const strip = turn > 0.03 && turn < 0.6 && (curvedR[R] ?? w0 < 2.4 * (r + t) * Math.sin(turn) + 0.01);
        isStrip[R] = strip; convex[R] = cvx; parentOf[R] = P; width[R] = w0;
        const sc = strip ? scaleOf(R) : 1;
        for (const ti of regions[R]) for (const w of tris[ti].v) {
          const d = sub(verts[w], pa), x = dot(d, e), y = dot(d, f) * sc;
          pos2[R].set(w, { x: A2.x + x * E.x + y * F.x, y: A2.y + x * E.y + y * F.y });
        }
        placed[R] = true;
        queue.push(R);
      }
    }
    return { pos2, placed, isStrip, convex, parentOf, width };
  };
  const first = place(() => 1);
  if (first.placed.some((x) => !x)) return { fout: 'de zijde valt in losse delen uiteen' };
  // the bend zones: chains of strips from a flange to a flange; the radius of this side from its chords:
  // n equal chords of an arc of angle Theta: W = n 2 rho sin(Theta / 2n)
  const zones: { strips: number[]; hoek: number; rIn: number; cvx: boolean }[] = [];
  const zoneOf = new Map<number, number>();
  for (let R = 0; R < regions.length; R++) {
    if (!first.isStrip[R] || first.isStrip[first.parentOf[R]]) continue;
    const strips: number[] = [];
    let cur = R;
    while (cur >= 0 && first.isStrip[cur]) { strips.push(cur); cur = first.parentOf.findIndex((p, j) => p === cur && first.isStrip[j]); }
    const last = strips[strips.length - 1], out = first.parentOf.findIndex((p, j) => p === last && !first.isStrip[j]);
    const nIn = rNormal[first.parentOf[R]], nOut = out >= 0 ? rNormal[out] : rNormal[last];
    const theta = Math.acos(Math.max(-1, Math.min(1, dot(nIn, nOut))));
    const ws = strips.map((z) => first.width[z]), W = ws.reduce((x, y) => x + y, 0), n = strips.length;
    const rhoA = W / (2 * n * Math.sin(theta / (2 * n)));
    const cvx = first.convex[R], rIn = cvx ? rhoA - t : rhoA;
    if (Math.max(...ws) > 1.15 * Math.min(...ws) || !(rIn > -0.05)) return { fout: 'de straal van een plooi is niet uit de facetten te halen' };
    zones.push({ strips, hoek: (theta * 180) / Math.PI, rIn: Math.max(0, rIn), cvx });
    for (const z of strips) zoneOf.set(z, zones.length - 1);
  }
  const { pos2, placed, isStrip, convex, parentOf } = place((R) => {
    const z = zones[zoneOf.get(R)!];
    if (!z) return 1;
    const rhoA = z.cvx ? z.rIn + t : z.rIn;
    return rhoA > 1e-9 ? (z.rIn + kOf(z.rIn) * t) / rhoA : 1;
  });
  if (placed.some((x) => !x)) return { fout: 'de zijde valt in losse delen uiteen' };
  // ---- 4. the flat as a plate: bottom, top and the walls of the boundary of side A
  const out: number[] = [];
  const P3 = (p: P2, z: number) => [p.x, p.y, z];
  let oppervlak = 0;
  const flatTris: PathsD = [];
  regions.forEach((l, R) => {
    for (const i of l) {
      const [a, b, c] = tris[i].v.map((w) => pos2[R].get(w)!);
      const sa = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      const [p, q, w] = sa >= 0 ? [a, b, c] : [a, c, b];
      oppervlak += Math.abs(sa) / 2;
      out.push(...P3(p, t), ...P3(q, t), ...P3(w, t), ...P3(p, 0), ...P3(w, 0), ...P3(q, 0));
      flatTris.push([p, q, w]);
    }
  });
  // the walls from the outline of the unfolded skin: the union of its triangles, closed by 0.005 mm against the cracks
  // between regions (a CSG mesh is not watertight round a hole, so the walls of the folded part cannot be followed)
  const closed = inflatePathsD(inflatePathsD(unionD(flatTris, [], FillRule.NonZero, 6), 0.005, JoinType.Miter, EndType.Polygon, 2, 6), -0.005, JoinType.Miter, EndType.Polygon, 2, 6);
  for (const path of closed) {
    if (Math.abs(areaD(path)) < 0.01) continue;
    for (let q = 0; q < path.length; q++) {
      const A = path[q], B = path[(q + 1) % path.length];
      // clipper keeps the material on the left of every path (outer and holes): the wall faces to the right
      out.push(...P3(A, 0), ...P3(B, 0), ...P3(B, t), ...P3(A, 0), ...P3(B, t), ...P3(A, t));
    }
  }
  // ---- the bend lines: each chain of strips between two flanges, its middle line; angle between the flanges
  const plooien: UnfoldBend[] = [];
  const seen = new Set<number>();
  regions.forEach((_, R) => {
    // a zone starts at the strip next to a flange (its parent is no strip)
    if (!isStrip[R] || seen.has(R) || isStrip[parentOf[R]]) return;
    const zone: number[] = [];
    let cur = R;
    while (cur >= 0 && isStrip[cur]) { zone.push(cur); seen.add(cur); const next = parentOf.findIndex((p, j) => p === cur && isStrip[j]); cur = next; }
    let flangeIn = parentOf[R];
    while (flangeIn >= 0 && isStrip[flangeIn]) flangeIn = parentOf[flangeIn];
    const last = zone[zone.length - 1], flangeOut = parentOf.findIndex((p, j) => p === last && !isStrip[j]);
    const nIn = rNormal[flangeIn], nOut = flangeOut >= 0 ? rNormal[flangeOut] : rNormal[last];
    const hoek = (Math.acos(Math.max(-1, Math.min(1, dot(nIn, nOut)))) * 180) / Math.PI;
    const pts = zone.flatMap((z) => [...pos2[z].values()]);
    // the axis: along the crease of the first strip
    const ref = [...pos2[R].values()];
    let ax = { x: 1, y: 0 }, bestL = 0;
    for (let i2 = 0; i2 < ref.length; i2++) for (let j2 = i2 + 1; j2 < ref.length; j2++) {
      const L = Math.hypot(ref[j2].x - ref[i2].x, ref[j2].y - ref[i2].y);
      if (L > bestL) { bestL = L; ax = { x: (ref[j2].x - ref[i2].x) / L, y: (ref[j2].y - ref[i2].y) / L }; }
    }
    // the longest chord of a strip runs along the bend (strips are long and narrow)
    const nx = { x: -ax.y, y: ax.x };
    const along = pts.map((p) => p.x * ax.x + p.y * ax.y), across = pts.map((p) => p.x * nx.x + p.y * nx.y);
    const m = (Math.min(...across) + Math.max(...across)) / 2, a0 = Math.min(...along), a1 = Math.max(...along);
    plooien.push({ a: { x: ax.x * a0 + nx.x * m, y: ax.y * a0 + nx.y * m }, b: { x: ax.x * a1 + nx.x * m, y: ax.y * a1 + nx.y * m }, hoek,
      richting: convex[R] ? 'neer' : 'op', r: zones[zoneOf.get(R) ?? -1]?.rIn ?? r });
  });
  // the holes of the folded part, counted on its own walls: every closed ring of wall faces but the outer one
  const ring = new Array<number>(tris.length).fill(-1);
  let rings = 0;
  for (let i = 0; i < tris.length; i++) {
    if (skin[i] || ring[i] >= 0) continue;
    const stack = [i]; ring[i] = rings;
    while (stack.length) { const a = stack.pop()!; for (let j = 0; j < 3; j++) for (const b of nb(a, j)) if (!skin[b] && ring[b] < 0) { ring[b] = rings; stack.push(b); } }
    rings++;
  }
  return { soup: Float64Array.from(out), plooien, oppervlak, gaten: Math.max(0, rings - 1) };
}

/**
 * The neighbours across each edge of each triangle: triangles with an edge on the same line that overlaps it. A CSG
 * mesh has T-junctions (a long edge against two short ones), so equal vertex pairs are not enough.
 */
function adjacency(tris: Tri[], verts: V3[]): number[][][] {
  const out = tris.map(() => [[], [], []] as number[][]);
  interface E { i: number; j: number; d: V3; foot: V3; lo: number; hi: number; cell: number[] }
  const all: E[] = [];
  const grid = new Map<string, E[]>();
  tris.forEach((tr, i) => {
    for (let j = 0; j < 3; j++) {
      const a = verts[tr.v[j]], b = verts[tr.v[(j + 1) % 3]];
      let d = unit(sub(b, a));
      // one direction per line: the first non-zero component positive
      const lead = Math.abs(d[0]) > 1e-6 ? d[0] : Math.abs(d[1]) > 1e-6 ? d[1] : d[2];
      if (lead < 0) d = [-d[0], -d[1], -d[2]];
      const ta = dot(a, d), tb = dot(b, d);
      const foot: V3 = [a[0] - ta * d[0], a[1] - ta * d[1], a[2] - ta * d[2]];
      // cells of 0.01 in direction and 0.5 mm in foot; neighbours searched, so no rounding edge splits a line
      const cell = [...d.map((x) => Math.floor(x * 100)), ...foot.map((x) => Math.floor(x * 2))];
      const e: E = { i, j, d, foot, lo: Math.min(ta, tb), hi: Math.max(ta, tb), cell };
      all.push(e);
      const key = cell.join(',');
      (grid.get(key) ?? grid.set(key, []).get(key)!).push(e);
    }
  });
  const offs: number[][] = [];
  for (let m = 0; m < 729; m++) { let x = m; const o: number[] = []; for (let q = 0; q < 6; q++) { o.push((x % 3) - 1); x = Math.floor(x / 3); } offs.push(o); }
  for (const A of all) {
    for (const o of offs) {
      const list = grid.get(A.cell.map((c, q) => c + o[q]).join(','));
      if (!list) continue;
      for (const B of list) {
        if (B.i <= A.i) continue;
        if (Math.abs(dot(A.d, B.d)) < 0.99999 || Math.hypot(A.foot[0] - B.foot[0], A.foot[1] - B.foot[1], A.foot[2] - B.foot[2]) > 2e-3) continue;
        if (Math.min(A.hi, B.hi) - Math.max(A.lo, B.lo) < 1e-4) continue;
        out[A.i][A.j].push(B.i);
        out[B.i][B.j].push(A.i);
      }
    }
  }
  return out;
}
