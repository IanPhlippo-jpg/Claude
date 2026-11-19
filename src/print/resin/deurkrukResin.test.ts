import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDocument } from '../../core/document/persistence';
import { rebuildDocument } from '../../core/features/rebuild';
import { buildDatabase } from '../database';
import { makeItem, worldPositions } from '../plate';
import { signedVolume } from '../mesh';
import { machineOf, platePrinter, resinSettings } from './profile';
import { resinAutoOrient, resinScore } from './orient';
import { runResinSlice } from './slice';

// the door handle lever (T12, Ian's fixed example) on a Saturn 4 Ultra: resin auto orient, supports, no island left
describe('the door handle (Kruk) on a Saturn 4 Ultra', () => {
  it('orients, supports and slices without islands; pixel volume within 0.5 % of the mesh', () => {
    const db = buildDatabase(JSON.parse(readFileSync('src/print/printerDatabase.json', 'utf8')), JSON.parse(readFileSync('src/print/materialProfiles.json', 'utf8')));
    const printer = platePrinter(db.printers.find((p) => p.id === 'elegoo-saturn-4-ultra')!);
    const machine = machineOf(printer)!;
    const r = rebuildDocument(parseDocument(readFileSync('voorbeelden/deurkruk/Kruk.kcad', 'utf8')));
    const g = r.bodies[0].geometry.index ? r.bodies[0].geometry.toNonIndexed() : r.bodies[0].geometry;
    const it0 = makeItem('Kruk', g.getAttribute('position').array as Float32Array, machine.size[0] / 2, machine.size[1] / 2);
    const it1 = resinAutoOrient(it0);
    const pos = worldPositions(it1);
    expect(resinScore(pos).score).toBeLessThan(resinScore(worldPositions(it0)).score);
    const out = runResinSlice({ meshes: [{ positions: pos, name: 'Kruk', filament: 0 }], printer, machine, settings: { ...resinSettings(db.resins[0]), supports: 'normal' },
      resin: db.resins[0], name: 'Kruk', appVersion: 'test' });
    const islands = out.stats.issues.filter((i) => i.kind === 'island');
    expect(islands.map((i) => i.text)).toEqual([]);
    // the model alone (no supports) against its mesh volume
    const bare = runResinSlice({ meshes: [{ positions: pos, name: 'Kruk', filament: 0 }], printer, machine, settings: { ...resinSettings(db.resins[0]), supports: 'none' },
      resin: db.resins[0], name: 'Kruk', appVersion: 'test' });
    const v = Math.abs(signedVolume(pos));
    expect(Math.abs(bare.stats.volume - v) / v).toBeLessThan(0.005);
  }, 600_000);
});
