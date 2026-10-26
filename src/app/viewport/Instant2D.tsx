import { useState } from 'react';
import { useActiveSketch, useStore } from '../store';
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

/**
 * Instant2D, by design: with the command on, a selected sketch dimension gets a drag handle; dragging
 * it shows a ruler and changes the value (rounded to the ruler increment, 1 mm; 0.1 mm with Alt).
 */
export function Instant2DHandle({ project }: { project: (p: SketchPoint) => { x: number; y: number } }) {
  const st = useStore();
  const sketch = useActiveSketch();
  const [drag, setDrag] = useState<{ x: number; y: number; v0: number; value: number } | null>(null);
  if (!sketch || !st.instant2d || !st.activeSketchId || !st.selectedConstraint) return null;
  const c = sketch.constraints[st.selectedConstraint];
  if (!c || !isDimension(c) || c.driven || c.value === undefined) return null;
  const h = handleOf(sketch, c);
  if (!h) return null;
  const p0 = project(h.at), p1 = project({ x: h.at.x + h.dir.x * 10, y: h.at.y + h.dir.y * 10 });
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const pxPerMm = L / 10;
  const offset = drag ? ((drag.value - drag.v0) / h.k) * pxPerMm : 0;
  const bx = p0.x + ux * offset, by = p0.y + uy * offset;
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, v0: c.value!, value: c.value! });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const along = (((e.clientX - drag.x) * ux + (e.clientY - drag.y) * uy) / pxPerMm) * h.k;
    const step = e.altKey ? 0.1 : 1;
    const v = Math.max(step, Math.round((drag.v0 + along) / step) * step);
    setDrag({ ...drag, value: v });
  };
  const onUp = () => {
    if (drag && Math.abs(drag.value - drag.v0) > 1e-9) st.updateDimension(c.id, { value: drag.value });
    setDrag(null);
  };
  const ticks = drag ? Array.from({ length: 21 }, (_, i) => i - 10) : [];
  return (
    <svg className="k-instant2d" data-testid="instant2d" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag && (
        <g>
          <line x1={p0.x - ux * 10 * pxPerMm} y1={p0.y - uy * 10 * pxPerMm} x2={p0.x + ux * 10 * pxPerMm} y2={p0.y + uy * 10 * pxPerMm} stroke="#2b2b2b" strokeWidth={1} />
          {ticks.map((k) => {
            const t = k % 5 === 0 ? 7 : 4;
            return <line key={k} x1={p0.x + ux * k * pxPerMm - uy * t} y1={p0.y + uy * k * pxPerMm + ux * t} x2={p0.x + ux * k * pxPerMm + uy * t} y2={p0.y + uy * k * pxPerMm - ux * t} stroke="#2b2b2b" strokeWidth={1} />;
          })}
          <rect x={bx + 12} y={by - 22} width={64} height={18} fill="#ffffe1" stroke="#7a7a7a" />
          <text x={bx + 44} y={by - 9} fontSize={11} textAnchor="middle" fill="#000" data-testid="instant2d-value">{drag.value.toFixed(2)}</text>
        </g>
      )}
      <circle data-testid="instant2d-grip" cx={bx} cy={by} r={6} fill="#1f6fd1" stroke="#fff" strokeWidth={1.5} style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
    </svg>
  );
}
