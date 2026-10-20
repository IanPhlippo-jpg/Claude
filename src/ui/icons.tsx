import type { ReactElement, SVGProps } from 'react';

/** Kalibr line-icon set, 16px grid, 1.5 stroke. All drawn in-house. */
type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const Icon = {
  Logo: ({ size = 20, ...p }: P) => (
    <svg {...base(size, p)} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M4 20V4l8 8-8 8" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M12 4h8M12 20h8M14 12h6" />
    </svg>
  ),
  Select: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 2l10 6-4 1.5L7 14 3 2z" />
    </svg>
  ),
  Line: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 13L13 3" />
      <circle cx="3" cy="13" r="1.3" fill="currentColor" />
      <circle cx="13" cy="3" r="1.3" fill="currentColor" />
    </svg>
  ),
  Rect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2.5" y="3.5" width="11" height="9" />
      <circle cx="2.5" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="13.5" cy="12.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  CenterRect: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2.5" y="3.5" width="11" height="9" />
      <path d="M8 6.5v3M6.5 8h3" />
    </svg>
  ),
  Circle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  Arc: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 13A7 7 0 0 1 13 3" />
      <circle cx="3" cy="13" r="1.2" fill="currentColor" />
      <circle cx="13" cy="3" r="1.2" fill="currentColor" />
    </svg>
  ),
  ArcCenter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 12A6 6 0 0 1 12 4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 12L4 12M12 12L12 4" strokeDasharray="1.5 1.5" />
    </svg>
  ),
  Spline: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12C5 2 8 14 14 4" />
      <circle cx="2" cy="12" r="1.2" fill="currentColor" />
      <circle cx="14" cy="4" r="1.2" fill="currentColor" />
    </svg>
  ),
  Point: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <path d="M8 2v2.5M8 11.5V14M2 8h2.5M11.5 8H14" />
    </svg>
  ),
  Dimension: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 11h12M2 8v6M14 8v6" />
      <path d="M4 11l2-1.5M4 11l2 1.5M12 11l-2-1.5M12 11l-2 1.5" />
      <path d="M6 5h4" />
    </svg>
  ),
  Construction: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 14L14 2" strokeDasharray="2.5 2" />
    </svg>
  ),
  Trim: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3l10 10M13 3L3 13" />
      <circle cx="5" cy="11" r="1.5" />
      <circle cx="11" cy="11" r="1.5" />
    </svg>
  ),
  Exit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 3H3v10h3M10 5l3 3-3 3M13 8H6" />
    </svg>
  ),
  Check: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  ),
  Close: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  Undo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 4L3 7l3 3" />
      <path d="M3 7h6a4 4 0 0 1 0 8H7" />
    </svg>
  ),
  Redo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M10 4l3 3-3 3" />
      <path d="M13 7H7a4 4 0 0 0 0 8h2" />
    </svg>
  ),
  Sun: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
    </svg>
  ),
  Moon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M13 10A6 6 0 0 1 6 3a6 6 0 1 0 7 7z" />
    </svg>
  ),
  Sketch: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12l5-9 7 3-5 9z" />
      <path d="M5 11l5-7" strokeDasharray="1.5 1.5" />
    </svg>
  ),
  Plane: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 11l4-7h8l-4 7z" />
    </svg>
  ),
  Origin: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2v12M2 8h12" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  Part: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l6 3v6l-6 3-6-3V5z" />
      <path d="M8 8l6-3M8 8L2 5M8 8v6" />
    </svg>
  ),
  ChevronRight: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 3l5 5-5 5" />
    </svg>
  ),
  ChevronDown: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 6l5 5 5-5" />
    </svg>
  ),
  Menu: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 4h10M3 8h10M3 12h10" />
    </svg>
  ),
  Dots: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="4" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  Trash: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 4h10M6 4V2.5h4V4M4.5 4l.7 9h5.6l.7-9" />
    </svg>
  ),
  Fit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
    </svg>
  ),
  Grid: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 6h12M2 10h12M6 2v12M10 2v12" />
    </svg>
  ),
  Keyboard: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="1.5" y="4" width="13" height="8" rx="1" />
      <path d="M4 7h1M7 7h1M10 7h1M5 9.5h6" />
    </svg>
  ),
  Lock: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="3.5" y="7" width="9" height="7" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  ),
  Warning: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l6.5 11h-13z" />
      <path d="M8 6.5v3M8 11.5v.5" />
    </svg>
  ),
  Extrude: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 10l5-2.5 5 2.5-5 2.5z" />
      <path d="M3 10V6l5-2.5 5 2.5v4M3 6l5 2.5L13 6" />
    </svg>
  ),
  Save: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h8l2 2v8H3z" />
      <path d="M5 3v3h5V3M5 13V9h6v4" />
    </svg>
  ),
  Open: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 4h4l1.5 1.5H14v8H2z" />
    </svg>
  ),
  New: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 2h5l3 3v9H4z" />
      <path d="M9 2v3h3" />
    </svg>
  ),
};

/** Small relation glyphs shown next to geometry. */
export const RelationGlyph: Record<string, (p: P) => ReactElement> = {
  horizontal: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M2 8h12" />
    </svg>
  ),
  vertical: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M8 2v12" />
    </svg>
  ),
  coincident: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  pointOnEntity: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M2 11L14 5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  ),
  parallel: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M5 13L9 3M9 13l4-10" />
    </svg>
  ),
  perpendicular: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M3 13h10M8 13V3" />
    </svg>
  ),
  tangent: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="9" r="4" />
      <path d="M2 5h12" />
    </svg>
  ),
  equal: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M3 6h10M3 10h10" />
    </svg>
  ),
  concentric: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  collinear: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M2 8h5M9 8h5" />
    </svg>
  ),
  midpoint: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M2 8h12" />
      <path d="M8 5v6" />
    </svg>
  ),
  symmetric: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <path d="M8 2v12" strokeDasharray="2 1.5" />
      <path d="M3 5l3 3-3 3M13 5l-3 3 3 3" />
    </svg>
  ),
  fix: ({ size = 12, ...p }) => (
    <svg {...base(size, p)}>
      <rect x="4" y="7" width="8" height="6" rx="1" />
      <path d="M6 7V5a2 2 0 0 1 4 0v2" />
    </svg>
  ),
};
