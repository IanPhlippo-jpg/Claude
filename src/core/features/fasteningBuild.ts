// The rebuild of the Stud Tool and of the plastic part features (Dome, Indent, Mounting Boss, Snap Hook,
// Lip/Groove, QA v0.5.1 F121), apart from rebuild.ts (line budget). rebuild.ts hands over its helpers.
import * as THREE from 'three';
import type { Document, Feature, StudFeature } from '../document/types';
import type { PlasticsFeature } from '../document/plasticsTypes';
import type { Id } from '../sketch/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import type { Body } from './rebuild';
import { resolvePlaneDef } from './planes';
import { domeTool, faceLoops, indentGeometry, mountingBossTools, pickedFaceOn, rimBand, snapHookTool, type AxisPiece } from './plastics';

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
  if (f.reverse) c.removeMaterial(tool, f.id, [hit.body.id]);
  else c.addMaterial(tool, f.id, true, [hit.body.id]);
}

function buildIndent(f: Extract<PlasticsFeature, { type: 'indent' }>, c: FasteningContext): void {
  const target = c.bodies.find((b) => b.id === f.target), tool = c.bodies.find((b) => b.id === f.tool);
  if (!target || !tool) { c.errors[f.id] = 'Select the target body and the tool body.'; return; }
  if (target === tool) { c.errors[f.id] = 'The tool body must be another body than the target.'; return; }
  target.geometry = indentGeometry(target.geometry, tool.geometry, Math.max(0, f.clearance), f.thickness, f.cut);
  target.featureIds.push(f.id);
}

function buildMountingBoss(f: Extract<PlasticsFeature, { type: 'mountingBoss' }>, c: FasteningContext): void {
  if (!c.body) { c.errors[f.id] = 'A mounting boss needs an existing solid body.'; return; }
  const t = mountingBossTools(f, resolvePlaneDef(c.doc, f.plane));
  if ('error' in t) { c.errors[f.id] = t.error; return; }
  for (const p of t.add) { c.addMaterial(p.tool, f.id, true, undefined, p.axis ? axisShape(c.K, p.axis) : undefined); c.addBoss(p.tool); }
  for (const p of t.cut) c.removeMaterial(p.tool, f.id, undefined, axisShape(c.K, p.axis));
}

function buildSnapHook(f: Extract<PlasticsFeature, { type: 'snapHook' }>, c: FasteningContext): void {
  if (!c.body) { c.errors[f.id] = 'A snap hook needs an existing solid body.'; return; }
  const t = snapHookTool(f, resolvePlaneDef(c.doc, f.plane));
  if ('error' in t) { c.errors[f.id] = t.error; return; }
  c.addMaterial(t, f.id, true);
  c.addBoss(t);
}

function buildLipGroove(f: Extract<PlasticsFeature, { type: 'lipGroove' }>, c: FasteningContext): void {
  if (!f.lipFace || !f.grooveFace) { c.errors[f.id] = 'Select the rim face for the lip and the rim face for the groove.'; return; }
  const lip = faceOnBodies(c, f.lipFace), groove = faceOnBodies(c, f.grooveFace);
  if (!lip || !groove) { c.errors[f.id] = 'A rim face of the lip or the groove is no longer there.'; return; }
  if (lip.body === groove.body) { c.errors[f.id] = 'The lip and the groove go on two different bodies.'; return; }
  const g = rimBand(groove.body.geometry, groove.face, f.width + f.clearance, f.height + f.clearance, true);
  if ('error' in g) { c.errors[f.id] = g.error; return; }
  const l = rimBand(lip.body.geometry, lip.face, f.width, f.height, false);
  if ('error' in l) { c.errors[f.id] = l.error; return; }
  c.removeMaterial(g, f.id, [groove.body.id]);
  c.addMaterial(l, f.id, true, [lip.body.id]);
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
