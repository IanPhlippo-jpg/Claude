import type { ArcEntity, CircleEntity, Entity, Id, LineEntity, Sketch, SketchPoint } from './types';
import { addArc, addCircle, addConstraint, addLine, addPoint, addPointParam, addSpline, removeEntity, setPoint } from './model';
import { sampleEntity } from './geometry';

/**
 * Sketch editing tools of the original's Sketch tab, as pure functions on the sketch model:
 * Trim Entities (trim to closest), Sketch Fillet, Offset Entities, Linear / Circular Sketch
 * Pattern, Move / Copy / Rotate / Scale Entities.
 */

const P = (s: Sketch, id: Id): SketchPoint => s.points[id];
const sub = (a: SketchPoint, b: SketchPoint) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: SketchPoint) => Math.hypot(v.x, v.y);
const same = (a: SketchPoint, b: SketchPoint, tol = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) < tol;

// ---------- parametrisation of an entity ----------

/** Point on an entity at parameter t in [0, 1] (lines, arcs, circles: angle fraction). */
export function pointAt(s: Sketch, e: Entity, t: number): SketchPoint {
  if (e.kind === 'line') {
    const a = P(s, e.p1), b = P(s, e.p2);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  if (e.kind === 'circle') {
    const c = P(s, e.center), r = s.scalars[e.r];
    const a = t * Math.PI * 2;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  }
  if (e.kind === 'arc') {
    const { a0, sweep } = arcAngles(s, e);
    const c = P(s, e.center), r = s.scalars[e.r];
    const a = a0 + sweep * t;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  }
  const pts = sampleEntity(s, e, 48);
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(t * (pts.length - 1))));
  const f = t * (pts.length - 1) - i;
  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
}

/** Start angle and signed sweep of an arc (counter-clockwise positive). */
export function arcAngles(s: Sketch, e: ArcEntity): { a0: number; a1: number; sweep: number } {
  const c = P(s, e.center), a = P(s, e.start), b = P(s, e.end);
  const a0 = Math.atan2(a.y - c.y, a.x - c.x);
  const a1 = Math.atan2(b.y - c.y, b.x - c.x);
  let sweep = a1 - a0;
  if (e.ccw) {
    while (sweep <= 0) sweep += Math.PI * 2;
  } else {
    while (sweep >= 0) sweep -= Math.PI * 2;
  }
  return { a0, a1, sweep };
}

/** Parameter of the point on the entity closest to p. */
export function paramAt(s: Sketch, e: Entity, p: SketchPoint): number {
  if (e.kind === 'line') {
    const a = P(s, e.p1), b = P(s, e.p2);
    const d = sub(b, a);
    const l2 = d.x * d.x + d.y * d.y || 1;
    return Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / l2));
  }
  if (e.kind === 'circle') {
    const c = P(s, e.center);
    let a = Math.atan2(p.y - c.y, p.x - c.x);
    if (a < 0) a += Math.PI * 2;
    return a / (Math.PI * 2);
  }
  if (e.kind === 'arc') {
    const { a0, sweep } = arcAngles(s, e);
    const c = P(s, e.center);
    let a = Math.atan2(p.y - c.y, p.x - c.x) - a0;
    // bring into the sweep's direction
    if (sweep > 0) { while (a < 0) a += Math.PI * 2; while (a > Math.PI * 2) a -= Math.PI * 2; }
    else { while (a > 0) a -= Math.PI * 2; while (a < -Math.PI * 2) a += Math.PI * 2; }
    return Math.max(0, Math.min(1, a / sweep));
  }
  const pts = sampleEntity(s, e, 48);
  let best = 0, bestD = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = sub(b, a);
    const l2 = d.x * d.x + d.y * d.y || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / l2));
    const q = { x: a.x + d.x * t, y: a.y + d.y * t };
    const dd = len(sub(q, p));
    if (dd < bestD) { bestD = dd; best = (i + t) / (pts.length - 1); }
  }
  return best;
}

// ---------- intersections ----------

function segSeg(a: SketchPoint, b: SketchPoint, c: SketchPoint, d: SketchPoint): { t: number; u: number } | null {
  const r = sub(b, a), q = sub(d, c);
  const den = r.x * q.y - r.y * q.x;
  if (Math.abs(den) < 1e-12) return null;
  const ac = sub(c, a);
  const t = (ac.x * q.y - ac.y * q.x) / den;
  const u = (ac.x * r.y - ac.y * r.x) / den;
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null;
  return { t, u };
}

/** Parameters on entity e where it crosses any other (non-construction) entity, plus shared endpoints. */
export function intersectionParams(s: Sketch, e: Entity, others?: Entity[]): number[] {
  const list = others ?? s.entityOrder.map((id) => s.entities[id]).filter((x) => x.id !== e.id && x.kind !== 'point');
  const mine = sampleEntity(s, e, e.kind === 'line' ? 1 : 96);
  const out: number[] = [];
  for (const o of list) {
    const theirs = sampleEntity(s, o, o.kind === 'line' ? 1 : 96);
    for (let i = 0; i + 1 < mine.length; i++) {
      for (let j = 0; j + 1 < theirs.length; j++) {
        const h = segSeg(mine[i], mine[i + 1], theirs[j], theirs[j + 1]);
        if (h) out.push((i + h.t) / (mine.length - 1));
      }
    }
  }
  return out.filter((t) => t > 1e-6 && t < 1 - 1e-6).sort((a, b) => a - b);
}

