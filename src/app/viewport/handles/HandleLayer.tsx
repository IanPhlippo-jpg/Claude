import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { isCommandActive, rebuildFor, solveAll, useStore, whenRebuilt, type State } from '../../store';
import { bridge } from '../bridge';
import { formatValue, roundValue, rulerTicks, screenAxis, type ModelHandle, type Project } from './handleMath';
import { handlesFor, type HandleSet } from './modelHandles';
import { findSnap, snapScene, type SnapHit, type SnapScene } from './snapGeometry';

/**
 * The drag handles on the model and their drag, by design: pressing an arrow and moving the pointer along it changes
 * the value, rounded to the ruler increment (Alt: the fine increment); the model follows live (the document is
 * rebuilt as the value changes, without an undo step), the ruler beside the arrow shows the value, and the pointer
 * over a vertex, an edge or a parallel face snaps the value to that geometry (marked on the ruler and on the model).
 * Releasing makes one undo step (Drag Handles); a Blind end released on a parallel face becomes Up To Surface; Esc
 * puts everything back as it was before the drag.
 */
interface Drag {
  h: ModelHandle;
  layer: HandleSet['layer'];
  x: number;
  y: number;
  ux: number;
  uy: number;
  pxPerMm: number;
  value: number;
  text?: string;
  snap: SnapHit | null;
}
interface Base { doc: State['doc']; rebuild: State['rebuild']; solve: State['solve']; selectedFace: State['selectedFace']; scene: SnapScene | null; frame: number }

const BLUE = '#1f4fa8';

