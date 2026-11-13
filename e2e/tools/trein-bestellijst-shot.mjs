// Een beeld van de bestellijst van de kabeldoos (treinverlichting, README, hoofdstuk "Bestellijst") om na te kijken.
// Gebruik: node e2e/tools/trein-bestellijst-shot.mjs <uit.png>
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { md } from './mdhtml.mjs';

const DIR = 'voorbeelden/treinverlichting';
const uit = process.argv[2] ?? 'e2e-out/trein-bestellijst.png';
const readme = readFileSync(`${DIR}/README.md`, 'utf8');
const a = readme.indexOf('## Bestellijst'), b = readme.indexOf('\n## ', a + 5);
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
body { font-family: Arial, Helvetica, sans-serif; color: #1d1d1f; font-size: 13px; line-height: 1.4; margin: 24px; width: 1500px }
table { border-collapse: collapse; width: 100% } th, td { border-bottom: 1px solid #ccc; text-align: left; padding: 4px 8px; vertical-align: top } th { background: #eef3ee }
td:nth-child(2), td:nth-child(5), td:nth-child(6) { text-align: right; white-space: nowrap } h2 { font-size: 20px } code { background: #f4f4f4; padding: 0 3px }
</style></head><body>${md(readme.slice(a, b), DIR)}</body></html>`;
mkdirSync('e2e-out/trein-bestellijst', { recursive: true });
const tmp = resolve('e2e-out/trein-bestellijst/bestellijst.html');
writeFileSync(tmp, html);
mkdirSync(dirname(resolve(uit)), { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1560, height: 900 } });
await page.goto(pathToFileURL(tmp).href);
await page.screenshot({ path: uit, fullPage: true });
await browser.close();
console.log('bestellijst:', uit);
