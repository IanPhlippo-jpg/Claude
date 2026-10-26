import type { SVGProps } from 'react';

/**
 * Feature icons drawn as small isometric solids, in the visual language of a desktop CAD Command Ribbon: light grey
 * blocks with dark outlines, the feature itself in teal-blue, sketch geometry yellow, cuts red. Own designs on a
 * 24 px grid (no third-party artwork).
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: P) => ({
  width: size,
  height: size,
  // the solids fill the box as the intended icons do: the 24 px drawing is shown 1.25x
  viewBox: '2.4 2.4 19.2 19.2',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

/** palette: grey solid (top / +Z face / +X face), teal feature faces, outline, sketch yellow, cut red, arrow blue */
export const K = {
  top: '#eceef0',
  front: '#cdd1d6',
  side: '#aab0b7',
  line: '#3a3f46',
  tTop: '#b4dbe8',
  tFront: '#6fadc8',
  tSide: '#3f7f9c',
  tLine: '#2b5f78',
  dark: '#4d5560',
  yellow: '#f4d55c',
  yellowD: '#b8951f',
  red: '#cf3b3f',
  blue: '#2b6cb0',
  white: '#ffffff',
};

type Pt = readonly [number, number];
/** white with an alpha, for the glass of the magnifiers */
const W = (a: number) => `rgba(255,255,255,${a})`;
/** isometric projection on the 24 px grid: X runs to the lower right, Z to the lower left, Y up */
const iso = (X: number, Y: number, Z: number, s = 1, ox = 12, oy = 12): Pt => [ox + (X - Z) * 0.866 * s, oy + (X + Z) * 0.5 * s - Y * s];
const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + 'Z';

type Shade = { top: string; front: string; side: string };
const GREY: Shade = { top: K.top, front: K.front, side: K.side };
const TEAL: Shade = { top: K.tTop, front: K.tFront, side: K.tSide };

/** a box from the corner (x, y, z) with size w (X), h (Y), d (Z): top, +Z face (lower left) and +X face (lower right) */
function Box({ x = 0, y = 0, z = 0, w = 7, h = 7, d = 7, s = 1, c = GREY, line = K.line, ox = 12, oy = 12, lw = 0.7 }: { x?: number; y?: number; z?: number; w?: number; h?: number; d?: number; s?: number; c?: Shade; line?: string; ox?: number; oy?: number; lw?: number }) {
  const P = (X: number, Y: number, Z: number) => iso(X, Y, Z, s, ox, oy);
  const top = poly([P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)]);
  const front = poly([P(x, y, z + d), P(x, y + h, z + d), P(x + w, y + h, z + d), P(x + w, y, z + d)]);
  const side = poly([P(x + w, y, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x + w, y, z + d)]);
  return (
    <g stroke={line} strokeWidth={lw} strokeLinejoin="round">
      <path d={top} fill={c.top} />
      <path d={front} fill={c.front} />
      <path d={side} fill={c.side} />
    </g>
  );
}

/** a horizontal circle of radius r at height y around (x, z): the ellipse of the projection */
const ell = (x: number, y: number, z: number, r: number, s = 1, ox = 12, oy = 12) => {
  const c = iso(x, y, z, s, ox, oy);
  return { cx: c[0], cy: c[1], rx: 1.2247 * r * s, ry: 0.7071 * r * s };
};

/** a vertical cylinder standing on (x, y, z) with radius r and height h */
function Cyl({ x = 0, y = 0, z = 0, r = 3, h = 6, s = 1, c = TEAL, line = K.tLine, ox = 12, oy = 12 }: { x?: number; y?: number; z?: number; r?: number; h?: number; s?: number; c?: Shade; line?: string; ox?: number; oy?: number }) {
  const b = ell(x, y, z, r, s, ox, oy), t = ell(x, y + h, z, r, s, ox, oy);
  return (
    <g stroke={line} strokeWidth={0.7}>
      <path d={`M${b.cx - b.rx} ${b.cy}A${b.rx} ${b.ry} 0 0 0 ${b.cx + b.rx} ${b.cy}L${t.cx + t.rx} ${t.cy}L${t.cx - t.rx} ${t.cy}Z`} fill={c.front} />
      <path d={`M${b.cx} ${b.cy + b.ry}A${b.rx} ${b.ry} 0 0 0 ${b.cx + b.rx} ${b.cy}L${t.cx + t.rx} ${t.cy}A${t.rx} ${t.ry} 0 0 1 ${t.cx} ${t.cy + t.ry}Z`} fill={c.side} stroke="none" />
      <ellipse cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} fill={c.top} />
    </g>
  );
}

/** a hole seen from above: dark opening with the far inner wall lit */
function Hole({ x, y, z, r, s = 1, ox = 12, oy = 12, depth = 1.2 }: { x: number; y: number; z: number; r: number; s?: number; ox?: number; oy?: number; depth?: number }) {
  const t = ell(x, y, z, r, s, ox, oy);
  return (
    <g>
      <ellipse cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} fill={K.dark} stroke={K.line} strokeWidth={0.6} />
      <path d={`M${t.cx - t.rx} ${t.cy}A${t.rx} ${t.ry} 0 0 0 ${t.cx + t.rx} ${t.cy}L${t.cx + t.rx * 0.8} ${t.cy + depth}A${t.rx * 0.8} ${t.ry * 0.8} 0 0 1 ${t.cx - t.rx * 0.8} ${t.cy + depth}Z`} fill={K.tFront} opacity={0.9} />
    </g>
  );
}

