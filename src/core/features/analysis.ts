import * as THREE from 'three';
import type { Body } from './rebuild';
import { cylinderAxis } from '../assembly/assembly';
import { MeshBVH } from 'three-mesh-bvh';

export type DraftClass = 'positive' | 'requires' | 'negative';

/** Draft Analysis colours of the original: positive draft green, requires draft yellow, negative draft red. */
export const DRAFT_COLORS: Record<DraftClass, string> = { positive: '#2fb34a', requires: '#f2d13a', negative: '#d93b3b' };

/**
 * Draft angle of every face against the direction of pull: asin(n · pull) in degrees. A face with at least the
 * required angle has positive draft, at most minus that angle negative draft, in between it requires draft.
 */
export function draftAnalysis(bodies: Body[], pull: [number, number, number], angleDeg: number, classify = true): { colors: Record<string, Record<string, string>>; counts: Record<DraftClass, number> } {
  const p = new THREE.Vector3(...pull).normalize();
  const colors: Record<string, Record<string, string>> = {};
  const counts: Record<DraftClass, number> = { positive: 0, requires: 0, negative: 0 };
  for (const b of bodies) {
    const m: Record<string, string> = (colors[b.id] = {});
    for (const f of b.faces) {
      const n = new THREE.Vector3(...f.normal).normalize();
      const a = (Math.asin(Math.max(-1, Math.min(1, n.dot(p)))) * 180) / Math.PI;
      const cls: DraftClass = a >= angleDeg - 1e-9 ? 'positive' : a <= -angleDeg + 1e-9 ? 'negative' : 'requires';
      counts[cls]++;
      // Face classification off: a continuous colour by the draft angle (red negative … yellow … green positive)
      m[f.id] = classify ? DRAFT_COLORS[cls] : draftGradient(a, angleDeg);
    }
  }
  return { colors, counts };
}

/** a colour ramp over the draft angle: -90° red, ±limit yellow, +90° green */
export function draftGradient(a: number, limit: number): string {
  const t = Math.max(-1, Math.min(1, a / Math.max(limit * 4, 1)));
  const mix = (x: number[], y: number[], u: number) => '#' + x.map((v, i) => Math.round(v + (y[i] - v) * u).toString(16).padStart(2, '0')).join('');
  return t < 0 ? mix([240, 220, 40], [220, 40, 40], -t) : mix([240, 220, 40], [40, 180, 60], t);
}

/** Curvature colours: planar faces dark, then blue - green - yellow - red with growing curvature (1/radius, log scale). */
export function curvatureColor(k: number): string {
  if (k <= 1e-6) return '#1c1c3a';
  const t = Math.max(0, Math.min(1, (Math.log10(k) + 3) / 3)); // 0.001 .. 1 per mm
  const stops = [[0, 40, 90, 220], [0.35, 40, 200, 120], [0.65, 240, 220, 60], [1, 230, 50, 40]];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, r0, g0, b0] = stops[i - 1], [t1, r1, g1, b1] = stops[i];
      const u = (t - t0) / (t1 - t0 || 1);
      const h = (x: number, y: number) => Math.round(x + (y - x) * u).toString(16).padStart(2, '0');
      return `#${h(r0, r1)}${h(g0, g1)}${h(b0, b1)}`;
    }
  }
  return '#e63228';
}

export function curvatureAnalysis(bodies: Body[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const b of bodies) {
    const m: Record<string, string> = (out[b.id] = {});
    for (const f of b.faces) {
      if (!f.curved) {
        m[f.id] = curvatureColor(0);
        continue;
      }
      const ax = cylinderAxis(b.geometry, f.triangles);
      m[f.id] = curvatureColor(ax && ax.radius > 1e-6 ? 1 / ax.radius : 0.05);
    }
  }
  return out;
}


const bvhCache = new WeakMap<THREE.BufferGeometry, { bvh: MeshBVH; geom: THREE.BufferGeometry }>();
function bvhOf(g: THREE.BufferGeometry) {
  let hit = bvhCache.get(g);
  if (!hit) {
    const geom = g.index ? g.toNonIndexed() : g;
    hit = { bvh: new MeshBVH(geom), geom };
    bvhCache.set(g, hit);
  }
  return hit;
}

/** Thickness Analysis colours of the original's "Show thin regions": red at no thickness to yellow at the target, other faces grey. */
/** Show thick regions: faces thicker than the target from blue (just above) to red (twice the target and more) */
export function thickColor(t: number, target: number): string {
  if (t <= target) return '#c8c8cc';
  const u = Math.max(0, Math.min(1, (t - target) / target));
  const h = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${h(40 + 190 * u)}${h(90 - 40 * u)}${h(220 - 180 * u)}`;
}

export function thicknessColor(t: number, target: number): string {
  if (t >= target) return '#c8c8cc';
  const u = Math.max(0, Math.min(1, t / target));
  const g = Math.round(40 + 190 * u).toString(16).padStart(2, '0');
  return `#e8${g}28`;
}

/**
 * Wall thickness of every face: rays from the facet centres into the material (against the facet normal) to the
 * opposite wall; the face shows its thinnest sample. Faces thinner than the target thickness are thin regions.
 */
