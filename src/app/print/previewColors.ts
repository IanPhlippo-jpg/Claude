/** Colours and names of the line types in the layer preview, and the colour scale of the continuous modes. */
import type { LineType } from '../../print/types';

export const LINE_COLORS: Record<LineType, string> = {
  outerWall: '#f28c28',
  innerWall: '#f6d55c',
  skin: '#d9363e',
  bridge: '#3f7fc4',
  infill: '#a23b72',
  support: '#3ba55d',
  supportInterface: '#2f7d4a',
  skirt: '#2bb5b8',
  primeTower: '#8a94a1',
  travel: '#4d5663',
};

export const LINE_LABELS: Record<LineType, string> = {
  outerWall: 'Outer wall',
  innerWall: 'Inner wall',
  skin: 'Solid infill',
  bridge: 'Bridge',
  infill: 'Sparse infill',
  support: 'Support',
  supportInterface: 'Support interface',
  skirt: 'Skirt and brim',
  primeTower: 'Prime tower',
  travel: 'Travel',
};

/** blue (low) to red (high) through green and yellow */
export function scaleColor(t: number): [number, number, number] {
  const stops: [number, number, number][] = [[0.15, 0.35, 0.85], [0.1, 0.7, 0.75], [0.25, 0.75, 0.3], [0.95, 0.8, 0.2], [0.9, 0.25, 0.2]];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map((k) => stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) as [number, number, number];
}

export const hexRgb = (h: string): [number, number, number] => {
  const v = parseInt(h.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};
