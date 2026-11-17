/**
 * A center mark on the sheet (0.5.16): a hole or fillet (cross with extension lines), a slot (crosses at both arc
 * centres, the slot's centre line and the cross lines), a linear set (the line through the hole centres) or a
 * bolt circle (the circular centre line with a cross at its centre). Dangling marks take the dangling colour.
 */
import type { DrawingSheet } from '../../core/document/types';
import { DANGLING } from './drawingPrefs';

type P = [number, number];

export function CenterMarkGlyph({ m, at, k, mm }: { m: DrawingSheet['centerMarks'][number]; at: (p: P) => P; k: number; mm: number }) {
  const c = at(m.c);
  const ink = m.dangling ? DANGLING : '#000';
  const chain = `${6 * mm} ${1 * mm} ${1 * mm} ${1 * mm}`;
  const g = 2 * mm, ext = m.r * k + 3 * mm, s = 1.2 * mm;
  const cross = (p: P, u: P) => (
    <>
      <line x1={p[0] - u[0] * s} y1={p[1] - u[1] * s} x2={p[0] + u[0] * s} y2={p[1] + u[1] * s} />
      <line x1={p[0] + u[1] * s} y1={p[1] - u[0] * s} x2={p[0] - u[1] * s} y2={p[1] + u[0] * s} />
    </>
  );
  if (m.kind === 'circular') {
    return <g className="k-center-mark" data-kind="circular" stroke={ink} strokeWidth={0.6} fill="none"><circle cx={c[0]} cy={c[1]} r={m.r * k} strokeDasharray={chain} />{cross(c, [1, 0])}</g>;
  }
  if ((m.kind === 'slot' || m.kind === 'linear') && m.c2) {
    const c2 = at(m.c2);
    const L = Math.hypot(c2[0] - c[0], c2[1] - c[1]) || 1;
    const u: P = [(c2[0] - c[0]) / L, (c2[1] - c[1]) / L], n: P = [-u[1], u[0]];
    if (m.kind === 'linear') return <g className="k-center-mark" data-kind="linear" stroke={ink} strokeWidth={0.6}><line x1={c[0]} y1={c[1]} x2={c2[0]} y2={c2[1]} strokeDasharray={chain} /></g>;
    // a slot: its centre line through both arc centres and beyond the ends, a cross line through each centre
    const e = m.r * k + 3 * mm;
    return (
      <g className="k-center-mark" data-kind="slot" stroke={ink} strokeWidth={0.7}>
        <line x1={c[0] - u[0] * e} y1={c[1] - u[1] * e} x2={c2[0] + u[0] * e} y2={c2[1] + u[1] * e} strokeDasharray={chain} />
        {[c, c2].map((p, i) => <line key={i} x1={p[0] - n[0] * e} y1={p[1] - n[1] * e} x2={p[0] + n[0] * e} y2={p[1] + n[1] * e} strokeDasharray={chain} />)}
        {cross(c, u)}
        {cross(c2, u)}
      </g>
    );
  }
  return (
    <g className="k-center-mark" stroke={ink} strokeWidth={0.7}>
      <line x1={c[0] - ext} y1={c[1]} x2={c[0] - g} y2={c[1]} /><line x1={c[0] + g} y1={c[1]} x2={c[0] + ext} y2={c[1]} />
      <line x1={c[0]} y1={c[1] - ext} x2={c[0]} y2={c[1] - g} /><line x1={c[0]} y1={c[1] + g} x2={c[0]} y2={c[1] + ext} />
      <line x1={c[0] - s} y1={c[1]} x2={c[0] + s} y2={c[1]} /><line x1={c[0]} y1={c[1] - s} x2={c[0]} y2={c[1] + s} />
    </g>
  );
}
