// sample pixel colours of images: node e2e/sample-px.mjs file x,y x,y ...
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [file, ...pts] = process.argv.slice(2);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage();
const b64 = readFileSync(file).toString('base64');
const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
const out = await page.evaluate(async ([src, pts, RR]) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return pts.map((p) => { const [x, y] = p.split(',').map(Number); let r = 0, gg = 0, b = 0; const R = RR; for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) { const d = g.getImageData(x + dx, y + dy, 1, 1).data; r += d[0]; gg += d[1]; b += d[2]; } return `${p}: ${Math.round(r / ((2*R+1)**2))},${Math.round(gg / ((2*R+1)**2))},${Math.round(b / ((2*R+1)**2))}`; });
}, [`data:${mime};base64,${b64}`, pts, Number(process.env.R ?? 2)]);
console.log(out.join('\n'));
await browser.close();
