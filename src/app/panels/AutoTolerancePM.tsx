import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { GTOL_SYMBOLS, type AutoToleranceGtol } from '../../core/document/autoTolerance';

/**
 * MBD Dimensions Property Panels, by design: Auto Dimension Scheme (Settings, Datum Selection, Scope), Datum,
 * Size / Location Dimension, Pattern Feature and Geometric Tolerance. Faces are picked in the graphics area.
 */
export function AutoTolerancePM() {
  const st = useStore(useShallow((s) => ({ autoToleranceEdit: s.autoToleranceEdit, commitAutoTolerance: s.commitAutoTolerance, cancelAutoTolerance: s.cancelAutoTolerance, updateAutoTolerance: s.updateAutoTolerance, doc: s.doc })));
  const e = st.autoToleranceEdit;
  if (!e) return null;
  const title = e.kind === 'auto' ? 'Auto Dimension Scheme' : e.kind === 'datum' ? 'Datum' : e.kind === 'size' ? 'Size Dimension' : e.kind === 'location' ? 'Location Dimension' : e.kind === 'pattern' ? 'Pattern Feature' : 'Geometric Tolerance';
  const faceRows = (max: number, hint: string) => (
    <div className="k-selbox" style={{ minHeight: 24 }} data-testid="dx-faces">{e.faces.length ? e.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">{hint}</span>}{e.faces.length > max && <div className="k-selbox-row k-muted">Only the first {max} faces are used.</div>}</div>
  );
  return (
    <div className="k-pm" data-testid="autoTolerance-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Dimension /> <b>{title}</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="dx-ok" onClick={st.commitAutoTolerance}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelAutoTolerance}><Icon.Close /></button>
        </div>
      </div>
      {e.kind === 'auto' && (
        <>
          <Section title="Settings">
            <div className="k-pm-label">Part type:</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="dx-part" checked={e.partType !== 'turned'} onChange={() => st.updateAutoTolerance({ partType: 'prismatic' })} /> Prismatic</label>
              <label className="k-check"><input type="radio" name="dx-part" checked={e.partType === 'turned'} onChange={() => st.updateAutoTolerance({ partType: 'turned' })} /> Turned</label>
            </div>
            <div className="k-pm-label">Tolerance type:</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="dx-tol" data-testid="dx-plusminus" checked={e.toleranceType !== 'geometric'} onChange={() => st.updateAutoTolerance({ toleranceType: 'plusMinus' })} /> Plus and Minus</label>
              <label className="k-check"><input type="radio" name="dx-tol" data-testid="dx-geometric" checked={e.toleranceType === 'geometric'} onChange={() => st.updateAutoTolerance({ toleranceType: 'geometric' })} /> Geometric</label>
            </div>
            <div className="k-pm-label">Pattern dimensioning:</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="dx-pat" defaultChecked /> Linear</label>
              <label className="k-check"><input type="radio" name="dx-pat" /> Polar</label>
            </div>
          </Section>
          <Section title="Datum Selection">
            <p className="k-muted">Pick up to three faces as the primary, secondary and tertiary datum (left empty: the largest perpendicular faces).</p>
            {faceRows(3, 'Primary / Secondary / Tertiary datum faces.')}
          </Section>
          <Section title="Scope">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="dx-scope" defaultChecked /> All features</label>
              <label className="k-check"><input type="radio" name="dx-scope" disabled /> Selected features</label>
            </div>
          </Section>
          <Section title="Feature Filters" defaultOpen={false}>
            {['Planes', 'Cylinders', 'Cones', 'Slots', 'Notches', 'Pockets', 'Fillets', 'Chamfers'].map((f) => <label key={f} className="k-check"><input type="checkbox" defaultChecked={f === 'Planes' || f === 'Cylinders'} /> {f}</label>)}
          </Section>
        </>
      )}
      {e.kind === 'datum' && (
        <Section title="Settings">
          {faceRows(1, 'Select the planar face of the datum.')}
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 50 }}>Label</span><input className="k-input" data-testid="dx-label" style={{ width: 60 }} value={e.label ?? 'A'} onChange={(ev) => st.updateAutoTolerance({ label: ev.target.value.toUpperCase().slice(0, 2) })} onKeyDown={(ev) => ev.stopPropagation()} /></div>
        </Section>
      )}
      {(e.kind === 'size' || e.kind === 'location' || e.kind === 'pattern') && (
        <>
          <Section title="Features">
            {faceRows(2, e.kind === 'size' ? 'Select the two opposite faces of the feature.' : e.kind === 'location' ? 'Select the datum face and the located face.' : 'Select the faces of the pattern instances.')}
          </Section>
          <Section title="Tolerance/Precision">
            <div className="k-pm-label">Tolerance type:</div>
            <select className="k-input" value={e.basic ? 'basic' : 'symmetric'} onChange={(ev) => st.updateAutoTolerance({ basic: ev.target.value === 'basic' })}><option value="symmetric">Symmetric</option><option value="basic">Basic</option></select>
            {!e.basic && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Maximum variation"><span className="k-pm-xy">+</span><NumberField value={e.plus ?? 0.25} onChange={(v) => st.updateAutoTolerance({ plus: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
                <div className="k-pm-valuerow k-tip" data-tip="Minimum variation"><span className="k-pm-xy">−</span><NumberField value={e.minus ?? 0.25} onChange={(v) => st.updateAutoTolerance({ minus: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
              </>
            )}
            <div className="k-pm-label">Primary precision:</div>
            <select className="k-input" defaultValue=".12"><option>.1</option><option>.12</option><option>.123</option></select>
          </Section>
        </>
      )}
      {e.kind === 'gtol' && (
        <>
          <Section title="Feature">
            {faceRows(1, 'Select the face the tolerance applies to.')}
          </Section>
          <Section title="Geometric Tolerance">
            <div className="k-pm-stylerow">
              {(Object.keys(GTOL_SYMBOLS) as AutoToleranceGtol['symbol'][]).map((s) => <button key={s} className={`k-pm-stylebtn k-tip ${(e.symbol ?? 'position') === s ? 'active' : ''}`} data-tip={s[0].toUpperCase() + s.slice(1)} data-testid={`dx-sym-${s}`} onClick={() => st.updateAutoTolerance({ symbol: s })}>{GTOL_SYMBOLS[s]}</button>)}
            </div>
            <div className="k-pm-valuerow k-tip" data-tip="Tolerance zone"><Icon.Dimension size={14} /><NumberField value={e.value ?? 0.5} onChange={(v) => st.updateAutoTolerance({ value: Math.max(0.001, v) })} unit={st.doc.units} step={0.05} min={0.001} /></div>
            <div className="k-pm-label">Datums:</div>
            <div className="k-pm-stylerow">
              {(st.doc.autoTolerance?.datums ?? []).map((d) => <button key={d.id} className={`k-pm-stylebtn ${(e.datums ?? []).includes(d.label) ? 'active' : ''}`} data-testid={`dx-datum-${d.label}`} onClick={() => st.updateAutoTolerance({ datums: (e.datums ?? []).includes(d.label) ? (e.datums ?? []).filter((x) => x !== d.label) : [...(e.datums ?? []), d.label] })}>{d.label}</button>)}
              {!(st.doc.autoTolerance?.datums ?? []).length && <span className="k-muted">No datums yet: add a Datum first.</span>}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
