/**
 * File ▸ Save As ▸ DXF / Adobe PDF of a drawing (QA v0.5.1 F114): the active sheet as it is drawn on screen, read
 * from the sheet's SVG (views, dimensions, notes, tables, sheet format, section hatching) in millimetres, without
 * what only the screen shows (selection frames and highlights, the paper shadow).
 */
import { sheetSize } from '../../core/drawing/sheet';
import { hatchLines, toDxf, toPdf, type P2, type SheetPrims } from '../../core/drawing/export2d';
import { desktop } from '../desktop';
import { useStore } from '../store';

/** the highlight colours of selection and preview: not part of the drawing */
const UI_COLOURS = new Set(['rgb(30, 111, 217)', 'rgb(74, 144, 217)']);
const HATCH: Record<string, { angle: number; spacing: number }> = { 'k-hatch': { angle: 45, spacing: 2.5 }, 'k-hatch-b': { angle: -45, spacing: 2.5 }, 'k-hatch-c': { angle: 45, spacing: 1.4 } };

const alpha = (c: string) => { const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c); return m ? Number(m[1]) : 1; };
/** a light fill (paper, a table or balloon background) is no ink: only dark fills (arrowheads) are filled */
const isLight = (c: string) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return !!m && 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] > 128; };

/** the sheet primitives of the sheet SVG in the page */
export function collectSheet(svg: SVGSVGElement, sheetMm: [number, number]): SheetPrims | null {
  const paper = svg.querySelector<SVGRectElement>('.k-sheet-paper');
  if (!paper) return null;
  const toUser = svg.getScreenCTM()?.inverse();
  if (!toUser) return null;
  const pm = toUser.multiply(paper.getScreenCTM()!);
  const px0 = new DOMPoint(paper.x.baseVal.value, paper.y.baseVal.value).matrixTransform(pm);
  const k = (paper.width.baseVal.value * Math.hypot(pm.a, pm.b)) / sheetMm[0];
  const [W, H] = sheetMm;
  const out: SheetPrims = { width: W, height: H, paths: [], circles: [], texts: [] };
  const all = svg.querySelectorAll<SVGGraphicsElement>('line, rect, circle, ellipse, polyline, polygon, path, text');
  for (const el of all) {
    if (el === paper || el.closest('defs, pattern, clipPath, mask')) continue;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const cs = getComputedStyle(el);
    const m = toUser.multiply(el.getScreenCTM()!);
    const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const mm = (x: number, y: number): P2 => { const q = new DOMPoint(x, y).matrixTransform(m); return [(q.x - px0.x) / k, H - (q.y - px0.y) / k]; };
    if (el instanceof SVGTextElement) {
      if (cs.fill === 'none' || UI_COLOURS.has(cs.fill)) continue;
      const angle = (-Math.atan2(m.b, m.a) * 180) / Math.PI;
      const height = (parseFloat(cs.fontSize) * scale * 0.7) / k;
      // a note of several lines: a tspan per line with its own position; each line from where its first character
      // was laid out (so the anchor is already applied)
      const lines = [...el.querySelectorAll('tspan')].filter((t) => t.hasAttribute('x') || t.hasAttribute('dy') || t.hasAttribute('y'));
      const parts = lines.length ? lines : [el];
      for (const t of parts) {
        const box = (t as SVGTextContentElement).getNumberOfChars() > 0 ? (t as SVGTextContentElement).getStartPositionOfChar(0) : null;
        if (!box) continue;
        out.texts.push({ p: mm(box.x, box.y), height, text: t.textContent ?? '', anchor: 'start', angle: Math.round(angle * 1000) / 1000 });
      }
      continue;
    }
    const stroke = cs.stroke !== 'none' && !UI_COLOURS.has(cs.stroke) && alpha(cs.stroke) > 0.05 && parseFloat(cs.strokeWidth) > 0;
    const width = stroke ? (parseFloat(cs.strokeWidth) * scale) / k : 0;
    const hatch = /url\("?#([\w-]+)"?\)/.exec(cs.fill)?.[1];
    const solid = !hatch && cs.fill !== 'none' && !isLight(cs.fill) && !UI_COLOURS.has(cs.fill) && alpha(cs.fill) >= 0.5;
    if (!stroke && !solid && !(hatch && HATCH[hatch])) continue;
    const dashed = stroke && cs.strokeDasharray !== 'none';
    const loops: P2[][] = [];
    const add = (pts: P2[], closed: boolean) => {
      if (pts.length < 2) return;
      if (closed) loops.push(pts);
      if (stroke || solid) out.paths.push({ pts, closed, width, ...(solid && closed ? { fill: true } : {}), ...(dashed ? { dashed } : {}) });
    };
    if (el instanceof SVGLineElement) add([mm(el.x1.baseVal.value, el.y1.baseVal.value), mm(el.x2.baseVal.value, el.y2.baseVal.value)], false);
    else if (el instanceof SVGRectElement) {
      const x = el.x.baseVal.value, y = el.y.baseVal.value, w = el.width.baseVal.value, h = el.height.baseVal.value;
      // the paper shadow lies outside the sheet
      const c = mm(x + w / 2, y + h / 2);
      if (c[0] < 0 || c[1] < 0 || c[0] > W || c[1] > H) continue;
      add([mm(x, y), mm(x + w, y), mm(x + w, y + h), mm(x, y + h)], true);
    } else if (el instanceof SVGCircleElement && Math.abs(m.b) < 1e-9 && Math.abs(Math.abs(m.a) - Math.abs(m.d)) < 1e-9) {
      out.circles.push({ c: mm(el.cx.baseVal.value, el.cy.baseVal.value), r: (el.r.baseVal.value * scale) / k, width, ...(solid ? { fill: true } : {}) });
      if (hatch) loops.push(sample(el, mm, k));
    } else if (el instanceof SVGPolylineElement || el instanceof SVGPolygonElement) {
      add([...el.points].map((q) => mm(q.x, q.y)), el instanceof SVGPolygonElement);
    } else if (el instanceof SVGPathElement || el instanceof SVGEllipseElement || el instanceof SVGCircleElement) {
      for (const sub of subpaths(el)) add(sub.pts.map((q) => mm(q[0], q[1])), sub.closed);
    }
    if (hatch && HATCH[hatch] && loops.length) for (const [a, b] of hatchLines(loops, HATCH[hatch].angle, HATCH[hatch].spacing)) out.paths.push({ pts: [a, b], closed: false, width: 0.18 });
  }
  return out;
}

