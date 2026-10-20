import type { ReactElement, SVGProps } from 'react';

/** Phlippo line-icon set, 16px grid, 1.5 stroke. All drawn in-house. */
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
    <svg {...base(size, p)} viewBox="0 0 32 32" strokeWidth={0}>
      <rect width="32" height="32" rx="7" fill="#17407e" />
      <path d="M9 25V7h8.5a5.5 5.5 0 0 1 0 11H13" fill="none" stroke="#ffffff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="23" r="3.2" fill="#f28c28" />
      <path d="M13 18l6.5 4" stroke="#f28c28" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
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
  Search: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  Print: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6V2.5h8V6M3 6h10v5h-2v2.5H5V11H3z" />
    </svg>
  ),
  Rebuild: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M13 8a5 5 0 1 1-1.5-3.5" />
      <path d="M13 2v3h-3" />
    </svg>
  ),
  Options: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </svg>
  ),
  Help: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M6 6.5a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M8 12v.3" />
    </svg>
  ),
  Pin: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M9 2l5 5-2 1-2.5-.5L6 11l-1 4-1-1 4-3.5-.5-2.5L6 6l1-2z" />
    </svg>
  ),
  ZoomArea: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="6.5" cy="6.5" r="4" />
      <path d="M9.5 9.5L13 13" />
      <rect x="4.5" y="4.5" width="4" height="4" strokeDasharray="1.5 1" />
    </svg>
  ),
  Previous: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7 3L3 7l4 4" />
      <path d="M3 7h6a4 4 0 0 1 0 8" />
    </svg>
  ),
  Section: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l6 3v6l-6 3-6-3V5z" />
      <path d="M2 8h12" strokeDasharray="2 1.5" />
      <path d="M8 8l6-3" />
    </svg>
  ),
  Orientation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l5 2.5v6L8 13l-5-2.5v-6z" />
      <path d="M8 7.5l5-3M8 7.5L3 4.5M8 7.5V13" />
      <path d="M3 10.5l5-3" opacity="0.4" />
    </svg>
  ),
  DisplayStyle: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l5 2.5v6L8 13l-5-2.5v-6z" fill="currentColor" fillOpacity="0.25" />
      <path d="M8 7.5l5-3M8 7.5L3 4.5M8 7.5V13" />
    </svg>
  ),
  Eye: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  Appearance: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
  Scene: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12l3.5-5 2.5 3 2-2.5L14 12z" />
      <circle cx="11" cy="5" r="1.5" />
    </svg>
  ),
  ViewSettings: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M6 13.5h4M8 11v2.5" />
    </svg>
  ),
  Polygon: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l5.2 3v6L8 14l-5.2-3V5z" />
    </svg>
  ),
  Mirror: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2v12" strokeDasharray="2 1.5" />
      <path d="M2 11l4-3-4-3zM14 11l-4-3 4-3z" />
    </svg>
  ),
  Offset: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 12V5l4-2h6v9" />
      <path d="M6 13V8l3-1.5h4" />
    </svg>
  ),
  Convert: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8 2l6 3v6l-6 3-6-3V5z" opacity="0.4" />
      <path d="M8 8l6-3" />
      <path d="M2 5l6 3" strokeWidth="2.5" />
    </svg>
  ),
  Slot: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="5" width="12" height="6" rx="3" />
    </svg>
  ),
  Ellipse: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <ellipse cx="8" cy="8" rx="6" ry="4" />
    </svg>
  ),
  Text: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h10M8 3v10M6 13h4" />
    </svg>
  ),
  Fillet2D: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 14V7a5 5 0 0 1 5-5h7" />
    </svg>
  ),
  Library: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 3h3v10H2zM6 3h3v10H6zM10 3.5l3-.5 1.5 9.5-3 .5z" />
    </svg>
  ),
  Folder: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 4h4l1.5 1.5H14v8H2z" />
    </svg>
  ),
  Palette: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  ),
  Properties: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h10v10H3z" />
      <path d="M5 6h6M5 8.5h6M5 11h3" />
    </svg>
  ),
  Resources: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 2.5h7l3 3v8H3z" />
      <path d="M10 2.5v3h3M5.5 8h5M5.5 10.5h5" />
    </svg>
  ),
  Filter: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z" />
    </svg>
  ),
  Config: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h10v3H3zM3 10h10v3H3z" />
      <path d="M5 6v4" />
    </svg>
  ),
  Tree: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h4M5 3v10M5 7h5M5 13h5" />
    </svg>
  ),
  History: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  ),
  Sensor: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 8h3l2-4 2 8 2-4h3" />
    </svg>
  ),
  Annotation: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 13L8 2l5 11M5 9h6" />
    </svg>
  ),
  Material: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 9l6-3 6 3-6 3z" />
      <path d="M2 9v2l6 3 6-3V9" />
    </svg>
  ),
  Arrow: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  ),
  Cursor: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 2l10 6-4 1.5L7 14 3 2z" fill="currentColor" />
    </svg>
  ),
  Revolve: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 3v10M4 3c4 0 8 1 8 2.5S8 8 4 8M4 8c4 0 8 1 8 2.5S8 13 4 13" />
    </svg>
  ),
  Sweep: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 12c3 0 3-8 7-8" />
      <ellipse cx="11" cy="5" rx="2" ry="1.3" />
      <path d="M2 12l1 2" />
    </svg>
  ),
  Loft: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <ellipse cx="8" cy="3.5" rx="4" ry="1.5" />
      <ellipse cx="8" cy="12.5" rx="6" ry="1.5" />
      <path d="M4 3.5L2 12.5M12 3.5l2 9" />
    </svg>
  ),
  Cut: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 10l5-2.5 5 2.5-5 2.5z" />
      <path d="M3 10V6l5-2.5 5 2.5v4" />
      <path d="M6 5.5l4 2" strokeDasharray="1 1" />
    </svg>
  ),
  Hole: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="4" width="12" height="8" />
      <ellipse cx="8" cy="8" rx="2.5" ry="1.5" />
    </svg>
  ),
  Shell: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 4h12v9H2z" />
      <path d="M4.5 6.5h7V13" />
    </svg>
  ),
  Pattern: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="8" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  Chamfer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 14V6l4-4h8" />
    </svg>
  ),
  Measure: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2 11l9-9 3 3-9 9z" />
      <path d="M5 8l1.5 1.5M7 6l1.5 1.5M9 4l1.5 1.5" />
    </svg>
  ),
  Mass: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M4 6h8l1.5 8h-11z" />
      <path d="M6 6a2 2 0 1 1 4 0" />
    </svg>
  ),
  Interference: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="2" width="8" height="8" />
      <rect x="6" y="6" width="8" height="8" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" fillOpacity="0.4" />
    </svg>
  ),
  Component: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 2l4 2v4L5 10 1 8V4z" />
      <path d="M11 6l4 2v4l-4 2-4-2v-2" />
    </svg>
  ),
  Drawing: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="2" width="12" height="12" />
      <path d="M4 10h4V4M10 6h2M10 9h2" />
    </svg>
  ),
  Sheet: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 2h7l3 3v9H3z" />
      <path d="M10 2v3h3" />
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
