// Dicht en manifold: na het samenvoegen van gelijke hoekpunten hoort elke rand bij precies twee driehoeken, één keer in
// elke richting (dan kloppen ook de normalen). Telt ook de driehoeken zonder oppervlak.
import type * as THREE from 'three';

export function stlControle(geo: THREE.BufferGeometry): { open: number; dubbel: number; plat: number; driehoeken: number } {
  const pos = geo.getAttribute('position'), idx = geo.getIndex();
  const n = idx ? idx.count : pos.count, sleutel = new Map<string, number>(), id: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    if (!sleutel.has(k)) sleutel.set(k, sleutel.size);
    id.push(sleutel.get(k)!);
  }
  const randen = new Map<string, number>();
  let plat = 0;
  for (let i = 0; i < n; i += 3) {
    const v = [0, 1, 2].map((j) => id[idx ? idx.getX(i + j) : i + j]);
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) { plat++; continue; }
    for (let j = 0; j < 3; j++) { const k = `${v[j]}>${v[(j + 1) % 3]}`; randen.set(k, (randen.get(k) ?? 0) + 1); }
  }
  let open = 0, dubbel = 0;
  for (const [k, c] of randen) { const [a, b] = k.split('>'); const terug = randen.get(`${b}>${a}`) ?? 0; if (c > 1) dubbel++; if (terug !== c) open++; }
  return { open, dubbel, plat, driehoeken: n / 3 };
}