export function HandleLayer({ project }: { project: Project }) {
  const st = useStore(useShallow((s) => ({ dragHandles: s.dragHandles, busy: isCommandActive(s) || !!s.activeSketchId, doc: s.doc, rebuild: s.rebuild, selectedFace: s.selectedFace,
    selectedFeatureId: s.selectedFeatureId })));
  const [drag, setDrag] = useState<Drag | null>(null);
  const base = useRef<Base | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const set = useMemo(() => (st.dragHandles && !st.busy ? handlesFor(st.doc, st.rebuild, st.selectedFace, st.selectedFeatureId) : null), [st.dragHandles, st.busy, st.doc, st.rebuild,
    st.selectedFace, st.selectedFeatureId]);

  /** back to the state before the drag (Esc, or before the one undo step of the release) */
  const restore = (b: Base, pick = true) => {
    cancelAnimationFrame(b.frame);
    useStore.setState({ doc: b.doc, rebuild: b.rebuild, solve: b.solve, selectedFace: pick ? b.selectedFace : null });
  };
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !base.current) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      restore(base.current);
      base.current = null;
      setDrag(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [drag]);

  if (!drag && !set) return null;
  if (!st.dragHandles && !drag) return null;
  const handles = drag ? [drag.h] : set!.handles;
  const layer = drag ? drag.layer : set!.layer;

  const onDown = (h: ModelHandle) => (e: React.PointerEvent) => {
    const ax = screenAxis(project, h.anchor, h.dir);
    if (!ax || !set) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const s = useStore.getState();
    base.current = { doc: s.doc, rebuild: s.rebuild, solve: s.solve, selectedFace: s.selectedFace, scene: h.snap ? snapScene(s.rebuild.bodies, h) : null, frame: 0 };
    // the picked face is rebuilt under the preview: it is picked again on the result after the release
    useStore.setState({ selectedFace: null });
    setDrag({ h, layer: set.layer, x: e.clientX, y: e.clientY, ...ax, value: h.value, snap: null });
  };
  const onMove = (e: React.PointerEvent) => {
    const b = base.current;
    if (!drag || !b) return;
    const h = drag.h;
    const along = ((e.clientX - drag.x) * drag.ux + (e.clientY - drag.y) * drag.uy) / drag.pxPerMm;
    let snap: SnapHit | null = null;
    const cam = bridge.camera, r = svg.current?.getBoundingClientRect();
    if (b.scene && cam && r) snap = findSnap(b.scene, h, e.clientX - r.left, e.clientY - r.top, project, (x, y) => cam.pixelToRay(x, y));
    const v = snap ? roundValue(snap.value, h, false, true) : roundValue(h.toValue(along), h, e.altKey);
    if (Math.abs(v - drag.value) < 1e-9) {
      // the same value: only the snap mark follows the pointer (along an edge, across a face)
      if (snap?.kind !== drag.snap?.kind || (snap && drag.snap && snap.point.distanceTo(drag.snap.point) > 1e-6)) setDrag({ ...drag, snap });
      return;
    }
    const res = h.apply(b.doc, v, null);
    // a value the feature cannot take (a sketch that would not solve) leaves the preview at the last one that did
    if (!res) return;
    setDrag({ ...drag, value: v, text: res.text, snap });
    cancelAnimationFrame(b.frame);
    b.frame = requestAnimationFrame(() => useStore.setState({ doc: res.doc, rebuild: rebuildFor(res.doc, useStore.getState().rollbackIndex) }));
  };
  const onUp = () => {
    const b = base.current;
    base.current = null;
    if (!drag || !b) return;
    setDrag(null);
    const h = drag.h;
    const face = drag.snap?.kind === 'face' && h.snap?.surface ? drag.snap.face ?? null : null;
    const res = Math.abs(drag.value - h.value) < 1e-9 && !face ? null : h.apply(b.doc, drag.value, face);
    restore(b, !res);
    if (!res) return;
    const s = useStore.getState();
    s.applyDocument('Drag Handles', res.doc);
    if (h.sketchId) useStore.setState({ solve: solveAll(useStore.getState().doc, s.solve, h.sketchId).solve });
    // the picked face again: the face with the same normal on the plane it was moved to
    const sel = b.selectedFace && b.rebuild.bodies.find((x) => x.id === b.selectedFace!.bodyId)?.faces.find((x) => x.id === b.selectedFace!.faceId);
    if (sel && h.kind !== 'value') {
      const n = new THREE.Vector3(...sel.normal).normalize();
      const p = new THREE.Vector3(...sel.centroid).addScaledVector(h.dir, h.toOffset(drag.value));
      whenRebuilt(useStore.getState().rebuild, (rb) => {
        let best: { d: number; id: { bodyId: string; faceId: string } } | null = null;
        for (const body of rb.bodies) for (const f of body.faces) {
          if (f.curved || new THREE.Vector3(...f.normal).dot(n) < 0.999 || Math.abs(new THREE.Vector3(...f.centroid).sub(p).dot(n)) > 1e-3) continue;
          const d = new THREE.Vector3(...f.centroid).distanceTo(p);
          if (!best || d < best.d) best = { d, id: { bodyId: body.id, faceId: f.id } };
        }
        if (best && useStore.getState().selectedFace === null) useStore.setState({ selectedFace: best.id });
      });
    }
  };

  const primary = handles[0];
  const pAx = screenAxis(project, primary.anchor, primary.dir);
  const perUnit = (h: ModelHandle, pxPerMm: number) => Math.abs(h.toOffset(h.value + 1) - h.toOffset(h.value)) * pxPerMm;
  return (
    <svg ref={svg} className="k-dragHandles" data-testid={layer} data-feature={set?.featureType ?? ''} data-ux={pAx?.ux} data-uy={pAx?.uy}
      data-px-per-unit={pAx ? perUnit(primary, pAx.pxPerMm) : undefined}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag && <Ruler drag={drag} project={project} layer={layer} />}
      {handles.map((h, i) => {
        const ax = drag ?? screenAxis(project, h.anchor, h.dir);
        if (!ax) return null;
        const p0 = project(h.anchor);
        const off = drag ? h.toOffset(drag.value) * ax.pxPerMm : 0;
        const bx = p0.x + ax.ux * off, by = p0.y + ax.uy * off;
        const len = h.kind === 'profile' ? 30 : 48;
        const tip = { x: bx + ax.ux * len, y: by + ax.uy * len };
        const col = drag ? '#c623c6' : h.kind === 'profile' ? '#2f6fb8' : BLUE;
        const w = h.kind === 'profile' ? 4 : 5;
        return (
          <g key={h.key} data-key={h.key}>
            <line x1={bx} y1={by} x2={tip.x - ax.ux * 9} y2={tip.y - ax.uy * 9} stroke={col} strokeWidth={h.kind === 'profile' ? 2 : 2.5} />
            {h.kind === 'profile' && <circle cx={bx} cy={by} r={2.5} fill={col} />}
            <path d={`M${tip.x},${tip.y}L${tip.x - ax.ux * 11 - ax.uy * w},${tip.y - ax.uy * 11 + ax.ux * w}L${tip.x - ax.ux * 11 + ax.uy * w},${tip.y - ax.uy * 11 - ax.ux * w}Z`} fill={col} />
            <circle className="k-dragHandles-grip" data-testid={i === 0 ? `${layer}-grip` : `${layer}-grip-${h.key}`} data-key={h.key} data-ux={ax.ux} data-uy={ax.uy}
              data-px-per-unit={perUnit(h, ax.pxPerMm)}
              cx={tip.x} cy={tip.y} r={7} fill="rgba(31,79,168,0.15)" stroke="none" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={onDown(h)} onPointerMove={onMove}
                onPointerUp={onUp} />
          </g>
        );
      })}
    </svg>
  );
}

