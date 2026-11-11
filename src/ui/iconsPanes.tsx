import type { SVGProps } from 'react';

/**
 * The Task Pane strip (right edge) and the Origin of the Feature Tree: own drawings on the 24 px grid, filling the cell
 * the way the intended strip does (about 18 of 20 px), with near-black outlines and saturated fills, by design
 * (QA F21: the earlier strip icons were 16 px light line art on 20 px buttons).
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

const O = '#262a2e'; // outline
const W = '#ffffff';
const G = '#e4e7ea'; // light grey fill
const B = '#2a6fb5'; // blue
const BD = '#163f6e'; // dark blue
const TL = '#37a3c4'; // teal
const Y = '#f2c230'; // yellow
const YD = '#9c7a12';

export const PaneIcons = {
  /** Resources: a dark blue disc with a house */
  TPResources: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><radialGradient id="tpr-g" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stopColor="#5b9ad8" /><stop offset="1" stopColor={BD} /></radialGradient></defs>
      <circle cx="12" cy="12" r="10.6" fill="url(#tpr-g)" stroke="#0f2a4a" strokeWidth={1.1} />
      <path d="M6.6 12.2L12 7.4l5.4 4.8M8.4 11v5.8h7.2V11" stroke={W} strokeWidth={1.7} />
      <path d="M11 16.8v-3h2v3" fill={W} />
    </svg>
  ),
  /** Marketplace: a window with a yellow and teal block in front */
  TPMarketplace: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="1.5" y="2.5" width="16" height="13" fill={W} stroke={O} strokeWidth={1.3} />
      <path d="M1.5 5.5h16" stroke={O} strokeWidth={1.3} />
      <path d="M4 8.5h7M4 11h5" stroke={B} strokeWidth={1.4} />
      <path d="M11.5 14.5l5-2.5 5 2.5v5.5l-5 2.5-5-2.5z" fill={Y} stroke={YD} strokeWidth={0.9} />
      <path d="M16.5 17v5.5l5-2.5v-5.5z" fill={TL} stroke="#1d6178" strokeWidth={0.9} />
      <path d="M11.5 14.5l5 2.5 5-2.5" stroke={O} strokeWidth={0.9} />
    </svg>
  ),
  /** Part Library: two blocks (yellow, teal) and a blue arrow bringing a part in */
  TPLibrary: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M9 6l5.5-3 5.5 3v6l-5.5 3L9 12z" fill={TL} stroke="#1d6178" strokeWidth={0.9} />
      <path d="M9 6l5.5 3 5.5-3M14.5 9v6" stroke="#1d6178" strokeWidth={0.9} />
      <path d="M9 13.5l5.5-3 5.5 3v6l-5.5 3L9 19.5z" fill={Y} stroke={YD} strokeWidth={0.9} />
      <path d="M9 13.5l5.5 3 5.5-3M14.5 16.5v6" stroke={YD} strokeWidth={0.9} />
      <path d="M2 18.5h4.5" stroke={BD} strokeWidth={2.4} />
      <path d="M5.5 15.5l3.5 3-3.5 3z" fill={BD} />
    </svg>
  ),
  /** Forum: two speech bubbles */
  TPForum: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <defs><linearGradient id="tpf-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fb6d8" /><stop offset="1" stopColor="#2b7fa8" /></linearGradient></defs>
      <path d="M1.5 2.5h14v9.5H7l-3.5 3.2V12H1.5z" fill="url(#tpf-g)" stroke={O} strokeWidth={1.2} />
      <path d="M9 9.5h13.5V19h-2.2v3.3L17 19H9z" fill={W} stroke={O} strokeWidth={1.2} />
    </svg>
  ),
  /** File Explorer: an open folder */
  TPExplorer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M1.5 4.5h7l2 2.2h9v4.3" fill={G} stroke={O} strokeWidth={1.3} />
      <path d="M1.5 4.5V20" stroke={O} strokeWidth={1.3} />
      <defs><linearGradient id="tpe-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={W} /><stop offset="1" stopColor="#c9cdd2" /></linearGradient></defs>
      <path d="M5.2 10.5h17.3L19 20.2H1.5z" fill="url(#tpe-g)" stroke={O} strokeWidth={1.3} />
    </svg>
  ),
  /** View Palette: sheets standing one behind the other */
  TPPalette: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M13.5 3.5l6-1.5v16l-6 1.5z" fill={G} stroke={O} strokeWidth={1.2} />
      <path d="M9 5l6-1.5v16L9 21z" fill={W} stroke={O} strokeWidth={1.2} />
      <path d="M4.5 6.5l6-1.5v16l-6 1.5z" fill={W} stroke={O} strokeWidth={1.2} />
      <path d="M6.5 9.5l2-.5M6.5 12l2-.5" stroke={O} strokeWidth={0.9} />
    </svg>
  ),
  /** Appearances, Scenes, and Decals: a ball in four colours */
  TPAppearances: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M12 12V1.5A10.5 10.5 0 0 1 22.5 12z" fill="#d8322f" />
      <path d="M12 12h10.5A10.5 10.5 0 0 1 12 22.5z" fill="#f3b81e" />
      <path d="M12 12v10.5A10.5 10.5 0 0 1 1.5 12z" fill="#34a046" />
      <path d="M12 12H1.5A10.5 10.5 0 0 1 12 1.5z" fill="#2d6fc0" />
      <ellipse cx="8.2" cy="7.2" rx="3.6" ry="2.4" fill={W} opacity={0.55} transform="rotate(-30 8.2 7.2)" />
      <circle cx="12" cy="12" r="10.5" stroke={O} strokeWidth={1.1} />
    </svg>
  ),
  /** Custom Properties: a form with yellow fields */
  TPProperties: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="2.5" width="20" height="19" fill={W} stroke={O} strokeWidth={1.3} />
      <rect x="4.5" y="5" width="8" height="4" fill={Y} stroke={YD} strokeWidth={0.8} />
      <path d="M8.5 9v4.5M5 13.5h7" stroke={O} strokeWidth={1.4} />
      <rect x="4.5" y="15.5" width="8" height="3.5" fill={Y} stroke={YD} strokeWidth={0.8} />
      <rect x="15" y="5" width="4.5" height="14" fill={G} stroke={O} strokeWidth={1} />
    </svg>
  ),
  /** Platform: a dark blue disc with a white peak */
  TPPlatform: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="10.5" fill={BD} stroke="#0f2a4a" strokeWidth={1.1} />
      <path d="M5.5 16.5l6.5-10 6.5 10z" fill={W} />
    </svg>
  ),
  /** Document Recovery: a list under a dark teal title bar */
  TPRecovery: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2" y="2.5" width="20" height="19" fill={W} stroke={O} strokeWidth={1.3} />
      <rect x="2" y="2.5" width="20" height="4" fill="#1f6a80" stroke={O} strokeWidth={1.3} />
      <path d="M5 10.5h3M10 10.5h9M5 14h3M10 14h9M5 17.5h3M10 17.5h9" stroke={O} strokeWidth={1.4} />
    </svg>
  ),
  /** the Origin in the Feature Tree: two near-black axes with arrow heads and a dot where they meet */
  TreeOrigin: ({ size = 16, ...p }: P) => (
    <svg className="k-tree-line" {...base(size, p)}>
      <path d="M5 20V4.5M5 20h14.5" stroke="#1e1e1e" strokeWidth={1.5} />
      <path d="M5 1.5l2.8 4.2H2.2zM22.5 20l-4.2 2.8v-5.6z" fill="#1e1e1e" />
      <circle cx="5" cy="20" r="1.6" fill="#1e1e1e" />
    </svg>
  ),
};
