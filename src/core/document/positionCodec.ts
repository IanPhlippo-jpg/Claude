/**
 * Compact storage of imported mesh positions in a file (QA 0.5.14 P2-6). A JSON number list costs 10 to 20 bytes
 * per number (one line each with indentation); here the numbers are little-endian floats in base64: 5.3 bytes per
 * number for Float32, 10.7 for Float64. Float32 is used when every number is exactly a Float32 (an STL always is);
 * otherwise Float64, so a file never changes the geometry it stores.
 *
 * Text form: "f32:<base64>" or "f64:<base64>". Files of format 2 and older hold a plain number list, which is
 * still read.
 */

const CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
  return btoa(s);
}

function fromBase64(text: string): Uint8Array | null {
  let s: string;
  try {
    s = atob(text);
  } catch {
    return null;
  }
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function encodePositions(p: ArrayLike<number>): string {
  let f32 = true;
  for (let i = 0; i < p.length && f32; i++) f32 = Math.fround(p[i]) === p[i];
  const size = f32 ? 4 : 8;
  const view = new DataView(new ArrayBuffer(p.length * size));
  if (f32) for (let i = 0; i < p.length; i++) view.setFloat32(i * 4, p[i], true);
  else for (let i = 0; i < p.length; i++) view.setFloat64(i * 8, p[i], true);
  return `${f32 ? 'f32' : 'f64'}:${toBase64(new Uint8Array(view.buffer))}`;
}

/** the numbers of an encoded list; null when the text is not one (wrong prefix, bad base64, a torn number) */
export function decodePositions(text: string): number[] | null {
  const m = /^(f32|f64):/.exec(text);
  if (!m) return null;
  const bytes = fromBase64(text.slice(4));
  const size = m[1] === 'f32' ? 4 : 8;
  if (!bytes || bytes.length % size) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = bytes.length / size;
  const out = new Array<number>(n);
  if (size === 4) for (let i = 0; i < n; i++) out[i] = view.getFloat32(i * 4, true);
  else for (let i = 0; i < n; i++) out[i] = view.getFloat64(i * 8, true);
  return out;
}
