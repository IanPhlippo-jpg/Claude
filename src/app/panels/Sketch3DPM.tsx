import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '../../ui/components';
import { Icon } from '../../ui/icons';

/** 3D Sketch: the lines drawn so far, the active plane of the space handle (Tab switches) and OK / Cancel. */
export function Sketch3DPM() {
  const st = useStore(useShallow((s) => ({ sketch3dEdit: s.sketch3dEdit, commit3DSketch: s.commit3DSketch, cancel3DSketch: s.cancel3DSketch, doc: s.doc, undo3DSegment: s.undo3DSegment })));
  const e = st.sketch3dEdit;
  if (!e) return null;
  const planeLabel = { xy: 'XY', yz: 'YZ', zx: 'ZX' }[e.plane];
  return (
    <div className="k-pm" data-testid="sketch3d-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Sketch /> <b>{e.name}</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK (Exit Sketch)" onClick={st.commit3DSketch}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancel3DSketch}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Message">
        <p className="k-pm-message">Click points in the graphics area. Lines are drawn on the {planeLabel} plane through the last point; press Tab to switch the plane. Double-click or Esc ends the chain.</p>
      </Section>
      <Section title="Space Handle">
        <div className="k-pm-stylerow">
          {(['xy', 'yz', 'zx'] as const).map((p) => (
            <button key={p} className={`k-pm-stylebtn k-tip ${e.plane === p ? 'active' : ''}`} data-tip={`${p.toUpperCase()} plane`} onClick={() => { while (useStore.getState().sketch3dEdit?.plane !== p) useStore.getState().cycle3DPlane(); }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>
      <Section title={`Lines (${e.segments.length})`}>
        <div className="k-selbox" style={{ minHeight: 40, maxHeight: 160, overflow: 'auto' }} data-testid="sketch3d-lines">
          {e.segments.length ? e.segments.map((s, i) => (
            <div key={i} className="k-selbox-row">
              <Icon.Line size={12} /> Line{i + 1}
              <span className="k-muted" style={{ marginLeft: 6 }}>{Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]).toFixed(2)} {st.doc.units}</span>
            </div>
          )) : <span className="k-muted">No lines yet.</span>}
        </div>
        <button className="k-btn" style={{ marginTop: 4 }} disabled={!e.segments.length} onClick={st.undo3DSegment}>Undo last line</button>
      </Section>
    </div>
  );
}
