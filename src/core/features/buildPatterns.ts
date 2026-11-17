/**
 * The builder of the patterns (Linear, Circular, Sketch, Curve Driven, Table Driven, Fill and Variable Pattern), moved
 * out of the feature loop of rebuild.ts (QA 0.5.14 P2-14). A pattern of many instances checks the wall-clock budget
 * of the rebuild after every instance (ctx.tick, P2-5d), so one pattern cannot run far over it.
 */
import * as THREE from 'three';
import type { Sketch } from '../sketch/types';
import { isSketchBased, type Document, type PatternFeature, type PlaneDef, type SketchBasedFeature } from '../document/types';
import type { Id } from '../sketch/types';
import type { Body } from './rebuild';
import { featureGeometry, regionCentre } from './rebuild';
import type { BrepShape } from './brepKernel';
import { RebuildStopped, type RebuildCtx } from './rebuildState';
import { sketchRegions } from './regions';
import { mergeGeometries, planeMatrix } from './solid';
import { patternInstances, translated } from './pattern';
import { curveInstances, fillInstances, tableInstances } from './patterns2';
import { solveSketch } from '../solver/solver';
import { resolvePlaneDef } from './planes';

/** the ends of an extrusion that depend on the body: such a seed is rebuilt at every instance */
const BODY_BOUND_ENDS: string[] = ['upToNext', 'upToSurface', 'offsetFromSurface', 'upToBody', 'upToVertex'];

/** the rigid transform an instance function applies (read off three probe points) */
export function instanceMatrix(inst: (g: THREE.BufferGeometry) => THREE.BufferGeometry): THREE.Matrix4 {
  const probe = new THREE.BufferGeometry();
  probe.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  const a = inst(probe).getAttribute('position');
  const p = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const o = p(0);
  return new THREE.Matrix4().makeBasis(p(1).sub(o), p(2).sub(o), p(3).sub(o)).setPosition(o);
}

/** the pattern as patternInstances takes it: Up to reference turns into a spacing, Instance spacing into a total angle */
export function patternSpec(doc: Document, f: PatternFeature, seed: SketchBasedFeature | undefined): PatternFeature {
  let out = f;
  if (f.type === 'linearPattern' && f.upTo1 && f.dir1 && seed) {
    const sk = doc.sketches[seed.sketchId];
    const rg = sk ? sketchRegions(sk) : [];
    if (sk && rg.length) {
      const cs = regionCentre(rg[0]);
      const c0 = new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, sk.plane)));
      const pl = resolvePlaneDef(doc, f.upTo1.plane);
      const n = new THREE.Vector3(...pl.n), ax = new THREE.Vector3(...f.dir1.axis).normalize();
      const den = n.dot(ax);
      if (Math.abs(den) > 1e-6) {
        const dist = n.dot(new THREE.Vector3(...pl.origin).sub(c0)) / den - f.upTo1.offset;
        const cnt = Math.max(2, f.dir1.count);
        if (dist > 1e-6) out = { ...out, dir1: { ...f.dir1, spacing: dist / (cnt - 1) } };
      }
    }
  }
  return out;
}

/**
 * The document an instance k of a pattern is built in: the seed's own sketch with its dimensions varied, moved (and
 * solved again) to the instance place (Vary sketch, Dimensions to vary, a seed whose end depends on the body)
 */
function instanceDocument(doc: Document, f: PatternFeature, sk: Sketch, m: THREE.Matrix4, k: number): Document {
  const pl = resolvePlaneDef(doc, sk.plane);
  let isk = sk;
  if (f.varyDims?.length) {
    const constraints = { ...isk.constraints };
    for (const vd of f.varyDims) {
      const c = constraints[vd.constraintId];
      if (c && c.value !== undefined) constraints[vd.constraintId] = { ...c, value: c.value + vd.increment * (k + 1) };
    }
    isk = solveSketch({ ...isk, constraints }).sketch;
  }
  if (f.varySketch) {
    // Vary sketch: the free points move with the instance, points fixed to the origin / Fix stay: solve again
    const t = new THREE.Vector3(...pl.origin).applyMatrix4(m).sub(new THREE.Vector3(...pl.origin));
    const du = t.dot(new THREE.Vector3(...pl.u)), dv = t.dot(new THREE.Vector3(...pl.v));
    const fixed = new Set<Id>([isk.origin, ...Object.values(isk.constraints).filter((c) => c.kind === 'fix').flatMap((c) => c.refs)]);
    for (const c of Object.values(isk.constraints)) if (c.kind === 'coincident' && c.refs.includes(isk.origin)) for (const r of c.refs) fixed.add(r);
    const points = Object.fromEntries(Object.entries(isk.points).map(([id, p]) => [id, fixed.has(id) ? p : { ...p, x: p.x + du, y: p.y + dv }]));
    isk = solveSketch({ ...isk, points }).sketch;
    return { ...doc, sketches: { ...doc.sketches, [sk.id]: isk } };
  }
  const o = new THREE.Vector3(...pl.origin).applyMatrix4(m), u = new THREE.Vector3(...pl.u).transformDirection(m);
  const v = new THREE.Vector3(...pl.v).transformDirection(m), n = new THREE.Vector3(...pl.n).transformDirection(m);
  const pid = `${sk.plane}@${f.id}:${k}`;
  const plane: PlaneDef = { id: pid, name: pid, origin: [o.x, o.y, o.z], u: [u.x, u.y, u.z], v: [v.x, v.y, v.z], n: [n.x, n.y, n.z], kind: 'face' };
  return { ...doc, planes: { ...doc.planes, [pid]: plane }, sketches: { ...doc.sketches, [sk.id]: { ...isk, plane: pid } } };
}

