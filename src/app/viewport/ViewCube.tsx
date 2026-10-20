import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CadCamera, StandardView } from './camera';

/** CSS-3D orientation cube; faces click to standard views, arrows rotate in 15° steps. */
export function ViewCube({ camera }: { camera: CadCamera }) {
  const [q, setQ] = useState(() => camera.rotation.clone());
  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      setQ(camera.rotation.clone());
    };
    return () => {
      camera.onChange = prev;
    };
  }, [camera]);
  // the cube shows the world rotated by the inverse camera rotation
  const inv = q.clone().invert();
  const m = new THREE.Matrix4().makeRotationFromQuaternion(inv);
  const e = m.elements;
  // CSS matrix3d is column-major like three.js; flip y for CSS (y down)
  const css = `matrix3d(${e[0]},${-e[1]},${e[2]},0, ${-e[4]},${e[5]},${-e[6]},0, ${e[8]},${-e[9]},${e[10]},0, 0,0,0,1)`;
  const S = 56;
  const face = (view: StandardView, label: string, transform: string) => (
    <div
      key={view}
      className="k-cube-face"
      style={{ transform: `${transform} translateZ(${S / 2}px)` }}
      onClick={() => camera.setView(view)}
      title={label}
    >
      {label}
    </div>
  );
  return (
    <div className="k-viewcube">
      <button className="k-cube-arrow up" onClick={() => camera.rotateStep('x', 15)} title="Roteer 15° (Shift: 90°)">▲</button>
      <div className="k-cube-row">
        <button className="k-cube-arrow" onClick={() => camera.rotateStep('y', 15)} title="Roteer 15°">◀</button>
        <div className="k-cube-stage" style={{ width: S, height: S }}>
          <div className="k-cube" style={{ transform: css, width: S, height: S }}>
            {face('front', 'VOOR', 'rotateY(0deg)')}
            {face('back', 'ACHTER', 'rotateY(180deg)')}
            {face('right', 'RECHTS', 'rotateY(90deg)')}
            {face('left', 'LINKS', 'rotateY(-90deg)')}
            {face('top', 'BOVEN', 'rotateX(90deg)')}
            {face('bottom', 'ONDER', 'rotateX(-90deg)')}
          </div>
        </div>
        <button className="k-cube-arrow" onClick={() => camera.rotateStep('y', -15)} title="Roteer 15°">▶</button>
      </div>
      <div className="k-cube-row">
        <button className="k-cube-arrow" onClick={() => camera.rotateStep('z', 15)} title="Rol 15°">↺</button>
        <button className="k-cube-arrow" onClick={() => camera.rotateStep('x', -15)} title="Roteer 15°">▼</button>
        <button className="k-cube-arrow" onClick={() => camera.rotateStep('z', -15)} title="Rol 15°">↻</button>
      </div>
      <button className="k-cube-iso" onClick={() => camera.setView('isometric')} title="Isometrisch (Ctrl+7)">ISO</button>
    </div>
  );
}

/** Orientation triad bottom-left: projected world axes. */
export function Triad({ camera }: { camera: CadCamera }) {
  const ref = useRef<SVGSVGElement>(null);
  const [q, setQ] = useState(() => camera.rotation.clone());
  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      setQ(camera.rotation.clone());
    };
    return () => {
      camera.onChange = prev;
    };
  }, [camera]);
  const inv = q.clone().invert();
  const axis = (v: THREE.Vector3) => v.applyQuaternion(inv);
  const L = 26, c = 34;
  const axes: [string, THREE.Vector3, string][] = [
    ['X', axis(new THREE.Vector3(1, 0, 0)), 'var(--sk-axis-x)'],
    ['Y', axis(new THREE.Vector3(0, 1, 0)), 'var(--sk-axis-y)'],
    ['Z', axis(new THREE.Vector3(0, 0, 1)), 'var(--sk-axis-z)'],
  ];
  axes.sort((a, b) => a[1].z - b[1].z);
  return (
    <svg ref={ref} className="k-triad" width={68} height={68} viewBox="0 0 68 68">
      {axes.map(([name, v, color]) => (
        <g key={name}>
          <line x1={c} y1={c} x2={c + v.x * L} y2={c - v.y * L} stroke={color} strokeWidth={2} strokeLinecap="round" />
          <circle cx={c + v.x * L * 1.25} cy={c - v.y * L * 1.25} r={6.5} fill={color} />
          <text x={c + v.x * L * 1.25} y={c - v.y * L * 1.25 + 3.5} fontSize={9} fontWeight={700} textAnchor="middle" fill="#fff">
            {name}
          </text>
        </g>
      ))}
    </svg>
  );
}
