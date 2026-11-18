// @vitest-environment jsdom
// docs/35: P2-8 (a changed part makes the slice stale), P2-12 (the plate in the document, file format 4), P2-11 (the
// assumptions on safety fields), P3-8 (Arrange around excluded zones and over several plates), P3-9 (Cancel restores).
import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { useStore } from '../store';
import { createDocument } from '../../core/document/types';
import { parseDocument, serializeDocument } from '../../core/document/persistence';
import { FIXTURE_PRINTERS, buildDatabase } from '../../print/database';
import { box } from '../../print/shapes';
import { arrangeFit, insideVolume, makeItem, worldBounds } from '../../print/plate';
import { addToPlate, beginSession, cancelSession, isStale, plate, safetyAssumptions, sliceKey, usePrint } from './printStore';
import { fromDocData, refreshPlates, toDocData } from './printDoc';
import type { Printer } from '../../print/types';
import { readFileSync, existsSync } from 'node:fs';

const st = () => useStore.getState();
const bodyOf = (x1: number) => {
  const g = new THREE.BufferGeometry();
  // Z-up box turned to CAD (Y up): y <- z, z <- -y
  const p = box(0, 0, 0, x1, 20, 10);
  const c = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) { c[i] = p[i]; c[i + 1] = p[i + 2]; c[i + 2] = -p[i + 1]; }
  g.setAttribute('position', new THREE.BufferAttribute(c, 3));
  return { id: 'b1', geometry: g, faces: [], edges: [], featureIds: [] };
};
const setBody = (x1: number) => useStore.setState({ rebuild: { ...st().rebuild, bodies: [bodyOf(x1)] as never, pending: false } });

beforeEach(() => {
  st().openDocument({ ...createDocument('Blok', 'part'), id: `doc-${Math.random()}` });
  useStore.setState({ hasDocument: true });
  setBody(30);
  usePrint.setState({ db: buildDatabase(null, null), printerId: 'bambu-p1s', nozzle: 0.4, result: null, resultKey: null, session: null });
});

describe('the 3D Print plate and the model', () => {
  it('P2-8: a rebuild that changes the part refreshes it on the plate and makes the slice stale', () => {
    addToPlate('part');
    expect(plate().items).toHaveLength(1);
    usePrint.setState({ result: {} as never, resultKey: sliceKey() });
    expect(isStale()).toBe(false);
    setBody(40);
    // the store follows the rebuilds itself (refreshPlates finds nothing left to do)
    expect(refreshPlates(usePrint.getState().plates)).toBeNull();
    expect(isStale()).toBe(true);
    const b = worldBounds(plate().items[0]);
    expect(b.max[0] - b.min[0]).toBeCloseTo(40, 6);
  });
  it('P2-12: the plate is stored in the document and comes back the same after save and open (matrices to 1e-9)', () => {
    addToPlate('part');
    const doc = st().doc;
    expect(doc.print3d?.plates[0].items).toHaveLength(1);
    const text = serializeDocument(doc);
    expect(JSON.parse(text).version).toBe(4);
    const back = parseDocument(text);
    const r = fromDocData(back.print3d!);
    expect(r.missing).toBe(0);
    const a = plate().items[0].matrix, b = r.plates[0].items[0].matrix;
    a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(1e-9));
    expect(toDocData(r.plates, 'bambu-p1s', 0.4).plates[0].items[0].source).toEqual({ kind: 'part' });
  });
  it('a damaged plate in a file is refused with a clear message; a format 3 file opens without plates', () => {
    const doc = { ...createDocument('X', 'part'), print3d: { plates: [{ name: 'Plate 1', items: [{ name: 'x', source: { kind: 'part' }, matrix: [1, 2], filament: 0 }] }] } };
    expect(() => parseDocument(serializeDocument(doc as never))).toThrow(/3D Print plates are damaged/);
    const old = JSON.parse(serializeDocument(createDocument('Old', 'part')));
    old.version = 3;
    expect(parseDocument(JSON.stringify(old)).print3d).toBeUndefined();
  });
  it('P3-9: Cancel goes back to the plate and the settings of when the tab opened', () => {
    beginSession();
    addToPlate('part');
    usePrint.setState({ printerId: 'bambu-a1-mini' });
    cancelSession();
    expect(plate().items).toHaveLength(0);
    expect(usePrint.getState().printerId).toBe('bambu-p1s');
  });
});

describe('printer data and Arrange', () => {
  it('P2-11: the safety fields with an assumption are listed (real database: all FDM printers have some)', () => {
    const file = 'src/print/printerDatabase.json';
    if (!existsSync(file)) return;
    const db = buildDatabase(JSON.parse(readFileSync(file, 'utf8')), null);
    const p1s = db.printers.find((p) => p.id === 'bambu-p1s')!;
    expect(safetyAssumptions(p1s)).toEqual(expect.arrayContaining(['travelLimits', 'excludeAreas']));
    expect(safetyAssumptions({ ...p1s, assumptions: [] })).toEqual([]);
  });
  it('P3-8: Arrange keeps out of excluded zones and puts what does not fit on more plates', () => {
    const P: Printer = { ...FIXTURE_PRINTERS[0], excludeAreas: [[[0, 0], [60, 0], [60, 60], [0, 60]]] };
    const cad = (w: number) => { const p = box(0, 0, 0, w, w, 10); const c = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { c[i] = p[i]; c[i + 1] = p[i + 2]; c[i + 2] = -p[i + 1]; } return c; };
    const items = Array.from({ length: 20 }, (_, i) => makeItem(`C${i}`, cad(30), 128, 128));
    const r = arrangeFit(items, P);
    for (const it of r.placed) {
      const b = worldBounds(it);
      expect(b.min[0] >= 60 || b.min[1] >= 60, `${it.name} in the zone`).toBe(true);
      expect(insideVolume(it, P)).toBe(true);
    }
    const many = Array.from({ length: 200 }, (_, i) => makeItem(`D${i}`, cad(30), 128, 128));
    const m = arrangeFit(many, FIXTURE_PRINTERS[0]);
    expect(m.overflow.length).toBeGreaterThan(0);
    expect(m.placed.length + m.overflow.length).toBe(200);
  });
});
