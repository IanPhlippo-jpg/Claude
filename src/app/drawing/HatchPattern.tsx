import { hatchSpec } from '../prefsFormat';

/**
 * The SVG pattern of a hatch by the options (QA v0.5.11 F112): sections follow Document Properties ▸ Material
 * Properties ▸ Area hatch/fill, the Area Hatch tool System Options ▸ Drawings ▸ Area Hatch/Fill. `mm` is the sheet
 * scale in px per mm.
 */
export function HatchPattern({ id, kind, mm }: { id: string; kind: 'section' | 'area'; mm: number }) {
  const h = hatchSpec(kind);
  const w = h.spacing * mm;
  return (
    <pattern id={id} data-hatch-fill={h.fill} patternUnits="userSpaceOnUse" width={w} height={w} patternTransform={`rotate(${h.angle})`}>
      {h.fill === 'solid' && <rect width={w} height={w} fill="#000" />}
      {h.fill === 'hatch' && h.lines.map((l, i) => <line key={i} x1={l.at * w} y1={0} x2={l.at * w} y2={w} stroke="#000" strokeWidth={0.6} strokeDasharray={l.dash?.split(' ').map((x) => Number(x) * mm).join(' ')} />)}
    </pattern>
  );
}
