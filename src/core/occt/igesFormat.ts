/**
 * The IGES 5.3 file format (QA F114/F199): trimmed NURBS surfaces as entity 144 on a rational B-spline surface (128),
 * each boundary a curve on the surface (142) with a composite (102) of B-spline curves (126) in the parameter space
 * of the surface and one in model space. Plain text in 80-column records: Start, Global, Directory Entry, Parameter
 * Data and Terminate sections. No OpenCascade here: src/core/occt/iges.ts turns the B-rep into this data.
 */
import type { NurbsCurve, NurbsSurface } from './igesNurbs';

export type IgesUnit = 'mm' | 'cm' | 'm' | 'in';

/** one boundary of a trimmed surface: its curves in parameter space (u, v) and in model space, in loop order */
export interface IgesLoop {
  uv: NurbsCurve[];
  xyz: NurbsCurve[];
  /** 142 PREF: 1 parameter space preferred, 2 model space preferred, 3 both equally good */
  pref: 1 | 2 | 3;
}

export interface IgesFace {
  surface: NurbsSurface;
  outer: IgesLoop;
  inner: IgesLoop[];
}

export interface IgesHeader {
  fileName: string;
  unit: IgesUnit;
  /** smallest distance the receiving system should tell apart, in the file unit */
  resolution: number;
  date?: Date;
  author?: string;
  organization?: string;
}

/** the IGES unit flag and name of each export unit (global parameters 14 and 15) */
export const IGES_UNITS: Record<IgesUnit, { flag: number; name: string; perMm: number }> = {
  mm: { flag: 2, name: 'MM', perMm: 1 },
  cm: { flag: 10, name: 'CM', perMm: 0.1 },
  m: { flag: 6, name: 'M', perMm: 0.001 },
  in: { flag: 1, name: 'INCH', perMm: 1 / 25.4 },
};

/** an IGES real: the shortest decimal that reads back to the same double, always with a decimal point */
export function igesReal(v: number): string {
  if (!Number.isFinite(v)) throw new Error(`cannot write ${v} to IGES`);
  if (v === 0) return '0.';
  const s = String(v);
  const [m, e] = s.split('e');
  const mant = m.includes('.') ? m : `${m}.`;
  return e === undefined ? mant : `${mant}E${e}`;
}

export const hollerith = (s: string) => `${s.length}H${s}`;

type Param = number | string | { int: number };
const int = (n: number) => ({ int: n });
const tok = (p: Param) => (typeof p === 'string' ? p : typeof p === 'number' ? igesReal(p) : String(p.int));

interface Entity {
  type: number;
  form: number;
  /** status number: blank, subordinate, entity use, hierarchy (2 digits each) */
  status: string;
  params: Param[];
}

/** a B-spline curve as entity 126; a parameter space curve is planar with normal +Z */
function curve126(c: NurbsCurve, scale: number, uv: boolean): Entity {
  const K = c.poles.length - 1;
  const rational = c.weights.some((w) => Math.abs(w - 1) > 1e-15);
  const first = c.poles[0], last = c.poles[K];
  const closed = first.every((x, k) => Math.abs(x - last[k]) < 1e-12) ? 1 : 0;
  const params: Param[] = [int(K), int(c.degree), int(uv ? 1 : 0), int(closed), int(rational ? 0 : 1), int(0)];
  for (const k of c.knots) params.push(k);
  for (const w of c.weights) params.push(w);
  for (const p of c.poles) params.push(p[0] * (uv ? 1 : scale), p[1] * (uv ? 1 : scale), uv ? 0 : p[2] * scale);
  params.push(c.knots[c.degree], c.knots[K + 1]);
  params.push(0, 0, uv ? 1 : 0);
  return { type: 126, form: 0, status: uv ? '00010500' : '00010000', params };
}

/** a B-spline surface as entity 128 (u varies fastest in the weights and poles) */
function surface128(s: NurbsSurface, scale: number): Entity {
  const K1 = s.poles.length - 1, K2 = s.poles[0].length - 1;
  const same = (a: number[], b: number[]) => a.every((x, k) => Math.abs(x - b[k]) < 1e-12);
  let uClosed = 1, vClosed = 1, rational = false;
  for (let j = 0; j <= K2; j++) if (!same(s.poles[0][j], s.poles[K1][j])) uClosed = 0;
  for (let i = 0; i <= K1; i++) if (!same(s.poles[i][0], s.poles[i][K2])) vClosed = 0;
  for (const row of s.weights) for (const w of row) if (Math.abs(w - 1) > 1e-15) rational = true;
  const params: Param[] = [int(K1), int(K2), int(s.uDegree), int(s.vDegree), int(uClosed), int(vClosed), int(rational ? 0 : 1), int(0), int(0)];
  for (const k of s.uKnots) params.push(k);
  for (const k of s.vKnots) params.push(k);
  for (let j = 0; j <= K2; j++) for (let i = 0; i <= K1; i++) params.push(s.weights[i][j]);
  for (let j = 0; j <= K2; j++) for (let i = 0; i <= K1; i++) { const p = s.poles[i][j]; params.push(p[0] * scale, p[1] * scale, p[2] * scale); }
  params.push(s.uKnots[s.uDegree], s.uKnots[K1 + 1], s.vKnots[s.vDegree], s.vKnots[K2 + 1]);
  return { type: 128, form: 0, status: '00010000', params };
}