// ---------- Trim Entities ----------

/**
 * Trim to closest: remove the part of the entity around the clicked point up to the nearest
 * crossings with other entities. A line splits into the remaining pieces, a circle becomes an
 * arc, an arc keeps its remaining pieces; without any crossing the entity is deleted.
 */
export interface TrimOptions {
  /** Keep trimmed entities as construction geometry */
  keepAsConstruction?: boolean;
  /** Ignore trimming of construction geometry: construction entities neither cut nor get cut */
  ignoreConstruction?: boolean;
}

/** The piece of an entity between two parameters, as a new entity (construction or not). */
function addPiece(s0: Sketch, s1: Sketch, e: Entity, ta: number, tb: number, construction: boolean): Sketch {
  if (e.kind === 'line') return addLine(s1, pointAt(s0, e, ta), pointAt(s0, e, tb), construction)[0];
  if (e.kind === 'arc' || e.kind === 'circle') {
    const c = P(s0, e.center);
    return addArc(s1, c, pointAt(s0, e, ta), pointAt(s0, e, tb), e.kind === 'arc' ? e.ccw : true, construction)[0];
  }
  const pts = sampleEntity(s0, e, 48);
  const n = pts.length - 1;
  const seg = [pointAt(s0, e, ta), ...pts.slice(Math.max(0, Math.ceil(ta * n)), Math.max(Math.ceil(ta * n), Math.floor(tb * n)) + 1), pointAt(s0, e, tb)];
  return seg.length >= 2 ? addSpline(s1, seg, construction)[0] : s1;
}

export function trimEntity(s: Sketch, entityId: Id, click: SketchPoint, opts: TrimOptions = {}): Sketch {
  const e = s.entities[entityId];
  if (!e || e.kind === 'point') return s;
  if (opts.ignoreConstruction && e.construction) return s;
  const t0 = paramAt(s, e, click);
  const cutters = opts.ignoreConstruction ? s.entityOrder.map((id) => s.entities[id]).filter((x) => x.id !== e.id && x.kind !== 'point' && !x.construction) : undefined;
  const cuts = intersectionParams(s, e, cutters);
  if (opts.keepAsConstruction && !e.construction) {
    // the trimmed piece stays, as construction geometry
    const lo = [...cuts].reverse().find((t) => t < t0) ?? (e.kind === 'circle' ? cuts[cuts.length - 1] : 0);
    const hi = cuts.find((t) => t > t0) ?? (e.kind === 'circle' ? cuts[0] : 1);
    const trimmed = trimEntity(s, entityId, click, { ...opts, keepAsConstruction: false });
    if (lo === undefined || hi === undefined) return trimmed;
    if (e.kind === 'circle' && hi < lo) return addPiece(s, trimmed, e, lo, hi + 1, true);
    return addPiece(s, trimmed, e, lo, hi, true);
  }
  if (e.kind === 'circle') {
    if (cuts.length < 2) return removeEntity(s, e.id);
    // the remaining arc runs from the crossing after the click round to the crossing before it
    let hi = cuts.find((t) => t > t0);
    let lo = [...cuts].reverse().find((t) => t < t0);
    if (hi === undefined) hi = cuts[0];
    if (lo === undefined) lo = cuts[cuts.length - 1];
    const a = pointAt(s, e, hi), b = pointAt(s, e, lo);
    const c = P(s, e.center);
    let s1 = removeEntity(s, e.id);
    s1 = addArc(s1, c, a, b, true, e.construction)[0];
    return s1;
  }
  const lo = [...cuts].reverse().find((t) => t < t0);
  const hi = cuts.find((t) => t > t0);
  if (lo === undefined && hi === undefined) return removeEntity(s, e.id);
  const pieces: [number, number][] = [];
  if (lo !== undefined) pieces.push([0, lo]);
  if (hi !== undefined) pieces.push([hi, 1]);
  let s1 = removeEntity(s, e.id);
  for (const [ta, tb] of pieces) {
    if (e.kind === 'line') {
      const a = ta === 0 ? e.p1 : pointAt(s, e, ta);
      const b = tb === 1 ? e.p2 : pointAt(s, e, tb);
      // reuse the original endpoints so their relations survive
      s1 = addLine(s1, typeof a === 'string' ? (s1.points[a] ? a : pointAt(s, e, ta)) : a, typeof b === 'string' ? (s1.points[b] ? b : pointAt(s, e, tb)) : b, e.construction)[0];
    } else if (e.kind === 'arc') {
      const c = P(s, e.center);
      const a = pointAt(s, e, ta), b = pointAt(s, e, tb);
      s1 = addArc(s1, c, a, b, e.ccw, e.construction)[0];
    } else {
      const pts = sampleEntity(s, e, 48);
      const n = pts.length - 1;
      const ia = Math.ceil(ta * n), ib = Math.floor(tb * n);
      const seg = [pointAt(s, e, ta), ...pts.slice(Math.max(ia, 0), Math.max(ia, ib) + 1), pointAt(s, e, tb)];
      if (seg.length >= 2) s1 = addSpline(s1, seg, e.construction)[0];
    }
  }
  return s1;
}

