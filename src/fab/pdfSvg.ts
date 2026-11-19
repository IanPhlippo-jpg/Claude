/**
 * The page of the PDF writer drawn as SVG (docs/36 O2.9: what Ian sees in the quote preview is the PDF itself): the
 * content stream of a page is read back with a small interpreter of the operators the writer uses (colours, line width,
 * paths, rectangles, text matrix, images as a grey box).
 */
import type { PdfPage } from './pdf';

const PT = 72 / 25.4;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const WIN: Record<number, string> = { 0x80: '€', 0x82: '‚', 0x84: '„', 0x85: '…', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x99: '™' };

function tokens(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') {
      let j = i + 1, t = '';
      while (j < s.length && s[j] !== ')') {
        if (s[j] === '\\') { const m = /^[0-7]{3}/.exec(s.slice(j + 1)); if (m) { const code = parseInt(m[0],
          8); t += WIN[code] ?? String.fromCharCode(code); j += 4; } else { t += s[j + 1]; j += 2; } } else { t += s[j]; j++; }
      }
      out.push(`(${t}`); i = j + 1; continue;
    }
    if (c === '[') { const j = s.indexOf(']', i); out.push(s.slice(i, j + 1)); i = j + 1; continue; }
    let j = i;
    while (j < s.length && !/\s/.test(s[j]) && s[j] !== '(' && s[j] !== '[') j++;
    out.push(s.slice(i, j)); i = j;
  }
  return out;
}

const col = (r: number, g: number, b: number) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;

export function pageSvg(p: PdfPage): string {
  const W = p.width * PT, H = p.height * PT;
  const els: string[] = [];
  let fill = 'black', stroke = 'black', lw = 1, dash = '', path = '', font = { size: 9, bold: false }, tm = [1, 0, 0, 1, 0, 0];
  const stack: string[] = [];
  const num = () => Number(stack.pop());
  for (const t of tokens(p.ops.join('\n'))) {
    switch (t) {
      case 'rg': { const b = num(), g = num(), r = num(); fill = col(r, g, b); break; }
      case 'RG': { const b = num(), g = num(), r = num(); stroke = col(r, g, b); break; }
      case 'w': lw = num(); break;
      case 'd': { stack.pop(); const a = stack.pop() ?? '[]'; dash = a.slice(1, -1).trim(); break; }
      case 'm': { const y = num(), x = num(); path += `M${x} ${H - y}`; break; }
      case 'l': { const y = num(), x = num(); path += `L${x} ${H - y}`; break; }
      case 'h': path += 'Z'; break;
      case 're': { const h = num(), w = num(), y = num(), x = num(); path += `M${x} ${H - y}h${w}v${-h}h${-w}Z`; break; }
      case 'S': els.push(`<path d="${path}" fill="none" stroke="${stroke}" stroke-width="${lw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`); path = ''; break;
      case 'f': els.push(`<path d="${path}" fill="${fill}"/>`); path = ''; break;
      case 'B': els.push(`<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${lw}"/>`); path = ''; break;
      case 'BT': case 'ET': case 'q': case 'Q': break;
      case 'Tf': { const size = num(); font = { size, bold: stack.pop() === '/F2' }; break; }
      case 'Tm': { const f = num(), e = num(), d = num(), c = num(), b = num(), a = num(); tm = [a, b, c, d, e, f]; break; }
      case 'cm': { const f = num(), e = num(), d = num(), c = num(), b = num(), a = num(); tm = [a, b, c, d, e, f]; break; }
      case 'Do': stack.pop(); els.push(`<rect x="${tm[4]}" y="${H - tm[5] - tm[3]}" width="${tm[0]}" height="${tm[3]}" fill="#e8ecf2" stroke="#999"/>`); break;
      case 'Tj': {
        const s = (stack.pop() ?? '(').slice(1);
        const ang = (Math.atan2(tm[1], tm[0]) * 180) / Math.PI;
        els.push(`<text x="${tm[4]}" y="${H - tm[5]}" font-family="Helvetica, Arial, sans-serif" font-size="${font.size}"${font.bold ? ' font-weight="bold"' : ''}` +
          ` fill="${fill}"${ang ? ` transform="rotate(${-ang} ${tm[4]} ${H - tm[5]})"` : ''}>${esc(s)}</text>`);
        break;
      }
      default: stack.push(t);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}"><rect width="100%" height="100%" fill="#fff"/>${els.join('')}</svg>`;
}
