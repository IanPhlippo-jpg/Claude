import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument, type Document, type ImportedFeature, type PatternFeature } from './types';
import {
  APP_VERSION, autosave, AUTOSAVE_DELAY, cancelAutosave, DocumentFormatError, FILE_VERSION, flushAutosave, isNewerVersion, loadAutosave, parseDocument,
  readDocument, serializeDocument,
} from './persistence';
import { decodePositions, encodePositions } from './positionCodec';
import { MAX_INSTANCES } from './validateFeatures';

const file = (d: object) => JSON.stringify({ format: 'phlippo-cad', ...d });
const imported = (positions: number[]): ImportedFeature => ({ id: 'imp1', type: 'imported', name: 'Mesh1', suppressed: false, positions, source: 'a.stl' });
const withFeature = (f: object): Document => ({ ...createDocument('V'), features: [f as never] });

describe('file format 3: program version, warnings (QA 0.5.14 P2-7)', () => {
  it('writes the format number and the program version that wrote the file; neither stays in the document', () => {
    const text = serializeDocument(createDocument('Kruk'));
    const raw = JSON.parse(text);
    expect(FILE_VERSION).toBe(3);
    expect(raw.version).toBe(3);
    expect(raw.app).toBe(APP_VERSION);
    expect(typeof raw.app).toBe('string');
    const back = parseDocument(text) as unknown as Record<string, unknown>;
    expect('app' in back || 'commit' in back || 'format' in back).toBe(false);
  });

  it('compares program versions by their numbers; dev builds are never newer', () => {
    expect(isNewerVersion('0.5.16', '0.5.15')).toBe(true);
    expect(isNewerVersion('0.10.0', '0.9.9')).toBe(true);
    expect(isNewerVersion('0.5.15', '0.5.15')).toBe(false);
    expect(isNewerVersion('0.5.9', '0.5.15')).toBe(false);
    expect(isNewerVersion('dev', '0.5.15')).toBe(false);
    expect(isNewerVersion('0.5.16', 'dev')).toBe(false);
  });

  it('a file of a newer program opens with a warning, not a refusal', () => {
    const raw = JSON.parse(serializeDocument(createDocument('Nieuw')));
    const r = readDocument(JSON.stringify({ ...raw, app: '9.0.0' }), '0.5.15');
    expect(r.doc.name).toBe('Nieuw');
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/Phlippo CAD 9\.0\.0, newer than this version \(0\.5\.15\)/);
    expect(readDocument(JSON.stringify({ ...raw, app: '0.5.14' }), '0.5.15').warnings).toEqual([]);
  });

  it('a file of a newer format opens with a warning; its unknown fields are left alone, an unknown feature type is still refused', () => {
    const raw = { ...JSON.parse(serializeDocument(createDocument('Later'))), version: FILE_VERSION + 1, app: '0.7.0', futureField: { x: 1 } };
    const r = readDocument(JSON.stringify(raw), '0.5.15');
    expect(r.doc.name).toBe('Later');
    expect(r.warnings[0]).toMatch(new RegExp(`format ${FILE_VERSION + 1} by Phlippo CAD 0\\.7\\.0`));
    const unknownType = { ...raw, features: [{ id: 'f1', type: 'hyperLoft', name: 'HyperLoft1', suppressed: false }] };
    expect(() => readDocument(JSON.stringify(unknownType), '0.5.15')).toThrow(/unknown type/);
  });
});

