import type { Sketch3DEdit } from '../store';
import { drag3DPoint, solve3D, type P3 } from '../../core/sketch/sketch3d';

// its own module so the viewport overlay can use it without loading the 3D sketch panel (QA 0.5.11 F174, start-up budget)
const same = (p: P3, q: P3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6;

/**
 * The 3D sketch after a change, solved with its relations and dimensions: with `drag` the end point at `from` goes to
 * `to` as far as the dimensions let it. Without dimensions the relations alone move the points (exactly, per
 * coordinate). Null when the dimensions cannot all hold (the change is refused).
 */
export function solved3D(e: Sketch3DEdit, drag?: { from: P3; to: P3 }): Sketch3DEdit | null {
  if (!e.dims?.length) {
    if (!drag) return e;
    const mv = drag3DPoint(e.segments, e.relations, drag.from, drag.to);
    return { ...e, segments: mv.segments, last: e.last && (same(e.last, drag.from) ? drag.to : mv.map(e.last)), fillets: e.fillets?.map((f) => ({ ...f, at: mv.map(f.at) })) };
  }
  const r = solve3D(e.segments, e.relations, e.dims, drag);
  if (!r.ok && !drag) return null;
  return { ...e, segments: r.segments, last: e.last && r.map(e.last), fillets: e.fillets?.map((f) => ({ ...f, at: r.map(f.at) })) };
}

