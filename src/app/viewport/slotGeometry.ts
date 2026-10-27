import type { SketchPoint } from '../../core/sketch/types';

const dist = (a: SketchPoint, b: SketchPoint) => Math.hypot(b.x - a.x, b.y - a.y);

/** Geometry of a straight slot: centreline a→b (centre-point variant: a is the centre) and the half width. */
export function slotGeometry(p0: SketchPoint, p1: SketchPoint, w: SketchPoint, centered: boolean): { a: SketchPoint; b: SketchPoint; half: number; a1: SketchPoint; b1: SketchPoint; a2: SketchPoint; b2: SketchPoint } | null {
  const a = centered ? { x: 2 * p0.x - p1.x, y: 2 * p0.y - p1.y } : p0;
  const b = p1;
  const len = dist(a, b);
  if (len < 1e-9) return null;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const nrm = { x: -dir.y, y: dir.x };
  const half = Math.abs((w.x - a.x) * nrm.x + (w.y - a.y) * nrm.y);
  if (half < 1e-6) return null;
  return {
    a,
    b,
    half,
    a1: { x: a.x + nrm.x * half, y: a.y + nrm.y * half },
    b1: { x: b.x + nrm.x * half, y: b.y + nrm.y * half },
    a2: { x: a.x - nrm.x * half, y: a.y - nrm.y * half },
    b2: { x: b.x - nrm.x * half, y: b.y - nrm.y * half },
  };
}

/** Outline of a slot as a closed polyline (two lines, two semicircles). */
export function slotOutline(g: NonNullable<ReturnType<typeof slotGeometry>>): SketchPoint[] {
  const out: SketchPoint[] = [g.a1, g.b1];
  const arc = (c: SketchPoint, from: SketchPoint) => {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    for (let i = 1; i < 16; i++) {
      const t = a0 - (i / 16) * Math.PI; // clockwise half turn
      out.push({ x: c.x + g.half * Math.cos(t), y: c.y + g.half * Math.sin(t) });
    }
  };
  arc(g.b, g.b1);
  out.push(g.b2, g.a2);
  arc(g.a, g.a2);
  out.push(g.a1);
  return out;
}
