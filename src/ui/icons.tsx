import type { ReactElement, SVGProps } from 'react';
import { Icons3D } from './icons3d';
import { IconsSketch } from './iconsSketch';

/**
 * Phlippo icon set — filled, multi-colour icons in the style of desktop CAD:
 * blue solids, yellow sketch faces/planes, grey outlines, green/red actions.
 * Drawn in-house on a 24 px grid.
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

const C = {
  blue: '#3f7fc4',
  blueD: '#245a94',
  blueL: '#a9cbea',
  yellow: '#f3c33f',
  yellowD: '#c99a15',
  grey: '#8a94a1',
  greyD: '#4d5663',
  greyL: '#d7dce3',
  green: '#3ba55d',
  red: '#d9363e',
  white: '#ffffff',
  orange: '#ef8a2b',
};

const base = (size: number, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

/** a small isometric block: top face yellow-ish/light, front blue, side dark blue */
const Block = ({ x = 4, y = 5, w = 14, h = 9, d = 5, top = C.blueL, front = C.blue, side = C.blueD }: { x?: number; y?: number; w?: number; h?: number; d?: number; top?: string; front?: string; side?: string }) => (
  <g stroke={C.blueD} strokeWidth={0.8}>
    <path d={`M${x} ${y + d}l${d} -${d}h${w}l-${d} ${d}z`} fill={top} />
    <path d={`M${x} ${y + d}h${w}v${h}h-${w}z`} fill={front} />
    <path d={`M${x + w} ${y + d}l${d} -${d}v${h}l-${d} ${d}z`} fill={side} />
  </g>
);

