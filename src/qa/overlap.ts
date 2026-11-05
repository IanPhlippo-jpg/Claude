/**
 * Nameting van een gemelde botsing: de mesh-boolean van Interference Detection geeft rond nauwe kanalen soms snippers
 * van enkele mm³ die er niet zijn (de klauwen in de inbouwafzuiging). Hier wordt het gebied van de botsing met punten
 * bemonsterd; een punt telt als het in beide bodies ligt (pariteit van een schuine straal).
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const bvhs = new WeakMap<THREE.BufferGeometry, MeshBVH>();
const bvhOf = (g: THREE.BufferGeometry) => {
  let b = bvhs.get(g);
  if (!b) bvhs.set(g, (b = new MeshBVH(g)));
  return b;
};
const RICHTING = new THREE.Vector3(0.3017, 0.9, 0.3141).normalize();

function binnen(bvh: MeshBVH, p: THREE.Vector3): boolean {
  const hits = bvh.raycast(new THREE.Ray(p, RICHTING), THREE.DoubleSide) as { distance: number }[];
  return new Set(hits.map((h) => h.distance.toFixed(6))).size % 2 === 1;
}

/** het werkelijke overlappende volume (mm³) van twee bodies binnen een kader, met hoogstens ~200 000 punten */
export function echteOverlap(a: THREE.BufferGeometry, b: THREE.BufferGeometry, kader: THREE.Box3): number {
  const s = kader.getSize(new THREE.Vector3());
  const stap = Math.max(0.1, Math.cbrt((s.x * s.y * s.z) / 200000));
  const ba = bvhOf(a), bb = bvhOf(b);
  let n = 0;
  const p = new THREE.Vector3();
  for (let x = kader.min.x + stap / 2; x < kader.max.x; x += stap)
    for (let y = kader.min.y + stap / 2; y < kader.max.y; y += stap)
      for (let z = kader.min.z + stap / 2; z < kader.max.z; z += stap) {
        p.set(x, y, z);
        if (binnen(ba, p) && binnen(bb, p)) n++;
      }
  return n * stap * stap * stap;
}

/** de botsingen die na nameting overblijven (> min mm³) */
export function echteBotsingen(
  hits: { a: string; b: string; volume: number; geometry: THREE.BufferGeometry }[],
  bodies: { id: string; geometry: THREE.BufferGeometry }[],
  min = 1,
): string[] {
  const geo = (id: string) => bodies.find((b) => b.id === id)!.geometry;
  return hits
    .filter((h) => h.volume > min)
    .map((h) => {
      h.geometry.computeBoundingBox();
      const kader = h.geometry.boundingBox!.clone().expandByScalar(0.5);
      return { h, v: echteOverlap(geo(h.a), geo(h.b), kader) };
    })
    .filter(({ v }) => v > min)
    .map(({ h, v }) => `${h.a} x ${h.b}: ${v.toFixed(1)} mm³`);
}
