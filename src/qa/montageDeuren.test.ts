// @ts-nocheck
// Montagebladen van de taatsdeuren (bibliotheek/taatsdeuren/verbinding.mjs, montage.mjs): elk profielsysteem en elk
// scharnier geeft geldige scènes (eindige punten, genummerde delen), aluminium wordt nooit gelast, staal wel, en de
// prijzen vallen in de marktband (Ian, 2026-11-12: aluminium hoogstens ± € 880 excl. btw).
import { describe, expect, it } from 'vitest';
import { STIJLEN, ontwerp, SYSTEMEN } from '../../bibliotheek/taatsdeuren/deuren.mjs';
import { montage, vlakken } from '../../bibliotheek/taatsdeuren/verbinding.mjs';
import { montageBladen } from '../../bibliotheek/taatsdeuren/montage.mjs';
import { kostprijs, MARKTBAND } from '../../bibliotheek/taatsdeuren/prijzen.mjs';
import { stuklijst } from '../../bibliotheek/taatsdeuren/stuklijst.mjs';
import { boringBladen } from '../../bibliotheek/taatsdeuren/boringblad.mjs';
import { vorm3d } from '../../bibliotheek/taatsdeuren/detail.mjs';

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
  it('aluminium: geen verzonken kop in een dunne wand; toegangsgat met afdekdop, verzonken enkel in de deurplaat', () => {
    for (const sys of ['darby', 'aanvraag']) {
      const sc = montage(maak('drievak', sys));
      expect(sc.find((x) => x.id === 'roede').delen.some((d) => /Afdekdop/.test(d.naam)), sys).toBe(true);
      expect(sc.find((x) => x.id === 'roede').delen.some((d) => /verzonken/.test(d.naam)), sys).toBe(false);
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

describe('gaten in de stukken (boringen.mjs)', () => {
  const tel = (posities, re, pred) => posities.filter((p) => re.test(p.naam)).reduce((t, p) => t + p.n * (p.gaten ?? []).filter(pred).length, 0);
  it('staal: elke schroef van een hoeklijn heeft een getapt gat M4 in de koker', () => {
    const { posities } = stuklijst(maak('raster', 'auto'), {});
    const lat = tel(posities, /hoeklijn/, (b) => b.verz === 9), koker = tel(posities, /^Kader/, (b) => b.draad === 'M4');
    expect(lat).toBeGreaterThan(10);
    expect(koker).toBe(lat);
    expect(tel(posities, /: lat achter/, (b) => b.verz === 9)).toBe(tel(posities, /: kern/, (b) => b.draad === 'M4'));
  });
  it('aluminium P1-P4: een toegangsgat per roede-uiteinde, 4 boringen per hoek aan de glaszijde, geen verzinking in de wand', () => {
    const o = maak('drievak', 'aanvraag'), { posities } = stuklijst(o, {}), roeden = posities.filter((p) => /^Roede/.test(p.naam)).reduce((t, p) => t + p.n, 0);
    expect(tel(posities, /^Kader/, (b) => b.d === 10 && b.d2 === 5.5)).toBe(roeden * 2);
    expect(tel(posities, /^Kader/, (b) => b.d === 6.5 && b.kant === 'binnen' && /hoekverbinder/.test(b.doel))).toBe(4 * 4);
    expect(tel(posities, /^(Kader|Kozijn)/, (b) => !!b.verz)).toBe(0);
    expect(tel(posities, /^Kader/, (b) => b.d === 12.2)).toBe(2); // de greep, met afstandsbus
  });
  it('de pivot: doorgang in de onderregel, Ø20 in de bovenregel en in het kozijn, recht boven elkaar', () => {
    for (const sys of ['auto', 'aanvraag']) {
      const o = maak('strak', sys), { posities } = stuklijst(o, {});
      expect(tel(posities, /^Kader: regel/, (b) => b.d === 20)).toBe(1);
      expect(tel(posities, /^Kozijn: bovenregel/, (b) => b.d === 20)).toBe(1);
      const boven = posities.find((p) => /^Kader/.test(p.naam) && p.gaten?.some((b) => b.d === 20)).gaten.find((b) => b.d === 20), koz = posities.find((p) => /^Kozijn/.test(p.naam) && p.gaten?.some((b) => b.d === 20)).gaten.find((b) => b.d === 20);
      const v = o.vleugels[0], ax = v.x + 100;
      expect(Math.min(boven.u, v.B - boven.u) + v.x).toBeCloseTo(ax, 0);
      expect(Math.min(koz.u, o.kozijn.B - koz.u)).toBeCloseTo(ax, 0);
    }
  });
  it('boringenbladen en de 3D van de stukken: geen fouten, de gaten zitten in de wanden', () => {
    for (const sys of ['auto', 'darby', 'aanvraag', 'janisol']) {
      const o = maak('drievak', sys), { posities } = stuklijst(o, {}), bl = boringBladen(o, posities, { nr: 'TD-02' });
      expect(bl.length).toBeGreaterThan(1);
      for (const b of bl) expect(b.svg).not.toMatch(/NaN|undefined|Infinity/);
      for (const p of posities.filter((x) => x.gaten?.length && x.soort === 'staaf')) {
        const v = vorm3d(p, o), n = v.delen.reduce((t, d) => t + d.gaten.length, 0);
        expect(n, `${sys} pos ${p.pos} ${p.naam}`).toBeGreaterThan(0);
      }
    }
  });
});
