/**
 * Store slice "document" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { createDocument, type Document, type ImportedFeature } from '../../core/document/types';
import { autosave, validateDocument } from '../../core/document/persistence';
import { newId } from '../../core/sketch/model';
import { loadPrefs } from '../prefs';
import { isAssembly, isDrawing } from '../../core/document/types';
import type { State, StoreSet, StoreGet, Library } from '../store';
import { initialSolve, initialRebuild, history, rebuildFor, whenRebuilt, historyFlags, featureName, solveAll, saveLibraries } from '../store';

type DocumentKeys =
  | 'doc' | 'rebuild' | 'openSeq' | 'hasDocument' | 'sessionParts' | 'exportFormat' | 'dirty'
  | 'newDocument' | 'importMesh' | 'applyDocument' | 'openDocument' | 'rebuildAll' | 'showDocument'
  | 'setUnits' | 'renameDocument' | 'renameLibrary' | 'importLibrary' | 'exportLibrary' | 'undo'
  | 'redo';

/** the part being replaced stays open in the session (as a part with a body), most recent first */
function keepInSession(get: StoreGet, set: StoreSet) {
  const { doc, hasDocument, rebuild, sessionParts } = get();
  if (!hasDocument || isAssembly(doc) || isDrawing(doc) || !rebuild.bodies.length) return;
  set({ sessionParts: [doc, ...sessionParts.filter((p) => p.name !== doc.name)].slice(0, 10) });
}

