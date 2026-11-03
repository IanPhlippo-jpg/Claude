import { LEGAL_NOTICE } from './legal';
import { COMMANDS } from './commands';
import { bridge, fitActive } from './viewport/bridge';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Menu, nestMenu, type MenuItem } from '../ui/components';
import { Icon } from '../ui/icons';
import { FILE_EXTENSION, MAX_FILE_BYTES, parseDocument, serializeDocument } from '../core/document/persistence';
import { exportStl, parseStl } from '../core/document/stl';
import { desktop, getDocumentHandle, setDocumentHandle } from './desktop';
import { viewerHtml } from '../core/document/viewerExport';
import { applyUpAxis as setUpAxis } from './viewport/camera';
import { getPref, loadPrefs } from './prefs';
import { clearAutoRecover, discardAutoRecover } from './autoRecover';
// the sheet exporter loads when a drawing is saved as DXF or PDF (QA 0.5.11 F174)
const exportSheet = (kind: 'dxf' | 'pdf') => import('./drawing/sheetExport').then((m) => m.exportSheet(kind));
import { isDrawing } from '../core/document/types';
import { getCamera } from './viewport/Viewport';

/** the version from package.json (vite define) */
const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const KCAD_FILTERS = [{ name: 'Phlippo CAD part', extensions: ['kcad'] }, { name: 'All files', extensions: ['*'] }];
const STL_FILTERS = [{ name: 'STL', extensions: ['stl'] }];
const STEP_FILTERS = [{ name: 'STEP AP203/214/242', extensions: ['step', 'stp'] }];

function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Save: in the desktop app to the document's file (asks for a name the first time), in the browser a download. */
/** a menu row gets the description of the command of the same name (Insert ▸ Features ▸ Rib… is the Rib command) */
function withDescription(m: MenuItem): MenuItem {
  if (m.description || !m.label) return m;
  const name = m.label.split(' ▸ ').pop()!.replace(/^✓ /, '').replace(/…$/, '').trim();
  const c = COMMANDS.find((x) => x.label === name);
  return c?.description ? { ...m, description: c.description } : m;
}

export async function saveDocument(forceAsk = false, confirmedErrors = false): Promise<boolean> {
  const { doc, pushMessage, hasDocument } = useStore.getState();
  if (!hasDocument) return false;
  // a model with rebuild errors (a damaged or half-repaired file) is only written after a confirmation (F40)
  const errs = Object.keys(useStore.getState().rebuild.errors);
  if (errs.length && !confirmedErrors) {
    return new Promise<boolean>((resolve) => useStore.getState().setAsk({
      title: 'Phlippo CAD',
      text: `${doc.name} has ${errs.length} feature${errs.length === 1 ? '' : 's'} that could not be rebuilt (What's Wrong). Save the incomplete model anyway? The previous file is kept as .bak.`,
      yes: () => { saveDocument(forceAsk, true).then(resolve); },
      yesLabel: 'Save Anyway',
      noLabel: 'Cancel',
    }));
  }
  const text = serializeDocument(doc);
  const api = desktop();
  if (api) {
    const data = new TextEncoder().encode(text).buffer as ArrayBuffer;
    const previous = getDocumentHandle();
    const known = forceAsk ? undefined : previous ?? undefined;
    const r = await api.saveFile({ defaultPath: `${doc.name}${FILE_EXTENSION}`, filters: KCAD_FILTERS, data, handle: known });
    if (!r) return false;
    if (r.error) {
      pushMessage(`${r.name} could not be saved: ${r.error}. The previous file is unchanged.`, 'error');
      return false;
    }
    setDocumentHandle(r.handle);
    if (r.warning) pushMessage(`${r.name} saved, but: ${r.warning}`, 'warn');
    const name = r.name.replace(/\.kcad$/i, '');
    if (name !== doc.name) useStore.getState().renameDocument(name);
    useStore.setState({ dirty: false });
    clearAutoRecover(doc, [previous, r.handle]);
    pushMessage(`${r.name} saved.`);
    return true;
  }
  download(`${doc.name}${FILE_EXTENSION}`, text, 'application/json');
  useStore.setState({ dirty: false });
  return true;
}

/** Don't Save: the auto-recover copies of the discarded changes go first (closing the window may follow at once) */
function dontSave(then: () => void): void {
  const removing = discardAutoRecover();
  if (removing) void removing.finally(then);
  else then();
}

/** Unsaved changes: "Save changes to Part1?" with Yes (save, then go on), No (go on) and Cancel, by design */
export function withUnsavedCheck(then: () => void): void {
  const st = useStore.getState();
  if (!st.hasDocument) return then();
  // Edit Component: the part being edited belongs to an assembly that is not saved yet (F74). The question comes first;
  // only after Save / Don't Save does the next document replace them, Cancel keeps everything as it is.
  const ctx = st.editContext;
  if (ctx) {
    st.setAsk({
      title: 'Phlippo CAD',
      text: `${ctx.componentName} is being edited in ${ctx.assembly.name}. Return to ${ctx.assembly.name} and save the changes?`,
      yes: () => { useStore.getState().returnToAssembly(); saveDocument().then((ok) => ok && then()); },
      no: () => dontSave(then),
      yesLabel: 'Save',
      noLabel: "Don't Save",
    });
    return;
  }
  if (!st.dirty) return then();
  st.setAsk({
    title: 'Phlippo CAD',
    text: `Save changes to ${st.doc.name}?`,
    yes: () => { saveDocument().then((ok) => ok && then()); },
    no: () => dontSave(then),
    yesLabel: 'Save',
    noLabel: "Don't Save",
  });
}

