/** The markup layer of the graphics area (its own module, so the share dialogs can load as a chunk of their own). */
import { useRef, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { newId } from '../core/sketch/model';

/** Markup: freehand pen strokes over the graphics area, kept with the document. */
export function MarkupLayer() {
  const st = useStore(useShallow((s) => ({ markupMode: s.markupMode, doc: s.doc, applyDocument: s.applyDocument })));
  const mode = st.markupMode;
  const ref = useRef<SVGSVGElement>(null);
  const [cur, setCur] = useState<[number, number][] | null>(null);
  const strokes = st.doc.markups ?? [];
  if (!mode && !strokes.length) return null;
  const at = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x * 1000},${y * 1000}`).join(' ');
  return (
    <svg ref={ref} className="k-markup" data-testid="markup-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ pointerEvents: mode ? 'all' : 'none', cursor: mode
      ? 'crosshair' : undefined }}
      onPointerDown={(e) => { if (!mode) return; (e.target as Element).setPointerCapture(e.pointerId); setCur([at(e)]); e.stopPropagation(); }}
      onPointerMove={(e) => { if (cur) setCur([...cur, at(e)]); }}
      onPointerUp={() => { if (cur && cur.length > 1 && mode) st.applyDocument('Markup', { ...st.doc, markups: [...strokes, { id: newId('mk'), color: mode.color, points: cur }] }); setCur(null); }}>
      {strokes.map((s) => <path key={s.id} d={path(s.points)} stroke={s.color} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />)}
      {cur && <path d={path(cur)} stroke={mode?.color ?? '#d9363e'} strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
