import type { SVGProps } from 'react';

/**
 * Sketch icons in the 2D line-art language of a desktop CAD Sketch tab: teal strokes about 1.6 px wide on the 24 px
 * grid, small square end points, light teal fills. Own designs.
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

const T = '#3f7f9c'; // teal stroke
const TL = '#cfe6ef'; // light teal fill
const D = '#3a3f46'; // dark outline / black line work
const Y = '#f4d55c';
const YD = '#b8951f';
const B = '#2b6cb0';
const R = '#cf3b3f';
const W = '#ffffff';

/** a sketch end point: a small square */
const Pt = ({ x, y }: { x: number; y: number }) => <rect x={x - 1.6} y={y - 1.6} width={3.2} height={3.2} fill={W} stroke={D} strokeWidth={0.9} />;

export const IconsSketch = {
  Line: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4.5 19.5L19.5 4.5" stroke={T} strokeWidth={1.7} />
      <Pt x={4.5} y={19.5} />
      <Pt x={19.5} y={4.5} />
    </svg>
  ),
  Rect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={4.5} y={6.5} width={15} height={11} fill={TL} stroke={T} strokeWidth={1.7} />
      <Pt x={4.5} y={6.5} />
      <Pt x={19.5} y={17.5} />
    </svg>
  ),
  CenterRect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={4.5} y={6.5} width={15} height={11} fill={TL} stroke={T} strokeWidth={1.7} />
      <path d="M4.5 6.5L19.5 17.5M19.5 6.5L4.5 17.5" stroke={T} strokeWidth={0.8} strokeDasharray="1.6 1.2" />
      <Pt x={12} y={12} />
      <Pt x={19.5} y={17.5} />
    </svg>
  ),
  Circle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx={12} cy={12} r={7.5} fill={TL} stroke={T} strokeWidth={1.7} />
      <Pt x={12} y={12} />
      <Pt x={19.5} y={12} />
    </svg>
  ),
  PerimeterCircle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx={12} cy={12} r={7.5} fill={TL} stroke={T} strokeWidth={1.7} />
      <Pt x={12} y={4.5} />
      <Pt x={5.5} y={15.8} />
      <Pt x={18.5} y={15.8} />
    </svg>
  ),
  Arc: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 17a9 9 0 0 1 14 0" stroke={T} strokeWidth={1.7} />
      <path d="M5 17V7.5" stroke={T} strokeWidth={0.8} strokeDasharray="1.6 1.2" />
      <Pt x={5} y={17} />
      <Pt x={19} y={17} />
    </svg>
  ),
  ArcCenter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5.5 16.5a7 7 0 1 1 13 0" stroke={T} strokeWidth={1.7} />
      <path d="M12 13v-6" stroke={T} strokeWidth={0.8} strokeDasharray="1.6 1.2" />
      <Pt x={12} y={13} />
      <Pt x={5.5} y={16.5} />
      <Pt x={18.5} y={16.5} />
    </svg>
  ),
  Arc3Point: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4.5 16a9 9 0 0 1 15 0" stroke={T} strokeWidth={1.7} />
      <Pt x={4.5} y={16} />
      <Pt x={12} y={9.2} />
      <Pt x={19.5} y={16} />
    </svg>
  ),
  Spline: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 17c2-11 5-11 8-2s6 9 8-8" stroke={T} strokeWidth={1.7} />
      <Pt x={4} y={17} />
      <Pt x={20} y={7} />
    </svg>
  ),
  Ellipse: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <ellipse cx={12} cy={12} rx={8} ry={5.5} fill={TL} stroke={T} strokeWidth={1.7} transform="rotate(-25 12 12)" />
      <Pt x={12} y={12} />
    </svg>
  ),
  Slot: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={3.5} y={8} width={17} height={8} rx={4} fill={TL} stroke={T} strokeWidth={1.7} />
      <Pt x={7.5} y={12} />
      <Pt x={16.5} y={12} />
    </svg>
  ),
  Polygon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 4.5l6.9 4v8l-6.9 4-6.9-4v-8z" fill={TL} stroke={T} strokeWidth={1.7} />
      <Pt x={12} y={12.5} />
    </svg>
  ),
  /** Sketch Fillet: two lines joined by a round */
  SketchFillet: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20V11a6 6 0 0 1 6-6h9" stroke={D} strokeWidth={1.7} />
      <path d="M4 11V5h6" stroke={T} strokeWidth={0.8} strokeDasharray="1.4 1.2" />
      <path d="M6.2 7.2l1.6 1.6M7.8 7.2l-1.6 1.6" stroke={R} strokeWidth={0.9} />
    </svg>
  ),
  SketchChamfer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 20v-8l7-7h8" stroke={D} strokeWidth={1.7} />
      <path d="M4 12V5h7" stroke={T} strokeWidth={0.8} strokeDasharray="1.4 1.2" />
    </svg>
  ),
  Text: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 20L12 4l7 16M7.6 14.5h8.8" stroke={T} strokeWidth={1.7} fill="none" />
      <path d="M8.8 12l3.2-6.8 3.2 6.8z" fill={TL} />
    </svg>
  ),
  Point: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={9.5} y={9.5} width={5} height={5} fill={T} stroke={D} strokeWidth={0.9} />
    </svg>
  ),
  /** Exit Sketch: the sketch plane with the return arrow */
  ExitSketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18l5-11h13l-5 11z" fill="#dfe3e8" stroke={D} strokeWidth={1} />
      <path d="M10 19.5c6 0 8-3 8-7.5" stroke={B} strokeWidth={1.8} fill="none" />
      <path d="M18 8.5v4.2h-4.2" stroke={B} strokeWidth={1.8} fill="none" />
    </svg>
  ),
  /** Smart Dimension: the dimension with the smart stroke */
  SmartDimension: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 18.5L19 4.5" stroke={D} strokeWidth={1.6} />
      <path d="M5 18.5l.5-4.2M5 18.5l4.2-.5M19 4.5l-4.2.5M19 4.5l-.5 4.2" stroke={D} strokeWidth={1.6} />
      <path d="M4 7.5l3.5-3.5 3 3-3.5 3.5z" fill={Y} stroke={YD} strokeWidth={0.8} />
      <path d="M12 20.5h8" stroke={D} strokeWidth={1.2} />
    </svg>
  ),
  TrimEntities: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 10.5h18M3 14.5h18" stroke={T} strokeWidth={1.4} />
      <circle cx={8} cy={6} r={2.6} fill={W} stroke={D} strokeWidth={1.4} />
      <circle cx={8} cy={18} r={2.6} fill={W} stroke={D} strokeWidth={1.4} />
      <path d="M10 7.5l9 9M10 16.5l9-9" stroke={D} strokeWidth={1.6} />
      <path d="M15 10.5h6M15 14.5h6" stroke="#b9c1cc" strokeWidth={1.4} strokeDasharray="1.5 1.5" />
    </svg>
  ),
  /** Convert Entities: a block whose edges project onto the sketch */
  ConvertEntities: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 9l6-3.5 6 3.5v7l-6 3.5-6-3.5z" fill="#e8ebee" stroke={D} strokeWidth={1} />
      <path d="M6 9l6 3.5 6-3.5M12 12.5V19.5" stroke={D} strokeWidth={1} />
      <path d="M6 9l6-3.5 6 3.5v7l-6 3.5-6-3.5z" stroke={T} strokeWidth={1.7} fill="none" />
    </svg>
  ),
  OffsetEntities: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M16 5H8a3 3 0 0 0-3 3v11h11" stroke={D} strokeWidth={1.7} />
      <path d="M19 9h-9.5a1 1 0 0 0-1 1v7h9.5" stroke={T} strokeWidth={1.7} />
    </svg>
  ),
  OffsetOnSurface: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 17c4-6 14-6 18 0v3c-4-6-14-6-18 0z" fill="#e8ebee" stroke={D} strokeWidth={1} />
      <path d="M6 14.5c3-3.5 9-3.5 12 0" stroke={T} strokeWidth={1.6} />
      <path d="M7.5 11.5c2.5-2.6 6.5-2.6 9 0" stroke={T} strokeWidth={1.6} />
    </svg>
  ),
  MirrorEntities: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 3v18" stroke={D} strokeWidth={0.9} strokeDasharray="2 1.4" />
      <path d="M9.5 7.5h-4v9h4" stroke={T} strokeWidth={1.7} fill="none" />
      <path d="M14.5 7.5h4v9h-4" stroke={T} strokeWidth={1.7} fill="none" />
      <Pt x={9.5} y={7.5} />
      <Pt x={14.5} y={7.5} />
    </svg>
  ),
  /** Linear Sketch Pattern: four small outline squares */
  SketchPattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      {[[4, 5], [13, 5], [4, 14], [13, 14]].map(([x, y], i) => <rect key={i} x={x} y={y} width={6} height={5} fill={TL} stroke={T} strokeWidth={1.3} />)}
      <path d="M8 9.5h2m4 0h2M7 12.5v-2m9 2v-2" stroke={T} strokeWidth={0.8} strokeDasharray="1 1" />
    </svg>
  ),
  /** Move Entities: the arrow and the moved outline */
  MoveEntities: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x={4} y={13} width={7} height={7} fill="none" stroke="#b9c1cc" strokeWidth={1} strokeDasharray="1.4 1" />
      <rect x={13} y={4} width={7} height={7} fill={TL} stroke={T} strokeWidth={1.4} />
      <path d="M6 18L15 9" stroke={D} strokeWidth={1.6} />
      <path d="M15 9h-4M15 9v4" stroke={D} strokeWidth={1.6} />
    </svg>
  ),
  /** Display/Delete Relations: the perpendicular glyph with an eye */
  DisplayRelations: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 3v10M3 13h10" stroke={D} strokeWidth={1.8} />
      <path d="M11 17.5c2-3 8-3 10 0c-2 3-8 3-10 0z" fill={W} stroke={D} strokeWidth={1.2} />
      <circle cx={16} cy={17.5} r={1.6} fill={D} />
    </svg>
  ),
  /** Repair Sketch: a sketch sheet with a wrench */
  RepairSketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 4h12v8H4z" fill={W} stroke={D} strokeWidth={1.1} />
      <path d="M6.5 7h7M6.5 9.5h4" stroke={T} strokeWidth={1.2} />
      <path d="M20.5 11.5a3.5 3.5 0 0 1-4.2 4.6l-5.1 5.1-2.4-2.4 5.1-5.1a3.5 3.5 0 0 1 4.6-4.2l-2 2 1.4 1.4z" fill={T} stroke={D} strokeWidth={0.9} />
    </svg>
  ),
  /** Quick Snaps: the snap target */
  QuickSnaps: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 4h16v16H4z" fill={W} stroke={D} strokeWidth={1.1} />
      <circle cx={12} cy={12} r={5} fill="none" stroke={T} strokeWidth={1.6} />
      <circle cx={12} cy={12} r={1.6} fill={D} />
      <path d="M4 8h3M4 16h3M17 8h3M17 16h3" stroke={D} strokeWidth={0.9} />
    </svg>
  ),
  /** Rapid Sketch: the plane with a lightning bolt */
  RapidSketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18l5-11h13l-5 11z" fill="#dfe3e8" stroke={D} strokeWidth={1} />
      <path d="M13.5 3l-5 9h4l-2 8 7-11h-4z" fill={Y} stroke={YD} strokeWidth={0.9} />
    </svg>
  ),
  /** Drag Dimensions: a ruler on the sketch plane */
  DragDimensions: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18l5-11h13l-5 11z" fill="#dfe3e8" stroke={D} strokeWidth={1} />
      <g transform="rotate(-35 12 11)">
        <rect x={4} y={8.5} width={16} height={5} fill={Y} stroke={YD} strokeWidth={0.8} />
        {[7, 10, 13, 16].map((x) => <path key={x} d={`M${x} 8.5v${x === 13 ? 3 : 1.8}`} stroke={YD} strokeWidth={0.8} />)}
      </g>
      <path d="M17 20l-3.5-3.5M17 20h-2.6M17 20v-2.6" stroke={B} strokeWidth={1.3} />
    </svg>
  ),
  /** Shaded Sketch Contours: a closed contour filled */
  ShadedContours: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 4l9 15H3z" fill={TL} stroke={T} strokeWidth={1.6} />
      <circle cx={12} cy={14.5} r={3.2} fill="#8fc3d6" stroke={T} strokeWidth={1.2} />
      <Pt x={12} y={4} />
    </svg>
  ),
  /** sketch Plane (3D sketch plane tool), greyed in a 2D sketch */
  SketchPlane: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 18l5-11h13l-5 11z" fill="none" stroke={T} strokeWidth={1.2} strokeDasharray="1.8 1.4" />
      <Pt x={8} y={7} />
      <Pt x={16} y={18} />
    </svg>
  ),
};