/** Drop the relations that pin a corner point itself (coincident, fix, on-entity …): the corner moves to the tangent point. */
function dropPointRelations(s: Sketch, pid: Id): Sketch {
  const constraints = { ...s.constraints };
  const constraintOrder = s.constraintOrder.filter((cid) => {
    const c = constraints[cid];
    const dead = c.refs.includes(pid) && c.kind !== 'horizontal' && c.kind !== 'vertical';
    if (dead) delete constraints[cid];
    return !dead;
  });
  return { ...s, constraints, constraintOrder };
}

// ---------- Trim: Corner, Trim away inside / outside, Power trim ----------

/** Corner: two lines are trimmed or extended to the point where they meet; the clicked sides stay. */
export function cornerTrim(s: Sketch, aId: Id, aClick: SketchPoint, bId: Id, bClick: SketchPoint): Sketch | null {
  const a = s.entities[aId], b = s.entities[bId];
  if (a?.kind !== 'line' || b?.kind !== 'line') return null;
  const A1 = P(s, a.p1), A2 = P(s, a.p2), B1 = P(s, b.p1), B2 = P(s, b.p2);
  const r = sub(A2, A1), q = sub(B2, B1);
  const den = r.x * q.y - r.y * q.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((B1.x - A1.x) * q.y - (B1.y - A1.y) * q.x) / den;
  const X = { x: A1.x + r.x * t, y: A1.y + r.y * t };
  const moveEnd = (sk: Sketch, e: LineEntity, click: SketchPoint) => {
    const p1 = P(sk, e.p1), p2 = P(sk, e.p2);
    // keep the end on the clicked side of X, move the other end to X
    const d = sub(p2, p1);
    const tc = ((click.x - p1.x) * d.x + (click.y - p1.y) * d.y) / (d.x * d.x + d.y * d.y || 1);
    const tx = ((X.x - p1.x) * d.x + (X.y - p1.y) * d.y) / (d.x * d.x + d.y * d.y || 1);
    return tc < tx ? { sk: setPoint(sk, e.p2, X), end: e.p2 } : { sk: setPoint(sk, e.p1, X), end: e.p1 };
  };
  const r1 = moveEnd(s, a, aClick);
  const r2 = moveEnd(r1.sk, b, bClick);
  return addConstraint(r2.sk, 'coincident', [r1.end, r2.end])[0];
}

/** Trim away inside / outside: the part of an entity between (inside) or beyond (outside) two boundary entities goes. */
export function trimBetween(s: Sketch, id: Id, boundaries: Id[], inside: boolean, opts: TrimOptions = {}): Sketch {
  const e = s.entities[id];
  if (!e || e.kind === 'point' || boundaries.includes(id)) return s;
  const cuts = intersectionParams(s, e, boundaries.map((b) => s.entities[b]).filter(Boolean));
  if (cuts.length < 2) return s;
  const lo = cuts[0], hi = cuts[cuts.length - 1];
  let s1 = removeEntity(s, e.id);
  const keep: [number, number][] = inside ? [[0, lo], [hi, 1]] : [[lo, hi]];
  for (const [ta, tb] of keep) if (tb - ta > 1e-6) s1 = addPiece(s, s1, e, ta, tb, e.construction);
  if (opts.keepAsConstruction) {
    const gone: [number, number][] = inside ? [[lo, hi]] : [[0, lo], [hi, 1]];
    for (const [ta, tb] of gone) if (tb - ta > 1e-6) s1 = addPiece(s, s1, e, ta, tb, true);
  }
  return s1;
}

/** Power trim: every entity the dragged path crosses is trimmed at the crossing (as clicking it there). */
export function powerTrim(s: Sketch, path: SketchPoint[], opts: TrimOptions = {}): Sketch {
  let out = s;
  const done = new Set<Id>();
  for (let i = 0; i + 1 < path.length; i++) {
    for (const id of [...out.entityOrder]) {
      const e = out.entities[id];
      if (!e || e.kind === 'point' || done.has(id)) continue;
      const pts = sampleEntity(out, e, e.kind === 'line' ? 1 : 64);
      for (let j = 0; j + 1 < pts.length; j++) {
        const h = segSeg(path[i], path[i + 1], pts[j], pts[j + 1]);
        if (!h) continue;
        const hit = { x: path[i].x + (path[i + 1].x - path[i].x) * h.t, y: path[i].y + (path[i + 1].y - path[i].y) * h.t };
        out = trimEntity(out, id, hit, opts);
        done.add(id);
        break;
      }
    }
  }
  return out;
}

