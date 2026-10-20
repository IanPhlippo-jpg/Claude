import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { TitleBar, saveDocument } from './TitleBar';
import { Ribbon } from './ribbon/Ribbon';
import { DockColumn } from './panels/Dock';
import { FeatureTree } from './panels/FeatureTree';
import { PropertyManager } from './panels/PropertyManager';
import { RelationsPanel } from './panels/RelationsPanel';
import { Viewport, getCamera } from './viewport/Viewport';
import { StatusBar } from './StatusBar';
import { SHORTCUTS, useShortcuts } from './shortcuts';
import { Dialog, Kbd, Menu } from '../ui/components';
import { Icon } from '../ui/icons';
import type { StandardView } from './viewport/camera';
import '../ui/tokens.css';
import '../ui/components.css';
import './app.css';

export function App() {
  const st = useStore();
  const [editDim, setEditDim] = useState<string | null>(null);
  const [orientation, setOrientation] = useState(false);
  const [shortcutBar, setShortcutBar] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = st.theme;
  }, [st.theme]);

  const handlers = useMemo(
    () => ({
      save: saveDocument,
      open: () => (document.querySelector('input[type=file]') as HTMLInputElement | null)?.click(),
      orientation: () => setOrientation((o) => !o),
      shortcutBar: () => setShortcutBar((o) => !o),
    }),
    [],
  );
  useShortcuts(handlers);

  const onEditDimension = useCallback((id: string) => {
    st.selectConstraint(id);
    st.setPanel('properties', { visible: true });
    setEditDim(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panelsOn = (side: 'left' | 'right') =>
    (['tree', 'properties', 'relations'] as const).filter((id) => st.panels[id].visible && st.panels[id].side === side);
  const render = (id: 'tree' | 'properties' | 'relations') =>
    id === 'tree' ? <FeatureTree key={id} /> : id === 'properties' ? <PropertyManager key={id} editDimensionId={editDim} onEditDone={() => setEditDim(null)} /> : <RelationsPanel key={id} />;
  const floating = (['tree', 'properties', 'relations'] as const).filter((id) => st.panels[id].visible && st.panels[id].side === 'float');

  const views: { id: StandardView; label: string; keys: string }[] = [
    { id: 'front', label: 'Voor', keys: 'Ctrl+1' },
    { id: 'back', label: 'Achter', keys: 'Ctrl+2' },
    { id: 'left', label: 'Links', keys: 'Ctrl+3' },
    { id: 'right', label: 'Rechts', keys: 'Ctrl+4' },
    { id: 'top', label: 'Boven', keys: 'Ctrl+5' },
    { id: 'bottom', label: 'Onder', keys: 'Ctrl+6' },
    { id: 'isometric', label: 'Isometrisch', keys: 'Ctrl+7' },
    { id: 'dimetric', label: 'Dimetrisch', keys: '' },
    { id: 'trimetric', label: 'Trimetrisch', keys: '' },
  ];

  return (
    <div className="k-app">
      <TitleBar onOpen={() => setEditDim(null)} />
      <Ribbon />
      <div className="k-main">
        <DockColumn side="left">{panelsOn('left').map(render)}</DockColumn>
        <div className="k-center">
          <Viewport onEditDimension={onEditDimension} />
          {floating.map(render)}
          {st.panels.shortcuts.visible && (
            <Dialog title="Sneltoetsen" onClose={() => st.setPanel('shortcuts', { visible: false })}>
              <table className="k-shortcuts">
                <tbody>
                  {SHORTCUTS.map((s, i) => (
                    <tr key={i}>
                      <td className="k-muted">{i === 0 || SHORTCUTS[i - 1].group !== s.group ? s.group : ''}</td>
                      <td><Kbd>{s.keys}</Kbd></td>
                      <td>{s.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Dialog>
          )}
          {orientation && (
            <div className="k-orientation">
              <Menu
                onClose={() => setOrientation(false)}
                style={{ position: 'static' }}
                items={[
                  ...views.map((v) => ({ label: v.label, shortcut: v.keys, onSelect: () => getCamera().setView(v.id) })),
                  { separator: true },
                  { label: 'Normal to', shortcut: 'Ctrl+8', onSelect: () => getCamera().normalTo(st.activeSketchId ? st.doc.sketches[st.activeSketchId].plane : 'front') },
                ]}
              />
            </div>
          )}
          {shortcutBar && st.activeSketchId && (
            <div className="k-shortcut-bar">
              <Menu
                onClose={() => setShortcutBar(false)}
                style={{ position: 'static', display: 'flex', gap: 2 }}
                items={[
                  { label: 'Lijn', icon: <Icon.Line />, onSelect: () => st.setTool('line') },
                  { label: 'Rechthoek', icon: <Icon.Rect />, onSelect: () => st.setTool('rectangle') },
                  { label: 'Cirkel', icon: <Icon.Circle />, onSelect: () => st.setTool('circle') },
                  { label: 'Boog', icon: <Icon.Arc />, onSelect: () => st.setTool('arc3') },
                  { label: 'Spline', icon: <Icon.Spline />, onSelect: () => st.setTool('spline') },
                  { label: 'Maat', icon: <Icon.Dimension />, onSelect: () => st.setTool('dimension') },
                ]}
              />
            </div>
          )}
        </div>
        <DockColumn side="right">{panelsOn('right').map(render)}</DockColumn>
      </div>
      <StatusBar hint="" />
    </div>
  );
}
