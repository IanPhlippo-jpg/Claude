import * as THREE from 'three';

/** Binary STL of a triangle geometry (model units, normals recomputed per triangle). */
export function exportStl(g: THREE.BufferGeometry, name = 'phlippo'): ArrayBuffer {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const tris = Math.floor(pos.count / 3);
  const buf = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buf);
  const header = new TextEncoder().encode(`${name} - binary STL`.slice(0, 80));
  new Uint8Array(buf, 0, 80).set(header);
  view.setUint32(80, tris, true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let off = 84;
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    n.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    for (const v of [n, a, b, c]) {
      view.setFloat32(off, v.x, true);
      view.setFloat32(off + 4, v.y, true);
      view.setFloat32(off + 8, v.z, true);
      off += 12;
    }
    view.setUint16(off, 0, true);
    off += 2;
  }
  return buf;
}

/** Triangle positions (flat xyz) of a binary or ASCII STL file. */
export function parseStl(data: ArrayBuffer): number[] {
  const bytes = new Uint8Array(data);
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512)));
  const isBinary = (() => {
    if (bytes.length < 84) return false;
    const n = new DataView(data).getUint32(80, true);
    if (84 + n * 50 === bytes.length) return true;
    return !/^\s*solid/i.test(head) || !/facet/i.test(new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 4096))));
  })();
  const out: number[] = [];
  if (isBinary) {
    const view = new DataView(data);
    const n = view.getUint32(80, true);
    let off = 84;
    for (let t = 0; t < n && off + 50 <= bytes.length; t++) {
      off += 12; // normal
      for (let k = 0; k < 9; k++) {
        out.push(view.getFloat32(off, true));
        off += 4;
      }
      off += 2;
    }
    return out;
  }
  const text = new TextDecoder().decode(bytes);
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  return out.slice(0, out.length - (out.length % 9));
}

/** Geometry from flat triangle positions; an inside-out mesh (negative volume) is flipped outward. */
export function geometryFromPositions(positions: number[]): THREE.BufferGeometry {
  let vol = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const [x0, y0, z0, x1, y1, z1, x2, y2, z2] = positions.slice(i, i + 9);
    vol += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6;
  }
  let pos = positions;
  if (vol < 0) {
    pos = positions.slice();
    for (let i = 0; i + 8 < pos.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const t = pos[i + 3 + k];
        pos[i + 3 + k] = pos[i + 6 + k];
        pos[i + 6 + k] = t;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
