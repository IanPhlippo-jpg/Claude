/**
 * Drawing sheets as DXF and PDF (QA v0.5.1 F114): the sheet as it is drawn (views, dimensions, notes, format,
 * hatching), collected from the sheet in millimetres with y up, written as vectors.
 */
export type P2 = [number, number];

export interface SheetPrims {
  /** sheet size in mm */
  width: number;
  height: number;
  /** open or closed polylines (a line is a polyline of two points); width in mm; fill: a solid filled shape */
  paths: { pts: P2[]; closed: boolean; width: number; fill?: boolean; dashed?: boolean }[];
  circles: { c: P2; r: number; width: number; fill?: boolean }[];
  /** text at its baseline point; height in mm; angle in degrees counter-clockwise */
  texts: { p: P2; height: number; text: string; anchor: 'start' | 'middle' | 'end'; angle: number }[];
}

const n = (v: number) => (Math.abs(v) < 5e-7 ? '0' : v.toFixed(6).replace(/\.?0+$/, ''));

/** AutoCAD R12 (AC1009) ASCII DXF in millimetres: LINE, POLYLINE, CIRCLE, TEXT; dashed lines on layer HIDDEN */
export function toDxf(p: SheetPrims): string {
  const out: string[] = [];
  const g = (code: number, v: string | number) => out.push(String(code), typeof v === 'number' ? n(v) : v);
  g(0, 'SECTION'); g(2, 'HEADER');
  g(9, '$ACADVER'); g(1, 'AC1009');
  g(9, '$INSUNITS'); g(70, '4');
  g(9, '$EXTMIN'); g(10, 0); g(20, 0);
  g(9, '$EXTMAX'); g(10, p.width); g(20, p.height);
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES');
  g(0, 'TABLE'); g(2, 'LTYPE'); g(70, '2');
  g(0, 'LTYPE'); g(2, 'CONTINUOUS'); g(70, '0'); g(3, 'Solid line'); g(72, '65'); g(73, '0'); g(40, 0);
  g(0, 'LTYPE'); g(2, 'HIDDEN'); g(70, '0'); g(3, '__ __ __'); g(72, '65'); g(73, '2'); g(40, 4.5); g(49, 3); g(49, -1.5);
  g(0, 'ENDTAB');
  g(0, 'TABLE'); g(2, 'LAYER'); g(70, '2');
  g(0, 'LAYER'); g(2, '0'); g(70, '0'); g(62, '7'); g(6, 'CONTINUOUS');
  g(0, 'LAYER'); g(2, 'HIDDEN'); g(70, '0'); g(62, '7'); g(6, 'HIDDEN');
  g(0, 'ENDTAB');
  g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  for (const s of p.paths) {
    const layer = s.dashed ? 'HIDDEN' : '0';
    if (s.pts.length === 2 && !s.closed) {
      g(0, 'LINE'); g(8, layer); g(10, s.pts[0][0]); g(20, s.pts[0][1]); g(30, 0); g(11, s.pts[1][0]); g(21, s.pts[1][1]); g(31, 0);
      continue;
    }
    if (s.pts.length < 2) continue;
    g(0, 'POLYLINE'); g(8, layer); g(66, '1'); g(10, 0); g(20, 0); g(30, 0); g(70, s.closed ? '1' : '0');
    for (const q of s.pts) { g(0, 'VERTEX'); g(8, layer); g(10, q[0]); g(20, q[1]); g(30, 0); }
    g(0, 'SEQEND'); g(8, layer);
  }
  for (const c of p.circles) { g(0, 'CIRCLE'); g(8, '0'); g(10, c.c[0]); g(20, c.c[1]); g(30, 0); g(40, c.r); }
  for (const t of p.texts) {
    if (!t.text.trim()) continue;
    const h = t.anchor === 'middle' ? '1' : t.anchor === 'end' ? '2' : '0';
    g(0, 'TEXT'); g(8, '0'); g(10, t.p[0]); g(20, t.p[1]); g(30, 0); g(40, t.height); g(1, dxfText(t.text));
    if (t.angle) g(50, t.angle);
    if (h !== '0') { g(72, h); g(11, t.p[0]); g(21, t.p[1]); g(31, 0); }
  }
  g(0, 'ENDSEC');
  g(0, 'EOF');
  return out.join('\r\n') + '\r\n';
}

/** the special characters of drawings in the DXF control codes (%%d degree, %%p plus/minus, %%c diameter) */
function dxfText(s: string): string {
  return s.replace(/°/g, '%%d').replace(/±/g, '%%p').replace(/[ØⰀ⌀]/g, '%%c').replace(/[^\x20-\x7e]/g, '?');
}

