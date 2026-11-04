import { sensorAlarm, sensorReading } from '../sensors';
import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { treeHoverHighlight } from '../prefsEffects';
import { useShallow } from 'zustand/react/shallow';
import { Menu, TreeView, type MenuItem, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { restoreSnapshot } from '../assemblyCommands';
import { activeConfiguration, configurations } from '../../core/document/configurations';
import { PLANE_LABELS } from '../viewport/camera';
import { mateStatus } from '../../core/assembly/mateStatus';

import { MATE_ICON } from './mateIcons';

/**
 * Feature Tree of an assembly by design:
 * Assem1 (Default) <Display State-1> ▸ History, Sensors, Annotations, Front/Top/Right Plane, Origin,
 * (f) Part1<1>, (-) Part2<1> (each with the part's features as children), Mates ▸ Coincident1 (Part1<1>,Part2<1>).
 */
export function AssemblyTreeBody() {
  const st = useStore(useShallow((s) => ({ treeFilter: s.treeFilter, setHoverPlane: s.setHoverPlane, selectedPlane: s.selectedPlane, setSelectedPlane: s.setSelectedPlane, doc: s.doc, selectedFeatureId: s.selectedFeatureId, rebuild: s.rebuild, selectComponent: s.selectComponent, setSelectedFeature: s.setSelectedFeature, editMate: s.editMate, deleteSensor: s.deleteSensor, setSensorEdit: s.setSensorEdit, setDialog: s.setDialog, toggleShow: s.toggleShow, applyDocument: s.applyDocument, startMate: s.startMate, editSketch: s.editSketch, editFeature: s.editFeature, editComponentPattern: s.editComponentPattern, setComponentFixed: s.setComponentFixed, setComponentHidden: s.setComponentHidden, setAsmTool: s.setAsmTool, insertComponent: s.insertComponent, setComponentConfiguration: s.setComponentConfiguration, deleteComponent: s.deleteComponent, setMateSuppressed: s.setMateSuppressed, deleteMate: s.deleteMate })));
  const [menu, setMenu] = useState<{ x: number; y: number; componentId?: string; mateId?: string } | null>(null);
  const q = st.treeFilter.trim().toLowerCase();
  const sys = (id: string, icon: React.ReactNode, label: string, children?: TreeNode[]): TreeNode => ({ id, icon, label: <span>{label}</span>, children });
  const planeNode = (p: 'front' | 'top' | 'right'): TreeNode => ({
    id: 'plane-' + p,
    label: <span onMouseEnter={() => st.setHoverPlane(p)} onMouseLeave={() => st.setHoverPlane(null)}>{PLANE_LABELS[p]}</span>,
    icon: <Icon.TreePlane />,
    selected: st.selectedPlane === p,
    onClick: (e) => st.setSelectedPlane(e.ctrlKey && st.selectedPlane === p ? null : p),
  });
  const components = st.doc.components ?? [];
  const mates = st.doc.mates ?? [];
  const compName = (id: string) => components.find((c) => c.id === id)?.name ?? '?';
  // (f) fixed, (-) can still move, (+) one of its mates conflicts, nothing when fully defined (QA v0.5.1 F108)
  const status = useMemo(() => mateStatus(components, mates), [components, mates]);
  const PREFIX = { fixed: '(f) ', under: '(-) ', over: '(+) ', full: '' } as const;
  const componentNodes: TreeNode[] = components
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .map((c) => ({
      id: c.id,
      icon: <Icon.Part />,
      label: (
        <span className={c.hidden ? 'k-muted' : ''}>
          {PREFIX[status.components[c.id] ?? (c.fixed ? 'fixed' : 'under')]}
          {c.virtual ? `[${c.name.replace(/<\d+>$/, '')}^${st.doc.name}]${/<\d+>$/.exec(c.name)?.[0] ?? ''}` : c.name} ({c.configuration ?? activeConfiguration(c.part).name}){c.envelope ? ' (envelope)' : ''}
          {c.hidden ? ' (hidden)' : ''}
        </span>
      ),
      selected: st.selectedFeatureId === c.id,
      suppressed: c.suppressed,
      tail: Object.keys(st.rebuild.errors).some((k) => k.startsWith(c.id + ':')) ? <span className="status conflict" title="The part has rebuild errors">!</span> : null,
      onClick: (e) => st.selectComponent(e.ctrlKey && st.selectedFeatureId === c.id ? null : c.id),
      onHover: (on) => useStore.setState({ hoverFeatureId: on && treeHoverHighlight() ? c.id : null }),
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, componentId: c.id });
      },
      children: [
        sys(c.id + '-planes', <Icon.TreePlane />, 'Front Plane'),
        sys(c.id + '-origin', <Icon.Origin style={{ color: '#2b2b2b' }} />, 'Origin'),
        ...c.part.features
          .filter((f) => f.type !== 'sketch' || !c.part.features.some((x) => x.type !== 'sketch' && 'sketchId' in x && x.sketchId === f.sketchId))
          .map((f) => ({ id: c.id + ':' + f.id, icon: f.type === 'sketch' ? <Icon.Sketch /> : f.type === 'extrude' ? (f.op === 'boss' ? <Icon.Extrude /> : <Icon.Cut />) : f.type === 'revolve' ? <Icon.Revolve /> : f.type === 'sweep' ? <Icon.Sweep /> : f.type === 'loft' ? <Icon.Loft /> : f.type === 'fillet' ? <Icon.Arc /> : f.type === 'chamfer' ? <Icon.Chamfer /> : f.type === 'shell' ? <Icon.Shell /> : f.type === 'hole' ? <Icon.Hole /> : f.type === 'mirror' ? <Icon.Mirror /> : f.type === 'rib' ? <Icon.Rib /> : f.type === 'helix' ? <Icon.Spline /> : <Icon.Pattern />, label: <span className="k-muted">{f.name}</span> })),
      ],
    }));
  const mateNodes: TreeNode[] = mates
    .filter((m) => !m.subassembly)
    .filter((m) => !q || m.name.toLowerCase().includes(q))
    .map((m) => ({
      id: m.id,
      icon: MATE_ICON[m.type],
      label: (
        <span className={status.violated.has(m.id) ? 'k-mate-error' : ''} title={status.violated.has(m.id) ? 'This mate cannot be met together with the other mates (over defined).' : undefined}>
          {m.name} ({compName(m.refs[0].componentId)},{compName(m.refs[1].componentId)})
        </span>
      ),
      tail: status.violated.has(m.id) ? <span className="status conflict" data-testid="mate-error" title="Over defined: this mate conflicts with others">!</span> : status.unconverged.has(m.id) ? <span className="status warn" data-testid="mate-unconverged" title="Not settled yet: the mate solver stopped before this chain of mates was met. Rebuild (Ctrl+B) runs it on.">~</span> : null,
      selected: st.selectedFeatureId === m.id,
      suppressed: m.suppressed,
      onClick: (e) => st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === m.id ? null : m.id),
      onDoubleClick: () => st.editMate(m.id),
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, mateId: m.id });
      },
    }));
  // inserted sub-assemblies: their components (and their own mates) under one node, by design
  const subs = [...new Map(components.filter((c) => c.subassembly).map((c) => [c.subassembly!.id, c.subassembly!] as const)).values()];
  const subNodes: TreeNode[] = subs.map((sb) => ({
    id: sb.id,
    icon: <Icon.Component />,
    label: <span>(-) {sb.name} (Default)</span>,
    onClick: () => st.selectComponent(components.find((c) => c.subassembly?.id === sb.id)?.id ?? null),
    children: [
      ...componentNodes.filter((n) => components.find((c) => c.id === n.id)?.subassembly?.id === sb.id),
      { id: sb.id + '-mates', icon: <Icon.Mate />, label: <span>Mates</span>, children: mates.filter((m) => m.subassembly === sb.id).map((m): TreeNode => ({ id: m.id, icon: MATE_ICON[m.type], label: <span>{m.name} ({compName(m.refs[0].componentId)},{compName(m.refs[1].componentId)})</span>, selected: st.selectedFeatureId === m.id, onClick: () => st.setSelectedFeature(m.id), onDoubleClick: () => st.editMate(m.id) })) },
    ],
  }));
  // Add to new folder: the mates of a folder sit under it (MateGroup1, …), the rest directly under Mates
  const folders = [...new Set(mates.map((m) => m.folder).filter((f): f is string => !!f))];
  const groupedMates: TreeNode[] = [
    ...folders.map((f): TreeNode => ({ id: 'mfolder-' + f, icon: <Icon.Folder />, label: <span>{f}</span>, children: mateNodes.filter((n) => mates.find((m) => m.id === n.id)?.folder === f) })),
    ...mateNodes.filter((n) => !mates.find((m) => m.id === n.id)?.folder),
  ];
  const nodes: TreeNode[] = [
    {
      id: 'assembly',
      icon: <Icon.Component />,
      label: (
        <span>
          {st.doc.name} ({activeConfiguration(st.doc).name}) {'<Display State-1>'}
        </span>
      ),
      children: [
        sys('history', <Icon.TreeFolder glyph="history" />, 'History'),
        { ...sys('sensors', <Icon.TreeFolder glyph="sensor" />, 'Sensors', (st.doc.sensors ?? []).map((sn): TreeNode => {
          const alarm = sensorAlarm(st.doc, st.rebuild.bodies, sn);
          return { id: sn.id, icon: <Icon.Sensor />, label: <span className={alarm ? 'k-sensor-alarm' : ''}>{alarm ? '⚠ ' : ''}{sn.name} ({sensorReading(st.doc, st.rebuild.bodies, sn).text})</span>, onContextMenu: (e) => { e.preventDefault(); st.deleteSensor(sn.id); } };
        })), onDoubleClick: () => st.setSensorEdit({ kind: 'interference' }), onContextMenu: (e) => { e.preventDefault(); st.setSensorEdit({ kind: 'interference' }); } },
        sys('annotations', <Icon.TreeFolder glyph="annotation" />, 'Annotations'),
        ...((st.doc.snapshots ?? []).length ? [{ id: 'snapshots', icon: <Icon.TreeFolder glyph="history" />, label: <span>Snapshots</span>, children: (st.doc.snapshots ?? []).map((sn) => ({ id: sn.id, icon: <Icon.Appearance />, label: <span data-testid="snapshot-row">{sn.name}</span>, onClick: () => restoreSnapshot(sn.id) }) as TreeNode) } as TreeNode] : []),
        ...(st.doc.equations.length ? [{ id: 'equations', icon: <Icon.Config />, label: 'Equations', onDoubleClick: () => st.setDialog('equations') } as TreeNode] : []),
        planeNode('front'),
        planeNode('top'),
        planeNode('right'),
        { id: 'origin', icon: <Icon.Origin style={{ color: '#2b2b2b' }} />, label: 'Origin', onClick: () => st.toggleShow('origin') },
        ...(st.doc.centerOfMass ? [{ id: 'com', icon: <Icon.CenterOfMass />, label: 'Center of Mass', onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.applyDocument('Delete Center of Mass', { ...st.doc, centerOfMass: undefined }); } } as TreeNode] : []),
        ...componentNodes.filter((n) => !components.find((c) => c.id === n.id)?.subassembly),
        ...subNodes,
        { id: 'mates', icon: <Icon.Mate />, label: <span>Mates</span>, children: groupedMates, onDoubleClick: () => st.startMate() },
        // assembly sketches and assembly features (after the mates, by design)
        ...st.doc.features
          .filter((f) => f.type !== 'sketch' || !st.doc.features.some((x) => x.type !== 'sketch' && 'sketchId' in x && (x as { sketchId?: string }).sketchId === f.sketchId))
          .map((f): TreeNode => {
            const sketchOf = f.type !== 'sketch' && 'sketchId' in f ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === (f as { sketchId: string }).sketchId) : undefined;
            return {
              id: 'af-' + f.id,
              icon: f.type === 'sketch' ? <Icon.Sketch /> : <Icon.Cut />,
              label: <span>{f.name}</span>,
              selected: st.selectedFeatureId === f.id,
              suppressed: f.suppressed,
              tail: st.rebuild.errors[f.id] ? <span className="status conflict" title={st.rebuild.errors[f.id]}>!</span> : null,
              onClick: (e) => st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === f.id ? null : f.id),
              onDoubleClick: () => (f.type === 'sketch' ? st.editSketch(f.sketchId) : st.editFeature(f.id)),
              children: sketchOf && sketchOf.type === 'sketch' ? [{ id: 'af-' + sketchOf.id, icon: <Icon.Sketch />, label: <span>{sketchOf.name}</span>, onDoubleClick: () => st.editSketch(sketchOf.sketchId) }] : undefined,
            };
          }),
        ...(st.doc.componentPatterns ?? []).map((p): TreeNode => ({
          id: p.id,
          icon: <Icon.ComponentPattern />,
          label: <span>{p.name}</span>,
          selected: st.selectedFeatureId === p.id,
          suppressed: p.suppressed,
          onClick: (e) => st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === p.id ? null : p.id),
          onDoubleClick: () => st.editComponentPattern(p.id),
          children: ((st.rebuild as unknown as { patternInstances?: { id: string; name: string; patternId: string }[] }).patternInstances ?? [])
            .filter((i) => i.patternId === p.id)
            .map((i) => ({ id: i.id, icon: <Icon.Part />, label: <span>(-) {i.name}</span> })),
        })),
      ],
    },
  ];
  const menuComp = menu?.componentId ? components.find((c) => c.id === menu.componentId) : undefined;
  const menuMate = menu?.mateId ? mates.find((m) => m.id === menu.mateId) : undefined;
  return (
    <div style={{ position: 'relative' }}>
      <TreeView nodes={nodes} />
      {menu && menuComp && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: menuComp.fixed ? 'Float' : 'Fix', icon: <Icon.Lock />, onSelect: () => st.setComponentFixed(menuComp.id, !menuComp.fixed) },
            { label: menuComp.hidden ? 'Show Component' : 'Hide Component', icon: <Icon.Eye />, onSelect: () => st.setComponentHidden(menuComp.id, !menuComp.hidden) },
            { label: 'Move Component', icon: <Icon.MoveComponent />, onSelect: () => { st.selectComponent(menuComp.id); st.setAsmTool('move'); } },
            { label: 'Rotate Component', icon: <Icon.RotateComponent />, onSelect: () => { st.selectComponent(menuComp.id); st.setAsmTool('rotate'); } },
            { label: 'Move with Triad', icon: <Icon.MoveComponent />, onSelect: () => { st.selectComponent(menuComp.id); useStore.setState({ triadComponentId: menuComp.id }); } },
            { label: 'Mate…', icon: <Icon.Mate />, onSelect: () => st.startMate() },
            { label: 'Insert another instance', icon: <Icon.InsertComponent />, onSelect: () => st.insertComponent(menuComp.part) },
            ...(configurations(menuComp.part).length > 1
              ? [
                  { separator: true } as MenuItem,
                  { label: 'Configuration', disabled: true } as MenuItem,
                  ...configurations(menuComp.part).map((cfg): MenuItem => ({ label: `${(menuComp.configuration ?? activeConfiguration(menuComp.part).name) === cfg.name ? '✓ ' : '    '}${cfg.name}`, onSelect: () => st.setComponentConfiguration(menuComp.id, cfg.name) })),
                ]
              : []),
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.deleteComponent(menuComp.id) },
          ]}
        />
      )}
      {menu && menuMate && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Edit Feature', icon: <Icon.Mate />, onSelect: () => st.editMate(menuMate.id) },
            { label: menuMate.suppressed ? 'Unsuppress' : 'Suppress', icon: <Icon.Lock />, onSelect: () => st.setMateSuppressed(menuMate.id, !menuMate.suppressed) },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.deleteMate(menuMate.id) },
          ]}
        />
      )}
    </div>
  );
}
