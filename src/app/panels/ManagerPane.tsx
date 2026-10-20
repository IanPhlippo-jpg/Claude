import { useState } from 'react';
import { useStore } from '../store';
import { Icon } from '../../ui/icons';
import { FeatureTreeBody } from './FeatureTreeBody';
import { PropertyManagerBody } from './PropertyManager';
import { DockPanel } from './Dock';

/**
 * The manager pane on the left: tab strip (FeatureManager design tree,
 * PropertyManager, ConfigurationManager), filter field, hide/show arrow.
 * While a selection or command is active the PropertyManager replaces the
 * tree; the fly-out tree can be expanded on top of it.
 */
export function ManagerPane({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore();
  const [flyout, setFlyout] = useState(false);
  const commandActive = !!st.activeSketchId && (st.selection.length > 0 || !!st.selectedConstraint || st.tool !== 'select');
  const showProps = st.managerTab === 'properties' || (st.managerTab === 'tree' && commandActive);

  if (st.managerCollapsed) {
    return (
      <button className="k-manager-expand k-tip" data-tip="Show FeatureManager" onClick={() => st.setManagerCollapsed(false)}>
        <Icon.ChevronRight size={12} />
      </button>
    );
  }

  const tabs: { id: typeof st.managerTab; icon: React.ReactNode; tip: string }[] = [
    { id: 'tree', icon: <Icon.Tree />, tip: 'FeatureManager design tree' },
    { id: 'properties', icon: <Icon.Properties />, tip: 'PropertyManager' },
    { id: 'configurations', icon: <Icon.Config />, tip: 'ConfigurationManager (phase 3)' },
  ];

  return (
    <DockPanel
      id="manager"
      title=""
      header={
        <div className="k-manager-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`k-manager-tab k-tip ${st.managerTab === t.id ? 'active' : ''}`} data-tip={t.tip} onClick={() => st.setManagerTab(t.id)}>
              {t.icon}
            </button>
          ))}
          <button className="k-manager-tab k-tip" data-tip="DimXpertManager (phase 5)" disabled><Icon.Dimension /></button>
          <button className="k-manager-tab k-tip" data-tip="DisplayManager (phase 7)" disabled><Icon.Appearance /></button>
          <span className="grow" />
          <button className="k-btn ghost icon k-tip" data-tip="Hide FeatureManager tree area" onClick={() => st.setManagerCollapsed(true)}>
            <Icon.ChevronRight size={12} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>
      }
    >
      {st.managerTab === 'configurations' ? (
        <div style={{ padding: 10 }} className="k-muted">
          <b>{st.doc.name} Configuration(s)</b>
          <div style={{ marginTop: 6 }}>✓ Default [ {st.doc.name} ]</div>
          <p>Design tables and configurations arrive in phase 3.</p>
        </div>
      ) : showProps ? (
        <>
          <div className={`k-flyout-tree ${flyout ? 'open' : ''}`}>
            <button className="k-flyout-toggle" onClick={() => setFlyout((f) => !f)}>
              {flyout ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />} <Icon.Part size={13} /> {st.doc.name} <span className="k-muted">(fly-out FeatureManager)</span>
            </button>
            {flyout && (
              <div className="k-flyout-body">
                <FeatureTreeBody />
              </div>
            )}
          </div>
          <PropertyManagerBody editDimensionId={editDimensionId} onEditDone={onEditDone} />
        </>
      ) : (
        <>
          <div className="k-tree-filter">
            <Icon.Filter size={12} />
            <input className="k-input" placeholder="Filter" value={st.treeFilter} onChange={(e) => st.setTreeFilter(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
          <FeatureTreeBody />
        </>
      )}
    </DockPanel>
  );
}
