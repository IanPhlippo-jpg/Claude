import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument, isAssembly, type Component, type Document } from '../core/document/types';
import { rebuildBudgetMs, rebuildDocument, type RebuildResult } from '../core/features/rebuild';
import { partRebuild, rebuildAssembly } from '../core/assembly/assembly';
import { acceptsResult, bindRebuildHost, decideRebuild, markPending, queuedRebuild, resetRebuildTimings } from './rebuildQueue';
import { SYNC_REBUILD_MS, whenRebuilt, type RebuildHost } from './rebuildQueue';
import { RebuildSuperseded, RebuildWorkerHung } from './rebuildWorkerClient';

const empty = (tag?: string): RebuildResult => ({ bodies: [], errors: tag ? { [tag]: 'Warning: x' } : {}, consumedSketches: new Set() });
const deferred = <T,>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const flush = () => new Promise((r) => setTimeout(r, 0));

/** a store of one field (rebuild) and a worker the test answers by hand; every rebuild here "takes" `step` ms */
function fakeHost(opts: { step?: number; rebuildNow?: RebuildHost['rebuildNow'] } = {}) {
  let shown: RebuildResult = empty();
  let doc: Document | null = null;
  let t = 0;
  const subs = new Set<() => void>();
  const messages: string[] = [];
  const partCalls: { doc: Document; d: ReturnType<typeof deferred<{ result: RebuildResult; ms: number }>> }[] = [];
  const partsCalls: { docs: Document[]; d: ReturnType<typeof deferred<{ results: RebuildResult[]; ms: number }>> }[] = [];
  const budgets: number[] = [];
  const host: RebuildHost = {
    shown: () => shown,
    shownKey: () => (doc ? doc.id ?? doc.name : undefined),
    show: (r) => { shown = r; for (const s of [...subs]) s(); },
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    rebuildNow: opts.rebuildNow ?? ((d) => { budgets.push(rebuildBudgetMs); t += opts.step ?? 0; return empty(d.name); }),
    prepare: () => {},
    workerEnabled: () => true,
    message: (text) => messages.push(text),
    now: () => (t += 0),
    part: (d) => { const x = deferred<{ result: RebuildResult; ms: number }>(); partCalls.push({ doc: d, d: x }); return x.promise; },
    parts: (docs) => { const x = deferred<{ results: RebuildResult[]; ms: number }>(); partsCalls.push({ docs, d: x }); return x.promise; },
  };
  bindRebuildHost(host);
  return {
    host, messages, partCalls, partsCalls, budgets,
    get shown() { return shown; },
    setShown(r: RebuildResult) { shown = r; for (const s of [...subs]) s(); },
    setDoc(d: Document) { doc = d; },
    advance(ms: number) { t += ms; },
  };
}

