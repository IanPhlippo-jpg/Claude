import { useRef, useState } from 'react';
import { solveAll, useActiveSketch, useStore, type State } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { updateConstraint } from '../../core/sketch/model';
import { isDimension, type Constraint, type Sketch, type SketchPoint } from '../../core/sketch/types';

/** Where the drag handle of a dimension sits (sketch coordinates) and in which direction the value grows. */
function handleOf(s: Sketch, c: Constraint): { at: SketchPoint; dir: SketchPoint; k: number } | null {
  const P = (id: string): SketchPoint | undefined => (id in s.points ? s.points[id] : s.points[(s.entities[id] as { p?: string } | undefined)?.p ?? '']);
  const unit = (v: SketchPoint) => {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  };
  if (c.kind === 'length') {
    const e = s.entities[c.refs[0]];
    if (e?.kind !== 'line') return null;
    const a = s.points[e.p1], b = s.points[e.p2];
    return { at: b, dir: unit({ x: b.x - a.x, y: b.y - a.y }), k: 1 };
  }
  if (c.kind === 'radius' || c.kind === 'diameter') {
    const e = s.entities[c.refs[0]];
    if (e?.kind !== 'circle' && e?.kind !== 'arc') return null;
    const ctr = s.points[e.center], r = s.scalars[e.r];
    return { at: { x: ctr.x + r, y: ctr.y }, dir: { x: 1, y: 0 }, k: c.kind === 'diameter' ? 2 : 1 };
  }
  if ((c.kind === 'distance' || c.kind === 'hDistance' || c.kind === 'vDistance') && c.refs.length === 2) {
    const a = P(c.refs[0]), b = P(c.refs[1]);
    if (!a || !b) return null;
    if (c.kind === 'hDistance') return { at: b, dir: { x: Math.sign(b.x - a.x) || 1, y: 0 }, k: 1 };
    if (c.kind === 'vDistance') return { at: b, dir: { x: 0, y: Math.sign(b.y - a.y) || 1 }, k: 1 };
    return { at: b, dir: unit({ x: b.x - a.x, y: b.y - a.y }), k: 1 };
  }
  return null;
}

/** the value a pointer offset of `along` mm gives: rounded to the ruler increment (0.5 mm; 0.1 mm with Alt), never below it */
export const dragValue = (v0: number, along: number, fine: boolean): number => {
  const step = fine ? 0.1 : 0.5;
  return Math.max(step, Math.round((v0 + along) / step) * step);
};

/**
 * Drag Dimensions, by design: with the command on, a selected sketch dimension gets a drag handle; dragging it shows a
 * ruler and changes the value live (rounded to the ruler increment, 0.5 mm; 0.1 mm with Alt): the geometry follows
 * through the solver while dragging and the release is one undo step (Modify dimension). While dragging, a value the
 * sketch cannot take (conflicting relations) leaves the geometry at the last value that solved; released there, the
 * value is set as a typed one would be (the conflict is reported and shown in red). A fully defined sketch drags the
 * same way (a driving dimension stays driving); a driven (reference) dimension has no handle.
 */
export function DragDimensionsHandle({ project }: { project: (p: SketchPoint) => { x: number; y: number } }) {
  const st = useStore(useShallow((s) => ({ dragDimensions: s.dragDimensions, activeSketchId: s.activeSketchId, selectedConstraint: s.selectedConstraint, updateDimension: s.updateDimension })));
  const sketch = useActiveSketch();
  const [drag, setDrag] = useState<{ x: number; y: number; v0: number; value: number; p0: { x: number; y: number }; ux: number; uy: number; pxPerMm: number } | null>(null);
  const base = useRef<{ doc: State['doc']; solve: State['solve'] } | null>(null);
  if (!sketch || !st.dragDimensions || !st.activeSketchId || !st.selectedConstraint) return null;
  const c = sketch.constraints[st.selectedConstraint];
  if (!c || !isDimension(c) || c.driven || c.value === undefined) return null;
  const h = handleOf(sketch, c);
  if (!h) return null;
  const sid = st.activeSketchId;
  const q0 = project(h.at), q1 = project({ x: h.at.x + h.dir.x * 10, y: h.at.y + h.dir.y * 10 });
  const L = Math.hypot(q1.x - q0.x, q1.y - q0.y) || 1;
  // the ruler stays where the drag began; the grip sits on the handle point, which moves with the geometry
  const { p0, ux, uy, pxPerMm } = drag ?? { p0: q0, ux: (q1.x - q0.x) / L, uy: (q1.y - q0.y) / L, pxPerMm: L / 10 };
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const s = useStore.getState();
    base.current = { doc: s.doc, solve: s.solve };
    setDrag({ x: e.clientX, y: e.clientY, v0: c.value!, value: c.value!, p0, ux, uy, pxPerMm });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || !base.current) return;
    const along = (((e.clientX - drag.x) * drag.ux + (e.clientY - drag.y) * drag.uy) / drag.pxPerMm) * h.k;
    const v = dragValue(drag.v0, along, e.altKey);
    if (Math.abs(v - drag.value) < 1e-9) return;
    setDrag({ ...drag, value: v });
    // live: the value applied to the sketch as it was when the drag began and solved, without an undo step
    const b = base.current.doc;
    const d = { ...b, sketches: { ...b.sketches, [sid]: updateConstraint(b.sketches[sid], c.id, { value: v }) } };
    const r = solveAll(d, base.current.solve, sid);
    // a value that breaks a sketch that solved is skipped (a sketch already in conflict keeps following)
    const bad = (x?: string) => x === 'conflict' || x === 'invalid';
    if (bad(r.solve[sid]?.status) && !bad(base.current.solve[sid]?.status)) return;
    useStore.setState({ doc: r.doc, solve: r.solve });
  };
  const onUp = () => {
    if (drag && base.current && Math.abs(drag.value - drag.v0) > 1e-9) {
      // one undo step: back to the state before the drag, then the value as a normal dimension change
      useStore.setState({ doc: base.current.doc, solve: base.current.solve });
      st.updateDimension(c.id, { value: drag.value });
    }
    base.current = null;
    setDrag(null);
  };
  const ticks = drag ? Array.from({ length: 21 }, (_, i) => i - 10) : [];
  return (
    <svg className="k-dragDimensions" data-testid="dragDimensions" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag && (
        <g>
          <line x1={p0.x - ux * 10 * pxPerMm} y1={p0.y - uy * 10 * pxPerMm} x2={p0.x + ux * 10 * pxPerMm} y2={p0.y + uy * 10 * pxPerMm} stroke="#2b2b2b" strokeWidth={1} />
          {ticks.map((k) => {
            const t = k % 5 === 0 ? 7 : 4;
            return <line key={k} x1={p0.x + ux * k * pxPerMm - uy * t} y1={p0.y + uy * k * pxPerMm + ux * t} x2={p0.x + ux * k * pxPerMm + uy * t} y2={p0.y + uy * k * pxPerMm - ux * t} stroke="#2b2b2b" strokeWidth={1} />;
          })}
          <rect x={q0.x + 12} y={q0.y - 22} width={64} height={18} fill="#ffffe1" stroke="#7a7a7a" />
          <text x={q0.x + 44} y={q0.y - 9} fontSize={11} textAnchor="middle" fill="#000" data-testid="dragDimensions-value">{drag.value.toFixed(2)}</text>
        </g>
      )}
      <circle data-testid="dragDimensions-grip" cx={q0.x} cy={q0.y} r={6} fill="#1f6fd1" stroke="#fff" strokeWidth={1.5} style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
    </svg>
  );
}
