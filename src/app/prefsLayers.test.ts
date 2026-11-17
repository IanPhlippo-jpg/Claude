// @vitest-environment jsdom
// QA 0.5.14 advice P2-1 (Options ▸ OK keeps options saved elsewhere) and P2-2 (a file sets only Document Properties,
// they apply at once, and they do not leak into the profile or the next document).
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, documentProperties, getPref, loadPrefs, patchPrefs, setDocumentProperties } from './prefs';
import { useStore } from './store';
import { createDocument } from '../core/document/types';

const st = () => useStore.getState();
const stored = () => JSON.parse(localStorage.getItem('phlippo.prefs') ?? '{}') as Record<string, unknown>;
beforeEach(() => {
  localStorage.removeItem('phlippo.prefs');
  setDocumentProperties({});
  loadPrefs();
});

describe('P2-1 one write path', () => {
  it('Options ▸ OK after a favourite was saved elsewhere keeps the favourite', () => {
    const atStart = { ...st().prefs }; // the Options dialog copies the prefs when it opens
    patchPrefs({ 'material.favorites': JSON.stringify(['Steel']) }); // Material dialog, same session
    expect(st().prefs['material.favorites']).toBe('["Steel"]'); // the store follows every write
    st().setPrefs({ ...atStart, 'view.reverseWheel': true }, atStart); // Options ▸ OK with its stale copy
    expect(stored()['material.favorites']).toBe('["Steel"]');
    expect(stored()['view.reverseWheel']).toBe(true);
    st().setPrefs({ ...st().prefs, 'view.reverseWheel': false });
  });
  it('patchPrefs keeps every key it was not given', () => {
    patchPrefs({ 'thread.favorites': '{"M6":{}}' });
    patchPrefs({ 'sketch.dimFavorites': '[]' });
    expect(stored()['thread.favorites']).toBe('{"M6":{}}');
  });
});

describe('P2-2 document properties', () => {
  it('a file can set only known doc.* keys of the right type', () => {
    const props = documentProperties({ 'doc.lengthDecimals': '.1234', 'doc.gridMajor': 'x', 'perf.rebuildWorker': false, 'backup.autoRecover': false, 'customize.keys': 'a', 'doc.nope': 1 });
    expect(props).toEqual({ 'doc.lengthDecimals': '.1234' });
  });
  it('opening a document applies its properties at once and never its system options', () => {
    const d = { ...createDocument('A'), properties: { 'doc.lengthDecimals': '.1234', 'perf.rebuildWorker': false } as Record<string, string | boolean> };
    st().openDocument(d);
    expect(getPref('doc.lengthDecimals')).toBe('.1234'); // the dimensions use it without Options ▸ OK
    expect(getPref('perf.rebuildWorker')).toBe(DEFAULT_PREFS['perf.rebuildWorker']);
    expect(st().doc.properties).toEqual({ 'doc.lengthDecimals': '.1234' });
  });
  it('document properties stay in the document, not in the profile, and do not leak into a new document', () => {
    st().newDocument('part');
    st().setPrefs({ ...st().prefs, 'doc.lengthDecimals': '.1' });
    expect(st().doc.properties?.['doc.lengthDecimals']).toBe('.1');
    expect(stored()['doc.lengthDecimals']).toBeUndefined();
    st().newDocument('part');
    expect(getPref('doc.lengthDecimals')).toBe(DEFAULT_PREFS['doc.lengthDecimals']);
  });
  it('doc.* keys left in an older profile are not read as system options', () => {
    localStorage.setItem('phlippo.prefs', JSON.stringify({ 'doc.lengthDecimals': '.1', 'view.reverseWheel': true }));
    const p = loadPrefs();
    expect(p['doc.lengthDecimals']).toBe(DEFAULT_PREFS['doc.lengthDecimals']);
    expect(p['view.reverseWheel']).toBe(true);
    localStorage.removeItem('phlippo.prefs');
  });
});
