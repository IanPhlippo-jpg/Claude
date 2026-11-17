/**
 * Incremental rebuild (QA 0.5.14 P2-5a, rebuildCache.ts): a rebuild goes on from the state after the longest unchanged
 * start of the tree and gives the same bodies as a rebuild from scratch; an earlier change, an inserted feature,
 * suppression and rollback invalidate exactly what they should. P2-5d: a long pattern stops inside itself when the
 * rebuild budget runs out, and leaves nothing half built.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Document, Feature } from '../document/types';
import { rebuildDocument, setRebuildBudget, type RebuildResult } from './rebuild';
import { setBrepKernel } from './brepKernel';
import { meshVolume } from './solid';
import { occtKernel } from '../occt/brep';
import { clearRebuildCache, lastRebuildStats, rebuildCacheSize, setRebuildCache, stateKeys } from './rebuildCache';
import { extrude, fillet, rect, setCircleRadius, shell, t1, t3, t3Slot, t6, t7 } from '../../qa/qaModels';

let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  kernel = occtKernel(OC, replicad);
}, 60000);
afterAll(() => {
  setBrepKernel(null);
  setRebuildCache(true);
});

/** what must be the same after an incremental and a full rebuild */
function summary(r: RebuildResult) {
  const body = (b: RebuildResult['bodies'][number]) => ({
    id: b.id,
    featureIds: b.featureIds,
    triangles: b.geometry.getAttribute('position').count / 3,
    volume: Math.round((b.exact ? b.exactVolume! : Math.abs(meshVolume(b.geometry))) * 1e4) / 1e4,
    exact: !!b.exact,
    faces: b.faces.length,
    edges: b.edges.length,
  });
  return {
    bodies: r.bodies.map(body),
    surfaceBodies: (r.surfaceBodies ?? []).map(body),
    errors: r.errors,
    warnings: r.warnings ?? {},
    curves: (r.curves ?? []).map((c) => `${c.id}:${c.points.length}`),
    consumed: [...r.consumedSketches].sort(),
    splitCounts: r.splitCounts ?? {},
    stopped: !!r.stopped,
  };
}
/** the same document rebuilt from scratch, without the cache */
function full(doc: Document, upTo: number | null = null) {
  setRebuildCache(false);
  try {
    return summary(rebuildDocument(doc, upTo));
  } finally {
    setRebuildCache(true);
  }
}
const featureOf = <T = Record<string, unknown>>(doc: Document, id: string) => doc.features.find((f) => f.id === id) as unknown as T;

/** QA models (src/qa/qaModels.ts) with a last feature to edit */
const MODELS: [string, () => { doc: Document; edit: (doc: Document) => void }][] = [
  ['T1 plate with a hole, fillet on the rim', () => {
    const { doc, rim } = t1(17.5);
    doc.features.push(fillet('r1', 2, [rim]));
    return { doc, edit: (d) => { featureOf<{ size: number }>(d, 'r1').size = 2.5; } };
  }],
  ['T3 plate, slot, fillet on the split edge', () => {
    const { doc, edge } = t3();
    t3Slot(doc, 'through');
    doc.features.push(fillet('r1', 2, [edge]));
    return { doc, edit: (d) => { featureOf<{ size: number }>(d, 'r1').size = 1.5; } };
  }],
  ['T6 plate, nub, linear pattern, fillet on a nub', () => {
    const { doc, edges } = t6(3, [2]);
    doc.features.push(fillet('r1', 1, edges));
    return { doc, edit: (d) => { featureOf<{ size: number }>(d, 'r1').size = 0.8; } };
  }],
  ['T7 block, fillet, shell', () => {
    const { doc, edge } = t7();
    doc.features.push(fillet('r1', 2, [edge]), shell('sh1', 1));
    return { doc, edit: (d) => { featureOf<{ thickness: number }>(d, 'sh1').thickness = 1.5; } };
  }],
];

