import * as THREE from 'three';
import type { Component, Mate } from '../document/types';
import type { Id } from '../sketch/types';
import { CYCLING_RATE, groundDistance, movingSide, solveMate, solveMatesReport, worldRef, type AssemblyRebuild, type MateSolveReport } from './assembly';

/**
 * The state of the mates of an assembly, as the intended design shows it (QA v0.5.1 F108):
 *   - a mate that is not met after solving conflicts with others (red, an error in the tree);
 *   - a component is (f) fixed, (-) under defined while it can still move, (+) over defined when one of its mates
 *     conflicts, and has no prefix when its mates leave it no freedom.
 * The freedom is measured: each of the six small motions of the component (three shifts, three turns) is tried, and
 * a motion counts as taken away when one of its mates pulls the component back. Only mates to fixed or fully defined
 * components count, so a part held to a part that can still move is itself still (-).
 */
export type ComponentState = 'fixed' | 'under' | 'full' | 'over';

export interface MateStatus {
  /** mates that are not met: they conflict with the others */
  violated: Set<Id>;
  /**
   * mates that are not met yet, but would be with more passes of the solver: the solver stopped before the chain
   * settled (QA 0.5.10 F166); not a conflict, the assembly reads as not converged
   */
  unconverged: Set<Id>;
  /** the largest remaining error of a mate (mm, plus a turn weighed as mm), 0 when every mate is met */
  residual: number;
  components: Record<Id, ComponentState>;
}

const EPS = 1e-3;

/** how far a mate would move its moving component: 0 when the mate is met */
function mateError(m: Mate, a: Component, b: Component, ground: Map<Id, number>): number {
  // concentric: the two axes on one line, whichever way each points (the direction of a cylinder's axis follows how
  // the face was picked, so a flip that another mate settles is no conflict)
  if (m.type === 'concentric' && !m.lockRotation) {
    const A = worldRef(m.refs[0], a), B = worldRef(m.refs[1], b);
    const n = A.n.clone().normalize(), off = B.p.clone().sub(A.p);
    return (1 - Math.abs(n.dot(B.n.clone().normalize()))) * 50 + off.sub(n.multiplyScalar(off.dot(n))).length();
  }
  const idx = movingSide(a, b, ground);
  const mov = idx === 1 ? b : a, fix = idx === 1 ? a : b;
  return poseDelta(mov, solveMate(m, fix, mov, idx));
}

function poseDelta(p: Component, q: Component): number {
  const t = Math.hypot(q.position[0] - p.position[0], q.position[1] - p.position[1], q.position[2] - p.position[2]);
  const dot = Math.abs(p.rotation[0] * q.rotation[0] + p.rotation[1] * q.rotation[1] + p.rotation[2] * q.rotation[2] + p.rotation[3] * q.rotation[3]);
  return t + 2 * Math.acos(Math.min(1, dot)) * 50;
}

/** the component moved by one of its six small motions (shift along an axis, turn about an axis through its origin) */
function nudge(c: Component, k: number): Component {
  if (k < 3) {
    const p = [...c.position] as [number, number, number];
    p[k] += EPS;
    return { ...c, position: p };
  }
  const axis = new THREE.Vector3(k === 3 ? 1 : 0, k === 4 ? 1 : 0, k === 5 ? 1 : 0);
  const q = new THREE.Quaternion().setFromAxisAngle(axis, EPS).multiply(new THREE.Quaternion(...c.rotation));
  return { ...c, rotation: [q.x, q.y, q.z, q.w] };
}

/** the correction a mate applies to a nudged component, as six numbers (shift, turn) */
function correction(before: Component, after: Component): number[] {
  const q0 = new THREE.Quaternion(...before.rotation), q1 = new THREE.Quaternion(...after.rotation);
  const dq = q1.multiply(q0.invert());
  const s = Math.sign(dq.w) || 1;
  const turn = [dq.x * 2 * s, dq.y * 2 * s, dq.z * 2 * s];
  return [after.position[0] - before.position[0], after.position[1] - before.position[1], after.position[2] - before.position[2], ...turn].map((v) => v / EPS);
}

/** the number of independent vectors (Gram-Schmidt) */
function rank(vectors: number[][]): number {
  const basis: number[][] = [];
  for (const v0 of vectors) {
    let v = v0.slice();
    for (const b of basis) {
      const d = v.reduce((s, x, i) => s + x * b[i], 0);
      v = v.map((x, i) => x - d * b[i]);
    }
    const n = Math.hypot(...v);
    if (n > 0.05) basis.push(v.map((x) => x / n));
  }
  return basis.length;
}

