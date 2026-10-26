// contact sheets of the reference frames: node e2e/contact.mjs <dir> <first> <last> <out-prefix>  (4 x 4 per sheet, numbered)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [dir, first, last, prefix] = process.argv.slice(2);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
for (let s = +first; s <= +last; s += 16) {
  const list = [];
  for (let i = s; i < s + 16 && i <= +last; i++) { const f = `${dir}/f_${String(i).padStart(4, '0')}.jpg`; if (existsSync(f)) list.push([i, 'data:image/jpeg;base64,' + readFileSync(f).toString('base64')]); }
  const data = await page.evaluate(async (list) => {
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 1920, 1080);
    for (let k = 0; k < list.length; k++) {
      const img = new Image(); img.src = list[k][1]; await img.decode();
      const x = (k % 4) * 480, y = Math.floor(k / 4) * 270;
      g.drawImage(img, x, y, 480, 270);
      g.fillStyle = '#ff0'; g.font = 'bold 22px Arial'; g.fillText(String(list[k][0]), x + 6, y + 24);
    }
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }, list);
  writeFileSync(`${prefix}-${String(s).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'));
}
await browser.close();
