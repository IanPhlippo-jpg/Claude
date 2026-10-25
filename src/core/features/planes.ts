import type { Document, PlaneDef } from '../document/types';

export type ReferencePlaneId = 'front' | 'top' | 'right';

/** The three reference planes of a part (world xyz, Y up, Z towards the viewer). */
export const REFERENCE_PLANE_DEFS: Record<ReferencePlaneId, PlaneDef> = {
  front: { id: 'front', name: 'Front Plane', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  top: { id: 'top', name: 'Top Plane', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
  right: { id: 'right', name: 'Right Plane', origin: [0, 0, 0], u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
};

export function isReferencePlane(id: string): id is ReferencePlaneId {
  return id === 'front' || id === 'top' || id === 'right';
}

/** Plane definition for a sketch plane id: a reference plane or a plane stored in the document. */
export function resolvePlaneDef(doc: Pick<Document, 'planes'>, id: string): PlaneDef {
  if (isReferencePlane(id)) return REFERENCE_PLANE_DEFS[id];
  return doc.planes[id] ?? REFERENCE_PLANE_DEFS.front;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Plane on a planar face: origin at the face centroid, u along the world axis that is
 * most perpendicular to the normal (so sketches on a top face keep X to the right).
 */
export function planeOnFace(id: string, name: string, origin: V3, normal: V3): PlaneDef {
  const n = norm(normal);
  const candidates: V3[] = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  let ref = candidates[0];
  for (const c of candidates) {
    if (Math.abs(dot(c, n)) < 0.9) {
      ref = c;
      break;
    }
  }
  // u = ref projected on the plane
  const u = norm(sub(ref, [n[0] * dot(ref, n), n[1] * dot(ref, n), n[2] * dot(ref, n)]));
  const v = norm(cross(n, u));
  return { id, name, origin, u, v, n };
}

const vadd = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** rotate v about the unit axis d by angle (Rodrigues) */
function rotate(v: V3, d: V3, ang: number): V3 {
  const c = Math.cos(ang), s = Math.sin(ang);
  const dot = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
  const cr: V3 = [d[1] * v[2] - d[2] * v[1], d[2] * v[0] - d[0] * v[2], d[0] * v[1] - d[1] * v[0]];
  return [v[0] * c + cr[0] * s + d[0] * dot * (1 - c), v[1] * c + cr[1] * s + d[1] * dot * (1 - c), v[2] * c + cr[2] * s + d[2] * dot * (1 - c)];
}

/**
 * A reference plane from its definition: offset along the normal of the reference plane, at an
 * angle about an axis lying in it, parallel through the origin, or coincident.
 */
export function referencePlane(id: string, name: string, base: PlaneDef, def: NonNullable<PlaneDef['def']>): PlaneDef {
  const p = referencePlaneRaw(id, name, base, def);
  // Options ▸ Flip normal: the plane faces the other way (sketches on it are mirrored)
  if (!def.flipNormal) return p;
  const n: V3 = [-p.n[0], -p.n[1], -p.n[2]];
  return { ...p, n, v: norm(cross(n, p.u)) };
}

function referencePlaneRaw(id: string, name: string, base: PlaneDef, def: NonNullable<PlaneDef['def']>): PlaneDef {
  const sign = def.flip ? -1 : 1;
  // Mid Plane: halfway between the first reference and a parallel second reference
  if (def.mode === 'mid' && def.mid) {
    const half = dot(sub(def.mid.origin, base.origin), base.n) / 2;
    return { id, name, origin: vadd(base.origin, base.n, half), u: base.u, v: base.v, n: base.n, kind: 'reference', def };
  }
  // Perpendicular: through the straight edge (second reference) or the reference's origin, at 90° to it
  if (def.mode === 'perpendicular') {
    if (def.axis) {
      const d = norm(def.axis.dir);
      const n = norm(rotate(base.n, d, (sign * Math.PI) / 2));
      const u = norm(rotate(base.u, d, (sign * Math.PI) / 2));
      return { id, name, origin: def.axis.origin, u, v: norm(cross(n, u)), n, kind: 'reference', def };
    }
    const n: V3 = def.flip ? [-base.u[0], -base.u[1], -base.u[2]] : base.u;
    return { id, name, origin: base.origin, u: base.n, v: norm(cross(n, base.n)), n, kind: 'reference', def };
  }
  if (def.mode === 'offset') return { id, name, origin: vadd(base.origin, base.n, sign * def.distance), u: base.u, v: base.v, n: base.n, kind: 'reference', def };
  if (def.mode === 'angle' && def.axis) {
    const d = norm(def.axis.dir);
    const ang = (sign * def.angle * Math.PI) / 180;
    const n = norm(rotate(base.n, d, ang));
    const u = norm(rotate(base.u, d, ang));
    const v = norm(cross(n, u));
    return { id, name, origin: def.axis.origin, u, v, n, kind: 'reference', def };
  }
  return { id, name, origin: def.mode === 'parallel' ? [0, 0, 0] : base.origin, u: base.u, v: base.v, n: base.n, kind: 'reference', def };
}
