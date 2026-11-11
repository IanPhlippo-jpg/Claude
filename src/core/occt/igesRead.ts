/**
 * An IGES 5.3 reader for the entities the writer produces (QA F114/F199): it checks the record layout (80 columns,
 * section letters, sequence numbers, the Terminate counts, the directory pointers) and turns entities 128, 126, 102,
 * 142 and 144 back into NURBS data, so a written file can be read back and compared with the B-rep it came from.
 */
import type { NurbsCurve, NurbsSurface } from './igesNurbs';

export type IgesValue = number | string;

export interface IgesEntity {
  /** the sequence number of the first directory line (odd) */
  de: number;
  type: number;
  form: number;
  status: string;
  params: IgesValue[];
}

export interface IgesFile {
  start: string;
  global: IgesValue[];
  entities: IgesEntity[];
  /** lines per section as the Terminate record states them */
  counts: Record<'S' | 'G' | 'D' | 'P', number>;
  /** every violation of the record layout found */
  problems: string[];
}

/** free-format parameters: reals (E or D exponent), integers and Hollerith strings */
export function parseParams(text: string, delim = ',', end = ';'): IgesValue[] {
  const out: IgesValue[] = [];
  let i = 0;
  while (i < text.length) {
    while (text[i] === ' ') i++;
    const h = /^(\d+)H/.exec(text.slice(i, i + 12));
    if (h) {
      const n = Number(h[1]);
      out.push(text.slice(i + h[0].length, i + h[0].length + n));
      i += h[0].length + n;
    } else {
      let j = i;
      while (j < text.length && text[j] !== delim && text[j] !== end) j++;
      const t = text.slice(i, j).trim();
      out.push(t === '' ? 0 : Number(t.replace(/D/i, 'E')));
      i = j;
    }
    while (text[i] === ' ') i++;
    if (text[i] === end) break;
    i++;
  }
  return out;
}

export function readIges(text: string): IgesFile {
  const problems: string[] = [];
  const lines = text.split(/\r?\n/).filter((l, i, a) => l.length || i < a.length - 1);
  const by: Record<string, string[]> = { S: [], G: [], D: [], P: [], T: [] };
  let order = 'SGDPT';
  for (const [n, l] of lines.entries()) {
    if (l.length !== 80) problems.push(`line ${n + 1} has ${l.length} columns`);
    const s = l[72];
    if (!(s in by)) { problems.push(`line ${n + 1}: unknown section ${s}`); continue; }
    if (order.indexOf(s) < 0) problems.push(`line ${n + 1}: section ${s} out of order`);
    else order = order.slice(order.indexOf(s));
    by[s].push(l);
    if (Number(l.slice(73, 80)) !== by[s].length) problems.push(`line ${n + 1}: ${s} sequence ${l.slice(73, 80).trim()} is not ${by[s].length}`);
  }
  const t = by.T[0] ?? '';
  const counts = { S: Number(t.slice(1, 8)), G: Number(t.slice(9, 16)), D: Number(t.slice(17, 24)), P: Number(t.slice(25, 32)) };
  for (const k of ['S', 'G', 'D', 'P'] as const) if (counts[k] !== by[k].length) problems.push(`Terminate says ${counts[k]} ${k} lines, found ${by[k].length}`);
  if (by.D.length % 2) problems.push('odd number of directory lines');
  const global = parseParams(by.G.map((l) => l.slice(0, 72)).join(''));
  const field = (l: string, k: number) => l.slice(8 * k, 8 * k + 8).trim();
  const entities: IgesEntity[] = [];
  for (let i = 0; i + 1 < by.D.length; i += 2) {
    const a = by.D[i], b = by.D[i + 1];
    const de = i + 1;
    const type = Number(field(a, 0)), pd = Number(field(a, 1)), count = Number(field(b, 3));
    if (Number(field(b, 0)) !== type) problems.push(`DE ${de}: entity type differs on its two lines`);
    const pl = by.P.slice(pd - 1, pd - 1 + count);
    if (pl.length !== count) problems.push(`DE ${de}: parameter lines ${pd}..${pd + count - 1} missing`);
    for (const l of pl) if (Number(l.slice(65, 72)) !== de) problems.push(`P ${l.slice(73, 80).trim()}: points back to ${l.slice(65, 72).trim()}, not DE ${de}`);
    const params = parseParams(pl.map((l) => l.slice(0, 64)).join(''));
    if (params[0] !== type) problems.push(`DE ${de}: parameter data starts with ${params[0]}, not ${type}`);
    entities.push({ de, type, form: Number(field(b, 4)), status: field(a, 8).padStart(8, '0'), params: params.slice(1) });
  }
  return { start: by.S.map((l) => l.slice(0, 72)).join('').trimEnd(), global, entities, counts, problems };
}

