// De STL's voor de printer van de afzuiging, uit de exacte (B-rep) vorm, in printstand; elk bestand dicht en manifold.
// Een eigen testbestand: een eigen, verse OCCT-kernel (na alle onderdelen van qaAfzuiging raakt het geheugen vol).
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from '../core/features/rebuild';
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
  // (Z omhoog): de romp en de bak van de cassette rechtop, het frame, de rand en de platen plat, de knophouder met de plaat op het bed.
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
      'Romp.kcad': plat, 'Bovenframe.kcad': plat, 'Bodemplaat.kcad': plat, 'Instroomplaat.kcad': plat, 'Voedingsbox.kcad': plat,
      'Filtercassette.kcad': plat, 'Cassetterand.kcad': plat, 'Knophouder.kcad': rand, 'Knopdeksel.kcad': plat,
      // klauwen plat met de moerkamer op het bed (100 % vulling), de adapterklem plat
      'Klauw.kcad': plat, 'Knopklauw.kcad': plat, 'Adapterklem.kcad': plat, 'Deksel-voedingsbox.kcad': plat,
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
      expect(Math.max(s.x, s.y), f).toBeLessThanOrEqual(250);
      // dicht en manifold: na het samenvoegen van gelijke hoekpunten hoort elke rand bij precies twee driehoeken, één
      // keer in elke richting (dan kloppen ook de normalen); geen driehoeken zonder oppervlak
      const pos = geo.getAttribute('position'), idx = geo.getIndex();
      const n = idx ? idx.count : pos.count, sleutel = new Map<string, number>(), id: number[] = [];
      for (let i = 0; i < pos.count; i++) {
        const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
        if (!sleutel.has(k)) sleutel.set(k, sleutel.size);
        id.push(sleutel.get(k)!);
      }
      const randen = new Map<string, number>();
      let plat = 0;
      for (let i = 0; i < n; i += 3) {
        const v = [0, 1, 2].map((j) => id[idx ? idx.getX(i + j) : i + j]);
        if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) { plat++; continue; }
        for (let j = 0; j < 3; j++) { const k = `${v[j]}>${v[(j + 1) % 3]}`; randen.set(k, (randen.get(k) ?? 0) + 1); }
      }
      let openRand = 0, dubbel = 0;
      for (const [k, c] of randen) { const [a, b] = k.split('>'); const terug = randen.get(`${b}>${a}`) ?? 0; if (c > 1) dubbel++; if (terug !== c) openRand++; }
      expect({ f, open: openRand, dubbel }).toEqual({ f, open: 0, dubbel: 0 });
      expect(plat, f).toBeLessThan(n / 3 / 100); // hoogstens enkele gedegenereerde driehoekjes
    }
  }, 600000);
});
