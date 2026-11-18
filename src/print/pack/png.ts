/**
 * PNG writer (RGBA, 8 bit) with zlib from the platform's CompressionStream('deflate') (docs/34 E15), and a reader of
 * the header for the tests. Works in the window, in workers and in Node.
 */
import { crc32 } from '../../core/document/zip';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

async function zlib(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** encodes RGBA pixels (row by row from the top) as a PNG file */
export async function encodePng(rgba: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width); v.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [Uint8Array.from(SIG), chunk('IHDR', ihdr), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** width and height of a PNG, or null when the signature or header is wrong */
export function pngSize(data: Uint8Array): { width: number; height: number } | null {
  if (data.length < 24 || SIG.some((b, i) => data[i] !== b)) return null;
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (String.fromCharCode(...data.subarray(12, 16)) !== 'IHDR') return null;
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

export function base64(bytes: Uint8Array): string {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    out += abc[a >> 2] + abc[((a & 3) << 4) | (b >> 4)] + (i + 1 < bytes.length ? abc[((b & 15) << 2) | (c >> 6)] : '=') + (i + 2 < bytes.length ? abc[c & 63] : '=');
  }
  return out;
}
