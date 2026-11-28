// Gedeeld door de drie configurators (taatsdeuren, balustrades, fitness) en de werkplaats-app (2026-11-28, Ian: "zet
// prijzen in 1 document en de schema's apart van alles"): de werkplaats in drie tabbladen (Schema's, Werkvoorbereiding,
// Prijzen) en het prijsdocument, op het scherm als een blad A4 en als PDF om te bewaren. Rekent zelf niets: het
// prijsdocument krijgt de bedragen al opgemaakt van prijsdoc.mjs van het product. Werkt in Node en in de browser.

/** stijl van de tabbladen, de inhoudsopgave en het prijsdocument (in de pagina of in de schaduwboom van de app) */
export const WERK_CSS = `
.wtabs { display: flex; gap: 4px; margin: 18px 0 0; border-bottom: 2px solid var(--inkt); overflow-x: auto; scrollbar-width: none }
.wtabs button { flex: none; font: 750 15px var(--kop); font-stretch: 85%; text-transform: uppercase; letter-spacing: .05em; color: var(--zacht); background: var(--vlak2); border: 1px solid var(--lijn); border-bottom: 0; border-radius: 8px 8px 0 0; padding: 9px 14px 7px; cursor: pointer }
.wtabs button small { display: block; font: 500 11.5px var(--tekst); text-transform: none; letter-spacing: 0; opacity: .85 }
.wtabs button[aria-selected="true"] { background: var(--inkt); border-color: var(--inkt); color: var(--bg) }
.windex { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 0; background: var(--bg); }
.windex button { flex: none; font: 600 13px var(--tekst); padding: 6px 11px; border: 1px solid var(--lijn); background: var(--vlak); color: var(--inkt); border-radius: 999px; cursor: pointer }
.windex button:hover, .windex button:focus-visible { border-color: var(--acc); background: var(--acc-vlak); color: var(--acc-inkt) }
[data-wpaneel] > section.deel:first-of-type { margin-top: 8px }
[data-wpaneel] > section.deel { scroll-margin-top: calc(var(--wtop, 64px) + 12px) }
.pknoppen { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 14px 0 }
.pdoc { --pd: #15181b; --pz: #59626a; --pl: #d7dbdc; background: #fff; color: var(--pd); max-width: 210mm; margin: 0 auto 30px; padding: 16mm 15mm 14mm; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 8px 28px rgba(0,0,0,.10); border-radius: 3px; font: 12.5px/1.45 var(--tekst); min-width: 0 }
.pdoc header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; border-bottom: 3px solid var(--pacc, #c2410c); padding-bottom: 10px; margin-bottom: 14px }
.pdoc header .ey { font: 600 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--pacc, #c2410c) }
.pdoc header h2 { font: 800 26px var(--kop); font-stretch: 78%; margin: 2px 0 0; color: var(--pd) }
.pdoc header p { margin: 3px 0 0; color: var(--pz); font-size: 12px }
.pdoc header .dat { text-align: right; font: 500 11px var(--mono); color: var(--pz) }
.pdoc .kern { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 0 0 16px }
.pdoc .kern div { border: 1px solid var(--pl); border-radius: 6px; padding: 7px 10px }
.pdoc .kern span { display: block; font: 600 10.5px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--pz) }
.pdoc .kern b { display: block; font: 800 19px var(--kop); font-stretch: 80%; font-variant-numeric: tabular-nums; overflow-wrap: anywhere }
.pdoc .kern div { min-width: 0 }
.pdoc .kern div.pk-hoofd { border-color: var(--pacc, #c2410c); background: color-mix(in srgb, var(--pacc, #c2410c) 7%, #fff) }
.pdoc section { margin: 0 0 16px; break-inside: avoid-page }
.pdoc h3 { font: 750 15px var(--kop); font-stretch: 85%; margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid var(--pd); color: var(--pd); display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap }
.pdoc h3 small { font: 500 11.5px var(--tekst); color: var(--pz) }
.pdoc .ptab { overflow-x: auto }
.pdoc table { border-collapse: collapse; width: 100%; font-size: 11.5px; background: #fff; color: var(--pd) }
.pdoc th { text-align: left; font: 600 10px var(--mono); text-transform: uppercase; letter-spacing: .05em; color: var(--pz); background: #f1f3f3; padding: 4px 6px; border-bottom: 1px solid var(--pl); white-space: nowrap }
.pdoc td { padding: 3px 6px; border-bottom: 1px solid #eceeee; vertical-align: top }
.pdoc td.n, .pdoc th.n { text-align: right; font-family: var(--mono); white-space: nowrap; font-variant-numeric: tabular-nums }
.pdoc td.k { font-size: 10.5px; color: var(--pz); word-break: break-word; min-width: 120px }
.pdoc td.k a { color: inherit }
.pdoc tr.tot td { font-weight: 700; border-top: 1.5px solid var(--pd); border-bottom: 0 }
.pdoc tr.tot + tr.tot td { border-top: 0 }
.pdoc tr.apart td { color: var(--pz); font-style: italic }
.pdoc .noot { font-size: 11px; color: var(--pz); margin: 5px 0 0 }
.pdoc footer { border-top: 1px solid var(--pl); padding: 8px 0 0; font-size: 10.5px; color: var(--pz) }
@media (max-width: 700px) { .pdoc .kern { grid-template-columns: 1fr 1fr } .pdoc { padding: 18px 14px; border-radius: 0; margin-inline: -16px; box-shadow: none; border-block: 1px solid var(--lijn) } .pdoc header { grid-template-columns: 1fr } .pdoc header .dat { text-align: left } .wtabs { display: grid; grid-template-columns: 1fr 1.75fr 1fr; overflow: visible } .wtabs button { min-width: 0; padding: 9px 4px 7px; font-size: 12.5px; letter-spacing: 0; overflow-wrap: anywhere } .wtabs button small { display: none } }
`;

