// Foto's van de afzuiging, versie 7.2 (advies Fable 5.2 en de ronde vormen): doorsnede met de verdeelruimte, het
// rooster, de kuip met de uitblaas, de ventilator op de rubberbuffers, de latten in het blad, en de oude vorm (7.1, uit
// git) naast de nieuwe, van onderen en van opzij. Nodig: de dev-server met VITE_TEST_HOOKS op poort 5184 (E2E_URL).
// Gebruik: node e2e/tools/fotos-afzuiging.mjs <uitmap> [oude Afzuiging.kcad]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const UIT = process.argv[2] ?? 'e2e-out/fotos-afzuiging';
const OUD = process.argv[3];
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://localhost:5184/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const lees = (f) => { const d = JSON.parse(readFileSync(f, 'utf8')); delete d.format; return d; };
const open = async (d) => { await page.evaluate((x) => window.__phlippoStore.getState().openDocument(x), d); await page.waitForTimeout(3500); };
const snede = async (sv) => { await page.evaluate((x) => window.__phlippoStore.setState({ sectionView: x }), sv); await page.waitForTimeout(1500); };
const foto = async (toets, naam) => {
  await page.keyboard.press(toets);
  await page.waitForTimeout(700);
  await page.keyboard.press('f');
  await page.mouse.move(5, 5); // na het zoomen de muis naar een lege hoek (geen highlight)
  await page.waitForTimeout(1800);
  const vb = await page.locator('.k-viewport').boundingBox();
  await page.screenshot({ path: join(UIT, `${naam}.png`), clip: { x: vb.x + 2, y: vb.y + 44, width: vb.width - 4, height: vb.height - 104 } });
  console.log('foto', naam);
};
const knop = /^a(7|8|12|14|15|dkr?\d|dn\d|sd\d|sk\d|sdk\d)$/;
const box = /^(a2\db?|as25\d|as2\d|asa\d|asbd?\d)$/;
const asm = lees('voorbeelden/afzuiging/Afzuiging.kcad');
const module = { ...asm, components: asm.components.filter((c) => !knop.test(c.id) && !box.test(c.id)) };

// 1. doorsnede door het midden: verdeelruimte 15,5 mm, 3 tot 5 mm lucht boven de plooien, vingerrooster, kuip en buffers
await open(module);
await snede({ plane: 'front', offset: 0, flip: false, cap: true });
await foto('Control+1', '01-doorsnede-verdeelruimte');
await snede({ plane: 'right', offset: 0, flip: false, cap: true });
await foto('Control+4', '01b-doorsnede-zijkant');
// 4. de ventilator op de rubberbuffers: snede door twee buffers (z = 20,5)
await snede({ plane: 'front', offset: 20.5, flip: false, cap: true });
await foto('Control+1', '04-ventilator-op-rubberbuffers');
await snede(null);
// 2. het nieuwe rooster (van boven) en de persbouten
await foto('Control+5', '02-rooster-van-boven');
// 3. de kuip met de uitblaas (lamellen opzij, ringsleuven) van onderen en van opzij
await foto('Control+6', '03-kuip-van-onderen');
await foto('Control+3', '03b-kuip-van-opzij');
await foto('Control+7', '03c-module-iso');
// 5. de latten tussen de huiden (zonder honingraat) met de module en de box
const detail = lees('voorbeelden/bureau/Tafelblad-detail.kcad');
await open({ ...detail, components: detail.components.filter((c) => /^(h\d|l\d)$/.test(c.id)) });
await foto('Control+6', '05-latten-van-onderen');
await open(detail);
await snede({ plane: 'right', offset: -60, flip: false, cap: true });
await foto('Control+4', '05b-latten-doorsnede-met-module-en-box');
await snede(null);
// 8. oud (7.1, uit git) naast nieuw: van onderen en van opzij
if (OUD && existsSync(OUD)) {
  const oud = lees(OUD);
  const om = oud.components.filter((c) => !knop.test(c.id) && !box.test(c.id)).map((c) => ({ ...c, id: `o${c.id}`, position: [c.position[0] - 280, c.position[1], c.position[2]] }));
  await open({ ...module, name: 'Oud (7.1) links, nieuw (7.2) rechts', components: [...om, ...module.components] });
  await foto('Control+6', '08-oud-links-nieuw-rechts-van-onderen');
  await foto('Control+1', '08b-oud-links-nieuw-rechts-van-voren');
  await foto('Control+7', '08c-oud-links-nieuw-rechts-iso');
}
console.log('fouten', fouten);
await browser.close();
