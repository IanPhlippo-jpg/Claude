import * as THREE from 'three';
import type { Component, Document, Mate } from '../document/types';
type Id = string;
import { componentMatrix } from './assembly';
import { evaluateExpression } from '../document/equations';

/**
 * A motor of a motion study, as the original's Motor PropertyManager: rotary (turns the component about its
 * concentric mate axis) or linear (an actuator moving it along that axis), with a motion profile.
 */
export interface Motor {
  id: Id;
  name: string;
  componentId: Id;
  /** Motor Type: rotary (default) or linear (actuator) */
  kind?: 'rotary' | 'linear';
  /** constant speed, oscillating, distance (a move in a time), segments (piecewise speeds) or an expression of t */
  motion: 'constant' | 'oscillating' | 'distance' | 'segments' | 'expression';
  /** constant speed: RPM (rotary) */
  rpm: number;
  /** constant speed of a linear motor (mm/s) */
  speed?: number;
  amplitude: number;
  frequency: number;
  reverse: boolean;
  /** Distance: the angle (degrees) or length (mm), from the start time over the duration */
  distance?: number;
  start?: number;
  duration?: number;
  /** Segments: from t0 to t1 the speed (RPM, or mm/s for a linear motor) */
  segments?: { t0: number; t1: number; value: number }[];
  /** Expression: the angle (degrees) or displacement (mm) as a function of time t (seconds) */
  expression?: string;
  /** More Options ▸ Load-bearing faces (passed to a structural study) */
  loadFaces?: string[];
}
/** kept for older files and callers */
export type RotaryMotor = Motor;

/** Autokey / Add Key: a component's pose at a time of the study */
export interface MotionKey {
  componentId: Id;
  time: number;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

/** Basic Motion: a linear spring between two components (attachment points in their local frames) */
export interface MotionSpring {
  id: Id;
  name: string;
  a: { componentId: Id; point: [number, number, number] };
  b: { componentId: Id; point: [number, number, number] };
  /** stiffness (N/mm), free length (mm), damping (N·s/mm) */
  k: number;
  freeLength: number;
  damping: number;
}

/** Animation Wizard steps: turn the model, or explode / collapse it, between two times */
export interface WizardStep {
  kind: 'rotate' | 'explode' | 'collapse';
  axis?: 'x' | 'y' | 'z';
  turns?: number;
  clockwise?: boolean;
  start: number;
  duration: number;
}

export interface MotionStudy {
  name: string;
  /** length of the study in seconds */
  duration: number;
  motors: Motor[];
  /** Type of Study: Animation (keys and motors) or Basic Motion (gravity, springs, contact) */
  type?: 'animation' | 'basic';
  /** Playback Mode */
  playback?: 'normal' | 'loop' | 'reciprocate';
  keys?: MotionKey[];
  springs?: MotionSpring[];
  /** Contact: groups of components that do not pass through each other */
  contacts?: { id: Id; name: string; componentIds: Id[] }[];
  /** Gravity: direction and acceleration (mm/s², 9810 = Earth) */
  gravity?: { dir: [number, number, number]; g: number };
  wizard?: WizardStep[];
  /** Motion Study Properties: frames per second of the calculation and of a saved animation */
  fps?: number;
}

/** The rotation axis of a motor: the concentric mate of its component (world), else the component's own z axis. */
export function motorAxis(doc: Document, comps: Component[], motor: Motor): { point: THREE.Vector3; dir: THREE.Vector3 } | null {
  const c = comps.find((x) => x.id === motor.componentId);
  if (!c) return null;
  const m = componentMatrix(c);
  const mate = (doc.mates ?? []).find((x) => x.type === 'concentric' && x.refs.some((r) => r.componentId === c.id));
  if (mate) {
    const ref = mate.refs.find((r) => r.componentId === c.id)!;
    const point = new THREE.Vector3(...ref.point).applyMatrix4(m);
    const dir = new THREE.Vector3(...ref.normal).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m)).normalize();
    return { point, dir };
  }
  return { point: new THREE.Vector3(...c.position), dir: new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(...c.rotation)) };
}

/**
 * Components that turn with the motor's component: neighbours whose mates stop a rotation about the axis
 * (a plane not square to the axis, a concentric mate on another axis, a lock) are carried along, transitively;
 * a free bearing (concentric on the axis, faces square to it) lets the neighbour stand still. Fixed parts never move.
 */