export const documentSlice = (set: StoreSet, get: StoreGet): Pick<State, DocumentKeys> => ({
  doc: initialSolve.doc,
  rebuild: initialRebuild,
  openSeq: 0,
  hasDocument: false,
  exportFormat: 'stl',
  dirty: false,
  sessionParts: [],
  newDocument(kind = 'part') {
    keepInSession(get, set);
    history.clear();
    const n = kind === 'assembly' ? 'Assem1' : kind === 'drawing' ? 'Draw1' : 'Part1';
    const doc = createDocument(n, kind);
    set({ doc, hasDocument: true, solve: {}, rebuild: rebuildFor(doc, null), activeSketchId: null, featureEdit: null, mateEdit: null, insertingComponent: kind === 'assembly', asmTool: 'select', selectedFeatureId: null, selectedFace: null, selectedFaces: [], selection: [], selectedConstraint: null, dirty: false, tab: kind === 'assembly' ? 'assembly' : kind === 'drawing' ? 'viewLayout' : 'features', drawingEdit: null, selectedDrawingViewId: null, rollbackIndex: null, ...historyFlags() });
    autosave(doc);
  },
  importMesh(source, positions) {
    const { doc } = get();
    const base = source.replace(/\.[^.]+$/, '') || 'Imported';
    const fresh = !doc.features.length && !Object.keys(doc.sketches).length;
    const start: Document = fresh ? { ...doc, name: base } : doc;
    history.push('Import', doc);
    const list = (positions.length && Array.isArray(positions[0]) ? positions : [positions]) as number[][];
    let d: Document = start;
    const added: ImportedFeature[] = [];
    for (const pos of list) {
      const feature: ImportedFeature = { id: newId('f'), type: 'imported', name: featureName(d, 'imported'), suppressed: false, positions: pos, source };
      added.push(feature);
      d = { ...d, features: [...d.features, feature] };
    }
    const rebuild = rebuildFor(d, null);
    set({ doc: d, rebuild, activeSketchId: null, featureEdit: null, selectedFeatureId: added[added.length - 1]?.id ?? null, selectedFace: null, selection: [], dirty: true, tab: 'features', rollbackIndex: null, ...historyFlags() });
    autosave(d);
    whenRebuilt(rebuild, (rebuild) => {
      const failed = added.filter((f) => rebuild.errors[f.id]);
      const triangles = list.reduce((n, p) => n + p.length / 9, 0);
      if (failed.length) get().pushMessage(`${failed[0].name}: ${rebuild.errors[failed[0].id]}`, 'error');
      else if (added.length === 1) get().pushMessage(`${source} imported as ${added[0].name} (${triangles} triangles).`);
      else get().pushMessage(`${source} imported: ${added.length} bodies, ${added[0].name} to ${added[added.length - 1].name} (${triangles} triangles).`);
    });
  },
  applyDocument(label, d) {
    history.push(label, get().doc);
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  openDocument(doc, opts) {
    // solved and rebuilt before anything changes: a document that cannot be opened leaves the current one (and its autosave) as it is
    let r: ReturnType<typeof solveAll>, rebuild: ReturnType<typeof rebuildFor>;
    try {
      validateDocument(doc);
      r = solveAll(doc, {});
      rebuild = rebuildFor(r.doc, null);
    } catch (err) {
      get().pushMessage(`Cannot open ${doc?.name ?? 'the document'}: ${(err as Error).message}`, 'error');
      return;
    }
    if (!opts?.keepHistory) history.clear();
    if (get().doc !== doc && get().doc.name !== doc.name) keepInSession(get, set);
    set({ prefs: { ...loadPrefs(), ...(doc.properties ?? {}) } });
    set({ openSeq: get().openSeq + 1, hasDocument: true, doc: r.doc, solve: r.solve, rebuild, activeSketchId: null, featureEdit: null, mateEdit: null, insertingComponent: false, asmTool: 'select', selectedFeatureId: null, selectedFace: null, selectedFaces: [], selection: [], selectedConstraint: null, dirty: false, tab: isAssembly(r.doc) ? 'assembly' : isDrawing(r.doc) ? 'viewLayout' : 'features', drawingEdit: null, selectedDrawingViewId: null, rollbackIndex: null, editContext: null, messages: get().messages.filter((m) => m.level !== 'info'), whatsWrong: Object.keys(rebuild.errors).length > 0, ...historyFlags() });
    autosave(r.doc);
    if (rebuild.pending) whenRebuilt(rebuild, (rb) => { if (Object.keys(rb.errors).length) set({ whatsWrong: true }); });
  },
  rebuildAll() {
    const { doc, rollbackIndex } = get();
    const r = solveAll(doc, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, rollbackIndex) });
  },
  showDocument() {
    set({ hasDocument: true, dialog: null, openSeq: get().openSeq + 1 });
  },
  setUnits(units) {
    const { doc } = get();
    history.push('Units', doc);
    const d = { ...doc, units };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  renameDocument(name) {
    const { doc } = get();
    if (doc.name === name) return;
    history.push('Rename document', doc);
    const d = { ...doc, name };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  renameLibrary(id, name) {
    const libraries = get().libraries.map((l) => (l.id === id ? { ...l, name } : l));
    set({ libraries });
    saveLibraries(libraries);
  },
  importLibrary(json) {
    try {
      const raw = JSON.parse(json) as { format?: string; library?: Library };
      if (raw.format !== 'phlippo-library' || !raw.library) throw new Error('Not a Phlippo library file');
      const lib: Library = { ...raw.library, id: newId('lib') };
      const libraries = [...get().libraries, lib];
      set({ libraries });
      saveLibraries(libraries);
      get().pushMessage(`Library "${lib.name}" imported (${lib.items.length} items).`);
    } catch (err) {
      get().pushMessage(`Cannot import library: ${(err as Error).message}`, 'error');
    }
  },
  exportLibrary(id) {
    const lib = get().libraries.find((l) => l.id === id);
    return lib ? JSON.stringify({ format: 'phlippo-library', version: 1, library: lib }, null, 2) : null;
  },
  undo() {
    const { doc } = get();
    const e = history.undo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    const activeSketchId = get().activeSketchId && r.doc.sketches[get().activeSketchId!] ? get().activeSketchId : null;
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  redo() {
    const { doc } = get();
    const e = history.redo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    const activeSketchId = get().activeSketchId && r.doc.sketches[get().activeSketchId!] ? get().activeSketchId : null;
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
});
