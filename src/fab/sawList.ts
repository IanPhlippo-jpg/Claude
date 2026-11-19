/**
 * The saw list (docs/36 L-3, W1): one position per different piece: number, profile, grade, saw length (the longest
 * side, the length set on the saw), angle 1 and 2, the miter twist, holes, weight per piece and in total. Two pieces
 * are one position when profile, length (0.5 mm), angles and the canonical description of ends and holes agree; mirror
 * images differ (the description is the smallest of the rigid turns, never of a mirroring).
 */
import type { Recognition } from './types';
import { profileById } from './catalog';
import { barNest, type BarPlan, type BarSettings, type BarStock } from './barNest';

export interface SawLine {
  pos: number;
  n: number;
  profielId: string;
  profiel: string;
  kwaliteit: string;
  zaaglengte: number;
  hoek1: number;
  hoek2: number;
  verstekGedraaid: boolean;
  gaten: number;
  kgStuk: number;
  kgTotaal: number;
  keys: string[];
  opm: string;
  /** the pieces' names in the model */
  namen: string[];
}

type Rec = Recognition & { kenmerk?: string; verstekGedraaid?: boolean };

export function sawList(recs: Rec[], kwaliteit: Record<string, string> = {}): SawLine[] {
  const groups: { key: string; recs: Rec[] }[] = [];
  for (const r of recs) {
    if (r.soort !== 'profiel' || !r.profielId || !r.lengte) continue;
    const key = [r.profielId, Math.round(r.lengte * 2) / 2, r.hoek1 ?? 0, r.hoek2 ?? 0, r.kenmerk ?? ''].join('|');
    // the angles of a piece read the same from either end
    const alt = [r.profielId, Math.round(r.lengte * 2) / 2, r.hoek2 ?? 0, r.hoek1 ?? 0, r.kenmerk ?? ''].join('|');
    const g = groups.find((x) => x.key === key || x.key === alt);
    if (g) g.recs.push(r); else groups.push({ key, recs: [r] });
  }
  const lines = groups.map((g) => {
    const r = g.recs[0], p = profileById(r.profielId)!;
    const n = g.recs.reduce((t, x) => t + x.aantal, 0);
    const kg = (p.kgPerM.waarde * r.lengte!) / 1000;
    const notes = [...new Set(g.recs.map((x) => x.warning).filter(Boolean))] as string[];
    return {
      pos: 0, n, profielId: p.id, profiel: p.naam, kwaliteit: kwaliteit[p.id] ?? p.kwaliteit, zaaglengte: Math.round(r.lengte! * 10) / 10,
      hoek1: r.hoek1 ?? 0, hoek2: r.hoek2 ?? 0, verstekGedraaid: !!r.verstekGedraaid, gaten: r.gaten ?? 0, kgStuk: kg, kgTotaal: kg * n,
      keys: g.recs.map((x) => x.key), opm: [r.herkomst === 'herkend' ? 'herkend' : r.herkomst === 'handmatig' ? 'handmatig' : '', ...notes].filter(Boolean).join('; '),
      namen: [...new Set(g.recs.map((x) => x.naam))],
    };
  });
  // by profile (the order of the catalogue), then the longest piece first
  lines.sort((a, b) => a.profiel.localeCompare(b.profiel, 'nl') || b.zaaglengte - a.zaaglengte || a.hoek1 - b.hoek1);
  lines.forEach((l, i) => { l.pos = i + 1; });
  return lines;
}

/** the saw plan per profile from the saw list and the stock */
export function sawPlans(lines: SawLine[], stock: (BarStock & { profielId: string })[], s: BarSettings): BarPlan[] {
  const ids = [...new Set(lines.map((l) => l.profielId))];
  return ids.map((id) => {
    // the bar length set by Ian is used for every profile (docs/37 B-16); the commercial lengths of the catalogue are information
    const pieces = lines.filter((l) => l.profielId === id).flatMap((l) => Array.from({ length: l.n }, () => ({ pos: l.pos, l: l.zaaglengte })));
    return barNest(id, pieces, stock.filter((b) => b.profielId === id), s);
  });
}

/** "haaks", "45°", "45° / 30°": the angle text of the saw (bibliotheek/fitness/stuklijst.mjs zaagTekst) */
export function angleText(h1: number, h2: number): string {
  const t = (h: number) => (Math.abs(h) < 0.05 ? 'haaks' : `${String(Math.round(h * 10) / 10).replace('.', ',')}°`);
  return h1 === h2 ? (Math.abs(h1) < 0.05 ? 'haaks' : `schuin ${t(h1)}`) : `${t(h1)} / ${t(h2)}`;
}
