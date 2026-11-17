/**
 * A DXF reader (ASCII, R12 to R2018) for File ▸ Open and Insert ▸ DXF/DWG (docs/32, item 5 of the parity list). The
 * model space becomes plain 2D geometry in millimetres: lines, circles, arcs, ellipses and partial ellipses,
 * through-point splines and points. Polylines (LWPOLYLINE, POLYLINE) become lines and arcs (bulges); block references
 * (INSERT) are expanded with their insertion point, scale, rotation and rows/columns. What has no sketch counterpart
 * (text, dimensions, hatches, solids, 3D entities, paper space) is counted and skipped.
 *
 * Every curve is kept as an ellipse internally (centre, major axis vector, axis ratio, parameter range): a block
 * reference with a non-uniform scale then still gives the exact curve, and a circle or arc comes out again where the
 * ratio stays 1.
 */
import { splinePoints } from './dxfSpline';

export interface P2 { x: number; y: number }

/** a curve as an ellipse: c + major·cos t + ratio·perp(major)·sin t for t from t0 to t1 (counter-clockwise) */
export interface DxfConic { kind: 'conic'; c: P2; major: P2; ratio: number; t0: number; t1: number; full: boolean }
export type DxfShape =
  | { kind: 'line'; a: P2; b: P2 }
  | DxfConic
  | { kind: 'spline'; pts: P2[]; closed: boolean }
  | { kind: 'point'; p: P2 };

export interface DxfDrawing {
  shapes: DxfShape[];
  /** the unit of the file ($INSUNITS) and the factor to millimetres */
  unit: string;
  scale: number;
  /** false when the file names no unit (read as millimetres) */
  unitKnown: boolean;
  /** skipped entities per type */
  skipped: Record<string, number>;
  version: string;
}

/** $INSUNITS -> [name, millimetres per unit] */
const UNITS: Record<number, [string, number]> = {
  1: ['in', 25.4], 2: ['ft', 304.8], 3: ['mi', 1609344], 4: ['mm', 1], 5: ['cm', 10], 6: ['m', 1000], 7: ['km', 1e6],
  8: ['µin', 25.4e-6], 9: ['mil', 0.0254], 10: ['yd', 914.4], 11: ['Å', 1e-7], 12: ['nm', 1e-6], 13: ['µm', 1e-3],
  14: ['dm', 100], 15: ['dam', 1e4], 16: ['hm', 1e5], 17: ['Gm', 1e12], 18: ['AU', 1.495978707e14],
  19: ['ly', 9.4607304725808e18], 20: ['pc', 3.0856775814913673e19], 21: ['US ft', 1200 / 3937 * 1000],
};

type Pair = [number, string];
interface Raw { type: string; pairs: Pair[]; vertices?: Raw[] }

/** the group code / value pairs of the file (up to EOF) */
function pairs(text: string): Pair[] {
  const lines = text.split(/\r\n|\r|\n/);
  const out: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const head = lines[i].trim();
    if (!head && i + 2 >= lines.length) break;
    const code = Number(head);
    if (!head || !Number.isInteger(code)) throw new Error(`the file is not a DXF file (line ${i + 1} is no group code)`);
    const value = lines[i + 1].replace(/\s+$/, '');
    out.push([code, value]);
    if (code === 0 && value.trim() === 'EOF') break;
  }
  return out;
}

const num = (r: Raw, code: number, def = 0): number => {
  const p = r.pairs.find((q) => q[0] === code);
  const v = p ? Number(p[1].trim()) : NaN;
  return Number.isFinite(v) ? v : def;
};
const str = (r: Raw, code: number): string => r.pairs.find((q) => q[0] === code)?.[1].trim() ?? '';
const all = (r: Raw, code: number): number[] => r.pairs.filter((q) => q[0] === code).map((q) => Number(q[1].trim()));

/** the entities between two markers, POLYLINE with its VERTEX records and SEQEND as one */
function entities(list: Pair[], from: number, until: (p: Pair) => boolean): { out: Raw[]; end: number } {
  const out: Raw[] = [];
  let i = from;
  let cur: Raw | null = null;
  let poly: Raw | null = null;
  while (i < list.length && !until(list[i])) {
    const [code, value] = list[i];
    if (code === 0) {
      const type = value.trim();
      if (type === 'VERTEX' && poly) { cur = { type, pairs: [] }; poly.vertices!.push(cur); }
      else if (type === 'SEQEND' && poly) { poly = null; cur = null; }
      else {
        cur = { type, pairs: [] };
        if (type === 'POLYLINE') { cur.vertices = []; poly = cur; } else poly = null;
        out.push(cur);
      }
    } else cur?.pairs.push([code, value]);
    i++;
  }
  return { out, end: i };
}

