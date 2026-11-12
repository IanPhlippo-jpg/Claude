// @ts-nocheck
// Montagebladen van de taatsdeuren (bibliotheek/taatsdeuren/verbinding.mjs, montage.mjs): elk profielsysteem en elk
// scharnier geeft geldige scènes (eindige punten, genummerde delen), aluminium wordt nooit gelast, staal wel, en de
// prijzen vallen in de marktband (Ian, 2026-11-12: aluminium hoogstens ± € 880 excl. btw).
import { describe, expect, it } from 'vitest';
import { STIJLEN, ontwerp, SYSTEMEN } from '../../bibliotheek/taatsdeuren/deuren.mjs';
import { montage, vlakken } from '../../bibliotheek/taatsdeuren/verbinding.mjs';
import { montageBladen } from '../../bibliotheek/taatsdeuren/montage.mjs';
import { kostprijs, MARKTBAND } from '../../bibliotheek/taatsdeuren/prijzen.mjs';

const stijl = (id) => STIJLEN.find((s) => s.id === id);
const maak = (id, systeem, scharnier = 'budget') => { const s = stijl(id); return ontwerp(s.id, s.std.B, s.std.H, { systeem, scharnier }); };

describe('montage per profielsysteem', () => {
  for (const sys of Object.keys(SYSTEMEN)) for (const scharnier of ['budget', 'premium', 'verdekt']) {
    it(`${sys} / ${scharnier}`, () => {
      const o = maak('drievak', sys, scharnier);
      if (o.sysKey !== sys) return; // past niet (bv. verdekt in een koopprofiel): dan kiest de bibliotheek een ander
      const sc = montage(o, { scharnier, scharnierModel: scharnier });
      expect(sc.map((x) => x.id).slice(0, 3)).toEqual(['hoek', 'roede', 'glas']);
      expect(sc.length).toBe(o.scharnier === 'verdekt' ? 4 : 5);
      for (const x of sc) {
        expect(x.delen.filter((d) => d.nr).length, x.id).toBeGreaterThan(1);
        expect(x.stappen.length, x.id).toBeGreaterThan(1);
        for (const d of x.delen) for (const s of d.solids) for (const v of vlakken(s)) for (const p of v.pts) expect(p.every(Number.isFinite), `${x.id} ${d.naam}`).toBe(true);
        const las = x.delen.some((d) => d.naam === 'Lasnaad');
        if (o.sys.alu) expect(las, `${x.id}: aluminium wordt niet gelast`).toBe(false);
        else if (x.id === 'hoek') expect(las, 'staal: de hoek is gelast').toBe(true);
      }
      for (const b of montageBladen(o, { scharnier }, { nr: 'TD-02', datum: '2026-11-12' })) {
        expect(b.svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(b.svg).toContain(o.sys.alu ? 'ALUMINIUM' : 'STAAL');
      }
    });
  }
  it('aluminium: verzonken bouten en schroeven met kop 90° (afschuining)', () => {
    for (const sys of ['darby', 'aanvraag']) {
      const sc = montage(maak('drievak', sys));
      expect(sc.find((x) => x.id === 'roede').delen.some((d) => /verzonken/.test(d.naam)), sys).toBe(true);
      expect(sc.find((x) => x.id === 'pivot').delen.some((d) => /verzonken/.test(d.naam)), sys).toBe(true);
    }
  });
});

describe('prijzen in de marktband', () => {
  it('aluminium Strak met het profiel op maat: hoogstens € 880 excl. btw zonder plaatsen (marge 20 %)', () => {
    const k = kostprijs(maak('strak', 'aanvraag'), { systeem: 'aanvraag', marge: 20, plaatsen: false });
    expect(k.verkoop).toBeLessThanOrEqual(MARKTBAND.alu.hoog);
    expect(k.verkoop).toBeGreaterThanOrEqual(MARKTBAND.alu.laag);
  });
  it('staal Strak: binnen de marktband, met plaatsen tot € 2 300', () => {
    const zonder = kostprijs(maak('strak', 'auto'), { marge: 35, plaatsen: false }), met = kostprijs(maak('strak', 'auto'), { marge: 35, plaatsen: true });
    expect(zonder.verkoop).toBeLessThanOrEqual(MARKTBAND.staal.hoog);
    expect(met.verkoop).toBeLessThanOrEqual(2300);
    expect(met.verkoop - zonder.verkoop).toBeCloseTo(met.plaatsen.verkoop, 1);
  });
  it('de regels tellen op tot de kostprijs', () => {
    for (const sys of ['auto', 'darby', 'aanvraag']) {
      const k = kostprijs(maak('raster', sys), { systeem: sys, plaatsen: false });
      expect(k.regels.reduce((t, r) => t + r.bedrag, 0)).toBeCloseTo(k.materiaal, 1);
      expect(k.materiaal + k.arbeid).toBeCloseTo(k.kostprijs, 1);
    }
  });
});
