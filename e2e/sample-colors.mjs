// pixel colours of an image: node e2e/sample-colors.mjs <image> x,y x,y ...
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [file, ...pts] = process.argv.slice(2);
const b64 = readFileSync(file).toString('base64');
const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage();
const out = await page.evaluate(async ([src, pts]) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return pts.map((p) => { const [x, y] = p.split(',').map(Number); const d = g.getImageData(x, y, 1, 1).data; return `${p} #${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`; });
}, [`data:${mime};base64,${b64}`, pts]);
console.log(out.join('\n'));
await browser.close();
