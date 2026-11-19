/**
 * Nesting of plates on standard sheets (docs/36 P-5, 4.5): per material and thickness, step 1 of the docs: rectangle
 * nesting on the smallest bounding rectangle (MaxRects, best short side fit, rotation 0/90 when the rolling direction
 * allows it). Spacing between pieces and a border on the sheet; no common cut, no mirroring. The quality is measured
 * against the lower bound ⌈net area / usable sheet area⌉ and no optimum is promised. Shape nesting (no-fit polygons) is
 * not built yet: the status says "rechthoek".
 *
 * The validity check (P3.1) is independent of the nesting: it measures the distance between the exact contours (arcs
 * sampled) as placed, the border, the count of each piece and the rotation.
 */
import type { FlatPart, Loop } from './flat';
import { DXF_DEFAULTS, DxfWriter, addPlate, type DxfOptions } from './dxf';
import { areaD, EndType, inflatePathsD, JoinType, minkowskiSumD } from 'clipper2-ts';
import { loopPolygon, polyDistance } from './checks';
import type { P2 } from './geom';

export interface NestSettings { afstand: number; rand: number; draaien: boolean; vlakken: { l: number; b: number; id: string }[] }
/** a placed piece: its box on the sheet (x, y, l, b as nested) and its rotation; tx, ty place a piece of a pair exactly */
export interface Placed { key: string; pos: number; x: number; y: number; draai: 0 | 90 | 180 | 270; l: number; b: number; tx?: number; ty?: number }
export interface Sheet { id: string; l: number; b: number; stukken: Placed[]; benutting: number }
/**
 * The part of a sheet that is used (docs/37 N-6): the strip up to the last piece plus the border, across the shorter cut.
 * The rest is a remnant that goes back to stock, so a small plate on a big sheet never pays the whole sheet.
 */
export function usedSheet(sh: Sheet, rand: number): { l: number; b: number } {
  if (!sh.stukken.length) return { l: 0, b: 0 };
  const w = (p: Placed) => (p.draai === 90 || p.draai === 270 ? p.b : p.l), h = (p: Placed) => (p.draai === 90 || p.draai === 270 ? p.l : p.b);
  const maxX = Math.min(sh.l, Math.max(...sh.stukken.map((p) => p.x + w(p))) + rand), maxY = Math.min(sh.b, Math.max(...sh.stukken.map((p) => p.y + h(p))) + rand);
  return maxX * sh.b <= sh.l * maxY ? { l: maxX, b: sh.b } : { l: sh.l, b: maxY };
}

export interface Nest {
  materiaal: string; t: number; bladen: Sheet[]; fouten: { pos: number; tekst: string }[]; ondergrens: number;
  status: 'rechthoek' | 'vorm' | 'handmatig'; instellingen: NestSettings;
}

export const defaultNestSettings = (t: number): NestSettings => ({ afstand: Math.max(5, t), rand: 10, draaien: true, vlakken: [{ id: '1500x3000', l: 3000, b: 1500 }] });

interface Rect { x: number; y: number; w: number; h: number }