const nums = (e: IgesEntity) => e.params.map(Number);

/** entity 126 -> NURBS curve (2 coordinates when `uv`) */
export function igesCurve(e: IgesEntity, uv = false): NurbsCurve {
  if (e.type !== 126) throw new Error(`DE ${e.de} is entity ${e.type}, not 126`);
  const p = nums(e);
  const K = p[0], M = p[1];
  let i = 6;
  const knots = p.slice(i, (i += K + M + 2));
  const weights = p.slice(i, (i += K + 1));
  const poles: number[][] = [];
  for (let k = 0; k <= K; k++, i += 3) poles.push(uv ? [p[i], p[i + 1]] : [p[i], p[i + 1], p[i + 2]]);
  return { degree: M, knots, poles, weights };
}

/** entity 128 -> NURBS surface */
export function igesSurface(e: IgesEntity): NurbsSurface {
  if (e.type !== 128) throw new Error(`DE ${e.de} is entity ${e.type}, not 128`);
  const p = nums(e);
  const [K1, K2, M1, M2] = p;
  let i = 9;
  const uKnots = p.slice(i, (i += K1 + M1 + 2));
  const vKnots = p.slice(i, (i += K2 + M2 + 2));
  const weights: number[][] = Array.from({ length: K1 + 1 }, () => []);
  const poles: number[][][] = Array.from({ length: K1 + 1 }, () => []);
  for (let j = 0; j <= K2; j++) for (let k = 0; k <= K1; k++) weights[k][j] = p[i++];
  for (let j = 0; j <= K2; j++) for (let k = 0; k <= K1; k++, i += 3) poles[k][j] = [p[i], p[i + 1], p[i + 2]];
  return { uDegree: M1, vDegree: M2, uKnots, vKnots, poles, weights };
}

export interface IgesTrimmed {
  de: number;
  surface: NurbsSurface;
  loops: { outer: boolean; uv: NurbsCurve[]; xyz: NurbsCurve[]; pref: number }[];
}

/** every trimmed surface (144) of the file with its boundaries resolved; throws on a dangling pointer */
export function igesTrimmedSurfaces(f: IgesFile): IgesTrimmed[] {
  const at = new Map(f.entities.map((e) => [e.de, e]));
  const get = (de: number, type: number) => {
    const e = at.get(de);
    if (!e || e.type !== type) throw new Error(`pointer ${de} should be entity ${type}, is ${e ? e.type : 'missing'}`);
    return e;
  };
  const curves = (de: number, uv: boolean) => {
    if (!de) return [];
    const e = at.get(de);
    if (e?.type === 126) return [igesCurve(e, uv)];
    const c = nums(get(de, 102));
    return c.slice(1, 1 + c[0]).map((d) => igesCurve(get(d, 126), uv));
  };
  return f.entities.filter((e) => e.type === 144).map((e) => {
    const [pts, n1, n2, pto, ...pti] = nums(e);
    const surfE = get(pts, 128);
    const loop = (de: number, outer: boolean) => {
      const [, sptr, bptr, cptr, pref] = nums(get(de, 142));
      if (sptr !== pts) throw new Error(`142 at ${de} lies on ${sptr}, its 144 on ${pts}`);
      return { outer, uv: curves(bptr, true), xyz: curves(cptr, false), pref };
    };
    const loops = [...(n1 ? [loop(pto, true)] : []), ...pti.slice(0, n2).map((d) => loop(d, false))];
    return { de: e.de, surface: igesSurface(surfE), loops };
  });
}
