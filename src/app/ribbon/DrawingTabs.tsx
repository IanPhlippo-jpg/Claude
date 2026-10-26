import { fitActive } from '../viewport/bridge';
import { useStore } from '../store';
import { Icon } from '../../ui/icons';
import { BigButton as Big, Group, SmallButton as Small } from './Ribbon';
import { DRAWING_BLOCKS, startEmptyView } from '../drawing/DrawingExtras';

/** View Layout tab of a drawing, by design. */
export function ViewLayoutTab() {
  const st = useStore();
  const de = st.drawingEdit;
  const hasView = !!st.selectedDrawingViewId;
  return (
    <>
      <Group>
        <Big label="Standard 3 View" icon={<Icon.Standard3View />} onClick={() => st.startStandardThreeViews()} />
        <Big label="Model View" icon={<Icon.ModelView />} active={de?.mode === 'modelView'} onClick={() => (de?.mode === 'modelView' ? st.cancelDrawingEdit() : st.startModelView())} />
        <Big label="Projected View" icon={<Icon.ProjectedView />} active={de?.mode === 'projected'} disabled={!hasView && de?.mode !== 'projected'} onClick={() => (de?.mode === 'projected' ? st.cancelDrawingEdit() : st.startProjectedView())} />
        <Big label="Auxiliary View" icon={<Icon.ProjectedView />} active={de?.mode === 'aux'} onClick={() => (de?.mode === 'aux' ? st.cancelDrawingEdit() : st.startAuxView())} />
        <Big label="Section View" icon={<Icon.SectionView />} active={de?.mode === 'section'} onClick={() => (de?.mode === 'section' ? st.cancelDrawingEdit() : st.startDrawingSection())} />
        <Big label="Removed Section" icon={<Icon.SectionView />} active={de?.mode === 'section' && !!de.sectionRemoved} onClick={() => (de?.mode === 'section' ? st.cancelDrawingEdit() : st.startDrawingSection('v', true))} />
        <Big label="Detail View" icon={<Icon.DetailView />} active={de?.mode === 'detail'} onClick={() => (de?.mode === 'detail' ? st.cancelDrawingEdit() : st.startDetailView())} />
        <Big label="Relative View" icon={<Icon.ModelView />} active={st.dialog === 'relativeView' || !!de?.relative} onClick={() => st.setDialog('relativeView')} />
      </Group>
      <Group>
        <div className="k-cm-col">
          <Small label="Broken-out Section" icon={<Icon.SectionView />} active={de?.mode === 'brokenOut'} onClick={() => (de?.mode === 'brokenOut' ? st.cancelDrawingEdit() : st.startBrokenOut())} />
          <Small label="Break" icon={<Icon.Trim />} active={de?.mode === 'break'} onClick={() => (de?.mode === 'break' ? st.cancelDrawingEdit() : st.startViewTool('break'))} />
          <Small label="Crop View" icon={<Icon.Trim />} active={de?.mode === 'crop'} onClick={() => (de?.mode === 'crop' ? st.cancelDrawingEdit() : st.startViewTool('crop'))} />
        </div>
        <div className="k-cm-col">
          <Small label="Alternate Position View" icon={<Icon.ModelView />} active={de?.mode === 'altPosition'} onClick={() => (de?.mode === 'altPosition' ? st.cancelDrawingEdit() : st.startAltPosition())} />
          <Small label="Empty View" icon={<Icon.Sheet />} active={!!de?.emptyView} onClick={() => startEmptyView(false)} />
          <Small label="Predefined View" icon={<Icon.Sheet />} active={!!de?.predefined} onClick={() => startEmptyView(true)} />
        </div>
      </Group>
    </>
  );
}

