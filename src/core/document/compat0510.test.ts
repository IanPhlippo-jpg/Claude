/**
 * .kcad compatibility with 0.5.10 (QA report 0.5.11, plan P1-10 / F184): documents saved by 0.5.10 open in this build
 * without an error, keep their feature list (names and types) and rebuild to the same volume.
 *
 * The fixtures in fixtures-0.5.10/ come from the 0.5.10 release commit (a4b1e92), see docs/29-parts/mutation-repeat-compat.md:
 * - Kruk.kcad, Deurkruk.kcad, Kruk-tekening.kcad: the example files of 0.5.10 as they were (part with revolve, cut and
 *   sweep; assembly of 12 components with 23 mates; drawing with projected, section and detail views);
 * - user-part1.kcad: the e2e fixture of 0.5.10 (extrude + fillet), saved by the 0.5.10 serializer;
 * - plaat-patroon-fillet.kcad, plaatwerk.kcad, configuraties.kcad: built and saved with the 0.5.10 sources (linear
 *   pattern + fillet R2; base flange + edge flange + hem; three configurations).
 *
 * Three volumes per part (mm³), all on record:
 * - now:   what this build gives on the mesh kernel (computed once); any change from now on fails, to a millionth;
 * - v0510: what the 0.5.10 sources gave on the mesh kernel for the same file; within 0.5 % (0.5.11 made the facets
 *          of revolves and holes finer: Rozet -0.35 %, Sleutelrozet -0.39 %, Kruk -0.02 %, the others the same);
 * - exact: the B-rep kernel of this build (OpenCascade); the faceted volume stays within 0.5 % of it. For the plate
 *          with pattern and fillet the closed form agrees: 80·40·10 − 4·π·3²·10 − 4·(4 − π)·10 = 30834.690.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument } from './persistence';
import { activateConfiguration, configurations } from './configurations';
import type { Document } from './types';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';

const DIR = join(__dirname, 'fixtures-0.5.10');
const read = (f: string) => readFileSync(join(DIR, f), 'utf8');
type Raw = { features?: { type: string; name: string }[] };
const list = (d: Raw) => (d.features ?? []).map((f) => `${f.type}:${f.name}`);
/** the volume of all bodies of a part on the mesh kernel; no rebuild errors */
function volume(d: Document): number {
  const r = rebuildDocument(JSON.parse(JSON.stringify(d)));
  expect(Object.keys(r.errors), `${d.name}: ${JSON.stringify(r.errors)}`).toHaveLength(0);
  expect(r.bodies.length, d.name).toBeGreaterThan(0);
  return r.bodies.reduce((a, b) => a + Math.abs(meshVolume(b.geometry)), 0);
}
interface Want { now: number; v0510: number; exact: number }
/** the recorded volume to a millionth (the mesh kernel is deterministic), within 0.5 % of 0.5.10 and of the exact one */
function same(label: string, v: number, w: Want) {
  expect(Math.abs(v - w.now), `${label}: ${v.toFixed(4)} (recorded ${w.now.toFixed(4)})`).toBeLessThan(Math.max(1e-3, w.now * 1e-6));
  expect(Math.abs(v - w.v0510) / w.v0510, `${label}: ${v.toFixed(4)} (0.5.10: ${w.v0510.toFixed(4)})`).toBeLessThan(0.005);
  expect(Math.abs(v - w.exact) / w.exact, `${label}: ${v.toFixed(4)} (exact: ${w.exact.toFixed(4)})`).toBeLessThan(0.005);
}

const KRUK: Want = { now: 39274.974, v0510: 39282.3539, exact: 39357.3247 };

/** part fixtures: feature list and volumes */
const PARTS: Record<string, { features: string[]; want: Want }> = {
  'Kruk.kcad': {
    features: ['sketch:Sketch1', 'revolve:Revolve1', 'sketch:Sketch2', 'extrude:Cut-Extrude1', 'sketch:Sketch3', 'sketch:Sketch4', 'sweep:Sweep1', 'sketch:Sketch5', 'revolve:Revolve2'],
    want: KRUK,
  },
  'user-part1.kcad': {
    features: ['sketch:Sketch1', 'extrude:Boss-Extrude1', 'fillet:Fillet1', 'sketch:Sketch2'],
    want: { now: 2478265.7956, v0510: 2478265.7956, exact: 2478539.8163 },
  },
  'plaat-patroon-fillet.kcad': {
    features: ['sketch:Sketch1', 'extrude:Boss-Extrude1', 'sketch:Sketch2', 'extrude:Cut-Extrude1', 'linearPattern:LPattern1', 'fillet:Fillet1'],
    want: { now: 30836.0884, v0510: 30841.8656, exact: 30834.6904 },
  },
  'plaatwerk.kcad': {
    features: ['sketch:Sketch1', 'baseFlange:Base-Flange1', 'edgeFlange:Edge-Flange1', 'hem:Hem1'],
    want: { now: 8687.0574, v0510: 8687.0574, exact: 8693.5433 },
  },
};

