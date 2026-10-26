// renders public/logo.svg to electron/icon.png (256 x 256, transparent corners) for the window, taskbar and installer
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/logo.svg', 'utf8').replace('width="32" height="32"', 'width="256" height="256"');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await page.locator('svg').screenshot({ path: 'electron/icon.png', omitBackground: true });
await browser.close();
