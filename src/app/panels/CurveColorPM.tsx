import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Section } from '../../ui/components';
import { Icon } from '../../ui/icons';

/** the "standard" palette of the Favorite section: 8 columns of hues, light to dark */
const STANDARD = ['#ffffff', '#ffcccc', '#ffe5cc', '#ffffcc', '#ccffcc', '#ccffff', '#cce0ff', '#e5ccff',
  '#c0c0c0', '#ff6666', '#ffb266', '#ffff66', '#66ff66', '#66ffff', '#6699ff', '#b266ff',
  '#808080', '#ff0000', '#ff8000', '#ffff00', '#00cc00', '#00cccc', '#0047ff', '#8000ff',
  '#404040', '#b30000', '#b35900', '#b3b300', '#008000', '#008080', '#0000b3', '#5900b3',
  '#000000', '#660000', '#663300', '#666600', '#004000', '#004040', '#000066', '#330066'];

/**
 * Sketch/Curve Color (right-click a sketch ▸ Sketch Color…), as the intended Property Panel: Selection with Remove
 * Color, Favorite with the "standard" palette, Color Properties, Configurations / Display States. OK sets the colour
 * of the sketch while it is not edited; Cancel leaves it as it was.
 */
export function CurveColorPM() {
  const st = useStore(useShallow((s) => ({ edit: s.curveColorEdit, doc: s.doc, applyDocument: s.applyDocument })));
  const e = st.edit;
  if (!e) return null;
  const sk = st.doc.sketches[e.sketchId];
  const set = (patch: Partial<NonNullable<typeof e>>) => useStore.setState({ curveColorEdit: { ...e, ...patch } });
  const close = () => useStore.setState({ curveColorEdit: null });
  const ok = () => {
    if (sk) st.applyDocument('Sketch Color', { ...st.doc, sketches: { ...st.doc.sketches, [sk.id]: { ...sk, color: e.color ?? undefined } } });
    close();
  };
  return (
    <div className="k-pm" data-testid="curvecolor-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Palette /> <b>Sketch/Curve Color</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="curvecolor-ok" onClick={ok}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={close}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Selection">
        <div className="k-selbox" style={{ minHeight: 24 }}>{sk ? <div className="k-selbox-row"><Icon.Sketch size={12} /> {sk.name}</div> : null}</div>
        <button className="k-btn" data-testid="curvecolor-remove" disabled={!e.color} onClick={() => set({ color: null })} style={{ marginTop: 4 }}>Remove Color</button>
      </Section>
      <Section title="Favorite">
        <div className="k-curvecolor-bar" style={{ background: e.color ?? '#5a5a5a' }} data-testid="curvecolor-current" />
        <select className="k-input" value="standard" onChange={() => undefined} style={{ marginTop: 4 }}><option value="standard">standard</option></select>
        <div className="k-curvecolor-grid" data-testid="curvecolor-grid">
          {STANDARD.map((c) => <button key={c} className={`k-curvecolor-cell ${e.color === c ? 'active' : ''}`} style={{ background: c }} title={c} onClick={() => set({ color: c })} />)}
        </div>
      </Section>
      <Section title="Color Properties" defaultOpen={false}>
        <div className="k-field"><label>Color</label><input type="color" value={e.color ?? '#5a5a5a'} onChange={(ev) => set({ color: ev.target.value })} /></div>
      </Section>
      <Section title="Configurations/Display States">
        <label className="k-check"><input type="radio" name="ccscope" checked={e.scope === 'this'} onChange={() => set({ scope: 'this' })} /> This configuration</label>
        <label className="k-check"><input type="radio" name="ccscope" checked={e.scope === 'all'} onChange={() => set({ scope: 'all' })} /> All configurations</label>
        <label className="k-check"><input type="radio" name="ccscope" checked={e.scope === 'specify'} onChange={() => set({ scope: 'specify' })} /> Specify configurations</label>
      </Section>
    </div>
  );
}
