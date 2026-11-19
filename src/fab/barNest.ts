/**
 * Bar nesting, the saw plan per bar (docs/36 L-4, 3.4): which pieces come from which bar or remnant, with the saw cut,
 * the trim at the start, the clamp length at the end, the remnant and the use. Remnants from stock first (the
 * smallest that fits), then bars in stock, then new bars of the commercial length. First fit and best fit decreasing
 * are both run and the plan with fewer new bars kept (the oracle bibliotheek/taatsdeuren/bestel.mjs zaagplan is first
 * fit decreasing: never worse than it). Nothing is ordered: the plan says how many bars to order.
 */
export interface BarPiece { pos: number; l: number }
export interface BarStock { lengte: number; aantal: number; restant: boolean }
export interface BarSettings { zaagsnede: number; afkorten: number; klem: number; staafLengte: number }
export interface Bar { bron: 'nieuw' | 'voorraad' | 'restant'; lengte: number; stukken: BarPiece[]; rest: number }
export interface BarPlan {
  profielId: string;
  staven: Bar[];
  teBestellen: number;
  benutting: number;
  ondergrens: number;
  /** pieces longer than any bar: an error on the position, no silent plan */
  fouten: { pos: number; l: number; tekst: string }[];
}

/**
 * The lower bound of new bars: ⌈(sum of lengths + cuts) / (usable bar length + one cut)⌉: the last piece of a bar needs
 * no cut behind it (docs/37 B-16: one piece of 5998 is one bar; 2998 + 4 + 2998 = 6000 fits one bar)
 */
export function lowerBound(pieces: BarPiece[], s: BarSettings): number {
  const use = s.staafLengte - s.afkorten - s.klem + s.zaagsnede;
  return pieces.length ? Math.ceil((pieces.reduce((t, p) => t + p.l + s.zaagsnede, 0) - 1e-9) / use) : 0;
}

function plan(pieces: BarPiece[], stock: BarStock[], s: BarSettings, rule: 'first' | 'best'): { staven: Bar[]; fouten: BarPlan['fouten'] } {
  // room for pieces each followed by a cut: the cut behind the last piece may fall off the end of the bar
  const room = (l: number) => l - s.afkorten - s.klem + s.zaagsnede;
  const staven: (Bar & { vrij: number })[] = [];
  const fouten: BarPlan['fouten'] = [];
  const pool = stock.flatMap((b) => Array.from({ length: b.aantal }, () => ({ lengte: b.lengte, restant: b.restant })));
  const remnants = pool.filter((b) => b.restant).sort((a, b) => a.lengte - b.lengte);
  const bars = pool.filter((b) => !b.restant).sort((a, b) => b.lengte - a.lengte);
  const maxLen = Math.max(s.staafLengte, ...pool.map((b) => b.lengte));
  for (const p of [...pieces].sort((a, b) => b.l - a.l || a.pos - b.pos)) {
    const need = p.l + s.zaagsnede;
    if (need > room(maxLen) + 1e-9) { fouten.push({ pos: p.pos, l: p.l, tekst: `stuk van ${p.l} mm is langer dan de bruikbare staaflengte ${room(maxLen) - s.zaagsnede} mm` }); continue; }
    // a remnant from stock first: the smallest one that holds the piece
    const ri = remnants.findIndex((r) => room(r.lengte) >= need - 1e-9);
    if (ri >= 0) {
      const r = remnants.splice(ri, 1)[0];
      staven.push({ bron: 'restant', lengte: r.lengte, stukken: [p], vrij: room(r.lengte) - need, rest: 0 });
      continue;
    }
    const open = staven.filter((b) => b.vrij >= need - 1e-9);
    const target = rule === 'first' ? open[0] : open.sort((a, b) => a.vrij - b.vrij)[0];
    if (target) { target.stukken.push(p); target.vrij -= need; continue; }
    const bi = bars.findIndex((b) => room(b.lengte) >= need - 1e-9);
    const from = bi >= 0 ? bars.splice(bi, 1)[0] : null;
    const L = from ? from.lengte : s.staafLengte;
    staven.push({ bron: from ? 'voorraad' : 'nieuw', lengte: L, stukken: [p], vrij: room(L) - need, rest: 0 });
  }
  return {
    staven: staven.map(({ vrij: _v, ...b }) => { void _v; return { ...b, rest: Math.max(0, b.lengte - s.afkorten - b.stukken.reduce((t, x) => t + x.l + s.zaagsnede, 0)) }; }),
    fouten,
  };
}

export function barNest(profielId: string, pieces: BarPiece[], stock: BarStock[], s: BarSettings): BarPlan {
  const a = plan(pieces, stock, s, 'first'), b = plan(pieces, stock, s, 'best');
  const count = (x: typeof a) => x.staven.filter((y) => y.bron === 'nieuw').length * 1e6 + x.staven.length * 1e3 + x.staven.filter((y) => y.bron !== 'restant').length;
  const best = count(b) <= count(a) ? b : a;
  const placed = best.staven.flatMap((x) => x.stukken);
  const used = best.staven.reduce((t, x) => t + x.lengte, 0);
  return {
    profielId,
    staven: best.staven,
    teBestellen: best.staven.filter((x) => x.bron === 'nieuw').length,
    benutting: used ? placed.reduce((t, x) => t + x.l, 0) / used : 0,
    ondergrens: lowerBound(pieces.filter((p) => !best.fouten.some((f) => f.pos === p.pos && f.l === p.l)), s),
    fouten: best.fouten,
  };
}
