import * as THREE from 'three';

/** Auto Balloon ▸ Balloon Layout, as the intended Property Panel */
export type BalloonLayout = 'square' | 'circular' | 'top' | 'bottom' | 'left' | 'right';

export interface BalloonBox { x: number; y: number; w: number; h: number }
type Side = 'top' | 'bottom' | 'left' | 'right';

/**
 * A point on a face of each body that is visible in the view (not hidden behind another body): the
 * centre of the largest facing triangle whose centre the view ray reaches first. Returned in view
 * coordinates (u, v). A body that is fully hidden gets the projection of its centre.
 */
export function visibleAnchors(bodies: { id: string; geometry: THREE.BufferGeometry }[], fr: { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 }): Map<string, [number, number]> {
  const meshes = bodies.map((b) => {
    const m = new THREE.Mesh(b.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.userData.id = b.id;
    m.updateMatrixWorld();
    return m;
  });
  const ray = new THREE.Raycaster();
  const out = new Map<string, [number, number]>();
  const box = new THREE.Box3();
  for (const m of meshes) box.expandByObject(m);
  const far = box.getSize(new THREE.Vector3()).length() * 2 + 10;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3();
  for (const b of bodies) {
    const pos = b.geometry.getAttribute('position');
    const idx = b.geometry.getIndex();
    const tri = (i: number, k: number) => (idx ? idx.getX(i * 3 + k) : i * 3 + k);
    const count = (idx ? idx.count : pos.count) / 3;
    const cands: { area: number; c: THREE.Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      A.fromBufferAttribute(pos, tri(i, 0));
      B.fromBufferAttribute(pos, tri(i, 1));
      C.fromBufferAttribute(pos, tri(i, 2));
      n.subVectors(B, A).cross(C.clone().sub(A));
      const area2 = n.length();
      if (area2 < 1e-9) continue;
      // facing the viewer: the projected area counts (an edge-on face is a poor place for a dot)
      const facing = n.dot(fr.w) / area2;
      if (facing < 0.15) continue;
      c.copy(A).add(B).add(C).multiplyScalar(1 / 3);
      cands.push({ area: area2 * facing, c: c.clone() });
    }
    cands.sort((p, q) => q.area - p.area);
    let found: THREE.Vector3 | null = null;
    for (const cand of cands.slice(0, 80)) {
      ray.set(cand.c.clone().addScaledVector(fr.w, far), fr.w.clone().negate());
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && hit.object.userData.id === b.id && hit.point.distanceTo(cand.c) < 1e-3 * far + 1e-3) {
        found = cand.c;
        break;
      }
    }
    if (!found) {
      b.geometry.computeBoundingBox();
      found = b.geometry.boundingBox!.getCenter(new THREE.Vector3());
    }
    out.set(b.id, [found.dot(fr.u), found.dot(fr.v)]);
  }
  for (const m of meshes) (m.material as THREE.Material).dispose();
  return out;
}

/** spread positions along a side: sorted as their targets (so leaders do not cross), at least `gap` apart, within [lo, hi] */
function spread(targets: number[], gap: number, lo: number, hi: number): number[] {
  const order = targets.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t);
  const pos = order.map((o) => o.t);
  for (let k = 1; k < pos.length; k++) pos[k] = Math.max(pos[k], pos[k - 1] + gap);
  // pushed past the end: slide back from the end
  if (pos.length && pos[pos.length - 1] > hi) {
    pos[pos.length - 1] = Math.max(hi, lo + gap * (pos.length - 1));
    for (let k = pos.length - 2; k >= 0; k--) pos[k] = Math.min(pos[k], pos[k + 1] - gap);
  }
  if (pos.length && pos[0] < lo) {
    const shift = lo - pos[0];
    for (let k = 0; k < pos.length; k++) pos[k] += shift;
  }
  const out = new Array<number>(targets.length);
  order.forEach((o, k) => { out[o.i] = pos[k]; });
  return out;
}

/**
 * Auto Balloon placement around the view box (sheet mm, y up). Square puts each balloon on the side of the box
 * nearest to its anchor; Top/Bottom/Left/Right put all of them on one side; Circular on a ring. On a side the
 * balloons keep the order of their anchors, so the leaders never cross, and stay `gap` apart.
 * Returns the positions and one magnetic line per side used (not for Circular).
 */
