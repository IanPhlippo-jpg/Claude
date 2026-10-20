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
 * Menu bar: the menu (File, Edit, View, Insert, Tools, Window, Help) with the
 * menu-bar toolbar (New, Open, Save, Print, Undo, Redo, Select, Rebuild, Options, Help)
 * and a search field — mirroring the desktop-CAD layout from the manual.
 */
export function MenuBar() {
  const st = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cam = () => getCamera();
  const inSketch = !!st.activeSketchId;

  const menus: Record<string, MenuItem[]> = {
    Bestand: [
      { label: 'Nieuw…', icon: <Icon.New />, shortcut: 'Ctrl+N', onSelect: () => st.setDialog('new') },
      { label: 'Openen…', icon: <Icon.Open />, shortcut: 'Ctrl+O', onSelect: openFileDialog },
      { label: 'Sluiten', shortcut: 'Ctrl+W', onSelect: () => confirm('Document sluiten? Niet-opgeslagen wijzigingen gaan verloren.') && st.newDocument() },
      { separator: true },
      { label: 'Opslaan', icon: <Icon.Save />, shortcut: 'Ctrl+S', onSelect: saveDocument },
      { label: 'Opslaan als…', shortcut: 'Ctrl+Shift+S', onSelect: saveDocument },
      { separator: true },
      { label: 'Afdrukken…', icon: <Icon.Print />, shortcut: 'Ctrl+P', onSelect: () => window.print() },
      { separator: true },
      { label: 'Eigenschappen…', onSelect: () => st.setDialog('options') },
      { label: 'Autosave wissen', onSelect: () => { localStorage.removeItem('phlippo.autosave'); st.pushMessage('Autosave gewist.'); } },
    ],
    Bewerken: [
      { label: `Ongedaan maken${st.undoLabel ? ' ' + st.undoLabel : ''}`, icon: <Icon.Undo />, shortcut: 'Ctrl+Z', disabled: !st.canUndo, onSelect: st.undo },
      { label: `Opnieuw${st.redoLabel ? ' ' + st.redoLabel : ''}`, icon: <Icon.Redo />, shortcut: 'Ctrl+Y', disabled: !st.canRedo, onSelect: st.redo },
      { label: 'Herhaal laatste commando', shortcut: 'Enter', disabled: !inSketch, onSelect: st.repeatLastTool },
      { separator: true },
      { label: 'Verwijderen', icon: <Icon.Trash />, shortcut: 'Del', onSelect: st.deleteSelection },
      { label: 'Rebuild', icon: <Icon.Rebuild />, shortcut: 'Ctrl+B', onSelect: () => st.openDocument(st.doc) },
    ],
    Beeld: [
      { label: 'Vorige weergave', icon: <Icon.Previous />, shortcut: 'Shift+Ctrl+Z', onSelect: () => cam().previousView() },
      { label: 'Zoom to fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: () => (window as unknown as { __phlippoZoomFit?: () => void }).__phlippoZoomFit?.() },
      { label: 'Oriëntatie…', icon: <Icon.Orientation />, shortcut: 'Spatie', onSelect: () => st.setDialog('orientation') },
      { separator: true },
      { label: `${st.show.planes ? '✓ ' : ''}Vlakken`, onSelect: () => st.toggleShow('planes') },
      { label: `${st.show.origin ? '✓ ' : ''}Oorsprong`, onSelect: () => st.toggleShow('origin') },
      { label: `${st.show.sketches ? '✓ ' : ''}Schetsen`, onSelect: () => st.toggleShow('sketches') },
      { label: `${st.show.relations ? '✓ ' : ''}Schetsrelaties`, onSelect: () => st.toggleShow('relations') },
      { label: `${st.show.grid ? '✓ ' : ''}Raster`, onSelect: () => st.toggleShow('grid') },
      { separator: true },
      { label: 'Gebruikersinterface ▸ Feature tree', onSelect: () => st.setPanel('manager', { visible: !st.panels.manager.visible }) },
      { label: 'Gebruikersinterface ▸ Task Pane', onSelect: () => st.setTaskPane(st.taskPane ? null : 'resources') },
      { label: st.theme === 'dark' ? 'Licht thema' : 'Donker thema', icon: st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />, shortcut: 'Ctrl+Shift+D', onSelect: () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark') },
    ],
    Invoegen: [
      { label: 'Schets', icon: <Icon.Sketch />, onSelect: () => (inSketch ? st.exitSketch() : st.startPlanePick()) },
      { label: 'Boss/Base ▸ Extrude… (fase 2)', icon: <Icon.Extrude />, disabled: true },
      { label: 'Cut ▸ Extrude… (fase 2)', icon: <Icon.Cut />, disabled: true },
      { label: 'Features ▸ Fillet… (fase 2)', icon: <Icon.Arc />, disabled: true },
      { label: 'Referentiegeometrie ▸ Vlak… (fase 2)', icon: <Icon.Plane />, disabled: true },
    ],
    Extra: [
      { label: 'Schetsentiteiten ▸ Lijn', icon: <Icon.Line />, disabled: !inSketch, onSelect: () => st.setTool('line') },
      { label: 'Schetsentiteiten ▸ Rechthoek', icon: <Icon.Rect />, disabled: !inSketch, onSelect: () => st.setTool('rectangle') },
      { label: 'Schetsentiteiten ▸ Cirkel', icon: <Icon.Circle />, disabled: !inSketch, onSelect: () => st.setTool('circle') },
      { label: 'Maten ▸ Smart Dimension', icon: <Icon.Dimension />, shortcut: 'M', disabled: !inSketch, onSelect: () => st.setTool('dimension') },
      { label: 'Relaties ▸ Weergeven/verwijderen', icon: <Icon.Lock />, disabled: !inSketch, onSelect: () => st.setTaskPane('relations') },
      { separator: true },
      { label: 'Meten… (fase 7)', icon: <Icon.Measure />, disabled: true },
      { label: 'Massa-eigenschappen… (fase 7)', icon: <Icon.Mass />, disabled: true },
      { separator: true },
      { label: 'Aanpassen ▸ Sneltoetsen', icon: <Icon.Keyboard />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Opties…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') },
    ],
    Venster: [
      { label: `✓ ${st.doc.name}${st.dirty ? ' *' : ''}`, onSelect: () => {} },
      { separator: true },
      { label: 'Viewport ▸ Eén weergave', onSelect: () => {} },
      { label: 'Viewport ▸ Twee / vier weergaven (fase 5)', disabled: true },
    ],
    Help: [
      { label: 'Phlippo CAD Help', icon: <Icon.Help />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
      { label: 'Tutorials (Task Pane ▸ Resources)', onSelect: () => st.setTaskPane('resources') },
      { label: 'Welkom…', onSelect: () => st.setDialog('welcome') },
      { separator: true },
      { label: 'Over Phlippo CAD 0.1', onSelect: () => alert('Phlippo CAD 0.1 — parametrische CAD in de browser.\nFase 1: 2D-schetser met constraint-solver.') },
    ],
  };

  const tb = (icon: React.ReactNode, tip: string, onClick: () => void, disabled = false, active = false) => (
    <button className={`k-mb-btn k-tip ${active ? 'active' : ''}`} data-tip={tip} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );

  return (
    <div className="k-menubar">
      <div className="k-brand">
        <Icon.Logo size={20} />
        <span>Phlippo CAD</span>
      </div>
      <div className="k-mb-menus">
        {Object.keys(menus).map((name) => (
          <div key={name} style={{ position: 'relative' }}>
            <button className={`k-mb-menu ${open === name ? 'active' : ''}`} onClick={() => setOpen(open === name ? null : name)} onMouseEnter={() => open && setOpen(name)}>
              {name}
            </button>
            {open === name && <Menu items={menus[name]} onClose={() => setOpen(null)} style={{ top: '100%', left: 0 }} />}
          </div>
        ))}
        <span className="k-mb-pin k-tip" data-tip="Menu vastpinnen"><Icon.Pin size={13} /></span>
      </div>
      <div className="k-mb-sep" />
      <div className="k-mb-tools">
        {tb(<Icon.New />, 'Nieuw (Ctrl+N)', () => st.setDialog('new'))}
        {tb(<Icon.Open />, 'Openen (Ctrl+O)', openFileDialog)}
        {tb(<Icon.Save />, 'Opslaan (Ctrl+S)', saveDocument)}
        {tb(<Icon.Print />, 'Afdrukken (Ctrl+P)', () => window.print())}
        <div className="k-mb-sep" />
        {tb(<Icon.Undo />, st.undoLabel ? `Ongedaan maken: ${st.undoLabel} (Ctrl+Z)` : 'Ongedaan maken (Ctrl+Z)', st.undo, !st.canUndo)}
        {tb(<Icon.Redo />, st.redoLabel ? `Opnieuw: ${st.redoLabel} (Ctrl+Y)` : 'Opnieuw (Ctrl+Y)', st.redo, !st.canRedo)}
        <div className="k-mb-sep" />
        {tb(<Icon.Select />, 'Selecteren (Esc)', () => st.setTool('select'), false, st.tool === 'select' && inSketch)}
        {tb(<Icon.Rebuild />, 'Rebuild (Ctrl+B)', () => st.openDocument(st.doc))}
        {tb(<Icon.Properties />, 'Bestandseigenschappen', () => st.setDialog('options'))}
        {tb(<Icon.Options />, 'Opties', () => st.setDialog('options'))}
      </div>
      <div className="k-title">
        {st.doc.name}
        {st.dirty ? ' *' : ''}
      </div>
      <div className="k-mb-search">
        <Icon.Search size={13} />
        <input placeholder="Commando's zoeken" onKeyDown={(e) => e.stopPropagation()} onChange={(e) => {
          const q = e.target.value.toLowerCase();
          if (q.length > 2) {
            const all = Object.values(menus).flat().filter((m) => !m.separator && m.label?.toLowerCase().includes(q) && !m.disabled);
            if (all.length === 1 && e.target.value.endsWith('\n')) all[0].onSelect?.();
          }
        }} onKeyUp={(e) => {
          if (e.key === 'Enter') {
            const q = (e.target as HTMLInputElement).value.toLowerCase();
            const hit = Object.values(menus).flat().find((m) => !m.separator && m.label?.toLowerCase().includes(q) && !m.disabled);
            hit?.onSelect?.();
            (e.target as HTMLInputElement).value = '';
            (e.target as HTMLInputElement).blur();
          }
        }} />
      </div>
      {tb(<Icon.Help />, 'Help (?)', () => st.setPanel('shortcuts', { visible: true }))}
      {tb(st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />, 'Licht/donker (Ctrl+Shift+D)', () => st.setTheme(st.theme === 'dark' ? 'light' : 'dark'))}
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
            st.pushMessage(`Kan bestand niet openen: ${(err as Error).message}`, 'error');
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