// ---------- Sketch Fillet ----------

/** Fillet between two lines that share an endpoint (or cross): both are trimmed, a tangent arc is added. */
export function sketchFillet(s: Sketch, lineA: Id, lineB: Id, radius: number, keepCorners = false): { sketch: Sketch; arcId: Id } | null {
  const a = s.entities[lineA], b = s.entities[lineB];
  if (!a || !b || a.kind !== 'line' || b.kind !== 'line' || radius <= 0) return null;
  const A1 = P(s, a.p1), A2 = P(s, a.p2), B1 = P(s, b.p1), B2 = P(s, b.p2);
  // the corner: a shared point or the crossing of the two lines
  let corner: SketchPoint | null = null;
  let sharedA: 'p1' | 'p2' | null = null, sharedB: 'p1' | 'p2' | null = null;
  for (const [ka, pa] of [['p1', A1], ['p2', A2]] as const) for (const [kb, pb] of [['p1', B1], ['p2', B2]] as const) if (same(pa, pb, 1e-4)) { corner = pa; sharedA = ka; sharedB = kb; }
  if (!corner) {
    const h = segSeg(A1, A2, B1, B2);
    if (!h) return null;
    corner = { x: A1.x + (A2.x - A1.x) * h.t, y: A1.y + (A2.y - A1.y) * h.t };
    sharedA = h.t < 0.5 ? 'p1' : 'p2';
    sharedB = h.u < 0.5 ? 'p1' : 'p2';
  }
  // directions away from the corner
  const farA = sharedA === 'p1' ? A2 : A1, farB = sharedB === 'p1' ? B2 : B1;
  const da = sub(farA, corner), db = sub(farB, corner);
  const la = len(da), lb = len(db);
  if (la < 1e-9 || lb < 1e-9) return null;
  const ua = { x: da.x / la, y: da.y / la }, ub = { x: db.x / lb, y: db.y / lb };
  const cosT = Math.max(-1, Math.min(1, ua.x * ub.x + ua.y * ub.y));
  const theta = Math.acos(cosT); // angle between the legs
  if (theta < 1e-6 || Math.PI - theta < 1e-6) return null;
  const tdist = radius / Math.tan(theta / 2);
  if (tdist > la + 1e-6 || tdist > lb + 1e-6) return null;
  const ta = { x: corner.x + ua.x * tdist, y: corner.y + ua.y * tdist };
  const tb = { x: corner.x + ub.x * tdist, y: corner.y + ub.y * tdist };
  const bis = { x: ua.x + ub.x, y: ua.y + ub.y };
  const bl = len(bis) || 1;
  const cdist = radius / Math.sin(theta / 2);
  const centre = { x: corner.x + (bis.x / bl) * cdist, y: corner.y + (bis.y / bl) * cdist };
  // move the corner endpoints of both lines to the tangent points, then the arc between them
  let s1 = s;
  const aPt = sharedA === 'p1' ? a.p1 : a.p2, bPt = sharedB === 'p1' ? b.p1 : b.p2;
  if (keepCorners && Object.values(s.constraints).some((c) => c.refs.includes(aPt) || c.refs.includes(bPt))) {
    // Keep constrained corners: the dimensions and relations of the corner move to a virtual sharp (a construction
    // point on both lines' extensions) instead of being deleted
    let vs: Id;
    [s1, vs] = addPointParam(s1, corner);
    s1 = pushPointEntity(s1, vs);
    const constraints = { ...s1.constraints };
    for (const cid of s1.constraintOrder) {
      const c = constraints[cid];
      if (c.refs.includes(aPt) || c.refs.includes(bPt)) {
        if (c.kind === 'horizontal' || c.kind === 'vertical') continue;
        constraints[cid] = { ...c, refs: c.refs.map((r) => (r === aPt || r === bPt ? vs : r)) };
      }
    }
    s1 = { ...s1, constraints };
    s1 = addConstraint(s1, 'pointOnEntity', [vs, a.id])[0];
    s1 = addConstraint(s1, 'pointOnEntity', [vs, b.id])[0];
  } else {
    s1 = dropPointRelations(s1, aPt);
    if (aPt !== bPt) s1 = dropPointRelations(s1, bPt);
  }
  s1 = setPoint(s1, aPt, ta);
  if (aPt !== bPt) s1 = setPoint(s1, bPt, tb);
  // when the lines shared the point, the second line needs its own endpoint
  if (aPt === bPt) {
    const [s2, npId] = addPointParam(s1, tb);
    s1 = s2;
    const nb = { ...(s1.entities[b.id] as LineEntity), [sharedB === 'p1' ? 'p1' : 'p2']: npId };
    s1 = { ...s1, entities: { ...s1.entities, [b.id]: nb } };
  }
  const bAfter = s1.entities[b.id] as LineEntity;
  const aAfter = s1.entities[a.id] as LineEntity;
  const aEnd = sharedA === 'p1' ? aAfter.p1 : aAfter.p2;
  const bEnd = sharedB === 'p1' ? bAfter.p1 : bAfter.p2;
  // orientation: from the tangent point on a to the one on b around the centre
  const angA = Math.atan2(ta.y - centre.y, ta.x - centre.x), angB = Math.atan2(tb.y - centre.y, tb.x - centre.x);
  let sweep = angB - angA;
  while (sweep > Math.PI) sweep -= Math.PI * 2;
  while (sweep < -Math.PI) sweep += Math.PI * 2;
  const [s3, arc] = addArc(s1, centre, aEnd, bEnd, sweep > 0, false);
  let s4 = addConstraint(s3, 'tangent', [a.id, arc.id])[0];
  s4 = addConstraint(s4, 'tangent', [b.id, arc.id])[0];
  return { sketch: s4, arcId: arc.id };
}

