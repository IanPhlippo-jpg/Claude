import * as THREE from 'three';
import type { Document, DrawingSheet, DrawingView, PatternFeature } from '../document/types';
import { viewGeometry, type ViewGeo } from './sheet';
import { viewFrame } from './hlr';
import { viewArcs } from './arcs';

type P = [number, number];
type Mark = DrawingSheet['centerMarks'][number];

/**
 * Document Properties ▸ Detailing ▸ Auto insert on view creation (QA v0.5.1 F122, 0.5.16):
 * - Center marks-holes: a center mark on every visible full circle seen end-on (a hole, a bore), one per centre (the
 *   largest of concentric circles: a counterbore gets one mark); a slot gets a slot center mark (both arc centres and
 *   the slot's centre line); holes of a bolt circle get the circular center line, a row of a linear pattern the line
 *   through its centres.
 * - Center marks-fillets: a center mark on every visible arc that is not a full circle (fillets, rounded corners).
 * Pictorial views (isometric and the like) get none, as by design.
 */
const PICTORIAL = new Set(['isometric', 'trimetric', 'dimetric']);

export interface AutoMarkOptions {
  holes: boolean;
  fillets: boolean;
}

const near = (a: P, b: P, tol = 0.05) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tol;

/** a point of the view that a visible line passes through (the arc is drawn, not hidden or cut away) */
function shown(g: ViewGeo, p: P, tol = 0.06): boolean {
  return g.lines.some((l) => {
    if (l.hidden) return false;
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - l.a[0]) * dx + (p[1] - l.a[1]) * dy) / L2)) : 0;
    return Math.hypot(l.a[0] + dx * t - p[0], l.a[1] + dy * t - p[1]) < tol;
  });
}

type Marks = DrawingSheet['centerMarks'];
export function autoCenterMarks(views: DrawingView[], existing: Marks = [], newId: () => string, opts: AutoMarkOptions = { holes: true, fillets: false }): Marks {
  const out: DrawingSheet['centerMarks'] = [];
  for (const v of views) {
    if (PICTORIAL.has(v.type) || v.empty || v.predefined || v.relative) continue;
    const g = viewGeometry(v);
    const marks = [...existing.filter((m) => m.viewId === v.id)];
    const add = (m: Omit<Mark, 'id' | 'viewId'>) => {
      if (marks.some((x) => (x.kind ?? '') === (m.kind ?? '') && near(x.c, m.c) && (!m.c2 || (x.c2 && near(x.c2, m.c2))))) return;
      const mk: Mark = { id: newId(), viewId: v.id, ...m };
      marks.push(mk);
      out.push(mk);
    };
    if (opts.holes) {
      const circles = g.circles.filter((c) => !c.hidden && c.r > 0.05).sort((a, b) => b.r - a.r);
      for (const c of circles) if (!marks.some((m) => !m.kind && near(m.c, c.c))) add({ c: c.c, r: c.r });
    }
    // slots and fillet arcs: from the model edges of a projected view (or the view a detail enlarges)
    const frameType = v.detail ? v.detail.parentType : v.type;
    const arcsOk = !v.section && !v.aux && !PICTORIAL.has(frameType);
    const det = v.detail;
    const inDetail = (c: P, r: number) => !det || (det.rect
      ? Math.abs(c[0] - det.center[0]) + r <= det.rect[0] && Math.abs(c[1] - det.center[1]) + r <= det.rect[1]
      : near(c, det.center, det.radius - r));
    if (arcsOk && (opts.holes || opts.fillets)) {
      const { arcs, slots } = viewArcs(v.model, frameType);
      if (opts.holes) for (const s of slots) if (inDetail(s.c1, s.r) && inDetail(s.c2, s.r) && s.mids.every((p) => shown(g, p))) add({ kind: 'slot', c: s.c1, c2: s.c2, r: s.r });
      if (opts.fillets) {
        for (const a of [...arcs].sort((x, y) => y.r - x.r)) {
          if (!inDetail(a.c, 0) || !shown(g, a.mid) || marks.some((m) => !m.kind && near(m.c, a.c))) continue;
          add({ c: a.c, r: a.r });
        }
      }
    }
    if (opts.holes && !v.section && !v.aux) for (const m of patternMarks(v.model, frameType, marks.filter((x) => !x.kind), g)) add(m);
  }
  return out;
}

/**
 * Center mark sets of hole patterns: equal holes on a common circle (at least three, evenly spaced, or four with a
 * concentric circle or a circular pattern at that centre) get the bolt circle; the rows of a linear pattern (the
 * model has one along that direction) the line through their centres.
 */
