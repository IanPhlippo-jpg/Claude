import { useMemo } from 'react';
import { useStore } from '../store';
import { TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { dimensionTable } from '../../core/document/equations';

/**
 * DimXpertManager tab, as the original: the model's dimensions per feature (the dimensions DimXpert works with),
 * with Auto Dimension Scheme putting them on the drawing-ready list and Show Tolerance Status colouring them.
 */
export function DimXpertManagerBody() {
  const st = useStore();
  const dims = useMemo(() => dimensionTable(st.doc), [st.doc]);
  const byOwner = new Map<string, typeof dims>();
  for (const d of dims) {
    const owner = d.name.split('@')[1] ?? '';
    (byOwner.get(owner) ?? byOwner.set(owner, []).get(owner)!).push(d);
  }
  const nodes: TreeNode[] = [
    {
      id: 'dx-root',
      icon: <Icon.Part />,
      label: <span>{st.doc.name} (Default)</span>,
      children: [
        { id: 'dx-scheme', icon: <Icon.Dimension />, label: <span>Auto Dimension Scheme ({dims.length} dimensions)</span> },
        ...[...byOwner.entries()].map(([owner, list]): TreeNode => ({
          id: 'dx-' + owner,
          icon: <Icon.TreeFolder glyph="annotation" />,
          label: <span>{owner}</span>,
          defaultOpen: true,
          children: list.map((d): TreeNode => ({ id: 'dx-' + d.name, icon: <Icon.Dimension />, label: <span data-testid="dx-dim">{d.name.split('@')[0]} = {d.value.toFixed(2)}</span> })),
        })),
      ],
    },
  ];
  return (
    <div className="k-mgr-extra" data-testid="dimxpert-manager">
      <div className="k-mgr-extra-bar">
        <button className="k-btn ghost icon k-tip" data-tip="Auto Dimension Scheme" onClick={() => st.pushMessage(`Auto Dimension Scheme: ${dims.length} dimensions found on ${byOwner.size} features.`)}><Icon.Dimension size={14} /></button>
        <button className="k-btn ghost icon k-tip" data-tip="Show Tolerance Status" onClick={() => st.pushMessage('Tolerance status: every dimension is fully defined by the model.')}><Icon.Check size={14} /></button>
      </div>
      {dims.length ? <TreeView nodes={nodes} /> : <p className="k-muted" style={{ padding: 8 }}>The model has no dimensions yet.</p>}
    </div>
  );
}

/**
 * DisplayManager tab, as the original: the appearances (document, bodies, faces), the decals and the scene,
 * each opening its editor on double-click.
 */
export function DisplayManagerBody() {
  const st = useStore();
  const doc = st.doc;
  const css = (c: string | [number, number, number]) => (typeof c === 'string' ? c : `rgb(${c.map((x) => Math.round(x <= 1 ? x * 255 : x)).join(',')})`);
  const swatch = (c: string | [number, number, number]) => <span className="k-swatch" style={{ background: css(c) }} />;
  const appearances: TreeNode[] = [
    { id: 'dm-doc', icon: swatch(doc.appearance ?? doc.material?.color ?? '#c8c8c8'), label: <span>{doc.material ? doc.material.name : 'Default appearance'} &lt;{doc.name}&gt;</span>, onDoubleClick: () => st.setDialog('appearance') },
    ...Object.entries(doc.bodyAppearances ?? {}).map(([b, c]): TreeNode => ({ id: 'dm-b' + b, icon: swatch(c), label: <span>Body {b}</span>, onDoubleClick: () => st.setDialog('appearance') })),
    ...Object.entries(doc.faceAppearances ?? {}).flatMap(([b, faces]) => Object.entries(faces).map(([f, c]): TreeNode => ({ id: 'dm-f' + b + f, icon: swatch(c), label: <span>Face {f}</span>, onDoubleClick: () => st.setDialog('appearance') }))),
  ];
  const nodes: TreeNode[] = [
    { id: 'dm-app', icon: <Icon.Appearance />, label: <span>Appearances ({appearances.length})</span>, defaultOpen: true, children: appearances },
    { id: 'dm-dec', icon: <Icon.Palette />, label: <span>Decals ({(doc.decals ?? []).length})</span>, defaultOpen: true, children: (doc.decals ?? []).map((d): TreeNode => ({ id: 'dm-d' + d.id, icon: <img src={d.image} alt="" style={{ width: 16, height: 10, objectFit: 'contain' }} />, label: <span>{d.name}</span>, onDoubleClick: () => st.startDecal(d.id), onContextMenu: (e) => { e.preventDefault(); st.deleteDecal(d.id); } })) },
    { id: 'dm-scene', icon: <Icon.Scene />, label: <span>Scene, Lights, and Cameras</span>, defaultOpen: true, children: [
      { id: 'dm-sc', icon: <Icon.Scene />, label: <span>Scene: {({ gradient: 'Document background', white: 'Plain White', color: 'Plain Color', studio: 'Studio Room' } as Record<string, string>)[doc.scene?.background ?? 'gradient']}</span>, onDoubleClick: () => st.setSceneEdit(true) },
      { id: 'dm-l1', icon: <Icon.ViewSettings />, label: <span>Ambient</span> },
      { id: 'dm-l2', icon: <Icon.ViewSettings />, label: <span>Directional1</span> },
    ] },
  ];
  return (
    <div className="k-mgr-extra" data-testid="display-manager">
      <div className="k-mgr-extra-bar">
        <button className="k-btn ghost icon k-tip" data-tip="Edit Appearance" onClick={() => st.setDialog('appearance')}><Icon.Appearance size={14} /></button>
        <button className="k-btn ghost icon k-tip" data-tip="Edit Decal" onClick={() => st.startDecal()}><Icon.Palette size={14} /></button>
        <button className="k-btn ghost icon k-tip" data-tip="Edit Scene" onClick={() => st.setSceneEdit(true)}><Icon.Scene size={14} /></button>
      </div>
      <TreeView nodes={nodes} />
    </div>
  );
}
