/**
 * Het geluidskastje van de treinverlichting, versie 6 (voorbeelden/treinverlichting/geluidskastje): de bak en het deksel
 * bouwen (exact op de B-rep-kernel, elk één lichaam, zelfde volume als de mesh), passen op het bed, printen zonder
 * support (geen vlak dat meer dan 45° overhangt, behalve de brug boven de USB-opening van 8,5), in de samenstelling botst
 * niets (luidspreker in de ring, de 3 printjes op hun rails, schroeven en sluitringen op de paaltjes, de DC-bus in de
 * achterwand) en de klemmen houden de printjes vast.
 * De zware delen draaien alleen met KASTJE=1 of VOORBEELDEN=1; de STL's voor de printer met KASTJE_STL=1, de werktekening
 * GLD-01 (A3: bak, deksel, onderdelen, bedrading) met KASTJE_TEKENING=1:
 *   KASTJE=1 KASTJE_STL=1 KASTJE_TEKENING=1 npx vitest run src/qa/qaKastje.test.ts
 * daarna de PDF en de PNG: node voorbeelden/treinverlichting/geluidskastje/maak-pdf.mjs
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { stlControle } from './stlControle';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly } from '../core/assembly/assembly';
import { echteBotsingen } from './overlap';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';
import { projectedView } from '../core/drawing/sheet';
import { Blad, kader, teken, getal, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { K, indeling, buitenmaat, berekening, roosterGaten, oogjes, ONDERDELEN, samenstelling } from '../../voorbeelden/treinverlichting/geluidskastje/maak-kastje.mjs';

const DIR = 'voorbeelden/treinverlichting/geluidskastje';
const ZWAAR = !!(process.env.KASTJE || process.env.VOORBEELDEN || process.env.KASTJE_STL);
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const DELEN = Object.keys(ONDERDELEN as Record<string, unknown>);
// printstand: de bak met de bodem op het bed, het deksel met de buitenkant op het bed
const STAND = {
  'Geluidskastje-bak.kcad': new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1), // (x, y, z) -> (x, -z, y)
  'Geluidskastje-deksel.kcad': new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1), // (x, y, z) -> (x, z, -y)
} as Record<string, THREE.Matrix4>;
type R = { bodies: { geometry: THREE.BufferGeometry }[]; brep?: Record<string, unknown> };
const k = K as any, L = indeling() as any;

/** de vlakken die naar beneden wijzen en meer dan 45° overhangen (niet op het bed): oppervlak in mm² */
function overhang(g: THREE.BufferGeometry) {
  const p = g.getAttribute('position'), idx = g.getIndex(), n = idx ? idx.count : p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  let opp = 0;
  const kader = new THREE.Box3();
  for (let i = 0; i < n; i += 3) {
    const j = (q: number) => (idx ? idx.getX(i + q) : i + q);
    a.fromBufferAttribute(p, j(0)); b.fromBufferAttribute(p, j(1)); c.fromBufferAttribute(p, j(2));
    m.crossVectors(b.clone().sub(a), c.clone().sub(a));
    const s = m.length() / 2;
    if (s < 1e-9) continue;
    m.normalize();
    // 45° precies (de schuine kanten van de USB-opening en de punt van de druppel) mag; meer niet
    if (m.z < -0.75 && Math.min(a.z, b.z, c.z) > 0.05) { opp += s; kader.expandByPoint(a); kader.expandByPoint(b); kader.expandByPoint(c); }
  }
  return { opp, kader };
}

