/**
 * A small PDF writer for the workshop and customer output (docs/36 W12, O2.7, O2.8): several pages, Helvetica and
 * Helvetica-Bold in the WinAnsi encoding (so € ë é ï ç ° Ø print as such, not as ?), text measured with the font
 * metrics (right-aligned amounts), lines, rectangles, colours, rotated text (the watermark) and JPEG images. Content
 * streams stay uncompressed, so a test can search the text. Coordinates in mm from the top left; font sizes in pt.
 */

// Helvetica and Helvetica-Bold advance widths (1/1000 em) for ASCII 32..126 (the standard font metrics)
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

/** WinAnsi code of a character (the characters outside Latin-1 that WinAnsi has: € – — ‘ ’ “ ” • …) */
const WIN: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
export function winAnsi(ch: string): number {
  if (WIN[ch] !== undefined) return WIN[ch];
  if (ch === '⌀') return 0xd8;
  const c = ch.charCodeAt(0);
  if ((c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff)) return c;
  return 0x3f;
}

/** the width of a character: accented letters as their base letter, the symbols with their own metric */
function charWidth(ch: string, bold: boolean): number {
  const t = bold ? W_BOLD : W_REG;
  const base = ch.normalize('NFD')[0];
  const c = base.charCodeAt(0);
  if (c >= 32 && c <= 126) return t[c - 32];
  if (ch === '€') return 556;
  if (ch === '°') return 400;
  if (ch === 'Ø' || ch === '⌀') return 778;
  if (ch === '×') return 584;
  if (ch === '²' || ch === '³') return 333;
  if (ch === '–') return 556;
  if (ch === '—') return 1000;
  if (ch === '•') return 350;
  return 556;
}

const PT = 72 / 25.4;
/** text width in mm at a size in pt */
export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch, bold);
  return (w / 1000) * size / PT;
}

export interface TextOpt { size?: number; bold?: boolean; align?: 'left' | 'right' | 'center'; color?: [number, number, number]; angle?: number }
export interface LineOpt { w?: number; color?: [number, number, number]; dash?: number[] }

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
const esc = (s: string) => [...s].map((ch) => { const c = winAnsi(ch); return c === 0x28 || c === 0x29 || c === 0x5c ? '\\' + ch : c < 0x80 ? String.fromCharCode(c)
  : '\\' + c.toString(8).padStart(3, '0'); }).join('');
const rgb = (c: [number, number, number]) => c.map((x) => f(x)).join(' ');

export class PdfPage {
  ops: string[] = [];
  images: { name: string; data: Uint8Array; w: number; h: number }[] = [];
  constructor(public width: number, public height: number) {}
  private Y(y: number) { return (this.height - y) * PT; }
  text(x: number, y: number, s: string, o: TextOpt = {}) {
    if (!s) return;
    const size = o.size ?? 9;
    const w = textWidth(s, size, o.bold);
    const dx = o.align === 'right' ? -w : o.align === 'center' ? -w / 2 : 0;
    const a = ((o.angle ?? 0) * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const X = (x + dx * cs) * PT, YY = this.Y(y) + dx * sn * PT;
    this.ops.push(`BT ${rgb(o.color ?? [0, 0, 0])} rg /${o.bold ? 'F2' : 'F1'} ${f(size)} Tf ${f(cs)} ${f(sn)} ${f(-sn)} ${f(cs)} ${f(X)} ${f(YY)} Tm (${esc(s)}) Tj ET`);
  }
  line(x1: number, y1: number, x2: number, y2: number, o: LineOpt = {}) {
    this.ops.push(`${f((o.w ?? 0.2) * PT)} w ${rgb(o.color ?? [0, 0, 0])} RG [${(o.dash ?? []).map((d) => f(d * PT)).join(' ')}] 0 d ${f(x1 * PT)} ${f(this.Y(y1))} m ${f(x2 * PT)}` +
      ` ${f(this.Y(y2))} l S`);
  }
  rect(x: number, y: number, w: number, h: number, o: { fill?: [number, number, number]; stroke?: [number, number, number]; w?: number } = {}) {
    const r = `${f(x * PT)} ${f(this.Y(y + h))} ${f(w * PT)} ${f(h * PT)} re`;
    if (o.fill) this.ops.push(`${rgb(o.fill)} rg ${r} f`);
    if (o.stroke) this.ops.push(`${f((o.w ?? 0.2) * PT)} w ${rgb(o.stroke)} RG [] 0 d ${r} S`);
  }
  /** a closed or open polyline (mm) */
  poly(pts: [number, number][], o: { closed?: boolean; fill?: [number, number, number]; stroke?: [number, number, number]; w?: number; dash?: number[] } = {}) {
    if (pts.length < 2) return;
    const p = `${f(pts[0][0] * PT)} ${f(this.Y(pts[0][1]))} m ${pts.slice(1).map((q) => `${f(q[0] * PT)} ${f(this.Y(q[1]))} l`).join(' ')}${o.closed ? ' h' : ''}`;
    const style = `${f((o.w ?? 0.2) * PT)} w [${(o.dash ?? []).map((d) => f(d * PT)).join(' ')}] 0 d`;
    if (o.fill && o.stroke) this.ops.push(`${style} ${rgb(o.fill)} rg ${rgb(o.stroke)} RG ${p} B`);
    else if (o.fill) this.ops.push(`${rgb(o.fill)} rg ${p} f`);
    else this.ops.push(`${style} ${rgb(o.stroke ?? [0, 0, 0])} RG ${p} S`);
  }
  circle(cx: number, cy: number, r: number, o: { fill?: [number, number, number]; stroke?: [number, number, number]; w?: number } = {}) {
    const n = 32;
    this.poly(Array.from({ length: n }, (_, k) => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)] as [number, number]), { closed: true, ...o });
  }
  /** a JPEG image (the bytes of a .jpg) in the box x, y, w, h (mm) */
  jpeg(data: Uint8Array, pxW: number, pxH: number, x: number, y: number, w: number, h: number) {
    const name = `Im${this.images.length + 1}`;
    this.images.push({ name, data, w: pxW, h: pxH });
    this.ops.push(`q ${f(w * PT)} 0 0 ${f(h * PT)} ${f(x * PT)} ${f(this.Y(y + h))} cm /${name} Do Q`);
  }
}

