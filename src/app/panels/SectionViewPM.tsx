import { useStore, type SectionView } from '../store';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { SectionPlane } from '../../core/features/section';

const PLANES = [
  { id: 'front', label: 'Front Plane' },
  { id: 'top', label: 'Top Plane' },
  { id: 'right', label: 'Right Plane' },
] as const;

/** plane buttons, plane box, flip + offset and the two tilt angles of one section */
function PlaneFields({ sp, onChange, units, focus }: { sp: SectionPlane; onChange: (p: Partial<SectionPlane>) => void; units: string; focus?: boolean }) {
  return (
    <>
      <div className="k-pm-stylerow">
        {PLANES.map((p) => (
          <button key={p.id} className={`k-pm-stylebtn k-tip ${sp.plane === p.id ? 'active' : ''}`} data-tip={p.label} onClick={() => onChange({ plane: p.id })}><Icon.Plane size={14} /></button>
        ))}
      </div>
      <div className="k-selbox" style={{ minHeight: 24, margin: '4px 0' }}><div className="k-selbox-row"><Icon.Plane size={12} /> {PLANES.find((p) => p.id === sp.plane)?.label}</div></div>
      <div className="k-pm-valuerow">
        <button className={`k-pm-stylebtn k-tip ${sp.flip ? 'active' : ''}`} data-tip="Flip Direction" onClick={() => onChange({ flip: !sp.flip })}><Icon.Arrow size={14} /></button>
        <NumberField value={sp.offset} onChange={(v) => onChange({ offset: v })} unit={units} step={1} autoFocus={focus} />
      </div>
      <div className="k-pm-valuerow k-tip" data-tip="X Rotation"><Icon.MateAngle size={14} /><NumberField value={sp.rotX ?? 0} onChange={(v) => onChange({ rotX: v })} unit="°" step={1} /></div>
      <div className="k-pm-valuerow k-tip" data-tip="Y Rotation"><Icon.MateAngle size={14} /><NumberField value={sp.rotY ?? 0} onChange={(v) => onChange({ rotY: v })} unit="°" step={1} /></div>
    </>
  );
}

/**
 * Section View PropertyManager as the original (heads-up ▸ Section View): Drawing Section View,
 * Section Method, Section Options, Section 1 (plane, offset distance, flip, angles, cap colour), Section 2 / 3, Selected Bodies.
 */
export function SectionViewPM() {
  const st = useStore();
  const se = st.sectionEdit;
  if (!se) return null;
  const up = (p: Partial<SectionView>) => st.updateSectionView(p);
  const bodyName = (id: string) => (st.doc.components ?? []).find((c) => c.id === id)?.name ?? (st.doc.features.find((f) => f.id === st.rebuild.bodies.find((b) => b.id === id)?.featureIds.slice(-1)[0])?.name ?? id);
  const saved = st.doc.sectionViews ?? [];
  return (
    <div className="k-pm" data-testid="section-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Section /> <b>Section View</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={st.commitSectionView}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelSectionView}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Drawing Section View" defaultOpen={saved.length > 0}>
        <button className="k-btn" data-testid="section-save" onClick={st.saveSectionView}>Save</button>
        {saved.length > 0 && (
          <div className="k-selbox" style={{ marginTop: 4 }}>
            {saved.map((v) => <div key={v.name} className="k-selbox-row" title="Show this section" onClick={() => up({ ...(v.view as unknown as SectionView) })}><Icon.Section size={12} /> {v.name}</div>)}
          </div>
        )}
      </Section>
      <Section title="Section Method">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="secmethod" checked={(se.method ?? 'planar') === 'planar'} onChange={() => up({ method: 'planar' })} /> Planar</label>
          <label className="k-check"><input type="radio" name="secmethod" data-testid="section-zonal" checked={se.method === 'zonal'} onChange={() => up({ method: 'zonal', s2: se.s2 ?? { plane: se.plane, offset: se.offset - 10, flip: !se.flip } })} /> Zonal</label>
        </div>
      </Section>
      <Section title="Section Options">
        <label className="k-check"><input type="checkbox" checked={se.cap} disabled={!!se.graphicsOnly} onChange={(e) => up({ cap: e.target.checked })} /> Show section cap</label>
        <label className="k-check"><input type="checkbox" checked={!!se.keepCapColor} disabled={!se.cap} onChange={(e) => up({ keepCapColor: e.target.checked })} /> Keep cap color</label>
        <label className="k-check"><input type="checkbox" data-testid="section-gpu" checked={!!se.graphicsOnly} onChange={(e) => up({ graphicsOnly: e.target.checked })} /> Graphics-only section</label>
      </Section>
      <Section title="Section 1">
        <PlaneFields sp={se} onChange={up} units={st.doc.units} focus />
        <label className="k-btn k-color-btn" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: se.cap ? 1 : 0.5 }}>
          <span style={{ width: 12, height: 12, border: '1px solid #888', background: se.capColor ?? 'transparent' }} />
          Edit Color
          <input type="color" data-testid="section-capcolor" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} disabled={!se.cap} value={se.capColor ?? '#b4b4b4'} onChange={(e) => up({ capColor: e.target.value })} />
        </label>
      </Section>
      <Section title="Section 2" defaultOpen={!!se.s2} check={!!se.s2} onCheck={(on) => up({ s2: on ? { plane: 'top', offset: 0, flip: false } : undefined, ...(on ? {} : { s3: undefined }) })}>
        {se.s2 && <PlaneFields sp={se.s2} onChange={(p) => up({ s2: { ...se.s2!, ...p } })} units={st.doc.units} />}
      </Section>
      <Section title="Section 3" defaultOpen={!!se.s3} check={!!se.s3} onCheck={(on) => (se.s2 || !on ? up({ s3: on ? { plane: 'right', offset: 0, flip: false } : undefined }) : st.pushMessage('Section 2 comes first.', 'warn'))}>
        {se.s3 && <PlaneFields sp={se.s3} onChange={(p) => up({ s3: { ...se.s3!, ...p } })} units={st.doc.units} />}
      </Section>
      <Section title="Selected Bodies" defaultOpen={!!se.selectedOnly} check={!!se.selectedOnly} onCheck={(on) => up({ selectedOnly: on, pickBodies: on })}>
        <div className={`k-selbox ${se.pickBodies ? 'focus' : ''}`} style={{ minHeight: 40 }} data-testid="section-bodies" onClick={() => up({ pickBodies: true })}>
          {se.bodies?.length ? se.bodies.map((id) => <div key={id} className="k-selbox-row"><Icon.Part size={12} /> {bodyName(id)}</div>) : <span className="k-muted">Select the bodies or components to section.</span>}
        </div>
      </Section>
    </div>
  );
}
