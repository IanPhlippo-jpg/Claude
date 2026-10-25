import * as THREE from 'three';

type Pulley = { center: [number, number, number]; axis: [number, number, number]; radius: number };

/**
 * Belt/Chain: the closed belt path around pulleys with parallel axes, in the order given: the outer common
 * tangent between each pulley and the next, and the arc of contact around each pulley. Returns the polyline
 * (world) and the belt length, or null when the pulleys do not suit (fewer than two, axes not parallel).
 */
export function beltPath(pulleys: Pulley[], thickness = 0): { points: THREE.Vector3[]; length: number } | null {
  if (pulleys.length < 2) return null;
  const n = new THREE.Vector3(...pulleys[0].axis).normalize();
  if (pulleys.some((p) => Math.abs(new THREE.Vector3(...p.axis).normalize().dot(n)) < 0.999)) return null;
  // a frame in the belt plane (through the first pulley centre)
  const o = new THREE.Vector3(...pulleys[0].center);
  const u = (Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(n).normalize();
  const v = n.clone().cross(u).normalize();
  const c2 = pulleys.map((p) => { const r = new THREE.Vector3(...p.center).sub(o); return { x: r.dot(u), y: r.dot(v), r: p.radius + thickness / 2 }; });
  // run counter-clockwise around the centroid so every tangent is an outer one
  const cx = c2.reduce((a, c) => a + c.x, 0) / c2.length, cy = c2.reduce((a, c) => a + c.y, 0) / c2.length;
  const order = c2.map((c, i) => ({ c, i, a: Math.atan2(c.y - cy, c.x - cx) })).sort((p, q) => p.a - q.a).map((x) => x.c);
  // outer tangent from circle A to circle B (belt runs ccw, so the belt is on the right of A->B direction... outside)
  const tangent = (A: { x: number; y: number; r: number }, B: { x: number; y: number; r: number }) => {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(A.r - B.r)) return null;
    const base = Math.atan2(dy, dx);
    const phi = Math.acos((A.r - B.r) / d);
    // normal of the tangent line pointing away from the centroid side (outer, for ccw order: right-hand side)
    const ang = base - phi;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    return { a: { x: A.x + A.r * nx, y: A.y + A.r * ny }, b: { x: B.x + B.r * nx, y: B.y + B.r * ny }, angA: ang, angB: ang };
  };
  const segs = order.map((A, i) => tangent(A, order[(i + 1) % order.length]));
  if (segs.some((s) => !s)) return null;
  const pts2: { x: number; y: number }[] = [];
  let length = 0;
  for (let i = 0; i < order.length; i++) {
    const s = segs[i]!;
    const prev = segs[(i + order.length - 1) % order.length]!;
    const C = order[i];
    // arc around C from the end of the incoming tangent to the start of the outgoing one (clockwise for this normal side)
    let a0 = prev.angB, a1 = s.angA;
    while (a1 > a0) a1 -= Math.PI * 2;
    const steps = Math.max(4, Math.ceil(((a0 - a1) / (Math.PI * 2)) * 48));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps;
      pts2.push({ x: C.x + C.r * Math.cos(a), y: C.y + C.r * Math.sin(a) });
    }
    length += C.r * (a0 - a1);
    length += Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  }
  pts2.push(pts2[0]);
  return { points: pts2.map((p) => o.clone().addScaledVector(u, p.x).addScaledVector(v, p.y)), length };
}