export function layoutBalloons(anchors: [number, number][], box: BalloonBox, layout: BalloonLayout, opts: { offset?: number; gap?: number } = {}): { positions: [number, number][]; lines: { a: [number, number]; b: [number, number]; members: number[] }[] } {
  const off = opts.offset ?? 12, gap = opts.gap ?? 10;
  const x0 = box.x, x1 = box.x + box.w, y0 = box.y, y1 = box.y + box.h;
  const positions: [number, number][] = anchors.map(() => [0, 0]);
  if (layout === 'circular') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(box.w, box.h) / 2 + off;
    const ang = anchors.map(([x, y], i) => (Math.hypot(x - cx, y - cy) < 1e-6 ? (i * 2 * Math.PI) / anchors.length : Math.atan2(y - cy, x - cx)));
    // keep the order around the ring with a minimum angle between neighbours
    const minA = Math.min((2 * Math.PI) / Math.max(1, anchors.length), gap / R);
    const sp = spread(ang, minA, -Infinity, Infinity);
    sp.forEach((a, i) => { positions[i] = [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
    return { positions, lines: [] };
  }
  const sideOf = ([x, y]: [number, number]): Side => {
    if (layout !== 'square') return layout;
    const d: [Side, number][] = [['top', y1 - y], ['bottom', y - y0], ['left', x - x0], ['right', x1 - x]];
    return d.sort((a, b) => a[1] - b[1])[0][0];
  };
  const groups: Record<Side, number[]> = { top: [], bottom: [], left: [], right: [] };
  anchors.forEach((a, i) => groups[sideOf(a)].push(i));
  const lines: { a: [number, number]; b: [number, number]; members: number[] }[] = [];
  for (const side of ['top', 'bottom', 'left', 'right'] as Side[]) {
    const ids = groups[side];
    if (!ids.length) continue;
    const horiz = side === 'top' || side === 'bottom';
    const lo = horiz ? x0 : y0, hi = horiz ? x1 : y1;
    const along = spread(ids.map((i) => (horiz ? anchors[i][0] : anchors[i][1])), gap, lo, hi);
    const fixed = side === 'top' ? y1 + off : side === 'bottom' ? y0 - off : side === 'left' ? x0 - off : x1 + off;
    ids.forEach((i, k) => { positions[i] = horiz ? [along[k], fixed] : [fixed, along[k]]; });
    const mn = Math.min(...along) - gap / 2, mx = Math.max(...along) + gap / 2;
    lines.push({ a: horiz ? [mn, fixed] : [fixed, mn], b: horiz ? [mx, fixed] : [fixed, mx], members: ids });
  }
  uncross(anchors, positions);
  return { positions, lines };
}

/** leaders that still cross (anchors at different depths) swap their balloons: each swap shortens the leaders, so it ends */
function uncross(anchors: [number, number][], positions: [number, number][]): void {
  const o = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const cross = (i: number, j: number) => o(anchors[i], positions[i], anchors[j]) * o(anchors[i], positions[i], positions[j]) < 0 && o(anchors[j], positions[j], anchors[i]) * o(anchors[j], positions[j], positions[i]) < 0;
  for (let pass = 0; pass < anchors.length * anchors.length; pass++) {
    let swapped = false;
    for (let i = 0; i < anchors.length; i++)
      for (let j = i + 1; j < anchors.length; j++)
        if (cross(i, j)) {
          [positions[i], positions[j]] = [positions[j], positions[i]];
          swapped = true;
        }
    if (!swapped) return;
  }
}

/** Magnetic Line: the balloons spread evenly along a–b in the order of their anchors along the line (no crossing leaders). */
export function magneticOrder(a: [number, number], b: [number, number], anchors: ([number, number] | undefined)[], positions: [number, number][]): number[] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const key = (i: number) => { const p = anchors[i] ?? positions[i]; return (p[0] - a[0]) * dx + (p[1] - a[1]) * dy; };
  return positions.map((_, i) => i).sort((i, j) => key(i) - key(j));
}
