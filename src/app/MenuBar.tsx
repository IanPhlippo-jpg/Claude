import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { Menu, type MenuItem } from '../ui/components';
import { Icon } from '../ui/icons';
import { FILE_EXTENSION, MAX_FILE_BYTES, parseDocument, serializeDocument } from '../core/document/persistence';
import { exportStl, parseStl } from '../core/document/stl';
import { desktop, getDocumentPath, setDocumentPath } from './desktop';
import { getCamera } from './viewport/Viewport';

/** the version from package.json (vite define) */
const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const KCAD_FILTERS = [{ name: 'Phlippo CAD part', extensions: ['kcad'] }, { name: 'All files', extensions: ['*'] }];
const STL_FILTERS = [{ name: 'STL', extensions: ['stl'] }];

function download(name: string, data: BlobPart, type: string) {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Save: in the desktop app to the document's file (asks for a name the first time), in the browser a download. */
export async function saveDocument(forceAsk = false): Promise<boolean> {
  const { doc, pushMessage, hasDocument } = useStore.getState();
  if (!hasDocument) return false;
  const text = serializeDocument(doc);
  const api = desktop();
  if (api) {
    const data = new TextEncoder().encode(text).buffer as ArrayBuffer;
    const known = forceAsk ? undefined : getDocumentPath() ?? undefined;
    const r = await api.saveFile({ defaultPath: `${doc.name}${FILE_EXTENSION}`, filters: KCAD_FILTERS, data, path: known });
    if (!r) return false;
    if (r.error) {
      pushMessage(`${r.name} could not be saved: ${r.error}. The previous file is unchanged.`, 'error');
      return false;
    }
    setDocumentPath(r.path);
    const name = r.name.replace(/\.kcad$/i, '');
    if (name !== doc.name) useStore.getState().renameDocument(name);
    useStore.setState({ dirty: false });
    pushMessage(`${r.name} saved.`);
    return true;
  }
  download(`${doc.name}${FILE_EXTENSION}`, text, 'application/json');
  useStore.setState({ dirty: false });
  return true;
}

/** Unsaved changes: "Save changes to Part1?" with Yes (save, then go on), No (go on) and Cancel, as the original */
export function withUnsavedCheck(then: () => void): void {
  const st = useStore.getState();
  if (!st.hasDocument || !st.dirty) return then();
  st.setAsk({
    title: 'Phlippo CAD',
    text: `Save changes to ${st.doc.name}?`,
    yes: () => { saveDocument().then((ok) => ok && then()); },
    no: then,
    yesLabel: 'Save',
    noLabel: "Don't Save",
  });
}

export const saveDocumentAs = () => saveDocument(true);

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

/** Open a file: a loaded document (.kcad) or an imported mesh (.stl). */
export function openFileData(name: string, data: ArrayBuffer, path: string | null) {
  const st = useStore.getState();
  try {
    if (data.byteLength > MAX_FILE_BYTES) throw new Error(`the file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`);
    if (/\.stl$/i.test(name)) st.importMesh(name, parseStl(data));
    else if (st.doc.kind === 'drawing' && st.drawingEdit?.mode === 'modelView' && !st.drawingEdit.model) {
      const model = parseDocument(new TextDecoder().decode(data));
      if (model.kind === 'drawing') st.pushMessage('Choose a part or assembly file for the view.', 'warn');
      else st.setModelViewSource(model);
    } else if (st.insertingComponent || (st.doc.kind === 'assembly' && st.tab === 'assembly' && st.mateEdit === null && st.dialog === null && st.doc.components?.length === 0)) {
      // Insert Component: the chosen part becomes a component of the open assembly
      const part = parseDocument(new TextDecoder().decode(data));
      if (part.kind === 'drawing') st.pushMessage('A drawing cannot be inserted; choose a part or assembly file.', 'warn');
      // with the Insert Component PM open the part follows the pointer until a click or OK places it, as the original
      else if (st.insertingComponent) st.setInsertGhost({ part, rotation: [0, 0, 0, 1] });
      else st.insertComponent(part);
    } else {
      // parsed and checked before anything changes: a damaged file leaves the open document as it is
      const doc = parseDocument(new TextDecoder().decode(data));
      withUnsavedCheck(() => {
        useStore.getState().openDocument(doc);
        setDocumentPath(path);
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
export function openDesktopFile(f: { name: string; path: string; data?: ArrayBuffer; error?: string }) {
  if (f.error || !f.data) return useStore.getState().pushMessage(`Cannot open ${f.name}: ${f.error ?? 'the file could not be read'}.`, 'error');
  openFileData(f.name, f.data, f.path);
}

export function openFileDialog() {
  const api = desktop();
  if (api) {
    api.openFile([{ name: 'Phlippo CAD files', extensions: ['kcad', 'json', 'stl'] }, ...KCAD_FILTERS, ...STL_FILTERS]).then((f) => f && openDesktopFile(f));
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
  const st = useStore();
  const [open, setOpen] = useState<string | null>(null);
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
  // title as the original: "Sketch1 of Part1 *" while sketching, "Part1 *" otherwise
  const sketchName = st.activeSketchId ? st.doc.sketches[st.activeSketchId]?.name : null;
  const sketchTitle = st.hasDocument ? `${sketchName ? `${sketchName} of ` : ''}${st.doc.name}${st.dirty ? ' *' : ''}` : '';
  const setShortcutBarHint = () => st.pushMessage('Press S for the shortcut bar, ? for all keyboard shortcuts.');

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New…', icon: <Icon.New />, shortcut: 'Ctrl+N', onSelect: () => st.setDialog('new') },
      { label: 'Open…', icon: <Icon.Open />, shortcut: 'Ctrl+O', onSelect: openFileDialog },
      { label: 'Open Recent', onSelect: () => st.setDialog('welcome') },
      { label: 'Close', shortcut: 'Ctrl+W', onSelect: () => withUnsavedCheck(() => useStore.setState({ hasDocument: false, dialog: null })) },
      { separator: true },
      { label: 'Save', icon: <Icon.Save />, shortcut: 'Ctrl+S', onSelect: () => saveDocument() },
      { label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: saveDocumentAs },
      { label: 'Save As ▸ STL (*.stl)', onSelect: saveStl },
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
      { label: 'Previous View', icon: <Icon.Previous />, shortcut: 'Shift+Ctrl+Z', onSelect: () => cam().previousView() },
      { label: 'Zoom to Fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: () => (window as unknown as { __phlippoZoomFit?: () => void }).__phlippoZoomFit?.() },
      { label: 'Modify ▸ Orientation…', icon: <Icon.Orientation />, shortcut: 'Space', onSelect: () => st.setDialog('orientation') },
      { separator: true },
      { label: `Hide/Show ▸ ${st.show.planes ? '✓ ' : ''}Planes`, onSelect: () => st.toggleShow('planes') },
      { label: `Hide/Show ▸ ${st.show.origin ? '✓ ' : ''}Origins`, onSelect: () => st.toggleShow('origin') },
      { label: `Hide/Show ▸ ${st.show.sketches ? '✓ ' : ''}Sketches`, onSelect: () => st.toggleShow('sketches') },
      { label: `Hide/Show ▸ ${st.show.relations ? '✓ ' : ''}Sketch Relations`, onSelect: () => st.toggleShow('relations') },
      { label: `Hide/Show ▸ ${st.show.grid ? '✓ ' : ''}Grid`, onSelect: () => st.toggleShow('grid') },
      { separator: true },
      { label: 'User Interface ▸ FeatureManager Tree Area', onSelect: () => st.setPanel('manager', { visible: !st.panels.manager.visible }) },
      { label: 'User Interface ▸ Task Pane', onSelect: () => st.setTaskPane(st.taskPane ? null : 'resources') },
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
      { label: 'Reference Geometry ▸ Plane…', icon: <Icon.Plane />, disabled: st.doc.kind !== 'part' && !!st.doc.kind, onSelect: () => st.startPlane() },
    ],
    Tools: [
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
      { separator: true },
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
      { label: 'About Phlippo CAD', onSelect: () => st.setAsk({ title: 'About Phlippo CAD', text: `Phlippo CAD ${APP_VERSION} — parametric 3D CAD: parts, assemblies and drawings. An independent product of Ian Phlippo; not affiliated with, endorsed by or derived from Dassault Systèmes SolidWorks Corp. SOLIDWORKS is a trademark of Dassault Systèmes.` }) },
    ],
  };

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
        <span>Phlippo<b>CAD</b> Design</span>
        {!showMenus && <Icon.ChevronRight size={11} className="k-brand-caret" />}
      </div>
      {showMenus && (
        <div className="k-mb-menus" onMouseEnter={() => setHover(true)}>
          {Object.keys(menus).map((name) => (
            <div key={name} style={{ position: 'relative' }}>
              <button className={`k-mb-menu ${open === name ? 'active' : ''}`} onClick={() => setOpen(open === name ? null : name)} onMouseEnter={() => open && setOpen(name)}>
                {name}
              </button>
              {open === name && <Menu items={menus[name]} onClose={() => setOpen(null)} style={{ top: '100%', left: 0 }} />}
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
      <div className="k-mb-search k-mb-search-title">
        <Icon.Search size={13} />
        <input
          placeholder="Search Commands"
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              const q = (e.target as HTMLInputElement).value.toLowerCase();
              const hit = Object.values(menus).flat().find((m) => !m.separator && m.label?.toLowerCase().includes(q) && !m.disabled);
              hit?.onSelect?.();
              (e.target as HTMLInputElement).value = '';
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <Icon.ChevronDown size={10} />
      </div>
      {tb(st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />, 'Light/dark (Ctrl+Shift+D)', () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark'))}
      {tb(<Icon.Keyboard />, 'Command window', () => setShortcutBarHint())}
      {tb(<Icon.Component />, 'Login (not available)', () => st.pushMessage('Sign-in is not part of this build.'))}
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
        accept={FILE_EXTENSION + ',.json,.stl'}
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
