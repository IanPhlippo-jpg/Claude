/**
 * The laser DXF (docs/36 P-3, P-4, W6, R10): AutoCAD R12 (AC1009), millimetres 1:1, deliberately without $INSUNITS
 * (as bibliotheek/fitness/dxf.mjs: some cutters read an R12 unit header wrongly), closed POLYLINE contours with true
 * arcs as bulges, holes as CIRCLE, bend lines and text on layers of their own. A point as decimal sign, no exponent,
 * no NaN, ASCII layer names. The kerf is not taken into account: the cutter's machine does that.
 */
import type { Bend, FlatPart, Loop } from './flat';
import { arcPoints, segLength } from './flat';
import type { P2 } from './geom';
import { machineNum } from './format';

export interface DxfOptions {
  geometry: boolean;
  bendLines: boolean;
  bbox: boolean;
  partText: boolean;
  /** arcs as bulge arcs, or as short lines (for a cutter that cannot read bulges) */
  arcs: 'boog' | 'polylijn';
  layers: { contour: string; gaten: string; op: string; neer: string; tekst: string; rand: string };
}

export const DXF_DEFAULTS: DxfOptions = {
  geometry: true, bendLines: true, bbox: false, partText: true, arcs: 'boog',
  layers: { contour: 'CONTOUR', gaten: 'GATEN', op: 'ZETLIJN_OP', neer: 'ZETLIJN_NEER', tekst: 'TEKST', rand: 'BLADRAND' },
};

const ascii = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '_');
const layerName = (s: string) => ascii(s).toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 31) || '0';

/** a DXF writer: group code / value pairs, CRLF */
export class DxfWriter {
  private out: string[] = [];
  private used = new Set<string>();
  private box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  private g(code: number, v: string | number) { this.out.push(String(code), typeof v === 'number' ? machineNum(v) : v); }
  private grow(p: P2) { this.box.x0 = Math.min(this.box.x0, p.x); this.box.y0 = Math.min(this.box.y0, p.y); this.box.x1 = Math.max(this.box.x1, p.x); this.box.y1 = Math.max(this.box.y1, p.y); }

