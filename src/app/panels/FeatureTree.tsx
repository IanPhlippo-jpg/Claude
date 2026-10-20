import { useState } from 'react';
import { useStore } from '../store';
import { DockPanel } from './Dock';
import { Menu, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { PLANE_LABELS } from '../viewport/camera';

const STATUS_LABEL: Record<string, string> = { under: 'onderbepaald', full: 'volledig', over: 'overbepaald', conflict: 'conflict', invalid: 'ongeldig' };

export function FeatureTree() {
  const st = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number; featureId: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);

  const features: TreeNode[] = st.doc.features.map((f, i) => {
    const solve = st.solve[f.sketchId];
    const sk = st.doc.sketches[f.sketchId];
    const rolledBack = st.rollbackIndex !== null && i >= st.rollbackIndex;
    return {
      id: f.id,
      icon: <Icon.Sketch />,
      label:
        renaming?.id === f.id ? (
          <input
            className="k-input"
            style={{ height: 20 }}
            autoFocus
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
            {f.name} <span className="k-muted">({sk ? PLANE_LABELS[sk.plane] : ''})</span>
          </>
        ),
      active: st.activeSketchId === f.sketchId,
      suppressed: f.suppressed || rolledBack,
      tail: solve ? <span className={`status ${solve.status}`}>{solve.status === 'full' ? '' : solve.status === 'under' ? '(−) ' : '(+) '}{STATUS_LABEL[solve.status]}</span> : null,
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

  const nodes: TreeNode[] = [
    {
      id: 'part',
      icon: <Icon.Part />,
      label: (
        <b>
          {st.doc.name}
          {st.dirty ? '*' : ''}
        </b>
      ),
      children: [
        {
          id: 'planes',
          icon: <Icon.Plane />,
          label: 'Referentievlakken',
          children: (['front', 'top', 'right'] as const).map((p) => ({
            id: 'plane-' + p,
            icon: <Icon.Plane />,
            label: PLANE_LABELS[p],
            onDoubleClick: () => st.newSketch(p),
          })),
        },
        { id: 'origin', icon: <Icon.Origin />, label: 'Oorsprong' },
        ...features,
      ],
    },
  ];

  return (
    <DockPanel id="tree" title="Feature tree">
      <TreeView nodes={nodes} />
      {features.length > 0 && (
        <div className="k-rollback" title="Rollback-balk: sleep om features te verbergen (fase 2 maakt dit regenererend)">
          <input
            type="range"
            min={0}
            max={st.doc.features.length}
            value={st.rollbackIndex ?? st.doc.features.length}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              st.setRollback(v >= st.doc.features.length ? null : v);
            }}
          />
          <span className="k-muted">Rollback</span>
        </div>
      )}
      {menu && (
        <Menu
          onClose={() => setMenu(null)}
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          items={[
            { label: 'Schets bewerken', icon: <Icon.Sketch />, onSelect: () => st.editSketch(st.doc.features.find((f) => f.id === menu.featureId)!.sketchId) },
            {
              label: 'Hernoemen',
              onSelect: () => {
                const f = st.doc.features.find((x) => x.id === menu.featureId)!;
                setRenaming({ id: f.id, value: f.name });
              },
            },
            { separator: true },
            { label: 'Verwijderen', icon: <Icon.Trash />, onSelect: () => st.deleteFeature(menu.featureId) },
          ]}
        />
      )}
    </DockPanel>
  );
}
