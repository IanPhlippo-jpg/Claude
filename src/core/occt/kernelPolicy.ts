/**
 * The timing rules of the geometry-kernel worker (docs/32 P2-4, P3-9), as plain functions so that they can be tested
 * without a worker or a clock.
 */

/** what loading and compiling the 23 MB WebAssembly module may take on a slow machine (ms) */
export const KERNEL_LOAD_MS = 60_000;
/** what the tessellation and the display of an exact rebuild may take after the rebuild budget (ms) */
export const KERNEL_WORK_MARGIN_MS = 30_000;
/** a request that the worker has not begun within this time (beyond the calls ahead of it) never will (ms) */
export const KERNEL_START_MS = 60_000;

/**
 * The limit of one kernel call, counted from the moment the worker begins it (its "started" message), not from the
 * moment it was queued: work + the load of the module when no call has loaded it yet.
 */
export function kernelLimitMs(workMs: number, loaded: boolean): number {
  return Math.max(0, workMs) + (loaded ? 0 : KERNEL_LOAD_MS);
}

/** the work limit of an exact (B-rep) rebuild: the rebuild budget plus the tessellation after it */
export function refineWorkMs(budgetMs: number): number {
  return Math.max(0, budgetMs) + KERNEL_WORK_MARGIN_MS;
}

/** how long a queued call may wait for its "started" message: the full limits of the calls ahead of it, plus a margin */
export function startLimitMs(aheadLimitsMs: number[]): number {
  return KERNEL_START_MS + aheadLimitsMs.reduce((a, b) => a + b, 0);
}

/**
 * A newer exact rebuild arrived while an older one runs: stop the old one (terminate the worker, load the module
 * again) only when that is cheaper than letting it finish. Without an estimate of the old rebuild, it is stopped once
 * it has run longer than a reload takes.
 */
export function shouldCancelStale(elapsedMs: number, expectedMs: number | undefined, reloadMs: number): boolean {
  if (expectedMs === undefined || !Number.isFinite(expectedMs)) return elapsedMs > reloadMs;
  return expectedMs - elapsedMs > reloadMs;
}

/**
 * What the user is told about a failed exact rebuild, or null to say nothing: a cancelled rebuild is no error, a
 * timeout is said every time it happens, any other error once per text (`said` keeps them), never swallowed.
 */
export function kernelNotice(err: unknown, said: Set<string>): string | null {
  const name = err instanceof Error ? err.name : '';
  if (name === 'KernelCancelled') return null;
  if (name === 'KernelTimeout') return 'Exact geometry timed out; showing the faceted (mesh) result.';
  const msg = err instanceof Error ? err.message : String(err);
  if (said.has(msg)) return null;
  said.add(msg);
  return `Exact geometry failed (${msg}); showing the faceted (mesh) result.`;
}

/**
 * An error after which the WebAssembly module cannot be trusted (an abort, out of memory, a trap): the worker is
 * restarted, because its module promise stays resolved with a dead module (docs/32 P2-4).
 */
export function isFatalKernelError(err: unknown): boolean {
  if (typeof WebAssembly !== 'undefined' && err instanceof WebAssembly.RuntimeError) return true;
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /\babort|RuntimeError|out of memory|memory access out of bounds|unreachable|OutOfMemory/i.test(msg);
}