/** the patterns: copies of bodies, then the instances of the seed features (added or cut) */
export function buildPattern(f: PatternFeature, body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, bodies, errors, history, K, addMaterial, removeMaterial, addBoss, newBody, exactOf, extraAppearances, toolOf, moved, tick } = ctx;
  if (!body) {
    errors[f.id] = 'A pattern needs an existing solid body.';
    return;
  }
  const seeds = f.featureIds.map((id) => doc.features.find((x) => x.id === id))
    .filter((x): x is SketchBasedFeature => !!x && isSketchBased(x) && x.type !== 'sketch');
  const patBodies = (f.bodies ?? []).map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
  if (!seeds.length && !patBodies.length) {
    errors[f.id] = 'Select the features or bodies to pattern.';
    return;
  }
  // Bodies to pattern: copies of whole bodies (linear / circular), then the features (if any)
  if (patBodies.length && (f.type === 'linearPattern' || f.type === 'circularPattern')) {
    const insts = patternInstances(patternSpec(doc, f, seeds[0]));
    for (const b of patBodies) {
      for (const [k, inst] of insts.entries()) {
        if (f.skip?.includes(k)) continue;
        tick();
        newBody(inst(b.geometry), f.id, moved(exactOf(b), instanceMatrix(inst)));
      }
    }
    if (!seeds.length) return;
  }
  body.geometry.computeBoundingSphere();
  const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
  let instances: ((g: THREE.BufferGeometry) => THREE.BufferGeometry)[];
  if (f.type === 'sketchPattern') {
    // every point of the reference sketch gets an instance, moved from the centroid of the seed's profile
    const ref = f.sketchId ? doc.sketches[f.sketchId] : undefined;
    if (!ref) {
      errors[f.id] = 'Select the reference sketch with the points.';
      return;
    }
    const seedSketch = doc.sketches[seeds[0].sketchId];
    const seedRegions = seedSketch ? sketchRegions(seedSketch) : [];
    if (!seedSketch || !seedRegions.length) {
      errors[f.id] = 'The seed feature has no profile.';
      return;
    }
    const cs = regionCentre(seedRegions[0]);
    // Reference point: the seed's centroid, or the selected point
    const c0 = f.refPoint
      ? new THREE.Vector3(...f.refPoint)
      : new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, seedSketch.plane)));
    const rm = planeMatrix(resolvePlaneDef(doc, ref.plane));
    const pts = ref.entityOrder.map((id) => ref.entities[id]).filter((e) => e.kind === 'point').map((e) => {
      const q = ref.points[(e as { p: string }).p];
      return new THREE.Vector3(q.x, q.y, 0).applyMatrix4(rm);
    });
    instances = pts
      .map((p) => p.clone().sub(c0))
      .filter((v) => v.length() > 1e-6)
      .map((v) => (g: THREE.BufferGeometry) => { const c = g.clone(); c.translate(v.x, v.y, v.z); return c; });
  } else if (f.type === 'curvePattern' || f.type === 'tablePattern' || f.type === 'fillPattern' || f.type === 'variablePattern') {
    // the seed's position: the centroid of its first profile
    const seedSketch = doc.sketches[seeds[0].sketchId];
    const seedRegions = seedSketch ? sketchRegions(seedSketch) : [];
    if (!seedSketch || !seedRegions.length) {
      errors[f.id] = 'The seed feature has no profile.';
      return;
    }
    const cs = regionCentre(seedRegions[0]);
    const c0 = new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, seedSketch.plane)));
    if (f.type === 'curvePattern') {
      const r = curveInstances(doc, f, c0);
      if (r.error) {
        errors[f.id] = r.error;
        return;
      }
      instances = r.instances;
    } else if (f.type === 'tablePattern') instances = tableInstances(doc, f, seedSketch.plane);
    else if (f.type === 'fillPattern') {
      if (!f.fill) {
        errors[f.id] = 'Select the fill boundary (a planar face).';
        return;
      }
      instances = fillInstances(f, c0);
    } else return buildVariablePattern(f, seeds, body, extent, ctx);
  } else instances = patternInstances(patternSpec(doc, f, seeds[0]));
  if (!instances.length) {
    errors[f.id] = 'The pattern needs at least two instances.';
    return;
  }
  // Propagate visual properties: appearances on the seed's faces are copied to every instance
  if (f.propagateVisual !== false && doc.faceAppearances?.length) {
    for (const seed of seeds) {
      const sg = featureGeometry(doc, seed, extent, body?.geometry).geometry;
      if (!sg) continue;
      sg.computeBoundingBox();
      const box = sg.boundingBox!.clone().expandByScalar(0.05);
      for (const fa of doc.faceAppearances) {
        if (!box.containsPoint(new THREE.Vector3(...fa.point))) continue;
        for (const [k, inst] of instances.entries()) {
          if (f.skip?.includes(k)) continue;
          const m = instanceMatrix(inst);
          const p = new THREE.Vector3(...fa.point).applyMatrix4(m);
          const n = new THREE.Vector3(...fa.normal).transformDirection(m);
          extraAppearances.push({ ...fa, point: [p.x, p.y, p.z], normal: [n.x, n.y, n.z] });
        }
      }
    }
  }
  try {
    for (const seed of seeds) {
      const g = featureGeometry(doc, seed, extent, body?.geometry).geometry;
      if (!g) continue;
      // the seed's tool as a B-rep solid: every instance is that solid moved (exact patterns)
      const seedShape = toolOf(seed, extent, g);
      const sk = doc.sketches[seed.sketchId];
      const bodyBound = seed.type === 'extrude' && BODY_BOUND_ENDS.includes(seed.end);
      const perInstance = !!sk && (f.varySketch || !!f.varyDims?.length || (!f.geometryPattern && bodyBound));
      // mesh kernel: the cut tools of the instances are gathered and, when no two overlap, cut as one tool (one
      // boolean instead of one per instance: a 8 × 8 hole pattern went from 30 s to about a second, QA F46)
      const batch: THREE.BufferGeometry[] = [];
      for (const [k, inst] of instances.entries()) {
        if (f.skip?.includes(k)) continue;
        // one pattern never runs far over the rebuild budget (QA 0.5.14 P2-5d)
        tick();
        let ig: THREE.BufferGeometry | null = null;
        let ish: BrepShape | null = null;
        if (perInstance && sk) {
          ig = featureGeometry(instanceDocument(doc, f, sk, instanceMatrix(inst), k), seed, extent, body?.geometry).geometry;
        } else {
          ig = inst(g);
          ish = moved(seedShape, instanceMatrix(inst));
        }
        if (!ig) continue;
        if (seed.type === 'helix') continue;
        const boss = seed.type === 'rib' || seed.type === 'baseFlange' || seed.op === 'boss';
        if (boss) {
          addMaterial(ig, f.id, true, undefined, ish ?? undefined);
          addBoss(ig);
        } else {
          if (!K) batch.push(ig);
          else removeMaterial(ig, f.id, undefined, ish ?? undefined);
          history.cuts.push(ig);
        }
      }
      if (batch.length) {
        const boxes = batch.map((g) => { g.computeBoundingBox(); return g.boundingBox!.clone().expandByScalar(1e-4); });
        const apart = boxes.every((a, i) => boxes.every((b, j) => j <= i || !a.intersectsBox(b)));
        if (apart && batch.length > 1) removeMaterial(mergeGeometries(batch.map((g) => (g.index ? g.toNonIndexed() : g))), f.id);
        else for (const g of batch) { tick(); removeMaterial(g, f.id); }
      }
    }
    body.featureIds.push(f.id);
  } catch (err) {
    if (err instanceof RebuildStopped) throw err;
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Variable Pattern: every row is the seed rebuilt with its own dimension values, moved along the direction */
function buildVariablePattern(f: PatternFeature, seeds: SketchBasedFeature[], body: Body, extent: number, ctx: RebuildCtx): void {
  const { doc, errors, history, addMaterial, removeMaterial, addBoss, tick } = ctx;
  const rows = f.variable?.rows ?? [];
  const dir = new THREE.Vector3(...(f.variable?.dir ?? [1, 0, 0])).normalize();
  try {
    for (const seed of seeds) {
      for (const [k, row] of rows.entries()) {
        if (f.skip?.includes(k)) continue;
        tick();
        const sk = doc.sketches[seed.sketchId];
        let vdoc = doc;
        if (sk && Object.keys(row.values).length) {
          const constraints = { ...sk.constraints };
          for (const [cid, val] of Object.entries(row.values)) if (constraints[cid]) constraints[cid] = { ...constraints[cid], value: val };
          const solved = solveSketch({ ...sk, constraints }).sketch;
          vdoc = { ...doc, sketches: { ...doc.sketches, [sk.id]: solved } };
        }
        if (seed.type === 'helix') continue;
        const g = featureGeometry(vdoc, seed, extent, body?.geometry).geometry;
        if (!g) continue;
        const ig = translated(g, dir.clone().multiplyScalar(row.offset));
        const boss = seed.type === 'rib' || seed.type === 'baseFlange' || seed.op === 'boss';
        if (boss) {
          addMaterial(ig, f.id, true);
          addBoss(ig);
        } else {
          removeMaterial(ig, f.id);
          history.cuts.push(ig);
        }
      }
    }
    body.featureIds.push(f.id);
  } catch (err) {
    if (err instanceof RebuildStopped) throw err;
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}
