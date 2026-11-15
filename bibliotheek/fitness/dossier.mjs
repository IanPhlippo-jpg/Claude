// Het dossier van één fitnesstoestel als HTML om af te drukken (of als PDF te bewaren): A4 met de prijs, de kostprijs,
// de werkwijze en de berekening, daarna alle bladen (overzicht, stuklijst, lassen, boringen, kabelschema, bekleding,
// bestellijst, montage en een A4 per stuk). Ook de lijsten als CSV. Gedeeld door de pagina en de test. Node en browser.
import { kostprijs, CAT } from './prijzen.mjs';
import { berekening } from './bereken.mjs';
import { alleBladen, stukBladen } from './tekeningen.mjs';
import { montageBladen } from './montage.mjs';
import { naamVan, versieTekst, esc } from './blad.mjs';
import { eur } from '../taatsdeuren/dossier.mjs';

export { eur };
const g = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');
const link = (b) => { const m = String(b).match(/https?:\/\/[^\s;)]+/); return m ? `${esc(String(b).replace(m[0], '').replace(/[:;]\s*$/, ''))} <a href="${esc(m[0])}">${esc(m[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>` : esc(b); };

/** A4: prijs, kostprijs, werkwijze, berekening */
export function a4(o, inst = {}) {
  const k = kostprijs(o, inst), B = berekening(o), d = o.def;
  return `<section class="a4">
<h1>${esc(naamVan(o))} <span>${esc(versieTekst(o))} · ${o.maten.B} x ${o.maten.D} x ${o.maten.H} mm · ${Math.round(o.massa)} kg</span></h1>
<p class="klein">${esc(d.uitleg)}</p>
<h2>Verkoopprijs</h2>
<table><tbody>
<tr><td>Verkoop excl. btw (kostprijs + ${k.marge} %)</td><td class="n">${eur(k.verkoop)}</td></tr>
<tr class="tot"><td>Verkoop incl. ${k.instellingen.btw} % btw</td><td class="n">${eur(k.incl)}</td></tr>
<tr><td>Markt incl. btw (${esc(k.markt.bron)})</td><td class="n">${eur(k.markt.band[0])} - ${eur(k.markt.band[1])}</td></tr>
</tbody></table>
${k.markt.melding ? `<p class="klein"><b>${esc(k.markt.melding)}</b></p>` : ''}
<h2>Kostprijs (excl. btw)</h2>
<table class="prijs"><thead><tr><th>Wat</th><th class="n">Bedrag</th><th>Bron</th></tr></thead><tbody>
${k.regels.map((r) => `<tr><td>${esc(r.wat)}</td><td class="n">${eur(r.bedrag)}</td><td class="bron">${link(r.bron)}</td></tr>`).join('')}
<tr class="sub"><td>Materiaal</td><td class="n">${eur(k.materiaal)}</td><td></td></tr>
<tr><td>Arbeid ${g(k.uren, 2)} u x ${eur(k.instellingen.uurloon)}</td><td class="n">${eur(k.arbeid)}</td><td class="bron">uren uit de werkwijze</td></tr>
<tr class="tot"><td>Kostprijs</td><td class="n">${eur(k.kostprijs)}</td><td></td></tr>
</tbody></table>
<h2>Werkwijze</h2>
<ol class="stappen">${k.stappen.map((s) => `<li><b>${esc(s.titel)}</b> <span class="uur">${g(s.uren, 2)} u${s.proces ? ` · ${esc(s.proces)}` : ''}</span><br>${esc(s.tekst)}</li>`).join('')}</ol>
<h2>Berekening: ${B.oordeel}</h2>
<table><thead><tr><th></th><th>Controle</th><th>Berekening</th><th class="n">Benut</th></tr></thead><tbody>
${B.controles.map((c) => `<tr><td><i class="d ${c.oordeel}"></i></td><td>${esc(`${c.groep}: ${c.wat}`)}</td><td class="bron">${esc(c.formule)}<br><small>${esc(c.bron)}</small>${c.uitleg ? `<br><small><b>${esc(c.uitleg)}</b></small>` : ''}</td><td class="n">${c.oordeel === 'info' || !c.benut ? '' : `${Math.round(c.benut * 100)} %`}</td></tr>`).join('')}
</tbody></table>
</section>`;
}
export const CSS = `
.a4 { font: 9.5pt/1.4 Arial, Helvetica, sans-serif; color: #15181b; page: a4 }
.a4 h1 { font-size: 16pt; margin: 0 0 1mm } .a4 h1 span { font-size: 10pt; font-weight: 400; color: #555; margin-left: 2mm }
.a4 h2 { font-size: 11.5pt; margin: 5mm 0 1.5mm; border-bottom: 0.3mm solid #15181b }
.a4 table { border-collapse: collapse; width: 100%; font-size: 8.5pt } .a4 th, .a4 td { border-bottom: 0.2mm solid #ccd; padding: 0.8mm 1.2mm; text-align: left; vertical-align: top } .a4 th { background: #eef0f2 }
.a4 .n { text-align: right; white-space: nowrap } .a4 .bron { font-size: 7.5pt; color: #555; word-break: break-word }
.a4 tr.sub td, .a4 tr.tot td { font-weight: 700 } .a4 tr.tot td { border-top: 0.4mm solid #15181b }
.a4 .klein { font-size: 8pt; color: #444 } .a4 .stappen { padding-left: 5mm; margin: 0 } .a4 .stappen li { margin-bottom: 1.6mm } .a4 .uur { color: #8a5a00; font-size: 8pt } .a4 a { color: inherit }
.a4 .d { display: inline-block; width: 3mm; height: 3mm; border-radius: 50% } .d.groen { background: #2e7d46 } .d.oranje { background: #c27c0e } .d.rood { background: #b3261e } .d.info { background: #999 }`;

