import * as THREE from 'three';
import type { DraftFeature, Document, Feature, HoleFeature, PatternFeature, RevolveFeature, RibFeature, RoundFeature, ShellFeature } from '../../../core/document/types';
import { isSketchBased } from '../../../core/document/types';
import type { Body } from '../../../core/features/rebuild';
import { featureGeometry } from '../../../core/features/rebuild';
import { resolvePlaneDef } from '../../../core/features/planes';
import { revolveAxis } from '../../../core/features/solid';
import { sketchRegions } from '../../../core/features/regions';
import { sketchBounds } from '../../../core/sketch/geometry';
import { linearMap, type ModelHandle } from './handleMath';

/**
 * Drag Handles on the main value of a selected feature (with the same ruler and readout as the extrusion ends):
 * - Fillet radius / Chamfer distance: on the round (the chamfer face) in the middle of the first straight edge;
 * - Revolve angle: on the end cap, along the turn; Mid Plane: both caps (half each), Direction 2: its own cap;
 * - Shell thickness: on the inside of the wall opposite the first removed face (or of the largest face);
 * - Draft angle (neutral plane): on the first drafted face, which turns about its hinge on the neutral plane;
 * - Hole depth: at the bottom of the first hole (not for Through All);
 * - Linear pattern spacing: on the first instance along direction 1 (and direction 2); circular pattern angle: on the
 *   first instance, along the turn (not for an equal-spaced 360°: the step jumps when it leaves 360);
 * - Rib thickness: on the side face of the rib at the middle of its sketch line.
 * Not covered: multi-thickness shell faces, parting-line and step drafts, sketch-driven / curve / table / fill patterns.
 */
const v3 = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);
type Partial3 = Omit<ModelHandle, 'featureId' | 'kind' | 'apply' | 'toValue' | 'toOffset' | 'linear'> & { linear?: boolean; perMm?: number; set: (f: Feature,
  v: number) => Feature } & Partial<Pick<ModelHandle, 'toValue' | 'toOffset'>>;

function make(f: Feature, p: Partial3): ModelHandle {
  const map = p.toValue && p.toOffset ? { toValue: p.toValue, toOffset: p.toOffset } : linearMap(p.value, p.perMm ?? 1);
  const { set, perMm, ...rest } = p;
  void perMm;
  return {
    ...rest, ...map, linear: p.linear ?? true, featureId: f.id, kind: 'value',
    apply: (doc, v) => ({ doc: { ...doc, features: doc.features.map((x) => (x.id === f.id ? set(x, v) : x)) } }),
  };
}

/** fillet / chamfer: the first straight, open edge; the round's middle lies k(R) inside the corner along the bisector */
function roundHandle(f: RoundFeature): ModelHandle | null {
  const ref = f.edges.find((e) => e.straight && !e.closed && (e as { normals?: unknown }).normals) as (RoundFeature['edges'][number] & { normals: [number, number, number][] }) | undefined;
  if (!ref) return null;
  const n1 = v3(ref.normals[0]).normalize(), n2 = v3(ref.normals[1]).normalize();
  const b = n1.clone().add(n2);
  if (b.lengthSq() < 1e-6) return null;
  b.normalize();
  const half = n1.angleTo(n2) / 2;
  const k = f.type === 'fillet' ? 1 / Math.cos(half) - 1 : Math.sin(half);
  if (!(k > 1e-3)) return null;
  return make(f, { key: 'size', value: f.size, anchor: v3(ref.centroid).addScaledVector(b, -k * f.size), dir: b.clone().negate(), perMm: 1 / k, step: 0.1, fine: 0.01, min: 0.1,
    max: Infinity, unit: 'mm', set: (x, v) => ({ ...(x as RoundFeature), size: v }) });
}

