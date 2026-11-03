/**
 * Helpers of the rebuild that stand on their own (kept apart from rebuild.ts for its line budget): the thread
 * specification of a Thread feature and the exact tool of a Hole Tool hole.
 */
import * as THREE from 'three';
import type { HoleFeature, PlaneDef } from '../document/types';
import type { Feature } from '../document/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import type { ThreadSpec } from './thread';
import { meshVolume, planarFaces } from './solid';
import { holeParts } from './pattern';

/** the helix and profile of a Thread feature (null without its start edge) */
export function threadSpecOf(f: Extract<Feature, { type: 'thread' }>): ThreadSpec | null {
  if (!f.edge) return null;
  const internal = f.internalOverride ?? f.edge.internal;
  const ax = new THREE.Vector3(...f.edge.axis).normalize();
  if (f.reverse) ax.negate();
  const off = f.offset ? f.offsetDistance ?? 0 : 0;
  const c0 = new THREE.Vector3(...f.edge.center);
  // optional start face: the thread starts where the axis meets it
  if (f.startFace) {
    const n = new THREE.Vector3(...f.startFace.normal), p = new THREE.Vector3(...f.startFace.point);
    const den = n.dot(ax);
    if (Math.abs(den) > 1e-6) c0.addScaledVector(ax, n.dot(p.clone().sub(c0)) / den);
  }
  c0.addScaledVector(ax, off);
  let length = f.endCondition === 'revolutions' ? (f.revolutions ?? 1) * f.pitch * Math.max(1, f.starts ?? 1) : f.length;
  if (f.endCondition === 'upTo' && f.upTo) {
    const n = new THREE.Vector3(...f.upTo.normal), p = new THREE.Vector3(...f.upTo.point);
    const den = n.dot(ax);
    if (Math.abs(den) > 1e-6) length = Math.max(f.pitch, p.clone().sub(c0).dot(n) / den);
  }
  return { center: [c0.x, c0.y, c0.z], axis: [ax.x, ax.y, ax.z], radius: internal ? (f.diameter - 1.0825 * f.pitch) / 2 : f.diameter / 2, internal, pitch: f.pitch, length, method: f.method, rightHand: f.rightHand, angle: f.angle, starts: f.starts, mirror: f.mirrorProfile };
}


/** the hole tool of holeTool() as an exact solid of revolution (the same parts; cylinders and cones are true surfaces) */
export function brepHoleTool(K: BrepKernel, f: HoleFeature, pl: PlaneDef, at: { x: number; y: number }, throughAll: number): BrepShape | null {
  try {
    const n: [number, number, number] = [-pl.n[0], -pl.n[1], -pl.n[2]];
    const start: [number, number, number] = [pl.origin[0] + pl.u[0] * at.x + pl.v[0] * at.y, pl.origin[1] + pl.u[1] * at.x + pl.v[1] * at.y, pl.origin[2] + pl.u[2] * at.x + pl.v[2] * at.y];
    const parts = holeParts(f, throughAll);
    return K.axisymmetric(start, n, pl.u, parts);
  } catch {
    return null;
  }
}

/** a tool without a B-rep version whose faces are all planar becomes an exact solid (gussets, vents, slots …) */
export function planarToolOf(K: BrepKernel | null, tool: THREE.BufferGeometry): BrepShape | null {
  if (!K) return null;
  try {
    const faces = planarFaces(tool, 'tool');
    if (!faces.length || faces.some((x) => x.curved)) return null;
    const sh = K.fromMesh(tool);
    if (!sh) return null;
    const mv = Math.abs(meshVolume(tool)), bv = Math.abs(K.volume(sh));
    return mv > 0 && Math.abs(bv - mv) / mv < 1e-3 ? sh : null;
  } catch {
    return null;
  }
}

/** a curved tool (wrap patch) as a polyhedral B-rep solid, so an exact body stays exact; null when the sewn solid does not match the mesh */
export function meshToolOf(K: BrepKernel | null, tool: THREE.BufferGeometry): BrepShape | null {
  if (!K) return null;
  try {
    const sh = K.fromMesh(tool);
    if (!sh) return null;
    const mv = Math.abs(meshVolume(tool)), bv = Math.abs(K.volume(sh));
    return mv > 0 && Math.abs(bv - mv) / mv < 1e-3 ? sh : null;
  } catch {
    return null;
  }
}
