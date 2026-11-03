// The exact (B-rep) versions of the plastic part features (QA 0.5.11 F51 / F121, parity rows 16 and 31): the tools
// of the Mounting Boss fins, the Snap Hook and the Lip/Groove as prisms of the same outlines the mesh kernel extrudes,
// and the Indent as the same booleans on the exact solids with their exact offsets. Every function gives null when
// there is no kernel or the kernel fails: the rebuild then builds the feature on the mesh kernel.
import type { PlaneDef } from '../document/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import { asCircle, type PrismPiece, type RimBandPiece } from './plastics';

type P2 = [number, number];
const segments = (loop: P2[]) => loop.map((a, i) => ({ a: { x: a[0], y: a[1] }, b: { x: loop[(i + 1) % loop.length][0], y: loop[(i + 1) % loop.length][1] } }));
const at = (plane: PlaneDef, p: P2, z = 0): [number, number, number] => [0, 1, 2].map((k) => plane.origin[k] + plane.u[k] * p[0] + plane.v[k] * p[1] + plane.n[k] * z) as [number, number, number];

/** the prism of a tool piece (a fin of a mounting boss, a snap hook) */
export function prismShape(K: BrepKernel | null, p: PrismPiece): BrepShape | null {
  if (!K) return null;
  try {
    return K.extrudeLoop(p.plane, segments(p.loop), 0, p.depth);
  } catch {
    return null;
  }
}

/**
 * the band of a lip or groove: the grown outline minus the opening, from z0 to z1 along the rim face's normal. Round
 * opening: a ring between two true cylinders (the opening's radius and that plus the width); otherwise the outline
 * as the tessellation gives it (straight rims are exact, a curved stretch of a rim keeps its facets)
 */
export function bandShape(K: BrepKernel | null, b: RimBandPiece): BrepShape | null {
  if (!K) return null;
  try {
    const circle = asCircle(b.inner);
    if (circle) {
      const c = at(b.plane, circle.c), n = b.plane.n as [number, number, number], u = b.plane.u as [number, number, number];
      const ring = K.axisymmetric(c, n, u, [{ t0: b.z0, t1: b.z1, r0: circle.r + b.width, r1: circle.r + b.width }]);
      return K.cut(ring, K.axisymmetric(c, n, u, [{ t0: b.z0 - 1, t1: b.z1 + 1, r0: circle.r, r1: circle.r }]));
    }
    const outer = K.extrudeLoop(b.plane, segments(b.outer), b.z0, b.z1 - b.z0);
    const hole = K.extrudeLoop(b.plane, segments(b.inner), b.z0 - 1, b.z1 - b.z0 + 2);
    return outer && hole ? K.cut(outer, hole) : null;
  } catch {
    return null;
  }
}

/**
 * Indent on the exact solids: the target minus the tool grown by the clearance and, unless Cut, plus a wall of the
 * thickness around it (the tool grown by clearance + thickness); null when a body is not exact or the kernel fails
 */
export function indentShape(K: BrepKernel | null, target: BrepShape | null, tool: BrepShape | null, clearance: number, thickness: number, cut: boolean): BrepShape | null {
  if (!K || !target || !tool || (!cut && !(thickness > 0))) return null;
  try {
    const inner = clearance > 0 ? K.offset(tool, clearance) : tool;
    const res = cut ? K.cut(target, inner) : K.cut(K.fuse(target, K.offset(tool, clearance + thickness)), inner);
    return K.volume(res) > 1e-9 ? res : null;
  } catch {
    return null;
  }
}
