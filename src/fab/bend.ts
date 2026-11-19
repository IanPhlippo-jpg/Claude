/**
 * Bending (docs/36 4.5, P-6, P-7): the K-factor after DIN 6935, the air bending rules of thumb, the press force, the
 * checks, and the proposed bend sequence with a 2D collision check for prismatic parts (all bend lines parallel).
 *
 * DIN 6935 (te verifiëren, a widely published formula): the neutral line lies k·s/2 from the inside with
 * k = 0.65 + 0.5·log10(r/s) for r/s up to 5 and k = 1 above. The K-factor of sheetmetal.ts is the distance of the
 * neutral line from the inside over the thickness, so K = k / 2 (r = s: K = 0.325; r >= 5s: K = 0.5).
 * The air bending rules (V opening, inner radius, minimum flange, force) are AANNAME and per die settable.
 */

const dec = (x: number) => x.toFixed(1).replace('.', ',');

/** K-factor after DIN 6935 (K = k / 2), clamped to [0, 0.5] */
import type { FlatPart } from './flat';



export function din6935K(r: number, s: number): number {
  const q = r / Math.max(1e-9, s);
  if (q >= 5) return 0.5;
  const k = 0.65 + 0.5 * Math.log10(Math.max(1e-9, q));
  return Math.min(0.5, Math.max(0, k / 2));
}

/** V opening of the die by the rule of thumb: 6 to 8 x the thickness up to 6 mm (8 is taken), 10 x above (AANNAME) */
export const vOpening = (t: number) => (t <= 6 ? 8 * t : 10 * t);
/** inner radius of air bending in steel: about V / 6 (AANNAME) */
export const airRadius = (v: number) => v / 6;
/** minimum flange length: about 0.7 x V (AANNAME) */
export const minFlange = (v: number) => 0.7 * v;
/** press force in kN: F [kN/m] ≈ 1.42 x Rm x s² / V, times the bend length in metres (AANNAME) */
export const pressForce = (rm: number, t: number, v: number, lengthMm: number) => (1.42 * rm * t * t / v) * (lengthMm / 1000);

export interface BendLine {
  id: number;
  /** position of the bend line across the flat strip (prismatic parts), mm from the left edge */
  s: number;
  hoek: number;
  richting: 'op' | 'neer';
  lengte: number;
}

export interface BendStep { plooi: number; stap: number; vOpening: number; aanslag: number; aanslagKant: 'a' | 'b'; omkeren: boolean; perskracht: number }

/** the checks of P-7 for one bend: messages with the name of the bend */
export function bendChecks(b: BendLine, flatWidth: number, t: number, r: number, cfg: { rm: number; werklengte: number; maxKracht: number }, all: BendLine[] = [b]): string[] {
  const v = vOpening(t), out: string[] = [];
  const sorted = [...all].sort((x, y) => x.s - y.s), i = sorted.findIndex((x) => x.id === b.id);
  const left = b.s - (i > 0 ? sorted[i - 1].s : 0), right = (i < sorted.length - 1 ? sorted[i + 1].s : flatWidth) - b.s;
  const flange = Math.min(left, right);
  if (flange < minFlange(v)) out.push(`Plooi ${b.id}: flens ${dec(flange)} mm korter dan 0,7 x V = ${dec(minFlange(v))} mm`);
  const f = pressForce(cfg.rm, t, v, b.lengte);
  if (f > cfg.maxKracht) out.push(`Plooi ${b.id}: perskracht ${f.toFixed(0)} kN boven de ${cfg.maxKracht} kN van de kantbank`);
  if (b.lengte > cfg.werklengte) out.push(`Plooi ${b.id}: plooilengte ${b.lengte} mm langer dan de werklengte ${cfg.werklengte} mm`);
  const ra = airRadius(v);
  if (Math.abs(r - ra) > 0.2 * ra) out.push(`Plooi ${b.id}: binnenstraal ${dec(r)} mm in het model, de matrijs V${v.toFixed(0)} geeft ongeveer ${dec(ra)} mm`);
  return out;
}

/**
 * 2D collision check for a prismatic part (all bend lines parallel, docs/36 4.5 rule 4): the section is folded as far as
 * the bends already made, the bend of this step sits on the die and both sides rise symmetrically; the punch is the band
 * wedge above the bend line (tip angle 84 degrees, AANNAME) that widens to |x| < punchHalf. A point of the part inside that band (away from the bend itself) is a collision.
 * A down bend is made with the part turned over, so in the press every bend goes up.
 */
