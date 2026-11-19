/**
 * The flat of a bent plate through the general unfolder (unfoldMesh.ts), for parts whose bends do not all come from the
 * base flange (edge flanges, hems, jogs) or that have no sheet metal features at all. Checked like every flat: the area
 * x t of an unfold with K = 0.5 against the volume of the folded part (0.5 %), and the holes of the folded part.
 */
import type { FabBody } from './bodies';
import { flatOfPlate, genus, plateOutline, type Bend, type FlatPart } from './flat';
import { plateAnalysis } from './recognize';
import { volume, type P2 } from './geom';
import { unfoldMesh } from './unfoldMesh';

export function flatByUnfolding(folded: FabBody, naam: string, n: number, materiaal: string, t: number, r: number, k: number, label: string): FlatPart {
  const u = unfoldMesh(folded.soup, t, r, k);
  const empty = { key: folded.key, naam, n, materiaal, t, dichtheid: folded.dichtheid, buiten: [], binnen: [], gaten: [], plooien: [], bbox: { l: 0, b: 0, draai: 0 }, oppervlak: 0,
    snijlengte: { buiten: 0, binnen: 0 }, insteken: 0, kg: 0, kBron: label };
  if ('fout' in u) return { ...empty, betrouwbaar: 'geen', fout: `ontvouwen: ${u.fout}` };
  const fb: FabBody = { ...folded, soup: u.soup, faces: [] };
  // the plate analysis needs its faces: one flat face top and bottom is enough (the walls are not used)
  fb.faces = [{ normal: [0, 0, 1], area: u.oppervlak, curved: false, triangles: [] }, { normal: [0, 0, -1], area: u.oppervlak, curved: false, triangles: [] }] as unknown as FabBody['faces'];
  const flat = flatOfPlate(fb, naam, n, materiaal);
  if (flat.betrouwbaar === 'geen') return { ...empty, betrouwbaar: 'geen', fout: `ontvouwen: ${flat.fout}` };
  const half = unfoldMesh(folded.soup, t, r, 0.5);
  const vFlat = 'fout' in half ? NaN : half.oppervlak * t, vFold = volume(folded.soup);
  const gFold = genus(folded.soup), holes = flat.binnen.length + flat.gaten.length;
  let fout: string | undefined;
  if (!Number.isFinite(vFlat) || Math.abs(vFlat - vFold) > 0.005 * vFold) fout = `het volume van de ontvouwen plaat wijkt ${((100 * (vFlat - vFold)) / vFold).toFixed(2)} % af van het gezette stuk`;
  else if ((gFold ?? u.gaten) !== holes) fout = `het gezette stuk heeft ${gFold ?? u.gaten} gaten, de uitslag ${holes}`;
  // the bend lines in the frame of the outline
  const pl = plateAnalysis(fb);
  const plooien: Bend[] = [];
  if ('t' in pl) {
    const o = plateOutline(fb.soup, pl.n, pl.hi, pl.t);
    if (!('fout' in o)) {
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot);
      const to2 = (p: P2): P2 => { const x = p.x * o.u[0] + p.y * o.u[1], y = p.x * o.v[0] + p.y * o.v[1]; return { x: x * cs - y * sn - o.origin.x, y: x * sn + y * cs - o.origin.y }; };
      // seen from the top of the flat: when the outline frame looks from below (n = -z) up and down swap
      const flip = pl.n[2] < 0;
      u.plooien.forEach((b, i) => plooien.push({ a: to2(b.a), b: to2(b.b), hoek: Math.round(b.hoek * 10) / 10, r, k, id: i + 1,
        richting: (b.richting === 'op') !== flip ? 'op' : 'neer' }));
    }
  }
  return { ...flat, kBron: `${label}, algemene ontvouwer`, plooien, betrouwbaar: fout ? 'geen' : 'exact', fout };
}
