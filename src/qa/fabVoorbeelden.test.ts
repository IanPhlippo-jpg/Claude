/**
 * The fabrication extensions on the example models (docs/36 L1.2, L1.3, O1.2, O1.3, P2.6): the recognition, the cost
 * and the laser outline of models built by generators as plain extrusions. What the generators drew simplified (a
 * tube drawn solid, a channel with other wall sizes, plates of 8.5 or 3.5 mm that are no commercial thickness) is
 * written down here as measured, not hidden: those bodies land in "No cost assigned" with their reason.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDocument } from '../core/document/persistence';
import { setRebuildBudget } from '../core/features/rebuild';
import { readDxf } from '../core/exchange/dxfRead';
import { documentBodies } from '../fab/bodies';
import { recognizeAll } from '../fab/recognize';
import { sawList } from '../fab/sawList';
import { analyze } from '../fab/analyze';
import { defaultSettings } from '../fab/settings';
import { profileById } from '../fab/catalog';

setRebuildBudget(Number.POSITIVE_INFINITY);
const lees = (f: string) => parseDocument(readFileSync(f, 'utf8'));

describe('fabrication on the example models', () => {
  it('L1.3 the door handle lever: every body unknown, no error, no saw line', () => {
    const recs = recognizeAll(documentBodies(lees('voorbeelden/deurkruk/Kruk.kcad')));
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.soort === 'onbekend')).toBe(true);
    expect(sawList(recs)).toEqual([]);
  }, 120000);

  it('O1.3 the door handle assembly: everything in No cost assigned, the total marked incomplete', () => {
    const a = analyze(lees('voorbeelden/deurkruk/Deurkruk.kcad'), defaultSettings());
    expect(a.recs.length).toBeGreaterThan(0);
    expect(a.cost.geenKost.length).toBe(a.recs.filter((r) => r.soort === 'onbekend').length);
    expect(a.recs.some((r) => r.soort === 'profiel')).toBe(false);
    expect(a.cost.onvolledig).toBe(true);
  }, 300000);

  it('L1.2 lastafel Onderframe and Bovenframe: no body skipped; the profiles the drawing allows are recognized with the oracle length', () => {
    const want: Record<string, { prof: string; l: number }> = { // voorbeelden/lastafel/docs/materiaal.json
      Langsligger: { prof: 'UPN 100', l: 2390 }, 'Rolbaan onder': { prof: 'Platstaal 40 x 20', l: 737 },
      'Langsligger boven': { prof: 'Koker 110 x 50 x 5', l: 2390 }, 'Rolbaan boven': { prof: 'Platstaal 40 x 10', l: 686 },
    };
    for (const f of ['Onderframe', 'Bovenframe']) {
      const bodies = documentBodies(lees(`voorbeelden/lastafel/delen/${f}.kcad`));
      const recs = recognizeAll(bodies);
      expect(recs.length).toBe(bodies.length);
      for (const r of recs) {
        const w = want[r.naam];
        if (!w) continue;
        expect(profileById(r.profielId)?.naam, `${f} ${r.naam}`).toBe(w.prof);
        expect(Math.abs((r.lengte ?? 0) - w.l), `${f} ${r.naam}`).toBeLessThanOrEqual(0.5);
      }
      // measured, not recognized: the cross beams are drawn 99 x 60 and 109 x 60 (oracle UNP 100 / koker 110 x 60 x 5),
      // the hanger 30 x 7.5 (oracle platstaal 30 x 8): unknown with their reason, never a silent guess
      for (const r of recs.filter((x) => !want[x.naam])) if (r.soort === 'onbekend') expect(r.reden.length).toBeGreaterThan(5);
    }
  }, 300000);

  it('P1.6 lastafel plates: the 16 mm lifting eyes and the 12 mm lip plates are plates of their thickness; no profile counted as plate', () => {
    const ond = recognizeAll(documentBodies(lees('voorbeelden/lastafel/delen/Onderframe.kcad')));
    expect(ond.filter((r) => r.naam === 'Hijsoog').map((r) => [r.soort, r.t])).toEqual(Array(4).fill(['plaat', 16]));
    const bok = recognizeAll(documentBodies(lees('voorbeelden/lastafel/delen/Cilinderbok.kcad')));
    expect(bok.filter((r) => r.naam === 'Lipplaat').map((r) => [r.soort, r.t])).toEqual(Array(4).fill(['plaat', 12]));
    expect(ond.filter((r) => r.soort === 'plaat').every((r) => !/Langsligger|Rolbaan/.test(r.naam))).toBe(true);
  }, 300000);

  // docs/37 N-10, N-14: the lifting eye cuts its Ø30 as one CIRCLE; the cylinder eye (R34 drawn by the generator as 8
  // chords) is cut as drawn and is exact; the lip plate has no bore because the generator draws it solid with the pin
  // Ø40 through it (maak-lastafel.mjs cilinderbok: profX without a hole, cilX for the pin): the model, not the core
  it('N-10 / N-14 lastafel: hole of the lifting eye a circle; cylinder eye exact as drawn; lip plate without bore as modelled', () => {
    const ond = analyze(lees('voorbeelden/lastafel/delen/Onderframe.kcad'), defaultSettings());
    const oog = ond.flats.find((f) => f.naam === 'Hijsoog')!;
    expect([oog.gaten.length, oog.binnen.length]).toEqual([1, 0]);
    expect(Math.abs(oog.gaten[0].r - 15)).toBeLessThan(0.02);
    const armB = analyze(lees('voorbeelden/lastafel/delen/Armpaar-B.kcad'), defaultSettings());
    const cyl = armB.flats.find((f) => f.naam === 'Oog cilinder')!;
    expect([cyl.betrouwbaar, cyl.n]).toEqual(['exact', 4]);
    expect(cyl.buiten.every((sg) => sg.bulge === 0)).toBe(true);
    const bok = lees('voorbeelden/lastafel/delen/Cilinderbok.kcad');
    const lip = analyze(bok, defaultSettings()).flats.find((f) => f.naam === 'Lipplaat')!;
    expect([lip.gaten.length, lip.binnen.length]).toEqual([0, 0]);
    // the pin body runs through the lip plate: the bore is missing in the model itself
    const bodies = documentBodies(bok), box = (k: string) => { const b = bodies.find((x) => x.naam === k)!; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < b.soup.length; i += 3) for (let q = 0; q < 3; q++) { lo[q] = Math.min(lo[q], b.soup[i + q]); hi[q] = Math.max(hi[q], b.soup[i + q]); } return { lo, hi }; };
    const L = box('Lipplaat'), P = box('Cilinderpen Ø40');
    expect([0, 1, 2].every((q) => Math.min(L.hi[q], P.hi[q]) - Math.max(L.lo[q], P.lo[q]) > 5)).toBe(true);
  }, 300000);

  // rooster.dxf holds 197 closed LWPOLYLINE: 195 on layer SNIJDEN (the outline and 194 holes, as rooster.loops of the
  // generator) and 2 on layer 0 (not cut); its round holes are polylines, no CIRCLE. The SNIJDEN layer is compared.
  it('P2.6 the grille of the extraction: the same contours as the cut layer of rooster.dxf, cut length within 0.5 %', () => {
    const a = analyze(lees('voorbeelden/afzuiging/Rooster-LB.kcad'), defaultSettings());
    const f = a.flats[0];
    expect(f.betrouwbaar, f.fout).toBe('exact');
    const text = readFileSync('voorbeelden/afzuiging/laser/rooster.dxf', 'utf8').replace(/\r/g, '');
    const lines = text.split('\n');
    // the entity records: code / value pairs; a polyline's layer is the value after its first group code 8
    let len = 0, cut = 0;
    for (let i = 0; i + 1 < lines.length; i += 2) {
      if (lines[i].trim() !== '0' || lines[i + 1].trim() !== 'LWPOLYLINE') continue;
      let layer = '', closed = false;
      const pts: { x: number; y: number; b: number }[] = [];
      for (let k = i + 2; k + 1 < lines.length && lines[k].trim() !== '0'; k += 2) {
        const c = lines[k].trim(), v = lines[k + 1].trim();
        if (c === '8' && !layer) layer = v;
        if (c === '70') closed = (Number(v) & 1) === 1;
        if (c === '10') pts.push({ x: Number(v), y: 0, b: 0 });
        if (c === '20') pts[pts.length - 1].y = Number(v);
        if (c === '42') pts[pts.length - 1].b = Number(v);
      }
      if (layer !== 'SNIJDEN') continue;
      cut++;
      pts.forEach((p, j) => {
        if (j === pts.length - 1 && !closed) return;
        const q = pts[(j + 1) % pts.length], ch = Math.hypot(q.x - p.x, q.y - p.y);
        const th = Math.abs(4 * Math.atan(p.b));
        len += th < 1e-12 ? ch : (ch / (2 * Math.sin(th / 2))) * th;
      });
    }
    expect(cut).toBe(195);
    expect(1 + f.binnen.length + f.gaten.length).toBe(cut);
    const loops = JSON.parse(readFileSync('voorbeelden/afzuiging/laser/rooster.loops', 'utf8')) as { holes: unknown[] };
    expect(f.binnen.length + f.gaten.length).toBe(loops.holes.length);
    const ours = f.snijlengte.buiten + f.snijlengte.binnen;
    expect(Math.abs(ours - len) / len, `ours ${ours.toFixed(1)} mm, rooster.dxf ${len.toFixed(1)} mm`).toBeLessThan(0.005);
    void readDxf;
  }, 300000);

  it('O1.2 the welding table assembly: every component once in one folder; hydraulics and electrics in No cost assigned', () => {
    const doc = lees('voorbeelden/lastafel/Lastafel.kcad');
    const a = analyze(doc, defaultSettings());
    // each recognized body lands in exactly one cost line (material, purchased or "no cost assigned")
    const owners = new Map<string, number>();
    for (const l of a.cost.regels.filter((x) => ['profiel', 'plaat', 'koop', 'vrij'].includes(x.categorie))) for (const k of l.herkomst) owners.set(k, (owners.get(k) ?? 0) + 1);
    for (const r of a.recs) expect(owners.get(r.key) ?? 0, r.key).toBeGreaterThanOrEqual(r.soort === 'gezette plaat' ? 0 : 1);
    // the counts: every BOM part appears with its component count
    const bom = new Map<string, number>();
    for (const c of doc.components ?? []) if (!c.suppressed && !c.envelope) bom.set(c.part.name, (bom.get(c.part.name) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const r of a.recs) seen.set(r.bron.part, r.aantal);
    for (const [name, n] of bom) expect(seen.get(name), name).toBe(n);
    const none = new Set(a.cost.geenKost.map((r) => r.bron.part));
    for (const name of [...bom.keys()].filter((x) => /Hydraulisch|Bedienkast|Noodstop|Kabel|slang/i.test(x))) expect(none.has(name), name).toBe(true);
    expect(a.cost.onvolledig).toBe(true);
  }, 900000);
});
