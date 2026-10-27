import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { cylinderAxis } from '../core/assembly/assembly';
import { sketchStatus, useActiveSketch, useActiveSolve, useStore, type UnitSystem } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { Menu } from '../ui/components';
import { bridge } from './viewport/bridge';
import { sampleEntity } from '../core/sketch/geometry';
import { faceMeasure } from '../core/features/measure';
import { mateStatus } from '../core/assembly/mateStatus';

const STATUS_TEXT: Record<string, string> = {
  under: 'Under Defined',
  full: 'Fully Defined',
  over: 'Over Defined',
  conflict: 'Over Defined (conflict)',
  invalid: 'Invalid relation',
};

/** a curved face that is (part of) a cylinder: its radius, and whether it runs all the way round */
function cylinderOf(g: THREE.BufferGeometry, triangles: number[]): { radius: number; full: boolean } | null {
  const ax = cylinderAxis(g, triangles);
  if (!ax || !(ax.radius > 1e-6)) return null;
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const p = new THREE.Vector3(), d = ax.dir.clone().normalize();
  // every vertex at the radius from the axis (a fillet blend or a sphere is not), and the directions round the axis
  const u = new THREE.Vector3(1, 0, 0).cross(d).lengthSq() > 1e-6 ? new THREE.Vector3(1, 0, 0).cross(d).normalize() : new THREE.Vector3(0, 1, 0).cross(d).normalize();
  const v = d.clone().cross(u);
  const angles: number[] = [];
  // the facets' vertices lie on the true surface: their distance to the axis is the radius (the fit of the facets
  // themselves is a little smaller)
  let rs = 0;
  for (const t of triangles) for (let k = 0; k < 3; k++) {
    p.fromBufferAttribute(a, t * 3 + k).sub(ax.point);
    const r = p.clone().addScaledVector(d, -p.dot(d));
    if (Math.abs(r.length() - ax.radius) > Math.max(1e-3, ax.radius * 0.02)) return null;
    rs += r.length();
    angles.push(Math.atan2(r.dot(v), r.dot(u)));
  }
  angles.sort((x, y) => x - y);
  let gap = angles[0] + 2 * Math.PI - angles[angles.length - 1];
  for (let i = 1; i < angles.length; i++) gap = Math.max(gap, angles[i] - angles[i - 1]);
  return { radius: rs / angles.length, full: gap < Math.PI / 4 };
}

const UNIT_LABEL: Record<UnitSystem, string> = { MKS: 'MKS (meter, kilogram, second)', CGS: 'CGS (centimeter, gram, second)', MMGS: 'MMGS (millimeter, gram, second)', IPS: 'IPS (inch, pound, second)' };