/** MaxRects bin with best short side fit */
class Bin {
  free: Rect[];
  constructor(public w: number, public h: number) { this.free = [{ x: 0, y: 0, w, h }]; }
  find(w: number, h: number, rot: boolean): { x: number; y: number; r: boolean; score: number } | null {
    let best: { x: number; y: number; r: boolean; score: number } | null = null;
    for (const f of this.free) for (const r of rot ? [false, true] : [false]) {
      const ww = r ? h : w, hh = r ? w : h;
      if (ww <= f.w + 1e-9 && hh <= f.h + 1e-9) {
        const score = Math.min(f.w - ww, f.h - hh) * 1e6 + Math.max(f.w - ww, f.h - hh) + (f.y * 1e-3 + f.x * 1e-6);
        if (!best || score < best.score) best = { x: f.x, y: f.y, r, score };
      }
    }
    return best;
  }
  place(n: Rect) {
    const out: Rect[] = [];
    for (const f of this.free) {
      if (n.x >= f.x + f.w || n.x + n.w <= f.x || n.y >= f.y + f.h || n.y + n.h <= f.y) { out.push(f); continue; }
      if (n.x > f.x) out.push({ x: f.x, y: f.y, w: n.x - f.x, h: f.h });
      if (n.x + n.w < f.x + f.w) out.push({ x: n.x + n.w, y: f.y, w: f.x + f.w - n.x - n.w, h: f.h });
      if (n.y > f.y) out.push({ x: f.x, y: f.y, w: f.w, h: n.y - f.y });
      if (n.y + n.h < f.y + f.h) out.push({ x: f.x, y: n.y + n.h, w: f.w, h: f.y + f.h - n.y - n.h });
    }
    this.free = out.filter((a, i) => !out.some((b,
      j) => j !== i && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && (j < i || a.w !== b.w || a.h !== b.h || a.x !== b.x || a.y !== b.y)));
  }
}

export interface NestPiece { key: string; pos: number; l: number; b: number; oppervlak: number;
  /** two copies nested into each other (the second turned 180 degrees): their translations inside the rectangle l x b */
  pair?: { keyB: string; a: P2; bT: P2 } }

/** rectangle nesting of pieces (one entry per piece, counts expanded) on one sheet size */
export function nestRects(materiaal: string, t: number, pieces: NestPiece[], s: NestSettings): Nest {
  const sheet = s.vlakken[0];
  const W = sheet.l - 2 * s.rand + s.afstand, H = sheet.b - 2 * s.rand + s.afstand;
  const fouten: Nest['fouten'] = [];
  const order = [...pieces].sort((a, b) => Math.max(b.l, b.b) - Math.max(a.l, a.b) || b.l * b.b - a.l * a.b || a.pos - b.pos);
  const bins: { bin: Bin; sheet: Sheet }[] = [];
  for (const p of order) {
    const w = p.l + s.afstand, h = p.b + s.afstand;
    const turn = s.draaien && !p.pair;
    const fits = (w <= W + 1e-9 && h <= H + 1e-9) || (turn && h <= W + 1e-9 && w <= H + 1e-9);
    if (!fits) { fouten.push({ pos: p.pos, tekst: `P${p.pos} (${Math.round(p.l)} x ${Math.round(p.b)}) is groter dan het blad ${sheet.l} x ${sheet.b}` }); continue; }
    let spot: { bi: number; x: number; y: number; r: boolean } | null = null;
    for (let bi = 0; bi < bins.length && !spot; bi++) { const f = bins[bi].bin.find(w, h, turn); if (f) spot = { bi, ...f }; }
    if (!spot) {
      bins.push({ bin: new Bin(W, H), sheet: { id: sheet.id, l: sheet.l, b: sheet.b, stukken: [], benutting: 0 } });
      const f = bins[bins.length - 1].bin.find(w, h, turn)!;
      spot = { bi: bins.length - 1, ...f };
    }
    const B = bins[spot.bi];
    B.bin.place({ x: spot.x, y: spot.y, w: spot.r ? h : w, h: spot.r ? w : h });
    const X0 = s.rand + spot.x, Y0 = s.rand + spot.y;
    if (p.pair) {
      // the pair goes in as nested (a pair is not turned in the bin)
      B.sheet.stukken.push({ key: p.key, pos: p.pos, x: X0, y: Y0, draai: 0, l: p.l, b: p.b, tx: X0 + p.pair.a.x, ty: Y0 + p.pair.a.y },
        { key: p.pair.keyB, pos: p.pos, x: X0, y: Y0, draai: 180, l: p.l, b: p.b, tx: X0 + p.pair.bT.x, ty: Y0 + p.pair.bT.y });
    } else B.sheet.stukken.push({ key: p.key, pos: p.pos, x: X0, y: Y0, draai: spot.r ? 90 : 0, l: p.l, b: p.b });
  }
  const areaOf = new Map(pieces.flatMap((p) => [[p.key, p.oppervlak], ...(p.pair ? [[p.pair.keyB, p.oppervlak]] : [])] as [string, number][]));
  for (const b of bins) b.sheet.benutting = b.sheet.stukken.reduce((t2, x) => t2 + (areaOf.get(x.key) ?? x.l * x.b), 0) / (sheet.l * sheet.b);
  const usable = (sheet.l - 2 * s.rand) * (sheet.b - 2 * s.rand);
  const net = pieces.filter((p) => !fouten.some((f) => f.pos === p.pos)).reduce((t2, p) => t2 + p.oppervlak * (p.pair ? 2 : 1), 0);
  return { materiaal, t, bladen: bins.map((b) => b.sheet), fouten, ondergrens: Math.ceil(net / usable - 1e-9), status: pieces.some((p) => p.pair) ? 'vorm' : 'rechthoek', instellingen: s };
}

