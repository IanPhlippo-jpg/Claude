/**
 * De ronde vergelijkingsvariant van de afzuiging (voorbeelden/afzuiging/rond, 2026-11-13): rond frame en RVS-plaat Ø228,
 * ringfilter Ø175 / Ø120 x 55, ronde romp met 4 klauwen, de kuip en de ventilator van 7.3 18 mm lager.
 * - elk onderdeel bouwt tot één body; de geprinte delen passen in 230 x 230 en het rooster is lasersnijbaar;
 * - niets botst (ook de knop en de voedingsbox van 7.3); de klauwen passen bij 10 tot 50 mm en liggen ingetrokken binnen
 *   de romp; het filter gaat vrij naar boven;
 * - luchtdicht zoals qaAfzuiging: lucht kan er alleen in langs het rooster en uit langs de kuip (met tegenproeven).
 * Alleen met VOORBEELDEN=1 (zware test): VOORBEELDEN=1 npx vitest run src/qa/rondAfzuiging.test.ts
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { rebuildDocument } from './rebuildStreng';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly } from '../core/assembly/assembly';
import { detectInterferences } from '../core/assembly/interference';
import { echteBotsingen } from './overlap';
import type { Component, Document } from '../core/document/types';

const DIR = 'voorbeelden/afzuiging/rond';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
type R = { bodies: { geometry: THREE.BufferGeometry }[] };
const bouw = (f: string) => {
  const r = rebuildDocument(open(f)) as unknown as R;
  const g = r.bodies[0]?.geometry;
  g?.computeBoundingBox();
  return { n: r.bodies.length, volume: g ? meshVolume(g) : 0, bb: g?.boundingBox ?? new THREE.Box3(), g };
};
const rond = (v: THREE.Vector3) => v.toArray().map((x) => Math.round(x * 10) / 10 + 0);
const PRINT = ['Romp-rond.kcad', 'Bovenframe-rond.kcad', 'Instroomplaat-rond.kcad', 'Filterdeksel.kcad', 'Ventilatorkuip.kcad', 'Klauw.kcad'];
const DELEN = [...PRINT, 'Rooster-LB-rond.kcad', 'Ringfilter-175x120x55.kcad', 'Foamband-ring.kcad', 'Celband-deksel.kcad'];
const mesh: Record<string, ReturnType<typeof bouw>> = {};
const zwaar = !process.env.VOORBEELDEN;

describe.skipIf(zwaar)('ronde afzuiging, onderdelen', () => {
  it.each(DELEN)('%s is één body', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBe(1);
  }, 600000);

  it('maten: Ø228 van boven, romp Ø216, geprinte delen ≤ 230 x 230; gewicht PETG', () => {
    expect(rond(mesh['Bovenframe-rond.kcad'].bb.min)).toEqual([-114, 0, -114]);
    expect(rond(mesh['Rooster-LB-rond.kcad'].bb.max)).toEqual([114, 4, 114]);
    expect(rond(mesh['Romp-rond.kcad'].bb.min)).toEqual([-108, -88, -108]);
    expect(rond(mesh['Romp-rond.kcad'].bb.max)).toEqual([108, 0, 108]);
    expect(rond(mesh['Ringfilter-175x120x55.kcad'].bb.min)).toEqual([-87.5, -60, -87.5]);
    const gram: Record<string, number> = {};
    for (const f of PRINT) {
      const s = mesh[f].bb.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.z), f).toBeLessThanOrEqual(230);
      expect(s.y, f).toBeLessThanOrEqual(230);
      gram[f] = Math.round(mesh[f].volume * 1.27e-3);
    }
    console.log('massief PETG (g):', JSON.stringify(gram), 'samen', Object.values(gram).reduce((a, b) => a + b, 0) + 3 * gram['Klauw.kcad']);
  });

  it('rooster: volume = (plaat - gaten) x 1,5 en het laserrapport is schoon', () => {
    const L = JSON.parse(readFileSync(`${DIR}/laser/rooster-rond.loops`, 'utf8')) as { outer: number[][]; holes: number[][][]; dikte: number; rapport: Record<string, number> };
    const area = (p: number[][]) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
    const v = (area(L.outer) - L.holes.reduce((a, h) => a + area(h), 0)) * L.dikte;
    expect(Math.abs(mesh['Rooster-LB-rond.kcad'].volume - v)).toBeLessThan(v * 1e-6);
    expect(L.rapport.losse_eilanden).toBe(0);
    expect(L.rapport.stukken_staal).toBe(1);
    expect(L.rapport.stukken_staal_met_steg_onder_min).toBe(0);
    expect(L.rapport.sleuven_met_vernauwing_onder_min).toBe(0);
  });
});

describe.skipIf(zwaar)('ronde afzuiging, assemblage', () => {
  const asm = () => open('Afzuiging-rond.kcad') as Document & { components: Component[] };
  const botsingen = (comps: Component[]) => {
    const r = rebuildAssembly({ ...asm(), components: comps } as Document);
    return echteBotsingen(detectInterferences(r.bodies), r.bodies);
  };
  const q = (deg: number) => { const h = (deg * Math.PI) / 360; return [0, Math.sin(h), 0, Math.cos(h)] as [number, number, number, number]; };

  it('niets botst (ook de knop en de voedingsbox)', () => {
    expect(botsingen(asm().components)).toEqual([]);
  }, 1800000);

  it('het filter gaat vrij naar boven uit de module (zonder rooster en deksel)', () => {
    const zonder = asm().components.filter((c) => !['r2', 'r3d', 'r3b'].includes(c.id) && !/^r2p/.test(c.id));
    const omhoog = zonder.map((c) => (c.id === 'r3' ? { ...c, position: [0, 70, 0] as [number, number, number] } : c));
    expect(botsingen(omhoog)).toEqual([]);
  }, 1800000);

  it('de klauwen passen bij 10, 34 en 50 mm en reiken voorbij de uitsparing (r 109)', () => {
    const a = asm();
    const klauwen = a.components.filter((c) => /^rkr?\d$/.test(c.id)).map((c) => c.id);
    for (const t of [10, 34, 50]) {
      const comps = a.components.map((c) => (klauwen.includes(c.id) ? { ...c, position: [c.position[0], -t - 10, c.position[2]] as [number, number, number] } : c))
        .filter((c) => ['r1', 'r6', ...klauwen].includes(c.id));
      expect(botsingen(comps), `blad ${t} mm`).toEqual([]);
    }
    const r = rebuildAssembly(a);
    for (const b of r.bodies.filter((b) => /^rkr\d$/.test(b.id))) {
      const p = b.geometry.attributes.position;
      let min = Infinity;
      for (let i = 0; i < p.count; i++) min = Math.min(min, Math.hypot(p.getX(i), p.getZ(i)));
      expect(min, `${b.id}: rubber begint buiten de uitsparing`).toBeGreaterThanOrEqual(108.9);
    }
  }, 1800000);

  it('ingetrokken liggen de klauwen binnen de romp (de module zakt door de uitsparing)', () => {
    const a = asm();
    const comps = a.components.map((c) => {
      if (!/^rkr?\d$/.test(c.id)) return c;
      const hoek = [45, 135, 225, 315][Number(c.id.replace(/\D/g, '')) - 1];
      return { ...c, position: [c.position[0], -60.5, c.position[2]] as [number, number, number], rotation: q(90 - hoek) };
    }).filter((c) => ['r1', 'r6'].includes(c.id) || /^rkr?\d$/.test(c.id));
    expect(botsingen(comps)).toEqual([]);
    const r = rebuildAssembly({ ...a, components: comps } as Document);
    for (const b of r.bodies.filter((b) => /^rkr?\d$/.test(b.id))) {
      const p = b.geometry.attributes.position;
      let max = 0;
      for (let i = 0; i < p.count; i++) max = Math.max(max, Math.hypot(p.getX(i), p.getZ(i)));
      expect(max, b.id).toBeLessThan(108);
    }
  }, 1800000);
});

/** luchtdicht (zoals qaAfzuiging): kubusjes van 1 mm; de lucht vloeit vanuit de kern van het filter naar alle buren die
 *  geen materiaal zijn en mag de buitenkant van de romp (r > 108,5) onder het blad nergens bereiken */
