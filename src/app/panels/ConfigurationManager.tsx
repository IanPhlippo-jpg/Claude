import { useState } from 'react';
import { useStore } from '../store';
import { Menu, Section, TreeView, type TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { activeConfiguration, configurations } from '../../core/document/configurations';

/**
 * ConfigurationManager (third tab of the manager pane), as the original:
 *   Part1 Configuration(s) (Default)
 *     ✓ Default [ Part1 ]
 *       210 [ Part1 ]
 *     Tables
 * Double-click shows a configuration; the right mouse button offers Add Configuration…,
 * Show Configuration, Delete, Properties…; "Modify Configurations…" opens the table.
 */
export function ConfigurationManagerBody() {
  const st = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number; configId?: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const list = configurations(st.doc);
  const active = activeConfiguration(st.doc);
  const q = st.treeFilter.trim().toLowerCase();
  const nodes: TreeNode[] = [
    {
      id: 'cfg-root',
      icon: st.doc.kind === 'assembly' ? <Icon.Component /> : <Icon.Part />,
      label: <b>{st.doc.name} Configuration(s) ({active.name})</b>,
      onContextMenu: (e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      },
      children: [
        ...list
          .filter((c) => !q || c.name.toLowerCase().includes(q))
          .map((c): TreeNode => ({
            id: 'cfg-' + c.id,
            icon: (
              <span style={{ position: 'relative', display: 'inline-flex' }} title={c.id === active.id ? 'Active configuration' : 'Double-click to show this configuration'}>
                <Icon.Config style={{ opacity: c.id === active.id ? 1 : 0.45 }} />
                {c.id === active.id && <Icon.Check size={10} style={{ position: 'absolute', left: -3, bottom: -3, color: '#1f9d3a' }} />}
              </span>
            ),
            label: (
              <span className="k-cfg-row" data-active={c.id === active.id ? '1' : '0'}>
                {c.parentId ? <span className="k-muted">↳ </span> : null}{c.name} [ {st.doc.name} ]{c.description ? <span className="k-muted"> — {c.description}</span> : null}
              </span>
            ),
            selected: selected === c.id,
            onClick: () => setSelected(c.id),
            onDoubleClick: () => st.showConfiguration(c.id),
            children: c.id === active.id && (st.doc.explodeSteps ?? []).length ? [{
              id: 'explview1',
              icon: <Icon.Explode />,
              label: <span className={st.doc.exploded ? '' : 'k-muted'}>ExplView1</span>,
              onDoubleClick: () => st.setExploded(!st.doc.exploded),
              onContextMenu: (e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, configId: '__expl' }); },
              children: (st.doc.explodeSteps ?? []).map((x) => ({ id: x.id, icon: <Icon.Explode size={12} />, label: <span className="k-muted">{x.name}</span> })),
            }] : undefined,
            onContextMenu: (e) => {
              e.preventDefault();
              setSelected(c.id);
              setMenu({ x: e.clientX, y: e.clientY, configId: c.id });
            },
          })),
        { id: 'cfg-tables', icon: <Icon.Folder />, label: <span className="k-muted">Tables</span>, onDoubleClick: () => st.openConfigure({}) },
      ],
    },
  ];
  const menuCfg = menu?.configId ? list.find((c) => c.id === menu.configId) : undefined;
  const explMenu = menu?.configId === '__expl';
  return (
    <div style={{ position: 'relative' }} className="k-cfg-manager">
      <TreeView nodes={nodes} />
      {menu && !menu.configId && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Add Configuration…', icon: <Icon.Config />, onSelect: () => st.startAddConfiguration() },
            { label: 'Modify Configurations…', icon: <Icon.Properties />, onSelect: () => st.openConfigure({}) },
            { separator: true },
            { label: 'Document Properties…', icon: <Icon.Options />, onSelect: () => st.setDialog('options') },
          ]}
        />
      )}
      {menu && explMenu && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: st.doc.exploded ? 'Collapse' : 'Explode', icon: <Icon.Explode />, onSelect: () => st.setExploded(!st.doc.exploded) },
            { label: 'Edit Feature', icon: <Icon.Explode />, onSelect: () => st.startExplode() },
            { label: 'Animate collapse', icon: <Icon.Explode />, disabled: !st.doc.exploded, onSelect: () => st.animateCollapse() },
          ]}
        />
      )}
      {menu && menuCfg && (
        <Menu
          style={{ position: 'fixed', left: menu.x, top: menu.y }}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Show Configuration', icon: <Icon.Check />, disabled: menuCfg.id === active.id, onSelect: () => st.showConfiguration(menuCfg.id) },
            { label: 'Add Configuration…', icon: <Icon.Config />, onSelect: () => st.startAddConfiguration() },
            { label: 'Add Derived Configuration…', icon: <Icon.Config />, onSelect: () => st.startAddConfiguration(menuCfg.id) },
            { separator: true },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', disabled: list.length <= 1, onSelect: () => st.deleteConfiguration(menuCfg.id) },
            { label: 'Properties…', icon: <Icon.Properties />, onSelect: () => st.editConfigurationProperties(menuCfg.id) },
            { label: 'Rename tree item', onSelect: () => st.editConfigurationProperties(menuCfg.id) },
          ]}
        />
      )}
    </div>
  );
}