/** the ruler beside the dragged arrow: ticks in value units, numbers on every fifth, the snap and the readout */
function Ruler({ drag, project, layer }: { drag: Drag; project: Project; layer: string }) {
  const h = drag.h;
  const p0 = project(h.anchor);
  const nx = -drag.uy, ny = drag.ux;
  const at = (v: number) => {
    const o = h.toOffset(v) * drag.pxPerMm;
    return { x: p0.x + drag.ux * o + nx * 12, y: p0.y + drag.uy * o + ny * 12 };
  };
  const pxPerUnit = Math.abs(h.toOffset(h.value + 1) - h.toOffset(h.value)) * drag.pxPerMm;
  const lo0 = Math.min(h.value, drag.value), hi0 = Math.max(h.value, drag.value);
  const margin = 60 / Math.max(pxPerUnit, 1e-9);
  // a value that cannot go below zero is measured from zero (a depth from the sketch plane), else around the drag
  const lo = h.min >= 0 ? 0 : lo0 - margin, hi = Math.min(h.max, hi0 + margin);
  const ticks = h.linear ? rulerTicks(pxPerUnit, lo, hi) : [];
  const a = at(lo), b = at(hi);
  const off = h.toOffset(drag.value) * drag.pxPerMm;
  const tip = { x: p0.x + drag.ux * (off + (h.kind === 'profile' ? 30 : 48)), y: p0.y + drag.uy * (off + (h.kind === 'profile' ? 30 : 48)) };
  const text = drag.text ?? formatValue(drag.value, h.unit);
  const sp = drag.snap ? project(drag.snap.point) : null, sv = drag.snap ? at(drag.snap.value) : null;
  return (
    <g className="k-dragHandles-ruler" data-testid={`${layer}-ruler`}>
      {h.linear && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2b2b2b" strokeWidth={1} />}
      {ticks.map((t) => {
        const q = at(t.v), L = t.major ? 8 : 4;
        return (
          <g key={t.v}>
            <line x1={q.x} y1={q.y} x2={q.x + nx * L} y2={q.y + ny * L} stroke="#2b2b2b" strokeWidth={1} />
            {t.major && <text x={q.x + nx * 18} y={q.y + ny * 18 + 4} fontSize={10} textAnchor="middle" fill="#2b2b2b">{Number(t.v.toFixed(2))}</text>}
          </g>
        );
      })}
      {drag.snap && sp && sv && (
        <g data-testid={`${layer}-snap`} data-kind={drag.snap.kind}>
          <line x1={sv.x - nx * 4} y1={sv.y - ny * 4} x2={sv.x + nx * 12} y2={sv.y + ny * 12} stroke="#e8771c" strokeWidth={2.5} />
          {drag.snap.kind === 'vertex' ? <rect x={sp.x - 5} y={sp.y - 5} width={10} height={10} fill="none" stroke="#e8771c" strokeWidth={2} />
            : drag.snap.kind === 'edge' ? <path d={`M${sp.x},${sp.y - 6}L${sp.x + 6},${sp.y}L${sp.x},${sp.y + 6}L${sp.x - 6},${sp.y}Z`} fill="none" stroke="#e8771c" strokeWidth={2} />
            : <circle cx={sp.x} cy={sp.y} r={6} fill="none" stroke="#e8771c" strokeWidth={2} />}
        </g>
      )}
      <rect x={tip.x + 8} y={tip.y - 10} width={Math.max(64, text.length * 6.5 + 8)} height={18} fill="#ffffe1" stroke={drag.snap ? '#e8771c' : '#7a7a7a'} />
      <text x={tip.x + 8 + Math.max(64, text.length * 6.5 + 8) / 2} y={tip.y + 3} fontSize={11} textAnchor="middle" fill="#000" data-testid={`${layer}-value`}>{text}</text>
    </g>
  );
}
