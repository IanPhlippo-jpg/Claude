import { useRef } from 'react';
import * as THREE from 'three';
import { useStore, type Sketch3DEdit } from '../store';
import { endPoints3D, status3D, type P3 } from '../../core/sketch/sketch3d';
import { solved3D } from '../panels/sketch3dSolved';
import type { CadCamera } from './camera';

/** the colour of the lines of the 3D sketch being edited: black when it is fully defined, otherwise the default blue */
export const sketch3DColor = (e: Sketch3DEdit): { color?: string } => (status3D(e.segments, e.relations, e.dims) === 'full' ? { color: '#000000' } : {});

const NORMAL = { xy: new THREE.Vector3(0, 0, 1), yz: new THREE.Vector3(1, 0, 0), zx: new THREE.Vector3(0, 1, 0) } as const;

/**
 * The 3D sketch in the graphics area: the dimensions with their values (a distance with its dashed line) and, once
 * the chain is ended, the end points as drag handles. Dragging an end point moves it on the active plane through it
 * (Tab switches the plane); the relations and dimensions hold through the solver. A click without a drag starts a
 * line there, as a click on the end point does.
 */
export function Sketch3DOverlay({ camera }: { camera: CadCamera }) {
  const e = useStore((s) => s.sketch3dEdit);
  const units = useStore((s) => s.doc.units);
  const drag = useRef<{ from: P3; base: Sketch3DEdit; x: number; y: number; moved: boolean } | null>(null);
  if (!e) return null;
  const px = (p: P3) => camera.worldToPixel(new THREE.Vector3(...p));
  const fmt = (v: number) => `${Math.round(v * 100) / 100}`;
  const target = (ev: React.PointerEvent, from: P3): P3 | null => {
    const r = (ev.currentTarget as Element).closest('svg')!.getBoundingClientRect();
    const ray = camera.pixelToRay(ev.clientX - r.left, ev.clientY - r.top);
    const n = NORMAL[useStore.getState().sketch3dEdit?.plane ?? 'xy'];
    if (Math.abs(ray.direction.dot(n)) < 0.05) return null;
    const hit = ray.intersectPlane(new THREE.Plane(n, -n.dot(new THREE.Vector3(...from))), new THREE.Vector3());
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return hit ? [r2(hit.x), r2(hit.y), r2(hit.z)] : null;
  };
  const onDown = (ev: React.PointerEvent, p: P3) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    (ev.target as Element).setPointerCapture(ev.pointerId);
    drag.current = { from: p, base: useStore.getState().sketch3dEdit!, x: ev.clientX, y: ev.clientY, moved: false };
  };
  const onMove = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d || (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 4)) return;
    d.moved = true;
    const to = target(ev, d.from);
    // each step solved from the sketch as it was when the drag began
    const next = to && solved3D(d.base, { from: d.from, to });
    if (next) useStore.setState({ sketch3dEdit: { ...next, last: useStore.getState().sketch3dEdit?.last ?? null } });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) useStore.getState().add3DPoint([...d.from] as P3);
  };
  return (
    <svg className="k-sketch3d-overlay" data-testid="sketch3d-overlay" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {(e.dims ?? []).map((d, k) => {
        const a = d.kind === 'length' ? e.segments[d.line]?.[0] : e.segments[d.a[0]]?.[d.a[1]];
        const b = d.kind === 'length' ? e.segments[d.line]?.[1] : e.segments[d.b[0]]?.[d.b[1]];
        if (!a || !b) return null;
        const qa = px(a), qb = px(b);
        const m = { x: (qa.x + qb.x) / 2, y: (qa.y + qb.y) / 2 };
        return (
          <g key={k}>
            {d.kind === 'distance' && <line x1={qa.x} y1={qa.y} x2={qb.x} y2={qb.y} stroke="#1e4fd8" strokeDasharray="4 3" strokeWidth={1} />}
            <text x={m.x + 6} y={m.y - 6} fontSize={12} fill="#000" stroke="#fff" strokeWidth={3} paintOrder="stroke" data-testid={`sketch3d-dimlabel-${k}`}>{fmt(d.value)}{units === 'mm' ? '' : units}</text>
          </g>
        );
      })}
      {!e.last && endPoints3D(e.segments).map(({ p }, i) => {
        const q = px(p);
        return <circle key={i} data-testid={`sketch3d-grip-${i}`} cx={q.x} cy={q.y} r={6} fill="transparent" stroke="none" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={(ev) => onDown(ev, p)} onPointerMove={onMove} onPointerUp={onUp} />;
      })}
    </svg>
  );
}