// ---------- Offset Entities ----------

function offsetDir(d: SketchPoint, side: number): SketchPoint {
  const l = len(d) || 1;
  return { x: (-d.y / l) * side, y: (d.x / l) * side };
}

/**
 * Offset of entities (lines, arcs, circles, splines) by a distance; consecutive lines of a chain
 * meet at the mitre, arcs and circles stay concentric. Positive = to the left of each line's
 * direction (reverse flips), as the original's Offset Entities (one side).
 */
export function offsetEntities(s: Sketch, ids: Id[], d: number, reverse = false, construction = false): Sketch {
  const side = reverse ? -1 : 1;
  let s1 = s;
  const ents = ids.map((id) => s.entities[id]).filter((e): e is Entity => !!e && e.kind !== 'point');
  // offset lines: endpoints moved along the normal; then mitre consecutive lines that share a point
  const offLines = new Map<Id, { a: SketchPoint; b: SketchPoint }>();
  for (const e of ents) {
    if (e.kind === 'line') {
      const a = P(s, e.p1), b = P(s, e.p2);
      const n = offsetDir(sub(b, a), side);
      offLines.set(e.id, { a: { x: a.x + n.x * d, y: a.y + n.y * d }, b: { x: b.x + n.x * d, y: b.y + n.y * d } });
    }
  }
  for (const e of ents) {
    if (e.kind !== 'line') continue;
    for (const f of ents) {
      if (f.kind !== 'line' || f === e) continue;
      // shared endpoint between e and f -> intersect the offset lines there
      const pairs: [Id, Id, 'a' | 'b', 'a' | 'b'][] = [[e.p2, f.p1, 'b', 'a'], [e.p2, f.p2, 'b', 'b'], [e.p1, f.p1, 'a', 'a'], [e.p1, f.p2, 'a', 'b']];
      for (const [pe, pf, ke, kf] of pairs) {
        if (pe !== pf && !same(P(s, pe), P(s, pf), 1e-6)) continue;
        const L1 = offLines.get(e.id)!, L2 = offLines.get(f.id)!;
        const r = sub(L1.b, L1.a), q = sub(L2.b, L2.a);
        const den = r.x * q.y - r.y * q.x;
        if (Math.abs(den) < 1e-12) continue;
        const ac = sub(L2.a, L1.a);
        const t = (ac.x * q.y - ac.y * q.x) / den;
        const m = { x: L1.a.x + r.x * t, y: L1.a.y + r.y * t };
        L1[ke] = m;
        L2[kf] = m;
      }
    }
  }
  for (const e of ents) {
    if (e.kind === 'line') {
      const L = offLines.get(e.id)!;
      s1 = addLine(s1, L.a, L.b, construction)[0];
    } else if (e.kind === 'circle') {
      const r = s.scalars[e.r] + d * side;
      if (r > 1e-6) s1 = addCircle(s1, P(s, e.center), r, construction)[0];
    } else if (e.kind === 'arc') {
      const c = P(s, e.center);
      // left of the travel direction for a ccw arc is inward
      const inward = (e.ccw ? 1 : -1) * side;
      const r = s.scalars[e.r] - inward * d;
      if (r > 1e-6) {
        const { a0, sweep } = arcAngles(s, e);
        const a = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) };
        const b = { x: c.x + r * Math.cos(a0 + sweep), y: c.y + r * Math.sin(a0 + sweep) };
        s1 = addArc(s1, c, a, b, e.ccw, construction)[0];
      }
    } else if (e.kind === 'spline') {
      const pts = sampleEntity(s, e, 24);
      const out: SketchPoint[] = [];
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
        const n = offsetDir(sub(next, prev), side);
        out.push({ x: pts[i].x + n.x * d, y: pts[i].y + n.y * d });
      }
      s1 = addSpline(s1, out, construction)[0];
    }
  }
  return s1;
}

// ---------- copies and transforms ----------

type Xform = (p: SketchPoint) => SketchPoint;

