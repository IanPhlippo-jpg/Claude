/**
 * Which rebuild runs where (QA F46, docs/32 P2-5, P2-10, P3-13). A part that rebuilds slowly is built in the rebuild
 * worker: the window stays responsive, the previous result stays shown (pending, "Rebuilding…" in the status bar)
 * and the new one replaces it when it is done, unless another rebuild came first. An assembly whose parts have no
 * rebuild yet shows its mates solved and its other parts at once and gets the missing parts from the worker.
 *
 * A worker result is taken by the sequence number that its placeholder carries in the state (pendingSeq), not by the
 * identity of the placeholder object: a copy of the placeholder still gets its result.
 *
 * The store binds its side (bindRebuildHost) so that this module does not import the store; the tests bind a fake one.
 */
import type { Document } from '../core/document/types';
import { isAssembly, isDrawing } from '../core/document/types';
import { rebuildBudgetMs, rebuildDocument, setRebuildBudget, type RebuildResult } from '../core/features/rebuild';
import { provisionalRebuild, setPartRebuild, uncachedParts } from '../core/assembly/assembly';

export interface RebuildHost {
  /** the rebuild the store shows */
  shown(): RebuildResult;
  /** the key (id or name) of the document the store shows */
  shownKey(): string | undefined;
  show(r: RebuildResult): void;
  /** cb on every change of the store */
  subscribe(cb: () => void): () => void;
  /** the rebuild on this thread (planes registered, errors caught) */
  rebuildNow(doc: Document, rollbackIndex: number | null): RebuildResult;
  /** registers the document's planes before a rebuild elsewhere */
  prepare(doc: Document): void;
  workerEnabled(): boolean;
  message(text: string, level: 'warn' | 'error'): void;
  now(): number;
  part(doc: Document, upTo: number | null, budgetMs: number): Promise<{ result: RebuildResult; ms: number }>;
  parts(docs: Document[], budgetMs: number): Promise<{ results: RebuildResult[]; ms: number }>;
}

let host: RebuildHost | null = null;
export function bindRebuildHost(h: RebuildHost): void {
  host = h;
}
function H(): RebuildHost {
  if (!host) throw new Error('rebuild host not bound');
  return host;
}

/** a part rebuild slower than this goes to the rebuild worker the next time (ms) */
export const HEAVY_REBUILD_MS = 250;
/** with the worker available a rebuild on this thread stops here and goes on in the worker (ms; was 4 s, P2-5 b) */
export const SYNC_REBUILD_MS = 300;
/** per document: how long its last part rebuild took */
const lastRebuildMs = new Map<string, number>();
let pendingSeq = 0;

type Seq = RebuildResult & { pendingSeq?: number };
/** the placeholder of a rebuild on its way: the shown result marked pending, with its sequence number */
export function markPending(base: RebuildResult, seq: number): RebuildResult {
  return { ...base, pending: true, pendingSeq: seq } as Seq;
}
/** whether the state still waits for the rebuild with this sequence number (a copy of its placeholder counts) */
export function acceptsResult(shown: RebuildResult, seq: number): boolean {
  return !!shown.pending && (shown as Seq).pendingSeq === seq;
}
/** the result without the placeholder's mark */
function settled(r: RebuildResult): RebuildResult {
  const { pending: _p, pendingSeq: _s, ...rest } = r as Seq;
  return rest as RebuildResult;
}

const keyOf = (doc: Document) => doc.id ?? doc.name;
/** whether the last rebuild of this document was slow enough for the worker */
export function isHeavy(doc: Document): boolean {
  return (lastRebuildMs.get(keyOf(doc)) ?? 0) >= HEAVY_REBUILD_MS;
}
/** for the tests: forget the timings */
export function resetRebuildTimings(): void {
  lastRebuildMs.clear();
}

/** a rebuild on this thread with the budget capped at ms (null when it stopped there) */
function rebuildWithin<T extends RebuildResult>(ms: number, fn: () => T): T | null {
  const budget = rebuildBudgetMs;
  setRebuildBudget(Math.min(budget, Math.max(0, ms)));
  try {
    const r = fn();
    return r.stopped ? null : r;
  } finally {
    setRebuildBudget(budget);
  }
}

/** the rebuild the store shows (store.rebuildFor) */
export function queuedRebuild(doc: Document, rollbackIndex: number | null): RebuildResult {
  const h = H();
  if (isDrawing(doc) || !h.workerEnabled()) return h.rebuildNow(doc, rollbackIndex);
  if (isAssembly(doc)) return assemblyRebuild(doc, rollbackIndex);
  const key = keyOf(doc);
  if (isHeavy(doc)) return rebuildLater(doc, rollbackIndex, key);
  const t0 = h.now();
  const r = rebuildWithin(SYNC_REBUILD_MS, () => h.rebuildNow(doc, rollbackIndex));
  lastRebuildMs.set(key, h.now() - t0);
  return r ?? rebuildLater(doc, rollbackIndex, key);
}

