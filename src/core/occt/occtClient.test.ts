import { afterEach, describe, expect, it, vi } from 'vitest';

describe('occtClient', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('rejects a call that hangs with KernelTimeout and starts a new worker for the next call (F106)', async () => {
    vi.useFakeTimers();
    const made: { terminated: boolean }[] = [];
    class HungWorker {
      terminated = false;
      onmessage: unknown = null;
      onerror: unknown = null;
      constructor() { made.push(this); }
      postMessage() { /* never answers */ }
      terminate() { this.terminated = true; }
    }
    vi.stubGlobal('Worker', HungWorker);
    const m = await import('./occtClient');
    const p = m.refineRebuild({} as never, null);
    const caught = p.catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(60_000);
    const err = await caught;
    expect(err).toBeInstanceOf(m.KernelTimeout);
    expect(made[0].terminated).toBe(true);
    void m.refineRebuild({} as never, null).catch(() => {});
    expect(made).toHaveLength(2);
  });
});
