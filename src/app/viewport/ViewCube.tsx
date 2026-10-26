import { useEffect, useState } from 'react';
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

/** Orientation triad bottom-left: thin coloured axis arrows with small letters, by design. */
export function Triad({ camera }: { camera: CadCamera }) {
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
  const L = 28, c = 46;
  const axes: [string, THREE.Vector3, string][] = [
    ['X', axis(new THREE.Vector3(1, 0, 0)), '#d12f2f'],
    ['Y', axis(new THREE.Vector3(0, 1, 0)), '#2e9a3d'],
    ['Z', axis(new THREE.Vector3(0, 0, 1)), '#2b64d6'],
  ];
  axes.sort((a, b) => a[1].z - b[1].z);
  return (
    <svg className="k-triad" width={92} height={92} viewBox="0 0 92 92">
      {axes.map(([name, v, color]) => {
        if (Math.hypot(v.x, v.y) < 0.12) {
          // axis points at the viewer: draw a small circle with the letter beside it
          return (
            <g key={name}>
              <circle cx={c} cy={c} r={3.5} fill="none" stroke={color} strokeWidth={1.4} />
              <text x={c - 9} y={c + 10} fontSize={9} fontFamily="var(--font-ui)" fill={color}>{name}</text>
            </g>
          );
        }
        const ex = c + v.x * L, ey = c - v.y * L;
        const len = Math.hypot(ex - c, ey - c) || 1;
        const ux = (ex - c) / len, uy = (ey - c) / len;
        const hx = ex - ux * 6, hy = ey - uy * 6;
        const px = -uy * 2.4, py = ux * 2.4;
        const lx = c + v.x * (L + 9), ly = c - v.y * (L + 9);
        return (
          <g key={name}>
            <line x1={c} y1={c} x2={hx} y2={hy} stroke={color} strokeWidth={1.4} />
            <polygon points={`${ex},${ey} ${hx + px},${hy + py} ${hx - px},${hy - py}`} fill={color} />
            <text x={lx} y={ly + 3} fontSize={9} fontFamily="var(--font-ui)" textAnchor="middle" fill={color}>
              {name}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={1.6} fill="#4d5663" />
    </svg>
  );
}