/** zet de werkplaatsstijl één keer in de pagina (standalone) of in de schaduwboom (werkplaats-app) */
export function zetWerkStijl(root) {
  const doel = root.head ?? root;
  if (doel.querySelector?.('style[data-werkdoc]')) return;
  const st = (root.ownerDocument ?? root).createElement('style');
  st.dataset.werkdoc = '1'; st.textContent = WERK_CSS; doel.appendChild(st);
}

/** de drie tabbladen van de werkplaats; het gekozen tabblad blijft bewaard per product (sleutel) */
export function werkTabs(root, sleutel, { opWissel } = {}) {
  const k = `werkplaats-tab-${sleutel}`, alle = () => [...root.querySelectorAll('[data-wtab]')].map((b) => b.dataset.wtab);
  let huidig = 'schemas';
  try { huidig = localStorage.getItem(k) || 'schemas'; } catch { /* geen opslag */ }
  const zet = (t, bewaar = true) => {
    if (!alle().includes(t)) t = 'schemas';
    huidig = t;
    root.querySelectorAll('[data-wtab]').forEach((b) => { b.setAttribute('aria-selected', b.dataset.wtab === t); b.tabIndex = b.dataset.wtab === t ? 0 : -1; });
    root.querySelectorAll('[data-wpaneel]').forEach((p) => { p.hidden = p.dataset.wpaneel !== t; });
    if (bewaar) { try { localStorage.setItem(k, t); } catch { /* geen opslag */ } }
    opWissel?.(t);
  };
  root.querySelectorAll('[data-wtab]').forEach((b) => b.addEventListener('click', () => zet(b.dataset.wtab)));
  // inhoudsopgave: meteen naar een tekening of lijst springen in plaats van te scrollen
  root.querySelectorAll('.windex').forEach((nav) => nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-naar]'); if (!b) return;
    root.getElementById(b.dataset.naar)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  zet(huidig, false);
  return { zet, get huidig() { return huidig; } };
}

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rij = (r) => (Array.isArray(r) ? { c: r, soort: '' } : r);
/** een bron: een link wordt een korte, klikbare naam (in de PDF de volledige tekst) */
const bronHtml = (b) => String(b ?? '').split(/(https?:\/\/[^\s;,)]+)/).map((x, i) => (i % 2 ? `<a href="${esc(x)}" target="_blank" rel="noopener">${esc(x.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>` : esc(x))).join('');

