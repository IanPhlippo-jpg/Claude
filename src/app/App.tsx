import { CheckDialog, RepairSketchDialog, SectionPropertiesDialog } from './evaluateDialogs';
import { CompareDialog, PerformanceDialog, SimXpressDialog, SymmetryDialog } from './evaluateDialogs2';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { desktop } from './desktop';
import { ExportOptionsDialog, FeaturePropertiesDialog, ParentChildDialog } from './treeDialogs';
import { openDesktopFile, withUnsavedCheck } from './MenuBar';
import { MenuBar, openFileDialog, saveDocument } from './MenuBar';
import { Ribbon } from './ribbon/Ribbon';
import { DockColumn } from './panels/Dock';
import { ManagerPane } from './panels/ManagerPane';
import { TaskPane } from './panels/TaskPane';
import { Viewport } from './viewport/Viewport';
import { StatusBar } from './StatusBar';
import { SHORTCUTS, useShortcuts } from './shortcuts';
import { Dialog, Kbd } from '../ui/components';

import { DesignStudyDialog } from './designStudy';
import { ViewPane } from './viewport/ViewPane';
import { GeneralTableDialog, LinearNotePatternDialog, RelativeViewDialog, SpellCheckDialog } from './drawing/DrawingExtras';
import { PreviewWindow } from './previewWindow';
import { CommentsDialog, ComponentPreview, MirrorComponentsDialog, PackAndGoDialog, ShareDialog } from './lifecycleDialogs';
import { AskDialog, ConfirmDeleteDialog, ModifyDialog, NewDocumentDialog, OrientationDialog, WelcomeDialog } from './dialogs';
import { OptionsDialog } from './options';
import { MassPropertiesDialog, MeasureDialog } from './evaluate';
import { EquationsDialog } from './equations';
import { ModifyConfigurationsDialog } from './configureDialog';
import { AppearanceDialog } from './appearanceDialog';
import { BomDialog, InterferenceDialog } from './assemblyDialogs';
import { FinalRenderDialog } from './renderDialogs';
import { DrawingSheetView } from './drawing/DrawingSheetView';
import { ShortcutBar } from './ShortcutBar';
import { MaterialDialog } from './materialDialog';
import { SheetFormatDialog, SheetPropertiesDialog } from './drawing/SheetDialogs';
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
  // desktop shell: a .kcad double-clicked in the file manager, and the window's close button with unsaved changes
  useEffect(() => {
    const api = desktop();
    if (!api) return;
    const offOpen = api.onOpenFile?.((f) => openDesktopFile(f));
    const offClose = api.onCloseRequested?.(() => withUnsavedCheck(() => api.close(true)));
    return () => { offOpen?.(); offClose?.(); };
  }, []);
  // browser: leaving the page with unsaved changes asks first
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const s = useStore.getState();
      if (s.hasDocument && s.dirty && !desktop()) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
  useEffect(() => {
    if (!st.selectedConstraint) setEditDim(null);
  }, [st.selectedConstraint]);

  const handlers = useMemo(
    () => ({
      save: () => saveDocument(),
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
          {!st.hasDocument ? <div className="k-viewport k-nodoc" data-testid="nodoc" /> : st.doc.kind === 'drawing' ? <DrawingSheetView /> : st.viewportLayout === 'single' ? <Viewport onEditDimension={onEditDimension} /> : (
            <div className={`k-viewgrid k-viewgrid-${st.viewportLayout}`} data-testid="viewgrid">
              {st.viewportLayout === 'four' && <ViewPane view="front" />}
              {st.viewportLayout === 'four' && <ViewPane view="top" />}
              {st.viewportLayout !== 'twoH' && st.viewportLayout !== 'four' && <ViewPane view="front" />}
              {st.viewportLayout === 'twoH' && <ViewPane view="top" />}
              {st.viewportLayout === 'four' && <ViewPane view="right" />}
              <div className="k-viewgrid-main"><Viewport onEditDimension={onEditDimension} /></div>
            </div>
          )}
          {managerSide === 'float' && manager}
          {st.panels.shortcuts.visible && (
            <Dialog title="Keyboard Shortcuts" onClose={() => st.setPanel('shortcuts', { visible: false })}>
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
          {st.dialog === 'mass' && <MassPropertiesDialog />}
          {st.dialog === 'appearance' && <AppearanceDialog />}
          {st.dialog === 'measure' && <MeasureDialog />}
          {st.dialog === 'bom' && <BomDialog />}
          {st.dialog === 'finalRender' && <FinalRenderDialog />}
          {st.dialog === 'interference' && <InterferenceDialog />}
          {st.dialog === 'check' && <CheckDialog />}
          {st.dialog === 'performance' && <PerformanceDialog />}
          {st.dialog === 'symmetry' && <SymmetryDialog />}
          {st.dialog === 'compare' && <CompareDialog />}
          {st.dialog === 'simxpress' && <SimXpressDialog />}
          {st.dialog === 'sectionProps' && <SectionPropertiesDialog />}
          {st.dialog === 'repairSketch' && <RepairSketchDialog />}
          {st.confirmDelete && <ConfirmDeleteDialog />}
          {st.dialog === 'designStudy' && <DesignStudyDialog />}
          {st.dialog === 'previewWindow' && <PreviewWindow />}
          {st.dialog === 'mirrorComponents' && <MirrorComponentsDialog />}
          {st.dialog === 'packAndGo' && <PackAndGoDialog />}
          {st.dialog === 'share' && <ShareDialog />}
          {st.dialog === 'comments' && <CommentsDialog />}
          {st.dialog === 'componentPreview' && <ComponentPreview />}
          {st.dialog === 'relativeView' && <RelativeViewDialog />}
          {st.dialog === 'spellCheck' && <SpellCheckDialog />}
          {st.dialog === 'notePattern' && <LinearNotePatternDialog />}
          {st.dialog === 'generalTable' && <GeneralTableDialog />}
          {st.dialog === 'featureProps' && <FeaturePropertiesDialog />}
          {st.dialog === 'parentChild' && <ParentChildDialog />}
          {st.dialog === 'exportOptions' && <ExportOptionsDialog />}
          {shortcutBar && (
            <div className="k-shortcut-bar">
              <ShortcutBar onClose={() => setShortcutBar(false)} />
            </div>
          )}
        </div>
        {managerSide === 'right' && manager && <DockColumn side="right">{manager}</DockColumn>}
        <TaskPane />
      </div>
      {st.doc.kind !== 'drawing' && (
        <div className="k-doctabs">
          <button className="k-doctab-arrow">‹</button>
          <button className="k-doctab-arrow">›</button>
          <button className={`k-doctab ${st.motionOpen ? '' : 'active'}`} onClick={() => st.setMotionOpen(false)}>Model</button>
          <button className={`k-doctab ${st.motionOpen ? 'active' : ''}`} data-testid="motion-tab" onClick={() => st.setMotionOpen(true)}>{st.doc.motionStudy?.name ?? 'Motion Study 1'}</button>
        </div>
      )}
      <StatusBar hint="" />
      {st.dialog === 'welcome' && <WelcomeDialog />}
      {st.dialog === 'new' && <NewDocumentDialog />}
      {st.dialog === 'options' && <OptionsDialog />}
      {st.dialog === 'equations' && <EquationsDialog />}
      {st.dialog === 'configure' && <ModifyConfigurationsDialog />}
      {st.dialog === 'sheetFormat' && <SheetFormatDialog />}
      {st.dialog === 'material' && <MaterialDialog />}
      {st.dialog === 'sheetProperties' && <SheetPropertiesDialog />}
      <ModifyDialog />
      {/* a question (Save changes?) always lies on top of the other dialogs */}
      {st.ask && <AskDialog />}
    </div>
  );
}
