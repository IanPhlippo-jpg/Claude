import { sensorAlarm as sensorAlarmOf, sensorReading } from '../sensors';
import { reorderFeatures } from '../../core/features/reorder';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { bridge } from '../viewport/bridge';
import { featureIcon } from './featureIcon';
import { sketchStatus, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Menu, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { createDocument } from '../../core/document/types';
import { cutListsOn, frameCutList as cutList } from '../prefsTables';
import { materialFavorites as loadFavorites } from '../prefs';
import { commentStamp, scrollTreeSelection, showTreeWarning, treeHoverHighlight } from '../prefsEffects';
import { MATERIAL_LIBRARY } from '../../core/document/materials';
import { serializeDocument } from '../../core/document/persistence';
import { withUnsavedCheck } from '../MenuBar';
import { activeConfiguration } from '../../core/document/configurations';
import { PLANE_LABELS } from '../viewport/camera';
import { sketchChains } from '../../core/features/thin';
import * as THREE from 'three';
import { resolvePlaneDef } from '../../core/features/planes';
import { planeMatrix } from '../../core/features/solid';
import { isRoundFeature, isSketchBased, isSolidFeature, type Feature } from '../../core/document/types';

const STATUS_LABEL: Record<string, string> = { under: 'under defined', full: '', over: 'over defined', conflict: 'conflict', invalid: 'invalid' };

/**
 * Feature Tree body: Part ▸ History, Sensors, Annotations, Solid Bodies(n),
 * Material, Front/Top/Right Plane, Origin, features (a feature shows its sketch as a
 * child); with a draggable rollback bar.
 */
export function FeatureTreeBody() {
  const st = useStore(useShallow((s) => ({ prefs: s.prefs, treeFilter: s.treeFilter, show: s.show, rebuild: s.rebuild, renameFeature: s.renameFeature, solve: s.solve, doc: s.doc, rollbackIndex: s.rollbackIndex, activeSketchId: s.activeSketchId, selectedFeatureId: s.selectedFeatureId, editSketch: s.editSketch, setSelection: s.setSelection, setSelectedFeature: s.setSelectedFeature, featureEdit: s.featureEdit, edit3DSketch: s.edit3DSketch, editFeature: s.editFeature, setHoverPlane: s.setHoverPlane, selectedPlane: s.selectedPlane, planePick: s.planePick, newSketch: s.newSketch, setSelectedPlane: s.setSelectedPlane, setDialog: s.setDialog, toggleShow: s.toggleShow, applyDocument: s.applyDocument, setSheetMetalEdit: s.setSheetMetalEdit, planeEdit: s.planeEdit, editPlane: s.editPlane, startRefGeom: s.startRefGeom, pushMessage: s.pushMessage, setRollback: s.setRollback, setMaterial: s.setMaterial, rebuildAll: s.rebuildAll, addSensor: s.addSensor, setAsk: s.setAsk, setBodyHidden: s.setBodyHidden, openMaterialFor: s.openMaterialFor, startCombine: s.startCombine, setIsolated: s.setIsolated, deleteBodies: s.deleteBodies, deleteSensor: s.deleteSensor, toggleSuppress: s.toggleSuppress, openConfigure: s.openConfigure, startFeature: s.startFeature, requestDeleteFeature: s.requestDeleteFeature })));
  const [menu, setMenu] = useState<{ x: number; y: number; featureId: string } | null>(null);
  // the context toolbar of a clicked feature or sketch, by design: it appears beside the pointer and fades when the pointer leaves
  const [bar, setBar0] = useState<{ x: number; y: number; featureId: string; shown?: boolean; live?: boolean } | null>(null);
  const barTimer = useRef(0);
  // shown after a short rest of the pointer (a quick second click goes to the tree, not to the toolbar)
  const planeMenu = (e: React.MouseEvent, plane: string) => {
    e.preventDefault();
    if (st.planePick) { st.newSketch(plane); return; }
    st.setSelectedPlane(plane);
    window.clearTimeout(barTimer.current);
    setBar0({ x: e.clientX, y: e.clientY, featureId: '__plane:' + plane, shown: true, live: true });
    setMenu({ x: e.clientX, y: e.clientY + 8, featureId: '__plane:' + plane });
  };
  // a right-click on a feature shows its toolbar with the menu under it, as on a plane
  const featureMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    window.clearTimeout(barTimer.current);
    setBar0(st.activeSketchId ? null : { x: e.clientX, y: e.clientY, featureId: id, shown: true, live: true });
    setMenu({ x: e.clientX, y: e.clientY + 8, featureId: id });
  };
  const setBar = (b: { x: number; y: number; featureId: string } | null) => {
    window.clearTimeout(barTimer.current);
    setBar0(null);
    if (b) barTimer.current = window.setTimeout(() => setBar0({ ...b, shown: true }), 350);
  };
  const barRef = useRef<HTMLDivElement>(null);
  // Options ▸ Feature Tree ▸ Scroll selected item into view
  useEffect(() => { scrollTreeSelection(st.selectedFeatureId); }, [st.selectedFeatureId]);
  useEffect(() => {
    if (!bar) return;
    const away = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - bar.x, e.clientY - bar.y) > 160) { setBar0(null); return; }
      // it takes clicks only once the pointer is on it
      const r = barRef.current?.getBoundingClientRect();
      const inside = !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      // live once the pointer rests on it (a quick click passing over it goes to the tree)
      if (!inside) { window.clearTimeout(liveTimer); liveTimer = 0; if (bar.live) setBar0({ ...bar, live: false }); }
      else if (!bar.live && !liveTimer) liveTimer = window.setTimeout(() => setBar0({ ...bar, live: true }), 150);
    };
    let liveTimer = 0;
    const down = (e: PointerEvent) => { if (!(e.target as Element).closest?.('.k-tree-ctxbar')) setBar0(null); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setBar0(null); };
    window.addEventListener('pointermove', away);
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => { window.clearTimeout(liveTimer); window.removeEventListener('pointermove', away); window.removeEventListener('pointerdown', down, true); window.removeEventListener('keydown', key); };
  }, [bar]);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const dragRollback = useRef(false);
  const q = st.treeFilter.trim().toLowerCase();
  const consumed = st.rebuild.consumedSketches;

  // F2 renames the selected plane or feature in the tree, by design
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'F2' || (e.target as Element)?.closest?.('input, textarea, select')) return;
      const s = useStore.getState();
      if (s.selectedPlane === 'front' || s.selectedPlane === 'top' || s.selectedPlane === 'right') setRenaming({ id: '__plane:' + s.selectedPlane, value: s.doc.planeNames?.[s.selectedPlane] ?? PLANE_LABELS[s.selectedPlane] });
      else if (s.selectedFeatureId) { const f = s.doc.features.find((x) => x.id === s.selectedFeatureId); if (f) setRenaming({ id: f.id, value: f.name }); }
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  // the rename box of a body or plane (their names live in the document, not in a feature)
  const renameBox = (id: string, current: string, save: (name: string) => void): ReactNode => (
    <input
      className="k-input"
      style={{ height: 20 }}
      autoFocus
      data-testid="tree-rename"
      onFocus={(e) => e.target.select()}
      value={renaming?.value ?? current}
      onChange={(e) => setRenaming({ id, value: e.target.value })}
      onBlur={() => { if (renaming?.value && renaming.value !== current) save(renaming.value); setRenaming(null); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); e.stopPropagation(); }}
    />
  );

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
      // a sketch shared by several features shows the hand, by design
      icon: st.doc.features.filter((x) => x.type !== 'sketch' && 'sketchId' in x && (x as { sketchId?: string }).sketchId === f.sketchId).length > 1 ? <Icon.SketchShared style={{ color: '#2b6cb0' }} /> : <Icon.Sketch style={{ color: '#2b6cb0' }} />,
      label: nameLabel(f, prefix),
      active: st.activeSketchId === f.sketchId,
      selected: st.selectedFeatureId === f.id,
      suppressed: f.suppressed || rolledBack,
      tail: solve && (solve.status === 'conflict' || solve.status === 'over') ? <span className={`status ${solve.status}`} title={STATUS_LABEL[solve.status]}>!</span> : null,
      onDoubleClick: () => st.editSketch(f.sketchId),
      onClick: (e) => {
        if (st.activeSketchId !== f.sketchId) st.setSelection([]);
        // by design: a click selects (again), Ctrl+click takes it out of the selection
        st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === f.id ? null : f.id);
        if (!e.ctrlKey && !st.activeSketchId) setBar({ x: e.clientX, y: e.clientY, featureId: f.id });
      },
      onContextMenu: (e) => featureMenu(e, f.id),
    };
  };

  // sheet metal bends under their feature, numbered through the part as the intended tree: BaseBend1, EdgeBend1, …
  const bendRows = (() => {
    const out = new Map<string, TreeNode[]>();
    const n: Record<string, number> = { BaseBend: 0, EdgeBend: 0, MiterBend: 0, SharpBend: 0 };
    const add = (fid: string, kind: string, count: number) => out.set(fid, Array.from({ length: count }, () => { n[kind]++; return { id: `${fid}:bend${n[kind]}`, icon: <Icon.Sheet />, label: <span>{kind}{n[kind]}</span> } as TreeNode; }));
    for (const f of st.doc.features) {
      if (f.type === 'baseFlange') {
        const sk = st.doc.sketches[f.sketchId];
        if (!sk) continue;
        const ents = sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e && !e.construction);
        const L = ents.filter((e) => e.kind === 'line').length, A = ents.filter((e) => e.kind === 'arc').length;
        const closed = ents.some((e) => e.kind === 'circle') || sketchChains(sk).every((c) => c.closed);
        // an open profile: every arc is a bend, and so is every sharp corner between two lines
        if (!closed) add(f.id, 'BaseBend', A + Math.max(0, L - 1 - A));
      } else if (f.type === 'edgeFlange' && f.edge) add(f.id, 'EdgeBend', 1);
      else if (f.type === 'miterFlange') add(f.id, 'MiterBend', Math.max(1, f.edges.length));
      // Convert to Sheet Metal / Insert Bends: the sharp edges that became bends
      else if (f.type === 'convertSheet' && st.rebuild.bendCounts?.[f.id]) add(f.id, 'SharpBend', st.rebuild.bendCounts[f.id]);
    }
    return out;
  })();

  const solidNode = (f: Feature, i: number): TreeNode => {
    const rolledBack = st.rollbackIndex !== null && i >= st.rollbackIndex;
    const err = st.rebuild.errors[f.id];
    const warning = st.rebuild.warnings?.[f.id];
    const icon = featureIcon(f);
    const sketchFeature = (isSketchBased(f) && f.type !== 'sketch') || f.type === 'miterFlange' || f.type === 'jog' || f.type === 'sketchedBend' || (f.type === 'surface' && !!f.sketchId) ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === (f as { sketchId: string }).sketchId) : undefined;
    const secondId = f.type === 'sweep' ? f.pathSketchId : f.type === 'loft' ? f.sketchId2 : null;
    const secondSketch = secondId ? st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === secondId) : undefined;
    const sketchIndex = sketchFeature ? st.doc.features.indexOf(sketchFeature) : -1;
    return {
      id: f.id,
      icon,
      // the flat pattern is a folder "Flat-Pattern" holding Flat-Pattern1, by design
      label: f.type === 'flatPattern' ? <span>Flat-Pattern</span> : nameLabel(f),
      selected: st.selectedFeatureId === f.id,
      active: st.featureEdit?.featureId === f.id,
      suppressed: f.suppressed || rolledBack,
      tail: err ? <span className="status conflict" data-testid="tree-error" title={err} onClick={(e) => { e.stopPropagation(); useStore.setState({ whatsWrong: true }); }}>!</span> : warning && showTreeWarning() ? <span className="status warning" data-testid="tree-warning" title={warning} onClick={(e) => { e.stopPropagation(); useStore.setState({ whatsWrong: true }); }}>!</span> : null,
      children: [...(f.type === 'flatPattern' ? [{ id: f.id + ':fp', icon: <Icon.Sheet />, label: nameLabel(f), suppressed: f.suppressed } as TreeNode] : []), ...(sketchFeature && sketchFeature.type === 'sketch' ? [sketchNode(sketchFeature, sketchIndex)] : []), ...(bendRows.get(f.id) ?? []), ...(secondSketch && secondSketch.type === 'sketch' ? [sketchNode(secondSketch, st.doc.features.indexOf(secondSketch))] : []), ...(f.type === 'loft' ? (f.guides ?? []).map((gid) => st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === gid)).filter((x): x is Extract<Feature, { type: 'sketch' }> => !!x && x.type === 'sketch').map((x) => sketchNode(x, st.doc.features.indexOf(x))) : [])],
      onDoubleClick: () => (f.type === 'sketch3d' ? st.edit3DSketch(f.id) : st.editFeature(f.id)),
      onClick: (e) => { st.setSelectedFeature(e.ctrlKey && st.selectedFeatureId === f.id ? null : f.id); if (!e.ctrlKey && !st.activeSketchId && !st.featureEdit) setBar({ x: e.clientX, y: e.clientY, featureId: f.id }); },
      onHover: (on) => useStore.setState({ hoverFeatureId: on && treeHoverHighlight() ? f.id : null }),
      onContextMenu: (e) => featureMenu(e, f.id),
    };
  };

  const featureNodes: TreeNode[] = [];
  // Reorder: a feature dragged onto another goes right below it, unless that breaks a parent/child relation (F113)
  const dragFor = (id: string): TreeNode['drag'] => (st.activeSketchId || st.featureEdit ? undefined : { canDrop: (src) => !reorderFeatures(st.doc, src, id).error, onDrop: (src) => { useStore.getState().reorderFeature(src, id); } });
  // Create New Folder: features in a folder sit under its node, placed where the first member was
  const folderOf = new Map<string, string>();
  for (const fo of st.doc.featureFolders ?? []) for (const id of fo.featureIds) folderOf.set(id, fo.id);
  const folderNodes = new Map<string, TreeNode>();
  const comments = st.doc.comments ?? [];
  const withComment = (node: TreeNode, id: string): TreeNode => (comments.some((c) => c.featureId === id) ? { ...node, tail: <span style={{ display: 'inline-flex', gap: 4 }}>{node.tail}<Icon.Note size={11} style={{ color: '#b8860b' }} /></span> } : node);
  st.doc.features.forEach((f, i) => {
    if (q && !f.name.toLowerCase().includes(q)) return;
    let node: TreeNode | null = null;
    if (f.type === 'sketch') {
      if (!consumed.has(f.sketchId)) node = sketchNode(f, i);
    } else node = solidNode(f, i);
    if (!node) return;
    node = { ...withComment(node, f.id), drag: dragFor(f.id) };
    const fid = folderOf.get(f.id);
    if (fid) {
      let fn = folderNodes.get(fid);
      if (!fn) {
        const fo = (st.doc.featureFolders ?? []).find((x) => x.id === fid)!;
        fn = { id: 'folder:' + fid, icon: <Icon.Folder />, label: <span>{fo.name}</span>, children: [], onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__folder:' + fid }); } };
        folderNodes.set(fid, fn);
        featureNodes.push(fn);
      }
      fn.children!.push(node);
    } else featureNodes.push(node);
  });
  // Add to Favorites: the Favorites folder (above History, by design) lists the chosen features
  const favorites = (st.doc.favorites ?? []).map((id) => st.doc.features.find((x) => x.id === id)).filter((x): x is Feature => !!x);
  const favoritesNode: TreeNode[] = favorites.length ? [{ id: 'favorites', icon: <Icon.Folder />, label: <span>Favorites</span>, children: favorites.map((x) => ({ ...(x.type === 'sketch' ? sketchNode(x, st.doc.features.indexOf(x)) : solidNode(x, st.doc.features.indexOf(x))), id: 'fav:' + x.id, children: undefined })) }] : [];
  // Create Bounding Box: a tree item after the features
  if (st.doc.boundingBox) featureNodes.push({ id: 'boundingbox', icon: <Icon.Orientation />, label: <span>Bounding Box</span>, onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__bbox' }); } });

  const planeNode = (p: 'front' | 'top' | 'right'): TreeNode => ({
    id: 'plane-' + p,
    label: renaming?.id === '__plane:' + p
      ? renameBox('__plane:' + p, st.doc.planeNames?.[p] ?? PLANE_LABELS[p], (name) => st.applyDocument('Rename plane', { ...st.doc, planeNames: { ...st.doc.planeNames, [p]: name } }))
      : <span onMouseEnter={() => st.setHoverPlane(p)} onMouseLeave={() => st.setHoverPlane(null)}>{st.doc.planeNames?.[p] ?? PLANE_LABELS[p]}</span>,
    icon: <Icon.TreePlane />,
    selected: st.selectedPlane === p,
    onClick: (e) => {
      if (st.planePick) st.newSketch(p);
      else {
        st.setSelectedPlane(e.ctrlKey && st.selectedPlane === p ? null : p);
        // the context toolbar of a plane, as the intended design: Sketch, Show/Hide, Zoom to Selection, Normal To
        if (!e.ctrlKey && !st.activeSketchId && !st.featureEdit) setBar({ x: e.clientX, y: e.clientY, featureId: '__plane:' + p });
      }
    },
    onDoubleClick: () => {
      if (!st.activeSketchId) st.newSketch(p);
    },
    // right-click: the plane is selected and its context toolbar shows above the context menu (a sketch starts from
    // the toolbar's Sketch button or a double-click, never from the right-click itself)
    onContextMenu: (e) => planeMenu(e, p),
  });

  const sys = (id: string, icon: React.ReactNode, label: string, children?: TreeNode[]): TreeNode => ({ id, icon, label: <span>{label}</span>, children });
  // Weldments: identical bodies grouped as Cut-List-Item folders (right-click: Properties…)
  const withCutListItems = (nodes: TreeNode[]): TreeNode[] => {
    const meta = st.rebuild.bodyMeta ?? {};
    const items = cutList(st.rebuild.bodies.filter((b) => meta[b.id]?.kind !== 'bead').map((b) => ({ id: b.id, geometry: b.geometry, description: meta[b.id]?.description, length: meta[b.id]?.length, angle1: meta[b.id]?.angle1, angle2: meta[b.id]?.angle2 })));
    return items.map((it, i): TreeNode => ({
      id: `cutitem:${i}`,
      icon: <Icon.TreeFolder glyph="bodies" />,
      // the quantity always follows the name, as Cut-List-Item1(1), by design
      label: <span>{it.name}({it.quantity})</span>,
      onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__cutitem:' + i }); },
      onDoubleClick: () => st.setDialog('cutList'),
      children: nodes.filter((n) => it.bodyIds.includes(n.id.replace(/^body-/, ''))),
    }));
  };
  // Add to New Folder (bodies): body nodes in a folder sit under its node
  const withBodyFolders = (nodes: TreeNode[]): TreeNode[] => {
    const folders = st.doc.bodyFolders ?? [];
    if (!folders.length) return nodes;
    const out: TreeNode[] = [];
    const seen = new Set<string>();
    for (const n of nodes) {
      const fo = folders.find((x) => x.bodyIds.includes(n.id.replace(/^body-/, '')));
      if (!fo) { out.push(n); continue; }
      if (!seen.has(fo.id)) {
        seen.add(fo.id);
        out.push({ id: 'bfolder:' + fo.id, icon: <Icon.Folder />, label: <span>{fo.name}</span>, children: nodes.filter((m) => fo.bodyIds.includes(m.id.replace(/^body-/, ''))) });
      }
    }
    return out;
  };

  const bodies = st.rebuild.bodies;
  // a body is named after its last feature; several bodies of one feature get [1], [2], …, by design
  const bodyName = (b: (typeof bodies)[number]) => {
    if (st.doc.bodyNames?.[b.id]) return st.doc.bodyNames[b.id];
    const name = (x: typeof b) => st.doc.features.find((f) => f.id === x.featureIds[x.featureIds.length - 1])?.name ?? x.id;
    const same = bodies.filter((x) => name(x) === name(b));
    return same.length > 1 ? `${name(b)}[${same.indexOf(b) + 1}]` : name(b);
  };
  const sensorAlarm = (sn: NonNullable<typeof st.doc.sensors>[number]) => sensorAlarmOf(st.doc, bodies, sn);
  // Options > Feature Tree > Hide/show tree items: Automatic shows a folder as the intended design does (Equations only
  // once there are equations), Hide and Show force it
  const TREE_ITEM: Record<string, string> = { history: 'History', sensors: 'Sensors', annotations: 'Annotations', bodies: 'Solid Bodies', surfaces: 'Surface Bodies', equations: 'Equations', material: 'Material', 'plane-front': 'Default Planes', 'plane-top': 'Default Planes', 'plane-right': 'Default Planes', origin: 'Origin' };
  const treeItemShown = (n: TreeNode) => {
    const item = TREE_ITEM[n.id];
    if (!item) return true;
    const how = String(st.prefs[`fm.tree.${item}`] ?? 'Automatic');
    return how === 'Show' || (how !== 'Hide' && (item !== 'Equations' || st.doc.equations.length > 0));
  };
  const nodes: TreeNode[] = [
    {
      id: 'part',
      icon: <span style={{ display: 'inline-flex', gap: 2 }}><Icon.Part /><Icon.ConfigBadge /></span>,
      label: (
        <span>
          {/* the root's error marker comes first: the long root name runs past the pane edge (F78) */}
          {Object.keys(st.rebuild.errors).length ? <span className="status conflict" data-testid="tree-error-root" style={{ marginRight: 4 }} title="What's Wrong: features that could not be rebuilt" onClick={(e) => { e.stopPropagation(); useStore.setState({ whatsWrong: true }); }}>!</span> : null}
          {st.doc.name} ({activeConfiguration(st.doc).name}) {`<<${activeConfiguration(st.doc).name}>_Display State 1>`}
        </span>
      ),
      tail: null,
      children: ([
        ...favoritesNode,
        sys('history', <Icon.TreeFolder glyph="history" />, 'History', st.doc.features.slice(-6).reverse().map((f): TreeNode => ({ id: 'hist-' + f.id, icon: <Icon.History />, label: <span>{f.name}</span>, onClick: () => st.setSelectedFeature(f.id) }))),
        {
          id: 'sensors',
          icon: <Icon.TreeFolder glyph="sensor" />,
          label: <span>Sensors</span>,
          onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__sensors' }); },
          children: (st.doc.sensors ?? []).map((sn) => ({
            id: sn.id,
            icon: <Icon.Sensor />,
            label: <span className={sensorAlarm(sn) ? 'k-sensor-alarm' : ''} title={sn.alert ? `Alert when ${sn.alert.op} ${sn.alert.value}` : undefined}>{sensorAlarm(sn) ? '⚠ ' : ''}{sn.name}({sensorReading(st.doc, bodies, sn).text})</span>,
            onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__sensor:' + sn.id }); },
          })),
        },
        sys('annotations', <Icon.TreeFolder glyph="annotation" />, 'Annotations'),
        ...(bodies.length
          ? [sys('bodies', <Icon.TreeFolder glyph="bodies" />, st.doc.sheetMetal || (st.doc.weldment && cutListsOn()) ? `Cut list(${bodies.filter((b) => st.rebuild.bodyMeta?.[b.id]?.kind !== 'bead').length})` : `Solid Bodies(${bodies.length})`, (st.doc.weldment && cutListsOn() ? withCutListItems : withBodyFolders)(bodies.filter((b) => !st.doc.weldment || st.rebuild.bodyMeta?.[b.id]?.kind !== 'bead').map((b): TreeNode => {
              const hiddenBody = (st.doc.hiddenBodies ?? []).includes(b.id);
              const mat = st.doc.bodyMaterials?.[b.id];
              return {
                id: 'body-' + b.id,
                icon: <Icon.Part style={hiddenBody ? { opacity: 0.4 } : undefined} />,
                label: <span className={hiddenBody ? 'k-muted' : ''} style={hiddenBody ? { fontStyle: 'italic' } : undefined} title={b.exact ? 'Exact surfaces (B-rep)' : 'Faceted (mesh kernel): STEP writes it as sewn facets'} data-exact={b.exact ? 'true' : 'false'}>{renaming?.id === '__body:' + b.id ? renameBox('__body:' + b.id, bodyName(b), (name) => st.applyDocument('Rename body', { ...st.doc, bodyNames: { ...st.doc.bodyNames, [b.id]: name } })) : bodyName(b)}</span>,
                // the body's own material is a row under it, by design
                children: mat ? [{ id: 'bodymat-' + b.id, icon: <Icon.TreeMaterial />, label: <span>{mat.name}</span>, onDoubleClick: () => st.openMaterialFor(b.id) }] : undefined,
                onClick: (e) => { if (!e.ctrlKey && !st.activeSketchId && !st.featureEdit) setBar({ x: e.clientX, y: e.clientY, featureId: '__body:' + b.id }); },
                onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__body:' + b.id }); },
              };
            })))]
          : []),
        ...((st.rebuild.surfaceBodies ?? []).length
          ? [sys('surfaces', <Icon.TreeFolder glyph="surfaces" />, `Surface Bodies(${(st.rebuild.surfaceBodies ?? []).length})`, (st.rebuild.surfaceBodies ?? []).map((b): TreeNode => ({ id: 'sbody-' + b.id, icon: <Icon.Sheet />, label: <span>{st.doc.features.find((f) => f.id === b.featureIds[0])?.name ?? b.id}</span> })))]
          : []),
        // the Equations folder, as the intended design: Σ, the equations under it, a double-click opens Manage Equations
        { id: 'equations', icon: <Icon.Sigma />, label: <span>Equations</span>, onDoubleClick: () => st.setDialog('equations'), onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.setDialog('equations'); }, children: st.doc.equations.length ? st.doc.equations.map((eq): TreeNode => ({ id: 'eq-' + eq.id, icon: <Icon.Sigma size={12} />, label: <span className="mono">"{eq.target}" = {eq.expression}</span>, onDoubleClick: () => st.setDialog('equations') })) : undefined },
        { id: 'material', icon: <Icon.TreeMaterial />, label: <span>{st.doc.material ? st.doc.material.name : 'Material <not specified>'}</span>, onDoubleClick: () => st.setDialog('material'), onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__material' }); } },
        planeNode('front'),
        planeNode('top'),
        planeNode('right'),
        { id: 'origin', icon: <Icon.Origin style={{ color: '#2b2b2b' }} />, label: 'Origin', onClick: () => st.toggleShow('origin') },
        ...(st.doc.centerOfMass ? [{ id: 'com', icon: <Icon.CenterOfMass />, label: 'Center of Mass', onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.applyDocument('Delete Center of Mass', { ...st.doc, centerOfMass: undefined }); } } as TreeNode] : []),
        // sheet metal parts: the Sheet-Metal folder after the origin (default parameters), by design
        ...(st.doc.weldment ? [{ id: 'weldment', icon: <Icon.Weldment />, label: <span>Frame</span>, onDoubleClick: () => st.setDialog('cutList') } as TreeNode] : []),
        ...(st.doc.weldment && st.rebuild.bodies.some((b) => st.rebuild.bodyMeta?.[b.id]?.kind === 'bead') ? [sys('weldfolder', <Icon.TreeFolder glyph="bodies" />, `Weld Folder(${st.rebuild.bodies.filter((b) => st.rebuild.bodyMeta?.[b.id]?.kind === 'bead').length})`, st.rebuild.bodies.filter((b) => st.rebuild.bodyMeta?.[b.id]?.kind === 'bead').map((b): TreeNode => ({ id: 'body-' + b.id, icon: <Icon.WeldBead />, label: <span>{st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id}</span>, onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, featureId: '__body:' + b.id }); } })))] : []),
        ...(st.doc.sheetMetal ? [{ id: 'sheetmetal', icon: <Icon.Sheet />, label: <span>Sheet-Metal</span>, onDoubleClick: () => st.setSheetMetalEdit(true), onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); st.setSheetMetalEdit(true); }, children: [{ id: 'sheetmetal:1', icon: <Icon.Sheet />, label: <span>Sheet-Metal1</span>, onDoubleClick: () => st.setSheetMetalEdit(true) } as TreeNode] } as TreeNode] : []),
        ...Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p): TreeNode => ({
          id: p.id,
          icon: <Icon.TreePlane />,
          label: <span onMouseEnter={() => st.setHoverPlane(p.id)} onMouseLeave={() => st.setHoverPlane(null)}>{p.name}</span>,
          selected: st.selectedPlane === p.id,
          active: st.planeEdit?.planeId === p.id,
          onClick: (e) => (st.planePick ? st.newSketch(p.id) : st.setSelectedPlane(e.ctrlKey && st.selectedPlane === p.id ? null : p.id)),
          onDoubleClick: () => st.editPlane(p.id),
          onContextMenu: (e) => planeMenu(e, p.id),
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
      ] as TreeNode[]).filter(treeItemShown),
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

  const bodyLabel = (id: string) => { const i = st.rebuild.bodies.findIndex((b) => b.id === id); return i >= 0 ? `${st.doc.features.find((x) => x.id === st.rebuild.bodies[i].featureIds[st.rebuild.bodies[i].featureIds.length - 1])?.name ?? 'Body'}${st.rebuild.bodies.length > 1 ? `<${i + 1}>` : ''}` : id; };
  /** Insert into New Part / Save Selection / Save Bodies: the body (or all bodies) as an imported mesh in a part document */
  const bodyToNewPart = (bodyId: string | null, how: 'open' | 'save') => {
    const bodies = st.rebuild.bodies.filter((b) => !bodyId || b.id === bodyId);
    if (!bodies.length) return;
    const name = bodyId ? bodyLabel(bodyId).replace(/[<>]/g, '') : `${st.doc.name}-bodies`;
    const d = createDocument(name);
    d.features = bodies.map((b, i) => { const pos = (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).getAttribute('position'); return { id: `imp${i + 1}`, type: 'imported' as const, name: bodyLabel(b.id), suppressed: false, positions: Array.from(pos.array as Float32Array), source: `${st.doc.name}.kcad` }; });
    if (how === 'open') withUnsavedCheck(() => { useStore.getState().openDocument(d); useStore.getState().pushMessage(`${name} opened as a new part with the body as an imported feature.`, 'info'); });
    else {
      const text = serializeDocument(d);
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.kcad`;
      a.click();
      URL.revokeObjectURL(a.href);
      st.pushMessage(`${name}.kcad saved.`, 'info');
    }
  };
  const menuFeature = menu ? st.doc.features.find((f) => f.id === menu.featureId) : undefined;
  const sensorMenu = menu && menu.featureId === '__sensors';
  const menuSensorId = menu && menu.featureId.startsWith('__sensor:') ? menu.featureId.slice(9) : null;
  const menuBodyId = menu && menu.featureId.startsWith('__body:') ? menu.featureId.slice(7) : null;
  const menuCutItem = menu && menu.featureId.startsWith('__cutitem:');
  const menuMaterial = menu && menu.featureId === '__material';
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
      {(
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
      {menuMaterial && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu!.x, top: menu!.y }}
          items={[
            { label: 'Edit Material…', icon: <Icon.Material />, onSelect: () => st.setDialog('material') },
            { label: 'Configure Material…', icon: <Icon.Config />, onSelect: () => st.setDialog('material') },
            { label: 'Manage Favorites…', icon: <Icon.Folder />, onSelect: () => st.setDialog('material') },
            { separator: true },
            ...loadFavorites().map((n) => ({ label: `${st.doc.material?.name === n ? '✓ ' : ''}${n}`, icon: <span className="swatch" style={{ background: MATERIAL_LIBRARY.flatMap((c) => c.materials).find((m) => m.name === n)?.color ?? '#ccc', width: 12, height: 12, display: 'inline-block' }} />, onSelect: () => { const m = MATERIAL_LIBRARY.flatMap((c) => c.materials).find((x) => x.name === n); if (m) st.setMaterial({ name: m.name, density: m.density, color: m.color }); } })),
            ...(loadFavorites().length ? [{ separator: true }] : []),
            { label: 'Plain Carbon Steel', onSelect: () => { const m = MATERIAL_LIBRARY.flatMap((c) => c.materials).find((x) => x.name === 'Plain Carbon Steel'); if (m) st.setMaterial({ name: m.name, density: m.density, color: m.color }); } },
            { label: 'Remove Material', icon: <Icon.Trash />, disabled: !st.doc.material, onSelect: () => st.setMaterial(null) },
          ]}
        />
      )}
      {menuCutItem && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu!.x, top: menu!.y }}
          items={[
            { label: 'Properties…', icon: <Icon.Properties />, onSelect: () => st.setDialog('cutList') },
            { label: 'Update', icon: <Icon.Rebuild />, onSelect: () => st.rebuildAll() },
            { separator: true },
            { label: 'Collapse Items', onSelect: () => setMenu(null) },
          ]}
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
            { label: menuBodyHidden ? 'Body Display ▸ Show Body' : 'Body Display ▸ Hide Body', icon: <Icon.Eye />, onSelect: () => st.setBodyHidden(menuBodyId, !menuBodyHidden) },
            { label: (st.doc.transparentBodies ?? []).includes(menuBodyId) ? 'Body Display ▸ Change Transparency (opaque)' : 'Body Display ▸ Change Transparency', icon: <Icon.DisplayStyle />, onSelect: () => { const t = st.doc.transparentBodies ?? []; st.applyDocument('Change Transparency', { ...st.doc, transparentBodies: t.includes(menuBodyId) ? t.filter((x) => x !== menuBodyId) : [...t, menuBodyId] }); } },
            { label: 'Body Display ▸ Appearance…', icon: <Icon.Appearance />, onSelect: () => { st.openMaterialFor(menuBodyId); st.setDialog('appearance'); } },
            { label: 'Material…', icon: <Icon.Material />, onSelect: () => st.openMaterialFor(menuBodyId) },
            { label: 'Rename', onSelect: () => { const b = bodies.find((x) => x.id === menuBodyId); if (b) setRenaming({ id: '__body:' + b.id, value: bodyName(b) }); } },
            { label: 'Combine…', icon: <Icon.Combine />, onSelect: () => st.startCombine() },
            { separator: true },
            { label: 'Isolate', icon: <Icon.Eye />, onSelect: () => st.setIsolated([menuBodyId]) },
            { label: 'Show Feature History', icon: <Icon.TreeFolder glyph="history" />, onSelect: () => { const b = st.rebuild.bodies.find((x) => x.id === menuBodyId); const names = (b?.featureIds ?? []).map((id) => st.doc.features.find((x) => x.id === id)?.name).filter(Boolean); if (b?.featureIds[0]) st.setSelectedFeature(b.featureIds[0]); st.pushMessage(`${bodyLabel(menuBodyId)}: ${names.join(' → ') || 'no features'}`, 'info'); } },
            { label: 'Add to New Folder', icon: <Icon.Folder />, onSelect: () => { const folders = st.doc.bodyFolders ?? []; st.applyDocument('New Folder', { ...st.doc, bodyFolders: [...folders.map((fo) => ({ ...fo, bodyIds: fo.bodyIds.filter((x) => x !== menuBodyId) })).filter((fo) => fo.bodyIds.length), { id: `bf${Date.now()}`, name: `Folder${folders.length + 1}`, bodyIds: [menuBodyId] }] }); } },
            { label: 'Create Bounding Box', icon: <Icon.Orientation />, onSelect: () => st.applyDocument('Bounding Box', { ...st.doc, boundingBox: true }) },
            { separator: true },
            { label: 'Insert into New Part…', icon: <Icon.Part />, onSelect: () => bodyToNewPart(menuBodyId, 'open') },
            { label: 'Save Selection…', icon: <Icon.Save />, onSelect: () => bodyToNewPart(menuBodyId, 'save') },
            { label: 'Save Bodies…', icon: <Icon.Save />, onSelect: () => bodyToNewPart(null, 'save') },
            { label: 'Delete/Keep Body…', icon: <Icon.Trash />, onSelect: () => useStore.getState().startDeleteBody([menuBodyId]) },
          ]}
        />
      )}
      {menu && menu.featureId.startsWith('__folder:') && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          items={[
            { label: 'Rename folder', onSelect: () => { const id = menu.featureId.slice(9); const fo = (st.doc.featureFolders ?? []).find((x) => x.id === id); st.setAsk({ title: 'Rename folder', text: 'Folder name', input: fo?.name ?? '', yes: (v) => v && st.applyDocument('Rename folder', { ...st.doc, featureFolders: (st.doc.featureFolders ?? []).map((x) => (x.id === id ? { ...x, name: v } : x)) }) }); } },
            { label: 'Dissolve folder', onSelect: () => { const id = menu.featureId.slice(9); st.applyDocument('Dissolve folder', { ...st.doc, featureFolders: (st.doc.featureFolders ?? []).filter((x) => x.id !== id) }); } },
          ]}
        />
      )}
      {menu && menu.featureId === '__bbox' && (
        <Menu onClose={() => setMenu(null)} style={{ position: 'fixed', left: menu.x, top: menu.y }} items={[{ label: 'Delete Bounding Box', icon: <Icon.Trash />, onSelect: () => st.applyDocument('Bounding Box', { ...st.doc, boundingBox: undefined }) }]} />
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
      {bar?.shown && (!menu || menu.featureId === bar.featureId) && bar.featureId.startsWith('__plane:') && (() => {
        const p = bar.featureId.slice(8) as 'front' | 'top' | 'right';
        const shown = st.doc.planeVisibility?.[p] ?? st.show.planes;
        const btn = (tip: string, icon: ReactNode, run: () => void, testid: string) => (
          <button key={testid} className="k-btn ghost icon k-tip" data-tip={tip} data-testid={testid} onClick={() => { setBar(null); run(); }}>{icon}</button>
        );
        return (
          <div ref={barRef} className="k-ctx-toolbar k-tree-ctxbar" data-testid="tree-ctxbar" style={{ position: 'fixed', left: bar.x + 14, top: bar.y - 40, zIndex: 50, pointerEvents: bar.live ? 'auto' : 'none' }}>
            {btn('Sketch', <Icon.Sketch />, () => st.newSketch(p), 'ctx-plane-sketch')}
            {btn(shown ? 'Hide' : 'Show', shown ? <Icon.EyeOff /> : <Icon.Eye />, () => st.applyDocument(shown ? 'Hide plane' : 'Show plane', { ...st.doc, planeVisibility: { ...st.doc.planeVisibility, [p]: !shown } }), 'ctx-plane-show')}
            {btn('Zoom to Selection', <Icon.ZoomSelection />, () => bridge.zoomFit?.(), 'ctx-zoom-selection')}
            {btn('Normal To', <Icon.Orientation />, () => bridge.camera?.normalTo(p as never), 'ctx-normal-to')}
          </div>
        );
      })()}
      {bar?.shown && !menu && bar.featureId.startsWith('__body:') && (() => {
        const id = bar.featureId.slice(7);
        const hidden = (st.doc.hiddenBodies ?? []).includes(id);
        const btn = (tip: string, icon: ReactNode, run: () => void, testid: string) => (
          <button key={testid} className="k-btn ghost icon k-tip" data-tip={tip} data-testid={testid} onClick={() => { setBar(null); run(); }}>{icon}</button>
        );
        return (
          <div ref={barRef} className="k-ctx-toolbar k-tree-ctxbar" data-testid="tree-ctxbar" style={{ position: 'fixed', left: bar.x + 14, top: bar.y - 40, zIndex: 50, pointerEvents: bar.live ? 'auto' : 'none' }}>
            {btn(hidden ? 'Show Body' : 'Hide Body', <Icon.Eye />, () => st.setBodyHidden(id, !hidden), 'ctx-body-hide')}
            {btn('Isolate', <Icon.Orientation />, () => st.setIsolated([id]), 'ctx-body-isolate')}
            {btn('Appearance', <Icon.Appearance />, () => { st.openMaterialFor(id); st.setDialog('appearance'); }, 'ctx-body-appearance')}
            {btn('Zoom to Fit', <Icon.Fit />, () => bridge.zoomFit?.(), 'ctx-zoom')}
          </div>
        );
      })()}
      {bar?.shown && (!menu || menu.featureId === bar.featureId) && (() => {
        const f = st.doc.features.find((x) => x.id === bar.featureId);
        if (!f) return null;
        const sketchId = f.type === 'sketch' ? f.sketchId : isSketchBased(f) && !isRoundFeature(f) ? (f as { sketchId?: string }).sketchId : undefined;
        const plane = sketchId ? st.doc.sketches[sketchId]?.plane : undefined;
        const btn = (tip: string, icon: ReactNode, run: () => void, testid: string) => (
          <button key={testid} className="k-btn ghost icon k-tip" data-tip={tip} data-testid={testid} onClick={() => { setBar(null); run(); }}>{icon}</button>
        );
        if (f.type === 'sketch') {
          // a sketch in the tree, as the intended design: Show/Hide, Zoom to Selection, Normal To
          const sk = st.doc.sketches[f.sketchId];
          const shown = sk?.visible ?? !st.rebuild.consumedSketches.has(f.sketchId);
          const zoomTo = () => {
            const pts = Object.values(sk?.points ?? {});
            if (!sk || !pts.length) return bridge.zoomFit?.();
            const M = planeMatrix(resolvePlaneDef(st.doc, sk.plane));
            bridge.camera?.fit(new THREE.Box3().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(M))));
          };
          return (
            <div ref={barRef} className="k-ctx-toolbar k-tree-ctxbar" data-testid="tree-ctxbar" style={{ position: 'fixed', left: bar.x + 14, top: bar.y - 40, zIndex: 50, pointerEvents: bar.live ? 'auto' : 'none' }}>
              {sk && btn(shown ? 'Hide' : 'Show', shown ? <Icon.EyeOff /> : <Icon.Eye />, () => st.applyDocument(shown ? 'Hide sketch' : 'Show sketch', { ...st.doc, sketches: { ...st.doc.sketches, [sk.id]: { ...sk, visible: !shown } } }), 'ctx-show')}
              {btn('Zoom to Selection', <Icon.ZoomSelection />, zoomTo, 'ctx-zoom-selection')}
              {plane && btn('Normal To', <Icon.Orientation />, () => bridge.camera?.normalTo(plane as never), 'ctx-normal-to')}
            </div>
          );
        }
        return (
          <div ref={barRef} className="k-ctx-toolbar k-tree-ctxbar" data-testid="tree-ctxbar" style={{ position: 'fixed', left: bar.x + 14, top: bar.y - 40, zIndex: 50, pointerEvents: bar.live ? 'auto' : 'none' }}>
            {isSolidFeature(f) && btn('Edit Feature', featureIcon(f), () => st.editFeature(f.id), 'ctx-edit-feature')}
            {sketchId && btn('Edit Sketch', <Icon.Sketch />, () => st.editSketch(sketchId), 'ctx-edit-sketch')}
            {btn(f.suppressed ? 'Unsuppress' : 'Suppress', <Icon.Suppress />, () => st.toggleSuppress(f.id), 'ctx-suppress')}
            {plane && btn('Normal To', <Icon.Orientation />, () => bridge.camera?.normalTo(plane as never), 'ctx-normal-to')}
            {btn('Zoom to Fit', <Icon.Fit />, () => bridge.zoomFit?.(), 'ctx-zoom')}
          </div>
        );
      })()}
      {menu && menu.featureId.startsWith('__plane:') && (() => {
        const p = menu.featureId.slice(8);
        const name = st.doc.planeNames?.[p] ?? PLANE_LABELS[p as 'front'] ?? st.doc.planes[p]?.name ?? p;
        return (
          <Menu
            onClose={() => setMenu(null)} // the toolbar above it closes on its own (a click on it must still land)
            style={{ position: 'fixed', left: menu.x, top: menu.y }}
            items={[
              { label: `Feature (${name})`, header: true },
              { label: '3D Sketch On Plane', icon: <Icon.Sketch />, onSelect: () => useStore.getState().start3DSketch() },
              { label: 'Section View', icon: <Icon.SectionView />, onSelect: () => useStore.getState().startSectionView() },
              ...(st.doc.planes[p]?.kind === 'reference' ? [{ label: 'Edit Feature', icon: <Icon.Plane />, onSelect: () => st.editPlane(p) }] : []),
              { separator: true },
              { label: 'Rename tree item', onSelect: () => setRenaming({ id: '__plane:' + p, value: name }) },
              { label: 'Hide/Show Tree Items…', icon: <Icon.Eye />, onSelect: () => { useStore.setState({ optionsPage: 'featureTree' } as never); st.setDialog('options'); } },
            ]}
          />
        );
      })()}
      {menu && menuFeature && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          items={[
            // the header names the feature; Edit Feature, Edit Sketch and Suppress of a feature are on the toolbar above the menu
            { label: `Feature (${menuFeature.name})`, header: true },
            ...(isSolidFeature(menuFeature)
              ? []
              : [
                  { label: 'Edit Sketch', icon: <Icon.Sketch />, onSelect: () => st.editSketch(menuFeature.sketchId) },
                  { label: 'Sketch Color…', icon: <Icon.Palette />, onSelect: () => useStore.setState({ curveColorEdit: { sketchId: menuFeature.sketchId, color: st.doc.sketches[menuFeature.sketchId]?.color ?? null, scope: 'all' }, managerTab: 'tree' }) },
                  { label: 'Extruded Boss/Base', icon: <Icon.Extrude />, onSelect: () => { st.setSelectedFeature(menuFeature.id); st.startFeature('extrude', 'boss'); } },
                  { label: 'Extruded Cut', icon: <Icon.Cut />, onSelect: () => { st.setSelectedFeature(menuFeature.id); st.startFeature('extrude', 'cut'); } },
                ]),
            { separator: true },
            { label: 'Roll to end', onSelect: () => st.setRollback(null) },
            { label: 'Roll to previous', onSelect: () => st.setRollback(Math.max(0, st.doc.features.findIndex((f) => f.id === menu.featureId))) },
            { separator: true },
            { label: 'Comment ▸ Add Comment…', icon: <Icon.Note />, onSelect: () => { const existing = (st.doc.comments ?? []).find((c) => c.featureId === menuFeature.id); st.setAsk({ title: `Comment on ${menuFeature.name}`, text: 'Comment', input: existing?.text ?? '', yes: (v) => { const rest = (st.doc.comments ?? []).filter((c) => c.featureId !== menuFeature.id); st.applyDocument('Comment', { ...st.doc, comments: v.trim() ? [...rest, { id: existing?.id ?? `cm${Date.now()}`, featureId: menuFeature.id, text: v.trim(), author: 'Ian', date: commentStamp() }] : rest }); } }); } },
            { label: 'Parent/Child…', icon: <Icon.Tree />, onSelect: () => { useStore.setState({ dialogFeatureId: menuFeature.id }); st.setDialog('parentChild'); } },
            { label: 'Configure Feature', icon: <Icon.Config />, onSelect: () => st.openConfigure({ features: [menuFeature.id] }) },
            { label: (st.doc.favorites ?? []).includes(menuFeature.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: <Icon.Folder />, onSelect: () => { const favs = st.doc.favorites ?? []; st.applyDocument('Favorites', { ...st.doc, favorites: favs.includes(menuFeature.id) ? favs.filter((x) => x !== menuFeature.id) : [...favs, menuFeature.id] }); } },
            { label: 'Feature Properties…', icon: <Icon.Properties />, onSelect: () => { useStore.setState({ dialogFeatureId: menuFeature.id }); st.setDialog('featureProps'); } },
            { label: 'Go To…', onSelect: () => st.setAsk({ title: 'Go To', text: 'Feature name (or part of it)', input: '', yes: (v) => { const hit = st.doc.features.find((x) => x.name.toLowerCase().includes(v.toLowerCase())); if (hit) { st.setSelectedFeature(hit.id); document.querySelector(`.k-tree-row[data-id="${CSS.escape(hit.id)}"]`)?.scrollIntoView({ block: 'center' }); } else st.pushMessage(`No feature named "${v}".`, 'warn'); } }) },
            { label: 'Create New Folder', icon: <Icon.Folder />, onSelect: () => { const folders = st.doc.featureFolders ?? []; const name = `Folder${folders.length + 1}`; st.applyDocument('New Folder', { ...st.doc, featureFolders: [...folders.map((fo) => ({ ...fo, featureIds: fo.featureIds.filter((x) => x !== menuFeature.id) })), { id: `fo${Date.now()}`, name, featureIds: [menuFeature.id] }] }); } },
            ...((st.doc.featureFolders ?? []).some((fo) => fo.featureIds.includes(menuFeature.id)) ? [{ label: 'Remove from Folder', onSelect: () => st.applyDocument('Remove from Folder', { ...st.doc, featureFolders: (st.doc.featureFolders ?? []).map((fo) => ({ ...fo, featureIds: fo.featureIds.filter((x) => x !== menuFeature.id) })).filter((fo) => fo.featureIds.length) }) }] : []),
            { label: 'Hide/Show Tree Items…', icon: <Icon.Eye />, onSelect: () => { useStore.setState({ optionsPage: 'featureTree' } as never); st.setDialog('options'); } },
            { label: 'Collapse Items', onSelect: () => document.querySelectorAll<HTMLElement>('.k-tree-row .caret[data-open="true"]').forEach((c) => c.click()) },
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
