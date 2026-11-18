/**
 * A minimal ZIP reader and writer, for the Office Open XML files (.xlsx) of the design tables; no package.
 *
 * Reader: the end of central directory record, the central directory, then each entry from its local header; stored
 * (method 0) and deflate (method 8) entries, inflated with the platform's DecompressionStream('deflate-raw') (async),
 * the CRC-32 checked. No ZIP64, no encryption, no multi-disk archives: these give an error.
 * Writer: stored entries with their CRC-32 and UTF-8 names, which every ZIP and Office reader opens; writeZipDeflate
 * compresses the entries with the platform's CompressionStream('deflate-raw') (async). This is the one ZIP writer of the
 * program (the 3MF export and the 3D Print packages use it too, docs/34 6.1); the writer has no size limit of its own.
 */

export interface ZipEntry {
  name: string;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  /** offset of the local file header */
  offset: number;
}

/** the largest entry the reader inflates (a guard against a crafted archive) */
export const MAX_ENTRY_BYTES = 64 * 1024 * 1024;

const EOCD = 0x06054b50, CEN = 0x02014b50, LOC = 0x04034b50;

let table: Uint32Array | null = null;
/** CRC-32 (IEEE 802.3, the ZIP checksum) */
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** the archive starts with a local file header ("PK\3\4"): a ZIP file (an .xlsx is one) */
export const isZip = (data: Uint8Array): boolean => data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 3 && data[3] === 4;

/** the entries of the central directory */
export function listZip(data: Uint8Array): ZipEntry[] {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // the end record is in the last 22 + 65535 bytes (a comment may follow it)
  let e = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD) { e = i; break; }
  }
  if (e < 0) throw new Error('Not a ZIP archive: no end of central directory record.');
  const count = v.getUint16(e + 10, true), cdSize = v.getUint32(e + 12, true), cdOffset = v.getUint32(e + 16, true);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new Error('ZIP64 archives are not supported.');
  if (cdOffset + cdSize > data.length) throw new Error('The ZIP archive is truncated.');
  const out: ZipEntry[] = [];
  let p = cdOffset;
  const utf8 = new TextDecoder('utf-8');
  for (let i = 0; i < count; i++) {
    if (p + 46 > data.length || v.getUint32(p, true) !== CEN) throw new Error('The ZIP central directory is damaged.');
    const flags = v.getUint16(p + 8, true);
    if (flags & 1) throw new Error('Encrypted ZIP entries are not supported.');
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    out.push({
      name: utf8.decode(data.subarray(p + 46, p + 46 + nameLen)),
      method: v.getUint16(p + 10, true),
      crc: v.getUint32(p + 16, true),
      compressedSize: v.getUint32(p + 20, true),
      size: v.getUint32(p + 24, true),
      offset: v.getUint32(p + 42, true),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** inflate raw deflate data with the platform's DecompressionStream, at most `limit` bytes */
async function inflateRaw(bytes: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new Error('A ZIP entry is larger than it says (or too large to read).');
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const part of parts) { out.set(part, o); o += part.length; }
  return out;
}

/** the uncompressed bytes of one entry; the CRC-32 is checked */
export async function readZipEntry(data: Uint8Array, entry: ZipEntry, limit = MAX_ENTRY_BYTES): Promise<Uint8Array> {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const p = entry.offset;
  if (p + 30 > data.length || v.getUint32(p, true) !== LOC) throw new Error(`The ZIP entry ${entry.name} is damaged.`);
  const start = p + 30 + v.getUint16(p + 26, true) + v.getUint16(p + 28, true);
  if (start + entry.compressedSize > data.length) throw new Error(`The ZIP entry ${entry.name} is truncated.`);
  if (entry.size > limit) throw new Error(`The ZIP entry ${entry.name} is too large.`);
  const raw = data.subarray(start, start + entry.compressedSize);
  let out: Uint8Array;
  if (entry.method === 0) out = raw.slice();
  else if (entry.method === 8) out = await inflateRaw(raw, entry.size);
  else throw new Error(`The ZIP entry ${entry.name} uses compression method ${entry.method}; only stored and deflate are read.`);
  if (out.length !== entry.size || crc32(out) !== entry.crc) throw new Error(`The ZIP entry ${entry.name} is damaged (checksum).`);
  return out;
}

/** the entries of an archive by name (optionally only the names `want` accepts) */
/** limit: the largest entry read (a print package carries G-code of more than 64 MB: docs/35 P3-10) */
export async function readZip(data: Uint8Array, want: (name: string) => boolean = () => true, limit = MAX_ENTRY_BYTES): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const e of listZip(data)) if (!e.name.endsWith('/') && want(e.name)) out.set(e.name, await readZipEntry(data, e, limit));
  return out;
}

