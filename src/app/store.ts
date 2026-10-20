import { create } from 'zustand';
import { createDocument, type Document, type Units } from '../core/document/types';
import { History } from '../core/document/history';
import { autosave, loadAutosave } from '../core/document/persistence';
import { createSketch, newId, removeConstraint, removeEntity, updateConstraint, addConstraint, toggleConstruction } from '../core/sketch/model';
import type { Constraint, ConstraintKind, Id, Sketch, SketchPoint } from '../core/sketch/types';
import { solveSketch, type SolveResult } from '../core/solver/solver';
import { SolverClient } from '../core/solver/solverClient';
import type { SelectionItem } from '../core/sketch/relations';

export type ToolId =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'centerRectangle'
  | 'circle'
  | 'arc3'
  | 'arcCenter'
  | 'spline'
  | 'point'
  | 'dimension'
  | 'trim';

export type RibbonTab = 'sketch' | 'features' | 'assembly' | 'drawing' | 'evaluate';
export type Theme = 'light' | 'dark';
export type PanelId = 'tree' | 'properties' | 'relations' | 'shortcuts';
export type DockSide = 'left' | 'right' | 'float';

export interface PanelLayout {
  side: DockSide;
  visible: boolean;
  /** floating position */
  x?: number;
  y?: number;
}

export interface StatusMessage {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'error';
}

interface State {
  doc: Document;
  /** sketch currently being edited */
  activeSketchId: Id | null;
  solve: Record<Id, SolveResult>;
  selection: SelectionItem[];
  selectedConstraint: Id | null;
  hover: SelectionItem | null;
  tool: ToolId;
  tab: RibbonTab;
  theme: Theme;
  panels: Record<PanelId, PanelLayout>;
  dockWidth: { left: number; right: number };
  messages: StatusMessage[];
  cursor: SketchPoint | null;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: boolean;
  /** rollback: index into features; features after it are hidden */
  rollbackIndex: number | null;
  showRelations: boolean;
  showGrid: boolean;
  snapGrid: boolean;
  gridSize: number;

  // actions
  newDocument(): void;
  openDocument(doc: Document): void;
  setUnits(u: Units): void;
  renameDocument(name: string): void;
  newSketch(plane: Sketch['plane']): void;
  editSketch(id: Id): void;
  exitSketch(): void;
  deleteFeature(id: Id): void;
  renameFeature(id: Id, name: string): void;
  commit(label: string, fn: (s: Sketch) => Sketch): void;
  dragPoint(pointId: Id, target: SketchPoint, phase: 'start' | 'move' | 'end'): void;
  undo(): void;
  redo(): void;
  setTool(t: ToolId): void;
  setTab(t: RibbonTab): void;
  setSelection(sel: SelectionItem[]): void;
  toggleSelect(item: SelectionItem, additive: boolean): void;
  selectConstraint(id: Id | null): void;
  setHover(h: SelectionItem | null): void;
  deleteSelection(): void;
  addRelation(kind: ConstraintKind, refs: Id[], extra?: Partial<Constraint>): void;
  updateDimension(id: Id, patch: Partial<Constraint>): void;
  removeRelation(id: Id): void;
  toggleConstructionSelection(): void;
  setTheme(t: Theme): void;
  setPanel(id: PanelId, patch: Partial<PanelLayout>): void;
  setDockWidth(side: 'left' | 'right', w: number): void;
  pushMessage(text: string, level?: StatusMessage['level']): void;
  setCursor(p: SketchPoint | null): void;
  setRollback(i: number | null): void;
  toggle(key: 'showRelations' | 'showGrid' | 'snapGrid'): void;
}

const history = new History<Document>();
const solver = new SolverClient();
let dragBase: Document | null = null;
let msgSeq = 0;

function solveAll(doc: Document, prev: Record<Id, SolveResult>, only?: Id): { doc: Document; solve: Record<Id, SolveResult> } {
  const solve = { ...prev };
  const sketches = { ...doc.sketches };
  for (const id of Object.keys(sketches)) {
    if (only && id !== only && prev[id]) continue;
    const r = solver.solveSync(sketches[id]);
    solve[id] = r;
    sketches[id] = r.sketch;
  }
  return { doc: { ...doc, sketches }, solve };
}

function historyFlags() {
  return { canUndo: history.canUndo, canRedo: history.canRedo, undoLabel: history.undoLabel, redoLabel: history.redoLabel };
}