/** revolve: the profile centre turned to each end of the sweep; the handles point along the turn */
function revolveHandles(doc: Document, f: RevolveFeature): ModelHandle[] {
  if (f.angle >= 360 && f.end !== 'midPlane') return [];
  const sk = doc.sketches[f.sketchId];
  const axis = sk ? revolveAxis(sk, f.axisEntityId) : null;
  const regions = sk ? sketchRegions(sk) : [];
  if (!sk || !axis || !regions.length) return [];
  const pl = resolvePlaneDef(doc, sk.plane);
  const world = (p: { x: number; y: number }) => v3(pl.origin).addScaledVector(v3(pl.u), p.x).addScaledVector(v3(pl.v), p.y);
  const outer = regions[0].outer;
  const c2 = outer.reduce((s, p) => ({ x: s.x + p.x / outer.length, y: s.y + p.y / outer.length }), { x: 0, y: 0 });
  const a = world(axis.a), dir = world(axis.b).sub(a).normalize();
  const p0 = world(c2);
  const radial = p0.clone().sub(a).sub(dir.clone().multiplyScalar(p0.clone().sub(a).dot(dir)));
  const r = radial.length();
  if (r < 1e-3) return [];
  // the sweep turns right-handed about the axis (first to second point) from the sketch plane (revolveGeometry)
  const end = (deg: number, key: string, value: number, perDeg: number, max: number, set: Partial3['set']) => {
    const q = new THREE.Quaternion().setFromAxisAngle(dir, (deg * Math.PI) / 180);
    const tangent = dir.clone().cross(radial.clone().applyQuaternion(q)).normalize().multiplyScalar(Math.sign(deg) || 1);
    return make(f, { key, value, anchor: a.clone().add(p0.clone().sub(a).applyQuaternion(q)), dir: tangent, perMm: (180 / (Math.PI * r)) * perDeg, step: 1, fine: 0.1, min: 1, max, unit: '°', set });
  };
  const s = f.reverse ? -1 : 1;
  const setAngle = (x: Feature, v: number) => ({ ...(x as RevolveFeature), angle: v });
  if (f.end === 'midPlane') return [end(f.angle / 2, 'mid+', f.angle, 2, 360, setAngle), end(-f.angle / 2, 'mid-', f.angle, 2, 360, setAngle)];
  const a2 = f.direction2?.angle ?? 0;
  const out = [end(s * f.angle, 'd1', f.angle, 1, 360 - a2, setAngle)];
  if (f.direction2 && a2 > 0) out.push(end(-s * a2, 'd2', a2, 1, 360 - f.angle, (x, v) => ({ ...(x as RevolveFeature), direction2: { angle: v } })));
  return out;
}

/** shell: the wall opposite the first removed face (else the largest face); the handle sits on the moving surface */
function shellHandle(f: ShellFeature, body: Body | undefined): ModelHandle | null {
  if (!body) return null;
  const planar = body.faces.filter((x) => !x.curved);
  if (!planar.length) return null;
  let face = planar.reduce((m, x) => (x.area > m.area ? x : m), planar[0]);
  if (f.faces.length) {
    const back = v3(f.faces[0].normal).normalize().negate();
    const cands = planar.filter((x) => v3(x.normal).dot(back) > 0.999);
    if (cands.length) face = cands.reduce((m, x) => (v3(x.centroid).dot(back) > v3(m.centroid).dot(back) ? x : m), cands[0]);
  }
  const nF = v3(face.normal).normalize(), c = v3(face.centroid);
  // inward: the inside of the wall moves in as the wall gets thicker; outward: the outside moves out
  const anchor = f.outward ? c : c.clone().addScaledVector(nF, -f.thickness);
  return make(f, { key: 'thickness', value: f.thickness, anchor, dir: f.outward ? nF : nF.clone().negate(), perMm: 1, step: 0.1, fine: 0.01, min: 0.1, max: Infinity, unit: 'mm', set: (x,
    v) => ({ ...(x as ShellFeature), thickness: v }) });
}

