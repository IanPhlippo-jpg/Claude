import * as THREE from 'three';

/**
 * Mesh export with the options of the Save As ▸ STL/3MF/AMF options page: ASCII or binary STL, unit scaling, output
 * translated to positive space (all coordinates ≥ 0) unless switched off, several bodies in one file.
 */
export interface MeshExportOptions {
  format: 'stl' | '3mf' | 'amf';
  /** STL only: text instead of binary */
  ascii?: boolean;
  /** output unit: coordinates in model units (mm) are converted */
  unit?: 'mm' | 'cm' | 'm' | 'in';
  /** Do not translate STL output data to positive space (default: translated) */
  keepPosition?: boolean;
  /** Save all components of an assembly in a single file (default) or one file per body */
  singleFile?: boolean;
}

const UNIT_SCALE: Record<NonNullable<MeshExportOptions['unit']>, number> = { mm: 1, cm: 0.1, m: 0.001, in: 1 / 25.4 };

interface Tri { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }

/** the triangles of the bodies, scaled and (unless kept) moved so the lowest corner sits at the origin */
export function prepareTriangles(bodies: { geometry: THREE.BufferGeometry; name?: string }[], opts: MeshExportOptions): { tris: Tri[][]; translation: THREE.Vector3; scale: number } {
  const scale = UNIT_SCALE[opts.unit ?? 'mm'];
  const all: Tri[][] = bodies.map((b) => {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const pos = g.getAttribute('position');
    const out: Tri[] = [];
    for (let t = 0; t + 2 < pos.count; t += 3) out.push({ a: new THREE.Vector3().fromBufferAttribute(pos, t).multiplyScalar(scale), b: new THREE.Vector3().fromBufferAttribute(pos, t + 1).multiplyScalar(scale), c: new THREE.Vector3().fromBufferAttribute(pos, t + 2).multiplyScalar(scale) });
    return out;
  });
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  for (const tris of all) for (const t of tris) for (const v of [t.a, t.b, t.c]) min.min(v);
  const translation = opts.keepPosition || !Number.isFinite(min.x) ? new THREE.Vector3() : min.clone().negate();
  if (translation.lengthSq()) for (const tris of all) for (const t of tris) for (const v of [t.a, t.b, t.c]) v.add(translation);
  return { tris: all, translation, scale };
}

export function stlBinary(tris: Tri[], name: string): ArrayBuffer {
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const view = new DataView(buf);
  new Uint8Array(buf, 0, 80).set(new TextEncoder().encode(`${name} - Phlippo CAD binary STL`.slice(0, 80)));
  view.setUint32(80, tris.length, true);
  const n = new THREE.Vector3();
  let off = 84;
  for (const t of tris) {
    n.copy(t.b).sub(t.a).cross(t.c.clone().sub(t.a)).normalize();
    for (const v of [n, t.a, t.b, t.c]) {
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

const f = (x: number) => (Math.abs(x) < 1e-12 ? '0' : x.toPrecision(7).replace(/\.?0+$/, '').replace(/\.?0+e/, 'e'));

export function stlAscii(tris: Tri[], name: string): string {
  const n = new THREE.Vector3();
  const lines = [`solid ${name}`];
  for (const t of tris) {
    n.copy(t.b).sub(t.a).cross(t.c.clone().sub(t.a)).normalize();
    lines.push(`  facet normal ${f(n.x)} ${f(n.y)} ${f(n.z)}`, '    outer loop');
    for (const v of [t.a, t.b, t.c]) lines.push(`      vertex ${f(v.x)} ${f(v.y)} ${f(v.z)}`);
    lines.push('    endloop', '  endfacet');
  }
  lines.push(`endsolid ${name}`, '');
  return lines.join('\n');
}

/** shared vertices (welded by position) for the XML formats */
function indexed(tris: Tri[]): { verts: THREE.Vector3[]; faces: [number, number, number][] } {
  const map = new Map<string, number>();
  const verts: THREE.Vector3[] = [];
  const faces: [number, number, number][] = [];
  const id = (v: THREE.Vector3) => {
    const k = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
    let i = map.get(k);
    if (i === undefined) { i = verts.length; verts.push(v); map.set(k, i); }
    return i;
  };
  for (const t of tris) faces.push([id(t.a), id(t.b), id(t.c)]);
  return { verts, faces };
}

/** AMF 1.2: one object per body, in the chosen unit */
export function amfXml(bodies: Tri[][], names: string[], unit: MeshExportOptions['unit'] = 'mm'): string {
  const amfUnit = unit === 'in' ? 'inch' : unit === 'cm' ? 'millimeter' : unit === 'm' ? 'meter' : 'millimeter';
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<amf unit="${amfUnit}" version="1.2">`];
  bodies.forEach((tris, i) => {
    const { verts, faces } = indexed(tris);
    out.push(`  <object id="${i + 1}">`, `    <metadata type="name">${names[i] ?? `Body${i + 1}`}</metadata>`, '    <mesh>', '      <vertices>');
    for (const v of verts) out.push(`        <vertex><coordinates><x>${f(v.x)}</x><y>${f(v.y)}</y><z>${f(v.z)}</z></coordinates></vertex>`);
    out.push('      </vertices>', '      <volume>');
    for (const [a, b, c] of faces) out.push(`        <triangle><v1>${a}</v1><v2>${b}</v2><v3>${c}</v3></triangle>`);
    out.push('      </volume>', '    </mesh>', '  </object>');
  });
  out.push('</amf>', '');
  return out.join('\n');
}

/** 3MF core: the model XML (3D/3dmodel.model) */
export function threeMfModelXml(bodies: Tri[][], names: string[], unit: MeshExportOptions['unit'] = 'mm'): string {
  const u = unit === 'in' ? 'inch' : unit === 'cm' ? 'centimeter' : unit === 'm' ? 'meter' : 'millimeter';
  const out = [`<?xml version="1.0" encoding="UTF-8"?>`, `<model unit="${u}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">`, '  <metadata name="Application">Phlippo CAD</metadata>', '  <resources>'];
  bodies.forEach((tris, i) => {
    const { verts, faces } = indexed(tris);
    out.push(`    <object id="${i + 1}" name="${(names[i] ?? `Body${i + 1}`).replace(/[<>&"]/g, '')}" type="model">`, '      <mesh>', '        <vertices>');
    for (const v of verts) out.push(`          <vertex x="${f(v.x)}" y="${f(v.y)}" z="${f(v.z)}"/>`);
    out.push('        </vertices>', '        <triangles>');
    for (const [a, b, c] of faces) out.push(`          <triangle v1="${a}" v2="${b}" v3="${c}"/>`);
    out.push('        </triangles>', '      </mesh>', '    </object>');
  });
  out.push('  </resources>', '  <build>');
  bodies.forEach((_, i) => out.push(`    <item objectid="${i + 1}"/>`));
  out.push('  </build>', '</model>', '');
  return out.join('\n');
}

