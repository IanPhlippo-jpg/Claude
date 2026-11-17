import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDocument, type Document } from './types';
import { autosave, AUTOSAVE_DELAY, cancelAutosave, flushAutosave, setAutosaveTarget, writeAutosaveToStorage } from './persistence';

// QA 0.5.14 advice P2-6: the desktop app writes its autosave to the auto-recover folder on disk (autoRecover.ts sets
// the target); the browser keeps the copy in localStorage.
describe('autosave target (P2-6)', () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  };
  afterEach(() => {
    cancelAutosave();
    setAutosaveTarget(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    store.clear();
  });

  it('with a target the waiting copy goes there once, after the pause, and not to the browser storage', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', fake);
    const got: Document[] = [];
    setAutosaveTarget((d) => (got.push(d), true));
    for (let i = 0; i < 10; i++) autosave(createDocument(`Step${i}`));
    vi.advanceTimersByTime(AUTOSAVE_DELAY);
    expect(got.map((d) => d.name)).toEqual(['Step9']);
    expect(store.size).toBe(0);
  });

  it('works without any browser storage (the desktop shell decides the folder)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', undefined);
    const got: string[] = [];
    setAutosaveTarget((d) => (got.push(d.name), true));
    expect(autosave(createDocument('NoStorage'))).toBe(true);
    expect(flushAutosave()).toBe(true);
    expect(got).toEqual(['NoStorage']);
  });

  it('without a target (the browser) the copy stays in localStorage; the fallback writes there too', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', fake);
    autosave(createDocument('Browser'));
    vi.advanceTimersByTime(AUTOSAVE_DELAY);
    expect(store.get('phlippo.autosave')).toContain('"Browser"');
    expect(writeAutosaveToStorage(createDocument('Fallback'))).toBe(true);
    expect(store.get('phlippo.autosave')).toContain('"Fallback"');
  });

  it('a target that fails reports false, so nothing claims the copy was written', () => {
    vi.stubGlobal('localStorage', fake);
    setAutosaveTarget(() => false);
    autosave(createDocument('Refused'));
    expect(flushAutosave()).toBe(false);
  });
});
