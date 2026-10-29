import type { SVGProps } from 'react';

/**
 * Menu-bar icons (Home, New, Open, Save, Rebuild, Options, Undo, Redo) in the line-art language of a desktop CAD
 * title area: dark slate outlines about 1.6 px wide, light fills, teal accents. Own designs on the 24 px grid.
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

const S = '#24353d'; // dark slate outline
const T = '#1f6a80'; // teal accent
const L = '#eef3f5'; // light fill
const W = '#ffffff';

export const IconsChrome = {
  Home: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2.5 11.5L12 3l9.5 8.5" stroke={S} strokeWidth={2} />
      <path d="M5.5 9.5V21h13V9.5" fill={L} stroke={S} strokeWidth={1.7} />
      <path d="M10 21v-6h4v6" fill={W} stroke={T} strokeWidth={1.6} />
    </svg>
  ),
  New: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 2.5h9l5 5v14H5z" fill={W} stroke={S} strokeWidth={1.6} />
      <path d="M14 2.5v5h5" fill={L} stroke={S} strokeWidth={1.4} />
    </svg>
  ),
  Open: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M2.5 5.5h6l2 2h9v3" fill={L} stroke={S} strokeWidth={1.6} />
      <path d="M2.5 5.5v14h15l4-9h-15l-4 9" fill={W} stroke={S} strokeWidth={1.6} />
      <path d="M10 3.5c3.5-1 6.5.5 7.5 4M17.5 7.5l-2.6-.4M17.5 7.5l.9-2.5" stroke={T} strokeWidth={1.7} />
    </svg>
  ),
  Save: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 3h15l3 3v15H3z" fill={T} stroke={S} strokeWidth={1.4} />
      <rect x="6.5" y="3" width="10" height="6" fill={W} stroke={S} strokeWidth={1.1} />
      <rect x="13" y="4.3" width="2" height="3.4" fill={S} />
      <rect x="5.5" y="12.5" width="13" height="8.5" fill={L} stroke={S} strokeWidth={1.1} />
    </svg>
  ),
  /** Rebuild: a traffic light (red over green) */
  Rebuild: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="7.5" y="2" width="9" height="20" rx="4.5" fill="#1d2a1f" stroke="#101810" strokeWidth={1} />
      <circle cx="12" cy="7.5" r="2.7" fill="#e5322f" />
      <circle cx="12" cy="16.5" r="2.7" fill="#3fbf3a" />
    </svg>
  ),
  Options: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path
        d="M10.3 2.5h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"
        fill={W}
        stroke={S}
        strokeWidth={1.4}
      />
      <circle cx="12" cy="12" r="3.2" fill={L} stroke={S} strokeWidth={1.4} />
    </svg>
  ),
  Undo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 11a8 8 0 0 1 14.5 1.5 7 7 0 0 1-3 7" stroke={T} strokeWidth={2.6} />
      <path d="M2.5 5.5L5 12l6.5-2.5" stroke={T} strokeWidth={2.6} />
    </svg>
  ),
  Redo: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M19 11a8 8 0 0 0-14.5 1.5 7 7 0 0 0 3 7" stroke={T} strokeWidth={2.6} />
      <path d="M21.5 5.5L19 12l-6.5-2.5" stroke={T} strokeWidth={2.6} />
    </svg>
  ),
  /** Modify box: reverse the sense of the dimension (an arrow up to the right off a base point) */
  ReverseSense: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 19L18 6M11 6h7v7" stroke={S} strokeWidth={2} />
      <circle cx="5" cy="19" r="1.8" fill={W} stroke={S} strokeWidth={1.2} />
    </svg>
  ),
  /** Modify box: spin increment (plus/minus over an arrow) */
  SpinIncrement: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 7h6M6 4v6M3 13h6" stroke={S} strokeWidth={1.7} />
      <path d="M10 18h10M17 15l3 3-3 3" stroke={T} strokeWidth={1.8} />
    </svg>
  ),
  /** Detailed Preview of a feature panel: a dark eye */
  PreviewEye: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M1.5 12c3-5 7-7 10.5-7s7.5 2 10.5 7c-3 5-7 7-10.5 7S4.5 17 1.5 12z" fill={W} stroke="#111" strokeWidth={1.6} />
      <circle cx="12" cy="12" r="4.6" fill="#111" />
      <circle cx="10.4" cy="10.4" r="1.4" fill={W} />
    </svg>
  ),
  /** heads-up toolbar: Zoom to Fit, a lens (handle to the lower left) with four arrows */
  HudFit: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M8.6 15.4L3 21" stroke={S} strokeWidth={3} />
      <circle cx="14" cy="10" r="7" fill="#d9ecf7" stroke={S} strokeWidth={1.6} />
      <path d="M14 5.5v9M9.5 10h9M12.6 6.9L14 5.5l1.4 1.4M12.6 13.1L14 14.5l1.4-1.4M10.9 8.6L9.5 10l1.4 1.4M17.1 8.6L18.5 10l-1.4 1.4" stroke={T} strokeWidth={1.2} />
    </svg>
  ),
  /** heads-up toolbar: Zoom to Area, a lens with a dashed frame */
  HudZoomArea: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M7.6 16.4L2.5 21.5" stroke={S} strokeWidth={3} />
      <circle cx="12.5" cy="11.5" r="6.5" fill="#d9ecf7" stroke={S} strokeWidth={1.6} />
      <rect x="12" y="2" width="10" height="9" fill="none" stroke={S} strokeWidth={1.1} strokeDasharray="1.8 1.4" />
    </svg>
  ),
  /** heads-up toolbar: Previous View, a spyglass with a back arrow */
  HudPrevious: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M6 13l10-8 3 4-10 8z" fill="#e3e8ec" stroke={S} strokeWidth={1.3} />
      <path d="M16 5l2.5-2 3 4-2.5 2" fill="#c3ccd3" stroke={S} strokeWidth={1.2} />
      <path d="M3 21l5-4M9.5 16.5l2 3" stroke={S} strokeWidth={1.4} />
      <path d="M14 19h7M14 19l2.5-2.2M14 19l2.5 2.2" stroke="#2c7fd6" strokeWidth={1.8} />
    </svg>
  ),
  /** heads-up toolbar: Section View, a cylinder cut open with a hatched face */
  HudSection: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M3 6c0-2 18-2 18 0v12c0 2-18 2-18 0z" fill="#b9d3e2" stroke={S} strokeWidth={1.2} />
      <path d="M7.5 5.2v14.6M16.5 5.2v14.6" stroke={S} strokeWidth={1.1} />
      <path d="M7.5 9l9-3M7.5 13l9-3M7.5 17l9-3M7.5 20l9-3" stroke="#3e6b86" strokeWidth={1.1} />
      <path d="M9.5 6.4h5v13.2h-5z" fill="#f2f6f8" stroke={S} strokeWidth={1} />
    </svg>
  ),
};
