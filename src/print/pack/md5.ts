/**
 * MD5 (RFC 1321), written out because Web Crypto has none (docs/34 E15). The Bambu .gcode.3mf carries the MD5 of the
 * G-code as 32 upper-case hex digits.
 */
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/** MD5 of a list of byte chunks (the G-code chunks need not be joined) */
export function md5(chunks: Uint8Array | Uint8Array[]): string {
  const list = Array.isArray(chunks) ? chunks : [chunks];
  const total = list.reduce((s, c) => s + c.length, 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const block = new Uint8Array(64);
  const M = new Uint32Array(16);
  let fill = 0;
  const run = () => {
    for (let i = 0; i < 16; i++) M[i] = block[4 * i] | (block[4 * i + 1] << 8) | (block[4 * i + 2] << 16) | (block[4 * i + 3] << 24);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16;
        } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  };
  const feed = (byte: number) => { block[fill++] = byte; if (fill === 64) { run(); fill = 0; } };
  for (const c of list) {
    let i = 0;
    // whole blocks straight from the chunk when aligned
    while (i < c.length && fill !== 0) feed(c[i++]);
    while (i + 64 <= c.length) { block.set(c.subarray(i, i + 64)); run(); i += 64; }
    while (i < c.length) feed(c[i++]);
  }
  feed(0x80);
  while (fill !== 56) feed(0);
  const bits = total * 8;
  const lo = bits >>> 0, hi = Math.floor(bits / 2 ** 32) >>> 0;
  for (let i = 0; i < 4; i++) feed((lo >>> (8 * i)) & 0xff);
  for (let i = 0; i < 4; i++) feed((hi >>> (8 * i)) & 0xff);
  const hex = (v: number) => Array.from({ length: 4 }, (_, i) => ((v >>> (8 * i)) & 0xff).toString(16).padStart(2, '0')).join('');
  return (hex(a0) + hex(b0) + hex(c0) + hex(d0)).toUpperCase();
}