/** a 2D affine map: x' = a·x + c·y + e, y' = b·x + d·y + f */
interface Affine { a: number; b: number; c: number; d: number; e: number; f: number }
const ID: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const apply = (m: Affine, p: P2): P2 => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
const vec = (m: Affine, p: P2): P2 => ({ x: m.a * p.x + m.c * p.y, y: m.b * p.x + m.d * p.y });
const mul = (m: Affine, n: Affine): Affine => ({
  a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b, c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
});

/** the object coordinate system of an entity seen from above: x mirrored when its extrusion points down (-Z) */
function ocs(r: Raw): Affine | null {
  const nz = num(r, 230, 1), nx = num(r, 210, 0), ny = num(r, 220, 0);
  if (Math.abs(nx) > 1e-9 || Math.abs(ny) > 1e-9) return null;
  return nz < 0 ? { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 } : ID;
}

/** an ellipse under an affine map, again with perpendicular axes (major first) and a counter-clockwise range */
function mapConic(m: Affine, k: DxfConic): DxfConic {
  const U = vec(m, k.major);
  const V = vec(m, { x: -k.major.y * k.ratio, y: k.major.x * k.ratio });
  // the parameter shift that makes the conjugate diameters U, V principal axes
  const uu = U.x * U.x + U.y * U.y, vv = V.x * V.x + V.y * V.y, uv = U.x * V.x + U.y * V.y;
  const s = Math.abs(uv) < 1e-12 * (uu + vv) ? 0 : 0.5 * Math.atan2(2 * uv, uu - vv);
  let P = { x: U.x * Math.cos(s) + V.x * Math.sin(s), y: U.y * Math.cos(s) + V.y * Math.sin(s) };
  let Q = { x: -U.x * Math.sin(s) + V.x * Math.cos(s), y: -U.y * Math.sin(s) + V.y * Math.cos(s) };
  let t0 = k.t0 - s, t1 = k.t1 - s;
  if (Math.hypot(Q.x, Q.y) > Math.hypot(P.x, P.y)) {
    // the minor axis came out longer: swap (t -> t - 90°)
    [P, Q] = [Q, { x: -P.x, y: -P.y }];
    t0 -= Math.PI / 2; t1 -= Math.PI / 2;
  }
  const a = Math.hypot(P.x, P.y), b = Math.hypot(Q.x, Q.y);
  // Q must be P turned +90°; a mirror turns it -90°: then the parameter runs the other way
  if (P.x * Q.y - P.y * Q.x < 0) [t0, t1] = [-t1, -t0];
  return { kind: 'conic', c: apply(m, k.c), major: P, ratio: a > 0 ? b / a : 1, t0, t1, full: k.full };
}

function mapShape(m: Affine, s: DxfShape): DxfShape {
  if (s.kind === 'line') return { kind: 'line', a: apply(m, s.a), b: apply(m, s.b) };
  if (s.kind === 'point') return { kind: 'point', p: apply(m, s.p) };
  if (s.kind === 'spline') return { kind: 'spline', pts: s.pts.map((p) => apply(m, p)), closed: s.closed };
  return mapConic(m, s);
}

const RAD = Math.PI / 180;
const arc = (c: P2, r: number, a0: number, a1: number): DxfConic => {
  let t1 = a1;
  while (t1 <= a0 + 1e-12) t1 += 2 * Math.PI;
  return { kind: 'conic', c, major: { x: r, y: 0 }, ratio: 1, t0: a0, t1, full: false };
};

/** a polyline segment with a bulge (tan of a quarter of the included angle, > 0 counter-clockwise) */
function bulgeSegment(p: P2, q: P2, bulge: number): DxfShape {
  if (Math.abs(bulge) < 1e-12) return { kind: 'line', a: p, b: q };
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
  const h = (d / 2) * (1 - bulge * bulge) / (2 * bulge);
  const c = { x: (p.x + q.x) / 2 - (dy / d) * h, y: (p.y + q.y) / 2 + (dx / d) * h };
  const r = Math.hypot(p.x - c.x, p.y - c.y);
  const ap = Math.atan2(p.y - c.y, p.x - c.x), aq = Math.atan2(q.y - c.y, q.x - c.x);
  return bulge > 0 ? arc(c, r, ap, aq) : arc(c, r, aq, ap);
}