export function movingComponents(doc: Document, comps: Component[], motorComp: Id, axis: { point: THREE.Vector3; dir: THREE.Vector3 }, linear = false): Set<Id> {
  const byId = new Map(comps.map((c) => [c.id, c]));
  const moving = new Set<Id>([motorComp]);
  const queue = [motorComp];
  const locks = (mate: Mate, from: Id): boolean => {
    const ref = mate.refs.find((r) => r.componentId === from);
    const c = ref ? byId.get(ref.componentId) : undefined;
    if (!ref || !c) return false;
    if (mate.type === 'lock') return true;
    const n = new THREE.Vector3(...ref.normal).applyMatrix3(new THREE.Matrix3().setFromMatrix4(componentMatrix(c))).normalize();
    // a linear motor slides along the axis: a face square to the axis is pushed along, a concentric bearing slides
    if (linear) return mate.type !== 'concentric' && !ref.cylindrical && Math.abs(Math.abs(n.dot(axis.dir)) - 1) < 1e-3;
    if (mate.type === 'concentric' || ref.cylindrical) {
      if (mate.lockRotation) return true;
      const p = new THREE.Vector3(...ref.point).applyMatrix4(componentMatrix(c));
      const off = p.clone().sub(axis.point);
      const across = off.clone().addScaledVector(axis.dir, -off.dot(axis.dir)).length();
      return Math.abs(Math.abs(n.dot(axis.dir)) - 1) > 1e-3 || across > 1e-3;
    }
    // planar mates: a face square to the axis lets the part turn, any other face stops it
    return Math.abs(Math.abs(n.dot(axis.dir)) - 1) > 1e-3;
  };
  while (queue.length) {
    const cur = queue.shift()!;
    for (const mate of doc.mates ?? []) {
      const ids = mate.refs.map((r) => r.componentId);
      if (!ids.includes(cur)) continue;
      const other = ids.find((x) => x !== cur);
      if (!other || moving.has(other)) continue;
      const oc = byId.get(other);
      if (!oc || oc.fixed) continue;
      if (locks(mate, cur)) {
        moving.add(other);
        queue.push(other);
      }
    }
  }
  return moving;
}

/** the speed of a Segments profile at time t, integrated from 0: the travelled value (degrees for RPM, mm for mm/s) */
function segmentsValue(m: Motor, t: number, rotary: boolean): number {
  let v = 0;
  for (const s of m.segments ?? []) {
    const a = Math.max(0, Math.min(t, s.t1) - s.t0);
    if (a > 0) v += (rotary ? s.value * 6 : s.value) * a;
  }
  return v;
}

/** Motor value at time t: the angle in degrees (rotary) or the displacement in mm (linear). */
export function motorValue(m: Motor, t: number): number {
  const rotary = (m.kind ?? 'rotary') === 'rotary';
  let a: number;
  switch (m.motion) {
    case 'oscillating': a = m.amplitude * Math.sin(2 * Math.PI * m.frequency * t); break;
    case 'distance': { const d = Math.max(1e-6, m.duration ?? 1); a = (m.distance ?? 90) * Math.max(0, Math.min(1, (t - (m.start ?? 0)) / d)); break; }
    case 'segments': a = segmentsValue(m, t, rotary); break;
    case 'expression':
      try {
        a = evaluateExpression(m.expression || '0', (n) => (n === 't' ? t : n === 'pi' ? Math.PI : n === 'e' ? Math.E : undefined), { radians: true });
      } catch {
        a = 0;
      }
      break;
    default: a = rotary ? (m.rpm * 360 * t) / 60 : (m.speed ?? 10) * t;
  }
  return m.reverse ? -a : a;
}
/** Motor angle (degrees) at time t (rotary motors). */
export const motorAngle = motorValue;

/** a component's pose interpolated between its keys (the document pose is the key at time 0) */
export function keyedPose(c: Component, keys: MotionKey[], t: number): { position: THREE.Vector3; rotation: THREE.Quaternion } | null {
  const mine = keys.filter((k) => k.componentId === c.id).sort((a, b) => a.time - b.time);
  if (!mine.length) return null;
  const all = [{ time: 0, position: c.position, rotation: c.rotation }, ...mine.filter((k) => k.time > 1e-9)];
  let i = 0;
  while (i < all.length - 1 && all[i + 1].time <= t) i++;
  const a = all[i], b = all[Math.min(i + 1, all.length - 1)];
  const u = b.time > a.time ? Math.max(0, Math.min(1, (t - a.time) / (b.time - a.time))) : 0;
  return { position: new THREE.Vector3(...a.position).lerp(new THREE.Vector3(...b.position), u), rotation: new THREE.Quaternion(...a.rotation).slerp(new THREE.Quaternion(...b.rotation), u) };
}

