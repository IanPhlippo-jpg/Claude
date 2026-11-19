// docs/36 P2.8 / docs/37 ch. 13: a strict AutoCAD R12 (AC1009) reader of its own, independent of the writer and of the
// CAD's DXF import, as the structural check of every DXF a laser cutter gets. It refuses what an R12 reader would choke
// on: odd group pairs, codes that are no integers, numbers with a comma or an exponent, entities R12 does not have
// (LWPOLYLINE, SPLINE …), a layer or line type used but not in the tables, a POLYLINE without VERTEX or SEQEND, a bulge
// above a half circle. Opening the file at the laser cutter stays Ian's step (status "nog te openen bij de lasersnijder").
import { describe, expect, it } from 'vitest';
import { setRebuildBudget } from '../core/features/rebuild';
import { analyze } from './analyze';
import { defaultSettings } from './settings';
import { chainSheet, pp1 } from './fixtures';
import { plateDxf } from './dxf';
import { nestDxf, nestRects, nestPieces, defaultNestSettings } from './nest';
import { partBodies } from './bodies';
import { flatOfSheet } from './flat';
import type { FlatPart } from './flat';

setRebuildBudget(Infinity);
const R12_ENTITIES = new Set(['LINE', 'ARC', 'CIRCLE', 'POLYLINE', 'VERTEX', 'SEQEND', 'TEXT']);
const NUM = /^-?\d+(\.\d+)?$/;

interface Ent { type: string; g: [number, string][] }
/** parse strictly; throws with the reason */
export function readR12(text: string): { ents: Ent[]; layers: Map<string, number>; acadver: string } {
  if (!text.endsWith('\r\n')) throw new Error('lines must end with CRLF');
  const lines = text.slice(0, -2).split('\r\n');
  if (lines.length % 2) throw new Error('odd number of lines: group pairs broken');
  const pairs: [number, string][] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const c = lines[i].trim();
    if (!/^\d+$/.test(c)) throw new Error(`group code is no integer at line ${i + 1}: "${lines[i]}"`);
    pairs.push([Number(c), lines[i + 1]]);
  }
  const num = (code: number, v: string) => {
    if (((code >= 10 && code <= 59) || (code >= 210 && code <= 239)) && !NUM.test(v.trim())) throw new Error(`group ${code}: "${v}" is no plain number`);
    if (code >= 60 && code <= 79 && !/^-?\d+$/.test(v.trim())) throw new Error(`group ${code}: "${v}" is no integer`);
  };
  pairs.forEach(([c, v]) => num(c, v));
  if (pairs[pairs.length - 1][0] !== 0 || pairs[pairs.length - 1][1] !== 'EOF') throw new Error('no EOF at the end');
  // sections
  const sections = new Map<string, [number, string][]>();
  let i = 0;
  while (i < pairs.length - 1) {
    if (pairs[i][0] !== 0 || pairs[i][1] !== 'SECTION' || pairs[i + 1][0] !== 2) throw new Error(`SECTION expected at pair ${i}`);
    const name = pairs[i + 1][1];
    const end = pairs.findIndex((p, k) => k > i && p[0] === 0 && p[1] === 'ENDSEC');
    if (end < 0) throw new Error(`section ${name} without ENDSEC`);
    sections.set(name, pairs.slice(i + 2, end));
    i = end + 1;
  }
  const head = sections.get('HEADER') ?? [];
  const av = head.findIndex((p) => p[0] === 9 && p[1] === '$ACADVER');
  const acadver = av >= 0 ? head[av + 1][1] : '';
  // tables: line types, then layers with an existing line type; the count of the table equals its entries
  const tables = sections.get('TABLES') ?? [];
  const ltypes = new Set<string>(), layers = new Map<string, number>();
  for (let k = 0; k < tables.length; k++) {
    if (tables[k][0] === 0 && tables[k][1] === 'TABLE') {
      const kind = tables[k + 1][1], n = Number(tables.find((p, q) => q > k && p[0] === 70)![1]);
      let found = 0;
      for (let q = k + 2; q < tables.length && !(tables[q][0] === 0 && tables[q][1] === 'ENDTAB'); q++) {
        if (tables[q][0] === 0 && tables[q][1] === kind) {
          found++;
          const name = tables[q + 1][0] === 2 ? tables[q + 1][1] : '';
          if (!name) throw new Error(`${kind} entry without a name`);
          if (kind === 'LTYPE') ltypes.add(name);
          if (kind === 'LAYER') {
            const rest = tables.slice(q + 2, tables.findIndex((p, r) => r > q && p[0] === 0));
            const lt = rest.find((p) => p[0] === 6)?.[1] ?? '';
            if (!ltypes.has(lt)) throw new Error(`layer ${name}: line type "${lt}" not in LTYPE`);
            layers.set(name, Number(rest.find((p) => p[0] === 62)?.[1] ?? 7));
          }
        }
      }
      if (found !== n) throw new Error(`table ${kind}: count ${n}, entries ${found}`);
    }
  }
  // entities
  const body = sections.get('ENTITIES');
  if (!body) throw new Error('no ENTITIES');
  const ents: Ent[] = [];
  for (const [c, v] of body) {
    if (c === 0) { if (!R12_ENTITIES.has(v)) throw new Error(`entity ${v} is not R12`); ents.push({ type: v, g: [] }); } else ents[ents.length - 1].g.push([c, v]);
  }
  for (let k = 0; k < ents.length; k++) {
    const e = ents[k], get = (c: number) => e.g.find((p) => p[0] === c)?.[1];
    const layer = get(8);
    if (!layer || !layers.has(layer)) throw new Error(`${e.type} on layer "${layer}" that is not in the LAYER table`);
    if (e.type === 'POLYLINE') {
      if (get(66) !== '1') throw new Error('POLYLINE without 66 = 1 (vertices follow)');
      let q = k + 1;
      while (ents[q]?.type === 'VERTEX') q++;
      if (q - k - 1 < 2 || ents[q]?.type !== 'SEQEND') throw new Error('POLYLINE without 2 VERTEX and SEQEND');
    }
    if (e.type === 'VERTEX' && Math.abs(Number(get(42) ?? 0)) > 1 + 1e-9) throw new Error('bulge above a half circle');
    if (e.type === 'CIRCLE' && !(Number(get(40)) > 0)) throw new Error('CIRCLE without a radius');
  }
  return { ents, layers, acadver };
}

