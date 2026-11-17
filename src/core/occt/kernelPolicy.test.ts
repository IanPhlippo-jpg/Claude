import { describe, expect, it } from 'vitest';
import { isFatalKernelError, KERNEL_LOAD_MS, KERNEL_START_MS, kernelLimitMs, kernelNotice } from './kernelPolicy';
import { refineWorkMs, shouldCancelStale, startLimitMs } from './kernelPolicy';

describe('kernel timing rules (docs/32 P2-4, P3-9)', () => {
  it('the limit of an exact rebuild is the rebuild budget plus the tessellation, plus the load on a cold worker', () => {
    const work = refineWorkMs(45_000);
    expect(work).toBeGreaterThan(45_000);
    expect(kernelLimitMs(work, true)).toBe(work);
    expect(kernelLimitMs(work, false)).toBe(work + KERNEL_LOAD_MS);
    // a budget of 68 s (as CI measured) is not cut off at the old fixed 60 s
    expect(kernelLimitMs(refineWorkMs(68_000), true)).toBeGreaterThan(68_000);
  });

  it('a queued call waits for the calls ahead of it before its own clock starts', () => {
    expect(startLimitMs([])).toBe(KERNEL_START_MS);
    expect(startLimitMs([10_000, 20_000])).toBe(KERNEL_START_MS + 30_000);
  });

  it('a stale exact rebuild is stopped only when finishing it costs more than loading the kernel again', () => {
    // known duration: 20 s rebuild, 2 s in, reload 3 s -> 18 s left: stop
    expect(shouldCancelStale(2_000, 20_000, 3_000)).toBe(true);
    // nearly done: let it finish
    expect(shouldCancelStale(18_500, 20_000, 3_000)).toBe(false);
    // unknown duration: stop once it ran longer than a reload
    expect(shouldCancelStale(1_000, undefined, 3_000)).toBe(false);
    expect(shouldCancelStale(4_000, undefined, 3_000)).toBe(true);
  });

  it('a WASM abort or out-of-memory counts as fatal (the worker restarts); an ordinary error does not', () => {
    expect(isFatalKernelError(new Error('Aborted(OOM). Build with -sASSERTIONS for more info.'))).toBe(true);
    expect(isFatalKernelError(new Error('memory access out of bounds'))).toBe(true);
    expect(isFatalKernelError(Object.assign(new Error('unreachable'), { name: 'RuntimeError' }))).toBe(true);
    expect(isFatalKernelError(new Error('the fillet radius is too large'))).toBe(false);
  });

  it('every failure is said once, a timeout each time, a cancelled rebuild never', () => {
    const said = new Set<string>();
    const fail = new Error('BRep_API: command not done');
    expect(kernelNotice(fail, said)).toMatch(/Exact geometry failed \(BRep_API: command not done\)/);
    expect(kernelNotice(new Error('BRep_API: command not done'), said)).toBeNull();
    expect(kernelNotice(new Error('another error'), said)).toMatch(/another error/);
    const timeout = Object.assign(new Error('x'), { name: 'KernelTimeout' });
    expect(kernelNotice(timeout, said)).toMatch(/timed out/);
    expect(kernelNotice(timeout, said)).toMatch(/timed out/);
    expect(kernelNotice(Object.assign(new Error('x'), { name: 'KernelCancelled' }), said)).toBeNull();
  });
});
