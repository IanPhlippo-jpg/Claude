import { describe, expect, it } from 'vitest';
import { hatchLines, toDxf, toPdf, type SheetPrims } from './export2d';

const sheet: SheetPrims = {
  width: 297, height: 210,
  paths: [{ pts: [[10, 10], [287, 10], [287, 200], [10, 200]], closed: true, width: 0.5 }, { pts: [[20, 20], [60, 20]], closed: false, width: 0.35, dashed: true }],
  circles: [{ c: [100, 100], r: 17.5, width: 0.35 }],
  texts: [{ p: [50, 50], height: 3.5, text: '⌀35 ±0.1 (A)', anchor: 'middle', angle: 0 }],
};

describe('drawing sheets as DXF and PDF (QA v0.5.1 F114)', () => {
  it('DXF: header in mm, a closed polyline, a dashed line on HIDDEN, the circle and the text with control codes', () => {
    const d = toDxf(sheet).split('\r\n');
    const at = (code: string, v: string) => d.some((x, i) => i % 2 === 0 && x === code && d[i + 1] === v);
    expect(d[0]).toBe('0');
    expect(at('1', 'AC1009')).toBe(true);
    expect(at('0', 'POLYLINE')).toBe(true);
    expect(d.filter((x, i) => i % 2 === 1 && x === 'VERTEX' && d[i - 1] === '0')).toHaveLength(4);
    const line = d.findIndex((x, i) => x === 'LINE' && d[i - 1] === '0');
    expect(d[line + 2]).toBe('HIDDEN');
    expect(at('40', '17.5')).toBe(true);
    expect(at('1', '%%c35 %%p0.1 (A)')).toBe(true);
    expect(d[d.length - 2]).toBe('EOF');
  });

  it('PDF: one A3/A4 page in points with an xref that points at every object', () => {
    const bytes = toPdf(sheet);
    const s = String.fromCharCode(...bytes);
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s).toContain('/MediaBox [0 0 841.89 595.276]');
    // the diameter sign in WinAnsi (\330), the brackets escaped
    expect(s).toContain('(\\33035 \\2610.1 \\(A\\)) Tj');
    const xref = Number(/startxref\n(\d+)/.exec(s)![1]);
    expect(s.slice(xref, xref + 4)).toBe('xref');
    const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offs).toHaveLength(5);
    offs.forEach((o, i) => expect(s.slice(o, o + 7)).toBe(`${i + 1} 0 obj`));
    // the stream length is right
    const len = Number(/\/Length (\d+)/.exec(s)![1]);
    const start = s.indexOf('stream\n') + 7;
    expect(s.slice(start + len, start + len + 10)).toBe('\nendstream');
  });

  it('hatch lines fill a square with a square hole, not the hole', () => {
    const outer: [number, number][] = [[0, -0.25], [10, -0.25], [10, 9.75], [0, 9.75]], hole: [number, number][] = [[3.5, 3.5], [6.5, 3.5], [6.5, 6.5], [3.5, 6.5]];
    const lines = hatchLines([outer, hole], 0, 1);
    const total = lines.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
    // lines at y = 0..9 (10), each 10 long, minus the hole (y = 4, 5, 6: 3 each)
    expect(lines).toHaveLength(13);
    expect(total).toBeCloseTo(10 * 10 - 3 * 3, 6);
  });
});
