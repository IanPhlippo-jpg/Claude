import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { Sketch3DEdit } from '../store';

type P3 = [number, number, number];
const same = (p: P3, q: P3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6;

/** the corners of the lines: points where exactly two lines meet */
function corners(segs: Sketch3DEdit['segments']): P3[] {
  const pts: { p: P3; n: number }[] = [];
  for (const s of segs) for (const p of s) { const h = pts.find((x) => same(x.p, p)); if (h) h.n++; else pts.push({ p, n: 1 }); }
  return pts.filter((x) => x.n === 2).map((x) => x.p);
}

/**
 * A line set to a new length: its end point moves along the line and everything joined beyond it moves with it
 * (the rest of the path keeps its shape), as a driving dimension on the line.
 */
export function setLineLength(e: Sketch3DEdit, i: number, length: number): Sketch3DEdit {
  const [a, b] = e.segments[i];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (!(L > 0) || !(length > 0)) return e;
  const d: P3 = [(b[0] - a[0]) * (length / L - 1), (b[1] - a[1]) * (length / L - 1), (b[2] - a[2]) * (length / L - 1)];
  // the points reachable from b without crossing line i
  const moved: P3[] = [b];
  for (let grow = true; grow; ) {
    grow = false;
    e.segments.forEach((s, j) => {
      if (j === i) return;
      const [p, q] = s;
      if (moved.some((m) => same(m, p)) && !moved.some((m) => same(m, q))) { moved.push(q); grow = true; }
      else if (moved.some((m) => same(m, q)) && !moved.some((m) => same(m, p))) { moved.push(p); grow = true; }
    });
  }
  const mv = (p: P3): P3 => (moved.some((m) => same(m, p)) ? [p[0] + d[0], p[1] + d[1], p[2] + d[2]] : p);
  return { ...e, segments: e.segments.map((s) => [mv(s[0]), mv(s[1])] as typeof s), fillets: e.fillets?.map((f) => ({ ...f, at: mv(f.at) })), last: e.last ? mv(e.last) : e.last };
}

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
          <Icon.Line /> <b>Insert Line</b> <span className="k-muted" style={{ marginLeft: 4 }}>{e.name}</span>
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
      <Section title="Orientation">
        <div className="k-pm-radios">
          {([['free', 'As sketched'], ['x', 'Along X'], ['y', 'Along Y'], ['z', 'Along Z']] as const).map(([v, label]) => (
            <label key={v} className="k-check"><input type="radio" name="s3dorient" data-testid={`sketch3d-orient-${v}`} checked={(e.orientation ?? 'free') === v} onChange={() => useStore.setState({ sketch3dEdit: { ...e, orientation: v } })} /> {label}</label>
          ))}
        </div>
      </Section>
      {e.last && (
        <Section title="Control Vertex Parameters">
          {/* the last point of the chain, typed exactly (the line that ends there follows) */}
          {(['X', 'Y', 'Z'] as const).map((ax, i) => (
            <div key={ax} className="k-pm-valuerow k-tip" data-tip={`${ax} Coordinate`} data-testid={`sketch3d-${ax.toLowerCase()}`}>
              <span className="k-pm-xy">{ax}</span>
              <NumberField value={e.last![i]} unit={st.doc.units} step={1} onChange={(v) => {
                const old = e.last!;
                const p = [...old] as [number, number, number];
                p[i] = v;
                const same = (q: [number, number, number]) => q[0] === old[0] && q[1] === old[1] && q[2] === old[2];
                useStore.setState({ sketch3dEdit: { ...e, last: p, segments: e.segments.map((sg) => sg.map((q) => (same(q as [number, number, number]) ? p : q)) as typeof sg) } });
              }} />
            </div>
          ))}
        </Section>
      )}
      <Section title="Space Handle">
        <div className="k-pm-stylerow">
          {(['xy', 'yz', 'zx'] as const).map((p) => (
            <button key={p} className={`k-pm-stylebtn k-tip ${e.plane === p ? 'active' : ''}`} data-tip={`${p.toUpperCase()} plane`} onClick={() => { while (useStore.getState().sketch3dEdit?.plane !== p) useStore.getState().cycle3DPlane(); }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Sketch Fillet" defaultOpen={!!e.fillets?.length}>
        {/* the corners of the path rounded with the radius, as Sketch Fillet in a 3D sketch */}
        <div className="k-pm-valuerow k-tip" data-tip="Fillet Radius"><Icon.Arc size={14} /><NumberField value={e.filletRadius ?? 5} unit={st.doc.units} step={1} min={0.01} onChange={(v) => useStore.setState({ sketch3dEdit: { ...e, filletRadius: Math.max(0.01, v) } })} /></div>
        <button className="k-btn" data-testid="sketch3d-fillet-all" disabled={!corners(e.segments).length} onClick={() => useStore.setState({ sketch3dEdit: { ...e, fillets: corners(e.segments).map((at) => ({ at, r: e.filletRadius ?? 5 })) } })}>Fillet all corners</button>
        {(e.fillets ?? []).map((f, i) => (
          <div key={i} className="k-selbox-row" data-testid="sketch3d-fillet-row">
            <Icon.Arc size={12} /> SketchFillet{i + 1}
            <span className="k-muted" style={{ marginLeft: 6 }}>R{f.r}</span>
            <button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={() => useStore.setState({ sketch3dEdit: { ...e, fillets: e.fillets!.filter((_, j) => j !== i) } })}>×</button>
          </div>
        ))}
      </Section>
      <Section title={`Lines (${e.segments.length})`}>
        <div className="k-selbox" style={{ minHeight: 40, maxHeight: 160, overflow: 'auto' }} data-testid="sketch3d-lines">
          {e.segments.length ? e.segments.map((s, i) => (
            <div key={i} className="k-selbox-row">
              <Icon.Line size={12} /> Line{i + 1}
              {/* the length of the line, driving: typing it moves the end point and what follows */}
              <span style={{ marginLeft: 'auto', width: 110 }} data-testid={`sketch3d-length-${i}`}><NumberField value={Math.round(Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]) * 1e6) / 1e6} unit={st.doc.units} step={1} min={0.01} onChange={(v) => useStore.setState({ sketch3dEdit: setLineLength(useStore.getState().sketch3dEdit!, i, v) })} /></span>
            </div>
          )) : <span className="k-muted">No lines yet.</span>}
        </div>
        <button className="k-btn" style={{ marginTop: 4 }} disabled={!e.segments.length} onClick={st.undo3DSegment}>Undo last line</button>
      </Section>
    </div>
  );
}
