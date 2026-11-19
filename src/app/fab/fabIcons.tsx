/**
 * Icons of the fabrication tabs (Frames group, Weld Shop, Laser & Bend, Quote), drawn in-house on the 24 px grid in the
 * colours of the Phlippo icon set; no icons from other programs.
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const C = { blue: '#3f7fc4', blueD: '#245a94', blueL: '#a9cbea', yellow: '#f3c33f', yellowD: '#c99a15',
  grey: '#8a94a1', greyD: '#4d5663', greyL: '#d7dce3', green: '#3ba55d', red: '#d9363e', orange: '#ef8a2b' };
const svg = (size: number, p: P, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
const Tube = ({ y = 12 }: { y?: number }) => <><path d={`M3 ${y - 3}h16l2 2v4h-16l-2 -2z`} fill={C.blueL} stroke={C.blueD} strokeWidth={0.9} /><path d={`M3 ${y - 3}v4l2 2v-4z`} fill={C.blue}
  stroke={C.blueD} strokeWidth={0.9} /></>;
const Sheet = () => <path d="M3 17l5 -5h13l-5 5z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.9} />;

export const FabIcon = {
  Stock: ({ size = 16, ...p }: P) => svg(size, p, <><Tube y={8} /><Tube y={16} /></>),
  Recognize: ({ size = 16, ...p }: P) => svg(size, p, <><Tube y={13} /><circle cx={17} cy={7} r={4} stroke={C.greyD} strokeWidth={1.2} fill="#fff" /><path d="M20 10l3 3" stroke={C.greyD}
    strokeWidth={1.6} /></>),
  SawList: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={4} y={3} width={16} height={18} rx={1} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><path d="M7 7h10M7 11h10M7 15h10M7 19h6"
    stroke={C.blue} strokeWidth={1.2} /></>),
  BarNest: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={2} y={9} width={20} height={6} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><rect x={2} y={9} width={8} height={6} fill={C.blueL}
    stroke={C.blueD} strokeWidth={0.7} /><rect x={11} y={9} width={6} height={6} fill={C.blueL} stroke={C.blueD} strokeWidth={0.7} /></>),
  WeldJoint: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M3 18h18M8 18v-12" stroke={C.greyD} strokeWidth={2.4} /><path d="M8.6 17.4l4 0l-4 -4z" fill={C.orange} stroke={C.red}
    strokeWidth={0.6} /></>),
  AutoWeld: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M3 18h18M8 18v-12" stroke={C.greyD} strokeWidth={2.4} /><path d="M8.6 17.4l4 0l-4 -4z" fill={C.orange} />
    <path d="M15 4l1 2l2 1l-2 1l-1 2l-1 -2l-2 -1l2 -1z" fill={C.yellow} stroke={C.yellowD} strokeWidth={0.5} /></>),
  Sequence: ({ size = 16, ...p }: P) => svg(size, p, <><circle cx={6} cy={6} r={3} fill={C.blue} /><circle cx={6} cy={18} r={3} fill={C.blue} /><path d="M12 6h8M12 18h8M6 9v6" stroke={C.greyD}
    strokeWidth={1.2} /></>),
  Exc: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M12 2l8 3v7c0 5 -4 8 -8 10c-4 -2 -8 -5 -8 -10v-7z" fill={C.blueL} stroke={C.blueD} strokeWidth={0.9} /><path d="M9 12l2 2l4 -4"
    stroke={C.green} strokeWidth={1.6} /></>),
  Cost: ({ size = 16, ...p }: P) => svg(size, p, <><circle cx={12} cy={12} r={9} fill={C.yellow} stroke={C.yellowD} strokeWidth={0.9} /><path d="M15 8.5a4 4 0 1 0 0 7M7 11h6M7 13.5h6"
    stroke={C.greyD} strokeWidth={1.3} /></>),
  Export: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={4} y={9} width={16} height={12} rx={1} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><path d="M12 3v11M8 7l4 -4l4 4"
    stroke={C.green} strokeWidth={1.6} /></>),
  Plates: ({ size = 16, ...p }: P) => svg(size, p, <><Sheet /><circle cx={12} cy={14.5} r={1.4} fill="#fff" stroke={C.yellowD} strokeWidth={0.6} /></>),
  Flat: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M2 16h20" stroke={C.yellowD} strokeWidth={2.4} /><path d="M9 5v10M15 5v10" stroke={C.red} strokeWidth={0.9} strokeDasharray="2 1.5" /></>),
  Dxf: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={3} y={3} width={18} height={18} rx={1} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><path d="M7 16v-7h5a3 3 0 0 1 0 6h-5"
    stroke={C.blue} strokeWidth={1.3} /><circle cx={16} cy={8} r={1.6} stroke={C.blue} strokeWidth={1.1} /></>),
  SheetLib: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={3} y={5} width={18} height={5} fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} /><rect x={3} y={12} width={18} height={5}
    fill={C.yellow} stroke={C.yellowD} strokeWidth={0.8} /></>),
  Nest: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={2} y={3} width={20} height={18} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><rect x={4} y={5} width={8} height={6} fill={C.yellow}
    stroke={C.yellowD} strokeWidth={0.6} /><rect x={13} y={5} width={7} height={9} fill={C.yellow} stroke={C.yellowD} strokeWidth={0.6} /><rect x={4} y={12} width={8} height={7} fill={C.yellow}
      stroke={C.yellowD} strokeWidth={0.6} /></>),
  Cancel: ({ size = 16, ...p }: P) => svg(size, p, <><circle cx={12} cy={12} r={9} fill={C.red} /><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth={2} /></>),
  BendSeq: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M3 19h7l6 -10h5" stroke={C.yellowD} strokeWidth={2.2} /><text x={3} y={9} fontSize={8}
    fill={C.blueD} fontFamily="Arial" fontWeight="bold">1 2</text></>),
  BendCheck: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M3 19h7l6 -10h5" stroke={C.yellowD} strokeWidth={2.2} /><path d="M14 18l2 2l5 -5" stroke={C.green} strokeWidth={1.6} /></>),
  BendSheet: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={4} y={3} width={16} height={18} rx={1} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><path d="M7 15h4l4 -6h2" stroke={C.yellowD}
    strokeWidth={1.5} /></>),
  Quote: ({ size = 16, ...p }: P) => svg(size, p, <><rect x={4} y={2} width={16} height={20} rx={1} fill="#fff" stroke={C.greyD} strokeWidth={0.9} /><path d="M7 6h10M7 9h10M7 12h6"
    stroke={C.greyD} strokeWidth={1} /><text x={10} y={20} fontSize={7} fill={C.blueD} fontFamily="Arial" fontWeight="bold">€</text></>),
  Settings: ({ size = 16, ...p }: P) => svg(size, p, <><circle cx={12} cy={12} r={3.2} fill="#fff" stroke={C.greyD} strokeWidth={1.2} />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2 -2M17 7l2 -2" stroke={C.greyD} strokeWidth={1.6} /></>),
  AddLine: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M5 7h14M5 12h9" stroke={C.greyD} strokeWidth={1.2} /><path d="M17 14v7M13.5 17.5h7" stroke={C.green} strokeWidth={1.8} /></>),
  Customer: ({ size = 16, ...p }: P) => svg(size, p, <><circle cx={12} cy={8} r={4} fill={C.blueL} stroke={C.blueD} strokeWidth={0.9} /><path d="M4 21c1 -5 4 -7 8 -7s7 2 8 7" fill={C.blue}
    stroke={C.blueD} strokeWidth={0.9} /></>),
  Company: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M3 21v-12l6 -4v4l6 -4v16z" fill={C.greyL} stroke={C.greyD} strokeWidth={0.9} /><path d="M15 21v-10h6v10z" fill={C.blueL}
    stroke={C.blueD} strokeWidth={0.9} /></>),
  Quantity: ({ size = 16, ...p }: P) => svg(size, p, <><text x={3} y={17} fontSize={13} fill={C.blueD} fontFamily="Arial" fontWeight="bold">x5</text></>),
  Finishing: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M5 20l9 -9l3 3l-9 9z" fill={C.orange} /><path d="M14 11l4 -7l2 2l-3 8z" fill={C.greyL} stroke={C.greyD} strokeWidth={0.8} /></>),
  Purchased: ({ size = 16, ...p }: P) => svg(size, p, <><path d="M4 8h16l-2 12h-12z" fill={C.blueL} stroke={C.blueD} strokeWidth={0.9} /><path d="M9 8a3 3 0 0 1 6 0" stroke={C.blueD}
    strokeWidth={1.2} /></>),
};
