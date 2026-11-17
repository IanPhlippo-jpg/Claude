/**
 * The client of the rebuild worker (QA F46). One rebuild at a time: a newer request makes the running one void; the
 * queue (rebuildWorkerClient.ts) holds requests back during a drag, keeps a warm spare worker and watches for a hung
 * one (docs/32 P2-10).
 */
import type { Document } from '../core/document/types';
import type { RebuildResult } from '../core/features/rebuild';
import { unpackRebuild } from '../core/features/rebuildWire';
import { getPref } from './prefs';
import { TEST_HOOKS } from './testHooks';
import { RebuildWorkerClient, type WorkerLike } from './rebuildWorkerClient';

export { RebuildSuperseded, RebuildWorkerHung } from './rebuildWorkerClient';

/** on by default (Tools ▸ Options ▸ Performance); the e2e builds rebuild on the UI thread unless a test asks for the
 * worker (?rebuild=worker in the address, or localStorage phlippo.rebuild = worker) */
export function rebuildWorkerEnabled(): boolean {
  if (typeof Worker === 'undefined') return false;
  if (getPref('perf.rebuildWorker') === false) return false;
  if (TEST_HOOKS) {
    try {
      return localStorage.getItem('phlippo.rebuild') === 'worker' || new URLSearchParams(location.search).get('rebuild') === 'worker';
    } catch {
      return false;
    }
  }
  return true;
}

let client: RebuildWorkerClient | null = null;
function queue(): RebuildWorkerClient {
  return (client ??= new RebuildWorkerClient({
    spawn: () => new Worker(new URL('../workers/rebuild.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike,
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
    now: () => performance.now(),
  }));
}

export async function rebuildInWorker(doc: Document, upTo: number | null, budgetMs: number): Promise<{ result: RebuildResult; ms: number }> {
  const d = await queue().request({ doc, upTo }, budgetMs);
  return { result: unpackRebuild(d.result), ms: Number(d.ms ?? 0) };
}

/** the parts of an assembly that have no rebuild yet, rebuilt one after the other in the worker */
export async function rebuildPartsInWorker(docs: Document[], budgetMs: number): Promise<{ results: RebuildResult[]; ms: number }> {
  const d = await queue().request({ docs, upTo: null }, budgetMs, budgetMs * Math.max(1, docs.length));
  return { results: ((d.results as unknown[]) ?? []).map((w) => unpackRebuild(w)), ms: Number(d.ms ?? 0) };
}
