import { describe, expect, it } from 'vitest';
import { addCircle, addConstraint, addLine, createSketch } from '../sketch/model';
import { solveSketch } from '../solver/solver';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { createDocument, type Document, type ExtrudeFeature, type SketchFeature } from './types';
import { activeConfiguration, configurations, documentForConfiguration } from './configurations';
import { exportDesignTable, importDesignTable, parseCsv, parseDesignNumber } from './designTable';

/** a block L x W (Sketch1, corner fixed at the origin) extruded H, with a through hole of diameter Ø (Sketch2) */
function block(): Document {
  const doc = createDocument('Block');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const [s1, l1] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
  const [s2, l2] = addLine(s1, l1.p2, { x: 40, y: 30 });
  const [s3, l3] = addLine(s2, l2.p2, { x: 0, y: 30 });
  const [s4, l4] = addLine(s3, l3.p2, l1.p1);
  s = s4;
  s = addConstraint(s, 'fix', [l1.p1])[0];
  s = addConstraint(s, 'horizontal', [l1.id])[0];
  s = addConstraint(s, 'vertical', [l2.id])[0];
  s = addConstraint(s, 'horizontal', [l3.id])[0];
  s = addConstraint(s, 'vertical', [l4.id])[0];
  s = addConstraint(s, 'distance', [l1.p1, l1.p2], { value: 40 })[0];
  s = addConstraint(s, 'distance', [l2.p1, l2.p2], { value: 30 })[0];
  doc.sketches.sk1 = s;
  let h = createSketch('sk2', 'Sketch2', 'top');
  const [h1, c] = addCircle(h, { x: 15, y: 12 }, 4);
  h = addConstraint(h1, 'fix', [c.center])[0];
  h = addConstraint(h, 'diameter', [c.id], { value: 8 })[0];
  doc.sketches.sk2 = h;
  doc.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature,
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature,
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature,
    { id: 'f4', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as ExtrudeFeature,
  ];
  return doc;
}

/** the solid volume of a configuration: its values applied, the sketches solved, the model rebuilt */
function volumeOf(doc: Document, name: string): number {
  const d = documentForConfiguration(doc, name);
  const sketches = Object.fromEntries(Object.entries(d.sketches).map(([id, s]) => [id, solveSketch(s).sketch]));
  const r = rebuildDocument({ ...d, sketches });
  expect(r.errors).toEqual({});
  return r.bodies.reduce((v, b) => v + meshVolume(b.geometry), 0);
}

const box = (l: number, w: number, h: number, dia: number) => l * w * h - Math.PI * (dia / 2) ** 2 * h;
// the hole is a polygon in the mesh: a little more material than the exact cylinder
const expectVolume = (v: number, exact: number) => expect(Math.abs(v - exact) / exact).toBeLessThan(2e-4);

// Belgian spreadsheet export: ";" between cells and a decimal comma
const TABLE = [
  'Design Table for: Block;;;;',
  ';D1@Sketch1;D2@Sketch1;D1@Boss-Extrude1;D1@Sketch2',
  'Small;40;30;10;8',
  'Medium;60;40;12,5;10',
  'Large;100;50;20;16',
].join('\r\n');

