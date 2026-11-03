import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { FASTENER_NAMES, fastenerLength, LENGTHS, METRIC, type FastenerType } from '../../core/assembly/fasteners';
import { isLibrarySize, screwLengths } from '../../core/library/iso';

/** Auto Fasteners Property Panel, by design: Selection (holes), Series Components (groups), Properties (type, size, length). */
export function FastenerPM() {
  const st = useStore(useShallow((s) => ({ fastenerEdit: s.fastenerEdit, commitSmartFasteners: s.commitSmartFasteners, cancelSmartFasteners: s.cancelSmartFasteners, updateFastenerSlot: s.updateFastenerSlot, doc: s.doc })));
  const fe = st.fastenerEdit;
  if (!fe) return null;
  return (
    <div className="k-pm" data-testid="fastener-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Fasteners /> <b>Auto Fasteners</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={st.commitSmartFasteners}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelSmartFasteners}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Message">
        <p className="k-pm-message">Fasteners are added to the Hole Tool holes; holes on one axis through stacked parts share one fastener. Click OK to add them.</p>
      </Section>
      <Section title="Selection">
        <div className="k-selbox" style={{ minHeight: 40 }} data-testid="fastener-holes">
          {fe.slots.flatMap((s) => s.holes).map((h, i) => <div key={i} className="k-selbox-row"><Icon.Hole size={12} /> {h.featureName} of {h.componentName}</div>)}
        </div>
        <button className="k-btn" style={{ marginTop: 4 }}>Populate All</button>
      </Section>
      <Section title="Series Components">
        <div className="k-selbox" style={{ minHeight: 30 }} data-testid="fastener-groups">
          {fe.slots.map((s, i) => <div key={i} className="k-selbox-row"><Icon.Fasteners size={12} /> Group{i + 1} ({s.holes.length} hole{s.holes.length === 1 ? '' : 's'}): {FASTENER_NAMES[s.type].split(' ISO')[0]} {s.size} x {s.length}</div>)}
        </div>
      </Section>
      {fe.slots.map((s, i) => (
        <Section key={i} title={`Properties — Group${i + 1}`}>
          <div className="k-field"><label>Fastener</label>
            <select className="k-input" value={s.type} data-testid={`fastener-type-${i}`} onChange={(e) => { const type = e.target.value as FastenerType; st.updateFastenerSlot(i, { type, length: fe.autoLength ? fastenerLength(type, s.size, s.grip, s.tapped) : s.length }); }}>
              {(Object.keys(FASTENER_NAMES) as FastenerType[]).map((t) => <option key={t} value={t}>{FASTENER_NAMES[t]}</option>)}
            </select>
          </div>
          <div className="k-field"><label>Size</label>
            <select className="k-input" value={s.size} data-testid={`fastener-size-${i}`} onChange={(e) => { const m = METRIC.find((x) => x.size === e.target.value)!; st.updateFastenerSlot(i, { size: m.size, series: undefined, length: fe.autoLength ? fastenerLength(s.type, m.size, s.grip, s.tapped) : s.length }); }}>
              {METRIC.map((m) => <option key={m.size} value={m.size}>{m.size}</option>)}
            </select>
          </div>
          <div className="k-field"><label>Length</label>
            <select className="k-input" value={s.length} data-testid={`fastener-length-${i}`} onChange={(e) => st.updateFastenerSlot(i, { length: Number(e.target.value) })}>
              {(s.type === 'shcs' && isLibrarySize(s.size) ? screwLengths(s.size) : LENGTHS).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="k-muted" style={{ fontSize: 11 }} data-testid={`fastener-grip-${i}`}>Grip: {s.grip.toFixed(2)}{st.doc.units}; hole Ø{s.top.diameter}{s.series ? ` (ISO 273 ${s.series})` : s.tapped ? ' (tapped)' : ''}</div>
          <label className="k-check"><input type="checkbox" data-testid="fastener-autolength" checked={fe.autoLength} onChange={(e) => useStore.setState({ fastenerEdit: { ...fe, autoLength: e.target.checked, slots: e.target.checked ? fe.slots.map((x) => ({ ...x, length: fastenerLength(x.type, x.size, x.grip, x.tapped) })) : fe.slots } })} /> Auto update length</label>
        </Section>
      ))}
    </div>
  );
}
