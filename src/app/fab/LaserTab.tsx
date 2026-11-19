/**
 * Laser & Bend (docs/36 4.2): Recognize Plates · Flat Patterns · Export DXF · Sheet Library · Nest · Bend Sequence ·
 * Bend Check · Bend Sheet · Cost. Part and assembly, not on a drawing. A chunk of its own, loaded when first shown.
 */
import { useShallow } from 'zustand/react/shallow';
import { BigButton as Big, Group, SmallButton as Small } from '../ribbon/Ribbon';
import { FabIcon } from './fabIcons';
import { exportBendSheet, exportDxf, exportNest, isStale, open, runNest, useFab } from './fabStore';
import './fab.css';

export function LaserTab() {
  const st = useFab(useShallow((s) => ({ view: s.view, has: !!s.result, stale: isStale(s), nests: s.nests.length })));
  return (
    <>
      <Group>
        <Big label="Recognize Plates" icon={<FabIcon.Recognize />} active={st.view === 'recognize'} onClick={() => open('recognize', 'recognize')} />
        <Big label="Flat Patterns" icon={<FabIcon.Flat />} active={st.view === 'plates'} onClick={() => open('plates', 'exportDxf')} />
        <Big label="Export DXF" icon={<FabIcon.Dxf />} disabled={!st.has || st.stale} onClick={() => open('plates', 'exportDxf')} flyout={[
          { label: 'All Plates as ZIP', icon: <FabIcon.Dxf />, onSelect: () => void exportDxf('all') },
          { label: 'Nested Sheets', icon: <FabIcon.Nest />, disabled: !st.nests, onSelect: () => void exportNest('dxf') },
        ]} />
        <div className="k-cm-col">
          <Small label="Sheet Library" icon={<FabIcon.SheetLib />} onClick={() => useFab.setState({ settingsOpen: true })} />
        </div>
      </Group>
      <Group>
        <Big label="Nest" icon={<FabIcon.Nest />} active={st.view === 'nest'} onClick={() => { open('nest', 'nest'); runNest(); }} />
        <div className="k-cm-col">
          <Small label="Cancel Nesting" icon={<FabIcon.Cancel />} disabled onClick={() => undefined} />
          <Small label="Nest PDF" icon={<FabIcon.Nest />} disabled={!st.nests} onClick={() => void exportNest('pdf')} />
        </div>
      </Group>
      <Group>
        <Big label="Bend Sequence" icon={<FabIcon.BendSeq />} active={st.view === 'bend'} onClick={() => open('bend', 'bendSeq')} />
        <div className="k-cm-col">
          <Small label="Bend Check" icon={<FabIcon.BendCheck />} onClick={() => open('bend', 'bendSeq')} />
          <Small label="Bend Sheet" icon={<FabIcon.BendSheet />} disabled={!st.has} onClick={() => void exportBendSheet()} />
        </div>
      </Group>
      <Group>
        <Big label="Cost" icon={<FabIcon.Cost />} active={st.view === 'cost'} onClick={() => open('cost', 'cost')} />
      </Group>
    </>
  );
}