/** Copies of entities under a transform (new points, no relations), as patterns and Copy Entities do. */
export function copyEntities(s: Sketch, ids: Id[], xf: Xform): Sketch {
  let s1 = s;
  for (const id of ids) {
    const e = s.entities[id];
    if (!e) continue;
    if (e.kind === 'line') s1 = addLine(s1, xf(P(s, e.p1)), xf(P(s, e.p2)), e.construction)[0];
    else if (e.kind === 'circle') {
      const c = xf(P(s, e.center));
      const rim = xf({ x: P(s, e.center).x + s.scalars[e.r], y: P(s, e.center).y });
      s1 = addCircle(s1, c, len(sub(rim, c)), e.construction)[0];
    } else if (e.kind === 'arc') s1 = addArc(s1, xf(P(s, e.center)), xf(P(s, e.start)), xf(P(s, e.end)), e.ccw, e.construction)[0];
    else if (e.kind === 'spline') s1 = addSpline(s1, e.points.map((pid) => xf(P(s, pid))), e.construction)[0];
    else if (e.kind === 'point') s1 = addPoint(s1, xf(P(s, e.p)), e.construction)[0];
  }
  return s1;
}

export const translate = (dx: number, dy: number): Xform => (p) => ({ x: p.x + dx, y: p.y + dy });
export const rotateAbout = (c: SketchPoint, deg: number): Xform => {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  return (p) => ({ x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos });
};
export const scaleAbout = (c: SketchPoint, k: number): Xform => (p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k });

/** Move / Rotate / Scale Entities: the points of the entities are moved in place (shared points move once). */
export function transformEntities(s: Sketch, ids: Id[], xf: Xform): Sketch {
  const pts = new Set<Id>();
  for (const id of ids) {
    const e = s.entities[id];
    if (!e) continue;
    if (e.kind === 'line') { pts.add(e.p1); pts.add(e.p2); }
    else if (e.kind === 'circle') pts.add(e.center);
    else if (e.kind === 'arc') { pts.add(e.center); pts.add(e.start); pts.add(e.end); }
    else if (e.kind === 'spline') e.points.forEach((p) => pts.add(p));
    else if (e.kind === 'point') pts.add(e.p);
  }
  let s1 = s;
  for (const pid of pts) s1 = setPoint(s1, pid, xf(P(s, pid)));
  // scaling changes radii too
  for (const id of ids) {
    const e = s.entities[id];
    if (e && (e.kind === 'circle' || e.kind === 'arc')) {
      const c = P(s, e.center);
      const rim = xf({ x: c.x + s.scalars[e.r], y: c.y });
      const r = len(sub(rim, xf(c)));
      s1 = { ...s1, scalars: { ...s1.scalars, [e.r]: r } };
    }
  }
  return s1;
}

/** Linear Sketch Pattern: count instances (including the seed) spaced by (dx, dy). */
export function linearSketchPattern(s: Sketch, ids: Id[], dx: number, dy: number, count: number, count2 = 1, dx2 = 0, dy2 = 0): Sketch {
  let s1 = s;
  for (let j = 0; j < Math.max(1, count2); j++) for (let i = 0; i < Math.max(1, count); i++) {
    if (i === 0 && j === 0) continue;
    s1 = copyEntities(s1, ids, translate(dx * i + dx2 * j, dy * i + dy2 * j));
  }
  return s1;
}

/** Circular Sketch Pattern: count instances around a centre over the total angle (equal spacing), or a step angle */
export function circularSketchPattern(s: Sketch, ids: Id[], centre: SketchPoint, totalAngle: number, count: number, equal = true): Sketch {
  let s1 = s;
  const n = Math.max(1, count);
  const full = Math.abs(totalAngle - 360) < 1e-6;
  const step = !equal ? totalAngle : full ? 360 / n : totalAngle / Math.max(1, n - 1);
  for (let i = 1; i < n; i++) s1 = copyEntities(s1, ids, rotateAbout(centre, step * i));
  return s1;
}

/** Convert Entities: world polylines (edges of the model) projected onto the sketch plane become lines, circles or splines. */
export function convertPolylines(s: Sketch, polylines: { points: SketchPoint[]; closed: boolean }[]): Sketch {
  let s1 = s;
  for (const pl of polylines) {
    const pts = pl.points;
    if (pts.length < 2) continue;
    if (pts.length === 2 || (pts.length === 3 && same(pts[0], pts[2]))) {
      s1 = addLine(s1, pts[0], pts[1])[0];
      continue;
    }
    // a circle: closed and all points at the same distance from the mean
    const c = pts.reduce((acc, p) => ({ x: acc.x + p.x / pts.length, y: acc.y + p.y / pts.length }), { x: 0, y: 0 });
    const rs = pts.map((p) => len(sub(p, c)));
    const r = rs.reduce((a, b) => a + b, 0) / rs.length;
    const round = rs.every((x) => Math.abs(x - r) < Math.max(1e-3, r * 0.01));
    if (pl.closed && round && pts.length >= 8) {
      s1 = addCircle(s1, c, r)[0];
      continue;
    }
    // collinear -> one line; otherwise an arc through three points when circular, else a spline
    const a = pts[0], b = pts[pts.length - 1];
    const d = sub(b, a);
    const L = len(d) || 1;
    const maxDev = Math.max(...pts.map((p) => Math.abs((d.x * (p.y - a.y) - d.y * (p.x - a.x)) / L)));
    if (maxDev < 1e-3) {
      s1 = addLine(s1, a, b)[0];
      continue;
    }
    const m = pts[Math.floor(pts.length / 2)];
    const cc = circumcentre(a, m, b);
    if (cc && pts.every((p) => Math.abs(len(sub(p, cc)) - len(sub(a, cc))) < Math.max(1e-3, len(sub(a, cc)) * 0.01))) {
      const cross = (m.x - a.x) * (b.y - a.y) - (m.y - a.y) * (b.x - a.x);
      s1 = addArc(s1, cc, a, b, cross < 0)[0];
      continue;
    }
    s1 = addSpline(s1, pts)[0];
  }
  return s1;
}

