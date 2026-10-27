/**
 * Edit Appearance beyond the colour, in the graphics area: the image laid on the faces by its mapping (box, planar,
 * cylindrical, spherical; size, rotation, mirror), the illumination (diffuse, specular, spread, reflection,
 * transparency, luminous) and the surface finish (polished, brushed, sandblasted, knurled as a bump pattern).
 */
import * as THREE from 'three';
import type { AppearanceProps } from '../../core/document/types';

type Mapping = NonNullable<AppearanceProps['mapping']>;
export const DEFAULT_MAPPING: Mapping = { style: 'box', size: 50, rotation: 0 };
export const DEFAULT_ILLUMINATION: NonNullable<AppearanceProps['illumination']> = { diffuse: 0.8, specular: 0.2, spread: 0.6, reflectivity: 0, transparency: 0, luminous: 0 };

/** texture coordinates in units of one image (mm / size), per the mapping style */
export function mappedUVs(g: THREE.BufferGeometry, m: Mapping): void {
  const pos = g.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const c = box.getCenter(new THREE.Vector3());
  const radius = Math.max(1e-6, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
  const size = Math.max(1e-6, m.size);
  const rot = (m.rotation * Math.PI) / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), n = new THREE.Vector3();
  const idx = g.getIndex();
  const tris = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < tris; t++) {
    const ids = [0, 1, 2].map((k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k));
    a.fromBufferAttribute(pos, ids[0]); b.fromBufferAttribute(pos, ids[1]); cc.fromBufferAttribute(pos, ids[2]);
    n.subVectors(b, a).cross(cc.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    // the seam of a wrapped mapping: the triangle's own angles are kept together
    const ang0 = Math.atan2(a.z - c.z, a.x - c.x);
    for (const i of ids) {
      const x = pos.getX(i) - c.x, y = pos.getY(i) - c.y, z = pos.getZ(i) - c.z;
      let u: number, v: number;
      if (m.style === 'planar') [u, v] = [x, y];
      else if (m.style === 'cylindrical' || m.style === 'spherical') {
        let ang = Math.atan2(z, x);
        if (ang - ang0 > Math.PI) ang -= 2 * Math.PI;
        if (ang0 - ang > Math.PI) ang += 2 * Math.PI;
        u = -ang * radius;
        v = m.style === 'cylindrical' ? y : (Math.PI / 2 - Math.acos(Math.max(-1, Math.min(1, y / Math.max(1e-6, Math.hypot(x, y, z)))))) * radius;
      } else [u, v] = az >= ax && az >= ay ? [x, y] : ax >= ay ? [-z, y] : [x, -z];
      u /= size;
      v /= size;
      if (m.mirrorH) u = -u;
      if (m.mirrorV) v = -v;
      uv[i * 2] = u * cr - v * sr;
      uv[i * 2 + 1] = u * sr + v * cr;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const finishMaps = new Map<string, THREE.CanvasTexture>();
/** a tileable bump pattern of a surface finish */
function finishMap(kind: 'brushed' | 'sandblasted' | 'knurled'): THREE.CanvasTexture {
  const hit = finishMaps.get(kind);
  if (hit) return hit;
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (kind === 'brushed') {
    for (let i = 0; i < 260; i++) {
      const y = rnd() * S, s = Math.floor(90 + rnd() * 80);
      g.strokeStyle = `rgb(${s},${s},${s})`;
      g.lineWidth = 0.5 + rnd();
      g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    }
  } else if (kind === 'sandblasted') {
    const img = g.getImageData(0, 0, S, S);
    for (let i = 0; i < img.data.length; i += 4) { const s = 90 + rnd() * 80; img.data[i] = img.data[i + 1] = img.data[i + 2] = s; }
    g.putImageData(img, 0, 0);
  } else {
    // diamond knurl: two sets of ridges at ±45°
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    for (let k = -S; k <= 2 * S; k += 16) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke();
      g.beginPath(); g.moveTo(k + S, 0); g.lineTo(k, S); g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  finishMaps.set(kind, tex);
  return tex;
}

/**
 * The face material of a body with its appearance applied (a copy; the input stays as it is). getImage gives the
 * texture of an image (loaded once, shared); the geometry gets texture coordinates when an image or a finish needs them.
 */
export function appearanceMaterial(base: THREE.Material, g: THREE.BufferGeometry, ap: AppearanceProps, getImage: (url: string) => THREE.Texture): THREE.Material {
  const m = base.clone() as THREE.MeshPhongMaterial & THREE.MeshStandardMaterial;
  const phong = (m as THREE.Material).type === 'MeshPhongMaterial';
  const il = ap.illumination;
  if (il) {
    m.color.multiplyScalar(0.25 + 0.75 * il.diffuse);
    if (phong) {
      m.specular = new THREE.Color().setScalar(Math.min(1, Math.max(il.specular, il.reflectivity)));
      m.shininess = 2 + (1 - il.spread) * 200;
    } else {
      m.roughness = Math.max(0.02, il.spread);
      m.metalness = il.reflectivity;
    }
    if (il.transparency > 0) {
      m.transparent = true;
      m.opacity = Math.max(0.05, 1 - il.transparency);
      m.depthWrite = il.transparency < 0.5;
    }
    if (il.luminous > 0) m.emissive = m.color.clone().multiplyScalar(il.luminous);
  }
  const finish = ap.finish ?? 'none';
  if (finish === 'polished') {
    if (phong) { m.shininess = 180; m.specular = new THREE.Color().setScalar(0.7); }
    else m.roughness = 0.08;
  }
  if (ap.image || (finish !== 'none' && finish !== 'polished')) mappedUVs(g, ap.mapping ?? DEFAULT_MAPPING);
  if (ap.image) {
    m.map = getImage(ap.image);
    m.color.setScalar(il ? 0.25 + 0.75 * il.diffuse : 1);
  }
  if (finish === 'brushed' || finish === 'sandblasted' || finish === 'knurled') {
    const bump = finishMap(finish).clone();
    bump.needsUpdate = true;
    // the pattern keeps its own fine size (a few mm), whatever the image size
    const k = (ap.mapping ?? DEFAULT_MAPPING).size / (finish === 'knurled' ? 6 : 12);
    bump.repeat.set(k, k);
    m.bumpMap = bump;
    m.bumpScale = finish === 'knurled' ? 1.2 : 0.35;
    if (phong) m.shininess = finish === 'brushed' ? 60 : 12;
    else m.roughness = finish === 'brushed' ? 0.35 : 0.7;
  }
  m.needsUpdate = true;
  return m;
}
