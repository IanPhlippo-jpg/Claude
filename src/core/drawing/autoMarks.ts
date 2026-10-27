import type { DrawingSheet, DrawingView } from '../document/types';
import { viewGeometry } from './sheet';

/**
 * Document Properties ▸ Detailing ▸ Auto insert on view creation ▸ Center marks-holes (QA v0.5.1 F122): a new view
 * gets a center mark on every visible full circle seen end-on (a hole, a bore), one per centre (the largest of
 * concentric circles: a counterbore gets one mark). Pictorial views (isometric and the like) get none, as by design.
 */
const PICTORIAL = new Set(['isometric', 'trimetric', 'dimetric']);

export function autoCenterMarks(views: DrawingView[], existing: DrawingSheet['centerMarks'] = [], newId: () => string): DrawingSheet['centerMarks'] {
  const out: DrawingSheet['centerMarks'] = [];
  for (const v of views) {
    if (PICTORIAL.has(v.type) || v.empty || v.predefined || v.relative) continue;
    const circles = viewGeometry(v).circles.filter((c) => !c.hidden && c.r > 0.05).sort((a, b) => b.r - a.r);
    const marks = [...existing.filter((m) => m.viewId === v.id)];
    for (const c of circles) {
      if (marks.some((m) => Math.hypot(m.c[0] - c.c[0], m.c[1] - c.c[1]) < 0.05)) continue;
      const m = { id: newId(), viewId: v.id, c: c.c, r: c.r };
      marks.push(m);
      out.push(m);
    }
  }
  return out;
}

/** the view style of Tools ▸ Options ▸ Drawings ▸ Display Style for new views */
export function newViewStyle(pref: unknown): DrawingView['displayStyle'] {
  return ({ Wireframe: 'wireframe', 'Hidden lines visible': 'hiddenVisible', 'Shaded with edges': 'shadedEdges', Shaded: 'shaded' } as const)[String(pref) as 'Shaded'] ?? 'hiddenRemoved';
}