function circumcentre(a: SketchPoint, b: SketchPoint, c: SketchPoint): SketchPoint | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  return { x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d };
}

// ---------- Sketch Chamfer ----------

/** Chamfer between two lines meeting at a corner: both are cut back (d1 along the first, d2 along the second) and joined by a line. */
export function sketchChamfer(s: Sketch, lineA: Id, lineB: Id, d1: number, d2 = d1): { sketch: Sketch; lineId: Id } | null {
  const a = s.entities[lineA], b = s.entities[lineB];
  if (!a || !b || a.kind !== 'line' || b.kind !== 'line' || d1 <= 0 || d2 <= 0) return null;
  const A1 = P(s, a.p1), A2 = P(s, a.p2), B1 = P(s, b.p1), B2 = P(s, b.p2);
  let corner: SketchPoint | null = null;
  let sharedA: 'p1' | 'p2' | null = null, sharedB: 'p1' | 'p2' | null = null;
  for (const [ka, pa] of [['p1', A1], ['p2', A2]] as const) for (const [kb, pb] of [['p1', B1], ['p2', B2]] as const) if (same(pa, pb, 1e-4)) { corner = pa; sharedA = ka; sharedB = kb; }
  if (!corner) {
    const h = segSeg(A1, A2, B1, B2);
    if (!h) return null;
    corner = { x: A1.x + (A2.x - A1.x) * h.t, y: A1.y + (A2.y - A1.y) * h.t };
    sharedA = h.t < 0.5 ? 'p1' : 'p2';
    sharedB = h.u < 0.5 ? 'p1' : 'p2';
  }
  const farA = sharedA === 'p1' ? A2 : A1, farB = sharedB === 'p1' ? B2 : B1;
  const da = sub(farA, corner), db = sub(farB, corner);
  const la = len(da), lb = len(db);
  if (la < d1 || lb < d2) return null;
  const ta = { x: corner.x + (da.x / la) * d1, y: corner.y + (da.y / la) * d1 };
  const tb = { x: corner.x + (db.x / lb) * d2, y: corner.y + (db.y / lb) * d2 };
  let s1 = s;
  const aPt = sharedA === 'p1' ? a.p1 : a.p2, bPt = sharedB === 'p1' ? b.p1 : b.p2;
  s1 = dropPointRelations(s1, aPt);
  if (aPt !== bPt) s1 = dropPointRelations(s1, bPt);
  s1 = setPoint(s1, aPt, ta);
  let bEnd = bPt;
  if (aPt === bPt) {
    const [s2, npId] = addPointParam(s1, tb);
    s1 = s2;
    const nb = { ...(s1.entities[b.id] as LineEntity), [sharedB === 'p1' ? 'p1' : 'p2']: npId };
    s1 = { ...s1, entities: { ...s1.entities, [b.id]: nb } };
    bEnd = npId;
  } else s1 = setPoint(s1, bPt, tb);
  const [s3, line] = addLine(s1, aPt, bEnd);
  return { sketch: s3, lineId: line.id };
}

// ---------- Extend Entities ----------

/** Extend the end of a line nearest to the click until it meets another entity (nothing happens when none is hit). */
export function extendEntity(s: Sketch, entityId: Id, click: SketchPoint): Sketch {
  const e = s.entities[entityId];
  if (!e || e.kind !== 'line') return s;
  const a = P(s, e.p1), b = P(s, e.p2);
  const t = paramAt(s, e, click);
  const fromEnd = t >= 0.5; // extend beyond p2, else beyond p1
  const tip = fromEnd ? b : a, tail = fromEnd ? a : b;
  const d = sub(tip, tail);
  const L = len(d) || 1;
  const dir = { x: d.x / L, y: d.y / L };
  const far = { x: tip.x + dir.x * 1e5, y: tip.y + dir.y * 1e5 };
  let best: number | null = null;
  for (const id of s.entityOrder) {
    const o = s.entities[id];
    if (o.id === e.id || o.kind === 'point') continue;
    const pts = sampleEntity(s, o, o.kind === 'line' ? 1 : 96);
    for (let j = 0; j + 1 < pts.length; j++) {
      const h = segSeg(tip, far, pts[j], pts[j + 1]);
      if (h && h.t > 1e-9 && (best === null || h.t < best)) best = h.t;
    }
  }
  if (best === null) return s;
  const np = { x: tip.x + (far.x - tip.x) * best, y: tip.y + (far.y - tip.y) * best };
  return setPoint(s, fromEnd ? e.p2 : e.p1, np);
}

