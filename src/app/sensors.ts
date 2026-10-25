import type { Document } from '../core/document/types';
import type { Body } from '../core/features/rebuild';
import { massProperties } from '../core/features/measure';
import { dimensionTable } from '../core/document/equations';
import { detectInterferences } from '../core/assembly/interference';

export type Sensor = NonNullable<Document['sensors']>[number];

/** The value a sensor watches: mass properties of all bodies, a model dimension, or the interferences of an assembly. */
export function sensorReading(doc: Document, bodies: Body[], sn: Sensor): { value: number; text: string } {
  if (sn.kind === 'dimension') {
    const d = dimensionTable(doc).find((x) => x.name === sn.dim);
    return d ? { value: d.value, text: `${d.value.toFixed(2)}${doc.units}` } : { value: NaN, text: 'dimension not found' };
  }
  if (sn.kind === 'interference') {
    const n = detectInterferences(bodies.filter((b) => !(doc.components ?? []).some((c) => c.id === b.id && c.envelope))).length;
    return { value: n, text: n ? `${n} interference${n === 1 ? '' : 's'}` : 'no interferences' };
  }
  let mass = 0, volume = 0, area = 0;
  for (const b of bodies) {
    const comp = (doc.components ?? []).find((c) => c.id === b.id);
    const bm = comp ? comp.part.material : doc.bodyMaterials?.[b.id] ?? doc.material;
    const m = massProperties(b.geometry, bm ? bm.density / 1e6 : 0.001);
    mass += m.mass; volume += m.volume; area += m.area;
  }
  if (sn.kind === 'mass') return { value: mass, text: `${mass.toFixed(2)} grams` };
  if (sn.kind === 'volume') return { value: volume, text: `${volume.toFixed(2)} ${doc.units}^3` };
  return { value: area, text: `${area.toFixed(2)} ${doc.units}^2` };
}

/** Alert: the value is above / below the limit (an interference sensor alerts on any interference without a limit) */
export function sensorAlarm(doc: Document, bodies: Body[], sn: Sensor): boolean {
  const v = sensorReading(doc, bodies, sn).value;
  if (sn.kind === 'interference' && !sn.alert) return v > 0;
  return !!sn.alert && Number.isFinite(v) && (sn.alert.op === '>' ? v > sn.alert.value : v < sn.alert.value);
}
