// crop (and enlarge) a region of an image: node e2e/crop-img.mjs in.jpg out.png x y w h [scale]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const [inp, out, x, y, w, h, sc = '3'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage();
const b64 = readFileSync(inp).toString('base64');
const mime = inp.endsWith('.png') ? 'image/png' : 'image/jpeg';
const data = await page.evaluate(async ([src, x, y, w, h, s]) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
  return c.toDataURL('image/png').split(',')[1];
}, [`data:${mime};base64,${b64}`, +x, +y, +w, +h, +sc]);
writeFileSync(out, Buffer.from(data, 'base64'));
await browser.close();
