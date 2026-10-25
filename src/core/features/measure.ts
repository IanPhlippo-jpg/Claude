import * as THREE from 'three';

/** Mass properties of a closed triangle mesh (units of the model: mm, density in g/mm³). */
export interface MassProperties {
  volume: number;
  area: number;
  mass: number;
  density: number;
  centroid: THREE.Vector3;
  /** inertia tensor about the origin (mass units × mm²) */
  inertiaOrigin: number[][];
  /** inertia tensor about the centre of mass */
  inertiaCentroid: number[][];
  /** principal axes (unit vectors) and principal moments about the centre of mass */
  principalAxes: THREE.Vector3[];
  principalMoments: number[];
  bounds: THREE.Box3;
}

/**
 * Volume, centroid and inertia of a closed mesh with the divergence theorem over its
 * triangles (signed tetrahedra from the origin): exact for the polyhedron.
 */
export function massProperties(g: THREE.BufferGeometry, density = 0.001): MassProperties {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  let vol = 0, area = 0;
  const c = new THREE.Vector3();
  // second moments about the origin: integrals of x², y², z², xy, yz, zx
  let ixx = 0, iyy = 0, izz = 0, ixy = 0, iyz = 0, izx = 0;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), n = new THREE.Vector3();
  const bounds = new THREE.Box3();
  const X = (p: THREE.Vector3) => p.x, Y = (p: THREE.Vector3) => p.y, Z = (p: THREE.Vector3) => p.z;
  for (let i = 0; i + 2 < a.count; i += 3) {
    p0.fromBufferAttribute(a, i);
    p1.fromBufferAttribute(a, i + 1);
    p2.fromBufferAttribute(a, i + 2);
    bounds.expandByPoint(p0).expandByPoint(p1).expandByPoint(p2);
    n.copy(p1).sub(p0).cross(p2.clone().sub(p0));
    area += n.length() / 2;
    // signed volume of the tetrahedron (origin, p0, p1, p2)
    const v = p0.dot(n) / 6;
    vol += v;
    // centroid of the tetrahedron is the mean of its four vertices (origin included)
    c.addScaledVector(p0.clone().add(p1).add(p2), v / 4);
    // second moment ∫ u·w dV of the tetrahedron: V/20 · (Σ u_i w_i + (Σ u_i)(Σ w_i)) over its three non-origin vertices
    const f = (u: (p: THREE.Vector3) => number, w: (p: THREE.Vector3) => number) => {
      const su = u(p0) + u(p1) + u(p2), sw = w(p0) + w(p1) + w(p2);
      return (v / 20) * (u(p0) * w(p0) + u(p1) * w(p1) + u(p2) * w(p2) + su * sw);
    };
    ixx += f(X, X);
    iyy += f(Y, Y);
    izz += f(Z, Z);
    ixy += f(X, Y);
    iyz += f(Y, Z);
    izx += f(Z, X);
  }
  const sign = vol < 0 ? -1 : 1;
  vol *= sign;
  c.multiplyScalar(sign / (vol || 1));
  const m = vol * density;
  // inertia tensor from the second moments (per unit density), then scaled by density
  const s = sign * density;
  const inertiaOrigin = [
    [s * (iyy + izz), -s * ixy, -s * izx],
    [-s * ixy, s * (ixx + izz), -s * iyz],
    [-s * izx, -s * iyz, s * (ixx + iyy)],
  ];
  // parallel axis theorem to the centre of mass
  const inertiaCentroid = [
    [inertiaOrigin[0][0] - m * (c.y * c.y + c.z * c.z), inertiaOrigin[0][1] + m * c.x * c.y, inertiaOrigin[0][2] + m * c.x * c.z],
    [inertiaOrigin[1][0] + m * c.x * c.y, inertiaOrigin[1][1] - m * (c.x * c.x + c.z * c.z), inertiaOrigin[1][2] + m * c.y * c.z],
    [inertiaOrigin[2][0] + m * c.x * c.z, inertiaOrigin[2][1] + m * c.y * c.z, inertiaOrigin[2][2] - m * (c.x * c.x + c.y * c.y)],
  ];
  const { values, vectors } = symmetricEigen(inertiaCentroid);
  return { volume: vol, area, mass: m, density, centroid: c, inertiaOrigin, inertiaCentroid, principalAxes: vectors, principalMoments: values, bounds };
}

/** Eigenvalues/vectors of a symmetric 3×3 matrix (Jacobi rotations), sorted ascending. */
/** Mass properties of several bodies together (an assembly): sums, mass-weighted centre, inertia by the parallel axis theorem. */
export function combineMassProperties(list: MassProperties[]): MassProperties | null {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  let mass = 0, volume = 0, area = 0;
  const c = new THREE.Vector3();
  const inertiaOrigin = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const bounds = new THREE.Box3();
  for (const m of list) {
    mass += m.mass;
    volume += m.volume;
    area += m.area;
    c.addScaledVector(m.centroid, m.mass);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) inertiaOrigin[i][j] += m.inertiaOrigin[i][j];
    bounds.union(m.bounds);
  }
  if (mass > 0) c.divideScalar(mass);
  const inertiaCentroid = [
    [inertiaOrigin[0][0] - mass * (c.y * c.y + c.z * c.z), inertiaOrigin[0][1] + mass * c.x * c.y, inertiaOrigin[0][2] + mass * c.x * c.z],
    [inertiaOrigin[1][0] + mass * c.x * c.y, inertiaOrigin[1][1] - mass * (c.x * c.x + c.z * c.z), inertiaOrigin[1][2] + mass * c.y * c.z],
    [inertiaOrigin[2][0] + mass * c.x * c.z, inertiaOrigin[2][1] + mass * c.y * c.z, inertiaOrigin[2][2] - mass * (c.x * c.x + c.y * c.y)],
  ];
  const { values, vectors } = symmetricEigen(inertiaCentroid);
  return { volume, area, mass, density: volume > 0 ? mass / volume : list[0].density, centroid: c, inertiaOrigin, inertiaCentroid, principalAxes: vectors, principalMoments: values, bounds };
}

