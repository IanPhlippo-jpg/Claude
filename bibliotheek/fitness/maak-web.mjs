// Zet de catalogus klaar als map om te publiceren: index.html en js/ met alle modules van de fitnesstoestellen en de
// modules van de balustrades en de taatsdeuren die ze (onrechtstreeks) gebruiken, in js/balustrades/ en js/taatsdeuren/.
// De imports '../balustrades/' en '../taatsdeuren/' worden './balustrades/' en './taatsdeuren/'.
// Gebruik: node bibliotheek/fitness/maak-web.mjs <doelmap> [--klant [--instellingen pad.json] [--ids FS-01,FX-04]]
// --klant (N-P2-09 v7): ook een aparte klantmap <doelmap>/klant met alleen de 3D, de catalogus en vooraf berekende
// verkoopprijzen (met de instellingen van Ian): geen prijzen.mjs, werkwijze.mjs, dossier.mjs, tekeningen.mjs, montage.mjs,
// dxf.mjs of stuklijst.mjs, en de inkoopprijzen in onderdelen.mjs op 0.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), BIB = join(HERE, '..');
const ARG = process.argv.slice(2), optie = (n) => { const i = ARG.indexOf(n); return i >= 0 ? ARG[i + 1] : null; };
const doel = ARG.find((a, i) => !a.startsWith('--') && !['--instellingen', '--ids'].includes(ARG[i - 1])) ?? join(HERE, 'web/uit');
const imports = (tekst) => [...tekst.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]).filter((i) => i.startsWith('.'));
const eigen = readdirSync(HERE).filter((f) => f.endsWith('.mjs') && !f.startsWith('maak-'));
// rij van te kopiëren bestanden: pad relatief tot bibliotheek/ ('fitness/x.mjs', 'balustrades/y.mjs', 'taatsdeuren/z.mjs')
const rij = [...eigen.map((f) => `fitness/${f}`), 'taatsdeuren/verbinding3d.mjs'], gezien = new Set(rij);
let bytes = 0;
mkdirSync(join(doel, 'js'), { recursive: true });
while (rij.length) {
  const rel = rij.pop(), t = readFileSync(join(BIB, rel), 'utf8');
  for (const i of imports(t)) { const r = posix.normalize(posix.join(posix.dirname(rel), i)); if (!gezien.has(r)) { gezien.add(r); rij.push(r); } }
  const uit = rel.startsWith('fitness/') ? join(doel, 'js', rel.slice(8)) : join(doel, 'js', rel);
  mkdirSync(dirname(uit), { recursive: true });
  const inhoud = rel.startsWith('fitness/') ? t.replaceAll("'../balustrades/", "'./balustrades/").replaceAll("'../taatsdeuren/", "'./taatsdeuren/") : t;
  writeFileSync(uit, inhoud); bytes += Buffer.byteLength(inhoud);
}
const html = readFileSync(join(HERE, 'web/index.html'), 'utf8');
writeFileSync(join(doel, 'index.html'), html); bytes += Buffer.byteLength(html);
const per = [...gezien].reduce((m, r) => { const k = r.split('/')[0]; m[k] = (m[k] ?? 0) + 1; return m; }, {});
console.log(`index.html + ${Object.entries(per).map(([k, n]) => `${n} ${k}`).join(' + ')} modules, ${Math.round(bytes / 1024)} kB -> ${doel}`);
void statSync;
if (ARG.includes('--klant')) await klantMap();

