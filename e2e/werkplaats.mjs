// E2e van de werkplaats-app (bibliotheek/werkplaats): de gebouwde map via een eigen statische server, elk product geopend,
// de drie tabbladen van de werkplaats, het prijsdocument met hetzelfde totaal als de vroegere tabel Kostprijs (in Node
// uit dezelfde kostprijs() berekend), geen prijzen bij Schema's en Werkvoorbereiding, de PDF via de downloads-dienst, het
// onthouden tabblad, de klantmodus en geen horizontale scroll op een gsm van 390 px. Met schermafbeeldingen.
// Gebruik: node e2e/werkplaats.mjs [gebouwde map] [map voor de schermafbeeldingen]
//   zonder map bouwt het script eerst zelf (maak-werkplaats.mjs) in een tijdelijke map
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { checks, exitCode, track } from './lib/check.mjs';

const { results, check } = checks(), errors = [];
const MAP = resolve(process.argv[2] ?? mkdtempSync(join(tmpdir(), 'werkplaats-e2e-')));
if (!process.argv[2]) execFileSync(process.execPath, ['bibliotheek/werkplaats/maak-werkplaats.mjs', MAP], { stdio: 'inherit' });
const SHOTS = resolve(process.argv[3] ?? process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out/werkplaats' : '/tmp/werkplaats-e2e'));
mkdirSync(SHOTS, { recursive: true });

// ---- de verwachte totalen: dezelfde kostprijs() als de app, met de standaardkeuzes van een lege browser
const B = (p) => import(pathToFileURL(join(MAP, 'js', p)).href);
const eur = (v) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const D = await B('taatsdeuren/deuren.mjs'), DP = await B('taatsdeuren/prijzen.mjs'), DW = await B('taatsdeuren/werkwijze.mjs');
const deur = (stijl, extra, marge) => { const st = { gebruik: 'binnen', systeem: 'auto', opbouw: 'enkel', glas: 'helder', scharnier: 'budget', afwerking: 'poedercoat', kleur: '9005', lak: 'fijnstructuur', plaatsen: true, ...extra }; const o = D.ontwerp(stijl, 1000, 2400, { gebruik: st.gebruik, systeem: st.systeem, opbouw: st.opbouw, scharnier: st.scharnier, zijlicht: 400 }); return DP.kostprijs(o, { gebruik: st.gebruik, systeem: st.systeem, opbouw: o.opbouw, glas: st.glas, scharnier: st.scharnier, afwerking: st.afwerking, ral: st.kleur, lak: st.lak, uurloon: 45, marge, uren: DW.UREN, plaatsen: st.plaatsen }).kostprijs; };
const BM = await B('balustrades/model.mjs'), BP = await B('balustrades/prijzen.mjs'), BW = await B('balustrades/werkwijze.mjs');
const FC = await B('fitness/catalogus.mjs'), FP = await B('fitness/prijzen.mjs'), FW = await B('fitness/werkwijze.mjs');
const PRODUCTEN = [
  { id: 'deuren-staal', conf: 'deuren/staal', werk: 'deuren/staal-werkplaats', kost: deur('boog', {}, 35) },
  { id: 'deuren-alu', conf: 'deuren/alu', werk: 'deuren/alu-werkplaats', kost: deur('drievak', { systeem: 'aanvraag', plaatsen: false }, 20) },
  { id: 'balustrades', conf: 'balustrades/balustrade', werk: 'balustrades/werkplaats', kost: BP.kostprijs(BM.ontwerp(BM.STD), { versie: 1, ...JSON.parse(JSON.stringify(BP.STANDAARD)), uren: { ...BW.UREN } }).kostprijs },
  { id: 'fitness', conf: 'fitness/catalogus', werk: 'fitness/werkplaats/FR-01', kost: FP.kostprijs(FC.toestel('FR-01', 'thuis', {}), { versie: 1, ...JSON.parse(JSON.stringify(FP.STANDAARD)), uren: { ...FW.UREN } }).kostprijs },
];

// ---- statische server op de gebouwde map
// index.html krijgt het geraamte dat het publiceren eromheen zet (charset, viewport met viewport-fit=cover, kleine reset)
const SKELET = '<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
const TYPE = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const srv = createServer(async (q, r) => {
  try { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = join(MAP, p.endsWith('/') ? `${p}index.html` : p); if (!f.startsWith(MAP)) throw new Error('buiten de map'); let b = await readFile(f); if (/[\\/]index\.html$/.test(f)) b = Buffer.concat([Buffer.from(SKELET), b, Buffer.from('</body></html>')]); r.writeHead(200, { 'content-type': TYPE[extname(f)] ?? 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(0, '127.0.0.1');
await new Promise((ok) => srv.once('listening', ok));
const URL0 = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
// een nagebootste downloads-dienst: wat de pagina bewaart, komt in window.__opgeslagen
const NEP = () => { window.__opgeslagen = []; window.claude = { use: async (n) => (n === 'downloads' ? { save: async ({ filename, data }) => { const b = typeof data === 'string' ? new Blob([data]) : data; window.__opgeslagen.push({ filename, grootte: b.size, kop: await b.slice(0, 8).text() }); } } : null) }; };

const geenHorScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const tabNaar = async (page, t) => { await page.locator(`.app:not([hidden]) [data-wtab="${t}"]`).click(); await page.waitForTimeout(250); };
/** euro's in een paneel: in de tekst of in een ingebed blad (SVG als data-URL) */
const prijzenIn = (page, t) => page.locator(`.app:not([hidden]) [data-wpaneel="${t}"]`).evaluate((p) => {
  const uit = [];
  if (/€/.test(p.textContent)) uit.push(`tekst: ${p.textContent.match(/.{0,40}€.{0,20}/)?.[0]}`);
  for (const img of p.querySelectorAll('img')) if (decodeURIComponent(img.getAttribute('src') ?? '').includes('€')) uit.push(`blad: ${img.alt}`);
  for (const s of p.querySelectorAll('svg')) if (s.textContent.includes('€')) uit.push('svg');
  if (p.querySelector('.pdoc')) uit.push('prijsdocument');
  return uit;
});
const wachtWerk = (page) => page.locator('.app:not([hidden]) [data-kern="kostprijs"]').waitFor({ state: 'attached', timeout: 60000 });

// ---------------------------------------------------------------- desktop 1440
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage();
  await ctx.addInitScript(NEP); track(page, errors);
  await page.goto(`${URL0}/index.html`);
  check('de startpagina toont de drie producten', (await page.locator('.product').count()) === 3);
  await page.screenshot({ path: join(SHOTS, 'shell-desktop.png') });
  for (const p of PRODUCTEN) {
    await page.goto(`${URL0}/index.html#${p.conf}`);
    await page.locator('.app:not([hidden])').waitFor({ timeout: 60000 }); await page.waitForTimeout(1500);
    check(`${p.id}: de configurator opent, alleen hij is zichtbaar`, (await page.locator('.app:visible').count()) === 1 && !(await page.locator('#thuis').isVisible()), String(await page.locator('.app:visible').count()));
    if (p.id !== 'deuren-alu') await page.screenshot({ path: join(SHOTS, `${p.id}-configurator-desktop.png`) });
    await page.goto(`${URL0}/index.html#${p.werk}`); await wachtWerk(page);
    for (const t of ['schemas', 'voorbereiding', 'prijzen']) {
      await tabNaar(page, t);
      check(`${p.id}: tabblad ${t} zichtbaar, de andere verborgen`, await page.locator(`.app:not([hidden]) [data-wpaneel="${t}"]`).isVisible() && (await page.locator('.app:not([hidden]) [data-wpaneel]:visible').count()) === 1);
      if (t !== 'prijzen') { const pr = await prijzenIn(page, t); check(`${p.id}: geen prijzen bij ${t}`, !pr.length, pr.join(' | ')); }
      await page.locator('.app:not([hidden]) .wtabs').evaluate((e) => e.scrollIntoView({ block: 'start' })); await page.evaluate(() => scrollBy(0, -70));
      await page.screenshot({ path: join(SHOTS, `${p.id}-werkplaats-${t}-desktop.png`), fullPage: t === 'prijzen' });
    }
    const kost = (await page.locator('.app:not([hidden]) [data-kern="kostprijs"] b').textContent()).trim(), rij = (await page.locator('.app:not([hidden]) tr[data-rij="kostprijs"] td.n').first().textContent()).trim();
    check(`${p.id}: Prijzen toont de kostprijs van de vroegere tabel (${eur(p.kost)})`, kost === eur(p.kost) && rij === eur(p.kost), `${kost} / ${rij}`);
    await page.locator('.app:not([hidden]) [data-dl="prijspdf"]').click();
    await page.waitForFunction(() => window.__opgeslagen.length > 0, null, { timeout: 10000 }).catch(() => {});
    const pdf = await page.evaluate(() => window.__opgeslagen.pop());
    check(`${p.id}: Download PDF bewaart een PDF via de downloads-dienst`, pdf?.kop.startsWith('%PDF-1.4') && /prijzen\.pdf$/.test(pdf.filename) && pdf.grootte > 3000, JSON.stringify(pdf));
  }
  // het gekozen tabblad blijft per product
  await page.goto(`${URL0}/index.html#balustrades/werkplaats`); await wachtWerk(page); await tabNaar(page, 'voorbereiding');
  await page.reload(); await wachtWerk(page);
  check('het tabblad blijft bewaard na herladen (balustrades: Werkvoorbereiding)', await page.locator('.app:not([hidden]) [data-wtab="voorbereiding"]').getAttribute('aria-selected') === 'true');
  // oude links en de inhoudsopgave
  await page.goto(`${URL0}/index.html#alu-werkplaats`); await wachtWerk(page);
  check('een oude link (#alu-werkplaats) wordt #deuren/alu-werkplaats', (await page.evaluate(() => location.hash)) === '#deuren/alu-werkplaats');
  await tabNaar(page, 'schemas'); await page.locator('.app:not([hidden]) [data-naar="s-explode"]').click(); await page.waitForTimeout(900);
  check('de inhoudsopgave springt naar de opengewerkte tekening', await page.locator('.app:not([hidden]) #s-explode').evaluate((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }));
  // een link in de configurator (#instellingen) wordt de gedeelde Instellingen
  await page.goto(`${URL0}/index.html#deuren/staal`); await page.locator('.app:not([hidden]) #nav-inst').click(); await page.waitForTimeout(500);
  check('Instellingen in een configurator gaat naar #instellingen/deuren', (await page.evaluate(() => location.hash)) === '#instellingen/deuren' && await page.locator('#instkeuze').isVisible());
  await page.screenshot({ path: join(SHOTS, 'instellingen-desktop.png') });
  await ctx.close();
}

// ---------------------------------------------------------------- klantmodus
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await ctx.newPage(); track(page, errors);
  await page.goto(`${URL0}/klant.html#deuren/staal-werkplaats`); await page.locator('.app:not([hidden])').waitFor({ timeout: 60000 }); await page.waitForTimeout(1000);
  check('klant: geen Instellingen in de kop', !(await page.locator('#nav-instellingen').isVisible()));
  check('klant: de werkplaats van de deur blijft dicht', !(await page.locator('.app:not([hidden]) [data-view="werkplaats"]').isVisible()) && await page.locator('.app:not([hidden]) [data-view="deur"]').isVisible());
  check('klant: geen kostprijsopbouw bij de deur', !(await page.locator('.app:not([hidden]) #p-opbouw').isVisible()));
  await page.goto(`${URL0}/klant.html#balustrades/werkplaats`); await page.waitForTimeout(1500);
  check('klant: de werkplaats van de balustrades blijft dicht', !(await page.locator('.app:not([hidden]) [data-view="werkplaats"]').isVisible()));
  await ctx.close();
}

// ---------------------------------------------------------------- gsm 390
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), page = await ctx.newPage();
  await ctx.addInitScript(NEP); track(page, errors);
  await page.goto(`${URL0}/index.html`); await page.waitForTimeout(500);
  check('gsm: geen horizontale scroll op de startpagina', await geenHorScroll(page));
  await page.screenshot({ path: join(SHOTS, 'shell-telefoon.png') });
  for (const p of PRODUCTEN) {
    await page.goto(`${URL0}/index.html#${p.conf}`); await page.locator('.app:not([hidden])').waitFor({ timeout: 60000 }); await page.waitForTimeout(1500);
    check(`gsm: geen horizontale scroll in de configurator ${p.id}`, await geenHorScroll(page));
    if (p.id !== 'deuren-alu') await page.screenshot({ path: join(SHOTS, `${p.id}-configurator-telefoon.png`) });
    await page.goto(`${URL0}/index.html#${p.werk}`); await wachtWerk(page);
    for (const t of ['schemas', 'voorbereiding', 'prijzen']) {
      await tabNaar(page, t); await page.waitForTimeout(300);
      check(`gsm: geen horizontale scroll in ${p.id} ${t}`, await geenHorScroll(page), String(await page.evaluate(() => document.documentElement.scrollWidth)));
      await page.locator('.app:not([hidden]) .wtabs').evaluate((e) => e.scrollIntoView({ block: 'start' })); await page.evaluate(() => scrollBy(0, -60));
      await page.screenshot({ path: join(SHOTS, `${p.id}-werkplaats-${t}-telefoon.png`) });
    }
  }
  await ctx.close();
}

await browser.close(); srv.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks; schermafbeeldingen in ${SHOTS}`);
process.exitCode = exitCode(results, errors);