/** the cut length of the contours of a parsed DXF (closed polylines with bulges, circles) on the given layers */
function cutLength(d: ReturnType<typeof readR12>, layers: RegExp): number {
  let t = 0;
  const { ents } = d;
  for (let k = 0; k < ents.length; k++) {
    const e = ents[k], layer = e.g.find((p) => p[0] === 8)![1], get = (x: Ent, c: number) => Number(x.g.find((p) => p[0] === c)?.[1] ?? 0);
    if (!layers.test(layer)) continue;
    if (e.type === 'CIRCLE') t += 2 * Math.PI * get(e, 40);
    if (e.type === 'POLYLINE') {
      const vs: Ent[] = [];
      for (let q = k + 1; ents[q].type === 'VERTEX'; q++) vs.push(ents[q]);
      vs.forEach((v, q) => {
        const w = vs[(q + 1) % vs.length], c = Math.hypot(get(w, 10) - get(v, 10), get(w, 20) - get(v, 20)), b = get(v, 42);
        t += b ? (c / (2 * Math.sin(2 * Math.atan(Math.abs(b))))) * 4 * Math.atan(Math.abs(b)) : c;
      });
    }
  }
  return t;
}

describe('P2.8 every DXF passes a strict R12 reader of its own; cut length from the file equals the flat', () => {
  const check = (dxf: string, f?: FlatPart) => {
    const d = readR12(dxf);
    expect(d.acadver).toBe('AC1009');
    if (f) expect(Math.abs(cutLength(d, /CONTOUR|GATEN/) - (f.snijlengte.buiten + f.snijlengte.binnen))).toBeLessThan(0.01);
    return d;
  };
  it('PP1 flat plate: outline and holes', () => {
    const f = analyze(pp1(), defaultSettings()).flats[0];
    const d = check(plateDxf(f), f);
    expect(d.ents.some((e) => e.type === 'CIRCLE')).toBe(true);
  });
  it('hat profile: bend lines on ZETLIJN_OP / ZETLIJN_NEER, each layer in the table', () => {
    const doc = chainSheet('Hoed', [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 0 }, { x: 90, y: 0 }], 300);
    const f = flatOfSheet(doc, partBodies(doc)[0], 'Hoed', 1, 'S235');
    const d = check(plateDxf(f), f);
    expect([...d.layers.keys()].filter((l) => /ZETLIJN/.test(l)).sort()).toEqual(['ZETLIJN_NEER', 'ZETLIJN_OP']);
  });
  it('a nested sheet', () => {
    const f = analyze(pp1(), defaultSettings()).flats.map((x) => ({ ...x, n: 3 }));
    const n = nestRects('S235', f[0].t, nestPieces(f), defaultNestSettings(f[0].t));
    check(nestDxf(n.bladen[0], f));
  });
  it('the strict reader refuses what an R12 reader would choke on (negative)', () => {
    const f = analyze(pp1(), defaultSettings()).flats[0], ok = plateDxf(f);
    expect(() => readR12(ok.replace('POLYLINE', 'LWPOLYLINE'))).toThrow(/not R12/);
    expect(() => readR12(ok.replace(/(\r\nCIRCLE[\s\S]*?\r\n40\r\n)(\d+)/, '$1$2,5'))).toThrow(/plain number/);
    expect(() => readR12(ok.replace('\r\n0\r\nEOF\r\n', '\r\n'))).toThrow();
    expect(() => readR12(ok.replace(/\r\n8\r\nCONTOUR/, '\r\n8\r\nGEENLAAG'))).toThrow(/not in the LAYER table/);
  });
});
