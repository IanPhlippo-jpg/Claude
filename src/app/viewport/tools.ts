import { findContours } from '../../core/sketch/contours';
import { slotGeometry, slotOutline } from './slotGeometry';
export { slotGeometry, slotOutline } from './slotGeometry';
import type { ConstraintKind, Id, Sketch, SketchPoint } from '../../core/sketch/types';
import { addArc, addCircle, addConic, addConstraint, addEllipse, addEllipseArc, addLine, addPoint, addPolygon, addSpline, addText, entityPoints } from '../../core/sketch/model';
import { dist, entityLoops, hitTest, sampleBezier, sampleConic, type Snap } from '../../core/sketch/geometry';
import { automaticRelations, gridPoint, snapPoint } from '../sketchSnaps';
import { defaultLasso } from '../prefsEffects';
import { cornerTrim, extendEntity, powerTrim, sketchChamfer, sketchFillet, trimBetween, trimEntity } from '../../core/sketch/edit';
import { dimensionForSelection, measure, type SelectionItem } from '../../core/sketch/relations';
import type { ToolId } from '../store';
import type { PreviewItem } from './sketchScene';

export interface ToolContext {
  sketch: Sketch;
  tolerance: number;
  snapGrid: boolean; /** the grid is shown (Relations/Snaps ▸ Snap only when grid is displayed) */ gridShown?: boolean;
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
  /** Sketch Fillet radius from the Property Panel */
  filletRadius: number;
  /** Sketch Chamfer distances from the Property Panel */
  chamfer: { d1: number; d2: number };
  /** all sketch tool options of the Property Panel (trim mode, …) */
  sketchTool?: import('../store').SketchToolParams;
  /** a Yes/No question before the action (the slot warning of Trim); absent = go on */
  confirm?: (title: string, text: string, dontShowKey: string, yes: () => void) => void;
}

export interface ToolRender {
  preview: PreviewItem[];
  previewPoints: SketchPoint[];
  snap: Snap | null;
  /** inference hint for the status bar */
  hint: string;
  /** rubber-band box in sketch coordinates */
  box?: { a: SketchPoint; b: SketchPoint };
  /** Lasso Selection path */
  lasso?: SketchPoint[];
  /** Smart Dimension: the dimension being placed follows the cursor */
  dimPreview?: { kind: ConstraintKind; refs: Id[]; value: number; label: SketchPoint };
  /** the size readout next to the cursor while an entity is drawn ("x = 80.00, y = 40.00", "R = 17.50"), by design */
  readout?: string;
  cursorAt?: SketchPoint;
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
  /** the entities bounding the closed region under the cursor (select tool) */
  hoverRegion: Id[] | null = null;
  tool: ToolId = 'select';
  private pts: SketchPoint[] = [];
  private snapHits: (Snap | null)[] = [];
  private cursor: SketchPoint | null = null;
  private curSnap: Snap | null = null;
  private dragging: { pointId: Id; moved: boolean } | null = null;
  private boxStart: SketchPoint | null = null;
  private boxEnd: SketchPoint | null = null;
  /** Trim ▸ Power trim path, Corner first pick, inside/outside boundaries */
  private powerPath: SketchPoint[] | null = null;
  private cornerFirst: { id: Id; p: SketchPoint } | null = null;
  private trimBounds: Id[] = [];
  /** Lasso Selection: the freehand path while dragging */
  private lasso: SketchPoint[] | null = null;
  /** set from the shortcut menu: drag selects with a lasso instead of a box */
  lassoMode = defaultLasso();
  private dimPlacing: { kind: ConstraintKind; refs: Id[]; value: number; arcCondition?: Record<number, { entityId: Id; mode: 'min' | 'max' }> } | null = null;
  private lastLineEnd: Id | null = null;
  private lastLineEndPt: SketchPoint | null = null;
  private pendingAnnotationDrag: { id: Id; start: SketchPoint } | null = null;
  /** pointer-down position (pixels) and the number of placed points at that moment: a drag of
   *  more than a few pixels is treated as "click-drag" input, like desktop CAD */
  private down: { px: number; py: number; pts: number } | null = null;
  onAnnotationDrag: ((id: Id, delta: SketchPoint, phase: 'move' | 'end') => void) | null = null;
  polygonSides = 6;
  /** Polygon > Inscribed circle (the intended default): the second click lies on the circle touching the sides */
  polygonInscribed = true;
  /** Rectangle PM ▸ Add construction lines: from the corners (diagonals) or from the midpoints of the sides */
  rectConstruction: { on: boolean; mode: 'corners' | 'midpoints' } = { on: false, mode: 'corners' };
  /** Tangent Arc: the end point it starts from and the direction it leaves in */
  private tangentFrom: { pointId: Id; entityId: Id; dir: SketchPoint } | null = null;
  /** Sketch Text Property Panel values */
  textOptions: { text: string; height: number; bold: boolean; widthFactor: number; spacing: number; angle: number } = { text: 'Text', height: 10, bold: false, widthFactor: 100, spacing: 100, angle: 0 };

  setTool(t: ToolId): void {
    this.tool = t;
    this.reset();
  }

  /** tangent direction at an end point of a line or arc, pointing away from the entity (for a Tangent Arc) */
  private endTangent(s: Sketch, pointId: Id): { entityId: Id; dir: SketchPoint } | null {
    for (const id of s.entityOrder) {
      const e = s.entities[id];
      if (e.kind === 'line' && (e.p1 === pointId || e.p2 === pointId)) {
        const a = s.points[e.p1], b = s.points[e.p2];
        const d = e.p2 === pointId ? { x: b.x - a.x, y: b.y - a.y } : { x: a.x - b.x, y: a.y - b.y };
        const l = Math.hypot(d.x, d.y) || 1;
        return { entityId: id, dir: { x: d.x / l, y: d.y / l } };
      }
      if (e.kind === 'arc' && (e.start === pointId || e.end === pointId)) {
        const c = s.points[e.center], q = s.points[pointId];
        const rx = q.x - c.x, ry = q.y - c.y, l = Math.hypot(rx, ry) || 1;
        // direction of travel at the point (ccw: perpendicular to the left), reversed at the start
        let d = e.ccw ? { x: -ry / l, y: rx / l } : { x: ry / l, y: -rx / l };
        if (pointId === e.start) d = { x: -d.x, y: -d.y };
        return { entityId: id, dir: d };
      }
    }
    return null;
  }

  /** arc tangent to dir at s through p: centre on the normal of dir at s */
  private tangentArcGeometry(s: SketchPoint, dir: SketchPoint, p: SketchPoint): { center: SketchPoint; ccw: boolean } | null {
    const n = { x: -dir.y, y: dir.x };
    const sx = s.x - p.x, sy = s.y - p.y;
    const den = 2 * (n.x * sx + n.y * sy);
    if (Math.abs(den) < 1e-9) return null;
    const k = -(sx * sx + sy * sy) / den;
    const center = { x: s.x + n.x * k, y: s.y + n.y * k };
    // leaving s along dir: counter-clockwise when the centre lies to the left of dir
    return { center, ccw: k > 0 };
  }

