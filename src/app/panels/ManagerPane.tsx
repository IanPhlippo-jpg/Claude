import { ScenePM } from '../renderDialogs';
import { CurveColorPM } from './CurveColorPM';
import { isCommandActive, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { AssemblyTreeBody } from './AssemblyTreeBody';
import { PlanePM } from './PlanePM';
import { DecalPM, OffsetOnSurfacePM, RefGeomPM } from './RefGeomPM';
import { ToleranceTreeBody, DisplayPanelBody } from './ManagerExtra';
import { SectionViewPM } from './SectionViewPM';
import { ConfigurationPanelBody, ConfigurationPM } from './ConfigurationPanel';
import { Icon } from '../../ui/icons';
import { FeatureTreeBody } from './FeatureTreeBody';
import { DockPanel } from './Dock';
import { lazyNamed } from '../lazy';

const MotorPM = lazyNamed(() => import('../viewport/MotionTimeline'), 'MotorPM', true);
const MotionEditPM = lazyNamed(() => import('../viewport/MotionTimeline'), 'MotionEditPM', true);

// panels in chunks of their own (QA F34); the common ones are preloaded after start-up
const DetailViewPM = lazyNamed(() => import('../drawing/DrawingPM'), 'DetailViewPM', true);
const DrawingDimensionPM = lazyNamed(() => import('../drawing/DrawingPM'), 'DrawingDimensionPM', true);
const ModelViewPM = lazyNamed(() => import('../drawing/DrawingPM'), 'ModelViewPM', true);
const NotePM = lazyNamed(() => import('../drawing/DrawingPM'), 'NotePM', true);
const ProjectedViewPM = lazyNamed(() => import('../drawing/DrawingPM'), 'ProjectedViewPM', true);
const SectionViewDrawingPM = lazyNamed(() => import('../drawing/DrawingPM'), 'SectionViewDrawingPM', true);
const SymbolPM = lazyNamed(() => import('../drawing/DrawingPM'), 'SymbolPM', true);
const ViewToolPM = lazyNamed(() => import('../drawing/DrawingPM'), 'ViewToolPM', true);
const AuxViewPM = lazyNamed(() => import('../drawing/DrawingPM'), 'AuxViewPM', true);
const ModelItemsPM = lazyNamed(() => import('../drawing/DrawingPM'), 'ModelItemsPM', true);
const BrokenOutPM = lazyNamed(() => import('../drawing/DrawingPM'), 'BrokenOutPM', true);
const DrawingViewPM = lazyNamed(() => import('../drawing/DrawingPM'), 'DrawingViewPM', true);
const TitleBlockPM = lazyNamed(() => import('../drawing/DrawingPM'), 'TitleBlockPM', true);
const AltPositionPM = lazyNamed(() => import('../drawing/DrawingPM'), 'AltPositionPM', true);
const DrawingTreeBody = lazyNamed(() => import('./DrawingTreeBody'), 'DrawingTreeBody', true);
const Sketch3DPM = lazyNamed(() => import('./Sketch3DPM'), 'Sketch3DPM');
const FastenerPM = lazyNamed(() => import('./FastenerPM'), 'FastenerPM');
const GeometryAnalysisPM = lazyNamed(() => import('./DraftAnalysisPM'), 'GeometryAnalysisPM');
const ThicknessAnalysisPM = lazyNamed(() => import('./DraftAnalysisPM'), 'ThicknessAnalysisPM');
const UndercutAnalysisPM = lazyNamed(() => import('./DraftAnalysisPM'), 'UndercutAnalysisPM');
const DraftAnalysisPM = lazyNamed(() => import('./DraftAnalysisPM'), 'DraftAnalysisPM');
const SensorPM = lazyNamed(() => import('./SensorPM'), 'SensorPM');
const AutoTolerancePM = lazyNamed(() => import('./AutoTolerancePM'), 'AutoTolerancePM');
const DeviationPM = lazyNamed(() => import('./AnalysisPM2'), 'DeviationPM');
const PartingLinePM = lazyNamed(() => import('./AnalysisPM2'), 'PartingLinePM');
const ComponentPatternPM = lazyNamed(() => import('./AssemblyPM'), 'ComponentPatternPM', true);
const ExplodePM = lazyNamed(() => import('./AssemblyPM'), 'ExplodePM', true);
const InsertComponentPM = lazyNamed(() => import('./AssemblyPM'), 'InsertComponentPM', true);
const MatePM = lazyNamed(() => import('./AssemblyPM'), 'MatePM', true);
const PropertyPanelBody = lazyNamed(() => import('./PropertyPanel'), 'PropertyPanelBody', true);

/**
 * The manager pane on the left: tab strip (Feature Tree,
 * Property Panel, Configurations panel), filter field, hide/show arrow.
 * While a selection or command is active the Property Panel replaces the
 * tree; the fly-out tree can be expanded on top of it.
 */
export function ManagerPane({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore(useShallow((s) => ({ curveColorEdit: s.curveColorEdit, autoToleranceEdit: s.autoToleranceEdit, managerTab: s.managerTab, commandActive: isCommandActive(s), analysis: s.analysis, hasDocument: s.hasDocument, managerCollapsed: s.managerCollapsed, setManagerCollapsed: s.setManagerCollapsed, setManagerTab: s.setManagerTab, configEdit: s.configEdit, decalEdit: s.decalEdit, offsetSurfEdit: s.offsetSurfEdit, refEdit: s.refEdit, sceneEdit: s.sceneEdit, fastenerEdit: s.fastenerEdit, motorEdit: s.motorEdit, motionEdit: s.motionEdit, sensorEdit: s.sensorEdit, sketch3dEdit: s.sketch3dEdit, patternEdit: s.patternEdit, explodeEdit: s.explodeEdit, sectionEdit: s.sectionEdit, planeEdit: s.planeEdit, drawingEdit: s.drawingEdit, doc: s.doc, selectedDrawingDimensionId: s.selectedDrawingDimensionId, selectedDrawingViewId: s.selectedDrawingViewId, mateEdit: s.mateEdit, insertingComponent: s.insertingComponent, prefs: s.prefs, treeFilter: s.treeFilter, setTreeFilter: s.setTreeFilter })));
  // Show Tolerance Status is a display of the Tolerance Tree, not a command with its own Property Panel
  const showProps = !!st.autoToleranceEdit || st.managerTab === 'properties' || ((st.managerTab === 'tree' || st.managerTab === 'autoTolerance' || st.managerTab === 'display') && st.commandActive && st.analysis?.kind !== 'tolerance');

  if (!st.hasDocument) return <div className="k-manager k-manager-empty" data-testid="manager-empty" />;
  if (st.managerCollapsed) {
    return (
      <button className="k-manager-expand k-tip" data-tip="Show Feature Tree" onClick={() => st.setManagerCollapsed(false)}>
        <Icon.ChevronRight size={12} />
      </button>
    );
  }

  const tabs: { id: typeof st.managerTab; icon: React.ReactNode; tip: string }[] = [
    { id: 'tree', icon: <Icon.Part />, tip: 'Feature Tree' },
    { id: 'properties', icon: <Icon.MgrProperty />, tip: 'Property Panel' },
    { id: 'configurations', icon: <Icon.MgrConfig />, tip: 'Configurations' },
  ];

  return (
    <DockPanel
      id="manager"
      title=""
      header={
        <div className="k-manager-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`k-manager-tab k-tip ${st.managerTab === t.id ? 'active' : ''}`} data-tip={t.tip} onClick={() => st.setManagerTab(t.id)}>
              {t.icon}
            </button>
          ))}
          <button className={`k-manager-tab k-tip ${st.managerTab === 'autoTolerance' ? 'active' : ''}`} data-tip="Tolerance Tree" data-testid="tab-autoTolerance" onClick={() => st.setManagerTab('autoTolerance')}><Icon.MgrAutoTolerance /></button>
          <button className={`k-manager-tab k-tip ${st.managerTab === 'display' ? 'active' : ''}`} data-tip="Display Panel" data-testid="tab-display" onClick={() => st.setManagerTab('display')}><Icon.MgrDisplay /></button>
          <span className="grow" />
          {/* the arrow beside the tabs shows with the tree, not while a Property Panel is open, by design */}
          {!showProps && (
            <button className="k-btn ghost icon k-tip" data-tip="Hide Feature Tree area" onClick={() => st.setManagerCollapsed(true)}>
              <Icon.ChevronRight size={12} />
            </button>
          )}
        </div>
      }
    >
      {st.configEdit ? (
        <ConfigurationPM />
      ) : st.managerTab === 'configurations' ? (
        <ConfigurationPanelBody />
      ) : st.managerTab === 'autoTolerance' && !showProps ? (
        <ToleranceTreeBody />
      ) : st.managerTab === 'display' && !showProps ? (
        <DisplayPanelBody />
      ) : showProps ? (
        <div className="k-pm-host">
          {st.curveColorEdit ? <CurveColorPM /> : st.autoToleranceEdit ? <AutoTolerancePM /> : st.decalEdit ? <DecalPM /> : st.offsetSurfEdit ? <OffsetOnSurfacePM /> : st.refEdit ? <RefGeomPM /> : st.sceneEdit ? <ScenePM /> : st.fastenerEdit ? <FastenerPM /> : st.motorEdit ? <MotorPM /> : st.motionEdit && st.motionEdit.kind !== 'plot' ? <MotionEditPM /> : st.sensorEdit ? <SensorPM /> : st.analysis?.kind === 'draft' ? <DraftAnalysisPM /> : st.analysis?.kind === 'geometry' ? <GeometryAnalysisPM /> : st.analysis?.kind === 'thickness' ? <ThicknessAnalysisPM /> : st.analysis?.kind === 'undercut' ? <UndercutAnalysisPM /> : st.analysis?.kind === 'parting' ? <PartingLinePM /> : st.analysis?.kind === 'deviation' ? <DeviationPM /> : st.sketch3dEdit ? <Sketch3DPM /> : st.patternEdit ? <ComponentPatternPM /> : st.explodeEdit ? <ExplodePM /> : st.sectionEdit ? <SectionViewPM /> : st.planeEdit ? <PlanePM /> : st.drawingEdit ? (st.drawingEdit.mode === 'modelView' ? <ModelViewPM /> : st.drawingEdit.mode === 'projected' ? <ProjectedViewPM /> : st.drawingEdit.mode === 'dimension' ? <DrawingDimensionPM /> : st.drawingEdit.mode === 'note' ? <NotePM /> : st.drawingEdit.mode === 'section' ? <SectionViewDrawingPM /> : st.drawingEdit.mode === 'detail' ? <DetailViewPM /> : st.drawingEdit.mode === 'symbol' ? <SymbolPM /> : st.drawingEdit.mode === 'crop' || st.drawingEdit.mode === 'break' ? <ViewToolPM /> : st.drawingEdit.mode === 'aux' ? <AuxViewPM /> : st.drawingEdit.mode === 'modelItems' ? <ModelItemsPM /> : st.drawingEdit.mode === 'brokenOut' ? <BrokenOutPM /> : st.drawingEdit.mode === 'titleBlock' ? <TitleBlockPM /> : st.drawingEdit.mode === 'altPosition' ? <AltPositionPM /> : <DrawingDimensionPM />) : st.doc.kind === 'drawing' && st.selectedDrawingDimensionId ? <DrawingDimensionPM /> : st.doc.kind === 'drawing' && st.selectedDrawingViewId ? <DrawingViewPM /> : st.mateEdit ? <MatePM /> : st.insertingComponent ? <InsertComponentPM /> : <PropertyPanelBody editDimensionId={editDimensionId} onEditDone={onEditDone} />}
        </div>
      ) : (
        <>
          {st.prefs['fm.treeFilter'] !== false && <div className="k-tree-filter">
            <Icon.Filter size={18} />
            <input className="k-input" aria-label="Filter" title="Filter the Feature Tree" value={st.treeFilter} onChange={(e) => st.setTreeFilter(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>}
          {st.doc.kind === 'assembly' ? <AssemblyTreeBody /> : st.doc.kind === 'drawing' ? <DrawingTreeBody /> : <FeatureTreeBody />}
        </>
      )}
    </DockPanel>
  );
}
