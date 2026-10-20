import type { ReactElement, SVGProps } from 'react';

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
  Line: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20L20 4" stroke={C.blue} strokeWidth={2} />
      <rect x="2" y="18" width="4" height="4" fill={C.blueD} />
      <rect x="18" y="2" width="4" height="4" fill={C.blueD} />
    </svg>
  ),
  Rect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="4" y="6" width="16" height="12" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
      <rect x="2" y="4" width="4" height="4" fill={C.blueD} />
      <rect x="18" y="16" width="4" height="4" fill={C.blueD} />
    </svg>
  ),
  CenterRect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="4" y="6" width="16" height="12" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
      <path d="M12 9v6M9 12h6" stroke={C.greyD} strokeWidth={1.2} />
      <rect x="18" y="16" width="4" height="4" fill={C.blueD} />
    </svg>
  ),
  Circle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="8" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
      <path d="M12 9.5v5M9.5 12h5" stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Arc: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 19A12 12 0 0 1 19 4" stroke={C.blue} strokeWidth={2} />
      <rect x="2" y="17" width="4" height="4" fill={C.blueD} />
      <rect x="17" y="2" width="4" height="4" fill={C.blueD} />
      <rect x="9" y="7" width="3.5" height="3.5" fill={C.blueD} />
    </svg>
  ),
  ArcCenter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 18A10 10 0 0 1 18 5" stroke={C.blue} strokeWidth={2} />
      <path d="M18 18L5 18M18 18V5" stroke={C.grey} strokeWidth={1} strokeDasharray="2 1.5" />
      <path d="M18 15v6M15 18h6" stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Spline: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18C7 3 11 21 21 5" stroke={C.blue} strokeWidth={2} />
      <rect x="1.5" y="16" width="4" height="4" fill={C.blueD} />
      <rect x="19" y="3" width="4" height="4" fill={C.blueD} />
      <rect x="10" y="10" width="3.5" height="3.5" fill={C.blueD} />
    </svg>
  ),
  Point: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke={C.greyD} strokeWidth={1.4} />
      <rect x="9.5" y="9.5" width="5" height="5" fill={C.blueD} />
    </svg>
  ),
  Dimension: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 5v14M21 5v14" stroke={C.greyD} strokeWidth={1.2} />
      <path d="M6 15h12" stroke={C.blue} strokeWidth={1.6} />
      <path d="M3 15l4-2.2v4.4zM21 15l-4-2.2v4.4z" fill={C.blue} />
      <rect x="8" y="5" width="8" height="6" rx="1" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
    </svg>
  ),
  Construction: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20L20 4" stroke={C.blue} strokeWidth={2} strokeDasharray="3.5 2.5" />
    </svg>
  ),
  Trim: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 3l9 11M19 3l-9 11" stroke={C.blue} strokeWidth={2} />
      <circle cx="7" cy="18" r="3" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <circle cx="17" cy="18" r="3" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  Convert: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={4} y={6} w={12} h={8} d={5} top={C.greyL} front={C.greyL} side={C.grey} />
      <path d="M4 11h12" stroke={C.blue} strokeWidth={2.4} />
      <path d="M16 11l5-5" stroke={C.blue} strokeWidth={2.4} />
    </svg>
  ),
  Offset: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20V8l6-4h10v14" stroke={C.blue} strokeWidth={2} />
      <path d="M9 20v-9l4-2.5h5" stroke={C.yellowD} strokeWidth={1.8} />
    </svg>
  ),
  Mirror: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 2v20" stroke={C.greyD} strokeWidth={1.2} strokeDasharray="2.5 2" />
      <path d="M3 17l6-5-6-5z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M21 17l-6-5 6-5z" fill={C.blueL} stroke={C.blue} strokeWidth={0.8} />
    </svg>
  ),
  Slot: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3" y="7" width="18" height="10" rx="5" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Ellipse: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <ellipse cx="12" cy="12" rx="9" ry="6" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Polygon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill={C.blueL} stroke={C.blue} strokeWidth={2} />
    </svg>
  ),
  Text: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 5h16M12 5v15M8 20h8" stroke={C.blueD} strokeWidth={2.2} />
    </svg>
  ),
  Fillet2D: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 21V12a8 8 0 0 1 8-8h9" stroke={C.blue} strokeWidth={2.2} />
      <path d="M4 10V4h6" stroke={C.grey} strokeWidth={1.2} strokeDasharray="2 1.5" />
    </svg>
  ),
  Exit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={7} />
      <Pencil x={9} y={1} />
      <path d="M3 3l5 5M8 3L3 8" stroke={C.red} strokeWidth={2} />
    </svg>
  ),
  Sketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Plane x={2} y={7} />
      <Pencil x={10} y={2} />
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
  Part: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={6} w={12} h={10} d={6} top={C.yellow} front={C.blue} side={C.blueD} />
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
  Trash: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 7h16" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M9 7V4h6v3" stroke={C.greyD} strokeWidth={1.6} />
      <path d="M6 7l1 13h10l1-13z" fill={C.greyL} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M10 10v7M14 10v7" stroke={C.red} strokeWidth={1.4} />
    </svg>
  ),
  Fit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="10" cy="10" r="6" fill={C.white} stroke={C.greyD} strokeWidth={1.6} />
      <path d="M14.5 14.5L20 20" stroke={C.greyD} strokeWidth={2.2} />
      <path d="M7 7l6 6M13 7l-6 6" stroke={C.blue} strokeWidth={1.4} />
    </svg>
  ),
  ZoomArea: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="10" cy="10" r="6" fill={C.white} stroke={C.greyD} strokeWidth={1.6} />
      <path d="M14.5 14.5L20 20" stroke={C.greyD} strokeWidth={2.2} />
      <rect x="7" y="7" width="6" height="6" fill={C.blueL} stroke={C.blue} strokeWidth={1} />
    </svg>
  ),
  Previous: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M9 5L4 10l5 5" stroke={C.blue} strokeWidth={2} />
      <path d="M4 10h9a5 5 0 0 1 0 10" stroke={C.blue} strokeWidth={2} />
      <circle cx="16" cy="6" r="3" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
    </svg>
  ),
  Section: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={6} w={12} h={10} d={6} />
      <path d="M2 12h20" stroke={C.red} strokeWidth={1.4} strokeDasharray="2.5 1.5" />
      <path d="M3 12h12v4H3z" fill={C.red} opacity={0.35} />
    </svg>
  ),
  Orientation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={4} y={6} w={11} h={10} d={5} top={C.greyL} front={C.white} side={C.greyL} />
      <path d="M4 11h11v10H4z" fill={C.blueL} stroke={C.blueD} strokeWidth={0.8} />
    </svg>
  ),
  DisplayStyle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={4} y={6} w={11} h={10} d={5} />
    </svg>
  ),
  Eye: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill={C.white} stroke={C.greyD} strokeWidth={1.4} />
      <circle cx="12" cy="12" r="3.5" fill={C.blue} />
      <circle cx="12" cy="12" r="1.5" fill={C.greyD} />
    </svg>
  ),
  Appearance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill={C.blue} />
      <path d="M12 3a9 9 0 0 1 0 18z" fill={C.orange} />
      <circle cx="9" cy="9" r="2.5" fill={C.white} opacity={0.8} />
    </svg>
  ),
  Scene: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="4" width="20" height="16" rx="1.5" fill={C.blueL} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M3 19l5.5-7 4 4.5 3-3.5L21 19z" fill={C.green} />
      <circle cx="16.5" cy="8" r="2" fill={C.yellow} />
    </svg>
  ),
  ViewSettings: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="4" width="20" height="13" rx="1.5" fill={C.blueL} stroke={C.greyD} strokeWidth={1.4} />
      <path d="M9 21h6M12 17v4" stroke={C.greyD} strokeWidth={1.6} />
    </svg>
  ),
  Extrude: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18l5-5h12l-5 5z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
      <Block x={5} y={2} w={9} h={9} d={5} />
    </svg>
  ),
  Cut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={6} w={13} h={10} d={6} />
      <path d="M6 11h7v4H6z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
      <path d="M13 11l3-3v4l-3 3z" fill={C.yellowD} />
    </svg>
  ),
  Revolve: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 2v20" stroke={C.greyD} strokeWidth={1} strokeDasharray="2 1.5" />
      <path d="M12 5c6 0 9 2 9 4s-3 4-9 4-9-2-9-4 3-4 9-4z" fill={C.blueL} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M3 9v7c0 2 4 4 9 4s9-2 9-4V9c0 2-3 4-9 4S3 11 3 9z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
    </svg>
  ),
  Sweep: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 19c5 0 4-10 10-10" stroke={C.blue} strokeWidth={4} />
      <ellipse cx="17" cy="8" rx="3.5" ry="2.2" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
    </svg>
  ),
  Loft: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 5h12l3 14H3z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <ellipse cx="12" cy="5" rx="6" ry="2" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} />
      <ellipse cx="12" cy="19" rx="9" ry="2.5" fill={C.blueL} stroke={C.blueD} strokeWidth={0.8} />
    </svg>
  ),
  Hole: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={8} w={13} h={8} d={6} />
      <ellipse cx="11" cy="12" rx="3.5" ry="1.6" fill={C.greyD} />
      <path d="M19 2v8" stroke={C.greyD} strokeWidth={2} />
      <path d="M17 9l2 3 2-3z" fill={C.greyD} />
    </svg>
  ),
  Shell: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Block x={3} y={6} w={13} h={10} d={6} />
      <path d="M6 10h7v6H6z" fill={C.blueL} stroke={C.blueD} strokeWidth={0.6} />
    </svg>
  ),
  Pattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="4" width="5" height="5" fill={C.blue} />
      <rect x="9.5" y="4" width="5" height="5" fill={C.blue} />
      <rect x="17" y="4" width="5" height="5" fill={C.blue} />
      <rect x="2" y="14" width="5" height="5" fill={C.blueL} stroke={C.blue} strokeWidth={0.8} />
      <rect x="9.5" y="14" width="5" height="5" fill={C.blueL} stroke={C.blue} strokeWidth={0.8} />
      <rect x="17" y="14" width="5" height="5" fill={C.blueL} stroke={C.blue} strokeWidth={0.8} />
    </svg>
  ),
  Chamfer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 21V10l7-7h11v18z" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M3 10l7-7" stroke={C.yellow} strokeWidth={2.4} />
    </svg>
  ),
  Measure: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 16L16 3l5 5L8 21z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M7 12l2 2M10 9l2 2M13 6l2 2" stroke={C.greyD} strokeWidth={1.2} />
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
  Help: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9.5" fill={C.blue} />
      <path d="M9 9.5a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.2M12 17.5v.5" stroke={C.white} strokeWidth={2} />
    </svg>
  ),
  Pin: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M14 3l7 7-3 1.5-3.5-.5L9 16l-1.5 6-1.5-1.5L12 14l-.5-3.5L9 7z" fill={C.greyL} stroke={C.greyD} strokeWidth={1.2} />
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
      <path d="M3 12h14" stroke={C.blue} strokeWidth={2.4} />
      <path d="M14 6l7 6-7 6z" fill={C.blue} />
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
      <rect x="5" y="10" width="14" height="10" rx="1.5" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={C.greyD} strokeWidth={2} />
      <circle cx="12" cy="15" r="1.6" fill={C.greyD} />
    </svg>
  ),
  Warning: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3l10 18H2z" fill={C.yellow} stroke={C.yellowD} strokeWidth={1} />
      <path d="M12 9.5v5M12 17.5v.5" stroke={C.greyD} strokeWidth={2} />
    </svg>
  ),
};

/** Small relation glyphs shown in green boxes next to geometry. */
const g = (size: number, p: P) => ({ ...base(size, p), viewBox: '0 0 16 16', stroke: 'currentColor', strokeWidth: 1.5 });
export const RelationGlyph: Record<string, (p: P) => ReactElement> = {
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
};
