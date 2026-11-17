import * as THREE from 'three';
import type { DrawingSheet, DrawingView } from '../document/types';
import { rebuildAssembly } from '../assembly/assembly';
import { viewFrame } from './hlr';
import { layoutBalloons, visibleAnchors, type BalloonLayout } from './balloons';
import { viewBounds, viewGeometry, viewToSheet } from './sheet';

type P = [number, number];

/** BOM item number of each component of a view and a point on it (view coordinates); a part is item 1 */
export function componentCentres(v: DrawingView, visible = false): { name: string; item: number; at: P }[] {
  if (v.model.kind !== 'assembly') {
    const g = viewGeometry(v);
    // a part: the dot on the longest visible edge's midpoint, by design attaches to an edge of the part
    const l = visible ? [...g.lines].filter((x) => !x.hidden).sort((a, b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]) - Math.hypot(a.b[0] - a.a[0], a.b[1] - a.a[1]))[0] : undefined;
    return [{ name: v.model.name, item: 1, at: l ? [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2] : [(g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2] }];
  }
  const fr = viewFrame(v.type);
  const items = new Map<string, number>();
  for (const c of v.model.components ?? []) if (!items.has(c.part.name)) items.set(c.part.name, items.size + 1);
  const bodies = rebuildAssembly(v.model).bodies;
  const vis = visible ? visibleAnchors(bodies, fr) : null;
  return bodies.map((b) => {
    b.geometry.computeBoundingBox();
    const c = b.geometry.boundingBox!.getCenter(new THREE.Vector3());
    const comp = (v.model.components ?? []).find((x) => x.id === b.id);
    return { name: comp?.part.name ?? b.id, item: items.get(comp?.part.name ?? '') ?? 1, at: vis?.get(b.id) ?? ([c.dot(fr.u), c.dot(fr.v)] as P) };
  });
}

export interface AutoBalloonOptions {
  /** Ignore multiple instances (default on): one balloon per part number */
  ignoreMultiple?: boolean;
  /** Leader attachment ▸ Edges: the nearest point of a visible edge, with an arrow (a dot sits on a face) */
  edges?: boolean;
  layout?: BalloonLayout;
  /** Insert magnetic line(s) */
  magnetic?: boolean;
  /** item numbers that have a balloon already (another view of the sheet): not ballooned again */
  skip?: Set<string>;
}

/** Auto Balloon: one balloon per part, on a ring around the view with a leader to the part (sheet mm). */
type Balloons = { symbols: NonNullable<DrawingSheet['symbols']>; lines: NonNullable<DrawingSheet['magneticLines']> };
export function autoBalloonSet(sheet: DrawingSheet, v: DrawingView, opts: AutoBalloonOptions, newId: () => string): Balloons {
  const g = viewGeometry(v);
  const b = viewBounds(sheet, v, g);
  const seen = new Set<number>();
  const picked: { item: number; a: P }[] = [];
  for (const c of componentCentres(v, true)) {
    if (opts.skip?.has(String(c.item))) continue;
    if (opts.ignoreMultiple !== false && seen.has(c.item)) continue;
    seen.add(c.item);
    let at = c.at;
    if (opts.edges) {
      let best = Infinity;
      for (const l of g.lines) {
        if (l.hidden) continue;
        const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((c.at[0] - l.a[0]) * dx + (c.at[1] - l.a[1]) * dy) / L2));
        const q: P = [l.a[0] + dx * t, l.a[1] + dy * t];
        const d = Math.hypot(q[0] - c.at[0], q[1] - c.at[1]);
        if (d < best) { best = d; at = q; }
      }
    }
    picked.push({ item: c.item, a: viewToSheet(sheet, v, g, at) });
  }
  // the balloons of the intended design sit clear of the view and of each other: 2 characters = 8 mm, 2 mm apart
  const lay = layoutBalloons(picked.map((p) => p.a), { x: b.x, y: b.y, w: b.w, h: b.h }, opts.layout ?? 'square', { offset: 12, gap: 10 });
  const head = opts.edges ? { head: 'arrow' as const } : {};
  const symbols = picked.map((p, i) => ({ id: newId(), kind: 'balloon' as const, anchor: p.a, position: lay.positions[i], text: String(p.item), viewId: v.id, ...head }));
  const lines = opts.magnetic === false ? [] : lay.lines.map((l) => ({ id: newId(), a: l.a, b: l.b, balloons: l.members.map((i) => symbols[i].id) }));
  return { symbols, lines };
}
