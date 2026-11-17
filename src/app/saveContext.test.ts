// @vitest-environment jsdom
// QA 0.5.14 advice: P1-1 (Save during Edit Component), P1-2 (restart without losing work), P2-13 (the edited part is
// found by its id), P2-15 (Undo with an open Property Panel). Each test fails on the code of 0.5.14.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';
import { createDocument, type Document } from '../core/document/types';
import { saveDocument } from './MenuBar';
import { handleFor, setDocumentHandle } from './desktop';
import { restartForGraphics } from './softwareGL';
import { parseDocument } from '../core/document/persistence';
import { assemblyWithEditedPart } from './editContext';

const st = () => useStore.getState();
const part = (name: string, id?: string): Document => ({ ...createDocument(name, 'part'), ...(id ? { id } : {}) });
const comp = (id: string, p: Document, x: number) => ({ id, name: `${p.name}<${id}>`, part: p, position: [x, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number], fixed: x === 0, suppressed: false });

function assembly(): Document {
  // two different parts that happen to have the same name (two files Pin.kcad from different folders)
  return { ...createDocument('Pins', 'assembly'), id: 'asm1', components: [comp('c1', part('Pin', 'p1'), 0), comp('c2', part('Pin', 'p2'), 50)] } as Document;
}

interface Written { handle?: string; text: string }
let writes: Written[] = [];
const win = window as unknown as Record<string, unknown>;
beforeEach(() => {
  writes = [];
  win.phlippoDesktop = {
    saveFile: async (o: { handle?: string; data: ArrayBuffer }) => {
      writes.push({ handle: o.handle, text: new TextDecoder().decode(o.data) });
      return { name: 'Pins.kcad', handle: o.handle ?? 'h-new' };
    },
    removeRecover: async () => {},
  };
  useStore.setState({ ask: null });
});
afterEach(() => {
  delete win.phlippoDesktop;
  setDocumentHandle(null);
});

describe('P1-1 Save during Edit Component', () => {
  it('writes the assembly with the edited part to the assembly file, and the edit stays open', async () => {
    st().openDocument(assembly());
    setDocumentHandle('h-asm', st().doc.id);
    st().editComponent('c1');
    expect(st().doc.kind).toBe('part');
    st().applyDocument('Units', { ...st().doc, units: 'in' });
    expect(await saveDocument()).toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0].handle).toBe('h-asm');
    const saved = parseDocument(writes[0].text);
    expect(saved.kind).toBe('assembly');
    expect(saved.name).toBe('Pins');
    const [c1, c2] = saved.components!;
    expect(c1.part.units).toBe('in');
    // P2-13: the other part with the same name is not replaced by the edited one
    expect(c2.part.id).toBe('p2');
    expect(c2.part.units).toBe('mm');
    // the part is still being edited and keeps its own name; the document counts as saved
    expect(st().editContext).not.toBeNull();
    expect(st().doc.kind).toBe('part');
    expect(st().doc.name).toBe('Pin');
    expect(st().dirty).toBe(false);
    // back in the assembly nothing is unsaved: the change was written with it
    st().returnToAssembly();
    expect(st().doc.kind).toBe('assembly');
    expect(st().doc.components![0].part.units).toBe('in');
    expect(st().dirty).toBe(false);
  });

  it('a change made while the file is being written keeps the document unsaved (P3-5)', async () => {
    st().newDocument('part');
    setDocumentHandle('h-part', st().doc.id);
    st().applyDocument('Units', { ...st().doc, units: 'in' });
    const api = win.phlippoDesktop as { saveFile: (o: { handle?: string; data: ArrayBuffer }) => Promise<unknown> };
    const write = api.saveFile;
    api.saveFile = async (o) => { st().applyDocument('Units', { ...st().doc, units: 'cm' }); return write(o); };
    expect(await saveDocument()).toBe(true);
    expect(st().dirty).toBe(true);
  });

  it('a handle is never used for a document it does not belong to', () => {
    setDocumentHandle('h-asm', 'asm1');
    expect(handleFor('asm1')).toBe('h-asm');
    expect(handleFor('p1')).toBeNull();
  });

  it('parts without an id (older files) fall back to the component that was opened and to the name', () => {
    const a = { ...createDocument('Old', 'assembly'), components: [comp('c1', part('Bracket'), 0), comp('c2', part('Other'), 50)] } as Document;
    const merged = assemblyWithEditedPart({ assembly: a, componentName: 'Bracket<c1>', componentId: 'c1', partName: 'Bracket' }, { ...part('Bracket'), units: 'in' });
    expect(merged.components!.map((c) => c.part.units)).toEqual(['in', 'mm']);
  });
});

describe('P1-2 restart for the graphics choice', () => {
  const fakeApi = () => {
    const calls: string[] = [];
    const api = {
      setSoftwareGL: async (on: boolean) => { calls.push(`gl:${on}`); return true; },
      restartApp: async (o?: { force?: boolean }) => { calls.push(`restart:${o?.force === true}`); return true; },
    };
    return { api: api as never, calls };
  };
  it('asks to save first; Cancel changes nothing', async () => {
    st().newDocument('part');
    useStore.setState({ dirty: true });
    const { api, calls } = fakeApi();
    restartForGraphics(api, true);
    await Promise.resolve();
    expect(st().ask).not.toBeNull();
    expect(calls).toEqual([]);
    useStore.setState({ ask: null });
  });
  it('after the answer the choice is stored and the restart is forced', async () => {
    const { api, calls } = fakeApi();
    restartForGraphics(api, true, (then) => then());
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual(['gl:true', 'restart:true']);
    expect(st().prefs['perf.softwareOpenGL']).toBe(true);
    restartForGraphics(api, false, (then) => then());
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe('P2-15 Undo with an open Property Panel', () => {
  it('cancels the panel and leaves the document history alone', () => {
    st().newDocument('part');
    st().applyDocument('Units', { ...st().doc, units: 'in' });
    const before = st().doc;
    useStore.setState({ featureEdit: { featureId: null, draft: { id: 'x', type: 'fillet', name: 'Fillet1', suppressed: false } } as never });
    st().undo();
    expect(st().featureEdit).toBeNull();
    expect(st().doc).toBe(before);
    expect(st().canUndo).toBe(true);
    st().undo();
    expect(st().doc.units).toBe('mm');
  });
  it('a rollback bar past the end of the restored feature list is dropped', () => {
    st().newDocument('part');
    const f = (id: string) => ({ id, type: 'sketch', name: id, sketchId: 'none', suppressed: false }) as never;
    st().applyDocument('A', { ...st().doc, features: [f('a'), f('b'), f('c')] });
    useStore.setState({ rollbackIndex: 2 });
    st().undo();
    expect(st().doc.features).toHaveLength(0);
    expect(st().rollbackIndex).toBeNull();
  });
});
