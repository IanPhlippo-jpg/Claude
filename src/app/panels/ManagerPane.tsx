import { ScenePM } from '../renderDialogs';
import { FastenerPM } from './FastenerPM';
import { GeometryAnalysisPM, ThicknessAnalysisPM, UndercutAnalysisPM } from './DraftAnalysisPM';
import { MotorPM, MotionEditPM } from '../viewport/MotionManager';
import { isCommandActive, useStore } from '../store';
import { Sketch3DPM } from './Sketch3DPM';
import { DraftAnalysisPM } from './DraftAnalysisPM';
import { SensorPM } from './SensorPM';
import { AssemblyTreeBody } from './AssemblyTreeBody';
import { ComponentPatternPM, ExplodePM, InsertComponentPM, MatePM } from './AssemblyPM';
import { DrawingTreeBody } from './DrawingTreeBody';
import { PlanePM } from './PlanePM';
import { DecalPM, OffsetOnSurfacePM, RefGeomPM } from './RefGeomPM';
import { DimXpertManagerBody, DisplayManagerBody } from './ManagerExtra';
import { SectionViewPM } from './SectionViewPM';
import { ConfigurationManagerBody, ConfigurationPM } from './ConfigurationManager';
import { DetailViewPM, DrawingDimensionPM, ModelViewPM, NotePM, ProjectedViewPM, SectionViewDrawingPM, SymbolPM, ViewToolPM, AuxViewPM, ModelItemsPM, BrokenOutPM, DrawingViewPM, TitleBlockPM, AltPositionPM } from '../drawing/DrawingPM';
import { Icon } from '../../ui/icons';
import { FeatureTreeBody } from './FeatureTreeBody';
import { PropertyManagerBody } from './PropertyManager';
import { DockPanel } from './Dock';

/**
 * The manager pane on the left: tab strip (FeatureManager design tree,
 * PropertyManager, ConfigurationManager), filter field, hide/show arrow.
 * While a selection or command is active the PropertyManager replaces the
 * tree; the fly-out tree can be expanded on top of it.
 */
export function ManagerPane({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore();
  const showProps = st.managerTab === 'properties' || ((st.managerTab === 'tree' || st.managerTab === 'dimxpert' || st.managerTab === 'display') && isCommandActive(st));

  if (!st.hasDocument) return <div className="k-manager k-manager-empty" data-testid="manager-empty" />;
  if (st.managerCollapsed) {
    return (
      <button className="k-manager-expand k-tip" data-tip="Show FeatureManager" onClick={() => st.setManagerCollapsed(false)}>
        <Icon.ChevronRight size={12} />
      </button>
    );
  }

  const tabs: { id: typeof st.managerTab; icon: React.ReactNode; tip: string }[] = [
    { id: 'tree', icon: <Icon.Tree />, tip: 'FeatureManager design tree' },
    { id: 'properties', icon: <Icon.Properties />, tip: 'PropertyManager' },
    { id: 'configurations', icon: <Icon.Config />, tip: 'ConfigurationManager' },
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
          <button className={`k-manager-tab k-tip ${st.managerTab === 'dimxpert' ? 'active' : ''}`} data-tip="DimXpertManager" data-testid="tab-dimxpert" onClick={() => st.setManagerTab('dimxpert')}><Icon.Dimension /></button>
          <button className={`k-manager-tab k-tip ${st.managerTab === 'display' ? 'active' : ''}`} data-tip="DisplayManager" data-testid="tab-display" onClick={() => st.setManagerTab('display')}><Icon.Appearance /></button>
          <span className="grow" />
          <button className="k-btn ghost icon k-tip" data-tip="Hide FeatureManager tree area" onClick={() => st.setManagerCollapsed(true)}>
            <Icon.ChevronRight size={12} />
          </button>
        </div>
      }
    >
      {st.configEdit ? (
        <ConfigurationPM />
      ) : st.managerTab === 'configurations' ? (
        <ConfigurationManagerBody />
      ) : st.managerTab === 'dimxpert' && !showProps ? (
        <DimXpertManagerBody />
      ) : st.managerTab === 'display' && !showProps ? (
        <DisplayManagerBody />
      ) : showProps ? (
        <div className="k-pm-host">
          {st.decalEdit ? <DecalPM /> : st.offsetSurfEdit ? <OffsetOnSurfacePM /> : st.refEdit ? <RefGeomPM /> : st.sceneEdit ? <ScenePM /> : st.fastenerEdit ? <FastenerPM /> : st.motorEdit ? <MotorPM /> : st.motionEdit && st.motionEdit.kind !== 'plot' ? <MotionEditPM /> : st.sensorEdit ? <SensorPM /> : st.analysis?.kind === 'draft' ? <DraftAnalysisPM /> : st.analysis?.kind === 'geometry' ? <GeometryAnalysisPM /> : st.analysis?.kind === 'thickness' ? <ThicknessAnalysisPM /> : st.analysis?.kind === 'undercut' ? <UndercutAnalysisPM /> : st.sketch3dEdit ? <Sketch3DPM /> : st.patternEdit ? <ComponentPatternPM /> : st.explodeEdit ? <ExplodePM /> : st.sectionEdit ? <SectionViewPM /> : st.planeEdit ? <PlanePM /> : st.drawingEdit ? (st.drawingEdit.mode === 'modelView' ? <ModelViewPM /> : st.drawingEdit.mode === 'projected' ? <ProjectedViewPM /> : st.drawingEdit.mode === 'dimension' ? <DrawingDimensionPM /> : st.drawingEdit.mode === 'note' ? <NotePM /> : st.drawingEdit.mode === 'section' ? <SectionViewDrawingPM /> : st.drawingEdit.mode === 'detail' ? <DetailViewPM /> : st.drawingEdit.mode === 'symbol' ? <SymbolPM /> : st.drawingEdit.mode === 'crop' || st.drawingEdit.mode === 'break' ? <ViewToolPM /> : st.drawingEdit.mode === 'aux' ? <AuxViewPM /> : st.drawingEdit.mode === 'modelItems' ? <ModelItemsPM /> : st.drawingEdit.mode === 'brokenOut' ? <BrokenOutPM /> : st.drawingEdit.mode === 'titleBlock' ? <TitleBlockPM /> : st.drawingEdit.mode === 'altPosition' ? <AltPositionPM /> : <DrawingDimensionPM />) : st.doc.kind === 'drawing' && st.selectedDrawingDimensionId ? <DrawingDimensionPM /> : st.doc.kind === 'drawing' && st.selectedDrawingViewId ? <DrawingViewPM /> : st.mateEdit ? <MatePM /> : st.insertingComponent ? <InsertComponentPM /> : <PropertyManagerBody editDimensionId={editDimensionId} onEditDone={onEditDone} />}
        </div>
      ) : (
        <>
          {st.prefs['fm.treeFilter'] !== false && <div className="k-tree-filter">
            <Icon.Filter size={18} />
            <input className="k-input" aria-label="Filter" title="Filter the FeatureManager design tree" value={st.treeFilter} onChange={(e) => st.setTreeFilter(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>}
          {st.doc.kind === 'assembly' ? <AssemblyTreeBody /> : st.doc.kind === 'drawing' ? <DrawingTreeBody /> : <FeatureTreeBody />}
        </>
      )}
    </DockPanel>
  );
}