/** the motions of `c` that the given mates take away (0–6), each mate pulling against its other component */
function constrainedMotions(c: Component, mates: Mate[], byId: Map<Id, Component>): number {
  if (!mates.length) return 0;
  const columns: number[][] = [];
  for (let k = 0; k < 6; k++) {
    const moved = nudge(c, k);
    const col: number[] = [];
    for (const m of mates) {
      const idx: 0 | 1 = m.refs[1].componentId === c.id ? 1 : 0;
      const other = byId.get(m.refs[idx === 1 ? 0 : 1].componentId);
      if (!other) continue;
      col.push(...correction(moved, solveMate(m, other, moved, idx, (id) => byId.get(id))));
    }
    columns.push(col);
  }
  return rank(columns);
}

/** a mate whose references carry their geometry (a reference without a normal and a point cannot be measured) */
const measurable = (m: Mate) => m.refs?.length === 2 && m.refs.every((r) => Array.isArray(r.normal) && Array.isArray(r.point));

/**
 * The convergence rule, explicit (QA 0.5.11 and 0.5.13 F186): a mate is met when its error is at most MATE_TOLERANCE
 * (mm, a turn weighed as mm). What a mate that is not met means comes from the solver's own report of its solve
 * (solveMatesReport: whether its passes settled, how fast they still contracted, which mate it had to leave out), not
 * from a longer solve of its own:
 *   - the mate the solver left out so that the others settle: a conflict (the newest mate that makes the difference);
 *   - a mate the solved positions meet: the given positions were only not solved yet, "not converged";
 *   - a mate the solved positions do not meet either: a conflict when the solver settled (it can move nothing more, as
 *     between two fixed parts) or when its passes went back and forth (move ratio at least CYCLING_RATE), and
 *     "not converged" when the passes still contracted as they stopped.
 */
export const MATE_TOLERANCE = 1e-3;

/** the solver's report of an assembly rebuild, when that rebuild solved exactly these components and mates (else none) */
export function reportOf(rebuild: Partial<AssemblyRebuild> | null | undefined, components: Component[] | undefined, mates: Mate[] | undefined): MateSolveReport | undefined {
  const r = rebuild?.mateReport;
  return r && r.from.components === components && r.from.mates === mates ? r : undefined;
}

/**
 * The state of the mates. `report` is the solver's report for these components and mates (the assembly rebuild keeps
 * it); without one the solver runs once here, the same solve the rebuild makes.
 */
export function mateStatus(components: Component[], mates: Mate[], report?: MateSolveReport): MateStatus {
  const active = mates.filter((m) => !m.suppressed && measurable(m));
  const byId = new Map(components.map((c) => [c.id, c]));
  const ground = groundDistance(components, active);
  const violated = new Set<Id>();
  let residual = 0;
  const errorsOf = (comps: Map<Id, Component>) => {
    const out = new Map<Id, number>();
    for (const m of active) {
      const a = comps.get(m.refs[0].componentId), b = comps.get(m.refs[1].componentId);
      if (a && b && a !== b) out.set(m.id, mateError(m, a, b, ground));
    }
    return out;
  };
  const unmet: Id[] = [];
  for (const [id, e] of errorsOf(byId)) { residual = Math.max(residual, e); if (e > MATE_TOLERANCE) unmet.push(id); }
  const unconverged = new Set<Id>();
  if (unmet.length) {
    const rep = report ?? solveMatesReport(components.filter((c) => !c.suppressed), mates);
    const solved = errorsOf(new Map(rep.out.map((c) => [c.id, c])));
    const stuck = rep.settled || rep.rate >= CYCLING_RATE;
    for (const id of unmet) {
      if (id === rep.conflict) violated.add(id);
      else if ((solved.get(id) ?? Infinity) <= MATE_TOLERANCE || !stuck) unconverged.add(id);
      else violated.add(id);
    }
    // the mate added last is the one marked, as the intended design marks it (QA 0.5.10 F141): the solver left it out,
    // also where the given positions happen to meet it and an older mate is the one off
    if (rep.conflict && active.some((m) => m.id === rep.conflict)) {
      violated.add(rep.conflict);
      for (const id of [...violated]) if (id !== rep.conflict && (solved.get(id) ?? Infinity) <= MATE_TOLERANCE) violated.delete(id);
    }
  }
  const state: Record<Id, ComponentState> = {};
  for (const c of components) if (c.fixed) state[c.id] = 'fixed';
  for (const m of active) if (violated.has(m.id)) for (const r of m.refs) if (state[r.componentId] !== 'fixed') state[r.componentId] = 'over';
  // fully defined: no freedom left by mates to fixed or fully defined components, repeated until nothing changes
  for (let changed = true; changed; ) {
    changed = false;
    for (const c of components) {
      if (state[c.id]) continue;
      const held = active.filter((m) => !violated.has(m.id) && m.refs.some((r) => r.componentId === c.id) && m.refs.every((r) => r.componentId === c.id || state[r.componentId] === 'fixed' || state[r.componentId] === 'full'));
      if (held.length && constrainedMotions(c, held, byId) >= 6) { state[c.id] = 'full'; changed = true; }
    }
  }
  for (const c of components) if (!state[c.id]) state[c.id] = 'under';
  return { violated, unconverged, residual, components: state };
}