/** de klantmap: een eigen pagina (index.html met data-klant) en alleen de modules die de klantpagina nodig heeft */
async function klantMap() {
  const K = join(doel, 'klant'), WEG = ['prijzen.mjs', 'werkwijze.mjs', 'dossier.mjs', 'tekeningen.mjs', 'montage.mjs', 'dxf.mjs', 'stuklijst.mjs'];
  const stub = {
    'werkwijze.mjs': 'const UREN = {}, UREN_NAAM = {};',
    'tekeningen.mjs': 'const alleBladen = () => [], stukBladen = () => [];',
    'montage.mjs': 'const montageBladen = () => [];',
    'dossier.mjs': "const dossierHtml = () => '', lijstenCsv = () => '';",
    'dxf.mjs': 'const dxfBestanden = () => [];',
  };
  let pg = readFileSync(join(HERE, 'web/index.html'), 'utf8').replace("from './js/prijzen.mjs';", "from './js/prijzen-klant.mjs';");
  for (const [m, vervang] of Object.entries(stub)) {
    const re = new RegExp("import \\{[^}]*\\} from '\\./js/" + m.replace('.', '\\.') + "';");
    if (!re.test(pg)) throw new Error(`klantpagina: import van ${m} niet gevonden`);
    pg = pg.replace(re, vervang);
  }
  for (const w of WEG) if (pg.includes(`./js/${w}`)) throw new Error(`klantpagina importeert nog ${w}`);
  pg = `<!doctype html><html lang="nl" data-klant="1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">\n${pg}\n</body></html>`;
  mkdirSync(join(K, 'js'), { recursive: true });
  // modules: de import-sluiting van de klantpagina
  const start = [...pg.matchAll(/from '\.\/js\/([^']+)'|import\('\.\/js\/([^']+)'\)/g)].map((m) => { const x = m[1] ?? m[2]; return /^(taatsdeuren|balustrades)\//.test(x) ? x : `fitness/${x}`; }).filter((r) => !r.endsWith('prijzen-klant.mjs'));
  const rij2 = [...new Set(start)], gez = new Set(rij2);
  while (rij2.length) {
    const rel = rij2.pop(), t = readFileSync(join(BIB, rel), 'utf8');
    if (WEG.includes(rel.replace('fitness/', ''))) throw new Error(`klantmap: ${rel} wordt geïmporteerd`);
    for (const i of imports(t)) { const r = posix.normalize(posix.join(posix.dirname(rel), i)); if (!gez.has(r)) { gez.add(r); rij2.push(r); } }
    const uit = rel.startsWith('fitness/') ? join(K, 'js', rel.slice(8)) : join(K, 'js', rel);
    mkdirSync(dirname(uit), { recursive: true });
    let inhoud = rel.startsWith('fitness/') ? t.replaceAll("'../balustrades/", "'./balustrades/").replaceAll("'../taatsdeuren/", "'./taatsdeuren/") : t;
    // inkoopprijzen van de kooponderdelen: 0 in de klantversie (het 4e argument van k(...))
    if (rel === 'fitness/onderdelen.mjs') inhoud = inhoud.replace(/(\bk\('(?:[^'\\]|\\.)*', '(?:[^'\\]|\\.)*', '(?:[^'\\]|\\.)*', )([^']+?)(, ')/g, '$10$3');
    writeFileSync(uit, inhoud);
  }
  // de verkoopprijzen vooraf, met de instellingen van Ian (of de standaard): basis per versie + relatieve meerprijzen
  const { TOESTELLEN, toestel } = await import('./catalogus.mjs'), { kostprijs, STANDAARD } = await import('./prijzen.mjs'), { OPTIES, optieSoort } = await import('./opties.mjs'), { UREN } = await import('./werkwijze.mjs');
  const pad = optie('--instellingen'), eigen = pad ? JSON.parse(readFileSync(pad, 'utf8')) : null;
  const inst = eigen ? { ...JSON.parse(JSON.stringify(STANDAARD)), ...eigen, marge: { ...STANDAARD.marge, ...(eigen.marge ?? {}) }, uren: { ...UREN, ...(eigen.uren ?? {}) }, koopPrijs: { ...(eigen.koopPrijs ?? {}) } } : undefined;
  const ids = optie('--ids')?.split(','), P = {}, inc = (id, v, o) => kostprijs(toestel(id, v, o), inst).incl;
  for (const t of TOESTELLEN.filter((x) => !ids || ids.includes(x.id))) {
    const b = { thuis: inc(t.id, 'thuis'), semi: inc(t.id, 'semi'), pro: inc(t.id, 'pro') }, r = (o) => Math.round((inc(t.id, 'semi', o) / b.semi - 1) * 1e4) / 1e4;
    const opt = {}; for (const x of OPTIES[optieSoort(t)] ?? []) opt[x.id] = r({ opties: [x.id] });
    P[t.id] = { ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v)])), maat: { compact: r({ maat: 'compact' }), XL: r({ maat: 'XL' }) }, opties: opt, afw: { ral: r({ afwerking: { ral: '3020' } }), chroom: r({ afwerking: { chroom: false } }), logo: r({ afwerking: { logo: false } }) } };
  }
  const shim = `// automatisch gemaakt door maak-web --klant op ${new Date().toISOString().slice(0, 10)}: verkoopprijzen incl. btw, vooraf berekend met ${eigen ? 'de instellingen van Ian' : 'de standaardinstellingen (geen --instellingen opgegeven)'}; geen kostprijs, uren of marges
import { RAL_STANDAARD } from './opties.mjs';
const P = ${JSON.stringify(P)};
export const STANDAARD = { marge: {}, uren: {}, koopPrijs: {} }, CAT = {}, BRON = ${JSON.stringify(eigen ? 'instellingen van Ian' : 'standaardinstellingen')};
export function kostprijs(o) {
  const p = P[o.def?.id ?? o.id]; if (!p) return { incl: 0, verkoop: 0, markt: { band: [0, 0], bron: '', status: 'in' }, regels: [] };
  let r = 0; if (o.maat && o.maat !== 'standaard') r += p.maat[o.maat] ?? 0;
  for (const x of o.gekozenOpties ?? []) if (x.gelukt) r += p.opties[x.id] ?? 0;
  if (o.afwerking?.ral && !RAL_STANDAARD.includes(o.afwerking.ral)) r += p.afw.ral;
  if (o.afwerking?.chroom === false) r += p.afw.chroom;
  if (o.afwerking?.logo === false) r += p.afw.logo;
  const incl = Math.round(p[o.versie] * (1 + r));
  return { incl, verkoop: incl / 1.21, markt: { band: o.def?.markt?.[o.versie === 'thuis' ? 'thuis' : 'pro'] ?? [0, 0], bron: '', status: 'in' }, regels: [] };
}
`;
  writeFileSync(join(K, 'js', 'prijzen-klant.mjs'), shim);
  writeFileSync(join(K, 'index.html'), pg);
  writeFileSync(join(K, 'prijzen.json'), JSON.stringify(P));
  console.log(`klantmap: ${gez.size} modules, ${Object.keys(P).length} toestellen (${eigen ? 'instellingen van Ian' : 'STANDAARDINSTELLINGEN: geef --instellingen fitness-instellingen.json'}) -> ${K}`);
}
