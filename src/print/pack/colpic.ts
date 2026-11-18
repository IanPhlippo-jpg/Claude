/**
 * Printer-screen thumbnails in the G-code (docs/34 R5):
 *   - PNG block "; thumbnail begin WxH LEN" with base64 lines (Klipper/Moonraker, Elegoo Centauri)
 *   - the Elegoo Neptune screen format (";gimage:" / ";simage:"), re-implemented from a public description of the
 *     encoding: RGB565 colours, a palette of at most 1024 colours sorted by use, run-length codes per palette page, and
 *     a text encoding of 6 bits per character (+48, '\' written as '~'). Orientation and line splitting on the screen
 *     are to be checked on a printer (nog te printen).
 */
import { base64 } from './png';

/** the standard PNG thumbnail block (78 characters of base64 per line) */
export function pngThumbnailBlock(png: Uint8Array, width: number, height: number): string {
  const b = base64(png);
  const lines = [';', `; thumbnail begin ${width}x${height} ${b.length}`];
  for (let i = 0; i < b.length; i += 78) lines.push(`; ${b.slice(i, i + 78)}`);
  lines.push('; thumbnail end', ';');
  return lines.join('\n');
}

const rgb565 = (r: number, g: number, b: number) => ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);

/** ColPic bytes of an RGBA image (transparent pixels get the screen background colour) */
export function colpicBytes(rgba: Uint8Array, width: number, height: number, background = [46, 51, 72]): Uint8Array {
  const px = new Uint16Array(width * height);
  for (let i = 0; i < px.length; i++) {
    const a = rgba[i * 4 + 3];
    px[i] = a < 128 ? rgb565(background[0], background[1], background[2]) : rgb565(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
  }
  // palette: by count, most used first; when there are more than 1024 colours the rare ones join their nearest
  const count = new Map<number, number>();
  for (const c of px) count.set(c, (count.get(c) ?? 0) + 1);
  let palette = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c]) => c);
  const remap = new Map<number, number>();
  if (palette.length > 1024) {
    const keep = palette.slice(0, 1024);
    const dist = (a: number, b: number) => Math.abs((a >> 11) - (b >> 11)) + Math.abs(((a >> 5) & 63) - ((b >> 5) & 63)) + Math.abs((a & 31) - (b & 31));
    for (const c of palette.slice(1024)) { let best = 0, bd = Infinity; keep.forEach((k, i) => { const d = dist(c, k); if (d < bd) { bd = d; best = i; } }); remap.set(c, best); }
    palette = keep;
  }
  const index = new Map<number, number>(palette.map((c, i) => [c, i]));
  const data: number[] = [];
  let page = 0;
  const emit = (idx: number, run: number) => {
    const p = idx >> 5, slot = idx & 31;
    if (p !== page) { data.push(0xe0 | p); page = p; }
    if (run <= 6) data.push((run << 5) | slot); else data.push(slot, run);
  };
  let cur = -1, run = 0;
  for (const c of px) {
    const idx = index.get(c) ?? remap.get(c) ?? 0;
    if (idx === cur && run < 255) { run++; continue; }
    if (run) emit(cur, run);
    cur = idx; run = 1;
  }
  if (run) emit(cur, run);
  const out = new Uint8Array(32 + palette.length * 2 + data.length);
  const v = new DataView(out.buffer);
  out[0] = 3;
  v.setUint32(4, width, true); v.setUint32(8, height, true); v.setUint32(12, 0x05ddc33c, true);
  v.setUint32(16, palette.length * 2, true); v.setUint32(20, data.length, true);
  palette.forEach((c, i) => v.setUint16(32 + 2 * i, c, true));
  out.set(data, 32 + palette.length * 2);
  return out;
}

/** the text form: 3 bytes -> 4 characters of 6 bits + 48, zero padded (a full multiple of 3 still gets 3 zeros) */
export function colpicText(bytes: Uint8Array): string {
  const pad = 3 - (bytes.length % 3);
  const b = new Uint8Array(bytes.length + pad);
  b.set(bytes);
  let s = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
    for (const shift of [18, 12, 6, 0]) s += String.fromCharCode(((n >> shift) & 63) + 48);
  }
  return s.replace(/\\/g, '~');
}

/** decodes ColPic text back to RGB565 pixels (for the tests: the block must decode to the same pixels) */
export function decodeColpic(text: string): { width: number; height: number; pixels: Uint16Array } {
  const t = text.replace(/~/g, '\\');
  const bytes: number[] = [];
  for (let i = 0; i + 3 < t.length; i += 4) {
    const n = ((t.charCodeAt(i) - 48) << 18) | ((t.charCodeAt(i + 1) - 48) << 12) | ((t.charCodeAt(i + 2) - 48) << 6) | (t.charCodeAt(i + 3) - 48);
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  const b = Uint8Array.from(bytes);
  const v = new DataView(b.buffer);
  const width = v.getUint32(4, true), height = v.getUint32(8, true), palBytes = v.getUint32(16, true), dataBytes = v.getUint32(20, true);
  const palette: number[] = [];
  for (let i = 0; i < palBytes / 2; i++) palette.push(v.getUint16(32 + 2 * i, true));
  const pixels = new Uint16Array(width * height);
  let o = 0, page = 0;
  const data = b.subarray(32 + palBytes, 32 + palBytes + dataBytes);
  for (let i = 0; i < data.length && o < pixels.length;) {
    const c = data[i];
    if ((c & 0xe0) === 0xe0) { page = c & 31; i++; continue; }
    if ((c & 0xe0) === 0) { const run = data[i + 1]; pixels.fill(palette[(page << 5) | (c & 31)], o,
      o + run); o += run; i += 2; } else { const run = c >> 5; pixels.fill(palette[(page << 5) | (c & 31)], o, o + run); o += run; i++; }
  }
  return { width, height, pixels };
}

/** the Neptune block: the first image as ;gimage:, the next as ;simage: */
export function colpicBlock(images: { rgba: Uint8Array; width: number; height: number }[], maxLine = 0): string {
  // with maxLine (Marlin: 96 characters, docs/35 P3-2) the text is split into lines that each repeat the prefix (how
  // the screen joins them is still to be checked on a printer: nog te printen)
  return images.map((im, i) => {
    const prefix = `;${i === 0 ? 'gimage' : 'simage'}:`;
    const text = colpicText(colpicBytes(im.rgba, im.width, im.height));
    if (!maxLine) return `\n${prefix}${text}\n`;
    const step = maxLine - prefix.length;
    const parts: string[] = [];
    for (let k = 0; k < text.length; k += step) parts.push(prefix + text.slice(k, k + step));
    return `\n${parts.join('\n')}\n`;
  }).join('');
}
