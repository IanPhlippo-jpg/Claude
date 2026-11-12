// Tekstcontrole over alle uitvoer van de afzuiging (eindverslag v3, V3-09 en V3-13): geen enkele tekst raadt nog
// uitkloppen of uitblazen aan, de onderhoudsstappen in de README zijn die van onderhoud.mjs (dezelfde als in het
// bouwschema), de prijzen in de README zijn die van de prijslijst, en oude maten of onderdelen komen niet meer voor.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error: JavaScript-module zonder typen
import { JAARLIJKS, NA_MORSEN, ONDERHOUD } from '../../voorbeelden/afzuiging/onderhoud.mjs';

const DIR = 'voorbeelden/afzuiging';
const lees = (p: string) => readFileSync(p, 'utf8');
const bestanden = [
  `${DIR}/README.md`, `${DIR}/docs/Vrijgave-en-meetplan.md`, `${DIR}/docs/Berekeningen.md`, `${DIR}/docs/Besparingen.md`, `${DIR}/docs/Materiaalstaat.md`, `${DIR}/docs/Risicoanalyse-en-CE.md`,
  'e2e/tools/bouwschema-afzuiging.mjs', `${DIR}/firmware/ui/schermen.html`, `${DIR}/firmware/src/knop/main.cpp`,
  `${DIR}/schema/schema.html`, 'src/qa/tekeningenAfzuiging.test.ts', `${DIR}/onderhoud.mjs`,
  ...readdirSync(`${DIR}/tekeningen`).filter((f) => f.endsWith('.svg')).map((f) => join(`${DIR}/tekeningen`, f)),
].filter((p) => existsSync(p));

describe('afzuiging, teksten', () => {
  it('niemand raadt uitkloppen of uitblazen aan (alleen "niet uitkloppen" mag)', () => {
    const fout: string[] = [];
    for (const p of bestanden) {
      lees(p).split(/\r?\n/).forEach((regel, i) => {
        const r = regel.toLowerCase();
        if (/klop\w* .{0,30}\buit\b|uitklop|uitblazen\b|uitblaas het filter|perslucht/.test(r) && !/\bniet\b|\bgeen\b|nooit|geschrapt/.test(r)) fout.push(`${p}:${i + 1}: ${regel.trim().slice(0, 120)}`);
      });
    }
    expect(fout).toEqual([]);
  });

  it('de onderhoudsstappen staan letterlijk in de README (dezelfde bron als het bouwschema)', () => {
    const readme = lees(`${DIR}/README.md`);
    for (const stap of [...ONDERHOUD, ...NA_MORSEN, ...JAARLIJKS] as string[]) expect(readme, stap).toContain(stap);
    expect(lees('e2e/tools/bouwschema-afzuiging.mjs')).toContain('tekst: ONDERHOUD');
  });

  it('de README-prijzen zijn die van de prijslijst', () => {
    const csv = lees(`${DIR}/tekeningen/prijslijst.csv`);
    const eind = csv.split(/\r?\n/).find((r) => r.startsWith('Eindtotaal'))!.split(';').pop()!.trim();
    expect(lees(`${DIR}/README.md`)).toContain(`**€ ${eind}**`);
  });

  it('geen oude maten of onderdelen meer', () => {
    const fout: string[] = [];
    const oud = [/210 x 210 x 99/, /M5-(fijnstof)?mat/i, /170 x 190/, /141 cm²/, /€ 495,48/, /klauwen-4x-RVS/, /M2 x 5 onder de palen/,
      /KCD1/, /TR5/, /kan tegen aceton/i, /tot ongeveer 75 °C/,
      // versie 7.1 (verslag v4): halve slag, schroeven i.p.v. pluggen, RVS 430, nieuwe vervangfactoren, open fractie 0,30
      /één volle slag/, /holle deur/i, /M4 x 30/, /RVS 304/, /1,19 x/, /1,08 x/, /f = 0,35/, /contact \+ 1 slag/,
      // versie 7.2 (advies Fable 5.2): geen bodemplaat-schroeven meer, 75 % is beschermend, ander merk filter, klasse I
      /M3 x 16/, /minstens 80 %/, /filter niet nieuw/, /dubbel geïsoleerd, met aarding/, /0,25 mm² en 0,75 mm²/];
    for (const p of bestanden) {
      lees(p).split(/\r?\n/).forEach((regel, i) => { for (const o of oud) if (o.test(regel)) fout.push(`${p}:${i + 1}: ${o}`); });
    }
    expect(fout).toEqual([]);
  });
});
