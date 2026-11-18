/**
 * The 3D Print tab of the Command Ribbon (docs/33 eis 1, docs/34 4.1): Printer · Plate · Slice · Preview · Export,
 * large buttons for the main command of each group. Loaded with its own chunk, as the assembly and drawing tabs.
 */
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { BigButton as Big, Group, SmallButton as Small } from '../ribbon/Ribbon';
import { PrintIcon } from './printIcons';
import { addToPlate, arrangePlate, autoOrientPlate, cancelSlicing, exportPrinterFile, exportProject, initPrint, isStale, newPlate, scaleSelected, slicePlate, usePrint } from './printStore';

export function PrintTab() {
  const st = usePrint(useShallow((s) => ({ tool: s.tool, pmTab: s.pmTab, slicing: s.slicing, result: s.result, items: s.plates[s.plateIndex].items.length, selected: s.selected, stale: isStale(s) })));
  const kind = useStore((s) => s.doc.kind);
  useEffect(() => { void initPrint(); }, []);
  const assembly = kind === 'assembly';
  const ask = useStore((s) => s.setAsk);
  return (
    <>
      <Group>
        <Big label="Print Setup" icon={<PrintIcon.Printer />} active={st.pmTab === 'settings'} onClick={() => usePrint.setState({ pmTab: 'settings' })} />
      </Group>
      <Group>
        <Big label="Add to Plate" icon={<PrintIcon.AddToPlate />} onClick={() => addToPlate(assembly ? 'components' : 'part')} flyout={assembly
          ? [{ label: 'Each Component', icon: <PrintIcon.AddToPlate />, onSelect: () => addToPlate('components') }, { label: 'Assembly as One Part', icon: <PrintIcon.AddToPlate />,
            onSelect: () => addToPlate('assembly') }]
          : [{ label: 'Part', icon: <PrintIcon.AddToPlate />, onSelect: () => addToPlate('part') }, { label: 'Each Body Separately', icon: <PrintIcon.AddToPlate />,
            onSelect: () => addToPlate('bodies') }]} />
        <Big label="Lay Flat" icon={<PrintIcon.LayFlat />} active={st.tool === 'layFlat'} disabled={!st.items}
          onClick={() => usePrint.setState({ tool: st.tool === 'layFlat' ? 'select' : 'layFlat' })} />
        <div className="k-cm-col">
          <Small label="Auto Orient" icon={<PrintIcon.AutoOrient />} disabled={!st.items} onClick={autoOrientPlate} />
          <Small label="Arrange" icon={<PrintIcon.Arrange />} disabled={!st.items} onClick={arrangePlate} />
          <Small label="Scale" icon={<PrintIcon.Scale />} disabled={!st.selected} onClick={() => ask({ title: 'Scale', text: 'Scale the selected part (percent):', input: '100',
            yesLabel: 'OK', yes: (v) => { const f = Number(String(v).replace(',', '.')) / 100; if (f > 0 && f < 100) scaleSelected(f); } })} />
        </div>
        <div className="k-cm-col">
          <Small label="New Plate" icon={<PrintIcon.NewPlate />} onClick={newPlate} />
        </div>
      </Group>
      <Group>
        {st.slicing
          ? <Big label="Cancel Slicing" icon={<PrintIcon.Cancel />} active onClick={cancelSlicing} />
          : <Big label="Slice Plate" icon={<PrintIcon.Slice />} disabled={!st.items} onClick={() => void slicePlate()} />}
        <Big label="Preview" icon={<PrintIcon.Preview />} disabled={!st.result} active={st.pmTab === 'preview' && !!st.result} onClick={() => usePrint.setState({ pmTab: 'preview' })} />
      </Group>
      <Group>
        <Big label="Export" icon={<PrintIcon.Export />} disabled={!st.result || st.stale} onClick={() => void exportPrinterFile()} flyout={[
          { label: 'Export Print File', icon: <PrintIcon.Export />, disabled: !st.result || st.stale, onSelect: () => void exportPrinterFile() },
          { label: 'Export 3MF Project', icon: <PrintIcon.Export />, disabled: !st.items, onSelect: () => void exportProject() },
        ]} />
      </Group>
    </>
  );
}