export class PdfDoc {
  pages: PdfPage[] = [];
  constructor(public width = 210, public height = 297, public title = '') {}
  page(): PdfPage { const p = new PdfPage(this.width, this.height); this.pages.push(p); return p; }
  save(): Uint8Array {
    const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
    const chunks: Uint8Array[] = [];
    let length = 0;
    const offsets: number[] = [];
    const push = (b: Uint8Array) => { chunks.push(b); length += b.length; };
    push(enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
    // objects: 1 catalog, 2 pages, 3 font regular, 4 font bold, 5 info, then per page: page, content, images
    const objs: (string | { head: string; data: Uint8Array })[] = [];
    const kids: number[] = [];
    const first = 6;
    let next = first;
    const pageObjs: (string | { head: string; data: Uint8Array })[] = [];
    for (const p of this.pages) {
      const pageId = next++, contentId = next++;
      const imgIds = p.images.map(() => next++);
      kids.push(pageId);
      const xobj = p.images.length ? ` /XObject << ${p.images.map((im, k) => `/${im.name} ${imgIds[k]} 0 R`).join(' ')} >>` : '';
      pageObjs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(p.width * PT)} ${f(p.height * PT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobj} >> /Contents ${contentId} 0 R >>`);
      const content = p.ops.join('\n');
      pageObjs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      for (const im of p.images) pageObjs.push({ head: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length` +
        ` ${im.data.length} >>\nstream\n`, data: im.data });
    }
    objs.push('<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      `<< /Producer (Phlippo CAD) /Title (${esc(this.title)}) >>`, ...pageObjs);
    objs.forEach((o, i) => {
      offsets.push(length);
      if (typeof o === 'string') push(enc(`${i + 1} 0 obj\n${o}\nendobj\n`));
      else { push(enc(`${i + 1} 0 obj\n${o.head}`)); push(o.data); push(enc('\nendstream\nendobj\n')); }
    });
    const xref = length;
    push(enc(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`));
    push(enc(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    const out = new Uint8Array(length);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    return out;
  }
}

/** the text of a PDF of this writer, decoded (for tests and for the "no forbidden words" check) */
export function pdfText(bytes: Uint8Array): string {
  const s = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  const rev: Record<number, string> = Object.fromEntries(Object.entries(WIN).map(([k, v]) => [v, k]));
  const out: string[] = [];
  for (const m of s.matchAll(/\((?:[^()\\]|\\.)*\) Tj/g)) {
    const raw = m[0].slice(1, -4);
    out.push(raw.replace(/\\([0-7]{3}|.)/g, (_, x: string) => (x.length === 3 ? (rev[parseInt(x, 8)] ?? String.fromCharCode(parseInt(x, 8))) : x)));
  }
  return out.join('\n');
}
