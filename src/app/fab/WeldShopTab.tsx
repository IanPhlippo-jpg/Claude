/**
 * Frames+ (docs/36 3.2, besluit B1): in a part a group on the right of the Frames tab, in an assembly a tab of its own
 * ("Weld Shop") with the same group. Stock Library · Recognize Members · Saw List · Bar Nesting · Weld Joint ·
 * Auto Weld Joints · Weld Sequence · Execution Class · Cost · Export. A chunk of its own, loaded when first shown.
 */
import { useShallow } from 'zustand/react/shallow';
import { BigButton as Big, Group, SmallButton as Small } from '../ribbon/Ribbon';
import { FabIcon } from './fabIcons';
import { exportOrderList, exportSawList, exportWeldPlan, isStale, open, openSettings, patchFab, useFab } from './fabStore';
import { useStore } from '../store';
import './fab.css';

export function FramesFabGroup() {
  const st = useFab(useShallow((s) => ({ view: s.view, has: !!s.result, stale: isStale(s) })));
  const exc = useStore((s) => s.doc.fab?.exc ?? 'geen');
  return (
    <Group>
      <Big label="Stock Library" icon={<FabIcon.Stock />} onClick={() => openSettings('Materials')} />
      <Big label="Recognize Members" icon={<FabIcon.Recognize />} active={st.view === 'recognize'} onClick={() => open('recognize', 'recognize')} />
      <Big label="Saw List" icon={<FabIcon.SawList />} active={st.view === 'saw'} onClick={() => open('saw', 'barNest')} />
      <div className="k-cm-col">
        <Small label="Bar Nesting" icon={<FabIcon.BarNest />} onClick={() => open('saw', 'barNest')} />
      </div>
      <Big label="Weld Joint" icon={<FabIcon.WeldJoint />} active={st.view === 'welds'} onClick={() => { useFab.setState({ weldFocus: 'joints' }); open('welds', 'welds'); }} />
      <div className="k-cm-col">
        <Small label="Auto Weld Joints" icon={<FabIcon.AutoWeld />}
          onClick={() => { patchFab('Auto Weld Joints', (f) => ({ ...f, welds: undefined, lasvolgordeHandmatig: false })); open('welds', 'welds'); }} />
        <Small label="Weld Sequence" icon={<FabIcon.Sequence />} onClick={() => { useFab.setState({ weldFocus: 'seq' }); open('welds', 'welds'); }} />
        <Small label="Execution Class" icon={<FabIcon.Exc />} active={exc !== 'geen'} onClick={() => { useFab.setState({ weldFocus: 'exc' }); open('welds', 'welds'); }} />
      </div>
      <Big label="Cost" icon={<FabIcon.Cost />} active={st.view === 'cost'} onClick={() => open('cost', 'cost')} />
      <Big label="Export" icon={<FabIcon.Export />} disabled={!st.has || st.stale} onClick={() => void exportSawList('pdf')} flyout={[
        { label: 'Saw List PDF', icon: <FabIcon.SawList />, onSelect: () => void exportSawList('pdf') },
        { label: 'Saw List XLSX', icon: <FabIcon.SawList />, onSelect: () => void exportSawList('xlsx') },
        { label: 'Weld Plan PDF', icon: <FabIcon.WeldJoint />, onSelect: () => void exportWeldPlan() },
        { label: 'Order List XLSX', icon: <FabIcon.BarNest />, onSelect: () => void exportOrderList() },
      ]} />
    </Group>
  );
}

/** the Weld Shop tab of an assembly: the same group */
export function WeldShopTab() {
  return <FramesFabGroup />;
}
