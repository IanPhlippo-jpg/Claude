/**
 * Quote (docs/36 6.2): Cost Model · Rates & Materials · Add Line · Purchased Parts · Finishing · Quantity · Customer ·
 * Quote · Export · Company. Nothing is sent: Export makes a file. A chunk of its own, loaded when first shown.
 */
import { useShallow } from 'zustand/react/shallow';
import { BigButton as Big, Group, SmallButton as Small } from '../ribbon/Ribbon';
import { FabIcon } from './fabIcons';
import { exportQuote, isStale, open, openSettings, saveCopyWithoutCustomerData, useFab } from './fabStore';
import './fab.css';

export function QuoteTab() {
  const st = useFab(useShallow((s) => ({ view: s.view, command: s.command, has: !!s.result, stale: isStale(s) })));
  return (
    <>
      <Group>
        <Big label="Cost Model" icon={<FabIcon.Cost />} active={st.view === 'cost'} onClick={() => open('cost', 'cost')} />
        <Big label="Rates & Materials" icon={<FabIcon.Settings />} onClick={() => openSettings('Rates')} />
        <div className="k-cm-col">
          <Small label="Add Line" icon={<FabIcon.AddLine />} active={st.command === 'addLine'} onClick={() => open('quote', 'addLine')} />
          <Small label="Purchased Parts" icon={<FabIcon.Purchased />} onClick={() => openSettings('Materials')} />
          <Small label="Finishing" icon={<FabIcon.Finishing />} onClick={() => openSettings('Finishing')} />
        </div>
        <div className="k-cm-col">
          <Small label="Quantity" icon={<FabIcon.Quantity />} onClick={() => open('cost', 'cost')} />
        </div>
      </Group>
      <Group>
        <Big label="Customer" icon={<FabIcon.Customer />} active={st.command === 'customer'} onClick={() => open('quote', 'customer')} />
        <Big label="Quote" icon={<FabIcon.Quote />} active={st.view === 'quote' && st.command === 'quote'} onClick={() => open('quote', 'quote')} />
        <Big label="Export" icon={<FabIcon.Export />} disabled={!st.has || st.stale} onClick={() => exportQuote('pdf')} flyout={[
          { label: 'Quote PDF', icon: <FabIcon.Quote />, onSelect: () => exportQuote('pdf') },
          { label: 'Quote XLSX', icon: <FabIcon.Quote />, onSelect: () => exportQuote('xlsx') },
          { label: 'Save a Copy without Customer Data', icon: <FabIcon.Export />, onSelect: saveCopyWithoutCustomerData },
        ]} />
        <div className="k-cm-col">
          <Small label="Company" icon={<FabIcon.Company />} onClick={() => openSettings('Company')} />
        </div>
      </Group>
    </>
  );
}
