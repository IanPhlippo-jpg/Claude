/**
 * Auto Orient for resin: a part prints best tilted, so no large face lies parallel to the LCD (every layer peels a
 * small area off the film), with little area to support and not too tall. The candidates are tilts about X and Y in
 * steps of 15 degrees; the score is (lower is better):
 *   flat area (faces within 5 degrees of the LCD, up or down) + 0.3 x support area + 0.5 x height
 */
import { bounds, multiply, rotation } from '../mesh';
import { rotateAboutCentre, worldPositions } from '../plate';
import type { PlateItem } from '../types';

export function resinScore(pos: Float32Array, supportAngle = 40): { flat: number; overhang: number; height: number; score: number } {
  const flatLimit = Math.cos((5 * Math.PI) / 180), limit = Math.cos((supportAngle * Math.PI) / 180);
  let flat = 0, overhang = 0;
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, L = Math.hypot(cx, cy, cz);
    if (L < 1e-9) continue;
    const nz = cz / L, a = L / 2;
    if (Math.abs(nz) > flatLimit) flat += a;
    if (nz < -limit) overhang += a * -nz;
  }
  const b = bounds(pos), height = b.max[2] - b.min[2];
  return { flat, overhang, height, score: flat + 0.3 * overhang + 0.5 * height };
}

export function resinAutoOrient(it: PlateItem, supportAngle = 40): PlateItem {
  let best = it, bestScore = resinScore(worldPositions(it), supportAngle).score - 1e-6;
  for (let ax = -60; ax <= 60; ax += 15) for (let ay = -60; ay <= 60; ay += 15) {
    if (!ax && !ay) continue;
    const r = multiply(rotation(1, 0, 0, (ax * Math.PI) / 180), rotation(0, 1, 0, (ay * Math.PI) / 180));
    const cand = rotateAboutCentre(it, r);
    const s = resinScore(worldPositions(cand), supportAngle).score;
    if (s < bestScore - 1e-6) { best = cand; bestScore = s; }
  }
  return best;
}
