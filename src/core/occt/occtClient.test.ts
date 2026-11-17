import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KERNEL_LOAD_MS, KERNEL_START_MS, refineWorkMs } from './kernelPolicy';

/** a stand-in for the OCCT worker: records what it was sent, answers when the test says so */
class FakeWorker {
  static made: FakeWorker[] = [];
  terminated = false;
  sent: Record<string, unknown>[] = [];
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: unknown = null;
  onmessageerror: unknown = null;
  constructor() { FakeWorker.made.push(this); }
  postMessage(m: Record<string, unknown>) { this.sent.push(m); }
  terminate() { this.terminated = true; }
  reply(data: Record<string, unknown>) { this.onmessage?.({ data }); }
}

async function client() {
  vi.resetModules();
  return import('./occtClient');
}

describe('occtClient', () => {
  beforeEach(() => {
    FakeWorker.made = [];
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('rejects a call that hangs with KernelTimeout and starts a new worker for the next call (F106)', async () => {
    const m = await client();
    const caught = m.refineRebuild({} as never, null).catch((e: Error) => e);
    // the worker never even begins the call
    await vi.advanceTimersByTimeAsync(KERNEL_START_MS);
    const err = await caught;
    expect(err).toBeInstanceOf(m.KernelTimeout);
    expect(FakeWorker.made[0].terminated).toBe(true);
    void m.refineRebuild({} as never, null).catch(() => {});
    expect(FakeWorker.made).toHaveLength(2);
  });

  it('the budget goes to the worker, and the clock starts when the worker begins the call (P2-4, P3-9)', async () => {
    const m = await client();
    const budget = 70_000;
    const first = m.exportStepDoc({} as never, null, 'mm').catch((e: Error) => e);
    const exact = m.refineRebuild({} as never, null, budget);
    const w = FakeWorker.made[0];
    expect(w.sent[1]).toMatchObject({ op: 'rebuild', budgetMs: budget });
    // the export runs a long time (it began at once); the exact rebuild waits behind it without a clock of its own
    w.reply({ id: w.sent[0].id, started: true });
    await vi.advanceTimersByTimeAsync(100_000);
    w.reply({ id: w.sent[0].id, bytes: new Uint8Array(), volumes: [], exact: 0 });
    await first;
    w.reply({ id: w.sent[1].id, started: true });
    // well past the old fixed 60 s, within budget + margin (the module was loaded by the export)
    await vi.advanceTimersByTimeAsync(refineWorkMs(budget) - 1_000);
    w.reply({ id: w.sent[1].id, bodies: [{ id: 'b1', exact: true }], stopped: true, ms: 69_000 });
    const r = await exact;
    expect(r.stopped).toBe(true);
    expect(r.bodies).toHaveLength(1);
    expect(r.ms).toBe(69_000);
    expect(w.terminated).toBe(false);
  });

  it('a cold worker gets the load time on top of the budget', async () => {
    const m = await client();
    const exact = m.refineRebuild({} as never, null, 10_000).catch((e: Error) => e);
    const w = FakeWorker.made[0];
    w.reply({ id: w.sent[0].id, started: true });
    await vi.advanceTimersByTimeAsync(refineWorkMs(10_000) + KERNEL_LOAD_MS - 1_000);
    expect(w.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await exact).toBeInstanceOf(m.KernelTimeout);
    expect(w.terminated).toBe(true);
  });

  it('an error is passed on; a fatal one (WASM abort) and a dead module restart the worker', async () => {
    const m = await client();
    const a = m.refineRebuild({} as never, null).catch((e: Error) => e);
    let w = FakeWorker.made[0];
    w.reply({ id: w.sent[0].id, started: true });
    w.reply({ id: w.sent[0].id, error: 'the fillet radius is too large' });
    const ea = await a;
    expect(ea).toBeInstanceOf(m.KernelFailed);
    expect((ea as Error).message).toMatch(/fillet/);
    expect(w.terminated).toBe(false);

    const b = m.refineRebuild({} as never, null).catch((e: Error) => e);
    w.reply({ id: w.sent[1].id, started: true });
    w.reply({ id: w.sent[1].id, error: 'Aborted(OOM)', fatal: true });
    expect(await b).toBeInstanceOf(m.KernelFailed);
    expect(w.terminated).toBe(true);

    // the next call gets a new worker; after it the module turns out dead: restarted for the call after
    const c = m.refineRebuild({} as never, null);
    w = FakeWorker.made[1];
    w.reply({ id: w.sent[0].id, started: true });
    w.reply({ id: w.sent[0].id, bodies: [], stopped: false, ms: 5 });
    w.reply({ dead: true });
    await c;
    expect(w.terminated).toBe(true);
    void m.refineRebuild({} as never, null).catch(() => {});
    expect(FakeWorker.made).toHaveLength(3);
  });

  it('a stale exact rebuild is stopped when finishing it costs more than a reload; an export is never stopped', async () => {
    const m = await client();
    const old = m.refineRebuild({} as never, null).catch((e: Error) => e);
    const w = FakeWorker.made[0];
    // not begun yet: nothing to stop
    expect(m.cancelStaleRebuild(30_000)).toBe(false);
    w.reply({ id: w.sent[0].id, started: true });
    // a long rebuild ahead (30 s expected) against a reload of 3 s: stopped
    expect(m.cancelStaleRebuild(30_000)).toBe(true);
    expect((await old as Error).name).toBe('KernelCancelled');
    expect(w.terminated).toBe(true);

    const exp = m.exportStepDoc({} as never, null, 'mm').catch((e: Error) => e);
    const w2 = FakeWorker.made[1];
    w2.reply({ id: w2.sent[0].id, started: true });
    expect(m.cancelStaleRebuild(30_000)).toBe(false);
    expect(w2.terminated).toBe(false);
    w2.reply({ id: w2.sent[0].id, bytes: new Uint8Array(), volumes: [], exact: 0 });
    await exp;
  });
});
