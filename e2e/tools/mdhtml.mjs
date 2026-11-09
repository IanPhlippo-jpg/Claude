// Markdown naar HTML voor de afdruk-PDF's (genoeg voor onze documenten: koppen, tabellen, lijsten, code, beelden).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const dataUrl = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(f).toString('base64')}`;

// ---- markdown naar HTML (genoeg voor onze documenten: koppen, tabellen, lijsten met ingesprongen inhoud, code) ----
export function inline(t, basis) {
  let s = esc(t);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const f = join(basis, src);
    return existsSync(f) ? `<img class="fig" alt="${alt}" src="${dataUrl(f)}">` : alt;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return s;
}
export function md(tekst, basis) {
  const r = tekst.replace(/\r/g, '').split('\n');
  const uit = [];
  let i = 0;
  const cellen = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  while (i < r.length) {
    const l = r[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) {
      const blok = [];
      for (i++; i < r.length && !r[i].startsWith('```'); i++) blok.push(r[i]);
      i++;
      uit.push(`<pre>${esc(blok.join('\n'))}</pre>`);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { uit.push(`<h${h[1].length}>${inline(h[2], basis)}</h${h[1].length}>`); i++; continue; }
    if (l.trim().startsWith('|')) {
      const rijen = [];
      for (; i < r.length && r[i].trim().startsWith('|'); i++) rijen.push(r[i]);
      const kop = cellen(rijen[0]);
      const lijf = rijen.slice(2).map(cellen);
      uit.push(`<table><thead><tr>${kop.map((c) => `<th>${inline(c, basis)}</th>`).join('')}</tr></thead><tbody>${lijf.map((rij) => `<tr>${rij.map((c) => `<td>${inline(c, basis)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    const li = l.match(/^(\s*)(\d+\.|[-*])\s+(.*)$/);
    if (li) {
      const geordend = /\d/.test(li[2]);
      const items = [];
      while (i < r.length) {
        const m = r[i].match(/^(\d+\.|[-*])\s+(.*)$/);
        if (!m) break;
        let inhoud = inline(m[2], basis);
        i++;
        // ingesprongen vervolg (tabellen, alinea's) hoort bij dit punt
        const sub = [];
        while (i < r.length && (r[i].startsWith('   ') || r[i].startsWith('\t') || (!r[i].trim() && i + 1 < r.length && r[i + 1].startsWith('   ')))) { sub.push(r[i].replace(/^ {2,4}/, '')); i++; }
        if (sub.length) inhoud += md(sub.join('\n'), basis);
        items.push(`<li>${inhoud}</li>`);
        while (i < r.length && !r[i].trim() && i + 1 < r.length && /^(\d+\.|[-*])\s/.test(r[i + 1]) && geordend === /^\d/.test(r[i + 1])) i++;
      }
      uit.push(geordend ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    const alinea = [];
    for (; i < r.length && r[i].trim() && !/^(#{1,4}\s|\||```|\s*(\d+\.|[-*])\s)/.test(r[i]); i++) alinea.push(r[i].trim());
    if (!alinea.length) { uit.push(`<p>${inline(r[i], basis)}</p>`); i++; continue; }
    uit.push(`<p>${inline(alinea.join(' '), basis)}</p>`);
  }
  return uit.join('\n');
}
export const mdDoc = (f, titel) => `<section class="tekst" id="${titel}">${md(readFileSync(f, 'utf8'), dirname(f))}</section>`;