/** points of a circle drawn through a transform (an ellipse on the sheet) */
function sample(el: SVGGeometryElement, mm: (x: number, y: number) => P2, k: number): P2[] {
  const len = el.getTotalLength();
  const n = Math.max(12, Math.min(720, Math.ceil(len / (0.25 * k))));
  return Array.from({ length: n }, (_, i) => { const q = el.getPointAtLength((len * i) / n); return mm(q.x, q.y); });
}

/** the subpaths of a path (in its own coordinates): exact for lines, sampled along curves and arcs */
function subpaths(el: SVGGeometryElement): { pts: P2[]; closed: boolean }[] {
  if (!(el instanceof SVGPathElement)) {
    const len = el.getTotalLength();
    const n = Math.max(24, Math.min(720, Math.ceil(len / 0.5)));
    return [{ pts: Array.from({ length: n }, (_, i) => { const q = el.getPointAtLength((len * i) / n); return [q.x, q.y] as P2; }), closed: true }];
  }
  const d = el.getAttribute('d') ?? '';
  const out: { pts: P2[]; closed: boolean }[] = [];
  // each subpath on its own: a temporary path in the same place samples it
  for (const part of d.match(/[Mm][^Mm]*/g) ?? []) {
    const closed = /[Zz]\s*$/.test(part);
    const straight = /^[MmLlHhVvZz\d\s.,eE+-]*$/.test(part) && /^M/.test(part);
    if (straight) {
      const pts: P2[] = [];
      let x = 0, y = 0;
      for (const [, cmd, args] of part.matchAll(/([MLHVZmlhvz])([^MLHVZmlhvz]*)/g)) {
        const v = (args.match(/-?[\d.]+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
        if (cmd === 'M' || cmd === 'L') for (let i = 0; i + 1 < v.length; i += 2) { x = v[i]; y = v[i + 1]; pts.push([x, y]); }
        else if (cmd === 'l' || cmd === 'm') for (let i = 0; i + 1 < v.length; i += 2) { x += v[i]; y += v[i + 1]; pts.push([x, y]); }
        else if (cmd === 'H') for (const a of v) { x = a; pts.push([x, y]); }
        else if (cmd === 'h') for (const a of v) { x += a; pts.push([x, y]); }
        else if (cmd === 'V') for (const a of v) { y = a; pts.push([x, y]); }
        else if (cmd === 'v') for (const a of v) { y += a; pts.push([x, y]); }
      }
      out.push({ pts, closed });
      continue;
    }
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('d', part);
    el.parentNode?.appendChild(tmp);
    const len = tmp.getTotalLength();
    const n = Math.max(8, Math.min(720, Math.ceil(len / 0.5)));
    out.push({ pts: Array.from({ length: n + (closed ? 0 : 1) }, (_, i) => { const q = tmp.getPointAtLength((len * i) / n); return [q.x, q.y] as P2; }), closed });
    tmp.remove();
  }
  return out;
}

/** File ▸ Save As ▸ DXF / Adobe PDF: the active sheet, after the selection is cleared so no highlight is drawn */
export async function exportSheet(format: 'dxf' | 'pdf'): Promise<void> {
  const st = useStore.getState();
  const sheet = st.doc.sheets?.[0];
  if (!sheet) return st.pushMessage('Open a drawing sheet first.', 'warn');
  st.selectDrawingView(null);
  st.selectDrawingDimension(null);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const svg = document.querySelector<SVGSVGElement>('.k-sheet-svg');
  const prims = svg ? collectSheet(svg, sheetSize(sheet)) : null;
  if (!prims) return st.pushMessage('The sheet is not shown; open the drawing to export it.', 'warn');
  const data = format === 'dxf' ? new TextEncoder().encode(toDxf(prims)) : toPdf(prims);
  const name = `${st.doc.name}${(st.doc.sheets?.length ?? 1) > 1 ? ` - ${sheet.name}` : ''}.${format}`;
  const api = desktop();
  if (api) {
    const r = await api.saveFileAs({ defaultPath: name, filters: [format === 'dxf' ? { name: 'DXF', extensions: ['dxf'] } : { name: 'Adobe PDF', extensions: ['pdf'] }], data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer });
    if (r?.error) st.pushMessage(`${r.name} could not be saved: ${r.error}`, 'error');
    else if (r) st.pushMessage(`${r.name} saved.`);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>], { type: format === 'dxf' ? 'application/dxf' : 'application/pdf' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
