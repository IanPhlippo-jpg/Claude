/**
 * Typeplaatje van de afzuiging (advies Fable 5.2, P2-15): elke tekstregel past op het label van 90 x 45 mm met een vrije
 * rand, geen regel loopt over een andere of over een symbool, de versie is die van revisie.mjs, en de verplichte
 * gegevens staan erop. De breedte wordt ruim geschat: 0,6 x de lettergrootte per teken (vet 0,66), Arial, met text-anchor.
 * De negatieve controle: de regels van het oude label (70 x 35, versie 7.2) vallen met dezelfde schatting buiten het label.
 * Draai eerst: node voorbeelden/afzuiging/docs/maak-typeplaatje.mjs
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { REVISIE } from '../../voorbeelden/afzuiging/revisie.mjs';
import { LABEL, SYMBOLEN, maakTypeplaatje } from '../../voorbeelden/afzuiging/docs/maak-typeplaatje.mjs';

type Regel = { x: number; y: number; size: number; anchor: string; vet: boolean; tekst: string };
type Vak = { x0: number; x1: number; y0: number; y1: number };

const ontsnap = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function regels(svg: string): Regel[] {
  return [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((m) => {
    const a = (n: string) => new RegExp(`\\s${n}="([^"]*)"`).exec(m[1])?.[1];
    return { x: +a('x')!, y: +a('y')!, size: +a('font-size')!, anchor: a('text-anchor') ?? 'start', vet: /bold|[6-9]00/.test(a('font-weight') ?? ''), tekst: ontsnap(m[2]) };
  });
}
/** ruime schatting van het vak van een tekstregel (Arial): breedte 0,6 x grootte per teken, vet 0,66; boven 0,75, onder 0,25 */
function vak(r: Regel): Vak {
  const b = r.tekst.length * r.size * (r.vet ? 0.66 : 0.6);
  const x0 = r.anchor === 'end' ? r.x - b : r.anchor === 'middle' ? r.x - b / 2 : r.x;
  return { x0, x1: x0 + b, y0: r.y - 0.75 * r.size, y1: r.y + 0.25 * r.size };
}
const binnen = (v: Vak, b: number, h: number, rand: number) => v.x0 >= rand && v.x1 <= b - rand && v.y0 >= rand && v.y1 <= h - rand;
const raakt = (p: Vak, q: Vak) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;

describe('typeplaatje afzuiging (P2-15)', () => {
  const svg = maakTypeplaatje();
  const rs = regels(svg);

  it('is 90 x 45 mm en het bestand is bijgewerkt (maak-typeplaatje.mjs gedraaid)', () => {
    expect(svg).toMatch(/width="90mm" height="45mm" viewBox="0 0 90 45"/);
    expect(readFileSync('voorbeelden/afzuiging/docs/typeplaatje.svg', 'utf8').replace(/\r\n/g, '\n')).toBe(svg);
  });

  it('elke tekstregel past binnen het label met een vrije rand van 1,5 mm', () => {
    expect(rs.length).toBeGreaterThanOrEqual(10);
    const fout = rs.filter((r) => !binnen(vak(r), LABEL.b, LABEL.h, LABEL.rand)).map((r) => `${r.tekst} (${JSON.stringify(vak(r))})`);
    expect(fout).toEqual([]);
  });

  it('geen regel overlapt een andere of een symbool', () => {
    const fout: string[] = [];
    rs.forEach((p, i) => rs.slice(i + 1).forEach((q) => { if (raakt(vak(p), vak(q))) fout.push(`${p.tekst} / ${q.tekst}`); }));
    for (const [naam, [x, y, b, h]] of Object.entries(SYMBOLEN)) {
      const s = { x0: x, x1: x + b, y0: y, y1: y + h };
      expect(binnen(s, LABEL.b, LABEL.h, LABEL.rand), naam).toBe(true);
      for (const r of rs) if (raakt(vak(r), s)) fout.push(`${r.tekst} / symbool ${naam}`);
      expect(svg).toContain(`data-vak="${x} ${y} ${b} ${h}"`);
    }
    expect(fout).toEqual([]);
  });

  it('de versie is die van revisie.mjs', () => {
    const v = rs.filter((r) => /^versie /.test(r.tekst));
    expect(v.map((r) => r.tekst)).toEqual([`versie ${REVISIE.versie}`]);
  });

  it('de verplichte gegevens staan erop, geen CE-markering (prototype)', () => {
    const alles = rs.map((r) => r.tekst).join('\n');
    for (const t of ['Fabrikant:', 'Adres:', 'Serienummer:', 'Bouwjaar:', '230 V AC, 50 Hz, 0,6 A', '24 V DC, max. 2,6 A, 61 W', 'klasse I', '2,4 GHz', 'IP20', 'binnen, droog',
      'PROTOTYPE: niet met klanten gebruiken voor de vrijgave', 'Stekker eruit voor het openen van de box', 'Nooit zonder filter']) expect(alles, t).toContain(t);
    expect(alles).not.toMatch(/\bCE\b/);
    expect(Object.keys(SYMBOLEN).sort()).toEqual(['handleiding', 'weee']);
  });

  it('negatief: de regels van het oude label (70 x 35) vallen met dezelfde schatting buiten het label', () => {
    // letterlijk uit docs/typeplaatje.svg van versie 7.2 (advies Fable 5.2: drie regels rechts afgesneden)
    const oud: Regel[] = [
      { x: 3, y: 11.2, size: 2.4, anchor: 'start', vet: false, tekst: 'Fabrikant: ............................................ (naam en adres van de zaak)' },
      { x: 3, y: 22.6, size: 2.4, anchor: 'start', vet: false, tekst: 'Voeding: netadapter Mean Well GST90A24-P1M, 230 V AC, klasse I' },
      { x: 3, y: 30.6, size: 2.6, anchor: 'start', vet: true, tekst: 'PROTOTYPE: niet met klanten gebruiken voor de vrijgave' },
    ];
    for (const r of oud) expect(binnen(vak(r), 70, 35, LABEL.rand), r.tekst).toBe(false);
    // en een korte regel van dat label past wel: de schatting keurt niet alles af
    expect(binnen(vak({ x: 3, y: 15, size: 2.4, anchor: 'start', vet: false, tekst: 'Serienummer: ..........   Bouwjaar: 20..' }), 70, 35, LABEL.rand)).toBe(true);
  });
});
