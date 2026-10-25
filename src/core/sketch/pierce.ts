import * as THREE from 'three';
import type { Document } from '../document/types';
import type { Id, Sketch } from './types';
import { sampleEntity } from './geometry';
import { resolvePlaneDef } from '../features/planes';

/** where the curves of the other sketches pass through this sketch's plane (sketch coordinates), with their entity */
export function piercePoints(doc: Document, sketch: Sketch): { x: number; y: number; sketchId: Id; entityId: Id }[] {
  const pl = resolvePlaneDef(doc, sketch.plane);
  const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v), n = new THREE.Vector3(...pl.n);
  const out: { x: number; y: number; sketchId: Id; entityId: Id }[] = [];
  for (const other of Object.values(doc.sketches)) {
    if (other.id === sketch.id) continue;
    const op = resolvePlaneDef(doc, other.plane);
    const oo = new THREE.Vector3(...op.origin), ou = new THREE.Vector3(...op.u), ov = new THREE.Vector3(...op.v);
    for (const id of other.entityOrder) {
      const e = other.entities[id];
      if (!e || e.kind === 'point' || e.kind === 'text') continue;
      const pts = sampleEntity(other, e, 64).map((p) => oo.clone().addScaledVector(ou, p.x).addScaledVector(ov, p.y));
      for (let i = 1; i < pts.length; i++) {
        const da = pts[i - 1].clone().sub(o).dot(n), db = pts[i].clone().sub(o).dot(n);
        if ((da > 1e-9 && db > 1e-9) || (da < -1e-9 && db < -1e-9) || Math.abs(da - db) < 1e-12) continue;
        const t = da / (da - db);
        const w = pts[i - 1].clone().lerp(pts[i], t).sub(o);
        out.push({ x: w.dot(u), y: w.dot(v), sketchId: other.id, entityId: id });
      }
    }
  }
  return out;
}

/** the pierce relations of a sketch with their targets updated to where their curve crosses the plane now */
export function refreshPierce(doc: Document, sketch: Sketch): Sketch {
  const list = Object.values(sketch.constraints).filter((c) => c.kind === 'pierce' && c.pierce);
  if (!list.length) return sketch;
  const pts = piercePoints(doc, sketch);
  const constraints = { ...sketch.constraints };
  let changed = false;
  for (const c of list) {
    const p = sketch.points[c.refs[0]];
    const cand = pts.filter((q) => q.sketchId === c.pierce!.sketchId && q.entityId === c.pierce!.entityId);
    if (!p || !cand.length) continue;
    const best = cand.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (!c.target || Math.abs(c.target.x - best.x) > 1e-9 || Math.abs(c.target.y - best.y) > 1e-9) {
      constraints[c.id] = { ...c, target: { x: best.x, y: best.y } };
      changed = true;
    }
  }
  return changed ? { ...sketch, constraints } : sketch;
}