/** Basic Motion results: per frame the translation of every moving component */
export interface MotionSim {
  fps: number;
  frames: Record<Id, [number, number, number][]>;
}

/**
 * Basic Motion (as the original's: approximate, fast): components without mates that are not fixed are rigid
 * bodies pushed by gravity and springs; within a Contact group they stop where their boxes meet (no bounce).
 * Units: mm, s, g (mass from the bodies' volume and density), N.
 */
export function simulateBasic(comps: Component[], bodies: { id: Id; geometry: THREE.BufferGeometry; mass: number }[], study: MotionStudy, mates: Mate[]): MotionSim {
  const fps = study.fps ?? 25;
  const sub = 8;
  const dt = 1 / (fps * sub);
  const mated = new Set(mates.flatMap((m) => m.refs.map((r) => r.componentId)));
  const byId = new Map(comps.map((c) => [c.id, c]));
  const box0 = new Map<Id, THREE.Box3>();
  for (const b of bodies) {
    b.geometry.computeBoundingBox();
    if (b.geometry.boundingBox) box0.set(b.id, b.geometry.boundingBox.clone());
  }
  const springIds = new Set((study.springs ?? []).flatMap((s) => [s.a.componentId, s.b.componentId]));
  const movers = comps.filter((c) => !c.fixed && !c.suppressed && !mated.has(c.id) && (study.gravity || springIds.has(c.id)) && box0.has(c.id)).map((c) => c.id);
  const massOf = new Map(bodies.map((b) => [b.id, Math.max(1e-6, b.mass / 1000)]));
  const pos = new Map<Id, THREE.Vector3>(movers.map((id) => [id, new THREE.Vector3()]));
  const vel = new Map<Id, THREE.Vector3>(movers.map((id) => [id, new THREE.Vector3()]));
  const frames: Record<Id, [number, number, number][]> = Object.fromEntries(movers.map((id) => [id, []]));
  const contactPartners = (id: Id): Id[] => (study.contacts ?? []).filter((c) => c.componentIds.includes(id)).flatMap((c) => c.componentIds).filter((x) => x !== id);
  const boxAt = (id: Id) => { const b = box0.get(id)!.clone(); const p = pos.get(id); return p ? b.translate(p) : b; };
  const world = (s: MotionSpring['a']) => {
    const c = byId.get(s.componentId);
    const p = c ? new THREE.Vector3(...s.point).applyMatrix4(componentMatrix(c)) : new THREE.Vector3(...s.point);
    return p.add(pos.get(s.componentId) ?? new THREE.Vector3());
  };
  const g = study.gravity ? new THREE.Vector3(...study.gravity.dir).normalize().multiplyScalar(study.gravity.g) : null;
  const n = Math.round(study.duration * fps);
  for (let f = 0; f <= n; f++) {
    for (const id of movers) frames[id].push(pos.get(id)!.toArray() as [number, number, number]);
    for (let s = 0; s < sub; s++) {
      const acc = new Map<Id, THREE.Vector3>(movers.map((id) => [id, g ? g.clone() : new THREE.Vector3()]));
      for (const sp of study.springs ?? []) {
        const pa = world(sp.a), pb = world(sp.b);
        const d = pb.clone().sub(pa);
        const L = d.length() || 1e-9;
        const u = d.divideScalar(L);
        const va = vel.get(sp.a.componentId) ?? new THREE.Vector3(), vb = vel.get(sp.b.componentId) ?? new THREE.Vector3();
        // force on a toward b (N): stretched pulls, compressed pushes; damping on the relative speed along the spring
        const F = sp.k * (L - sp.freeLength) + sp.damping * vb.clone().sub(va).dot(u);
        for (const [id, sign] of [[sp.a.componentId, 1], [sp.b.componentId, -1]] as const) {
          const a = acc.get(id);
          if (a) a.addScaledVector(u, (sign * F * 1000) / massOf.get(id)!);
        }
      }
      for (const id of movers) {
        const v = vel.get(id)!.addScaledVector(acc.get(id)!, dt);
        const p = pos.get(id)!;
        const prev = p.clone();
        p.addScaledVector(v, dt);
        // Contact: stop where the box meets a partner (the move of this substep is taken back, the speed is lost)
        const hit = contactPartners(id).some((o) => box0.has(o) && boxAt(id).intersectsBox(boxAt(o)) && !box0.get(id)!.clone().translate(prev).intersectsBox(boxAt(o)));
        if (hit) {
          p.copy(prev);
          v.set(0, 0, 0);
        }
      }
    }
  }
  return { fps, frames };
}