describe('geluidskastje, indeling en maten', () => {
  it('klein: hoogstens 100 x 55 x 30 (zonder de oogjes), wand en bodem minstens 1,6', () => {
    const m = buitenmaat() as { x: number; z: number; h: number };
    expect(m.x).toBeLessThanOrEqual(100);
    expect(m.z).toBeLessThanOrEqual(55);
    expect(m.h).toBeLessThanOrEqual(30);
    expect(k.wand).toBeGreaterThanOrEqual(1.6);
    expect(k.bodem).toBeGreaterThanOrEqual(1.6);
    expect(k.ring.wand).toBeGreaterThanOrEqual(1.6);
  });
  it('de luidspreker past: lijf in de ring, flens op de ring, foam tussen flens en deksel, niet tegen de bodem', () => {
    const S = k.speaker;
    expect(S.lijf / 2).toBeLessThan(k.ring.ri - 0.5);
    expect(S.d / 2).toBeGreaterThan(k.ring.ri + 1);
    expect(S.d / 2).toBeLessThanOrEqual(L.ringR);
    expect(k.binnen.h - S.foam - S.h).toBeGreaterThanOrEqual(0.5);
    expect(roosterGaten().length).toBeGreaterThan(40);
  });
  it('de klemmen houden de printjes: de sluitring ligt minstens 1,2 op de print, het paaltje raakt de print niet, voorgat 0,75 tot 0,85 x d', () => {
    const P = k.paal;
    expect(P.ring.d / 2 - P.rand).toBeGreaterThanOrEqual(1.2);
    expect(P.rand - P.d / 2).toBeGreaterThanOrEqual(0.25);
    expect(P.voorgat / P.schroef.d).toBeGreaterThanOrEqual(0.75);
    expect(P.voorgat / P.schroef.d).toBeLessThanOrEqual(0.85);
    expect((P.d - P.voorgat) / 2).toBeGreaterThanOrEqual(1.2); // 3 lijnen
    // de paaltjes van regelaar en versterker: bovenkant = bovenkant van de print (de ring ligt vlak)
    for (const p of L.palen) expect([k.reg.rail + k.reg.pcb, k.max.rail + k.max.pcb, k.esp.rail + k.esp.pcb]).toContain(p.top);
    expect(k.reg.rail + k.reg.pcb).toBeCloseTo(k.max.rail + k.max.pcb, 6);
  });
  it('de 5 V-regelaar kan de piekstroom leveren (MP1584EN: 3 A), de 12 V-kant onder 1 A, het kastje blijft koel', () => {
    const b = berekening() as { i5Piek: number; i12Piek: number; dT: number };
    expect(b.i5Piek).toBeLessThan(3.0 * 0.75);
    expect(b.i12Piek).toBeLessThan(1.0);
    expect(b.dT).toBeLessThan(15);
  });
});