export function collides(bends: BendLine[], flatWidth: number, done: Set<number>, current: number, t: number, punchHalf = 12): boolean {
  const sorted = [...bends].sort((a, b) => a.s - b.s);
  const ci = sorted.findIndex((b) => b.id === current);
  const sigma = sorted[ci].richting === 'op' ? 1 : -1;
  const half = (sorted[ci].hoek * Math.PI) / 360;
  const walk = (side: 1 | -1): { x: number; y: number }[] => {
    const pts: { x: number; y: number }[] = [];
    let x = 0, y = 0, ang = side > 0 ? half : Math.PI - half;
    let k = ci, pos = sorted[ci].s;
    for (;;) {
      const nk = k + side;
      const end = nk >= 0 && nk < sorted.length ? sorted[nk].s : side > 0 ? flatWidth : 0;
      const L = Math.abs(end - pos);
      for (let d = 1; d <= L; d += 1) pts.push({ x: x + d * Math.cos(ang), y: y + d * Math.sin(ang) });
      x += L * Math.cos(ang); y += L * Math.sin(ang);
      if (nk < 0 || nk >= sorted.length) break;
      const b = sorted[nk];
      if (done.has(b.id)) ang += side * (b.richting === 'op' ? 1 : -1) * sigma * (b.hoek * Math.PI) / 180;
      k = nk; pos = b.s;
    }
    return pts;
  };
  // the punch: a wedge with a tip angle of 84 degrees (AANNAME) widening to its body of 2 x punchHalf
  const inPunch = (p: { x: number; y: number }) => p.y > 0.5 && Math.abs(p.x) < Math.min(punchHalf, p.y * Math.tan((42 * Math.PI) / 180));
  return [...walk(1), ...walk(-1)].some((p) => Math.hypot(p.x, p.y) > 2 * t + 1 && inPunch(p));
}