export function symmetricEigen(m: number[][]): { values: number[]; vectors: THREE.Vector3[] } {
  const a = m.map((r) => r.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-18) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(a[p][q]) < 1e-30) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = cs * akp - sn * akq;
        a[k][q] = sn * akp + cs * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = cs * apk - sn * aqk;
        a[q][k] = sn * apk + cs * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = cs * vkp - sn * vkq;
        v[k][q] = sn * vkp + cs * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => new THREE.Vector3(v[0][i], v[1][i], v[2][i]).normalize()) };
}

/** Shortest distance between two polylines (segment to segment). */
export function polylineDistance(a: THREE.Vector3[], b: THREE.Vector3[]): { distance: number; pa: THREE.Vector3; pb: THREE.Vector3 } {
  let best = { distance: Infinity, pa: a[0].clone(), pb: b[0].clone() };
  const sa = a.length > 1 ? a : [a[0], a[0]];
  const sb = b.length > 1 ? b : [b[0], b[0]];
  for (let i = 0; i + 1 < sa.length; i++) for (let j = 0; j + 1 < sb.length; j++) {
    const r = segmentDistance(sa[i], sa[i + 1], sb[j], sb[j + 1]);
    if (r.distance < best.distance) best = r;
  }
  return best;
}

/** Closest points of two segments. */
export function segmentDistance(p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3): { distance: number; pa: THREE.Vector3; pb: THREE.Vector3 } {
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s = 0, t = 0;
  const EPS = 1e-12;
  if (a <= EPS && e <= EPS) { s = t = 0; }
  else if (a <= EPS) { t = clamp(f / e); }
  else {
    const c = d1.dot(r);
    if (e <= EPS) s = clamp(-c / a);
    else {
      const b = d1.dot(d2), denom = a * e - b * b;
      s = denom !== 0 ? clamp((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a); }
      else if (t > 1) { t = 1; s = clamp((b - c) / a); }
    }
  }
  const pa = p1.clone().addScaledVector(d1, s), pb = p2.clone().addScaledVector(d2, t);
  return { distance: pa.distanceTo(pb), pa, pb };
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Area and perimeter of a set of triangles of a geometry (perimeter = edges used once). */
export function faceMeasure(g: THREE.BufferGeometry, triangles: number[]): { area: number; perimeter: number } {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  let area = 0;
  const edges = new Map<string, { count: number; len: number }>();
  const key = (p: THREE.Vector3) => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
  for (const t of triangles) {
    const p = [P(t * 3), P(t * 3 + 1), P(t * 3 + 2)];
    area += p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).length() / 2;
    for (let i = 0; i < 3; i++) {
      const u = p[i], w = p[(i + 1) % 3];
      const ku = key(u), kw = key(w);
      const k = ku < kw ? `${ku}|${kw}` : `${kw}|${ku}`;
      const e = edges.get(k) ?? edges.set(k, { count: 0, len: u.distanceTo(w) }).get(k)!;
      e.count++;
    }
  }
  let perimeter = 0;
  for (const e of edges.values()) if (e.count === 1) perimeter += e.len;
  return { area, perimeter };
}

/**
 * Mass properties reported relative to a coordinate system (origin + unit axes): the centre of mass in its
 * coordinates, the tensors turned into its axes and the tensor "about the output coordinate system" taken at its origin.
 */
export function massPropertiesInFrame(m: MassProperties, origin: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): MassProperties {
  const R = [x, y, z];
  const rel = m.centroid.clone().sub(origin);
  const c = new THREE.Vector3(rel.dot(x), rel.dot(y), rel.dot(z));
  const comp = (v: THREE.Vector3, j: number) => (j === 0 ? v.x : j === 1 ? v.y : v.z);
  // I' = Rᵀ I R with R the axes as columns
  const Ic = [0, 1, 2].map((i) => [0, 1, 2].map((j) => {
    let s = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += comp(R[i], a) * m.inertiaCentroid[a][b] * comp(R[j], b);
    return s;
  }));
  const d = [c.x, c.y, c.z], dd = c.lengthSq();
  const Io = Ic.map((row, i) => row.map((v, j) => v + m.mass * ((i === j ? dd : 0) - d[i] * d[j])));
  const { values, vectors } = symmetricEigen(Ic);
  return { ...m, centroid: c, inertiaCentroid: Ic, inertiaOrigin: Io, principalAxes: vectors, principalMoments: values };
}

/** Override Mass Properties: a given mass scales the inertia (same shape), a given centre of mass moves it. */
export function overrideMassProperties(m: MassProperties, o: { mass?: number; centroid?: [number, number, number] }): MassProperties {
  let r = m;
  if (o.mass !== undefined && m.mass > 0) {
    const k = o.mass / m.mass;
    const sc = (t: number[][]) => t.map((row) => row.map((v) => v * k));
    r = { ...r, mass: o.mass, density: r.density * k, inertiaCentroid: sc(r.inertiaCentroid), inertiaOrigin: sc(r.inertiaOrigin), principalMoments: r.principalMoments.map((v) => v * k) };
  }
  if (o.centroid) {
    const c = new THREE.Vector3(...o.centroid);
    const d = [c.x, c.y, c.z], dd = c.lengthSq();
    r = { ...r, centroid: c, inertiaOrigin: r.inertiaCentroid.map((row, i) => row.map((v, j) => v + r.mass * ((i === j ? dd : 0) - d[i] * d[j]))) };
  }
  return r;
}
