import type { ConstraintKind, Id, Sketch, SketchPoint } from '../../core/sketch/types';
import { addArc, addCircle, addConstraint, addLine, addPoint, addSpline } from '../../core/sketch/model';
import { dist, hitTest, snap, type Snap } from '../../core/sketch/geometry';
import { dimensionForSelection, measure, type SelectionItem } from '../../core/sketch/relations';
import type { ToolId } from '../store';
import type { PreviewItem } from './sketchScene';

export interface ToolContext {
  sketch: Sketch;
  tolerance: number;
  snapGrid: boolean;
  gridSize: number;
  commit: (label: string, fn: (s: Sketch) => Sketch) => void;
  select: (items: SelectionItem[]) => void;
  toggleSelect: (item: SelectionItem, additive: boolean) => void;
  selectConstraint: (id: Id | null) => void;
  setHover: (h: SelectionItem | null) => void;
  dragPoint: (pointId: Id, target: SketchPoint, phase: 'start' | 'move' | 'end') => void;
  /** called when a dimension was created, so the UI can focus its value */
  onDimensionCreated: (id: Id) => void;
  message: (text: string) => void;
  selection: SelectionItem[];
  /** free (draggable) points per solver */
  freePoints: Set<Id>;
  /** hit-test for annotation (dimension label / relation glyph) at a pixel */
  hitAnnotation: (px: number, py: number) => Id | null;
}

export interface ToolRender {
  preview: PreviewItem[];
  previewPoints: SketchPoint[];
  snap: Snap | null;
  /** inference hint for the status bar */
  hint: string;
  /** rubber-band box in sketch coordinates */
  box?: { a: SketchPoint; b: SketchPoint };
}

export interface PointerInfo {
  /** sketch coords */
  p: SketchPoint;
  px: number;
  py: number;
  shift: boolean;
  ctrl: boolean;
  button: number;
}

/**
 * Sketch tool state machine. Each tool keeps its own in-progress points and
 * produces preview geometry; a finished shape is committed in one history step
 * together with the inferred (automatic) relations.
 */
export class ToolController {
  tool: ToolId = 'select';
  private pts: SketchPoint[] = [];
  private snapHits: (Snap | null)[] = [];
  private cursor: SketchPoint | null = null;
  private curSnap: Snap | null = null;
  private dragging: { pointId: Id; moved: boolean } | null = null;
  private boxStart: SketchPoint | null = null;
  private boxEnd: SketchPoint | null = null;
  private dimPlacing: { kind: ConstraintKind; refs: Id[]; value: number } | null = null;
  private lastLineEnd: Id | null = null;
  private lastLineEndPt: SketchPoint | null = null;
  private pendingAnnotationDrag: { id: Id; start: SketchPoint } | null = null;
  onAnnotationDrag: ((id: Id, delta: SketchPoint, phase: 'move' | 'end') => void) | null = null;

  setTool(t: ToolId): void {
    this.tool = t;
    this.reset();
  }

  reset(): void {
    this.pts = [];
    this.snapHits = [];
    this.curSnap = null;
    this.dragging = null;
    this.boxStart = this.boxEnd = null;
    this.dimPlacing = null;
    this.lastLineEnd = null;
    this.lastLineEndPt = null;
  }

  /** Escape: cancel current operation; returns true if something was cancelled */
  cancel(): boolean {
    const busy = this.pts.length > 0 || !!this.dimPlacing || !!this.boxStart;
    this.reset();
    return busy;
  }

  get busy(): boolean {
    return this.pts.length > 0 || !!this.dimPlacing;
  }

  private applySnap(ctx: ToolContext, p: SketchPoint, ref: SketchPoint | null): { p: SketchPoint; snap: Snap | null } {
    const exclude = new Set<Id>();
    const s = snap(ctx.sketch, p, ctx.tolerance, ref, exclude);
    if (s.length) return { p: s[0].point, snap: s[0] };
    if (ctx.snapGrid) {
      const g = ctx.gridSize;
      return { p: { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g }, snap: null };
    }
    return { p, snap: null };
  }

  /** relations implied by a snap for a newly created point id */
  private inferredRelations(s: Sketch, snapHit: Snap | null, pid: Id): Sketch {
    if (!snapHit) return s;
    if (snapHit.pointId && snapHit.pointId !== pid) return addConstraint(s, 'coincident', [pid, snapHit.pointId])[0];
    if (snapHit.kind === 'midpoint' && snapHit.entityId) return addConstraint(s, 'midpoint', [pid, snapHit.entityId])[0];
    if (snapHit.kind === 'on' && snapHit.entityId) return addConstraint(s, 'pointOnEntity', [pid, snapHit.entityId])[0];
    return s;
  }