/**
 * het prijsdocument als HTML (een blad A4 op het scherm)
 * doc: { kleur, product, titel, sub, datum, kern: [{ t, v, id, hoofd }], delen: [{ id, titel, sub, kol: [{ t, w, n, k }],
 *        rijen: [[...] | { c, soort: 'tot' | 'apart' }], noot }], voet }
 */
export function prijsDocHtml(doc) {
  const deel = (d) => `<section data-deel="${esc(d.id)}"><h3>${esc(d.titel)}${d.sub ? ` <small>${esc(d.sub)}</small>` : ''}</h3>${d.kol ? `<div class="ptab"><table><thead><tr>${d.kol.map((c) => `<th${c.n ? ' class="n"' : ''}>${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${d.rijen.map(rij).map((r) => `<tr${r.soort ? ` class="${r.soort}"` : ''}${r.id ? ` data-rij="${esc(r.id)}"` : ''}>${r.c.map((x, i) => `<td${d.kol[i]?.n ? ' class="n"' : d.kol[i]?.k ? ' class="k"' : ''}>${d.kol[i]?.k ? bronHtml(x) : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}${d.noot ? `<p class="noot">${esc(d.noot)}</p>` : ''}</section>`;
  return `<article class="pdoc" style="--pacc:${esc(doc.kleur ?? '#c2410c')}" aria-label="Prijsdocument"><header><div><span class="ey">${esc(doc.product)}</span><h2>${esc(doc.titel)}</h2><p>${esc(doc.sub ?? '')}</p></div><div class="dat">Prijsdocument<br>${esc(doc.datum ?? '')}</div></header>`
    + `<div class="kern">${doc.kern.map((x) => `<div${x.hoofd ? ' class="pk-hoofd"' : ''} data-kern="${esc(x.id)}"><span>${esc(x.t)}</span><b>${esc(x.v)}</b></div>`).join('')}</div>`
    + doc.delen.map(deel).join('') + (doc.voet ? `<footer>${esc(doc.voet)}</footer>` : '') + '</article>';
}

// ---------------------------------------------------------------- PDF (A4, Helvetica, zonder bibliotheek)
// breedtes per 1000 van Helvetica en Helvetica-Bold (Adobe AFM) voor de tekens 32-126
const HV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const HB = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
// WinAnsiEncoding voor de tekens buiten Latin-1
const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99, ' ': 0x20, ' ': 0x20, ' ': 0xa0, '≤': 0x3c, '≥': 0x3e, '→': 0x3e, '−': 0x2d };
const ansi = (s) => [...String(s ?? '')].map((ch) => { const c = ch.codePointAt(0); return WIN[ch] ?? (c < 256 ? c : 0x3f); });
const breedte = (s, size, vet) => ansi(s).reduce((t, c) => {
  if (c >= 32 && c <= 126) return t + (vet ? HB : HV)[c - 32];
  const basis = String.fromCharCode(c).normalize('NFD').charCodeAt(0);
  return t + (basis >= 32 && basis <= 126 ? (vet ? HB : HV)[basis - 32] : 556);
}, 0) * size / 1000;
const pdfTekst = (s) => ansi(s).map((c) => (c === 40 || c === 41 || c === 92 ? `\\${String.fromCharCode(c)}` : c < 32 || c > 126 ? `\\${c.toString(8).padStart(3, '0')}` : String.fromCharCode(c))).join('');
/** woorden op regels van hoogstens w punten (een te lang woord wordt geknipt) */
function knip(s, w, size, vet) {
  const uit = [];
  for (const alinea of String(s ?? '').split('\n')) {
    let r = '';
    for (const woord of alinea.split(/\s+/).filter(Boolean)) {
      const t = r ? `${r} ${woord}` : woord;
      if (breedte(t, size, vet) <= w) { r = t; continue; }
      if (r) uit.push(r);
      r = woord;
      while (breedte(r, size, vet) > w && r.length > 1) { let n = r.length - 1; while (n > 1 && breedte(r.slice(0, n), size, vet) > w) n--; uit.push(r.slice(0, n)); r = r.slice(n); }
    }
    uit.push(r);
  }
  return uit.length ? uit : [''];
}
const kleurRgb = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? ''); const v = m ? parseInt(m[1], 16) : 0xc2410c; return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => (x / 255).toFixed(3)).join(' '); };

