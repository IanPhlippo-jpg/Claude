import { lengthDecimals } from '../prefs';
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
  /** radius / diameter: the text sits on the leader that ends at the label point */
  leader?: boolean;
  /** tolerance shown stacked after the value (bilateral) or instead of it (limit); basic: a frame around the text */
  tol?: { upper: string; lower: string; limit?: boolean };
  basic?: boolean;
  fontSize?: number;
  justify?: 'left' | 'center' | 'right';
  arrowStyle?: 'filled' | 'open' | 'dot' | 'slash';
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

/** dimension text by design shows it: two decimals, no unit ("80.00", "Ø35.00", "R15.00", "90.00°") */
function fmt(v: number, _unit: string, kind: Constraint['kind'], decimals?: number): string {
  const txt = v.toFixed(decimals ?? lengthDecimals());
  if (kind === 'angle') return `${txt}°`;
  if (kind === 'radius') return `R${txt}`;
  if (kind === 'diameter') return `Ø${txt}`;
  return txt;
}

function norm(v: SketchPoint): SketchPoint {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** the scale of a length in the document unit (mm) for Override units */
const UNIT_SCALE: Record<string, number> = { mm: 1, cm: 0.1, in: 1 / 25.4 };

export function dimensionDrawing(s: Sketch, c: Constraint, unit: string, driven: boolean, linked = false): DimensionDrawing | null {
  const d = dimensionDrawingBase(s, c, unit, driven, linked);
  if (!d) return d;
  const out: DimensionDrawing = { ...d, fontSize: c.fontSize, justify: c.justify, arrowStyle: c.arrowStyle };
  // tolerance of the intended Tolerance/Precision box
  const tol = c.tol;
  const dec = c.precision ?? lengthDecimals();
  const k = c.kind === 'angle' ? 1 : UNIT_SCALE[c.unitOverride ?? 'mm'] ?? 1;
  const v = (c.value ?? 0) * k;
  const plus = (tol?.plus ?? 0) * k, minus = (tol?.minus ?? 0) * k;
  if (tol && tol.type !== 'none') {
    if (tol.type === 'basic') out.basic = true;
    else if (tol.type === 'symmetric') out.text = `${out.text} ±${plus.toFixed(dec)}`;
    else if (tol.type === 'bilateral') out.tol = { upper: `+${plus.toFixed(dec)}`, lower: `-${minus.toFixed(dec)}` };
    else if (tol.type === 'limit') { out.tol = { upper: (v + plus).toFixed(dec), lower: (v - minus).toFixed(dec), limit: true }; out.text = ''; }
    else if (tol.type === 'min') out.text = `${out.text} MIN`;
    else if (tol.type === 'max') out.text = `${out.text} MAX`;
  }
  // Dual Dimension: the value in inches as well, in brackets
  if (c.dual && c.kind !== 'angle' && out.text) out.text = `${out.text} [${((c.value ?? 0) / 25.4).toFixed(Math.max(2, dec + 1))}]`;
  // All uppercase: the text (and its unit) in capitals
  if (c.uppercase) out.text = out.text.toUpperCase();
  // Leaders > arrows outside: the arrows come in from outside the extension lines
  if (c.arrows === 'outside') {
    const i = out.lines.findIndex((l) => l.arrowA && l.arrowB);
    if (i >= 0) {
      const m = out.lines[i];
      const dx = m.b.x - m.a.x, dy = m.b.y - m.a.y, L = Math.hypot(dx, dy) || 1;
      const stub = Math.max(2, L * 0.25);
      const ux = dx / L, uy = dy / L;
      out.lines = [...out.lines.slice(0, i), { a: m.a, b: m.b }, { a: m.a, b: { x: m.a.x - ux * stub, y: m.a.y - uy * stub }, arrowA: true }, { a: m.b, b: { x: m.b.x + ux * stub, y: m.b.y + uy * stub }, arrowA: true }, ...out.lines.slice(i + 1)];
    }
  }
  return out;
}

function dimensionDrawingBase(s: Sketch, c: Constraint, unit: string, driven: boolean, linked = false): DimensionDrawing | null {
  const k = c.kind === 'angle' ? 1 : UNIT_SCALE[c.unitOverride ?? 'mm'] ?? 1;
  const value = (c.value ?? 0) * k;
  // a dimension driven by an equation shows the Σ prefix, by design
  const core = fmt(value, c.kind === 'angle' ? '' : unit, c.kind, c.precision);
  const shown = c.dimText && c.dimText.includes('<DIM>') ? c.dimText.replace('<DIM>', core) : core;
  const text = (linked ? 'Σ' : '') + (driven ? '(' : '') + shown + (driven ? ')' : '');
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
        // Arc Condition: the dimension line ends on the edge of the arc, not its centre
        const ac = c.arcCondition ?? {};
        const edgeOf = (centre: SketchPoint, toward: SketchPoint, cond: { entityId: Id; mode: 'min' | 'max' }) => {
          const r = s.scalars[(s.entities[cond.entityId] as { r: Id }).r] ?? 0;
          const d = norm(sub(toward, centre));
          const k = cond.mode === 'max' ? -r : r;
          return { x: centre.x + d.x * k, y: centre.y + d.y * k };
        };
        if (ac[0]) a = edgeOf(a, b, ac[0]);
        if (ac[1]) b = edgeOf(b, a, ac[1]);
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
      // by design, the text sits centred between the arrows unless it is dragged outside the extension lines
      const span = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const along = span > 1e-9 ? ((label.x - pa.x) * (pb.x - pa.x) + (label.y - pa.y) * (pb.y - pa.y)) / span : 0;
      const shown = along > 0 && along < span ? { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 } : label;
      return { id: c.id, kind: c.kind, lines, label: shown, text, dir: norm(sub(pb, pa)) };
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
      // by design: a leader from the text to the circle with one arrow on the circle; a diameter also runs
      // on through the centre to the far side of the circle
      if (c.kind === 'diameter') lines.push({ a: { x: ctr.x - d.x * r, y: ctr.y - d.y * r }, b: onCircle });
      lines.push({ a: label, b: onCircle, arrowB: true });
      return { id: c.id, kind: c.kind, lines, label, text, dir: d, leader: true };
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
    case 'ellipse': {
      const pts = sampleEntity(s, e, 8);
      return pts[7];
    }
    case 'ellipseArc':
    case 'conic': {
      const pts = sampleEntity(s, e, 16);
      return pts[Math.floor(pts.length / 2)];
    }
    case 'text':
      return s.points[e.anchor];
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
/**
 * The sides of polygons drawn with the Polygon tool: closed chains of three or more lines held equal. The original
 * shows one Polygon relation per side and a single tangent / on-circle relation to the construction circle.
 */
function polygonSides(s: Sketch): Set<Id> {
  const eq = new Map<Id, Set<Id>>();
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (c.kind !== 'equal' || c.refs.length !== 2) continue;
    const [a, b] = c.refs;
    if (s.entities[a]?.kind !== 'line' || s.entities[b]?.kind !== 'line') continue;
    if (!eq.has(a)) eq.set(a, new Set());
    if (!eq.has(b)) eq.set(b, new Set());
    eq.get(a)!.add(b);
    eq.get(b)!.add(a);
  }
  const out = new Set<Id>();
  const seen = new Set<Id>();
  for (const start of eq.keys()) {
    if (seen.has(start)) continue;
    const group: Id[] = [];
    const stack = [start];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      for (const n of eq.get(id) ?? []) if (!seen.has(n)) stack.push(n);
    }
    if (group.length < 3) continue;
    // a closed chain: every end point is shared by exactly two of the lines
    const count = new Map<Id, number>();
    for (const id of group) {
      const l = s.entities[id] as { p1: Id; p2: Id };
      count.set(l.p1, (count.get(l.p1) ?? 0) + 1);
      count.set(l.p2, (count.get(l.p2) ?? 0) + 1);
    }
    if (![...count.values()].every((n) => n === 2)) continue;
    // and tied to a construction circle (tangent sides or vertices on it), so a plain square stays four Equal relations
    const ids = new Set(group), pts = new Set(count.keys());
    const tied = s.constraintOrder.some((k) => {
      const c = s.constraints[k];
      const circle = c.refs.find((r) => s.entities[r]?.kind === 'circle' && s.entities[r]?.construction);
      if (!circle) return false;
      return (c.kind === 'tangent' && c.refs.some((r) => ids.has(r))) || (c.kind === 'pointOnEntity' && pts.has(c.refs[0]));
    });
    if (tied) for (const id of group) out.add(id);
  }
  return out;
}