describe('.kcad files of 0.5.10 open identically (P1-10)', { timeout: 120000 }, () => {
  for (const [file, part] of Object.entries(PARTS)) {
    it(`${file}: opens, same features, same volume`, () => {
      const text = read(file);
      const doc = parseDocument(text);
      expect(list(JSON.parse(text))).toEqual(part.features);
      expect(list(doc)).toEqual(part.features);
      same(file, volume(doc), part.want);
    });
  }

  it('configuraties.kcad: three configurations, each with its own volume (Default 10 thick with a Ø20 hole, Dik 20 thick, Zonder gat 20 thick without the hole)', () => {
    const doc = parseDocument(read('configuraties.kcad'));
    expect(list(doc)).toEqual(['sketch:Sketch1', 'extrude:Boss-Extrude1', 'sketch:Sketch2', 'extrude:Cut-Extrude1']);
    // exact: 100·50·10 − π·10²·10, twice that, 100·50·20
    const want: Record<string, Want> = {
      Default: { now: 46863.4509, v0510: 46863.4509, exact: 50000 - 1000 * Math.PI },
      Dik: { now: 93726.9013, v0510: 93726.9013, exact: 100000 - 2000 * Math.PI },
      'Zonder gat': { now: 100000, v0510: 100000, exact: 100000 },
    };
    expect(configurations(doc).map((c) => c.name)).toEqual(Object.keys(want));
    for (const c of configurations(doc)) same(`configuration ${c.name}`, volume(activateConfiguration(doc, c.id)), want[c.name]);
  });

  it('Deurkruk.kcad: the assembly keeps its 12 components, 23 mates and every part', () => {
    const text = read('Deurkruk.kcad');
    const doc = parseDocument(text);
    const raw = JSON.parse(text) as { components: { name: string; part: Raw }[]; mates: unknown[] };
    expect(doc.kind).toBe('assembly');
    expect(doc.components!.map((c) => c.name)).toEqual(raw.components.map((c) => c.name));
    expect(doc.components).toHaveLength(12);
    expect(doc.mates).toHaveLength(23);
    const want: Record<string, Want> = {
      Deur: { now: 7177291.389, v0510: 7177291.389, exact: 7177254.8692 },
      Rozet: { now: 13419.7489, v0510: 13467.1447, exact: 13432.4332 },
      Vierkantstift: { now: 6400, v0510: 6400, exact: 6400 },
      Kruk: KRUK,
      Sleutelrozet: { now: 7739.1291, v0510: 7769.2962, exact: 7749.4743 },
      'ISO 10642 M4 x 16': { now: 219.2292, v0510: 219.2292, exact: 219.6044 },
    };
    doc.components!.forEach((c, i) => {
      expect(list(c.part as Document), c.name).toEqual(list(raw.components[i].part));
      same(c.name, volume(c.part as Document), want[c.name.replace(/<\d+>$/, '')]);
    });
  });

  it('Kruk-tekening.kcad: the drawing keeps its six views and the model of each rebuilds to the part', () => {
    const text = read('Kruk-tekening.kcad');
    const doc = parseDocument(text);
    const raw = JSON.parse(text) as { sheets: { views: { name: string; model?: Raw }[] }[] };
    expect(doc.kind).toBe('drawing');
    const views = doc.sheets![0].views as unknown as { name: string; parentId?: string; model?: Document }[];
    expect(views.map((v) => v.name)).toEqual(['Drawing View1', 'Drawing View2', 'Drawing View3', 'Drawing View4', 'Section View A-A', 'Detail View B (2 : 1)']);
    views.forEach((v, i) => expect(list(v.model ?? {}), v.name).toEqual(list(raw.sheets[0].views[i].model ?? {})));
    // the views without a parent carry the model of the part Kruk
    const own = views.filter((v) => !v.parentId);
    expect(own).toHaveLength(4);
    for (const v of own) same(v.name, volume(v.model!), KRUK);
  });
});