// ---- a minimal ZIP writer (stored, no compression) for the 3MF container ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array }[]): ArrayBuffer {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const dosTime = (d: Date) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dosDate = (d: Date) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  const now = new Date();
  for (const file of files) {
    const name = enc.encode(file.name);
    const crc = crc32(file.data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, dosTime(now), true);
    lv.setUint16(12, dosDate(now), true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime(now), true);
    cv.setUint16(14, dosDate(now), true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);
    parts.push(local, file.data);
    central.push(cd);
    offset += local.length + file.data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const total = offset + cdSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const part of [...parts, ...central, end]) { out.set(part, p); p += part.length; }
  return out.buffer;
}

/** the 3MF package: content types, relationships and the model */
export function threeMf(bodies: Tri[][], names: string[], unit: MeshExportOptions['unit'] = 'mm'): ArrayBuffer {
  const enc = new TextEncoder();
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: '3D/3dmodel.model', data: enc.encode(threeMfModelXml(bodies, names, unit)) },
  ]);
}

/** one export: the file contents (one per body when not a single file) with their names and the triangle count */
export function exportMesh(bodies: { geometry: THREE.BufferGeometry; name: string }[], docName: string, opts: MeshExportOptions): { files: { name: string; data: ArrayBuffer | string; mime: string }[]; triangles: number; translation: THREE.Vector3 } {
  const { tris, translation } = prepareTriangles(bodies, opts);
  const triangles = tris.reduce((s, t) => s + t.length, 0);
  const groups: { tris: Tri[][]; names: string[]; file: string }[] = opts.singleFile === false && bodies.length > 1
    ? bodies.map((b, i) => ({ tris: [tris[i]], names: [b.name], file: `${docName}-${b.name}` }))
    : [{ tris, names: bodies.map((b) => b.name), file: docName }];
  const files = groups.map((g) => {
    if (opts.format === 'stl') {
      const flat = g.tris.flat();
      return opts.ascii ? { name: `${g.file}.stl`, data: stlAscii(flat, g.file), mime: 'model/stl' } : { name: `${g.file}.stl`, data: stlBinary(flat, g.file), mime: 'model/stl' };
    }
    if (opts.format === 'amf') return { name: `${g.file}.amf`, data: amfXml(g.tris, g.names, opts.unit), mime: 'application/x-amf' };
    return { name: `${g.file}.3mf`, data: threeMf(g.tris, g.names, opts.unit), mime: 'model/3mf' };
  });
  return { files, triangles, translation };
}
