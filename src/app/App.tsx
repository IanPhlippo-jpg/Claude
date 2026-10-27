import { WhatsWrong } from './WhatsWrong';
import { bridge } from './viewport/bridge';
import { applyUpAxis } from './viewport/camera';
import { getPref } from './prefs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { lazyNamed, preloadLazy } from './lazy';
import { startBrepRefinement } from './brepRefine';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { desktop } from './desktop';
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

import { ViewPane } from './viewport/ViewPane';
import { GeneralTableDialog, LinearNotePatternDialog, RelativeViewDialog, SpellCheckDialog } from './drawing/DrawingExtras';
import { CommentsDialog, ComponentPreview, MirrorComponentsDialog, PackAndGoDialog, ShareDialog } from './lifecycleDialogs';
import { AskDialog, ConfirmDeleteDialog, ModifyDialog, NewDocumentDialog, OrientationDialog, WelcomeDialog } from './dialogs';
import { FinalRenderDialog } from './renderDialogs';
import { ShortcutBar } from './ShortcutBar';
import { MaterialDialog } from './materialDialog';
import '../ui/tokens.css';
import '../ui/components.css';
import './app.css';

// dialogs and the drawing view load when first shown (QA F34): they are not part of the start-up bundle
const CheckDialog = lazyNamed(() => import('./evaluateDialogs'), 'CheckDialog');
const ImportDiagnosticsDialog = lazyNamed(() => import('./evaluateDialogs'), 'ImportDiagnosticsDialog');
const RepairSketchDialog = lazyNamed(() => import('./evaluateDialogs'), 'RepairSketchDialog');
const SectionPropertiesDialog = lazyNamed(() => import('./evaluateDialogs'), 'SectionPropertiesDialog');
const CompareDialog = lazyNamed(() => import('./evaluateDialogs2'), 'CompareDialog');
const CutListDialog = lazyNamed(() => import('./evaluateDialogs2'), 'CutListDialog');
const PerformanceDialog = lazyNamed(() => import('./evaluateDialogs2'), 'PerformanceDialog');
const BeamEstimateDialog = lazyNamed(() => import('./evaluateDialogs2'), 'BeamEstimateDialog');
const SymmetryDialog = lazyNamed(() => import('./evaluateDialogs2'), 'SymmetryDialog');
const SaveAsDialog = lazyNamed(() => import('./evaluateDialogs2'), 'SaveAsDialog');
const CustomizeDialog = lazyNamed(() => import('./customize'), 'CustomizeDialog');
const ExportOptionsDialog = lazyNamed(() => import('./treeDialogs'), 'ExportOptionsDialog');
const BodiesToKeepDialog = lazyNamed(() => import('./treeDialogs'), 'BodiesToKeepDialog');
const FeaturePropertiesDialog = lazyNamed(() => import('./treeDialogs'), 'FeaturePropertiesDialog');
const ParentChildDialog = lazyNamed(() => import('./treeDialogs'), 'ParentChildDialog');
const DesignStudyDialog = lazyNamed(() => import('./designStudy'), 'DesignStudyDialog');
const PreviewWindow = lazyNamed(() => import('./previewWindow'), 'PreviewWindow');
const OptionsDialog = lazyNamed(() => import('./options'), 'OptionsDialog');
const MassPropertiesDialog = lazyNamed(() => import('./evaluate'), 'MassPropertiesDialog');
const MeasureDialog = lazyNamed(() => import('./evaluate'), 'MeasureDialog');
const EquationsDialog = lazyNamed(() => import('./equations'), 'EquationsDialog');
const ModifyConfigurationsDialog = lazyNamed(() => import('./configureDialog'), 'ModifyConfigurationsDialog');
const AppearanceDialog = lazyNamed(() => import('./appearanceDialog'), 'AppearanceDialog');
const BomDialog = lazyNamed(() => import('./assemblyDialogs'), 'BomDialog');
const InterferenceDialog = lazyNamed(() => import('./assemblyDialogs'), 'InterferenceDialog');
const DrawingSheetView = lazyNamed(() => import('./drawing/DrawingSheetView'), 'DrawingSheetView', true);
const SheetFormatDialog = lazyNamed(() => import('./drawing/SheetDialogs'), 'SheetFormatDialog');
const SheetPropertiesDialog = lazyNamed(() => import('./drawing/SheetDialogs'), 'SheetPropertiesDialog');

export function App() {
  const st = useStore(useShallow((s) => ({ theme: s.theme, selectedConstraint: s.selectedConstraint, selectConstraint: s.selectConstraint, panels: s.panels, prefs: s.prefs, managerCollapsed: s.managerCollapsed, hasDocument: s.hasDocument, doc: s.doc, viewportLayout: s.viewportLayout, setPanel: s.setPanel, dialog: s.dialog, confirmDelete: s.confirmDelete, motionOpen: s.motionOpen, setMotionOpen: s.setMotionOpen, ask: s.ask })));
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
    const offSelfTest = api.onSelfTest?.(() => { void import('./selfTest').then((m) => m.runSelfTest()).then((r) => api.selfTestDone?.(r)); });
    return () => { offOpen?.(); offClose?.(); offSelfTest?.(); };
  }, []);
  // browser: leaving the page with unsaved changes asks first
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const s = useStore.getState();
      if (s.hasDocument && (s.dirty || !!s.editContext) && !desktop()) { e.preventDefault(); e.returnValue = ''; }
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
  // the chunks of the Property Panel, the drawing view and the tree panels are fetched once the app has painted
  useEffect(() => { const t = window.setTimeout(preloadLazy, 300); return () => window.clearTimeout(t); }, []);
  // the B-rep kernel refines every part rebuild in its worker (docs/14)
  useEffect(() => startBrepRefinement(), []);
  // View ▸ Modify ▸ Up Axis: the saved choice applies to the standard views from the start
  useEffect(() => { applyUpAxis(getPref('view.upAxis') === 'Z' ? 'Z' : 'Y'); }, []);
  // the command catalog (Customize) reaches Save and the shortcut bar through these hooks
  useEffect(() => {
    bridge.save = handlers.save;
    bridge.shortcutBar = handlers.shortcutBar;
  }, [handlers]);

  const onEditDimension = useCallback((id: string) => {
    st.selectConstraint(id);
    setEditDim(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manager = st.panels.manager.visible ? <ManagerPane editDimensionId={editDim} onEditDone={() => setEditDim(null)} /> : null;
  const managerSide = st.panels.manager.side;

  return (
    <div className={`k-app${st.prefs['customize.tooltips'] === false ? ' k-notips' : ''}${st.prefs['customize.largeTooltips'] === false ? ' k-smalltips' : ''}`}>
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
          {st.dialog === 'importDiagnostics' && <ImportDiagnosticsDialog />}
          {st.dialog === 'performance' && <PerformanceDialog />}
          {st.dialog === 'customize' && <CustomizeDialog />}
          {st.dialog === 'cutList' && <CutListDialog />}
          {st.dialog === 'saveAs' && <SaveAsDialog />}
          <WhatsWrong />
          {st.dialog === 'symmetry' && <SymmetryDialog />}
          {st.dialog === 'compare' && <CompareDialog />}
          {st.dialog === 'beamEstimate' && <BeamEstimateDialog />}
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
          {st.dialog === 'bodiesToKeep' && <BodiesToKeepDialog />}
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