describe.skipIf(!ZWAAR)('geluidskastje, onderdelen en samenstelling', () => {
  const mesh: Record<string, { volume: number; bb: THREE.Box3 }> = {};
  const exact: Record<string, R> = {};
  afterAll(() => setBrepKernel(null));

  it.each(DELEN)('%s bouwt als één lichaam en past op het bed', (f) => {
    const r = rebuildDocument(open(f)) as unknown as R;
    expect(r.bodies.length).toBe(1);
    const bb = new THREE.Box3();
    r.bodies[0].geometry.computeBoundingBox();
    bb.union(r.bodies[0].geometry.boundingBox!);
    mesh[f] = { volume: meshVolume(r.bodies[0].geometry), bb };
    const s = bb.getSize(new THREE.Vector3());
    expect(Math.max(s.x, s.z)).toBeLessThanOrEqual(230);
  }, 300000);

  it('de kcad-bestanden zijn up-to-date met maak-kastje.mjs', () => {
    for (const [f, maak] of Object.entries(ONDERDELEN as Record<string, () => unknown>)) expect(JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')), f).toEqual(JSON.parse(JSON.stringify(maak())));
    expect(JSON.parse(readFileSync(`${DIR}/Geluidskastje.kcad`, 'utf8'))).toEqual(JSON.parse(JSON.stringify(samenstelling())));
  });

  it('in de samenstelling botst niets', () => {
    const a = open('Geluidskastje.kcad') as Document & { components: Component[] };
    const r = rebuildAssembly(a);
    expect(r.bodies.length).toBeGreaterThan(20);
    expect(echteBotsingen(detectInterferences(r.bodies), r.bodies)).toEqual([]);
  }, 600000);

  it('exact (B-rep): zelfde volume als de mesh', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    for (const f of DELEN) {
      const r = rebuildDocument(open(f)) as unknown as R;
      exact[f] = r;
      expect(r.bodies.length, f).toBe(1);
      expect(Object.keys(r.brep ?? {}).length, `${f} heeft geen exacte vorm`).toBe(1);
      const v = meshVolume(r.bodies[0].geometry);
      expect(Math.abs(v - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
    }
  }, 900000);

  it('print zonder support: niets hangt meer dan 45° over, behalve de brug boven de USB-opening (8,5 breed, de wand dik)', () => {
    for (const f of DELEN) {
      const g = exact[f].bodies[0].geometry.clone().applyMatrix4(STAND[f]);
      g.computeBoundingBox();
      g.translate(0, 0, -g.boundingBox!.min.z);
      const { opp, kader } = overhang(g);
      if (f === 'Geluidskastje-deksel.kcad') expect(opp, f).toBeLessThan(0.01);
      else {
        const brug = (k.usbGat.b - 2 * k.usbGat.schuin) * k.wand;
        expect(opp, f).toBeLessThan(brug + 0.5);
        if (opp > 0) {
          const s = kader.getSize(new THREE.Vector3());
          expect(Math.min(s.x, s.y), 'de brug is niet breder dan 8,5').toBeLessThanOrEqual(k.usbGat.b - 2 * k.usbGat.schuin + 0.01);
        }
      }
    }
  });

  it.skipIf(!process.env.KASTJE_STL)('STL voor de printer (uit de exacte vorm, dicht en manifold)', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const f of DELEN) {
      const g = exact[f].bodies[0].geometry.clone().applyMatrix4(STAND[f]);
      g.computeBoundingBox();
      g.translate(0, 0, -g.boundingBox!.min.z);
      const { tris } = prepareTriangles([{ geometry: g }], { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris.flat(), f.replace('.kcad', ''))));
      const c = stlControle(g);
      expect({ f, open: c.open, dubbel: c.dubbel }).toEqual({ f, open: 0, dubbel: 0 });
      expect(c.plat, f).toBeLessThan(c.driehoeken / 100);
    }
  }, 300000);
});

// ---------------------------------------------------------------- werktekening GLD-01
const g1 = (v: number) => getal(v, 1);
/** GLD-01: één A3-blad met de bak (boven met de printjes erin, voor, rechts, achter), het deksel, een doorsnede door de
 *  luidspreker, de onderdelenlijst, de bedrading en de berekening */
