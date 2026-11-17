/**
 * The B-rep tools of the rebuild (moved out of rebuild.ts, QA 0.5.14 P2-14): the exact solid of a sketch-based feature,
 * the fillets and chamfers the B-rep kernel builds, and the pick between candidate results by the mesh kernel's volume.
 */
import * as THREE from 'three';
import type { Document, Feature, RoundFeature } from '../document/types';
import type { Id } from '../sketch/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import { resolvePlaneDef } from './planes';
import { sketchContourRegions, sketchRegions, polyArea, type ContourRegion } from './regions';
import { meshVolume } from './solid';
import { sketchChains, thinRegions } from './thin';
import { loftShape } from './loftThrough';
import { resolveExtrudeEnds } from './rebuild';

/** a fillet or chamfer the B-rep kernel builds: one constant size on picked edges (the other options: mesh kernel) */
export function brepRoundable(f: RoundFeature): boolean {
  const plainType = !f.roundType || f.roundType === 'constant' || (f.type === 'chamfer' && f.roundType === 'angleDistance' && (f.angle ?? 45) === 45);
  // multi radius and variable size (fillets): one radius per edge, or a linear change along the edge
  const perEdge = f.type === 'fillet' && (!!f.radii?.length || (f.roundType === 'variable' && !!f.variable));
  const plainProfile = !f.size2 && (!f.profile || f.profile === 'circular') && (f.type === 'fillet' || (!f.radii?.length && !f.variable));
  const plainOptions = !f.partial && !f.setback && (!f.overflow || f.overflow === 'default') && !f.internalOnly && f.tangentPropagation !== false;
  return (plainType || perEdge) && plainProfile && plainOptions && f.edges.length > 0 && f.size > 0;
}

/**
 * The tool of a sketch-based feature as a B-rep solid, for the cases the B-rep kernel builds; null for the rest
 * (the feature is then built by the mesh kernel). The extents are those of extrudeGeometry, without the overhang that
 * the mesh kernel needs against coplanar faces.
 */