/** het prijsdocument als PDF (Uint8Array), dezelfde inhoud als prijsDocHtml */
export function prijsDocPdf(doc) {
  const PW = 595.28, PH = 841.89, ML = 40, MR = 40, MT = 46, MB = 50, BR = PW - ML - MR, acc = kleurRgb(doc.kleur);
  const paginas = []; let ops = [], y = MT;
  const nieuw = () => { ops = []; paginas.push(ops); y = MT; };
  const T = (x, yy, s, size, { vet = false, kleur = '0.08 0.09 0.11', rechts = false } = {}) => { const xx = rechts ? x - breedte(s, size, vet) : x; ops.push(`BT /${vet ? 'F2' : 'F1'} ${size} Tf ${kleur} rg ${xx.toFixed(2)} ${(PH - yy).toFixed(2)} Td (${pdfTekst(s)}) Tj ET`); };
  const lijn = (x1, y1, x2, y2, w = 0.5, kleur = '0.08 0.09 0.11') => ops.push(`${kleur} RG ${w} w ${x1.toFixed(2)} ${(PH - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PH - y2).toFixed(2)} l S`);
  const vlak = (x, yy, w, h, kleur) => ops.push(`${kleur} rg ${x.toFixed(2)} ${(PH - yy - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const ruimte = (h) => { if (y + h > PH - MB) { nieuw(); return true; } return false; };
  nieuw();
  // kop
  T(ML, y + 8, doc.product?.toUpperCase() ?? '', 8, { vet: true, kleur: acc });
  T(PW - MR, y + 8, `Prijsdocument · ${doc.datum ?? ''}`, 8, { rechts: true, kleur: '0.35 0.38 0.42' });
  y += 28; T(ML, y, doc.titel ?? '', 19, { vet: true });
  y += 6;
  for (const r of knip(doc.sub ?? '', BR, 9)) { y += 11; T(ML, y, r, 9, { kleur: '0.35 0.38 0.42' }); }
  y += 8; lijn(ML, y, PW - MR, y, 2.2, acc); y += 12;
  // kerncijfers
  const n = doc.kern.length, kb = (BR - (n - 1) * 6) / n;
  doc.kern.forEach((x, i) => { const xx = ML + i * (kb + 6); if (x.hoofd) vlak(xx, y, kb, 34, '0.98 0.95 0.93'); ops.push(`${x.hoofd ? acc : '0.84 0.86 0.86'} RG 0.8 w ${xx.toFixed(2)} ${(PH - y - 34).toFixed(2)} ${kb.toFixed(2)} 34 re S`); T(xx + 6, y + 11, x.t.toUpperCase(), 6.3, { vet: true, kleur: '0.35 0.38 0.42' }); T(xx + 6, y + 27, x.v, 12.5, { vet: true }); });
  y += 48;
  // delen
  for (const d of doc.delen) {
    ruimte(46);
    T(ML, y + 10, d.titel, 11.5, { vet: true });
    if (d.sub) T(ML + breedte(d.titel, 11.5, true) + 8, y + 10, d.sub, 8, { kleur: '0.35 0.38 0.42' });
    y += 14; lijn(ML, y, PW - MR, y, 0.8); y += 2;
    if (d.kol) {
      const som = d.kol.reduce((t, c) => t + (c.w ?? 1), 0), bw = d.kol.map((c) => (BR * (c.w ?? 1)) / som), FS = 7.6, LD = 9.4;
      const kop = () => { vlak(ML, y, BR, 12, '0.945 0.953 0.953'); let x = ML; d.kol.forEach((c, i) => { T(c.n ? x + bw[i] - 3 : x + 3, y + 8.6, c.t.toUpperCase(), 6.2, { vet: true, kleur: '0.35 0.38 0.42', rechts: !!c.n }); x += bw[i]; }); y += 12; };
      kop();
      for (const r0 of d.rijen) {
        const r = rij(r0), vet = r.soort === 'tot', grijs = r.soort === 'apart' ? '0.45 0.48 0.52' : '0.08 0.09 0.11';
        const cel = r.c.map((s, i) => (d.kol[i]?.n ? [String(s ?? '')] : knip(s, bw[i] - 6, d.kol[i]?.k ? FS - 1 : FS, vet)));
        const h = Math.max(...cel.map((c) => c.length)) * LD + 3;
        if (ruimte(h)) { T(ML, y + 10, `${d.titel} (vervolg)`, 9, { vet: true }); y += 14; kop(); }
        if (vet) lijn(ML, y, PW - MR, y, 0.9);
        let x = ML;
        cel.forEach((regels, i) => { const c = d.kol[i] ?? {}; regels.forEach((t, j) => T(c.n ? x + bw[i] - 3 : x + 3, y + 8 + j * LD, t, c.k ? FS - 1 : FS, { vet, kleur: c.k ? '0.35 0.38 0.42' : grijs, rechts: !!c.n })); x += bw[i]; });
        y += h; if (!vet) lijn(ML, y, PW - MR, y, 0.25, '0.88 0.89 0.89');
      }
    }
    if (d.noot) for (const t of knip(d.noot, BR, 7.4)) { ruimte(10); y += 9.5; T(ML, y, t, 7.4, { kleur: '0.35 0.38 0.42' }); }
    y += 14;
  }
  if (doc.voet) for (const t of knip(doc.voet, BR, 7.4)) { ruimte(10); y += 9.5; T(ML, y, t, 7.4, { kleur: '0.35 0.38 0.42' }); }
  // voet met bladnummer, daarna de objecten
  paginas.forEach((p, i) => { ops = p; lijn(ML, PH - 32, PW - MR, PH - 32, 0.4, '0.8 0.82 0.82'); T(ML, PH - 22, `${doc.product ?? ''} · ${doc.titel ?? ''}`, 7, { kleur: '0.45 0.48 0.52' }); T(PW - MR, PH - 22, `blad ${i + 1} / ${paginas.length}`, 7, { rechts: true, kleur: '0.45 0.48 0.52' }); });
  const obj = [], kids = [];
  obj[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  obj[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  obj[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  paginas.forEach((p, i) => {
    const pg = 5 + i * 2, inh = p.join('\n');
    kids.push(`${pg} 0 R`);
    obj[pg] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pg + 1} 0 R >>`;
    obj[pg + 1] = `<< /Length ${inh.length} >>\nstream\n${inh}\nendstream`;
  });
  obj[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  const titel = pdfTekst(`Prijsdocument ${doc.titel ?? ''}`);
  obj.push(`<< /Title (${titel}) /Producer (Werkplaats) >>`);
  const info = obj.length - 1;
  let uit = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const xref = [];
  for (let i = 1; i < obj.length; i++) { xref[i] = uit.length; uit += `${i} 0 obj\n${obj[i]}\nendobj\n`; }
  const start = uit.length;
  uit += `xref\n0 ${obj.length}\n0000000000 65535 f \n${xref.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${obj.length} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  const b = new Uint8Array(uit.length);
  for (let i = 0; i < uit.length; i++) b[i] = uit.charCodeAt(i) & 255;
  return b;
}