/** the prompt of the command in progress, as the intended status bar words it (measured in the reference videos) */
function commandPrompt(s: { tool: string; activeSketchId: string | null; selectedConstraint: string | null; contourPick: boolean; featureEdit: { draft: { type: string; sketchId?: string; breakCorner?: boolean; edges?: unknown[]; plane?: string; roundType?: string; end?: string; contours?: number[] } } | null }): string {
  if (s.activeSketchId) {
    if (s.selectedConstraint) return 'Set the properties of the selected dimension(s).';
    if (s.tool === 'dimension' || s.tool === 'hdim' || s.tool === 'vdim') return 'Select one or two edges/vertices and then a text location.';
    if (s.tool === 'offset') return 'Click on either side to complete, or click and drag for dynamic control. Right-click for additional options.';
    if (s.tool === 'polygon') return `Creating ${bridge.sketchOptions.polygonSides} sided polygon`;
    if (s.tool === 'rectangle') return 'Click first and then second corner';
    if (s.tool === 'circle') return 'Click-drag from the center or click center and click radius.';
    if (s.tool === 'arc3') return 'Place start and end points. Place a point on the circumference of the arc.';
    return '';
  }
  const t = s.featureEdit?.draft.type;
  const d = s.featureEdit?.draft;
  // with a contour already picked the prompt names both ways of picking (57/0028)
  if (s.contourPick && t === 'extrude' && d?.contours?.length) return 'Pick a sketch entity to define an open or closed contour. To define a region, pick inside an area bounded by sketch geometry.';
  if (s.contourPick && (t === 'extrude' || t === 'revolve')) return 'To select a region, pick inside an area bounded by sketch geometry.';
  if (t === 'sweep') return d?.sketchId ? 'Select one or more sketch entities or model edges to form the group.' : 'Select sweep profile';
  if (t === 'mirror') return d?.plane ? 'Select the features to mirror' : 'Select a plane or planar face about which to mirror, followed by the features to mirror.';
  if (t === 'circularPattern') return 'Select edge or axis for direction reference, select face of feature for pattern features';
  if (t === 'rib') return 'Set direction, thickness and other parameters to create the rib.';
  if ((t === 'fillet' || t === 'chamfer') && d?.roundType === 'fullRound') return 'Select faces for the center and side face sets';
  // the extrude and base flange show their drag handles; Through All offers a click in empty space to go back to Blind
  if (t === 'extrude' && (d?.end === 'throughAll' || d?.end === 'throughAllBoth')) return 'Click a location in empty space to change to a blind extrusion or select a different entity';
  if (t === 'extrude' || t === 'baseFlange') return 'Select a handle to modify parameters';
  if (t === 'sketchedBend') return 'Select the fixed face or edge and set the bend parameters.';
  if (t === 'edgeFlange') return 'Please click a location in empty space or a vertex to set the flange height';
  if ((t === 'fillet' || t === 'chamfer') && d?.breakCorner) return 'Please select corner edge(s) or flange face(s).';
  if ((t === 'fillet' || t === 'chamfer') && d?.edges?.length) return 'Select a callout to modify parameters';
  return '';
}

