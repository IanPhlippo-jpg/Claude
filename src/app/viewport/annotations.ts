import type { Constraint, Entity, Id, Sketch, SketchPoint } from '../../core/sketch/types';
import { isDimension } from '../../core/sketch/types';
import { arcAngles } from '../../core/sketch/model';
import { sampleEntity } from '../../core/sketch/geometry';

/** Geometry for drawing a dimension in sketch coordinates. */
export interface DimensionDrawing {
  id: Id;
  kind: Constraint['kind'];
  lines: { a: SketchPoint; b: SketchPoint; arrowA?: boolean; arrowB?: boolean }[];
  /** arc for angle dimension */
  arc?: { c: SketchPoint; r: number; a0: number; a1: number };
  label: SketchPoint;
  text: string;
  /** direction of the dimension line (for arrow orientation) */
  dir: SketchPoint;
}

export interface GlyphDrawing {
  constraintId: Id;
  kind: Constraint['kind'];
  at: SketchPoint;
  entityId?: Id;
  /** unit direction of the entity at the anchor (lines: along the line); used to stack icons neatly */
  dir?: SketchPoint;
  /** outward normal (side on which to place the icons) */
  normal?: SketchPoint;
  /** anchor is a point (not a curve) */
  isPoint?: boolean;
}

const P = (s: Sketch, id: Id): SketchPoint => (id in s.points ? s.points[id] : s.points[(s.entities[id] as { p: Id }).p]);

function fmt(v: number, unit: string, kind: Constraint['kind']): string {
  const n = Math.round(v * 100) / 100;
  const txt = Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (kind === 'angle') return `${txt}°`;
  if (kind === 'radius') return `R${txt}`;
  if (kind === 'diameter') return `⌀${txt}`;
  return `${txt} ${unit}`.trim();
}

function norm(v: SketchPoint): SketchPoint {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

export function dimensionDrawing(s: Sketch, c: Constraint, unit: string, driven: boolean): DimensionDrawing | null {
  const value = c.value ?? 0;
  const text = (driven ? '(' : '') + fmt(value, c.kind === 'angle' ? '' : unit, c.kind) + (driven ? ')' : '');
  const off = c.labelOffset;
  switch (c.kind) {
    case 'distance':
    case 'length':
    case 'hDistance':
    case 'vDistance': {
      let a: SketchPoint, b: SketchPoint;
      const e1 = s.entities[c.refs[0]];
      if (c.kind === 'length') {
        const l = e1 as { p1: Id; p2: Id };
        a = s.points[l.p1];
        b = s.points[l.p2];
      } else {
        const e2 = s.entities[c.refs[1]];
        if (c.kind === 'distance' && e2 && e2.kind === 'line') {
          // point-line: foot of perpendicular
          const p = P(s, c.refs[0]);
          const la = s.points[e2.p1], lb = s.points[e2.p2];
          const d = sub(lb, la);
          const l2 = d.x * d.x + d.y * d.y || 1;
          const t = ((p.x - la.x) * d.x + (p.y - la.y) * d.y) / l2;
          a = p;
          b = { x: la.x + d.x * t, y: la.y + d.y * t };
        } else {
          a = P(s, c.refs[0]);
          b = P(s, c.refs[1]);
        }
      }
      let dir = norm(sub(b, a));
      if (c.kind === 'hDistance') dir = { x: 1, y: 0 };
      if (c.kind === 'vDistance') dir = { x: 0, y: 1 };
      const n = { x: -dir.y, y: dir.x };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const label = off ?? { x: mid.x + n.x * 8, y: mid.y + n.y * 8 };
      const h = (label.x - mid.x) * n.x + (label.y - mid.y) * n.y;
      let pa: SketchPoint, pb: SketchPoint;
      if (c.kind === 'hDistance') {
        pa = { x: a.x, y: label.y };
        pb = { x: b.x, y: label.y };
      } else if (c.kind === 'vDistance') {
        pa = { x: label.x, y: a.y };
        pb = { x: label.x, y: b.y };
      } else {
        pa = { x: a.x + n.x * h, y: a.y + n.y * h };
        pb = { x: b.x + n.x * h, y: b.y + n.y * h };
      }
      const lines: DimensionDrawing['lines'] = [
        { a, b: pa },
        { a: b, b: pb },
        { a: pa, b: pb, arrowA: true, arrowB: true },
      ];
      return { id: c.id, kind: c.kind, lines, label, text, dir: norm(sub(pb, pa)) };
    }
    case 'radius':
    case 'diameter': {
      const e = s.entities[c.refs[0]] as { center: Id; r: Id; kind: string };
      const ctr = s.points[e.center];
      const r = s.scalars[e.r];
      const label = off ?? { x: ctr.x + r * 0.9, y: ctr.y + r * 0.9 };
      const d = norm(sub(label, ctr));
      const onCircle = { x: ctr.x + d.x * r, y: ctr.y + d.y * r };
      const lines: DimensionDrawing['lines'] = [];
      if (c.kind === 'radius') lines.push({ a: ctr, b: onCircle, arrowB: true }, { a: onCircle, b: label });
      else lines.push({ a: { x: ctr.x - d.x * r, y: ctr.y - d.y * r }, b: onCircle, arrowA: true, arrowB: true }, { a: onCircle, b: label });
      return { id: c.id, kind: c.kind, lines, label, text, dir: d };
    }
    case 'angle': {
      const l1 = s.entities[c.refs[0]] as { p1: Id; p2: Id }, l2 = s.entities[c.refs[1]] as { p1: Id; p2: Id };
      const a = s.points[l1.p1], b = s.points[l1.p2], p = s.points[l2.p1], q = s.points[l2.p2];
      const d1 = sub(b, a), d2 = sub(q, p);
      const den = d1.x * d2.y - d1.y * d2.x;
      let v: SketchPoint;
      if (Math.abs(den) < 1e-9) v = { x: (a.x + p.x) / 2, y: (a.y + p.y) / 2 };
      else {
        const t = ((p.x - a.x) * d2.y - (p.y - a.y) * d2.x) / den;
        v = { x: a.x + d1.x * t, y: a.y + d1.y * t };
      }
      const a0 = Math.atan2(d1.y, d1.x), a1 = Math.atan2(d2.y, d2.x);
      const label = off ?? { x: v.x + 12 * Math.cos((a0 + a1) / 2), y: v.y + 12 * Math.sin((a0 + a1) / 2) };
      const r = Math.hypot(label.x - v.x, label.y - v.y);
      return { id: c.id, kind: c.kind, lines: [], arc: { c: v, r, a0, a1 }, label, text, dir: { x: 1, y: 0 } };
    }
    default:
      return null;
  }
}

function sub(a: SketchPoint, b: SketchPoint): SketchPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Position of an entity's midpoint for glyph placement. */
function entityAnchor(s: Sketch, e: Entity): SketchPoint {
  switch (e.kind) {
    case 'point':
      return s.points[e.p];
    case 'line': {
      const a = s.points[e.p1], b = s.points[e.p2];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    case 'circle': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      return { x: c.x + r * Math.SQRT1_2, y: c.y - r * Math.SQRT1_2 };
    }
    case 'arc': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const { start, sweep } = arcAngles(s, e);
      const m = start + (e.ccw ? 1 : -1) * sweep / 2;
      return { x: c.x + r * Math.cos(m), y: c.y + r * Math.sin(m) };
    }
    case 'spline': {
      const pts = sampleEntity(s, e);
      return pts[Math.floor(pts.length / 2)];
    }
  }
}