export function glyphDrawings(s: Sketch): GlyphDrawing[] {
  const raw: GlyphDrawing[] = [];
  const out = raw;
  const poly = polygonSides(s);
  const polyPoints = new Set<Id>([...poly].flatMap((id) => { const l = s.entities[id] as { p1: Id; p2: Id }; return [l.p1, l.p2]; }));
  let polyCircleShown = false;
  for (const id of poly) {
    // one Polygon relation per side (it stands for the equal sides of the regular polygon)
    const e = s.entities[id];
    const f = entityFrame(s, e);
    const cid = s.constraintOrder.find((k) => s.constraints[k].kind === 'equal' && s.constraints[k].refs.includes(id));
    if (cid) out.push({ constraintId: cid, kind: 'polygon' as Constraint['kind'], at: entityAnchor(s, e), entityId: id, dir: f.dir, normal: f.normal });
  }
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (isDimension(c)) continue;
    if (poly.size) {
      if (c.kind === 'equal' && c.refs.every((r) => poly.has(r))) continue;
      const toCircle = (c.kind === 'tangent' && c.refs.some((r) => poly.has(r))) || (c.kind === 'pointOnEntity' && polyPoints.has(c.refs[0]) && s.entities[c.refs[1]]?.construction);
      if (toCircle) {
        if (polyCircleShown) continue;
        polyCircleShown = true;
      }
    }
    const targets = poly.size && c.kind === 'tangent' && c.refs.some((r) => poly.has(r)) ? c.refs.filter((r) => poly.has(r)) : c.kind === 'symmetric' ? c.refs.slice(0, 2) : c.kind === 'coincident' ? [c.refs[0]] : c.kind === 'pointOnEntity' || c.kind === 'midpoint' || c.kind === 'fix' ? [c.refs[0]] : c.refs;
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