export type { CircleEntity };


/** a construction point entity on an existing point parameter (a virtual sharp) */
function pushPointEntity(s: Sketch, pid: Id): Sketch {
  const id = `vs${pid}`;
  return { ...s, entities: { ...s.entities, [id]: { id, kind: 'point', p: pid, construction: true } as Sketch['entities'][string] }, entityOrder: [...s.entityOrder, id] };
}

/** the points of entities */
function entityPointIds(s: Sketch, ids: Id[]): Set<Id> {
  const pts = new Set<Id>();
  for (const id of ids) {
    const e = s.entities[id];
    if (!e) continue;
    if (e.kind === 'line') { pts.add(e.p1); pts.add(e.p2); }
    else if (e.kind === 'circle') pts.add(e.center);
    else if (e.kind === 'arc') { pts.add(e.center); pts.add(e.start); pts.add(e.end); }
    else if (e.kind === 'spline') e.points.forEach((p) => pts.add(p));
    else if (e.kind === 'point') pts.add(e.p);
  }
  return pts;
}

/** Offset Entities > Select chain: the entities joined end to end with the picked ones */
export function chainOf(s: Sketch, ids: Id[]): Id[] {
  const out = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    const pts = entityPointIds(s, [...out]);
    for (const id of s.entityOrder) {
      const e = s.entities[id];
      if (out.has(id) || !e || e.kind === 'point' || e.construction !== s.entities[ids[0]]?.construction) continue;
      if ([...entityPointIds(s, [id])].some((p) => pts.has(p) && !(e.kind === 'arc' && p === e.center) && !(e.kind === 'circle'))) { out.add(id); grew = true; }
    }
  }
  return [...out];
}

/** Move / Rotate / Scale Entities with Keep relations off: relations between the moved entities and the rest are dropped */
export function dropOutsideRelations(s: Sketch, ids: Id[]): Sketch {
  const inside = new Set<Id>([...ids, ...entityPointIds(s, ids)]);
  const constraints = { ...s.constraints };
  const constraintOrder = s.constraintOrder.filter((cid) => {
    const c = constraints[cid];
    const ins = c.refs.filter((r) => inside.has(r)).length;
    const dead = ins > 0 && ins < c.refs.length && c.refs.length > 1;
    if (dead) delete constraints[cid];
    return !dead;
  });
  return { ...s, constraints, constraintOrder };
}

/** Copy Entities with Keep relations: copies keep their shared points and the relations among the copied entities */
export function copyEntitiesKeep(s: Sketch, ids: Id[], xf: Xform): Sketch {
  let s1 = s;
  const pmap = new Map<Id, Id>(), emap = new Map<Id, Id>();
  const pt = (pid: Id): Id => {
    const m = pmap.get(pid);
    if (m) return m;
    let id: Id;
    [s1, id] = addPointParam(s1, xf(P(s, pid)));
    pmap.set(pid, id);
    return id;
  };
  for (const id of ids) {
    const e = s.entities[id];
    if (!e) continue;
    // the point ids first: pt() adds points to s1, the entity must be added after that
    if (e.kind === 'line') { const p1 = pt(e.p1), p2 = pt(e.p2); const [k, ne] = addLine(s1, p1, p2, e.construction); s1 = k; emap.set(id, ne.id); }
    else if (e.kind === 'circle') {
      const c = xf(P(s, e.center));
      const rim = xf({ x: P(s, e.center).x + s.scalars[e.r], y: P(s, e.center).y });
      const cid = pt(e.center);
      const [k, ne] = addCircle(s1, cid, len(sub(rim, c)), e.construction);
      s1 = k; emap.set(id, ne.id);
    } else if (e.kind === 'arc') {
      const a0 = pt(e.start), a1 = pt(e.end);
      const [k, ne] = addArc(s1, xf(P(s, e.center)), a0, a1, e.ccw, e.construction);
      s1 = k; emap.set(id, ne.id);
      if (!pmap.has(e.center)) pmap.set(e.center, ne.center);
    } else if (e.kind === 'spline') { const ps = e.points.map(pt); const [k, ne] = addSpline(s1, ps, e.construction); s1 = k; emap.set(id, ne.id); }
    else if (e.kind === 'point') { const [k, ne] = addPoint(s1, xf(P(s, e.p)), e.construction); s1 = k; emap.set(id, ne.id); if (!pmap.has(e.p)) pmap.set(e.p, ne.p); }
  }
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (c.kind === 'fix') continue;
    const refs = c.refs.map((r) => emap.get(r) ?? pmap.get(r));
    if (refs.every((r): r is Id => !!r)) s1 = addConstraint(s1, c.kind, refs, { value: c.value, driven: c.driven, internal: c.internal })[0];
  }
  return s1;
}
