import * as THREE from 'three';
import type { CompositeCurveFeature, CurvePointsFeature, Document } from '../document/types';
import type { Id } from '../sketch/types';
import { bodyEdges, matchEdge, type BodyEdge } from './edgesets';

/** the bodies as they are before the feature (their edges are found when the list has none yet) */
export type BodiesBefore = { id: string; geometry: THREE.BufferGeometry; edges?: BodyEdge[] }[];
const edgesOf = (bodies: BodiesBefore) => bodies.flatMap((b) => (b.edges?.length ? b.edges : bodyEdges(b.geometry, b.id)));
import { resolvePlaneDef } from './planes';
import { helixPath, sketch3DChains, sketchPath } from './sweep';

/*
 * Composite Curve (Features ▸ Curves ▸ Composite Curve), as the intended design: model edges, sketches and curves
 * joined end to end into one curve (CompCurve1), for instance the path of a sweep along the edges of a body.
 */
const JOIN = 1e-3;

/** The pieces joined into one polyline: each next piece starts (or, reversed, ends) where the chain ends. */
export function joinPieces(pieces: THREE.Vector3[][]): THREE.Vector3[] | null {
  const rest = pieces.filter((p) => p.length >= 2).map((p) => p.slice());
  if (!rest.length) return null;
  let chain = rest.shift()!;
  while (rest.length) {
    const head = chain[0], tail = chain[chain.length - 1];
    const i = rest.findIndex((p) => p[0].distanceTo(tail) < JOIN || p[p.length - 1].distanceTo(tail) < JOIN || p[0].distanceTo(head) < JOIN || p[p.length - 1].distanceTo(head) < JOIN);
    if (i < 0) return null;
    const p = rest.splice(i, 1)[0];
    if (p[0].distanceTo(tail) < JOIN) chain = [...chain, ...p.slice(1)];
    else if (p[p.length - 1].distanceTo(tail) < JOIN) chain = [...chain, ...p.reverse().slice(1)];
    else if (p[p.length - 1].distanceTo(head) < JOIN) chain = [...p, ...chain.slice(1)];
    else chain = [...p.reverse(), ...chain.slice(1)];
  }
  return chain;
}

/** The polyline of a composite curve against the bodies as they are before it; an error when it does not join up. */
export function compositePath(doc: Document, f: CompositeCurveFeature, bodies: BodiesBefore): { points: THREE.Vector3[] | null; error?: string } {
  const pieces: THREE.Vector3[][] = [];
  const edges = f.edges.length ? edgesOf(bodies) : [];
  for (const ref of f.edges) {
    const e = matchEdge(edges, ref);
    if (!e) return { points: null, error: 'An edge of the composite curve is no longer there.' };
    pieces.push(e.points);
  }
  for (const id of f.sketches) {
    const s3 = doc.features.find((x) => x.id === id && x.type === 'sketch3d');
    if (s3 && s3.type === 'sketch3d') { pieces.push(...sketch3DChains(s3.segments, s3.fillets)); continue; }
    const cv = doc.features.find((x) => x.id === id && x.type === 'curvePoints');
    if (cv && cv.type === 'curvePoints') { const c = curveThroughPoints(doc, cv); if (!c.points) return c; pieces.push(c.points); continue; }
    const sk = doc.sketches[id];
    const p = sk ? sketchPath(sk, resolvePlaneDef(doc, sk.plane)) : null;
    if (!p) return { points: null, error: 'A sketch of the composite curve has no lines, arcs or splines.' };
    pieces.push(p);
  }
  if (!pieces.length) return { points: null, error: 'Select the edges, sketches or curves to join.' };
  const points = joinPieces(pieces);
  return points ? { points } : { points: null, error: 'The entities of a composite curve must be connected end to end.' };
}

/** The path of a sweep: a sketch, a Helix/Spiral, a 3D sketch or a composite curve (against the edges before it). */
export function sweepPathOf(doc: Document, pathId: Id, bodies: BodiesBefore): { points: THREE.Vector3[] | null; error?: string } {
  const feat = doc.features.find((x) => x.id === pathId);
  if (feat?.type === 'compositeCurve') return compositePath(doc, feat, bodies);
  if (feat?.type === 'curvePoints') return curveThroughPoints(doc, feat);
  if (feat?.type === 'sketch3d') {
    const chain = sketch3DChains(feat.segments, feat.fillets)[0];
    return chain && chain.length >= 2 ? { points: chain } : { points: null, error: 'The 3D sketch has no lines to sweep along.' };
  }
  const sk = feat?.type === 'helix' ? doc.sketches[feat.sketchId] : doc.sketches[pathId];
  if (!sk) return { points: null, error: 'Select a sketch (or a helix) with the path.' };
  const plane = resolvePlaneDef(doc, sk.plane);
  const points = feat?.type === 'helix' ? helixPath(sk, plane, feat) : sketchPath(sk, plane);
  return points ? { points } : { points: null, error: 'The path sketch has no lines, arcs or splines to sweep along.' };
}

/** The smooth curve through the points of a Curve Through XYZ / Reference Points (centripetal Catmull-Rom). */
export function curveThroughPoints(doc: Pick<Document, 'refGeometry'>, f: CurvePointsFeature): { points: THREE.Vector3[] | null; error?: string } {
  const pts = f.refPoints?.length
    ? f.refPoints.map((id) => (doc.refGeometry ?? []).find((r) => r.id === id && r.kind === 'point')).map((r) => (r ? new THREE.Vector3(...r.origin) : null))
    : (f.points ?? []).map((p) => new THREE.Vector3(...p));
  if (pts.some((p) => !p)) return { points: null, error: 'A reference point of the curve is no longer there.' };
  const list = (pts as THREE.Vector3[]).filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 1e-9);
  if (list.length < 2) return { points: null, error: 'The curve needs at least two different points.' };
  if (list.length === 2) return { points: list };
  return { points: new THREE.CatmullRomCurve3(list, false, 'centripetal').getPoints((list.length - 1) * 16) };
}
