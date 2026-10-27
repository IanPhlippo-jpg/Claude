/**
 * A rebuild result over a worker boundary (QA F46): three.js objects lose their class in a structured clone, so the
 * geometries, vectors and matrices are packed into plain data (their typed arrays transferred, not copied) and
 * rebuilt on the other side. Shared objects stay shared.
 */
import * as THREE from 'three';
import type { RebuildResult } from './rebuild';

type Packed = unknown;

interface GeoWire { __geo: { attrs: Record<string, { array: ArrayLike<number>; itemSize: number; normalized: boolean }>; index: ArrayLike<number> | null; groups: { start: number; count: number; materialIndex?: number }[]; name: string } }

export function packRebuild(r: RebuildResult): { wire: Packed; transfer: Transferable[] } {
  const buffers = new Set<ArrayBufferLike>();
  const memo = new Map<object, unknown>();
  const take = (a: ArrayLike<number>) => {
    if (ArrayBuffer.isView(a) && a.buffer instanceof ArrayBuffer) buffers.add(a.buffer);
    return a;
  };
  const pack = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (ArrayBuffer.isView(v)) return v;
    const hit = memo.get(v);
    if (hit !== undefined) return hit;
    const o = v as Record<string, unknown> & { isVector3?: boolean; isVector2?: boolean; isMatrix4?: boolean; isQuaternion?: boolean; isBufferGeometry?: boolean };
    let out: unknown;
    if (o.isVector3) out = { __v3: [(v as THREE.Vector3).x, (v as THREE.Vector3).y, (v as THREE.Vector3).z] };
    else if (o.isVector2) out = { __v2: [(v as THREE.Vector2).x, (v as THREE.Vector2).y] };
    else if (o.isQuaternion) { const q = v as THREE.Quaternion; out = { __q: [q.x, q.y, q.z, q.w] }; }
    else if (o.isMatrix4) out = { __m4: [...(v as THREE.Matrix4).elements] };
    else if (o.isBufferGeometry) {
      const g = v as THREE.BufferGeometry;
      const attrs: GeoWire['__geo']['attrs'] = {};
      for (const [name, a] of Object.entries(g.attributes)) {
        const ba = a as THREE.BufferAttribute;
        attrs[name] = { array: take(ba.array), itemSize: ba.itemSize, normalized: ba.normalized };
      }
      out = { __geo: { attrs, index: g.index ? take(g.index.array) : null, groups: g.groups.map((x) => ({ ...x })), name: g.name } } satisfies GeoWire;
    } else if (v instanceof Set) {
      const s = new Set<unknown>();
      memo.set(v, s);
      for (const x of v) s.add(pack(x));
      return s;
    } else if (v instanceof Map) {
      const m = new Map<unknown, unknown>();
      memo.set(v, m);
      for (const [k, x] of v) m.set(k, pack(x));
      return m;
    } else if (Array.isArray(v)) {
      const a: unknown[] = [];
      memo.set(v, a);
      for (const x of v) a.push(pack(x));
      return a;
    } else {
      const p: Record<string, unknown> = {};
      memo.set(v, p);
      for (const [k, x] of Object.entries(o)) if (typeof x !== 'function') p[k] = pack(x);
      return p;
    }
    memo.set(v, out);
    return out;
  };
  // the B-rep handles live in the kernel of the worker that made them: they never cross
  const { brep: _brep, ...rest } = r;
  const wire = pack(rest);
  return { wire, transfer: [...buffers] as ArrayBuffer[] };
}

export function unpackRebuild(wire: Packed): RebuildResult {
  const memo = new Map<object, unknown>();
  const unpack = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object' || ArrayBuffer.isView(v)) return v;
    const hit = memo.get(v);
    if (hit !== undefined) return hit;
    const o = v as Record<string, unknown>;
    let out: unknown;
    if ('__v3' in o) out = new THREE.Vector3(...(o.__v3 as [number, number, number]));
    else if ('__v2' in o) out = new THREE.Vector2(...(o.__v2 as [number, number]));
    else if ('__q' in o) out = new THREE.Quaternion(...(o.__q as [number, number, number, number]));
    else if ('__m4' in o) out = new THREE.Matrix4().fromArray(o.__m4 as number[]);
    else if ('__geo' in o) {
      const w = (o as unknown as GeoWire).__geo;
      const g = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(w.attrs)) g.setAttribute(name, new THREE.BufferAttribute(a.array as THREE.TypedArray, a.itemSize, a.normalized));
      if (w.index) g.setIndex(new THREE.BufferAttribute(w.index as THREE.TypedArray, 1));
      for (const gr of w.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
      g.name = w.name;
      out = g;
    } else if (v instanceof Set) {
      const s = new Set<unknown>();
      memo.set(v, s);
      for (const x of v) s.add(unpack(x));
      return s;
    } else if (v instanceof Map) {
      const m = new Map<unknown, unknown>();
      memo.set(v, m);
      for (const [k, x] of v) m.set(k, unpack(x));
      return m;
    } else if (Array.isArray(v)) {
      const a: unknown[] = [];
      memo.set(v, a);
      for (const x of v) a.push(unpack(x));
      return a;
    } else {
      const p: Record<string, unknown> = {};
      memo.set(v, p);
      for (const [k, x] of Object.entries(o)) p[k] = unpack(x);
      return p;
    }
    memo.set(v, out);
    return out;
  };
  return unpack(wire) as RebuildResult;
}
