import { useRef } from 'react';
import { useStore } from './store';
import { Dropdown } from '../ui/components';
import { Icon } from '../ui/icons';
import { FILE_EXTENSION, parseDocument, serializeDocument } from '../core/document/persistence';

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

export function TitleBar({ onOpen }: { onOpen: () => void }) {
  const st = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const openFile = () => fileRef.current?.click();
  return (
    <div className="k-titlebar">
      <div className="k-brand">
        <Icon.Logo size={20} />
        <span>Kalibr CAD</span>
      </div>
      <Dropdown
        label="Bestand"
        variant="ghost"
        items={[
          { label: 'Nieuw', icon: <Icon.New />, onSelect: () => confirm('Nieuw document? Niet-opgeslagen wijzigingen gaan verloren.') && st.newDocument() },
          { label: 'Openen…', icon: <Icon.Open />, shortcut: 'Ctrl+O', onSelect: openFile },
          { label: 'Opslaan', icon: <Icon.Save />, shortcut: 'Ctrl+S', onSelect: saveDocument },
          { separator: true },
          { label: 'Autosave wissen', onSelect: () => { localStorage.removeItem('kalibr.autosave'); st.pushMessage('Autosave gewist.'); } },
        ]}
      />
      <Dropdown
        label="Bewerken"
        variant="ghost"
        items={[
          { label: 'Ongedaan maken', icon: <Icon.Undo />, shortcut: 'Ctrl+Z', disabled: !st.canUndo, onSelect: st.undo },
          { label: 'Opnieuw', icon: <Icon.Redo />, shortcut: 'Ctrl+Y', disabled: !st.canRedo, onSelect: st.redo },
          { separator: true },
          { label: 'Verwijderen', icon: <Icon.Trash />, shortcut: 'Del', onSelect: st.deleteSelection },
        ]}
      />
      <Dropdown
        label="Beeld"
        variant="ghost"
        items={[
          { label: 'Feature tree', onSelect: () => st.setPanel('tree', { visible: !st.panels.tree.visible }) },
          { label: 'Property Manager', onSelect: () => st.setPanel('properties', { visible: !st.panels.properties.visible }) },
          { label: 'Relaties', onSelect: () => st.setPanel('relations', { visible: !st.panels.relations.visible }) },
          { separator: true },
          { label: st.showGrid ? 'Raster verbergen' : 'Raster tonen', onSelect: () => st.toggle('showGrid') },
          { label: st.showRelations ? 'Relaties verbergen' : 'Relaties tonen', onSelect: () => st.toggle('showRelations') },
          { separator: true },
          { label: 'Sneltoetsen', icon: <Icon.Keyboard />, shortcut: '?', onSelect: () => st.setPanel('shortcuts', { visible: true }) },
        ]}
      />
      <div className="k-title">
        {st.doc.name}
        {st.dirty ? ' •' : ''}
        {st.activeSketchId && <span className="k-chip" style={{ marginLeft: 8 }}>Schets bewerken: {st.doc.sketches[st.activeSketchId]?.name}</span>}
      </div>
      <button className="k-btn ghost icon k-tip" data-tip="Licht/donker (Ctrl+Shift+D)" onClick={() => st.setTheme(st.theme === 'dark' ? 'light' : 'dark')}>
        {st.theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={FILE_EXTENSION + ',.json'}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            st.openDocument(parseDocument(await f.text()));
            onOpen();
          } catch (err) {
            st.pushMessage(`Kan bestand niet openen: ${(err as Error).message}`, 'error');
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
