import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { MenuBar, openFileDialog, saveDocument } from './MenuBar';
import { Ribbon } from './ribbon/Ribbon';
import { DockColumn } from './panels/Dock';
import { ManagerPane } from './panels/ManagerPane';
import { TaskPane } from './panels/TaskPane';
import { Viewport } from './viewport/Viewport';
import { StatusBar } from './StatusBar';
import { SHORTCUTS, useShortcuts } from './shortcuts';
import { Dialog, Kbd, Menu } from '../ui/components';
import { Icon } from '../ui/icons';
import { ModifyDialog, NewDocumentDialog, OptionsDialog, OrientationDialog, WelcomeDialog } from './dialogs';
import '../ui/tokens.css';
import '../ui/components.css';
import './app.css';

export function App() {
  const st = useStore();
  const [editDim, setEditDim] = useState<string | null>(null);
  const [shortcutBar, setShortcutBar] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = st.theme;
  }, [st.theme]);

  const handlers = useMemo(
    () => ({
      save: saveDocument,
      open: openFileDialog,
      shortcutBar: () => setShortcutBar((o) => !o),
    }),
    [],
  );
  useShortcuts(handlers);

  const onEditDimension = useCallback((id: string) => {
    st.selectConstraint(id);
    setEditDim(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manager = st.panels.manager.visible ? <ManagerPane editDimensionId={editDim} onEditDone={() => setEditDim(null)} /> : null;
  const managerSide = st.panels.manager.side;

  return (
    <div className="k-app">
      <MenuBar />
      <Ribbon />
      <div className="k-main">
        {managerSide === 'left' && manager && (st.managerCollapsed ? manager : <DockColumn side="left">{manager}</DockColumn>)}
        <div className="k-center">
          <Viewport onEditDimension={onEditDimension} />
          {managerSide === 'float' && manager}
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
          {st.dialog === 'orientation' && <OrientationDialog />}
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
                  { label: 'Trim', icon: <Icon.Trim />, disabled: true },
                ]}
              />
            </div>
          )}
        </div>
        {managerSide === 'right' && manager && <DockColumn side="right">{manager}</DockColumn>}
        <TaskPane />
      </div>
      <StatusBar hint="" />
      {st.dialog === 'welcome' && <WelcomeDialog />}
      {st.dialog === 'new' && <NewDocumentDialog />}
      {st.dialog === 'options' && <OptionsDialog />}
      <ModifyDialog />
    </div>
  );
}
