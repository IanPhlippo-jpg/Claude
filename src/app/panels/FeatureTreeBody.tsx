import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Menu, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { PLANE_LABELS } from '../viewport/camera';
void PLANE_LABELS;

const STATUS_LABEL: Record<string, string> = { under: 'under defined', full: '', over: 'over defined', conflict: 'conflict', invalid: 'invalid' };

/**
 * FeatureManager design tree body: Part ▸ History, Sensors, Annotations, Material,
 * Front/Top/Right Plane, Origin, features…; with a draggable rollback bar.
 */
export function FeatureTreeBody() {
  const st = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number; featureId: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const dragRollback = useRef(false);
  const q = st.treeFilter.trim().toLowerCase();

  const featureNodes: TreeNode[] = st.doc.features
    .filter((f) => !q || f.name.toLowerCase().includes(q) || 'schets sketch'.includes(q))
    .map((f, i) => {
      const solve = st.solve[f.sketchId];
      const sk = st.doc.sketches[f.sketchId];
      const rolledBack = st.rollbackIndex !== null && i >= st.rollbackIndex;
      const prefix = solve?.status === 'under' ? '(-) ' : solve && solve.status !== 'full' ? '(+) ' : '';
      return {
        id: f.id,
        icon: <Icon.Sketch style={{ color: '#2b6cb0' }} />,
        label:
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
              {f.name}{sk ? '' : ''}
            </>
          ),
        active: st.activeSketchId === f.sketchId,
        suppressed: f.suppressed || rolledBack,
        tail: solve && (solve.status === 'conflict' || solve.status === 'over') ? <span className={`status ${solve.status}`} title={STATUS_LABEL[solve.status]}>!</span> : null,
        onDoubleClick: () => st.editSketch(f.sketchId),
        onClick: () => {
          if (st.activeSketchId !== f.sketchId) st.setSelection([]);
        },
        onContextMenu: (e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, featureId: f.id });
        },
      };
    });

  const planeNode = (p: 'front' | 'top' | 'right'): TreeNode => ({
    id: 'plane-' + p,
    label: <span onMouseEnter={() => st.setHoverPlane(p)} onMouseLeave={() => st.setHoverPlane(null)}>{PLANE_LABELS[p]}</span>,
    icon: <Icon.Plane style={{ color: '#3b82c4' }} />,
    selected: st.hoverPlane === p,
    onClick: () => {
      if (st.planePick) st.newSketch(p);
      else st.setHoverPlane(p);
    },
    onDoubleClick: () => {
      if (!st.activeSketchId) st.newSketch(p);
    },
    onContextMenu: (e) => {
      e.preventDefault();
      st.newSketch(p);
    },
  });

  const sys = (id: string, icon: React.ReactNode, label: string): TreeNode => ({ id, icon, label: <span className="k-muted">{label}</span> });

  const nodes: TreeNode[] = [
    {
      id: 'part',
      icon: <Icon.Part />,
      label: (
        <b>
          {st.doc.name} (Default) {'<<Default>_Display State 1>'}
        </b>
      ),
      children: [
        sys('history', <Icon.History />, 'History'),
        sys('sensors', <Icon.Sensor />, 'Sensors'),
        sys('annotations', <Icon.Annotation />, 'Annotations'),
        sys('bodies', <Icon.Part />, 'Solid Bodies'),
        sys('material', <Icon.Material />, 'Material <not specified>'),
        planeNode('front'),
        planeNode('top'),
        planeNode('right'),
        { id: 'origin', icon: <Icon.Origin style={{ color: '#1e4fd8' }} />, label: 'Origin', onClick: () => st.toggleShow('origin') },
        ...featureNodes,
      ],
    },
  ];

  // rollback bar: a draggable horizontal line below the last visible feature
  const n = st.doc.features.length;
  const pos = st.rollbackIndex ?? n;
  const rowH = 24;
  const barTop = 4 + rowH * (1 + 9 + pos); // part row + 9 system rows + features before the bar

  return (
    <div
      style={{ position: 'relative' }}
      onPointerMove={(e) => {
        if (!dragRollback.current) return;
        const host = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - host.top - 4 - rowH * 10;
        const idx = Math.max(0, Math.min(n, Math.round(y / rowH)));
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
      {menu && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          items={[
            { label: 'Edit Sketch', icon: <Icon.Sketch />, onSelect: () => st.editSketch(st.doc.features.find((f) => f.id === menu.featureId)!.sketchId) },
            { label: 'Roll to end', onSelect: () => st.setRollback(null) },
            { label: 'Roll to previous', onSelect: () => st.setRollback(Math.max(0, st.doc.features.findIndex((f) => f.id === menu.featureId))) },
            { separator: true },
            {
              label: 'Rename tree item',
              onSelect: () => {
                const f = st.doc.features.find((x) => x.id === menu.featureId)!;
                setRenaming({ id: f.id, value: f.name });
              },
            },
            { label: 'Delete…', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.deleteFeature(menu.featureId) },
          ]}
        />
      )}
    </div>
  );
}