function polyline(pts: P2[], bulges: number[], closed: boolean): DxfShape[] {
  const out: DxfShape[] = [];
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-12) continue;
    out.push(bulgeSegment(p, q, bulges[i] ?? 0));
  }
  return out;
}

/** one entity -> shapes in its own block or model space coordinates; null when the type is not supported */
function shapesOf(r: Raw, blocks: Map<string, { base: P2; items: Raw[] }>, skipped: Record<string, number>, depth: number): DxfShape[] | null {
  const P = (cx: number, cy: number): P2 => ({ x: num(r, cx), y: num(r, cy) });
  const local = ocs(r);
  const t = r.type;
  if (t === 'LINE') return [{ kind: 'line', a: P(10, 20), b: P(11, 21) }];
  if (t === 'POINT') return [{ kind: 'point', p: P(10, 20) }];
  if (!local) { skipped[`${t} (not in the XY plane)`] = (skipped[`${t} (not in the XY plane)`] ?? 0) + 1; return []; }
  const inOcs = (list: DxfShape[]) => list.map((s) => mapShape(local, s));
  if (t === 'CIRCLE') return inOcs([{ kind: 'conic', c: P(10, 20), major: { x: num(r, 40), y: 0 }, ratio: 1, t0: 0, t1: 2 * Math.PI, full: true }]);
  if (t === 'ARC') return inOcs([arc(P(10, 20), num(r, 40), num(r, 50) * RAD, num(r, 51) * RAD)]);
  if (t === 'ELLIPSE') {
    const t0 = num(r, 41, 0), t1 = num(r, 42, 2 * Math.PI);
    let e = t1;
    while (e <= t0 + 1e-12) e += 2 * Math.PI;
    const full = Math.abs(e - t0 - 2 * Math.PI) < 1e-9;
    // the centre and the axis are in world coordinates; only the direction of the parameter follows the extrusion
    const k: DxfConic = { kind: 'conic', c: P(10, 20), major: P(11, 21), ratio: num(r, 40, 1), t0, t1: e, full };
    if (local.a > 0) return [k];
    const m = mapConic({ a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, { ...k, c: { x: -k.c.x, y: k.c.y }, major: { x: -k.major.x, y: k.major.y } });
    return [m];
  }
  if (t === 'LWPOLYLINE') {
    const pts: P2[] = [];
    const bulges: number[] = [];
    for (const [code, v] of r.pairs) {
      if (code === 10) { pts.push({ x: Number(v), y: 0 }); bulges.push(0); }
      else if (code === 20 && pts.length) pts[pts.length - 1].y = Number(v);
      else if (code === 42 && bulges.length) bulges[bulges.length - 1] = Number(v);
    }
    return inOcs(polyline(pts, bulges, (num(r, 70) & 1) === 1));
  }
  if (t === 'POLYLINE') {
    const flags = num(r, 70);
    // polygon and polyface meshes are surfaces, not sketch geometry
    if (flags & (16 | 64)) return null;
    // the frame of a fitted spline is not drawn; its fitted vertices are
    const vs = (r.vertices ?? []).filter((v) => !(num(v, 70) & 16));
    const pts = vs.map((v) => ({ x: num(v, 10), y: num(v, 20) }));
    const bulges = vs.map((v) => num(v, 42));
    const segs = polyline(pts, bulges, (flags & 1) === 1);
    return flags & 8 ? segs : inOcs(segs);
  }
  if (t === 'SPLINE') {
    const pts = splinePoints({
      degree: num(r, 71, 3), closed: (num(r, 70) & 1) === 1, knots: all(r, 40), weights: all(r, 41),
      control: zip(all(r, 10), all(r, 20)), fit: zip(all(r, 11), all(r, 21)),
    });
    if (pts.length < 2) return [];
    const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-9;
    if (num(r, 71, 3) === 1) return polyline(closed ? pts.slice(0, -1) : pts, [], closed);
    return [{ kind: 'spline', pts, closed }];
  }
  if (t === 'INSERT') {
    const block = blocks.get(str(r, 2));
    if (!block || depth > 16) return [];
    const sx = num(r, 41, 1), sy = num(r, 42, 1), rot = num(r, 50) * RAD;
    const cols = Math.max(1, num(r, 70, 1)), rows = Math.max(1, num(r, 71, 1));
    const dc = num(r, 44), dr = num(r, 45);
    const inner: DxfShape[] = [];
    for (const item of block.items) {
      const got = shapesOf(item, blocks, skipped, depth + 1);
      if (got) inner.push(...got);
      else skipped[item.type] = (skipped[item.type] ?? 0) + 1;
    }
    const out: DxfShape[] = [];
    const cos = Math.cos(rot), sin = Math.sin(rot);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      // the array spacing runs along the rotated block axes
      const ox = j * dc, oy = i * dr;
      const ins = P(10, 20);
      const m = mul({ a: cos * sx, b: sin * sx, c: -sin * sy, d: cos * sy, e: ins.x + cos * ox - sin * oy, f: ins.y + sin * ox + cos * oy }, { ...ID, e: -block.base.x, f: -block.base.y });
      for (const s of inner) out.push(mapShape(mul(local, m), s));
    }
    return out;
  }
  return null;
}

