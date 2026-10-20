import { useRef, useState } from 'react';
import { useStore } from './store';
import { Menu, type MenuItem } from '../ui/components';
import { Icon } from '../ui/icons';
import { FILE_EXTENSION, parseDocument, serializeDocument } from '../core/document/persistence';
import { getCamera } from './viewport/Viewport';

export function saveDocument() {
  const { doc } = useStore.getState();
  const blob = new Blob([serializeDocument(doc)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.name}${FILE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(a.href);
  useStore.setState({ dirty: false });
}

export function openFileDialog() {
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
  const fileRef = useRef<HTMLInputElement>(null);
  const cam = () => getCamera();
  const inSketch = !!st.activeSketchId;
  const showMenus = pinned || hover || open !== null;

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'New…', icon: <Icon.New />, shortcut: 'Ctrl+N', onSelect: () => st.setDialog('new') },
      { label: 'Open…', icon: <Icon.Open />, shortcut: 'Ctrl+O', onSelect: openFileDialog },
      { label: 'Open Recent', onSelect: () => st.setDialog('welcome') },
      { label: 'Close', shortcut: 'Ctrl+W', onSelect: () => confirm('Close the document? Unsaved changes are lost.') && st.newDocument() },
      { separator: true },
      { label: 'Save', icon: <Icon.Save />, shortcut: 'Ctrl+S', onSelect: saveDocument },
      { label: 'Save As…', shortcut: 'Ctrl+Shift+S', onSelect: saveDocument },
      { label: 'Save All', onSelect: saveDocument },
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
      { label: 'Rebuild', icon: <Icon.Rebuild />, shortcut: 'Ctrl+B', onSelect: () => st.openDocument(st.doc) },
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
      { label: 'Boss/Base ▸ Extrude… (phase 2)', icon: <Icon.Extrude />, disabled: true },
      { label: 'Cut ▸ Extrude… (phase 2)', icon: <Icon.Cut />, disabled: true },
      { label: 'Features ▸ Fillet/Round… (phase 2)', icon: <Icon.Arc />, disabled: true },
      { label: 'Reference Geometry ▸ Plane… (phase 2)', icon: <Icon.Plane />, disabled: true },
    ],
    Tools: [
      { label: 'Sketch Entities ▸ Line', icon: <Icon.Line />, disabled: !inSketch, onSelect: () => st.setTool('line') },
      { label: 'Sketch Entities ▸ Corner Rectangle', icon: <Icon.Rect />, disabled: !inSketch, onSelect: () => st.setTool('rectangle') },
      { label: 'Sketch Entities ▸ Circle', icon: <Icon.Circle />, disabled: !inSketch, onSelect: () => st.setTool('circle') },
      { label: 'Sketch Entities ▸ Polygon', icon: <Icon.Polygon />, disabled: !inSketch, onSelect: () => st.setTool('polygon') },
      { label: 'Dimensions ▸ Smart', icon: <Icon.Dimension />, shortcut: 'M', disabled: !inSketch, onSelect: () => st.setTool('dimension') },
      { label: 'Relations ▸ Display/Delete', icon: <Icon.Lock />, disabled: !inSketch, onSelect: () => st.setTaskPane('relations') },
      { separator: true },
      { label: 'Evaluate ▸ Measure… (phase 7)', icon: <Icon.Measure />, disabled: true },
      { label: 'Evaluate ▸ Mass Properties… (phase 7)', icon: <Icon.Mass />, disabled: true },
      { separator: true },
      { label: 'Customize ▸ Keyboard', icon: <Icon.Keyboard />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Options…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') },
    ],
    Window: [
      { label: `✓ ${st.doc.name}${st.dirty ? ' *' : ''}`, onSelect: () => {} },
      { separator: true },
      { label: 'Viewport ▸ Single View', onSelect: () => {} },
      { label: 'Viewport ▸ Two / Four View (phase 5)', disabled: true },
    ],
    Help: [
      { label: 'Phlippo CAD Help', icon: <Icon.Help />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Tutorials (Task Pane ▸ Resources)', onSelect: () => st.setTaskPane('resources') },
      { label: 'Welcome to Phlippo CAD…', onSelect: () => st.setDialog('welcome') },
      { separator: true },
      { label: 'About Phlippo CAD 0.1', onSelect: () => alert('Phlippo CAD 0.1 — parametric CAD in the browser.\nPhase 1: 2D sketcher with constraint solver.') },
    ],
  };

  const tb = (icon: React.ReactNode, tip: string, onClick: () => void, opts: { disabled?: boolean; active?: boolean; caret?: boolean } = {}) => (
    <button className={`k-mb-btn k-tip ${opts.active ? 'active' : ''}`} data-tip={tip} onClick={onClick} disabled={opts.disabled}>
      {icon}
      {opts.caret && <Icon.ChevronDown size={8} className="k-mb-caret" />}
    </button>
  );

  return (
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
      <div className="k-mb-tools">
        {tb(<Icon.New />, 'New (Ctrl+N)', () => st.setDialog('new'))}
        {tb(<Icon.Open />, 'Open (Ctrl+O)', openFileDialog, { caret: true })}
        {tb(<Icon.Save />, 'Save (Ctrl+S)', saveDocument, { caret: true })}
        {tb(<Icon.Print />, 'Print (Ctrl+P)', () => window.print())}
        {tb(<Icon.Undo />, st.undoLabel ? `Undo ${st.undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)', st.undo, { disabled: !st.canUndo, caret: true })}
        {tb(<Icon.Redo />, st.redoLabel ? `Redo ${st.redoLabel} (Ctrl+Y)` : 'Redo (Ctrl+Y)', st.redo, { disabled: !st.canRedo })}
        {tb(<Icon.Select />, 'Select (Esc)', () => st.setTool('select'), { active: st.tool === 'select' && inSketch, caret: true })}
        {tb(<Icon.Rebuild />, 'Rebuild (Ctrl+B)', () => st.openDocument(st.doc))}
        {tb(<Icon.Properties />, 'File Properties', () => st.setDialog('options'))}
        {tb(<Icon.Options />, 'Options', () => st.setDialog('options'), { caret: true })}
      </div>
      <div className="k-title">
        {st.doc.name}
        {st.dirty ? ' *' : ''}
      </div>
      <div className="k-mb-search">
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
      {tb(<Icon.Component />, 'Login (not available)', () => st.pushMessage('Sign-in is not part of this build.'))}
      {tb(<Icon.Help />, 'Help (?)', () => st.setPanel('shortcuts', { visible: true }), { caret: true })}
      {tb(st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />, 'Light/dark (Ctrl+Shift+D)', () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark'))}
      <div className="k-win-controls" aria-hidden>
        <span>—</span>
        <span>☐</span>
        <span>✕</span>
      </div>
      <input
        id="phlippo-open-file"
        ref={fileRef}
        type="file"
        accept={FILE_EXTENSION + ',.json'}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            st.openDocument(parseDocument(await f.text()));
            st.setDialog(null);
          } catch (err) {
            st.pushMessage(`Cannot open file: ${(err as Error).message}`, 'error');
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