function tekening(): string {
  const bak = open('Geluidskastje-bak.kcad'), deks = open('Geluidskastje-deksel.kcad');
  const m = buitenmaat() as { x: number; z: number; h: number; xOog: number; bak: number }, B = k.binnen, b = new Blad();
  const XB = B.x / 2 + k.wand, ZB = B.z / 2 + k.wand, S = k.speaker;
  const X = (u: number) => u - B.x / 2, Z = (w: number) => w - B.z / 2;
  // het kader van de bak loopt in y van -2,4 tot 22: de aanzichten staan rond het midden (9,8)
  const yv = (y: number) => y - (K.binnen.h - K.bodem) / 2;
  b.tekst([24, 280], 'Geluidskastje: bak, deksel, onderdelen en bedrading (treinverlichting versie 6)', 4, 'start', { vet: true });

  // 1. bak van boven (1:1) met de printjes erin (gestreept)
  const T = teken(b, projectedView(bak, 'top'), 1, [92, 222]);
  const tt = (x: number, z: number) => T.to([x, -z]);
  const rect = (x0: number, z0: number, x1: number, z1: number, kleur: string) => {
    const a = tt(x0, z0), c = tt(x1, z1);
    b.el.push(`<rect x="${Math.min(a[0], c[0]).toFixed(2)}" y="${b.y(Math.max(a[1], c[1])).toFixed(2)}" width="${Math.abs(c[0] - a[0]).toFixed(2)}" height="${Math.abs(c[1] - a[1]).toFixed(2)}" fill="${kleur}" fill-opacity="0.12" stroke="${kleur}" stroke-width="0.3" stroke-dasharray="1.5 0.8"/>`);
  };
  const sp = tt(X(S.u), Z(S.w));
  b.el.push(`<circle cx="${sp[0].toFixed(2)}" cy="${b.y(sp[1]).toFixed(2)}" r="${(S.d / 2).toFixed(2)}" fill="none" stroke="#c8202f" stroke-width="0.3" stroke-dasharray="1.5 0.8"/>`);
  rect(X(L.esp.u0), Z(L.esp.w0), X(L.esp.u1) + k.esp.usb.uit, Z(L.esp.w1), '#1f4fa3');
  rect(X(L.max.u0), Z(L.max.w0), X(L.max.u1), Z(L.max.w1), '#5b3a8c');
  rect(X(L.reg.u0), Z(L.reg.w0), X(L.reg.u1), Z(L.reg.w1), '#2c6fd1');
  rect(X(L.dc.u) - k.dc.lijf / 2, -B.z / 2, X(L.dc.u) + k.dc.lijf / 2, -B.z / 2 + k.dc.diep, '#333333');
  const lab = (x: number, z: number, t: string, kleur: string) => b.tekst(tt(x, z), t, 2.2, 'middle', { kleur, vet: true });
  lab(X(S.u), Z(S.w) + 1, 'luidspreker Ø40', '#c8202f');
  lab(X((L.esp.u0 + L.esp.u1) / 2), Z((L.esp.w0 + L.esp.w1) / 2) + 1, 'ESP32-S3-Zero', '#1f4fa3');
  lab(X((L.max.u0 + L.max.u1) / 2), Z((L.max.w0 + L.max.w1) / 2) + 1, 'MAX98357A', '#5b3a8c');
  lab(X((L.reg.u0 + L.reg.u1) / 2), Z((L.reg.w0 + L.reg.w1) / 2) + 1, 'MP1584', '#2c6fd1');
  lab(X(L.dc.u), -B.z / 2 + 8, 'DC 12 V', '#333333');
  const oog = oogjes() as [number, number][];
  b.maatH(tt(-XB, 0)[0], tt(XB, 0)[0], tt(0, ZB)[1], tt(0, ZB)[1] - 7, g1(m.x));
  b.maatH(tt(-m.xOog / 2, 0)[0], tt(m.xOog / 2, 0)[0], tt(0, ZB)[1], tt(0, ZB)[1] - 13, `${g1(m.xOog)} met de oogjes`);
  b.maatV(tt(0, ZB)[1], tt(0, -ZB)[1], tt(-m.xOog / 2, 0)[0], tt(-m.xOog / 2, 0)[0] - 6, g1(m.z));
  b.maatH(tt(oog[0][0], 0)[0], tt(oog[1][0], 0)[0], tt(0, -ZB)[1], tt(0, -ZB)[1] + 6, `${g1(oog[1][0] - oog[0][0])} hart oogjes Ø${g1(k.oog.gat)}`);
  b.maatV(tt(0, oog[1][1])[1], tt(0, -ZB)[1], tt(m.xOog / 2, 0)[0], tt(m.xOog / 2, 0)[0] + 5, g1(oog[1][1] + ZB));
  b.tekst([T.x0, T.y1 + 16], 'Bak van boven (1:1), de printjes gestreept', 3, 'start', { vet: true });

  // 2. het deksel van boven (1:1)
  const D = teken(b, projectedView(deks, 'top'), 1, [222, 222]);
  const dt = (x: number, z: number) => D.to([x, -z]);
  const [hx, hz] = [X(L.bussen[0][0]), Z(L.bussen[0][1])], [ex, ez] = [X(L.bussen[3][0]), Z(L.bussen[3][1])];
  b.maatH(dt(-XB, 0)[0], dt(XB, 0)[0], dt(0, -ZB)[1], dt(0, -ZB)[1] - 7, g1(m.x));
  b.maatV(dt(0, ZB)[1], dt(0, -ZB)[1], dt(XB, 0)[0], dt(XB, 0)[0] + 7, g1(m.z));
  b.maatH(dt(hx, 0)[0], dt(ex, 0)[0], dt(0, ZB)[1], dt(0, ZB)[1] + 6, `${g1(ex - hx)}, 4 x Ø3,2`);
  b.maatV(dt(0, hz)[1], dt(0, ez)[1], dt(-XB, 0)[0], dt(-XB, 0)[0] - 6, g1(ez - hz));
  b.tekst([D.x0, D.y1 + 16], 'Deksel van boven (1:1)', 3, 'start', { vet: true });
  b.tekst([D.x0, D.y1 + 11], `Rooster: ${roosterGaten().length} gaatjes Ø${g1(k.rooster.d)}, raster ${g1(k.rooster.steek)}, binnen Ø${g1(2 * k.rooster.r)}`, 2.3);
  // de belangrijkste maten en het printen
  {
    let y = 86;
    const r = (t: string, vet = false) => { b.tekst([152, y], t, 2.2, 'start', { vet }); y -= 3.9; };
    r('Maten en printen', true);
    r(`Binnen ${g1(B.x)} x ${g1(B.z)} x ${g1(B.h)}; wand ${g1(k.wand)}, bodem ${g1(k.bodem)}, deksel ${g1(k.deksel)}, hoeken R${k.r}`);
    r(`Ring luidspreker Ø${g1(2 * k.ring.ri)} binnen, ${g1(k.ring.wand)} wand, ${g1(B.h - S.foam - S.flens - 0.1)} hoog, uitsparing ${k.ring.uitsparing.b} x ${k.ring.uitsparing.d}`);
    r(`Schroefpaaltjes printjes Ø${g1(k.paal.d)}, voorgat Ø${g1(k.paal.voorgat)}, hart ${g1(k.paal.rand)} naast de print`);
    r(`Steunrails ${g1(k.esp.rail)} hoog (regelaar ${g1(k.reg.rail)}): bovenkant print = bovenkant paaltje`);
    r(`Bussen deksel Ø${g1(2 * k.bus.r)} in de hoeken, voorgat Ø${g1(k.bus.voorgat)}, ${k.bus.diep} diep`);
    r('Bak rechtop, deksel met de buitenkant op het bed; PETG, 3 wanden,');
    r('0,2 laag, 20 % vulling; geen support (brug USB-opening 8,5).');
  }

  // 3. vooraanzicht, rechts (USB-C) en achter (DC-bus), 1:1
  const F = teken(b, projectedView(bak, 'front'), 1, [92, 163]);
  b.maatV(F.y0, F.y1, F.x0, F.x0 - 6, g1(m.bak));
  b.tekst([F.x0, F.y1 + 4], 'Vooraanzicht', 3, 'start', { vet: true });
  const RR = teken(b, projectedView(bak, 'right'), 1, [180, 163]);
  const rv = (z: number, y: number) => RR.to([-z, yv(y)]);
  const G = k.usbGat, uo = L.usb;
  b.maatH(rv(-ZB, 0)[0], rv(Z(uo.w), 0)[0], RR.y0, RR.y0 - 6, g1(Z(uo.w) + ZB));
  b.maatH(rv(Z(uo.w) - G.b / 2, 0)[0], rv(Z(uo.w) + G.b / 2, 0)[0], RR.y1, RR.y1 + 5, `${g1(G.b)} x ${g1(G.h)}`);
  b.maatV(rv(0, -k.bodem)[1], rv(0, uo.y)[1], RR.x1, RR.x1 + 6, g1(uo.y + k.bodem));
  b.tekst([RR.x0, RR.y1 + 11], 'Rechts: opening USB-C', 3, 'start', { vet: true });
  const BB = teken(b, projectedView(bak, 'back'), 1, [92, 118]);
  const bv = (x: number, y: number) => BB.to([-x, yv(y)]);
  b.maatH(bv(XB, 0)[0], bv(X(L.dc.u), 0)[0], BB.y0, BB.y0 - 6, g1(XB - X(L.dc.u)));
  b.maatV(bv(0, -k.bodem)[1], bv(0, L.dc.y)[1], bv(X(L.dc.u), 0)[0], bv(X(L.dc.u), 0)[0] + 9, g1(L.dc.y + k.bodem));
  b.tekst([BB.x0, BB.y1 + 4], `Achteraanzicht: DC-bus, gat Ø${g1(k.dc.gat)} met 45°-punt (druppel)`, 3, 'start', { vet: true });

  // 4. doorsnede door de luidspreker (schematisch, 1:1)
  {
    const c: P = [190, 106], H = B.h;
    const v = (x: number, y: number): P => [c[0] + x, c[1] + y - 10];
    const poly = (pts: [number, number][], vul: string, w = 0.35) => b.el.push(`<polygon points="${pts.map(([x, y]) => { const p = v(x, y); return `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`; }).join(' ')}" fill="${vul}" fill-opacity="0.35" stroke="#111" stroke-width="${w}"/>`);
    const ri = k.ring.ri, ro = L.ringR, yr = H - S.foam - S.flens - 0.1;
    poly([[-26, -k.bodem], [26, -k.bodem], [26, 0], [-26, 0]], '#777777');
    poly([[-ro, 0], [-ri, 0], [-ri, yr], [-ro, yr]], '#777777'); poly([[ri, 0], [ro, 0], [ro, yr], [ri, yr]], '#777777');
    poly([[-26, H], [26, H], [26, H + k.deksel], [-26, H + k.deksel]], '#9aa0a6');
    poly([[-S.d / 2, H - S.foam - S.flens], [S.d / 2, H - S.foam - S.flens], [S.d / 2, H - S.foam], [-S.d / 2, H - S.foam]], '#25272b');
    poly([[-S.lijf / 2, H - S.foam - S.h], [S.lijf / 2, H - S.foam - S.h], [S.lijf / 2, H - S.foam - S.flens], [-S.lijf / 2, H - S.foam - S.flens]], '#25272b');
    poly([[-S.d / 2, H - S.foam], [-ri + 1, H - S.foam], [-ri + 1, H], [-S.d / 2, H]], '#e0b040', 0.2);
    poly([[ri - 1, H - S.foam], [S.d / 2, H - S.foam], [S.d / 2, H], [ri - 1, H]], '#e0b040', 0.2);
    b.tekst(v(-25, H + 3.2), 'deksel met rooster', 2.1); b.tekst(v(-25, -k.bodem - 3.5), 'bodem', 2.1);
    b.tekst(v(ro + 1.5, 8), `ring Ø${g1(2 * ri)} / Ø${g1(2 * ro)}`, 2.1); b.tekst(v(ro + 1.5, H - 1.5), 'foamring 1 mm', 2.1, 'start', { kleur: '#a07000' });
    b.maatV(v(0, H - S.foam - S.h)[1], v(0, H - S.foam)[1], v(-S.d / 2, 0)[0], v(-S.d / 2, 0)[0] - 4, g1(S.h));
    b.tekst(v(-26, H + 8), 'Doorsnede door de luidspreker (1:1)', 3, 'start', { vet: true });
  }

  // 5. onderdelenlijst
  {
    const x0 = 24;
    const kol = [x0, x0 + 9, x0 + 16, x0 + 58];
    let y = 86;
    b.tekst([x0, y], 'Onderdelen per kastje (bestellijst: README.md)', 3, 'start', { vet: true });
    const rijen = [
      ['Pos', 'St.', 'Onderdeel', 'Type, maat'],
      ['1', '1', 'Bak (geprint)', `PETG zwart, ${g1(m.x)} x ${g1(m.z)} x ${g1(m.bak)}, rechtop, zonder support`],
      ['2', '1', 'Deksel (geprint)', `PETG grijs, ${g1(m.x)} x ${g1(m.z)} x ${g1(k.deksel)}, de buitenkant op het bed`],
      ['3', '1', 'ESP32-S3-Zero', 'Waveshare, ESP32-S3FH4R2 (4 MB flash), 23,5 x 18, USB-C'],
      ['4', '1', 'I2S-versterker', 'MAX98357A-breakout (Adafruit 3006 of kloon), 19,4 x 17,8'],
      ['5', '1', 'Luidspreker', 'Ø40, 4 ohm, 3 W, hoogstens 20 diep (bv. Adafruit 3968)'],
      ['6', '1', 'Regelaar 12 -> 5 V', 'MP1584EN-module 22 x 17 x 4; eerst op 5,0 V zetten'],
      ['7', '1', 'DC-bus 5,5 x 2,1', 'paneelmontage (DC-022B), gat Ø8, met moer'],
      ['8', '4', 'Plaatschroef 2,2 x 4,5', 'bolkop, de klemmen van de printjes'],
      ['9', '4', 'Sluitring M2,5 Ø8', 'DIN 9021: 3 x staal, 1 x nylon (bij de antenne van de ESP)'],
      ['10', '4', 'Plaatschroef 2,9 x 9,5', 'bolkop (DIN 7981), het deksel'],
      ['11', '1', 'Foamring', 'zelfklevend, Ø40 / Ø34 x 1, tussen flens en deksel'],
      ['12', '2', 'Schroef 3,5 x 16', 'het kastje vastzetten (oogjes Ø4,2)'],
    ];
    for (const [i, r] of rijen.entries()) {
      y -= 4.5;
      r.forEach((t, j) => b.tekst([kol[j] + (j < 2 ? 6 : 0), y], t, 2.2, j < 2 ? 'end' : 'start', { vet: i === 0 }));
    }
  }

  // 6. bedrading
  {
    const x0 = 286;
    b.tekst([x0 - 4, 280], 'Bedrading', 3.4, 'start', { vet: true });
    const doos = (x: number, y: number, w: number, h: number, titel: string, kleur: string) => {
      b.el.push(`<rect x="${x}" y="${b.y(y + h)}" width="${w}" height="${h}" fill="${kleur}" fill-opacity="0.1" stroke="#111" stroke-width="0.4"/>`);
      b.tekst([x + w / 2, y + h - 4], titel, 2.6, 'middle', { vet: true });
    };
    const pin = (x: number, y: number, t: string, anker: 'start' | 'end') => { b.cirkel([x, y], 0.7, 0.3); b.tekst([x + (anker === 'start' ? 1.8 : -1.8), y - 0.8], t, 2.1, anker); };
    const draad = (pts: P[], kleur: string, w = 0.6) => b.el.push(`<polyline points="${pts.map((p) => `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${w}" stroke-linejoin="round"/>`);
    doos(x0, 248, 30, 22, 'DC-bus 12 V', '#999999');
    pin(x0 + 30, 260, '+ (pen)', 'end'); pin(x0 + 30, 253, '− (huls)', 'end');
    doos(x0 + 52, 236, 34, 34, 'MP1584EN', '#2c6fd1');
    pin(x0 + 52, 260, 'IN+', 'start'); pin(x0 + 52, 253, 'IN−', 'start');
    pin(x0 + 86, 260, 'OUT+', 'end'); pin(x0 + 86, 246, 'OUT−', 'end');
    b.tekst([x0 + 69, 239], 'eerst op 5,0 V zetten', 2.0, 'middle', { kleur: '#c8202f', vet: true });
    draad([[x0 + 30, 260], [x0 + 52, 260]], '#e07a10'); draad([[x0 + 30, 253], [x0 + 52, 253]], '#1b1b1b');
    doos(x0 + 66, 150, 52, 74, 'ESP32-S3-Zero', '#1f4fa3');
    const ep: [number, string][] = [[212, '5V'], [205, 'GND'], [190, 'GPIO4  BCLK'], [182, 'GPIO5  LRC'], [174, 'GPIO6  DIN'], [166, 'GPIO1  SD']];
    for (const [y, t] of ep) pin(x0 + 66, y, t, 'start');
    b.tekst([x0 + 92, 154], 'USB-C (flashen) →', 2.1, 'middle');
    doos(x0, 120, 40, 80, 'MAX98357A', '#5b3a8c');
    const mp: [number, string][] = [[190, 'VIN'], [183, 'GND'], [174, 'BCLK'], [166, 'LRC'], [158, 'DIN'], [150, 'SD'], [142, 'GAIN']];
    for (const [y, t] of mp) pin(x0 + 40, y, t, 'end');
    b.tekst([x0 + 30, 137.2], 'open = 9 dB', 1.9, 'end', { kleur: '#555' });
    pin(x0 + 12, 120, '+', 'end'); pin(x0 + 28, 120, '−', 'start');
    draad([[x0 + 86, 260], [x0 + 96, 260], [x0 + 96, 230], [x0 + 58, 230], [x0 + 58, 212], [x0 + 66, 212]], '#c8202f');
    draad([[x0 + 58, 212], [x0 + 50, 212], [x0 + 50, 190], [x0 + 40, 190]], '#c8202f');
    draad([[x0 + 86, 246], [x0 + 92, 246], [x0 + 92, 227], [x0 + 61, 227], [x0 + 61, 205], [x0 + 66, 205]], '#1b1b1b');
    draad([[x0 + 61, 205], [x0 + 47, 205], [x0 + 47, 183], [x0 + 40, 183]], '#1b1b1b');
    draad([[x0 + 66, 190], [x0 + 55, 190], [x0 + 55, 174], [x0 + 40, 174]], '#e3c21a');
    draad([[x0 + 66, 182], [x0 + 58, 182], [x0 + 58, 166], [x0 + 40, 166]], '#2e9e4f');
    draad([[x0 + 66, 174], [x0 + 61, 174], [x0 + 61, 158], [x0 + 40, 158]], '#1f4fa3');
    draad([[x0 + 66, 166], [x0 + 64, 166], [x0 + 64, 150], [x0 + 40, 150]], '#8a8d91');
    const ls: P = [x0 + 20, 96];
    b.cirkel(ls, 9, 0.4); b.cirkel(ls, 4, 0.3);
    b.tekst([ls[0] + 12, ls[1] - 1], 'luidspreker 4 ohm', 2.2);
    draad([[x0 + 12, 120], [x0 + 12, 110], [ls[0] - 4, 110], [ls[0] - 4, ls[1] + 8]], '#c8202f');
    draad([[x0 + 28, 120], [x0 + 28, 110], [ls[0] + 4, 110], [ls[0] + 4, ls[1] + 8]], '#1b1b1b');
    let y = 80;
    const r = (t: string, vet = false) => { b.tekst([x0 - 4, y], t, 2.15, 'start', { vet }); y -= 3.6; };
    const be = berekening() as { i5Piek: number; i12Piek: number; i12Gem: number; warmte: number; dT: number; iVersterkerPiek: number };
    r('Draden 0,25 mm², zo kort mogelijk: 12 V oranje, 5 V rood,', true);
    r('GND zwart, BCLK geel, LRC groen, DIN blauw, SD grijs.');
    r('GPIO1, 4, 5, 6: geen strapping-pinnen (0, 3, 45, 46).');
    r('SD hoog = versterker aan (links = rechts), laag = uit.');
    r(`Piek op 5 V: ${getal(be.iVersterkerPiek, 2)} A (3 W op 4 ohm) + 0,35 A wifi`, true);
    r(`= ${getal(be.i5Piek, 2)} A: MP1584EN (3 A) ja, Mini-360 te krap.`);
    r(`Uit 12 V: piek ${getal(be.i12Piek, 2)} A, gemiddeld ${Math.round(be.i12Gem * 1000)} mA.`);
    r(`Warmte ${getal(be.warmte, 2)} W: het kastje wordt ${g1(be.dT)} K warmer.`);
  }

  const massa = (d: Document) => meshVolume((rebuildDocument(d) as unknown as R).bodies[0].geometry) * 1.27e-3;
  kader(b, { nr: 'GLD-01', naam: 'Geluidskastje', materiaal: 'PETG (bak zwart, deksel grijs)', maken: '3D-print zonder support; onderdelen: lijst', massa: `${getal(massa(bak) + massa(deks), 0)} g (geprint, massief)`, schaal: '1:1', blad: '1 / 1', soort: 'Werktekening en bedrading' }, { naam: 'Treinverlichting: geluidskastje', datum: '2026-11-15', revisie: '0' });
  return b.svg();
}

describe.skipIf(!process.env.KASTJE_TEKENING)('geluidskastje, werktekening', () => {
  it('GLD-01 (A3)', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(`${DIR}/tekeningen`, { recursive: true });
    writeFileSync(`${DIR}/tekeningen/GLD-01-geluidskastje.svg`, tekening());
  }, 300000);
});
