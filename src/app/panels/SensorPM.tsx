import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { dimensionTable } from '../../core/document/equations';
import { Icon } from '../../ui/icons';

/** Evaluate ▸ Sensor: Sensor Type Mass Properties with the property to watch; the sensor lands in the Sensors folder. */
export function SensorPM() {
  const st = useStore(useShallow((s) => ({ sensorEdit: s.sensorEdit, doc: s.doc, pushMessage: s.pushMessage, addSensor: s.addSensor, setSensorEdit: s.setSensorEdit })));
  const e = st.sensorEdit;
  if (!e) return null;
  const type = e.kind === 'dimension' ? 'dimension' : e.kind === 'interference' ? 'interference' : 'mass';
  const dims = dimensionTable(st.doc);
  return (
    <div className="k-pm" data-testid="sensor-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Sensor /> <b>Sensor</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="sensor-ok" onClick={() => { if (e.kind === 'dimension' && !e.dim) { st.pushMessage('Select the dimension to watch.', 'warn'); return; } st.addSensor(e.kind, { dim: e.dim, alert: e.alert }); st.setSensorEdit(null); }}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => st.setSensorEdit(null)}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Sensor Type">
        <select className="k-input" data-testid="sensor-type" value={type} onChange={(ev) => st.setSensorEdit({ ...e, kind: ev.target.value === 'mass' ? 'mass' : (ev.target.value as 'dimension'), dim: ev.target.value === 'dimension' ? dims[0]?.name : undefined })}>
          <option value="mass">Mass Properties</option>
          <option value="dimension">Dimension</option>
          {st.doc.kind === 'assembly' && <option value="interference">Interference Detection</option>}
        </select>
      </Section>
      <Section title="Properties">
        {type === 'mass' && (
          <>
            <select className="k-input" value={e.kind} onChange={(ev) => st.setSensorEdit({ ...e, kind: ev.target.value as 'mass' })} data-testid="sensor-property">
              <option value="mass">Mass</option>
              <option value="volume">Volume</option>
              <option value="area">Surface Area</option>
            </select>
            <div className="k-muted" style={{ marginTop: 4 }}>Entities to monitor: all solid bodies</div>
          </>
        )}
        {type === 'dimension' && (dims.length
          ? <select className="k-input" data-testid="sensor-dim" value={e.dim ?? ''} onChange={(ev) => st.setSensorEdit({ ...e, dim: ev.target.value })}>{dims.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.value.toFixed(2)})</option>)}</select>
          : <span className="k-muted">The model has no dimensions.</span>)}
        {type === 'interference' && <div className="k-muted">Watches all components for interferences.</div>}
      </Section>
      <Section title="Alert" defaultOpen={!!e.alert} check={!!e.alert} onCheck={(on) => st.setSensorEdit({ ...e, alert: on ? { op: '>', value: 0 } : undefined })}>
        {e.alert && (
          <div className="k-pm-valuerow" data-testid="sensor-alert">
            <select className="k-input" style={{ width: 120 }} value={e.alert.op} onChange={(ev) => st.setSensorEdit({ ...e, alert: { ...e.alert!, op: ev.target.value as '>' } })}><option value=">">is greater than</option><option value="<">is less than</option></select>
            <NumberField value={e.alert.value} onChange={(v) => st.setSensorEdit({ ...e, alert: { ...e.alert!, value: v } })} step={1} />
          </div>
        )}
      </Section>
    </div>
  );
}
