import { useStore } from '../store';
import { Icon } from '../../ui/icons';
import { BigButton as Big, Group } from './Ribbon';
import { copyWithMates, insertNewAssembly, insertNewPart, makeMultibodyPart, patternDrivenPattern, takeSnapshot } from '../assemblyCommands';

/**
 * Assembly tab of the CommandManager as the 2026 original (reference frame f_0341): Edit Component, Insert Components,
 * Mate, Component Preview Window, Linear Component Pattern, Smart Fasteners, Move Component, Show Hidden Components,
 * Make Multibody Part, Assembly Features, Reference Geometry, New Motion Study, Bill of Materials, Exploded View,
 * Instant3D, Update SpeedPak Subassemblies, Take Snapshot, Large Assembly Settings.
 */
export function AssemblyTab() {
  const st = useStore();
  const hasSelection = !!st.selectedFeatureId || !!st.selectedFace;
  return (
    <>
      <Group>
        <Big label="Edit Component" icon={<Icon.Part />} disabled={!hasSelection} onClick={() => st.editComponent()} />
        <Big label="Insert Components" icon={<Icon.InsertComponent />} active={st.insertingComponent} onClick={() => (st.insertingComponent ? st.cancelInsertComponent() : st.startInsertComponent())} flyout={[{ label: 'Insert Components', icon: <Icon.InsertComponent />, onSelect: () => st.startInsertComponent() }, { label: 'New Part', icon: <Icon.Part />, onSelect: insertNewPart }, { label: 'New Assembly', icon: <Icon.Component />, onSelect: insertNewAssembly }, { label: 'Copy with Mates', icon: <Icon.Mate />, onSelect: copyWithMates }]} />
        <Big label="Mate" icon={<Icon.Mate />} active={!!st.mateEdit} onClick={() => (st.mateEdit ? st.cancelMate() : st.startMate())} />
        <Big label="Component Preview Window" icon={<Icon.Sheet />} active={st.dialog === 'componentPreview'} onClick={() => st.setDialog(st.dialog === 'componentPreview' ? null : 'componentPreview')} />
        <Big label="Linear Component Pattern" icon={<Icon.ComponentPattern />} active={!!st.patternEdit} onClick={() => (st.patternEdit ? st.cancelComponentPattern() : st.startComponentPattern('linear'))} flyout={[{ label: 'Linear Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => st.startComponentPattern('linear') }, { label: 'Circular Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => st.startComponentPattern('circular') }, { label: 'Pattern Driven Component Pattern', icon: <Icon.ComponentPattern />, onSelect: () => { const r = patternDrivenPattern(); st.pushMessage(r.message, r.ok ? 'info' : 'warn'); } }, { label: 'Mirror Components', icon: <Icon.Mirror />, onSelect: () => st.setDialog('mirrorComponents') }]} />
        <Big label="Smart Fasteners" icon={<Icon.Fasteners />} active={!!st.fastenerEdit} onClick={() => (st.fastenerEdit ? st.cancelSmartFasteners() : st.startSmartFasteners())} />
        <Big label="Move Component" icon={<Icon.MoveComponent />} active={st.asmTool === 'move'} onClick={() => st.setAsmTool(st.asmTool === 'move' ? 'select' : 'move')} flyout={[{ label: 'Move Component', icon: <Icon.MoveComponent />, onSelect: () => st.setAsmTool('move') }, { label: 'Rotate Component', icon: <Icon.RotateComponent />, onSelect: () => st.setAsmTool('rotate') }]} />
        <Big label="Show Hidden Components" icon={<Icon.ShowHidden />} onClick={() => st.showAllComponents()} />
      </Group>
      <Group>
        <Big label="Make Multibody Part" icon={<Icon.Part />} onClick={() => { const part = makeMultibodyPart(); if (part) st.setAsk({ title: 'Make Multibody Part', text: `A new part with ${part.features.length} bodies opens in place of the assembly. Save the assembly first if it has unsaved changes. Continue?`, yes: () => st.openDocument(part) }); }} />
        <Big label="Assembly Features" icon={<Icon.Cut />} active={st.featureEdit?.draft.type === 'extrude' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('extrude', 'cut')} flyout={[{ label: 'Extruded Cut', icon: <Icon.Cut />, onSelect: () => st.startFeature('extrude', 'cut') }, { label: 'Revolved Cut', icon: <Icon.Revolve />, onSelect: () => st.startFeature('revolve', 'cut') }, { label: 'Hole Wizard', icon: <Icon.Hole />, onSelect: () => st.startHole() }, { label: 'Fillet', icon: <Icon.Arc />, onSelect: () => st.startRound('fillet') }, { label: 'Belt/Chain', icon: <Icon.Spline />, onSelect: () => st.startBelt() }]} />
        <Big label="Reference Geometry" icon={<Icon.Plane />} active={!!st.planeEdit || !!st.refEdit} onClick={() => st.startPlane()} flyout={[{ label: 'Plane', icon: <Icon.Plane />, onSelect: () => st.startPlane() }, { label: 'Axis', icon: <Icon.Line />, onSelect: () => st.startRefGeom('axis') }, { label: 'Coordinate System', icon: <Icon.Origin />, onSelect: () => st.startRefGeom('csys') }, { label: 'Point', icon: <Icon.Point />, onSelect: () => st.startRefGeom('point') }]} />
        <Big label="New Motion Study" icon={<Icon.MotionStudy />} active={st.motionOpen} onClick={() => st.setMotionOpen(!st.motionOpen)} />
        <Big label="Bill of Materials" icon={<Icon.Bom />} onClick={() => st.setDialog('bom')} />
        <Big label="Exploded View" icon={<Icon.Explode />} active={!!st.explodeEdit || !!st.doc.exploded} onClick={st.startExplode} flyout={[{ label: 'Exploded View', icon: <Icon.Explode />, onSelect: () => st.startExplode() }, { label: st.doc.exploded ? 'Collapse' : 'Explode', icon: <Icon.Explode />, disabled: !(st.doc.explodeSteps ?? []).length, onSelect: () => st.setExploded(!st.doc.exploded) }]} />
        <Big label="Instant3D" icon={<Icon.Cursor />} active={st.instant3d} onClick={st.toggleInstant3D} />
        <Big label="Update SpeedPak Subassemblies" icon={<Icon.Rebuild />} disabled />
        <Big label="Take Snapshot" icon={<Icon.Appearance />} onClick={takeSnapshot} />
        <Big label="Large Assembly Settings" icon={<Icon.Options />} active={!!st.largeAssembly} onClick={() => st.setLargeAssembly(!st.largeAssembly)} flyout={[{ label: st.largeAssembly ? 'Turn off Large Assembly Settings' : 'Large Assembly Settings', icon: <Icon.Options />, onSelect: () => st.setLargeAssembly(!st.largeAssembly) }, { label: 'Options…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') }]} />
      </Group>
    </>
  );
}

/** Lifecycle and Collaboration tab (assemblies), as the 2026 original: sharing and packaging commands. */
export function LifecycleTab() {
  const st = useStore();
  return (
    <>
      <Group>
        <Big label="Pack and Go" icon={<Icon.Save />} active={st.dialog === 'packAndGo'} onClick={() => st.setDialog('packAndGo')} />
        <Big label="Share" icon={<Icon.Open />} active={st.dialog === 'share'} onClick={() => st.setDialog('share')} />
        <Big label="Markup" icon={<Icon.Note />} active={!!st.markupMode} onClick={() => st.setMarkupMode(st.markupMode ? null : { color: '#d9363e' })} />
        <Big label="Comments" icon={<Icon.Note />} active={st.dialog === 'comments'} onClick={() => st.setDialog('comments')} />
      </Group>
    </>
  );
}