/** het hele dossier als één HTML-bestand */
export function dossierHtml(o, inst = {}, meta = {}) {
  const bl = alleBladen(o, meta, inst), mb = montageBladen(o, meta), st = stukBladen(o, meta), a3 = (s) => /viewBox="0 0 420 297"/.test(s);
  const blad = (s) => `<div class="${a3(s) ? 'a3' : 'a4l'}">${s}</div>`;
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(naamVan(o))} (${o.versie})</title><style>@page a3{size:420mm 297mm;margin:0}@page a4{size:210mm 297mm;margin:14mm}@page a4l{size:297mm 210mm;margin:0}body{margin:0}.a3{page:a3;width:420mm;height:297mm;page-break-after:always}.a3 svg{width:420mm;height:297mm;display:block}.a4l{page:a4l;width:297mm;height:210mm;overflow:hidden;page-break-after:always}.a4l svg{width:297mm;height:210mm;display:block}${CSS}</style></head><body>${a4(o, inst)}${bl.map((b) => blad(b.svg)).join('')}${mb.map((b) => blad(b.svg)).join('')}${st.map((b) => blad(b.svg)).join('')}</body></html>`;
}

/** de lijsten als CSV (puntkomma, komma als decimaal) */
export function lijstenCsv(o, inst = {}) {
  const k = kostprijs(o, inst), sl = k.stuklijst;
  const rijen = [[`${naamVan(o)} (${o.versie})`], [], ['Stuklijst (ISO 7573)'], ['Pos', 'Aantal', 'Benaming', 'Materiaal', 'Afmeting', 'Lengte mm', 'Zaagsnede', 'kg/st', 'Opmerking'], ...sl.posities.map((p) => [p.pos, p.n, p.naam, p.mat, p.maat, p.L ?? '', p.zaagT ?? '', Math.round(p.kg * 100) / 100, p.opm ?? '']), [],
    ['Zaagplan (staven 6 m)'], ['Profiel', 'Staven', 'Nodig m', 'Stukken (pos:lengte)'], ...k.zaagplan.profielen.map((p) => [p.naam, p.n, Math.round(p.nodig * 100) / 100, p.staven.map((s) => s.stukken.map((x) => `${x.pos}:${x.l}`).join(' ')).join(' | ')]), [],
    ['Kooponderdelen'], ['Benaming', 'Artikel', 'Hoeveelheid', 'Eenheid', 'Winkel', 'Prijs excl. btw', 'Bedrag', 'Nagekeken', 'Bron'], ...k.koop.map((x) => [x.naam, x.artikel, Math.round(x.hoeveelheid * 1000) / 1000, x.eenheid, x.winkel, Math.round(x.prijs * 100) / 100, Math.round(x.bedrag * 100) / 100, x.nagekeken ? 'ja' : 'AANNAME', x.bron]), [],
    ['Bekleding'], ['Kussen', 'L', 'B', 'Dikte', 'Multiplex', 'Schuim', 'Leer snijmaat'], ...sl.bekleding.map((b) => [b.naam, b.L, b.B, b.dikte, `${b.mp.L}x${b.mp.B}x18`, `${b.schuim.L}x${b.schuim.B}x${b.schuim.t}`, `${b.leer.L}x${b.leer.B}`]), [],
    ['Lassen'], ['Stuk A', 'Stuk B', 'Keel', 'Lengte mm', 'Lasgroep'], ...o.lassen.map((l) => [`${l.A.posNr} ${l.A.naam}`, `${l.B.posNr} ${l.B.naam}`, `a${l.keel}`, l.lengte, l.groep]), [],
    ['Kostprijs'], ...k.regels.map((r) => [CAT[r.cat], r.wat, Math.round(r.bedrag * 100) / 100, r.bron]), ['', 'Arbeid', Math.round(k.arbeid * 100) / 100, `${Math.round(k.uren * 100) / 100} u`], ['', 'Kostprijs', Math.round(k.kostprijs * 100) / 100], ['', 'Verkoop excl. btw', Math.round(k.verkoop * 100) / 100], ['', 'Verkoop incl. btw', Math.round(k.incl * 100) / 100]];
  return '﻿' + rijen.map((r) => r.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c).replace(/^(-?\d+)\.(\d+)$/, '$1,$2'))).join(';')).join('\r\n');
}
