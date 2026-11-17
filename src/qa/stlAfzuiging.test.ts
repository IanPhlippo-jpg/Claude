// De STL's voor de printer van de afzuiging, uit de exacte (B-rep) vorm, in printstand; elk bestand dicht en manifold.
// Een eigen testbestand: een eigen, verse OCCT-kernel (na alle onderdelen van qaAfzuiging raakt het geheugen vol).
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { stlControle } from './stlControle';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import type { Document } from '../core/document/types';

const DIR = 'voorbeelden/afzuiging';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
type R = { bodies: { geometry: THREE.BufferGeometry }[] };

describe('afzuiging, STL', () => {
  afterAll(() => setBrepKernel(null));
  // AFZUIGING_STL=1 npx vitest run src/qa/stlAfzuiging.test.ts: de STL's voor de printer, uit de exacte vorm, in printstand
  // (Z omhoog): de romp en de kuip rechtop (bodem op het bed), het frame en de platen plat, de knophouder met de plaat op het bed.
  it.skipIf(!process.env.AFZUIGING_STL)('STL voor de printer', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    const { mkdirSync, writeFileSync, rmSync, existsSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const plat = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, -z, y)
    const rand = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, z, -y)
    const stand: Record<string, THREE.Matrix4> = {
      // 7.4 (P2-8): het bovenframe als 4 latten (2 x zijlat, 2 x dwarslat), elk plat
      'Romp.kcad': plat, 'Bovenframe-zijlat.kcad': plat, 'Bovenframe-dwarslat.kcad': plat, 'Ventilatorkuip.kcad': plat, 'Instroomplaat.kcad': plat, 'Instroomtuit.kcad': plat, 'Voedingsbox.kcad': plat,
      'Knophouder.kcad': rand, 'Knopdeksel.kcad': plat,
      // 7.4 (P3-10): klauwen omgekeerd, het dak (bovenkant) op het bed: de moerkamer opent naar boven, geen brug; de adapterklem
      // (PA12-CF) plat
      'Klauw.kcad': rand, 'Knopklauw.kcad': rand, 'Adapterklem.kcad': plat, 'Deksel-voedingsbox.kcad': plat,
    };
    if (existsSync(`${DIR}/print`)) rmSync(`${DIR}/print`, { recursive: true });
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const [f, m] of Object.entries(stand)) {
      const r = rebuildDocument(open(f)) as unknown as R & { brep?: Record<string, unknown> };
      expect(Object.keys(r.brep ?? {}).length, `${f}: STL niet uit de exacte vorm`).toBe(1);
      const geo = r.bodies[0].geometry.clone().applyMatrix4(m);
      const { tris } = prepareTriangles([{ geometry: geo }], { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris[0], f.replace('.kcad', ''))));
      geo.computeBoundingBox();
      const s = geo.boundingBox!.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.y), f).toBeLessThanOrEqual(224); // bed 230 x 230 met 3 mm marge (P2-8)
      const c = stlControle(geo);
      expect({ f, open: c.open, dubbel: c.dubbel }).toEqual({ f, open: 0, dubbel: 0 });
      expect(c.plat, f).toBeLessThan(c.driehoeken / 100); // hoogstens enkele gedegenereerde driehoekjes
    }
  }, 600000);
});