/** the pieces of the flat parts (each count expanded); the key of each copy is "<flat key>#<k>" */
export function nestPieces(flats: FlatPart[]): NestPiece[] {
  return flats.flatMap((f, i) => Array.from({ length: f.n }, (_, k) => ({ key: `${f.key}#${k}`, pos: i + 1, l: f.bbox.l, b: f.bbox.b, oppervlak: f.oppervlak })));
}

/** the placement of a piece: its loops moved to the sheet (rotation about the origin, then the offset) */
export function placeLoop(l: Loop, p: Placed): P2[] {
  const f = placeFn(p);
  return loopPolygon(l, 16).map(f);
}

/** the rotation (radians) and translation of a placed piece: world = R(q) + t */
export function placeOf(p: Placed): { rot: number; t: P2 } {
  const rot = (p.draai * Math.PI) / 180;
  const t = p.tx !== undefined ? { x: p.tx, y: p.ty! }
    : p.draai === 90 ? { x: p.x + p.b, y: p.y } : p.draai === 180 ? { x: p.x + p.l, y: p.y + p.b }
    : p.draai === 270 ? { x: p.x, y: p.y + p.l } : { x: p.x, y: p.y };
  return { rot, t };
}
/** a point of the piece in its own frame to the sheet */
export function placeFn(p: Placed): (q: P2) => P2 {
  const { rot, t } = placeOf(p), c = Math.round(Math.cos(rot)), s = Math.round(Math.sin(rot));
  return (q) => ({ x: q.x * c - q.y * s + t.x, y: q.x * s + q.y * c + t.y });
}

/**
 * Shape nesting step 2 (docs/36 4.5, P3.4), in v1 for pairs: two copies of a part, the second turned 180 degrees, slid
 * against each other along the no-fit polygon (the Minkowski sum of the part grown by the spacing with itself, Clipper2)
 * at the spot with the smallest box. A pair is used where its box is clearly smaller than two separate boxes
 * (triangles, L shapes, trapezia); everything else stays a rectangle. Arcs are approximated outward for the search.
 */
export function pairOf(f: FlatPart, spacing: number): { l: number; b: number; a: P2; bT: P2 } | null {
  const A = loopPolygon(f.buiten, 16);
  const grown = inflatePathsD([A], spacing + 0.05, JoinType.Round, EndType.Polygon, 2, 4, 0.05)[0];
  if (!grown) return null;
  // B = the part turned 180 degrees: its points are t - q; touching positions t lie on the boundary of grown + A
  const nfp = minkowskiSumD(A, grown, true);
  const outer = nfp.sort((x, y) => Math.abs(areaD(y)) - Math.abs(areaD(x)))[0];
  if (!outer) return null;
  const xs = A.map((q) => q.x), ys = A.map((q) => q.y);
  const ax0 = Math.min(...xs), ax1 = Math.max(...xs), ay0 = Math.min(...ys), ay1 = Math.max(...ys);
  let best: { area: number; t: P2 } | null = null;
  for (const t of outer) {
    const x0 = Math.min(ax0, t.x - ax1), x1 = Math.max(ax1, t.x - ax0), y0 = Math.min(ay0, t.y - ay1), y1 = Math.max(ay1, t.y - ay0);
    const area = (x1 - x0) * (y1 - y0);
    if (!best || area < best.area) best = { area, t };
  }
  if (!best) return null;
  const single = (f.bbox.l + spacing) * (f.bbox.b + spacing);
  const x0 = Math.min(ax0, best.t.x - ax1), y0 = Math.min(ay0, best.t.y - ay1), x1 = Math.max(ax1, best.t.x - ax0), y1 = Math.max(ay1, best.t.y - ay0);
  if ((x1 - x0 + spacing) * (y1 - y0 + spacing) > 0.9 * 2 * single) return null;
  return { l: x1 - x0, b: y1 - y0, a: { x: -x0, y: -y0 }, bT: { x: best.t.x - x0, y: best.t.y - y0 } };
}

