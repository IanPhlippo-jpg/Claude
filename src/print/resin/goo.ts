/**
 * The .goo file of Elegoo (public "Goo Format Spec V1.2", Elegoo): header, layer contents, ending string. Written field
 * by field in the order of the spec; the independent reader (gooReader.ts) reads it back for the tests.
 *
 * Not stated by the spec, and therefore assumptions until a file from Elegoo's own slicer or a print confirms them
 * ("nog te printen"; docs/33 fase 4):
 *   - numbers are big-endian; floats are IEEE 754 single precision
 *   - "Data size" counts the whole image data: the 0x55, the chunks and the checksum
 *   - the checksum is the one's complement of the 8-bit sum of the chunk bytes
 *   - the previews are RGB565, big-endian, row by row from the top
 *   - the image rows run from the back edge of the LCD to the front; mirrored only where the database says so
 *   - advance mode 1: the printer takes exposure and lift of every layer from its layer definition
 */
import type { Resin, ResinLayer, ResinMachine, ResinSettings, ResinStats } from './types';

export const GOO_MAGIC = [0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00];
export const GOO_END = [0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00];
export const GOO_SMALL = 116;
export const GOO_BIG = 290;
/** header size: the sum of the field lengths of the spec (fields 0..61) */
export const GOO_HEADER_SIZE = 195477;
/** bytes of a layer definition (fields 1..18) */
export const GOO_LAYER_DEF_SIZE = 66;

/** a growing big-endian byte writer */
class Out {
  buf: Uint8Array;
  view: DataView;
  n = 0;
  constructor(size: number) { this.buf = new Uint8Array(size); this.view = new DataView(this.buf.buffer); }
  private room(k: number) {
    if (this.n + k <= this.buf.length) return;
    const nb = new Uint8Array(Math.max(this.buf.length * 2, this.n + k));
    nb.set(this.buf.subarray(0, this.n));
    this.buf = nb; this.view = new DataView(nb.buffer);
  }
  bytes(b: ArrayLike<number>) { this.room(b.length); this.buf.set(b, this.n); this.n += b.length; }
  /** a fixed-length string: ASCII, padded with zero bytes, cut at the length */
  str(s: string, len: number) {
    this.room(len);
    for (let i = 0; i < len; i++) this.buf[this.n + i] = i < s.length ? s.charCodeAt(i) & 0x7f : 0;
    this.n += len;
  }
  short(v: number) { this.room(2); this.view.setInt16(this.n, Math.round(v)); this.n += 2; }
  int(v: number) { this.room(4); this.view.setInt32(this.n, Math.round(v)); this.n += 4; }
  bool(v: boolean) { this.room(1); this.buf[this.n++] = v ? 1 : 0; }
  float(v: number) { this.room(4); this.view.setFloat32(this.n, v); this.n += 4; }
  delim() { this.bytes([0x0d, 0x0a]); }
  result() { return this.buf.slice(0, this.n); }
}

/** RGBA (from the thumbnail renderer) to RGB565, big-endian */
export function rgb565(rgba: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h * 2);
  for (let i = 0; i < w * h; i++) {
    const v = ((rgba[4 * i] >> 3) << 11) | ((rgba[4 * i + 1] >> 2) << 5) | (rgba[4 * i + 2] >> 3);
    out[2 * i] = v >> 8; out[2 * i + 1] = v & 0xff;
  }
  return out;
}

export interface GooJob {
  machine: ResinMachine;
  settings: ResinSettings;
  resin: Resin;
  layers: ResinLayer[];
  stats: ResinStats;
  /** RGBA 116 x 116 and 290 x 290 */
  small: Uint8Array;
  big: Uint8Array;
  appVersion: string;
  /** the file time ("YYYY-MM-DD HH:MM:SS"); fixed in the tests */
  time: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const fileTime = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export function writeGoo(job: GooJob): Uint8Array {
  const { machine: m, settings: s, layers } = job;
  const size = GOO_HEADER_SIZE + layers.reduce((a, l) => a + GOO_LAYER_DEF_SIZE + 4 + l.data.length + 2, 0) + GOO_END.length;
  const o = new Out(size);
  // ---- header (spec fields 0..61)
  o.str('V3.0', 4);
  o.bytes(GOO_MAGIC);
  o.str('Phlippo CAD', 32);
  o.str(job.appVersion, 24);
  o.str(job.time, 24);
  o.str(m.name, 32);
  o.str('MSLA', 32);
  o.str(job.resin.name, 32);
  o.short(s.antiAliasing);
  o.short(s.antiAliasing > 1 ? 1 : 0);
  o.short(0);
  o.bytes(rgb565(job.small, GOO_SMALL, GOO_SMALL));
  o.delim();
  o.bytes(rgb565(job.big, GOO_BIG, GOO_BIG));
  o.delim();
  o.int(layers.length);
  o.short(m.resolution[0]);
  o.short(m.resolution[1]);
  // the mirror flags: the image was mirrored by the slicer (database resin.mirror; an assumption: docs/35 R-2)
  o.bool(m.mirror[0]);
  o.bool(m.mirror[1]);
  o.float(m.size[0]);
  o.float(m.size[1]);
  o.float(m.height);
  o.float(s.layerHeight);
  o.float(s.exposure);
  // exposure delay mode 0: the "turn off time" waits after every layer
  o.bool(false);
  o.float(s.lightOffDelay);
  for (let i = 0; i < 6; i++) o.float(0);
  o.float(s.bottomExposure);
  o.int(s.bottomLayers);
  o.float(s.bottomLiftDistance); o.float(s.bottomLiftSpeed);
  o.float(s.liftDistance); o.float(s.liftSpeed);
  o.float(s.bottomLiftDistance); o.float(s.retractSpeed);
  o.float(s.liftDistance); o.float(s.retractSpeed);
  // no second lift or retract stage: distance 0 at the speed of the first
  o.float(0); o.float(s.bottomLiftSpeed); o.float(0); o.float(s.liftSpeed);
  o.float(0); o.float(s.retractSpeed); o.float(0); o.float(s.retractSpeed);
  o.short(s.bottomLightPwm);
  o.short(s.lightPwm);
  o.bool(true);
  o.int(job.stats.printTime);
  o.float(job.stats.volume);
  o.float(job.stats.grams);
  o.float(job.stats.cost);
  o.str('EUR', 8);
  o.int(GOO_HEADER_SIZE);
  o.bool(true);
  o.short(s.transitionLayers);
  if (o.n !== GOO_HEADER_SIZE) throw new Error(`GOO header is ${o.n} bytes, not ${GOO_HEADER_SIZE}.`);
  // ---- layer contents
  layers.forEach((l, i) => {
    const bottom = i < s.bottomLayers;
    const lift = bottom ? s.bottomLiftDistance : s.liftDistance, speed = bottom ? s.bottomLiftSpeed : s.liftSpeed;
    o.short(0);
    o.float(0);
    o.float(l.z);
    o.float(l.exposure);
    o.float(s.lightOffDelay);
    o.float(0); o.float(0); o.float(0);
    o.float(lift); o.float(speed);
    o.float(0); o.float(speed);
    o.float(lift); o.float(s.retractSpeed);
    o.float(0); o.float(s.retractSpeed);
    o.short(bottom ? s.bottomLightPwm : s.lightPwm);
    o.delim();
    o.int(l.data.length);
    o.bytes(l.data);
    o.delim();
  });
  o.bytes(GOO_END);
  return o.result();
}
