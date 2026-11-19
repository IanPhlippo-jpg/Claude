/**
 * An independent reader of .goo files (docs/34 3.4: the round trip is checked with a reader that shares no code with
 * the writer): it walks the bytes with its own field table, checks the magic, the delimiters, the checksums and the
 * ending string, and decodes the run-length image data, including the "diff" chunks the writer does not use.
 * The preview of the 3D Print tab decodes its layer images with it as well.
 */

type FieldType = 'str' | 'magic' | 'i16' | 'i32' | 'f32' | 'bool' | 'small' | 'big' | 'crlf';
/** the header of the spec, field by field: name, type, length in bytes */
export const GOO_HEADER_FIELDS: [string, FieldType, number][] = [
  ['version', 'str', 4], ['magic', 'magic', 8], ['softwareInfo', 'str', 32], ['softwareVersion', 'str', 24], ['fileTime', 'str', 24],
  ['printerName', 'str', 32], ['printerType', 'str', 32], ['profileName', 'str', 32], ['antiAliasing', 'i16', 2], ['greyLevel', 'i16', 2],
  ['blurLevel', 'i16', 2], ['smallPreview', 'small', 2 * 116 * 116], ['delimiter1', 'crlf', 2], ['bigPreview', 'big', 2 * 290 * 290],
  ['delimiter2', 'crlf', 2], ['totalLayers', 'i32', 4], ['xResolution', 'i16', 2], ['yResolution', 'i16', 2], ['xMirror', 'bool', 1],
  ['yMirror', 'bool', 1], ['xSize', 'f32', 4], ['ySize', 'f32', 4], ['zSize', 'f32', 4], ['layerThickness', 'f32', 4],
  ['exposure', 'f32', 4], ['exposureDelayMode', 'bool', 1], ['turnOffTime', 'f32', 4], ['bottomBeforeLift', 'f32', 4],
  ['bottomAfterLift', 'f32', 4], ['bottomAfterRetract', 'f32', 4], ['beforeLift', 'f32', 4], ['afterLift', 'f32', 4],
  ['afterRetract', 'f32', 4], ['bottomExposure', 'f32', 4], ['bottomLayers', 'i32', 4], ['bottomLiftDistance', 'f32', 4],
  ['bottomLiftSpeed', 'f32', 4], ['liftDistance', 'f32', 4], ['liftSpeed', 'f32', 4], ['bottomRetractDistance', 'f32', 4],
  ['bottomRetractSpeed', 'f32', 4], ['retractDistance', 'f32', 4], ['retractSpeed', 'f32', 4], ['bottomLift2Distance', 'f32', 4],
  ['bottomLift2Speed', 'f32', 4], ['lift2Distance', 'f32', 4], ['lift2Speed', 'f32', 4], ['bottomRetract2Distance', 'f32', 4],
  ['bottomRetract2Speed', 'f32', 4], ['retract2Distance', 'f32', 4], ['retract2Speed', 'f32', 4], ['bottomLightPwm', 'i16', 2],
  ['lightPwm', 'i16', 2], ['advanceMode', 'bool', 1], ['printingTime', 'i32', 4], ['totalVolume', 'f32', 4], ['totalWeight', 'f32', 4],
  ['totalPrice', 'f32', 4], ['priceUnit', 'str', 8], ['layerContentOffset', 'i32', 4], ['grayScaleLevel', 'bool', 1],
  ['transitionLayers', 'i16', 2],
];
const LAYER_FIELDS: [string, FieldType, number][] = [
  ['pauseFlag', 'i16', 2], ['pauseZ', 'f32', 4], ['z', 'f32', 4], ['exposure', 'f32', 4], ['offTime', 'f32', 4], ['beforeLift', 'f32', 4],
  ['afterLift', 'f32', 4], ['afterRetract', 'f32', 4], ['liftDistance', 'f32', 4], ['liftSpeed', 'f32', 4], ['lift2Distance', 'f32', 4],
  ['lift2Speed', 'f32', 4], ['retractDistance', 'f32', 4], ['retractSpeed', 'f32', 4], ['retract2Distance', 'f32', 4],
  ['retract2Speed', 'f32', 4], ['lightPwm', 'i16', 2], ['delimiter', 'crlf', 2],
];

export type GooValues = Record<string, number | string | boolean | Uint8Array>;
export interface GooLayerRead { def: GooValues; data: Uint8Array; checksumOk: boolean }
export interface GooRead { header: GooValues; offsets: Record<string, number>; layers: GooLayerRead[]; endOk: boolean; size: number }