const pad = (s: string | number, n: number) => String(s).padStart(n, ' ');
const seq = (letter: string, n: number) => `${letter}${String(n).padStart(7, '0')}`;

/** free-format tokens into records of `width` columns, a token never split, the record delimiter after the last */
function records(tokens: string[], width: number): string[] {
  const lines: string[] = [];
  let line = '';
  tokens.forEach((t, i) => {
    const piece = t + (i === tokens.length - 1 ? ';' : ',');
    if (piece.length > width) throw new Error('an IGES parameter is longer than a record');
    if (line.length + piece.length > width) { lines.push(line); line = ''; }
    line += piece;
  });
  if (line) lines.push(line);
  return lines;
}

const dateStamp = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}.${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
};

/** the faces (coordinates in millimetres) -> the text of an IGES 5.3 file in `header.unit` */
export function writeIges(faces: IgesFace[], header: IgesHeader): string {
  const unit = IGES_UNITS[header.unit];
  const scale = unit.perMm;
  const ents: Entity[] = [];
  const add = (e: Entity) => { ents.push(e); return 2 * ents.length - 1; };
  let maxCoord = 0;
  const grow = (p: number[]) => { for (const x of p) maxCoord = Math.max(maxCoord, Math.abs(x * scale)); };
  const composite = (curves: NurbsCurve[], uv: boolean) => {
    const des = curves.map((c) => add(curve126(c, scale, uv)));
    return add({ type: 102, form: 0, status: uv ? '00010500' : '00010000', params: [int(des.length), ...des.map(int)] });
  };
  for (const f of faces) {
    for (const row of f.surface.poles) for (const p of row) grow(p);
    const surf = add(surface128(f.surface, scale));
    const loop = (l: IgesLoop) => {
      const b = composite(l.uv, true);
      const c = l.xyz.length ? composite(l.xyz, false) : 0;
      return add({ type: 142, form: 0, status: '00010000', params: [int(0), int(surf), int(b), int(c), int(c ? l.pref : 1)] });
    };
    const outer = loop(f.outer);
    const inner = f.inner.map(loop);
    add({ type: 144, form: 0, status: '00000000', params: [int(surf), int(1), int(inner.length), int(outer), ...inner.map(int)] });
  }

  const date = dateStamp(header.date ?? new Date());
  const start = ['Phlippo CAD IGES 5.3 export: trimmed NURBS surfaces (entities 128, 126, 102, 142, 144).'];
  const global = [
    hollerith(','), hollerith(';'), hollerith('Phlippo CAD'), hollerith(header.fileName.slice(0, 48)), hollerith('Phlippo CAD'), hollerith('Phlippo CAD IGES writer 1.0'),
    '32', '38', '6', '308', '15', hollerith('Phlippo CAD'), '1.', String(unit.flag), hollerith(unit.name), '1', igesReal(0.08 * scale),
    hollerith(date), igesReal(header.resolution), igesReal(maxCoord || 1), hollerith(header.author ?? ''), hollerith(header.organization ?? ''), '11', '0', hollerith(date),
  ];
  const S = start.map((t, i) => t.slice(0, 72).padEnd(72) + seq('S', i + 1));
  const G = records(global, 72).map((t, i) => t.padEnd(72) + seq('G', i + 1));
  const D: string[] = [], P: string[] = [];
  ents.forEach((e, i) => {
    const de = 2 * i + 1;
    const lines = records([String(e.type), ...e.params.map(tok)], 64);
    const pd = P.length + 1;
    for (const l of lines) P.push(l.padEnd(64) + ' ' + pad(de, 7) + seq('P', P.length + 1));
    D.push([e.type, pd, 0, 0, 0, 0, 0, 0].map((x) => pad(x, 8)).join('') + e.status + seq('D', de));
    D.push([e.type, 0, 0, lines.length, e.form, '', '', '', 0].map((x) => pad(x, 8)).join('') + seq('D', de + 1));
  });
  const T = (seq('S', S.length) + seq('G', G.length) + seq('D', D.length) + seq('P', P.length)).padEnd(72) + seq('T', 1);
  return [...S, ...G, ...D, ...P, T].join('\n') + '\n';
}
