/**
 * The client of the rebuild worker (QA F46). One rebuild at a time: a newer request makes the running one void, and
 * because a boolean cannot be interrupted the busy worker is stopped and a fresh one started.
 */
import type { Document } from '../core/document/types';
import type { RebuildResult } from '../core/features/rebuild';
import { unpackRebuild } from '../core/features/rebuildWire';
import { getPref } from './prefs';
import { TEST_HOOKS } from './testHooks';

let worker: Worker | null = null;
let seq = 0;
let running: { id: number; reject: (e: Error) => void } | null = null;

/** a request that a newer one replaced (not an error to show) */
export class RebuildSuperseded extends Error {
  constructor() {
    super('superseded');
    this.name = 'RebuildSuperseded';
  }
}

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

export function rebuildInWorker(doc: Document, upTo: number | null, budgetMs: number): Promise<{ result: RebuildResult; ms: number }> {
  if (running) {
    running.reject(new RebuildSuperseded());
    running = null;
    worker?.terminate();
    worker = null;
  }
  const w = (worker ??= new Worker(new URL('../workers/rebuild.worker.ts', import.meta.url), { type: 'module' }));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    running = { id, reject };
    const done = () => { if (running?.id === id) running = null; };
    w.onmessage = (ev: MessageEvent<{ id: number; result?: unknown; ms?: number; error?: string }>) => {
      if (ev.data.id !== id) return;
      done();
      if (ev.data.error !== undefined) reject(new Error(ev.data.error));
      else resolve({ result: unpackRebuild(ev.data.result), ms: ev.data.ms ?? 0 });
    };
    w.onerror = (ev) => {
      ev.preventDefault();
      done();
      worker?.terminate();
      worker = null;
      reject(new Error(ev.message || 'the rebuild worker failed'));
    };
    w.postMessage({ id, doc, upTo, budgetMs });
  });
}
