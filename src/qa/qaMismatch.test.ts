/**
 * Diagnosis of kernel disagreements (QA 0.5.11 F172/F179): the documents an e2e run kept in e2e-out/mismatch/
 * (`node --import ./e2e/lib/dump-mismatch.mjs e2e/<script>.mjs`) are built again on both kernels, feature by feature,
 * and the first feature after which the exact and the faceted body differ is written to e2e-out/mismatch/report.txt.
 * Without that folder there is nothing to do (the test passes at once).
 */
import { afterAll, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument as strictParse } from '../core/document/persistence';
import type { Document } from '../core/document/types';

/** the kept document; a state in the middle of an edit may not pass the open-file checks, it is read as it is then */
const parseDocument = (text: string): Document => { try { return strictParse(text); } catch { return JSON.parse(text) as Document; } };
import { shapeDeviation, shapeTolerance } from '../core/features/volumeCheck';
import { meshVolume } from '../core/features/solid';

const DIR = join('e2e-out', 'mismatch');
afterAll(() => setBrepKernel(null));

it('kept disagreements: the first feature where the kernels differ', async () => {
  if (!existsSync(DIR)) return;
  const files = readdirSync(DIR).filter((f) => f.endsWith('.kcad'));
  if (!files.length) return;
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  const kernel = occtKernel(OC, replicad);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const text = readFileSync(join(DIR, f), 'utf8');
    if (seen.has(text)) continue;
    seen.add(text);
    const doc = parseDocument(text);
    out.push(`== ${f}: ${doc.features.map((x) => `${x.id}:${x.type}`).join(' ')}`);
    // up to and with feature i (the second argument counts the features built)
    for (let i = 0; i < doc.features.length; i++) {
      setBrepKernel(null);
      const m = rebuildDocument(parseDocument(text), i + 1);
      setBrepKernel(kernel);
      const e = rebuildDocument(parseDocument(text), i + 1);
      setBrepKernel(null);
      const fe = doc.features[i];
      for (const eb of e.bodies) {
        const mb = m.bodies.find((b) => b.id === eb.id);
        if (!mb || !eb.exact) continue;
        const dev = shapeDeviation(mb.geometry, eb.geometry);
        const tol = shapeTolerance(mb.geometry);
        if (dev && dev.distance > tol) {
          out.push(`  after #${i} ${fe.id} (${fe.type} ${fe.name}): body ${eb.id} ${dev.distance.toFixed(2)} mm at ${dev.at.map((v) => v.toFixed(1)).join(',')} (${dev.onExact ? 'exact vertex' : 'mesh vertex'}); V mesh ${Math.abs(meshVolume(mb.geometry)).toFixed(2)} exact ${eb.exactVolume?.toFixed(2)}`);
          out.push(`  feature: ${JSON.stringify(fe).slice(0, 600)}`);
          i = doc.features.length;
          break;
        }
      }
    }
  }
  writeFileSync(join(DIR, 'report.txt'), out.join('\n') + '\n');
}, 600000);
