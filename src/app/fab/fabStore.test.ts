// @vitest-environment jsdom
// docs/37 B-1 (a changed rate makes the cost and the quote follow; a result priced with older settings never exports),
// B-4 (Pack and Go without customer data unless asked), B-6 (Reset asks first).
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { setRebuildBudget } from '../../core/features/rebuild';
import { isStale, patchSettings, recompute, resetSettings, useFab, draftQuote, exportQuote, cancelCommand, confirmSettings, patchFab, runNest, cancelNest, moveNestPiece } from './fabStore';
import { pp1 } from '../../fab/fixtures';
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

describe('N-1 / N-2 the cross of a command undoes only its own edits', () => {
  const exportPdf = async () => {
    exportQuote('pdf');
    st().ask?.yes?.('');
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 5));
  };
  it('N-1: an exported quote stays in the document after Cancel, and the same quote keeps its number', async () => {
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    patchFab('customer', (f) => ({ ...f, klant: { naam: 'Klant N1', adres: 'x', soort: 'particulier' } }));
    recompute();
    useFab.setState({ command: 'quote' as never });
    await exportPdf();
    const nr = st().doc.fab?.quotes?.[0]?.nummer;
    expect(nr).toMatch(/^\d{4}-\d{3}$/);
    patchFab('series', (f) => ({ ...f, reeks: 7 }));
    cancelCommand();
    expect(st().doc.fab?.quotes?.map((q) => q.nummer)).toEqual([nr]);
    // the panel's own edit is undone, the export is not
    expect(st().doc.fab?.reeks).toBeUndefined();
    useFab.setState({ command: 'quote' as never });
    await exportPdf();
    expect(new Set(st().doc.fab?.quotes?.map((q) => q.nummer))).toEqual(new Set([nr]));
  });
  it('N-2: settings confirmed with OK in Fabrication Settings survive the Cancel of the command; the margin of the panel is undone', () => {
    recompute();
    useFab.setState({ command: 'quote' as never });
    const marge0 = useFab.getState().settings.rates.marge.waarde;
    patchSettings((x) => { x.rates.marge = { ...x.rates.marge, waarde: marge0 + 10 }; });
    useFab.setState({ settingsOpen: true });
    patchSettings((x) => { x.company.naam = 'Testbedrijf'; });
    confirmSettings();
    patchSettings((x) => { x.rates.marge = { ...x.rates.marge, waarde: marge0 + 20 }; });
    cancelCommand();
    expect(useFab.getState().settings.company.naam).toBe('Testbedrijf');
    // OK confirmed the margin as it stood then (+10); the edit after OK (+20) is undone
    expect(useFab.getState().settings.rates.marge.waarde).toBe(marge0 + 10);
  });
  it('N-8: when another model is open by the time the save dialog closes, the quote record never goes into that one', async () => {
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    recompute();
    exportQuote('pdf');
    st().ask?.yes?.('');
    // the save dialog is open; Ian opens another model meanwhile
    st().openDocument({ ...lf1(), name: 'Ander model', id: 'other' });
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 5));
    expect(st().doc.id).toBe('other');
    expect(st().doc.fab?.quotes ?? []).toEqual([]);
  });
});

describe('P3.6 / P3.9 the nest runs in a worker, Cancel stops it; a piece moved onto another turns red', () => {
  it('the worker is started, Cancel Nesting terminates it and clears the busy mark; without a worker it nests right here', () => {
    const made: { terminated: boolean; sent: unknown[] }[] = [];
    class FakeWorker { terminated = false; sent: unknown[] = []; onmessage: unknown = null; onerror: unknown = null;
      constructor() { made.push(this); } postMessage(m: unknown) { this.sent.push(m); } terminate() { this.terminated = true; } }
    const keep = (globalThis as { Worker?: unknown }).Worker;
    (globalThis as { Worker?: unknown }).Worker = FakeWorker;
    try {
      st().openDocument({ ...pp1(), id: 'pp1' });
      recompute();
      runNest();
      expect(made.length).toBe(1);
      expect(useFab.getState().nestBusy).toBe(true);
      cancelNest();
      expect(made[0].terminated).toBe(true);
      expect(useFab.getState().nestBusy).toBe(false);
      expect(useFab.getState().nests).toEqual([]);
    } finally { (globalThis as { Worker?: unknown }).Worker = keep; }
    delete (globalThis as { Worker?: unknown }).Worker;
    runNest();
    expect(useFab.getState().nests.length).toBe(1);
    (globalThis as { Worker?: unknown }).Worker = keep;
  });
  it('moving a piece over another marks both red and blocks the nest export; moving it back clears it', () => {
    const d = pp1();
    st().openDocument({ ...d, id: 'pp1b' });
    const keep = (globalThis as { Worker?: unknown }).Worker;
    delete (globalThis as { Worker?: unknown }).Worker;
    try {
      recompute();
      const r = useFab.getState().result!;
      useFab.setState({ result: { ...r, flats: r.flats.map((f) => ({ ...f, n: 2 })) } });
      runNest();
      const sh = useFab.getState().nests[0].bladen[0];
      expect(sh.stukken.length).toBe(2);
      const [a, b] = sh.stukken;
      moveNestPiece(0, 0, 1, a.x - b.x, a.y - b.y);
      expect(useFab.getState().nestBad[0].sort()).toEqual(['0:0', '0:1']);
      expect(useFab.getState().nests[0].status).toBe('handmatig');
      moveNestPiece(0, 0, 1, b.x - a.x, b.y - a.y);
      expect(useFab.getState().nestBad[0]).toEqual([]);
    } finally { (globalThis as { Worker?: unknown }).Worker = keep; }
  });
});


describe('L3.5 / FeatureManager folders: weld joints and quotes in the tree; dragging a joint reorders the weld sequence', () => {
  it('the folders come from doc.fab; a joint dropped below another moves there and the order is kept', async () => {
    const { fabFolders } = await import('../panels/fabTreeNodes');
    const { analyze } = await import('../../fab/analyze');
    const d = lf1();
    const a = analyze(d, defaultSettings(), { exc: 'EXC2' });
    const welds = a.joints.map((j) => ({ ...j, bevestigd: true }));
    st().openDocument({ ...d, id: 'tree', fab: { exc: 'EXC2', welds, quotes: [{ nummer: '2026-001', datum: '2026-11-19', klant: { naam: 'x', adres: 'y', soort: 'particulier' },
      regels: [], btwRegime: 'normaal' } as never] } });
    const nodes = fabFolders(st().doc, st().applyDocument);
    expect(nodes.map((n) => n.id)).toEqual(['fab-welds', 'fab-quotes']);
    const kids = nodes[0].children!;
    const order = kids.map((k) => k.id);
    // drop the first joint below the third
    kids[2].drag!.onDrop(order[0]);
    const after = [...st().doc.fab!.welds!].sort((x, y) => x.stap - y.stap).map((w) => 'fabweld-' + w.id);
    expect(after.slice(0, 3)).toEqual([order[1], order[2], order[0]]);
    expect(st().doc.fab!.lasvolgordeHandmatig).toBe(true);
    expect(kids[0].drag!.canDrop(order[0])).toBe(false);
  });
});
