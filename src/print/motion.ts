/**
 * Print-time estimate: a trapezoid planner with look-ahead (docs/34 2.6). Every move accelerates, cruises and
 * decelerates with the acceleration of the printer; the speed at the junction of two moves is limited by the corner
 * (a junction-deviation model with a square-corner velocity of 5 mm/s, as described in the Klipper kinematics
 * documentation) and by the reachable speeds of both moves (forward and backward passes).
 * Retractions (E-only moves) take their own time at the retraction speed.
 */
export interface PlanMove {
  /** end position (mm) */
  x: number; y: number; z: number;
  /** extrusion of this move (mm of filament, relative) */
  e: number;
  /** requested speed, mm/s */
  v: number;
  /** acceleration, mm/s² */
  a: number;
}

export interface PlanLimits { squareCornerVelocity: number; maxSpeed: number }

/** the duration of every move (s), starting from rest at `from` */
export function planTimes(moves: PlanMove[], from: { x: number; y: number; z: number }, lim: PlanLimits): Float64Array {
  const n = moves.length;
  const L = new Float64Array(n), ux = new Float64Array(n), uy = new Float64Array(n), uz = new Float64Array(n), vmax = new Float64Array(n), acc = new Float64Array(n);
  let px = from.x, py = from.y, pz = from.z;
  for (let i = 0; i < n; i++) {
    const m = moves[i];
    const dx = m.x - px, dy = m.y - py, dz = m.z - pz;
    const d = Math.hypot(dx, dy, dz);
    if (d > 1e-9) { L[i] = d; ux[i] = dx / d; uy[i] = dy / d; uz[i] = dz / d; } else { L[i] = Math.abs(m.e); }
    vmax[i] = Math.max(0.1, Math.min(m.v, lim.maxSpeed));
    acc[i] = Math.max(1, m.a);
    px = m.x; py = m.y; pz = m.z;
  }
  // the largest speed² at the start of each move (junction with the previous one)
  const vj2 = new Float64Array(n + 1);
  for (let i = 1; i < n; i++) {
    if (!L[i] || !L[i - 1] || (ux[i] === 0 && uy[i] === 0 && uz[i] === 0) || (ux[i - 1] === 0 && uy[i - 1] === 0 && uz[i - 1] === 0)) { vj2[i] = 0; continue; }
    // the angle between the moves: cos of the deviation from going straight on
    const cosTurn = ux[i - 1] * ux[i] + uy[i - 1] * uy[i] + uz[i - 1] * uz[i];
    const cosTheta = -cosTurn;
    if (cosTheta > 0.999999) { vj2[i] = 0; continue; }
    let v2 = Math.min(vmax[i], vmax[i - 1]) ** 2;
    if (cosTheta > -0.999999) {
      const sinHalf = Math.sqrt(0.5 * (1 - cosTheta));
      const a = Math.min(acc[i], acc[i - 1]);
      // junction deviation that gives the square-corner velocity at 90 degrees
      const jd = (lim.squareCornerVelocity ** 2 * (Math.SQRT2 - 1)) / a;
      v2 = Math.min(v2, (a * jd * sinHalf) / (1 - sinHalf));
      // the corner arc must fit in half of each move
      const tanHalf = sinHalf / Math.sqrt(0.5 * (1 + cosTheta));
      v2 = Math.min(v2, 0.5 * L[i] * tanHalf * acc[i], 0.5 * L[i - 1] * tanHalf * acc[i - 1]);
    }
    vj2[i] = v2;
  }
  vj2[0] = 0; vj2[n] = 0;
  // backward: each move must be able to slow to the next junction; forward: and to reach it from the previous one
  for (let i = n - 1; i >= 0; i--) vj2[i] = Math.min(vj2[i], vj2[i + 1] + 2 * acc[i] * L[i]);
  for (let i = 0; i < n; i++) vj2[i + 1] = Math.min(vj2[i + 1], vj2[i] + 2 * acc[i] * L[i]);
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = acc[i], vs2 = vj2[i], ve2 = vj2[i + 1], vc = vmax[i], d = L[i];
    if (d <= 0) continue;
    const vs = Math.sqrt(vs2), ve = Math.sqrt(ve2);
    const da = Math.max(0, (vc * vc - vs2) / (2 * a)), dd = Math.max(0, (vc * vc - ve2) / (2 * a));
    if (da + dd <= d) t[i] = (vc - vs) / a + (vc - ve) / a + (d - da - dd) / vc;
    else {
      const vp = Math.sqrt(Math.max(vs2, ve2, (2 * a * d + vs2 + ve2) / 2));
      t[i] = Math.max(0, (vp - vs) / a) + Math.max(0, (vp - ve) / a);
    }
  }
  return t;
}