function entityFrame(s: Sketch, e: Entity): { dir: SketchPoint; normal: SketchPoint } {
  switch (e.kind) {
    case 'line': {
      const a = s.points[e.p1], b = s.points[e.p2];
      const d = norm(sub(b, a));
      // normal pointing "down-right-ish" so icons sit below horizontal lines and right of vertical ones
      let n = { x: d.y, y: -d.x };
      if (n.y > 0.01 || (Math.abs(n.y) <= 0.01 && n.x < 0)) n = { x: -n.x, y: -n.y };
      return { dir: d, normal: n };
    }
    case 'circle':
    case 'arc': {
      const c = s.points[e.center];
      const at = entityAnchor(s, e);
      const n = norm(sub(at, c));
      return { dir: { x: -n.y, y: n.x }, normal: n };
    }
    default:
      return { dir: { x: 1, y: 0 }, normal: { x: 0, y: -1 } };
  }
}

/** Where to draw the relation glyphs (one per constraint per referenced item). */
export function glyphDrawings(s: Sketch): GlyphDrawing[] {
  const raw: GlyphDrawing[] = [];
  const out = raw;
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (isDimension(c)) continue;
    const targets = c.kind === 'symmetric' ? c.refs.slice(0, 2) : c.kind === 'coincident' ? [c.refs[0]] : c.kind === 'pointOnEntity' || c.kind === 'midpoint' || c.kind === 'fix' ? [c.refs[0]] : c.refs;
    for (const ref of targets) {
      if (ref in s.points) out.push({ constraintId: cid, kind: c.kind, at: s.points[ref], isPoint: true, dir: { x: 1, y: 0 }, normal: { x: 1, y: -1 } });
      else {
        const e = s.entities[ref];
        if (e) {
          if (e.kind === 'point') out.push({ constraintId: cid, kind: c.kind, at: s.points[e.p], entityId: e.id, isPoint: true, dir: { x: 1, y: 0 }, normal: { x: 1, y: -1 } });
          else {
            const f = entityFrame(s, e);
            out.push({ constraintId: cid, kind: c.kind, at: entityAnchor(s, e), entityId: e.id, dir: f.dir, normal: f.normal });
          }
        }
      }
    }
  }
  // one icon per relation type per anchor (several Equal relations on a line show a single "=")
  const seen = new Set<string>();
  return out.filter((g) => {
    const key = `${g.kind}@${g.at.x.toFixed(6)},${g.at.y.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
