/**
 * The part after each step of the bend sequence (docs/36 P4.7), for prismatic parts: the section folded along its
 * neutral fibre. Each bend made so far is an arc of the neutral radius r + K t over the bend allowance, the bends still
 * to come are flat; the section is the neutral line thickened by t/2 on both sides. The area of an annular strip of
 * width t round the neutral radius is exactly its length x t, so the volume (area x bend length) stays the same in
 * every step, as the material does on the press brake. The real inner radius differs from r by (0.5 - K) t.
 */
import type { BendLine } from './bend';
import type { P2 } from './geom';

export interface FoldState { stap: number; plooien: number[]; poly: P2[]; oppervlak: number }

const ARC = 10;

export function foldSection(bends: BendLine[], width: number, t: number, r: number, k: number, done: Set<number>): P2[] {
  const sorted = [...bends].sort((a, b) => a.s - b.s);
  const mid: { p: P2; n: P2 }[] = [];
  let x = 0, y = 0, phi = 0, at = 0;
  const push = () => mid.push({ p: { x, y }, n: { x: -Math.sin(phi), y: Math.cos(phi) } });
  const straight = (L: number) => { if (L <= 1e-9) return; x += L * Math.cos(phi); y += L * Math.sin(phi); push(); };
  push();
  for (const b of sorted) {
    const theta = (b.hoek * Math.PI) / 180, rho = r + k * t, ba = theta * rho;
    straight(b.s - ba / 2 - at);
    if (done.has(b.id)) {
      const sg = b.richting === 'op' ? 1 : -1;
      for (let i = 1; i <= ARC; i++) {
        // along the arc: the chord of each piece, so the neutral line keeps its length to the arc's accuracy
        const a0 = phi, a1 = phi + (sg * theta) / ARC;
        const c = 2 * rho * Math.sin(theta / ARC / 2);
        x += c * Math.cos((a0 + a1) / 2); y += c * Math.sin((a0 + a1) / 2); phi = a1;
        push();
      }
    } else straight(ba);
    at = b.s + ba / 2;
  }
  straight(width - at);
  // thicken: top and bottom at t/2 from the neutral line, the normal at a joint averaged
  const top = mid.map((m) => ({ x: m.p.x + (m.n.x * t) / 2, y: m.p.y + (m.n.y * t) / 2 }));
  const bot = mid.map((m) => ({ x: m.p.x - (m.n.x * t) / 2, y: m.p.y - (m.n.y * t) / 2 }));
  return [...bot, ...top.reverse()];
}

export function area(poly: P2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a) / 2;
}

/** the flat (step 0) and the part after every step of the sequence */
export function foldStates(bends: BendLine[], width: number, t: number, r: number, k: number, order: number[]): FoldState[] {
  const out: FoldState[] = [];
  for (let n = 0; n <= order.length; n++) {
    const done = new Set(order.slice(0, n));
    const poly = foldSection(bends, width, t, r, k, done);
    out.push({ stap: n, plooien: [...done], poly, oppervlak: area(poly) });
  }
  return out;
}