describe.each([['mesh', false], ['B-rep', true]] as const)('incremental rebuild (QA 0.5.14 P2-5a), %s kernel', (_label, brep) => {
  beforeAll(() => {
    setBrepKernel(brep ? kernel : null);
    clearRebuildCache();
  });
  afterAll(() => setBrepKernel(null));

  for (const [name, make] of MODELS) {
    it(`${name}: editing the last feature builds only that feature, with the result of a full rebuild`, { timeout: 120000 }, () => {
      const { doc, edit } = make();
      clearRebuildCache();
      const first = rebuildDocument(doc);
      expect(first.errors).toEqual({});
      expect(lastRebuildStats().built).toBe(doc.features.length);
      edit(doc);
      const inc = summary(rebuildDocument(doc));
      expect(lastRebuildStats()).toEqual({ built: 1, resumedAt: doc.features.length - 1, features: doc.features.length });
      expect(inc).toEqual(full(doc));
      // nothing changed: nothing is built, and the result is still the same
      const again = summary(rebuildDocument(doc));
      expect(lastRebuildStats().built).toBe(0);
      expect(again).toEqual(inc);
    });
  }

  it('a dimension of the first sketch changes: everything is built again', { timeout: 120000 }, () => {
    const { doc, edit } = MODELS[0][1]();
    clearRebuildCache();
    rebuildDocument(doc);
    edit(doc);
    rebuildDocument(doc);
    setCircleRadius(doc, 's1', 20);
    const inc = summary(rebuildDocument(doc));
    expect(lastRebuildStats()).toMatchObject({ built: doc.features.length, resumedAt: 0 });
    expect(inc).toEqual(full(doc));
  });

  it('a feature inserted before the last one: the features before it come from the cache', { timeout: 120000 }, () => {
    const { doc } = MODELS[1][1]();
    clearRebuildCache();
    rebuildDocument(doc);
    // a second slot goes in before the fillet (index 2)
    doc.sketches.s9 = rect('s9', 'top', 60, 25, 70, 45);
    doc.features.splice(2, 0, extrude('c9', 's9', 'cut', 0, { end: 'throughAll' }) as Feature);
    const inc = summary(rebuildDocument(doc));
    expect(lastRebuildStats()).toMatchObject({ built: 2, resumedAt: 2 });
    expect(inc).toEqual(full(doc));
  });

  it('suppressing and unsuppressing a middle feature', { timeout: 120000 }, () => {
    const { doc } = MODELS[1][1]();
    clearRebuildCache();
    rebuildDocument(doc);
    featureOf<{ suppressed: boolean }>(doc, 'c1').suppressed = true;
    const off = summary(rebuildDocument(doc));
    expect(lastRebuildStats()).toMatchObject({ resumedAt: 1, built: 2 });
    expect(off).toEqual(full(doc));
    featureOf<{ suppressed: boolean }>(doc, 'c1').suppressed = false;
    const on = summary(rebuildDocument(doc));
    expect(lastRebuildStats()).toMatchObject({ resumedAt: 1, built: 2 });
    expect(on).toEqual(full(doc));
  });

  it('rolling back and forward again builds nothing', { timeout: 120000 }, () => {
    const { doc } = MODELS[2][1]();
    clearRebuildCache();
    rebuildDocument(doc);
    const back = summary(rebuildDocument(doc, 2));
    expect(lastRebuildStats()).toMatchObject({ built: 0, resumedAt: 2 });
    expect(back).toEqual(full(doc, 2));
    const forward = summary(rebuildDocument(doc));
    expect(lastRebuildStats()).toMatchObject({ built: 0, resumedAt: doc.features.length });
    expect(forward).toEqual(full(doc));
  });

  it('a document setting the features read (hidden bodies) invalidates every state', { timeout: 120000 }, () => {
    const { doc } = MODELS[0][1]();
    clearRebuildCache();
    rebuildDocument(doc);
    doc.hiddenBodies = ['nothing#0'];
    rebuildDocument(doc);
    expect(lastRebuildStats()).toMatchObject({ resumedAt: 0, built: doc.features.length });
    // a setting the rebuild never reads (an appearance) keeps them
    doc.bodyAppearances = { 'e1#0': '#ff0000' };
    rebuildDocument(doc);
    expect(lastRebuildStats().built).toBe(0);
  });
});

describe('rebuild cache bookkeeping', () => {
  beforeAll(() => setBrepKernel(null));

  it('the key of a feature covers the sketch it uses, not the sketches of later features', () => {
    const { doc } = MODELS[1][1]();
    const a = stateKeys(doc, 'mesh');
    for (const p of Object.values(doc.sketches.s2.points)) p.x += 1;
    const b = stateKeys(doc, 'mesh');
    // e1 (sketch s1) keeps its key, the slot c1 (sketch s2) and the fillet after it get new ones
    expect(b[0]).toBe(a[0]);
    expect(b[1]).not.toBe(a[1]);
    expect(b[2]).not.toBe(a[2]);
  });

  it('a state is a copy: changing the geometry of a result does not reach the next rebuild', () => {
    const { doc, edit } = MODELS[0][1]();
    clearRebuildCache();
    const r = rebuildDocument(doc);
    // the window may do anything with a result (here: move it away)
    r.bodies[0].geometry.translate(1000, 0, 0);
    edit(doc);
    expect(summary(rebuildDocument(doc))).toEqual(full(doc));
  });

  it('holds the states of at most a few documents, within its byte budget', () => {
    clearRebuildCache();
    for (let k = 0; k < 6; k++) {
      const { doc } = MODELS[0][1]();
      doc.id = `doc${k}`;
      rebuildDocument(doc);
    }
    const size = rebuildCacheSize();
    expect(size.states).toBeGreaterThan(0);
    expect(size.states).toBeLessThanOrEqual(4 * 2);
    expect(size.bytes).toBeLessThan(256 * 2 ** 20);
  });
});

describe('the rebuild budget inside a pattern (QA 0.5.14 P2-5d)', () => {
  beforeAll(() => setBrepKernel(null));
  afterEach(() => {
    vi.restoreAllMocks();
    setRebuildBudget(45_000);
    setRebuildCache(true);
  });

  it('a long pattern stops inside itself and is left out as a whole', () => {
    const { doc } = t6(40, []);
    setRebuildCache(false);
    // a clock that moves 1 ms on every reading: the budget runs out after a known number of readings, which the
    // 40 instances of the pattern (one reading each) are far above and the two features before it far below
    let calls = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => ++calls);
    setRebuildBudget(25);
    const r = rebuildDocument(doc);
    expect(r.stopped).toBe(true);
    expect(r.errors.lp1).toMatch(/Not rebuilt: the rebuild stopped/);
    expect(r.errors.e1).toBeUndefined();
    expect(r.errors.e2).toBeUndefined();
    // nothing of the pattern is left: the plate and the one nub
    vi.restoreAllMocks();
    setRebuildBudget(45_000);
    expect(summary({ ...r, errors: {}, stopped: false })).toEqual(full(doc, 2));
  });
});