export const saveDocumentAs = () => saveDocument(true);

/** Save As (browser): the file name and the Save as copy options of the dialog */
export function saveDocumentWith(opts: { name: string; copy: boolean; includeRefs: boolean }): void {
  const st = useStore.getState();
  const doc = opts.name && opts.name !== st.doc.name ? { ...st.doc, name: opts.name } : st.doc;
  const text = serializeDocument(doc);
  download(`${doc.name}${FILE_EXTENSION}`, text, 'application/json');
  if (!opts.copy) {
    if (doc.name !== st.doc.name) st.renameDocument(doc.name);
    useStore.setState({ dirty: false });
  }
  st.pushMessage(opts.copy ? `${doc.name}${FILE_EXTENSION} saved as a copy; ${st.doc.name} stays open.` : `${doc.name}${FILE_EXTENSION} saved.`);
}

/** File ▸ Publish to Phlippo Viewer: a standalone HTML viewer of the bodies (the Phlippo Viewer equivalent) */
export function publishViewer(): void {
  const st = useStore.getState();
  const bodies = st.rebuild.bodies.map((b) => ({ name: st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id, geometry: b.geometry, color: st.doc.bodyAppearances?.[b.id] as string | undefined ?? st.doc.appearance ?? st.doc.material?.color ?? '#cfd3d8' }));
  if (!bodies.length) return st.pushMessage('Publish needs a solid body.', 'warn');
  const html = viewerHtml(st.doc.name, bodies, { app: 'Phlippo CAD', version: APP_VERSION, date: new Date().toISOString().slice(0, 10) });
  download(`${st.doc.name}.html`, html, 'text/html');
  st.pushMessage(`${st.doc.name}.html published: opens in any browser without Phlippo CAD.`);
}

/** Save As ▸ STL: the solid body as a binary STL (model units). */
export function saveStl() {
  const { doc, rebuild, pushMessage } = useStore.getState();
  const body = rebuild.bodies[0];
  if (!body) {
    pushMessage('There is no solid body to export; create one first (Extruded Boss/Base).', 'warn');
    return;
  }
  const data = exportStl(body.geometry, doc.name);
  const api = desktop();
  if (api) {
    api.saveFileAs({ defaultPath: `${doc.name}.stl`, filters: STL_FILTERS, data }).then((r) => r && pushMessage(`${r.name} saved.`));
    return;
  }
  download(`${doc.name}.stl`, data, 'model/stl');
  pushMessage(`${doc.name}.stl saved.`);
}

/**
 * File ▸ Open of a STEP file (QA F51): read by OpenCascade in its worker and opened as a new part with one Imported
 * body per solid, as a desktop CAD program opens a neutral file.
 */
function openStep(name: string, data: ArrayBuffer) {
  const st = useStore.getState();
  st.pushMessage(`Reading ${name}…`, 'info');
  import('../core/occt/occtClient')
    .then((m) => m.importStep(new Uint8Array(data.slice(0))))
    .then((bodies) => {
      if (!bodies.length) throw new Error('the file has no solids or surfaces');
      const meshes = bodies.map((b) => Array.from(b.positions, (v) => Math.round(v * 1e5) / 1e5));
      withUnsavedCheck(() => {
        const s = useStore.getState();
        s.newDocument('part');
        s.importMesh(name, meshes);
        setDocumentHandle(null);
        s.setDialog(null);
      });
    })
    .catch((err: Error) => useStore.getState().pushMessage(`Cannot open ${name}: ${err.message}`, 'error'));
}

/** Open a file: a loaded document (.kcad), an imported mesh (.stl) or a STEP file (.step, .stp). */
export function openFileData(name: string, data: ArrayBuffer, handle: string | null) {
  const st = useStore.getState();
  try {
    if (data.byteLength > MAX_FILE_BYTES) throw new Error(`the file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`);
    if (/\.(step|stp)$/i.test(name)) return openStep(name, data);
    if (/\.stl$/i.test(name)) st.importMesh(name, parseStl(data));
    else if (st.doc.kind === 'drawing' && st.drawingEdit?.mode === 'modelView' && !st.drawingEdit.model) {
      const model = parseDocument(new TextDecoder().decode(data));
      if (model.kind === 'drawing') st.pushMessage('Choose a part or assembly file for the view.', 'warn');
      else st.setModelViewSource(model);
    } else if (st.insertingComponent || (st.doc.kind === 'assembly' && st.tab === 'assembly' && st.mateEdit === null && st.dialog === null && st.doc.components?.length === 0)) {
      // Insert Component: the chosen part becomes a component of the open assembly
      const part = parseDocument(new TextDecoder().decode(data));
      if (part.kind === 'drawing') st.pushMessage('A drawing cannot be inserted; choose a part or assembly file.', 'warn');
      // with the Insert Component PM open the part follows the pointer until a click or OK places it, by design
      else if (st.insertingComponent) st.setInsertGhost({ part, rotation: [0, 0, 0, 1] });
      else st.insertComponent(part);
    } else {
      // parsed and checked before anything changes: a damaged file leaves the open document as it is
      const doc = parseDocument(new TextDecoder().decode(data));
      withUnsavedCheck(() => {
        useStore.getState().openDocument(doc);
        setDocumentHandle(handle);
        useStore.getState().setDialog(null);
      });
      return;
    }
    st.setDialog(null);
  } catch (err) {
    st.pushMessage(`Cannot open ${name}: ${(err as Error).message}`, 'error');
  }
}