/** the pieces for shape nesting: pairs where they pay, single rectangles for the rest */
export function nestPiecesShape(flats: FlatPart[], spacing: number): NestPiece[] {
  return flats.flatMap((f, i) => {
    const pair = f.n >= 2 ? pairOf(f, spacing) : null;
    if (!pair) return nestPieces([f]).map((p) => ({ ...p, pos: i + 1 }));
    const out: NestPiece[] = [];
    for (let k = 0; k + 1 < f.n; k += 2) out.push({ key: `${f.key}#${k}`, pos: i + 1, l: pair.l, b: pair.b, oppervlak: f.oppervlak, pair: { keyB: `${f.key}#${k + 1}`, a: pair.a, bT: pair.bT } });
    if (f.n % 2) out.push({ key: `${f.key}#${f.n - 1}`, pos: i + 1, l: f.bbox.l, b: f.bbox.b, oppervlak: f.oppervlak });
    return out;
  });
}

/** P3.1: the nest checked on the exact contours: distance, border, count, rotation */
export function validateNest(n: Nest, flats: FlatPart[], want: Map<number, number>): string[] {
  const out: string[] = [];
  const s = n.instellingen;
  for (const [bi, sh] of n.bladen.entries()) {
    const polys = sh.stukken.map((p) => ({ p, poly: placeLoop(flats[p.pos - 1].buiten, p) }));
    for (const { p, poly } of polys) {
      if (poly.some((q) => q.x < s.rand - 1e-6 || q.y < s.rand - 1e-6 || q.x > sh.l - s.rand + 1e-6 || q.y > sh.b - s.rand + 1e-6)) out.push(`blad ${bi + 1}: P${p.pos} ligt buiten de rand`);
      if (p.draai && !s.draaien) out.push(`blad ${bi + 1}: P${p.pos} gedraaid terwijl draaien niet mag`);
    }
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      const a = polys[i], b = polys[j];
      const ab = (z: P2[]) => ({ x0: Math.min(...z.map((q) => q.x)), x1: Math.max(...z.map((q) => q.x)), y0: Math.min(...z.map((q) => q.y)), y1: Math.max(...z.map((q) => q.y)) });
      const A = ab(a.poly), B = ab(b.poly);
      if (A.x0 - B.x1 >= s.afstand || B.x0 - A.x1 >= s.afstand || A.y0 - B.y1 >= s.afstand || B.y0 - A.y1 >= s.afstand) continue;
      const d = polyDistance(a.poly, b.poly);
      if (d < s.afstand - 1e-6) out.push(`blad ${bi + 1}: P${a.p.pos} en P${b.p.pos} liggen ${d.toFixed(2)} mm uit elkaar (minder dan ${s.afstand})`);
    }
  }
  const count = new Map<number, number>();
  for (const sh of n.bladen) for (const p of sh.stukken) count.set(p.pos, (count.get(p.pos) ?? 0) + 1);
  for (const [pos, k] of want) { const placed = count.get(pos) ?? 0,
    refused = n.fouten.filter((f) => f.pos === pos).length; if (placed + refused !== k) out.push(`P${pos}: ${placed} keer genest en ${refused} geweigerd, ${k} gevraagd`); }
  return out;
}

