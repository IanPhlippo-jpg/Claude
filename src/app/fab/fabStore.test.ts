// @vitest-environment jsdom
// docs/37 B-1 (a changed rate makes the cost and the quote follow; a result priced with older settings never exports),
// B-4 (Pack and Go without customer data unless asked), B-6 (Reset asks first).
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { setRebuildBudget } from '../../core/features/rebuild';
import { isStale, patchSettings, recompute, resetSettings, useFab, draftQuote } from './fabStore';
import { lf1 } from '../../fab/fixtures';
import { packAndGoFiles } from '../assemblyCommands';
import { createDocument } from '../../core/document/types';
import { defaultSettings } from '../../fab/settings';
import { settingsKey } from '../../fab/analyze';

setRebuildBudget(Infinity);
const st = () => useStore.getState();
beforeEach(() => {
  useFab.setState({ settings: defaultSettings(), result: null, modelKey: '' });
  st().openDocument({ ...lf1(), id: `doc-${Math.random()}` });
});

describe('B-1 prices follow the settings', () => {
  it('a new hourly rate reprices Cost and the quote at once; the result is not stale', () => {
    const r1 = recompute()!;
    const saw1 = r1.cost.regels.find((l) => l.id === 'zagen')!.bedragCent;
    const q1 = draftQuote()!.regels.reduce((t, l) => t + l.prijsCent, 0);
    patchSettings((s) => { s.rates.uurloon = { ...s.rates.uurloon, waarde: 90 }; });
    const r2 = useFab.getState().result!;
    expect(r2.cost.regels.find((l) => l.id === 'zagen')!.bedragCent).toBe(saw1 * 2);
    expect(r2.settings.rates.uurloon.waarde).toBe(90);
    expect(draftQuote()!.regels.reduce((t, l) => t + l.prijsCent, 0)).toBeGreaterThan(q1);
    expect(isStale()).toBe(false);
  });
  it('a result priced with other settings is stale, so its export is blocked', () => {
    recompute();
    // settings changed behind the result's back (as an import in another window): the keys no longer agree
    useFab.setState({ settings: { ...defaultSettings(), rates: { ...defaultSettings().rates, uurloon: { ...defaultSettings().rates.uurloon, waarde: 60 } } } });
    expect(useFab.getState().result!.settingsKey).not.toBe(settingsKey(useFab.getState().settings));
    expect(isStale()).toBe(true);
  });
});

describe('B-10 the key of the model is the whole document', () => {
  it('a property fab.soort = koop (no geometry change) makes the result stale; a new quote does not', () => {
    recompute();
    expect(isStale()).toBe(false);
    st().applyDocument('quote', { ...st().doc, fab: { ...(st().doc.fab ?? {}), klant: { naam: 'x', adres: 'y', soort: 'particulier' } } });
    expect(isStale()).toBe(false);
    st().applyDocument('prop', { ...st().doc, properties: { ...(st().doc.properties ?? {}), 'fab.soort': 'koop' } });
    expect(isStale()).toBe(true);
  });
});

describe('B-4 Pack and Go', () => {
  it('leaves quotes, customer data and prices out of every file unless asked', () => {
    const part = lf1();
    part.fab = { klant: { naam: 'Geheime Klant', adres: 'x', soort: 'particulier' }, kosten: { zagen: { bedragCent: 1, reden: 'r' } } };
    const a = createDocument('Samenstelling', 'assembly');
    a.components = [{ id: 'c1', name: 'LF1<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    st().openDocument({ ...a, id: 'asm' });
    expect(packAndGoFiles().map((f) => f.text).join('\n')).not.toContain('Geheime Klant');
    expect(packAndGoFiles(true).map((f) => f.text).join('\n')).toContain('Geheime Klant');
  });
});

describe('B-6 Reset asks first', () => {
  it('Reset opens a question and changes nothing until it is answered', () => {
    patchSettings((s) => { s.company.naam = 'Mijn zaak'; });
    resetSettings();
    expect(useFab.getState().settings.company.naam).toBe('Mijn zaak');
    expect(st().ask?.title).toMatch(/Reset/);
    st().ask!.yes!('');
    expect(useFab.getState().settings.company.naam).toBe('');
  });
});