export function StatusBar({ hint: hint0 }: { hint: string }) {
  const st = useStore(useShallow((s) => ({ messages: s.messages, doc: s.doc, selection: s.selection, selectedEdges: s.selectedEdges, rebuild: s.rebuild, selectedFace: s.selectedFace, selectedFaces: s.selectedFaces, planePick: s.planePick, activeSketchId: s.activeSketchId, cursor: s.cursor, hasDocument: s.hasDocument, selectedDrawingViewId: s.selectedDrawingViewId, unitSystem: s.unitSystem, setUnitSystem: s.setUnitSystem, setDialog: s.setDialog })));
  const focusLocked = useStore((s) => s.sketchFocusLocked);
  const dialogPrompt = useStore((s) => (s.dialog === 'appearance' ? 'Select entities to modify their appearance.' : ''));
  const commandText = useStore(useShallow((s) => commandPrompt({ tool: s.tool, activeSketchId: s.activeSketchId, selectedConstraint: s.selectedConstraint, contourPick: s.contourPick, featureEdit: s.featureEdit })));
  const prompt = dialogPrompt || commandText;
  // the menu row under the pointer describes its command, as the intended status bar
  const [menuText, setMenuText] = useState('');
  useEffect(() => {
    const h = (e: Event) => setMenuText((e as CustomEvent<string>).detail);
    window.addEventListener('phlippo:menuhint', h);
    return () => window.removeEventListener('phlippo:menuhint', h);
  }, []);
  const hint = menuText || hint0 || prompt;
  const solve = useActiveSolve();
  const sketch = useActiveSketch();
  const [units, setUnits] = useState(false);
  const msg = st.messages[st.messages.length - 1];
  const sketchName = sketch?.name ?? null;
  const status = sketchStatus(sketch, solve);
  // an assembly: Under / Fully / Over Defined from its mates (QA v0.5.1 F108)
  const asmStatus = useMemo(() => {
    if (st.doc.kind !== 'assembly' || !(st.doc.components ?? []).length) return null;
    const s = Object.values(mateStatus(st.doc.components ?? [], st.doc.mates ?? []).components);
    return s.includes('over') ? 'Over Defined' : s.includes('under') ? 'Under Defined' : 'Fully Defined';
  }, [st.doc]);
  const u = st.doc.units;
  const faceted = st.rebuild.bodies.filter((b) => !b.exact).length;
  const coord = (v: number) => `${Math.round(v * 100) / 100}${u}`;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  // a model face (or two): as the intended status bar, "Area: …mm^2   Perimeter: …", "Diameter: …" on a cylinder,
  // "Normal Distance: …" between two parallel planar faces (memoised: the bar renders on every pointer move)
  const faceReadout = useMemo(() => {
    const refs = st.selectedFaces.length ? st.selectedFaces : st.selectedFace ? [st.selectedFace] : [];
    const found = refs.map((r) => { const b = st.rebuild.bodies.find((x) => x.id === r.bodyId); const f = b?.faces.find((x) => x.id === r.faceId); return b && f ? { b, f } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
    const mm = (v: number) => `${Math.round(v * 100) / 100}${u}`;
    if (found.length === 2 && !found[0].f.curved && !found[1].f.curved) {
      const n = new THREE.Vector3(...found[0].f.normal), m = new THREE.Vector3(...found[1].f.normal);
      if (Math.abs(n.dot(m)) > 0.9999) return `Normal Distance: ${mm(Math.abs(new THREE.Vector3(...found[1].f.centroid).sub(new THREE.Vector3(...found[0].f.centroid)).dot(n)))}`;
      return null;
    }
    if (found.length !== 1) return null;
    const { b, f } = found[0];
    if (f.curved) {
      const c = cylinderOf(b.geometry, f.triangles);
      if (c) return c.full ? `Diameter: ${mm(2 * c.radius)}` : `Radius: ${mm(c.radius)}`;
    }
    return `Area: ${Math.round(f.area * 100) / 100}${u}^2   Perimeter: ${mm(faceMeasure(b.geometry, f.triangles).perimeter)}`;
  }, [st.rebuild, st.selectedFace, st.selectedFaces, u]);
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
      if (c && r !== undefined) readout = `Diameter: ${coord(2 * r)}   Center: ${coord(c.x)}, ${coord(c.y)}, 0${u}`;
    } else if (ents.length === 1 && ents[0].kind === 'arc') {
      const c = sketch.points[ents[0].center], s0 = sketch.points[ents[0].start];
      if (c && s0) readout = `Radius: ${coord(Math.hypot(s0.x - c.x, s0.y - c.y))}   Center: ${coord(c.x)}, ${coord(c.y)}, 0${u}`;
    } else if (pts.length === 2 && !ents.length) {
      const [a, b] = pts;
      readout = `Distance: ${coord(Math.hypot(b.x - a.x, b.y - a.y))}   dX: ${coord(b.x - a.x)}   dY: ${coord(b.y - a.y)}   dZ: 0${u}`;
    } else if (pts.length === 1 && !ents.length) {
      readout = `X: ${coord(pts[0].x)}   Y: ${coord(pts[0].y)}`;
    } else if (ents.length > 1) {
      // several curves: their total length, as the intended status bar; two parallel lines first their normal distance
      let L = 0;
      for (const e of ents) { const q = sampleEntity(sketch, e); for (let i = 1; i < q.length; i++) L += Math.hypot(q[i].x - q[i - 1].x, q[i].y - q[i - 1].y); }
      let nd = '';
      if (ents.length === 2 && ents[0].kind === 'line' && ents[1].kind === 'line') {
        const [a, b] = [sketch.points[ents[0].p1], sketch.points[ents[0].p2]], [c2, d2] = [sketch.points[ents[1].p1], sketch.points[ents[1].p2]];
        if (a && b && c2 && d2) {
          const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(d2.x - c2.x, d2.y - c2.y);
          const cross = ((b.x - a.x) * (d2.y - c2.y) - (b.y - a.y) * (d2.x - c2.x)) / (l1 * l2 || 1);
          if (Math.abs(cross) < 1e-6) nd = `Normal Distance: ${coord(r2(Math.abs((c2.x - a.x) * (b.y - a.y) - (c2.y - a.y) * (b.x - a.x)) / (l1 || 1)))}   `;
        }
      }
      readout = `${nd}Total Length: ${coord(r2(L))}`;
    }
  } else if (!sketch && st.selectedEdges.length) {
    const edges = st.selectedEdges.map((id) => st.rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
    if (edges.length === 1) {
      const e = edges[0];
      if (e.closed && !e.straight) readout = `Radius: ${coord(r2(e.length / (2 * Math.PI)))}   Center: ${coord(r2(e.centroid.x))}, ${coord(r2(e.centroid.y))}, ${coord(r2(e.centroid.z))}`;
      else if (!e.straight && e.points.length >= 3) {
        // an open arc edge shows its radius, as the intended status bar (circle through its ends and middle)
        // (only when every point of the edge lies on that circle: a spline keeps its arc length)
        const [p, q, r] = [e.points[0], e.points[Math.floor(e.points.length / 2)], e.points[e.points.length - 1]];
        const u = p.clone().sub(r), v = q.clone().sub(r), w = u.clone().cross(v);
        const centre = w.lengthSq() > 1e-12 ? r.clone().add(v.clone().multiplyScalar(u.lengthSq()).sub(u.clone().multiplyScalar(v.lengthSq())).cross(w).divideScalar(2 * w.lengthSq())) : null;
        const R = centre ? centre.distanceTo(p) : 0;
        const onCircle = !!centre && e.points.every((x) => Math.abs(x.distanceTo(centre) - R) < Math.max(1e-3, R * 0.01));
        readout = onCircle ? `Radius: ${coord(r2(R))}   Arc length: ${coord(r2(e.length))}` : `Arc length: ${coord(e.length)}`;
      } else readout = `${e.straight ? 'Length' : 'Arc length'}: ${coord(e.length)}`;
    } else if (edges.length === 2 && edges.every((e) => e.straight)) {
      const d = edges[0].centroid.clone().sub(edges[1].centroid);
      readout = `Distance: ${coord(d.length())}   dX: ${coord(Math.abs(d.x))}   dY: ${coord(Math.abs(d.y))}   dZ: ${coord(Math.abs(d.z))}   Total Length: ${coord(r2(edges[0].length + edges[1].length))}`;
    } else if (edges.length > 2) readout = `Total Length: ${coord(r2(edges.reduce((n, e) => n + e.length, 0)))}`;
  } else if (!sketch && faceReadout) readout = faceReadout;
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
      {asmStatus && !st.activeSketchId && <span className={`k-status-cell status ${asmStatus === 'Over Defined' ? 'over' : asmStatus === 'Fully Defined' ? 'full' : 'under'}`} data-testid="status-assembly">{asmStatus}</span>}
      {st.rebuild.pending && (
        // a heavy part rebuilds in the rebuild worker: the window stays usable, the old result stays shown (QA F46)
        <span className="k-status-cell k-status-rebuilding" data-testid="status-rebuilding" title="The part is rebuilding in the background; the model updates when it is done.">
          Rebuilding… <span className="k-status-progress"><span /></span>
        </span>
      )}
      {st.doc.kind !== 'drawing' && faceted > 0 && (
        // bodies the B-rep kernel did not rebuild are shown (and written to STEP) as facets: say so (QA F99)
        <span className="k-status-cell" data-testid="status-faceted" title={`${faceted} of ${st.rebuild.bodies.length} ${st.rebuild.bodies.length === 1 ? 'body is' : 'bodies are'} faceted (mesh kernel), not exact surfaces; STEP writes them as sewn facets.`}>Faceted {faceted}/{st.rebuild.bodies.length}</span>
      )}
      <span className="k-status-cell">{!st.hasDocument ? '' : sketchName ? `Editing ${sketchName}${focusLocked ? ' (Locked Focus)' : ''}` : (st.doc.kind === 'assembly' ? 'Editing Assembly' : st.doc.kind === 'drawing' ? `Editing ${st.doc.sheets?.[0]?.views.find((v) => v.id === st.selectedDrawingViewId)?.name ?? st.doc.sheets?.[0]?.name ?? 'Sheet1'}` : 'Editing Part')}</span>
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