function lek(geoms: THREE.BufferGeometry[]): { lek: boolean; waar?: number[]; vrij: number } {
  const X0 = -118, Z0 = -118, Y0 = -157.73, nx = 236, nz = 236, ny = 160, off = 0.27; // tot net onder de bovenkant van het frame
  const vast = new Uint8Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (j * nz + k) * nx + i;
  const ray = new THREE.Ray();
  for (const g of geoms) {
    const bvh = new MeshBVH(g);
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      ray.origin.set(X0 + i + off, 60, Z0 + k + off);
      ray.direction.set(0, -1, 0);
      const ys = (bvh.raycast(ray, THREE.DoubleSide) as { point: THREE.Vector3 }[]).map((h) => h.point.y).sort((a, b) => b - a);
      const u: number[] = [];
      for (const y of ys) if (!u.length || Math.abs(u[u.length - 1] - y) > 1e-5) u.push(y);
      for (let p = 0; p + 1 < u.length; p += 2) {
        for (let j = 0; j < ny; j++) { const y = Y0 + j; if (y < u[p] && y > u[p + 1]) vast[idx(i, j, k)] = 1; }
      }
    }
  }
  const zien = new Uint8Array(nx * ny * nz);
  const start = idx(130, 97, 130); // (12,3, -60,7, 12,3): in de kern, boven de instroomplaat, tussen de ribben
  if (vast[start]) throw new Error('startpunt zit in materiaal');
  const q = [start];
  zien[start] = 1;
  let vrij = 0;
  while (q.length) {
    const c = q.pop()!;
    vrij++;
    const i = c % nx, k = Math.floor(c / nx) % nz, j = Math.floor(c / (nx * nz));
    const x = X0 + i + off, y = Y0 + j, z = Z0 + k + off;
    if (y < -0.5 && Math.hypot(x, z) > 108.5) return { lek: true, waar: [x, y, z], vrij };
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const a = i + di, b = j + dj, e = k + dk;
      if (a < 0 || a >= nx || b < 0 || b >= ny || e < 0 || e >= nz) continue;
      const n = idx(a, b, e);
      if (!zien[n] && !vast[n]) { zien[n] = 1; q.push(n); }
    }
  }
  return { lek: false, vrij };
}

