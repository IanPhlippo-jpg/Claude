/**
 * How the lines of a drawing view are drawn (0.5.16): which lines the display style shows, the Tangent Edge setting of
 * the view (visible, with the tangent edge font, with the ends hidden, removed), the Detailing display filter for
 * cosmetic threads and Use model color for HLR/HLV.
 */
import type { DrawingView } from '../../core/document/types';
import type { Line2D } from '../../core/drawing/hlr';
import { cosmeticThreadsShown, lineColour } from './drawingPrefs';

/** the lines a view draws in its display style */
export function viewLines(v: DrawingView, lines: Line2D[]): Line2D[] {
  let ls = v.displayStyle === 'wireframe' ? lines.map((l) => ({ ...l, hidden: false }))
    : v.displayStyle === 'hiddenVisible' ? lines : lines.filter((l) => !l.hidden || (l.cosmetic && !!v.threadDraft));
  // the centre line of a half section is cosmetic too; only the threads follow the display filter
  if (!cosmeticThreadsShown() && !v.section?.half) ls = ls.filter((l) => !l.cosmetic);
  if (!v.tangentEdges || v.tangentEdges === 'removed') ls = ls.filter((l) => !l.tangent);
  return ls;
}

/** a model edge, silhouette or tangent edge of a view (screen px), as the view's settings draw it */
export function EdgeLine({ l, a, q, v, mm }: { l: Line2D; a: [number, number]; q: [number, number]; v: DrawingView; mm: number }) {
  const ink = l.hidden ? '#555' : lineColour(v.model);
  if (l.tangent && !l.hidden) {
    let [x1, y1] = a, [x2, y2] = q;
    if (v.tangentEdges === 'hideEnds') {
      // Hide ends: the tangent edge stops short of the edges it runs into
      const L = Math.hypot(x2 - x1, y2 - y1), g = Math.min(1.5 * mm, L / 4);
      const ux = (x2 - x1) / (L || 1), uy = (y2 - y1) / (L || 1);
      [x1, y1, x2, y2] = [x1 + ux * g, y1 + uy * g, x2 - ux * g, y2 - uy * g];
    }
    const font = v.tangentEdges === 'font';
    const dash = font ? `${3 * mm} ${0.8 * mm} ${0.6 * mm} ${0.8 * mm}` : undefined;
    return <line className="k-tangent-edge" data-tangent={v.tangentEdges} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={font ? 0.9 : 1.6} strokeDasharray={dash} strokeLinecap="round" />;
  }
  const cls = l.tangent ? 'k-tangent-edge' : undefined;
  return <line className={cls} x1={a[0]} y1={a[1]} x2={q[0]} y2={q[1]} stroke={ink} strokeWidth={l.hidden ? 0.9 : 1.6} strokeDasharray={l.hidden ? '5 3' : undefined} strokeLinecap="round" />;
}
