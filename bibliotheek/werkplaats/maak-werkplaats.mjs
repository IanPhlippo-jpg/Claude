// Bouwt de werkplaats-app (2026-11-28, Ian: "deuren, balustrades en fitness allemaal in 1"): één map om te publiceren met
//   index.html            de kop (Deuren | Balustrades | Fitness | Instellingen) uit web/index.html
//   klant.html            dezelfde app in klantmodus (geen werkplaats, instellingen of kostprijs)
//   js/apps/<app>.mjs     elke configurator als module met mount(ROOT, HOST, CTX): gemaakt uit <bibliotheek>/web/index.html
//   js/<bibliotheek>/     de modules die de apps (onrechtstreeks) gebruiken, in dezelfde mappen als in de repo, zodat de
//                         imports '../taatsdeuren/' en '../balustrades/' ongewijzigd werken
// Een configurator draait in een schaduwboom: zijn id's en stijlen botsen niet met de andere. De bron blijft de pagina van
// elke configurator (die ook los werkt, met maak-web.mjs); hier verandert alleen:
//   - de regel met '@wortel' valt weg: ROOT (de schaduwboom), HOST (het element) en CTX (klant, use, hash, opRoute) komen
//     uit mount();
//   - './js/x' wordt '../<bibliotheek>/x';
//   - de stijl: ':root' en 'body' worden ':host' (ook [data-theme] en body[data-soort]); de eigen merknaam valt weg.
// Gebruik: node bibliotheek/werkplaats/maak-werkplaats.mjs <doelmap>
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), BIB = join(HERE, '..');
const doel = process.argv[2] ?? join(HERE, 'web/uit');
const APPS = [{ id: 'deuren', lib: 'taatsdeuren' }, { id: 'balustrades', lib: 'balustrades' }, { id: 'fitness', lib: 'fitness' }];
const imports = (tekst) => [...tekst.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map((m) => m[1] ?? m[2]).filter((i) => i.startsWith('.'));
const eis = (ok, wat) => { if (!ok) throw new Error(`maak-werkplaats: ${wat}`); };

/** de stijl van een losse pagina in een schaduwboom: :root en body worden :host */
export function schaduwCss(css) {
  let c = css
    .replace(/:root:not\(\[data-theme="light"\]\) body(\[[^\]]+\])/g, ':host(:not([data-theme="light"])$1)')
    .replace(/:root\[data-theme="dark"\] body(\[[^\]]+\])/g, ':host([data-theme="dark"]$1)')
    .replace(/:root:not\(\[data-theme="light"\]\)/g, ':host(:not([data-theme="light"]))')
    .replace(/:root\[data-theme="dark"\]/g, ':host([data-theme="dark"])')
    .replace(/:root/g, ':host')
    .replace(/html, body \{/g, ':host {')
    .replace(/body::before \{[^}]*\}/g, '')
    .replace(/body(\[[^\]]+\])/g, ':host($1)')
    .replace(/body\.([\w-]+)/g, ':host(.$1)')
    .replace(/(^|[\s},])body\s*\{/g, '$1:host {');
  eis(!/(^|[^-\w])(body|html)[\s.[{:,]/.test(c.replace(/\/\*[\s\S]*?\*\//g, '')), 'er blijft een selector op body of html over');
  // in de werkplaats: de merknaam staat in de kop van de app, de balk van de configurator blijft eronder plakken
  return `${c}\n:host { display: block; min-height: 70vh } .balk .merk { display: none }\n`;
}

/** de pagina van een configurator als module met mount(ROOT, HOST, CTX) */
export function alsModule(html, lib) {
  const s0 = html.indexOf('<style>'), s1 = html.indexOf('</style>'), j0 = html.indexOf('<script type="module">'), j1 = html.lastIndexOf('</script>');
  eis(s0 >= 0 && s1 > s0 && j0 > s1 && j1 > j0, `${lib}: <style> of <script type="module"> niet gevonden`);
  const css = schaduwCss(html.slice(s0 + 7, s1)), markup = html.slice(s1 + 8, j0).trim();
  let script = html.slice(j0 + 22, j1);
  const wortel = script.split('\n').filter((r) => r.includes('// @wortel'));
  eis(wortel.length === 1, `${lib}: precies één regel met @wortel verwacht, gevonden ${wortel.length}`);
  script = script.split('\n').filter((r) => !r.includes('// @wortel')).join('\n');
  script = script.replaceAll("'./js/taatsdeuren/", "'../taatsdeuren/").replaceAll("'./js/balustrades/", "'../balustrades/").replaceAll("'./js/werkplaats/", "'../werkplaats/").replaceAll("'./js/", `'../${lib}/`);
  eis(!script.includes('./js/'), `${lib}: een pad naar ./js/ bleef over`);
  const regels = script.split('\n'), stat = regels.filter((r) => /^import\s.*\sfrom\s'[^']+';\s*$/.test(r)), rest = regels.filter((r) => !stat.includes(r));
  eis(!rest.some((r) => /^import\s/.test(r)), `${lib}: een import over meer regels`);
  eis(!/\bdocument\.(getElementById|querySelector(?:All)?\((?!'meta)|body)/.test(rest.join('\n')), `${lib}: de pagina zoekt nog in document in plaats van in ROOT`);
  return `// GEMAAKT door bibliotheek/werkplaats/maak-werkplaats.mjs uit bibliotheek/${lib}/web/index.html: niet hier aanpassen.\n${stat.join('\n')}\n`
    + `const PAGINA_CSS = ${JSON.stringify(css)};\nconst PAGINA_HTML = ${JSON.stringify(markup)};\n`
    + `/** zet de configurator in ROOT (een schaduwboom); HOST = het element; CTX = { klant, use(dienst), hash(), opRoute(f) } */\n`
    + `export async function mount(ROOT, HOST, CTX) {\nROOT.innerHTML = \`<style>\${PAGINA_CSS}</style>\${PAGINA_HTML}\`;\n${rest.join('\n')}\n}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (existsSync(join(doel, 'js'))) rmSync(join(doel, 'js'), { recursive: true });
  mkdirSync(join(doel, 'js/apps'), { recursive: true });
  // 1. de apps
  const rij = [];
  for (const a of APPS) {
    const mod = alsModule(readFileSync(join(BIB, a.lib, 'web/index.html'), 'utf8'), a.lib);
    writeFileSync(join(doel, 'js/apps', `${a.id}.mjs`), mod);
    for (const i of imports(mod)) rij.push(posix.normalize(posix.join('apps', i)));
  }
  // 2. de modules die ze gebruiken, met hun eigen imports (pad relatief tot bibliotheek/)
  const gezien = new Set(rij); let bytes = 0;
  while (rij.length) {
    const rel = rij.pop();
    eis(!rel.startsWith('..') && existsSync(join(BIB, rel)), `module ${rel} bestaat niet`);
    const t = readFileSync(join(BIB, rel), 'utf8');
    for (const i of imports(t)) { const r = posix.normalize(posix.join(posix.dirname(rel), i)); if (!gezien.has(r)) { gezien.add(r); rij.push(r); } }
    mkdirSync(dirname(join(doel, 'js', rel)), { recursive: true });
    writeFileSync(join(doel, 'js', rel), t); bytes += Buffer.byteLength(t);
  }
  // 3. de kop en de klantversie
  const html = readFileSync(join(HERE, 'web/index.html'), 'utf8');
  writeFileSync(join(doel, 'index.html'), html);
  writeFileSync(join(doel, 'klant.html'), `<!doctype html><html lang="nl" data-klant="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>\n${html}\n</body></html>`);
  const per = [...gezien].reduce((m, r) => { const k = r.split('/')[0]; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  console.log(`index.html + klant.html + ${APPS.length} apps + ${Object.entries(per).map(([k, n]) => `${n} ${k}`).join(' + ')} modules, ${Math.round(bytes / 1024)} kB -> ${doel}`);
}