/**
 * Add Configuration / Configuration Properties PropertyManager, as the original: Configuration
 * Properties (name, description, use in BOM, comment), Bill of Materials Options, Advanced Options.
 */
export function ConfigurationPM() {
  const st = useStore();
  const ce = st.configEdit;
  if (!ce) return null;
  const d = ce.draft;
  const ok = () => st.commitConfiguration();
  return (
    <div className="k-pm" data-testid="configuration-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Config /> <b>{ce.configId ? 'Configuration Properties' : 'Add Configuration'}</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" disabled={!d.name.trim()} onClick={ok}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelConfiguration}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Configuration Properties">
        <div className="k-field">
          <label>Configuration name:</label>
          <input className="k-input" value={d.name} autoFocus onChange={(e) => st.updateConfigDraft({ name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') st.cancelConfiguration(); e.stopPropagation(); }} />
        </div>
        <div className="k-field">
          <label>Description:</label>
          <input className="k-input" value={d.description} onChange={(e) => st.updateConfigDraft({ description: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); }} />
        </div>
        <label className="k-check"><input type="checkbox" data-testid="cfg-desc-bom" checked={d.descriptionInBom !== false} onChange={(e) => st.updateConfigDraft({ descriptionInBom: e.target.checked })} /> Use in bill of materials</label>
        <div className="k-field">
          <label>Comment:</label>
          <textarea className="k-input" rows={3} value={d.comment} onChange={(e) => st.updateConfigDraft({ comment: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
        </div>
      </Section>
      <Section title="Bill of Materials Options" defaultOpen={false}>
        <p className="k-muted" style={{ margin: '0 0 4px' }}>Part number displayed when used in a bill of materials:</p>
        <input className="k-input" data-testid="cfg-bom-name" readOnly={d.bomName !== 'user'} value={d.bomName === 'configuration' ? d.name : d.bomName === 'user' ? d.bomUserName ?? '' : st.doc.name} onChange={(e) => st.updateConfigDraft({ bomUserName: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
        <select className="k-input" data-testid="cfg-bom-mode" value={d.bomName ?? 'document'} onChange={(e) => st.updateConfigDraft({ bomName: e.target.value as 'document', ...(e.target.value === 'user' && !d.bomUserName ? { bomUserName: st.doc.name } : {}) })} style={{ marginTop: 4 }}>
          <option value="document">Document Name</option>
          <option value="configuration">Configuration Name</option>
          <option value="user">User Specified Name</option>
        </select>
        <label className="k-check"><input type="checkbox" checked={!!d.hideChildrenInBom} disabled={st.doc.kind !== 'assembly'} onChange={(e) => st.updateConfigDraft({ hideChildrenInBom: e.target.checked })} /> Don't show child components in BOM when used as sub-assembly</label>
      </Section>
      <Section title="Advanced Options" defaultOpen={false}>
        <label className="k-check"><input type="checkbox" data-testid="cfg-suppressnew" checked={d.suppressNew !== false} onChange={(e) => st.updateConfigDraft({ suppressNew: e.target.checked })} /> Suppress new features and mates</label>
        <label className="k-check"><input type="checkbox" data-testid="cfg-color-on" checked={!!d.color} onChange={(e) => st.updateConfigDraft({ color: e.target.checked ? '#c86428' : undefined })} /> Use configuration specific color</label>
        <label className="k-btn" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: d.color ? 1 : 0.5 }}>
          <span style={{ width: 12, height: 12, border: '1px solid #888', background: d.color ?? 'transparent' }} />
          Color…
          <input type="color" data-testid="cfg-color" disabled={!d.color} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} value={d.color ?? '#c86428'} onChange={(e) => st.updateConfigDraft({ color: e.target.value })} />
        </label>
      </Section>
    </div>
  );
}
