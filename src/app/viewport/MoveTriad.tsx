import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import type { CadCamera } from './camera';

const ORANGE = '#f39c1f';
const AXES: { id: 'x' | 'y' | 'z'; v: [number, number, number]; label: string }[] = [
  { id: 'x', v: [1, 0, 0], label: 'X' },
  { id: 'y', v: [0, 1, 0], label: 'Y' },
  { id: 'z', v: [0, 0, 1], label: 'Z' },
];

/**
 * Move with Triad (component right-click), by design: an orange triad at the component's centre —
 * drag an arrow to move the component along that axis, drag a ring to turn it about the axis; Esc or a click on
 * empty space ends it. Mated components move only within their free degrees of freedom.
 */
export function MoveTriad({ camera, width, height }: { camera: CadCamera; width: number; height: number }) {
  const st = useStore(useShallow((s) => ({ triadComponentId: s.triadComponentId, rebuild: s.rebuild, applyDocument: s.applyDocument, doc: s.doc, moveComponent: s.moveComponent, rotateComponent: s.rotateComponent })));
  const id = st.triadComponentId;
  const [, bump] = useState(0);
  const drag = useRef<{ kind: 'arrow' | 'ring'; axis: 'x' | 'y' | 'z'; x: number; y: number; ang: number } | null>(null);
  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      bump((n) => n + 1);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') useStore.setState({ triadComponentId: null }); };
    window.addEventListener('keydown', key);
    return () => {
      camera.onChange = prev;
      window.removeEventListener('keydown', key);
    };
  }, [camera]);
  const body = id ? st.rebuild.bodies.find((b) => b.id === id) : undefined;
  if (!id || !body) return null;
  body.geometry.computeBoundingBox();
  const centre = body.geometry.boundingBox!.getCenter(new THREE.Vector3());
  const c = camera.worldToPixel(centre);
  const L = 70, R = 46;
  // world length of one screen pixel at the centre
  const wpp = camera.scale;
  const tip = (v: [number, number, number], len: number) => camera.worldToPixel(centre.clone().addScaledVector(new THREE.Vector3(...v), len * wpp));
  const ring = (v: [number, number, number]) => {
    const n = new THREE.Vector3(...v);
    const u = Math.abs(n.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const a = u.clone().cross(n).normalize(), b = n.clone().cross(a).normalize();
    return Array.from({ length: 49 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      const p = camera.worldToPixel(centre.clone().addScaledVector(a, Math.cos(t) * R * wpp).addScaledVector(b, Math.sin(t) * R * wpp));
      return `${p.x},${p.y}`;
    }).join(' ');
  };
  const down = (kind: 'arrow' | 'ring', axis: 'x' | 'y' | 'z') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    st.applyDocument(kind === 'arrow' ? 'Move with Triad' : 'Rotate with Triad', st.doc);
    drag.current = { kind, axis, x: e.clientX, y: e.clientY, ang: Math.atan2(e.clientY - c.y, e.clientX - c.x) };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const ax = AXES.find((a) => a.id === d.axis)!;
    if (d.kind === 'arrow') {
      // the mouse movement along the arrow on the screen, in model units along the axis
      const t = tip(ax.v, L);
      const sx = t.x - c.x, sy = t.y - c.y, sl = Math.hypot(sx, sy) || 1;
      const along = ((e.clientX - d.x) * sx + (e.clientY - d.y) * sy) / sl;
      const dist = (along / sl) * L * wpp;
      if (Math.abs(dist) > 1e-9) st.moveComponent(st.triadComponentId!, [ax.v[0] * dist, ax.v[1] * dist, ax.v[2] * dist]);
      d.x = e.clientX;
      d.y = e.clientY;
    } else {
      // the angle swept around the centre on the screen; its sign follows how the axis faces the viewer
      const ang = Math.atan2(e.clientY - c.y, e.clientX - c.x);
      let da = ang - d.ang;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      const toViewer = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.rotation);
      const sign = new THREE.Vector3(...ax.v).dot(toViewer) >= 0 ? -1 : 1;
      if (Math.abs(da) > 1e-4) st.rotateComponent(st.triadComponentId!, ax.v, (sign * da * 180) / Math.PI);
      d.ang = ang;
    }
  };
  const up = () => { drag.current = null; };
  return (
    <svg className="k-move-triad" data-testid="move-triad" width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }} onPointerMove={move} onPointerUp={up}>
      {AXES.map((a) => <polyline key={'r' + a.id} data-testid={'triad-ring-' + a.id} points={ring(a.v)} fill="none" stroke={ORANGE} strokeWidth={5} strokeOpacity={0.85} style={{ pointerEvents: 'stroke', cursor: 'grab' }} onPointerDown={down('ring', a.id)} />)}
      <circle cx={c.x} cy={c.y} r={R * 0.55} fill="#bfe3f7" fillOpacity={0.75} stroke="none" />
      {AXES.map((a) => {
        const t = tip(a.v, L), lt = tip(a.v, L + 14);
        const dx = t.x - c.x, dy = t.y - c.y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        const hl = 14, hw = 7;
        return (
          <g key={a.id} data-testid={'triad-arrow-' + a.id} style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={down('arrow', a.id)}>
            <line x1={c.x} y1={c.y} x2={t.x - ux * hl} y2={t.y - uy * hl} stroke={ORANGE} strokeWidth={4} />
            <path d={`M${t.x},${t.y} L${t.x - ux * hl - uy * hw},${t.y - uy * hl + ux * hw} L${t.x - ux * hl + uy * hw},${t.y - uy * hl - ux * hw} Z`} fill={ORANGE} stroke="#a85f00" strokeWidth={0.8} />
            <text x={lt.x} y={lt.y + 4} fontSize={12} textAnchor="middle" fill="#333" style={{ pointerEvents: 'none' }}>{a.label}</text>
          </g>
        );
      })}
      <circle cx={c.x} cy={c.y} r={5} fill="#fff" stroke="#3a83fc" strokeWidth={1.5} />
    </svg>
  );
}
