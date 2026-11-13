// Beelden van de kabeldoos (treinverlichting): een doorsnede door de klemlippen van rij 3, de DC-bus in de linkerwand
// (versie 4: boven de moduleplaat) en de MOSFET-modules met de PCA9685. Nodig: de app met VITE_TEST_HOOKS op E2E_URL.
// Gebruik: node e2e/tools/trein-fable-shots.mjs [uitmap]   (standaard e2e-out); ZOOM_<NAAM>="x,y,n" stuurt het inzoomen
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const UIT = process.argv[2] ?? 'e2e-out';
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const F = 'voorbeelden/treinverlichting/Kabeldoos.kcad';
const alleen = (re) => { const d = JSON.parse(readFileSync(F, 'utf8')); delete d.format; d.components = d.components.filter((c) => re.test(c.id)); return d; };
const open = async (d) => {
  await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 600_000 });
  const e = await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors ?? {});
  if (Object.keys(e).length) fouten.push(JSON.stringify(e).slice(0, 300));
};
// na het inzoomen de muis op de lege werkbalk (een lege plek in het venster: anders blijft er een oranje rand)
const rust = async () => {
  // eerst over een lege plek in het venster (linksboven), dan naar de lege boom links en het venster laten weten dat de
  // muis weg is (bij sterk inzoomen is er geen lege plek meer)
  await page.mouse.move(400, 220); await page.waitForTimeout(300);
  await page.mouse.move(100, 960); await page.waitForTimeout(300);
  await page.evaluate(() => { for (const c of document.querySelectorAll('.k-viewport canvas')) for (const t of ['pointerleave', 'mouseleave', 'pointerout', 'mouseout']) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: -10, clientY: -10 })); });
  await page.waitForTimeout(1800);
};
const shot = async (toets, naam, zoom) => {
  await page.keyboard.press(toets); await page.waitForTimeout(700); await page.keyboard.press('f'); await page.waitForTimeout(1200);
  if (zoom) {
    // in stappen: "x,y,n;x,y,n" (eerst grof op het midden, dan fijn op het detail)
    for (const stap of (process.env[`ZOOM_${naam.toUpperCase().replace(/-/g, '_')}`] ?? zoom).split(';')) {
      const [x, y, n] = stap.split(',').map(Number);
      await page.mouse.move(x, y);
      for (let i = 0; i < n; i++) { await page.mouse.wheel(0, 240); await page.waitForTimeout(250); }
    }
  }
  await rust();
  await page.screenshot({ path: `${UIT}/${naam}.png` });
};
const wat = (process.env.SHOTS ?? 'lippen,lippen-boven,dcbus,uitgang').split(',');
if (wat.includes('lippen') || wat.includes('lippen-boven')) {
  // rij 3 (bordje 7, 8, 9) in de bak, zonder de andere bordjes
  await open(alleen(/^(d1|b[789](k\d|e\d|r)?)$/));
  if (wat.includes('lippen-boven')) await shot('Control+5', 'trein-lippen-boven', '960,540,6;975,365,6');
  // doorsnede evenwijdig aan het vooraanzicht door het midden van de lippen (z = midden rij 3 + 9)
  if (wat.includes('lippen')) {
    await page.evaluate(() => window.__phlippoStore.setState({ sectionView: { plane: 'front', offset: -35.15 + 9, flip: false, cap: true } }));
    await page.waitForTimeout(2500);
    await shot('Control+1', 'trein-lippen-doorsnede', '960,560,9;725,800,6');
    // hetzelfde beeld zonder de knoppenbalken, voor het bouwschema (stap 5)
    const v = await page.locator('.k-viewport').boundingBox();
    await page.screenshot({ path: `${UIT}/trein-lippen-detail.jpg`, type: 'jpeg', quality: 88, clip: { x: v.x + 2, y: v.y + 44, width: v.width - 4, height: v.height - 104 } });
    await page.evaluate(() => window.__phlippoStore.setState({ sectionView: null }));
  }
}
if (wat.includes('dcbus')) {
  await open(alleen(/^(d1|w1|mp|mps\d|m[a-z0-9]+_\d+)$/));
  await shot('Control+3', 'trein-dcbus-links', '1553,527,5');
  await shot('Control+7', 'trein-dcbus', '600,470,6');
}
if (wat.includes('uitgang')) {
  await open(alleen(/^(mq[12]_\d+|mk2_\d+)$/));
  await shot('Control+7', 'trein-uitgangsprint', '');
}
console.log('fouten', fouten);
await browser.close();