describe('file format 3: counts and lists per feature type (P2-7)', () => {
  const pattern = (extra: Partial<PatternFeature>) => ({ id: 'p1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: [], ...extra });
  const refused = (f: object, msg: RegExp) => {
    expect(() => parseDocument(serializeDocument(withFeature(f)))).toThrow(DocumentFormatError);
    expect(() => parseDocument(serializeDocument(withFeature(f)))).toThrow(msg);
  };

  it('refuses a pattern with more instances than the limit, in one direction or over both', () => {
    refused(pattern({ dir1: { axis: [1, 0, 0], spacing: 10, count: 1e9 } }), /dir1 has no valid instance count/);
    refused(pattern({ dir1: { axis: [1, 0, 0], spacing: 10, count: 200 }, dir2: { axis: [0, 0, 1], spacing: 10, count: 200 } }), /makes 40000 instances/);
    refused({ ...pattern({}), type: 'circularPattern', count: MAX_INSTANCES + 1 }, /count/);
    refused(pattern({ dir1: { axis: [1, 0, 0], spacing: 10, count: 3 }, skip: [-1] }), /Instances to Skip/);
    refused({ ...pattern({}), type: 'fillPattern', fill: { spacing: 0 } }, /fill pattern has no valid spacing/);
    // a normal pattern opens
    const grid = pattern({ dir1: { axis: [1, 0, 0], spacing: 10, count: 100 }, dir2: { axis: [0, 0, 1], spacing: 10, count: 100 } });
    const ok = parseDocument(serializeDocument(withFeature(grid)));
    expect(ok.features).toHaveLength(1);
  });

  it('refuses scopes and body lists that are not lists of ids, damaged Bodies to Keep and too many copies', () => {
    const cut = { id: 'c1', type: 'extrude', name: 'Cut-Extrude1', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false };
    refused({ ...cut, scope: [1, 2] }, /scope is not a list of ids/);
    refused({ ...cut, scope: 'e1#0' }, /scope is not a list of ids/);
    refused({ ...cut, keepBodies: [0, 1.5] }, /Bodies to Keep/);
    const place = { translate: [0, 0, 0], rotate: [0, 0, 0], origin: [0, 0, 0] };
    refused({ id: 'mc', type: 'moveBody', name: 'Body-Move/Copy1', suppressed: false, bodies: ['e1#0'], copy: true, copies: 1e7, ...place }, /copies/);
    refused({ id: 'cb', type: 'combine', name: 'Combine1', suppressed: false, op: 'add', bodies: [{ id: 'x' }] }, /bodies is not a list of ids/);
  });

  it('refuses an imported mesh whose positions are not whole triangles or not a mesh at all', () => {
    refused(imported([0, 0, 0, 1, 0, 0, 0, 1]), /not whole triangles/);
    const bad = { ...JSON.parse(serializeDocument(withFeature(imported([])))) };
    bad.features[0].positions = 'f32:###';
    expect(() => parseDocument(JSON.stringify(bad))).toThrow(/stored mesh is damaged/);
    bad.features[0].positions = { x: 1 };
    expect(() => parseDocument(JSON.stringify(bad))).toThrow(/no positions/);
  });
});

describe('file format 3: compact mesh positions (P2-6)', () => {
  const tri = [0, 0, 0, 10, 0, 0, 0, 10, 0];

  it('Float32 numbers are stored as base64 Float32 and read back exactly', () => {
    const p = Array.from(new Float32Array([...tri, 0.1, 0.2, 0.3, 1e5, -2.5, 3.75, 7, 8, 9]));
    const text = serializeDocument(withFeature(imported(p)));
    const stored = JSON.parse(text).features[0].positions;
    expect(stored).toMatch(/^f32:/);
    expect(decodePositions(stored)).toEqual(p);
    expect((parseDocument(text).features[0] as ImportedFeature).positions).toEqual(p);
  });

  it('numbers that are not Float32 are stored as Float64, so the file never changes the geometry', () => {
    const p = [...tri.slice(0, 8), 0.1];
    expect(encodePositions(p)).toMatch(/^f64:/);
    expect((parseDocument(serializeDocument(withFeature(imported(p)))).features[0] as ImportedFeature).positions).toEqual(p);
  });

  it('a format 2 file with a plain position list still opens (migration)', () => {
    const old = { ...createDocument('Oud'), version: 2, features: [imported([...tri, ...tri])] };
    const back = parseDocument(file(old));
    expect(back.version).toBe(FILE_VERSION);
    expect((back.features[0] as ImportedFeature).positions).toEqual([...tri, ...tri]);
  });

  it('a large import is about a fifth of the indented plain list, and the autosave has no indentation', () => {
    const n = 9 * 20_000;
    const p = Array.from(new Float32Array(Array.from({ length: n }, (_, i) => (i * 7.31) % 997.13)));
    const doc = withFeature(imported(p));
    const plain = JSON.stringify({ format: 'phlippo-cad', ...doc }, null, 2);
    const compact = serializeDocument(doc);
    expect(compact.length).toBeLessThan(plain.length / 2.5);
    expect(serializeDocument(doc, false)).not.toMatch(/\n/);
    expect((parseDocument(compact).features[0] as ImportedFeature).positions).toEqual(p);
  });
});

describe('autosave waits for a pause (P2-6)', () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  };
  afterEach(() => {
    cancelAutosave();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    store.clear();
  });

  it('writes once, ≈2 s after the last of several changes, and only the last state', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', fake);
    const set = vi.spyOn(fake, 'setItem');
    for (let i = 0; i < 20; i++) autosave(createDocument(`Step${i}`));
    expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(AUTOSAVE_DELAY - 1);
    expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(store.get('phlippo.autosave')).toContain('"Step19"');
    expect(set.mock.calls.filter(([k]) => k === 'phlippo.autosave')).toHaveLength(1);
  });

  it('a reader gets the waiting state at once; a copy put back by someone else meanwhile is not overwritten', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', fake);
    autosave(createDocument('Waiting'));
    expect(loadAutosave()?.name).toBe('Waiting');
    autosave(createDocument('Mine'));
    store.set('phlippo.autosave', file(createDocument('UsersOwn')));
    expect(flushAutosave()).toBe(false);
    expect(loadAutosave()?.name).toBe('UsersOwn');
  });
});