export const Icons3D = {
  /** Extruded Boss/Base: a plate with a teal block extruded up from its yellow sketch */
  Extrude: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={2} d={9} s={0.95} oy={13} />
      <path d={poly([iso(2, 2, 2, 0.95, 12, 13), iso(7, 2, 2, 0.95, 12, 13), iso(7, 2, 7, 0.95, 12, 13), iso(2, 2, 7, 0.95, 12, 13)])} fill="none" stroke={K.yellowD} strokeWidth={0.9} />
      <Box x={2.3} y={2} z={2.3} w={4.4} h={6} d={4.4} s={0.95} c={TEAL} line={K.tLine} oy={13} />
      <path d="M20.5 9V3.5M20.5 3.5l-1.8 1.8M20.5 3.5l1.8 1.8" stroke={K.blue} strokeWidth={1.2} />
    </svg>
  ),
  /** Extruded Cut: a block with a square pocket cut into its top */
  Cut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <path d={poly([iso(2.5, 5, 2.5, 0.95, 12, 13), iso(6.5, 5, 2.5, 0.95, 12, 13), iso(6.5, 5, 6.5, 0.95, 12, 13), iso(2.5, 5, 6.5, 0.95, 12, 13)])} fill={K.dark} stroke={K.line} strokeWidth={0.6} />
      <path d={poly([iso(2.5, 5, 2.5, 0.95, 12, 13), iso(6.5, 5, 2.5, 0.95, 12, 13), iso(6.5, 3.4, 2.5, 0.95, 12, 13), iso(2.5, 3.4, 2.5, 0.95, 12, 13)])} fill={K.tFront} />
      <path d={poly([iso(2.5, 5, 2.5, 0.95, 12, 13), iso(2.5, 5, 6.5, 0.95, 12, 13), iso(2.5, 3.4, 6.5, 0.95, 12, 13), iso(2.5, 3.4, 2.5, 0.95, 12, 13)])} fill={K.tSide} />
      <path d="M12 4.5V1M12 1l-1.6 1.6M12 1l1.6 1.6" stroke={K.red} strokeWidth={1.2} />
    </svg>
  ),
  /** Revolved Boss/Base: a lathe shape around a dashed axis with the turning arrow */
  Revolve: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Cyl x={0} y={0} z={0} r={4.2} h={2.2} s={1} oy={16} />
      <Cyl x={0} y={2.2} z={0} r={2.4} h={3.6} s={1} oy={16} />
      <Cyl x={0} y={5.8} z={0} r={3.4} h={1.6} s={1} oy={16} />
      <path d="M12 2.5v20" stroke={K.line} strokeWidth={0.7} strokeDasharray="2.2 1.3" />
      <path d="M8.2 4.6a5.2 2.4 0 0 1 7.6 0" stroke={K.blue} strokeWidth={1.1} fill="none" />
      <path d="M15.8 4.6l-1.9-.3M15.8 4.6l-.4 1.8" stroke={K.blue} strokeWidth={1.1} />
    </svg>
  ),
  /** Swept Boss/Base: a round teal profile swept along an S-shaped path */
  Sweep: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 18.5c5-1 2.5-9 7.5-10.5s5.5 3 7.5 1" stroke={K.tLine} strokeWidth={5.4} fill="none" />
      <path d="M5 18.5c5-1 2.5-9 7.5-10.5s5.5 3 7.5 1" stroke={K.tFront} strokeWidth={4} fill="none" />
      <path d="M5.3 17.6c4.4-1.2 2.4-8.2 7-9.6s5 2.7 7 .9" stroke={K.tTop} strokeWidth={1.2} fill="none" opacity={0.9} />
      <ellipse cx={5} cy={18.5} rx={2} ry={2.6} fill={K.tTop} stroke={K.tLine} strokeWidth={0.7} transform="rotate(-20 5 18.5)" />
      <path d="M3 21.5c6-1.5 3-10 8-12" stroke={K.yellowD} strokeWidth={0.8} strokeDasharray="1.5 1.2" fill="none" />
    </svg>
  ),
  /** Lofted Boss/Base: a solid blended between a round profile below and a smaller one above */
  Loft: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4.5 17a7.5 3.2 0 0 0 15 0L15 6.5a3 1.4 0 0 0-6 0z" fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} />
      <path d="M12 20.2a7.5 3.2 0 0 0 7.5-3.2L15 6.5a3 1.4 0 0 1-3 1.4z" fill={K.tSide} />
      <ellipse cx={12} cy={17} rx={7.5} ry={3.2} fill="none" stroke={K.tLine} strokeWidth={0.7} />
      <ellipse cx={12} cy={6.5} rx={3} ry={1.4} fill={K.tTop} stroke={K.tLine} strokeWidth={0.7} />
      <ellipse cx={12} cy={17} rx={7.5} ry={3.2} fill="none" stroke={K.yellowD} strokeWidth={0.8} strokeDasharray="1.6 1.2" />
    </svg>
  ),
  /** Boundary Boss/Base: a solid under a curved teal boundary surface */
  Boundary: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={3} d={9} s={0.95} oy={14} />
      <path d="M4.3 15.5c2-3.6 4.6-4.2 7.7-3.6s5.8-.2 7.6-3.6l-7.7-4.4c-1.6 2.4-4.2 3.2-7.6 2.6s-5.8 0-7.7 3.4z" fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} />
      <path d="M4.3 15.5c2-3.6 4.6-4.2 7.7-3.6s5.8-.2 7.6-3.6" stroke={K.tTop} strokeWidth={1.1} fill="none" />
    </svg>
  ),
  /** Hole Tool: a block with a drilled hole and the drill above it */
  Hole: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={4.5} d={9} s={0.95} oy={14.5} />
      <Hole x={4.5} y={4.5} z={4.5} r={2.3} s={0.95} oy={14.5} />
      <path d="M12 3v6.2" stroke={K.line} strokeWidth={1.6} />
      <path d="M12 3v6.2" stroke={K.yellow} strokeWidth={0.8} />
      <path d="M10.6 9.2L12 11.2l1.4-2z" fill={K.red} />
      <path d="M16.5 2.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill={K.yellow} stroke={K.yellowD} strokeWidth={0.5} />
    </svg>
  ),
  /** Revolved Cut: a block with a round groove turned out of it */
  RevolveCut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <Hole x={4.5} y={5} z={4.5} r={3.4} s={0.95} oy={13} depth={1.6} />
      <ellipse {...(() => { const e = ell(4.5, 5, 4.5, 1.7, 0.95, 12, 13); return { cx: e.cx, cy: e.cy + 1.4, rx: e.rx, ry: e.ry }; })()} fill={K.top} stroke={K.line} strokeWidth={0.5} />
      <path d="M12 3.2V.8" stroke={K.line} strokeWidth={0.6} strokeDasharray="1.2 .8" />
    </svg>
  ),
  /** Swept Cut: a curved groove cut across the top of a block */
  SweepCut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <path d="M6.3 11.6c2.6-3 4.6-.4 6.4-1.6s2.4-3.2 4.8-3.4" stroke={K.dark} strokeWidth={2.6} fill="none" />
      <path d="M6.3 11.1c2.6-3 4.6-.4 6.4-1.6s2.4-3.2 4.8-3.4" stroke={K.tFront} strokeWidth={1} fill="none" />
    </svg>
  ),
  /** Lofted Cut: a tapered opening lofted into a block */
  LoftCut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <path d={poly([iso(2, 5, 2, 0.95, 12, 13), iso(7, 5, 2, 0.95, 12, 13), iso(7, 5, 7, 0.95, 12, 13), iso(2, 5, 7, 0.95, 12, 13)])} fill={K.dark} stroke={K.line} strokeWidth={0.6} />
      <ellipse {...(() => { const e = ell(4.5, 5, 4.5, 1.5, 0.95, 12, 13); return { cx: e.cx, cy: e.cy + 2.2, rx: e.rx, ry: e.ry }; })()} fill={K.tFront} />
      <path d={poly([iso(2, 5, 2, 0.95, 12, 13), iso(7, 5, 2, 0.95, 12, 13), iso(4.5, 5, 4.5, 0.95, 12, 15.2)])} fill={K.tSide} opacity={0.8} />
    </svg>
  ),
  /** Boundary Cut: a block cut by a curved boundary surface */
  BoundaryCut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <path d="M4.6 14.6c2.4-2.6 5-2.2 7.6-1.2s5.2.2 7.2-2.6l-.2 1.8c-2 2.6-4.6 3.4-7.2 2.6s-5-1.4-7.4 1.2z" fill={K.dark} stroke={K.line} strokeWidth={0.5} />
      <path d="M4.6 14.6c2.4-2.6 5-2.2 7.6-1.2s5.2.2 7.2-2.6" stroke={K.tFront} strokeWidth={1.1} fill="none" />
    </svg>
  ),
  /** Fillet: a block whose top front edge is rounded (the round in teal) */
  Fillet: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={8} h={7} d={8} s={0.95} oy={13} />
      <path d={`${poly([iso(8, 4.5, 0, 0.95, 12, 13), iso(8, 4.5, 8, 0.95, 12, 13), iso(5.5, 7, 8, 0.95, 12, 13), iso(5.5, 7, 0, 0.95, 12, 13)])}`} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <path d={`M${iso(8, 4.5, 8, 0.95, 12, 13).join(' ')}Q${iso(8, 7, 8, 0.95, 12, 13).join(' ')} ${iso(5.5, 7, 8, 0.95, 12, 13).join(' ')}`} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <path d={`M${iso(8, 4.5, 0, 0.95, 12, 13).join(' ')}Q${iso(8, 7, 0, 0.95, 12, 13).join(' ')} ${iso(5.5, 7, 0, 0.95, 12, 13).join(' ')}`} fill={K.tTop} stroke={K.tLine} strokeWidth={0.6} />
      <path d={`M${iso(6.9, 6.3, 0.4, 0.95, 12, 13).join(' ')}L${iso(6.9, 6.3, 7.6, 0.95, 12, 13).join(' ')}`} stroke={K.tTop} strokeWidth={0.9} />
    </svg>
  ),
  /** Chamfer: a block whose top front edge is cut off flat */
  Chamfer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={8} h={7} d={8} s={0.95} oy={13} />
      <path d={poly([iso(8, 4.5, 0, 0.95, 12, 13), iso(8, 4.5, 8, 0.95, 12, 13), iso(5.5, 7, 8, 0.95, 12, 13), iso(5.5, 7, 0, 0.95, 12, 13)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <path d={poly([iso(8, 4.5, 8, 0.95, 12, 13), iso(8, 7, 8, 0.95, 12, 13), iso(5.5, 7, 8, 0.95, 12, 13)])} fill={K.tSide} stroke={K.tLine} strokeWidth={0.6} />
    </svg>
  ),
  /** Linear Pattern: four small outline blocks in two rows */
  Pattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      {[[1, 1], [5.2, 1], [1, 5.2], [5.2, 5.2]].map(([x, z], i) => <Box key={i} x={x} y={0} z={z} w={2.6} h={2.6} d={2.6} s={1.15} c={{ top: K.white, front: K.tTop, side: K.tFront }} line={K.tLine} ox={12} oy={13.5} lw={0.75} />)}
    </svg>
  ),
  /** Circular Pattern: small blocks around an axis */
  CircularPattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <ellipse cx={12} cy={14} rx={8} ry={4} fill="none" stroke={K.line} strokeWidth={0.6} strokeDasharray="1.4 1" />
      {[[12, 10], [19.2, 13], [12, 18], [4.8, 13]].map(([cx, cy], i) => <Box key={i} x={0} y={0} z={0} w={2.4} h={2.4} d={2.4} s={1} c={{ top: K.white, front: K.tTop, side: K.tFront }} line={K.tLine} ox={cx} oy={cy - 1} lw={0.75} />)}
      <path d="M12 3.5v4" stroke={K.line} strokeWidth={0.7} strokeDasharray="1.4 1" />
    </svg>
  ),
  /** Rib: a bracket with its triangular stiffening web */
  Rib: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.8} d={9} s={0.95} oy={14.5} />
      <Box x={0} y={1.8} z={0} w={1.8} h={8} d={9} s={0.95} oy={14.5} />
      <path d={poly([iso(1.8, 1.8, 4.5, 0.95, 12, 14.5), iso(8, 1.8, 4.5, 0.95, 12, 14.5), iso(1.8, 8.5, 4.5, 0.95, 12, 14.5)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} />
      <path d={poly([iso(1.8, 1.8, 4.5, 0.95, 12, 14.5), iso(8, 1.8, 4.5, 0.95, 12, 14.5), iso(8, 1.8, 5.6, 0.95, 12, 14.5), iso(1.8, 1.8, 5.6, 0.95, 12, 14.5)])} fill={K.tSide} stroke={K.tLine} strokeWidth={0.5} />
      <path d={poly([iso(1.8, 1.8, 5.6, 0.95, 12, 14.5), iso(8, 1.8, 5.6, 0.95, 12, 14.5), iso(1.8, 8.5, 5.6, 0.95, 12, 14.5)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} opacity={0.95} />
    </svg>
  ),
  /** Draft: a block whose sides taper, the drafted face in teal */
  Draft: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d={poly([iso(0, 0, 9, 0.95, 12, 13), iso(1.5, 6.5, 7.5, 0.95, 12, 13), iso(7.5, 6.5, 7.5, 0.95, 12, 13), iso(9, 0, 9, 0.95, 12, 13)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} />
      <path d={poly([iso(9, 0, 0, 0.95, 12, 13), iso(7.5, 6.5, 1.5, 0.95, 12, 13), iso(7.5, 6.5, 7.5, 0.95, 12, 13), iso(9, 0, 9, 0.95, 12, 13)])} fill={K.side} stroke={K.line} strokeWidth={0.7} />
      <path d={poly([iso(1.5, 6.5, 1.5, 0.95, 12, 13), iso(7.5, 6.5, 1.5, 0.95, 12, 13), iso(7.5, 6.5, 7.5, 0.95, 12, 13), iso(1.5, 6.5, 7.5, 0.95, 12, 13)])} fill={K.top} stroke={K.line} strokeWidth={0.7} />
      <path d={`M${iso(0, 0, 9, 0.95, 12, 13).join(' ')}L${iso(0, 7.5, 9, 0.95, 12, 13).join(' ')}`} stroke={K.red} strokeWidth={0.7} strokeDasharray="1.4 1" />
    </svg>
  ),
  /** Shell: a hollowed block, the open top showing the thin teal walls */
  Shell: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={7} d={9} s={0.95} oy={13} />
      <path d={poly([iso(1.3, 7, 1.3, 0.95, 12, 13), iso(7.7, 7, 1.3, 0.95, 12, 13), iso(7.7, 7, 7.7, 0.95, 12, 13), iso(1.3, 7, 7.7, 0.95, 12, 13)])} fill={K.dark} stroke={K.line} strokeWidth={0.6} />
      <path d={poly([iso(1.3, 7, 1.3, 0.95, 12, 13), iso(7.7, 7, 1.3, 0.95, 12, 13), iso(7.7, 2.5, 1.3, 0.95, 12, 13), iso(1.3, 2.5, 1.3, 0.95, 12, 13)])} fill={K.tFront} />
      <path d={poly([iso(1.3, 7, 1.3, 0.95, 12, 13), iso(1.3, 7, 7.7, 0.95, 12, 13), iso(1.3, 2.5, 7.7, 0.95, 12, 13), iso(1.3, 2.5, 1.3, 0.95, 12, 13)])} fill={K.tSide} />
      <path d={poly([iso(1.3, 2.5, 1.3, 0.95, 12, 13), iso(7.7, 2.5, 1.3, 0.95, 12, 13), iso(7.7, 2.5, 7.7, 0.95, 12, 13), iso(1.3, 2.5, 7.7, 0.95, 12, 13)])} fill={K.tTop} opacity={0.85} />
    </svg>
  ),
  /** Wrap: a cylinder with a teal sketch wrapped onto its face */
  Wrap: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Cyl x={0} y={0} z={0} r={4.6} h={9} s={1} c={GREY} line={K.line} oy={16.5} />
      <path d="M8.2 10.6c2 1.3 5.6 1.3 7.6 0v4.6c-2 1.3-5.6 1.3-7.6 0z" fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <path d="M9.4 11.9c1.6.8 3.6.8 5.2 0M9.4 13.6c1.6.8 3.6.8 5.2 0" stroke={K.tTop} strokeWidth={0.8} />
    </svg>
  ),
  /** Intersect: two solids with their common volume in teal */
  Intersect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={2} w={6} h={5.5} d={6} s={0.95} oy={13} />
      <Cyl x={6} y={0} z={2.5} r={3} h={7.5} s={0.95} c={GREY} line={K.line} oy={13} />
      <Box x={3.6} y={0} z={2} w={2.4} h={5.5} d={3.6} s={0.95} c={TEAL} line={K.tLine} oy={13} />
    </svg>
  ),
  /** Mirror: a solid and its mirror image across a dashed plane */
  Mirror: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d={poly([iso(5, 0, -4, 1, 12, 12), iso(5, 9, -4, 1, 12, 12), iso(5, 9, 10, 1, 12, 12), iso(5, 0, 10, 1, 12, 12)])} fill={K.tTop} opacity={0.35} stroke={K.tLine} strokeWidth={0.6} strokeDasharray="1.6 1" />
      <Box x={0} y={0} z={0} w={4} h={4} d={6} s={1} oy={12} />
      <Box x={6} y={0} z={0} w={4} h={4} d={6} s={1} c={TEAL} line={K.tLine} oy={12} />
    </svg>
  ),
  /** Reference Geometry: a plane, an axis and a point */
  RefGeometry: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 19l5-11h11l-5 11z" fill={K.tTop} opacity={0.8} stroke={K.tLine} strokeWidth={0.8} />
      <path d="M13.5 22V3" stroke={K.line} strokeWidth={0.9} strokeDasharray="2 1.2" />
      <circle cx={7} cy={5} r={1.7} fill={K.tFront} stroke={K.tLine} strokeWidth={0.7} />
      <path d="M17 2.5l1.5 2.5h-3z" fill={K.line} />
    </svg>
  ),
  /** Curves: a free 3D curve in teal */
  Curves: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 7c2-5 5 7 8 6s2-9 5-7 2 9 3.5 10" stroke={K.tLine} strokeWidth={2.6} fill="none" />
      <path d="M4 7c2-5 5 7 8 6s2-9 5-7 2 9 3.5 10" stroke={K.tFront} strokeWidth={1.4} fill="none" />
      <circle cx={4} cy={7} r={1.1} fill={K.tTop} stroke={K.tLine} strokeWidth={0.6} />
      <circle cx={20.5} cy={16} r={1.1} fill={K.tTop} stroke={K.tLine} strokeWidth={0.6} />
    </svg>
  ),
  /** Drag Handles: a ruler with the drag arrow */
  DragHandles: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <g transform="rotate(-40 12 12)">
        <rect x={3} y={9} width={18} height={6} rx={0.8} fill={K.yellow} stroke={K.yellowD} strokeWidth={0.8} />
        {[6, 9, 12, 15, 18].map((x) => <path key={x} d={`M${x} 9v${x === 12 ? 3.5 : 2.2}`} stroke={K.yellowD} strokeWidth={0.8} />)}
      </g>
      <path d="M16 19l-4.5-4.5M16 19h-3.4M16 19v-3.4" stroke={K.blue} strokeWidth={1.4} />
    </svg>
  ),
  /** a part document: the yellow stepped block on a blue-grey base, as the Feature Tree shows it */
  Part: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={2.2} d={9} s={1} c={{ top: '#8fb4d9', front: '#5b86b8', side: '#3d6494' }} line="#2a4a73" oy={13.5} />
      <Box x={0} y={2.2} z={0} w={9} h={3.2} d={4.5} s={1} c={{ top: '#fbe27a', front: '#e9c43a', side: '#c49a1c' }} line="#8a6a10" oy={13.5} />
      <Box x={0} y={5.4} z={0} w={4.5} h={3.2} d={4.5} s={1} c={{ top: '#fbe27a', front: '#e9c43a', side: '#c49a1c' }} line="#8a6a10" oy={13.5} />
    </svg>
  ),
  /** the configuration badge next to the document name: a gear in a blue ring */
  ConfigBadge: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx={12} cy={12} r={8.5} fill={K.white} stroke={K.blue} strokeWidth={1.6} />
      <path d="M12 7.2l.9 1.6 1.8-.4.4 1.8 1.6.9-1.1 1.5 1.1 1.5-1.6.9-.4 1.8-1.8-.4-.9 1.6-.9-1.6-1.8.4-.4-1.8-1.6-.9 1.1-1.5-1.1-1.5 1.6-.9.4-1.8 1.8.4z" fill={K.blue} />
      <circle cx={12} cy={12} r={1.9} fill={K.white} />
    </svg>
  ),
  /** Property Panel tab: a panel with its rows */
  MgrProperty: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={4} y={3.5} width={16} height={17} fill={K.white} stroke={K.line} strokeWidth={1} />
      <path d="M4 7.5h16" stroke={K.line} strokeWidth={0.9} />
      <path d="M6.5 10.5h4M6.5 13.5h4M6.5 16.5h4" stroke={K.blue} strokeWidth={1.3} />
      <path d="M12.5 10.5h5M12.5 13.5h5M12.5 16.5h5" stroke={K.line} strokeWidth={0.9} />
    </svg>
  ),
  /** Configurations panel tab: the tree with a gear */
  MgrConfig: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 5v13h5M6 10h5M6 15h5" stroke={K.line} strokeWidth={1.1} />
      <rect x={3} y={3} width={5} height={3.6} fill={K.tFront} stroke={K.line} strokeWidth={0.8} />
      <path d="M16.5 10.3l.7 1.3 1.5-.3.3 1.5 1.3.7-.9 1.2.9 1.2-1.3.7-.3 1.5-1.5-.3-.7 1.3-.7-1.3-1.5.3-.3-1.5-1.3-.7.9-1.2-.9-1.2 1.3-.7.3-1.5 1.5.3z" fill={K.blue} />
      <circle cx={16.5} cy={14.9} r={1.5} fill={K.white} />
    </svg>
  ),
  /** Tolerance Tree tab: a target cross */
  MgrAutoTolerance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx={12} cy={12} r={6.5} fill="none" stroke={K.line} strokeWidth={1.2} />
      <path d="M12 2.5v6M12 15.5v6M2.5 12h6M15.5 12h6" stroke={K.line} strokeWidth={1.2} />
      <circle cx={12} cy={12} r={1.4} fill={K.line} />
    </svg>
  ),
  /** Display Panel tab: the colour wheel */
  MgrDisplay: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 12L12 3.5A8.5 8.5 0 0 1 20.5 12z" fill="#e5533c" />
      <path d="M12 12L20.5 12A8.5 8.5 0 0 1 12 20.5z" fill="#3c8ed9" />
      <path d="M12 12L12 20.5A8.5 8.5 0 0 1 3.5 12z" fill="#f2c233" />
      <path d="M12 12L3.5 12A8.5 8.5 0 0 1 12 3.5z" fill="#45b36b" />
      <circle cx={12} cy={12} r={8.5} fill="none" stroke={K.line} strokeWidth={0.9} />
      <circle cx={12} cy={12} r={2.2} fill={K.white} stroke={K.line} strokeWidth={0.7} />
    </svg>
  ),
  /** Reverse Direction: an arrow that flips over the direction bar */
  ReverseDir: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M5 19L17 7" stroke={K.line} strokeWidth={1.8} />
      <path d="M17 7h-5.5M17 7v5.5" stroke={K.line} strokeWidth={1.8} />
      <path d="M4 10l3 3-3 3" stroke={K.blue} strokeWidth={1.4} fill="none" />
      <path d="M3 20.5h8" stroke={K.blue} strokeWidth={1.4} />
    </svg>
  ),
  /** Direction of extrusion: the blue diagonal arrow */
  DirArrow: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M5 19L18 6" stroke={K.blue} strokeWidth={2} />
      <path d="M18 6h-6.5M18 6v6.5" stroke={K.blue} strokeWidth={2} />
    </svg>
  ),
  /** Depth (D1): the double arrow across the block with its label */
  Depth: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M4 19L15 8" stroke={K.line} strokeWidth={1.6} />
      <path d="M4 19l.4-4.6M4 19l4.6-.4M15 8l-4.6.4M15 8l-.4 4.6" stroke={K.line} strokeWidth={1.6} />
      <path d="M5 7.5l5-5h3l-5 5z" fill={K.tTop} stroke={K.tLine} strokeWidth={0.7} />
      <text x={14.5} y={21} fontSize={8} fontWeight={700} fontFamily="Segoe UI, Arial, sans-serif" fill={K.line}>D1</text>
    </svg>
  ),
  /** heads-up: Zoom to Fit — the magnifier over a block with the fit arrows */
  Fit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <Box x={0} y={0} z={0} w={6} h={5} d={6} s={1} ox={13.5} oy={12} />
      <circle cx={9.5} cy={9.5} r={6} fill={W(0.55)} stroke={K.line} strokeWidth={1.3} />
      <path d="M13.8 13.8L19.5 19.5" stroke={K.line} strokeWidth={2.2} />
      <path d="M9.5 5.5v8M5.5 9.5h8" stroke={K.blue} strokeWidth={1.2} />
      <path d="M9.5 5.5l-1.3 1.6M9.5 5.5l1.3 1.6M9.5 13.5l-1.3-1.6M9.5 13.5l1.3-1.6M5.5 9.5l1.6-1.3M5.5 9.5l1.6 1.3M13.5 9.5l-1.6-1.3M13.5 9.5l-1.6 1.3" stroke={K.blue} strokeWidth={1} />
    </svg>
  ),
  /** heads-up: Zoom to Area — the magnifier with the dashed window */
  ZoomArea: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <rect x={8} y={3} width={13} height={11} fill="none" stroke={K.line} strokeWidth={1} strokeDasharray="1.8 1.4" />
      <circle cx={9.5} cy={11.5} r={5.5} fill={W(0.65)} stroke={K.line} strokeWidth={1.3} />
      <path d="M13.5 15.5L19 21" stroke={K.line} strokeWidth={2.2} />
      <path d="M7 11.5h5M9.5 9v5" stroke={K.tFront} strokeWidth={1.3} />
    </svg>
  ),
  /** heads-up: Previous View — the camera turning back */
  Previous: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M4 9l9-3v12l-9-3z" fill={K.front} stroke={K.line} strokeWidth={1} />
      <path d="M13 8l4.5-2v12L13 16z" fill={K.side} stroke={K.line} strokeWidth={1} />
      <path d="M20.5 7.5c0 4-2 7-6 8" stroke={K.tFront} strokeWidth={1.8} fill="none" />
      <path d="M14.5 15.5l2.6-.4M14.5 15.5l.8 2.6" stroke={K.tFront} strokeWidth={1.8} />
    </svg>
  ),
  /** heads-up: Section View — the block cut open, its section face lit */
  Section: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <Box x={0} y={0} z={0} w={4.5} h={8} d={8} s={1} oy={13} />
      <path d={poly([iso(4.5, 0, 0, 1, 12, 13), iso(4.5, 8, 0, 1, 12, 13), iso(4.5, 8, 8, 1, 12, 13), iso(4.5, 0, 8, 1, 12, 13)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.8} />
      <path d={poly([iso(4.5, 2, 2, 1, 12, 13), iso(4.5, 6, 2, 1, 12, 13), iso(4.5, 6, 6, 1, 12, 13), iso(4.5, 2, 6, 1, 12, 13)])} fill={K.white} stroke={K.tLine} strokeWidth={0.6} />
      <Box x={6.5} y={0} z={0} w={3} h={8} d={8} s={1} oy={13} />
    </svg>
  ),
  /** heads-up: View Orientation — a cube with its face grid */
  Orientation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <Box x={0} y={0} z={0} w={8} h={8} d={8} s={1.05} c={{ top: '#dde9f0', front: '#b9d3e0', side: '#8fb6c9' }} line={K.line} oy={13} />
      <path d={`M${iso(4, 0, 8, 1.05, 12, 13).join(' ')}L${iso(4, 8, 8, 1.05, 12, 13).join(' ')}M${iso(0, 4, 8, 1.05, 12, 13).join(' ')}L${iso(8, 4, 8, 1.05, 12, 13).join(' ')}M${iso(8, 4, 0, 1.05, 12, 13).join(' ')}L${iso(8, 4, 8, 1.05, 12, 13).join(' ')}M${iso(8, 0, 4, 1.05, 12, 13).join(' ')}L${iso(8, 8, 4, 1.05, 12, 13).join(' ')}M${iso(0, 8, 4, 1.05, 12, 13).join(' ')}L${iso(8, 8, 4, 1.05, 12, 13).join(' ')}M${iso(4, 8, 0, 1.05, 12, 13).join(' ')}L${iso(4, 8, 8, 1.05, 12, 13).join(' ')}`} stroke={K.line} strokeWidth={0.6} opacity={0.7} />
    </svg>
  ),
  /** heads-up: Display Style — the shaded cube */
  DisplayStyle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <Box x={0} y={0} z={0} w={8} h={8} d={8} s={1.05} c={{ top: '#dde9f0', front: '#b9d3e0', side: '#8fb6c9' }} line={K.line} oy={13} lw={1} />
    </svg>
  ),
  /** heads-up: Hide/Show Items — the eye over a block */
  Eye: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <Box x={0} y={0} z={0} w={8} h={6} d={8} s={0.95} oy={14.5} />
      <path d="M3 9.5c3.5-5 14.5-5 18 0c-3.5 5-14.5 5-18 0z" fill={K.white} stroke={K.line} strokeWidth={1.2} />
      <circle cx={12} cy={9.5} r={2.4} fill={K.tFront} stroke={K.line} strokeWidth={0.8} />
      <circle cx={12} cy={9.5} r={0.9} fill={K.line} />
    </svg>
  ),
  /** heads-up: Edit Appearance — the colour ball with a pencil */
  Appearance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M10 10L10 2.5A7.5 7.5 0 0 1 17.5 10z" fill="#e5533c" />
      <path d="M10 10L17.5 10A7.5 7.5 0 0 1 10 17.5z" fill="#3c8ed9" />
      <path d="M10 10L10 17.5A7.5 7.5 0 0 1 2.5 10z" fill="#f2c233" />
      <path d="M10 10L2.5 10A7.5 7.5 0 0 1 10 2.5z" fill="#45b36b" />
      <circle cx={10} cy={10} r={7.5} fill="none" stroke={K.line} strokeWidth={0.9} />
      <path d="M13.5 20.5l7-7 1.6 1.6-7 7-2.4.8z" fill={K.yellow} stroke={K.yellowD} strokeWidth={0.8} />
      <path d="M19.2 14.8l1.6 1.6" stroke={K.yellowD} strokeWidth={0.8} />
    </svg>
  ),
  /** heads-up: Apply Scene — the colour ball on its floor */
  Scene: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M2 19l4-5h16l-4 5z" fill={K.front} stroke={K.line} strokeWidth={0.8} />
      <path d="M11 9.5L11 2.5A7 7 0 0 1 18 9.5z" fill="#e5533c" />
      <path d="M11 9.5L18 9.5A7 7 0 0 1 11 16.5z" fill="#3c8ed9" />
      <path d="M11 9.5L11 16.5A7 7 0 0 1 4 9.5z" fill="#f2c233" />
      <path d="M11 9.5L4 9.5A7 7 0 0 1 11 2.5z" fill="#45b36b" />
      <circle cx={11} cy={9.5} r={7} fill="none" stroke={K.line} strokeWidth={0.9} />
      <ellipse cx={11.5} cy={17.2} rx={5} ry={1.2} fill={K.dark} opacity={0.35} />
    </svg>
  ),
  /** Sheet Metal ▸ Base Flange/Tab: a teal sheet with its yellow sketch outline */
  BaseFlange: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} c={TEAL} line={K.tLine} oy={13} />
      <path d={poly([iso(1, 1.2, 1, 0.95, 12, 13), iso(9, 1.2, 1, 0.95, 12, 13), iso(9, 1.2, 9, 0.95, 12, 13), iso(1, 1.2, 9, 0.95, 12, 13)])} stroke={K.yellowD} strokeWidth={0.9} fill="none" strokeDasharray="1.6 0.8" />
    </svg>
  ),
  /** Sheet Metal ▸ Convert to Sheet Metal: a grey solid wrapped in a teal sheet on two faces */
  ConvertSheet: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={8} h={7} d={8} s={0.95} oy={14} />
      <Box x={0} y={7} z={0} w={8} h={1.2} d={8} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <Box x={8} y={0} z={0} w={1.2} h={8.2} d={8} s={0.95} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Edge Flange: a grey sheet with a teal flange standing up from its front edge */
  EdgeFlange: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={0} y={0} z={9} w={10} h={7} d={1.2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Miter Flange: teal flanges along two edges that meet in a red miter */
  MiterFlange: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={9} y={0} z={0} w={1.2} h={6} d={9} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <Box x={0} y={0} z={9} w={9} h={6} d={1.2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <path d={`M${iso(9, 0, 9, 0.95, 12, 14).join(' ')}L${iso(10.2, 6, 10.2, 0.95, 12, 14).join(' ')}`} stroke={K.red} strokeWidth={1} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Hem: a grey sheet whose front edge is folded back over itself (teal) */
  Hem: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} oy={13} />
      <Box x={0} y={2.4} z={6} w={10} h={1.2} d={4} s={0.95} c={TEAL} line={K.tLine} oy={13} />
      <path d={`M${iso(0, 0, 10, 0.95, 12, 13).join(' ')}A1.6 1.6 0 0 1 ${iso(0, 3.6, 10, 0.95, 12, 13).join(' ')}M${iso(10, 0, 10, 0.95, 12, 13).join(' ')}A1.6 1.6 0 0 1 ${iso(10, 3.6, 10, 0.95, 12, 13).join(' ')}`} stroke={K.tLine} strokeWidth={0.8} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Jog: a sheet with a teal Z-shaped offset step */
  Jog: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={4} z={0} w={10} h={1.2} d={4} s={0.95} oy={14} />
      <Box x={0} y={0} z={4} w={10} h={5.2} d={1.2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <Box x={0} y={0} z={5.2} w={10} h={1.2} d={4} s={0.95} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Sketched Bend: a sheet bent up along a yellow sketch line */
  SketchedBend: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={6} h={1.2} d={10} s={0.95} oy={13} />
      <Box x={6} y={0} z={0} w={1.2} h={6} d={10} s={0.95} c={TEAL} line={K.tLine} oy={13} />
      <path d={`M${iso(5.4, 1.3, -1, 0.95, 12, 13).join(' ')}L${iso(5.4, 1.3, 11, 0.95, 12, 13).join(' ')}`} stroke={K.yellowD} strokeWidth={1.2} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Cross-Break: a sheet with the two red diagonals of the break */
  CrossBreak: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} oy={13} />
      <path d={`M${iso(0.6, 1.2, 0.6, 0.95, 12, 13).join(' ')}L${iso(9.4, 1.2, 9.4, 0.95, 12, 13).join(' ')}M${iso(9.4, 1.2, 0.6, 0.95, 12, 13).join(' ')}L${iso(0.6, 1.2, 9.4, 0.95, 12, 13).join(' ')}`} stroke={K.red} strokeWidth={1.1} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Corners: two grey flanges whose corner is closed by a teal patch */
  Corners: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={9} y={0} z={0} w={1.2} h={6} d={7.4} s={0.95} oy={14} />
      <Box x={0} y={0} z={9} w={7.4} h={6} d={1.2} s={0.95} oy={14} />
      <Box x={7.4} y={0} z={7.4} w={2.8} h={6} d={2.8} s={0.95} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Unfold: the teal leg of an L sheet laid flat, with a blue arrow down */
  Unfold: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={6} h={1.2} d={9} s={0.95} oy={15} />
      <Box x={6} y={0} z={0} w={5} h={1.2} d={9} s={0.95} c={TEAL} line={K.tLine} oy={15} />
      <path d={poly([iso(6, 1.2, 0, 0.95, 12, 15), iso(6, 7, 0, 0.95, 12, 15), iso(6, 7, 9, 0.95, 12, 15), iso(6, 1.2, 9, 0.95, 12, 15)])} stroke={K.tLine} strokeWidth={0.6} fill="none" strokeDasharray="1 0.8" />
      <path d="M17.2 5.2q2.4 2.4 1.4 5.8M17.6 11.4l1-0.6 0.6 1.1" stroke={K.blue} strokeWidth={1} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Fold: a flat sheet whose teal leg rises again, with a blue arrow up */
  Fold: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={6} h={1.2} d={9} s={0.95} oy={15} />
      <Box x={6} y={0} z={0} w={1.2} h={6} d={9} s={0.95} c={TEAL} line={K.tLine} oy={15} />
      <path d={poly([iso(6, 1.2, 0, 0.95, 12, 15), iso(11, 1.2, 0, 0.95, 12, 15), iso(11, 1.2, 9, 0.95, 12, 15), iso(6, 1.2, 9, 0.95, 12, 15)])} stroke={K.tLine} strokeWidth={0.6} fill="none" strokeDasharray="1 0.8" />
      <path d="M19.2 12q0.6-3.6-2-6M16.4 7.4l0.6-1.6 1.6 0.4" stroke={K.blue} strokeWidth={1} fill="none" />
    </svg>
  ),
  /** Sheet Metal ▸ Flatten: the flat pattern with its dashed yellow bend lines */
  Flatten: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={12} h={1} d={10} s={0.95} c={TEAL} line={K.tLine} oy={12} />
      <path d={`M${iso(4, 1, 0, 0.95, 12, 12).join(' ')}L${iso(4, 1, 10, 0.95, 12, 12).join(' ')}M${iso(8, 1, 0, 0.95, 12, 12).join(' ')}L${iso(8, 1, 10, 0.95, 12, 12).join(' ')}`} stroke={K.yellowD} strokeWidth={0.9} fill="none" strokeDasharray="1.4 0.8" />
    </svg>
  ),
  /** Sheet Metal ▸ No Bends: the flat pattern with its bend lines struck out */
  NoBends: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={12} h={1} d={10} s={0.95} oy={12} />
      <path d={`M${iso(6, 1, 0, 0.95, 12, 12).join(' ')}L${iso(6, 1, 10, 0.95, 12, 12).join(' ')}`} stroke={K.yellowD} strokeWidth={0.9} fill="none" strokeDasharray="1.4 0.8" />
      <path d="M6 18L18 6" stroke={K.red} strokeWidth={1.4} />
    </svg>
  ),
  /** Sheet Metal ▸ Insert Bends: a grey shell whose sharp corner becomes a teal bend */
  InsertBends: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={8} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={0} y={2.4} z={0} w={1.2} h={6} d={9} s={0.95} oy={14} />
      <Cyl x={1.2} y={1.2} z={0} r={1.2} h={9} s={0.95} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Normal Cut: a sheet with a red cut straight through its thickness */
  NormalCut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} oy={13} />
      <path d={poly([iso(3, 1.2, 3, 0.95, 12, 13), iso(7, 1.2, 3, 0.95, 12, 13), iso(7, 1.2, 7, 0.95, 12, 13), iso(3, 1.2, 7, 0.95, 12, 13)])} fill={K.red} stroke={K.line} strokeWidth={0.6} />
      <path d={`M${iso(5, 5, 5, 0.95, 12, 13).join(' ')}L${iso(5, 1.6, 5, 0.95, 12, 13).join(' ')}`} stroke={K.blue} strokeWidth={1} />
    </svg>
  ),
  /** Sheet Metal ▸ Vent: a plate with a round opening crossed by two ribs */
  Vent: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} oy={13} />
      <ellipse cx={12} cy={9.2} rx={5.4} ry={2.7} fill={K.dark} stroke={K.line} strokeWidth={0.6} />
      <path d={`M${iso(1.6, 1.2, 5, 0.95, 12, 13).join(' ')}L${iso(8.4, 1.2, 5, 0.95, 12, 13).join(' ')}M${iso(5, 1.2, 1.6, 0.95, 12, 13).join(' ')}L${iso(5, 1.2, 8.4, 0.95, 12, 13).join(' ')}`} stroke={K.tLine} strokeWidth={1.4} fill="none" />
      <ellipse cx={12} cy={9.2} rx={2.2} ry={1.1} fill={K.tTop} stroke={K.tLine} strokeWidth={0.6} />
    </svg>
  ),
  /** Sheet Metal ▸ Forming Tool: a plate with a teal emboss pressed up out of it */
  FormTool: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={10} s={0.95} oy={13} />
      <Cyl x={5} y={1.2} z={5} r={2.6} h={3.4} s={0.95} oy={13} />
    </svg>
  ),
  /** Sheet Metal ▸ Gusset: an L sheet with a teal triangular stiffener across the bend */
  Gusset: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={0} y={1.2} z={0} w={1.2} h={6} d={9} s={0.95} oy={14} />
      <path d={poly([iso(1.2, 1.2, 3.2, 0.95, 12, 14), iso(1.2, 5, 3.2, 0.95, 12, 14), iso(5, 1.2, 3.2, 0.95, 12, 14)])} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <path d={poly([iso(1.2, 1.2, 5.2, 0.95, 12, 14), iso(1.2, 5, 5.2, 0.95, 12, 14), iso(5, 1.2, 5.2, 0.95, 12, 14)])} fill={K.tSide} stroke={K.tLine} strokeWidth={0.6} />
      <path d={poly([iso(1.2, 5, 3.2, 0.95, 12, 14), iso(5, 1.2, 3.2, 0.95, 12, 14), iso(5, 1.2, 5.2, 0.95, 12, 14), iso(1.2, 5, 5.2, 0.95, 12, 14)])} fill={K.tTop} stroke={K.tLine} strokeWidth={0.6} />
    </svg>
  ),
  /** Sheet Metal ▸ Tab and Slot: two sheets, the teal tabs of one in the slots of the other */
  TabSlot: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={10} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={4.4} y={1.2} z={0} w={1.2} h={6} d={9} s={0.95} oy={14} />
      <Box x={4.4} y={-1.2} z={1.2} w={1.2} h={2.4} d={2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <Box x={4.4} y={-1.2} z={5.8} w={1.2} h={2.4} d={2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Sheet Metal ▸ Rip: a box with its vertical corner edge torn open (red gap) */
  Rip: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={8} h={8} d={8} s={0.95} oy={13} />
      <path d={`M${iso(8, 0, 8, 0.95, 12, 13).join(' ')}L${iso(8, 8, 8, 0.95, 12, 13).join(' ')}`} stroke={K.red} strokeWidth={1.8} fill="none" />
      <path d={`M${iso(8, 0, 8, 0.95, 12, 13).join(' ')}L${iso(8, 8, 8, 0.95, 12, 13).join(' ')}`} stroke="#fff" strokeWidth={0.6} fill="none" strokeDasharray="1.2 1.2" />
    </svg>
  ),
  /** Sheet Metal ▸ Swept Flange: a plate with a teal flange swept along two of its edges */
  SweptFlange: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.2} d={9} s={0.95} oy={14} />
      <Box x={0} y={1.2} z={0} w={1.2} h={5} d={9} s={0.95} c={TEAL} line={K.tLine} oy={14} />
      <Box x={0} y={1.2} z={0} w={9} h={5} d={1.2} s={0.95} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Evaluate ▸ Performance Evaluation: a stopwatch over a small bar chart */
  Performance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <rect x={3} y={14} width={3} height={7} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <rect x={7.5} y={10} width={3} height={11} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <rect x={12} y={16} width={3} height={5} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <circle cx={17.5} cy={8} r={5} fill={K.top} stroke={K.line} strokeWidth={0.9} />
      <path d="M17.5 8V5M17.5 8l2 1.5M16.5 2.5h2" stroke={K.red} strokeWidth={1} fill="none" strokeLinecap="round" />
    </svg>
  ),
  /** Evaluate ▸ Symmetry Check: a block with its mirror image across a dashed plane */
  Symmetry: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={4.5} w={4} h={6} d={3} s={0.9} />
      <Box x={0} y={0} z={0} w={4} h={6} d={3} s={0.9} c={TEAL} line={K.tLine} />
      <path d={`M${iso(-1, -1, 3.75, 0.9).join(' ')}L${iso(6, -1, 3.75, 0.9).join(' ')}L${iso(6, 8, 3.75, 0.9).join(' ')}L${iso(-1, 8, 3.75, 0.9).join(' ')}Z`} fill={K.yellow} fillOpacity={0.35} stroke={K.yellowD} strokeWidth={0.7} strokeDasharray="1.5 1" />
    </svg>
  ),
  /** Evaluate ▸ Deviation Analysis: two faces meeting with the angle between their normals */
  Deviation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <path d="M3 17L12 13L21 17L12 21Z" fill={K.front} stroke={K.line} strokeWidth={0.8} />
      <path d="M12 13V4" stroke={K.tLine} strokeWidth={1.2} />
      <path d="M12 13L18 6" stroke={K.red} strokeWidth={1.2} />
      <path d="M12 7.5A6 6 0 0 1 15.6 8.8" stroke={K.line} strokeWidth={0.8} fill="none" />
      <circle cx={12} cy={4} r={1.3} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <circle cx={18} cy={6} r={1.3} fill="#f3c0c0" stroke={K.red} strokeWidth={0.6} />
    </svg>
  ),
  /** Evaluate ▸ Parting Line Analysis: a block coloured green above and red below the parting line */
  PartingLine: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d={poly([iso(0, 4, 0), iso(8, 4, 0), iso(8, 4, 8), iso(0, 4, 8)])} fill={K.top} stroke={K.line} strokeWidth={0.7} />
      <path d={poly([iso(0, 4, 8), iso(8, 4, 8), iso(8, 7.5, 8), iso(0, 7.5, 8)])} fill="#9bd7a7" stroke={K.line} strokeWidth={0.7} />
      <path d={poly([iso(8, 4, 8), iso(8, 4, 0), iso(8, 7.5, 0), iso(8, 7.5, 8)])} fill="#6fbf80" stroke={K.line} strokeWidth={0.7} />
      <path d={poly([iso(0, 0.5, 8), iso(8, 0.5, 8), iso(8, 4, 8), iso(0, 4, 8)])} fill="#f0a3a3" stroke={K.line} strokeWidth={0.7} />
      <path d={poly([iso(8, 0.5, 8), iso(8, 0.5, 0), iso(8, 4, 0), iso(8, 4, 8)])} fill="#d97777" stroke={K.line} strokeWidth={0.7} />
      <path d={`M${iso(0, 4, 8).join(' ')}L${iso(8, 4, 8).join(' ')}L${iso(8, 4, 0).join(' ')}`} stroke={K.blue} strokeWidth={1.4} fill="none" />
    </svg>
  ),
  /** Evaluate ▸ Compare: two overlapping blocks, grey and teal */
  Compare: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={6} h={5} d={6} s={0.9} oy={14} />
      <Box x={3} y={2.5} z={3} w={6} h={5} d={6} s={0.9} c={TEAL} line={K.tLine} oy={14} />
    </svg>
  ),
  /** Evaluate ▸ Quick Beam Estimate: a beam with a load arrow and the stress colours */
  Simulation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <defs><linearGradient id="beam-grad" x1="0" x2="1"><stop offset="0" stopColor="#d93b3b" /><stop offset="0.5" stopColor="#f2d13a" /><stop offset="1" stopColor="#2b6cb0" /></linearGradient></defs>
      <rect x={2} y={11} width={19} height={5} fill="url(#beam-grad)" stroke={K.line} strokeWidth={0.8} />
      <rect x={1} y={9} width={2} height={9} fill={K.dark} />
      <path d="M19 3v6M16.5 6.5L19 9l2.5-2.5" stroke={K.red} strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </svg>
  ),
  /** Weldments ▸ Weldment: two square tubes meeting at a mitered corner */
  Weldment: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={2.4} d={2.4} s={0.95} oy={13} c={TEAL} line={K.tLine} />
      <Box x={0} y={0} z={2.4} w={2.4} h={2.4} d={6} s={0.95} oy={13} c={TEAL} line={K.tLine} />
      <path d={poly([iso(0, 2.4, 0, 0.95, 12, 13), iso(2.4, 2.4, 2.4, 0.95, 12, 13), iso(0, 2.4, 2.4, 0.95, 12, 13)])} fill={K.tTop} stroke={K.tLine} strokeWidth={0.5} />
    </svg>
  ),
  /** Weldments ▸ Structural Member: a square tube along a sketch line */
  StructuralMember: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d={`M${iso(-1, 1.6, 1.6, 0.95, 12, 13).join(' ')}L${iso(10, 1.6, 1.6, 0.95, 12, 13).join(' ')}`} stroke={K.yellowD} strokeWidth={0.9} strokeDasharray="1.2 0.8" fill="none" />
      <Box x={1} y={0} z={0} w={7} h={3.2} d={3.2} s={0.95} oy={13} c={TEAL} line={K.tLine} />
      <path d={poly([iso(1, 0.6, 0.6, 0.95, 12, 13), iso(1, 0.6, 2.6, 0.95, 12, 13), iso(1, 2.6, 2.6, 0.95, 12, 13), iso(1, 2.6, 0.6, 0.95, 12, 13)])} fill={K.dark} />
    </svg>
  ),
  /** Weldments ▸ Trim/Extend: one tube cut back against another */
  TrimExtend: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={2.6} h={9} d={2.6} s={0.95} oy={14} />
      <Box x={2.6} y={3} z={0} w={6.5} h={2.6} d={2.6} s={0.95} oy={14} c={TEAL} line={K.tLine} />
      <path d={`M${iso(2.6, 2.4, -0.6, 0.95, 12, 14).join(' ')}L${iso(2.6, 6.2, -0.6, 0.95, 12, 14).join(' ')}`} stroke={K.red} strokeWidth={1.2} fill="none" />
    </svg>
  ),
  /** Weldments ▸ End Cap: a plate closing the end of a tube */
  EndCap: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={7} h={4} d={4} s={0.95} oy={13} />
      <Box x={7} y={-0.2} z={-0.2} w={0.9} h={4.4} d={4.4} s={0.95} oy={13} c={TEAL} line={K.tLine} />
    </svg>
  ),
  /** Weldments ▸ Weld Bead: a bead in the corner of two plates */
  WeldBead: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={1.5} d={8} s={0.95} oy={14} />
      <Box x={0} y={1.5} z={0} w={1.5} h={6} d={8} s={0.95} oy={14} />
      <path d={poly([iso(1.5, 1.5, 0, 0.95, 12, 14), iso(3.6, 1.5, 0, 0.95, 12, 14), iso(1.5, 3.6, 0, 0.95, 12, 14)])} fill="#e9a23b" stroke="#a86a12" strokeWidth={0.6} />
      <path d={poly([iso(1.5, 1.5, 0, 0.95, 12, 14), iso(1.5, 1.5, 8, 0.95, 12, 14), iso(3.6, 1.5, 8, 0.95, 12, 14), iso(3.6, 1.5, 0, 0.95, 12, 14)])} fill="#f3bf6a" stroke="#a86a12" strokeWidth={0.5} />
      <path d={poly([iso(1.5, 1.5, 0, 0.95, 12, 14), iso(1.5, 1.5, 8, 0.95, 12, 14), iso(1.5, 3.6, 8, 0.95, 12, 14), iso(1.5, 3.6, 0, 0.95, 12, 14)])} fill="#d98f2c" stroke="#a86a12" strokeWidth={0.5} />
    </svg>
  ),
  /** Features ▸ Deform: a block with a dent pressed into its top */
  Deform: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Box x={0} y={0} z={0} w={9} h={5} d={9} s={0.95} oy={13} />
      <ellipse cx={12} cy={8.6} rx={3.6} ry={1.8} fill={K.tFront} stroke={K.tLine} strokeWidth={0.6} />
      <ellipse cx={12} cy={8.9} rx={2} ry={1} fill={K.tSide} />
      <path d="M12 3.5v3M10.8 5.3L12 6.6l1.2-1.3" stroke={K.red} strokeWidth={1} fill="none" strokeLinecap="round" />
    </svg>
  ),
  /** heads-up: View Settings — the monitor */
  ViewSettings: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24">
      <rect x={3} y={4} width={18} height={12} rx={1} fill="#cfd8e0" stroke={K.line} strokeWidth={1} />
      <rect x={4.5} y={5.5} width={15} height={9} fill="#eef3f7" />
      <path d="M9 20h6M12 16v4" stroke={K.line} strokeWidth={1.2} />
    </svg>
  ),
};
