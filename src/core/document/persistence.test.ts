import { addLine, createSketch } from '../sketch/model';
import { describe, expect, it } from 'vitest';
import { createDocument } from './types';
import { DocumentFormatError, FILE_VERSION, parseDocument, serializeDocument, validateDocument } from './persistence';

describe('file format: validation and upgrades', () => {
  it('round-trips a document and gives it an id', () => {
    const d = createDocument('Kruk');
    const back = parseDocument(serializeDocument(d));
    expect(back.name).toBe('Kruk');
    expect(back.id).toBeTruthy();
    expect(back.version).toBe(FILE_VERSION);
  });

  it('refuses text that is not JSON, with a clear message', () => {
    expect(() => parseDocument('{ not json')).toThrow(DocumentFormatError);
    expect(() => parseDocument('{ not json')).toThrow(/not valid JSON/);
  });

  it('refuses other formats and newer files', () => {
    expect(() => parseDocument(JSON.stringify({ format: 'other', version: 1 }))).toThrow(/Unknown file format/);
    expect(() => parseDocument(JSON.stringify({ format: 'phlippo-cad', version: FILE_VERSION + 1, name: 'x' }))).toThrow(/newer Phlippo CAD/);
  });

  it('upgrades a file without a version number', () => {
    const d = createDocument('Old');
    const raw = { format: 'phlippo-cad', ...d } as Record<string, unknown>;
    delete raw.version;
    const back = parseDocument(JSON.stringify(raw));
    expect(back.version).toBe(FILE_VERSION);
    expect(back.name).toBe('Old');
  });

  it('upgrades format 1: the tolerancing data moves to its new field, also in parts inside an assembly (F50)', () => {
    const data = { datums: [], dims: [], gtols: [] };
    const part = { ...createDocument('P'), version: 1, dimxpert: data } as Record<string, unknown>;
    const asm = { ...createDocument('A'), version: 1, kind: 'assembly', dimxpert: data, components: [{ id: 'c1', name: 'P<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }], mates: [] };
    const back = parseDocument(JSON.stringify({ format: 'phlippo-cad', ...asm })) as unknown as Record<string, unknown> & { components: { part: Record<string, unknown> }[] };
    expect(back.version).toBe(FILE_VERSION);
    expect(back.autoTolerance).toEqual(data);
    expect('dimxpert' in back).toBe(false);
    expect(back.components[0].part.autoTolerance).toEqual(data);
    expect('dimxpert' in back.components[0].part).toBe(false);
  });

  it('refuses a half document instead of opening it empty', () => {
    const d = createDocument('Half') as unknown as Record<string, unknown>;
    delete d.features;
    expect(() => parseDocument(JSON.stringify({ format: 'phlippo-cad', ...d }))).toThrow(/feature list/);
    const d2 = createDocument('Half2') as unknown as Record<string, unknown>;
    d2.sketches = { s1: { entities: {}, points: { p: { x: 1, y: null } }, constraints: {}, entityOrder: [], constraintOrder: [] } };
    expect(() => parseDocument(JSON.stringify({ format: 'phlippo-cad', ...d2 }))).toThrow(/point "p"/);
    const d3 = createDocument('Half3') as unknown as Record<string, unknown>;
    d3.features = [{ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', depth: 'ten' }];
    expect(() => parseDocument(JSON.stringify({ format: 'phlippo-cad', ...d3 }))).toThrow(/depth is not a valid number/);
  });

  it('drops decal images that are not embedded (file:// or http would read other files or call home)', () => {
    const d = createDocument('Decals') as unknown as Record<string, unknown>;
    d.decals = [
      { id: 'a', image: 'data:image/png;base64,AAAA', face: { normal: [0, 0, 1], point: [0, 0, 0] } },
      { id: 'b', image: 'file:///C:/Windows/win.ini', face: { normal: [0, 0, 1], point: [0, 0, 0] } },
      { id: 'c', image: 'http://example.com/x.png', face: { normal: [0, 0, 1], point: [0, 0, 0] } },
    ];
    const back = validateDocument(d) as unknown as { decals: { id: string }[] };
    expect(back.decals.map((x) => x.id)).toEqual(['a']);
  });

  it('refuses a damaged assembly or drawing instead of crashing the UI (F55, F70)', () => {
    const asm = createDocument('Asm', 'assembly') as unknown as Record<string, unknown>;
    asm.components = [{ id: 'c1', name: 'Part1<1>', part: {}, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    expect(() => validateDocument(asm)).toThrow(/Component "Part1<1>"/);
    const good = createDocument('P1');
    asm.components = [{ id: 'c1', name: 'Part1<1>', part: good, position: [0, 0, 'x'], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    expect(() => validateDocument(asm)).toThrow(/valid position/);
    asm.components = [{ id: 'c1', name: 'Part1<1>', part: good, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    asm.mates = [{ id: 'm1', type: 'coincident', name: 'Coincident1', refs: [{ componentId: 'c1' }, { componentId: 'nope' }], aligned: false }];
    expect(() => validateDocument(asm)).toThrow(/not in the assembly/);
    asm.mates = [{ id: 'm1', type: 'coincident', name: 'Coincident1', refs: [{ componentId: 'c1' }, { componentId: 'c1' }], aligned: false, value: 1e300 }];
    expect(() => validateDocument(asm)).toThrow(/out of range/);
    const drw = createDocument('Drw', 'drawing') as unknown as Record<string, unknown>;
    drw.sheets = [{}];
    expect(() => validateDocument(drw)).toThrow(/Sheet 1 is damaged/);
    drw.sheets = [{ id: 's', name: 'Sheet1', size: 'A3', landscape: true, scale: [1, 0], showFormat: true, views: [], dimensions: [], notes: [], centerMarks: [] }];
    expect(() => validateDocument(drw)).toThrow(/scale of zero/);
    drw.sheets = [{ id: 's', name: 'Sheet1', size: 'A3', landscape: true, scale: [1, 1], showFormat: true, views: [{ id: 'v', name: 'Drawing View1', type: 'front', position: [100, 100], displayStyle: 'hiddenRemoved', model: { name: 'x' } }], dimensions: [], notes: [], centerMarks: [] }];
    expect(() => validateDocument(drw)).toThrow(/View "Drawing View1"/);
    // a healthy assembly and drawing pass
    const okAsm = createDocument('Asm2', 'assembly');
    okAsm.components = [{ id: 'c1', name: 'P1<1>', part: good, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    expect(() => validateDocument(okAsm)).not.toThrow();
    expect(() => validateDocument(createDocument('Drw2', 'drawing'))).not.toThrow();
  });

  it('refuses out-of-range numbers, deep nesting and prototype keys anywhere in the file', () => {
    const d = createDocument('Range') as unknown as Record<string, unknown>;
    d.variables = { x: 1e300 };
    expect(() => validateDocument(d)).toThrow(/out of range/);
    let deep: unknown = 1;
    for (let i = 0; i < 70; i++) deep = [deep];
    expect(() => validateDocument({ ...createDocument('Deep'), equations: [deep] })).toThrow(/nested too deeply/);
    expect(() => validateDocument(JSON.parse('{"name":"P","units":"mm","sketches":{},"features":[],"planes":{},"__proto__":{"x":1}}'))).toThrow(/forbidden key/);
  });

  it('refuses dangling references, unknown feature types and lengths outside the field limits (F80)', () => {
    const base = () => {
      let sk = createSketch('s1', 'Sketch1', 'front');
      sk = addLine(sk, { x: 0, y: 0 }, { x: 10, y: 0 })[0];
      const d = createDocument('Refs') as unknown as Record<string, unknown>;
      d.sketches = { s1: sk };
      d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
      return d as Record<string, any>;
    };
    expect(() => validateDocument(base())).not.toThrow();
    const a = base(); const line = Object.values(a.sketches.s1.entities).find((e: any) => e.kind === 'line') as any; line.p1 = 'nope';
    expect(() => validateDocument(a)).toThrow(/refers to a point that does not exist/);
    const b = base(); b.features[1].type = 'bogusFeature';
    expect(() => validateDocument(b)).toThrow(/unknown type "bogusFeature"/);
    const c = base(); c.features[1].depth = 1e11;
    expect(() => validateDocument(c)).toThrow(/depth .* outside/);
    const e = base(); e.features[1].depth = -5;
    expect(() => validateDocument(e)).toThrow(/depth -5 is outside/);
    const g = base(); g.features[1].sketchId = 'gone';
    expect(() => validateDocument(g)).toThrow(/sketch that does not exist/);
    const h = base(); h.features.push({ ...h.features[1] });
    expect(() => validateDocument(h)).toThrow(/share the id/);
  });
});
