/**
 * De aansluitschema's van de voorbeelden volgen de Europese normen (voorbeelden/lib/eplan.mjs): elke productaanduiding
 * hoort bij een klasse van ISO/IEC 81346-2, elke kruisverwijzing /blad.kolom wijst naar een bestaand blad en een kolom
 * 0..9 (IEC 61082-1), elk blad heeft een titelblok met de velden van ISO 7200 en een documentsoort volgens IEC 61355.
 * Draai eerst de generators: node voorbeelden/<project>/schema/maak-schema.mjs
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
// @ts-expect-error: de tekenmodule is plain JavaScript
import { KLASSEN, controleerAanduiding } from '../../voorbeelden/lib/eplan.mjs';

const teksten = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

for (const project of ['afzuiging', 'treinverlichting', 'robotarm']) {
  const dir = `voorbeelden/${project}/schema`;
  const bladen = readdirSync(dir).filter((f) => /^blad-\d+\.svg$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5))).map((f) => readFileSync(`${dir}/${f}`, 'utf8'));
  describe(`aansluitschema ${project} volgens de normen`, () => {
    it('heeft een titelblad, een inhoudsopgave, schemabladen, klemmenplannen en een stuklijst (IEC 61355)', () => {
      const soorten = bladen.map((s) => teksten(s).find((t) => /^&E[A-Z]{2}\s/.test(t))?.slice(0, 4));
      expect(soorten[0]).toBe('&EAA');
      expect(soorten[1]).toBe('&EAB');
      expect(soorten).toContain('&EFS');
      expect(soorten).toContain('&EMA');
      expect(soorten[soorten.length - 1]).toBe('&EPC');
      // opstellingsplannen (&ELU) mogen er tussen staan
    });
    it('elke productaanduiding hoort bij een klasse van ISO/IEC 81346-2', () => {
      const fout: string[] = [];
      for (const s of bladen) {
        for (const t of teksten(s)) {
          for (const m of t.matchAll(/(?<![\w/-])-([A-Z]{1,3})(\d+)(?![\w])/g)) if (!controleerAanduiding(`-${m[1]}${m[2]}`)) fout.push(`${m[0]} in "${t}"`);
        }
      }
      expect(fout).toEqual([]);
      expect(Object.keys(KLASSEN)).not.toContain('A');
    });
    it('elke kruisverwijzing wijst naar een bestaand blad en een kolom 0..9 (IEC 61082-1)', () => {
      const fout: string[] = [];
      let n = 0;
      for (const s of bladen) {
        for (const t of teksten(s)) {
          for (const m of t.matchAll(/(?:^|\s)\/(\d+)\.(\d+)\b/g)) {
            n++;
            const b = +m[1], k = +m[2];
            if (b < 1 || b > bladen.length || k > 9) fout.push(m[0]);
          }
        }
      }
      expect(fout).toEqual([]);
      expect(n).toBeGreaterThan(10);
    });
    it('elk blad heeft het titelblok van ISO 7200 en kolommen 0..9', () => {
      bladen.forEach((s, i) => {
        const t = teksten(s);
        for (const veld of ['Eigenaar', 'Project', 'Tekeningnr.', 'Documentsoort', 'Datum', 'Getek.', 'Gecontr.', 'Wijz.', 'Blad']) expect(t, `blad ${i + 1}: ${veld}`).toContain(veld);
        expect(t, `blad ${i + 1}`).toContain(String(i + 1));
        expect(t).toContain(`${bladen.length} Bl.`);
        for (let k = 0; k <= 9; k++) expect(t).toContain(String(k));
        expect(s).not.toMatch(/stroke="#(?!000|111|fff)[0-9a-f]{3,6}"/i);
      });
    });
  });
}
