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
import { loopPolygon, polyDistance } from './checks';
import type { P2 } from './geom';

export interface NestSettings { afstand: number; rand: number; draaien: boolean; vlakken: { l: number; b: number; id: string }[] }
export interface Placed { key: string; pos: number; x: number; y: number; draai: 0 | 90; l: number; b: number }
export interface Sheet { id: string; l: number; b: number; stukken: Placed[]; benutting: number }
export interface Nest { materiaal: string; t: number; bladen: Sheet[]; fouten: { pos: number; tekst: string }[]; ondergrens: number; status: 'rechthoek' | 'handmatig'; instellingen: NestSettings }

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

export interface NestPiece { key: string; pos: number; l: number; b: number; oppervlak: number }

/** rectangle nesting of pieces (one entry per piece, counts expanded) on one sheet size */
export function nestRects(materiaal: string, t: number, pieces: NestPiece[], s: NestSettings): Nest {
  const sheet = s.vlakken[0];
  const W = sheet.l - 2 * s.rand + s.afstand, H = sheet.b - 2 * s.rand + s.afstand;
  const fouten: Nest['fouten'] = [];
  const order = [...pieces].sort((a, b) => Math.max(b.l, b.b) - Math.max(a.l, a.b) || b.l * b.b - a.l * a.b || a.pos - b.pos);
  const bins: { bin: Bin; sheet: Sheet }[] = [];
  for (const p of order) {
    const w = p.l + s.afstand, h = p.b + s.afstand;
    const fits = (w <= W + 1e-9 && h <= H + 1e-9) || (s.draaien && h <= W + 1e-9 && w <= H + 1e-9);
    if (!fits) { fouten.push({ pos: p.pos, tekst: `P${p.pos} (${Math.round(p.l)} x ${Math.round(p.b)}) is groter dan het blad ${sheet.l} x ${sheet.b}` }); continue; }
    let spot: { bi: number; x: number; y: number; r: boolean } | null = null;
    for (let bi = 0; bi < bins.length && !spot; bi++) { const f = bins[bi].bin.find(w, h, s.draaien); if (f) spot = { bi, ...f }; }
    if (!spot) {
      bins.push({ bin: new Bin(W, H), sheet: { id: sheet.id, l: sheet.l, b: sheet.b, stukken: [], benutting: 0 } });
      const f = bins[bins.length - 1].bin.find(w, h, s.draaien)!;
      spot = { bi: bins.length - 1, ...f };
    }
    const B = bins[spot.bi];
    B.bin.place({ x: spot.x, y: spot.y, w: spot.r ? h : w, h: spot.r ? w : h });
    B.sheet.stukken.push({ key: p.key, pos: p.pos, x: s.rand + spot.x, y: s.rand + spot.y, draai: spot.r ? 90 : 0, l: p.l, b: p.b });
  }
  const areaOf = new Map(pieces.map((p) => [p.key, p.oppervlak]));
  for (const b of bins) b.sheet.benutting = b.sheet.stukken.reduce((t2, x) => t2 + (areaOf.get(x.key) ?? x.l * x.b), 0) / (sheet.l * sheet.b);
  const usable = (sheet.l - 2 * s.rand) * (sheet.b - 2 * s.rand);
  const net = pieces.filter((p) => !fouten.some((f) => f.pos === p.pos)).reduce((t2, p) => t2 + p.oppervlak, 0);
  return { materiaal, t, bladen: bins.map((b) => b.sheet), fouten, ondergrens: Math.ceil(net / usable - 1e-9), status: 'rechthoek', instellingen: s };
}

/** the pieces of the flat parts (each count expanded); the key of each copy is "<flat key>#<k>" */
export function nestPieces(flats: FlatPart[]): NestPiece[] {
  return flats.flatMap((f, i) => Array.from({ length: f.n }, (_, k) => ({ key: `${f.key}#${k}`, pos: i + 1, l: f.bbox.l, b: f.bbox.b, oppervlak: f.oppervlak })));
}

/** the placement of a piece: its loops moved to the sheet (rotation about the origin, then the offset) */
export function placeLoop(l: Loop, p: Placed): P2[] {
  const pts = loopPolygon(l, 16);
  return pts.map((q) => (p.draai === 90 ? { x: p.x + p.b - q.y, y: p.y + q.x } : { x: p.x + q.x, y: p.y + q.y }));
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
    const at = p.draai === 90 ? { x: p.x + p.b, y: p.y } : { x: p.x, y: p.y };
    addPlate(w, f, { ...opt, bbox: false }, at, `P${p.pos}`, p.draai === 90 ? Math.PI / 2 : 0);
  }
  return w.toString();
}