  pointerMove(ctx: ToolContext, info: PointerInfo): void {
    this.cursor = info.p;
    const ref = this.pts.length ? this.pts[this.pts.length - 1] : null;
    if (this.tool === 'select') {
      if (this.dragging) {
        const { p } = this.applySnap(ctx, info.p, null);
        this.dragging.moved = true;
        ctx.dragPoint(this.dragging.pointId, p, 'move');
        return;
      }
      if (this.pendingAnnotationDrag) {
        this.onAnnotationDrag?.(this.pendingAnnotationDrag.id, { x: info.p.x - this.pendingAnnotationDrag.start.x, y: info.p.y - this.pendingAnnotationDrag.start.y }, 'move');
        return;
      }
      if (this.boxStart) {
        this.boxEnd = info.p;
        return;
      }
      const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
      ctx.setHover(h ? { kind: h.kind, id: h.id } : null);
      this.curSnap = null;
      return;
    }
    if (this.tool === 'dimension') {
      const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
      ctx.setHover(h && !this.dimPlacing ? { kind: h.kind, id: h.id } : null);
      return;
    }
    const { snap: sn } = this.applySnap(ctx, info.p, this.tool === 'line' || this.tool === 'spline' || this.tool === 'rectangle' ? ref : null);
    this.curSnap = sn;
    ctx.setHover(null);
  }