  /** Centerpoint Arc Slot: the three points (start, end, a point half way) of the centre arc */
  private centerArcPoints(c: SketchPoint, a: SketchPoint, b: SketchPoint): { s: SketchPoint; e: SketchPoint; m: SketchPoint } | null {
    const r = dist(c, a);
    if (r < 1e-9) return null;
    const a0 = Math.atan2(a.y - c.y, a.x - c.x);
    let a1 = Math.atan2(b.y - c.y, b.x - c.x);
    const ccw = this.ccwFromCursor(c, a, b);
    if (ccw && a1 <= a0) a1 += Math.PI * 2;
    if (!ccw && a1 >= a0) a1 -= Math.PI * 2;
    const am = (a0 + a1) / 2;
    return { s: a, e: { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) }, m: { x: c.x + r * Math.cos(am), y: c.y + r * Math.sin(am) } };
  }

  /** the arcs and relations of an arc slot */
  private addArcSlot(s: Sketch, g: NonNullable<ReturnType<ToolController['arcSlotGeometry']>>): Sketch {
    let s1 = s;
    let outer, inner, capE, capS, cl;
    [s1, outer] = addArc(s1, g.c, g.os, g.oe, g.ccw);
    [s1, capE] = addArc(s1, g.e, outer.end, g.ie, g.capEccw);
    [s1, inner] = addArc(s1, g.c, g.is, capE.end, g.ccw);
    [s1, capS] = addArc(s1, g.s, inner.start, outer.start, g.capSccw);
    [s1, cl] = addArc(s1, g.c, g.s, g.e, g.ccw, true);
    s1 = addConstraint(s1, 'concentric', [outer.id, inner.id])[0];
    s1 = addConstraint(s1, 'concentric', [outer.id, cl.id])[0];
    s1 = addConstraint(s1, 'equal', [capS.id, capE.id])[0];
    s1 = addConstraint(s1, 'coincident', [capS.center, cl.start])[0];
    s1 = addConstraint(s1, 'coincident', [capE.center, cl.end])[0];
    return s1;
  }

  /** 3 Point Arc Slot: centre arc through s, m, e; half width from the cursor's distance to that arc */
  private arcSlotGeometry(s: SketchPoint, e: SketchPoint, m: SketchPoint, p: SketchPoint) {
    const arc = this.arcFrom3(s, e, m);
    if (!arc) return null;
    const c = arc.center;
    const R = dist(c, s);
    const h = Math.abs(dist(c, p) - R);
    if (h < 1e-6 || h >= R) return null;
    const at = (q: SketchPoint, r: number) => { const d = dist(c, q); return { x: c.x + ((q.x - c.x) * r) / d, y: c.y + ((q.y - c.y) * r) / d }; };
    // the caps bulge away from the slot: past the end along the arc's direction of travel, before the start
    const tangent = (q: SketchPoint, sign: number) => { const dx = q.x - c.x, dy = q.y - c.y, l = Math.hypot(dx, dy); const t = arc.ccw ? { x: -dy / l, y: dx / l } : { x: dy / l, y: -dx / l }; return { x: q.x + sign * t.x * h, y: q.y + sign * t.y * h }; };
    const os = at(s, R + h), oe = at(e, R + h), is = at(s, R - h), ie = at(e, R - h);
    const capE = this.arcFrom3(oe, ie, tangent(e, 1)), capS = this.arcFrom3(is, os, tangent(s, -1));
    return { c, s, e, h, ccw: arc.ccw, os, oe, is, ie, capEccw: capE?.ccw ?? true, capSccw: capS?.ccw ?? true };
  }

  /** minor radius: distance of the cursor from the major axis */
  /** a point of the ellipse (centre, semi-axes, rotation) at eccentric angle t */
  private ellipseAt(c: SketchPoint, a: number, b: number, rot: number, t: number): SketchPoint {
    const x = a * Math.cos(t), y = b * Math.sin(t);
    return { x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) };
  }

  /** eccentric angle of the point of the ellipse in the direction of p */
  private ellipseParam(c: SketchPoint, a: number, b: number, rot: number, p: SketchPoint): number {
    const dx = p.x - c.x, dy = p.y - c.y;
    const x = dx * Math.cos(rot) + dy * Math.sin(rot), y = -dx * Math.sin(rot) + dy * Math.cos(rot);
    return Math.atan2(y / (b || 1e-9), x / (a || 1e-9));
  }

  /** Partial Ellipse from centre, major axis end, start (sets the minor radius) and the end */
  private partialEllipseGeom(c: SketchPoint, m: SketchPoint, p3: SketchPoint, p4: SketchPoint | null) {
    const a = dist(c, m), rot = Math.atan2(m.y - c.y, m.x - c.x);
    const b = this.ellipseMinor(c, m, p3);
    if (a < 1e-9 || b < 1e-9) return null;
    const t0 = this.ellipseParam(c, a, b, rot, p3);
    const t1 = p4 ? this.ellipseParam(c, a, b, rot, p4) : t0;
    let sweep = t1 - t0;
    while (sweep <= 0) sweep += Math.PI * 2;
    const poly: SketchPoint[] = [];
    for (let i = 0; i <= 48; i++) poly.push(this.ellipseAt(c, a, b, rot, t0 + (sweep * i) / 48));
    return { a, b, rot, start: this.ellipseAt(c, a, b, rot, t0), end: this.ellipseAt(c, a, b, rot, t1), poly };
  }

  /** Parabola from focus and vertex (apex): local frame with x across, y along the axis toward the focus */
  private parabolaFrame(F: SketchPoint, V: SketchPoint) {
    const f = dist(F, V);
    if (f < 1e-9) return null;
    const u = { x: (F.x - V.x) / f, y: (F.y - V.y) / f };
    const n = { x: u.y, y: -u.x };
    const at = (x: number) => ({ x: V.x + n.x * x + (u.x * x * x) / (4 * f), y: V.y + n.y * x + (u.y * x * x) / (4 * f) });
    const xOf = (p: SketchPoint) => (p.x - V.x) * n.x + (p.y - V.y) * n.y;
    // the exact parabola from x0 to x1 as a quadratic Bezier: control where the end tangents meet
    const bez = (x0: number, x1: number) => ({ a: at(x0), b: at(x1), c: { x: V.x + n.x * ((x0 + x1) / 2) + (u.x * x0 * x1) / (4 * f), y: V.y + n.y * ((x0 + x1) / 2) + (u.y * x0 * x1) / (4 * f) } });
    return { at, xOf, bez };
  }

  /** Conic rho from the cursor: the shoulder point (t = 0.5) lies at M + rho (C - M) */
  private conicRho(A: SketchPoint, B: SketchPoint, C: SketchPoint, p: SketchPoint): number {
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const d = { x: C.x - M.x, y: C.y - M.y };
    const l2 = d.x * d.x + d.y * d.y;
    if (l2 < 1e-12) return 0.5;
    return Math.min(0.95, Math.max(0.05, ((p.x - M.x) * d.x + (p.y - M.y) * d.y) / l2));
  }

  private ellipseMinor(c: SketchPoint, m: SketchPoint, p: SketchPoint): number {
    const a = dist(c, m);
    if (a < 1e-12) return 0;
    const ux = (m.x - c.x) / a, uy = (m.y - c.y) / a;
    return Math.abs((p.x - c.x) * -uy + (p.y - c.y) * ux);
  }

  reset(): void {
    this.tangentFrom = null;
    this.powerPath = null;
    this.cornerFirst = null;
    this.trimBounds = [];
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

  /** a point typed with the on-screen numeric input is placed exactly, without snapping */
  private exactNext = false;

  /** On-screen numeric input (Options ▸ Sketch): the typed length of the line or radius of the circle being drawn;
   * the end lands that far along the direction to the pointer. True when it was used. */
  numericEntry(ctx: ToolContext, value: number): boolean {
    if (!(value > 0) || !this.pts.length || !this.cursor) return false;
    if (this.tool !== 'line' && this.tool !== 'centerline' && this.tool !== 'circle') return false;
    const a = this.tool === 'circle' ? this.pts[0] : this.lastLineEndPt ?? this.pts[this.pts.length - 1];
    const dx = this.cursor.x - a.x, dy = this.cursor.y - a.y, l = Math.hypot(dx, dy);
    const p = l > 1e-9 ? { x: a.x + (dx / l) * value, y: a.y + (dy / l) * value } : { x: a.x + value, y: a.y };
    this.exactNext = true;
    this.pointerDown(ctx, { p, px: 0, py: 0, shift: false, ctrl: false, button: 0 });
    this.exactNext = false;
    return true;
  }

  /** the point the next typed value measures from (the line start or circle centre), null when nothing is being drawn */
  numericAnchor(): { at: SketchPoint; value: number; label: string } | null {
    if (!this.pts.length || !this.cursor || (this.tool !== 'line' && this.tool !== 'centerline' && this.tool !== 'circle')) return null;
    const a = this.tool === 'circle' ? this.pts[0] : this.lastLineEndPt ?? this.pts[this.pts.length - 1];
    return { at: this.cursor, value: dist(a, this.cursor), label: this.tool === 'circle' ? 'R' : 'L' };
  }

  private applySnap(ctx: ToolContext, p: SketchPoint, ref: SketchPoint | null): { p: SketchPoint; snap: Snap | null } {
    if (this.exactNext) return { p, snap: null };
    // the snaps, grid and direction inference of System Options ▸ Sketch ▸ Relations/Snaps
    return snapPoint(ctx.sketch, p, ctx.tolerance, ref, { quick: ctx.snapGrid, shown: !!ctx.gridShown, size: ctx.gridSize });
  }

  /** Ctrl held while sketching: automatic relations are turned off (by design) */
  private noInfer = false;

  /** relations implied by a snap for a newly created point id */
  private inferredRelations(s: Sketch, snapHit: Snap | null, pid: Id): Sketch {
    if (!snapHit || this.noInfer || !automaticRelations()) return s;
    if (snapHit.pointId && snapHit.pointId !== pid) return addConstraint(s, 'coincident', [pid, snapHit.pointId])[0];
    if (snapHit.kind === 'midpoint' && snapHit.entityId) return addConstraint(s, 'midpoint', [pid, snapHit.entityId])[0];
    if ((snapHit.kind === 'on' || snapHit.kind === 'quadrant' || snapHit.kind === 'tangent') && snapHit.entityId) return addConstraint(s, 'pointOnEntity', [pid, snapHit.entityId])[0];
    return s;
  }

  pointerMove(ctx: ToolContext, info: PointerInfo): void {
    this.cursor = info.p;
    if (this.powerPath) {
      this.powerPath.push(info.p);
      return;
    }
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
        if (this.lassoMode) (this.lasso ??= [this.boxStart]).push(info.p);
        return;
      }
      const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
      ctx.setHover(h ? { kind: h.kind, id: h.id } : null);
      // over a closed region (not on an entity): its boundary lights up, holes included, by design
      this.hoverRegion = h ? null : regionAt(ctx.sketch, info.p);
      this.curSnap = null;
      return;
    }
    if (this.tool === 'dimension' || this.tool === 'hdim' || this.tool === 'vdim') {
      const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
      ctx.setHover(h && !this.dimPlacing ? { kind: h.kind, id: h.id } : null);
      return;
    }
    this.hoverRegion = null;
    const { snap: sn } = this.applySnap(ctx, info.p, this.tool === 'line' || this.tool === 'centerline' || this.tool === 'spline' || this.tool === 'rectangle' ? ref : null);
    this.curSnap = sn;
    ctx.setHover(null);
  }

  pointerDown(ctx: ToolContext, info: PointerInfo): void {
    if (info.button !== 0) return;
    this.down = { px: info.px, py: info.py, pts: this.pts.length };
    this.place(ctx, info);
  }

  /** place a point for the active tool (shared by click and drag input) */
  private place(ctx: ToolContext, info: PointerInfo): void {
    this.noInfer = info.ctrl && this.tool !== 'select' && this.tool !== 'dimension';
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
      // Segment: a click picks the entity to divide (the Property Panel applies it)
      case 'segment': {
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        ctx.select(h && h.kind === 'entity' ? [{ kind: 'entity', id: h.id }] : []);
        return;
      }
      case 'point': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        ctx.commit('Point', (s) => {
          const [s1, e] = addPoint(s, p);
          return this.inferredRelations(s1, sn, e.p);
        });
        return;
      }
      case 'trim': {
        const o = ctx.sketchTool;
        const mode = o?.trimMode ?? 'closest';
        const opts = { keepAsConstruction: !!o?.trimKeep, ignoreConstruction: !!o?.trimIgnore };
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (mode === 'power') {
          // drag across the entities; a plain click trims like Trim to closest
          this.powerPath = [info.p];
          return;
        }
        if (!h || h.kind !== 'entity') return;
        if (mode === 'corner') {
          if (!this.cornerFirst) {
            this.cornerFirst = { id: h.id, p: info.p };
            ctx.select([{ kind: 'entity', id: h.id }]);
            return;
          }
          const first = this.cornerFirst;
          this.cornerFirst = null;
          let ok = false;
          ctx.commit('Trim Entities (Corner)', (s) => { const r = cornerTrim(s, first.id, first.p, h.id, info.p); ok = !!r; return r ?? s; });
          if (!ok) ctx.message('Corner: select two lines that are not parallel.');
          ctx.select([]);
          return;
        }
        if (mode === 'inside' || mode === 'outside') {
          if (this.trimBounds.length < 2) {
            if (!this.trimBounds.includes(h.id)) this.trimBounds.push(h.id);
            ctx.select(this.trimBounds.map((id) => ({ kind: 'entity' as const, id })));
            if (this.trimBounds.length === 2) ctx.message('Now click the entities to trim.');
            return;
          }
          const b = this.trimBounds.slice();
          ctx.commit(mode === 'inside' ? 'Trim away inside' : 'Trim away outside', (s) => trimBetween(s, h.id, b, mode === 'inside', opts));
          return;
        }
        // a line or arc of a slot: the intended design warns that the slot stops being one entity
        const slot = ctx.sketch.entities[h.id]?.slot;
        const trim = () => ctx.commit('Trim Entities', (s) => {
          const t = trimEntity(s, h.id, info.p, opts);
          if (!slot) return t;
          const ents = Object.fromEntries(Object.entries(t.entities).map(([k, e]) => [k, e.slot === slot ? { ...e, slot: undefined } : e]));
          return { ...t, entities: ents };
        });
        if (slot && ctx.confirm) ctx.confirm('Trim Entities', 'This trim operation will destroy the slot entity. Do you want to continue?', 'trimSlot', trim);
        else trim();
        return;
      }
      case 'sketchFillet': {
        // two lines (a corner) -> tangent arc of the radius in the Property Panel
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (!h || h.kind !== 'entity' || ctx.sketch.entities[h.id]?.kind !== 'line') return;
        const prev = ctx.selection.filter((x) => x.kind === 'entity' && ctx.sketch.entities[x.id]?.kind === 'line' && x.id !== h.id);
        if (!prev.length) {
          ctx.select([{ kind: 'entity', id: h.id }]);
          return;
        }
        const a = prev[prev.length - 1].id;
        const r = ctx.filletRadius;
        let ok = false;
        ctx.commit('Sketch Fillet', (s) => {
          const res = sketchFillet(s, a, h.id, r, ctx.sketchTool?.filletKeepCorners !== false);
          ok = !!res;
          // Dimension each fillet: a radius dimension on the new arc
          return res ? (ctx.sketchTool?.filletDimension ? addConstraint(res.sketch, 'radius', [res.arcId], { value: r })[0] : res.sketch) : s;
        });
        if (!ok) ctx.message('The lines must meet at a corner (or cross) and the radius must fit.');
        ctx.select([]);
        return;
      }
      case 'extend': {
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (!h || h.kind !== 'entity') return;
        ctx.commit('Extend Entities', (s) => extendEntity(s, h.id, info.p));
        return;
      }
      case 'sketchChamfer': {
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (!h || h.kind !== 'entity' || ctx.sketch.entities[h.id]?.kind !== 'line') return;
        const prev = ctx.selection.filter((x) => x.kind === 'entity' && ctx.sketch.entities[x.id]?.kind === 'line' && x.id !== h.id);
        if (!prev.length) {
          ctx.select([{ kind: 'entity', id: h.id }]);
          return;
        }
        const a = prev[prev.length - 1].id;
        let { d1, d2 } = ctx.chamfer;
        if (ctx.sketchTool?.chamferMode === 'angle') {
          // Angle-distance: d1 along the first line, the chamfer at the angle from it; d2 follows from the corner angle
          const L = (id: Id) => { const e = ctx.sketch.entities[id] as { p1: Id; p2: Id }; return [ctx.sketch.points[e.p1], ctx.sketch.points[e.p2]]; };
          const [a1, a2] = L(a), [b1, b2] = L(h.id);
          const da = { x: a2.x - a1.x, y: a2.y - a1.y }, db = { x: b2.x - b1.x, y: b2.y - b1.y };
          const phi = Math.acos(Math.min(1, Math.abs(da.x * db.x + da.y * db.y) / ((Math.hypot(da.x, da.y) * Math.hypot(db.x, db.y)) || 1)));
          const corner = Math.PI - phi;
          const th = ((ctx.sketchTool.chamferAngle ?? 45) * Math.PI) / 180;
          const other = Math.PI - th - corner;
          d2 = other > 1e-6 ? (d1 * Math.sin(th)) / Math.sin(other) : d1;
        }
        let ok = false;
        ctx.commit('Sketch Chamfer', (s) => {
          const res = sketchChamfer(s, a, h.id, d1, d2);
          ok = !!res;
          return res ? res.sketch : s;
        });
        if (!ok) ctx.message('The lines must meet at a corner (or cross) and the distances must fit.');
        ctx.select([]);
        return;
      }
      case 'offset':
      case 'moveEntities':
      case 'copyEntities':
      case 'rotateEntities':
      case 'scaleEntities':
      case 'linearSketchPattern':
      case 'circularSketchPattern': {
        // the Property Panel applies the tool; clicks collect the entities (points are not picked here)
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance, new Set([...Object.keys(ctx.sketch.points), ctx.sketch.origin]));
        if (h && h.kind === 'entity') ctx.toggleSelect({ kind: 'entity', id: h.id }, true);
        return;
      }
      case 'slot':
      case 'centerSlot': {
        // Straight Slot: start and end of the centreline (Centerpoint: centre and one end), then the width
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 2) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const geom = slotGeometry(this.pts[0], this.pts[1], p, this.tool === 'centerSlot');
        if (!geom) return;
        const startSnap = this.snapHits[0];
        ctx.commit('Slot', (s) => {
          const { a, b, a1, b1, a2, b2 } = geom;
          let [s1, l1] = addLine(s, a1, b1);
          let arcB, l2, arcA, cl;
          [s1, arcB] = addArc(s1, b, l1.p2, b2, false);
          [s1, l2] = addLine(s1, arcB.end, a2);
          [s1, arcA] = addArc(s1, a, l2.p2, l1.p1, false);
          [s1, cl] = addLine(s1, arcA.center, arcB.center, true);
          // the four curves and the centreline are one slot
          const slotId = l1.id;
          s1 = { ...s1, entities: Object.fromEntries(Object.entries(s1.entities).map(([k, e]) => [k, [l1.id, arcB.id, l2.id, arcA.id, cl.id].includes(k) ? { ...e, slot: slotId } : e])) };
          // the relations the intended design adds: tangent at the four junctions, equal arcs
          s1 = addConstraint(s1, 'tangent', [l1.id, arcB.id])[0];
          s1 = addConstraint(s1, 'tangent', [l2.id, arcB.id])[0];
          s1 = addConstraint(s1, 'tangent', [l2.id, arcA.id])[0];
          s1 = addConstraint(s1, 'tangent', [l1.id, arcA.id])[0];
          s1 = addConstraint(s1, 'equal', [arcA.id, arcB.id])[0];
          // Add dimensions: centre-to-centre length (or overall length via the arc condition) and the width
          if (ctx.sketchTool?.slotDimensions) {
            const ca = s1.points[arcA.center], cb = s1.points[arcB.center];
            const L = Math.hypot(cb.x - ca.x, cb.y - ca.y), r = s1.scalars[arcA.r];
            s1 = addConstraint(s1, 'distance', [arcA.center, arcB.center], ctx.sketchTool.slotOverall ? { value: L + 2 * r, arcCondition: { 0: { entityId: arcA.id, mode: 'max' as const }, 1: { entityId: arcB.id, mode: 'max' as const } } } : { value: L })[0];
            s1 = addConstraint(s1, 'radius', [arcA.id], { value: r })[0];
          }
          return this.inferredRelations(s1, startSnap, this.tool === 'centerSlot' ? arcA.center : arcA.center);
        });
        this.reset();
        return;
      }
      case 'tangentArc': {
        // Tangent Arc: from the end of a line or arc, tangent to it, to the clicked end point
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (!this.pts.length) {
          const t = sn?.pointId ? this.endTangent(ctx.sketch, sn.pointId) : null;
          if (!t || !sn?.pointId) {
            ctx.message('Start the tangent arc on the end point of a line or an arc.');
            return;
          }
          this.pts.push(ctx.sketch.points[sn.pointId]);
          this.snapHits.push(sn);
          this.tangentFrom = { pointId: sn.pointId, entityId: t.entityId, dir: t.dir };
          return;
        }
        const tf = this.tangentFrom;
        const arc = tf ? this.tangentArcGeometry(this.pts[0], tf.dir, p) : null;
        if (!tf || !arc) return;
        ctx.commit('Tangent Arc', (s) => {
          const [s1, a] = addArc(s, arc.center, tf.pointId, p, arc.ccw);
          let s2 = addConstraint(s1, 'tangent', [a.id, tf.entityId])[0];
          if (sn?.pointId) s2 = addConstraint(s2, 'coincident', [a.end, sn.pointId])[0];
          return s2;
        });
        this.reset();
        return;
      }
      case 'perimeterCircle': {
        // Perimeter Circle: three points on the circle
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        this.pts.push(p);
        this.snapHits.push(sn);
        if (this.pts.length < 3) return;
        const arc = this.arcFrom3(this.pts[0], this.pts[1], this.pts[2]);
        if (!arc) {
          ctx.message('Points are collinear; pick another third point.');
          this.pts.pop();
          this.snapHits.pop();
          return;
        }
        const r = dist(arc.center, this.pts[0]);
        const hits = [...this.snapHits];
        ctx.commit('Circle', (s) => {
          let [s1, e] = addCircle(s, arc.center, r);
          // Add dimensions: a diameter (default) or radius dimension on the new circle
          if (ctx.sketchTool?.addDimensions) s1 = addConstraint(s1, ctx.sketchTool.circleDiameter !== false ? 'diameter' : 'radius', [e.id], { value: ctx.sketchTool.circleDiameter !== false ? 2 * r : r })[0];
          for (const h of hits) if (h?.pointId) s1 = addConstraint(s1, 'pointOnEntity', [h.pointId, e.id])[0];
          return s1;
        });
        this.reset();
        return;
      }
      case 'centerArcSlot': {
        // Centerpoint Arc Slot: arc centre, start of the centre arc, its end, then the width
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 3) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const three = this.centerArcPoints(this.pts[0], this.pts[1], this.pts[2]);
        const g = three ? this.arcSlotGeometry(three.s, three.e, three.m, p) : null;
        if (!g) return;
        ctx.commit('Arc Slot', (s) => this.addArcSlot(s, g));
        this.reset();
        return;
      }
      case 'arcSlot': {
        // 3 Point Arc Slot: start and end of the centre arc, a point on it, then the width
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 3) {
          this.pts.push(p);
          this.snapHits.push(sn);
          if (this.pts.length === 3 && !this.arcFrom3(this.pts[0], this.pts[1], this.pts[2])) {
            ctx.message('Points are collinear; pick another point on the arc.');
            this.pts.pop();
            this.snapHits.pop();
          }
          return;
        }
        const g = this.arcSlotGeometry(this.pts[0], this.pts[1], this.pts[2], p);
        if (!g) return;
        ctx.commit('Arc Slot', (s) => this.addArcSlot(s, g));
        this.reset();
        return;
      }
      case 'partialEllipse': {
        // centre, end of the major axis, start point (sets the minor radius), end point
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 3) {
          if (this.pts.length >= 1 && dist(this.pts[this.pts.length - 1], p) < 1e-9) return;
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const [c, m, p3] = this.pts;
        const g = this.partialEllipseGeom(c, m, p3, p);
        if (!g) return;
        const cSnap = this.snapHits[0];
        ctx.commit('Partial Ellipse', (s) => {
          const [s1, e] = addEllipseArc(s, c, m, g.b, g.start, g.end, true);
          return this.inferredRelations(s1, cSnap, e.center);
        });
        this.reset();
        return;
      }
      case 'parabola': {
        // focus, apex, then the two ends along the parabola
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 3) {
          if (this.pts.length >= 1 && dist(this.pts[this.pts.length - 1], p) < 1e-9) return;
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const fr = this.parabolaFrame(this.pts[0], this.pts[1]);
        if (!fr) return;
        const x0 = fr.xOf(this.pts[2]), x1 = fr.xOf(p);
        if (Math.abs(x1 - x0) < 1e-6) return;
        const bz = fr.bez(x0, x1);
        ctx.commit('Parabola', (s) => addConic(s, bz.a, bz.b, bz.c, 0.5, { parabola: true })[0]);
        this.reset();
        return;
      }
      case 'conic': {
        // start, end, top vertex, then the rho (shoulder) point
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length < 3) {
          if (this.pts.length >= 1 && dist(this.pts[this.pts.length - 1], p) < 1e-9) return;
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const [A, B, C] = this.pts;
        const rho = this.conicRho(A, B, C, p);
        const snaps = this.snapHits.slice();
        ctx.commit('Conic', (s) => {
          const [s0, e] = addConic(s, A, B, C, rho);
          const s1 = this.inferredRelations(s0, snaps[0], e.start);
          return this.inferredRelations(s1, snaps[1], e.end);
        });
        this.reset();
        return;
      }
      case 'styleSpline': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        this.pts.push(p);
        this.snapHits.push(sn);
        return;
      }
      case 'ellipse': {
        // centre, end of the major axis, then a point that sets the minor radius
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length < 2) {
          if (this.pts.length === 1 && dist(this.pts[0], p) < 1e-9) return;
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const [c, m] = this.pts;
        const b = this.ellipseMinor(c, m, p);
        if (b < 1e-9) return;
        const cSnap = this.snapHits[0];
        ctx.commit('Ellipse', (s) => {
          const [s1, e] = addEllipse(s, c, m, b);
          return this.inferredRelations(s1, cSnap, e.center);
        });
        this.reset();
        return;
      }
      case 'text': {
        const { p } = this.applySnap(ctx, info.p, null);
        const o = this.textOptions;
        if (!o.text.trim()) {
          ctx.message('Type the text in the Sketch Text Property Panel first.');
          return;
        }
        ctx.commit('Sketch Text', (s) => addText(s, p, o.text, o.height, { bold: o.bold, widthFactor: o.widthFactor, spacing: o.spacing, angle: o.angle })[0]);
        this.reset();
        return;
      }
      case 'polygon': {
        const { p, snap: sn } = this.applySnap(ctx, info.p, null);
        if (this.pts.length === 0) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const c = this.pts[0];
        const r = dist(c, p);
        if (r < 1e-9) return;
        const rot = Math.atan2(p.y - c.y, p.x - c.x);
        const cSnap = this.snapHits[0];
        const sides = this.polygonSides;
        const inscribed = this.polygonInscribed;
        ctx.commit('Polygon', (s) => {
          const [s1, lines] = addPolygon(s, c, r, sides, rot, inscribed);
          const circleId = s1.entityOrder[s1.entityOrder.length - 1];
          const circle = s1.entities[circleId] as { center: Id };
          void lines;
          return this.inferredRelations(s1, cSnap, circle.center);
        });
        this.reset();
        return;
      }
      case 'centerline':
      case 'line': {
        const construction = this.tool === 'centerline';
        const { p: p0, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length === 0) {
          this.pts.push(p0);
          this.snapHits.push(sn);
          return;
        }
        const a = this.pts[this.pts.length - 1];
        // Orientation (Insert Line PM): Horizontal / Vertical / Angle hold the second point on that direction
        const ori = ctx.sketchTool?.lineOrientation ?? 'sketched';
        let p = p0;
        if (ori === 'horizontal') p = { x: p0.x, y: a.y };
        else if (ori === 'vertical') p = { x: a.x, y: p0.y };
        else if (ori === 'angle') {
          const t = ((ctx.sketchTool?.lineAngle ?? 45) * Math.PI) / 180;
          const d = (p0.x - a.x) * Math.cos(t) + (p0.y - a.y) * Math.sin(t);
          p = { x: a.x + d * Math.cos(t), y: a.y + d * Math.sin(t) };
        }
        const midpointLine = !!ctx.sketchTool?.midpointLine && this.tool === 'line' && !this.lastLineEnd;
        if (dist(a, p) < 1e-9) return;
        const startSnap = this.snapHits[this.snapHits.length - 1];
        const prevEnd = this.lastLineEnd;
        const horizontal = Math.abs(a.y - p.y) < 1e-9 && Math.abs(a.x - p.x) > 1e-9;
        const vertical = Math.abs(a.x - p.x) < 1e-9 && Math.abs(a.y - p.y) > 1e-9;
        let createdEnd: Id | null = null;
        // Infinite length: the line runs on far past both clicked points
        const infinite = !!ctx.sketchTool?.infiniteLength && this.tool === 'line';
        const far = 1000;
        const ux = (p.x - a.x) / dist(a, p), uy = (p.y - a.y) / dist(a, p);
        ctx.commit('Line', (s) => {
          // Midpoint line: the first click is the middle; a construction point there holds the midpoint relation
          let [s1, l] = infinite
            ? addLine(s, { x: a.x - ux * far, y: a.y - uy * far }, { x: p.x + ux * far, y: p.y + uy * far }, construction)
            : midpointLine
              ? addLine(s, { x: 2 * a.x - p.x, y: 2 * a.y - p.y }, p, construction)
              : addLine(s, prevEnd ?? a, p, construction);
          createdEnd = l.p2;
          if (midpointLine) {
            const [s2, mp] = addPoint(s1, a, true);
            s1 = addConstraint(s2, 'midpoint', [mp.id, l.id])[0];
            s1 = this.inferredRelations(s1, startSnap, mp.id);
          } else if (!prevEnd) s1 = this.inferredRelations(s1, startSnap, l.p1);
          s1 = this.inferredRelations(s1, sn, l.p2);
          // a tangent snap also makes the line tangent to the curve (Relations/Snaps ▸ Tangent)
          if (sn?.kind === 'tangent' && sn.entityId && !this.noInfer && automaticRelations()) s1 = addConstraint(s1, 'tangent', [l.id, sn.entityId])[0];
          // ending exactly level/plumb on an existing point or inference line also adds Horizontal/Vertical, by design
          const level = (k: 'horizontal' | 'vertical') => sn?.kind === k || !sn || ori === k || sn.kind === 'align' || !!sn.pointId;
          const hv = (horizontal || ori === 'horizontal') && level('horizontal') ? 'horizontal' : (vertical || ori === 'vertical') && level('vertical') ? 'vertical' : null;
          if (!this.noInfer && hv) s1 = addConstraint(s1, hv, [l.id])[0];
          // Add dimensions: the length of the line
          if (ctx.sketchTool?.addDimensions && !infinite) s1 = addConstraint(s1, 'length', [l.id], { value: dist(a, p) * (midpointLine ? 2 : 1) })[0];
          return s1;
        });
        // chain: continue from end point; snapping to an existing point (or an infinite line) ends the chain
        if (sn?.pointId || infinite) {
          this.reset();
        } else {
          this.pts = [p];
          this.snapHits = [null];
          this.lastLineEnd = createdEnd;
          this.lastLineEndPt = p;
        }
        return;
      }
      case 'rect3Corner':
      case 'rect3Center':
      case 'parallelogram': {
        // three clicks: first edge (or centre and side midpoint), then the width / third corner
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length < 2) {
          if (this.pts.length === 1 && dist(this.pts[0], p) < 1e-9) return;
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const corners = this.rect3Corners(this.pts[0], this.pts[1], p);
        if (!corners) return;
        const tool = this.tool;
        const firstSnap = this.snapHits[0];
        const centre = this.pts[0];
        ctx.commit(tool === 'parallelogram' ? 'Parallelogram' : '3 Point Rectangle', (s) => {
          let [s1, l1] = addLine(s, corners[0], corners[1]);
          let l2, l3, l4;
          [s1, l2] = addLine(s1, l1.p2, corners[2]);
          [s1, l3] = addLine(s1, l2.p2, corners[3]);
          [s1, l4] = addLine(s1, l3.p2, l1.p1);
          s1 = addConstraint(s1, 'parallel', [l1.id, l3.id])[0];
          s1 = addConstraint(s1, 'parallel', [l2.id, l4.id])[0];
          if (tool !== 'parallelogram') s1 = addConstraint(s1, 'perpendicular', [l1.id, l2.id])[0];
          if (tool === 'rect3Center') {
            // the centre point in the middle of two construction diagonals, as the Center Rectangle
            let [s2, c] = addPoint(s1, centre, true);
            let [s3, d] = addLine(s2, l1.p1, l2.p2, true);
            s3 = addConstraint(s3, 'midpoint', [c.id, d.id])[0];
            s3 = addLine(s3, l1.p2, l3.p2, true)[0];
            return this.inferredRelations(s3, firstSnap, c.p);
          }
          return this.inferredRelations(s1, firstSnap, l1.p1);
        });
        this.reset();
        return;
      }
      case 'midpointLine': {
        // first click: the midpoint; second: one end (the other end mirrors it)
        const { p, snap: sn } = this.applySnap(ctx, info.p, ref);
        if (this.pts.length === 0) {
          this.pts.push(p);
          this.snapHits.push(sn);
          return;
        }
        const m = this.pts[0];
        if (dist(m, p) < 1e-9) return;
        const midSnap = this.snapHits[0];
        ctx.commit('Midpoint Line', (s) => {
          let [s1, l] = addLine(s, { x: 2 * m.x - p.x, y: 2 * m.y - p.y }, p);
          if (midSnap?.pointId) s1 = addConstraint(s1, 'midpoint', [midSnap.pointId, l.id])[0];
          else {
            const [s2, c] = addPoint(s1, m, true);
            s1 = addConstraint(s2, 'midpoint', [c.p, l.id])[0];
          }
          return this.inferredRelations(s1, sn, l.p2);
        });
        this.reset();
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
        ctx.commit('Rectangle', (s) => {
          let [s1, l1] = addLine(s, corners[0], corners[1]);
          let l2, l3, l4;
          [s1, l2] = addLine(s1, l1.p2, corners[2]);
          [s1, l3] = addLine(s1, l2.p2, corners[3]);
          [s1, l4] = addLine(s1, l3.p2, l1.p1);
          s1 = addConstraint(s1, 'horizontal', [l1.id])[0];
          s1 = addConstraint(s1, 'vertical', [l2.id])[0];
          s1 = addConstraint(s1, 'horizontal', [l3.id])[0];
          s1 = addConstraint(s1, 'vertical', [l4.id])[0];
          // Add dimensions: width and height
          if (ctx.sketchTool?.addDimensions) {
            s1 = addConstraint(s1, 'length', [l1.id], { value: dist(corners[0], corners[1]) })[0];
            s1 = addConstraint(s1, 'length', [l2.id], { value: dist(corners[1], corners[2]) })[0];
          }
          const opt = this.rectConstruction;
          if (center) {
            // the centre point at the middle of a construction diagonal (the intended design draws both diagonals)
            let [s2, c] = addPoint(s1, a, true);
            let [s3, d] = addLine(s2, l1.p1, l2.p2, true);
            s3 = addConstraint(s3, 'midpoint', [c.id, d.id])[0];
            if (!opt.on || opt.mode === 'corners') s3 = addLine(s3, l1.p2, l3.p2, true)[0];
            if (opt.on && opt.mode === 'midpoints') {
              // construction lines between the midpoints of opposite sides
              let [s4, m1] = addLine(s3, { x: (corners[0].x + corners[1].x) / 2, y: corners[0].y }, { x: (corners[2].x + corners[3].x) / 2, y: corners[2].y }, true);
              s4 = addConstraint(s4, 'midpoint', [m1.p1, l1.id])[0];
              s4 = addConstraint(s4, 'midpoint', [m1.p2, l3.id])[0];
              let [s5, m2] = addLine(s4, { x: corners[1].x, y: (corners[1].y + corners[2].y) / 2 }, { x: corners[3].x, y: (corners[3].y + corners[0].y) / 2 }, true);
              s5 = addConstraint(s5, 'midpoint', [m2.p1, l2.id])[0];
              s5 = addConstraint(s5, 'midpoint', [m2.p2, l4.id])[0];
              s3 = s5;
            }
            s1 = this.inferredRelations(s3, startSnap, c.p);
          } else {
            if (opt.on && opt.mode === 'corners') {
              s1 = addLine(s1, l1.p1, l2.p2, true)[0];
              s1 = addLine(s1, l1.p2, l3.p2, true)[0];
            } else if (opt.on) {
              let [s4, m1] = addLine(s1, { x: (corners[0].x + corners[1].x) / 2, y: corners[0].y }, { x: (corners[2].x + corners[3].x) / 2, y: corners[2].y }, true);
              s4 = addConstraint(s4, 'midpoint', [m1.p1, l1.id])[0];
              s4 = addConstraint(s4, 'midpoint', [m1.p2, l3.id])[0];
              let [s5, m2] = addLine(s4, { x: corners[1].x, y: (corners[1].y + corners[2].y) / 2 }, { x: corners[3].x, y: (corners[3].y + corners[0].y) / 2 }, true);
              s5 = addConstraint(s5, 'midpoint', [m2.p1, l2.id])[0];
              s5 = addConstraint(s5, 'midpoint', [m2.p2, l4.id])[0];
              s1 = s5;
            }
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
        ctx.commit('Circle', (s) => {
          let [s1, e] = addCircle(s, c, r);
          // Add dimensions: a diameter (default) or radius dimension on the new circle
          if (ctx.sketchTool?.addDimensions) s1 = addConstraint(s1, ctx.sketchTool.circleDiameter !== false ? 'diameter' : 'radius', [e.id], { value: ctx.sketchTool.circleDiameter !== false ? 2 * r : r })[0];
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
          ctx.message('Points are collinear; pick another third point.');
          this.pts.pop();
          this.snapHits.pop();
          return;
        }
        const [s0, s1] = this.snapHits;
        ctx.commit('Arc', (s) => {
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
        ctx.commit('Arc', (s) => {
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
      case 'hdim':
      case 'vdim':
      case 'dimension': {
        if (this.dimPlacing && hitTest(ctx.sketch, info.p, ctx.tolerance)) {
          // clicking another entity extends the selection (e.g. line + line -> angle)
          this.dimPlacing = null;
        }
        if (this.dimPlacing) {
          const placing = this.resolveDim(ctx, info.p);
          const label = info.p;
          let createdId: Id | null = null;
          ctx.commit('Dimension', (s) => {
            const [s1, c] = addConstraint(s, placing.kind, placing.refs, { value: placing.value, labelOffset: label, ...(placing.arcCondition ? { arcCondition: placing.arcCondition } : {}), ...(placing.doubled ? { doubled: true } : {}) });
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
        // Shift+click on an arc or circle: the dimension goes to its edge (tangent), by design
        const ent = h.kind === 'entity' ? ctx.sketch.entities[h.id] : undefined;
        const tangent = !!info.shift && !!ent && (ent.kind === 'arc' || ent.kind === 'circle');
        const item: SelectionItem = tangent ? { kind: h.kind, id: h.id, tangent: true } : { kind: h.kind, id: h.id };
        const sel = [...ctx.selection.filter((x) => !(x.kind === item.kind && x.id === item.id)), item];
        ctx.select(sel);
        const opt = dimensionForSelection(ctx.sketch, sel);
        if (opt) {
          // an angle needs both lines; a single line is "length" — but allow extending to angle on a second click
          this.dimPlacing = { kind: opt.kind, refs: opt.refs, value: measure(ctx.sketch, opt), arcCondition: opt.arcCondition };
        }
        return;
      }
      default:
        return;
    }
  }

  pointerUp(ctx: ToolContext, info: PointerInfo): void {
    if (this.powerPath) {
      const path = [...this.powerPath, info.p];
      this.powerPath = null;
      this.down = null;
      const o = ctx.sketchTool;
      const opts = { keepAsConstruction: !!o?.trimKeep, ignoreConstruction: !!o?.trimIgnore };
      const moved = path.length > 2 && dist(path[0], path[path.length - 1]) > ctx.tolerance;
      if (moved) ctx.commit('Trim Entities (Power trim)', (s) => powerTrim(s, path, opts));
      else {
        const h = hitTest(ctx.sketch, info.p, ctx.tolerance);
        if (h && h.kind === 'entity') ctx.commit('Trim Entities', (s) => trimEntity(s, h.id, info.p, opts));
      }
      return;
    }
    const down = this.down;
    this.down = null;
    if (this.tool !== 'select' && this.tool !== 'dimension' && this.tool !== 'hdim' && this.tool !== 'vdim' && this.tool !== 'point' && down) {
      // click-drag: the button went down on the first point and came up on the second
      const moved = Math.hypot(info.px - down.px, info.py - down.py) > 6;
      const placedOnDown = this.pts.length === down.pts + 1;
      if (moved && placedOnDown) {
        const chainTool = this.tool === 'line' || this.tool === 'centerline';
        this.place(ctx, { ...info, button: 0 });
        // a dragged line is a single segment (no chain), by design
        if (chainTool) this.reset();
      }
      return;
    }
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
      if (this.boxStart && this.boxEnd && this.lassoMode && this.lasso && this.lasso.length > 2) {
        // Lasso Selection: entities with all their points inside the freehand loop
        const poly = this.lasso;
        const inPoly = (q: SketchPoint) => {
          let c = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const A = poly[i], B = poly[j];
            if (A.y > q.y !== B.y > q.y && q.x < ((B.x - A.x) * (q.y - A.y)) / (B.y - A.y || 1e-12) + A.x) c = !c;
          }
          return c;
        };
        const items: SelectionItem[] = [];
        for (const id of ctx.sketch.entityOrder) {
          const e = ctx.sketch.entities[id];
          const ids = e.kind === 'arc' ? [e.start, e.end] : entityPoints(e);
          if (ids.every((pid) => inPoly(ctx.sketch.points[pid]))) items.push({ kind: 'entity', id });
        }
        ctx.select(info.ctrl || info.shift ? [...ctx.selection, ...items] : items);
        this.boxStart = this.boxEnd = null;
        this.lasso = null;
        return;
      }
      if (this.boxStart && this.boxEnd) {
        const a = this.boxStart, b = this.boxEnd;
        if (dist(a, b) > ctx.tolerance) {
          const minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x), miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
          const crossing = b.x < a.x; // right-to-left = crossing selection, like desktop CAD
          const items: SelectionItem[] = [];
          for (const id of ctx.sketch.entityOrder) {
            const e = ctx.sketch.entities[id];
            const ids = e.kind === 'arc' ? [e.start, e.end] : entityPoints(e);
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
    if ((this.tool === 'spline' || this.tool === 'styleSpline') && this.pts.length >= 2) this.finishSpline(ctx);
    else if (this.tool === 'line' || this.tool === 'centerline') this.reset();
  }

  /** Enter: finish the current multi-point entity */
  enter(ctx: ToolContext): void {
    if ((this.tool === 'spline' || this.tool === 'styleSpline') && this.pts.length >= 2) this.finishSpline(ctx);
    else this.reset();
  }

  private finishSpline(ctx: ToolContext) {
    const pts = this.pts.slice();
    const snaps = this.snapHits.slice();
    const style = this.tool === 'styleSpline';
    ctx.commit(style ? 'Style Spline' : 'Spline', (s) => {
      let [s1, e] = addSpline(s, pts, false, style ? { style: true } : {});
      e.points.forEach((pid, i) => {
        s1 = this.inferredRelations(s1, snaps[i], pid);
      });
      return s1;
    });
    this.reset();
  }

  /** The dimension that would be placed at the cursor; for two points the type follows the cursor by design:
   * above/below the points = horizontal, left/right = vertical, diagonal = aligned distance. */
  private resolveDim(ctx: ToolContext, cursor: SketchPoint): { kind: ConstraintKind; refs: Id[]; value: number; arcCondition?: Record<number, { entityId: Id; mode: 'min' | 'max' }>; doubled?: boolean } {
    const d = this.dimPlacing!;
    const s = ctx.sketch;
    // a distance to a centerline with the text past the centerline is a doubled distance (a diameter), by design
    const cl = d.kind === 'distance' && d.refs.length === 2 && !d.arcCondition ? s.entities[d.refs[1]] : undefined;
    if (cl?.kind === 'line' && cl.construction) {
      const a = s.points[cl.p1], b = s.points[cl.p2];
      const P0 = d.refs[0] in s.points ? s.points[d.refs[0]] : s.points[(s.entities[d.refs[0]] as { p: Id }).p];
      const side = (q: SketchPoint) => (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
      if (P0 && side(P0) * side(cursor) < 0) return { kind: 'distance', refs: d.refs, value: 2 * measure(s, { kind: 'distance', refs: d.refs, label: '' }), doubled: true };
    }
    // Horizontal / Vertical Dimension: always the x or y distance (a line gives its two end points)
    if (this.tool === 'hdim' || this.tool === 'vdim') {
      const kind: ConstraintKind = this.tool === 'hdim' ? 'hDistance' : 'vDistance';
      const line = d.refs.length === 1 ? s.entities[d.refs[0]] : undefined;
      const refs = line?.kind === 'line' ? [line.p1, line.p2] : d.refs;
      if (refs.length === 2) return { kind, refs, value: measure(s, { kind, refs, label: '' }) };
    }
    // a dimension to the edge of an arc stays a straight distance
    if (d.arcCondition) return { kind: 'distance', refs: d.refs, value: measure(s, { kind: 'distance', refs: d.refs, label: '', arcCondition: d.arcCondition }), arcCondition: d.arcCondition };
    const isPt = (id: Id) => id in s.points || s.entities[id]?.kind === 'point';
    if (d.kind === 'distance' && d.refs.length === 2 && isPt(d.refs[0]) && isPt(d.refs[1])) {
      const P = (id: Id) => (id in s.points ? s.points[id] : s.points[(s.entities[id] as { p: Id }).p]);
      const a = P(d.refs[0]), b = P(d.refs[1]);
      const minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x), miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
      const tol = ctx.tolerance;
      const inX = cursor.x >= minx - tol && cursor.x <= maxx + tol;
      const inY = cursor.y >= miny - tol && cursor.y <= maxy + tol;
      let kind: ConstraintKind = 'distance';
      if (inX && !inY && maxx - minx > tol) kind = 'hDistance';
      else if (inY && !inX && maxy - miny > tol) kind = 'vDistance';
      return { kind, refs: d.refs, value: measure(s, { kind, refs: d.refs, label: '' }) };
    }
    return { kind: d.kind, refs: d.refs, value: d.value };
  }

  /** corners of a 3 Point Corner / 3 Point Center Rectangle or a Parallelogram from three clicks */
  private rect3Corners(a: SketchPoint, b: SketchPoint, p: SketchPoint): [SketchPoint, SketchPoint, SketchPoint, SketchPoint] | null {
    const L = dist(a, b);
    if (L < 1e-9) return null;
    const u = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
    const n = { x: -u.y, y: u.x };
    if (this.tool === 'parallelogram') {
      const cross = (b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x);
      if (Math.abs(cross) < 1e-9) return null;
      return [a, b, p, { x: a.x + p.x - b.x, y: a.y + p.y - b.y }];
    }
    const h = (p.x - a.x) * n.x + (p.y - a.y) * n.y;
    if (Math.abs(h) < 1e-9) return null;
    if (this.tool === 'rect3Center') {
      // a = centre, b = the midpoint of one side, p sets the other half size
      const hv = Math.abs(h);
      const P = (su: number, sv: number) => ({ x: a.x + u.x * L * su + n.x * hv * sv, y: a.y + u.y * L * su + n.y * hv * sv });
      return [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)];
    }
    return [a, b, { x: b.x + n.x * h, y: b.y + n.y * h }, { x: a.x + n.x * h, y: a.y + n.y * h }];
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
    const cp = cur ? (sn ? sn.point : gridPoint(cur, { quick: ctx.snapGrid, shown: !!ctx.gridShown, size: ctx.gridSize })) : null;
    if (sn) out.hint = { endpoint: 'Endpoint', midpoint: 'Midpoint', center: 'Center', on: 'On entity', horizontal: 'Horizontal', vertical: 'Vertical', origin: 'Origin', quadrant: 'Quadrant', align: '', intersection: 'Intersection', angle: 'Angle', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent' }[sn.kind];
    if (this.powerPath && this.powerPath.length > 1) out.preview.push({ points: this.powerPath.slice(), dashed: true });
    if (this.boxStart && this.boxEnd && this.lassoMode && this.lasso) out.lasso = this.lasso.slice();
    else if (this.boxStart && this.boxEnd) out.box = { a: this.boxStart, b: this.boxEnd };
    if (!cp) return out;
    switch (this.tool) {
      case 'slot':
      case 'centerSlot':
        if (this.pts.length === 1) {
          out.preview.push({ points: [this.pts[0], cp], dashed: true });
          out.previewPoints.push(this.pts[0]);
          out.hint = out.hint || `L = ${dist(this.pts[0], cp).toFixed(2)}`;
        } else if (this.pts.length === 2) {
          const g = slotGeometry(this.pts[0], this.pts[1], cp, this.tool === 'centerSlot');
          if (g) {
            out.preview.push({ points: slotOutline(g) });
            out.preview.push({ points: [g.a, g.b], dashed: true });
            out.previewPoints.push(g.a, g.b);
            out.hint = out.hint || `L = ${dist(g.a, g.b).toFixed(2)} · W = ${(2 * g.half).toFixed(2)}`;
          } else {
            out.preview.push({ points: [this.pts[0], this.pts[1]], dashed: true });
          }
        }
        break;
      case 'polygon':
        if (this.pts.length) {
          const c = this.pts[0];
          const r = dist(c, cp);
          const rot = Math.atan2(cp.y - c.y, cp.x - c.x);
          const n = this.polygonSides;
          const R = this.polygonInscribed ? r / Math.cos(Math.PI / n) : r;
          const rot0 = this.polygonInscribed ? rot - Math.PI / n : rot;
          const poly: SketchPoint[] = [];
          for (let i = 0; i <= n; i++) {
            const a = rot0 + (i / n) * Math.PI * 2;
            poly.push({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) });
          }
          out.preview.push({ points: poly });
          // the construction circle (inscribed or circumscribed) and the radius line
          const circ: SketchPoint[] = [];
          for (let i = 0; i <= 96; i++) circ.push({ x: c.x + r * Math.cos((i / 96) * Math.PI * 2), y: c.y + r * Math.sin((i / 96) * Math.PI * 2) });
          out.preview.push({ points: circ, dashed: true });
          out.preview.push({ points: [c, cp], dashed: true });
          out.previewPoints.push(c);
          out.hint = out.hint || `${this.polygonSides} sides · R = ${r.toFixed(2)}`;
        }
        break;
      case 'centerline':
      case 'line':
        if (this.pts.length) {
          const a = this.lastLineEndPt ?? this.pts[0];
          out.preview.push({ points: [a, cp], dashed: this.tool === 'centerline' });
          out.previewPoints.push(a);
          out.hint = out.hint || `L = ${dist(a, cp).toFixed(2)}`;
        }
        break;
      case 'rect3Corner':
      case 'rect3Center':
      case 'parallelogram':
        if (this.pts.length === 1) {
          out.preview.push({ points: [this.pts[0], cp], dashed: this.tool === 'rect3Center' });
          out.previewPoints.push(this.pts[0]);
          out.hint = out.hint || `L = ${dist(this.pts[0], cp).toFixed(2)}`;
        } else if (this.pts.length === 2) {
          const c = this.rect3Corners(this.pts[0], this.pts[1], cp);
          if (c) {
            out.preview.push({ points: [...c, c[0]] });
            out.hint = out.hint || `${dist(c[0], c[1]).toFixed(2)} x ${dist(c[1], c[2]).toFixed(2)}`;
          }
          out.previewPoints.push(...this.pts);
        }
        break;
      case 'midpointLine':
        if (this.pts.length) {
          const m = this.pts[0];
          out.preview.push({ points: [{ x: 2 * m.x - cp.x, y: 2 * m.y - cp.y }, cp] });
          out.previewPoints.push(m);
          out.hint = out.hint || `L = ${(2 * dist(m, cp)).toFixed(2)}`;
        }
        break;
      case 'rectangle':
      case 'centerRectangle':
        if (this.pts.length) {
          const c = this.rectCorners(this.pts[0], cp);
          if (c) out.preview.push({ points: [...c, c[0]] });
          if (this.tool === 'centerRectangle') out.previewPoints.push(this.pts[0]);
          if (c) out.readout = `x = ${dist(c[0], c[1]).toFixed(2)}, y = ${dist(c[1], c[2]).toFixed(2)}`;
        }
        break;
      case 'tangentArc':
        if (this.pts.length === 1 && this.tangentFrom) {
          const arc = this.tangentArcGeometry(this.pts[0], this.tangentFrom.dir, cp);
          if (arc) {
            out.preview.push({ points: arcPoly(arc.center, this.pts[0], cp, arc.ccw) });
            out.hint = out.hint || `R = ${dist(arc.center, cp).toFixed(2)}`;
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'perimeterCircle':
        if (this.pts.length === 1) out.preview.push({ points: [this.pts[0], cp], dashed: true });
        else if (this.pts.length === 2) {
          const arc = this.arcFrom3(this.pts[0], this.pts[1], cp);
          if (arc) {
            const r = dist(arc.center, cp);
            const poly: SketchPoint[] = [];
            for (let i = 0; i <= 64; i++) poly.push({ x: arc.center.x + r * Math.cos((i / 64) * Math.PI * 2), y: arc.center.y + r * Math.sin((i / 64) * Math.PI * 2) });
            out.preview.push({ points: poly });
            out.hint = out.hint || `R = ${r.toFixed(2)}`;
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'centerArcSlot':
        if (this.pts.length === 1) out.preview.push({ points: [this.pts[0], cp], dashed: true });
        else if (this.pts.length === 2) {
          const three = this.centerArcPoints(this.pts[0], this.pts[1], cp);
          if (three) out.preview.push({ points: arcPoly(this.pts[0], three.s, three.e, this.ccwFromCursor(this.pts[0], three.s, three.m)), dashed: true });
        } else if (this.pts.length === 3) {
          const three = this.centerArcPoints(this.pts[0], this.pts[1], this.pts[2]);
          const g = three ? this.arcSlotGeometry(three.s, three.e, three.m, cp) : null;
          if (g) {
            out.preview.push({ points: arcPoly(g.c, g.os, g.oe, g.ccw) });
            out.preview.push({ points: arcPoly(g.e, g.oe, g.ie, g.capEccw) });
            out.preview.push({ points: arcPoly(g.c, g.is, g.ie, g.ccw) });
            out.preview.push({ points: arcPoly(g.s, g.is, g.os, g.capSccw) });
            out.hint = out.hint || `W = ${(2 * g.h).toFixed(2)}`;
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'arcSlot':
        if (this.pts.length === 1) out.preview.push({ points: [this.pts[0], cp], dashed: true });
        else if (this.pts.length === 2) {
          const arc = this.arcFrom3(this.pts[0], this.pts[1], cp);
          if (arc) out.preview.push({ points: arcPoly(arc.center, this.pts[0], this.pts[1], arc.ccw), dashed: true });
        } else if (this.pts.length === 3) {
          const g = this.arcSlotGeometry(this.pts[0], this.pts[1], this.pts[2], cp);
          if (g) {
            out.preview.push({ points: arcPoly(g.c, g.os, g.oe, g.ccw) });
            out.preview.push({ points: arcPoly(g.e, g.oe, g.ie, g.capEccw) });
            out.preview.push({ points: arcPoly(g.c, g.is, g.ie, g.ccw) });
            out.preview.push({ points: arcPoly(g.s, g.is, g.os, g.capSccw) });
            out.preview.push({ points: arcPoly(g.c, g.s, g.e, g.ccw), dashed: true });
            out.hint = out.hint || `W = ${(2 * g.h).toFixed(2)}`;
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'ellipse':
        if (this.pts.length === 1) {
          out.preview.push({ points: [this.pts[0], cp], dashed: true });
          out.previewPoints.push(this.pts[0]);
          out.hint = out.hint || `a = ${dist(this.pts[0], cp).toFixed(2)}`;
        } else if (this.pts.length === 2) {
          const [c, m] = this.pts;
          const b = this.ellipseMinor(c, m, cp);
          const a = dist(c, m), rot = Math.atan2(m.y - c.y, m.x - c.x);
          const poly: SketchPoint[] = [];
          for (let i = 0; i <= 72; i++) {
            const t = (i / 72) * Math.PI * 2, x = a * Math.cos(t), y = b * Math.sin(t);
            poly.push({ x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) });
          }
          out.preview.push({ points: poly });
          out.preview.push({ points: [{ x: 2 * c.x - m.x, y: 2 * c.y - m.y }, m], dashed: true });
          out.previewPoints.push(c, m);
          out.hint = out.hint || `a = ${a.toFixed(2)} · b = ${b.toFixed(2)}`;
        }
        break;
      case 'text': {
        const o = this.textOptions;
        const fake = { points: { a: cp }, entities: {}, entityOrder: [], scalars: {} } as unknown as Sketch;
        for (const loop of entityLoops(fake, { id: 'x', kind: 'text', anchor: 'a', text: o.text || ' ', height: o.height, bold: o.bold, widthFactor: o.widthFactor, spacing: o.spacing, angle: o.angle, construction: false }, 24)) out.preview.push({ points: loop });
        break;
      }
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
      case 'styleSpline':
        if (this.pts.length) {
          // the control polygon dashed, the Bezier curve solid
          out.preview.push({ points: [...this.pts, cp], dashed: true });
          out.preview.push({ points: sampleBezier([...this.pts, cp]) });
          out.previewPoints.push(...this.pts);
          out.hint = out.hint || 'Double-click or Esc to finish the style spline';
        }
        break;
      case 'partialEllipse':
        if (this.pts.length === 1) {
          out.preview.push({ points: [this.pts[0], cp], dashed: true });
          out.hint = out.hint || `a = ${dist(this.pts[0], cp).toFixed(2)}`;
        } else if (this.pts.length >= 2) {
          const [c, m] = this.pts;
          const g = this.partialEllipseGeom(c, m, this.pts.length === 2 ? cp : this.pts[2], this.pts.length === 3 ? cp : null);
          if (g) {
            if (this.pts.length === 2) {
              const full: SketchPoint[] = [];
              for (let i = 0; i <= 72; i++) full.push(this.ellipseAt(c, g.a, g.b, g.rot, (i / 72) * Math.PI * 2));
              out.preview.push({ points: full, dashed: true });
            } else out.preview.push({ points: g.poly });
            out.hint = out.hint || `a = ${g.a.toFixed(2)} · b = ${g.b.toFixed(2)}`;
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'parabola':
        if (this.pts.length === 1) out.preview.push({ points: [this.pts[0], cp], dashed: true });
        else if (this.pts.length >= 2) {
          const fr = this.parabolaFrame(this.pts[0], this.pts[1]);
          if (fr) {
            const x0 = this.pts.length === 3 ? fr.xOf(this.pts[2]) : -Math.abs(fr.xOf(cp));
            const x1 = this.pts.length === 3 ? fr.xOf(cp) : Math.abs(fr.xOf(cp));
            const poly: SketchPoint[] = [];
            for (let i = 0; i <= 40; i++) poly.push(fr.at(x0 + ((x1 - x0) * i) / 40));
            out.preview.push({ points: poly, dashed: this.pts.length === 2 });
          }
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'conic':
        if (this.pts.length === 1 || this.pts.length === 2) out.preview.push({ points: [...this.pts, cp], dashed: true });
        else if (this.pts.length === 3) {
          const [A, B, C] = this.pts;
          const rho = this.conicRho(A, B, C, cp);
          out.preview.push({ points: sampleConic(A, C, B, rho) });
          out.preview.push({ points: [A, C, B], dashed: true });
          out.hint = out.hint || `Rho = ${rho.toFixed(2)}`;
        }
        out.previewPoints.push(...this.pts);
        break;
      case 'spline':
        if (this.pts.length) {
          out.preview.push({ points: [...this.pts, cp] });
          out.previewPoints.push(...this.pts);
          out.hint = out.hint || 'Double-click or Esc to finish the spline';
        }
        break;
      case 'hdim':
      case 'vdim':
      case 'dimension':
        if (this.dimPlacing) {
          const r = this.resolveDim(ctx, cur!);
          out.dimPreview = { ...r, label: cur! };
          out.hint = `Click to place the dimension (${r.value.toFixed(2)})`;
        } else out.hint = 'Select entities to dimension';
        break;
      default:
        break;
    }
    // the measured size of what is being drawn, next to the cursor
    if (!out.readout && this.pts.length && out.hint.includes('=')) out.readout = out.hint.replace(' · ', ', ');
    if (out.readout) out.cursorAt = cp;
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

const contourCache = new WeakMap<Sketch, ReturnType<typeof findContours>>();
/** the closed region under a point: the innermost contour around it plus the contours directly inside it (holes) */
export function regionAt(s: Sketch, p: SketchPoint): Id[] | null {
  let cs = contourCache.get(s);
  if (!cs) contourCache.set(s, (cs = findContours(s)));
  const inside = (poly: SketchPoint[], q: SketchPoint) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  const around = cs.filter((c) => c.points.length > 2 && inside(c.points, p)).sort((a, b) => Math.abs(a.area) - Math.abs(b.area));
  const outer = around[0];
  if (!outer) return null;
  const holes = cs.filter((c) => c !== outer && Math.abs(c.area) < Math.abs(outer.area) && c.points.length > 2 && inside(outer.points, c.points[0]) && !inside(c.points, p));
  return [...outer.entityIds, ...holes.flatMap((h) => h.entityIds)];
}
