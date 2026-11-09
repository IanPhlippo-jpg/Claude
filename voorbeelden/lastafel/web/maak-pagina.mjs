// De webpagina (artifact) met alles van de lastafel op de heftafel: foto's, specificaties, bouwplan, materiaallijsten,
// bestellijst, berekeningen, tekeningen, schema's en downloads. Alles komt uit de bestanden van het project
// (materiaal.json, Bouwplan.md, Berekeningen.md, README.md, tekeningen/, schema/), zodat de pagina klopt met het model.
// Gebruik: node voorbeelden/lastafel/web/maak-pagina.mjs  ->  voorbeelden/lastafel/web/index.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M, stand, STANDEN } from '../maak-lastafel.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const P = join(HERE, '..');
const lees = (f) => readFileSync(join(P, f), 'utf8').replace(/\r\n/g, '\n');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, a, h) => (/^https?:/.test(h) ? `<a href="${h}" target="_blank" rel="noopener">${a}</a>` : a));
const getal = (x) => (typeof x === 'number' ? String(x).replace('.', ',') : String(x));
const mat = JSON.parse(lees('docs/materiaal.json'));

// ---------------------------------------------------------------- bouwplan uit Bouwplan.md
function bouwplan() {
  const md = lees('docs/Bouwplan.md');
  const [kop, ...secties] = md.split(/\n## /);
  const intro = kop.split('\n\n').slice(1).map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('');
  const blokken = secties.map((s) => {
    const regels = s.split('\n'), titel = regels.shift();
    const m = /^(\d+)\. (.+?)(?: \((.+)\))?$/.exec(titel);
    let beeld = '', items = [], para = [], lijst = null;
    for (const r of regels) {
      const im = /^!\[([^\]]*)\]\(\.\.\/beelden\/([^)]+)\.png\)/.exec(r);
      if (im) { beeld = `<figure class="stapbeeld"><img src="img/${im[2]}.jpg" alt="${esc(im[1])}" loading="lazy" data-groot><figcaption>${esc(im[1])}</figcaption></figure>`; continue; }
      const it = /^(\d+)\. (.*)$/.exec(r), sub = /^\s{2,}- (.*)$/.exec(r), bul = /^- (.*)$/.exec(r);
      if (it) { lijst = 'ol'; items.push({ t: it[2], sub: [] }); }
      else if (sub && items.length) items[items.length - 1].sub.push(sub[1]);
      else if (bul) { lijst = 'ul'; items.push({ t: bul[1], sub: [] }); }
      else if (/^\s+\S/.test(r) && items.length) { const x = items[items.length - 1]; if (x.sub.length) x.sub[x.sub.length - 1] += ' ' + r.trim(); else x.t += ' ' + r.trim(); }
      else if (r.trim()) para.push(r.trim());
    }
    const id = m ? `stap-${m[1]}` : 'gereedschap';
    const body = `${para.length ? `<p>${inline(para.join(' '))}</p>` : ''}${items.length ? `<${lijst} class="taken">${items.map((x, k) => `<li><label><input type="checkbox" id="${id}-${k}" data-vink><span>${inline(x.t)}${x.sub.length ? `<ul>${x.sub.map((y) => `<li>${inline(y)}</li>`).join('')}</ul>` : ''}</span></label></li>`).join('')}</${lijst}>` : ''}`;
    if (!m) return `<section class="stap stap-vooraf" id="${id}"><div class="stapkop"><h3>${esc(titel)}</h3></div><div class="stapinhoud">${body}</div></section>`;
    return `<section class="stap" id="${id}"><div class="stapkop"><span class="stapnr">${m[1]}</span><h3>${esc(m[2])}</h3>${m[3] ? `<span class="dag">${esc(m[3])}</span>` : ''}</div><div class="stapinhoud${beeld ? ' met-beeld' : ''}"><div>${body}</div>${beeld}</div></section>`;
  });
  return { intro, blokken: blokken.join('\n') };
}

