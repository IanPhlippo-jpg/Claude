import { sensorAlarm as sensorAlarmOf, sensorReading } from '../sensors';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { featureIcon } from './featureIcon';
import { sketchStatus, useStore } from '../store';
import { Menu, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { activeConfiguration } from '../../core/document/configurations';
import { PLANE_LABELS } from '../viewport/camera';
import { isRoundFeature, isSketchBased, isSolidFeature, type Feature } from '../../core/document/types';

const STATUS_LABEL: Record<string, string> = { under: 'under defined', full: '', over: 'over defined', conflict: 'conflict', invalid: 'invalid' };

/**
 * FeatureManager design tree body: Part ▸ History, Sensors, Annotations, Solid Bodies(n),
 * Material, Front/Top/Right Plane, Origin, features (a feature shows its sketch as a
 * child); with a draggable rollback bar.
 */
export function FeatureTreeBody() {
  const st = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number; featureId: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const dragRollback = useRef(false);
  const q = st.treeFilter.trim().toLowerCase();
  const consumed = st.rebuild.consumedSketches;

  const nameLabel = (f: Feature, prefix = ''): ReactNode =>
    renaming?.id === f.id ? (
      <input
        className="k-input"
        style={{ height: 20 }}
        autoFocus
        onFocus={(e) => e.target.select()}
        value={renaming.value}
        onChange={(e) => setRenaming({ id: f.id, value: e.target.value })}
        onBlur={() => {
          st.renameFeature(f.id, renaming.value || f.name);
          setRenaming(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setRenaming(null);
          e.stopPropagation();
        }}
      />
    ) : (
      <>
        {prefix}
        {f.name}
      </>
    );

  const sketchNode = (f: Feature & { type: 'sketch' }, i: number): TreeNode => {
    const solve = st.solve[f.sketchId];
    const sk = st.doc.sketches[f.sketchId];
    const rolledBack = st.rollbackIndex !== null && i >= st.rollbackIndex;
    const status = sketchStatus(sk, solve);
    const prefix = status === 'under' ? '(-) ' : status && status !== 'full' ? '(+) ' : '';
    return {
      id: f.id,
      // a sketch shared by several features shows the hand, as the original (video 15)
      icon: st.doc.features.filter((x) => x.type !== 'sketch' && 'sketchId' in x && (x as { sketchId?: string }).sketchId === f.sketchId).length > 1 ? <Icon.SketchShared style={{ color: '#2b6cb0' }} /> : <Icon.Sketch style={{ color: '#2b6cb0' }} />,
      label: nameLabel(f, prefix),
      active: st.activeSketchId === f.sketchId,
      selected: st.selectedFeatureId === f.id,
      suppressed: f.suppressed || rolledBack,
      tail: solve && (solve.status === 'conflict' || solve.status === 'over') ? <span className={`status ${solve.status}`} title={STATUS_LABEL[solve.status]}>!</span> : null,
      onDoubleClick: () => st.editSketch(f.sketchId),
      onClick: (e) => {
        if (st.activeSketchId !== f.sketchId) st.setSelection([]);
        // as the original: a click selects (again), Ctrl+click takes it out of the selection
        st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === f.id ? null : f.id);
      },
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, featureId: f.id });
      },
    };
  };

  const solidNode = (f: Feature, i: number): TreeNode => {
    const rolledBack = st.rollbackIndex !== null && i >= st.rollbackIndex;
    const err = st.rebuild.errors[f.id];
    const icon = featureIcon(f);
    const sketchFeature = (isSketchBased(f) && f.type !== 'sketch') || f.type === 'miterFlange' || f.type === 'jog' || f.type === 'sketchedBend' || (f.type === 'surface' && !!f.sketchId) ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === (f as { sketchId: string }).sketchId) : undefined;
    const secondId = f.type === 'sweep' ? f.pathSketchId : f.type === 'loft' ? f.sketchId2 : null;
    const secondSketch = secondId ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === secondId) : undefined;
    const sketchIndex = sketchFeature ? st.doc.features.indexOf(sketchFeature) : -1;
    return {
      id: f.id,
      icon,
      // the flat pattern is a folder "Flat-Pattern" holding Flat-Pattern1, as the original
      label: f.type === 'flatPattern' ? <span>Flat-Pattern</span> : nameLabel(f),
      selected: st.selectedFeatureId === f.id,
      active: st.featureEdit?.featureId === f.id,
      suppressed: f.suppressed || rolledBack,
      tail: err ? <span className="status conflict" title={err}>!</span> : null,
      children: [...(f.type === 'flatPattern' ? [{ id: f.id + ':fp', icon: <Icon.Sheet />, label: nameLabel(f), suppressed: f.suppressed } as TreeNode] : []), ...(sketchFeature && sketchFeature.type === 'sketch' ? [sketchNode(sketchFeature, sketchIndex)] : []), ...(secondSketch && secondSketch.type === 'sketch' ? [sketchNode(secondSketch, st.doc.features.indexOf(secondSketch))] : []), ...(f.type === 'loft' ? (f.guides ?? []).map((gid) => st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === gid)).filter((x): x is Extract<Feature, { type: 'sketch' }> => !!x && x.type === 'sketch').map((x) => sketchNode(x, st.doc.features.indexOf(x))) : [])],
      onDoubleClick: () => (f.type === 'sketch3d' ? st.edit3DSketch(f.id) : st.editFeature(f.id)),
      onClick: (e) => st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === f.id ? null : f.id),
      onHover: (on) => useStore.setState({ hoverFeatureId: on ? f.id : null }),
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, featureId: f.id });
      },
    };
  };

  const featureNodes: TreeNode[] = [];
  st.doc.features.forEach((f, i) => {
    if (q && !f.name.toLowerCase().includes(q)) return;
    if (f.type === 'sketch') {
      if (!consumed.has(f.sketchId)) featureNodes.push(sketchNode(f, i));
    } else featureNodes.push(solidNode(f, i));
  });

  const planeNode = (p: 'front' | 'top' | 'right'): TreeNode => ({
    id: 'plane-' + p,
    label: <span onMouseEnter={() => st.setHoverPlane(p)} onMouseLeave={() => st.setHoverPlane(null)}>{PLANE_LABELS[p]}</span>,
    icon: <Icon.TreePlane />,
    selected: st.selectedPlane === p,
    onClick: (e) => {
      if (st.planePick) st.newSketch(p);
      else st.setSelectedPlane(e.ctrlKey && st.selectedPlane === p ? null : p);
    },
    onDoubleClick: () => {
      if (!st.activeSketchId) st.newSketch(p);
    },
    onContextMenu: (e) => {
      e.preventDefault();
      st.newSketch(p);
    },
  });

  const sys = (id: string, icon: React.ReactNode, label: string, children?: TreeNode[]): TreeNode => ({ id, icon, label: <span>{label}</span>, children });

  const bodies = st.rebuild.bodies;
  const sensorAlarm = (sn: NonNullable<typeof st.doc.sensors>[number]) => sensorAlarmOf(st.doc, bodies, sn);
  const nodes: TreeNode[] = [
    {
      id: 'part',
      icon: <Icon.Part />,
      label: (
        <span>
          {st.doc.name} ({activeConfiguration(st.doc).name}) {`<<${activeConfiguration(st.doc).name}>_Display State 1>`}
        </span>
      ),
      tail: Object.keys(st.rebuild.errors).length ? <span className="status conflict" title="A feature could not be rebuilt">!</span> : null,
      children: [
        sys('history', <Icon.TreeFolder glyph="history" />, 'History', st.doc.features.slice(-6).reverse().map((f): TreeNode => ({ id: 'hist-' + f.id, icon: <Icon.History />, label: <span>{f.name}</span>, onClick: () => st.setSelectedFeature(f.id) }))),
        {
          id: 'sensors',
          icon: <Icon.TreeFolder glyph="sensor" />,
          label: <span>Sensors</span>,
          onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__sensors' }); },
          children: (st.doc.sensors ?? []).map((sn) => ({
            id: sn.id,
            icon: <Icon.Sensor />,
            label: <span className={sensorAlarm(sn) ? 'k-sensor-alarm' : ''} title={sn.alert ? `Alert when ${sn.alert.op} ${sn.alert.value}` : undefined}>{sensorAlarm(sn) ? '⚠ ' : ''}{sn.name} ({sensorReading(st.doc, bodies, sn).text})</span>,
            onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__sensor:' + sn.id }); },
          })),
        },
        sys('annotations', <Icon.TreeFolder glyph="annotation" />, 'Annotations'),
        ...(bodies.length
          ? [sys('bodies', <Icon.TreeFolder glyph="bodies" />, st.doc.sheetMetal ? `Cut list(${bodies.length})` : `Solid Bodies(${bodies.length})`, bodies.map((b): TreeNode => {
              const hiddenBody = (st.doc.hiddenBodies ?? []).includes(b.id);
              const mat = st.doc.bodyMaterials?.[b.id];
              return {
                id: 'body-' + b.id,
                icon: <Icon.Part style={hiddenBody ? { opacity: 0.4 } : undefined} />,
                label: <span className={hiddenBody ? 'k-muted' : ''} style={hiddenBody ? { fontStyle: 'italic' } : undefined}>{st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id}{mat ? <span className="k-muted"> ({mat.name})</span> : null}</span>,
                onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__body:' + b.id }); },
              };
            }))]
          : []),
        ...((st.rebuild.surfaceBodies ?? []).length
          ? [sys('surfaces', <Icon.TreeFolder glyph="surfaces" />, `Surface Bodies(${(st.rebuild.surfaceBodies ?? []).length})`, (st.rebuild.surfaceBodies ?? []).map((b): TreeNode => ({ id: 'sbody-' + b.id, icon: <Icon.Sheet />, label: <span>{st.doc.features.find((f) => f.id === b.featureIds[0])?.name ?? b.id}</span> })))]
          : []),
        ...(st.doc.equations.length ? [{ id: 'equations', icon: <Icon.Config />, label: 'Equations', onDoubleClick: () => st.setDialog('equations'), onClick: () => st.setDialog('equations') }] : []),
        { id: 'material', icon: <Icon.TreeMaterial />, label: <span>{st.doc.material ? st.doc.material.name : 'Material <not specified>'}</span>, onDoubleClick: () => st.setDialog('material'), onContextMenu: (e) => { e.preventDefault(); st.setDialog('material'); } },
        planeNode('front'),
        planeNode('top'),
        planeNode('right'),
        { id: 'origin', icon: <Icon.Origin style={{ color: '#2b2b2b' }} />, label: 'Origin', onClick: () => st.toggleShow('origin') },
        ...(st.doc.centerOfMass ? [{ id: 'com', icon: <Icon.CenterOfMass />, label: 'Center of Mass', onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.applyDocument('Delete Center of Mass', { ...st.doc, centerOfMass: undefined }); } } as TreeNode] : []),
        // sheet metal parts: the Sheet-Metal folder after the origin (default parameters), as the original
        ...(st.doc.sheetMetal ? [{ id: 'sheetmetal', icon: <Icon.Sheet />, label: <span>Sheet-Metal</span>, onDoubleClick: () => st.setSheetMetalEdit(true), onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.setSheetMetalEdit(true); }, children: [{ id: 'sheetmetal:1', icon: <Icon.Sheet />, label: <span>Sheet-Metal1</span>, onDoubleClick: () => st.setSheetMetalEdit(true) } as TreeNode] } as TreeNode] : []),
        ...Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p): TreeNode => ({
          id: p.id,
          icon: <Icon.TreePlane />,
          label: <span onMouseEnter={() => st.setHoverPlane(p.id)} onMouseLeave={() => st.setHoverPlane(null)}>{p.name}</span>,
          selected: st.selectedPlane === p.id,
          active: st.planeEdit?.planeId === p.id,
          onClick: (e) => (st.planePick ? st.newSketch(p.id) : st.setSelectedPlane(e.ctrlKey && st.selectedPlane === p.id ? null : p.id)),
          onDoubleClick: () => st.editPlane(p.id),
          onContextMenu: (e) => { e.preventDefault(); st.newSketch(p.id); },
        })),
        ...(st.doc.refGeometry ?? []).map((r): TreeNode => ({
          id: r.id,
          icon: r.kind === 'axis' ? <Icon.Line style={{ color: '#3b6fb6' }} /> : r.kind === 'point' ? <Icon.Point /> : <Icon.Origin />,
          label: <span title={r.how}>{r.name}</span>,
          selected: st.selectedFeatureId === r.id,
          onClick: () => st.setSelectedFeature(r.id),
          onDoubleClick: () => st.startRefGeom(r.kind, r.id),
          onContextMenu: (e) => { e.preventDefault(); st.startRefGeom(r.kind, r.id); },
        })),
        ...featureNodes,
      ],
    },
  ];

  // rollback bar: a draggable horizontal line below the last visible feature
  const n = st.doc.features.length;
  const pos = st.rollbackIndex ?? n;
  // the bar sits right below the last feature that is not rolled back: measured from the rows themselves
  // (folders and features can be expanded, so a fixed row count is not enough)
  const hostRef = useRef<HTMLDivElement>(null);
  const [barTop, setBarTop] = useState(0);
  const featureRowTops = (host: HTMLElement) => {
    const hr = host.getBoundingClientRect();
    return st.doc.features.map((f) => {
      const el = host.querySelector(`.k-tree-row[data-depth="1"][data-id="${CSS.escape(f.id)}"]`);
      return el ? el.getBoundingClientRect().top - hr.top : null;
    });
  };
  const measureBar = () => {
    const host = hostRef.current;
    if (!host) return;
    const tops = featureRowTops(host);
    let y: number | null = null;
    for (let i = pos; i < n && y === null; i++) y = tops[i];
    if (y === null) {
      const rows = host.querySelectorAll('.k-tree-row');
      const last = rows[rows.length - 1];
      if (last) y = last.getBoundingClientRect().bottom - host.getBoundingClientRect().top;
    }
    if (y !== null) setBarTop((b) => (Math.abs(b - y!) > 0.5 ? y! : b));
  };
  useLayoutEffect(measureBar);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureBar());
    ro.observe(host);
    return () => ro.disconnect();
  });

  const menuFeature = menu ? st.doc.features.find((f) => f.id === menu.featureId) : undefined;
  const sensorMenu = menu && menu.featureId === '__sensors';
  const menuSensorId = menu && menu.featureId.startsWith('__sensor:') ? menu.featureId.slice(9) : null;
  const menuBodyId = menu && menu.featureId.startsWith('__body:') ? menu.featureId.slice(7) : null;
  const menuBodyHidden = !!menuBodyId && (st.doc.hiddenBodies ?? []).includes(menuBodyId);

  return (
    <div
      ref={hostRef}
      style={{ position: 'relative' }}
      onPointerMove={(e) => {
        if (!dragRollback.current) return;
        const el = e.currentTarget as HTMLElement;
        const y = e.clientY - el.getBoundingClientRect().top;
        // the bar goes above the first feature row whose middle is below the pointer
        const tops = featureRowTops(el);
        let idx = n;
        for (let i = 0; i < n; i++) if (tops[i] !== null && tops[i]! + 11 > y) { idx = i; break; }
        st.setRollback(idx >= n ? null : idx);
      }}
      onPointerUp={() => (dragRollback.current = false)}
    >
      <TreeView nodes={nodes} />
      {n > 0 && (
        <div
          className="k-rollback-bar k-tip"
          data-tip="Rollback bar: drag up to roll back features"
          style={{ top: barTop }}
          onPointerDown={(e) => {
            dragRollback.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
        />
      )}
      {sensorMenu && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu!.x, top: menu!.y }}
          items={[
            { label: 'Add Sensor… ▸ Mass', icon: <Icon.Sensor />, onSelect: () => st.addSensor('mass') },
            { label: 'Add Sensor… ▸ Volume', icon: <Icon.Sensor />, onSelect: () => st.addSensor('volume') },
            { label: 'Add Sensor… ▸ Surface Area', icon: <Icon.Sensor />, onSelect: () => st.addSensor('area') },
            { separator: true },
            { label: 'Notifications…', icon: <Icon.Warning />, onSelect: () => st.setAsk({ title: 'Sensor Notifications', text: 'Alert when the value is above (> 500) or below (< 100) a limit. Empty: no alert.', input: '> 0', yes: (v) => { const m = /^\s*([<>])\s*([\d.]+)/.exec(v); st.applyDocument('Sensor Notifications', { ...st.doc, sensors: (st.doc.sensors ?? []).map((x) => (x.id === (menuSensorId ?? (st.doc.sensors ?? [])[0]?.id) ? { ...x, alert: m ? { op: m[1] as '>' | '<', value: Number(m[2]) } : undefined } : x)) }); } }) },
          ]}
        />
      )}
      {menuBodyId && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu!.x, top: menu!.y }}
          items={[
            { label: menuBodyHidden ? 'Show Body' : 'Hide Body', icon: <Icon.Eye />, onSelect: () => st.setBodyHidden(menuBodyId, !menuBodyHidden) },
            { label: 'Material…', icon: <Icon.Material />, onSelect: () => st.openMaterialFor(menuBodyId) },
            { label: 'Appearance…', icon: <Icon.Appearance />, onSelect: () => { st.openMaterialFor(menuBodyId); st.setDialog('appearance'); } },
            { label: 'Combine…', icon: <Icon.Combine />, onSelect: () => st.startCombine() },
            { separator: true },
            { label: 'Isolate', icon: <Icon.Eye />, onSelect: () => st.setIsolated([menuBodyId]) },
            { label: 'Delete Body', icon: <Icon.Trash />, onSelect: () => st.deleteBodies([menuBodyId]) },
          ]}
        />
      )}
      {menuSensorId && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu!.x, top: menu!.y }}
          items={[
            { label: 'Edit Sensor…', icon: <Icon.Sensor />, onSelect: () => st.setDialog('mass') },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.deleteSensor(menuSensorId) },
          ]}
        />
      )}
      {menu && menuFeature && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          items={[
            ...(isSolidFeature(menuFeature)
              ? [
                  { label: 'Edit Feature', icon: menuFeature.type === 'extrude' ? <Icon.Extrude /> : <Icon.Revolve />, onSelect: () => st.editFeature(menuFeature.id) },
                  ...(isRoundFeature(menuFeature) ? [] : [{ label: 'Edit Sketch', icon: <Icon.Sketch />, onSelect: () => st.editSketch((menuFeature as { sketchId: string }).sketchId) }]),
                  { label: menuFeature.suppressed ? 'Unsuppress' : 'Suppress', onSelect: () => st.toggleSuppress(menuFeature.id) },
                  { label: 'Configure Feature', icon: <Icon.Config />, onSelect: () => st.openConfigure({ features: [menuFeature.id] }) },
                ]
              : [
                  { label: 'Edit Sketch', icon: <Icon.Sketch />, onSelect: () => st.editSketch(menuFeature.sketchId) },
                  { label: 'Sketch Color…', icon: <Icon.Palette />, onSelect: () => { const sid = menuFeature.sketchId; const inp = document.createElement('input'); inp.type = 'color'; inp.value = st.doc.sketches[sid]?.color ?? '#5a5a5a'; inp.onchange = () => { const doc = useStore.getState().doc; useStore.getState().applyDocument('Sketch Color', { ...doc, sketches: { ...doc.sketches, [sid]: { ...doc.sketches[sid], color: inp.value } } }); }; inp.click(); } },
                  { label: 'Extruded Boss/Base', icon: <Icon.Extrude />, onSelect: () => { st.setSelectedFeature(menuFeature.id); st.startFeature('extrude', 'boss'); } },
                  { label: 'Extruded Cut', icon: <Icon.Cut />, onSelect: () => { st.setSelectedFeature(menuFeature.id); st.startFeature('extrude', 'cut'); } },
                ]),
            { separator: true },
            { label: 'Roll to end', onSelect: () => st.setRollback(null) },
            { label: 'Roll to previous', onSelect: () => st.setRollback(Math.max(0, st.doc.features.findIndex((f) => f.id === menu.featureId))) },
            { separator: true },
            {
              label: 'Rename tree item',
              onSelect: () => setRenaming({ id: menuFeature.id, value: menuFeature.name }),
            },
            { label: 'Delete…', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.requestDeleteFeature(menu.featureId) },
          ]}
        />
      )}
    </div>
  );
}
