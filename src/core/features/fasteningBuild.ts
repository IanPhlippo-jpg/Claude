// The rebuild of the Stud Tool and of the plastic part features (Dome, Indent, Mounting Boss, Snap Hook,
// Lip/Groove, QA v0.5.1 F121), apart from rebuild.ts (line budget). rebuild.ts hands over its helpers.
import * as THREE from 'three';
import type { Document, Feature, StudFeature } from '../document/types';
import type { PlasticsFeature } from '../document/plasticsTypes';
import type { Id } from '../sketch/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import type { Body } from './rebuild';
import { resolvePlaneDef } from './planes';
import { csg } from './solid';
import { area2, asCircle, domeTool, faceLoops, indentGeometry, mountingBossTools, pickedFaceOn, prismGeometry, rimBandGeometry, rimBandPiece, snapHookPiece, type AxisPiece } from './plastics';
import { bandShape, indentShape, prismShape } from './plasticsExact';
import type { PlaneDef } from '../document/types';
import type { DomeFeature } from '../document/plasticsTypes';

export interface FasteningContext {
  doc: Document;
  bodies: Body[];
  /** the first visible body (the default target) */
  body: Body | undefined;
  visibleBodies(): Body[];
  errors: Record<Id, string>;
  curves: { id: Id; name: string; points: THREE.Vector3[]; dashed?: boolean; color?: string }[];
  K: BrepKernel | null;
  addMaterial(tool: THREE.BufferGeometry, fid: Id, merge: boolean, scope?: Id[], toolShape?: BrepShape | null): void;
  removeMaterial(tool: THREE.BufferGeometry, fid: Id, scope?: Id[], toolShape?: BrepShape | null): boolean;
  addBoss(g: THREE.BufferGeometry): void;
  /** the B-rep solid of a body while it is exact, and making a body exact (the Indent changes a body in place) */
  exactOf(b: Body): BrepShape | null;
  setExact(b: Body, shape: BrepShape): void;
}

export const isFasteningFeature = (f: Feature): f is StudFeature | PlasticsFeature => ['stud', 'dome', 'indent', 'mountingBoss', 'snapHook', 'lipGroove'].includes(f.type);

