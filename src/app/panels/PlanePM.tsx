import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';

/**
 * Plane Property Panel by design (Reference Geometry ▸ Plane): First Reference with the
 * constraint (Offset Distance / At Angle through a straight edge / Parallel / Coincident…), Flip,
 * number of planes, Second/Third Reference, and the message "Fully defined".
 */
export function PlanePM() {
  const st = useStore(useShallow((s) => ({ planeEdit: s.planeEdit, doc: s.doc, rebuild: s.rebuild, commitPlane: s.commitPlane, cancelPlane: s.cancelPlane, updatePlaneDraft: s.updatePlaneDraft })));
  const pe = st.planeEdit;
  if (!pe) return null;
  const d = pe.draft;
  const planes = [
    { id: 'front', label: 'Front Plane' },
    { id: 'top', label: 'Top Plane' },
    { id: 'right', label: 'Right Plane' },
    ...Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => ({ id: p.id, label: p.name })),
  ];
  const body = st.rebuild.bodies[0];
  const straightEdges = body ? body.edges.filter((e) => e.straight) : [];
  const defined = d.mode === 'offset' || d.mode === 'perpendicular' || (d.mode === 'angle' && !!d.edgeId) || (d.mode === 'mid' && !!d.ref2 && d.ref2 !== d.ref);
  return (
    <div className="k-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Plane /> <b>{pe.planeId ? d.name : 'Plane'}</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" disabled={!defined} onClick={st.commitPlane}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelPlane}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Message">
        <p className="k-pm-message">{defined ? 'Fully defined' : 'Select references and constraints to define the plane.'}</p>
      </Section>
      <Section title="First Reference">
        <div className="k-selbox" style={{ minHeight: 24, marginBottom: 6 }}>
          <select className="k-input" value={d.ref} onChange={(e) => st.updatePlaneDraft({ ref: e.target.value })}>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="plmode" checked={d.mode === 'parallel'} onChange={() => st.updatePlaneDraft({ mode: 'parallel' })} /> Parallel</label>
          <label className="k-check"><input type="radio" name="plmode" data-testid="plane-perp" checked={d.mode === 'perpendicular'} onChange={() => st.updatePlaneDraft({ mode: 'perpendicular' })} /> Perpendicular</label>
          <label className="k-check"><input type="radio" name="plmode" checked={d.mode === 'coincident'} onChange={() => st.updatePlaneDraft({ mode: 'coincident' })} /> Coincident</label>
          <label className="k-check"><input type="radio" name="plmode" checked={d.mode === 'angle'} onChange={() => st.updatePlaneDraft({ mode: 'angle' })} /> At Angle</label>
          <label className="k-check"><input type="radio" name="plmode" checked={d.mode === 'offset'} onChange={() => st.updatePlaneDraft({ mode: 'offset' })} /> Offset Distance</label>
        </div>
        {d.mode === 'offset' && (
          <>
            <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
              <Icon.Dimension size={14} />
              <NumberField value={d.distance} onChange={(v) => st.updatePlaneDraft({ distance: v })} unit={st.doc.units} step={1} autoFocus />
            </div>
            <label className="k-check"><input type="checkbox" checked={d.flip} onChange={(e) => st.updatePlaneDraft({ flip: e.target.checked })} /> Flip offset</label>
            <div className="k-pm-valuerow">
              <Icon.Pattern size={14} />
              <NumberField value={d.count} onChange={(v) => st.updatePlaneDraft({ count: Math.max(1, Math.min(20, Math.round(v))) })} step={1} min={1} />
              <span className="k-muted">planes to create</span>
            </div>
          </>
        )}
        {d.mode === 'angle' && (
          <>
            <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
              <Icon.MateAngle size={14} />
              <NumberField value={d.angle} onChange={(v) => st.updatePlaneDraft({ angle: v })} unit="°" step={5} autoFocus />
            </div>
            <label className="k-check"><input type="checkbox" checked={d.flip} onChange={(e) => st.updatePlaneDraft({ flip: e.target.checked })} /> Flip offset</label>
          </>
        )}
        <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" data-testid="plane-mid" checked={d.mode === 'mid'} onChange={(e) => st.updatePlaneDraft({ mode: e.target.checked ? 'mid' : 'offset' })} /> Mid Plane</label>
        {d.mode === 'perpendicular' && <label className="k-check"><input type="checkbox" checked={d.flip} onChange={(e) => st.updatePlaneDraft({ flip: e.target.checked })} /> Flip</label>}
      </Section>
      <Section title="Second Reference">
        {d.mode === 'mid' ? (
          <div className="k-selbox" style={{ minHeight: 24 }}>
            <select className="k-input" data-testid="plane-ref2" value={d.ref2 ?? ''} onChange={(e) => st.updatePlaneDraft({ ref2: e.target.value || undefined })}>
              <option value="">Select a parallel plane…</option>
              {planes.filter((p) => p.id !== d.ref).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        ) : d.mode === 'angle' || d.mode === 'perpendicular' ? (
          <>
            <div className="k-selbox" style={{ minHeight: 24 }}>
              {d.edgeId ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">{d.mode === 'perpendicular' ? 'Optional: a straight edge the plane passes through (else the reference origin).' : 'Select a straight edge of the model (the hinge of the angle).'}</span>}
            </div>
            {straightEdges.length > 0 && !d.edgeId && <p className="k-muted" style={{ margin: '4px 0 0' }}>Click an edge in the graphics area.</p>}
          </>
        ) : (
          <div className="k-selbox" style={{ minHeight: 24 }}><span className="k-muted">Not needed for this constraint.</span></div>
        )}
      </Section>
      <Section title="Third Reference" defaultOpen={false}>
        <div className="k-selbox" style={{ minHeight: 24 }}></div>
      </Section>
      <Section title="Options" defaultOpen={false}>
        <label className="k-check"><input type="checkbox" data-testid="plane-flipnormal" checked={!!d.flipNormal} onChange={(e) => st.updatePlaneDraft({ flipNormal: e.target.checked })} /> Flip normal</label>
      </Section>
    </div>
  );
}