/** draft (neutral plane): a point of the first face at height h above the hinge moves h·tan(angle) into the part */
function draftHandle(f: DraftFeature): ModelHandle | null {
  if ((f.draftType ?? 'neutral') !== 'neutral' || !f.neutral || !f.faces.length) return null;
  const pull = v3(f.neutral.normal).normalize().negate();
  if (f.reverse) pull.negate();
  const nf = v3(f.faces[0].normal).normalize(), c = v3(f.faces[0].point);
  const h = c.clone().sub(v3(f.neutral.point)).dot(pull);
  if (Math.abs(h) < 1e-3 || Math.abs(nf.dot(pull)) > 0.99) return null;
  const H = Math.abs(h), t0 = Math.tan((f.angle * Math.PI) / 180);
  const dir = nf.clone().negate().multiplyScalar(Math.sign(h));
  return make(f, {
    key: 'angle', value: f.angle, anchor: c.clone().addScaledVector(dir, H * t0), dir, step: 0.5, fine: 0.1, min: 0.1, max: 60, unit: '°', linear: false,
    toValue: (mm) => (Math.atan(Math.max(0, H * t0 + mm) / H) * 180) / Math.PI, toOffset: (v) => H * (Math.tan((v * Math.PI) / 180) - t0),
    set: (x, v) => ({ ...(x as DraftFeature), angle: v }),
  });
}

/** hole: the bottom of the first hole, moving into the part */
function holeHandle(doc: Document, f: HoleFeature): ModelHandle | null {
  if (!(f.depth > 0) || !f.points.length) return null;
  const pl = resolvePlaneDef(doc, f.plane);
  const n = v3(pl.n).normalize(), p = f.points[0];
  const top = v3(pl.origin).addScaledVector(v3(pl.u), p.x).addScaledVector(v3(pl.v), p.y);
  const anchor = top.addScaledVector(n, -f.depth), dir = n.clone().negate();
  return { ...make(f, { key: 'depth', value: f.depth, anchor, dir, perMm: 1, step: 0.5, fine: 0.1, min: 0.1, max: Infinity, unit: 'mm', set: (x, v) => ({ ...(x as HoleFeature),
    depth: v }) }), snap: { plane: { point: anchor.clone(), normal: dir.clone() } } };
}

const seedCache = new WeakMap<Feature, THREE.Vector3 | null>();
/** the centre of a pattern seed: the middle of its geometry (a hole: its first position) */
export function seedCentre(doc: Document, ids: string[]): THREE.Vector3 | null {
  const pts: THREE.Vector3[] = [];
  for (const id of ids) {
    const f = doc.features.find((x) => x.id === id);
    if (!f) continue;
    if (!seedCache.has(f)) {
      let c: THREE.Vector3 | null = null;
      try {
        if (f.type === 'hole' && f.points.length) {
          const pl = resolvePlaneDef(doc, f.plane);
          c = v3(pl.origin).addScaledVector(v3(pl.u), f.points[0].x).addScaledVector(v3(pl.v), f.points[0].y);
        } else if (isSketchBased(f) && f.type !== 'sketch') {
          const g = featureGeometry(doc, f, 200).geometry;
          if (g) { g.computeBoundingBox(); c = g.boundingBox!.getCenter(new THREE.Vector3()); }
        }
      } catch { c = null; }
      seedCache.set(f, c);
    }
    const c = seedCache.get(f);
    if (c) pts.push(c);
  }
  return pts.length ? pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length) : null;
}