const Pencil = ({ x = 11, y = 2 }: { x?: number; y?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(45 5 5)`}>
    <rect x="3" y="0" width="4" height="11" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
    <rect x="3" y="0" width="4" height="2.5" fill={C.red} stroke={C.yellowD} strokeWidth={0.8} />
    <path d="M3 11l2 3.5 2-3.5z" fill={C.greyL} stroke={C.greyD} strokeWidth={0.8} />
  </g>
);

const Plane = ({ x = 3, y = 6, fill = C.blueL, stroke = C.blue }: { x?: number; y?: number; fill?: string; stroke?: string }) => (
  <path d={`M${x} ${y + 12}l5 -12h13l-5 12z`} fill={fill} stroke={stroke} strokeWidth={1} />
);

export const Icon = {
  Logo: ({ size = 20, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#17407e" />
      <path d="M9 25V7h8.5a5.5 5.5 0 0 1 0 11H13" fill="none" stroke="#ffffff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="23" r="3.2" fill="#f28c28" />
      <path d="M13 18l6.5 4" stroke="#f28c28" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
    </svg>
  ),
  Select: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 3l13 10-6 1.5L9 21 5 3z" fill={C.white} stroke={C.greyD} strokeWidth={1.3} />
    </svg>
  ),
  Cursor: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 3l13 10-6 1.5L9 21 5 3z" fill={C.greyD} />
    </svg>
  ),
  Rect3Corner: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 12l7-7 11 11-7 7z" stroke="#2f3a48" strokeWidth={1.7} transform="translate(0 -1.5)" />
      <circle cx="3" cy="10.5" r="1.8" fill={C.blue} /><circle cx="10" cy="3.5" r="1.8" fill={C.blue} /><circle cx="21" cy="14.5" r="1.8" fill={C.blue} />
    </svg>
  ),
  Rect3Center: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 12l7-7 11 11-7 7z" stroke="#2f3a48" strokeWidth={1.7} transform="translate(0 -1.5)" />
      <circle cx="12" cy="10.5" r="1.8" fill={C.blue} /><circle cx="15.5" cy="7" r="1.8" fill={C.blue} /><circle cx="21" cy="14.5" r="1.8" fill={C.blue} />
    </svg>
  ),
  Parallelogram: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7 5h14l-4 14H3z" stroke="#2f3a48" strokeWidth={1.7} />
      <circle cx="3" cy="19" r="1.8" fill={C.blue} /><circle cx="7" cy="5" r="1.8" fill={C.blue} /><circle cx="21" cy="5" r="1.8" fill={C.blue} />
    </svg>
  ),
  MidLine: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 19L21 5" stroke="#2f3a48" strokeWidth={1.8} />
      <circle cx="12" cy="12" r="2.2" fill={C.blue} />
    </svg>
  ),
  TangentArc: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18h8" stroke={C.grey} strokeWidth={1.6} />
      <path d="M11 18a6 6 0 0 0 6-6V5" stroke="#2f3a48" strokeWidth={1.8} />
      <rect x="9.6" y="16.6" width="2.8" height="2.8" fill={C.blue} />
    </svg>
  ),
  /** draft angle of an extrusion: a tapered block with the angle arc */
  DraftAngle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 20V7h13v13z" fill="none" stroke={C.grey} strokeWidth={0.8} strokeDasharray="2 1.5" />
      <path d="M5 20V7l12 2.2-2 10.8z" fill={C.blueL} stroke={C.blueD} strokeWidth={1} strokeLinejoin="round" />
      <path d="M18 9.2a7 7 0 0 1-1.6 5.2" fill="none" stroke={C.red} strokeWidth={1.2} />
    </svg>
  ),
  Dimension: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 6v13M21 6v13" stroke="#2f3a48" strokeWidth={1.2} />
      <path d="M6 16h12" stroke="#2f3a48" strokeWidth={1.4} />
      <path d="M3 16l4-2.2v4.4zM21 16l-4-2.2v4.4z" fill="#2f3a48" />
      <path d="M12 2l1.2 2.8L16 6l-2.8 1.2L12 10l-1.2-2.8L8 6l2.8-1.2z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.6} />
    </svg>
  ),
  Construction: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20L20 4" stroke="#2f3a48" strokeWidth={1.8} strokeDasharray="3.5 2.5" />
    </svg>
  ),
  Trim: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 4l10 10M20 4L10 14" stroke="#2f3a48" strokeWidth={1.6} />
      <circle cx="7.5" cy="18" r="3.2" fill={C.white} stroke={C.blue} strokeWidth={1.6} />
      <circle cx="16.5" cy="18" r="3.2" fill={C.white} stroke={C.blue} strokeWidth={1.6} />
      <path d="M9 15l3-3 3 3" stroke={C.blue} strokeWidth={1.6} />
    </svg>
  ),
  Convert: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={4} y={7} w={12} h={8} d={5} top={C.greyL} front={C.greyL} side={C.grey} />
      <path d="M4 12h12l5-5" stroke={C.blue} strokeWidth={2.6} />
    </svg>
  ),
  Offset: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 21V9l6-5h12v17" stroke="#2f3a48" strokeWidth={1.8} />
      <path d="M8 21v-9l4-3h9" stroke={C.blue} strokeWidth={1.8} />
    </svg>
  ),
  Fillet2D: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 21V12a8 8 0 0 1 8-8h9" stroke="#2f3a48" strokeWidth={1.8} />
      <path d="M4 10V4h6" stroke={C.blue} strokeWidth={1.2} strokeDasharray="2 1.5" />
    </svg>
  ),
  Exit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={7} />
      <Pencil x={9} y={1} />
      <path d="M3 4h5M8 4l-2-2M8 4l-2 2" stroke={C.green} strokeWidth={1.8} />
    </svg>
  ),
  Sketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={7} />
      <path d="M6 14c3-3 6 1 9-2" stroke={C.blue} strokeWidth={1.4} />
      <Pencil x={10} y={1} />
    </svg>
  ),
  /** a sketch used by more than one feature: the sketch with a small open hand */
  SketchShared: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={7} />
      <path d="M6 14c3-3 6 1 9-2" stroke={C.blue} strokeWidth={1.4} />
      <path d="M14 3.5v3.5M15.8 4v3.2M17.6 4.6v3M12.4 5.6v2.6c0 1.6 1.2 2.8 2.8 2.8h.6c1.3 0 2.2-.9 2.2-2.2V4.6" fill="#fff" stroke="#8a5a2b" strokeWidth={1} strokeLinecap="round" />
    </svg>
  ),
  Plane: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={6} />
    </svg>
  ),
  Origin: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 18V5M6 18h13" stroke={C.blue} strokeWidth={2} />
      <path d="M6 2l3 5H3zM22 18l-5 3v-6z" fill={C.blue} />
      <circle cx="6" cy="18" r="2" fill={C.red} />
    </svg>
  ),
  /** Center of Mass: a circle in four quarters, two of them filled */
  CenterOfMass: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8" fill="#fff" stroke="#2b2b2b" strokeWidth={1.5} />
      <path d="M12 12V4a8 8 0 0 1 8 8zM12 12v8a8 8 0 0 1-8-8z" fill="#2b2b2b" />
    </svg>
  ),
  Check: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 12.5l5 5L20 6" stroke={C.green} strokeWidth={3} />
    </svg>
  ),
  Close: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 5l14 14M19 5L5 19" stroke={C.red} strokeWidth={2.8} />
    </svg>
  ),
  Undo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 5L3 10l5 5" stroke={C.blue} strokeWidth={2} />
      <path d="M3 10h11a5 5 0 0 1 0 10h-4" stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Redo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M16 5l5 5-5 5" stroke={C.blue} strokeWidth={2} />
      <path d="M21 10H10a5 5 0 0 0 0 10h4" stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Sun: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="4" fill={C.yellow} stroke={C.yellowD} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke={C.yellowD} strokeWidth={1.6} />
    </svg>
  ),
  Moon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z" fill={C.greyD} />
    </svg>
  ),
  ChevronRight: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth={2} />
    </svg>
  ),
  ChevronDown: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth={2} />
    </svg>
  ),
  Menu: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth={2} />
    </svg>
  ),
  Dots: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
    </svg>
  ),
  /** Add or Update Favorite: a star with a green plus */
  Plus: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M10 3l2 4.6 5 .5-3.8 3.3 1.1 4.9L10 13.8 5.7 16.3l1.1-4.9L3 8.1l5-.5z" fill={C.yellow} stroke={C.greyD} strokeWidth={1} />
      <path d="M18 14v7M14.5 17.5h7" stroke={C.green} strokeWidth={2.2} />
    </svg>
  ),
  Trash: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 7h16" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M9 7V4h6v3" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M6 7l1 13h10l1-13z" fill={C.greyL} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M10 10v7M14 10v7" stroke={C.red} strokeWidth={1.4} />
    </svg>
  ),
  /** the five display styles by design draws them: a cube in wireframe, hidden lines visible/removed, shaded with edges, shaded */
  StyleWireframe: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <g fill="none" stroke="#222" strokeWidth={0.9}>
        <path d="M4 10l5-5h11l-5 5z" /><path d="M4 10h11v10H4z" /><path d="M15 10l5-5v10l-5 5" /><path d="M4 20l5-5h11M9 5v10" />
      </g>
    </svg>
  ),
  StyleHiddenVisible: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <g fill="none" stroke="#222" strokeWidth={0.9}>
        <path d="M4 10l5-5h11l-5 5z" /><path d="M4 10h11v10H4z" /><path d="M15 10l5-5v10l-5 5" />
      </g>
      <path d="M4 20l5-5h11M9 5v10" fill="none" stroke="#777" strokeWidth={0.9} strokeDasharray="1.6 1.2" />
    </svg>
  ),
  StyleHiddenRemoved: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <g fill="#fff" stroke="#222" strokeWidth={0.9}>
        <path d="M4 10l5-5h11l-5 5z" /><path d="M4 10h11v10H4z" /><path d="M15 10l5-5v10l-5 5z" />
      </g>
    </svg>
  ),
  StyleShadedEdges: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <g stroke="#222" strokeWidth={0.9}>
        <path d="M4 10l5-5h11l-5 5z" fill={C.blueL} /><path d="M4 10h11v10H4z" fill={C.blue} /><path d="M15 10l5-5v10l-5 5z" fill={C.blueD} />
      </g>
    </svg>
  ),
  StyleShaded: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 10l5-5h11l-5 5z" fill={C.blueL} /><path d="M4 10h11v10H4z" fill={C.blue} /><path d="M15 10l5-5v10l-5 5z" fill={C.blueD} />
    </svg>
  ),
  /** an imported body (STEP/STL): a solid block with the arrow of a file coming in, own design */
  Imported: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 9l6-4 7 3v9l-6 4-7-3z" fill={C.blueL} stroke={C.blue} strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M8 9l7 3 6-4M15 12v9" fill="none" stroke={C.blue} strokeWidth={1} />
      <path d="M2 15h6" stroke={C.yellowD} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M6 12.5l2.5 2.5L6 17.5" fill="none" stroke={C.yellowD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Combine: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="12" height="12" fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />
      <rect x="9" y="9" width="12" height="12" fill={C.yellow} stroke={C.yellowD} strokeWidth={1.2} />
      <rect x="9" y="9" width="6" height="6" fill={C.blueD} opacity={0.6} />
    </svg>
  ),
  RibSide: ({ size = 16, side = 'both', ...p }: P & { side?: 'first' | 'both' | 'second' }) => (
    <svg {...base(size, p)}>
      <path d="M3 12h18" stroke={C.greyD} strokeWidth={1} strokeDasharray="2 2" />
      {side !== 'second' && <rect x="5" y={side === 'both' ? 9 : 6} width="14" height={side === 'both' ? 3 : 6} fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />}
      {side !== 'first' && <rect x="5" y="12" width="14" height={side === 'both' ? 3 : 6} fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />}
    </svg>
  ),
  RibDir: ({ size = 16, dir = 'parallel', ...p }: P & { dir?: 'parallel' | 'normal' }) => (
    <svg {...base(size, p)}>
      <path d="M4 20L10 14h10l-6 6z" fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />
      {dir === 'parallel' ? <path d="M7 17h8M13 15l2 2-2 2" stroke={C.green} strokeWidth={1.5} fill="none" /> : <path d="M12 16V5M10 7l2-2 2 2" stroke={C.green} strokeWidth={1.5} fill="none" />}
    </svg>
  ),
  /** Fillet Type pictures of the intended design: a white block with the rounded edge in blue */
  FilletConstant: ({ size = 24, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><linearGradient id="kfc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8d6ef" /><stop offset="1" stopColor="#2f7fae" /></linearGradient></defs>
      <path d="M4 10.5L13 12.6V21L4 18.4z" fill="#f7f8f9" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M13 12.6L20 8.6V17.2L13 21z" fill="#d7dde2" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M7.5 4.6L14.4 3.2L20 6.2V8.6L13 12.6L4 10.5V8.4z" fill="#f2f4f6" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M4 8.4L13 10.4L20 6.2V8.6L13 12.6L4 10.5z" fill="url(#kfc)" stroke="#2d5f80" strokeWidth={0.6} />
    </svg>
  ),
  FilletVariable: ({ size = 24, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><linearGradient id="kfv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8d6ef" /><stop offset="1" stopColor="#2f7fae" /></linearGradient></defs>
      <path d="M4 9.6L13 12.6V21L4 18.4z" fill="#f7f8f9" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M13 12.6L20 8.6V17.2L13 21z" fill="#d7dde2" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M7.5 4.6L14.4 3.2L20 6.2V8.6L13 12.6L4 9.6V8.9z" fill="#f2f4f6" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M4 8.9L13 9.6L20 4.8V8.6L13 12.6L4 9.6z" fill="url(#kfv)" stroke="#2d5f80" strokeWidth={0.6} />
    </svg>
  ),
  FilletFace: ({ size = 24, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><linearGradient id="kff" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a8d6ef" /><stop offset="1" stopColor="#2f7fae" /></linearGradient></defs>
      <path d="M4 7.5L11 4.5L20 7V17.5L13 21L4 18z" fill="#f7f8f9" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M4 7.5Q9 7.2 11.5 12.8V20.6L4 18z" fill="url(#kff)" stroke="#2d5f80" strokeWidth={0.6} />
      <path d="M11.5 12.8Q14 8.6 20 7V17.5L13 21h-1.5z" fill="#d7dde2" stroke="#3a4048" strokeWidth={0.6} />
    </svg>
  ),
  FilletFullRound: ({ size = 24, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><linearGradient id="kfr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2f7fae" /><stop offset="0.45" stopColor="#a8d6ef" /><stop offset="1" stopColor="#2f7fae" /></linearGradient></defs>
      <ellipse cx="12" cy="6.5" rx="8" ry="3" fill="#f2f4f6" stroke="#3a4048" strokeWidth={0.8} />
      <path d="M4 6.5V17.5A8 3 0 0 0 20 17.5V6.5A8 3 0 0 1 4 6.5z" fill="url(#kfr)" stroke="#2d5f80" strokeWidth={0.8} />
    </svg>
  ),
  /** the selection-box picture of Items To Fillet: a block with one edge picked */
  EdgeSelect: ({ size = 20, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 8L12 5L19 7.5V17L12 20.5L5 17.5z" fill="#f2f4f6" stroke="#3a4048" strokeWidth={0.9} />
      <path d="M5 8L12 10.5L19 7.5M12 10.5V20.5" stroke="#3a4048" strokeWidth={0.9} />
      <path d="M5 8V17.5" stroke="#2f7fae" strokeWidth={2.2} />
    </svg>
  ),
  Measure: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 16L16 3l5 5L8 21z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M6 13l2 2M9 10l2 2M12 7l2 2" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M2 21h5" stroke={C.blue} strokeWidth={1.6} />
    </svg>
  ),
  Mass: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 9h12l2 12H4z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M9 9a3 3 0 0 1 6 0" stroke={C.greyD} strokeWidth={1.6} />
      <text x="12" y="18" fontSize="7" fontWeight="700" textAnchor="middle" fill={C.white}>kg</text>
    </svg>
  ),
  Interference: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="11" height="11" fill={C.blueL} stroke={C.blue} strokeWidth={1} />
      <rect x="10" y="10" width="11" height="11" fill={C.blueL} stroke={C.blue} strokeWidth={1} />
      <rect x="10" y="10" width="4" height="4" fill={C.red} />
    </svg>
  ),
  Component: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={2} y={4} w={8} h={7} d={4} />
      <Block x={11} y={10} w={8} h={7} d={4} top={C.yellow} front={C.orange} side={C.yellowD} />
    </svg>
  ),
  // ---- assembly
  Mate: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 4v11a4 4 0 0 0 8 0V7a2.5 2.5 0 0 0-5 0v8" fill="none" stroke={C.blue} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M17 4v9" stroke={C.grey} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  MateCoincident: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 15h16M4 9h16" stroke={C.blue} strokeWidth={1.8} />
      <path d="M9 6l3 3 3-3M9 18l3-3 3 3" fill="none" stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  MateParallel: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7 4v16M17 4v16" stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  MatePerpendicular: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 19h14M12 19V5" stroke={C.blue} strokeWidth={2} />
      <path d="M12 14h5v5" fill="none" stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  MateTangent: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="10" r="6" fill="none" stroke={C.blue} strokeWidth={1.8} />
      <path d="M3 16h18" stroke={C.greyD} strokeWidth={1.8} />
    </svg>
  ),
  MateConcentric: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8" fill="none" stroke={C.blue} strokeWidth={1.8} />
      <circle cx="12" cy="12" r="3.5" fill="none" stroke={C.greyD} strokeWidth={1.6} />
    </svg>
  ),
  MateLock: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="5" y="11" width="14" height="9" rx="1" fill={C.yellow} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke={C.greyD} strokeWidth={1.8} />
    </svg>
  ),
  MateDistance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 4v16M19 4v16" stroke={C.blue} strokeWidth={1.8} />
      <path d="M7 12h10" stroke={C.greyD} strokeWidth={1.4} />
      <path d="M7 12l3-2v4zM17 12l-3-2v4z" fill={C.greyD} />
    </svg>
  ),
  MateAngle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 19h16M4 19L16 6" stroke={C.blue} strokeWidth={1.8} />
      <path d="M11 19a7 7 0 0 0-2.5-5.4" fill="none" stroke={C.greyD} strokeWidth={1.3} />
    </svg>
  ),
  MateAligned: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7 19V6M17 19V6" stroke={C.blue} strokeWidth={1.8} />
      <path d="M4 9l3-4 3 4M14 9l3-4 3 4" fill="none" stroke={C.blue} strokeWidth={1.6} />
    </svg>
  ),
  MateAntiAligned: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7 19V6M17 5v13" stroke={C.blue} strokeWidth={1.8} />
      <path d="M4 9l3-4 3 4M14 15l3 4 3-4" fill="none" stroke={C.blue} strokeWidth={1.6} />
    </svg>
  ),
  InsertComponent: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={9} w={10} h={8} d={4} />
      <path d="M17 3v8M13 7h8" stroke={C.green} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  ),
  MoveComponent: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={7} y={8} w={8} h={6} d={3} />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M12 2l-2 2h4zM12 22l-2-2h4zM2 12l2-2v4zM22 12l-2-2v4z" fill={C.greyD} />
    </svg>
  ),
  RotateComponent: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={7} y={9} w={8} h={6} d={3} />
      <path d="M4 10a8 8 0 0 1 14-4" fill="none" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M18 2v4h-4" fill="none" stroke={C.greyD} strokeWidth={1.6} />
    </svg>
  ),
  ComponentPattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={2} y={10} w={5} h={5} d={2} />
      <Block x={9} y={10} w={5} h={5} d={2} />
      <Block x={16} y={10} w={5} h={5} d={2} />
    </svg>
  ),
  Fasteners: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M9 3h6v4H9z" fill={C.grey} stroke={C.greyD} strokeWidth={1} />
      <path d="M11 7h2v13h-2z" fill={C.grey} stroke={C.greyD} strokeWidth={1} />
      <path d="M10 10h4M10 13h4M10 16h4" stroke={C.greyD} strokeWidth={1} />
    </svg>
  ),
  ShowHidden: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={9} w={9} h={7} d={3} />
      <Block x={12} y={5} w={9} h={7} d={3} top={C.white} front={C.white} side={C.greyL} />
      <path d="M12 5l9 10" stroke={C.greyD} strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  ),
  MotionStudy: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={C.blue} strokeWidth={1.8} />
      <path d="M10 8l6 4-6 4z" fill={C.blue} />
    </svg>
  ),
  Bom: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="4" width="18" height="16" fill={C.white} stroke={C.greyD} strokeWidth={1.3} />
      <path d="M3 9h18M3 14h18M9 4v16" stroke={C.greyD} strokeWidth={1} />
      <rect x="3" y="4" width="18" height="5" fill={C.blueL} />
    </svg>
  ),
  Explode: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={9} y={14} w={7} h={5} d={2} />
      <Block x={2} y={4} w={6} h={4} d={2} top={C.yellow} front={C.orange} side={C.yellowD} />
      <Block x={16} y={3} w={6} h={4} d={2} top={C.yellow} front={C.orange} side={C.yellowD} />
      <path d="M8 8l3 5M17 7l-3 6" stroke={C.greyD} strokeWidth={1} strokeDasharray="2 1.5" />
    </svg>
  ),
  // ---- drawings
  ModelView: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="4" width="18" height="16" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <Block x={7} y={8} w={8} h={6} d={3} />
    </svg>
  ),
  ProjectedView: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="12" width="8" height="8" fill={C.blueL} stroke={C.blueD} strokeWidth={1.2} />
      <rect x="13" y="12" width="8" height="8" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <rect x="3" y="2" width="8" height="8" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M11 16h2M7 10v2" stroke={C.greyD} strokeWidth={1} strokeDasharray="1.5 1" />
    </svg>
  ),
  SectionView: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="5" width="18" height="14" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M12 3v18" stroke={C.blue} strokeWidth={1.6} strokeDasharray="4 2" />
      <path d="M5 8l5 5M5 12l5 5M5 16l2 2" stroke={C.greyD} strokeWidth={0.8} />
    </svg>
  ),
  DetailView: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="12" width="9" height="9" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <circle cx="16" cy="8" r="5.5" fill={C.white} stroke={C.blue} strokeWidth={1.6} />
      <circle cx="7" cy="16" r="2" fill="none" stroke={C.blue} strokeWidth={1} />
    </svg>
  ),
  Standard3View: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="8" height="8" fill={C.blueL} stroke={C.blueD} strokeWidth={1.2} />
      <rect x="3" y="13" width="8" height="8" fill={C.blueL} stroke={C.blueD} strokeWidth={1.2} />
      <rect x="13" y="13" width="8" height="8" fill={C.blueL} stroke={C.blueD} strokeWidth={1.2} />
    </svg>
  ),
  Note: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 6h14M5 10h14M5 14h9" stroke={C.greyD} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M3 20l5-5" stroke={C.blue} strokeWidth={1.4} />
    </svg>
  ),
  Balloon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="14" cy="9" r="6" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <text x="14" y="12" fontSize="8" textAnchor="middle" fill={C.greyD} fontFamily="Arial">1</text>
      <path d="M9 13l-6 7" stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  SurfaceFinish: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 8l5 11 8-14" fill="none" stroke={C.greyD} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M12 8h7" stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  CenterMark: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="7" fill="none" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M12 2v20M2 12h20" stroke={C.blue} strokeWidth={1.2} strokeDasharray="5 1.5 1.5 1.5" />
    </svg>
  ),
  ViewCube: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={4} y={6} w={12} h={9} d={5} />
    </svg>
  ),
  AlignLeft: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke={C.greyD} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  AlignCenter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke={C.greyD} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  AlignRight: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6h16M10 10h10M4 14h16M10 18h10" stroke={C.greyD} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  ),
  Flip: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3v18" stroke={C.greyD} strokeWidth={1.2} strokeDasharray="2 2" />
      <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke={C.blue} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  ),
  Drawing: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="18" height="18" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M6 15h6V6" stroke={C.blue} strokeWidth={1.6} />
      <path d="M14 8h4M14 11h4M6 18h12" stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Sheet: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 2h9l5 5v15H5z" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M14 2v5h5" stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  New: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 2h9l5 5v15H5z" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M14 2v5h5" stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  Home: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 12L12 4l9 8" fill="none" stroke={C.greyD} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M6 11v9h5v-5h2v5h5v-9" fill={C.white} stroke={C.greyD} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  ),
  Open: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 6h6l2 2h10v12H3z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1.2} />
      <path d="M3 11h18l-2 9H3z" fill={C.orange} stroke={C.yellowD} strokeWidth={1} />
    </svg>
  ),
  Save: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h15l3 3v15H3z" fill={C.blue} stroke={C.blueD} strokeWidth={1} />
      <rect x="7" y="3" width="8" height="5" fill={C.white} />
      <rect x="6" y="13" width="12" height="8" fill={C.greyL} />
    </svg>
  ),
  Print: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="7" y="3" width="10" height="5" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <rect x="3" y="8" width="18" height="8" rx="1" fill={C.greyD} />
      <rect x="7" y="13" width="10" height="7" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <circle cx="18" cy="11" r="1" fill={C.green} />
    </svg>
  ),
  Rebuild: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" stroke={C.green} strokeWidth={2.4} />
      <path d="M20 3v5h-5" stroke={C.green} strokeWidth={2.4} />
      <path d="M8 13l3 3 5-6" stroke={C.red} strokeWidth={2.2} />
    </svg>
  ),
  Options: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="3" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke={C.greyD} strokeWidth={2.2} />
    </svg>
  ),
  /** a person (the sign-in button of the title row) */
  User: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="8.5" r="4" fill="#9aa3ad" stroke="#5a6068" strokeWidth={1} />
      <path d="M4.5 20.5c1-4.5 4-6.5 7.5-6.5s6.5 2 7.5 6.5z" fill="#9aa3ad" stroke="#5a6068" strokeWidth={1} />
    </svg>
  ),
  Help: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#5a6068" strokeWidth={1.6} />
      <path d="M9 9.5a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.2M12 17.5v.5" stroke="#5a6068" strokeWidth={1.9} />
    </svg>
  ),
  Pin: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M14 3l7 7-3 1.5-3.5-.5L9 16l-1.5 6-1.5-1.5L12 14l-.5-3.5L9 7z" fill={C.greyL} stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Sigma: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M17 5H7l6 7-6 7h10" fill="none" stroke={C.greyD} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  ),
  EyeOff: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7z" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <circle cx="12" cy="12" r="3.5" fill={C.greyD} />
      <path d="M4 20L20 4" stroke={C.greyD} strokeWidth={1.8} />
    </svg>
  ),
  ZoomSelection: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="10" cy="10" r="6.5" fill={C.white} stroke={C.greyD} strokeWidth={1.6} />
      <rect x="7" y="7" width="6" height="6" fill="none" stroke={C.greyD} strokeWidth={1.2} strokeDasharray="2 1" />
      <path d="M15 15l6 6" stroke={C.greyD} strokeWidth={2.4} />
    </svg>
  ),
  Search: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="10" cy="10" r="6.5" fill={C.white} stroke={C.greyD} strokeWidth={1.6} />
      <path d="M15 15l6 6" stroke={C.greyD} strokeWidth={2.4} />
    </svg>
  ),
  Library: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="4" width="4" height="16" fill={C.blue} />
      <rect x="8.5" y="4" width="4" height="16" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.6} />
      <path d="M14 5l4-1 3 15-4 1z" fill={C.green} />
    </svg>
  ),
  Folder: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 6h6l2 2h10v12H3z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1.2} />
    </svg>
  ),
  Palette: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="8" height="8" fill={C.blue} />
      <rect x="13" y="3" width="8" height="8" fill={C.yellow} />
      <rect x="3" y="13" width="8" height="8" fill={C.green} />
      <rect x="13" y="13" width="8" height="8" fill={C.red} />
    </svg>
  ),
  Properties: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="4" y="3" width="16" height="18" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M7 8h10M7 12h10M7 16h6" stroke={C.blue} strokeWidth={1.6} />
    </svg>
  ),
  TPMarketplace: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="3" width="14" height="11" rx="1" fill={C.greyL} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M5 7h8M5 10h5" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M12 12l5-2.5 5 2.5v6l-5 2.5-5-2.5z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M17 14.5v6M12 12l5 2.5 5-2.5" stroke={C.yellowD} strokeWidth={1} fill="none" />
    </svg>
  ),
  TPForum: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 4h13v8H7l-3 3v-3H2z" fill={C.blueL} stroke={C.blueD} strokeWidth={1.2} />
      <path d="M10 10h12v8h-2v3l-3-3h-7z" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  TPExplorer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 6h7l2 2h11v12H2z" fill={C.white} stroke={C.greyD} strokeWidth={1.3} />
      <path d="M2 10h20" stroke={C.greyD} strokeWidth={1} />
    </svg>
  ),
  TPPalette: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="4" y="5" width="4" height="15" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <rect x="8" y="4" width="4" height="16" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <rect x="12" y="3" width="4" height="17" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M16 4l4 1v15h-4" fill={C.greyL} stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  TPAppearances: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill={C.blue} />
      <path d="M12 3a9 9 0 0 1 9 9h-9z" fill={C.red} />
      <path d="M12 12h9a9 9 0 0 1-9 9z" fill={C.yellow} />
      <path d="M12 12v9a9 9 0 0 1-9-9z" fill={C.green} />
      <circle cx="9" cy="8" r="2.4" fill={C.white} opacity={0.6} />
    </svg>
  ),
  TPPlatform: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill={C.blueD} />
      <path d="M7 15l5-8 5 8z" fill={C.white} />
    </svg>
  ),
  TPRecovery: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="18" height="18" rx="1" fill={C.white} stroke={C.blueD} strokeWidth={1.3} />
      <path d="M3 8h18" stroke={C.blueD} strokeWidth={1.3} />
      <path d="M6 12h3M11 12h7M6 16h3M11 16h7" stroke={C.blue} strokeWidth={1.5} />
    </svg>
  ),
  Resources: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 3h10l5 5v13H4z" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M14 3v5h5" stroke={C.greyD} strokeWidth={1.4} />
      <path d="M7 12h10M7 16h10" stroke={C.blue} strokeWidth={1.6} />
      <circle cx="17" cy="17" r="4" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
    </svg>
  ),
  Filter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 4h18l-7 8v7l-4-2v-5z" fill={C.greyL} stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Config: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="4" width="18" height="6" fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />
      <rect x="3" y="14" width="18" height="6" fill={C.blueL} stroke={C.blue} strokeWidth={1.2} />
      <path d="M6 10v4" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M14 6l2 1-2 1zM14 16l2 1-2 1z" fill={C.blueD} />
    </svg>
  ),
  Tree: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="3" width="6" height="4" fill={C.blue} />
      <path d="M6 7v13" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M6 11h4M6 16h4" stroke={C.greyD} strokeWidth={1.2} />
      <rect x="10" y="9" width="8" height="4" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.6} />
      <rect x="10" y="14" width="8" height="4" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.6} />
    </svg>
  ),
  /** Feature Tree folder: a grey folder outline with a small glyph inside (history, sensors, annotations, bodies) */
  TreeFolder: ({ size = 16, glyph = 'history', ...p }: P & { glyph?: 'history' | 'sensor' | 'annotation' | 'bodies' | 'surfaces' | 'equations' }) => (
    <svg {...base(size, p)}>
      <path d="M1 3.5h8l2 2.5h12v16H1z" fill="#fbfbfb" stroke="#5d6672" strokeWidth={1.2} />
      <path d="M1 7.5h22" stroke="#5d6672" strokeWidth={0.9} />
      {glyph === 'history' && <g><circle cx="12" cy="14.5" r="4.2" fill="#e9f1fb" stroke={C.blueD} strokeWidth={1} /><path d="M12 12.2v2.4l1.8 1.1" stroke={C.blueD} strokeWidth={1} /></g>}
      {glyph === 'sensor' && <g><circle cx="12" cy="14.5" r="4.2" fill="#fff" stroke={C.greyD} strokeWidth={1} /><path d="M12 14.5l2.4-2.2" stroke={C.red} strokeWidth={1.3} /></g>}
      {glyph === 'annotation' && <g><rect x="7.5" y="10.5" width="9" height="8" fill="#eef4fb" stroke={C.blue} strokeWidth={0.8} /><path d="M9.5 17.5l2.5-5.6 2.5 5.6M10.4 15.6h3.2" stroke={C.blueD} strokeWidth={1} /></g>}
      {glyph === 'bodies' && <g stroke={C.blueD} strokeWidth={0.7}><path d="M8.5 12.5l3.5-1.8 3.5 1.8-3.5 1.8z" fill={C.blueL} /><path d="M8.5 12.5v4l3.5 1.8v-4z" fill={C.blue} /><path d="M15.5 12.5v4L12 18.3v-4z" fill={C.blueD} /></g>}
      {glyph === 'surfaces' && <path d="M7.5 17.5c2-4 6-1 9-6" stroke={C.blue} strokeWidth={1.4} />}
      {glyph === 'equations' && <path d="M8 13h8M8 16h8" stroke={C.greyD} strokeWidth={1.2} />}
    </svg>
  ),
  /** a reference plane in the tree: a dashed outline seen at an angle */
  TreePlane: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 1.5l14 4v17l-14-4z" fill="#fdfdfd" stroke="#4d5663" strokeWidth={1.2} strokeDasharray="2.6 1.6" />
      <path d="M12 6v12" stroke="#4d5663" strokeWidth={1} strokeDasharray="1.8 1.4" />
    </svg>
  ),
  /** Material in the tree: a list with a small gear */
  TreeMaterial: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="4" cy="5" r="1.6" fill="#fff" stroke={C.blue} strokeWidth={0.9} />
      <circle cx="4" cy="11" r="1.6" fill="#fff" stroke={C.blue} strokeWidth={0.9} />
      <circle cx="4" cy="17" r="1.6" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.9} />
      <path d="M8 5h13M8 11h13M8 17h6" stroke="#4d5663" strokeWidth={1.4} />
      <circle cx="18.5" cy="18.5" r="2.6" fill="#4d5663" />
      <circle cx="18.5" cy="18.5" r="1" fill="#fff" />
      <path d="M18.5 14.6v1.2M18.5 21.2v1.2M14.6 18.5h1.2M21.2 18.5h1.2" stroke="#4d5663" strokeWidth={1.2} />
    </svg>
  ),
  /** the solid expand triangle of the tree */
  TreeCaret: ({ size = 9, open = false, ...p }: P & { open?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 10 10" {...p}>
      {open ? <path d="M8.5 2.5v6h-6z" fill="#3c3c3c" /> : <path d="M3 1.5l4.5 3.5L3 8.5z" fill="#555" />}
    </svg>
  ),
  History: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M12 6.5V12l4 2.5" stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Sensor: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12h5l3-6 4 12 3-6h5" stroke={C.green} strokeWidth={2} />
    </svg>
  ),
  Annotation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20L12 3l8 17M7.5 14h9" stroke={C.greyD} strokeWidth={2} />
    </svg>
  ),
  Material: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 13l10-5 10 5-10 5z" fill={C.blueL} stroke={C.blue} strokeWidth={1} />
      <path d="M2 13v3l10 5 10-5v-3l-10 5z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
    </svg>
  ),
  Arrow: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3v18M3 12h18" stroke="#2f3a48" strokeWidth={1.6} />
      <path d="M12 1l2.5 3.5h-5zM12 23l2.5-3.5h-5zM1 12l3.5-2.5v5zM23 12l-3.5-2.5v5z" fill="#2f3a48" />
      <rect x="9" y="9" width="6" height="6" fill={C.blue} />
    </svg>
  ),
  Grid: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke={C.greyD} strokeWidth={1.4} />
      <circle cx="9" cy="9" r="2" fill={C.blue} />
    </svg>
  ),
  Keyboard: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="6" width="20" height="12" rx="1.5" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M6 10h1M10 10h1M14 10h1M18 10h0.5M7 14h10" stroke={C.greyD} strokeWidth={1.6} />
    </svg>
  ),
  Lock: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="#cfeadb" stroke="#2f7d4f" strokeWidth={1.2} />
      <path d="M8 15h8M12 9v6" stroke="#2f7d4f" strokeWidth={2} />
    </svg>
  ),
  /** Chamfer ▸ Vertex: a corner cut off by a triangle */
  ChamferVertex: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20V6l8-3 8 3v14z" fill="#e4e6e8" stroke="#3a3f46" strokeWidth={1} />
      <path d="M4 6l8 3 8-3M12 9v11" stroke="#3a3f46" strokeWidth={1} />
      <path d="M12 3l4 1.5-2 4.5-4-1.5z" fill="#6fadc8" stroke="#2b5f78" strokeWidth={0.9} />
    </svg>
  ),
  /** Chamfer ▸ Offset Face / Face Face: two faces with the chamfer between them */
  ChamferFace: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20V6l8-3 8 3v14z" fill="#e4e6e8" stroke="#3a3f46" strokeWidth={1} />
      <path d="M4 6l8 3 8-3M12 9v11" stroke="#3a3f46" strokeWidth={1} />
      <path d="M9.5 8l-5.5-2v4l5.5 2.5z" fill="#6fadc8" stroke="#2b5f78" strokeWidth={0.9} />
      <path d="M14.5 8l5.5-2v4l-5.5 2.5z" fill="#a9d3e2" stroke="#2b5f78" strokeWidth={0.9} />
    </svg>
  ),
  /** Zebra Stripes: a sphere with the reflected stripes */
  Zebra: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill="#f2f2f2" stroke="#3a3f46" strokeWidth={1} />
      <path d="M4 8.5c5 2 11 2 16 0M3.2 12c6 2.5 11.6 2.5 17.6 0M4.4 15.6c5 2 10.2 2 15.2 0" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
    </svg>
  ),
  Warning: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3l10 18H2z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M12 9.5v5M12 17.5v.5" stroke={C.greyD} strokeWidth={2} />
    </svg>
  ),
  // feature icons as isometric solids (icons3d.tsx) and the Sketch tab's line art (iconsSketch.tsx) override the flat ones above
  ...Icons3D,
  ...IconsSketch,
};

/** Small relation glyphs shown in green boxes next to geometry. */
const g = (size: number, p: P) => ({ ...base(size, p), viewBox: '0 0 16 16', stroke: 'currentColor', strokeWidth: 1.5 });
export const RelationGlyph: Record<string, (p: P) => ReactElement> = {
  // Polygon relation: a small hexagon with a dot (one per side of a polygon drawn with the Polygon tool)
  polygon: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M5 2.5h6l3 5.5-3 5.5H5L2 8z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  horizontal: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 8h12" />
    </svg>
  ),
  vertical: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M8 2v12" />
    </svg>
  ),
  coincident: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  pointOnEntity: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 11L14 5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  ),
  parallel: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M5 13L9 3M9 13l4-10" />
    </svg>
  ),
  perpendicular: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M3 13h10M8 13V3" />
    </svg>
  ),
  tangent: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <circle cx="8" cy="9" r="4" />
      <path d="M2 5h12" />
    </svg>
  ),
  equal: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M3 6h10M3 10h10" />
    </svg>
  ),
  // Intersection: two crossing lines with the point on the crossing
  intersection: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M3 3l10 10M13 3L3 13" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Merge: two points drawn together into one
  merge: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 8h4M10 8h4M5 6l2 2-2 2M11 6L9 8l2 2" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Equal Curvature: a line running on into a curve, with the equal sign
  equalCurvature: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 12h5c3 0 5-2 6-6" />
      <path d="M9 3h4M9 5h4" />
    </svg>
  ),
  // Coradial: two concentric arcs of one radius
  coradial: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M3 11a5 5 0 0 1 10 0" />
      <path d="M5 11a3 3 0 0 1 6 0" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  // Equal Curve Length: two curves with the equal mark
  equalCurveLength: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 6c3-4 6 4 9 0M2 12c3-4 6 4 9 0" />
      <path d="M12.5 7h2M12.5 10h2" />
    </svg>
  ),
  concentric: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  collinear: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 8h5M9 8h5" />
    </svg>
  ),
  midpoint: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 8h12" />
      <path d="M8 5v6" />
    </svg>
  ),
  symmetric: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M8 2v12" strokeDasharray="2 1.5" />
      <path d="M3 5l3 3-3 3M13 5l-3 3 3 3" />
    </svg>
  ),
  fix: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <rect x="4" y="7" width="8" height="6" rx="1" />
      <path d="M6 7V5a2 2 0 0 1 4 0v2" />
    </svg>
  ),
  /** Pierce: a curve through a point on a plane */
  pierce: ({ size = 12, ...p }) => (
    <svg {...g(size, p)}>
      <path d="M2 11l5-2 7 3" />
      <path d="M8 2c1 3-1 6 0 12" />
      <circle cx="7.6" cy="9.2" r="1.4" />
    </svg>
  ),
};