/** the text in the WinAnsi encoding of the standard Helvetica font of PDF */
function pdfText(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch === '⌀' ? 0xd8 : ch.charCodeAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
    else if (c >= 0x20 && c < 0x7f) out += ch;
    else if (c >= 0xa0 && c <= 0xff) out += '\\' + c.toString(8).padStart(3, '0');
    else out += '?';
  }
  return out;
}

/** a one-page PDF 1.4, page size the sheet, vectors in black, text in Helvetica */
export function toPdf(p: SheetPrims): Uint8Array {
  const k = 72 / 25.4;
  const f = (v: number) => (Math.round(v * k * 1000) / 1000).toString();
  const ops: string[] = ['1 J 1 j 0 G 0 g'];
  for (const s of p.paths) {
    if (s.pts.length < 2) continue;
    ops.push(`${f(Math.max(0.05, s.width))} w ${s.dashed ? `[${f(3)} ${f(1.5)}] 0 d` : '[] 0 d'}`);
    ops.push(`${f(s.pts[0][0])} ${f(s.pts[0][1])} m ${s.pts.slice(1).map((q) => `${f(q[0])} ${f(q[1])} l`).join(' ')}${s.closed ? ' h' : ''} ${s.fill ? 'f' : 'S'}`);
  }
  for (const c of p.circles) {
    // four cubic Bezier quarter arcs
    const r = c.r, x = c.c[0], y = c.c[1], m = 0.5523 * r;
    ops.push(`${f(Math.max(0.05, c.width))} w [] 0 d ${f(x + r)} ${f(y)} m ${f(x + r)} ${f(y + m)} ${f(x + m)} ${f(y + r)} ${f(x)} ${f(y + r)} c ${f(x - m)} ${f(y + r)} ${f(x - r)} ${f(y + m)} ${f(x - r)} ${f(y)} c ${f(x - r)} ${f(y - m)} ${f(x - m)} ${f(y - r)} ${f(x)} ${f(y - r)} c ${f(x + m)} ${f(y - r)} ${f(x + r)} ${f(y - m)} ${f(x + r)} ${f(y)} c ${c.fill ? 'f' : 'S'}`);
  }
  for (const t of p.texts) {
    if (!t.text.trim()) continue;
    // Helvetica: an average advance of 0.5 em places middle / end anchored text closely enough
    const w = 0.5 * t.height * [...t.text].length;
    const dx = t.anchor === 'middle' ? -w / 2 : t.anchor === 'end' ? -w : 0;
    const a = (t.angle * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const x = t.p[0] + dx * cs, y = t.p[1] + dx * sn;
    ops.push(`BT /F1 ${f(t.height * 1.4)} Tf ${cs.toFixed(5)} ${sn.toFixed(5)} ${(-sn).toFixed(5)} ${cs.toFixed(5)} ${f(x)} ${f(y)} Tm (${pdfText(t.text)}) Tj ET`);
  }
  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(p.width)} ${f(p.height)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // every character is one byte (the text is escaped to ASCII above)
  return Uint8Array.from(pdf, (ch) => ch.charCodeAt(0) & 0xff);
}

/**
 * The hatch lines of a filled region (a section): parallel lines at the angle and spacing, clipped to the outline
 * (even-odd, so holes stay open).
 */
export function hatchLines(loops: P2[][], angleDeg: number, spacing: number): [P2, P2][] {
  const a = (angleDeg * Math.PI) / 180, d: P2 = [Math.cos(a), Math.sin(a)], nrm: P2 = [-d[1], d[0]];
  const proj = (q: P2, v: P2) => q[0] * v[0] + q[1] * v[1];
  let lo = Infinity, hi = -Infinity;
  for (const l of loops) for (const q of l) { const s = proj(q, nrm); lo = Math.min(lo, s); hi = Math.max(hi, s); }
  const out: [P2, P2][] = [];
  if (!(spacing > 0) || hi - lo > spacing * 5000) return out;
  for (let s = Math.ceil(lo / spacing) * spacing; s <= hi; s += spacing) {
    const ts: number[] = [];
    for (const l of loops) for (let i = 0; i < l.length; i++) {
      const p0 = l[i], p1 = l[(i + 1) % l.length];
      const s0 = proj(p0, nrm) - s, s1 = proj(p1, nrm) - s;
      if ((s0 < 0) === (s1 < 0)) continue;
      const t = s0 / (s0 - s1);
      ts.push(proj([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t], d));
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const at = (t: number): P2 => [nrm[0] * s + d[0] * t, nrm[1] * s + d[1] * t];
      out.push([at(ts[i]), at(ts[i + 1])]);
    }
  }
  return out;
}
