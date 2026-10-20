import { create } from 'zustand';
import { createDocument, type Document, type Units } from '../core/document/types';
import { History } from '../core/document/history';
import { autosave, loadAutosave } from '../core/document/persistence';
import { createSketch, mirrorEntities, newId, removeConstraint, removeEntity, updateConstraint, addConstraint, toggleConstruction } from '../core/sketch/model';
import type { Constraint, ConstraintKind, Id, Sketch, SketchPoint } from '../core/sketch/types';
import { solveSketch, type SolveResult } from '../core/solver/solver';
import { SolverClient } from '../core/solver/solverClient';
import type { SelectionItem } from '../core/sketch/relations';

export type ToolId =
  | 'select'
  | 'line'
  | 'centerline'
  | 'rectangle'
  | 'centerRectangle'
  | 'circle'
  | 'arc3'
  | 'arcCenter'
  | 'spline'
  | 'point'
  | 'polygon'
  | 'dimension'
  | 'trim';

export type RibbonTab = 'sketch' | 'features' | 'assembly' | 'drawing' | 'evaluate' | 'markup' | 'mbd' | 'addins';
export type Theme = 'light' | 'dark';
export type PanelId = 'manager' | 'relations' | 'shortcuts';
export type ManagerTab = 'tree' | 'properties' | 'configurations';
export type DisplayStyle = 'wireframe' | 'hiddenVisible' | 'hiddenRemoved' | 'shaded' | 'shadedEdges';
export type UnitSystem = 'MKS' | 'CGS' | 'MMGS' | 'IPS';
export type TaskPaneTab = 'library' | 'relations' | 'properties' | 'resources' | null;
export type DialogId = 'welcome' | 'new' | 'options' | 'orientation' | null;
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
  managerTab: ManagerTab;
  managerCollapsed: boolean;
  treeFilter: string;
  /** "Sketch" was clicked without an active sketch: user picks a plane in the graphics area */
  planePick: boolean;
  hoverPlane: Sketch['plane'] | null;
  displayStyle: DisplayStyle;
  show: { planes: boolean; origin: boolean; sketches: boolean; relations: boolean; grid: boolean; viewSelector: boolean };
  reverseWheel: boolean;
  unitSystem: UnitSystem;
  lastTool: ToolId;
  viewName: string;
  taskPane: TaskPaneTab;
  dialog: DialogId;
  /** confirmation corner moved to the cursor by the D key */
  confirmAtCursor: { x: number; y: number } | null;
  /** Modify-dialog for a dimension, screen position */
  modify: { id: Id; x: number; y: number } | null;
  /** cursor system-feedback symbol */
  feedback: string | null;
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
  shadedContours: boolean;

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
  toggle(key: 'showRelations' | 'showGrid' | 'snapGrid' | 'shadedContours'): void;
  setManagerTab(t: ManagerTab): void;
  setManagerCollapsed(v: boolean): void;
  setTreeFilter(v: string): void;
  startPlanePick(): void;
  cancelPlanePick(): void;
  setHoverPlane(p: Sketch['plane'] | null): void;
  setDisplayStyle(s: DisplayStyle): void;
  toggleShow(key: keyof State['show']): void;
  setReverseWheel(v: boolean): void;
  setUnitSystem(u: UnitSystem): void;
  setViewName(n: string): void;
  setTaskPane(t: TaskPaneTab): void;
  setDialog(d: DialogId): void;
  setConfirmAtCursor(p: { x: number; y: number } | null): void;
  setModify(m: { id: Id; x: number; y: number } | null): void;
  setFeedback(f: string | null): void;
  discardSketch(): void;
  repeatLastTool(): void;
  mirrorSelection(): void;
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
    const t = localStorage.getItem('phlippo.theme');
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
    manager: { side: 'left', visible: true },
    relations: { side: 'right', visible: false },
    shortcuts: { side: 'float', visible: false, x: 300, y: 120 },
  },
  dockWidth: { left: 290, right: 300 },
  managerTab: 'tree',
  managerCollapsed: false,
  treeFilter: '',
  planePick: false,
  hoverPlane: null,
  displayStyle: 'shadedEdges',
  show: { planes: false, origin: true, sketches: true, relations: true, grid: false, viewSelector: false },
  reverseWheel: typeof localStorage !== 'undefined' && localStorage.getItem('phlippo.reverseWheel') === 'true',
  unitSystem: 'MMGS',
  lastTool: 'line',
  viewName: '*Isometric',
  taskPane: null,
  dialog: typeof localStorage !== 'undefined' && loadAutosave() ? null : 'welcome',
  confirmAtCursor: null,
  modify: null,
  feedback: null,
  messages: [],
  cursor: null,
  ...historyFlags(),
  dirty: false,
  rollbackIndex: null,
  showRelations: true,
  showGrid: false,
  snapGrid: false,
  gridSize: 10,
  shadedContours: true,

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
    history.push('Units', doc);
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
    history.push('New sketch', doc);
    const n = doc.features.filter((f) => f.type === 'sketch').length + 1;
    const sketch = createSketch(newId('sk'), `Sketch${n}`, plane);
    const d: Document = {
      ...doc,
      sketches: { ...doc.sketches, [sketch.id]: sketch },
      features: [...doc.features, { id: newId('f'), type: 'sketch', name: sketch.name, sketchId: sketch.id, suppressed: false }],
    };
    const r = solveAll(d, get().solve, sketch.id);
    set({ doc: r.doc, solve: r.solve, activeSketchId: sketch.id, tab: 'sketch', tool: 'select', selection: [], dirty: true, planePick: false, hoverPlane: null, managerTab: 'tree', ...historyFlags() });
    autosave(r.doc);
  },
  editSketch(id) {
    if (!get().doc.sketches[id]) return;
    set({ activeSketchId: id, tab: 'sketch', tool: 'select', selection: [], selectedConstraint: null, planePick: false, managerTab: 'tree' });
  },
  exitSketch() {
    set({ activeSketchId: null, tab: 'features', tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, managerTab: 'tree' });
  },
  discardSketch() {
    // undo everything back to the moment the sketch was opened is not tracked; discard = delete if empty, else keep
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    if (sk && sk.entityOrder.length === 0) {
      const f = doc.features.find((x) => x.sketchId === activeSketchId);
      if (f) get().deleteFeature(f.id);
    }
    get().exitSketch();
  },
  repeatLastTool() {
    if (get().activeSketchId) get().setTool(get().lastTool);
  },
  mirrorSelection() {
    const { selection, activeSketchId, doc } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    const ents = selection.filter((s) => s.kind === 'entity').map((s) => sk.entities[s.id]).filter(Boolean);
    const axis = ents.find((e) => e.kind === 'line' && e.construction) ?? [...ents].reverse().find((e) => e.kind === 'line');
    if (!axis) {
      get().pushMessage('Select the entities to mirror and a (construction) line as the mirror axis.', 'warn');
      return;
    }
    const ids = ents.filter((e) => e.id !== axis.id).map((e) => e.id);
    if (!ids.length) return;
    get().commit('Mirror entities', (s) => mirrorEntities(s, ids, axis.id));
    set({ selection: [] });
  },
  deleteFeature(id) {
    const { doc, activeSketchId } = get();
    const f = doc.features.find((x) => x.id === id);
    if (!f) return;
    history.push('Delete feature', doc);
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
    if (res.status === 'conflict') get().pushMessage('The sketch is over defined: conflicting relations are shown in red.', 'error');
    else if (res.status === 'over') get().pushMessage('The sketch is over defined: redundant relations are shown in red.', 'warn');
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
      if (dragBase) history.push('Drag', dragBase);
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
    set({ tool, selectedConstraint: null, modify: null });
    if (tool !== 'select') set({ selection: [], lastTool: tool });
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
    get().commit('Delete', (s) => {
      let out = s;
      for (const id of ids) out = removeEntity(out, id);
      return out;
    });
    set({ selection: [] });
  },
  addRelation(kind, refs, extra = {}) {
    get().commit(`Add relation: ${kind}`, (s) => addConstraint(s, kind, refs, extra)[0]);
  },
  updateDimension(id, patch) {
    get().commit('Modify dimension', (s) => updateConstraint(s, id, patch));
  },
  removeRelation(id) {
    get().commit('Delete relation', (s) => removeConstraint(s, id));
    set({ selectedConstraint: null });
  },
  toggleConstructionSelection() {
    const ids = get().selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    if (!ids.length) return;
    get().commit('Construction geometry', (s) => toggleConstruction(s, ids));
  },
  setTheme(theme) {
    set({ theme });
    try {
      localStorage.setItem('phlippo.theme', theme);
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
  setManagerTab(managerTab) {
    set({ managerTab });
  },
  setManagerCollapsed(managerCollapsed) {
    set({ managerCollapsed });
  },
  setTreeFilter(treeFilter) {
    set({ treeFilter });
  },
  startPlanePick() {
    set({ planePick: true, tab: 'sketch' });
    get().pushMessage('Select a plane on which to create the sketch for the feature.');
  },
  cancelPlanePick() {
    set({ planePick: false, hoverPlane: null });
  },
  setHoverPlane(hoverPlane) {
    if (get().hoverPlane !== hoverPlane) set({ hoverPlane });
  },
  setDisplayStyle(displayStyle) {
    set({ displayStyle });
  },
  toggleShow(key) {
    const show = { ...get().show, [key]: !get().show[key] };
    set({ show, showGrid: show.grid, showRelations: show.relations });
  },
  setReverseWheel(reverseWheel) {
    set({ reverseWheel });
    try {
      localStorage.setItem('phlippo.reverseWheel', String(reverseWheel));
    } catch {
      /* ignore */
    }
  },
  setUnitSystem(unitSystem) {
    const units: Units = unitSystem === 'IPS' ? 'in' : unitSystem === 'CGS' ? 'cm' : unitSystem === 'MKS' ? 'm' : 'mm';
    set({ unitSystem });
    get().setUnits(units);
  },
  setViewName(viewName) {
    if (get().viewName !== viewName) set({ viewName });
  },
  setTaskPane(taskPane) {
    set({ taskPane: get().taskPane === taskPane ? null : taskPane });
  },
  setDialog(dialog) {
    set({ dialog });
  },
  setConfirmAtCursor(confirmAtCursor) {
    set({ confirmAtCursor });
  },
  setModify(modify) {
    set({ modify });
  },
  setFeedback(feedback) {
    if (get().feedback !== feedback) set({ feedback });
  },
}));

/** Convenience selectors */
export const useActiveSketch = () =>
  useStore((s) => (s.activeSketchId ? s.doc.sketches[s.activeSketchId] ?? null : null));
export const useActiveSolve = () => useStore((s) => (s.activeSketchId ? s.solve[s.activeSketchId] ?? null : null));

export { solveSketch };
