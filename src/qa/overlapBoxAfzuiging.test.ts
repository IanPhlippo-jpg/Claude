// Overlap in de voedingsbox van de afzuiging, met de exacte kernel (OCCT): de box tegen elk onderdeel dat erin of erop
// zit. Bedoeld contact (een print op zijn bussen, de adapter op zijn ribben) raakt alleen met een vlak en geeft 0 mm³;
// alles wat een volume deelt is een fout. Eigen testbestand: een eigen, verse OCCT-kernel.
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import type { Document } from '../core/document/types';

const DIR = 'voorbeelden/afzuiging';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
// alles met dezelfde oorsprong als de box (midden van de box op de onderkant van het blad)
const IN_DE_BOX = ['Voedingsprint.kcad', 'USB-C-bus-knop.kcad', 'Netadapter-GST90A24.kcad', 'Wipschakelaar-D502.kcad',
  'M8-inbouwstekker.kcad', 'Adapterklem.kcad', 'Deksel-voedingsbox.kcad'];

describe('afzuiging, voedingsbox exact', () => {
  afterAll(() => setBrepKernel(null));
  it('geen onderdeel deelt volume met de box (exacte kernel)', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    const k = occtKernel(OC, replicad);
    setBrepKernel(k);
    const exact = (f: string) => {
      const r = rebuildDocument(open(f)) as unknown as { brep?: Record<string, unknown> };
      const v = Object.values(r.brep ?? {});
      expect(v.length, `${f}: geen exacte vorm`).toBeGreaterThan(0);
      return v as never[];
    };
    const [box] = exact('Voedingsbox.kcad');
    // de volgende rebuilds ruimen alle vormen op behalve hun eigen: de box blijft bewaard
    const vrij = k.release.bind(k);
    k.release = (keep = []) => vrij([...keep, box]);
    const fouten: string[] = [];
    for (const f of IN_DE_BOX) {
      for (const s of exact(f)) {
        const c = k.common(box, s), v = k.volume(c);
        if (v > 1e-3) {
          const g = k.tessellate(c);
          g.computeBoundingBox();
          const b = g.boundingBox!, r = (x: number) => x.toFixed(2);
          fouten.push(`${f}: ${v.toFixed(3)} mm³ in [${r(b.min.x)}, ${r(b.min.y)}, ${r(b.min.z)}]..[${r(b.max.x)}, ${r(b.max.y)}, ${r(b.max.z)}]`);
        }
      }
    }
    expect(fouten).toEqual([]);
  }, 600000);
});
