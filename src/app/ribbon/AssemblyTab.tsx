import { withUnsavedCheck } from '../MenuBar';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../../ui/icons';
import { BigButton as Big, Group } from './Ribbon';
import { copyWithMates, insertNewAssembly, insertNewPart, makeMultibodyPart, patternDrivenPattern, takeSnapshot } from '../assemblyCommands';

/**
 * Assembly tab of the Command Ribbon by design: Edit Component, Insert Components,
 * Mate, Component Preview Window, Linear Component Pattern, Auto Fasteners, Move Component, Show Hidden Components,
 * Make Multibody Part, Assembly Features, Reference Geometry, New Motion Study, Bill of Materials, Exploded View,
 * Drag Handles, Update Lightweight Subassembly Subassemblies, Take Snapshot, Large Assembly Settings.
 */
export function AssemblyTab() {
  const st = useStore(useShallow((s) => ({ selectedFeatureId: s.selectedFeatureId, selectedFace: s.selectedFace, editComponent: s.editComponent, insertingComponent: s.insertingComponent, cancelInsertComponent: s.cancelInsertComponent, startInsertComponent: s.startInsertComponent, mateEdit: s.mateEdit, cancelMate: s.cancelMate, startMate: s.startMate, dialog: s.dialog, setDialog: s.setDialog, patternEdit: s.patternEdit, cancelComponentPattern: s.cancelComponentPattern, startComponentPattern: s.startComponentPattern, pushMessage: s.pushMessage, fastenerEdit: s.fastenerEdit, cancelSmartFasteners: s.cancelSmartFasteners, startSmartFasteners: s.startSmartFasteners, asmTool: s.asmTool, setAsmTool: s.setAsmTool, showAllComponents: s.showAllComponents, featureEdit: s.featureEdit, startFeature: s.startFeature, startHole: s.startHole, startRound: s.startRound, startBelt: s.startBelt, planeEdit: s.planeEdit, refEdit: s.refEdit, startPlane: s.startPlane, startRefGeom: s.startRefGeom, motionOpen: s.motionOpen, setMotionOpen: s.setMotionOpen, explodeEdit: s.explodeEdit, doc: s.doc, startExplode: s.startExplode, setExploded: s.setExploded, dragHandles: s.dragHandles, toggleDragHandles: s.toggleDragHandles, largeAssembly: s.largeAssembly, setLargeAssembly: s.setLargeAssembly })));
  const hasSelection = !!st.selectedFeatureId || !!st.selectedFace;
  return (
    <>
      <Group>
        <Big label="Edit Component" icon={<Icon.Part />} disabled={!hasSelection} onClick={() => st.editComponent()} />
        <Big label="Insert Components" icon={<Icon.InsertComponent />} active={st.insertingComponent} onClick={() => (st.insertingComponent ? st.cancelInsertComponent() : st.startInsertComponent())} flyout={[{ label: 'Insert Components', icon: <Icon.InsertComponent />, onSelect: () => st.startInsertComponent() }, { label: 'New Part', icon: <Icon.Part />, onSelect: insertNewPart }, { label: 'New Assembly', icon: <Icon.Component />, onSelect: insertNewAssembly }, { label: 'Copy with Mates', icon: <Icon.Mate />, onSelect: copyWithMates }]} />
        <Big label="Mate" icon={<Icon.Mate />} active={!!st.mateEdit} onClick={() => (st.mateEdit ? st.cancelMate() : st.startMate())} />
        <Big label="Component Preview Window" icon={<Icon.Sheet />} active={st.dialog === 'componentPreview'} onClick={() => st.setDialog(st.dialog === 'componentPreview' ? null : 'componentPreview')} />
        <Big label="Linear Component Pattern" icon={<Icon.ComponentPattern />} active={!!st.patternEdit} onClick={() => (st.patternEdit ? st.cancelComponentPattern() : st.startComponentPattern('linear'))} flyout={[{ label: 'Linear Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => st.startComponentPattern('linear') }, { label: 'Circular Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => st.startComponentPattern('circular') }, { label: 'Pattern Driven Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => { const r = patternDrivenPattern(); st.pushMessage(r.message, r.ok ? 'info' : 'warn'); } }, { label: 'Mirror Components', icon: <Icon.Mirror />, onSelect: () => st.setDialog('mirrorComponents') }]} />
        <Big label="Auto Fasteners" icon={<Icon.Fasteners />} active={!!st.fastenerEdit} onClick={() => (st.fastenerEdit ? st.cancelSmartFasteners() : st.startSmartFasteners())} />
        <Big label="Move Component" icon={<Icon.MoveComponent />} active={st.asmTool === 'move'} onClick={() => st.setAsmTool(st.asmTool === 'move' ? 'select' : 'move')} flyout={[{ label: 'Move Component', icon: <Icon.MoveComponent />, onSelect: () => st.setAsmTool('move') }, { label: 'Rotate Component', icon: <Icon.RotateComponent />, onSelect: () => st.setAsmTool('rotate') }]} />
        <Big label="Show Hidden Components" icon={<Icon.ShowHidden />} onClick={() => st.showAllComponents()} />
      </Group>
      <Group>
        <Big label="Make Multibody Part" icon={<Icon.Part />} onClick={() => { const part = makeMultibodyPart(); if (!part) return; const open = () => { useStore.getState().openDocument(part); useStore.getState().pushMessage(`A new part with ${part.features.length} bodies opened in place of the assembly.`); }; const s = useStore.getState(); if (s.dirty || s.editContext) withUnsavedCheck(open); /* unsaved: Save / Don't Save / Cancel */ else s.setAsk({ title: 'Make Multibody Part', text: `A new part with ${part.features.length} bodies opens in place of the assembly. Continue?`, yes: open }); }} />
        <Big label="Assembly Features" icon={<Icon.Cut />} active={st.featureEdit?.draft.type === 'extrude' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('extrude', 'cut')} flyout={[{ label: 'Extruded Cut', icon: <Icon.Cut />, onSelect: () => st.startFeature('extrude', 'cut') }, { label: 'Revolved Cut', icon: <Icon.Revolve />, onSelect: () => st.startFeature('revolve', 'cut') }, { label: 'Hole Tool', icon: <Icon.Hole />, onSelect: () => st.startHole() }, { label: 'Fillet', icon: <Icon.Arc />, onSelect: () => st.startRound('fillet') }, { label: 'Belt/Chain', icon: <Icon.Spline />, onSelect: () => st.startBelt() }]} />
        <Big label="Reference Geometry" icon={<Icon.Plane />} active={!!st.planeEdit || !!st.refEdit} onClick={() => st.startPlane()} flyout={[{ label: 'Plane', icon: <Icon.Plane />, onSelect: () => st.startPlane() }, { label: 'Axis', icon: <Icon.Line />, onSelect: () => st.startRefGeom('axis') }, { label: 'Coordinate System', icon: <Icon.Origin />, onSelect: () => st.startRefGeom('csys') }, { label: 'Point', icon: <Icon.Point />, onSelect: () => st.startRefGeom('point') }]} />
        <Big label="New Motion Study" icon={<Icon.MotionStudy />} active={st.motionOpen} onClick={() => st.setMotionOpen(!st.motionOpen)} />
        <Big label="Bill of Materials" icon={<Icon.Bom />} onClick={() => st.setDialog('bom')} />
        <Big label="Exploded View" icon={<Icon.Explode />} active={!!st.explodeEdit || !!st.doc.exploded} onClick={st.startExplode} flyout={[{ label: 'Exploded View', icon: <Icon.Explode />, onSelect: () => st.startExplode() }, { label: st.doc.exploded ? 'Collapse' : 'Explode', icon: <Icon.Explode />, disabled: !(st.doc.explodeSteps ?? []).length, onSelect: () => st.setExploded(!st.doc.exploded) }]} />
        <Big label="Drag Handles" icon={<Icon.Cursor />} active={st.dragHandles} onClick={st.toggleDragHandles} />
        <Big label="Update Lightweight Subassemblies" icon={<Icon.Rebuild />} disabled />
        <Big label="Take Snapshot" icon={<Icon.Appearance />} onClick={takeSnapshot} />
        <Big label="Large Assembly Settings" icon={<Icon.Options />} active={!!st.largeAssembly} onClick={() => st.setLargeAssembly(!st.largeAssembly)} flyout={[{ label: st.largeAssembly ? 'Turn off Large Assembly Settings' : 'Large Assembly Settings', icon: <Icon.Options />, onSelect: () => st.setLargeAssembly(!st.largeAssembly) }, { label: 'Options…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') }]} />
      </Group>
    </>
  );
}

/** Share tab (assemblies): sharing and packaging commands. */
export function ShareTab() {
  const st = useStore(useShallow((s) => ({ dialog: s.dialog, setDialog: s.setDialog, markupMode: s.markupMode, setMarkupMode: s.setMarkupMode })));
  return (
    <>
      <Group>
        <Big label="Package Files" icon={<Icon.Save />} active={st.dialog === 'packAndGo'} onClick={() => st.setDialog('packAndGo')} />
        <Big label="Share" icon={<Icon.Open />} active={st.dialog === 'share'} onClick={() => st.setDialog('share')} />
        <Big label="Markup" icon={<Icon.Note />} active={!!st.markupMode} onClick={() => st.setMarkupMode(st.markupMode ? null : { color: '#d9363e' })} />
        <Big label="Comments" icon={<Icon.Note />} active={st.dialog === 'comments'} onClick={() => st.setDialog('comments')} />
      </Group>
    </>
  );
}