// ---------------------------------------------------------------- tabellen
function tabel(id, kop, rijen, num = []) {
  return `<div class="tabelvak"><table id="${id}"><thead><tr>${kop.map((k, i) => `<th${num.includes(i) ? ' class="n"' : ''}>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rijen.map((r) => `<tr>${r.map((c, i) => `<td${num.includes(i) ? ' class="n"' : ''}>${esc(getal(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const LIJSTEN = [
  { id: 'bestellen', naam: 'Bestellen', uitleg: 'Staven van 6 m, zo verdeeld dat er zo weinig mogelijk overblijft (zaagsnede 3 mm). Plaat netto, bestel ± 15 % extra voor het nesten.', html: () => tabel('t-staven', ['Profiel', 'Stuks', 'Totaal mm', 'Staven 6 m', 'kg/m', 'kg'], mat.staven.map((s) => [s.prof, s.stukken, s.totaal, s.staven, s.kgm, s.kg]), [1, 2, 3, 4, 5]) + tabel('t-platen', ['Materiaal', 'Dikte mm', 'm²', 'kg', 'Posities'], mat.platen.map((p) => [p.mat, p.t, p.m2, p.kg, p.posities]), [1, 2, 3]),
    csv: () => [['Profiel', 'Stuks', 'Totaal mm', 'Staven 6 m', 'kg/m', 'kg'], ...mat.staven.map((s) => [s.prof, s.stukken, s.totaal, s.staven, s.kgm, s.kg]), [], ['Materiaal', 'Dikte mm', 'm2', 'kg', 'Posities'], ...mat.platen.map((p) => [p.mat, p.t, p.m2, p.kg, p.posities])] },
  { id: 'zaaglijst', naam: 'Zaaglijst', uitleg: 'Profielen, op lengte gezaagd. Zet op elk stuk het positienummer.', kop: ['Groep', 'Positie', 'Profiel', 'Lengte mm', 'Aantal', 'kg', 'Bewerking'], rijen: () => mat.zaag.map((z) => [z.groep, z.pos, z.prof, z.l, z.n, z.kg, z.bew]), num: [3, 4, 5] },
  { id: 'plaatlijst', naam: 'Plaatlijst', uitleg: 'Lasersnijden. Gaten boven Ø20 1 mm kleiner snijden en na het lassen ruimen.', kop: ['Groep', 'Positie', 'Materiaal', 'Dikte', 'Breed', 'Lang', 'Aantal', 'kg', 'Opmerking'], rijen: () => mat.plaat.map((p) => [p.groep, p.pos, p.mat, p.t, p.b, p.l, p.n, p.kg, p.opm]), num: [3, 4, 5, 6, 7] },
  { id: 'normdelen', naam: 'Normdelen', uitleg: 'Pennen, lagers, rollen, bouten en smeernippels.', kop: ['Groep', 'Omschrijving', 'Norm / type', 'Aantal'], rijen: () => mat.norm.map((n) => [n.groep, n.oms, n.type, n.n]), num: [3] },
  { id: 'kooponderdelen', naam: 'Kooponderdelen', uitleg: 'Hydrauliek en elektro. De aanduidingen (-Q1, -K1 …) verwijzen naar de schemaset.', kop: ['Groep', 'Omschrijving', 'Type', 'Aantal'], rijen: () => mat.koop.map((n) => [n.groep, n.oms, n.type, n.n]), num: [3] },
  { id: 'verbruik', naam: 'Verbruik', uitleg: 'Wat er tijdens de bouw opgaat.', kop: ['Wat', 'Hoeveel'], rijen: () => mat.verbruik.map((v) => [v.oms, v.n]) },
];
for (const l of LIJSTEN) if (!l.html) { l.html = () => tabel(`t-${l.id}`, l.kop, l.rijen(), l.num); l.csv = () => [l.kop, ...l.rijen()]; }
const csv = (rijen) => '﻿' + rijen.map((r) => r.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : getal(c))).join(';')).join('\r\n') + '\r\n';

// ---------------------------------------------------------------- bestellijst en kosten uit README
function kosten() {
  const md = lees('README.md'), deel = md.split('## Bestellijst')[1].split('\n## ')[0];
  const rijen = deel.split('\n').filter((r) => /^\|/.test(r) && !/^\|\s*-/.test(r) && !/^\| Groep/.test(r)).map((r) => r.slice(1, -1).split('|').map((c) => c.trim()));
  let groep = '';
  return `<div class="tabelvak"><table><thead><tr><th>Groep</th><th>Wat</th><th class="n">Prijs excl. btw</th><th>Bron</th></tr></thead><tbody>${rijen.map(([g, w, p, b]) => {
    if (g) groep = g.replace(/\*/g, '');
    const totaal = /Totaal/.test(g);
    return `<tr${totaal ? ' class="totaal"' : ''}><td>${g ? esc(groep) : ''}</td><td>${inline(w)}</td><td class="n">${inline(p)}</td><td>${inline(b)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

// ---------------------------------------------------------------- berekeningen: druk over de hoogte (grafiek op schaal)
function drukgrafiek() {
  const md = lees('docs/Berekeningen.md');
  const rijen = md.split('\n').filter((r) => /^\| [\d ]+ \| [\d,]+° \|/.test(r)).map((r) => r.slice(1, -1).split('|').map((c) => parseFloat(c.trim().replace(/\s/g, '').replace(',', '.'))));
  const W = 640, H = 300, L = 56, R = 20, T = 18, B = 44;
  const x = (h) => L + ((h - 300) / (1500 - 300)) * (W - L - R), y = (p) => H - B - (p / 160) * (H - T - B);
  const lijn = rijen.map((r, i) => `${i ? 'L' : 'M'}${x(r[0]).toFixed(1)} ${y(r[5]).toFixed(1)}`).join(' ');
  const vlak = `${lijn} L${x(rijen[rijen.length - 1][0]).toFixed(1)} ${y(0)} L${x(rijen[0][0]).toFixed(1)} ${y(0)} Z`;
  const gx = [300, 500, 700, 900, 1100, 1300, 1500], gy = [0, 40, 80, 120, 160];
  const max = rijen[0];
  return `<svg class="grafiek" viewBox="0 0 ${W} ${H}" role="img" aria-label="Druk in de cilinders van ${max[5]} bar in de laagste stand tot ${rijen[rijen.length - 1][5]} bar in de hoogste">
  ${gy.map((p) => `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" class="raster"/><text x="${L - 8}" y="${y(p) + 4}" text-anchor="end" class="as">${p}</text>`).join('')}
  ${gx.map((h) => `<text x="${x(h)}" y="${H - B + 18}" text-anchor="middle" class="as">${h}</text>`).join('')}
  <line x1="${L}" x2="${W - R}" y1="${y(140)}" y2="${y(140)}" class="grens"/><text x="${W - R}" y="${y(140) - 6}" text-anchor="end" class="as grenslabel">overdrukventiel 140 bar</text>
  <path d="${vlak}" class="vlak"/><path d="${lijn}" class="lijn"/>
  ${rijen.map((r) => `<circle cx="${x(r[0]).toFixed(1)}" cy="${y(r[5]).toFixed(1)}" r="3" class="punt"/>`).join('')}
  <circle cx="${x(max[0])}" cy="${y(max[5])}" r="5.5" class="piek"/><text x="${x(max[0]) + 10}" y="${y(max[5]) - 8}" class="as sterk">${max[5]} bar bij ${max[0]} mm</text>
  <text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" class="as">bovenkant lift (mm)</text>
  <text x="14" y="${(T + H - B) / 2}" text-anchor="middle" class="as" transform="rotate(-90 14 ${(T + H - B) / 2})">druk (bar)</text>
</svg>`;
}

// ---------------------------------------------------------------- de pagina
const S0 = stand(STANDEN.laag), S1 = stand(STANDEN.hoog);
const tek = readdirSync(join(P, 'tekeningen')).filter((f) => f.endsWith('.svg')).sort();
const TEKNAAM = { '00': 'Overzicht en hoofdmaten', '01': 'Lastafel: gatenplan', '02': 'Armpaar A (buiten)', '03': 'Armpaar B (binnen)', '04': 'Bovenframe', '05': 'Onderframe', '06': 'Valbeveiliging: kap', '07': 'Cilinderbok', '08': 'Opvanglade' };
const SCHEMA = ['Titelblad', 'Inhoudsopgave', 'Voeding 230 V', 'Besturing 24 V DC', 'Hydrauliek (ISO 1219-1)', 'Klemmenplan -X1', 'Stuklijst'];
const FOTO = [['tafel-zij', 'De lastafel op de heftafel, bovenkant lift 825 mm'], ['lift-zij', 'De heftafel zonder tafel: schaar, opvanglade en 6 steunvlakken'], ['valbeveiliging', 'Valbeveiliging: gele kap met zaagtand en de pal op de cilinder'], ['steunvlak', 'Gefreesd steunvlak met boring M16'], ['badge', 'Zijwand met drie rijen gaten Ø28 en de badge'], ['laag', 'Laagste stand: werkhoogte 570 mm'], ['hoog', 'Hoogste stand: werkhoogte 1625 mm'], ['onderframe', 'Onderframe met aggregaat, rollen en aanslagpennen'], ['tafel-iso', 'Isometrie met het voetpedaal']];
const bp = bouwplan();
const SPECS = [['Werkhoogte', '570 – 1625', 'mm'], ['Last', '4000', 'kg incl. blad'], ['Blad', '2400 × 1200', 'mm, Ø28 DG'], ['Gaten', '541 + 212', 'blad + wanden'], ['Hoogste druk', '119', 'bar'], ['Aansluiting', '230 V', '2,2 kW, 16 A']];
const mallen = JSON.parse(lees('mallen/overzicht.json')), malbladen = (fmt) => readdirSync(join(P, 'mallen')).filter((f) => new RegExp(`^MAL-${fmt}-\\d+\\.svg$`).test(f)).sort();
const DOWNLOADS = [['pdf/Mallen-lastafel-A3-1op1.pdf', 'Mallen 1:1 op A3', `${malbladen('A3').length} bladen A3, de armwang volledig: op 100 % afdrukken`], ['pdf/Mallen-lastafel-A4-1op1.pdf', 'Mallen 1:1 op A4', `${malbladen('A4').length} bladen A4, armwang met kop- en middenmal: op 100 % afdrukken`], ['pdf/Lastafel-alles-afdrukken.pdf', 'Alles in één PDF', 'README, foto\'s, bouwplan, materiaallijsten, tekeningen, schema\'s, berekeningen en eisen'], ['pdf/Werktekeningen-lastafel.pdf', 'Werktekeningen', '9 bladen A3: overzicht, gatenplan, lasdelen'], ['pdf/Schemaset-heftafel.pdf', 'Schemaset', '7 bladen A3 zoals EPLAN']];

const html = `<title>Lastafel op heftafel</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* Werkplaatsdossier: een titelblok zoals op een tekening, staalgrijs papier, signaalgeel alleen voor wat je moet zien */
:root {
  --bg: #e9edef; --vlak: #ffffff; --vlak2: #f4f6f7; --inkt: #161a1e; --zacht: #56616b; --lijn: #c6ced4; --lijn2: #dde3e7;
  --geel: #c98a10; --geel-vlak: #f6e3b3; --geel-inkt: #3a2a05; --zwart: #1d2125; --op-zwart: #f2f4f5;
  --kop: "Barlow Condensed", "Arial Narrow", Arial, sans-serif; --tekst: "Source Sans 3", "Segoe UI", Arial, sans-serif; --mono: "JetBrains Mono", Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #111417; --vlak: #1a1f23; --vlak2: #20262b; --inkt: #e8ecee; --zacht: #9ba6af; --lijn: #333c43; --lijn2: #283036;
  --geel: #e6a930; --geel-vlak: #3a2e14; --geel-inkt: #f6e3b3; --zwart: #0b0d0f; --op-zwart: #e8ecee; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #111417; --vlak: #1a1f23; --vlak2: #20262b; --inkt: #e8ecee; --zacht: #9ba6af; --lijn: #333c43; --lijn2: #283036;
  --geel: #e6a930; --geel-vlak: #3a2e14; --geel-inkt: #f6e3b3; --zwart: #0b0d0f; --op-zwart: #e8ecee; color-scheme: dark }
* { box-sizing: border-box }
body { background: var(--bg); color: var(--inkt); font: 16px/1.55 var(--tekst); }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--zwart) }
.wrap { max-width: 1180px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)) }
h1, h2, h3 { font-family: var(--kop); font-weight: 700; letter-spacing: .01em; line-height: 1.1; text-wrap: balance; margin: 0 }
h2 { font-size: clamp(30px, 4vw, 40px) } h3 { font-size: 22px; font-weight: 600 }
a { color: inherit; text-decoration-color: var(--geel); text-underline-offset: 3px }
code { font-family: var(--mono); font-size: .86em; background: var(--vlak2); padding: 0 .3em; border-radius: 3px }
:focus-visible { outline: 3px solid var(--geel); outline-offset: 2px }
/* titelblok */
.titelblok { background: var(--zwart); color: var(--op-zwart) }
.titelblok .wrap { display: grid; grid-template-columns: 1fr auto; gap: 8px 24px; padding-block: 22px 18px; align-items: end }
.titelblok h1 { font-size: clamp(34px, 6vw, 62px); text-transform: uppercase; letter-spacing: .02em }
.titelblok p { margin: 6px 0 0; color: #b9c2c9; max-width: 62ch }
.velden { display: grid; grid-template-columns: repeat(3, auto); border: 1px solid #47515a; font-family: var(--mono); font-size: 12px }
.velden div { padding: 4px 10px; border-left: 1px solid #47515a } .velden div:first-child { border-left: 0 }
.velden span { display: block; color: #8d98a1; font-size: 10px; text-transform: uppercase; letter-spacing: .08em }
.velden b { color: #f4c55a; font-weight: 600 }
/* navigatie */
nav.menu { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 9; background: var(--vlak); border-bottom: 1px solid var(--lijn) }
nav.menu .wrap { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none }
nav.menu a { font-family: var(--kop); font-weight: 600; font-size: 17px; text-transform: uppercase; letter-spacing: .04em; text-decoration: none; color: var(--zacht); padding: 12px 12px 10px; white-space: nowrap; border-bottom: 3px solid transparent }
nav.menu a:hover { color: var(--inkt) } nav.menu a.actief { color: var(--inkt); border-bottom-color: var(--geel) }
section.blok { padding-block: 44px 8px; scroll-margin-top: 56px }
.blokkop { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; border-bottom: 2px solid var(--inkt); padding-bottom: 8px; margin-bottom: 20px }
.blokkop .ref { font-family: var(--mono); font-size: 12px; color: var(--zacht) }
.lead { max-width: 68ch; color: var(--zacht); margin: 0 0 20px }
/* hero */
.hero { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 24px; padding-top: 28px; align-items: start }
.hero figure { margin: 0; background: var(--vlak); border: 1px solid var(--lijn) }
.hero img { display: block; width: 100%; height: auto; cursor: zoom-in }
.specs { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--lijn); background: var(--vlak) }
.spec { padding: 12px 14px; border-top: 1px solid var(--lijn2); border-left: 1px solid var(--lijn2) }
.spec:nth-child(-n+2) { border-top: 0 } .spec:nth-child(odd) { border-left: 0 }
.spec span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: var(--zacht) }
.spec b { font-family: var(--kop); font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.15 }
.spec i { font-style: normal; color: var(--zacht); font-size: 13px; margin-left: 4px }
.notitie { margin-top: 14px; padding: 12px 14px; background: var(--geel-vlak); color: var(--geel-inkt); font-size: 15px }
.notitie b { font-weight: 700 }
/* foto's */
.fotos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px }
.fotos figure, .stapbeeld { margin: 0; background: var(--vlak); border: 1px solid var(--lijn) }
.fotos img, .stapbeeld img { display: block; width: 100%; height: auto; aspect-ratio: 1650 / 878; object-fit: cover; cursor: zoom-in }
figcaption { font-size: 13.5px; color: var(--zacht); padding: 8px 10px }
/* bouwplan */
.voortgang { display: flex; align-items: center; gap: 12px; margin: 0 0 18px; font-size: 14px; color: var(--zacht) }
.balk { flex: 1; max-width: 360px; height: 8px; background: var(--lijn2) } .balk div { height: 100%; width: 0; background: var(--geel) }
.stap { border-top: 1px solid var(--lijn); padding-block: 18px }
.stapkop { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 8px }
.stapnr { font-family: var(--kop); font-weight: 700; font-size: 34px; line-height: 1; color: var(--geel); min-width: 1.4em; font-variant-numeric: tabular-nums }
.dag { font-family: var(--mono); font-size: 12px; color: var(--zacht); border: 1px solid var(--lijn); padding: 1px 7px }
.stapinhoud { padding-left: calc(1.4em * 34 / 16 + 14px) } .stap-vooraf .stapinhoud { padding-left: 0 }
.stapinhoud.met-beeld { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 22px; align-items: start }
.stapinhoud p { margin: 0 0 10px; max-width: 68ch }
.taken { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; max-width: 70ch }
.taken > li label { display: grid; grid-template-columns: 22px 1fr; gap: 8px; cursor: pointer }
.taken input { width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--geel) }
.taken input:checked + span { color: var(--zacht); text-decoration: line-through; text-decoration-color: var(--lijn) }
.taken ul { margin: 4px 0 0; padding-left: 18px; color: var(--zacht) }
/* tabellen */
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px }
.tabs button { font: 600 15px var(--tekst); padding: 7px 14px; border: 1px solid var(--lijn); background: var(--vlak); color: var(--inkt); cursor: pointer }
.tabs button[aria-selected="true"] { background: var(--inkt); color: var(--bg); border-color: var(--inkt) }
.lijstkop { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px }
.lijstkop p { margin: 0; color: var(--zacht); max-width: 70ch }
.knop { font: 600 14px var(--tekst); padding: 7px 14px; border: 1px solid var(--inkt); background: transparent; color: var(--inkt); cursor: pointer; white-space: nowrap }
.knop:hover { background: var(--inkt); color: var(--bg) }
.knop.geel { background: var(--geel); border-color: var(--geel); color: #1b1404 } .knop.geel:hover { filter: brightness(1.08); background: var(--geel); color: #1b1404 }
.tabelvak { overflow-x: auto; border: 1px solid var(--lijn); background: var(--vlak); margin-bottom: 18px }
table { border-collapse: collapse; width: 100%; font-size: 14.5px }
th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--zacht); background: var(--vlak2); padding: 8px 10px; border-bottom: 1px solid var(--lijn); white-space: nowrap }
td { padding: 7px 10px; border-bottom: 1px solid var(--lijn2); vertical-align: top }
tr:last-child td { border-bottom: 0 }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 13px; white-space: nowrap }
tr.totaal td { font-weight: 700; border-top: 2px solid var(--inkt) }
.gewicht { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px }
.gewicht div { border: 1px solid var(--lijn); background: var(--vlak); padding: 8px 14px }
.gewicht span { font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: var(--zacht); display: block }
.gewicht b { font-family: var(--kop); font-size: 26px; font-variant-numeric: tabular-nums }
/* berekeningen */
.reken { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 24px; align-items: start }
.grafiekvak { background: var(--vlak); border: 1px solid var(--lijn); padding: 12px }
.grafiek { width: 100%; height: auto; display: block }
.grafiek .raster { stroke: var(--lijn2); stroke-width: 1 } .grafiek .as { fill: var(--zacht); font: 12px var(--mono) } .grafiek .sterk { fill: var(--inkt); font-weight: 600 }
.grafiek .grens { stroke: var(--zacht); stroke-dasharray: 5 4; stroke-width: 1.2 } .grafiek .grenslabel { fill: var(--zacht) }
.grafiek .lijn { fill: none; stroke: var(--geel); stroke-width: 2.6 } .grafiek .vlak { fill: var(--geel); opacity: .14 }
.grafiek .punt { fill: var(--vlak); stroke: var(--geel); stroke-width: 2 } .grafiek .piek { fill: var(--geel) }
.feiten { margin: 0; padding: 0; list-style: none; border: 1px solid var(--lijn); background: var(--vlak) }
.feiten li { padding: 10px 14px; border-top: 1px solid var(--lijn2); display: grid; grid-template-columns: 1fr auto; gap: 12px }
.feiten li:first-child { border-top: 0 } .feiten span { color: var(--zacht) } .feiten b { font-family: var(--mono); font-size: 14px; text-align: right; font-weight: 600 }
/* tekeningen */
.bladen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px }
.blad { margin: 0; background: #fff; border: 1px solid var(--lijn); cursor: zoom-in }
.blad img { display: block; width: 100%; height: auto; aspect-ratio: 420 / 297 }
.blad figcaption { background: var(--vlak); border-top: 1px solid var(--lijn); color: var(--inkt); display: flex; gap: 10px }
.blad figcaption code { background: none; padding: 0; color: var(--zacht) }
/* downloads */
.downloads { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px }
.dl { border: 1px solid var(--lijn); background: var(--vlak); padding: 16px; display: grid; gap: 8px; align-content: start }
.dl h3 { font-size: 22px } .dl p { margin: 0; color: var(--zacht); font-size: 14.5px }
.status { min-height: 1.4em; font-size: 14px; color: var(--zacht) }
.bronnen { columns: 2; column-gap: 32px; padding-left: 18px; font-size: 14.5px } .bronnen li { margin-bottom: 4px; break-inside: avoid }
footer { margin-top: 48px; background: var(--zwart); color: #a9b3bb; font-size: 13.5px } footer .wrap { padding-block: 18px }
/* vergroting */
dialog.groot { width: min(1400px, 96vw); max-height: 94vh; padding: 0; border: 0; background: var(--vlak); color: var(--inkt) }
dialog.groot::backdrop { background: rgb(8 10 12 / .82) }
dialog.groot img { display: block; width: 100%; height: auto; max-height: calc(94vh - 52px); object-fit: contain; background: #fff }
dialog.groot .balkje { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; font-size: 14px }
@media (max-width: 900px) {
  .hero, .reken, .stapinhoud.met-beeld { grid-template-columns: 1fr }
  .fotos, .bladen, .downloads { grid-template-columns: 1fr 1fr }
  .stapinhoud { padding-left: 0 }
  .bronnen { columns: 1 }
}
@media (max-width: 560px) {
  .fotos, .bladen, .downloads { grid-template-columns: 1fr }
  .titelblok .wrap { grid-template-columns: 1fr }
  .velden { justify-self: start }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }
html { scroll-behavior: smooth }
</style>

<header class="titelblok"><div class="wrap">
  <div><h1>Lastafel op heftafel</h1><p>3D-lastafel Ø28 van 2400 × 1200 mm op een elektrohydraulische schaarheftafel van 4 ton, nagemaakt van de DCT-video. Alles om hem te bouwen: bouwplan, materiaallijsten, tekeningen, schema's en berekeningen.</p></div>
  <div class="velden" aria-label="Titelblok"><div><span>Tekening</span><b>LFT-00 … 08</b></div><div><span>Rev.</span>1</div><div><span>Uitgifte</span>2026-11-09</div></div>
</div></header>
<nav class="menu" aria-label="Hoofdstukken"><div class="wrap">
  ${[['overzicht', 'Overzicht'], ['fotos', "Foto's"], ['bouwplan', 'Bouwplan'], ['materiaal', 'Materiaal'], ['kosten', 'Kosten'], ['berekeningen', 'Berekeningen'], ['tekeningen', 'Tekeningen'], ['mallen', 'Mallen'], ['schemas', "Schema's"], ['bestanden', 'Bestanden']].map(([id, n]) => `<a href="#${id}">${n}</a>`).join('')}
</div></nav>

<main class="wrap">
<section class="blok" id="overzicht" style="padding-top:0">
  <div class="hero">
    <figure><img src="img/tafel-zij.jpg" alt="De lastafel op de heftafel in de middelste stand" data-groot><figcaption>Bovenkant lift 825 mm, werkhoogte 1025 mm. Gele kappen: de valbeveiliging van de cilinders.</figcaption></figure>
    <div>
      <div class="specs">${SPECS.map(([k, v, e]) => `<div class="spec"><span>${k}</span><b>${v}</b><i>${e}</i></div>`).join('')}</div>
      <div class="notitie"><b>Anders dan DCT:</b> een eigen badge in plaats van hun logo, en de cilinders hangen ${M.cil.n} mm boven de schaararm. Zo blijft de druk in de laagste stand op 119 bar in plaats van meer dan 500 bar.</div>
      <div class="notitie" style="margin-top:10px"><b>Kopen of bouwen:</b> zelf bouwen ± € 11 100. Kant-en-klaar bij DCT: € 3 980 (heftafel) + € 4 340 (tafel).</div>
    </div>
  </div>
</section>

<section class="blok" id="fotos">
  <div class="blokkop"><h2>Foto's uit het model</h2><span class="ref">Phlippo CAD · 3 standen</span></div>
  <div class="fotos">${FOTO.map(([f, t]) => `<figure><img src="img/${f}.jpg" alt="${esc(t)}" loading="lazy" data-groot><figcaption>${esc(t)}</figcaption></figure>`).join('')}</div>
</section>

<section class="blok" id="bouwplan">
  <div class="blokkop"><h2>Bouwplan</h2><span class="ref">12 stappen · ± 9 werkdagen met 2 personen</span></div>
  <div class="lead">${bp.intro}</div>
  <div class="voortgang"><span id="vinktelling">0 van 0 taken afgevinkt</span><div class="balk"><div id="vinkbalk"></div></div><button class="knop" type="button" id="wisvinken">Alles leegmaken</button></div>
  ${bp.blokken}
</section>

<section class="blok" id="materiaal">
  <div class="blokkop"><h2>Materiaallijsten</h2><span class="ref">uit de maten van het model</span></div>
  <div class="gewicht"><div><span>Staal lift</span><b>${getal(mat.gewicht.lift)} kg</b></div><div><span>Staal tafel</span><b>${getal(mat.gewicht.tafel)} kg</b></div><div><span>Samen</span><b>${getal(mat.gewicht.totaal)} kg</b></div><div><span>Aggregaat en cilinders</span><b>± 120 kg</b></div></div>
  <div class="tabs" role="tablist">${LIJSTEN.map((l, i) => `<button type="button" role="tab" id="tab-${l.id}" aria-controls="lijst-${l.id}" aria-selected="${i === 0}">${l.naam}</button>`).join('')}</div>
  ${LIJSTEN.map((l, i) => `<div class="lijst" role="tabpanel" id="lijst-${l.id}" aria-labelledby="tab-${l.id}"${i ? ' hidden' : ''}><div class="lijstkop"><p>${esc(l.uitleg)}</p><button class="knop" type="button" data-csv="${l.id}">Download als CSV</button></div>${l.html()}</div>`).join('\n')}
  <p class="status" id="csvstatus" aria-live="polite"></p>
</section>

<section class="blok" id="kosten">
  <div class="blokkop"><h2>Bestellijst en kosten</h2><span class="ref">indicatief, excl. btw</span></div>
  <p class="lead">"Schatting" betekent dat ik geen prijs vond; vraag daarvoor een offerte. De tafel kopen is waarschijnlijk goedkoper dan hem zelf laten maken: nitreren en 750 gaten in S690QL is specialistenwerk.</p>
  ${kosten()}
</section>

<section class="blok" id="berekeningen">
  <div class="blokkop"><h2>Berekeningen</h2><span class="ref">docs/Berekeningen.md</span></div>
  <div class="reken">
    <div class="grafiekvak">${drukgrafiek()}<figcaption>Druk per cilinder Ø${M.cil.boring} bij 4000 kg met het blad, plus ± 340 kg eigen gewicht. De druk is het hoogst in de laagste stand, waar de schaar het minst hefboom heeft.</figcaption></div>
    <ul class="feiten">
      <li><span>Armhoek laag tot hoog</span><b>${getal(Math.round(S0.th * 1800 / Math.PI) / 10)}° – ${getal(Math.round(S1.th * 1800 / Math.PI) / 10)}°</b></li>
      <li><span>Cilinder oog-oog</span><b>${Math.round(S0.d)} – ${Math.round(S1.d)} mm</b></li>
      <li><span>Cilinders, slag</span><b>2 × Ø100/56, 360</b></li>
      <li><span>Hoogste druk / overdruk</span><b>119 / 140 bar</b></li>
      <li><span>Knikveiligheid stang</span><b>17,3</b></li>
      <li><span>Omhoog / omlaag (vol)</span><b>± 46 s / ± 36 s</b></li>
      <li><span>Valbeveiliging, laagste veiligheid</span><b>τ 86 ≤ 137 MPa</b></li>
      <li><span>Massa tafel / nuttige last</span><b>± 723 / ± 3280 kg</b></li>
    </ul>
  </div>
</section>

<section class="blok" id="tekeningen">
  <div class="blokkop"><h2>Tekeningen</h2><span class="ref">A3 liggend · ISO 5457, 7200, 128, 5456-2</span></div>
  <div class="bladen">${tek.map((f) => { const nr = f.slice(4, 6); return `<figure class="blad" tabindex="0" data-src="tek/${f}" data-titel="${esc(`LFT-${nr} ${TEKNAAM[nr] ?? ''}`)}"><img src="tek/${f}" alt="Tekening LFT-${nr}: ${esc(TEKNAAM[nr] ?? '')}" loading="lazy"><figcaption><code>LFT-${nr}</code>${esc(TEKNAAM[nr] ?? '')}</figcaption></figure>`; }).join('')}</div>
</section>

<section class="blok" id="mallen">
  <div class="blokkop"><h2>Mallen op ware grootte</h2><span class="ref">schaal 1:1 · A3 (${malbladen('A3').length} bladen) of A4 (${malbladen('A4').length} bladen)</span></div>
  <p class="lead">Voor alle niet-rechte delen en alle ogen met een asgat. Druk de PDF af op 100 % (werkelijke grootte, niet "passend maken") en meet de controlemaat van 100 mm na. Plak de mal op de plaat, snij langs de dikke lijn en kern het hart van elke boring door het kruisje. Lange delen lopen over meerdere bladen: leg de liniaal en de rode kruisjes op elkaar. Op A3 staat de armwang volledig (6 stroken); op A4 teken je hem af met een kopmal, een middenmal en een lat.</p>
  ${tabel('t-mallen', ['Mal', 'Deel', 'Aantal', 'Plaat', 'Waar', 'Blad A3', 'Blad A4'], mallen.map((m) => [m.id, m.naam, m.aantal, m.mat, m.waar, (m.bladen.A3 ?? []).join(', ') || '–', (m.bladen.A4 ?? []).join(', ') || '–']), [2])}
  ${['A3', 'A4'].map((fmt) => `<h3 style="margin:22px 0 10px">Bladen ${fmt}</h3><div class="bladen">${malbladen(fmt).map((f, i) => `<figure class="blad" tabindex="0" data-src="mal/${f}" data-titel="Mal ${fmt}, blad ${i + 1}"><img src="mal/${f}" alt="Mal ${fmt}, blad ${i + 1}" loading="lazy" style="aspect-ratio:auto"><figcaption><code>${i + 1}</code>${esc(mallen.filter((m) => (m.bladen[fmt] ?? []).includes(i + 1)).map((m) => m.naam).join(', '))}</figcaption></figure>`).join('')}</div>`).join('')}
</section>

<section class="blok" id="schemas">
  <div class="blokkop"><h2>Schema's</h2><span class="ref">LFT-E01 · zoals EPLAN · IEC 61082, 60617, 81346 · ISO 1219-1</span></div>
  <div class="bladen">${SCHEMA.map((t, i) => `<figure class="blad" tabindex="0" data-src="schema/blad-${i + 1}.svg" data-titel="${esc(`Blad ${i + 1}: ${t}`)}"><img src="schema/blad-${i + 1}.svg" alt="Schemablad ${i + 1}: ${esc(t)}" loading="lazy"><figcaption><code>${i + 1}</code>${esc(t)}</figcaption></figure>`).join('')}</div>
</section>

<section class="blok" id="bestanden">
  <div class="blokkop"><h2>Bestanden</h2><span class="ref">PDF om af te drukken</span></div>
  <div class="downloads">${DOWNLOADS.map(([pad, t, o]) => `<div class="dl"><h3>${esc(t)}</h3><p>${esc(o)}</p><button class="knop geel" type="button" data-pdf="${pad}">Download PDF</button></div>`).join('')}</div>
  <p class="status" id="pdfstatus" aria-live="polite"></p>
  <h3 style="margin:28px 0 10px">Bronnen</h3>
  <ul class="bronnen">
    <li><a href="https://dctbv.nl/nl/producten/heftafel-schaarlift" target="_blank" rel="noopener">DCT heftafel / schaarlift</a> (hoogtes, last, steunvlakken, opvanglade)</li>
    <li><a href="https://dctbv.nl/nl/producten/lastafel-2400x1200" target="_blank" rel="noopener">DCT lastafel 2400 × 1200</a> (Ø28, raster 100, DG, S690QL)</li>
    <li><a href="https://shop.hansa-flex.de/en_GB/hydraulic-components/hydraulic-power-packs/compact-power-packs/hkk-230v-2-2-210-5-8/p/HKK230V2-2-21058" target="_blank" rel="noopener">Hansa-Flex HKK 230V 2.2</a> (aggregaat)</li>
    <li><a href="https://elektrobode.nl/products/pilz-pnozsigma-pnoz-s3-24vdc-relais-vr-veiligheidsstroomcircuits-750103" target="_blank" rel="noopener">Pilz PNOZ s3 bij elektrobode.nl</a></li>
    <li><a href="https://www.zoro.com/steute-gfs-2-1os1os-two-pedal-foot-switch-each-with-1nc-1no-contacts-momentary-action-with-shroud-1048842/i/G523330391/" target="_blank" rel="noopener">Steute GFS 2 voetschakelaar</a></li>
    <li>EN 1570-1 (heftafels), EN 60204-1, ISO 1219-1, Machineverordening (EU) 2023/1230</li>
  </ul>
</section>
</main>
<footer><div class="wrap">Gemaakt in Phlippo CAD voor Ian · model, tekeningen en lijsten uit <code>voorbeelden/lastafel</code> · het DCT-merk hoort bij DCT BV.</div></footer>

<dialog class="groot" id="groot" aria-label="Vergroting"><div class="balkje"><span id="groottitel"></span><button class="knop" type="button" id="grootdicht">Sluiten</button></div><img id="grootbeeld" alt=""></dialog>

<script>
const CSV = ${JSON.stringify(Object.fromEntries(LIJSTEN.map((l) => [l.id, csv(l.csv())])))};
// vergroten
const dlg = document.getElementById('groot'), gb = document.getElementById('grootbeeld'), gt = document.getElementById('groottitel');
function toon(src, titel) { gb.src = src; gb.alt = titel; gt.textContent = titel; dlg.showModal(); }
document.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-groot]'); if (img) return toon(img.src, img.alt);
  const blad = e.target.closest('.blad'); if (blad) toon(blad.dataset.src, blad.dataset.titel);
});
document.querySelectorAll('.blad').forEach((b) => b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toon(b.dataset.src, b.dataset.titel); } }));
document.getElementById('grootdicht').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
// tabs
const tabs = [...document.querySelectorAll('[role=tab]')];
tabs.forEach((t) => t.addEventListener('click', () => { tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); }));
// afvinken (per kijker in deze browser)
const vinken = [...document.querySelectorAll('[data-vink]')], SLEUTEL = 'lastafel-bouwplan';
let staat = {}; try { staat = JSON.parse(localStorage.getItem(SLEUTEL) || '{}'); } catch {}
function telling() { const n = vinken.filter((v) => v.checked).length; document.getElementById('vinktelling').textContent = n + ' van ' + vinken.length + ' taken afgevinkt'; document.getElementById('vinkbalk').style.width = (100 * n / vinken.length) + '%'; }
vinken.forEach((v) => { v.checked = !!staat[v.id]; v.addEventListener('change', () => { staat[v.id] = v.checked; try { localStorage.setItem(SLEUTEL, JSON.stringify(staat)); } catch {} telling(); }); });
document.getElementById('wisvinken').addEventListener('click', () => { vinken.forEach((v) => { v.checked = false; }); staat = {}; try { localStorage.removeItem(SLEUTEL); } catch {} telling(); });
telling();
// actief hoofdstuk in het menu
const links = [...document.querySelectorAll('nav.menu a')];
const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('actief', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section.blok').forEach((s) => obs.observe(s));
// downloads (CSV en PDF) via de downloads-capability
let dl = null;
const klaar = (async () => { try { dl = await window.claude?.use?.('downloads'); } catch { dl = null; } if (!dl) { document.querySelectorAll('[data-csv],[data-pdf]').forEach((b) => { b.disabled = true; b.title = 'Downloaden kan niet in deze weergave'; }); document.getElementById('pdfstatus').textContent = 'Downloaden kan niet in deze weergave. Open de pagina op claude.ai.'; } })();
async function bewaar(filename, data, status) {
  await klaar; if (!dl) return;
  status.textContent = 'Bezig…';
  try { await dl.save({ filename, data }); status.textContent = filename + ' opgeslagen.'; }
  catch (e) { status.textContent = e && e.code === 'declined' ? 'Niet opgeslagen.' : 'Opslaan lukte niet (' + (e && e.code || 'fout') + ').'; }
}
document.querySelectorAll('[data-csv]').forEach((b) => b.addEventListener('click', () => bewaar('lastafel-' + b.dataset.csv + '.csv', CSV[b.dataset.csv], document.getElementById('csvstatus'))));
document.querySelectorAll('[data-pdf]').forEach((b) => b.addEventListener('click', async () => {
  const st = document.getElementById('pdfstatus');
  try { const r = await fetch(b.dataset.pdf); if (!r.ok) throw new Error(r.status); await bewaar(b.dataset.pdf.split('/').pop(), await r.blob(), st); }
  catch { st.textContent = 'Het bestand kon niet geladen worden.'; }
}));
</script>
`;
writeFileSync(join(HERE, 'index.html'), html);
console.log('pagina', Math.round(html.length / 1024), 'kB;', tek.length, 'tekeningen');
