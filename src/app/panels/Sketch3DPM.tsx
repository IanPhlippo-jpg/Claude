import { useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { Sketch3DEdit } from '../store';
import { ALONG, addAlong, alongLabel, drag3DPoint, endPoints3D, measure3D, relationsOfLine, solve3D, status3D, type Dim3D, type End3D, type P3 } from '../../core/sketch/sketch3d';

const same = (p: P3, q: P3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6;
const STATUS_TEXT = { under: 'Under Defined', full: 'Fully Defined', over: 'Over Defined', conflict: 'Over Defined (conflict)' } as const;
const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** the corners of the lines: points where exactly two lines meet */
function corners(segs: Sketch3DEdit['segments']): P3[] {
  const pts: { p: P3; n: number }[] = [];
  for (const s of segs) for (const p of s) { const h = pts.find((x) => same(x.p, p)); if (h) h.n++; else pts.push({ p, n: 1 }); }
  return pts.filter((x) => x.n === 2).map((x) => x.p);
}

/**
 * The 3D sketch after a change, solved with its relations and dimensions: with `drag` the end point at `from` goes to
 * `to` as far as the dimensions let it. Without dimensions the relations alone move the points (exactly, per
 * coordinate). Null when the dimensions cannot all hold (the change is refused).
 */
export function solved3D(e: Sketch3DEdit, drag?: { from: P3; to: P3 }): Sketch3DEdit | null {
  if (!e.dims?.length) {
    if (!drag) return e;
    const mv = drag3DPoint(e.segments, e.relations, drag.from, drag.to);
    return { ...e, segments: mv.segments, last: e.last && (same(e.last, drag.from) ? drag.to : mv.map(e.last)), fillets: e.fillets?.map((f) => ({ ...f, at: mv.map(f.at) })) };
  }
  const r = solve3D(e.segments, e.relations, e.dims, drag);
  if (!r.ok && !drag) return null;
  return { ...e, segments: r.segments, last: e.last && r.map(e.last), fillets: e.fillets?.map((f) => ({ ...f, at: r.map(f.at) })) };
}

/** a dimension added (Smart Dimension in the 3D sketch) at the value it measures now; null when it would over define */
export function addDim3D(e: Sketch3DEdit, d: Dim3D): Sketch3DEdit | null {
  const dims = [...(e.dims ?? []), { ...d, value: round6(measure3D(e.segments, d)) }];
  if (!(dims[dims.length - 1].value > 0)) return null;
  return solve3D(e.segments, e.relations, dims).status === 'over' ? null : { ...e, dims };
}

/** the value of dimension k changed: the sketch solved with it, or null when it cannot hold */
export const setDim3D = (e: Sketch3DEdit, k: number, value: number): Sketch3DEdit | null =>
  value > 0 ? solved3D({ ...e, dims: (e.dims ?? []).map((d, i) => (i === k ? { ...d, value } : d)) }) : null;

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

/** the length typed in the Lines list: the line's length dimension when it has one, otherwise the path moves (and solves) */
function typeLength(e: Sketch3DEdit, i: number, v: number): Sketch3DEdit | null {
  const k = (e.dims ?? []).findIndex((d) => d.kind === 'length' && d.line === i);
  return k >= 0 ? setDim3D(e, k, v) : solved3D(setLineLength(e, i, v));
}

const pointName = (segs: Sketch3DEdit['segments'], r: End3D) => `Point${endPoints3D(segs).findIndex((x) => same(x.p, segs[r[0]][r[1]])) + 1}`;
const dimLabel = (segs: Sketch3DEdit['segments'], d: Dim3D) => (d.kind === 'length' ? `Line${d.line + 1}` : `${pointName(segs, d.a)} - ${pointName(segs, d.b)}`);

/** 3D Sketch: the lines drawn so far, the active plane of the space handle (Tab switches), the dimensions and OK / Cancel. */
export function Sketch3DPM() {
  const st = useStore(useShallow((s) => ({ sketch3dEdit: s.sketch3dEdit, commit3DSketch: s.commit3DSketch, cancel3DSketch: s.cancel3DSketch, doc: s.doc, undo3DSegment: s.undo3DSegment, pushMessage: s.pushMessage })));
  const [pair, setPair] = useState<[number, number]>([0, 1]);
  const e = st.sketch3dEdit;
  if (!e) return null;
  const planeLabel = { xy: 'XY', yz: 'YZ', zx: 'ZX' }[e.plane];
  const status = status3D(e.segments, e.relations, e.dims);
  // a change the dimensions refuse leaves the sketch as it was, with a message
  const apply = (next: Sketch3DEdit | null, refused = 'The dimensions and relations of the 3D sketch cannot all hold with that value.') => {
    if (next) useStore.setState({ sketch3dEdit: next });
    else st.pushMessage(refused, 'warn');
  };
  const ends = endPoints3D(e.segments);
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
        <p className={`k-pm-message status ${status}`} data-testid="sketch3d-status" data-status={status}>{STATUS_TEXT[status]}</p>
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
          {/* the last point of the chain, typed exactly: it moves as dragged (the lines ending there follow, the relations and dimensions hold) */}
          {(['X', 'Y', 'Z'] as const).map((ax, i) => (
            <div key={ax} className="k-pm-valuerow k-tip" data-tip={`${ax} Coordinate`} data-testid={`sketch3d-${ax.toLowerCase()}`}>
              <span className="k-pm-xy">{ax}</span>
              <NumberField value={e.last![i]} unit={st.doc.units} step={1} onChange={(v) => {
                const p = [...e.last!] as P3;
                p[i] = v;
                apply(solved3D(e, { from: e.last!, to: p }));
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
          {e.segments.length ? e.segments.map((s, i) => {
            const dimmed = (e.dims ?? []).some((d) => d.kind === 'length' && d.line === i);
            return (
              <div key={i} className="k-selbox-row">
                <Icon.Line size={12} /> Line{i + 1}
                {/* the length of the line, driving: typing it moves the end point and what follows (its dimension when it has one) */}
                <span style={{ marginLeft: 'auto', width: 110 }} data-testid={`sketch3d-length-${i}`}><NumberField value={round6(Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1], s[1][2] - s[0][2]))} unit={st.doc.units} step={1} min={0.01} onChange={(v) => apply(typeLength(useStore.getState().sketch3dEdit!, i, v))} /></span>
                {/* Smart Dimension on the line: a length dimension at the length it has (lit when the line has one) */}
                <button className={`k-pm-stylebtn k-tip ${dimmed ? 'active' : ''}`} data-tip="Smart Dimension (length)" data-testid={`sketch3d-dim-${i}`} aria-pressed={dimmed} disabled={dimmed} onClick={() => apply(addDim3D(useStore.getState().sketch3dEdit!, { kind: 'length', line: i, value: 0 }), 'The dimension would over define the 3D sketch.')}><Icon.Dimension size={12} /></button>
                {/* Add Relations of the line: Along X / Along Y / Along Z (lit when the line has it; a click adds or removes it) */}
                {ALONG.map((k) => {
                  const on = relationsOfLine(e.relations, i).some((r) => r.kind === k);
                  return (
                    <button key={k} className={`k-pm-stylebtn k-tip ${on ? 'active' : ''}`} data-tip={alongLabel(k)} data-testid={`sketch3d-${k}-${i}`} aria-pressed={on} onClick={() => {
                      const cur = useStore.getState().sketch3dEdit!;
                      if (on) return useStore.setState({ sketch3dEdit: { ...cur, relations: (cur.relations ?? []).filter((r) => r.line !== i) } });
                      const r = addAlong(cur.segments, cur.relations, i, k);
                      const next = { ...cur, segments: r.segments, relations: r.relations, last: cur.last && r.map(cur.last), fillets: cur.fillets?.map((f) => ({ ...f, at: r.map(f.at) })) };
                      apply(solved3D(next), 'The relation conflicts with the dimensions of the 3D sketch.');
                    }}>{k.slice(-1)}</button>
                  );
                })}
              </div>
            );
          }) : <span className="k-muted">No lines yet.</span>}
        </div>
        <button className="k-btn" style={{ marginTop: 4 }} disabled={!e.segments.length} onClick={st.undo3DSegment}>Undo last line</button>
      </Section>
      <Section title={`Dimensions (${e.dims?.length ?? 0})`} defaultOpen>
        {/* the dimensions of the 3D sketch, driving: a value typed here moves the geometry through the solver */}
        <div data-testid="sketch3d-dims">
          {(e.dims ?? []).map((d, k) => (
            <div key={k} className="k-selbox-row" data-testid="sketch3d-dim-row">
              <Icon.Dimension size={12} /> D{k + 1} <span className="k-muted" style={{ marginLeft: 4 }}>{dimLabel(e.segments, d)}</span>
              <span style={{ marginLeft: 'auto', width: 110 }} data-testid={`sketch3d-dimvalue-${k}`}><NumberField value={d.value} unit={st.doc.units} step={1} min={0.01} onChange={(v) => apply(setDim3D(useStore.getState().sketch3dEdit!, k, v))} /></span>
              <button className="k-btn ghost icon" onClick={() => useStore.setState({ sketch3dEdit: { ...e, dims: e.dims!.filter((_, j) => j !== k) } })}>×</button>
            </div>
          ))}
        </div>
        {/* a distance between two end points */}
        <div className="k-pm-valuerow" style={{ gap: 4 }}>
          {[0, 1].map((w) => (
            <select key={w} data-testid={`sketch3d-distance-${w}`} value={pair[w]} disabled={ends.length < 2} onChange={(ev) => setPair(w ? [pair[0], +ev.target.value] : [+ev.target.value, pair[1]])}>
              {ends.map((_, j) => <option key={j} value={j}>Point{j + 1}</option>)}
            </select>
          ))}
          <button className="k-btn" data-testid="sketch3d-add-distance" disabled={ends.length < 2 || pair[0] === pair[1] || !ends[pair[0]] || !ends[pair[1]]} onClick={() => apply(addDim3D(useStore.getState().sketch3dEdit!, { kind: 'distance', a: ends[pair[0]].ref, b: ends[pair[1]].ref, value: 0 }), 'The dimension would over define the 3D sketch.')}>Distance</button>
        </div>
      </Section>
    </div>
  );
}
