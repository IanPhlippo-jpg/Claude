import type { Sketch } from './types';

/** the rectangle drawn last in the sketch: its four sides as a closed chain at the end of the entity order */
export function lastRectangle(sk: Sketch): string[] | null {
  const lines: { id: string; p1: string; p2: string }[] = [];
  for (let i = sk.entityOrder.length - 1; i >= 0 && lines.length < 4; i--) {
    const e = sk.entities[sk.entityOrder[i]];
    if (!e) continue;
    if (e.kind === 'point' || (e.kind === 'line' && e.construction)) continue;
    if (e.kind !== 'line') return null;
    lines.unshift({ id: e.id, p1: e.p1, p2: e.p2 });
  }
  if (lines.length !== 4) return null;
  for (let i = 0; i < 4; i++) if (lines[i].p2 !== lines[(i + 1) % 4].p1) return null;
  return lines.map((l) => l.id);
}


/** the polygon drawn last (Polygon tool): its construction circle, sides, centre, circle diameter and the angle of the first vertex */
export function lastPolygon(sk: Sketch): { circleId: string; lineIds: string[]; center: { x: number; y: number }; diameter: number; angle: number } | null {
  for (let i = sk.entityOrder.length - 1; i >= 0; i--) {
    const c = sk.entities[sk.entityOrder[i]];
    if (!c || c.kind !== 'circle' || !c.construction) continue;
    // the sides tied to this circle (tangent sides or vertices on it)
    const tied = new Set<string>();
    for (const k of sk.constraintOrder) {
      const r = sk.constraints[k];
      if (r.kind === 'tangent' && r.refs.includes(c.id)) r.refs.filter((x) => x !== c.id && sk.entities[x]?.kind === 'line').forEach((x) => tied.add(x));
      if (r.kind === 'pointOnEntity' && r.refs[1] === c.id) {
        for (const id of sk.entityOrder) { const e = sk.entities[id]; if (e?.kind === 'line' && (e.p1 === r.refs[0] || e.p2 === r.refs[0])) tied.add(id); }
      }
    }
    if (tied.size < 3) continue;
    const lineIds = sk.entityOrder.filter((id) => tied.has(id));
    const first = sk.entities[lineIds[0]] as { p1: string };
    const ctr = sk.points[c.center], v = sk.points[first.p1];
    return { circleId: c.id, lineIds, center: { x: ctr.x, y: ctr.y }, diameter: 2 * sk.scalars[c.r], angle: (Math.atan2(v.y - ctr.y, v.x - ctr.x) * 180) / Math.PI };
  }
  return null;
}
