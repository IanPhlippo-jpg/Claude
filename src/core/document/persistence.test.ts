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
});
