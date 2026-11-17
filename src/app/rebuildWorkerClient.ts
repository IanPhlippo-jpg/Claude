/**
 * The queue in front of the rebuild worker (QA F46, docs/32 P2-10), without the worker itself so that it can be tested
 * in node with a fake worker and fake timers.
 *
 * - One rebuild at a time; a newer request makes the waiting or running one void (RebuildSuperseded).
 * - While requests come fast (dragging a dimension) they are held back briefly and only the last one is sent.
 * - A running rebuild cannot be interrupted (a boolean), so a newer one stops that worker; a warm spare worker, loaded
 *   beforehand, takes over at once instead of a cold one that has to load the kernel module first.
 * - A worker that does not answer within the budget plus a margin is stopped and the request fails with
 *   RebuildWorkerHung; a result that cannot be read (messageerror) fails the request instead of leaving it hanging.
 */

/** the part of a Worker this queue uses */
export interface WorkerLike {
  postMessage(msg: unknown): void;
  terminate(): void;
  onmessage: ((ev: { data: WorkerReply }) => void) | null;
  onerror: ((ev: { message?: string; preventDefault?: () => void }) => void) | null;
  onmessageerror: ((ev: unknown) => void) | null;
}

export interface WorkerReply { id?: number; ready?: boolean; error?: string; [k: string]: unknown }

export interface ClientDeps {
  spawn(): WorkerLike;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  now(): number;
}

/** a request that a newer one replaced (not an error to show) */
export class RebuildSuperseded extends Error {
  constructor() {
    super('superseded');
    this.name = 'RebuildSuperseded';
  }
}

/** the worker did not answer within the budget and the margin: it was stopped (an error to show) */
export class RebuildWorkerHung extends Error {
  constructor(ms: number) {
    super(`The rebuild did not finish within ${Math.round(ms / 1000)} s; the rebuild worker was restarted.`);
    this.name = 'RebuildWorkerHung';
  }
}

/** requests closer together than this are a burst (a drag): only the last one is sent, this long after it (ms) */
export const REBUILD_DEBOUNCE_MS = 60;
/** the watchdog of a rebuild: its budget plus this (packing and sending the result) (ms) */
export const REBUILD_MARGIN_MS = 15_000;
/** and on a worker that has not loaded its module yet, this on top (ms) */
export const REBUILD_LOAD_MS = 30_000;

/** how long a rebuild may take before its worker counts as hung */
export function watchdogMs(budgetMs: number, warm: boolean): number {
  return Math.max(0, budgetMs) + REBUILD_MARGIN_MS + (warm ? 0 : REBUILD_LOAD_MS);
}

/** how long to hold a request back: not at all when it comes after a pause and the worker is idle */
export function sendDelay(now: number, lastRequestAt: number, busy: boolean, debounceMs = REBUILD_DEBOUNCE_MS): number {
  return !busy && now - lastRequestAt >= debounceMs ? 0 : debounceMs;
}

interface Queued { payload: Record<string, unknown>; budgetMs: number; watchBudgetMs: number; resolve: (d: WorkerReply) => void; reject: (e: Error) => void }
interface Job { id: number; worker: WorkerLike; reject: (e: Error) => void; watchdog: unknown }

export class RebuildWorkerClient {
  private active: WorkerLike | null = null;
  private spare: WorkerLike | null = null;
  private readonly warm = new WeakSet<WorkerLike>();
  private job: Job | null = null;
  private queued: Queued | null = null;
  private timer: unknown = null;
  private lastRequestAt = -Infinity;
  private seq = 0;

  constructor(private readonly deps: ClientDeps) {}

  /**
   * sends payload (+ id, budgetMs) to the worker; resolves with its reply, rejects on its error. watchBudgetMs is the
   * budget the watchdog allows (several parts in one request take a budget each).
   */
  request(payload: Record<string, unknown>, budgetMs: number, watchBudgetMs = budgetMs): Promise<WorkerReply> {
    return new Promise((resolve, reject) => {
      this.queued?.reject(new RebuildSuperseded());
      this.queued = { payload, budgetMs, watchBudgetMs, resolve, reject };
      const t = this.deps.now();
      const delay = sendDelay(t, this.lastRequestAt, !!this.job);
      this.lastRequestAt = t;
      if (this.timer !== null) this.deps.clearTimeout(this.timer);
      this.timer = null;
      if (delay === 0) this.flush();
      else this.timer = this.deps.setTimeout(() => { this.timer = null; this.flush(); }, delay);
    });
  }

  /** whether a rebuild is running or waiting */
  get busy(): boolean {
    return !!this.job || !!this.queued;
  }

  private spawn(): WorkerLike {
    const w = this.deps.spawn();
    w.onmessage = (ev) => { if (ev.data?.ready) this.warm.add(w); };
    w.onerror = (ev) => { ev.preventDefault?.(); if (w === this.spare) { this.spare = null; w.terminate(); } };
    w.onmessageerror = null;
    return w;
  }

  /** a loaded worker waits beside the one at work (after a job, or when a job was stopped) */
  private ensureSpare() {
    if (!this.spare) this.spare = this.spawn();
  }

  private stop(w: WorkerLike | null) {
    if (!w) return;
    w.terminate();
    if (w === this.active) this.active = null;
  }

  private flush() {
    const q = this.queued;
    this.queued = null;
    if (!q) return;
    if (this.job) {
      // the running rebuild is stale and cannot be interrupted: its worker goes, the spare takes over
      const old = this.job;
      this.job = null;
      this.deps.clearTimeout(old.watchdog);
      this.stop(old.worker);
      old.reject(new RebuildSuperseded());
    }
    const replaced = !this.active;
    let w = this.active;
    if (!w) {
      w = this.spare ?? this.spawn();
      this.spare = null;
      this.active = w;
    }
    // while a drag keeps replacing rebuilds, the next spare loads already
    if (replaced && this.seq > 0) this.ensureSpare();
    const worker = w;
    const id = ++this.seq;
    const limit = watchdogMs(q.watchBudgetMs, this.warm.has(worker));
    const done = () => {
      if (this.job?.id !== id) return false;
      this.deps.clearTimeout(this.job.watchdog);
      this.job = null;
      return true;
    };
    const fail = (err: Error, kill: boolean) => {
      if (!done()) return;
      if (kill) this.stop(worker);
      q.reject(err);
    };
    const watchdog = this.deps.setTimeout(() => fail(new RebuildWorkerHung(limit), true), limit);
    this.job = { id, worker, reject: q.reject, watchdog };
    worker.onmessage = (ev) => {
      const d = ev.data ?? {};
      if (d.ready) { this.warm.add(worker); return; }
      if (d.id !== id || !done()) return;
      this.warm.add(worker);
      if (d.error !== undefined) q.reject(new Error(d.error));
      else q.resolve(d);
      this.ensureSpare();
    };
    worker.onerror = (ev) => {
      ev.preventDefault?.();
      fail(new Error(ev.message || 'the rebuild worker failed'), true);
    };
    // a result that cannot be cloned: the request fails instead of hanging ("Rebuilding…" for good)
    worker.onmessageerror = () => fail(new Error('the result of the rebuild worker could not be read'), false);
    worker.postMessage({ ...q.payload, id, budgetMs: q.budgetMs });
  }
}
