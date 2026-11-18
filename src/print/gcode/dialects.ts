/**
 * The three G-code dialects behind one interface (docs/34 2.7): Bambu Lab, Klipper (Elegoo Neptune 4, Centauri) and
 * Marlin. The start and end sequences are our own, written from the public descriptions of the commands (Marlin and
 * Klipper documentation, the community list of Bambu commands); nothing is copied from a slicer profile. None of them
 * has run on a printer yet: every printer is "nog te printen: kalibratiekubus 20 mm per printer".
 *
 * Safety rules (docs/34 R9): no M302, no M211 S0, no M500/M502; no extrusion before M109 has reached the temperature;
 * the end code turns nozzle, bed and fans off and parks within the travel limits.
 */
import type { Printer } from '../types';
import { fmt } from './format';

export const NOT_PRINTED = 'nog te printen: kalibratiekubus 20 mm per printer';

export interface Dialect {
  flavor: 'bambu' | 'klipper' | 'marlin';
  startTemplate: string;
  endTemplate: string;
  layerChange(index: number, z: number, h: number, total: number): string[];
  feature(type: string): string;
  fan(pct: number): string;
  accel(a: number): string;
  progress(pct: number, minutesLeft: number): string;
  toolChange(slot: number): string[];
  /** longest line the dialect accepts (Marlin: 96, docs/34 E13) */
  maxLine: number;
}

const FEATURE_NAMES: Record<string, [string, string]> = {
  outerWall: ['Outer wall', 'External perimeter'],
  innerWall: ['Inner wall', 'Perimeter'],
  skin: ['Top surface', 'Solid infill'],
  bridge: ['Bridge', 'Bridge infill'],
  infill: ['Sparse infill', 'Internal infill'],
  support: ['Support', 'Support material'],
  supportInterface: ['Support interface', 'Support material interface'],
  skirt: ['Skirt', 'Skirt/Brim'],
  primeTower: ['Prime tower', 'Wipe tower'],
};

const purge = [
  'G1 Z5 F600',
  'G1 X{purge_x0} Y{purge_y} F6000',
  'G1 Z{purge_z} F600',
  'G1 X{purge_x1} E{purge_e} F1200 ; purge line inside the bed',
  'G1 E-{retract} F1800',
  'G1 Z1 F600',
];

const BAMBU_START = [
  '; Phlippo CAD start G-code for Bambu Lab: own minimal sequence (' + NOT_PRINTED + ')',
  'M73 P0 R{print_minutes}',
  'M140 S{bed_temp} ; bed to temperature',
  'M104 S140 ; nozzle warm but not oozing while homing',
  'G90',
  'M83 ; relative extrusion',
  'G28 ; home all axes',
  'M190 S{bed_temp} ; wait for the bed',
  'G29 ; bed mesh',
  'M109 S{nozzle_temp} ; wait for the nozzle',
  ...purge,
].join('\n');

const BAMBU_END = [
  '; Phlippo CAD end G-code (' + NOT_PRINTED + ')',
  'M400',
  'G1 E-{retract} F1800',
  'G1 Z{park_z} F600',
  'G1 X{park_x} Y{park_y} F6000',
  'M104 S0 ; nozzle off',
  'M140 S0 ; bed off',
  'M106 P1 S0 ; part fan off',
  'M106 P2 S0 ; aux fan off',
  'M106 P3 S0 ; chamber fan off',
  'M84 ; motors off',
  'M73 P100 R0',
].join('\n');

const GENERIC_START = (flavor: string) => [
  `; Phlippo CAD start G-code (${flavor}): own minimal sequence (${NOT_PRINTED})`,
  'M140 S{bed_temp} ; bed to temperature',
  'M104 S{nozzle_temp} ; nozzle to temperature',
  'G90',
  'M83 ; relative extrusion',
  'G28 ; home all axes',
  'M190 S{bed_temp} ; wait for the bed',
  'M109 S{nozzle_temp} ; wait for the nozzle',
  ...purge,
].join('\n');

const GENERIC_END = [
  `; Phlippo CAD end G-code (${NOT_PRINTED})`,
  'M400',
  'G1 E-{retract} F1800',
  'G1 Z{park_z} F600',
  'G1 X{park_x} Y{park_y} F6000',
  'M104 S0 ; nozzle off',
  'M140 S0 ; bed off',
  'M107 ; fan off',
  'M84 ; motors off',
].join('\n');

export function dialectFor(p: Printer): Dialect {
  const flavor = p.gcodeFlavor === 'bambu' ? 'bambu' : p.gcodeFlavor === 'marlin' ? 'marlin' : 'klipper';
  const bambu = flavor === 'bambu';
  return {
    flavor,
    startTemplate: bambu ? BAMBU_START : GENERIC_START(flavor === 'marlin' ? 'Marlin' : 'Klipper'),
    endTemplate: bambu ? BAMBU_END : GENERIC_END,
    layerChange: (i, z, h) => (bambu
      ? ['; CHANGE_LAYER', `; Z_HEIGHT: ${fmt(z, 3)}`, `; LAYER_HEIGHT: ${fmt(h, 3)}`, `M73 L${i + 1}`, `M991 S0 P${i} ;notify layer change`]
      : [';LAYER_CHANGE', `;Z:${fmt(z, 3)}`, `;HEIGHT:${fmt(h, 3)}`, `;LAYER:${i}`]),
    feature: (t) => (bambu ? `; FEATURE: ${FEATURE_NAMES[t]?.[0] ?? t}` : `;TYPE:${FEATURE_NAMES[t]?.[1] ?? t}`),
    fan: (pct) => { const v = Math.round(Math.max(0, Math.min(100, pct)) * 2.55); return bambu ? `M106 P1 S${v}` : v === 0 ? 'M107' : `M106 S${v}`; },
    accel: (a) => (bambu ? `M204 S${Math.round(a)}` : flavor === 'klipper' ? `SET_VELOCITY_LIMIT ACCEL=${Math.round(a)}` : `M204 P${Math.round(a)} T${Math.round(a)}`),
    progress: (pct, min) => (flavor === 'klipper' ? `M73 P${Math.round(pct)}` : `M73 P${Math.round(pct)} R${Math.max(0, Math.round(min))}`),
    // Bambu AMS: select the tray, change, confirm (community description of M620/M621; nog te printen)
    toolChange: (slot) => (bambu ? [`M620 S${slot}A`, `T${slot}`, `M621 S${slot}A`] : [`T${slot}`]),
    maxLine: flavor === 'marlin' ? 96 : 255,
  };
}
