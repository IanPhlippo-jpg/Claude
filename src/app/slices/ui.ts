/**
 * Store slice "ui" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { type Document, type Units } from '../../core/document/types';
import { autosave } from '../../core/document/persistence';
import { newId } from '../../core/sketch/model';
import type { Id } from '../../core/sketch/types';
import { extractBlock, insertBlock } from '../../core/sketch/blocks';
import type { State, StoreSet, StoreGet, Library, LibraryItem } from '../store';
import { loadTheme, loadLibraries, history, historyFlags, saveLibraries } from '../store';

type UiKeys =
  | 'viewportLayout' | 'pmPinned' | 'handleDrag' | 'dir2Pick' | 'finalImage' | 'setFinalImage'
  | 'whatsWrong' | 'sensorEdit' | 'curveColorEdit' | 'flangeProfileEdit' | 'sketchFocusLocked' | 'setSensorEdit' | 'detailedPreview' | 'toggleDetailedPreview' | 'tab' | 'selFilter'
  | 'theme' | 'panels' | 'dockWidth' | 'managerTab' | 'managerCollapsed' | 'treeFilter'
  | 'displayStyle' | 'show' | 'reverseWheel' | 'unitSystem' | 'viewName' | 'taskPane'
  | 'dialog' | 'lastCommand' | 'confirmDelete' | 'ask' | 'feedback' | 'libraries'
  | 'messages' | 'showGrid' | 'snapGrid' | 'gridSize' | 'shadedContours' | 'setViewportLayout'
  | 'addSensor' | 'deleteSensor' | 'togglePmPinned' | 'setLastCommand' | 'createLibrary' | 'deleteLibrary'
  | 'addLibraryItem' | 'deleteLibraryItem' | 'placeItem' | 'closeConfirmDelete' | 'setAsk' | 'setTab'
  | 'toggleSelect' | 'setTheme' | 'setPanel' | 'setDockWidth' | 'toggle' | 'setManagerTab'
  | 'setManagerCollapsed' | 'setTreeFilter' | 'setDisplayStyle' | 'toggleShow' | 'setReverseWheel' | 'setUnitSystem'
  | 'setViewName' | 'setTaskPane' | 'setDialog' | 'setFeedback';

export const uiSlice = (set: StoreSet, get: StoreGet): Pick<State, UiKeys> => ({
  viewportLayout: 'single',
  pmPinned: false,
  handleDrag: false,
  dir2Pick: null,
  finalImage: null,
  setFinalImage(finalImage) {
    set({ finalImage, dialog: finalImage ? 'finalRender' : null });
  },
  whatsWrong: false,
  sensorEdit: null,
  curveColorEdit: null,
  flangeProfileEdit: null,
  sketchFocusLocked: false,
  setSensorEdit(sensorEdit) {
    set({ sensorEdit, managerTab: 'tree' });
  },
  selFilter: { bar: false, on: true, types: [] },
  detailedPreview: false,
  toggleDetailedPreview() {
    set({ detailedPreview: !get().detailedPreview });
  },
  tab: 'features',
  theme: typeof window !== 'undefined' ? loadTheme() : 'light',
  panels: {
    manager: { side: 'left', visible: true },
    relations: { side: 'right', visible: false },
    shortcuts: { side: 'float', visible: false, x: 300, y: 120 },
  },
  dockWidth: { left: 236, right: 300 },
  managerTab: 'tree',
  managerCollapsed: false,
  treeFilter: '',
  displayStyle: 'shadedEdges',
  show: { planes: false, origin: false, sketches: true, relations: true, grid: false, viewSelector: false, realisticShading: false, shadows: false, perspective: false, ambientOcclusion: true, zebra: false },
  reverseWheel: typeof localStorage !== 'undefined' && localStorage.getItem('phlippo.reverseWheel') === 'true',
  unitSystem: 'MMGS',
  viewName: '*Trimetric',
  taskPane: null,
  // start-up by design: the Welcome dialog over an empty window; the autosave waits under Recent Documents
  dialog: typeof localStorage !== 'undefined' && localStorage.getItem('phlippo.welcome.hide') === '1' ? null : 'welcome',
  lastCommand: null,
  confirmDelete: null,
  ask: null,
  feedback: null,
  libraries: loadLibraries(),
  messages: [],
  showGrid: false,
  snapGrid: false,
  gridSize: 10,
  shadedContours: true,
  setViewportLayout(viewportLayout) {
    set({ viewportLayout });
  },
  addSensor(kind, extra = {}) {
    const { doc } = get();
    history.push('Add Sensor', doc);
    const base = kind === 'mass' ? 'Mass' : kind === 'volume' ? 'Volume' : kind === 'area' ? 'Surface Area' : kind === 'dimension' ? 'Dimension' : 'Interference Detection';
    const n = (doc.sensors ?? []).filter((x) => x.kind === kind).length + 1;
    const d: Document = { ...doc, sensors: [...(doc.sensors ?? []), { id: newId('sensor'), name: `${base}${n}`, kind, ...(extra.dim ? { dim: extra.dim } : {}), ...(extra.alert ? { alert: extra.alert } : {}) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteSensor(id) {
    const { doc } = get();
    history.push('Delete Sensor', doc);
    const d: Document = { ...doc, sensors: (doc.sensors ?? []).filter((x) => x.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  togglePmPinned() {
    set({ pmPinned: !get().pmPinned });
  },
  setLastCommand(c) {
    set({ lastCommand: c });
  },
  createLibrary(name) {
    const lib: Library = { id: newId('lib'), name: name || 'Library', items: [] };
    const libraries = [...get().libraries, lib];
    set({ libraries });
    saveLibraries(libraries);
    return lib.id;
  },
  deleteLibrary(id) {
    const libraries = get().libraries.filter((l) => l.id !== id);
    set({ libraries });
    saveLibraries(libraries);
  },
  addLibraryItem(libraryId, name) {
    const { activeSketchId, doc, selection } = get();
    if (!activeSketchId) {
      get().pushMessage('Open a sketch and select the entities to add to the library.', 'warn');
      return false;
    }
    const sk = doc.sketches[activeSketchId];
    const selIds = selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    const ids = selIds.length ? selIds : sk.entityOrder;
    if (!ids.length) {
      get().pushMessage('The sketch is empty; nothing to add.', 'warn');
      return false;
    }
    const block = extractBlock(sk, ids);
    const item: LibraryItem = { id: newId('li'), name: name || `Block ${Date.now().toString(36)}`, block, created: new Date().toISOString() };
    const libraries = get().libraries.map((l) => (l.id === libraryId ? { ...l, items: [...l.items, item] } : l));
    set({ libraries });
    saveLibraries(libraries);
    get().pushMessage(`"${item.name}" added to the library (${ids.length} entities).`);
    return true;
  },
  deleteLibraryItem(libraryId, itemId) {
    const libraries = get().libraries.map((l) => (l.id === libraryId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l));
    set({ libraries });
    saveLibraries(libraries);
  },
  placeItem(at) {
    const { placing, libraries } = get();
    if (!placing) return;
    const item = libraries.find((l) => l.id === placing.libraryId)?.items.find((i) => i.id === placing.itemId);
    if (!item) return;
    let inserted: Id[] = [];
    get().commit(`Insert ${item.name}`, (s) => {
      const [s1, ids] = insertBlock(s, item.block, at);
      inserted = ids;
      return s1;
    });
    set({ placing: null, selection: inserted.map((id) => ({ kind: 'entity' as const, id })) });
  },
  closeConfirmDelete() {
    set({ confirmDelete: null });
  },
  setAsk(ask) {
    set({ ask });
  },
  setTab(tab) {
    set({ tab });
  },
  toggleSelect(item, additive) {
    const { selection } = get();
    const exists = selection.some((s) => s.kind === item.kind && s.id === item.id);
    if (additive) set({ selection: exists ? selection.filter((s) => !(s.kind === item.kind && s.id === item.id)) : [...selection, item], selectedConstraint: null });
    else set({ selection: exists && selection.length === 1 ? [] : [item], selectedConstraint: null });
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
    set(dialog === 'material' || dialog === 'appearance' ? { dialog } : { dialog, materialTarget: null });
  },
  setFeedback(feedback) {
    if (get().feedback !== feedback) set({ feedback });
  },
});