/** linear pattern: the first instance along each direction; circular: the first instance, along the turn */
export function patternHandles(doc: Document, f: PatternFeature, seed = seedCentre(doc, f.featureIds)): ModelHandle[] {
  if (!seed) return [];
  if (f.type === 'linearPattern') {
    const out: ModelHandle[] = [];
    for (const key of ['dir1', 'dir2'] as const) {
      const d = f[key];
      if (!d || d.count < 2 || (key === 'dir1' && f.upTo1)) continue;
      const ax = v3(d.axis).normalize();
      out.push(make(f, { key, value: d.spacing, anchor: seed.clone().addScaledVector(ax, d.spacing), dir: ax, perMm: 1, step: 0.5, fine: 0.1, min: 0.1, max: Infinity, unit: 'mm', set: (x,
        v) => ({ ...(x as PatternFeature), [key]: { ...(x as PatternFeature)[key]!, spacing: v } }) }));
    }
    return out;
  }
  if (f.type !== 'circularPattern') return [];
  const n = Math.max(1, f.count ?? 1), total = f.angle ?? 360;
  if (n < 2 || (!f.instanceSpacing && total >= 360)) return [];
  const per = f.instanceSpacing ? 1 : n - 1;
  const step = total / per;
  const o = v3(f.axis?.origin ?? [0, 0, 0]), d = v3(f.axis?.dir ?? [0, 1, 0]).normalize();
  const rel = seed.clone().sub(o);
  const radial = rel.clone().sub(d.clone().multiplyScalar(rel.dot(d)));
  const r = radial.length();
  if (r < 1e-3) return [];
  const p1 = rel.clone().applyAxisAngle(d, (step * Math.PI) / 180).add(o);
  const tangent = d.clone().cross(radial.clone().applyAxisAngle(d, (step * Math.PI) / 180)).normalize();
  return [make(f, { key: 'angle', value: total, anchor: p1, dir: tangent, perMm: (180 / (Math.PI * r)) * per, step: 1, fine: 0.1, min: 1, max: f.instanceSpacing ? 360 : 359, unit: '°',
    set: (x, v) => ({ ...(x as PatternFeature), angle: v }) })];
}

/** rib: the side face at the middle of the first sketch line; a mid-plane rib moves both faces (twice the drag) */
function ribHandle(doc: Document, f: RibFeature): ModelHandle | null {
  const sk = doc.sketches[f.sketchId];
  if (!sk) return null;
  const pl = resolvePlaneDef(doc, sk.plane);
  const u = v3(pl.u), v = v3(pl.v), n = v3(pl.n).normalize();
  const line = sk.entityOrder.map((id) => sk.entities[id]).find((e) => e?.kind === 'line' && !(e as { construction?: boolean }).construction);
  const b = sketchBounds(sk);
  let m = b ? { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 } : null, perp: THREE.Vector3 | null = null;
  if (line?.kind === 'line') {
    const a = sk.points[line.p1], c = sk.points[line.p2];
    m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
    perp = u.clone().multiplyScalar(-(c.y - a.y)).addScaledVector(v, c.x - a.x).normalize();
  }
  if (!m) return null;
  const mid = v3(pl.origin).addScaledVector(u, m.x).addScaledVector(v, m.y);
  // parallel ribs grow across the sketch plane (first side +n, second -n); normal ribs across the line in the plane
  const across = f.direction === 'normal' ? perp : n;
  if (!across) return null;
  const both = f.side === 'both' || f.direction === 'normal';
  const dir = f.side === 'second' && !both ? across.clone().negate() : across.clone();
  const anchor = mid.clone().addScaledVector(dir, both ? f.thickness / 2 : f.thickness);
  return make(f, { key: 'thickness', value: f.thickness, anchor, dir, perMm: both ? 2 : 1, step: 0.5, fine: 0.1, min: 0.1, max: Infinity, unit: 'mm', set: (x, v) => ({ ...(x as RibFeature),
    thickness: v }) });
}

/** the value handles of a selected feature */
export function valueHandles(doc: Document, bodies: Body[], f: Feature): ModelHandle[] {
  const one = (h: ModelHandle | null) => (h ? [h] : []);
  if (f.type === 'fillet' || f.type === 'chamfer') return one(roundHandle(f as RoundFeature));
  if (f.type === 'revolve') return revolveHandles(doc, f);
  if (f.type === 'shell') return one(shellHandle(f, bodies.find((b) => b.featureIds.includes(f.id))));
  if (f.type === 'draft') return one(draftHandle(f));
  if (f.type === 'hole') return one(holeHandle(doc, f));
  if (f.type === 'linearPattern' || f.type === 'circularPattern') return patternHandles(doc, f);
  if (f.type === 'rib') return one(ribHandle(doc, f));
  return [];
}