/** Annotation tab of a drawing. */
export function AnnotationTab() {
  const st = useStore();
  const de = st.drawingEdit;
  const sym = (k: NonNullable<typeof de>['symbolKind']) => ({
    active: de?.mode === 'symbol' && de.symbolKind === k,
    onClick: () => (de?.mode === 'symbol' && de.symbolKind === k ? st.cancelDrawingEdit() : st.startSymbol(k!)),
  });
  return (
    <>
      <Group>
        <Big label="Smart Dimension" icon={<Icon.Dimension />} active={de?.mode === 'dimension'} onClick={() => (de?.mode === 'dimension' ? st.cancelDrawingEdit() : st.startDrawingDimension())} />
        <Big label="Model Items" icon={<Icon.Dimension />} active={de?.mode === 'modelItems'} onClick={() => (de?.mode === 'modelItems' ? st.cancelDrawingEdit() : st.startModelItems())} />
        <Big label="Spell Checker" icon={<Icon.Check />} active={st.dialog === 'spellCheck'} onClick={() => st.setDialog('spellCheck')} />
        <Big label="Format Painter" icon={<Icon.Options />} active={st.drawingTool?.kind === 'formatPainter'} onClick={() => st.setDrawingTool(st.drawingTool?.kind === 'formatPainter' ? null : { kind: 'formatPainter' })} />
        <Big label="Note" icon={<Icon.Note />} active={de?.mode === 'note'} onClick={() => (de?.mode === 'note' ? st.cancelDrawingEdit() : st.startNote())} />
        <Big label="Linear Note Pattern" icon={<Icon.Note />} active={st.dialog === 'notePattern'} onClick={() => st.setDialog('notePattern')} />
        <div className="k-cm-col">
          <Small label="Balloon" icon={<Icon.Balloon />} {...sym('balloon')} />
          <Small label="Auto Balloon" icon={<Icon.Balloon />} {...sym('autoBalloon')} />
          <Small label="Magnetic Line" icon={<Icon.Line />} active={st.drawingTool?.kind === 'magneticLine'} onClick={() => st.setDrawingTool(st.drawingTool?.kind === 'magneticLine' ? null : { kind: 'magneticLine' })} />
        </div>
        <div className="k-cm-col">
          <Small label="Surface Finish" icon={<Icon.SurfaceFinish />} {...sym('surfaceFinish')} />
          <Small label="Weld Symbol" icon={<Icon.Chamfer />} {...sym('weld')} />
          <Small label="Hole Callout" icon={<Icon.Hole />} {...sym('holeCallout')} />
        </div>
        <div className="k-cm-col">
          <Small label="Geometric Tolerance" icon={<Icon.Dimension />} {...sym('gtol')} />
          <Small label="Datum Feature" icon={<Icon.Dimension />} {...sym('datum')} />
          <Small label="Datum Target" icon={<Icon.Point />} {...sym('datumTarget')} />
        </div>
        <Big label="Blocks" icon={<Icon.Sheet />} active={st.drawingTool?.kind === 'block'} onClick={() => st.setDrawingTool({ kind: 'block', block: Object.keys(DRAWING_BLOCKS)[0] })} flyout={Object.keys(DRAWING_BLOCKS).map((b) => ({ label: `Insert Block: ${b}`, icon: <Icon.Sheet />, onSelect: () => st.setDrawingTool({ kind: 'block', block: b }) }))} />
        <div className="k-cm-col">
          <Small label="Center Mark" icon={<Icon.CenterMark />} active={de?.mode === 'centerMark'} onClick={() => (de?.mode === 'centerMark' ? st.cancelDrawingEdit() : st.startCenterMark())} />
          <Small label="Centerline" icon={<Icon.Line />} {...sym('centerline')} />
          <Small label="Area Hatch/Fill" icon={<Icon.Section />} {...sym('areaHatch')} />
        </div>
        <div className="k-cm-col">
          <Small label="Revision Symbol" icon={<Icon.Note />} {...sym('revision')} />
          <Small label="Revision Cloud" icon={<Icon.Spline />} {...sym('cloud')} />
        </div>
        <Big label="Tables" icon={<Icon.Bom />} onClick={() => st.insertBomTable()} flyout={[{ label: 'Bill of Materials', icon: <Icon.Bom />, onSelect: () => st.insertBomTable() }, { label: 'Hole Table', icon: <Icon.Hole />, onSelect: () => st.insertHoleTable() }, { label: 'Revision Table', icon: <Icon.Note />, onSelect: () => st.addRevision('') }, { label: 'General Table', icon: <Icon.Bom />, onSelect: () => st.setDialog('generalTable') }]} />
      </Group>
    </>
  );
}

/** Sheet Format tab of a drawing. */
export function SheetFormatTab() {
  const st = useStore();
  const sheet = st.doc.sheets?.[0];
  return (
    <>
      <Group>
        <Big label="Edit Sheet Format" icon={<Icon.Sheet />} active={st.drawingEdit?.mode === 'titleBlock' && !!st.drawingEdit.editFormat} onClick={() => { st.startTitleBlock(); st.setDrawingEdit({ editFormat: true }); }} />
        <Big label="Title Block Fields" icon={<Icon.Note />} active={st.drawingEdit?.mode === 'titleBlock'} onClick={() => (st.drawingEdit?.mode === 'titleBlock' ? st.cancelDrawingEdit() : st.startTitleBlock())} />
        <Big label="Automatic Border" icon={<Icon.Rect />} active={!!sheet?.showFormat} onClick={() => st.setSheet({ showFormat: !sheet?.showFormat })} />
      </Group>
      <Group>
        <div className="k-cm-col">
          <Small label="Sheet Properties…" icon={<Icon.Options />} onClick={() => st.setDialog('sheetProperties')} />
          <Small label="Zoom to Sheet" icon={<Icon.Fit />} onClick={() => fitActive()} />
        </div>
      </Group>
    </>
  );
}