function placeholderFor(key: string): { placeholder: RebuildResult; seq: number } {
  const h = H();
  const seq = ++pendingSeq;
  const base: RebuildResult = h.shownKey() === key ? h.shown() : { bodies: [], errors: {}, consumedSketches: new Set() };
  return { placeholder: markPending(base, seq), seq };
}

/** a worker that hung: the error is shown and the previous result stays (not rebuilt here: it would freeze the window) */
function hung(err: Error, seq: number) {
  const h = H();
  if (!acceptsResult(h.shown(), seq)) return;
  h.show(settled(h.shown()));
  h.message(err.message, 'error');
}

const superseded = (err: unknown) => err instanceof Error && err.name === 'RebuildSuperseded';
const isHung = (err: unknown) => err instanceof Error && err.name === 'RebuildWorkerHung';

function rebuildLater(doc: Document, rollbackIndex: number | null, key: string): RebuildResult {
  const h = H();
  h.prepare(doc);
  const { placeholder, seq } = placeholderFor(key);
  h.part(doc, rollbackIndex, rebuildBudgetMs).then(
    ({ result, ms }) => {
      lastRebuildMs.set(key, ms);
      if (acceptsResult(h.shown(), seq)) h.show(result);
    },
    (err) => {
      if (superseded(err)) return;
      if (isHung(err)) { hung(err, seq); return; }
      // the worker failed: the rebuild runs here after all
      lastRebuildMs.delete(key);
      if (acceptsResult(h.shown(), seq)) h.show(h.rebuildNow(doc, rollbackIndex));
    },
  );
  return placeholder;
}

/**
 * An assembly: the parts without a rebuild are built here as long as that stays under SYNC_REBUILD_MS, the rest in
 * the worker. Meanwhile the assembly shows with those parts left out (mates solved: callers read the components).
 */
function assemblyRebuild(doc: Document, rollbackIndex: number | null): RebuildResult {
  const h = H();
  const missing = uncachedParts(doc);
  if (!missing.length) return h.rebuildNow(doc, rollbackIndex);
  const t0 = h.now();
  const rest: Document[] = [];
  for (const part of missing) {
    const left = SYNC_REBUILD_MS - (h.now() - t0);
    if (left <= 0 || isHeavy(part)) { rest.push(part); continue; }
    const p0 = h.now();
    const r = rebuildWithin(left, () => rebuildDocument(part, null));
    lastRebuildMs.set(keyOf(part), h.now() - p0);
    if (r) setPartRebuild(part, r);
    else rest.push(part);
  }
  if (!rest.length) return h.rebuildNow(doc, rollbackIndex);
  const seq = ++pendingSeq;
  const placeholder = markPending(provisionalRebuild(() => h.rebuildNow(doc, rollbackIndex)), seq);
  h.parts(rest, rebuildBudgetMs).then(
    ({ results }) => {
      rest.forEach((part, i) => { if (results[i]) setPartRebuild(part, results[i]); });
      if (acceptsResult(h.shown(), seq)) h.show(h.rebuildNow(doc, rollbackIndex));
    },
    (err) => {
      if (superseded(err)) return;
      if (isHung(err)) { hung(err, seq); return; }
      if (acceptsResult(h.shown(), seq)) h.show(h.rebuildNow(doc, rollbackIndex));
    },
  );
  return placeholder;
}

/** runs cb with the finished rebuild: at once, or when the rebuild worker delivers it (a newer rebuild counts too) */
export function whenRebuilt(r: RebuildResult, cb: (r: RebuildResult) => void): void {
  if (!r.pending) { cb(r); return; }
  const h = H();
  const unsub = h.subscribe(() => {
    const s = h.shown();
    if (s.pending) return;
    unsub();
    cb(s);
  });
}

/**
 * A rebuild whose result decides whether a change is kept (Reorder, docs/32 P2-5 c): on this thread for a light part;
 * for a heavy one in the worker, with "Rebuilding…" shown meanwhile. decide applies the change and says whether it
 * did; a refused change, a stale result (valid() false) or a failed worker leaves the shown rebuild as it was.
 * Returns decide's answer, or true while the worker decides.
 */
export function decideRebuild(doc: Document, rollbackIndex: number | null, decide: (r: RebuildResult) => boolean, valid: () => boolean): boolean {
  const h = H();
  if (isDrawing(doc) || isAssembly(doc) || !h.workerEnabled() || !isHeavy(doc)) return decide(h.rebuildNow(doc, rollbackIndex));
  const before = h.shown();
  const seq = ++pendingSeq;
  h.prepare(doc);
  h.show(markPending(before, seq));
  const restore = () => { if (acceptsResult(h.shown(), seq)) h.show(before); };
  h.part(doc, rollbackIndex, rebuildBudgetMs).then(
    ({ result, ms }) => {
      lastRebuildMs.set(keyOf(doc), ms);
      if (!acceptsResult(h.shown(), seq)) return;
      if (!valid() || !decide(result)) restore();
    },
    (err) => {
      if (superseded(err)) return;
      restore();
      h.message(isHung(err) ? (err as Error).message : `The rebuild failed: ${(err as Error).message}`, 'error');
    },
  );
  return true;
}