  polyline(layer: string, loop: Loop, arcs: 'boog' | 'polylijn', at: P2 = { x: 0, y: 0 }) {
    const L = layerName(layer);
    this.used.add(L);
    this.g(0, 'POLYLINE'); this.g(8, L); this.g(66, 1); this.g(10, 0); this.g(20, 0); this.g(30, 0); this.g(70, 1);
    const vertex = (p: P2, bulge: number) => {
      const q = { x: p.x + at.x, y: p.y + at.y };
      this.grow(q);
      this.g(0, 'VERTEX'); this.g(8, L); this.g(10, q.x); this.g(20, q.y); this.g(30, 0);
      if (bulge) this.g(42, bulge);
    };
    loop.forEach((s, i) => {
      if (!s.bulge || arcs === 'boog') { vertex(s.a, s.bulge); if (s.bulge) for (const q of arcPoints(s.a, loop[(i + 1) % loop.length].a, s.bulge, 8)) this.grow({ x: q.x + at.x,
        y: q.y + at.y }); return; }
      const n = Math.max(4, Math.ceil(segLength(s.a, loop[(i + 1) % loop.length].a, s.bulge) / 2));
      for (const q of arcPoints(s.a, loop[(i + 1) % loop.length].a, s.bulge, n).slice(0, -1)) vertex(q, 0);
    });
    this.g(0, 'SEQEND'); this.g(8, L);
  }
  circle(layer: string, c: P2, r: number, at: P2 = { x: 0, y: 0 }) {
    const L = layerName(layer);
    this.used.add(L);
    this.grow({ x: c.x + at.x - r, y: c.y + at.y - r }); this.grow({ x: c.x + at.x + r, y: c.y + at.y + r });
    this.g(0, 'CIRCLE'); this.g(8, L); this.g(10, c.x + at.x); this.g(20, c.y + at.y); this.g(30, 0); this.g(40, r);
  }
  line(layer: string, a: P2, b: P2, at: P2 = { x: 0, y: 0 }) {
    const L = layerName(layer);
    this.used.add(L);
    this.g(0, 'LINE'); this.g(8, L); this.g(10, a.x + at.x); this.g(20, a.y + at.y); this.g(30, 0); this.g(11, b.x + at.x); this.g(21, b.y + at.y); this.g(31, 0);
  }
  text(layer: string, p: P2, h: number, text: string) {
    const L = layerName(layer);
    this.used.add(L);
    this.g(0, 'TEXT'); this.g(8, L); this.g(10, p.x); this.g(20, p.y); this.g(30, 0); this.g(40, h); this.g(1, ascii(text.replace(/°/g, '%%d')));
  }
  toString(): string {
    const head: string[] = [];
    const g = (c: number, v: string | number) => head.push(String(c), typeof v === 'number' ? machineNum(v) : v);
    const b = Number.isFinite(this.box.x0) ? this.box : { x0: 0, y0: 0, x1: 0, y1: 0 };
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009');
    g(9, '$EXTMIN'); g(10, b.x0); g(20, b.y0); g(30, 0); g(9, '$EXTMAX'); g(10, b.x1); g(20, b.y1); g(30, 0); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES');
    g(0, 'TABLE'); g(2, 'LTYPE'); g(70, 1); g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, 0); g(3, 'Solid line'); g(72, 65); g(73, 0); g(40, 0); g(0, 'ENDTAB');
    const layers = [...this.used];
    g(0, 'TABLE'); g(2, 'LAYER'); g(70, layers.length);
    const colour = (l: string) => (/ZETLIJN_OP/.test(l) ? 3 : /ZETLIJN_NEER/.test(l) ? 1 : /TEKST|RAND/.test(l) ? 8 : /GATEN/.test(l) ? 5 : 7);
    for (const l of layers) { g(0, 'LAYER'); g(2, l); g(70, 0); g(62, colour(l)); g(6, 'CONTINUOUS'); }
    g(0, 'ENDTAB'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    return [...head, ...this.out, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
  }
}

/** one plate as a DXF (P-3): contour, inner contours and holes, bend lines up / down, the position text */
export function plateDxf(p: FlatPart, opt: DxfOptions = DXF_DEFAULTS, label = ''): string {
  const w = new DxfWriter();
  addPlate(w, p, opt, { x: 0, y: 0 }, label);
  return w.toString();
}

export function addPlate(w: DxfWriter, p: Pick<FlatPart, 'buiten' | 'binnen' | 'gaten' | 'plooien' | 'bbox'>, opt: DxfOptions, at: P2, label: string, rot = 0) {
  const L = opt.layers;
  const tr = (q: P2): P2 => (rot ? { x: q.x * Math.cos(rot) - q.y * Math.sin(rot), y: q.x * Math.sin(rot) + q.y * Math.cos(rot) } : q);
  const trLoop = (l: Loop): Loop => l.map((s) => ({ a: tr(s.a), bulge: s.bulge }));
  if (opt.geometry) {
    w.polyline(L.contour, trLoop(p.buiten), opt.arcs, at);
    for (const l of p.binnen) w.polyline(L.gaten, trLoop(l), opt.arcs, at);
    for (const g of p.gaten) w.circle(L.gaten, tr(g.c), g.r, at);
  }
  if (opt.bendLines) for (const b of p.plooien as Bend[]) w.line(b.richting === 'op' ? L.op : L.neer, tr(b.a), tr(b.b), at);
  if (opt.bbox) {
    const box: Loop = [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: p.bbox.l, y: 0 }, bulge: 0 }, { a: { x: p.bbox.l, y: p.bbox.b }, bulge: 0 }, { a: { x: 0, y: p.bbox.b }, bulge: 0 }];
    w.polyline(L.rand, trLoop(box), 'boog', at);
  }
  if (opt.partText && label) {
    const c = tr({ x: p.bbox.l / 2, y: p.bbox.b / 2 });
    const h = Math.max(2, Math.min(10, Math.min(p.bbox.l, p.bbox.b) / 8));
    w.text(L.tekst, { x: c.x + at.x - (label.length * h) / 3, y: c.y + at.y - h / 2 }, h, label);
  }
}

/** the file name of a plate (P-3): <positie>_<materiaal>_<dikte>mm_<aantal>x.dxf */
export function dxfFileName(pos: number | string, materiaal: string, t: number, n: number): string {
  const clean = ascii(materiaal).replace(/[^A-Za-z0-9.+-]+/g, '-').replace(/^-|-$/g, '') || 'staal';
  return `${typeof pos === 'number' ? `P${pos}` : pos}_${clean}_${machineNum(t, 2)}mm_${n}x.dxf`;
}
