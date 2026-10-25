// side by side: SW frame (left) and our screenshot (right): node e2e/pair.mjs NNNN [NNNN …] -> e2e-out/tut/pair-NNNN.jpg
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage();
for (const n of process.argv.slice(2)) {
  const a = 'data:image/jpeg;base64,' + readFileSync(`referentie-video/frames/f_${n}.jpg`).toString('base64');
  const b = 'data:image/png;base64,' + readFileSync(`e2e-out/tut/${n}.png`).toString('base64');
  const data = await page.evaluate(async ([a, b]) => {
    const c = document.createElement('canvas'); c.width = 1920; c.height = 560; const g = c.getContext('2d');
    for (const [src, x] of [[a, 0], [b, 960]]) { const img = new Image(); img.src = src; await img.decode(); g.drawImage(img, x, 0, 960, 540); }
    g.fillStyle = '#ff0'; g.font = 'bold 18px Arial'; g.fillText('SOLIDWORKS', 8, 556); g.fillText('Phlippo', 968, 556);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, [a, b]);
  writeFileSync(`e2e-out/tut/pair-${n}.jpg`, Buffer.from(data, 'base64'));
}
await browser.close();