const zip = (xs: number[], ys: number[]): P2[] => xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));

/** a DXF file (text) -> its model space in millimetres */
export function readDxf(text: string): DxfDrawing {
  if (text.startsWith('AutoCAD Binary DXF')) throw new Error('binary DXF is not supported: save the drawing as ASCII DXF');
  if (/^AC10\d\d/.test(text)) throw new Error('this is a DWG file, not a DXF file');
  const list = pairs(text.replace(/^﻿/, ''));
  const sectionAt = (name: string) => list.findIndex((p, i) => p[0] === 2 && p[1].trim() === name && list[i - 1]?.[0] === 0 && list[i - 1][1].trim() === 'SECTION');
  const endsec = (p: Pair) => p[0] === 0 && p[1].trim() === 'ENDSEC';
  // header: the version and the unit
  let insunits = 0, version = '';
  const h = sectionAt('HEADER');
  if (h >= 0) {
    for (let i = h + 1; i < list.length && !endsec(list[i]); i++) {
      if (list[i][0] !== 9) continue;
      const v = list[i + 1];
      if (list[i][1].trim() === '$INSUNITS' && v) insunits = Number(v[1].trim()) || 0;
      if (list[i][1].trim() === '$ACADVER' && v) version = v[1].trim();
    }
  }
  // blocks: name -> base point and entities
  const blocks = new Map<string, { base: P2; items: Raw[] }>();
  const b = sectionAt('BLOCKS');
  if (b >= 0) {
    let i = b + 1;
    while (i < list.length && !endsec(list[i])) {
      if (list[i][0] === 0 && list[i][1].trim() === 'BLOCK') {
        const head: Raw = { type: 'BLOCK', pairs: [] };
        i++;
        while (i < list.length && list[i][0] !== 0) head.pairs.push(list[i++]);
        const { out, end } = entities(list, i, (p) => p[0] === 0 && p[1].trim() === 'ENDBLK');
        blocks.set(str(head, 2), { base: { x: num(head, 10), y: num(head, 20) }, items: out });
        i = end + 1;
      } else i++;
    }
  }
  const e = sectionAt('ENTITIES');
  if (e < 0) throw new Error('the file has no ENTITIES section');
  const { out: raws } = entities(list, e + 1, endsec);
  const skipped: Record<string, number> = {};
  const shapes: DxfShape[] = [];
  for (const r of raws) {
    // paper space (layouts) is not part of the model
    if (num(r, 67) === 1) { skipped['paper space'] = (skipped['paper space'] ?? 0) + 1; continue; }
    const got = shapesOf(r, blocks, skipped, 0);
    if (got) shapes.push(...got);
    else skipped[r.type] = (skipped[r.type] ?? 0) + 1;
  }
  const [unit, scale] = UNITS[insunits] ?? ['mm', 1];
  const S: Affine = { a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 };
  return { shapes: scale === 1 ? shapes : shapes.map((s) => mapShape(S, s)), unit, scale, unitKnown: insunits in UNITS, skipped, version };
}
