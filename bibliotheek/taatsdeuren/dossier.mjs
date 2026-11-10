// Het dossier van één taatsdeur als HTML (A4 + het A3-werkblad): kostprijs met bronnen, werkwijze met uren, gewicht
// tegenover het scharnier. Gedeeld door de PDF (Node) en de configurator (browser).
import { werkblad } from './blad.mjs';
import { stukBladen } from './stukblad.mjs';
import { explodeBlad } from './explode.mjs';
import { detailBladen } from './detail.mjs';
import { kostprijs, PRIJS, MARKT } from './prijzen.mjs';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const eur = (v) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const link = (b) => (/^https?:/.test(b) ? `<a href="${esc(b)}">${esc(b.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>` : esc(b));

/** A4-blad met de kostprijs, het gewicht en de werkwijze */
export function a4(o, keuzes = {}) {
  const k = kostprijs(o, keuzes), G = k.gewicht, sch = PRIJS.scharnier[k.scharnier];
  const maxKg = k.maxKg;
  const zwaar = G.vleugels.some((x) => x > maxKg);
  return `<section class="a4">
<h1>Taatsdeur ${esc(o.stijl.naam)} <span>opening ${o.B} x ${o.H} mm · ${esc(o.sys.naam)}</span></h1>
<p class="uitleg">${esc(o.stijl.uitleg)}</p>
<h2>Kostprijs (excl. btw)</h2>
<table class="prijs"><thead><tr><th>Wat</th><th class="n">Bedrag</th><th>Bron</th></tr></thead><tbody>
${k.regels.map((r) => `<tr><td>${esc(r.wat)}</td><td class="n">${eur(r.bedrag)}</td><td class="bron">${link(r.bron)}</td></tr>`).join('')}
<tr class="sub"><td>Materiaal</td><td class="n">${eur(k.materiaal)}</td><td></td></tr>
<tr><td>Arbeid: ${String(k.uren).replace('.', ',')} uur x ${eur(k.keuzes.uurloon)}</td><td class="n">${eur(k.arbeid)}</td><td class="bron">uren uit de werkwijze hieronder (instelbaar)</td></tr>
<tr class="tot"><td>Kostprijs</td><td class="n">${eur(k.kostprijs)}</td><td></td></tr>
<tr class="tot"><td>Verkoopprijs met ${k.keuzes.marge} % marge</td><td class="n">${eur(k.verkoop)}</td><td class="bron">incl. btw: ${eur(k.verkoop * 1.21)}</td></tr>
</tbody></table>
<p class="klein">Gewicht: staal ${Math.round(G.staal)} kg, glas ${Math.round(G.glas)} kg; per vleugel ${G.vleugels.map((x) => `${Math.round(x)} kg`).join(' en ')}. ${esc(sch.naam)}: ${zwaar ? '<b>te zwaar, kies premium of een dunnere uitvoering</b>' : 'draagt dat ruim'}. Oppervlak voor de coating ${String(k.oppervlak).replace('.', ',')} m².</p>
<h2>Werkwijze</h2>
<ol class="stappen">${k.stappen.map((s) => `<li><b>${esc(s.titel)}</b> <span class="uur">${String(s.uren).replace('.', ',')} u${s.proces ? ` · ${esc(s.proces)}` : ''}</span><br>${esc(s.tekst)}</li>`).join('')}</ol>
<p class="klein">Ter vergelijking, verkoopprijzen in BE/NL: ${MARKT.map((m) => `${esc(m.wat)} ${eur(m.prijs)}`).join('; ')}.</p>
</section>`;
}
export const CSS = `
.a4 { font: 9.5pt/1.4 Arial, Helvetica, sans-serif; color: #15181b }
.a4 h1 { font-size: 16pt; margin: 0 0 1mm } .a4 h1 span { font-size: 10pt; font-weight: 400; color: #555; margin-left: 2mm }
.a4 h2 { font-size: 11.5pt; margin: 5mm 0 1.5mm; border-bottom: 0.3mm solid #15181b }
.a4 .uitleg { margin: 0 0 2mm; color: #444 } .a4 table { border-collapse: collapse; width: 100%; font-size: 8.5pt }
.a4 th, .a4 td { border-bottom: 0.2mm solid #ccd; padding: 0.8mm 1.2mm; text-align: left; vertical-align: top } .a4 th { background: #eef0f2 }
.a4 .n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums } .a4 .bron { font-size: 7.5pt; color: #555; word-break: break-all }
.a4 tr.sub td, .a4 tr.tot td { font-weight: 700 } .a4 tr.tot td { border-top: 0.4mm solid #15181b }
.a4 .klein { font-size: 8pt; color: #444 } .a4 .stappen { padding-left: 5mm; margin: 0 } .a4 .stappen li { margin-bottom: 1.6mm }
.a4 .uur { color: #8a5a00; font-size: 8pt } .a4 a { color: inherit }`;

/** de bladen van een deur: A3 werkblad, A3 stuklijst en onderdelen (svg's), A4 dossier (HTML) */
export function bladen(o, keuzes = {}, meta = {}) {
  const k = kostprijs(o, keuzes);
  const prijs = { regels: [['Materiaal', k.materiaal], [`Arbeid (${String(k.uren).replace('.', ',')} u)`, k.arbeid]], totaal: k.kostprijs };
  const kk = { ...keuzes, scharnierModel: k.scharnier }, s0 = stukBladen(o, kk, { ...meta, bladStart: 3 }), n = 2 + s0.bladen.length;
  const s = stukBladen(o, kk, { ...meta, bladStart: 3, bladTotaal: n });
  return { a3: werkblad(o, { ...meta, prijs, blad: `1 / ${n}` }), stuk: [explodeBlad(o, kk, { ...meta, blad: `2 / ${n}` }), ...s.bladen], detail: detailBladen(o, kk, meta).bladen.map((b) => b.svg), posities: s.posities, a4: a4(o, keuzes), kost: k };
}