export function brepTool(
  K: BrepKernel, doc: Document, f: Feature, extent: number, meshTool?: THREE.BufferGeometry, bodyGeom?: THREE.BufferGeometry | null,
  targetShape?: (bodyId: Id) => BrepShape | null,
): BrepShape | null {
  if (f.type === 'sweep') {
    // a sketch profile along a sketch path, following it (no twist, guides, tangency or circular profile yet)
    const tangency = (f.startTangency && f.startTangency !== 'none') || (f.endTangency && f.endTangency !== 'none');
    if (f.profileType === 'circular' || f.twist || f.guides?.length || f.orientation === 'keepNormal' || f.alignEnd || tangency) return null;
    const prof = doc.sketches[f.sketchId], path = doc.sketches[f.pathSketchId];
    if (!prof || !path) return null;
    const regions = sketchContourRegions(prof);
    if (!regions.length) return null;
    const shape = K.sweep(prof, resolvePlaneDef(doc, prof.plane), regions, path, resolvePlaneDef(doc, path.plane));
    // the B-rep sweep must agree with the mesh kernel's (orientation conventions): else the mesh kernel builds it
    if (shape && meshTool) {
      const mv = Math.abs(meshVolume(meshTool)), bv = Math.abs(K.volume(shape));
      if (!(mv > 0) || Math.abs(bv - mv) / mv > 0.03) return null;
    }
    return shape;
  }
  if (f.type === 'loft') {
    // a loft through single-region profiles (./loftThrough.ts); guides, centerline, end constraints and boundary: mesh kernel
    const shape = loftShape(K, doc, f);
    if (shape && meshTool) {
      const mv = Math.abs(meshVolume(meshTool)), bv = Math.abs(K.volume(shape));
      if (!(mv > 0) || Math.abs(bv - mv) / mv > 0.03) return null;
    }
    return shape;
  }
  if (f.type !== 'extrude' && f.type !== 'revolve') return null;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return null;
  let regions: ContourRegion[];
  if (f.thin) {
    // Thin Feature: the wall around the open (or closed) profile; exact when the profile is made of lines only
    if ((f.type === 'extrude' && f.thin.autoFillet)) return null;
    if (Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point')) return null;
    let chains = sketchChains(sketch);
    if (f.type === 'revolve') {
      // the axis is not part of the wall (as featureGeometry)
      const ax = sketch.entities[f.axisEntityId];
      const axPts = ax && ax.kind === 'line' ? [sketch.points[ax.p1], sketch.points[ax.p2]] : null;
      const onAxis = (p: { x: number; y: number }) => {
        if (!axPts) return false;
        const dx = axPts[1].x - axPts[0].x, dy = axPts[1].y - axPts[0].y;
        return Math.abs(dx * (p.y - axPts[0].y) - dy * (p.x - axPts[0].x)) < 1e-6 * Math.hypot(dx, dy);
      };
      chains = chains.filter((c) => !c.points.every(onAxis));
    }
    if (!chains.length) return null;
    const contour = (points: { x: number; y: number }[]) => ({ points, area: Math.abs(polyArea(points)), entityIds: [] });
    regions = thinRegions(chains, f.thin).map((r) => ({ outer: contour(r.outer), holes: r.holes.map(contour) }));
  } else {
    regions = sketchContourRegions(sketch);
    if (f.contours && f.contours.length) regions = regions.filter((_, i) => f.contours!.includes(i));
  }
  if (!regions.length) return null;
  const plane = resolvePlaneDef(doc, sketch.plane);
  if (f.type === 'revolve') {
    const ax = sketch.entities[f.axisEntityId];
    if (!ax || ax.kind !== 'line') return null;
    const axis: [{ x: number; y: number }, { x: number; y: number }] = [sketch.points[ax.p1], sketch.points[ax.p2]];
    const a1 = Math.max(0.1, Math.min(360, f.angle)), a2 = f.direction2 ? Math.max(0, f.direction2.angle) : 0;
    if (a1 + a2 >= 360 - 1e-9 && !(f.end === 'midPlane')) return K.revolve(sketch, plane, regions, axis, 360, 0);
    // a partial turn: the side the mesh kernel turns to (start angle and sense), found by the centre of its tool
    const cands = f.end === 'midPlane' ? [{ s: -a1 / 2, a: a1 }]
      : f.direction2 ? [{ s: -a2, a: a1 + a2 }, { s: -a1, a: a1 + a2 }] : [{ s: 0, a: a1 }, { s: -a1, a: a1 }];
    if (cands.length === 1 || !meshTool) return K.revolve(sketch, plane, regions, axis, cands[0].a, cands[0].s);
    meshTool.computeBoundingBox();
    const target = meshTool.boundingBox!.getCenter(new THREE.Vector3());
    let best: BrepShape | null = null, bd = Infinity;
    for (const c of cands) {
      const sh = K.revolve(sketch, plane, regions, axis, c.a, c.s);
      if (!sh) continue;
      const g = K.tessellate(sh);
      g.computeBoundingBox();
      const d = g.boundingBox!.getCenter(new THREE.Vector3()).distanceTo(target);
      if (d < bd) { bd = d; best = sh; }
    }
    return best;
  }
  if (f.normalCut) return null;
  // Up To Body: through the target body, minus the body; the piece that starts at the sketch plane ends on its near side
  if (f.end === 'upToBody') {
    const target = f.upToBody && targetShape ? targetShape(f.upToBody.bodyId) : null;
    if (!target || f.draft || f.direction2 || f.flipSide || f.fromOffset) return null;
    const through = K.extrude(sketch, plane, regions, f.reverse ? -extent : 0, extent);
    if (!through) return null;
    const dir = f.reverse ? -1 : 1;
    return K.cutKeepTouching(through, target, plane.origin, [plane.n[0] * dir, plane.n[1] * dir, plane.n[2] * dir]);
  }
  // the model-dependent ends (Up To Next, Up To Vertex, Direction 2 up to …) as blind depths, as the mesh kernel has them
  let polyRegions = sketchRegions(sketch);
  if (f.contours && f.contours.length) polyRegions = polyRegions.filter((_, i) => f.contours!.includes(i));
  const ends = resolveExtrudeEnds(f, polyRegions, plane, bodyGeom ?? null);
  if ('error' in ends) return null;
  const fe = ends.fe;
  const surfaceEnd = (fe.end === 'upToSurface' || fe.end === 'offsetFromSurface') && !!fe.surface;
  if ((fe.end === 'upToSurface' || fe.end === 'offsetFromSurface') && !fe.surface) return null;
  // Draft On/Off: one-sided extrusions only (the mesh kernel tapers both sides away from the sketch plane)
  const twoSided = fe.end === 'midPlane' || fe.end === 'throughAllBoth' || fe.direction2 || fe.flipSide;
  if (fe.draft && (twoSided || surfaceEnd || !(fe.draft.angle > 0 && fe.draft.angle < 89))) return null;
  if (fe.direction2 && !['blind', 'throughAll'].includes(fe.direction2.end)) return null;
  const d1 = fe.end === 'throughAll' || fe.end === 'throughAllBoth' || surfaceEnd ? extent : Math.max(0, fe.depth);
  const d2 = fe.end === 'throughAllBoth' ? extent : fe.direction2 ? (fe.direction2.end === 'blind' ? Math.max(0, fe.direction2.depth) : extent) : 0;
  let zStart: number, total: number;
  if (fe.end === 'midPlane') {
    zStart = -d1 / 2;
    total = d1;
  } else {
    const a = fe.reverse ? -d1 : d1;
    const b = fe.reverse ? d2 : -d2;
    zStart = Math.min(0, a, b);
    total = Math.max(0, a, b) - zStart;
  }
  if (total <= 1e-9) return null;
  // From ▸ Offset: the extrusion starts at this distance from the sketch plane
  if (fe.fromOffset) zStart += fe.fromReverse ? -fe.fromOffset : fe.fromOffset;
  let shape = K.extrude(sketch, plane, regions, zStart, total);
  if (!shape) return null;
  if (fe.draft) {
    const dirSign = fe.reverse ? -1 : 1;
    const pull: [number, number, number] = [plane.n[0] * dirSign, plane.n[1] * dirSign, plane.n[2] * dirSign];
    const neutral = { origin: plane.origin, normal: plane.n };
    const prism = shape;
    const makers = [fe.draft.angle, -fe.draft.angle].map((a) => () => K.draft(prism, 'sides', pull, a, neutral));
    return pickByVolume(K, makers, meshTool ? Math.abs(meshVolume(meshTool)) : 0, 0.1);
  }
  // Flip side to cut: the slab of the same depth minus the profile prism
  if (fe.op === 'cut' && fe.flipSide) {
    const first = polyRegions.length ? polyRegions[0].outer : [];
    const c = first.reduce((acc, p) => ({ x: acc.x + p.x / first.length, y: acc.y + p.y / first.length }), { x: 0, y: 0 });
    const big = extent * 2;
    const sq = [{ x: c.x - big, y: c.y - big }, { x: c.x + big, y: c.y - big }, { x: c.x + big, y: c.y + big }, { x: c.x - big, y: c.y + big }];
    const slabRegion = { outer: { points: sq, area: 4 * big * big, entityIds: [] }, holes: [] };
    const slab = K.extrude(sketch, plane, [slabRegion], zStart, total);
    if (!slab) return null;
    shape = K.cut(slab, shape);
  }
  // Up To Surface / Offset From Surface: through all, cut back at the (offset) face plane
  if (surfaceEnd && fe.surface) {
    const n = new THREE.Vector3(...fe.surface.normal).normalize();
    const p = new THREE.Vector3(...fe.surface.point);
    if (new THREE.Vector3(...plane.origin).sub(p).dot(n) > 0) n.negate();
    let off = fe.end === 'offsetFromSurface' ? fe.offset ?? 0 : 0;
    if (off && fe.translateSurface) off *= Math.abs(new THREE.Vector3(...fe.surface.normal).normalize().dot(new THREE.Vector3(...plane.n).normalize()));
    p.addScaledVector(n, fe.reverseOffset ? off : -off);
    shape = K.clipByPlane(shape, [p.x, p.y, p.z], [n.x, n.y, n.z]);
  }
  return shape;
}

/** of candidate B-rep results, the one whose volume is nearest the mesh kernel's (within the tolerance); null if none */
export function pickByVolume(K: BrepKernel, makers: (() => BrepShape)[], meshVol: number, tol: number): BrepShape | null {
  if (!(meshVol > 0)) return null;
  let best: BrepShape | null = null, bd = Infinity;
  for (const make of makers) {
    try {
      const sh = make();
      const d = Math.abs(Math.abs(K.volume(sh)) - meshVol) / meshVol;
      if (d < bd) { bd = d; best = sh; }
    } catch {
      /* this candidate failed */
    }
  }
  return bd <= tol ? best : null;
}