function readFields(v: DataView, bytes: Uint8Array, at: number, fields: [string, FieldType, number][], offsets?: Record<string, number>): [GooValues, number] {
  const out: GooValues = {};
  for (const [name, type, len] of fields) {
    if (at + len > bytes.length) throw new Error(`The .goo file ends inside the field ${name}.`);
    if (offsets) offsets[name] = at;
    switch (type) {
      case 'str': { let s = ''; for (let i = 0; i < len && bytes[at + i]; i++) s += String.fromCharCode(bytes[at + i]); out[name] = s; break; }
      case 'magic': {
        const want = [0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00];
        if (want.some((b, i) => bytes[at + i] !== b)) throw new Error('Not a .goo file: the magic tag is wrong.');
        out[name] = true; break;
      }
      case 'i16': out[name] = v.getInt16(at, false); break;
      case 'i32': out[name] = v.getInt32(at, false); break;
      case 'f32': out[name] = v.getFloat32(at, false); break;
      case 'bool': out[name] = bytes[at] !== 0; break;
      case 'small': case 'big': out[name] = bytes.subarray(at, at + len); break;
      case 'crlf': if (bytes[at] !== 0x0d || bytes[at + 1] !== 0x0a) throw new Error(`The delimiter ${name} at byte ${at} is not 0D 0A.`); out[name] = true; break;
    }
    at += len;
  }
  return [out, at];
}

export function readGoo(bytes: Uint8Array): GooRead {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offsets: Record<string, number> = {};
  const [header, end] = readFields(v, bytes, 0, GOO_HEADER_FIELDS, offsets);
  let at = header.layerContentOffset as number;
  if (at !== end) throw new Error(`The layer content offset ${at} is not the end of the header (${end}).`);
  const layers: GooLayerRead[] = [];
  for (let i = 0; i < (header.totalLayers as number); i++) {
    const [def, next] = readFields(v, bytes, at, LAYER_FIELDS);
    const size = v.getInt32(next, false);
    const data = bytes.subarray(next + 4, next + 4 + size);
    if (data.length !== size || data[0] !== 0x55) throw new Error(`Layer ${i}: the image data does not start with 0x55.`);
    let sum = 0;
    for (let k = 1; k < size - 1; k++) sum += data[k];
    layers.push({ def, data, checksumOk: data[size - 1] === (~sum & 0xff) });
    at = next + 4 + size;
    if (bytes[at] !== 0x0d || bytes[at + 1] !== 0x0a) throw new Error(`Layer ${i}: no delimiter after the image data.`);
    at += 2;
  }
  const tail = [0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00];
  const endOk = at + tail.length === bytes.length && tail.every((b, i) => bytes[at + i] === b);
  return { header, offsets, layers, endOk, size: bytes.length };
}

/**
 * The runs of an encoded layer image: `run(value, start, count)` in pixel order (row by row from the top). Throws when
 * the data does not cover exactly `total` pixels.
 */
export function decodeRuns(data: Uint8Array, total: number, run: (value: number, start: number, count: number) => void): void {
  let p = 1, pos = 0, prev = 0;
  const end = data.length - 1;
  while (p < end) {
    const b0 = data[p++];
    const type = b0 >> 6;
    if (type === 2) {
      // diff from the previous pixel: bit 5 the sign, bit 4 a run length in byte 1
      const d = (b0 & 0x20 ? -1 : 1) * (b0 & 0x0f);
      const n = b0 & 0x10 ? data[p++] : 1;
      prev = (prev + d) & 0xff;
      run(prev, pos, n); pos += n;
      continue;
    }
    const value = type === 0 ? 0 : type === 3 ? 255 : data[p++];
    const extra = (b0 >> 4) & 3;
    let n = 0;
    for (let k = 0; k < extra; k++) n = n * 256 + data[p++];
    n = n * 16 + (b0 & 0x0f);
    run(value, pos, n);
    pos += n; prev = value;
  }
  if (pos !== total) throw new Error(`The layer image holds ${pos} pixels, not ${total}.`);
}

/** the full image of a layer (small screens and tests only: a 12K layer is 59 MB) */
export function decodeLayer(data: Uint8Array, w: number, h: number): Uint8Array {
  const img = new Uint8Array(w * h);
  decodeRuns(data, w * h, (v, s, n) => { if (v) img.fill(v, s, s + n); });
  return img;
}

/**
 * A reduced image of a layer for the preview: every output pixel holds the brightest value of its block of
 * `f` x `f` LCD pixels (a thin wall stays visible).
 */
export function decodePreview(data: Uint8Array, w: number, h: number, f: number): { img: Uint8Array; w: number; h: number } {
  const ow = Math.ceil(w / f), oh = Math.ceil(h / f);
  const img = new Uint8Array(ow * oh);
  decodeRuns(data, w * h, (v, s, n) => {
    if (!v) return;
    let k = s;
    while (k < s + n) {
      const r = Math.floor(k / w), c = k % w, stop = Math.min(s + n, (r + 1) * w);
      const row = Math.floor(r / f) * ow;
      for (let x = Math.floor(c / f), x1 = Math.floor((stop - 1 - r * w) / f); x <= x1; x++) if (img[row + x] < v) img[row + x] = v;
      k = stop;
    }
  });
  return { img, w: ow, h: oh };
}