/** the steps of a sequence that collide (P4.3) */
export function collisions(bends: BendLine[], order: number[], flatWidth: number, t: number, punchHalf = 12): number[] {
  const done = new Set<number>(), bad: number[] = [];
  order.forEach((id, k) => { if (collides(bends, flatWidth, done, id, t, punchHalf)) bad.push(k + 1); done.add(id); });
  return bad;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** the steps of an order: stop against a cut edge where it can (rule 3), turning over counted (rule 2) */
export function stepsOf(bends: BendLine[], order: number[], flatWidth: number, t: number, rm: number): BendStep[] {
  const v = vOpening(t), done: BendLine[] = [];
  let prev: 'op' | 'neer' | null = null;
  return order.map((id, k) => {
    const b = bends.find((x) => x.id === id)!;
    const bentLeft = done.some((x) => x.s < b.s), bentRight = done.some((x) => x.s > b.s);
    const kant: 'a' | 'b' = !bentLeft ? 'a' : !bentRight ? 'b' : b.s <= flatWidth / 2 ? 'a' : 'b';
    const omkeren = prev !== null && prev !== b.richting;
    prev = b.richting;
    done.push(b);
    return { plooi: id, stap: k + 1, vOpening: v, aanslag: kant === 'a' ? b.s : flatWidth - b.s, aanslagKant: kant, omkeren, perskracht: pressForce(rm, t, v, b.lengte) };
  });
}

/**
 * The proposed sequence (docs/36 4.5): rule 1 inner bends and short flanges first, rule 2 bends of one direction after
 * each other (fewest turn-overs), rule 3 the stop against a cut edge, rule 4 no collision with the punch (prismatic
 * parts, checked in 2D). Up to 7 bends every order is scored; above that the rule order is kept unchecked.
 */
export function proposeSequence(bends: BendLine[], flatWidth: number, t: number, rm: number, prismatic = true): { steps: BendStep[]; botsing: number[]; gecontroleerd: boolean } {
  const sideMin = (b: BendLine) => Math.min(b.s, flatWidth - b.s);
  const ruleOrder = [...bends].sort((a, b) => sideMin(a) - sideMin(b) || a.s - b.s).map((b) => b.id);
  if (!prismatic || bends.length > 7) return { steps: stepsOf(bends, ruleOrder, flatWidth, t, rm), botsing: [], gecontroleerd: false };
  let best: { order: number[]; score: number } | null = null;
  for (const order of permutations(bends.map((b) => b.id))) {
    const bad = collisions(bends, order, flatWidth, t).length;
    const flips = stepsOf(bends, order, flatWidth, t, rm).filter((s) => s.omkeren).length;
    const rule = order.reduce((acc, id, k) => acc + Math.abs(ruleOrder.indexOf(id) - k), 0);
    const score = bad * 1e6 + flips * 1e3 + rule;
    if (!best || score < best.score) best = { order, score };
  }
  return { steps: stepsOf(bends, best!.order, flatWidth, t, rm), botsing: collisions(bends, best!.order, flatWidth, t), gecontroleerd: true };
}

/** the bends of a base flange chain (prismatic part): position across the flat, angle and direction of each corner */
export function chainBends(chain: { x: number; y: number }[], t: number, r: number, k: number, depth: number, materialLeft = true): { bends: BendLine[]; width: number } {
  const seg = chain.slice(1).map((p, i) => ({ dx: p.x - chain[i].x, dy: p.y - chain[i].y }));
  const len = seg.map((d) => Math.hypot(d.dx, d.dy));
  const bends: BendLine[] = [];
  let s = 0;
  const turns = seg.slice(1).map((d, i) => Math.atan2(seg[i].dx * d.dy - seg[i].dy * d.dx, seg[i].dx * d.dx + seg[i].dy * d.dy));
  // the sketch line is one face of the sheet: at a bend toward the material it is the outside (setback (r + t) tan),
  // at a bend away from the material the inside (setback r tan) (docs/37 B-2)
  const sb = turns.map((a) => ((a > 0) === materialLeft ? r + t : r) * Math.tan(Math.abs(a) / 2));
  for (let i = 0; i < seg.length; i++) {
    const flat = len[i] - (i > 0 ? sb[i - 1] : 0) - (i < turns.length ? sb[i] : 0);
    s += flat;
    if (i < turns.length) {
      const ba = Math.abs(turns[i]) * (r + k * t);
      bends.push({ id: i + 1, s: s + ba / 2, hoek: Math.round((Math.abs(turns[i]) * 180) / Math.PI * 10) / 10, richting: turns[i] > 0 ? 'op' : 'neer', lengte: depth });
      s += ba;
    }
  }
  return { bends, width: s };
}

/**
 * The bends of a flat part for the sequence, the checks and the bend sheet, taken from its own bend lines (the one
 * source, docs/37 B-2): the position across the strip from edge "a" (the low side), angle, direction, length.
 */
export function bendsOfFlat(f: FlatPart): { bends: BendLine[]; width: number } {
  if (!f.plooien.length) return { bends: [], width: 0 };
  const l0 = f.plooien[0], L = Math.hypot(l0.b.x - l0.a.x, l0.b.y - l0.a.y) || 1;
  const perp = { x: -(l0.b.y - l0.a.y) / L, y: (l0.b.x - l0.a.x) / L };
  const across = (p: { x: number; y: number }) => p.x * perp.x + p.y * perp.y;
  const pts = f.buiten.map((s) => s.a);
  const lo = Math.min(...pts.map(across)), hi = Math.max(...pts.map(across));
  const bends = f.plooien.map((b, i) => ({ id: b.id ?? i + 1, s: (across(b.a) + across(b.b)) / 2 - lo, hoek: b.hoek, richting: b.richting, lengte: Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y) }));
  return { bends, width: hi - lo };
}

/**
 * The bend plan of a flat part: its bends from its own bend lines, the proposed sequence with the 2D check where the
 * part is prismatic (every bend from the base flange), and the checks (docs/36 P-6, P-7; docs/37 B-2).
 */
export function bendPlan(f: FlatPart, doc: { features: { type: string; suppressed: boolean }[]; sheetMetal?: { thickness: number; bendRadius: number } },
  P: { rm: number; werklengte: number; maxKracht: number }) {
  const sm = doc.sheetMetal ?? { thickness: f.t, bendRadius: f.plooien[0]?.r ?? f.t };
  const fromBase = doc.features.some((x) => x.type === 'baseFlange' && !x.suppressed);
  const prismatic = fromBase && !doc.features.some((x) => !x.suppressed && ['edgeFlange', 'hem', 'miterFlange', 'jog', 'sketchedBend', 'sweptFlange', 'loftedBend'].includes(x.type));
  const { bends, width } = bendsOfFlat(f);
  const seq = proposeSequence(bends, width, sm.thickness, P.rm, prismatic);
  const checks = bends.flatMap((b) => bendChecks(b, width, sm.thickness, sm.bendRadius, P, bends));
  return { f, bends, width, seq, checks, prismatic };
}