/** a file handed over by the desktop shell (Open dialog, file association) */
export function openDesktopFile(f: { name: string; handle: string; data?: ArrayBuffer; error?: string }) {
  if (f.error || !f.data) return useStore.getState().pushMessage(`Cannot open ${f.name}: ${f.error ?? 'the file could not be read'}.`, 'error');
  openFileData(f.name, f.data, f.handle);
}

export function openFileDialog() {
  const api = desktop();
  if (api) {
    api.openFile([{ name: 'Phlippo CAD files', extensions: ['kcad', 'json', 'stl', 'step', 'stp'] }, ...KCAD_FILTERS, ...STL_FILTERS, ...STEP_FILTERS]).then((f) => f && openDesktopFile(f));
    return;
  }
  (document.getElementById('phlippo-open-file') as HTMLInputElement | null)?.click();
}

/**
 * Menu bar as in the desktop original: logo + product name with a fly-out
 * menu (File … Help) that appears on hover (or stays with the pin), the
 * menu-bar toolbar (New, Open▾, Save▾, Print, Undo▾, Redo, Select▾, Rebuild,
 * File Properties, Options▾), the document title, the command search box,
 * login, Help and window controls.
 */
export function MenuBar() {
  const st = useStore(useShallow((s) => ({ analysis: s.analysis, setSceneEdit: s.setSceneEdit, startSectionView: s.startSectionView, activeSketchId: s.activeSketchId, doc: s.doc, hasDocument: s.hasDocument, dirty: s.dirty, setDialog: s.setDialog, rebuild: s.rebuild, pushMessage: s.pushMessage, undoLabel: s.undoLabel, canUndo: s.canUndo, undo: s.undo, redoLabel: s.redoLabel, canRedo: s.canRedo, redo: s.redo, repeatLastTool: s.repeatLastTool, deleteSelection: s.deleteSelection, rebuildAll: s.rebuildAll, show: s.show, toggleShow: s.toggleShow, displayStyle: s.displayStyle, setDisplayStyle: s.setDisplayStyle, setPrefs: s.setPrefs, setPanel: s.setPanel, panels: s.panels, setTaskPane: s.setTaskPane, taskPane: s.taskPane, theme: s.theme, setTheme: s.setTheme, exitSketch: s.exitSketch, startPlanePick: s.startPlanePick, startInsertComponent: s.startInsertComponent, startMate: s.startMate, startModelView: s.startModelView, startProjectedView: s.startProjectedView, startNote: s.startNote, startFeature: s.startFeature, startRound: s.startRound, startShell: s.startShell, startRib: s.startRib, startCombine: s.startCombine, startMoveBody: s.startMoveBody, startDeform: s.startDeform, startHole: s.startHole, startVent: s.startVent, startFormTool: s.startFormTool, startGusset: s.startGusset, startTabSlot: s.startTabSlot, startRip: s.startRip, startSweptFlange: s.startSweptFlange, startConvertSheet: s.startConvertSheet, startWeldment: s.startWeldment, startStructuralMember: s.startStructuralMember, startTrimExtend: s.startTrimExtend, startEndCap: s.startEndCap, startWeldGusset: s.startWeldGusset, startWeldBead: s.startWeldBead, startPlane: s.startPlane, setTool: s.setTool, convertEntities: s.convertEntities, setAnalysis: s.setAnalysis, viewportLayout: s.viewportLayout, setViewportLayout: s.setViewportLayout, setAsk: s.setAsk, prefs: s.prefs })));
  const [open, setOpen] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem('phlippo.menuPinned') === 'true';
    } catch {
      return false;
    }
  });
  const [hover, setHover] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const api = desktop();
  useEffect(() => {
    if (api) {
      api.isMaximized().then(setFullscreen);
      return api.onWindowState((s) => setFullscreen(s.maximized));
    }
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const cam = () => getCamera();
  const inSketch = !!st.activeSketchId;
  const showMenus = pinned || hover || open !== null;
  // title by design: "Sketch1 of Part1 *" while sketching, "Part1 *" otherwise
  const sketchName = st.activeSketchId ? st.doc.sketches[st.activeSketchId]?.name : null;
  const sketchTitle = st.hasDocument ? `${sketchName ? `${sketchName} of ` : ''}${st.doc.name}${st.dirty ? ' *' : ''}` : '';

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New…', icon: <Icon.New />, shortcut: 'Ctrl+N', onSelect: () => st.setDialog('new') },
      { label: 'Open…', icon: <Icon.Open />, shortcut: 'Ctrl+O', onSelect: openFileDialog },
      { label: 'Open Recent', onSelect: () => st.setDialog('welcome') },
      { label: 'Close', shortcut: 'Ctrl+W', onSelect: () => withUnsavedCheck(() => useStore.setState({ hasDocument: false, dialog: null })) },
      { separator: true },
      { label: 'Save', icon: <Icon.Save />, shortcut: 'Ctrl+S', onSelect: () => saveDocument() },
      { label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: () => (desktop() ? saveDocumentAs() : st.setDialog('saveAs')) },
      { label: 'Publish to Phlippo Viewer (*.html)…', icon: <Icon.Eye />, disabled: !st.rebuild.bodies.length, onSelect: () => publishViewer() },
      { label: 'Save As ▸ STL (*.stl)…', onSelect: () => { useStore.setState({ exportFormat: 'stl' }); st.setDialog('exportOptions'); } },
      { label: 'Save As ▸ 3MF (*.3mf)…', onSelect: () => { useStore.setState({ exportFormat: '3mf' }); st.setDialog('exportOptions'); } },
      { label: 'Save As ▸ AMF (*.amf)…', onSelect: () => { useStore.setState({ exportFormat: 'amf' }); st.setDialog('exportOptions'); } },
      { label: 'Save As ▸ STEP AP214 (*.step)…', disabled: !st.rebuild.bodies.length, onSelect: () => { useStore.setState({ exportFormat: 'step' }); st.setDialog('exportOptions'); } },
      // a drawing: the active sheet as vectors (QA v0.5.1 F114)
      ...(isDrawing(st.doc) ? [{ label: 'Save As ▸ DXF (*.dxf)…', onSelect: () => void exportSheet('dxf') }, { label: 'Save As ▸ Adobe PDF (*.pdf)…', onSelect: () => void exportSheet('pdf') }] : []),
      { label: 'Save All', onSelect: () => saveDocument() },
      { separator: true },
      { label: 'Print…', icon: <Icon.Print />, shortcut: 'Ctrl+P', onSelect: () => window.print() },
      { separator: true },
      { label: 'Properties…', onSelect: () => st.setDialog('options') },
      { label: 'Clear autosave', onSelect: () => { localStorage.removeItem('phlippo.autosave'); st.pushMessage('Autosave cleared.'); } },
    ],
    Edit: [
      { label: `Undo${st.undoLabel ? ' ' + st.undoLabel : ''}`, icon: <Icon.Undo />, shortcut: 'Ctrl+Z', disabled: !st.canUndo, onSelect: st.undo },
      { label: `Redo${st.redoLabel ? ' ' + st.redoLabel : ''}`, icon: <Icon.Redo />, shortcut: 'Ctrl+Y', disabled: !st.canRedo, onSelect: st.redo },
      { label: 'Repeat Last Command', shortcut: 'Enter', disabled: !inSketch, onSelect: st.repeatLastTool },
      { separator: true },
      { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: st.deleteSelection },
      { label: 'Rebuild', icon: <Icon.Rebuild />, shortcut: 'Ctrl+B', onSelect: () => st.rebuildAll() },
      { label: 'Appearance ▸ Material…', icon: <Icon.Material />, onSelect: () => st.setDialog('material') },
    ],
    View: [
      // Redraw: the graphics area drawn again (nothing rebuilt), as the intended View menu
      { label: 'Redraw', icon: <Icon.Rebuild />, shortcut: 'Ctrl+R', onSelect: () => useStore.setState((s) => ({ show: { ...s.show } })) },
      { label: 'Screen Capture ▸ Image Capture', icon: <Icon.Print />, onSelect: () => { const url = bridge.snapshot?.(); if (!url) return; const a = document.createElement('a'); a.href = url; a.download = `${st.doc.name}.png`; a.click(); } },
      { separator: true },
      { label: 'Previous View', icon: <Icon.Previous />, shortcut: 'Shift+Ctrl+Z', onSelect: () => cam().previousView() },
      { label: 'Zoom to Fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: () => fitActive() },
      { label: 'Modify ▸ Orientation…', icon: <Icon.Orientation />, shortcut: 'Space', onSelect: () => st.setDialog('orientation') },
      { separator: true },
      { label: `Hide/Show ▸ ${st.show.planes ? '✓ ' : ''}Planes`, onSelect: () => st.toggleShow('planes') },
      { label: `Hide/Show ▸ ${st.show.origin ? '✓ ' : ''}Origins`, onSelect: () => st.toggleShow('origin') },
      { label: `Hide/Show ▸ ${st.show.sketches ? '✓ ' : ''}Sketches`, onSelect: () => st.toggleShow('sketches') },
      { label: `Hide/Show ▸ ${st.show.relations ? '✓ ' : ''}Sketch Relations`, onSelect: () => st.toggleShow('relations') },
      { label: `Hide/Show ▸ ${st.show.grid ? '✓ ' : ''}Grid`, onSelect: () => st.toggleShow('grid') },
      { separator: true },
      { label: `Display ▸ ${st.displayStyle === 'shadedEdges' ? '✓ ' : ''}Shaded With Edges`, icon: <Icon.StyleShadedEdges />, onSelect: () => st.setDisplayStyle('shadedEdges') },
      { label: `Display ▸ ${st.displayStyle === 'shaded' ? '✓ ' : ''}Shaded`, icon: <Icon.StyleShaded />, onSelect: () => st.setDisplayStyle('shaded') },
      { label: `Display ▸ ${st.displayStyle === 'hiddenVisible' ? '✓ ' : ''}Hidden Lines Visible`, icon: <Icon.StyleHiddenVisible />, onSelect: () => st.setDisplayStyle('hiddenVisible') },
      { label: `Display ▸ ${st.displayStyle === 'hiddenRemoved' ? '✓ ' : ''}Hidden Lines Removed`, icon: <Icon.StyleHiddenRemoved />, onSelect: () => st.setDisplayStyle('hiddenRemoved') },
      { label: `Display ▸ ${st.displayStyle === 'wireframe' ? '✓ ' : ''}Wireframe`, icon: <Icon.StyleWireframe />, onSelect: () => st.setDisplayStyle('wireframe') },
      { label: `Display ▸ ${st.show.zebra ? '✓ ' : ''}Zebra Stripes`, icon: <Icon.Zebra />, onSelect: () => st.toggleShow('zebra') },
      { label: `Display ▸ ${st.show.perspective ? '✓ ' : ''}Perspective`, onSelect: () => st.toggleShow('perspective') },
      { label: `Display ▸ ${st.show.shadows ? '✓ ' : ''}Shadows In Shaded Mode`, onSelect: () => st.toggleShow('shadows') },
      { label: `Display ▸ ${st.show.ambientOcclusion ? '✓ ' : ''}Ambient Occlusion`, onSelect: () => st.toggleShow('ambientOcclusion') },
      { label: `Display ▸ ${st.show.realisticShading ? '✓ ' : ''}Realistic Shading`, onSelect: () => st.toggleShow('realisticShading') },
      // Tangent Edges: three choices, by design (Visible / As Phantom / Removed)
      ...(['visible', 'phantom', 'removed'] as const).map((v): MenuItem => ({ label: `Display ▸ ${String(getPref('view.tangentEdges') ?? 'visible') === v ? '✓ ' : ''}${v === 'visible' ? 'Tangent Edges Visible' : v === 'phantom' ? 'Tangent Edges As Phantom' : 'Tangent Edges Removed'}`, onSelect: () => st.setPrefs({ ...loadPrefs(), 'view.tangentEdges': v }) })),
      { label: `Display ▸ ${st.analysis?.kind === 'curvature' ? '✓ ' : ''}Curvature`, onSelect: () => st.setAnalysis(st.analysis?.kind === 'curvature' ? null : { kind: 'curvature' }) },
      { label: `Display ▸ ${st.analysis?.kind === 'draft' ? '✓ ' : ''}Draft Analysis`, onSelect: () => st.setAnalysis(st.analysis?.kind === 'draft' ? null : { kind: 'draft', pull: [0, 1, 0], pullLabel: 'Y axis', angle: 1 }) },
      { label: `Display ▸ ${st.analysis?.kind === 'undercut' ? '✓ ' : ''}Undercut Analysis`, onSelect: () => st.setAnalysis(st.analysis?.kind === 'undercut' ? null : { kind: 'undercut', pull: [0, 1, 0], pullLabel: 'Y axis' }) },
      { label: `Display ▸ ${st.analysis?.kind === 'parting' ? '✓ ' : ''}Parting Line Analysis`, onSelect: () => st.setAnalysis(st.analysis?.kind === 'parting' ? null : { kind: 'parting', pull: [0, 1, 0], pullLabel: 'Y axis', angle: 1 }) },
      { label: 'Display ▸ Section View', icon: <Icon.Section />, onSelect: () => st.startSectionView() },
      { separator: true },
      { label: `Modify ▸ Up Axis ▸ ${getPref('view.upAxis') !== 'Z' ? '✓ ' : ''}Y up`, onSelect: () => { setUpAxis('Y'); st.setPrefs({ ...loadPrefs(), 'view.upAxis': 'Y' }); cam().setView('trimetric'); } },
      { label: `Modify ▸ Up Axis ▸ ${getPref('view.upAxis') === 'Z' ? '✓ ' : ''}Z up`, onSelect: () => { setUpAxis('Z'); st.setPrefs({ ...loadPrefs(), 'view.upAxis': 'Z' }); cam().setView('trimetric'); } },
      { separator: true },
      { label: 'User Interface ▸ Feature Tree Area', onSelect: () => st.setPanel('manager', { visible: !st.panels.manager.visible }) },
      { label: 'User Interface ▸ Task Pane', onSelect: () => st.setTaskPane(st.taskPane ? null : 'resources') },
      { label: 'Lights and Cameras ▸ Edit Scene…', onSelect: () => st.setSceneEdit(true) },
      { label: 'Toolbars ▸ Customize…', onSelect: () => st.setDialog('customize') },
      { label: 'Full Screen', shortcut: 'F11', onSelect: () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); } },
      { label: 'Customize Menu', onSelect: () => st.setDialog('customize') },
      { label: st.theme === 'dark' ? 'Light theme' : 'Dark theme', icon: st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />, shortcut: 'Ctrl+Shift+D', onSelect: () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark') },
    ],
    Insert: [
      { label: 'Sketch', icon: <Icon.Sketch />, onSelect: () => (inSketch ? st.exitSketch() : st.startPlanePick()) },
      { label: 'Component ▸ Existing Part/Assembly…', icon: <Icon.InsertComponent />, disabled: st.doc.kind !== 'assembly', onSelect: () => st.startInsertComponent() },
      { label: 'Mate…', icon: <Icon.Mate />, disabled: st.doc.kind !== 'assembly', onSelect: () => st.startMate() },
      { label: 'Drawing View ▸ Model…', icon: <Icon.ModelView />, disabled: st.doc.kind !== 'drawing', onSelect: () => st.startModelView() },
      { label: 'Drawing View ▸ Projected…', icon: <Icon.ProjectedView />, disabled: st.doc.kind !== 'drawing', onSelect: () => st.startProjectedView() },
      { label: 'Annotations ▸ Note…', icon: <Icon.Note />, disabled: st.doc.kind !== 'drawing', onSelect: () => st.startNote() },
      { label: 'Boss/Base ▸ Extrude…', icon: <Icon.Extrude />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startFeature('extrude', 'boss') },
      { label: 'Boss/Base ▸ Revolve…', icon: <Icon.Revolve />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startFeature('revolve', 'boss') },
      { label: 'Cut ▸ Extrude…', icon: <Icon.Cut />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startFeature('extrude', 'cut') },
      { label: 'Features ▸ Fillet/Round…', icon: <Icon.Arc />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startRound('fillet') },
      { label: 'Features ▸ Shell…', icon: <Icon.Shell />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startShell() },
      { label: 'Features ▸ Rib…', icon: <Icon.Rib />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startRib() },
      { label: 'Features ▸ Combine…', icon: <Icon.Combine />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startCombine() },
      { label: 'Features ▸ Move/Copy…', icon: <Icon.MoveComponent />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => st.startMoveBody() },
      { label: 'Features ▸ Deform…', icon: <Icon.Deform />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startDeform() },
      { label: 'Features ▸ Dome…', icon: <Icon.Dome />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startDome() },
      { label: 'Features ▸ Indent…', icon: <Icon.Indent />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startIndent() },
      { label: 'Fastening Feature ▸ Mounting Boss…', icon: <Icon.MountingBoss />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startMountingBoss() },
      { label: 'Fastening Feature ▸ Snap Hook…', icon: <Icon.SnapHook />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startSnapHook() },
      { label: 'Fastening Feature ▸ Lip/Groove…', icon: <Icon.LipGroove />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startLipGroove() },
      { label: 'Features ▸ Delete/Keep Body…', icon: <Icon.Trash />, disabled: (st.doc.kind !== 'part' && !!st.doc.kind) || !st.rebuild.bodies.length, onSelect: () => useStore.getState().startDeleteBody() },
      { label: 'Features ▸ Simple Hole…', icon: <Icon.Hole />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startHole(false, true) },
      { label: 'Sheet Metal ▸ Vent…', icon: <Icon.Vent />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startVent() },
      { label: 'Sheet Metal ▸ Forming Tool…', icon: <Icon.FormTool />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startFormTool() },
      { label: 'Sheet Metal ▸ Sheet Metal Gusset…', icon: <Icon.Gusset />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startGusset() },
      { label: 'Sheet Metal ▸ Tab and Slot…', icon: <Icon.TabSlot />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startTabSlot() },
      { label: 'Sheet Metal ▸ Rip…', icon: <Icon.Rip />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startRip() },
      { label: 'Sheet Metal ▸ Swept Flange…', icon: <Icon.SweptFlange />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startSweptFlange() },
      { label: 'Sheet Metal ▸ Insert Bends…', icon: <Icon.Sheet />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startConvertSheet(true) },
      { label: 'Frames ▸ Frame', icon: <Icon.Weldment />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startWeldment() },
      { label: 'Frames ▸ Structural Member…', icon: <Icon.StructuralMember />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startStructuralMember() },
      { label: 'Frames ▸ Trim/Extend…', icon: <Icon.TrimExtend />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startTrimExtend() },
      { label: 'Frames ▸ End Cap…', icon: <Icon.EndCap />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startEndCap() },
      { label: 'Frames ▸ Gusset…', icon: <Icon.Gusset />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startWeldGusset() },
      { label: 'Frames ▸ Weld Bead…', icon: <Icon.WeldBead />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startWeldBead() },
      { label: 'Reference Geometry ▸ Plane…', icon: <Icon.Plane />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startPlane() },
    ],
    Tools: [
      // the selection items and the sketch settings of the intended Tools menu
      { label: 'Select', icon: <Icon.Select />, onSelect: () => { st.setTool('select'); useStore.getState().setSelection([]); } },
      { label: 'Select All', shortcut: 'Ctrl+A', disabled: !inSketch, onSelect: () => { const k = useStore.getState().doc.sketches[st.activeSketchId ?? '']; if (k) useStore.getState().setSelection(k.entityOrder.map((id) => ({ kind: 'entity' as const, id }))); } },
      { separator: true },
      { label: `Sketch Settings ▸ ${getPref('snaps.automaticRelations') !== false ? '✓ ' : ''}Automatic Relations`, onSelect: () => st.setPrefs({ ...loadPrefs(), 'snaps.automaticRelations': getPref('snaps.automaticRelations') === false }) },
      { label: 'Geometry Analysis…', icon: <Icon.Measure />, disabled: !st.rebuild.bodies.length, onSelect: () => st.setAnalysis({ kind: 'geometry', shortEdge: 0.5, smallFace: 1, sharpAngle: 30 }) },
      { label: 'Thickness Analysis…', icon: <Icon.Shell />, disabled: !st.rebuild.bodies.length, onSelect: () => st.setAnalysis({ kind: 'thickness', target: 2 }) },
      { label: 'Symmetry Check…', icon: <Icon.Symmetry />, onSelect: () => st.setDialog('symmetry') },
      { label: 'Add-Ins…', onSelect: () => useStore.setState({ tab: 'addins' }) },
      { separator: true },
      { label: 'Sketch Entities ▸ Line', icon: <Icon.Line />, disabled: !inSketch, onSelect: () => st.setTool('line') },
      { label: 'Sketch Entities ▸ Corner Rectangle', icon: <Icon.Rect />, disabled: !inSketch, onSelect: () => st.setTool('rectangle') },
      { label: 'Sketch Entities ▸ Circle', icon: <Icon.Circle />, disabled: !inSketch, onSelect: () => st.setTool('circle') },
      { label: 'Sketch Entities ▸ Polygon', icon: <Icon.Polygon />, disabled: !inSketch, onSelect: () => st.setTool('polygon') },
      { label: 'Sketch Entities ▸ Straight Slot', icon: <Icon.Slot />, disabled: !inSketch, onSelect: () => st.setTool('slot') },
      { label: 'Sketch Tools ▸ Trim', icon: <Icon.Trim />, disabled: !inSketch, onSelect: () => st.setTool('trim') },
      { label: 'Sketch Tools ▸ Offset Entities', icon: <Icon.Offset />, disabled: !inSketch, onSelect: () => st.setTool('offset') },
      { label: 'Sketch Tools ▸ Fillet', icon: <Icon.Fillet2D />, disabled: !inSketch, onSelect: () => st.setTool('sketchFillet') },
      { label: 'Sketch Tools ▸ Convert Entities', icon: <Icon.Convert />, disabled: !inSketch, onSelect: () => st.convertEntities() },
      { label: 'Dimensions ▸ Smart', icon: <Icon.Dimension />, disabled: !inSketch, onSelect: () => st.setTool('dimension') },
      { label: 'Relations ▸ Display/Delete', icon: <Icon.Lock />, disabled: !inSketch, onSelect: () => st.setTaskPane('relations') },
      { separator: true },
      { label: 'Equations…', icon: <Icon.Config />, onSelect: () => st.setDialog('equations') },
      { label: 'Evaluate ▸ Measure…', icon: <Icon.Measure />, onSelect: () => st.setDialog('measure') },
      { label: 'Evaluate ▸ Mass Properties…', icon: <Icon.Mass />, onSelect: () => st.setDialog('mass') },
      { label: 'Evaluate ▸ Check Active Document…', icon: <Icon.Check />, onSelect: () => st.setDialog('check') },
      { label: 'Evaluate ▸ Performance Evaluation…', icon: <Icon.Performance />, onSelect: () => st.setDialog('performance') },
      { label: 'Evaluate ▸ Symmetry Check…', icon: <Icon.Symmetry />, onSelect: () => st.setDialog('symmetry') },
      { label: 'Evaluate ▸ Deviation Analysis…', icon: <Icon.Deviation />, onSelect: () => st.setAnalysis({ kind: 'deviation', samples: 10 }) },
      { label: 'Evaluate ▸ Parting Line Analysis…', icon: <Icon.PartingLine />, onSelect: () => st.setAnalysis({ kind: 'parting', pull: [0, 1, 0], pullLabel: 'Y axis', angle: 1 }) },
      { label: 'Evaluate ▸ Compare ▸ Body Compare…', icon: <Icon.Compare />, onSelect: () => st.setDialog('compare') },
      { label: 'Evaluate ▸ Compare ▸ Compare Documents…', icon: <Icon.Compare />, onSelect: () => st.setDialog('compare') },
      { label: 'Evaluate ▸ Quick Beam Estimate…', icon: <Icon.Simulation />, onSelect: () => st.setDialog('beamEstimate') },
      { separator: true },
      { label: 'Customize…', icon: <Icon.Keyboard />, onSelect: () => st.setDialog('customize') },
      { label: 'Customize ▸ Keyboard', icon: <Icon.Keyboard />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Options…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') },
    ],
    Window: [
      { label: `✓ ${st.doc.name}${st.dirty ? ' *' : ''}`, onSelect: () => {} },
      { separator: true },
      { label: `${st.viewportLayout === 'single' ? '✓ ' : ''}Viewport ▸ Single View`, onSelect: () => st.setViewportLayout('single') },
      { label: `${st.viewportLayout === 'twoH' ? '✓ ' : ''}Viewport ▸ Two View - Horizontal`, onSelect: () => st.setViewportLayout('twoH') },
      { label: `${st.viewportLayout === 'twoV' ? '✓ ' : ''}Viewport ▸ Two View - Vertical`, onSelect: () => st.setViewportLayout('twoV') },
      { label: `${st.viewportLayout === 'four' ? '✓ ' : ''}Viewport ▸ Four View`, onSelect: () => st.setViewportLayout('four') },
    ],
    Help: [
      { label: 'Phlippo CAD Help', icon: <Icon.Help />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Tutorials (Task Pane ▸ Resources)', onSelect: () => st.setTaskPane('resources') },
      { label: 'Welcome to Phlippo CAD…', onSelect: () => st.setDialog('welcome') },
      { separator: true },
      { label: 'About Phlippo CAD', onSelect: () => st.setAsk({ title: 'About Phlippo CAD', text: `Phlippo CAD ${APP_VERSION} — parametric 3D CAD: parts, assemblies and drawings. ${LEGAL_NOTICE} Licence and third-party notices: LICENSE.txt and THIRD-PARTY-NOTICES.txt in the installation folder.` }) },
    ],
  };

  // Customize ▸ Menus: the unchecked items are left out
  const hiddenMenu = new Set(String(st.prefs['customize.menus.hidden'] ?? '').split('|').filter(Boolean));
  const tb = (icon: React.ReactNode, tip: string, onClick: () => void, opts: { disabled?: boolean; active?: boolean; caret?: boolean } = {}) => (
    <button className={`k-mb-btn k-tip ${opts.active ? 'active' : ''}`} data-tip={tip} onClick={onClick} disabled={opts.disabled}>
      {icon}
      {opts.caret && <Icon.ChevronDown size={8} className="k-mb-caret" />}
    </button>
  );

  return (
    <>
    <div className="k-menubar" onMouseLeave={() => setHover(false)}>
      <div className="k-brand" onMouseEnter={() => setHover(true)}>
        <Icon.Logo size={18} />
        {/* one name everywhere: window, installer, About and this title row (QA 0.5.11 F194) */}
        <span>Phlippo <b>CAD</b></span>
        {!showMenus && <Icon.ChevronRight size={11} className="k-brand-caret" />}
      </div>
      {showMenus && (
        <div className="k-mb-menus" onMouseEnter={() => setHover(true)}>
          {Object.keys(menus).map((name) => (
            <div key={name} style={{ position: 'relative' }}>
              <button className={`k-mb-menu ${open === name ? 'active' : ''}`} onClick={() => setOpen(open === name ? null : name)} onMouseEnter={() => open && setOpen(name)}>
                {name}
              </button>
              {open === name && <Menu items={nestMenu(menus[name].filter((m) => !m.label || !hiddenMenu.has(`${name}:${m.label}`)).map(withDescription))} onClose={() => setOpen(null)} style={{ top: '100%', left: 0 }} />}
            </div>
          ))}
          <button
            className={`k-mb-pin k-tip ${pinned ? 'active' : ''}`}
            data-tip={pinned ? 'Unpin menu' : 'Pin menu'}
            onClick={() => {
              setPinned(!pinned);
              try {
                localStorage.setItem('phlippo.menuPinned', String(!pinned));
              } catch {
                /* ignore */
              }
            }}
          >
            <Icon.Pin size={12} />
          </button>
        </div>
      )}
      <div className="k-title">
        {sketchTitle}
      </div>
      {searchOpen ? (
        <div className="k-mb-search k-mb-search-title">
          <Icon.Search size={13} />
          <input
            autoFocus
            placeholder="Search Commands"
            onKeyDown={(e) => e.stopPropagation()}
            onBlur={() => setSearchOpen(false)}
            onKeyUp={(e) => {
              if (e.key === 'Escape') setSearchOpen(false);
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value.toLowerCase();
                const hit = Object.values(menus).flat().find((m) => !m.separator && m.label?.toLowerCase().includes(q) && !m.disabled);
                hit?.onSelect?.();
                (e.target as HTMLInputElement).value = '';
                setSearchOpen(false);
              }
            }}
          />
          <Icon.ChevronDown size={10} />
        </div>
      ) : (
        <button className="k-mb-btn k-mb-btn-dark k-tip" data-tip="Search Commands" onClick={() => setSearchOpen(true)}><Icon.Search size={18} /></button>
      )}
      {tb(<Icon.User />, 'Sign in (not part of this build)', () => st.pushMessage('Sign-in is not part of this build.'))}
      {tb(<Icon.Help />, 'Help (?)', () => st.setPanel('shortcuts', { visible: true }))}
      <div className="k-win-controls">
        <button className="k-tip" data-tip="Minimize" onClick={() => (api ? api.minimize() : st.pushMessage('Minimizing the window is available in the desktop app; in the browser use the browser window controls.'))}>—</button>
        <button className="k-tip" data-tip={fullscreen ? 'Restore Down' : api ? 'Maximize' : 'Maximize (full screen, F11)'} onClick={() => (api ? api.toggleMaximize() : document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>{fullscreen ? '❐' : '☐'}</button>
        <button className="k-tip tip-right" data-tip={api ? 'Close' : 'Close document'} onClick={() => withUnsavedCheck(() => (api ? api.close(true) : useStore.setState({ hasDocument: false, dialog: null })))}>✕</button>
      </div>
      <input
        id="phlippo-open-file"
        ref={fileRef}
        type="file"
        accept={FILE_EXTENSION + ',.json,.stl,.step,.stp'}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          openFileData(f.name, await f.arrayBuffer(), null);
          e.target.value = '';
        }}
      />
    </div>
    </>
  );
}