describe('Design Table', () => {
  it('reads cells with ";", "," or tabs, quotes and decimal commas', () => {
    expect(parseCsv('a;"b;c";"say ""hi"""\r\n1;2;3', ';')).toEqual([['a', 'b;c', 'say "hi"'], ['1', '2', '3']]);
    expect(parseDesignNumber('12,5')).toBe(12.5);
    expect(parseDesignNumber(' 12.5 ')).toBe(12.5);
    expect(parseDesignNumber('-3')).toBe(-3);
    expect(parseDesignNumber('1e-3')).toBe(0.001);
    expect(parseDesignNumber('12 mm')).toBeNull();
    expect(parseDesignNumber('abc')).toBeNull();
  });

  it('creates 3 configurations x 4 dimensions, each rebuilding to its own volume', () => {
    const r = importDesignTable(block(), TABLE);
    expect(r.errors).toEqual([]);
    expect(r.configurations).toEqual([{ name: 'Small', added: true }, { name: 'Medium', added: true }, { name: 'Large', added: true }]);
    expect(configurations(r.doc).map((c) => c.name)).toEqual(['Default', 'Small', 'Medium', 'Large']);
    // the configuration that was shown stays shown, with its values
    expect(activeConfiguration(r.doc).name).toBe('Default');
    expect((r.doc.features[1] as ExtrudeFeature).depth).toBe(10);
    expectVolume(volumeOf(r.doc, 'Small'), box(40, 30, 10, 8));
    expectVolume(volumeOf(r.doc, 'Medium'), box(60, 40, 12.5, 10));
    expectVolume(volumeOf(r.doc, 'Large'), box(100, 50, 20, 16));
    const large = configurations(r.doc).find((c) => c.name === 'Large')!;
    expect(large.dims).toMatchObject({ 'D1@Sketch1': 100, 'D2@Sketch1': 50, 'D1@Boss-Extrude1': 20, 'D1@Sketch2': 16 });
    // the volumes differ: the values are not all the same configuration
    expect(volumeOf(r.doc, 'Large')).toBeGreaterThan(volumeOf(r.doc, 'Medium') * 3);
  });

  it('export then import is identical (also into a part without configurations)', () => {
    const doc = importDesignTable(block(), TABLE).doc;
    const csv = exportDesignTable(doc);
    expect(csv.split('\r\n')[0]).toBe('Design Table for: Block');
    expect(csv.split('\r\n')[1]).toBe(';D1@Sketch1;D2@Sketch1;D1@Boss-Extrude1;D1@Sketch2;D1@Cut-Extrude1');
    expect(csv).toContain('Medium;60;40;12,5;10;0');
    const again = importDesignTable(doc, csv);
    expect(again.errors).toEqual([]);
    expect(again.configurations.every((c) => !c.added)).toBe(true);
    expect(exportDesignTable(again.doc)).toBe(csv);
    const fresh = importDesignTable(block(), csv);
    expect(exportDesignTable(fresh.doc)).toBe(csv);
    // "," with a decimal point reads back the same
    const comma = exportDesignTable(doc, { separator: ',' });
    expect(comma).toContain('Medium,60,40,12.5,10,0');
    expect(exportDesignTable(importDesignTable(block(), comma).doc)).toBe(csv);
  });

  it('$STATE suppresses a feature per configuration', () => {
    const table = TABLE.split('\r\n').map((l, i) => (i === 0 ? l : l + (i === 1 ? ';$STATE@Cut-Extrude1' : i === 3 ? ';S' : ';U'))).join('\r\n');
    const r = importDesignTable(block(), table);
    expect(r.errors).toEqual([]);
    const medium = configurations(r.doc).find((c) => c.name === 'Medium')!;
    expect(medium.suppressed).toEqual(['f4']);
    // without the hole
    expectVolume(volumeOf(r.doc, 'Medium'), 60 * 40 * 12.5);
    expectVolume(volumeOf(r.doc, 'Small'), box(40, 30, 10, 8));
    const csv = exportDesignTable(r.doc);
    expect(csv.split('\r\n')[1]).toContain('$STATE@Cut-Extrude1');
    expect(csv).toMatch(/Medium;60;40;12,5;10;0;S/);
    // unsuppress again, on the shown configuration: the document changes directly
    const back = importDesignTable(r.doc, ';$STATE@Cut-Extrude1;D1@Boss-Extrude1\nDefault;S;15\nMedium;Unsuppressed;');
    expect(back.errors).toEqual([]);
    expect(back.doc.features[3].suppressed).toBe(true);
    expect((back.doc.features[1] as ExtrudeFeature).depth).toBe(15);
    expect(configurations(back.doc).find((c) => c.name === 'Medium')!.suppressed).toEqual([]);
  });

  it('reports unknown parameters and values that are not numbers, and changes nothing', () => {
    const doc = block();
    const r = importDesignTable(doc, ';D1@Sketch1;D9@Sketch7;$STATE@Fillet1;$COLOR\nA;abc;1;X;1');
    expect(r.doc).toBe(doc);
    expect(r.errors).toEqual([
      'Unknown parameter "D9@Sketch7" (column C): the model has no dimension with this name.',
      'Unknown parameter "$STATE@Fillet1" (column D): there is no feature named "Fillet1".',
      'Unsupported parameter "$COLOR" (column E): use a dimension name, $STATE@<feature>, $DESCRIPTION or $COMMENT.',
      'Configuration "A", D1@Sketch1: "abc" is not a number.',
    ]);
    expect(importDesignTable(doc, 'D1@Sketch1').errors[0]).toMatch(/no rows/);
    expect(importDesignTable(doc, ';D1@Sketch1;d1@sketch1\nA;1;2').errors).toEqual(['Parameter "D1@Sketch1" is in the table twice (columns B and C).']);
  });

  it('keeps blank cells and reads $DESCRIPTION, tabs and a byte order mark', () => {
    const r = importDesignTable(block(), '﻿\t$DESCRIPTION\tD1@Boss-Extrude1\nTall\t"Tall block; 50 high"\t50\nPlain\t\t');
    expect(r.errors).toEqual([]);
    const [, tall, plain] = configurations(r.doc);
    expect(tall.description).toBe('Tall block; 50 high');
    expect(tall.dims['D1@Boss-Extrude1']).toBe(50);
    expect(plain.dims['D1@Boss-Extrude1']).toBe(10);
    expect(exportDesignTable(r.doc)).toContain('Tall;40;30;50;8;0;"Tall block; 50 high"');
  });
});