const initialDoc = (typeof localStorage !== 'undefined' && loadAutosave()) || createDocument();
const initialSolve = solveAll(initialDoc, {});

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('kalibr.theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const useStore = create<State>((set, get) => ({
  doc: initialSolve.doc,
  activeSketchId: null,
  solve: initialSolve.solve,
  selection: [],
  selectedConstraint: null,
  hover: null,
  tool: 'select',
  tab: 'features',
  theme: typeof window !== 'undefined' ? loadTheme() : 'light',
  panels: {
    tree: { side: 'left', visible: true },
    properties: { side: 'left', visible: true },
    relations: { side: 'right', visible: false },
    shortcuts: { side: 'float', visible: false, x: 300, y: 120 },
  },
  dockWidth: { left: 280, right: 300 },
  messages: [],
  cursor: null,
  ...historyFlags(),
  dirty: false,
  rollbackIndex: null,
  showRelations: true,
  showGrid: true,
  snapGrid: false,
  gridSize: 10,

  newDocument() {
    history.clear();
    const doc = createDocument();
    set({ doc, solve: {}, activeSketchId: null, selection: [], selectedConstraint: null, dirty: false, tab: 'features', ...historyFlags() });
    autosave(doc);
  },
  openDocument(doc) {
    history.clear();
    const r = solveAll(doc, {});
    set({ doc: r.doc, solve: r.solve, activeSketchId: null, selection: [], selectedConstraint: null, dirty: false, tab: 'features', ...historyFlags() });
    autosave(r.doc);
  },
  setUnits(units) {
    const { doc } = get();
    history.push('Eenheden', doc);
    const d = { ...doc, units };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  renameDocument(name) {
    const d = { ...get().doc, name };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  newSketch(plane) {
    const { doc } = get();
    history.push('Nieuwe schets', doc);
    const n = doc.features.filter((f) => f.type === 'sketch').length + 1;
    const sketch = createSketch(newId('sk'), `Schets${n}`, plane);
    const d: Document = {
      ...doc,
      sketches: { ...doc.sketches, [sketch.id]: sketch },
      features: [...doc.features, { id: newId('f'), type: 'sketch', name: sketch.name, sketchId: sketch.id, suppressed: false }],
    };
    const r = solveAll(d, get().solve, sketch.id);
    set({ doc: r.doc, solve: r.solve, activeSketchId: sketch.id, tab: 'sketch', tool: 'line', selection: [], dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  editSketch(id) {
    if (!get().doc.sketches[id]) return;
    set({ activeSketchId: id, tab: 'sketch', tool: 'select', selection: [], selectedConstraint: null });
  },
  exitSketch() {
    set({ activeSketchId: null, tab: 'features', tool: 'select', selection: [], selectedConstraint: null, hover: null });
  },
  deleteFeature(id) {
    const { doc, activeSketchId } = get();
    const f = doc.features.find((x) => x.id === id);
    if (!f) return;
    history.push('Verwijder feature', doc);
    const sketches = { ...doc.sketches };
    delete sketches[f.sketchId];
    const d = { ...doc, sketches, features: doc.features.filter((x) => x.id !== id) };
    const solve = { ...get().solve };
    delete solve[f.sketchId];
    set({ doc: d, solve, activeSketchId: activeSketchId === f.sketchId ? null : activeSketchId, selection: [], dirty: true, ...historyFlags() });
    autosave(d);
  },
  renameFeature(id, name) {
    const { doc } = get();
    const features = doc.features.map((f) => (f.id === id ? { ...f, name } : f));
    const sketches = { ...doc.sketches };
    const f = doc.features.find((x) => x.id === id);
    if (f) sketches[f.sketchId] = { ...sketches[f.sketchId], name };
    const d = { ...doc, features, sketches };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  commit(label, fn) {
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sketch = doc.sketches[activeSketchId];
    if (!sketch) return;
    const next = fn(sketch);
    if (next === sketch) return;
    history.push(label, doc);
    const d = { ...doc, sketches: { ...doc.sketches, [activeSketchId]: next } };
    const r = solveAll(d, get().solve, activeSketchId);
    const res = r.solve[activeSketchId];
    set({ doc: r.doc, solve: r.solve, dirty: true, ...historyFlags() });
    if (res.status === 'conflict') get().pushMessage('Schets is overbepaald: conflicterende relaties (rood).', 'error');
    else if (res.status === 'over') get().pushMessage('Schets heeft redundante relaties (rood).', 'warn');
    autosave(r.doc);
  },
  dragPoint(pointId, target, phase) {
    const { doc, activeSketchId, solve } = get();
    if (!activeSketchId) return;
    if (phase === 'start') {
      dragBase = doc;
      return;
    }
    const sketch = doc.sketches[activeSketchId];
    const r = solver.solveSync(sketch, { drag: { point: pointId, target }, skipAnalysis: phase !== 'end', maxIterations: 30 });
    const d = { ...doc, sketches: { ...doc.sketches, [activeSketchId]: r.sketch } };
    if (phase === 'end') {
      if (dragBase) history.push('Slepen', dragBase);
      dragBase = null;
      const full = solver.solveSync(r.sketch);
      const d2 = { ...d, sketches: { ...d.sketches, [activeSketchId]: full.sketch } };
      set({ doc: d2, solve: { ...solve, [activeSketchId]: full }, dirty: true, ...historyFlags() });
      autosave(d2);
    } else {
      set({ doc: d, solve: { ...solve, [activeSketchId]: { ...solve[activeSketchId], sketch: r.sketch } } });
    }
  },
  undo() {
    const { doc } = get();
    const e = history.undo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    set({ doc: r.doc, solve: r.solve, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  redo() {
    const { doc } = get();
    const e = history.redo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    set({ doc: r.doc, solve: r.solve, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  setTool(tool) {
    set({ tool, selectedConstraint: null });
    if (tool !== 'select') set({ selection: [] });
  },
  setTab(tab) {
    set({ tab });
  },
  setSelection(selection) {
    set({ selection, selectedConstraint: null });
  },
  toggleSelect(item, additive) {
    const { selection } = get();
    const exists = selection.some((s) => s.kind === item.kind && s.id === item.id);
    if (additive) set({ selection: exists ? selection.filter((s) => !(s.kind === item.kind && s.id === item.id)) : [...selection, item], selectedConstraint: null });
    else set({ selection: exists && selection.length === 1 ? [] : [item], selectedConstraint: null });
  },
  selectConstraint(id) {
    set({ selectedConstraint: id, selection: [] });
  },
  setHover(hover) {
    const cur = get().hover;
    if (cur?.id === hover?.id && cur?.kind === hover?.kind) return;
    set({ hover });
  },
  deleteSelection() {
    const { selection, selectedConstraint } = get();
    if (selectedConstraint) {
      get().removeRelation(selectedConstraint);
      return;
    }
    const ids = selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    if (!ids.length) return;
    get().commit('Verwijderen', (s) => {
      let out = s;
      for (const id of ids) out = removeEntity(out, id);
      return out;
    });
    set({ selection: [] });
  },
  addRelation(kind, refs, extra = {}) {
    get().commit(`Relatie: ${kind}`, (s) => addConstraint(s, kind, refs, extra)[0]);
  },
  updateDimension(id, patch) {
    get().commit('Maat wijzigen', (s) => updateConstraint(s, id, patch));
  },
  removeRelation(id) {
    get().commit('Relatie verwijderen', (s) => removeConstraint(s, id));
    set({ selectedConstraint: null });
  },
  toggleConstructionSelection() {
    const ids = get().selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    if (!ids.length) return;
    get().commit('Constructie', (s) => toggleConstruction(s, ids));
  },
  setTheme(theme) {
    set({ theme });
    try {
      localStorage.setItem('kalibr.theme', theme);
    } catch {
      /* ignore */
    }
  },
  setPanel(id, patch) {
    set({ panels: { ...get().panels, [id]: { ...get().panels[id], ...patch } } });
  },
  setDockWidth(side, w) {
    set({ dockWidth: { ...get().dockWidth, [side]: Math.max(200, Math.min(600, w)) } });
  },
  pushMessage(text, level = 'info') {
    const id = ++msgSeq;
    set({ messages: [...get().messages.slice(-4), { id, text, level }] });
    setTimeout(() => set({ messages: get().messages.filter((m) => m.id !== id) }), 6000);
  },
  setCursor(cursor) {
    set({ cursor });
  },
  setRollback(rollbackIndex) {
    set({ rollbackIndex });
  },
  toggle(key) {
    set({ [key]: !get()[key] } as Partial<State>);
  },
}));

/** Convenience selectors */
export const useActiveSketch = () =>
  useStore((s) => (s.activeSketchId ? s.doc.sketches[s.activeSketchId] ?? null : null));
export const useActiveSolve = () => useStore((s) => (s.activeSketchId ? s.solve[s.activeSketchId] ?? null : null));

export { solveSketch };
