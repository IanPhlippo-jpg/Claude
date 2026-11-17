/**
 * The builders of the features that change or combine whole bodies (moved out of the feature loop of rebuild.ts, QA
 * 0.5.14 P2-14): imported meshes, reference curves, Draft, Rib, Mirror, Shell, Thread, Delete Face, Move/Copy, Delete
 * Body, Deform, Intersect and Combine. Each takes the feature, the first visible body and the rebuild state
 * (rebuildState.ts); an error goes into ctx.errors and the feature is left out.
 */
import * as THREE from 'three';
import { isSketchBased, type Document, type Feature, type PlaneDef } from '../document/types';
import type { Body } from './rebuild';
import { draftOnBody, featureGeometry } from './rebuild';
import type { BrepShape } from './brepKernel';
import { RebuildStopped, type RebuildCtx } from './rebuildState';
import { csg, mergeGeometries, meshVolume, planarFaces, THROUGH_ALL } from './solid';
import { mirrorGeometry } from './pattern';
import { geometryFromPositions } from '../document/stl';
import { helixPath, sketch3DChains } from './sweep';
import { compositePath, curveThroughPoints } from './compositeCurve';
import { resolvePlaneDef } from './planes';
import { ribGeometry } from './rib';
import { threadSweeps, threadTool } from './thread';
import { threadSpecOf } from './rebuildTools';
import { applyShellFromHistory, applyShellOutward } from './shell';
import { deleteFaces } from './deleteface';
import { pointDeform } from './deform';
import { fitPlane } from './surfaces';
import { pickByVolume } from './brepTool';