export function patternMarks(model: Document, type: DrawingView['type'], holes: { c: P; r: number }[], g: ViewGeo): Omit<Mark, 'id' | 'viewId'>[] {
  const out: Omit<Mark, 'id' | 'viewId'>[] = [];
  const fr = viewFrame(type);
  const to2 = (p: number[]): P => [new THREE.Vector3(...p).dot(fr.u), new THREE.Vector3(...p).dot(fr.v)];
  const pats = model.features.filter((f) => !f.suppressed && (f.type === 'circularPattern' || f.type === 'linearPattern')) as PatternFeature[];
  const groups = new Map<number, { c: P; r: number }[]>();
  for (const h of holes) {
    const k = [...groups.keys()].find((r) => Math.abs(r - h.r) < 0.05) ?? h.r;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(h);
  }
  for (const hs of groups.values()) {
    if (hs.length < 2) continue;
    // circular: centres from the circular patterns that look along the view, else the circle through three holes
    const centres: P[] = pats.filter((f) => f.type === 'circularPattern' && f.axis && Math.abs(new THREE.Vector3(...f.axis.dir).normalize().dot(fr.w)) > 0.999).map((f) => to2(f.axis!.origin));
    const fromPattern = centres.length;
    for (let i = 0; i + 2 < hs.length && centres.length < fromPattern + 4; i++) {
      const k = circumCentre(hs[i].c, hs[i + 1].c, hs[i + 2].c);
      if (k) centres.push(k);
    }
    for (const [ci, C] of centres.entries()) {
      const R = Math.hypot(hs[0].c[0] - C[0], hs[0].c[1] - C[1]);
      const on = hs.filter((h) => Math.abs(Math.hypot(h.c[0] - C[0], h.c[1] - C[1]) - R) < 0.05);
      // (three holes nearly in a row give a huge circle: a bolt circle lies within the view)
      if (R <= hs[0].r || on.length < 3 || R > Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1])) continue;
      const ang = on.map((h) => Math.atan2(h.c[1] - C[1], h.c[0] - C[0])).sort((a, b) => a - b);
      const gaps = ang.map((a, i) => (i + 1 < ang.length ? ang[i + 1] - a : ang[0] + 2 * Math.PI - a)).sort((a, b) => a - b);
      // evenly spaced: all gaps equal but the largest (a pattern over less than a full turn)
      const even = gaps.slice(0, -1).every((x) => Math.abs(x - gaps[0]) < 0.01);
      const concentric = g.circles.some((c) => near(c.c, C, 0.05));
      if (!even || (ci >= fromPattern && on.length === 4 && !concentric)) continue;
      if (!out.some((m) => m.kind === 'circular' && near(m.c, C, 0.2))) out.push({ kind: 'circular', c: C, r: R });
      break;
    }
    // linear: the rows along a linear pattern direction, as many holes as the pattern has instances, its spacing apart
    for (const f of pats.filter((x) => x.type === 'linearPattern')) {
      for (const dir of [f.dir1, f.dir2]) {
        if (!dir) continue;
        const d0 = to2(dir.axis), L = Math.hypot(d0[0], d0[1]);
        if (L < 0.5 || !dir.count || dir.count < 2) continue;
        const d: P = [d0[0] / L, d0[1] / L];
        const rows = new Map<number, { c: P; t: number }[]>();
        for (const h of hs) {
          const off = h.c[0] * d[1] - h.c[1] * d[0], t = h.c[0] * d[0] + h.c[1] * d[1];
          const k = [...rows.keys()].find((x) => Math.abs(x - off) < 0.05) ?? off;
          (rows.get(k) ?? rows.set(k, []).get(k)!).push({ c: h.c, t });
        }
        for (const row of rows.values()) {
          if (row.length !== dir.count) continue;
          row.sort((a, b) => a.t - b.t);
          const step = dir.spacing * L;
          if (!row.every((p, i) => !i || Math.abs(p.t - row[i - 1].t - step) < 0.05)) continue;
          const a = row[0].c, b = row[row.length - 1].c;
          if (!out.some((m) => m.kind === 'linear' && near(m.c, a) && m.c2 && near(m.c2, b))) out.push({ kind: 'linear', c: a, c2: b, r: hs[0].r });
        }
      }
    }
  }
  return out;
}

function circumCentre(a: P, b: P, c: P): P | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const s = (p: P) => p[0] * p[0] + p[1] * p[1];
  return [(s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d];
}

/** the view style of Tools ▸ Options ▸ Drawings ▸ Display Style for new views */
export function newViewStyle(pref: unknown): DrawingView['displayStyle'] {
  return ({ Wireframe: 'wireframe', 'Hidden lines visible': 'hiddenVisible', 'Shaded with edges': 'shadedEdges', Shaded: 'shaded' } as const)[String(pref) as 'Shaded'] ?? 'hiddenRemoved';
}

/** Tools ▸ Options ▸ Drawings ▸ Display Style ▸ Tangent edges in new views */
export function newViewTangent(pref: unknown): NonNullable<DrawingView['tangentEdges']> {
  return ({ Visible: 'visible', 'Use font': 'font', 'Hide ends': 'hideEnds', Removed: 'removed' } as const)[String(pref) as 'Visible'] ?? 'visible';
}