/** a nested sheet as DXF (P3.10): every piece its own contour, the position on TEKST, the sheet edge on its own layer */
export function nestDxf(sheet: Sheet, flats: FlatPart[], opt: DxfOptions = DXF_DEFAULTS): string {
  const w = new DxfWriter();
  w.polyline(opt.layers.rand, [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: sheet.l, y: 0 }, bulge: 0 }, { a: { x: sheet.l, y: sheet.b }, bulge: 0 }, { a: { x: 0, y: sheet.b }, bulge: 0 }], 'boog');
  for (const p of sheet.stukken) {
    const f = flats[p.pos - 1];
    const { rot, t } = placeOf(p);
    addPlate(w, f, { ...opt, bbox: false }, t, `P${p.pos}`, rot);
  }
  return w.toString();
}

/**
 * P3.9 manual nesting: a placed piece moved by (dx, dy) on its sheet. The nest becomes 'handmatig'; the sheet's use stays
 * (same pieces). Pure: returns a new nest.
 */
export function movePiece(n: Nest, bi: number, k: number, dx: number, dy: number): Nest {
  const bladen = n.bladen.map((b, i) => (i !== bi ? b : { ...b, stukken: b.stukken.map((p, j) => (j !== k ? p
    : { ...p, x: p.x + dx, y: p.y + dy, ...(p.tx !== undefined ? { tx: p.tx + dx, ty: p.ty! + dy } : {}) })) }));
  return { ...n, bladen, status: 'handmatig' };
}

/** the pieces that lie outside the border or closer to another piece than the spacing: "bi:k" (red, export blocked) */
export function badPieces(n: Nest, flats: FlatPart[]): Set<string> {
  const out = new Set<string>(), s = n.instellingen;
  n.bladen.forEach((sh, bi) => {
    const polys = sh.stukken.map((p) => placeLoop(flats[p.pos - 1].buiten, p));
    const box = polys.map((z) => ({ x0: Math.min(...z.map((q) => q.x)), x1: Math.max(...z.map((q) => q.x)), y0: Math.min(...z.map((q) => q.y)), y1: Math.max(...z.map((q) => q.y)) }));
    polys.forEach((_, i) => { const A = box[i]; if (A.x0 < s.rand - 1e-6 || A.y0 < s.rand - 1e-6 || A.x1 > sh.l - s.rand + 1e-6 || A.y1 > sh.b - s.rand + 1e-6) out.add(`${bi}:${i}`); });
    for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      const A = box[i], B = box[j];
      if (A.x0 - B.x1 >= s.afstand || B.x0 - A.x1 >= s.afstand || A.y0 - B.y1 >= s.afstand || B.y0 - A.y1 >= s.afstand) continue;
      const over = polys[i].some((q) => pointIn(polys[j], q)) || polys[j].some((q) => pointIn(polys[i], q));
      if (over || polyDistance(polys[i], polys[j]) < s.afstand - 1e-6) { out.add(`${bi}:${i}`); out.add(`${bi}:${j}`); }
    }
  });
  return out;
}

function pointIn(poly: P2[], q: P2): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** every material and thickness nested on its sheet (the Nest command; runs in a worker in the app, P3.6) */
export function nestAll(all: FlatPart[], settings: NestSettings | null): Nest[] {
  const groups = new Map<string, number[]>();
  all.forEach((f, i) => { if (f.betrouwbaar !== 'geen') { const k = `${f.materiaal}|${f.t}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); } });
  return [...groups.entries()].map(([k, idx]) => {
    const [mat, t] = k.split('|');
    const s = settings ?? defaultNestSettings(Number(t));
    // positions keep their number: pieces of the other groups are left out by giving them no copies
    const flats = all.map((f, i) => (idx.includes(i) ? f : { ...f, n: 0 }));
    return nestRects(mat, Number(t), (s.draaien ? nestPiecesShape(flats, s.afstand) : nestPieces(flats)), { ...s, afstand: Math.max(s.afstand, 0) });
  });
}
