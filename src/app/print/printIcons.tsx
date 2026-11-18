/**
 * Icons of the 3D Print tab, drawn in-house on the 24 px grid in the colours of the Phlippo icon set (blue solids,
 * yellow faces, grey outlines, green/red actions); no icons from other programs.
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const C = { blue: '#3f7fc4', blueD: '#245a94', blueL: '#a9cbea', yellow: '#f3c33f', yellowD: '#c99a15', grey: '#8a94a1', greyD: '#4d5663', greyL: '#d7dce3', green: '#3ba55d', red: '#d9363e',
  white: '#ffffff', orange: '#ef8a2b' };
const base = (size: number, p: P) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...p });

/** the build plate seen at an angle */
const Bed = ({ y = 17 }: { y?: number }) => <path d={`M2 ${y + 3}l4 -4h16l-4 4z`} fill={C.greyL} stroke={C.greyD} strokeWidth={0.9} />;
/** a small block standing on the plate */
const Cube = ({ x = 8, y = 9, s = 7, d = 3 }: { x?: number; y?: number; s?: number; d?: number }) => (
  <g stroke={C.blueD} strokeWidth={0.8}>
    <path d={`M${x} ${y + d}l${d} -${d}h${s}l-${d} ${d}z`} fill={C.blueL} />
    <path d={`M${x} ${y + d}h${s}v${s}h-${s}z`} fill={C.blue} />
    <path d={`M${x + s} ${y + d}l${d} -${d}v${s}l-${d} ${d}z`} fill={C.blueD} />
  </g>
);

export const PrintIcon = {
  Printer: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="1.5" fill={C.white} stroke={C.greyD} strokeWidth={1.2} />
      <path d="M4 7h16" stroke={C.grey} strokeWidth={1.4} />
      <rect x="9" y="5" width="6" height="4" rx="0.8" fill={C.orange} stroke={C.greyD} strokeWidth={0.8} />
      <path d="M12 9v2.5" stroke={C.greyD} strokeWidth={1.2} />
      <rect x="8" y="14" width="8" height="4" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M5 18.5h14" stroke={C.greyD} strokeWidth={1.4} />
    </svg>
  ),
  AddToPlate: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      <Cube x={6} y={8} />
      <circle cx="18.5" cy="5.5" r="4" fill={C.green} />
      <path d="M18.5 3.5v4M16.5 5.5h4" stroke={C.white} strokeWidth={1.5} />
    </svg>
  ),
  LayFlat: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      <path d="M8 13.5l5 -5 5 2 -5 5z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.9} />
      <path d="M8 13.5v2.2l5 1 5 -3.2v-2.5" fill={C.blue} stroke={C.blueD} strokeWidth={0.8} />
      <path d="M5 3v7M5 10l-2 -2M5 10l2 -2" stroke={C.green} strokeWidth={1.5} />
    </svg>
  ),
  AutoOrient: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      <Cube x={7} y={8} />
      <path d="M4 9a8 8 0 0 1 9 -6.5" stroke={C.green} strokeWidth={1.4} />
      <path d="M13 2.5l-2.2 -1M13 2.5l-1.3 2" stroke={C.green} strokeWidth={1.4} />
      <path d="M21 8a8 8 0 0 1 -2 6" stroke={C.green} strokeWidth={1.4} />
    </svg>
  ),
  Arrange: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      <Cube x={4} y={11} s={4} d={2} />
      <Cube x={10} y={11} s={4} d={2} />
      <Cube x={7} y={6} s={4} d={2} />
      <Cube x={13} y={6} s={4} d={2} />
    </svg>
  ),
  Scale: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      <Cube x={4} y={11} s={5} d={2} />
      <path d="M8 3h13v13" stroke={C.grey} strokeWidth={1} strokeDasharray="1.5 1.5" />
      <path d="M11 11l8 -7M19 4h-3.5M19 4v3.5" stroke={C.green} strokeWidth={1.5} />
    </svg>
  ),
  NewPlate: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed y={13} />
      <path d="M2 16v2l4 0" stroke={C.greyD} strokeWidth={0.9} />
      <Bed y={16} />
      <circle cx="17.5" cy="6.5" r="4" fill={C.green} />
      <path d="M17.5 4.5v4M15.5 6.5h4" stroke={C.white} strokeWidth={1.5} />
    </svg>
  ),
  Slice: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M6 ${15 - i * 3}l3 -2.5h9l-3 2.5z`} fill={i % 2 ? C.blueL : C.blue} stroke={C.blueD} strokeWidth={0.7} />)}
      <path d="M2 7.5h20" stroke={C.red} strokeWidth={1.2} strokeDasharray="2 1.2" />
    </svg>
  ),
  Preview: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <Bed />
      {[0, 1, 2].map((i) => <path key={i} d={`M4 ${16 - i * 2.4}h12`} stroke={[C.orange, C.yellowD, C.green][i]} strokeWidth={1.6} />)}
      <path d="M11 6.5c2.5 -3.5 7.5 -3.5 10 0c-2.5 3.5 -7.5 3.5 -10 0z" fill={C.white} stroke={C.greyD} strokeWidth={1} />
      <circle cx="16" cy="6.5" r="1.6" fill={C.blue} />
    </svg>
  ),
  Export: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <path d="M5 2.5h9l4 4v15h-13z" fill={C.white} stroke={C.greyD} strokeWidth={1.1} />
      <path d="M14 2.5v4h4" fill={C.greyL} stroke={C.greyD} strokeWidth={1} />
      {[0, 1, 2].map((i) => <path key={i} d={`M7.5 ${10 + i * 2.5}h7`} stroke={C.grey} strokeWidth={1} />)}
      <path d="M13 18.5h9M22 18.5l-2.5 -2.5M22 18.5l-2.5 2.5" stroke={C.green} strokeWidth={1.6} />
    </svg>
  ),
  Cancel: ({ size = 16, ...p }: P) => (
    <svg {...base(size, p)}>
      <circle cx="12" cy="12" r="9" fill={C.red} />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={C.white} strokeWidth={2} />
    </svg>
  ),
};
