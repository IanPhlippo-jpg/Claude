import { useState } from 'react';
import { sketchStatus, useActiveSketch, useActiveSolve, useStore, type UnitSystem } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { Menu } from '../ui/components';

const STATUS_TEXT: Record<string, string> = {
  under: 'Under Defined',
  full: 'Fully Defined',
  over: 'Over Defined',
  conflict: 'Over Defined (conflict)',
  invalid: 'Invalid relation',
};

const UNIT_LABEL: Record<UnitSystem, string> = { MKS: 'MKS (meter, kilogram, second)', CGS: 'CGS (centimeter, gram, second)', MMGS: 'MMGS (millimeter, gram, second)', IPS: 'IPS (inch, pound, second)' };

export function StatusBar({ hint }: { hint: string }) {
  const st = useStore(useShallow((s) => ({ messages: s.messages, doc: s.doc, selection: s.selection, selectedEdges: s.selectedEdges, rebuild: s.rebuild, selectedFace: s.selectedFace, planePick: s.planePick, activeSketchId: s.activeSketchId, cursor: s.cursor, hasDocument: s.hasDocument, selectedDrawingViewId: s.selectedDrawingViewId, unitSystem: s.unitSystem, setUnitSystem: s.setUnitSystem, setDialog: s.setDialog })));
  const solve = useActiveSolve();
  const sketch = useActiveSketch();
  const [units, setUnits] = useState(false);
  const msg = st.messages[st.messages.length - 1];
  const sketchName = sketch?.name ?? null;
  const status = sketchStatus(sketch, solve);
  const u = st.doc.units;
  const coord = (v: number) => `${Math.round(v * 100) / 100}${u}`;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  // the selection readout, as the intended status bar: a line's length, two points' distance (dX dY dZ), a circle's diameter and centre
  let readout: string | null = null;
  if (sketch && st.selection.length) {
    const ents = st.selection.filter((s) => s.kind === 'entity').map((s) => sketch.entities[s.id]).filter(Boolean);
    const pts = st.selection.filter((s) => s.kind === 'point').map((s) => sketch.points[s.id]).filter(Boolean);
    if (ents.length === 1 && ents[0].kind === 'line') {
      const a = sketch.points[ents[0].p1], b = sketch.points[ents[0].p2];
      if (a && b) readout = `Length: ${coord(Math.hypot(b.x - a.x, b.y - a.y))}`;
    } else if (ents.length === 1 && ents[0].kind === 'circle') {
      const c = sketch.points[ents[0].center], r = sketch.scalars[ents[0].r];
      if (c && r !== undefined) readout = `Diameter: ${coord(2 * r)}   Center: ${coord(c.x)}, ${coord(c.y)}`;
    } else if (ents.length === 1 && ents[0].kind === 'arc') {
      const c = sketch.points[ents[0].center], s0 = sketch.points[ents[0].start];
      if (c && s0) readout = `Radius: ${coord(Math.hypot(s0.x - c.x, s0.y - c.y))}   Center: ${coord(c.x)}, ${coord(c.y)}`;
    } else if (pts.length === 2 && !ents.length) {
      const [a, b] = pts;
      readout = `Distance: ${coord(Math.hypot(b.x - a.x, b.y - a.y))}   dX: ${coord(b.x - a.x)}   dY: ${coord(b.y - a.y)}   dZ: 0${u}`;
    } else if (pts.length === 1 && !ents.length) {
      readout = `X: ${coord(pts[0].x)}   Y: ${coord(pts[0].y)}`;
    }
  } else if (!sketch && st.selectedEdges.length) {
    const edges = st.selectedEdges.map((id) => st.rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
    if (edges.length === 1) {
      const e = edges[0];
      if (e.closed && !e.straight) readout = `Diameter: ${coord(r2(e.length / Math.PI))}   Center: ${coord(e.centroid.x)}, ${coord(e.centroid.y)}, ${coord(e.centroid.z)}`;
      else readout = `${e.straight ? 'Length' : 'Arc length'}: ${coord(e.length)}`;
    } else if (edges.length === 2 && edges.every((e) => e.straight)) {
      const d = edges[0].centroid.clone().sub(edges[1].centroid);
      readout = `Distance: ${coord(d.length())}   dX: ${coord(Math.abs(d.x))}   dY: ${coord(Math.abs(d.y))}   dZ: ${coord(Math.abs(d.z))}`;
    }
  } else if (!sketch && st.selectedFace) {
    const f = st.rebuild.bodies.find((b) => b.id === st.selectedFace!.bodyId)?.faces.find((x) => x.id === st.selectedFace!.faceId);
    if (f) readout = `Area: ${r2(f.area)}${u}²`;
  }
  return (
    <div className="k-statusbar">
      {msg ? (
        <span className={`k-status-msg ${msg.level}`}>
          {msg.level !== 'info' && <Icon.Warning size={13} />} {msg.text}
        </span>
      ) : !hint && Object.keys(st.rebuild.errors).length ? (
        <span className="k-status-err" data-testid="status-errors" onClick={() => useStore.setState({ whatsWrong: true })}>{Object.keys(st.rebuild.errors).length} rebuild error{Object.keys(st.rebuild.errors).length === 1 ? '' : 's'}: What's Wrong</span>
      ) : (
        <span className="k-muted">{hint || (st.planePick ? '' : st.activeSketchId ? '' : 'Ready')}</span>
      )}
      <span className="grow" />
      {readout && <span className="k-status-cell" data-testid="status-readout">{readout}</span>}
      {st.cursor && (st.activeSketchId || st.doc.kind === 'drawing') && (
        // the pointer in sketch coordinates x, y and 0, as the reference status bar shows them while sketching
        <span className="k-status-coords" data-testid="status-xyz">
          <span>{coord(st.cursor.x)}</span>
          <span>{coord(st.cursor.y)}</span>
          <span>0{u}</span>
        </span>
      )}
      {status && st.activeSketchId && (
        <span className={`k-status-cell status ${status}`} title={solve ? `DOF: ${solve.dof} · ${solve.iterations} iterations · ${solve.timeMs.toFixed(1)} ms` : undefined}>
          {STATUS_TEXT[status]}
        </span>
      )}
      {st.doc.kind === 'drawing' && !st.activeSketchId && <span className="k-status-cell status under">Under Defined</span>}
      <span className="k-status-cell">{!st.hasDocument ? '' : sketchName ? `Editing ${sketchName}` : (st.doc.kind === 'assembly' ? 'Editing Assembly' : st.doc.kind === 'drawing' ? `Editing ${st.doc.sheets?.[0]?.views.find((v) => v.id === st.selectedDrawingViewId)?.name ?? st.doc.sheets?.[0]?.name ?? 'Sheet1'}` : 'Editing Part')}</span>
      {st.doc.kind === 'drawing' && st.doc.sheets?.[0] && <span className="k-status-cell" data-testid="sheet-scale">{st.doc.sheets[0].scale[0]} : {st.doc.sheets[0].scale[1]}</span>}
      <span className="k-status-cell" style={{ position: 'relative' }}>
        <button className="k-status-units" onClick={() => setUnits(true)}>
          {st.unitSystem} <Icon.ChevronDown size={10} />
        </button>
        {units && (
          <Menu
            onClose={() => setUnits(false)}
            style={{ bottom: '100%', right: 0, top: 'auto' }}
            items={[
              ...(['MKS', 'CGS', 'MMGS', 'IPS'] as UnitSystem[]).map((u) => ({ label: `${st.unitSystem === u ? '✓ ' : ''}${UNIT_LABEL[u]}`, onSelect: () => st.setUnitSystem(u) })),
              { separator: true },
              { label: 'Edit Document Units…', onSelect: () => st.setDialog('options') },
            ]}
          />
        )}
      </span>
    </div>
  );
}