/** DOS date and time of a Date (the ZIP header fields) */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

interface Prepared { name: Uint8Array; data: Uint8Array; crc: number; size: number; method: number }

/** a ZIP archive of stored entries (no compression), UTF-8 names */
export function writeZip(files: { name: string; data: Uint8Array }[], when = new Date()): Uint8Array {
  const enc = new TextEncoder();
  return assemble(files.map((f) => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data), size: f.data.length, method: 0 })), when);
}

/** deflate raw data with the platform's CompressionStream */
async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** a ZIP archive with deflated entries (an entry that does not get smaller is stored) */
export async function writeZipDeflate(files: { name: string; data: Uint8Array }[], when = new Date()): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const prepared: Prepared[] = [];
  for (const f of files) {
    const packed = f.data.length > 64 ? await deflateRaw(f.data) : f.data;
    const deflated = packed !== f.data && packed.length < f.data.length;
    prepared.push({ name: enc.encode(f.name), data: deflated ? packed : f.data, crc: crc32(f.data), size: f.data.length, method: deflated ? 8 : 0 });
  }
  return assemble(prepared, when);
}

function assemble(entries: Prepared[], when: Date): Uint8Array {
  const { time, date } = dosTime(when);
  const localSize = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length, 0);
  const cdSize = entries.reduce((n, e) => n + 46 + e.name.length, 0);
  const out = new Uint8Array(localSize + cdSize + 22);
  const v = new DataView(out.buffer);
  const offsets: number[] = [];
  let p = 0;
  // version needed 2.0, flag 0x0800 (UTF-8 names), method 0 (stored) or 8 (deflate)
  const header = (at: number, e: Prepared) => {
    v.setUint16(at, 20, true); v.setUint16(at + 2, 0x0800, true); v.setUint16(at + 4, e.method, true);
    v.setUint16(at + 6, time, true); v.setUint16(at + 8, date, true); v.setUint32(at + 10, e.crc, true);
    v.setUint32(at + 14, e.data.length, true); v.setUint32(at + 18, e.size, true); v.setUint16(at + 22, e.name.length, true);
    v.setUint16(at + 24, 0, true);
  };
  for (const e of entries) {
    offsets.push(p);
    v.setUint32(p, LOC, true);
    header(p + 4, e);
    out.set(e.name, p + 30);
    out.set(e.data, p + 30 + e.name.length);
    p += 30 + e.name.length + e.data.length;
  }
  const cd = p;
  entries.forEach((e, i) => {
    v.setUint32(p, CEN, true);
    v.setUint16(p + 4, 20, true); // version made by
    header(p + 6, e);
    // comment length, disk, internal and external attributes 0; the local header offset
    v.setUint32(p + 42, offsets[i], true);
    out.set(e.name, p + 46);
    p += 46 + e.name.length;
  });
  v.setUint32(p, EOCD, true);
  v.setUint16(p + 8, entries.length, true);
  v.setUint16(p + 10, entries.length, true);
  v.setUint32(p + 12, p - cd, true);
  v.setUint32(p + 16, cd, true);
  return out;
}