/** the turning centre of the model (Animation Wizard): the middle of the components' positions */
function modelCentre(comps: Component[]): THREE.Vector3 {
  const c = new THREE.Vector3();
  for (const x of comps) c.add(new THREE.Vector3(...x.position));
  return comps.length ? c.divideScalar(comps.length) : c;
}

/** World-space display transforms of the moving components at time t (bodies are already placed in the world). */
export function motionTransforms(doc: Document, comps: Component[], study: MotionStudy, t: number, sim?: MotionSim | null): Map<Id, THREE.Matrix4> {
  const out = new Map<Id, THREE.Matrix4>();
  const add = (id: Id, m: THREE.Matrix4) => out.set(id, (out.get(id) ?? new THREE.Matrix4()).premultiply(m));
  // keys (Autokey / Add Key): the interpolated pose against the document pose
  for (const c of comps) {
    const p = keyedPose(c, study.keys ?? [], t);
    if (!p) continue;
    const now = new THREE.Matrix4().compose(p.position, p.rotation, new THREE.Vector3(1, 1, 1));
    add(c.id, now.multiply(componentMatrix(c).invert()));
  }
  // Basic Motion: the calculated translations
  if (sim && (study.type ?? 'animation') === 'basic') {
    const f = Math.min(Math.round(t * sim.fps), Number.MAX_SAFE_INTEGER);
    for (const [id, fr] of Object.entries(sim.frames)) {
      const p = fr[Math.min(f, fr.length - 1)];
      if (p) add(id, new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]));
    }
  }
  for (const motor of study.motors) {
    const axis = motorAxis(doc, comps, motor);
    if (!axis) continue;
    const linear = motor.kind === 'linear';
    const v = motorValue(motor, t);
    const m = linear
      ? new THREE.Matrix4().makeTranslation(axis.dir.x * v, axis.dir.y * v, axis.dir.z * v)
      : new THREE.Matrix4().makeTranslation(axis.point.x, axis.point.y, axis.point.z)
          .multiply(new THREE.Matrix4().makeRotationAxis(axis.dir, (v * Math.PI) / 180))
          .multiply(new THREE.Matrix4().makeTranslation(-axis.point.x, -axis.point.y, -axis.point.z));
    for (const id of movingComponents(doc, comps, motor.componentId, axis, linear)) add(id, m);
  }
  // Animation Wizard: explode / collapse along the explode steps, then turn the whole model
  for (const w of study.wizard ?? []) {
    const u = Math.max(0, Math.min(1, (t - w.start) / Math.max(1e-6, w.duration)));
    if (w.kind === 'explode' || w.kind === 'collapse') {
      const k = w.kind === 'explode' ? u : 1 - u;
      for (const step of doc.explodeSteps ?? []) {
        const d = new THREE.Vector3(...step.dir).normalize().multiplyScalar(step.distance * k);
        step.componentIds.forEach((id, i) => add(id, new THREE.Matrix4().makeTranslation(d.x * (step.autoSpace ? i + 1 : 1), d.y * (step.autoSpace ? i + 1 : 1), d.z * (step.autoSpace ? i + 1 : 1))));
      }
    } else {
      const c = modelCentre(comps);
      const axis = new THREE.Vector3(w.axis === 'x' ? 1 : 0, w.axis === 'y' || !w.axis ? 1 : 0, w.axis === 'z' ? 1 : 0);
      const ang = (w.clockwise ? -1 : 1) * 2 * Math.PI * (w.turns ?? 1) * u;
      const r = new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeRotationAxis(axis, ang)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      for (const x of comps) add(x.id, r);
    }
  }
  return out;
}

/** Playback Mode: the study time for a play time (Loop starts again, Reciprocate runs back) */
export function playbackTime(mode: MotionStudy['playback'], playTime: number, duration: number): { t: number; done: boolean } {
  if (mode === 'loop') return { t: playTime % duration, done: false };
  if (mode === 'reciprocate') {
    const k = playTime % (2 * duration);
    return { t: k <= duration ? k : 2 * duration - k, done: false };
  }
  return { t: Math.min(playTime, duration), done: playTime >= duration };
}