export function thicknessAnalysis(bodies: Body[], target: number, mode: 'thin' | 'thick' = 'thin', resolution: 'low' | 'medium' | 'high' = 'medium'): { colors: Record<string, Record<string, string>>; thin: number; minimum: number; thick: number; maximum: number } {
  let thick = 0, maximum = 0;
  const per = resolution === 'low' ? 8 : resolution === 'high' ? 64 : 24;
  const colors: Record<string, Record<string, string>> = {};
  let thin = 0, minimum = Infinity;
  for (const b of bodies) {
    const { bvh, geom } = bvhOf(b.geometry);
    const a = geom.getAttribute('position');
    const m: Record<string, string> = (colors[b.id] = {});
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (const f of b.faces) {
      const samples: number[] = [];
      const step = Math.max(1, Math.floor(f.triangles.length / per));
      for (let i = 0; i < f.triangles.length; i += step) {
        const tri = f.triangles[i];
        A.fromBufferAttribute(a, tri * 3); B.fromBufferAttribute(a, tri * 3 + 1); C.fromBufferAttribute(a, tri * 3 + 2);
        const n = B.clone().sub(A).cross(C.clone().sub(A));
        if (n.lengthSq() < 1e-12) continue;
        n.normalize();
        const c = A.clone().add(B).add(C).divideScalar(3);
        const d = n.clone().negate();
        const ray = new THREE.Ray(c.clone().addScaledVector(n, -1e-3), d);
        // the opposite wall is where the ray leaves the material (its face looks along the ray)
        let best = Infinity;
        for (const hit of bvh.raycast(ray, THREE.DoubleSide)) {
          if (hit.distance < 0.02 || !hit.face) continue;
          if (hit.face.normal.dot(d) <= 0) continue;
          best = Math.min(best, hit.distance + 1e-3);
        }
        if (Number.isFinite(best)) samples.push(best);
      }
      // the face shows its typical (median) wall thickness, so one sample at a corner does not colour a whole face
      samples.sort((x, y) => x - y);
      const t = samples.length ? samples[Math.floor((samples.length - 1) / 2)] : target;
      minimum = Math.min(minimum, t);
      maximum = Math.max(maximum, t);
      if (t < target) thin++;
      if (t > target) thick++;
      m[f.id] = mode === 'thick' ? thickColor(t, target) : thicknessColor(t, target);
    }
  }
  return { colors, thin, minimum: Number.isFinite(minimum) ? minimum : 0, thick, maximum };
}

export type UndercutClass = 'dir1' | 'dir2' | 'occluded' | 'straddle' | 'none';
/** Undercut Analysis colours. */
export const UNDERCUT_COLORS: Record<UndercutClass, string> = { dir1: '#2fb34a', dir2: '#2f6fd6', occluded: '#d93b3b', straddle: '#f0a020', none: '#c8c8cc' };

/**
 * Undercut Analysis with a direction of pull: a face that can be seen along the pull from its side is free; when the
 * mould half of its side is blocked it is a direction 1 / direction 2 undercut, blocked both ways it is occluded.
 */
export function undercutAnalysis(bodies: Body[], pull: [number, number, number]): { colors: Record<string, Record<string, string>>; counts: Record<UndercutClass, number> } {
  const p = new THREE.Vector3(...pull).normalize();
  const colors: Record<string, Record<string, string>> = {};
  const counts: Record<UndercutClass, number> = { dir1: 0, dir2: 0, occluded: 0, straddle: 0, none: 0 };
  for (const b of bodies) {
    const { bvh } = bvhOf(b.geometry);
    const m: Record<string, string> = (colors[b.id] = {});
    for (const f of b.faces) {
      const n = new THREE.Vector3(...f.normal).normalize();
      const c = new THREE.Vector3(...f.centroid).addScaledVector(n, 1e-3);
      const free = (d: THREE.Vector3) => !bvh.raycastFirst(new THREE.Ray(c.clone().addScaledVector(d, 1e-3), d), THREE.DoubleSide);
      const up = free(p), down = free(p.clone().negate());
      const s = n.dot(p);
      let cls: UndercutClass;
      if (Math.abs(s) < 1e-3) cls = up || down ? 'none' : 'straddle';
      else if (s > 0) cls = up ? 'none' : down ? 'dir1' : 'occluded';
      else cls = down ? 'none' : up ? 'dir2' : 'occluded';
      counts[cls]++;
      m[f.id] = UNDERCUT_COLORS[cls];
    }
  }
  return { colors, counts };
}

/** Evaluate ▸ Geometry Analysis: short edges, small faces and sharp (knife) edges of the bodies. */
export function geometryAnalysis(bodies: { id: string; faces: { id: string; area: number; curved: boolean }[]; edges: { id: string; length: number; segments: { n1: { dot(v: unknown): number }; n2: unknown }[] }[] }[], p: { shortEdge: number; smallFace: number; sharpAngle: number }): { shortEdges: string[]; smallFaces: { bodyId: string; faceId: string }[]; sharpEdges: string[] } {
  const shortEdges: string[] = [], sharpEdges: string[] = [];
  const smallFaces: { bodyId: string; faceId: string }[] = [];
  const limit = Math.cos(Math.PI - (p.sharpAngle * Math.PI) / 180);
  for (const b of bodies) {
    for (const e of b.edges) {
      if (e.length < p.shortEdge) shortEdges.push(e.id);
      // the faces meet at an inside angle below the limit: their normals point almost opposite
      const s = e.segments[Math.floor(e.segments.length / 2)];
      if (s && s.n1.dot(s.n2) < limit) sharpEdges.push(e.id);
    }
    for (const f of b.faces) if (f.area < p.smallFace) smallFaces.push({ bodyId: b.id, faceId: f.id });
  }
  return { shortEdges, smallFaces, sharpEdges };
}