describe.skipIf(zwaar)('ronde afzuiging, luchtdicht', () => {
  const g = (f: string, dy = 0) => (rebuildDocument(open(f)) as unknown as R).bodies[0].geometry.clone().translate(0, dy, 0);
  const dy = -18; // kuip en kuipdichting: 18 mm lager dan in 7.3
  const kuipdichting = () => (rebuildDocument(parseDocument(readFileSync('voorbeelden/afzuiging/Kuipdichting.kcad', 'utf8'))) as unknown as R).bodies[0].geometry.clone().translate(0, dy, 0);
  const meet = [101 * Math.cos((262 * Math.PI) / 180), 101 * Math.sin((262 * Math.PI) / 180)];
  const dicht = [
    new THREE.CylinderGeometry(1.8, 1.8, 14, 16).translate(meet[0], -73, meet[1]), // messingbuisje met het slangetje
    new THREE.CylinderGeometry(3, 3, 6, 16).translate(0, -134 + dy, -38), // aders van de ventilator, met kit
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.CylinderGeometry(4.3, 2.3, 6, 16).translate(a * 20.506, -134 + dy, b * 20.506)),
    // afdekking van de uitlaten van de kuip (lamellen opzij en ringsleuven in de bodem), zoals in qaAfzuiging
    new THREE.LatheGeometry([[89.5, -125], [97, -125], [97, -55], [89.5, -55], [89.5, -125]].map(([r, y]) => new THREE.Vector2(r, y + dy)), 96),
    new THREE.LatheGeometry([[44, -137.2], [80, -137.2], [80, -135.9], [44, -135.9], [44, -137.2]].map(([r, y]) => new THREE.Vector2(r, y + dy)), 96),
    // de M5-schroeven: de kop dicht de verzinking in het frame af, de schacht het gat
    ...[45, 135, 225, 315].flatMap((a) => {
      const x = 99.5 * Math.cos((a * Math.PI) / 180), z = 99.5 * Math.sin((a * Math.PI) / 180);
      return [new THREE.CylinderGeometry(5.3, 5.3, 2.5, 24).translate(x, 1.25, z), new THREE.CylinderGeometry(3, 3, 63, 16).translate(x, -31.5, z)];
    }),
  ];
  const delen = () => [g('Romp-rond.kcad'), g('Bovenframe-rond.kcad'), g('Instroomplaat-rond.kcad'), g('Ventilatorkuip.kcad', dy)];
  it('lucht kan alleen langs het rooster in en langs de lamellen en sleuven van de kuip uit', () => {
    const r = lek([...delen(), kuipdichting(), ...dicht]);
    expect(r.lek, JSON.stringify(r.waar)).toBe(false);
    expect(r.vrij).toBeGreaterThan(500000);
  }, 1800000);
  it('tegenproef: zonder de celband op de kuip lekt het langs de rand van de kuip', () => {
    expect(lek([...delen(), ...dicht]).lek).toBe(true);
  }, 1800000);
  it('tegenproef: zonder het messingbuisje lekt het door het meetkanaal', () => {
    expect(lek([...delen(), kuipdichting(), ...dicht.slice(1)]).lek).toBe(true);
  }, 1800000);
});