  pointerDown(ctx: ToolContext, info: PointerInfo): void {
    if (info.button !== 0) return;
    const ref = this.pts.length ? this.pts[this.pts.length - 1] : null;
    switch (this.tool) {
      case 'select': {
        const ann = ctx.hitAnnotation(info.px, info.py);
        if (ann) {
          ctx.selectConstraint(ann);
          this.pendingAnnotationDrag = { id: ann, start: info.p };
          return;
        }
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (h) {
          const item: SelectionItem = { kind: h.kind, id: h.id };
          ctx.toggleSelect(item, info.ctrl || info.shift);
          if (h.kind === 'point' && ctx.freePoints.has(h.id)) {
            this.dragging = { pointId: h.id, moved: false };
            ctx.dragPoint(h.id, info.p, 'start');
          } else if (h.kind === 'entity') {
            // drag a whole under-defined line by its first free point? keep simple: no
          }
        } else {
          if (!(info.ctrl || info.shift)) ctx.select([]);
          this.boxStart = info.p;
          this.boxEnd = info.p;
        }
        return;
      }
      case 'point': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        ctx.commit('Punt', (s) => {
          const [s1, e] = addPoint(s, p);
          return this.inferredRelations(s1, sn, e.p);
        });
        return;
      }
      case 'line': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length === 0) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const a = this.pts[this.pts.length - 1];
        if (dist(a, p) < 1e-9) return;
        const startSnap = this.snapHits[this.snapHits.length - 1];
        const prevEnd = this.lastLineEnd;
        const horizontal = Math.abs(a.y - p.y) < 1e-9 && Math.abs(a.x - p.x) > 1e-9;
        const vertical = Math.abs(a.x - p.x) < 1e-9 && Math.abs(a.y - p.y) > 1e-9;
        let createdEnd: Id | null = null;
        ctx.commit('Lijn', (s) => {
          let [s1, l] = addLine(s, prevEnd ?? a, p);
          createdEnd = l.p2;
          if (!prevEnd) s1 = this.inferredRelations(s1, startSnap, l.p1);
          s1 = this.inferredRelations(s1, sn, l.p2);
          if (horizontal && (sn?.kind === 'horizontal' || !sn)) s1 = addConstraint(s1, 'horizontal', [l.id])[0];
          else if (vertical && (sn?.kind === 'vertical' || !sn)) s1 = addConstraint(s1, 'vertical', [l.id])[0];
          return s1;
        });
        // chain: continue from end point; snapping to an existing point ends the chain
        if (sn?.pointId) {
          this.reset();
        } else {
          this.pts = [p];
          this.snapHits = [null];
          this.lastLineEnd = createdEnd;
          this.lastLineEndPt = p;
        }
        return;
      }
      case 'rectangle':
      case 'centerRectangle': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length === 0) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const a = this.pts[0];
        const corners = this.rectCorners(a, p);
        if (!corners) return;
        const startSnap = this.snapHits[0];
        const center = this.tool === 'centerRectangle';
        ctx.commit('Rechthoek', (s) => {
          let [s1, l1] = addLine(s, corners[0], corners[1]);
          let l2, l3, l4;
          [s1, l2] = addLine(s1, l1.p2, corners[2]);
          [s1, l3] = addLine(s1, l2.p2, corners[3]);
          [s1, l4] = addLine(s1, l3.p2, l1.p1);
          s1 = addConstraint(s1, 'horizontal', [l1.id])[0];
          s1 = addConstraint(s1, 'vertical', [l2.id])[0];
          s1 = addConstraint(s1, 'horizontal', [l3.id])[0];
          s1 = addConstraint(s1, 'vertical', [l4.id])[0];
          if (center) {
            let [s2, c] = addPoint(s1, a, true);
            s2 = addConstraint(s2, 'midpoint', [c.id, l1.id])[0];
            let [s3, d] = addLine(s2, l1.p1, l2.p2, true);
            s3 = addConstraint(s3, 'midpoint', [c.id, d.id])[0];
            s1 = this.inferredRelations(s3, startSnap, c.p);
          } else {
            s1 = this.inferredRelations(s1, startSnap, l1.p1);
            s1 = this.inferredRelations(s1, sn, l2.p2);
          }
          return s1;
        });
        this.reset();
        return;
      }
      case 'circle': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length === 0) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const c = this.pts[0];
        const r = dist(c, p);
        if (r < 1e-9) return;
        const cSnap = this.snapHits[0];
        ctx.commit('Cirkel', (s) => {
          const [s1, e] = addCircle(s, c, r);
          let s2 = this.inferredRelations(s1, cSnap, e.center);
          if (sn?.pointId) s2 = addConstraint(s2, 'pointOnEntity', [sn.pointId, e.id])[0];
          return s2;
        });
        this.reset();
        return;
      }
      case 'arc3': {
        // start, end, then a point on the arc
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        this.pts.push(p);
        this.snapHits.push(sn);
        if (this.pts.length < 3) return;
        const arc = this.arcFrom3(this.pts[0], this.pts[1], this.pts[2]);
        if (!arc) {
          ctx.message('Punten zijn collineair; kies een ander derde punt.');
          this.pts.pop();
          this.snapHits.pop();
          return;
        }
        const [s0, s1] = this.snapHits;
        ctx.commit('Boog', (s) => {
          const [sk, e] = addArc(s, arc.center, this.pts[0], this.pts[1], arc.ccw);
          let s2 = this.inferredRelations(sk, s0, e.start);
          s2 = this.inferredRelations(s2, s1, e.end);
          return s2;
        });
        this.reset();
        return;
      }
      case 'arcCenter': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        this.pts.push(p);
        this.snapHits.push(sn);
        if (this.pts.length < 3) return;
        const [c, a, b0] = this.pts;
        const r = dist(c, a);
        if (r < 1e-9) {
          this.reset();
          return;
        }
        const ang = Math.atan2(b0.y - c.y, b0.x - c.x);
        const b = { x: c.x + r * Math.cos(ang), y: c.y + r * Math.sin(ang) };
        const ccw = this.ccwFromCursor(c, a, b0);
        const [cSnap, aSnap] = this.snapHits;
        ctx.commit('Boog', (s) => {
          const [sk, e] = addArc(s, c, a, b, ccw);
          let s2 = this.inferredRelations(sk, cSnap, e.center);
          s2 = this.inferredRelations(s2, aSnap, e.start);
          return s2;
        });
        this.reset();
        return;
      }
      case 'spline': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        this.pts.push(p);
        this.snapHits.push(sn);
        return;
      }
      case 'dimension': {
        if (this.dimPlacing) {
          const d = this.dimPlacing;
          const label = info.p;
          const placing = d;
          let createdId: Id | null = null;
          ctx.commit('Maat', (s) => {
            const [s1, c] = addConstraint(s, placing.kind, placing.refs, { value: placing.value, labelOffset: label });
            createdId = c.id;
            return s1;
          });
          this.dimPlacing = null;
          ctx.select([]);
          if (createdId) ctx.onDimensionCreated(createdId);
          return;
        }
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (!h) {
          ctx.select([]);
          return;
        }
        const item: SelectionItem = { kind: h.kind, id: h.id };
        const sel = [...ctx.selection.filter((x) => !(x.kind === item.kind && x.id === item.id)), item];
        ctx.select(sel);
        const opt = dimensionForSelection(ctx.sketch, sel);
        if (opt) {
          // an angle needs both lines; a single line is "length" — but allow extending to angle on a second click
          this.dimPlacing = { kind: opt.kind, refs: opt.refs, value: measure(ctx.sketch, opt) };
        }
        return;
      }
      default:
        return;
    }
  }

  pointerUp(ctx: ToolContext, info: PointerInfo): void {
    if (this.tool === 'select') {
      if (this.dragging) {
        const { p } = this.applySnap(ctx, info.p, null);
        if (this.dragging.moved) ctx.dragPoint(this.dragging.pointId, p, 'end');
        this.dragging = null;
      }
      if (this.pendingAnnotationDrag) {
        this.onAnnotationDrag?.(this.pendingAnnotationDrag.id, { x: info.p.x - this.pendingAnnotationDrag.start.x, y: info.p.y - this.pendingAnnotationDrag.start.y }, 'end');
        this.pendingAnnotationDrag = null;
      }
      if (this.boxStart && this.boxEnd) {
        const a = this.boxStart, b = this.boxEnd;
        if (dist(a, b) > ctx.tolerance) {
          const minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x), miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
          const crossing = b.x < a.x; // right-to-left = crossing selection, like desktop CAD
          const items: SelectionItem[] = [];
          for (const id of ctx.sketch.entityOrder) {
            const e = ctx.sketch.entities[id];
            const ids = e.kind === 'point' ? [e.p] : e.kind === 'line' ? [e.p1, e.p2] : e.kind === 'circle' ? [e.center] : e.kind === 'arc' ? [e.start, e.end] : e.points;
            const inside = ids.map((pid) => {
              const q = ctx.sketch.points[pid];
              return q.x >= minx && q.x <= maxx && q.y >= miny && q.y <= maxy;
            });
            if (crossing ? inside.some(Boolean) : inside.every(Boolean)) items.push({ kind: 'entity', id });
          }
          ctx.select(info.ctrl || info.shift ? [...ctx.selection, ...items] : items);
        }
        this.boxStart = this.boxEnd = null;
      }
    }
  }

  doubleClick(ctx: ToolContext): void {
    if (this.tool === 'spline' && this.pts.length >= 2) this.finishSpline(ctx);
    else if (this.tool === 'line') this.reset();
  }

  /** Enter: finish the current multi-point entity */
  enter(ctx: ToolContext): void {
    if (this.tool === 'spline' && this.pts.length >= 2) this.finishSpline(ctx);
    else this.reset();
  }

  private finishSpline(ctx: ToolContext) {
    const pts = this.pts.slice();
    const snaps = this.snapHits.slice();
    ctx.commit('Spline', (s) => {
      let [s1, e] = addSpline(s, pts);
      e.points.forEach((pid, i) => {
        s1 = this.inferredRelations(s1, snaps[i], pid);
      });
      return s1;
    });
    this.reset();
  }

  private rectCorners(a: SketchPoint, p: SketchPoint): [SketchPoint, SketchPoint, SketchPoint, SketchPoint] | null {
    if (this.tool === 'centerRectangle') {
      const dx = Math.abs(p.x - a.x), dy = Math.abs(p.y - a.y);
      if (dx < 1e-9 || dy < 1e-9) return null;
      return [
        { x: a.x - dx, y: a.y - dy },
        { x: a.x + dx, y: a.y - dy },
        { x: a.x + dx, y: a.y + dy },
        { x: a.x - dx, y: a.y + dy },
      ];
    }
    if (Math.abs(p.x - a.x) < 1e-9 || Math.abs(p.y - a.y) < 1e-9) return null;
    return [a, { x: p.x, y: a.y }, p, { x: a.x, y: p.y }];
  }

  private arcFrom3(a: SketchPoint, b: SketchPoint, m: SketchPoint): { center: SketchPoint; ccw: boolean } | null {
    const d = 2 * (a.x * (b.y - m.y) + b.x * (m.y - a.y) + m.x * (a.y - b.y));
    if (Math.abs(d) < 1e-9) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, m2 = m.x * m.x + m.y * m.y;
    const cx = (a2 * (b.y - m.y) + b2 * (m.y - a.y) + m2 * (a.y - b.y)) / d;
    const cy = (a2 * (m.x - b.x) + b2 * (a.x - m.x) + m2 * (b.x - a.x)) / d;
    const center = { x: cx, y: cy };
    return { center, ccw: this.ccwFromCursor(center, a, m) };
  }

  /** does going ccw from a reach m before the opposite side? */
  private ccwFromCursor(c: SketchPoint, a: SketchPoint, m: SketchPoint): boolean {
    const cross = (a.x - c.x) * (m.y - c.y) - (a.y - c.y) * (m.x - c.x);
    return cross > 0;
  }

  render(ctx: ToolContext): ToolRender {
    const out: ToolRender = { preview: [], previewPoints: [], snap: this.curSnap, hint: '' };
    const cur = this.cursor;
    const sn = this.curSnap;
    const cp = cur ? (sn ? sn.point : ctx.snapGrid ? { x: Math.round(cur.x / ctx.gridSize) * ctx.gridSize, y: Math.round(cur.y / ctx.gridSize) * ctx.gridSize } : cur) : null;
    if (sn) out.hint = { endpoint: 'Eindpunt', midpoint: 'Middelpunt', center: 'Centrum', on: 'Op entiteit', horizontal: 'Horizontaal', vertical: 'Verticaal', origin: 'Oorsprong', quadrant: 'Kwadrant' }[sn.kind];
    if (this.boxStart && this.boxEnd) out.box = { a: this.boxStart, b: this.boxEnd };
    if (!cp) return out;
    switch (this.tool) {
      case 'line':
        if (this.pts.length) {
          const a = this.lastLineEndPt ?? this.pts[0];
          out.preview.push({ points: [a, cp] });
          out.previewPoints.push(a);
          out.hint = out.hint || `L = ${dist(a, cp).toFixed(2)}`;
        }
        break;
      case 'rectangle':
      case 'centerRectangle':
        if (this.pts.length) {
          const c = this.rectCorners(this.pts[0], cp);
          if (c) out.preview.push({ points: [...c, c[0]] });
          if (this.tool === 'centerRectangle') out.previewPoints.push(this.pts[0]);
        }
        break;
      case 'circle':
        if (this.pts.length) {
          const c = this.pts[0];
          const r = dist(c, cp);
          const poly: SketchPoint[] = [];
          for (let i = 0; i <= 64; i++) poly.push({ x: c.x + r * Math.cos((i / 64) * Math.PI * 2), y: c.y + r * Math.sin((i / 64) * Math.PI * 2) });
          out.preview.push({ points: poly });
          out.preview.push({ points: [c, cp], dashed: true });
          out.previewPoints.push(c);
          out.hint = out.hint || `R = ${r.toFixed(2)}`;
        }
        break;
      case 'arc3':
        if (this.pts.length === 1) out.preview.push({ points: [this.pts[0], cp], dashed: true });
        if (this.pts.length === 2) {
          const arc = this.arcFrom3(this.pts[0], this.pts[1], cp);
          if (arc) out.preview.push({ points: arcPoly(arc.center, this.pts[0], this.pts[1], arc.ccw) });
          else out.preview.push({ points: [this.pts[0], this.pts[1]], dashed: true });
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'arcCenter':
        if (this.pts.length === 1) {
          out.preview.push({ points: [this.pts[0], cp], dashed: true });
          out.hint = out.hint || `R = ${dist(this.pts[0], cp).toFixed(2)}`;
        }
        if (this.pts.length === 2) {
          const [c, a] = this.pts;
          const r = dist(c, a);
          const ang = Math.atan2(cp.y - c.y, cp.x - c.x);
          const b = { x: c.x + r * Math.cos(ang), y: c.y + r * Math.sin(ang) };
          out.preview.push({ points: arcPoly(c, a, b, this.ccwFromCursor(c, a, cp)) });
          out.preview.push({ points: [c, b], dashed: true });
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'spline':
        if (this.pts.length) {
          out.preview.push({ points: [...this.pts, cp] });
          out.previewPoints.push(...this.pts);
          out.hint = out.hint || 'Enter of dubbelklik om de spline af te sluiten';
        }
        break;
      case 'dimension':
        if (this.dimPlacing) out.hint = `Klik om de maat te plaatsen (${this.dimPlacing.value.toFixed(2)})`;
        else out.hint = 'Selecteer geometrie om te bematen';
        break;
      default:
        break;
    }
    return out;
  }
}

function arcPoly(c: SketchPoint, a: SketchPoint, b: SketchPoint, ccw: boolean): SketchPoint[] {
  const r = dist(c, a);
  const s = Math.atan2(a.y - c.y, a.x - c.x);
  const e = Math.atan2(b.y - c.y, b.x - c.x);
  let sweep = ccw ? e - s : s - e;
  while (sweep < 0) sweep += Math.PI * 2;
  const n = Math.max(6, Math.ceil(sweep / (Math.PI / 24)));
  const out: SketchPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = s + (ccw ? 1 : -1) * (sweep * i) / n;
    out.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
  }
  return out;
}
