/**
 * Quote (docs/36 6.2): Cost Model · Rates & Materials · Add Line · Purchased Parts · Finishing · Quantity · Customer ·
 * Quote · Export · Company. Nothing is sent: Export makes a file. A chunk of its own, loaded when first shown.
 */
import { useShallow } from 'zustand/react/shallow';
import { BigButton as Big, Group, SmallButton as Small } from '../ribbon/Ribbon';
import { FabIcon } from './fabIcons';
import { exportQuote, isStale, open, saveCopyWithoutCustomerData, useFab } from './fabStore';
import { useStore } from '../store';
import './fab.css';

export function QuoteTab() {
  const st = useFab(useShallow((s) => ({ view: s.view, command: s.command, has: !!s.result, stale: isStale(s) })));
  const ask = useStore((s) => s.setAsk);
  const settings = () => useFab.setState({ settingsOpen: true });
  return (
    <>
      <Group>
        <Big label="Cost Model" icon={<FabIcon.Cost />} active={st.view === 'cost'} onClick={() => open('cost', 'cost')} />
        <Big label="Rates & Materials" icon={<FabIcon.Settings />} onClick={settings} />
        <div className="k-cm-col">
          <Small label="Add Line" icon={<FabIcon.AddLine />}
            onClick={() => ask({ title: 'Add Line', text: 'Free line: description;amount in euro (excl. VAT)', input: 'Plaatsing ter plaatse;250', yesLabel: 'OK', yes: (v) => addFreeLine(v) })} />
          <Small label="Purchased Parts" icon={<FabIcon.Purchased />} onClick={settings} />
          <Small label="Finishing" icon={<FabIcon.Finishing />} onClick={settings} />
        </div>
        <div className="k-cm-col">
          <Small label="Quantity" icon={<FabIcon.Quantity />} onClick={() => open('quote', 'quote')} />
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
          <Small label="Company" icon={<FabIcon.Company />} onClick={settings} />
        </div>
      </Group>
    </>
  );
}

/** a free line on the quote: kept in doc.fab as a cost line of its own (category "vrij") */
function addFreeLine(v: string) {
  const [text, amount] = v.split(';');
  const cent = Math.round(Number(String(amount ?? '').replace(',', '.')) * 100);
  if (!text?.trim() || !Number.isFinite(cent)) return;
  const st = useStore.getState();
  const fab = st.doc.fab ?? {};
  st.applyDocument('Add Line', { ...st.doc, fab: { ...fab, vrij: [...(fab.vrij ?? []), { omschrijving: text.trim(), bedragCent: cent }] } });
  open('quote', 'quote');
}