export function buildFastening(f: StudFeature | PlasticsFeature, c: FasteningContext): void {
  try {
    if (f.type === 'stud') buildStud(f, c);
    else if (f.type === 'dome') buildDome(f, c);
    else if (f.type === 'indent') buildIndent(f, c);
    else if (f.type === 'mountingBoss') buildMountingBoss(f, c);
    else if (f.type === 'snapHook') buildSnapHook(f, c);
    else buildLipGroove(f, c);
  } catch (err) {
    c.errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** a B-rep cone or cylinder segment for an axis piece, or null (no kernel, or the kernel failed) */
function axisShape(K: BrepKernel | null, a?: AxisPiece): BrepShape | null {
  if (!K || !a) return null;
  try {
    return K.axisymmetric(a.base.toArray() as [number, number, number], a.n.toArray() as [number, number, number], a.u.toArray() as [number, number, number], [{ t0: a.z0, t1: a.z1, r0: a.r0, r1: a.r1 }]);
  } catch {
    return null;
  }
}

/** the visible body that holds a picked planar face, with that face */
function faceOnBodies(c: FasteningContext, ref: { normal: [number, number, number]; point: [number, number, number] }) {
  for (const b of c.visibleBodies()) {
    const face = pickedFaceOn(b.geometry, b.id, ref);
    if (face) return { body: b, face };
  }
  return null;
}

function buildDome(f: Extract<PlasticsFeature, { type: 'dome' }>, c: FasteningContext): void {
  if (!f.face) { c.errors[f.id] = 'Select a planar face to dome.'; return; }
  const hit = faceOnBodies(c, f.face);
  if (!hit) { c.errors[f.id] = 'The face of the dome is no longer there.'; return; }
  const fl = faceLoops(hit.body.geometry, hit.face);
  if (!fl) { c.errors[f.id] = 'The outline of the face could not be found.'; return; }
  const tool = domeTool(fl.loops[0], fl.plane, f);
  if ('error' in tool) { c.errors[f.id] = tool.error; return; }
  const shape = domeShape(c.K, fl.loops[0], fl.plane, f);
  if (f.reverse) c.removeMaterial(tool, f.id, [hit.body.id], shape);
  else c.addMaterial(tool, f.id, true, [hit.body.id], shape);
}

/**
 * the exact dome (QA 0.5.10 F51): on a round face a segment of the sphere through the face's edge with the dome's
 * height; on a polygon the sphere through the farthest corners, kept within the prism of the face (the dome rises
 * straight up from the edges). The half ellipsoid and the continuous dome have no exact version: null, the mesh tool
 * builds them and the body continues faceted (said in the rebuild warnings).
 */
function domeShape(K: BrepKernel | null, loop: [number, number][], plane: PlaneDef, f: Pick<DomeFeature, 'distance' | 'reverse' | 'elliptical' | 'continuous'>): BrepShape | null {
  if (!K) return null;
  try {
    const circle = asCircle(loop);
    if (circle && f.elliptical) return null;
    if (!circle && f.continuous && loop.length !== 4) return null;
    const h = f.distance > 0 ? f.distance : circle ? circle.r : 0;
    if (!(h > 0)) return null;
    const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n).normalize();
    const sign = f.reverse ? -1 : 1;
    const at = (p: [number, number], z: number) => o.clone().addScaledVector(u, p[0]).addScaledVector(v, p[1]).addScaledVector(n, z);
    let centre2: [number, number], R: number;
    if (circle) { centre2 = circle.c; R = circle.r; }
    else {
      const A = area2(loop);
      const cc: [number, number] = [0, 0];
      loop.forEach((a, i) => { const b = loop[(i + 1) % loop.length], w = a[0] * b[1] - b[0] * a[1]; cc[0] += (a[0] + b[0]) * w; cc[1] += (a[1] + b[1]) * w; });
      centre2 = [cc[0] / (6 * A), cc[1] / (6 * A)];
      R = Math.max(...loop.map((p) => Math.hypot(p[0] - centre2[0], p[1] - centre2[1])));
    }
    // the sphere through the rim circle of radius R at the face, rising h above it
    const Rs = (R * R + h * h) / (2 * h);
    // the cap is the band of the sphere from the rim's latitude up to the pole, with the sphere's axis along the
    // dome's axis: with the poles (and the seam) elsewhere the boolean with the pad and its tessellation went wrong
    // (release pass 0.5.11: exact 90 000 instead of 53 768, or a tessellation short of the dome). On a round face
    // the cap sits exactly on the face; on a polygon it is sunk a hair, then kept within the prism of the face
    const sink = circle ? 0 : 0.002;
    const axis = n.clone().multiplyScalar(sign);
    const lat1 = Math.asin(Math.max(-1, 1 - (h + sink) / Rs));
    let seg = K.sphere(at(centre2, sign * (h - Rs)).toArray() as [number, number, number], Rs, axis.toArray() as [number, number, number], lat1, Math.PI / 2);
    const sunk = at(centre2, -sign * sink);
    if (!circle) {
      const prism = K.extrudeLoop({ ...plane, origin: sunk.toArray() as PlaneDef['origin'], n: n.clone().multiplyScalar(sign).toArray() as PlaneDef['n'] }, loop.map((a, i) => ({ a: { x: a[0], y: a[1] }, b: { x: loop[(i + 1) % loop.length][0], y: loop[(i + 1) % loop.length][1] } })), 0, h + 1);
      if (!prism) return null;
      seg = K.common(seg, prism);
    }
    return seg;
  } catch {
    return null;
  }
}

function buildIndent(f: Extract<PlasticsFeature, { type: 'indent' }>, c: FasteningContext): void {
  const target = c.bodies.find((b) => b.id === f.target), tool = c.bodies.find((b) => b.id === f.tool);
  if (!target || !tool) { c.errors[f.id] = 'Select the target body and the tool body.'; return; }
  if (target === tool) { c.errors[f.id] = 'The tool body must be another body than the target.'; return; }
  const clearance = Math.max(0, f.clearance);
  // exact (QA 0.5.11 F51): the same booleans on the B-rep solids with their exact offsets; the mesh kernel otherwise
  const shape = indentShape(c.K, c.exactOf(target), c.exactOf(tool), clearance, f.thickness, f.cut);
  if (shape) c.setExact(target, shape);
  else target.geometry = indentGeometry(target.geometry, tool.geometry, clearance, f.thickness, f.cut);
  target.featureIds.push(f.id);
}

function buildMountingBoss(f: Extract<PlasticsFeature, { type: 'mountingBoss' }>, c: FasteningContext): void {
  if (!c.body) { c.errors[f.id] = 'A mounting boss needs an existing solid body.'; return; }
  const t = mountingBossTools(f, resolvePlaneDef(c.doc, f.plane));
  if ('error' in t) { c.errors[f.id] = t.error; return; }
  // the boss and its fins become one tool first, then that is added to the body once: added piece by piece, the mesh
  // boolean left a sliver of the face under a fin next to the boss (0.18 mm out, e2e model of 0.5.11)
  let tool: THREE.BufferGeometry | null = t.add[0].tool;
  try {
    for (const p of t.add.slice(1)) tool = csg(tool, p.tool, 'union');
  } catch {
    tool = null;
  }
  const shapes = t.add.map((p) => (p.axis ? axisShape(c.K, p.axis) : p.prism ? prismShape(c.K, p.prism) : null));
  if (tool) {
    let shape: BrepShape | null = null;
    try {
      if (c.K && shapes.every((x) => x)) shape = shapes.slice(1).reduce<BrepShape>((u, x) => c.K!.fuse(u, x!), shapes[0]!);
    } catch {
      shape = null;
    }
    c.addMaterial(tool, f.id, true, undefined, shape);
    c.addBoss(tool);
  } else t.add.forEach((p, i) => { c.addMaterial(p.tool, f.id, true, undefined, shapes[i]); c.addBoss(p.tool); });
  for (const p of t.cut) c.removeMaterial(p.tool, f.id, undefined, axisShape(c.K, p.axis));
}

function buildSnapHook(f: Extract<PlasticsFeature, { type: 'snapHook' }>, c: FasteningContext): void {
  if (!c.body) { c.errors[f.id] = 'A snap hook needs an existing solid body.'; return; }
  const p = snapHookPiece(f, resolvePlaneDef(c.doc, f.plane));
  if ('error' in p) { c.errors[f.id] = p.error; return; }
  const t = prismGeometry(p);
  if (!t) { c.errors[f.id] = 'Could not build the hook.'; return; }
  c.addMaterial(t, f.id, true, undefined, prismShape(c.K, p));
  c.addBoss(t);
}

function buildLipGroove(f: Extract<PlasticsFeature, { type: 'lipGroove' }>, c: FasteningContext): void {
  if (!f.lipFace || !f.grooveFace) { c.errors[f.id] = 'Select the rim face for the lip and the rim face for the groove.'; return; }
  const lip = faceOnBodies(c, f.lipFace), groove = faceOnBodies(c, f.grooveFace);
  if (!lip || !groove) { c.errors[f.id] = 'A rim face of the lip or the groove is no longer there.'; return; }
  if (lip.body === groove.body) { c.errors[f.id] = 'The lip and the groove go on two different bodies.'; return; }
  const gp = rimBandPiece(groove.body.geometry, groove.face, f.width + f.clearance, f.height + f.clearance, true);
  if ('error' in gp) { c.errors[f.id] = gp.error; return; }
  const lp = rimBandPiece(lip.body.geometry, lip.face, f.width, f.height, false);
  if ('error' in lp) { c.errors[f.id] = lp.error; return; }
  const g = rimBandGeometry(gp), l = rimBandGeometry(lp);
  if (!g || !l) { c.errors[f.id] = 'Could not build the lip.'; return; }
  c.removeMaterial(g, f.id, [groove.body.id], bandShape(c.K, gp));
  c.addMaterial(l, f.id, true, [lip.body.id], bandShape(c.K, lp));
}

function buildStud(f: StudFeature, c: FasteningContext): void {
  const { bodies, body, errors, curves, K } = c;
  if (f.onCylinder) {
    // Apply to cylindrical body: the cylinder gets the (cosmetic) thread from its end over the thread length
    const cc = new THREE.Vector3(...f.onCylinder.center), ax = new THREE.Vector3(...f.onCylinder.axis).normalize();
    const ref = (Math.abs(ax.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(ax).normalize();
    const w = ax.clone().cross(ref);
    // the end of the cylinder: the farthest point of the bodies along the axis near it
    let top = -Infinity;
    for (const b of bodies) {
      const pa = (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).getAttribute('position');
      for (let i = 0; i < pa.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pa, i);
        const rel = p.clone().sub(cc);
        const radial = rel.clone().addScaledVector(ax, -rel.dot(ax)).length();
        if (radial <= f.onCylinder.radius + 1e-3) top = Math.max(top, rel.dot(ax));
      }
    }
    if (!Number.isFinite(top)) { errors[f.id] = 'The cylinder is no longer there.'; return; }
    if (f.cosmetic !== false) {
      const minor = f.onCylinder.radius - 0.6134 * f.pitch;
      for (const [k, h] of [[0, top], [1, top - f.threadLength]] as [number, number][]) {
        const ring: THREE.Vector3[] = [];
        for (let a = 0; a <= 48; a++) { const t = (a / 48) * Math.PI * 2; ring.push(cc.clone().addScaledVector(ax, h).addScaledVector(ref, minor * Math.cos(t)).addScaledVector(w, minor * Math.sin(t))); }
        curves.push({ id: `${f.id}:thread${k}`, name: 'Cosmetic Thread', points: ring, dashed: true });
      }
    }
    body?.featureIds.push(f.id);
    return;
  }
  if (!body) { errors[f.id] = 'A stud needs an existing solid body.'; return; }
  const pl = resolvePlaneDef(c.doc, f.plane);
  const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v), n = new THREE.Vector3(...pl.n).normalize();
  const base = o.clone().addScaledVector(u, f.point.x).addScaledVector(v, f.point.y);
  const g = new THREE.CylinderGeometry(f.diameter / 2, f.diameter / 2, f.length + 0.5, 48, 1, false);
  g.translate(0, (f.length + 0.5) / 2 - 0.5, 0);
  const m = new THREE.Matrix4().makeBasis(u, n, u.clone().cross(n));
  m.setPosition(base);
  g.applyMatrix4(m);
  const tool = g.toNonIndexed();
  tool.computeVertexNormals();
  // B-rep: a true cylinder
  const studShape = axisShape(K, { base, n, u, z0: -0.5, z1: f.length, r0: f.diameter / 2, r1: f.diameter / 2 });
  c.addMaterial(tool, f.id, true, undefined, studShape);
  c.addBoss(tool);
  // cosmetic thread: dashed circles at the minor diameter at the top and at the end of the thread
  const minor = f.diameter / 2 - 0.6134 * f.pitch;
  for (const [k, h] of (f.cosmetic === false ? [] : [[0, f.length], [1, f.length - Math.min(f.length, f.threadLength)]]) as [number, number][]) {
    const ring: THREE.Vector3[] = [];
    for (let a = 0; a <= 48; a++) {
      const t = (a / 48) * Math.PI * 2;
      ring.push(base.clone().addScaledVector(n, h).addScaledVector(u, minor * Math.cos(t)).addScaledVector(n.clone().cross(u), minor * Math.sin(t)));
    }
    curves.push({ id: `${f.id}:thread${k}`, name: 'Cosmetic Thread', points: ring, dashed: true });
  }
}
