// Reference planes in the graphics area, by design: a thin
// blue-violet outline with a barely visible fill and the plane's name lying on the plane itself (it turns with the
// plane); the selected plane in sky blue with round handles on its corners and edge middles; the plane under the
// pointer in the highlight colour. No centre lines.
import * as THREE from 'three';

export type PlaneState = 'normal' | 'hover' | 'selected';

const LOOK = {
  light: { normal: { edge: '#7c7ab8', text: '#5d5aa8', fill: '#c8d3ec', fillOpacity: 0.12 }, selected: { edge: '#5ea6e0', text: '#7fb2df', fill: '#cfe3f6', fillOpacity: 0.14 } },
  dark: { normal: { edge: '#8f8dd6', text: '#a9a7ee', fill: '#3a4566', fillOpacity: 0.18 }, selected: { edge: '#6cb6f2', text: '#8cc6f4', fill: '#2c4a66', fillOpacity: 0.2 } },
};

const textures = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();
/** the plane's name as a texture (wide letter spacing), cached per text and colour */
function labelTexture(text: string, color: string): { tex: THREE.CanvasTexture; aspect: number } {
  const key = text + '|' + color;
  const hit = textures.get(key);
  if (hit) return hit;
  const px = 64, pad = 8; // semibold: the name reads at a glance
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = `600 ${px}px "Century Gothic", "Segoe UI", Arial, sans-serif`;
  g.font = font;
  const spacing = px * 0.12;
  const w = Math.ceil([...text].reduce((s, ch) => s + g.measureText(ch).width + spacing, 0)) + pad * 2;
  c.width = w;
  c.height = Math.ceil(px * 1.3);
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  let x = pad;
  for (const ch of text) { g.fillText(ch, x, c.height / 2); x += g.measureText(ch).width + spacing; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const out = { tex, aspect: c.width / c.height };
  textures.set(key, out);
  return out;
}

let dotTexture: THREE.CanvasTexture | null = null;
/** a round handle: a filled disc with a lighter centre */
function dot(): THREE.CanvasTexture {
  if (dotTexture) return dotTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(13, 12, 2, 16, 16, 15);
  grad.addColorStop(0, '#d8ecfb');
  grad.addColorStop(0.55, '#5ea6e0');
  grad.addColorStop(1, '#3f86c4');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fill();
  dotTexture = new THREE.CanvasTexture(c);
  dotTexture.colorSpace = THREE.SRGBColorSpace;
  return dotTexture;
}

/**
 * Adds one reference plane to the group: half sizes s (along u) and h (along v) in world units, centred on the plane
 * origin; `scale` is world units per pixel (the label is about 15 px high, the handles 7 px).
 */
export function addReferencePlane(group: THREE.Group, b: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }, s: number, h: number, state: PlaneState, name: string, scale: number, dark: boolean, hoverColor: THREE.Color): void {
  const look = (dark ? LOOK.dark : LOOK.light)[state === 'selected' ? 'selected' : 'normal'];
  const at = (a: number, c: number) => b.o.clone().addScaledVector(b.u, a).addScaledVector(b.v, c);
  const corners = [at(-s, -h), at(s, -h), at(s, h), at(-s, h)];
  const edge = state === 'hover' ? hoverColor : new THREE.Color(look.edge);
  // a barely visible fill (it still shows which side is the plane where planes cross)
  const fill = new THREE.BufferGeometry();
  fill.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((c) => [c.x, c.y, c.z]), 3));
  fill.setIndex([0, 1, 2, 0, 2, 3]);
  const fillMesh = new THREE.Mesh(fill, new THREE.MeshBasicMaterial({ color: state === 'hover' ? hoverColor : new THREE.Color(look.fill), transparent: true, opacity: state === 'hover' ? 0.1 : look.fillOpacity, side: THREE.DoubleSide, depthWrite: false }));
  fillMesh.name = 'plane-fill';
  group.add(fillMesh);
  const outline = new THREE.BufferGeometry();
  outline.setAttribute('position', new THREE.Float32BufferAttribute([...corners, corners[0]].flatMap((c) => [c.x, c.y, c.z]), 3));
  group.add(new THREE.Line(outline, new THREE.LineBasicMaterial({ color: edge })));
  // the name on the plane, at the corner (-u, +v), reading along +u
  const lt = labelTexture(name, state === 'hover' ? '#' + hoverColor.getHexString() : look.text);
  const lh = 17 * scale, lw = lh * lt.aspect, m = 5 * scale;
  const q = new THREE.PlaneGeometry(lw, lh);
  const label = new THREE.Mesh(q, new THREE.MeshBasicMaterial({ map: lt.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  // the name always reads left to right and upright on screen: it runs along +u or -u and stands along +v or -v,
  // from the plane corner that is then its upper left
  const u = b.u.clone().normalize(), v = b.v.clone().normalize();
  label.matrixAutoUpdate = false;
  label.renderOrder = 2;
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  label.onBeforeRender = (_r, _s, camera) => {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const fu = u.dot(right) < 0 ? -1 : 1, fv = v.dot(up) < 0 ? -1 : 1;
    const du = u.clone().multiplyScalar(fu), dv = v.clone().multiplyScalar(fv);
    const centre = at(fu * (-s + m + lw / 2), fv * (h - m - lh / 2));
    label.matrix.makeBasis(du, dv, du.clone().cross(dv)).setPosition(centre);
    label.matrixWorld.multiplyMatrices(group.matrixWorld, label.matrix);
  };
  group.add(label);
  // the selected plane: round handles on the corners and the middles of the edges
  if (state === 'selected') {
    const pts = [...corners, at(0, -h), at(s, 0), at(0, h), at(-s, 0)];
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    const handles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 8, sizeAttenuation: false, map: dot(), transparent: true, alphaTest: 0.3, depthTest: false }));
    handles.renderOrder = 3;
    group.add(handles);
  }
}
