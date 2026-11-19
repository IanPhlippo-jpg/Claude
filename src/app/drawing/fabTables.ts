/**
 * The cells of the fab tables on a drawing sheet (docs/36 L2.8, P4.8), as the intended Insert ▸ Tables ▸ Cut List and
 * Bend Table: one source with the workshop sheets. The cut list takes the saw list of the analysis (position, quantity,
 * profile, saw length, angle 1 and 2, written as on the saw list PDF); the bend table takes the bend plan of the first
 * bent flat (tag = the bend number of the bend sheet, direction, angle, inner radius, bend order = the step).
 * Loaded on demand by the table command only: src/fab stays out of the main chunk.
 */
import type { Document } from '../../core/document/types';
import { analyzeGeometry } from '../../fab/analyze';
import { sawList, type SawLine } from '../../fab/sawList';
import { bendPlan } from '../../fab/bend';
import { mm, num } from '../../fab/format';
import type { FabSettings } from '../../fab/settings';

export const CUT_LIST_HEAD = ['ITEM NO.', 'QTY.', 'DESCRIPTION', 'LENGTH', 'ANGLE1', 'ANGLE2'];
export const BEND_TABLE_HEAD = ['TAG', 'DIRECTION', 'ANGLE', 'INNER RADIUS', 'BEND ORDER'];

/** an angle as the saw list PDF writes it: whole degrees unless a decimal matters */
const deg = (x: number) => `${num(x, x % 1 ? 1 : 0)}°`;

/** the rows of the cut list from saw lines: the columns of the saw list PDF that the intended table shows */
export function cutListRows(lines: SawLine[]): string[][] {
  return lines.map((l) => [String(l.pos), String(l.n), l.profiel, mm(l.zaaglengte), deg(l.hoek1), deg(l.hoek2)]);
}

/** the cut list of a model (part or assembly): head and rows, null when it has no profiles */
export function cutListCells(model: Document): { cells: string[][]; saw: SawLine[]; centres: { pos: number; at: [number, number, number] }[] } | null {
  const geo = analyzeGeometry(model, model.fab ?? {});
  const saw = sawList(geo.recs);
  // the centre of the first member of each position, for its balloon on the view (L2.8)
  const centres = saw.flatMap((l) => {
    const b = geo.bodies.find((x) => x.key === l.keys[0]);
    if (!b) return [];
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < b.soup.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b.soup[i + k]); hi[k] = Math.max(hi[k], b.soup[i + k]); }
    return [{ pos: l.pos, at: [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as [number, number, number] }];
  });
  return saw.length ? { cells: [CUT_LIST_HEAD, ...cutListRows(saw)], saw, centres } : null;
}

/** the bend table of the first bent flat of a model: head and rows by tag, null when no flat has bends */
export function bendTableCells(model: Document, machine: FabSettings['machines']['plooien']) {
  const geo = analyzeGeometry(model, model.fab ?? {});
  const f = geo.flats.find((x) => x.plooien.length);
  const doc = f && geo.bodies.find((b) => b.key === f.key)?.sheet?.doc;
  if (!f || !doc) return null;
  const plan = bendPlan(f, doc, machine);
  const bends = [...plan.bends].sort((a, b) => a.id - b.id);
  const rows = bends.map((b) => {
    const r = f.plooien.find((p, i) => (p.id ?? i + 1) === b.id)?.r ?? f.plooien[0].r;
    const step = plan.seq.steps.find((s) => s.plooi === b.id)?.stap;
    return [String(b.id), b.richting === 'op' ? 'UP' : 'DOWN', `${num(b.hoek, 0)}°`, mm(r), step ? String(step) : ''];
  });
  return { cells: [BEND_TABLE_HEAD, ...rows], plan, part: f.naam };
}