describe('rebuild queue (docs/32 P2-5, P3-13)', () => {
  beforeEach(() => resetRebuildTimings());

  it('the sequence number decides, not the identity of the placeholder: a copy of it still takes the result', () => {
    const p = markPending(empty(), 7);
    expect(acceptsResult(p, 7)).toBe(true);
    expect(acceptsResult({ ...p }, 7)).toBe(true);
    expect(acceptsResult(p, 8)).toBe(false);
    expect(acceptsResult({ ...p, pending: false }, 7)).toBe(false);
    expect(acceptsResult(empty(), 7)).toBe(false);
  });

  it('a light part rebuilds here with the budget capped at SYNC_REBUILD_MS (300 ms, was 4 s); a slow one goes to the worker next time', async () => {
    expect(SYNC_REBUILD_MS).toBeLessThanOrEqual(300);
    const h = fakeHost({ step: 400 });
    const doc = createDocument('Heavy');
    h.setDoc(doc);
    const r1 = queuedRebuild(doc, null);
    expect(r1.pending).toBeFalsy();
    expect(h.budgets).toEqual([SYNC_REBUILD_MS]);
    expect(rebuildBudgetMs).not.toBe(SYNC_REBUILD_MS);
    h.setShown(r1);
    // 400 ms on this thread: the next rebuild goes to the worker at once
    const r2 = queuedRebuild(doc, null);
    expect(r2.pending).toBe(true);
    expect(h.partCalls).toHaveLength(1);
    // something sets a copy of the placeholder meanwhile (P3-13): the result is still taken
    h.setShown({ ...r2 });
    const result = empty('done');
    h.partCalls[0].d.resolve({ result, ms: 500 });
    await flush();
    expect(h.shown).toBe(result);
  });

  it('a newer rebuild makes the older result void; a superseded request changes nothing', async () => {
    const h = fakeHost({ step: 400 });
    const doc = createDocument('Heavy');
    h.setDoc(doc);
    h.setShown(queuedRebuild(doc, null));
    const a = queuedRebuild(doc, null);
    h.setShown(a);
    const b = queuedRebuild(doc, null);
    h.setShown(b);
    h.partCalls[0].d.resolve({ result: empty('old'), ms: 500 });
    h.partCalls[1].d.reject(new RebuildSuperseded());
    await flush();
    expect(h.shown).toBe(b);
    const fresh = empty('new');
    const c = queuedRebuild(doc, null);
    h.setShown(c);
    h.partCalls[2].d.resolve({ result: fresh, ms: 500 });
    await flush();
    expect(h.shown).toBe(fresh);
  });

  it('a hung worker: the error is shown and "Rebuilding…" ends with the previous result (no rebuild on this thread)', async () => {
    const h = fakeHost({ step: 400 });
    const doc = createDocument('Heavy');
    h.setDoc(doc);
    const first = queuedRebuild(doc, null);
    h.setShown(first);
    const p = queuedRebuild(doc, null);
    h.setShown(p);
    const before = h.budgets.length;
    h.partCalls[0].d.reject(new RebuildWorkerHung(60_000));
    await flush();
    expect(h.shown.pending).toBeFalsy();
    expect(h.shown.errors).toEqual(first.errors);
    expect(h.messages[0]).toMatch(/did not finish within 60 s/);
    expect(h.budgets.length).toBe(before);
  });

  it('whenRebuilt waits for the worker result', async () => {
    const h = fakeHost({ step: 400 });
    const doc = createDocument('Heavy');
    h.setDoc(doc);
    h.setShown(queuedRebuild(doc, null));
    const p = queuedRebuild(doc, null);
    h.setShown(p);
    const got: RebuildResult[] = [];
    whenRebuilt(p, (r) => got.push(r));
    expect(got).toHaveLength(0);
    const result = empty('done');
    h.partCalls[0].d.resolve({ result, ms: 1 });
    await flush();
    expect(got).toEqual([result]);
  });

  it('Reorder on a heavy part decides in the worker: applied when it is clean, the old result back when refused', async () => {
    const h = fakeHost({ step: 400 });
    const doc = createDocument('Heavy');
    h.setDoc(doc);
    const shown0 = queuedRebuild(doc, null);
    h.setShown(shown0);
    const seen: RebuildResult[] = [];
    // refused: the shown rebuild goes back to what it was
    expect(decideRebuild(doc, null, (r) => { seen.push(r); return false; }, () => true)).toBe(true);
    expect(h.shown.pending).toBe(true);
    h.partCalls[0].d.resolve({ result: empty('broken'), ms: 500 });
    await flush();
    expect(seen).toHaveLength(1);
    expect(h.shown).toBe(shown0);
    // applied: decide sets the state itself
    const after = empty('clean');
    expect(decideRebuild(doc, null, (r) => { h.setShown(r); return true; }, () => true)).toBe(true);
    h.partCalls[1].d.resolve({ result: after, ms: 500 });
    await flush();
    expect(h.shown).toBe(after);
    // a light part decides at once, on this thread
    resetRebuildTimings();
    expect(decideRebuild(createDocument('Light'), null, () => false, () => true)).toBe(false);
  });

  it('an assembly shows its mates solved at once and gets the parts without a rebuild from the worker', async () => {
    const h = fakeHost({ rebuildNow: (d, ri) => (isAssembly(d) ? rebuildAssembly(d) : rebuildDocument(d, ri)) });
    const partA = createDocument('A'), partB = createDocument('B');
    const comp = (id: string, part: Document, x: number): Component =>
      ({ id, name: `${part.name}<1>`, part, position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: id === 'c1', suppressed: false });
    const asm: Document = { ...createDocument('Asm', 'assembly'), components: [comp('c1', partA, 0), comp('c2', partB, 50)] };
    h.setDoc(asm);
    // the parts take long here: past the 300 ms of this thread they go to the worker
    h.host.now = (() => { let t = 0; return () => (t += 400); })();
    const p = queuedRebuild(asm, null) as RebuildResult & { components?: Component[] };
    expect(p.pending).toBe(true);
    // callers that read the solved components still find them on the placeholder
    expect(p.components?.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(h.partsCalls).toHaveLength(1);
    expect(h.partsCalls[0].docs).toEqual([partA, partB]);
    h.setShown(p);
    const ra = empty('a'), rb = empty('b');
    h.partsCalls[0].d.resolve({ results: [ra, rb], ms: 900 });
    await flush();
    expect(h.shown.pending).toBeFalsy();
    expect(partRebuild(partA)).toBe(ra);
    expect(partRebuild(partB)).toBe(rb);
    // all parts cached now: the next rebuild of the assembly is on this thread
    expect(queuedRebuild(asm, null).pending).toBeFalsy();
    expect(h.partsCalls).toHaveLength(1);
  });
});
