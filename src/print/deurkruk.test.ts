import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDocument } from '../core/document/persistence';
import { rebuildDocument } from '../core/features/rebuild';
import { meshVolume } from '../core/features/solid';
import { FIXTURE_MATERIALS, FIXTURE_PRINTERS, processProfile } from './database';
import { bounds, CAD_TO_PLATE, multiply, transformPositions, translation } from './mesh';
import { runSlice } from './run';
import { slotFor } from './build';
import { analyseGcode } from './gcode/analyse';

// a real part of the door handle example (voorbeelden/deurkruk, Ian's fixed example), sliced with support on a P1S
describe('the door handle (Kruk) on a P1S', () => {
  it('slices with support; the extruded volume at 100 % infill is close to the model volume', async () => {
    const doc = parseDocument(readFileSync('voorbeelden/deurkruk/Kruk.kcad', 'utf8'));
    const r = rebuildDocument(doc);
    expect(r.bodies.length).toBeGreaterThan(0);
    const g = r.bodies[0].geometry.index ? r.bodies[0].geometry.toNonIndexed() : r.bodies[0].geometry;
    const raw = g.getAttribute('position').array as Float32Array;
    const onPlate = transformPositions(raw, CAD_TO_PLATE);
    const b = bounds(onPlate);
    const P1S = FIXTURE_PRINTERS[0];
    const m = multiply(translation(P1S.buildVolume[0] / 2 - (b.min[0] + b.max[0]) / 2, P1S.buildVolume[1] / 2 - (b.min[1] + b.max[1]) / 2, -b.min[2]), CAD_TO_PLATE);
    const positions = transformPositions(raw, m);
    const volume = Math.abs(meshVolume(r.bodies[0].geometry));
    const process = { ...processProfile('standard', 0.4, P1S), support: 'normal' as const, infillDensity: 1, infillPattern: 'rectilinear' as const, minLayerTime: 0 };
    const t0 = performance.now();
    const out = await runSlice({ meshes: [{ positions, name: 'Kruk', filament: 0 }], printer: P1S, nozzle: 0.4, process, slots: [slotFor(FIXTURE_MATERIALS[0])], name: 'Kruk', appVersion: 'test' });
    const ms = performance.now() - t0;
    const text = out.gcode.map((c) => new TextDecoder().decode(c)).join('');
    const a = analyseGcode(text);
    const model = (out.stats.volumeByType.outerWall ?? 0) + (out.stats.volumeByType.innerWall ?? 0) + (out.stats.volumeByType.skin ?? 0) + (out.stats.volumeByType.infill ?? 0) + (out.stats.volumeByType.bridge ?? 0);
    expect(Math.abs(model - volume) / volume, `${model.toFixed(0)} vs ${volume.toFixed(0)} mm³ (${ms.toFixed(0)} ms)`).toBeLessThan(0.05);
    expect(a.moveMax[2]).toBeLessThanOrEqual(P1S.buildVolume[2]);
    expect(a.extrudeMin[0]).toBeGreaterThanOrEqual(0);
    expect(a.forbidden).toEqual([]);
    expect(out.stats.layers).toBeGreaterThan(10);
  }, 600_000);
});