/** an imported body: its mesh, or with the B-rep kernel the exact solid of the STEP file it came from (docs/32 item 5) */
export function buildImported(f: Extract<Feature, { type: 'imported' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { errors, warnings, addBoss, newBody, K } = ctx;
  if (f.positions.length < 9) {
    errors[f.id] = 'The imported file has no triangles.';
    return;
  }
  let shape: BrepShape | null = null;
  if (f.step && K?.fromStep) {
    try { shape = K.fromStep(f.step); } catch { shape = null; }
    if (!shape) warnings[f.id] = 'The exact solid of the STEP file could not be read again: the body is the stored mesh.';
  }
  try {
    // an imported body is its own body (merge it with Combine); with its exact solid the geometry is that solid's
    const b = newBody(geometryFromPositions(f.positions), f.id, shape);
    addBoss(b.geometry);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** a 3D sketch: its chains are reference curves */
export function buildSketch3d(f: Extract<Feature, { type: 'sketch3d' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { curves } = ctx;
  for (const [i, chain] of sketch3DChains(f.segments, f.fillets).entries()) curves.push({ id: i ? `${f.id}:${i}` : f.id, name: f.name, points: chain });
}

/** Composite Curve / Curve Through XYZ Points */
export function buildCompositeCurve(f: Extract<Feature, { type: 'compositeCurve' | 'curvePoints' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, bodies, errors, consumedSketches, curves } = ctx;
  const cp = f.type === 'curvePoints' ? curveThroughPoints(doc, f) : compositePath(doc, f, bodies);
  if (cp.points) curves.push({ id: f.id, name: f.name, points: cp.points });
  else errors[f.id] = cp.error!;
  if (f.type === 'compositeCurve') for (const id of f.sketches) consumedSketches.add(id);
}

/** Helix/Spiral: a reference curve */
export function buildHelix(f: Extract<Feature, { type: 'helix' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, errors, curves } = ctx;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) {
    errors[f.id] = 'The sketch of this helix no longer exists.';
    return;
  }
  const pts = helixPath(sketch, resolvePlaneDef(doc, sketch.plane), f);
  if (!pts) errors[f.id] = 'The helix needs a circle in its sketch and a pitch, height or number of revolutions above zero.';
  else curves.push({ id: f.id, name: f.name, points: pts });
}

/** Draft */
export function buildDraft(f: Extract<Feature, { type: 'draft' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { errors, K, exactOf, setExact, visibleBodies } = ctx;
  const p0 = f.faces.length ? new THREE.Vector3(...f.faces[0].point) : null;
  const onBody = (b: Body) => !!p0 && planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 1e-2);
  const target = visibleBodies().find(onBody) ?? body;
  if (!target) {
    errors[f.id] = 'A draft needs a solid body.';
    return;
  }
  try {
    const r = draftOnBody(target.geometry, f);
    if (!r.geometry) {
      errors[f.id] = r.error ?? 'Could not build the draft.';
      return;
    }
    // B-rep draft about the neutral plane: the side of the angle that agrees with the mesh kernel
    const exD = exactOf(target);
    let drafted: BrepShape | null = null;
    if (K && exD && f.neutral && (!f.draftType || f.draftType === 'neutral') && (!f.propagation || f.propagation === 'none')) {
      const nn = f.neutral.normal;
      // direction of pull: into the part from the neutral face (Reverse flips it), as draftOnBody
      const pull: [number, number, number] = f.reverse ? [nn[0], nn[1], nn[2]] : [-nn[0], -nn[1], -nn[2]];
      const neutral = { origin: f.neutral.point, normal: nn };
      drafted = pickByVolume(K, [f.angle, -f.angle].map((a) => () => K.draft(exD, f.faces, pull, a, neutral)), Math.abs(meshVolume(r.geometry)), 0.03);
    }
    if (drafted) setExact(target, drafted);
    else target.geometry = r.geometry;
    target.featureIds.push(f.id);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Rib */
export function buildRib(f: Extract<Feature, { type: 'rib' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, errors, K, addMaterial, addBoss, allVisible } = ctx;
  const sketch = doc.sketches[f.sketchId];
  if (!body) {
    errors[f.id] = 'A rib needs an existing solid body.';
    return;
  }
  if (!sketch) {
    errors[f.id] = 'The sketch of this rib no longer exists.';
    return;
  }
  const r = ribGeometry(sketch, resolvePlaneDef(doc, sketch.plane), allVisible() ?? body.geometry, f);
  if (!r.geometry) {
    errors[f.id] = r.error ?? 'The rib could not be built.';
    return;
  }
  // B-rep: a rib of straight lines has planar faces only; its solid joins an exact body exactly
  let ribShape: BrepShape | null = null;
  if (K && !Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point')) {
    try { ribShape = K.fromMesh(r.geometry); } catch { ribShape = null; }
  }
  try {
    addMaterial(r.geometry, f.id, true, undefined, ribShape ?? undefined);
    addBoss(r.geometry);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Mirror: faces, features or bodies */
export function buildMirror(f: Extract<Feature, { type: 'mirror' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, bodies, errors, surfaceBodies, history, K, addBoss, newBody, nameBody, exactOf, setExact, visibleBodies, extraAppearances, toolOf, tick } = ctx;
  if (!body) {
    errors[f.id] = 'A mirror needs an existing solid body.';
    return;
  }
  const pl = resolvePlaneDef(doc, f.plane);
  try {
    // Faces to Mirror: the picked faces, mirrored, as a surface body (knit onto the body's own surface when asked)
    if (f.faces?.length) {
      const tris: number[] = [];
      for (const ref of f.faces) {
        const p = new THREE.Vector3(...ref.point);
        for (const b of visibleBodies()) {
          const fc = planarFaces(b.geometry, b.id).find((x) => new THREE.Vector3(...x.centroid).distanceTo(p) < 0.5);
          if (!fc) continue;
          const src = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
          const pos = src.getAttribute('position');
          for (const t of fc.triangles) for (let k = 0; k < 3; k++) tris.push(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k));
          break;
        }
      }
      if (tris.length) {
        const g0 = new THREE.BufferGeometry();
        g0.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
        const mirrored = mirrorGeometry(g0, pl.origin, pl.n);
        const knit = f.knitSurfaces ? surfaceBodies.find((s) => s.featureIds.some((id) => f.faces!.some((x) => x.label.includes(id)))) : undefined;
        if (knit) {
          const positionsOnly = (g: THREE.BufferGeometry) => {
            const x = g.clone();
            for (const k of Object.keys(x.attributes)) if (k !== 'position') x.deleteAttribute(k);
            return x;
          };
          knit.geometry = mergeGeometries([knit.geometry.index ? knit.geometry.toNonIndexed() : knit.geometry, mirrored].map(positionsOnly)) ?? knit.geometry;
          knit.featureIds.push(f.id);
        } else surfaceBodies.push({ id: nameBody.surface(f.id, surfaceBodies.length), geometry: mirrored, faces: [], edges: [], featureIds: [f.id] });
      }
      // Propagate visual properties: the face appearances come along
      if (f.propagateVisual !== false) mirrorAppearances(doc, pl, extraAppearances);
      return;
    }
    // Features to Mirror: only those features' tool geometry, added (boss) or taken away (cut)
    if (f.featureIds?.length) {
      for (const fid of f.featureIds) {
        // a mirror of many features stops when the rebuild budget is used up (P2-5d)
        tick();
        const src = doc.features.find((x) => x.id === fid);
        if (!src || !isSketchBased(src) || src.type === 'sketch') continue;
        const tool = featureGeometry(doc, src, THROUGH_ALL, body?.geometry, bodies).geometry;
        if (!tool) continue;
        const m = mirrorGeometry(tool, pl.origin, pl.n);
        const cut = (src as { op?: string }).op === 'cut';
        // the mirrored B-rep tool, for the bodies that are exact
        const srcShape = toolOf(src, THROUGH_ALL, tool);
        let mShape: BrepShape | null = null;
        if (K && srcShape) { try { mShape = K.mirror(srcShape, pl.origin, pl.n); } catch { mShape = null; } }
        for (const b of visibleBodies()) {
          if (f.bodies?.length && !f.bodies.includes(b.id)) continue;
          const ex = exactOf(b);
          if (K && ex && mShape) {
            try {
              setExact(b, cut ? K.cut(ex, mShape) : K.fuse(ex, mShape));
              b.featureIds.push(f.id);
              continue;
            } catch {
              /* the mesh kernel below */
            }
          }
          b.geometry = csg(b.geometry, m, cut ? 'subtract' : 'union');
          b.featureIds.push(f.id);
        }
        if (cut) history.cuts.push(m); else if (history.boss) addBoss(m);
      }
      if (f.propagateVisual !== false) mirrorAppearances(doc, pl, extraAppearances);
      return;
    }
    for (const b of visibleBodies()) {
      // Bodies to Mirror: only the listed bodies (absent: every body)
      if (f.bodies?.length && !f.bodies.includes(b.id)) continue;
      // Merge solids off: the mirrored half becomes a body of its own
      const ex = exactOf(b);
      let mirrored: BrepShape | null = null;
      if (K && ex) { try { mirrored = K.mirror(ex, pl.origin, pl.n); } catch { mirrored = null; } }
      if (f.mergeSolids === false) newBody(mirrorGeometry(b.geometry, pl.origin, pl.n), f.id, mirrored);
      else {
        let done = false;
        if (K && ex && mirrored) {
          try { setExact(b, K.fuse(ex, mirrored)); done = true; } catch { done = false; }
        }
        if (!done) b.geometry = csg(b.geometry, mirrorGeometry(b.geometry, pl.origin, pl.n), 'union');
      }
      b.featureIds.push(f.id);
    }
    if (f.propagateVisual !== false) mirrorAppearances(doc, pl, extraAppearances);
    if (history.boss) addBoss(mirrorGeometry(history.boss, pl.origin, pl.n));
    history.cuts = [...history.cuts, ...history.cuts.map((c) => mirrorGeometry(c, pl.origin, pl.n))];
  } catch (err) {
    if (err instanceof RebuildStopped) throw err;
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Shell */
export function buildShell(f: Extract<Feature, { type: 'shell' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors, history, K, exactOf, setExact, visibleBodies } = ctx;
  if (!body) {
    errors[f.id] = 'A shell needs an existing solid body.';
    return;
  }
  if (f.thickness <= 0) {
    errors[f.id] = 'The wall thickness must be larger than zero.';
    return;
  }
  try {
    let target = body;
    if (f.faces.length && bodies.length > 1) {
      const p = new THREE.Vector3(...f.faces[0].point);
      let best = Infinity;
      for (const b of visibleBodies()) {
        for (const face of planarFaces(b.geometry, b.id)) {
          const d = p.distanceTo(new THREE.Vector3(...face.centroid));
          if (d < best) { best = d; target = b; }
        }
      }
    }
    const exShell = exactOf(target);
    const meshShell = f.outward
      ? applyShellOutward(target.geometry, f.thickness, f.faces)
      : applyShellFromHistory(target.geometry, f.thickness, f.faces, history, f.multi ?? []);
    // B-rep shell (offset surfaces, true inner rounds): kept when it agrees with the mesh kernel's wall
    let brepShell: BrepShape | null = null;
    if (K && exShell && !f.multi?.length) {
      try {
        const sh = K.shell(exShell, f.faces, f.thickness, !!f.outward);
        const mv = Math.abs(meshVolume(meshShell)), bv = Math.abs(K.volume(sh));
        if (mv > 0 && Math.abs(bv - mv) / mv < 0.03) brepShell = sh;
      } catch {
        /* the mesh shell */
      }
    }
    if (brepShell) setExact(target, brepShell);
    else target.geometry = meshShell;
    // later features work on the shelled body
    history.boss = target.geometry;
    history.cuts = [];
    target.featureIds.push(f.id);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Thread */
export function buildThread(f: Extract<Feature, { type: 'thread' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { errors, K, addMaterial, removeMaterial, exactOf } = ctx;
  if (!body || !f.edge) {
    errors[f.id] = !body ? 'A thread needs a solid body.' : 'Select a circular edge of a cylinder or hole.';
    return;
  }
  const spec = threadSpecOf(f)!;
  const ax = new THREE.Vector3(...spec.axis).normalize();
  const c0 = new THREE.Vector3(...spec.center);
  const length = spec.length;
  let tool = threadTool(spec);
  // Trim with start / end face: only the part between the faces (a slab across the axis)
  if (f.trimStart || f.trimEnd) {
    const big = f.diameter * 4 + 20;
    const from = f.trimStart ? 0 : -length, to = f.trimEnd ? length : 2 * length;
    const slab = new THREE.CylinderGeometry(big, big, to - from, 48, 1, false);
    slab.translate(0, (to + from) / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax);
    slab.applyQuaternion(q);
    slab.translate(c0.x, c0.y, c0.z);
    try { tool = csg(tool, slab.toNonIndexed(), 'intersect'); } catch { /* keep the untrimmed tool */ }
  }
  // B-rep: the V profile swept along a true helix (every start), trimmed like the mesh tool; kept when it agrees
  let threadShape: BrepShape | null = null;
  if (K && body && exactOf(body)) {
    try {
      let sh: BrepShape | null = null;
      for (const sw of threadSweeps(spec)) {
        const one = K.helixSweep(sw.center, sw.axis, sw.xdir, sw.radius, sw.lead, sw.length, sw.sign, sw.startAngle, sw.profile);
        if (!one) { sh = null; break; }
        sh = sh ? K.fuse(sh, one) : one;
      }
      if (sh && (f.trimStart || f.trimEnd)) {
        const big = f.diameter * 4 + 20;
        const from = f.trimStart ? 0 : -length, to = f.trimEnd ? length : 2 * length;
        const ref = Math.abs(ax.x) < 0.9 ? new THREE.Vector3(1, 0, 0).cross(ax).normalize() : new THREE.Vector3(0, 1, 0).cross(ax).normalize();
        sh = K.common(sh, K.axisymmetric([c0.x, c0.y, c0.z], [ax.x, ax.y, ax.z], [ref.x, ref.y, ref.z], [{ t0: from, t1: to, r0: big, r1: big }]));
      }
      if (sh) {
        const mv = Math.abs(meshVolume(tool)), bv = Math.abs(K.volume(sh));
        if (mv > 0 && Math.abs(bv - mv) / mv < 0.05) threadShape = sh;
      }
    } catch {
      threadShape = null;
    }
  }
  try {
    if (f.method === 'cut') {
      if (!removeMaterial(tool, f.id, undefined, threadShape)) errors[f.id] = 'The thread does not touch the body.';
    } else addMaterial(tool, f.id, true, undefined, threadShape);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Delete Face */
export function buildDeleteFace(f: Extract<Feature, { type: 'deleteFace' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { errors, visibleBodies } = ctx;
  if (!f.faces.length) {
    errors[f.id] = 'Select the faces to delete.';
    return;
  }
  // the body holding the first face (its centroid on that body's surface)
  const p0 = new THREE.Vector3(...f.faces[0].point);
  const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
  if (!target) {
    errors[f.id] = 'Delete Face needs a body.';
    return;
  }
  const r = deleteFaces(target.geometry, f.faces, f.option);
  if (!r.geometry) {
    errors[f.id] = r.error ?? 'Could not delete the faces.';
    return;
  }
  target.geometry = r.geometry;
  target.featureIds.push(f.id);
}

/** Move/Copy Bodies */
export function buildMoveBody(f: Extract<Feature, { type: 'moveBody' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors, newBody, exactOf, setExact, moved, tick } = ctx;
  const targets = bodies.filter((b) => f.bodies.includes(b.id));
  if (!targets.length) {
    errors[f.id] = 'Select the bodies to move or copy.';
    return;
  }
  // one step: rotate about X, then Y, then Z through the origin point, then translate
  const o = new THREE.Vector3(...f.origin);
  const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(f.rotate.map((a) => (a * Math.PI) / 180) as [number, number, number]), 'XYZ'));
  const step = new THREE.Matrix4().makeTranslation(...f.translate).multiply(new THREE.Matrix4().makeTranslation(o.x, o.y, o.z)).multiply(rot)
    .multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z));
  for (const b of targets) {
    const ex = exactOf(b);
    if (f.copy) {
      const m = new THREE.Matrix4();
      for (let k = 0; k < Math.max(1, Math.min(250, Math.round(f.copies))); k++) {
        tick();
        m.premultiply(step);
        const nb = newBody(b.geometry.clone().applyMatrix4(m), f.id, moved(ex, m));
        nb.featureIds = [...b.featureIds, f.id];
      }
    } else {
      const sh = moved(ex, step);
      if (sh) setExact(b, sh);
      else b.geometry = b.geometry.clone().applyMatrix4(step);
      b.featureIds.push(f.id);
    }
  }
}

/** Delete/Keep Body */
export function buildDeleteBody(f: Extract<Feature, { type: 'deleteBody' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors } = ctx;
  const before = bodies.length;
  if (f.keep) { // Keep Bodies: every body that is not listed goes
    if (!f.bodies.some((id) => bodies.some((b) => b.id === id))) errors[f.id] = 'The bodies to keep are no longer there.';
    else for (let i = bodies.length - 1; i >= 0; i--) if (!f.bodies.includes(bodies[i].id)) bodies.splice(i, 1);
    return;
  }
  for (const id of f.bodies) {
    const i = bodies.findIndex((b) => b.id === id);
    if (i >= 0) bodies.splice(i, 1);
  }
  if (bodies.length === before) errors[f.id] = 'The bodies to delete are no longer there.';
}

/** Deform (point) */
export function buildDeform(f: Extract<Feature, { type: 'deform' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { errors, history, visibleBodies } = ctx;
  if (!f.point) {
    errors[f.id] = 'Select the face of the deform point.';
    return;
  }
  const p0 = new THREE.Vector3(...f.point);
  const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
  if (!target) {
    errors[f.id] = 'Deform needs a solid body.';
    return;
  }
  try {
    // the push goes into the body (against the face normal) unless reversed
    const dir = f.direction.map((x) => (f.reverse ? x : -x)) as [number, number, number];
    target.geometry = pointDeform(target.geometry, { point: f.point, direction: dir, distance: f.distance, radius: f.radius, stiffness: f.stiffness });
    target.featureIds.push(f.id);
    history.boss = target.geometry;
    history.cuts = [];
  } catch (err) {
    errors[f.id] = `Could not deform the body: ${(err as Error).message}`;
  }
}

/** Intersect */
export function buildIntersect(f: Extract<Feature, { type: 'intersect' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors, surfaceBodies, K, newBody, exactOf, isEmpty } = ctx;
  // Cap planar openings: a flat surface in the selection splits the solid into two closed regions
  const surfPick = f.bodies.map((id) => surfaceBodies.find((s) => s.id === id)).find((s): s is Body => !!s);
  if (surfPick) {
    const solid = f.bodies.map((id) => bodies.find((b) => b.id === id)).find((b): b is Body => !!b);
    const pl = fitPlane(surfPick.geometry);
    if (!solid || !pl) {
      errors[f.id] = !solid ? 'Select a solid body and a surface.' : 'The surface must be flat to cap the openings.';
      return;
    }
    if (!f.capPlanar) {
      errors[f.id] = 'Choose Cap planar openings to split a solid with a surface.';
      return;
    }
    try {
      const big = 1e4;
      const n = new THREE.Vector3(...pl.n), o = new THREE.Vector3(...pl.origin);
      const half = (s: number) => {
        const box = new THREE.BoxGeometry(big, big, big).toNonIndexed();
        box.translate(0, 0, (s * big) / 2);
        box.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
        box.translate(o.x, o.y, o.z);
        return box;
      };
      const regions: { key: 'common' | 'a' | 'b'; g: THREE.BufferGeometry }[] = [
        { key: 'a', g: csg(solid.geometry, half(1), 'intersect') },
        { key: 'b', g: csg(solid.geometry, half(-1), 'intersect') },
      ];
      const kept = regions.filter((r) => !f.exclude.includes(r.key) && !isEmpty(r.g));
      if (!kept.length) { errors[f.id] = 'All regions are excluded.'; return; }
      bodies.splice(bodies.indexOf(solid), 1);
      if (f.consumeSurfaces) surfaceBodies.splice(surfaceBodies.indexOf(surfPick), 1);
      if (f.merge) {
        let g = kept[0].g;
        for (const r of kept.slice(1)) g = csg(g, r.g, 'union');
        const nb = newBody(g, f.id);
        nb.featureIds = [...solid.featureIds, f.id];
      } else for (const r of kept) newBody(r.g, f.id);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return;
  }
  const picked = f.bodies.map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
  if (picked.length !== 2) {
    errors[f.id] = 'Select two solid bodies to intersect.';
    return;
  }
  // B-rep: two exact bodies give exact regions
  if (K && exactOf(picked[0]) && exactOf(picked[1])) {
    try {
      const [A, B] = picked;
      const ea = exactOf(A)!, eb = exactOf(B)!;
      const regs: { key: 'common' | 'a' | 'b'; s: BrepShape }[] = [
        { key: 'common', s: K.common(ea, eb) },
        { key: 'a', s: K.cut(ea, eb) },
        { key: 'b', s: K.cut(eb, ea) },
      ];
      const kept = regs.filter((r) => !f.exclude.includes(r.key) && K.volume(r.s) > 1e-9);
      if (!kept.length) { errors[f.id] = 'All regions are excluded.'; return; }
      // every OpenCascade step first: a failure leaves the bodies as they were (mesh kernel below)
      const merged = f.merge ? kept.slice(1).reduce((u, r) => K.fuse(u, r.s), kept[0].s) : null;
      const tess = kept.map((r) => K.tessellate(r.s));
      bodies.splice(bodies.indexOf(A), 1);
      bodies.splice(bodies.indexOf(B), 1);
      if (merged) {
        const nb = newBody(tess[0], f.id, merged);
        nb.featureIds = [...A.featureIds, ...B.featureIds, f.id];
      } else kept.forEach((r, i) => newBody(tess[i], f.id, r.s));
      return;
    } catch {
      /* the mesh kernel below */
    }
  }
  try {
    const [A, B] = picked;
    const regions: { key: 'common' | 'a' | 'b'; g: THREE.BufferGeometry }[] = [
      { key: 'common', g: csg(A.geometry, B.geometry, 'intersect') },
      { key: 'a', g: csg(A.geometry, B.geometry, 'subtract') },
      { key: 'b', g: csg(B.geometry, A.geometry, 'subtract') },
    ];
    const kept = regions.filter((r) => !f.exclude.includes(r.key) && !isEmpty(r.g));
    if (!kept.length) {
      errors[f.id] = 'All regions are excluded.';
      return;
    }
    bodies.splice(bodies.indexOf(A), 1);
    bodies.splice(bodies.indexOf(B), 1);
    if (f.merge) {
      let g = kept[0].g;
      for (const r of kept.slice(1)) g = csg(g, r.g, 'union');
      const nb = newBody(g, f.id);
      nb.featureIds = [...A.featureIds, ...B.featureIds, f.id];
    } else for (const r of kept) newBody(r.g, f.id);
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Combine */
export function buildCombine(f: Extract<Feature, { type: 'combine' }>, _body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors, history, K, exactOf, setExact, isEmpty } = ctx;
  const picked = f.bodies.map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
  if (picked.length < (f.op === 'subtract' ? 1 : 2) || (f.op === 'subtract' && !f.mainBody)) {
    errors[f.id] = f.op === 'subtract' ? 'Select a main body and the bodies to subtract.' : 'Select at least two bodies to combine.';
    return;
  }
  // B-rep: every picked body exact → the combination is exact
  if (K && picked.every((b) => exactOf(b)) && (f.op !== 'subtract' || exactOf(bodies.find((b) => b.id === f.mainBody)))) {
    try {
      if (f.op === 'subtract') {
        const main = bodies.find((b) => b.id === f.mainBody)!;
        let sh = exactOf(main)!;
        for (const b of picked) if (b !== main) sh = K.cut(sh, exactOf(b)!);
        const gone = picked.filter((b) => b !== main);
        setExact(main, sh);
        for (const b of gone) { history.cuts.push(b.geometry); bodies.splice(bodies.indexOf(b), 1); }
        main.featureIds.push(f.id);
      } else {
        const main = picked[0];
        let sh = exactOf(main)!;
        for (const b of picked.slice(1)) sh = f.op === 'add' ? K.fuse(sh, exactOf(b)!) : K.common(sh, exactOf(b)!);
        const empty = K.volume(sh) < 1e-9;
        for (const b of picked.slice(1)) bodies.splice(bodies.indexOf(b), 1);
        if (empty) { bodies.splice(bodies.indexOf(main), 1); errors[f.id] = 'The bodies have nothing in common.'; }
        else { setExact(main, sh); main.featureIds.push(f.id); }
      }
      return;
    } catch {
      /* the mesh kernel below */
    }
  }
  try {
    if (f.op === 'subtract') {
      const main = bodies.find((b) => b.id === f.mainBody);
      if (!main) { errors[f.id] = 'The main body no longer exists.'; return; }
      for (const b of picked) {
        if (b === main) continue;
        main.geometry = csg(main.geometry, b.geometry, 'subtract');
        history.cuts.push(b.geometry);
        bodies.splice(bodies.indexOf(b), 1);
      }
      main.featureIds.push(f.id);
    } else {
      const main = picked[0];
      for (const b of picked.slice(1)) {
        main.geometry = csg(main.geometry, b.geometry, f.op === 'add' ? 'union' : 'intersect');
        bodies.splice(bodies.indexOf(b), 1);
      }
      main.featureIds.push(f.id);
      if (isEmpty(main.geometry)) { bodies.splice(bodies.indexOf(main), 1); errors[f.id] = 'The bodies have nothing in common.'; }
    }
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Mirror ▸ Propagate visual properties: the face appearances, mirrored */
function mirrorAppearances(doc: Document, pl: PlaneDef, out: NonNullable<Document['faceAppearances']>): void {
  const o = new THREE.Vector3(...pl.origin), nn = new THREE.Vector3(...pl.n).normalize();
  for (const fa of doc.faceAppearances ?? []) {
    const p = new THREE.Vector3(...fa.point), n = new THREE.Vector3(...fa.normal);
    const mp = p.clone().sub(o).addScaledVector(nn, -2 * p.clone().sub(o).dot(nn)).add(o), mn = n.clone().addScaledVector(nn, -2 * n.dot(nn));
    out.push({ normal: [mn.x, mn.y, mn.z], point: [mp.x, mp.y, mp.z], color: fa.color });
  }
}
