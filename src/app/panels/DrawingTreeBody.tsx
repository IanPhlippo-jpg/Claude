import { useState } from 'react';
import { useStore } from '../store';
import { Menu, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';

/**
 * FeatureManager design tree of a drawing as the original:
 * Draw1 ▸ Annotations, Sheet1 ▸ Sheet Format1, Drawing View1 ▸ Plate<1>, Drawing View2 …
 */
export function DrawingTreeBody() {
  const st = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number; viewId: string } | null>(null);
  const sheet = st.doc.sheets?.[0];
  const q = st.treeFilter.trim().toLowerCase();
  const sys = (id: string, icon: React.ReactNode, label: string, children?: TreeNode[]): TreeNode => ({ id, icon, label: <span>{label}</span>, children });
  const viewNodes: TreeNode[] = (sheet?.views ?? [])
    .filter((v) => !q || v.name.toLowerCase().includes(q))
    .map((v) => ({
      id: v.id,
      icon: <Icon.ModelView />,
      label: <span>{v.name}</span>,
      selected: st.selectedDrawingViewId === v.id,
      onClick: () => st.selectDrawingView(st.selectedDrawingViewId === v.id ? null : v.id),
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, viewId: v.id });
      },
      children: [
        { id: v.id + ':model', icon: v.model.kind === 'assembly' ? <Icon.Component /> : <Icon.Part />, label: <span className="k-muted">{v.modelName}</span> },
        // tables made from this view (Bill of Materials1 …), as the original lists them under the view
        ...(sheet?.tables ?? []).filter((t) => t.viewId === v.id).map((t, i): TreeNode => ({ id: t.id, icon: <Icon.Bom />, label: <span>Bill of Materials{i + 1}</span> })),
      ],
    }));
  const nodes: TreeNode[] = [
    {
      id: 'drawing',
      icon: <Icon.Drawing />,
      label: <span>{st.doc.name}</span>,
      children: [
        sys('annotations', <Icon.TreeFolder glyph="annotation" />, 'Annotations'),
        {
          id: 'sheet',
          defaultOpen: true,
          icon: <Icon.Sheet />,
          label: <span>{sheet?.name ?? 'Sheet1'}</span>,
          onDoubleClick: () => st.setDialog('sheetProperties'),
          children: [sys('format', <Icon.Sheet />, 'Sheet Format1'), ...viewNodes],
        },
      ],
    },
  ];
  const menuView = menu ? sheet?.views.find((v) => v.id === menu.viewId) : undefined;
  return (
    <div style={{ position: 'relative' }}>
      <TreeView nodes={nodes} />
      {menu && menuView && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Projected View', icon: <Icon.ProjectedView />, onSelect: () => { st.selectDrawingView(menuView.id); st.startProjectedView(); } },
            { label: 'Zoom to Selection', icon: <Icon.Fit />, onSelect: () => (window as unknown as { __phlippoZoomFit?: () => void }).__phlippoZoomFit?.() },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: () => st.deleteDrawingView(menuView.id) },
          ]}
        />
      )}
    </div>
  );
}
