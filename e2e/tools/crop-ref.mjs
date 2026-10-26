import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [file, x, y, w, h, out] = process.argv.slice(2);
const b64 = readFileSync(file).toString('base64');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w * 3, height: +h * 3 } });
await page.setContent(`<body style="margin:0"><div style="width:${w*3}px;height:${h*3}px;background:url(data:image/jpeg;base64,${b64}) -${x*3}px -${y*3}px / ${(+process.env.W||1280)*3}px auto no-repeat"></div></body>`);
await page.screenshot({ path: out });
await browser.close();
