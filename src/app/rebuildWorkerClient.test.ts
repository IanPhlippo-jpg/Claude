import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REBUILD_DEBOUNCE_MS, REBUILD_LOAD_MS, REBUILD_MARGIN_MS, RebuildSuperseded, RebuildWorkerClient, RebuildWorkerHung } from './rebuildWorkerClient';
import { sendDelay, watchdogMs, type WorkerLike, type WorkerReply } from './rebuildWorkerClient';

class FakeWorker implements WorkerLike {
  terminated = false;
  sent: Record<string, unknown>[] = [];
  onmessage: ((ev: { data: WorkerReply }) => void) | null = null;
  onerror: ((ev: { message?: string; preventDefault?: () => void }) => void) | null = null;
  onmessageerror: ((ev: unknown) => void) | null = null;
  postMessage(m: Record<string, unknown>) { this.sent.push(m); }
  terminate() { this.terminated = true; }
  reply(data: WorkerReply) { this.onmessage?.({ data }); }
  last() { return this.sent[this.sent.length - 1]; }
}

let made: FakeWorker[] = [];
function makeClient() {
  return new RebuildWorkerClient({
    spawn: () => { const w = new FakeWorker(); made.push(w); return w; },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    now: () => Date.now(),
  });
}

describe('rebuild worker queue (docs/32 P2-10)', () => {
  beforeEach(() => { made = []; vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('pure rules: watchdog = budget + margin (+ load on a cold worker); a request after a pause on an idle worker goes at once', () => {
    expect(watchdogMs(45_000, true)).toBe(45_000 + REBUILD_MARGIN_MS);
    expect(watchdogMs(45_000, false)).toBe(45_000 + REBUILD_MARGIN_MS + REBUILD_LOAD_MS);
    expect(sendDelay(1_000, 0, false)).toBe(0);
    expect(sendDelay(1_000, 990, false)).toBe(REBUILD_DEBOUNCE_MS);
    expect(sendDelay(1_000, 0, true)).toBe(REBUILD_DEBOUNCE_MS);
  });

  it('a drag: the requests in a burst are held back and only the last one is sent', async () => {
    const c = makeClient();
    const first = c.request({ v: 1 }, 45_000);
    const w = made[0];
    expect(w.sent).toHaveLength(1);
    w.reply({ ready: true });
    w.reply({ id: w.last().id as number, ms: 3 });
    await first;
    const results: Promise<unknown>[] = [];
    for (let v = 2; v <= 6; v++) {
      results.push(c.request({ v }, 45_000).catch((e: Error) => e));
      await vi.advanceTimersByTimeAsync(10);
    }
    // nothing sent during the burst
    expect(w.sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(REBUILD_DEBOUNCE_MS);
    expect(w.sent).toHaveLength(2);
    expect(w.last()).toMatchObject({ v: 6, budgetMs: 45_000 });
    for (const r of results.slice(0, -1)) expect(await r).toBeInstanceOf(RebuildSuperseded);
    w.reply({ id: w.last().id as number, ms: 4 });
    expect(await results[results.length - 1]).toMatchObject({ ms: 4 });
    // the worker was reused, not killed; one spare waits beside it
    expect(w.terminated).toBe(false);
    expect(made).toHaveLength(2);
  });

  it('a newer request stops a running rebuild; the warm spare takes over instead of a cold new worker', async () => {
    const c = makeClient();
    const a = c.request({ v: 1 }, 45_000);
    const w0 = made[0];
    w0.reply({ id: w0.last().id as number, ms: 1 });
    await a;
    const spare = made[1];
    spare.reply({ ready: true });
    await vi.advanceTimersByTimeAsync(1_000);
    const b = c.request({ v: 2 }, 45_000).catch((e: Error) => e);
    expect(w0.sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1_000);
    const cc = c.request({ v: 3 }, 45_000);
    await vi.advanceTimersByTimeAsync(REBUILD_DEBOUNCE_MS);
    expect(await b).toBeInstanceOf(RebuildSuperseded);
    expect(w0.terminated).toBe(true);
    expect(spare.last()).toMatchObject({ v: 3 });
    spare.reply({ id: spare.last().id as number, ms: 2 });
    expect(await cc).toMatchObject({ ms: 2 });
  });

  it('a hung worker is stopped after budget + margin and the request fails with RebuildWorkerHung', async () => {
    const c = makeClient();
    const p = c.request({ v: 1 }, 10_000).catch((e: Error) => e);
    const w = made[0];
    // a worker that had not loaded when the request went also gets the load time
    await vi.advanceTimersByTimeAsync(10_000 + REBUILD_MARGIN_MS + REBUILD_LOAD_MS - 1);
    expect(w.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await p).toBeInstanceOf(RebuildWorkerHung);
    expect(w.terminated).toBe(true);
    // the next request runs on another worker
    void c.request({ v: 2 }, 10_000).catch(() => {});
    await vi.advanceTimersByTimeAsync(REBUILD_DEBOUNCE_MS);
    expect(made[1].terminated).toBe(false);
    expect(made[1].last()).toMatchObject({ v: 2 });
  });

  it('a result that cannot be read fails the request (no "Rebuilding…" for good); an error reply is an error', async () => {
    const c = makeClient();
    const p = c.request({ v: 1 }, 45_000).catch((e: Error) => e);
    made[0].onmessageerror?.({});
    expect((await p as Error).message).toMatch(/could not be read/);
    expect(c.busy).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    const q = c.request({ v: 2 }, 45_000).catch((e: Error) => e);
    const w = made[0];
    w.reply({ id: w.last().id as number, error: 'boom' });
    expect((await q as Error).message).toBe('boom');
  });
});
